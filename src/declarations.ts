import { searchItem } from "./items";
import { TableManager } from "./table-manager";
import { addElementToEnergyBreath, addElementToRetaliation, extractScrollRank, getActorLevel, getDmgType, getSpellsByLevel, getTraits, purifyRunes, splitString } from "./util";

enum StrikingRune {
  "Weapon",
  "Striking weapon",
  "Greater striking weapon",
  "Major striking weapon",
  "Mythic striking weapon",
}

export class LsmItem {
  rollableStats: string[];
  name: string;
  item: string;
  material!: string;
  element!: string;
  rune!: string;
  type!: string;
  potency!: string;
  equipment!: boolean;
  runes!: string[];
  itemType!: string;

  constructor(name: string, item: string, rollableStats: string[]) {
    this.name = name;
    this.item = item;
    this.rollableStats = rollableStats;
  }

  async roll() {
    for (const stat of this.rollableStats) {
      const result = await TableManager.rollOnTable(`${this.name}/${this.name}-${stat}.csv`);
      // @ts-ignore
      this[stat] = result;
    }
    console.log(`Rolling a ${this.name}`);
  }

  toItemData(): any {
    const itemData: any = {};
    if (this.material) {
      const [material, grade] = this.material.toLowerCase().split(' (');
      itemData.material = {
        type: material,
        grade: grade ? grade.slice(0, -1) : ''
      };
    }
    if (this.element) {
      itemData.damage = {
        damageType: this.element.toLowerCase()
      };
    }
    if (this.rune) {
      itemData.runes = {
        potency: parseInt(this.rune, 10)
      };
    }
    return itemData;
  }
}

export class Grimoire extends LsmItem {

  constructor() {
    super('grimoire', '', ['material', 'item']);
    this.material = '';
    this.type = 'equipment';
  }


}

export class Potion extends LsmItem {

  constructor() {
    super('potion', '', ['item']);
    this.itemType = 'Equipment';
  }

  override async roll() {
    const level = getActorLevel();

    this.item = await TableManager.rollOnTable(`potion.tsv`, false, level);

    if (this.item.includes('Retaliation')) {
      this.element = await TableManager.rollOnTable(`potion-element.tsv`);
      this.name = addElementToRetaliation(this.item, this.element);
    }
    if (this.item.includes('Energy Breath')) {
      this.element = await TableManager.rollOnTable(`potion-element.tsv`);
      this.name = addElementToEnergyBreath(this.item, this.element);
    }
  }
}

export class Worn extends LsmItem {

  constructor() {
    super('worn', '', ['item']);
  }

  override async roll() {
    const level = getActorLevel();
    this.item = await TableManager.rollOnTable(`worn.tsv`, false, level);
  }
}

export class Staff extends LsmItem {

  constructor() {
    super('staff', '', ['material', 'item', 'element', 'rune']);
    this.material = '';
    this.element = '';
    this.rune = '';
  }

}

export class Weapon extends LsmItem {
  constructor() {
    super('weapon', '', ['material', 'rune', 'potency', 'type', 'item']);
    this.material = '';
    this.runes = [];
    this.type = '';
    this.item = '';
    this.potency = '';
    this.equipment = true
    this.itemType = 'Equipment';
  }

  override async roll(): Promise<void> {
    const level = getActorLevel();
    this.potency = await TableManager.rollOnTable(`${this.name}/${this.name}-potency.tsv`);
    if (this.potency === "Precious Material and roll again") {
      this.material = await TableManager.rollOnTable(`${this.name}/${this.name}-material.tsv`, level);
      while (this.potency === "Precious Material and roll again") {
        this.potency = await TableManager.rollOnTable(`${this.name}/${this.name}-potency.tsv`, true);
      }
    }

    if (this.potency === "Specific Weapon") {
      this.item = await TableManager.rollOnTable(`${this.name}/${this.name}-specific.tsv`, level);
    } else {
      this.type = await TableManager.rollOnTable(`${this.name}/${this.name}-type.tsv`);
      this.item = await TableManager.rollOnTable(`${this.name}/${this.name}-${this.type.toLowerCase().split(' ')[0]}.tsv`);
    }

    const item = await searchItem(this.item, 'Equipment');
    const conditions = [
      this.type === "ranged" ? "ranged" : "melee",
      getDmgType(item),
      ...getTraits(item)
    ]

    // equal to potency level 
    const runechance = parseInt((await TableManager.rollOnTable(`${this.name}/${this.name}-runechance.tsv`)).split(' ')[0]);

    for (let i = 0; i < runechance; i++) {
      // @ts-ignore
      let rune = await TableManager.rollOnTable(`${this.name}/${this.name}-runes.tsv`, false, level, conditions);
      this.runes.push(purifyRunes(rune));
    }
  }

  override toItemData(): any {
    const itemData: any = { runes: {} };
    if (this.material) {
      const [material, grade] = this.material.toLowerCase().split(' (');
      itemData.material = {
        type: material,
        grade: grade ? grade.slice(0, -1) : ''
      };
    }
    if (this.potency && this.potency !== "Specific Weapon") {
      const { potency, striking } = splitString(this.potency);
      itemData.runes.potency = parseInt(potency, 10);
      itemData.runes.striking = StrikingRune[striking as keyof typeof StrikingRune];
    };
    if (this.runes.length > 0) {
      itemData.runes.property = this.runes;
    }

    return itemData;
  }

}

export class Armor extends LsmItem {
  constructor() {
    super('armor', '', ['material', 'rune', 'potency', 'type', 'item']);
    this.material = '';
    this.runes = [];
    this.type = '';
    this.item = '';
    this.potency = '';
    this.equipment = true;
    this.itemType = 'Equipment';
  }

  override async roll(): Promise<void> {
    const level = getActorLevel();
    this.potency = await TableManager.rollOnTable(`${this.name}/${this.name}-potency.tsv`);
    if (this.potency === "Precious Material and roll again") {
      this.material = await TableManager.rollOnTable(`${this.name}/${this.name}-material.tsv`, level);
      while (this.potency === "Precious Material and roll again") {
        this.potency = await TableManager.rollOnTable(`${this.name}/${this.name}-potency.tsv`, true);
      }
    }

    if (this.potency === "Specific Armor") {
      this.item = await TableManager.rollOnTable(`${this.name}/${this.name}-specific.tsv`, level);
    } else {
      this.type = await TableManager.rollOnTable(`${this.name}/${this.name}-type.tsv`);
      this.item = await TableManager.rollOnTable(`${this.name}/${this.name}-${this.type.toLowerCase().split(' ')[0]}.tsv`);
    }

    const item = await searchItem(this.item, 'Equipment');
    const conditions = [
      this.type === "ranged" ? "ranged" : "melee",
      getDmgType(item),
      ...getTraits(item)
    ]

    const runechance = parseInt((await TableManager.rollOnTable(`${this.name}/${this.name}-runechance.tsv`)).split(' ')[0]);

    for (let i = 0; i < runechance; i++) {
      let rune = await TableManager.rollOnTable(`${this.name}/${this.name}-runes.tsv`, false, level, conditions);
      this.runes.push(purifyRunes(rune));
    }
  }

  override toItemData(): any {
    const itemData: any = { runes: {} };
    if (this.material) {
      const [material, grade] = this.material.toLowerCase().split(' (');
      itemData.material = {
        type: material,
        grade: grade ? grade.slice(0, -1) : ''
      };
    }
    if (this.potency && this.potency !== "Specific Armor") {
      const { potency, striking } = splitString(this.potency);
      itemData.runes.potency = parseInt(potency, 10);
      itemData.runes.striking = StrikingRune[striking as keyof typeof StrikingRune];
    };
    if (this.runes.length > 0) {
      itemData.runes.property = this.runes;
    }

    return itemData;
  }
}

export class Jewelry extends LsmItem {
  constructor() {
    super('jewelry', '', ['material', 'item']);
    this.material = '';
    this.item = '';
  }

  override async roll(): Promise<void> {
    const level = getActorLevel();
    this.item = await TableManager.rollOnTable(`jewelry.tsv`, false, level);
  }
}

export class Scroll extends LsmItem {
  constructor() {
    super('scrolls', '', ['item']);
    this.item = '';
    this.itemType = 'Spell';
  }

  override async roll(): Promise<void> {
    const level = getActorLevel();
    this.item = await TableManager.rollOnTable(`scrolls.tsv`, false, level);
    const rank = extractScrollRank(this.item);
    const spells = await getSpellsByLevel(rank);
    const randomSpell = spells[Math.floor(Math.random() * spells.length)];
    this.item = randomSpell.name;

  }
}

export class Wand extends LsmItem {
  constructor() {
    super('wands', '', ['material', 'item']);
    this.material = '';
    this.item = '';
  }

  override async roll(): Promise<void> {
    const level = getActorLevel();
    this.material = await TableManager.rollOnTable(`${this.name}/${this.name}-material.tsv`, level);
    this.item = await TableManager.rollOnTable(`${this.name}/${this.name}-item.tsv`, level);
  }
}
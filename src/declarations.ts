import { searchEquipment } from "./items";
import { TableManager } from "./table-manager";
import { getActorLevel, getDmgType, getTraits } from "./util";
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
    super('potion', '', ['name']);
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
    this.element = '';
    this.runes = [];
    this.type = '';
    this.item = '';
    this.potency = '';
    this.equipment = true
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

    const item = await searchEquipment(this.item);
    const conditions = [
      this.type === "ranged" ? "ranged" : "melee",
      getDmgType(item),
      getTraits(item)
    ]

    const runechance = parseInt((await TableManager.rollOnTable(`${this.name}/${this.name}-runechance.tsv`)).split(' ')[0]);

    for (let i = 0; i < runechance; i++) {
      // @ts-ignore
      this.runes.push(await TableManager.rollOnTable(`${this.name}/${this.name}-runes.tsv`), level, conditions);
    }


  }

}
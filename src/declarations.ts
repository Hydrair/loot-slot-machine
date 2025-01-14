import { searchItem } from "./items";
import { TableManager } from "./table-manager";
import { addElementToEnergyBreath, addElementToRetaliation, extractScrollRank, getActorLevel, getArmorType, getDmgType, getSpellsByLevel, getTraits, purifyRunes, replaceEnchanted, splitString } from "./util";
import { createConsumableFromSpell } from "foundry-pf2e";

enum StrikingRune {
  "Weapon",
  "Striking weapon",
  "Greater striking weapon",
  "Major striking weapon",
  "Mythic striking weapon",
}

enum ResilientRune {
  "Armor",
  "Resilient armor",
  "Greater resilient armor",
  "Major resilient armor",
  "Mythic resilient armor",
}

enum ReinforcingRune {
  "Reinforcing Rune (Minor)" = 1,
  "Reinforcing Rune (Lesser)",
  "Reinforcing Rune (Moderate)",
  "Reinforcing Rune (Greater)",
  "Reinforcing Rune (Major)",
  "Reinforcing Rune (Supreme)",
}

export class LsmItem {
  item: string | any;
  material: string = '';
  element: string = '';
  type: string = '';
  potency: string = '';
  runes: string[] = [];
  file: string = '';
  level: number = getActorLevel();
  conditions: string[] = [];
  rules: Object[] = [];

  [key: string]: any;

  constructor(file: string) {
    this.file = `${file}`;
  }

  async roll() {
    throw new Error("Method not implemented.");
  }

  toItemData(): any {
    const itemData: any = { runes: {} };

    if (this.material) {
      const [material, grade] = this.material.toLowerCase().split(' (');
      itemData.material = {
        type: material,
        grade: grade ? grade.slice(0, -1) : ''
      };
    }

    if (this.potency && !this.potency.includes("Specific")) {
      const { potency, bonus } = splitString(replaceEnchanted(this.potency));
      itemData.runes.potency = parseInt(potency, 10);
      itemData.runes.striking = StrikingRune[bonus as keyof typeof StrikingRune];
    }

    if (this.runes && this.runes.length > 0) {
      itemData.runes.property = this.runes;
    }

    return itemData;
  }

  async setKey(key: string, file: string) {
    if (this.potency === "Precious Material and roll again") {
      this[key] = await TableManager.rollOnTable(`${file}.tsv`, {
        level: this.level,
        conditions: this.conditions,
        skipLast: true
      });
    } else {
      const result = await TableManager.rollOnTable(`${file}.tsv`, {
        level: this.level,
        conditions: this.conditions,
      });
      this[key] = result;
    }
  }

}

export class Grimoire extends LsmItem {
  override async roll() {
    await this.setKey('potency', this.file + '-potency');
    if (this.potency === "Precious Material and roll again") {
      await this.setKey('material', this.file + '-material');
      while (this.potency === "Precious Material and roll again") {
        await this.setKey('potency', this.file + '-potency');
      }
    }
    await this.setKey('item', this.file + '-item');
  }

  override toItemData() {
    const itemData = super.toItemData();
    itemData.rules = [
      {
        "key": "FlatModifier",
        "selector": "spell-dc",
        "value": splitString(replaceEnchanted(this.potency)).potency,
        "type": "item"
      }];

    return itemData;
  }
}

export class Potion extends LsmItem {
  override async roll() {
    await this.setKey('item', this.file);

    if (this.item.includes('Retaliation')) {
      await this.setKey('element', this.file + '-element');
      this.item = addElementToRetaliation(this.item, this.element);
    }
    if (this.item.includes('Energy Breath')) {
      await this.setKey('element', this.file + '-element');
      this.item = addElementToEnergyBreath(this.item, this.element);
    }
  }
}

export class Worn extends LsmItem {
  override async roll() {
    await this.setKey('item', this.file);
  }
}

export class Staff extends LsmItem {
  override async roll(): Promise<void> {
    await this.setKey('potency', this.file + '-potency');
    if (this.potency === "Precious Material and roll again") {
      await this.setKey('material', this.file + '-material');
      while (this.potency === "Precious Material and roll again") {
        await this.setKey('potency', this.file + '-potency');
      }
    }

    await this.setKey('item', this.file + '-item');
    await this.setKey('element', this.file + '-element');

    this.element = this.element.toLowerCase();
  }

  override toItemData() {
    const itemData = super.toItemData();
    itemData.range = 30;
    itemData.damage = {
      dice: 1,
      die: "d8",
      modifier: 0,
      damageType: this.element
    };
    itemData.traits = {
      rarity: 'uncommon',
      value: ['magical', `versatile-${this.element}`]
    };

    return itemData;
  }

}

export class Weapon extends LsmItem {
  override async roll(): Promise<void> {
    await this.setKey('potency', this.file + '-potency');
    if (this.potency === "Precious Material and roll again") {
      await this.setKey('material', this.file + '-material');
      await this.setKey('potency', this.file + '-potency');
    }

    if (this.potency === "Specific Weapon") {
      await this.setKey('item', this.file + '-specific');
    } else {
      await this.setKey('type', this.file + '-type');
      await this.setKey('item', `${this.file}-${this.type.toLowerCase().split(' ')[0]}`);
    }



    await this.setKey('runechance', this.file + '-runechance');
    this.runechance = parseInt(this.runechance.split(' ')[0]);

    const item = await searchItem(this.item, 'Equipment');
    this.conditions = [
      this.type === "ranged" ? "ranged" : "melee",
      getDmgType(item),
      ...getTraits(item)
    ]

    for (let i = 0; i < this.runechance; i++) {
      await this.setKey('rune', this.file + '-runes');
      this.runes.push(purifyRunes(this.rune));
    }
  }
}

export class Armor extends LsmItem {
  override async roll(): Promise<void> {
    await this.setKey('potency', this.file + '-potency');
    if (this.potency === "Precious Material and roll again") {
      await this.setKey('material', this.file + '-material');
      while (this.potency === "Precious Material and roll again") {
        await this.setKey('potency', this.file + '-potency');
      }
    }

    if (this.potency === "Specific Armor") {
      await this.setKey('item', this.file + '-specific');
    } else {
      await this.setKey('item', this.file + '-type');
    }

    const item = await searchItem(this.item, 'Equipment');


    await this.setKey('runechance', this.file + '-runechance');
    this.runechance = parseInt(this.runechance.split(' ')[0]);

    this.conditions = [
      getArmorType(item),
    ]

    for (let i = 0; i < this.runechance; i++) {
      await this.setKey('rune', this.file + '-runes');
      this.runes.push(purifyRunes(this.rune));
    }
  }

  override toItemData() {
    const itemData = super.toItemData();
    itemData.runes.resilient = ResilientRune[splitString(this.potency).bonus as keyof typeof ResilientRune];
    return itemData;
  }
}

export class Shield extends LsmItem {
  override async roll(): Promise<void> {
    await this.setKey('potency', this.file + '-potency');
    if (this.potency === "Precious Material and roll again") {
      await this.setKey('material', this.file + '-material');
      while (this.potency === "Precious Material and roll again") {
        await this.setKey('potency', this.file + '-potency');
      }
    }

    if (this.potency === "Specific Shield") {
      await this.setKey('item', this.file + '-specific');
    } else {
      this.potency = '';
      await this.setKey('item', this.file + '-type');
      await this.setKey('rune', this.file + '-rune');
    }
  }

  override toItemData() {
    const itemData = super.toItemData();
    itemData.runes.reinforcing = ReinforcingRune[this.rune as keyof typeof ReinforcingRune];
    return itemData;
  }
}

export class Jewelry extends LsmItem {
  override async roll(): Promise<void> {
    this.level = getActorLevel();
    await this.setKey('item', this.file);
  }
}

export class Scroll extends LsmItem {
  override async roll(): Promise<void> {
    await this.setKey('item', this.file);
    const rank = extractScrollRank(this.item);
    const spells = await getSpellsByLevel(rank);
    const randomSpell = spells[Math.floor(Math.random() * spells.length)] as SpellPF2e;

    this.item = await createConsumableFromSpell(randomSpell, { type: 'scroll' });
  }
}

export class Wand extends LsmItem {

  override async roll(): Promise<void> {
    await this.setKey('potency', this.file + '-potency');
    if (this.potency === "Precious Material and roll again") {
      await this.setKey('material', this.file + '-material');
      while (this.potency === "Precious Material and roll again") {
        await this.setKey('potency', this.file + '-potency');
      }
    }

    await this.setKey('item', this.file + '-item');
    await this.setKey('element', this.file + '-element');

    this.element = this.element.toLowerCase();
    this.item = await this.createWand();
  }

  async createWand(): Promise<Item> {
    const template = await searchItem(this.item, 'Equipment') as any;
    const itemData = this.toItemData();
    const item = await Item.create({
      name: this.item,
      img: template.img,
      type: 'weapon',
      system: {
        category: 'simple',
        damage: {
          dice: 1,
          die: "d6",
          modifier: 0,
          damageType: this.element
        },
        description: {
          value: template.system.description.value
        },
        range: 30,
        traits: {
          rarity: 'uncommon',
          value: ['magical', `versatile-${this.element}`]
        },
        ...itemData
      }
    }, { renderSheet: false }) as Item;

    return item;
  }

  override toItemData() {
    const itemData = super.toItemData();
    itemData.range = 30;
    itemData.damage = {
      dice: 1,
      die: "d6",
      modifier: 0,
      damageType: this.element
    };
    itemData.rules = [
      {
        "key": "FlatModifier",
        "selector": "spell-attack",
        "value": splitString(replaceEnchanted(this.potency)).potency,
        "type": "item"
      }];

    return itemData;
  }
}
import { searchItem } from "./items";
import { slotManager } from "./slotmanager";
import { TableManager } from "./table-manager";
import { addElementToEnergyBreath, addElementToRetaliation, createScrollFromSpell, extractScrollRank, getActorLevel, getArmorType, getDmgType, getElementDamage, getSpellsByLevel, getTraits, purifyRunes, replaceEnchanted, splitString } from "./util";

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
  "Shield",
  "Reinforcing Rune (Minor)",
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
        type: material.replace(/ /g, '-'),
        grade: grade ? grade.slice(0, -1) : ''
      };
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
      this[key] = result === "Roll twice again" ? await slotManager.chooseSlot() : result;
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
    const { potency, } = splitString(replaceEnchanted(this.potency));
    itemData.runes.potency = potency;
    itemData.rules = [
      {
        "key": "FlatModifier",
        "selector": "spell-dc",
        "value": potency,
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
    if (this.item === 'Instinct Crown') {
      const variants = ['Animal', 'Dragon', 'Fury', 'Giant', 'Spirit', 'Superstition'];
      const variant = variants[Math.floor(Math.random() * variants.length)];
      this.item = `Instinct Crown (${variant})`;
    }
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

    this.item = await this.createStaff();
  }

  async createStaff(): Promise<Item> {
    const { dice, die, effect } = await getElementDamage(this.element, this.file);
    const template = await searchItem(this.item, 'Equipment') as any;
    if (!template) {
      console.warn(`LSM: Staff "${this.item}" not found in compendium`);
    }
    const itemData = this.toItemData();
    const item = await Item.create({
      name: this.item,
      img: template?.img || 'icons/svg/chest.svg',
      // @ts-ignore - 'weapon' is a valid item type in FoundryVTT
      type: 'weapon',
      system: {
        category: 'simple',
        damage: {
          dice,
          die,
          modifier: 0,
          damageType: this.element
        },
        description: {
          value: (template?.system?.description?.value || '') + `\n\n ${effect}`
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
    const { potency, bonus } = splitString(replaceEnchanted(this.potency));
    itemData.runes.potency = potency;
    itemData.rules = [
      {
        "key": "FlatModifier",
        "selector": "spell-attack",
        "value": potency,
        "type": "item"
      }];
    itemData.runes.striking = StrikingRune[bonus as keyof typeof StrikingRune];

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

    // PF2E rule: max property runes = potency bonus
    const potencyNumber = parseInt(this.potency.match(/\+(\d)/)?.[1] || '0');
    this.runechance = Math.min(this.runechance, potencyNumber);

    const item = await searchItem(this.item, 'Equipment');
    if (!item) {
      console.warn(`LSM: Weapon "${this.item}" not found in compendium`);
    }
    this.conditions = [
      this.type === "ranged" ? "ranged" : "melee",
      ...(item ? [getDmgType(item), ...getTraits(item)] : [])
    ]

    for (let i = 0; i < this.runechance; i++) {
      await this.setKey('rune', this.file + '-runes');
      this.runes.push(purifyRunes(this.rune));
    }
  }

  override toItemData() {
    const itemData = super.toItemData();
    const { potency, bonus } = splitString(this.potency);
    itemData.runes.potency = potency;
    itemData.runes.striking = StrikingRune[bonus as keyof typeof StrikingRune];

    return itemData;
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
    if (!item) {
      console.warn(`LSM: Armor "${this.item}" not found in compendium`);
    }

    await this.setKey('runechance', this.file + '-runechance');
    this.runechance = parseInt(this.runechance.split(' ')[0]);

    // PF2E rule: max property runes = potency bonus
    const potencyNumber = parseInt(this.potency.match(/\+(\d)/)?.[1] || '0');
    this.runechance = Math.min(this.runechance, potencyNumber);

    this.conditions = [
      ...(item ? [getArmorType(item)] : [])
    ]

    for (let i = 0; i < this.runechance; i++) {
      await this.setKey('rune', this.file + '-runes');
      this.runes.push(purifyRunes(this.rune));
    }
  }

  override toItemData() {
    const itemData = super.toItemData();
    const { potency, bonus } = splitString(this.potency);
    itemData.runes.potency = potency;
    itemData.runes.resilient = ResilientRune[bonus as keyof typeof ResilientRune];

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
      await this.setKey('item', this.file + '-type');
    }

    await this.setKey('rune', this.file + '-runes');
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
    const traditions = ['arcane', 'divine', 'occult', 'primal'];
    const tradition = traditions[Math.floor(Math.random() * traditions.length)];
    let spells = await getSpellsByLevel(rank, tradition);
    if (spells.length === 0) {
      spells = await getSpellsByLevel(rank);
    }
    const randomSpell = spells[Math.floor(Math.random() * spells.length)];

    const scrollSource = await createScrollFromSpell(randomSpell, rank);
    if (scrollSource) {
      this.item = scrollSource; // object → createAndDisplayItem uses createEmbeddedDocuments path
    } else {
      // Fallback: just set the name so searchItem can try to find a generic scroll
      this.item = `Scroll of ${randomSpell.name} (Rank ${rank})`;
    }
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
    const { dice, die, effect } = await getElementDamage(this.element, this.file);
    const template = await searchItem(this.item, 'Equipment') as any;
    if (!template) {
      console.warn(`LSM: Wand "${this.item}" not found in compendium`);
    }
    const itemData = this.toItemData();
    const item = await Item.create({
      name: this.item,
      img: template?.img || 'icons/svg/chest.svg',
      // @ts-ignore - 'weapon' is a valid item type in FoundryVTT
      type: 'weapon',
      system: {
        category: 'simple',
        damage: {
          dice,
          die,
          modifier: 0,
          damageType: this.element
        },
        description: {
          value: (template?.system?.description?.value || '') + `\n\n ${effect}`
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
    const { potency, bonus } = splitString(replaceEnchanted(this.potency));
    itemData.runes.potency = potency;
    itemData.rules = [
      {
        "key": "FlatModifier",
        "selector": "spell-attack",
        "value": potency,
        "type": "item"
      }];
    itemData.runes.striking = StrikingRune[bonus as keyof typeof StrikingRune];

    return itemData;
  }
}
import { TableManager } from "./table-manager";

export class LsmItem {
  rollableStats: string[];
  name: string;
  item: string;
  material!: string;
  element!: string;
  rune!: string;

  constructor(name: string, item: string, rollableStats: string[]) {
    this.name = name;
    this.item = item;
    this.rollableStats = rollableStats;
  }

  async roll() {
    const quality = (document.getElementById('quality-select') as HTMLSelectElement).value;
    for (const stat of this.rollableStats) {
      const result = await TableManager.rollOnTable(`${this.name}/${this.name}-${quality}-${stat}.csv`);
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
  type: string;

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
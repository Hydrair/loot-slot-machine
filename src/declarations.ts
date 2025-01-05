import { TableManager } from "./table-manager";

export class LsmItem {
  rollableStats: string[];
  name: string;
  item: string;

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
    throw new Error("Method 'toItemData()' must be implemented.");
  }
}

export class Grimoire extends LsmItem {
  material: string;
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
  material: string;
  element: string;
  type: string;

  constructor() {
    super('staff', '', ['material', 'item', 'element', 'type']);
    this.material = '';
    this.element = '';
    this.type = '';
  }

}
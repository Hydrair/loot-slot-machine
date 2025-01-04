import { TableManager } from "./table-manager";

export interface LsmItem {
  roll(): Promise<void>;
  rollableStats: string[];
  name: string;
  item: string;
}

export class Grimoire implements LsmItem {
  rollableStats: string[];

  async roll() {
    const quality = (document.getElementById('quality-select') as HTMLSelectElement).value;
    for (const stat of this.rollableStats) {
      const result = await TableManager.rollOnTable(`${this.name}/${this.name}-${quality}-${stat}.csv`);
      // @ts-ignore
      this[stat] = result;
    }
    console.log(`Rolling a ${this.name}`);
  }

  constructor() {
    this.name = 'grimoire';
    this.material = '';
    this.type = '';
    this.item = '';
    this.rollableStats = ['material', 'item', 'type'];
  }

  name: string;
  item: string;
  material: string;
  type: string;
}

export class Potion implements LsmItem {
  rollableStats: string[];

  async roll(): Promise<void> {
    console.log('Rolling a Grimoire');
  }
  constructor() {
    this.rollableStats = ['name'];
    this.name = 'potion';
    this.item = '';
  }
  item: string;
  name: string;
}
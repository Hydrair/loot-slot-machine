import { parseDiceRange } from "./util";



interface SlotTableRow {
  Item: string;
  Chance: string;
}

class Slot {
  table: SlotTableRow[];
  roll: number;
  pickable: boolean;
  slotItems: HTMLDivElement[] = [];
  outcome: string = "";
  slotDiv: HTMLDivElement = document.createElement('div');;

  constructor(table: SlotTableRow[], roll: number, pickable: boolean) {
    this.table = table;
    this.roll = roll;
    this.pickable = pickable;

    for (const row of table) {
      this.addSlotItem(row.Item, table.indexOf(row));
    }
    this.render(pickable);
  }

  render(pickable?: boolean) {
    const slotContainer = document.getElementById('lsm-slot-container');
    if (slotContainer) {
      this.slotDiv.className = 'lsm-slot';
      slotContainer.appendChild(this.slotDiv);
      if (pickable) {
        this.makeSlotPickable(this.slotDiv);
      }
      this.slotDiv.append(...this.slotItems);
    }
  }

  lockSlot() {
    this.pickable = false;
    this.slotDiv.classList.remove('lsm-slot-pickable');
    this.slotDiv.classList.add('lsm-slot-locked');
  }

  unlockSlot() {
    this.slotDiv.classList.remove('lsm-slot-locked');
    this.slotDiv.classList.remove('lsm-slot-pickable');
  }

  removeSlotClick() {
    this.slotDiv.removeEventListener('click', () => { });
    this.slotDiv.classList.remove('lsm-slot-pickable');
  }

  getOutcome() {
    if (this.outcome === '') this.rollTable();
    return this.outcome;
  }

  rollTable() {
    for (const row of this.table) {
      const [min, max] = parseDiceRange(row.Chance);
      if (this.roll < min) {
        const prevRow = this.table[this.table.indexOf(row) - 1];
        if (prevRow && prevRow.Chance) {
          const [, prevMax] = parseDiceRange(prevRow.Chance);
          const diffToMin = min - this.roll;
          const diffToPrevMax = this.roll - prevMax;
          this.roll = diffToMin < diffToPrevMax ? diffToMin : diffToPrevMax;
        }
      }
      if (this.roll >= min && this.roll <= max) {
        const timeouts = this.rollSlots();
        setTimeout(() => this.stopSlots(row.Item, timeouts), 2000);
        this.outcome = row.Item;
      }
    }
  }



  addSlotItem(item: string, number: number) {
    const slot = document.createElement('div');
    slot.className = 'lsm-slot-item';
    slot.textContent = item;
    slot.style.top = `${50 * number}px`;
    this.slotItems.push(slot);
  }

  rollSlots() {
    const timeouts = [];
    for (let i = 0; i < this.slotItems.length; i++) {
      const slotItem = this.slotItems[i];
      const spins = Math.floor(Math.random() * 15) + 10;
      for (let j = 0; j < spins; j++) {
        timeouts.push(setTimeout(() => {
          const offset = (j * 50) % (this.slotItems.length * 50);
          slotItem.style.transform = `translateY(-${offset}px)`;
        }, j * 200));
      }
    }
    return timeouts;
  }

  stopSlots(outcome: string, timeouts: NodeJS.Timeout[]) {
    for (let i = 0; i < this.slotItems.length; i++) {
      const slotItem = this.slotItems[i];
      if (slotItem.textContent !== outcome) {
        slotItem.style.display = `none`;
      } else {
        slotItem.style.transform = `translateY(-${i * 50}px)`;
      }
    }
    for (const timeout of timeouts) {
      clearTimeout(timeout);
    }
  }

  makeSlotPickable(slotDiv: HTMLDivElement) {
    slotDiv.classList.add('lsm-slot-pickable');
    slotDiv.addEventListener('click', () => {
      const outcome = this.outcome;
      this.onSlotClick(outcome);
    });
  }

  onSlotClick(outcome: string) {
    // This method will be overridden by SlotManager
    console.log(outcome);

  }

}

export { Slot };


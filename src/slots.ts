import { searchItem } from "./items";
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
  slotDiv: HTMLDivElement = document.createElement('div');

  constructor(table: SlotTableRow[], roll: number, pickable: boolean, preventReroll: boolean) {
    this.table = table;
    this.roll = roll;
    this.pickable = pickable;

    if (preventReroll) this.preventReroll();

    for (const row of table) {
      this.addSlotItem(row.Item, table.indexOf(row));
    }
    this.render(pickable);
    this.slotDiv.classList.add('fade-in');
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
    this.addHoverEvent();
  }

  addHoverEvent() {
    this.slotDiv.addEventListener('mouseenter', async (event) => {
      const outcome = await this.getOutcome();
      const item = await searchItem(outcome, 'Equipment');

      if (item) {
        // @ts-ignore
        const description = await TextEditor.enrichHTML(item.system.description.value, {})
        this.showPopup(event, item, description);
      }
    });

    this.slotDiv.addEventListener('mouseleave', () => {
      this.hidePopup();
    });
  }

  async showPopup(event: MouseEvent, item: Item, description?: string) {
    const popup = document.createElement('div');
    popup.className = 'lsm-slot-popup';
    popup.innerHTML = `
      <h3>${item.name}</h3>
      <p>${description || 'No description available'}</p>
    `;
    document.body.appendChild(popup);

    const { clientX: x, clientY: y } = event;
    popup.style.left = `${x + 10}px`;
    popup.style.top = `${y + 10}px`;
  }

  hidePopup() {
    const popup = document.querySelector('.lsm-slot-popup');
    if (popup) {
      popup.remove();
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

  getOutcome(): Promise<string> {
    return new Promise((resolve) => {
      if (this.outcome === '') this.rollTable(resolve);
      else resolve(this.outcome);
    });
  }

  rollTable(resolve: (outcome: string) => void) {
    for (const row of this.table) {
      const [min, max] = parseDiceRange(row.Chance);
      if (this.roll > max) continue;
      if (this.roll < min) {
        const prevRow = this.table[this.table.indexOf(row) - 1];
        if (prevRow && prevRow.Chance) {
          const [, prevMax] = parseDiceRange(prevRow.Chance);
          const diffToCurrentMin = min - this.roll;
          const diffToPrevMax = this.roll - prevMax;
          const takeCurrent = diffToCurrentMin < diffToPrevMax;
          const item = takeCurrent ? row.Item : prevRow.Item;
          this.roll = takeCurrent ? min : prevMax;
          const timeouts = this.rollSlots();
          setTimeout(() => {
            this.stopSlots(item, timeouts);
            this.outcome = item;
            resolve(this.outcome);
          }, 2000);
          return;
        }
      }
      if (this.roll >= min && this.roll <= max) {
        const timeouts = this.rollSlots();
        setTimeout(() => {
          this.stopSlots(row.Item, timeouts);
          this.outcome = row.Item;
          resolve(this.outcome);
        }, 2000);
        return;
      }
    }
  }

  addSlotItem(item: string, number: number) {
    const slot = document.createElement('div');
    slot.className = 'lsm-slot-item fade-in';
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
        slotItem.style.display = 'none';
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

  preventReroll() {
    this.table = this.table.filter(row => row.Chance !== "Roll twice again");
  }
}

export { Slot };


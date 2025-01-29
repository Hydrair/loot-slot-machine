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
  rolling: boolean = false;
  timeout: number;

  constructor(table: SlotTableRow[], roll: number, pickable: boolean, preventReroll: boolean, timeout: number) {
    this.table = table;
    this.roll = roll;
    this.pickable = pickable;
    this.timeout = timeout

    if (preventReroll) this.preventReroll();

    for (const row of table) {
      this.addSlotItem(row.Item);
    }
    this.render();
  }

  render() {
    const slotContainer = document.getElementById('lsm-slot-container');
    if (slotContainer) {
      this.slotDiv.className = 'lsm-slot';
      slotContainer.appendChild(this.slotDiv);
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
          this.rollSlots();
          setTimeout(() => {
            this.rolling = false;
            this.outcome = item;
            resolve(this.outcome);
          }, this.timeout);
          return;
        }
      }
      if (this.roll >= min && this.roll <= max) {
        this.rollSlots();
        setTimeout(() => {
          this.rolling = false;
          this.outcome = row.Item;
          resolve(this.outcome);
        }, this.timeout);
        return;
      }
    }
  }

  addSlotItem(item: string) {
    const slot = document.createElement('div');
    slot.className = 'lsm-slot-item';
    slot.textContent = item;
    this.slotItems.push(slot);
  }

  async rollSlots() {
    this.rolling = true;
    while (this.rolling) {
      const slotItem = this.slotItems[Math.floor(Math.random() * this.slotItems.length)];
      slotItem.style.opacity = '1';
      await new Promise(resolve => setTimeout(resolve, 250));
      slotItem.style.opacity = '0';
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    for (let i = 0; i < this.slotItems.length; i++) {
      const slotItem = this.slotItems[i];
      if (slotItem.textContent === this.outcome) {
        slotItem.style.opacity = '1';
      }
    }
  }

  async makeSlotPickable() {
    if (await this.getOutcome() === "Roll twice again") {
      this.lockSlot();
      return;
    }
    this.pickable = true;
    this.slotDiv.classList.add('lsm-slot-pickable');
    this.slotDiv.addEventListener('click', () => {
      const outcome = this.outcome;
      this.onSlotClick(outcome);
    });
  }

  onSlotClick(outcome: string) {
    // This method will be overridden by SlotManager
    if (import.meta.env.MODE === 'development') console.log(outcome);
  }

  preventReroll() {
    this.table = this.table.filter(row => row.Chance !== "Roll twice again");
  }
}

export { Slot };


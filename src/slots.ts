interface SlotItem {
  id: number;
  name: string;
  value: number;
}

interface Slot {
  id: number;
  items: SlotItem[];
}

let slots: Slot[] = [];

function addSlots(): HTMLDivElement | undefined {
  const slotContainer = document.getElementById('lsm-slot-container');
  if (slotContainer) {
    const slotDiv = document.createElement('div');
    slotDiv.className = 'lsm-slot';
    slotContainer.appendChild(slotDiv);
    return slotDiv;
  }
  return;
}


function addSlotItem(item: string, number: number): HTMLDivElement {
  const slot = document.createElement('div');
  slot.className = 'lsm-slot-item';
  slot.textContent = item;
  slot.style.top = `${50 * number}px`;
  return slot;
}

function rollSlots(slotDiv: HTMLDivElement | undefined) {
  const timeouts = [];
  if (slotDiv) {
    const spins = Math.floor(Math.random() * 15) + 10
    const slotItems = slotDiv.getElementsByClassName('lsm-slot-item');
    for (let i = 0; i < slotItems.length; i++) {
      const slotItem = slotItems[i] as HTMLElement;

      for (let j = 0; j < spins; j++) {
        timeouts.push(setTimeout(() => {
          const offset = (j * 50) % (slotItems.length * 50);
          slotItem.style.transform = `translateY(-${offset}px)`;
        }, j * 200));
      }


    }
  }
  return timeouts;
}

function stopSlots(slotDiv: HTMLDivElement | undefined, outcome: string, timeouts: NodeJS.Timeout[]) {
  if (slotDiv) {
    const slotItems = slotDiv.getElementsByClassName('lsm-slot-item');
    for (let i = 0; i < slotItems.length; i++) {
      const slotItem = slotItems[i] as HTMLElement;
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
}

export { slots, addSlots, addSlotItem, rollSlots, stopSlots };
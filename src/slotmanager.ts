import { Slot } from "./slots";

class SlotManager {
  private slots: Slot[] = [];

  addSlot(slot: Slot): void {
    this.slots.push(slot);
  }

  getSlots(): Slot[] {
    return this.slots;
  }

  createSlot(table: any, roll: number, pickable: boolean): Slot {
    const slot = new Slot(table, roll, pickable);
    this.addSlot(slot);
    return slot;
  }

  chooseSlot(): Promise<string> {
    return new Promise((resolve) => {
      const lockedSlots: Slot[] = []
      const pickableSlots = this.slots.filter(slot => {
        if (slot.pickable) {
          return true;
        }
        lockedSlots.push(slot);
        slot.lockSlot();
        return false;
      });
      if (pickableSlots.length === 0) {
        throw new Error("No pickable slots available");
      }

      pickableSlots.forEach(slot => {
        slot.onSlotClick = (outcome: string) => {
          resolve(outcome);
          lockedSlots.forEach(slot => slot.unlockSlot());
          pickableSlots.forEach(slot => slot.removeSlotClick());
        };
      });
    });
  }
}

export const slotManager = new SlotManager();
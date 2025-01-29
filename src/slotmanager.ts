import { Slot } from "./slots";
import { SocketManager } from "./sockets";
import { getTimeout } from "./util";

class SlotManager {
  private slots: Slot[] = [];
  private bonusRolls = 0;

  addSlot(slot: Slot): void {
    this.slots.push(slot);
  }

  getSlots(): Slot[] {
    return this.slots;
  }

  async createSlot(table: any, maxRoll: number): Promise<Slot> {
    const roll = (await new Roll(`1d${maxRoll}`).roll()).total;

    const timeout = getTimeout();
    const slot = new Slot(table, roll, this.bonusRolls > 0, this.bonusRolls >= 2, timeout);
    // @ts-ignore
    SocketManager.socket?.executeForOthers("renderSlots", table, roll, false, this.bonusRolls >= 2, timeout);
    this.addSlot(slot);
    if (await slot.getOutcome() === "Roll twice again" && this.bonusRolls < 2) {
      this.bonusRolls += 1;
      await Promise.all([
        (await this.createSlot(table, roll)).makeSlotPickable(),
        (await this.createSlot(table, roll)).makeSlotPickable()
      ]);
    } else if (await slot.getOutcome() === "Roll twice again" && this.bonusRolls >= 2) {
      slot.preventReroll();
    }
    this.bonusRolls = 0;
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

  async getOutcome(slot: Slot): Promise<string> {
    if (slot.outcome === "Roll twice again") {
      this.bonusRolls = 0;
      const outcome = await this.chooseSlot();
      this.slots = [];
      return outcome;
    }
    return slot.getOutcome();
  }
}

export const slotManager = new SlotManager();
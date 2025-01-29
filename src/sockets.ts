// @ts-nocheck
import { SlotMachineApp } from "./main";
import { Slot } from "./slots";
import { confetti } from "@tsparticles/confetti";

export const SocketManager = {
  socket: null,

  registerSocket: function () {
    // @ts-ignore
    this.socket = socketlib.registerModule("loot-slot-machine");
    this.socket.register("render", render);
    this.socket.register("renderSlots", renderSlots);
    this.socket.register("renderDetails", renderDetails);
  },
};

function render(roller: string, character: string) {
  const isOpen = document.querySelector(".table-roller.result-window");
  if (!isOpen) {
    new SlotMachineApp(false, roller, character).render(true);
  }
  const itemContainer = document.getElementById("lsm-item-container")
  itemContainer ? itemContainer.innerHTML = "" : console.warn("Item container not found.");
  const slotContainer = document.getElementById("lsm-slot-container")
  slotContainer ? slotContainer.innerHTML = "" : console.warn("Slot container not found.");
}

function renderSlots(table: any, roll: number, pickable: boolean, preventReroll: boolean, timeout: number) {
  console.log("Rendering slots");
  const slot = new Slot(table, roll, pickable, preventReroll, timeout);
  new Promise((resolve) => { slot.rollTable(resolve) });
}

function renderDetails(itemDetails: any) {
  (async () => {
    await confetti({
      count: 100,
      zIndex: 99999,
      scalar: 2
    });
  })();
  const containerId = "lsm-item-container";
  const container = document.querySelector(`#${containerId}`);
  if (container) {
    container.innerHTML = itemDetails;
  } else {
    console.error(`Container with ID "${containerId}" not found.`);
  }
}
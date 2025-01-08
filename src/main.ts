import { TableManager } from "./table-manager";
import { createAndDisplayItem, createLsmItem } from "./items";
import { renderActors } from "./util";

Hooks.once("ready", async function () {
  console.log("Loot Slot Machine | Initialized");
  new SlotMachineApp().render(true);

  // Register chat command
  Hooks.on("chatMessage", (_, message) => {
    if (message.trim().toLowerCase() === "slot") {
      new SlotMachineApp().render(true);
      return false; // Prevents the message from being posted to chat
    }
    return true; // Allow other messages to be posted to chat
  });
});


class SlotMachineApp extends Application {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Loot Slot Machine",
      template: "modules/loot-slot-machine/roll-window.html",
      width: 700,
      height: 600,
    });
  }

  override async activateListeners(html: any) {
    super.activateListeners(html);
    // await searchPotions();

    renderActors();
    const rollButton = html.find("#lsm-roll-button");
    if (!rollButton) return;
    // Attach event listener to the roll button
    rollButton.on("click", async () => {
      const itemContainer = document.getElementById("lsm-item-container")
      itemContainer ? itemContainer.innerHTML = "" : console.warn("Item container not found.");
      const slotContainer = document.getElementById("lsm-slot-container")
      slotContainer ? slotContainer.innerHTML = "" : console.warn("Slot container not found.");
      try {
        const outcome = (await TableManager.rollOnTable("loot-table.tsv")).toLowerCase();
        if (ui.notifications) {
          ui.notifications.info(`Rolled: ${outcome}`);
          const item = createLsmItem(outcome);

          if (item) {
            await item.roll();
            createAndDisplayItem(item, "lsm-item-container");
            rollButton.innerText = "Roll Again";
          } else {
            console.warn("Item is null.");
          }
        } else {
          console.warn("Notifications UI is not available.");
        }
      } catch (err: any) {
        console.error(err);
        if (ui.notifications) {
          ui.notifications.error(`Error: ${err.message}`);
        } else {
          console.warn(`Error: ${err.message}`);
        }
      }
    });
  }
}
// async function searchPotions() {
//   const table = await TableManager.loadTable('potion.tsv');
//   // const items = ["Healing Potion", "Healing Potion (Moderate)", "Healing Potion (Minor)", "Healing Potion (Major)", "Healing Potion (Lesser)", "Healing Potion (Greater)"];
//   const items = table.map(row => row.Item);
//   const notfound = [];
//   const found = [];
//   for (const item of items) {
//     const res = await searchAllItems(item);
//     if (res) found.push(item);
//     if (!res) {
//       notfound.push(item);
//     }
//   }
//   console.log("notfound:", notfound);
//   console.log("found:", found);
// }
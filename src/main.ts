import { TableManager } from "./table-manager";
import { createLsmItem } from "./items";

Hooks.once("init", async function () {
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

  override activateListeners(html: any) {
    super.activateListeners(html);

    // Attach event listener to the roll button
    html.find("#roll-button").on("click", async () => {
      try {

        const outcome = await TableManager.rollOnTable("loot-table.csv");
        if (ui.notifications) {
          ui.notifications.info(`Rolled: ${outcome}`);
          const item = createLsmItem(outcome);

          if (item) {
            item.roll();
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


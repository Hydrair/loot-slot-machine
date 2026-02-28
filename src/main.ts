import { TableManager } from "./table-manager";
import { createAndDisplayItem, createLsmItem } from "./items";
import { getMaxPlayerLevel, logToChat, renderLootOptions } from "./util";
import { SocketManager } from "./sockets";
import { attachNeedGreedListeners } from "./need-greed";

Hooks.once("ready", async function () {
  console.log("Loot Slot Machine | Initialized");
  if (import.meta.env.MODE === "development") {
    new SlotMachineApp(true).render(true);
  }
  // Register chat command
  Hooks.on("chatMessage", (_, message: string) => {
    if (message.trim().toLowerCase() === "/slot") {
      new SlotMachineApp(true).render(true);
      return false;
    }
    return true;
  });

  // Attach Need/Greed button handlers to chat messages
  // @ts-ignore
  Hooks.on("renderChatMessage", (message: ChatMessage, html: any) => {
    // html can be jQuery or HTMLElement depending on Foundry version
    const el = html instanceof HTMLElement ? html : html[0];
    if (el) attachNeedGreedListeners(message, el);
  });
});

Hooks.once("socketlib.ready", () => {
  SocketManager.registerSocket();
});


export class SlotMachineApp extends Application {
  private showSelections: boolean;
  private roller: string;

  constructor(showSelections: boolean = false, roller: string = "") {
    super();
    this.showSelections = showSelections;
    this.roller = roller;
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      title: "Loot Slot Machine",
      template: "modules/loot-slot-machine/roll-window.hbs",
      width: 700,
      height: 600,
    });
  }

  override async getData() {
    return {
      showSelections: this.showSelections,
      roller: this.roller,
    };
  }

  override async activateListeners(html: any) {
    super.activateListeners(html);

    if (this.showSelections) {
      renderLootOptions(await TableManager.loadTable("loot-table.tsv"));
    }

    const rollButton = html.find("#lsm-roll-button");
    if (!rollButton) return;
    // Attach event listener to the roll button
    rollButton.on("click", async () => {
      // @ts-ignore
      SocketManager.socket?.executeForOthers("render", game.user.name);
      const itemContainer = document.getElementById("lsm-item-container")
      itemContainer ? itemContainer.innerHTML = "" : console.warn("Item container not found.");
      const slotContainer = document.getElementById("lsm-slot-container")
      slotContainer ? slotContainer.innerHTML = "" : console.warn("Slot container not found.");
      const lootOptions = (document.getElementById('lsm-select-loot') as HTMLSelectElement).value
      const level = getMaxPlayerLevel();

      try {
        const outcome = lootOptions === "Random"
          ? (await TableManager.rollOnTable("loot-table.tsv")).toLowerCase()
          : lootOptions;

        logToChat(`Rolling for ${outcome}...`);

        const item = createLsmItem(outcome.toLowerCase(), level);

        if (item) {
          await item.roll();
          createAndDisplayItem(item);
          rollButton.innerText = "Roll Again";
        } else {
          console.warn("Item is null.");
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
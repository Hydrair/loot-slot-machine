import { Grimoire, LsmItem, Staff, Potion, Weapon } from "./declarations";


export async function searchEquipment(searchQuery: string): Promise<Item> {
  const results: Item[] = [];
  const regex = new RegExp(`^${searchQuery}$`, "i"); // Case-insensitive exact match

  // Filter compendiums with "Equipment" in their label
  if (!game.packs) {
    console.error("game.packs is undefined");
    return results[0];
  }
  const targetPacks = game.packs
    .filter((pack: any) =>
      pack.metadata.label.includes("Equipment") && pack.documentName === "Item"
    );

  for (const pack of targetPacks) {
    console.log(`Searching in ${pack.metadata.label}...`);

    // Use index for lightweight searching
    //@ts-ignore
    const matchingIndexes = pack.index.filter(entry => regex.test(entry.name));

    // Fetch full documents for matching indexes
    const matchingDocuments = await Promise.all(matchingIndexes.map(entry => pack.getDocument(entry._id)));

    //@ts-ignore
    results.push(...matchingDocuments);
  }

  console.log(`Found ${results.length} matching items in "Equipment" compendiums:`, results);
  return results[0];
}

// Function to create an item
export async function createAndDisplayItem(lsmItem: LsmItem, containerId: string) {
  const template = await searchEquipment(lsmItem.item);
  const itemData = lsmItem.toItemData();
  const combinedSystemData = {
    ...template.system,
    ...itemData
  };

  // @ts-ignore
  const item = await Item.create({
    ...template, system: combinedSystemData
  }, { renderSheet: false, parent: game.actors?.get((document.getElementById('lsm-character-select') as HTMLSelectElement).value) }) as Item;

  console.log("Item created:", item);
  if (!item) {
    console.error("Failed to create the item.");
    return;
  }

  // @ts-ignore
  const description = await TextEditor.enrichHTML(item.system.description.value, {})
  const itemDetails = `
    <div class="lsm-item-display">
      <img class="lsm-item-img" src="${item.img}" alt="${item.name}" />
      <h2>${item.name}</h2>
      <p>${description || "No description available."}</p>
    </div>
  `;

  // Display in the specified container
  const container = document.querySelector(`#${containerId}`);
  if (container) {
    container.innerHTML = itemDetails;
  } else {
    console.error(`Container with ID "${containerId}" not found.`);
  }
}



const itemClassMap: { [key: string]: any } = {
  grimoire: Grimoire,
  potions: Potion,
  staff: Staff,
  weapon: Weapon,
  // Add other item types here
};

export function createLsmItem(itemType: string): LsmItem | null {
  const ItemClass = itemClassMap[itemType.toLowerCase()];
  if (!ItemClass) {
    console.error(`Item type "${itemType}" is not recognized.`);
    return null;
  }
  return new ItemClass();
}


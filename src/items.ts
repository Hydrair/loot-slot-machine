import { Grimoire, LsmItem, Potion } from "./declarations";


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
  // Create the item in the world
  console.log("Creating item...");
  searchEquipment("Silver (Low)")
  const template = await searchEquipment(lsmItem.item);
  console.log(template, lsmItem);
  const itemData = lsmItem.toItemData();

  const item = await Item.create(template, { renderSheet: true }) as unknown as Item;

  if (!item) {
    console.error("Failed to create the item.");
    return;
  }

  // Get the item's details
  const itemDetails = `
      <div class="item-display">
          <h2>${item.name}</h2>
          <p>${item.system?.description?.value || "No description available."}</p>
          <p><strong>Type:</strong> ${item.type}</p>
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


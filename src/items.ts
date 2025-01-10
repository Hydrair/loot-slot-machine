import { Grimoire, LsmItem, Staff, Potion, Weapon, Worn, Armor, Jewelry, Scroll, Wand } from "./declarations";


export async function searchItem(searchQuery: string, itemType: string = "Equipment"): Promise<Item> {
  const results: Item[] = [];
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters in the search query
  const regex = new RegExp(`^${escapedQuery}$`, "i"); // Case-insensitive exact match

  // Filter compendiums with itemType in their label
  if (!game.packs) {
    console.error("game.packs is undefined");
    return results[0];
  }
  const targetPacks = game.packs
    .filter((pack: any) =>
      pack.metadata.label.includes(itemType)
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

  console.log(`Found ${results.length} matching items in "${itemType}" compendiums:`, results);
  return results[0];
}

export async function searchAllItems(searchQuery: string) {

  const results = [];
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special characters in the search query
  const regex = new RegExp(escapedQuery, "i"); // Case-insensitive regex for matching names
  const potionPacks = game.packs

  for (const pack of potionPacks) {

    // Use the index for lightweight searches
    const matchingIndexes = pack.index.filter(entry => regex.test(entry.name));

    // Fetch the full documents for the matching indexes
    const matchingDocuments = await Promise.all(
      matchingIndexes.map(entry => pack.getDocument(entry._id))
    );
    if (matchingDocuments.length > 0) {
      console.log(`Found ${matchingDocuments.length} matching items in "${pack.metadata.label}" compendium:`, matchingDocuments, pack);
    }
    results.push(...matchingDocuments);
  }

  return results.length > 0 ? results : null;
}

async function getItem(lsmItem: LsmItem) {
  const template = await searchItem(lsmItem.item, lsmItem.itemType);
  const itemData = lsmItem.toItemData();
  const combinedSystemData = {
    ...template.system,
    ...itemData
  };

  // @ts-ignore
  return await Item.create({
    ...template, system: combinedSystemData
  }, { renderSheet: false }) as Item;
}

export async function createAndDisplayItem(lsmItem: LsmItem, containerId: string) {
  const actor = game.actors?.get((document.getElementById('lsm-character-select') as HTMLSelectElement).value) as Actor;
  const item = typeof lsmItem.item === "string" ? await getItem(lsmItem) : lsmItem.item;
  // await actor?.createEmbeddedDocuments("Item", [item]);

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
      <div class="lsm-item-properties">
        <h2>${item.name}</h2>
        <p>${description || "No description available."}</p>
      </div>
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
  potion: Potion,
  staff: Staff,
  weapon: Weapon,
  worn: Worn,
  armor: Armor,
  jewelry: Jewelry,
  scroll: Scroll,
  wand: Wand
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


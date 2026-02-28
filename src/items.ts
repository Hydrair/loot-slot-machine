import { Grimoire, LsmItem, Staff, Potion, Weapon, Worn, Armor, Shield, Jewelry, Scroll, Wand } from "./declarations";
import { SocketManager } from "./sockets";
import { postNeedGreedMessage } from "./need-greed";
import { logToChat } from "./util";


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
    // Use index for lightweight searching
    //@ts-ignore
    const matchingIndexes = pack.index.filter(entry => regex.test(entry.name));

    // Fetch full documents for matching indexes
    const matchingDocuments = await Promise.all(matchingIndexes.map(entry => pack.getDocument(entry._id)));

    //@ts-ignore
    results.push(...matchingDocuments);
  }

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
    results.push(...matchingDocuments);
  }

  return results.length > 0 ? results : null;
}

export async function createItemOnActor(lsmItem: LsmItem, actor: Actor): Promise<Item> {
  if (typeof lsmItem.item === "string") {
    const template = await searchItem(lsmItem.item, lsmItem.itemType);
    const itemData = lsmItem.toItemData();
    const combinedSystemData = {
      ...template.system,
      ...itemData
    };
    // @ts-ignore
    return await Item.create({
      ...template, system: combinedSystemData
    }, { renderSheet: false, parent: actor }) as Item;
  } else {
    return (await actor.createEmbeddedDocuments("Item", [lsmItem.item]))[0] as Item;
  }
}

export async function createItemFromSerialized(
  serializedItem: SerializedLsmItem,
  templateData: any,
  actor: Actor
): Promise<Item> {
  if (serializedItem.isSourceObject && templateData) {
    // Staff/Wand/Scroll path: templateData IS the full source object
    return (await actor.createEmbeddedDocuments("Item", [templateData]))[0] as Item;
  } else if (templateData) {
    // Normal path: merge template with item data
    const combinedSystemData = {
      ...templateData.system,
      ...serializedItem.itemData
    };
    // @ts-ignore
    return await Item.create({
      ...templateData, system: combinedSystemData
    }, { renderSheet: false, parent: actor }) as Item;
  }
  throw new Error("Cannot create item: no template data available");
}

export interface SerializedLsmItem {
  itemType: string;
  itemData: any;
  isSourceObject: boolean;
}

export function serializeLsmItem(lsmItem: LsmItem): SerializedLsmItem {
  const isSourceObject = typeof lsmItem.item !== "string";
  return {
    itemType: lsmItem.file,
    itemData: isSourceObject ? null : lsmItem.toItemData(),
    isSourceObject,
  };
}

export async function createAndDisplayItem(lsmItem: LsmItem) {
  let itemName: string;
  let itemImg: string;
  let description: string;
  let templateData: any = null;

  if (typeof lsmItem.item === "string") {
    const template = await searchItem(lsmItem.item, lsmItem.itemType);
    itemName = template?.name ?? lsmItem.item;
    itemImg = template?.img ?? "icons/svg/chest.svg";
    // @ts-ignore
    description = await TextEditor.enrichHTML(template?.system?.description?.value ?? "", {});
    templateData = template?.toObject?.() ?? null;
    // Merge the lsmItem data into the template for later creation
    if (templateData) {
      templateData.system = { ...templateData.system, ...lsmItem.toItemData() };
    }
  } else {
    // Staff/Wand/Scroll — item is already a source object
    itemName = lsmItem.item.name ?? "Unknown Item";
    itemImg = lsmItem.item.img ?? "icons/svg/chest.svg";
    // @ts-ignore
    description = await TextEditor.enrichHTML(lsmItem.item.system?.description?.value ?? "", {});
    templateData = lsmItem.item;
  }

  // Display in the slot machine window
  const itemDetails = `
    <div class="lsm-item-display">
      <img class="lsm-item-img" src="${itemImg}" alt="${itemName}" />
      <div class="lsm-item-properties">
        <h2>${itemName}</h2>
        <p>${description || "No description available."}</p>
      </div>
    </div>
  `;

  // @ts-ignore
  SocketManager.socket?.executeForEveryone("renderDetails", itemDetails);

  // Post Need/Greed chat message for distribution
  const serialized = serializeLsmItem(lsmItem);
  await postNeedGreedMessage(serialized, templateData, itemName, itemImg, description);
}



const itemClassMap: { [key: string]: any } = {
  grimoire: Grimoire,
  potion: Potion,
  staff: Staff,
  weapon: Weapon,
  worn: Worn,
  armor: Armor,
  shield: Shield,
  jewelry: Jewelry,
  scroll: Scroll,
  wand: Wand
  // Add other item types here
};

export function createLsmItem(itemType: string, level: number = 0): LsmItem | null {
  const ItemClass = itemClassMap[itemType];
  if (!ItemClass) {
    console.error(`Item type "${itemType}" is not recognized.`);
    return null;
  }
  return new ItemClass(itemType, level);
}


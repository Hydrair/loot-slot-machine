import { TableManager } from "./table-manager";

export function renderActors() {
  // @ts-ignore
  const actors = game.actors?.filter((actor: Actor) => actor.type === "character");
  const characterSelect = document.getElementById("lsm-select-character") as HTMLSelectElement;
  if (!characterSelect) {
    console.error("Character select element not found.");
    return;
  }
  // @ts-ignore
  for (const actor of actors) {
    const option = document.createElement("option");
    option.value = actor.id;
    // @ts-ignore
    option.text = actor.name;
    characterSelect.appendChild(option);
  }
}

export function renderLootOptions(options: any[]) {
  const lootSelect = document.getElementById("lsm-select-loot") as HTMLSelectElement;
  if (!lootSelect) {
    console.error("Character select element not found.");
    return;
  }

  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.Item;
    element.text = option.Item;
    lootSelect.appendChild(element);
  }
}

export function getActorLevel() {
  const characterSelect = document.getElementById("lsm-select-character") as HTMLSelectElement;
  // @ts-ignore
  return game.actors?.get(characterSelect.value).system.details.level.value;
}

export function filterTableByLevel(table: any[], maxLevel: number) {
  for (let i = table.length - 1; i >= 0; i--) {
    if (table[i].Level > maxLevel) {
      table.splice(i, 1); // Remove elements that don't match the condition
    }
  }
}

export function filterTableByCondition(table: any[], condition: string[]) {
  for (let i = table.length - 1; i >= 0; i--) {
    if (!table[i].Condition) continue;
    if (table[i].Condition.includes('melee') && condition.includes('ranged')) table.splice(i, 1);
    if (!condition.some(cond => table[i].Condition.includes(cond))) {
      table.splice(i, 1); // Remove elements that don't match the condition
    }
  }
}

export function filterTableByQuality(table: any[], quality: string) {
  return table.map(entry => {
    const keyToKeep = entry[quality];
    return keyToKeep
      ? { "Chance": keyToKeep, Item: entry.Item }
      : null; // Filter out entries where the quality key has no value
  }).filter(Boolean);
}

export function chooseColumn(table: any[], column: string | number) {
  return table.map(row => row[column]);
}

export function getDmgType(item: Item) {
  // @ts-ignore
  return item.system.damage.damageType;
}

export function getTraits(item: Item) {
  // @ts-ignore
  return item.system.traits.value;
}

export function getArmorType(item: Item) {
  // @ts-ignore
  return item.system.category;
}

export function containsQuality(table: any[]) {
  if (Object.keys(table[0]).includes('Minor')
    && Object.keys(table[0]).includes('Lesser')
    && Object.keys(table[0]).includes('Moderate')
    && Object.keys(table[0]).includes('Greater')
    && Object.keys(table[0]).includes('Major')) {
    return (document.getElementById('lsm-select-quality') as HTMLSelectElement).value;
  }
  return 'Chance';
}

export function splitString(input: string) {
  const regex = /^(\+?\d+)\s+(.+)$/;
  const match = input.match(regex);

  if (match) {
    return {
      potency: parseInt(match[1], 10), // "+1"
      bonus: match[2],  // "Striking weapon"
    };
  } else {
    return { potency: 0, bonus: '' };
  }
}

export function replaceEnchanted(input: string) {
  return input.replace(/Enchanted/g, "striking")
    .replace(/(Staff|Wand)/g, "weapon");
}

export function purifyRunes(_rune: string) {
  const rune = _rune.replace(/[- ]/g, '');
  const regex = /(.*)\((\w*)\)/;
  const match = rune.match(regex);

  if (match) {
    const wordInParentheses = match[2];
    const remainingString = match[1];
    const camelCasedString = wordInParentheses.toLowerCase() + remainingString.charAt(0).toUpperCase() + remainingString.slice(1);
    return camelCasedString;
  }

  return rune.charAt(0).toLowerCase() + rune.slice(1);
}

interface PotionMatch {
  prefix: string;
  coreName: string;
  suffix: string;
}

export function addElementToRetaliation(potionName: string, descriptor: string): string {
  const regex = /^(Potion of )(.+?)( \(.+\))?$/;
  const match = potionName.match(regex);

  if (match) {
    const potionMatch: PotionMatch = {
      prefix: match[1], // "Potion of "
      coreName: match[2], // "Retaliation"
      suffix: match[3] || "" // "(Lesser)" or empty string
    };

    return `${potionMatch.prefix}${descriptor} ${potionMatch.coreName}${potionMatch.suffix}`;
  }

  // If the name doesn't match the expected pattern, return it unchanged
  return potionName;
}

export function addElementToEnergyBreath(potionName: string, descriptor: string): string {
  const regex = /^(.*?Potion)(?: \((.*)\))?$/;
  const match = potionName.match(regex);

  if (match) {
    const baseName = match[1]; // "Energy Breath Potion"
    const suffix = match[2] ? `(${descriptor}, ${match[2]})` : `(${descriptor})`;

    return `${baseName} ${suffix}`;
  }

  // If the name doesn't match the expected pattern, return it unchanged
  return potionName;
}

export async function getSpellsByLevel(level: number, tradition?: string) {
  const results: Item[] = [];
  // @ts-ignore
  const targetPacks = game.packs
    .filter((pack: any) =>
      pack.metadata.label.includes('Spells')
    );

  for (const pack of targetPacks) {
    const spells = await pack.getDocuments({ type: 'spell' });
    // @ts-ignore
    let filtered = spells.filter((spell: any) => spell.system.level.value === level);
    if (tradition) {
      filtered = filtered.filter((spell: any) => spell.system.traits.traditions?.includes(tradition));
    }
    results.push(filtered);
  }

  console.log(`Found ${results.flat().length} matching spells${tradition ? ` (${tradition})` : ''} at rank ${level}`);
  return results.flat();
}

export function extractScrollRank(scrollName: string): number {
  const regex = /^(\d+)[a-z]+-rank Scroll$/;
  const match = scrollName.match(regex);
  return match ? parseInt(match[1], 10) : 0; // Returns the integer rank or null if no match
}

export async function createScrollFromSpell(spell: any, rank: number): Promise<any> {
  // @ts-ignore - CONFIG.PF2E.spellcastingItems is set up by the PF2E system
  const scrollData = CONFIG.PF2E.spellcastingItems?.scroll;
  const uuid = scrollData?.compendiumUuids?.[rank];

  if (!uuid) {
    console.warn(`LSM: No scroll template UUID for rank ${rank}`);
    return null;
  }

  // @ts-ignore - fromUuid is a Foundry global
  const template = await fromUuid(uuid);
  if (!template) {
    console.warn(`LSM: Failed to load scroll template from ${uuid}`);
    return null;
  }

  const source = template.toObject();
  source._id = null;

  // Set name: "Scroll of {Spell Name} (Rank {N})"
  if (scrollData.nameTemplate) {
    // @ts-ignore
    source.name = game.i18n.format(scrollData.nameTemplate, { name: spell.name, level: rank });
  } else {
    source.name = `Scroll of ${spell.name} (Rank ${rank})`;
  }

  // Merge spell traits into scroll traits
  const spellTraits = spell.system?.traits?.value ?? [];
  const scrollTraits = source.system.traits.value ?? [];
  source.system.traits.value = [...new Set([...scrollTraits, ...spellTraits])].sort();
  source.system.traits.rarity = spell.system?.traits?.rarity ?? 'common';

  // Embed the spell into the scroll
  // @ts-ignore
  const spellSource = spell.toObject();
  // @ts-ignore
  spellSource._id = foundry.utils.randomID();
  spellSource.system.location = { value: null, heightenedLevel: rank };
  source.system.spell = spellSource;

  // Add spell description reference
  const spellRef = spell.sourceId ? `@UUID[${spell.sourceId}]{${spell.name}}` : spell.system?.description?.value ?? '';
  const existingDesc = source.system.description.value ?? '';
  source.system.description.value = `<p>${spellRef}</p><hr>${existingDesc}`;

  return source;
}

export function parseDiceRange(range: string) {
  const [min, max] = range.split("-").map(Number);
  if (isNaN(min) || isNaN(max))
    throw new Error(`Invalid dice range: ${range}`);
  return [min, max];
}

export async function logToChat(message: string) {
  await ChatMessage.create({
    style: CONST.CHAT_MESSAGE_STYLES.EMOTE,
    content: message,
  });
}

export async function getElementDamage(element: string, weapon: string) {
  const elements = await TableManager.loadTable(`${weapon}-element.tsv`);
  const elementRow = elements.find(row => row.Item.toLowerCase() === element.toLowerCase());
  if (elementRow) {
    const [dice, die] = elementRow.Damage.split('d');
    return { dice: parseInt(dice, 10), die: `d${die}`, effect: elementRow.Effect };
  }
  return { dice: 1, die: 'd6', effect: '' };
}

export function getTimeout() {
  return import.meta.env.MODE === 'development' ? 0 : (Math.floor(Math.random() * 4) + 3) * 1000;
}
export function renderActors() {
  // @ts-ignore
  const actors = game.actors?.filter((actor: Actor) => actor.type === "character");
  const characterSelect = document.getElementById("lsm-character-select") as HTMLSelectElement;
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

export function getActorLevel() {
  const characterSelect = document.getElementById("lsm-character-select") as HTMLSelectElement;
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
  for (let i = table.length - 1; i >= 0; i--) {
    if (!table[i][quality]) {
      table.splice(i, 1); // Remove elements that don't match the condition
    }
  }
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
    return (document.getElementById('quality-select') as HTMLSelectElement).value;
  }
  return 'd%';
}

export function splitString(input: string) {
  const regex = /^(\+?\d+)\s+(.+)$/;
  const match = input.match(regex);

  if (match) {
    return {
      potency: match[1], // "+1"
      bonus: match[2],  // "Striking weapon"
    };
  } else {
    throw new Error("Input does not match the expected format");
  }
}

export function replaceEnchanted(input: string) {
  return input.replace(/Enchanted/g, "striking")
    .replace(/(Staff|Wand)/g, "weapon");
}

export function purifyRunes(rune: string) {
  if (rune.includes("(Greater)")) {
    rune = "Greater " + rune.replace(" (Greater)", "");
  }
  return rune.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
    index === 0 ? match.toLowerCase() : match.toUpperCase()
  ).replace(/\s+/g, '');
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

export async function getSpellsByLevel(level: number) {
  const results: Item[] = [];
  // @ts-ignore
  const targetPacks = game.packs
    .filter((pack: any) =>
      pack.metadata.label.includes('Spells')
    );

  for (const pack of targetPacks) {
    const spells = await pack.getDocuments({ type: 'spell' });
    // @ts-ignore
    results.push(spells.filter((spell: any) => spell.system.level.value === level))
  }

  console.log(`Found ${results.length} matching items in Spells compendiums:`, results);
  return results.flat();
}

export function extractScrollRank(scrollName: string): number {
  const regex = /^(\d+)[a-z]+-rank Scroll$/;
  const match = scrollName.match(regex);
  return match ? parseInt(match[1], 10) : 0; // Returns the integer rank or null if no match
}
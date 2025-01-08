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
    if (table[i].level > maxLevel) {
      table.splice(i, 1); // Remove elements that don't match the condition
    }
  }
}

export function filterTableByCondition(table: any[], condition: string[]) {
  const validConditions = ["slashing", "bludgeoning", "melee", "piercing", "throw"];
  const filteredConditions = condition.filter(cond => validConditions.includes(cond));
  if (filteredConditions.length > 0) {
    for (let i = table.length - 1; i >= 0; i--) {
      if (!filteredConditions.includes(table[i].condition)) {
        table.splice(i, 1); // Remove elements that don't match the condition
      }
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
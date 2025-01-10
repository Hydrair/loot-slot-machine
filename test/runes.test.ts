
import { expect, test } from 'vitest'
import { purifyRunes } from '../src/util';
import { ARMOR_PROPERTY_RUNE_TYPES, WEAPON_PROPERTY_RUNE_TYPES } from './definitions';
import { loadTable } from './util';

test('Check armor runes', async () => {

  console.log('Loading armor-runes.tsv...');
  const runes = await loadTable('armor/armor-runes.tsv');

  for (const rune of runes) {
    if (rune.includes("Energy-Resistant")) continue;
    if (rune.includes("Energy-Absorbing")) continue;
    if (rune.includes("Spellbreaking")) continue;
    if (rune.includes("Cavern's Heart")) continue;
    if (rune.includes("Roll twice again")) continue;

    const purifiedRune = purifyRunes(rune);
    expect(ARMOR_PROPERTY_RUNE_TYPES).toContain(purifiedRune);
  }
});

test('Check weapon runes', async () => {

  console.log('Loading weapon-runes.tsv...');
  const runes = await loadTable('weapon/weapon-runes.tsv');

  for (const rune of runes) {
    if (rune.includes("Roll twice again")) continue;
    const purifiedRune = purifyRunes(rune);
    expect(WEAPON_PROPERTY_RUNE_TYPES).toContain(purifiedRune);
  }
});
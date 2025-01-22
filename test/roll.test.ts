/**
 * @vitest-environment jsdom
 */

import { expect, test } from 'vitest'
import { Slot } from '../src/slots';

const table = [
  { Item: 'Item 1', Chance: '1-5' },
  { Item: 'Item 2', Chance: '6-10' },
  { Item: 'Item 4', Chance: '16-20' },
]


test('Roll towards lower', async () => {
  console.log('Rolling...');
  const slot = new Slot(table, 12, false, false);

  slot.rollTable();

  console.log('Outcome:', slot.roll, slot.outcome);
  expect(slot.outcome).toBe('Item 2');
});

test('Roll towards higher', async () => {
  console.log('Rolling...');
  const slot = new Slot(table, 14, false, false);

  slot.rollTable();
  console.log('Outcome:', slot.roll, slot.outcome);

  expect(slot.outcome).toBe('Item 4');
});

test('Roll exact', async () => {
  console.log('Rolling...');
  const slot = new Slot(table, 18, false, false);

  slot.rollTable();
  console.log('Outcome:', slot.roll, slot.outcome);

  expect(slot.outcome).toBe('Item 4');
});

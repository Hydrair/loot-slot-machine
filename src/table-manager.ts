import Papa from "papaparse";
import { addSlotItem, addSlots, rollSlots, stopSlots } from "./slots";
import { containsQuality, filterTableByCondition, filterTableByLevel, filterTableByQuality } from "./util";

// Ensure PapaParse is globally available or import it dynamically
if (typeof Papa === "undefined") {
  throw new Error(
    "PapaParse is not loaded. Make sure it is included in your module.json or imported dynamically."
  );
}

export const TableManager = {

  loadTable: async function (csvFileName: string): Promise<Array<{ [key: string]: any }>> {
    const response = await fetch(
      `modules/loot-slot-machine/tables/${csvFileName}`
    );
    if (!response.ok) throw new Error(`Failed to load table: ${csvFileName}`);

    const csvData = await response.text();

    // Parse the CSV data using PapaParse
    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      throw new Error(
        `Error parsing CSV: ${parsed.errors.map((e) => e.message).join(", ")}`
      );
    }

    return parsed.data as Array<{}>;
  },


  parseDiceRange: function (range: string) {
    const [min, max] = range.split("-").map(Number);
    if (isNaN(min) || isNaN(max))
      throw new Error(`Invalid dice range: ${range}`);
    return [min, max];
  },

  rollOnTable: async function (csvFileName: string, level: number = 0, conditions?: string[], reroll?: boolean,) {
    const table = await this.loadTable(csvFileName);

    const quality = containsQuality(table);

    if (quality !== "d%") {
      filterTableByQuality(table, quality);
    }

    if (level > 0) {
      filterTableByLevel(table, level);
    }

    if (conditions && conditions.length > 0) {
      filterTableByCondition(table, conditions);
    }

    const maxRoll = table[table.length - 1][quality].split("-")[1];
    const roll = (await new Roll(`1d${maxRoll}`).roll()).total;
    console.log(`Rolled a ${roll} on the ${quality} table`);

    const slots = addSlots();
    let i = 0;
    for (const row of table) {
      slots?.appendChild(addSlotItem(row.Item, i++));
    }
    const timeouts = rollSlots(slots);

    if (reroll) table.pop()

    for (const row of table) {
      if (!row[quality]) continue;
      const [min, max] = this.parseDiceRange(row[quality]);
      if (roll < min) {
        const prevRow = table[table.indexOf(row) - 1];
        if (prevRow && prevRow[quality]) {
          const [, prevMax] = this.parseDiceRange(prevRow[quality]);
          const diffToMin = min - roll;
          const diffToPrevMax = roll - prevMax;
          return diffToMin < diffToPrevMax ? diffToMin : diffToPrevMax;
        }
      }
      if (roll >= min && roll <= max) {
        setTimeout(() => stopSlots(slots, row.Item, timeouts), 2000);
        return row.Item;
      }
    }

    // in case of reroll
    return (table.pop())?.Item;

  },

};

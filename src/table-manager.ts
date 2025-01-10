import Papa from "papaparse";
import { containsQuality, filterTableByCondition, filterTableByLevel, filterTableByQuality } from "./util";
import { slotManager } from "./slotmanager";

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




  rollOnTable: async function (csvFileName: string, options: { level?: number, conditions?: string[], skipLast?: boolean, pickable?: boolean } = {}) {
    const { level = 0, conditions, pickable = false, skipLast = false } = options;
    let table = await this.loadTable(csvFileName);

    const quality = containsQuality(table);

    if (skipLast) table.pop()

    if (quality !== "Chance") {
      table = filterTableByQuality(table, quality).filter(row => row !== null);
    }

    if (level > 0) {
      filterTableByLevel(table, level);
    }

    if (conditions && conditions.length > 0) {
      filterTableByCondition(table, conditions);
    }

    const maxRoll = table[table.length - 1].Chance.split("-")[1];
    const roll = (await new Roll(`1d${maxRoll}`).roll()).total;
    // co
    const slots = slotManager.createSlot(table, roll, pickable);
    return slots.getOutcome();
  },

};
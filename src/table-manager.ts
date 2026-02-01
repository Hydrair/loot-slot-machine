import Papa from "papaparse";
import { containsQuality, filterTableByCondition, filterTableByQuality } from "./util";
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

  rollOnTable: async function (csvFileName: string, options: { level?: number, conditions?: string[], skipLast?: boolean } = {}) {
    const { level = 0, conditions, skipLast = false } = options;
    let table = await this.loadTable(csvFileName);

    const quality = containsQuality(table);

    if (skipLast) table.pop();

    if (quality !== "Chance") {
      table = filterTableByQuality(table, quality).filter(row => row !== null);
    }

    // Level filtering removed: the tier columns already define what's available.
    // filterTableByLevel was incorrectly using character level as a hard cap,
    // which removed items the spreadsheet intentionally includes as rare finds.

    if (conditions && conditions.length > 0) {
      filterTableByCondition(table, conditions);
    }

    const maxRoll = table[table.length - 1].Chance.split("-")[1];

    const slot = await slotManager.createSlot(table, maxRoll);
    const outcome = await slot.getOutcome();

    return outcome;
  },

};
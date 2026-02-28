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

    const fatalErrors = parsed.errors.filter((e) => e.type !== "FieldMismatch");
    if (fatalErrors.length > 0) {
      throw new Error(
        `Error parsing CSV: ${fatalErrors.map((e) => e.message).join(", ")}`
      );
    }

    return parsed.data as Array<{}>;
  },

  rollOnTable: async function (csvFileName: string, options: { level?: number, conditions?: string[], skipLast?: boolean, allowedItems?: string[] } = {}) {
    const { level = 0, conditions, skipLast = false, allowedItems } = options;
    let table = await this.loadTable(csvFileName);

    const quality = containsQuality(table);

    if (skipLast) table.pop();

    if (quality !== "Chance") {
      table = filterTableByQuality(table, quality).filter(row => row !== null);
    }

    // Filter by allowed items (preset system) and recalculate chance ranges
    if (allowedItems && allowedItems.length > 0) {
      table = table.filter(row => allowedItems.includes(row.Item));
      let current = 1;
      table = table.map(row => {
        const [min, max] = row.Chance.split("-").map(Number);
        const weight = max - min + 1;
        const newMin = current;
        const newMax = current + weight - 1;
        current = newMax + 1;
        return { ...row, Chance: `${String(newMin).padStart(2, '0')}-${String(newMax).padStart(2, '0')}` };
      });
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
import Papa from "papaparse";
import { addSlotItem, addSlots, rollSlots, stopSlots } from "./slots";

// Ensure PapaParse is globally available or import it dynamically
if (typeof Papa === "undefined") {
  throw new Error(
    "PapaParse is not loaded. Make sure it is included in your module.json or imported dynamically."
  );
}

export const TableManager = {

  loadTable: async function (csvFileName: string): Promise<Array<{ DiceRange: string; Outcome: string }>> {
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

    return parsed.data as Array<{ DiceRange: string; Outcome: string }>;
  },


  parseDiceRange: function (range: string) {
    const [min, max] = range.split("-").map(Number);
    if (isNaN(min) || isNaN(max))
      throw new Error(`Invalid dice range: ${range}`);
    return [min, max];
  },

  rollOnTable: async function (csvFileName: string) {
    const table = await this.loadTable(csvFileName);

    // Roll a d100
    const roll = (await new Roll(`1d100`).roll())._total;

    // Find the outcome based on the dice range
    const slots = addSlots();
    let i = 0;
    for (const row of table) {
      slots?.appendChild(addSlotItem(row.Outcome, i++));
    }
    const timeouts = rollSlots(slots);

    for (const row of table) {
      const [min, max] = this.parseDiceRange(row.DiceRange);
      if (roll >= min && roll <= max) {
        setTimeout(() => stopSlots(slots, row.Outcome, timeouts), 2000);
        return (row as { DiceRange: string; Outcome: string; LinkToTable: string }).Outcome;
      }
    }

    throw new Error(`No matching outcome found for roll: ${roll}`);
  },

  // async getAllCSVFiles(directory: string): Promise<string[]> {
  //   const csvs = await FilePicker.browse('data', `modules/loot-slot-machine/tables/${directory}`).then(response => {
  //     return response.files;
  //   }).catch(err => {
  //     console.error('Error browsing directory:', err);
  //     return [];
  //   });
  //   const quality = (document.getElementById('quality-select') as HTMLSelectElement).value;
  //   return csvs.filter(file => file.includes(quality)).map(file => file.replace('modules/loot-slot-machine/tables/', ''));

  // }
};

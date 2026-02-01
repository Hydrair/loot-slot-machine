# Loot Slot Machine - Findings Report

Code review comparing the module's TSV tables and runtime logic against the master spreadsheet (`RMIT Pf2E .xlsx`).

---

## 1. Level Filtering Breaks Probability Distribution (Critical)

**File:** `src/util.ts` → `filterTableByLevel()`
**File:** `src/table-manager.ts` → `rollOnTable()`

The module filters out table rows where `item.Level > character.Level` at runtime. This is wrong — the tier columns (Minor/Lesser/Moderate/Greater/Major) already define what's available. The spreadsheet intentionally places higher-level items in lower tiers as rare lucky finds.

**Example:** Level 15 character rolls on Major Specific Weapons (d1000 table):
- Items at Level 16–22 get removed (Icicle through Spiral Athame)
- Creates a gap from range 567–769 in the table
- The slot machine's "pick closest" algorithm assigns gap rolls to adjacent entries
- Hyldarf's Fang (Level 15) gets range 555–668 instead of 555–566 → **~10x probability boost**
- All rare high-level items become unobtainable

**Fix:** Remove `filterTableByLevel()` entirely. The tier selection IS the level filter.

---

## 2. "Roll Twice Again" Missing From weapon-material.tsv (Moderate)

The spreadsheet has "Roll twice again" as the last row in every material table (98-100 / 95-100 / 87-100 / 82-100 / 77-100). Five of the six material TSVs already have this correctly. Only `weapon-material.tsv` was missing it.

**Impact:** At Major tier, up to 24% of weapon material rolls should give the player a "pick one of two" choice. Instead those percentages were redistributed across regular materials, capping the max roll at 76.

**Fix:** Add the missing "Roll twice again" row to `weapon-material.tsv`.

---

## 3. Wrong Rune Names in weapon-runes.tsv (Minor)

Four weapon runes have different names than in the spreadsheet:

| Position (Minor / Lesser) | Spreadsheet | TSV |
|---|---|---|
| 62-65 / 22-24 | **Vitalizing** | Disrupting |
| Moderate 39-41 / Greater 01-04 | **Animated** | Dancing |
| Moderate 42-44 / Greater 05-08 | **Spell Reservoir** | Spell Storing |
| Greater 57-58 / Major 25-27 | **Vitalizing (Greater)** | Disrupting (Greater) |

**Fix:** Update the four item names in `weapon-runes.tsv` to match the spreadsheet.

---

## 4. Typo "Majorstriking" (Trivial)

- `weapon-potency.tsv` line 7: `+3 Majorstriking weapon` → `+3 Major striking weapon`
- `worn.tsv` line 354: `Handwraps of Mighty Blows (+3 Majorstriking)` → `(+3 Major striking)`

This typo also caused a runtime bug: the `StrikingRune` enum in `declarations.ts` expects `"Major striking weapon"` (with space). The typo would fail the enum lookup, resulting in `undefined` striking rune on the generated item.

---

## Summary

| Issue | Severity | Files Affected |
|---|---|---|
| Level filtering removes valid items | Critical | `src/util.ts`, `src/table-manager.ts` |
| Missing "Roll twice again" in weapon materials | Moderate | `src/tables/weapon-material.tsv` |
| Wrong rune names | Minor | `src/tables/weapon-runes.tsv` |
| Typo "Majorstriking" | Trivial | `src/tables/weapon-potency.tsv`, `src/tables/worn.tsv` |

**Good news:** All probability distributions (d100/d1000 ranges) in the TSV files match the master spreadsheet exactly. The weighted probability system (lower-level items = wider ranges = more common) is correctly encoded in the data. The issues are in the runtime code and a few data entry errors.

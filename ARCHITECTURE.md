# Loot Slot Machine - Architecture Documentation

## Overview

Foundry VTT module that implements the **Gritfinder Random Magic Item Tables** system for Pathfinder 2E. Players roll on cascading d100/d1000 tables to generate random magic items with a slot machine animation UI. Items are created directly in the character's inventory.

**Repository:** `Hydrair/loot-slot-machine` (GitHub, collaborator access via Gogonoxx)
**Author:** Hydrair
**License:** MIT
**Foundry:** v12-13 | **PF2E:** 6.8.1+
**Dependencies:** socketlib (multiplayer sync), papaparse (TSV parsing), @tsparticles/confetti

---

## Build System

- **Stack:** TypeScript 5.7 + Vite 6 + Vitest 2
- **Source:** `src/` → **Build Output:** `dist/`
- **Build:** `npm run build` (Vite, ES modules)
- **Dev:** `npm run dev` (watch mode)
- **Assets copied:** `.hbs`, `.css`, `.tsv` files from `src/` to `dist/`
- **Important:** `dist/` must be built before deployment. The repo only contains source files.
- **Symlink:** `npm run setup-symlink` creates PowerShell symlink to Foundry modules folder

---

## Core Design: The Gritfinder Random Item Tables

### 5 Treasure Tiers

| Tier | Item Level Range | Party Level | When to Use |
|---|---|---|---|
| Minor | 1-7 | 1-5 | Merchants (one below party) |
| Lesser | 4-10 | 5-8 | Standard encounters |
| Moderate | 7-13 | 8-11 | Standard encounters |
| Greater | 10-16 | 11-14 | Standard encounters |
| Major | 13-20 | 14+ | Dragon hoards, major quests |

### Weighted Probability

Within each tier, lower-level items have **wider d100/d1000 ranges** = higher probability. Higher-level items have narrower ranges = rare lucky finds. This is baked into the TSV data, not computed at runtime. The tier selection IS the level filter — no additional character-level filtering is needed or used.

### Rolling Procedure

**Complex items (Weapons, Armor, Shields, Staves, Wands, Grimoires):**
1. **Category** → d100 on `loot-table.tsv` (or user selection)
2. **Potency** → tier-filtered roll (e.g., `weapon-potency.tsv`)
3. **Precious Material** → if potency = "Precious Material and roll again", roll material table + re-roll potency
4. **Specific Item** → if potency = "Specific Weapon/Armor/Shield", roll specific table (d1000)
5. **Item Type** → e.g., common melee / uncommon melee / ranged
6. **Rune Chance** → how many property runes (0-3)
7. **Property Runes** → individual rune rolls with condition filtering

**Simple items (Potions, Worn, Jewelry, Scrolls):**
1. **Category** → d100 on `loot-table.tsv`
2. **Item** → single tier-filtered roll on the item table

### "Roll Twice Again" Mechanic

Appears as the last row on sub-tables (runes, materials, specific items, potions, scrolls, etc.). Does NOT appear on potency tables. When triggered:
- Two new clickable slots appear in the UI
- Player picks one of the two outcomes
- Capped at 2 bonus rolls maximum to prevent infinite loops

### d100 Category Distribution (`loot-table.tsv`)

| d100 | Category |
|---|---|
| 01-20 | Armor (20%) |
| 21-25 | Shield (5%) |
| 26-50 | Weapon (25%) |
| 51-55 | Potion (5%) |
| 56-65 | Jewelry (10%) |
| 66-75 | Worn Items (10%) |
| 76-80 | Scroll (5%) |
| 81-85 | Staff (5%) |
| 86-95 | Wand (10%) |
| 96-100 | Grimoire (5%) |

---

## File Structure

```
loot-slot-machine/
├── ARCHITECTURE.md          # This file
├── FINDINGS.md              # Code review findings (for Hydrair)
├── package.json             # Dependencies & scripts
├── vite.config.ts           # Build configuration
├── tsconfig.json            # TypeScript config (strict mode)
│
├── src/                     # SOURCE CODE
│   ├── main.ts              # Entry point, Foundry hooks, SlotMachineApp class
│   ├── declarations.ts      # Item classes (Weapon, Armor, Shield, Staff, Wand, etc.)
│   ├── items.ts             # Item creation, createLsmItem() factory, searchItem()
│   ├── table-manager.ts     # TSV loading (PapaParse), rollOnTable(), quality filtering
│   ├── slotmanager.ts       # SlotManager: creates slots, handles bonus rolls
│   ├── slots.ts             # Slot class: animation, d100 matching, outcome resolution
│   ├── sockets.ts           # SocketManager: multiplayer sync via socketlib
│   ├── util.ts              # Helpers: quality filter, condition filter, rune parsing
│   ├── module.json          # Module manifest (template, updated at build)
│   ├── roll-window.hbs      # Main UI template
│   ├── lsm-style.css        # Styles
│   │
│   └── tables/              # 37 TSV DATA FILES
│       ├── loot-table.tsv           # Main category d100
│       │
│       ├── weapon-potency.tsv       # +1/Striking/Greater Striking progression
│       ├── weapon-type.tsv          # Common melee / Uncommon / Ranged
│       ├── weapon-common.tsv        # Common melee weapons list
│       ├── weapon-uncommon.tsv      # Uncommon melee weapons list
│       ├── weapon-ranged.tsv        # Ranged weapons list
│       ├── weapon-specific.tsv      # Named magic weapons (d1000)
│       ├── weapon-runechance.tsv    # 0-3 property runes
│       ├── weapon-runes.tsv         # Property rune list with conditions
│       ├── weapon-material.tsv      # Precious materials
│       │
│       ├── armor-potency.tsv        # +1/Resilient progression
│       ├── armor-type.tsv           # Armor types (cloth to full plate)
│       ├── armor-specific.tsv       # Named magic armor (d1000)
│       ├── armor-runechance.tsv     # 0-3 property runes
│       ├── armor-runes.tsv          # Property rune list
│       ├── armor-material.tsv       # Precious materials
│       │
│       ├── shield-potency.tsv       # Runic/Specific/Material
│       ├── shield-type.tsv          # Buckler/Wooden/Steel/Tower
│       ├── shield-specific.tsv      # Named magic shields
│       ├── shield-runes.tsv         # Reinforcing runes
│       ├── shield-material.tsv      # Precious materials
│       │
│       ├── staff-potency.tsv        # +1 to +3 Enchanted progression
│       ├── staff-item.tsv           # Staff types
│       ├── staff-element.tsv        # Damage types & effects
│       ├── staff-material.tsv       # Precious materials
│       │
│       ├── wand-potency.tsv         # +1 to +3 Enchanted progression
│       ├── wand-item.tsv            # Wand types
│       ├── wand-element.tsv         # Damage types & effects
│       ├── wand-material.tsv        # Precious materials
│       │
│       ├── grimoire-potency.tsv     # +1/+2/+3 progression
│       ├── grimoire-item.tsv        # Grimoire types
│       ├── grimoire-material.tsv    # Precious materials
│       │
│       ├── potion.tsv               # All potions by tier (d100)
│       ├── potion-element.tsv       # Elements for Retaliation/Energy Breath
│       ├── scroll.tsv               # Scroll ranks by tier
│       ├── worn.tsv                 # Worn items by tier (d1000)
│       └── jewelry.tsv             # Jewelry by tier (d100)
│
└── dist/                    # BUILD OUTPUT (not in repo)
    ├── main.js              # Compiled ES module
    ├── module.json           # Updated manifest
    ├── roll-window.hbs
    ├── lsm-style.css
    └── tables/              # Copied TSV files
```

---

## Source Code Architecture

### 10 Item Type Classes (`declarations.ts`)

All extend `LsmItem` base class. Each has a `roll()` method defining the rolling sequence and a `toItemData()` method for PF2E system data.

| Class | Potency | Material | Type/Item | Runes | Special |
|---|---|---|---|---|---|
| `Weapon` | weapon-potency | weapon-material | weapon-type → weapon-{melee\|ranged} | 0-3 via runechance | Condition filtering (melee/ranged/damage type) |
| `Armor` | armor-potency | armor-material | armor-type | 0-3 via runechance | Condition filtering (armor category) |
| `Shield` | shield-potency | shield-material | shield-type | 1 fixed | Reinforcing runes only |
| `Staff` | staff-potency | staff-material | staff-item | None | Creates weapon item + element damage |
| `Wand` | wand-potency | wand-material | wand-item | None | Creates weapon item + element damage |
| `Grimoire` | grimoire-potency | grimoire-material | grimoire-item | None | Spell DC modifier |
| `Potion` | None | None | potion | None | Element injection for Retaliation/Energy Breath |
| `Scroll` | None | None | scroll | None | Creates spell consumable via `createConsumableFromSpell()` |
| `Worn` | None | None | worn | None | Direct item lookup |
| `Jewelry` | None | None | jewelry | None | Direct item lookup |

### Key Enums (`declarations.ts`)

```typescript
enum StrikingRune    // "Weapon" | "Striking weapon" | "Greater striking weapon" | "Major striking weapon"
enum ResilientRune   // "Armor" | "Resilient armor" | "Greater resilient armor" | "Major resilient armor"
enum ReinforcingRune // "Shield" | "Reinforcing Rune (Minor)" through "(Supreme)"
```

These enums map TSV outcome strings to numeric indices for PF2E system data.

### Table Manager (`table-manager.ts`)

- `loadTable(filename)` — Fetches TSV from `modules/loot-slot-machine/tables/`, parses with PapaParse
- `rollOnTable(filename, options)` — Quality filter → condition filter → create slot → get outcome
- Quality filtering (`filterTableByQuality`) extracts only the selected tier column, remapping to `{ Chance, Item }`

### Slot Machine (`slotmanager.ts` + `slots.ts`)

- `SlotManager.createSlot(table, maxRoll)` — Creates visual slot, rolls `1d{maxRoll}`
- `Slot.rollTable()` — Iterates table rows matching d100 roll to range, handles gaps
- `Slot.rollSlots()` — Animation: rapid opacity flashing through items (250ms intervals)
- `SlotManager.chooseSlot()` — For "Roll twice again": creates 2 clickable slots, returns Promise resolving on click

### Multiplayer (`sockets.ts`)

Three socketlib functions:
1. `"render"` — Broadcast UI window to other players
2. `"renderSlots"` — Broadcast slot animation state
3. `"renderDetails"` — Broadcast final item + trigger confetti

### Item Creation (`items.ts`)

- `createLsmItem(category)` — Factory creating the right class for each item type
- `searchItem(name, type)` — Searches Foundry compendiums for item template
- `getItem(lsmItem, actor)` — Creates item on actor from template + applies runes/material/potency

---

## TSV Table Format

**Tier-aware tables** (most tables):
```tsv
Minor	Lesser	Moderate	Greater	Major	Item		Level
01-50	01-30				+1 Weapon
51-73	31-50	01-28			+1 Striking weapon
```
- 5 tier columns with d100 ranges (or d1000 for large tables like specific/worn)
- `Item` column = outcome string
- Optional `Level` and `Value` columns (metadata, not used at runtime after quality filtering)
- Optional `Condition` column for rune filtering (e.g., "melee", "piercing", "thrown")

**Non-tier tables** (weapon-type, weapon-common, elements):
```tsv
Chance	Item
01-70	Common Melee Weapon
71-80	Uncommon Melee Weapon
81-100	Ranged Weapon
```

**Critical:** The tier columns ARE the probability distribution. No additional level filtering is applied at runtime. `filterTableByQuality` extracts only the selected tier column, discarding Level metadata.

---

## Master Spreadsheet

The authoritative source for all table data is:
```
RMIT Pf2E .xlsx
```
Located at the project root. Contains 12 sheets matching the 11 item category tables plus a "Pathfinder Xtreme" rules sheet. All TSV files should match this spreadsheet exactly.

---

## Changes Made (2026-01-31)

### Fixes Applied

1. **Removed dead level filtering code** (`table-manager.ts`)
   - `filterTableByLevel` was called but never effective (quality filtering strips Level column first)
   - Removed the call and import to prevent future bugs if quality filtering changes

2. **Added missing "Roll twice again" to `weapon-material.tsv`**
   - Row `98-100 / 95-100 / 87-100 / 82-100 / 77-100` was missing
   - All other 5 material tables already had it correctly

3. **Fixed 4 wrong rune names in `weapon-runes.tsv`**
   - Disrupting → Vitalizing (Level 5)
   - Dancing → Animated (Level 13)
   - Spell Storing → Spell Reservoir (Level 13)
   - Disrupting (Greater) → Vitalizing (Greater) (Level 14)

4. **Fixed "Majorstriking" typo** in `weapon-potency.tsv` and `worn.tsv`
   - "+3 Majorstriking" → "+3 Major striking" (with space)
   - This was also a runtime bug: `StrikingRune` enum lookup failed on the typo

5. **Replaced homebrew Precious Materials with official PF2E materials** (all 6 material TSVs)
   - Throneglass → **Noqual** (`noqual`) — anti-magic skymetal, Standard+High
   - Dragonbone → **Abysium** (`abysium`) — exotic skymetal, Standard+High
   - Mithral → **Dawnsilver** (`dawnsilver`) — PF2E Remaster rename
   - Darkwood → **Duskwood** (`duskwood`) — PF2E Remaster rename
   - Singing Steel → **Siccatite** (`siccatite`) — rare alloy, High grade
   - Djezet Infusion → **Djezet (High)** (`djezet`) — same material, fixed format
   - All d100/d1000 probability ranges preserved, only Item names changed
   - Files affected: `weapon-material.tsv`, `armor-material.tsv`, `shield-material.tsv`, `staff-material.tsv`, `wand-material.tsv`, `grimoire-material.tsv`

6. **Fixed material slug generation** (`declarations.ts`)
   - `toItemData()` now converts spaces to hyphens: `material.replace(/ /g, '-')`
   - "Cold Iron" → `cold-iron`, "Sovereign Steel" → `sovereign-steel`
   - Previously generated `cold iron` (with space) which didn't match Foundry's expected slug format

### Not Yet Done

- Module is not pushed to GitHub (local changes only)
- No `npm run build` executed yet
- No version bump in module.json

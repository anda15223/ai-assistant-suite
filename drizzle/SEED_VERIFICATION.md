# Jelling 2026 seed verification

- Festival slug: `jelling-2026`
- Festival id: 1
- Generated at: 2026-04-22T21:24:00.846Z

## Master schema
- Seeded: 14 sections, 76 questions

## Hard-checked counts

| Item | Actual | Expected | Status |
|---|---:|---:|:---:|
| Concepts | 4 | 4 | ✔ |
| Action items | 35 | 35 | ✔ |
| Vehicles | 7 | 7 | ✔ |
| Accommodation | 3 | 3 | ✔ |
| BC trolleys | 8 | 8 | ✔ |

## Informational counts

| Item | Actual |
|---|---:|
| Staff rows (all sources) | 44 |
| Vagtplan shift rows | 52 |
| Scalar answers inserted | 72 |
| Answers with no matching question key (dropped) | 0 |

## Staff breakdown (44 rows)

Handover §4.3 has an internal inconsistency — the heading says "21 Søborg + 20 local = 41", but §4.8 scalar answers say `soborg_count = 19` + `manager_count = 2` + `setup_crew_count = 5`. The seed resolves this by treating them as separate populations so every concept slot in the per-concept split table has a real row:

- **2 named managers** (Fif, Marius) — `conceptId = null`, `isManager = true`, `isSetupCrew = true`. Matches `manager_count = 2`.
- **3 named setup-only** (Costel, Marko, Anca) — `conceptId = null`, `isSetupCrew = true`. Plus the 2 managers = 5 setup crew total, matching `setup_crew_count = 5`.
- **19 unnamed Søborg shift workers** — one row per concept slot in the §4.3 split table: Fish 4 + Gaia 5 + Creperie 5 + Chicks 5. Matches `soborg_count = 19`.
- **20 unnamed local hires** — Fish 4 + Gaia 4 + Creperie 5 + Chicks 7. Matches `local_count = 20`.

Total = 2 + 3 + 19 + 20 = **44 rows**. Unique Søborg humans = 5 named + 19 unnamed = 24 (not 21). The handover's "21 Søborg" heading figure is the one that doesn't add up against §4.8; the seed prefers §4.8 because it's what the scalar-answer UI will display.

## Vagtplan shift breakdown (52 rows)

INSIDE concepts (Fish & Chips, Gyros by Gaia) use a 4-period day structure (Prep / Half / Peak / Late) with a 2-row Thursday, giving 2 + 4 + 4 + 4 = **14 rows per concept**. CAMPING concepts (La Creperie, Chicks 'n' Buns) use a 3-period structure (Breakfast / Mid / Night on Fri–Sun; Setup / Service / Night on Thu) giving 3 × 4 = **12 rows per concept**. Total = 14 + 14 + 12 + 12 = **52 shifts**, which matches §4.4 exactly.

## Person-hours discrepancy (advisory, not a hard fail)

- **Computed from shift rows**: 1863.50
- **Handover claim (§4.4 total)**: 1673.5
- **Diff**: 190.00

The §4.4 vagtplan rows describe overlapping time windows — each day's "Peak" row spans both the Early group (during their continuation past Half) and the Late group (inside their full-day row). A naive `sum(peopleCount × duration)` therefore double-counts the peak window, so the 1,673.5 handover figure cannot be reconstructed from these rows without a different accounting rule. Leaving this as a flagged discrepancy rather than failing the seed — Sprint 2/3 staffing sub-editor work should clarify whether the "Peak" row is meant as a display aggregate (and should be excluded from totals) or as an additional shift block.

## Overall

**PASS** — all hard-checked counts match expectations.

**Note** — person-hours differ from the handover figure by 190.00. See the discrepancy section above.

import { PlanDoc, PartyId, TableId, ScenarioId, Assignment } from "@/lib/types";

// Compare two drafts (e.g. "Matt's Draft" vs "Ian's Draft") and consolidate them.

export type DiffStatus = "same" | "moved" | "onlyA" | "onlyB";

export interface PartyDiff {
  partyId: PartyId;
  status: DiffStatus;
  tableA: TableId | null; // assignment in draft A (null = unassigned)
  tableB: TableId | null; // assignment in draft B
}

export interface ScenarioDiff {
  aId: ScenarioId;
  bId: ScenarioId;
  /** Only parties assigned in at least one of the two drafts. */
  parties: PartyDiff[];
  counts: Record<DiffStatus, number>;
}

/** Per-party comparison of two drafts. */
export function diffScenarios(
  doc: PlanDoc,
  aId: ScenarioId,
  bId: ScenarioId,
): ScenarioDiff {
  const a = doc.scenarios.find((s) => s.id === aId)?.assignments ?? {};
  const b = doc.scenarios.find((s) => s.id === bId)?.assignments ?? {};
  const parties: PartyDiff[] = [];
  const counts: Record<DiffStatus, number> = { same: 0, moved: 0, onlyA: 0, onlyB: 0 };

  for (const p of doc.parties) {
    const tableA = a[p.id]?.tableId ?? null;
    const tableB = b[p.id]?.tableId ?? null;
    if (tableA === null && tableB === null) continue;

    let status: DiffStatus;
    if (tableA !== null && tableB !== null) status = tableA === tableB ? "same" : "moved";
    else if (tableA !== null) status = "onlyA";
    else status = "onlyB";

    counts[status] += 1;
    parties.push({ partyId: p.id, status, tableA, tableB });
  }

  return { aId, bId, parties, counts };
}

export type MergeChoice = "a" | "b";

/**
 * Build a consolidated assignment map from two drafts. For each party the
 * winning side is `choices[partyId]` (falling back to `defaultChoice`). The
 * chosen side's assignment is carried over; if that side has none, the party is
 * left unseated. Feed the result to `applyAssignments`/`addScenario` to create a
 * consolidated draft.
 */
export function consolidateScenarios(
  doc: PlanDoc,
  aId: ScenarioId,
  bId: ScenarioId,
  choices: Record<PartyId, MergeChoice> = {},
  defaultChoice: MergeChoice = "a",
): Record<PartyId, Assignment> {
  const a = doc.scenarios.find((s) => s.id === aId)?.assignments ?? {};
  const b = doc.scenarios.find((s) => s.id === bId)?.assignments ?? {};
  const out: Record<PartyId, Assignment> = {};
  for (const p of doc.parties) {
    const choice = choices[p.id] ?? defaultChoice;
    const pick = choice === "a" ? a[p.id] : b[p.id];
    if (pick) out[p.id] = { ...pick };
  }
  return out;
}

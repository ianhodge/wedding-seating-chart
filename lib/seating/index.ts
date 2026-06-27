import {
  PlanDoc,
  Party,
  Table,
  Assignment,
  PartyId,
  ScenarioId,
  GroupId,
} from "@/lib/types";

export interface AutoFillOptions {
  /** Keep locked assignments (default true). */
  respectLocked?: boolean;
  /** Keep already-placed (unlocked) parties (default true). If false, reflow all non-locked. */
  keepExisting?: boolean;
  /** Also auto-seat placeholder groups (default false — the mother-in-law handles those). */
  fillPlaceholders?: boolean;
}

export interface AutoFillResult {
  /** A complete partyId -> Assignment map for the scenario. */
  assignments: Record<PartyId, Assignment>;
  /** Parties that could not be seated (insufficient capacity). */
  unseated: PartyId[];
  warnings: string[];
}

const sizeOf = (parties: Party[]) => parties.reduce((s, p) => s + p.size, 0);

/**
 * Split parties into balanced chunks, each with total size <= maxPerChunk,
 * keeping every party intact. Largest-first into the least-loaded bin.
 */
export function balancedPartition(parties: Party[], maxPerChunk: number): Party[][] {
  if (parties.length === 0) return [];
  const total = sizeOf(parties);
  let k = Math.max(1, Math.ceil(total / Math.max(1, maxPerChunk)));
  const sorted = [...parties].sort((a, b) => b.size - a.size);

  while (k <= parties.length) {
    const bins = Array.from({ length: k }, () => ({ items: [] as Party[], load: 0 }));
    let ok = true;
    for (const p of sorted) {
      const candidates = bins
        .filter((b) => b.load + p.size <= maxPerChunk)
        .sort((a, b) => a.load - b.load);
      if (candidates.length === 0) {
        ok = false;
        break;
      }
      candidates[0].items.push(p);
      candidates[0].load += p.size;
    }
    if (ok) return bins.filter((b) => b.items.length > 0).map((b) => b.items);
    k++;
  }
  // Fallback: every party in its own chunk.
  return sorted.map((p) => [p]);
}

/**
 * Split parties "down the middle" into two halves balanced by headcount,
 * keeping parties intact. Used by the manual "split evenly" helper.
 */
export function splitDownMiddle(parties: Party[]): [Party[], Party[]] {
  const sorted = [...parties].sort((a, b) => b.size - a.size);
  const left: Party[] = [];
  const right: Party[] = [];
  let ll = 0;
  let rl = 0;
  for (const p of sorted) {
    if (ll <= rl) {
      left.push(p);
      ll += p.size;
    } else {
      right.push(p);
      rl += p.size;
    }
  }
  return [left, right];
}

/**
 * Greedy auto-fill: keep locked/existing placements, then seat each group
 * (or its subgroups) together where possible, splitting down the middle when
 * a unit can't fit a single table. Placeholder groups are skipped by default.
 */
export function autoFill(
  doc: PlanDoc,
  scenarioId: ScenarioId,
  options: AutoFillOptions = {},
): AutoFillResult {
  const respectLocked = options.respectLocked ?? true;
  const keepExisting = options.keepExisting ?? true;
  const fillPlaceholders = options.fillPlaceholders ?? false;

  const scenario = doc.scenarios.find((s) => s.id === scenarioId);
  const warnings: string[] = [];
  const unseated: PartyId[] = [];

  const partyById = new Map(doc.parties.map((p) => [p.id, p]));
  const groupById = new Map(doc.groups.map((g) => [g.id, g]));

  const assignments: Record<PartyId, Assignment> = {};
  if (scenario) {
    for (const [pid, a] of Object.entries(scenario.assignments)) {
      if (!partyById.has(pid)) continue;
      const keep = a.locked ? respectLocked : keepExisting;
      if (keep) assignments[pid] = { ...a };
    }
  }

  const occ = new Map<string, number>();
  const groupsAtTable = new Map<string, Set<GroupId>>();
  for (const t of doc.tables) {
    occ.set(t.id, 0);
    groupsAtTable.set(t.id, new Set());
  }
  for (const [pid, a] of Object.entries(assignments)) {
    const p = partyById.get(pid);
    if (!p) continue;
    occ.set(a.tableId, (occ.get(a.tableId) || 0) + p.size);
    groupsAtTable.get(a.tableId)?.add(p.groupId);
  }

  const remaining = (t: Table) => t.capacity - (occ.get(t.id) || 0);

  const canPlace = (t: Table, groupId: GroupId): boolean => {
    if (t.isSweetheart) return false;
    const g = groupById.get(groupId);
    if (!g) return false;
    if (g.isPlaceholder) return t.reservedForGroupId === groupId;
    return !t.reservedForGroupId; // non-placeholders avoid reserved tables
  };

  const candidateTables = (groupId: GroupId) =>
    doc.tables.filter((t) => canPlace(t, groupId));

  const place = (party: Party, table: Table) => {
    assignments[party.id] = { tableId: table.id };
    occ.set(table.id, (occ.get(table.id) || 0) + party.size);
    groupsAtTable.get(table.id)?.add(party.groupId);
  };

  const seatUnit = (unit: Party[], groupId: GroupId) => {
    const unitSize = sizeOf(unit);
    const cands = candidateTables(groupId);

    // 1) Whole unit at one table — prefer a table already hosting this group,
    //    then the smallest table that still fits (best-fit).
    const fitting = cands
      .filter((t) => remaining(t) >= unitSize)
      .sort((a, b) => {
        const ag = groupsAtTable.get(a.id)?.has(groupId) ? 1 : 0;
        const bg = groupsAtTable.get(b.id)?.has(groupId) ? 1 : 0;
        if (ag !== bg) return bg - ag;
        return remaining(a) - remaining(b);
      });
    if (fitting.length > 0) {
      for (const p of unit) place(p, fitting[0]);
      return;
    }

    // 2) Must split — partition by the largest available capacity, then best-fit each chunk.
    const maxCap = Math.max(0, ...cands.map((t) => remaining(t)));
    if (maxCap <= 0) {
      unit.forEach((p) => unseated.push(p.id));
      return;
    }
    const chunks = balancedPartition(unit, maxCap);
    for (const chunk of chunks) {
      const size = sizeOf(chunk);
      const t = candidateTables(groupId)
        .filter((tt) => remaining(tt) >= size)
        .sort((a, b) => remaining(a) - remaining(b))[0];
      if (!t) {
        chunk.forEach((p) => unseated.push(p.id));
        continue;
      }
      for (const p of chunk) place(p, t);
    }
  };

  const orderedGroups = [...doc.groups].sort((a, b) => a.order - b.order);
  for (const g of orderedGroups) {
    if (g.isCouple) continue;
    if (g.isPlaceholder && !fillPlaceholders) continue;

    const groupParties = doc.parties.filter(
      (p) => p.groupId === g.id && assignments[p.id] === undefined,
    );
    if (groupParties.length === 0) continue;

    const subgroups = doc.subgroups
      .filter((s) => s.groupId === g.id)
      .sort((a, b) => a.order - b.order);

    const units: Party[][] = [];
    if (subgroups.length > 0) {
      for (const s of subgroups) {
        const sp = groupParties.filter((p) => p.subgroupId === s.id);
        if (sp.length) units.push(sp);
      }
      const noSub = groupParties.filter((p) => !p.subgroupId);
      if (noSub.length) units.push(noSub);
    } else {
      units.push(groupParties);
    }

    for (const unit of units) seatUnit(unit, g.id);
  }

  if (unseated.length) {
    warnings.push(`${unseated.length} parties couldn't be seated — not enough open seats.`);
  }
  return { assignments, unseated, warnings };
}

import {
  PlanDoc,
  Party,
  Table,
  Assignment,
  PartyId,
  ScenarioId,
  GroupId,
  TableId,
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

/** Deterministic ordering of parties: largest first, ties broken by id. */
const bySizeDescThenId = (a: Party, b: Party) =>
  b.size - a.size || a.id.localeCompare(b.id);

/**
 * Split parties into balanced chunks, each with total size <= maxPerChunk,
 * keeping every party intact. Largest-first into the least-loaded bin.
 *
 * Retained as a stable utility export; auto-fill itself prefers the recursive
 * `splitDownMiddle` strategy below.
 */
export function balancedPartition(parties: Party[], maxPerChunk: number): Party[][] {
  if (parties.length === 0) return [];
  const total = sizeOf(parties);
  let k = Math.max(1, Math.ceil(total / Math.max(1, maxPerChunk)));
  const sorted = [...parties].sort(bySizeDescThenId);

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
 * keeping parties intact. Largest-first into the lighter half so the two
 * sides stay as close in size as possible. Deterministic.
 */
export function splitDownMiddle(parties: Party[]): [Party[], Party[]] {
  const sorted = [...parties].sort(bySizeDescThenId);
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
 * Greedy, deterministic auto-fill.
 *
 * Keeps locked/existing placements, then seats each group (or each of its
 * subgroups) as a unit. A unit is placed whole when it fits a single table;
 * otherwise it is split DOWN THE MIDDLE into balanced halves (parties intact)
 * and each half is seated recursively until every chunk fits. Constraints:
 * the sweetheart table is never used; placeholder groups only sit at their
 * reserved tables (and only when `fillPlaceholders`); non-placeholder groups
 * avoid reserved tables. When a unit is split, the chunks prefer tables that
 * already host the group and tables near each other (x/y proximity).
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
  const tableById = new Map(doc.tables.map((t) => [t.id, t]));

  // 1) Seed the result from existing assignments we want to preserve.
  const assignments: Record<PartyId, Assignment> = {};
  if (scenario) {
    for (const [pid, a] of Object.entries(scenario.assignments)) {
      if (!partyById.has(pid)) continue;
      if (!tableById.has(a.tableId)) continue;
      const keep = a.locked ? respectLocked : keepExisting;
      if (keep) assignments[pid] = { ...a };
    }
  }

  // 2) Track live occupancy + which groups already sit at each table.
  const occ = new Map<TableId, number>();
  const groupsAtTable = new Map<TableId, Set<GroupId>>();
  for (const t of doc.tables) {
    occ.set(t.id, 0);
    groupsAtTable.set(t.id, new Set());
  }
  for (const [pid, a] of Object.entries(assignments)) {
    const p = partyById.get(pid);
    if (!p) continue;
    occ.set(a.tableId, (occ.get(a.tableId) ?? 0) + p.size);
    groupsAtTable.get(a.tableId)?.add(p.groupId);
  }

  const remaining = (t: Table) => t.capacity - (occ.get(t.id) ?? 0);

  const canPlace = (t: Table, groupId: GroupId): boolean => {
    if (t.isSweetheart) return false;
    const g = groupById.get(groupId);
    if (!g) return false;
    if (g.isPlaceholder) return t.reservedForGroupId === groupId;
    return !t.reservedForGroupId; // non-placeholders avoid reserved tables
  };

  const candidateTables = (groupId: GroupId) =>
    doc.tables.filter((t) => canPlace(t, groupId));

  // Distance from a table to the centroid of tables already used by a unit.
  const distanceToUsed = (t: Table, used: Set<TableId>): number => {
    if (used.size === 0) return 0;
    let cx = 0;
    let cy = 0;
    let n = 0;
    for (const id of used) {
      const ut = tableById.get(id);
      if (!ut) continue;
      cx += ut.x;
      cy += ut.y;
      n += 1;
    }
    if (n === 0) return 0;
    cx /= n;
    cy /= n;
    const dx = t.x - cx;
    const dy = t.y - cy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * Pick the best table for a unit/chunk among tables that already fit it:
   * prefer a table already hosting the group, then proximity to the rest of
   * the unit, then best-fit (smallest sufficient remaining), then id.
   */
  const chooseTable = (
    fitting: Table[],
    groupId: GroupId,
    used: Set<TableId>,
  ): Table | undefined => {
    if (fitting.length === 0) return undefined;
    return [...fitting].sort((a, b) => {
      const ag = groupsAtTable.get(a.id)?.has(groupId) ? 1 : 0;
      const bg = groupsAtTable.get(b.id)?.has(groupId) ? 1 : 0;
      if (ag !== bg) return bg - ag;
      const ad = distanceToUsed(a, used);
      const bd = distanceToUsed(b, used);
      if (ad !== bd) return ad - bd;
      const ra = remaining(a);
      const rb = remaining(b);
      if (ra !== rb) return ra - rb;
      return a.id.localeCompare(b.id);
    })[0];
  };

  const place = (party: Party, table: Table) => {
    assignments[party.id] = { tableId: table.id };
    occ.set(table.id, (occ.get(table.id) ?? 0) + party.size);
    groupsAtTable.get(table.id)?.add(party.groupId);
  };

  /**
   * Seat a unit of parties, splitting down the middle recursively when it
   * cannot fit a single table. `used` accumulates the tables this unit lands
   * on so split chunks stay near each other.
   */
  const seatUnit = (unit: Party[], groupId: GroupId, used: Set<TableId>) => {
    if (unit.length === 0) return;
    const unitSize = sizeOf(unit);

    const fitting = candidateTables(groupId).filter((t) => remaining(t) >= unitSize);
    const table = chooseTable(fitting, groupId, used);
    if (table) {
      for (const p of unit) place(p, table);
      used.add(table.id);
      return;
    }

    // A single party can't be split — it simply doesn't fit anywhere.
    if (unit.length === 1) {
      unseated.push(unit[0].id);
      return;
    }

    // Split down the middle and recurse on each half.
    const [left, right] = splitDownMiddle(unit);
    if (left.length === 0 || right.length === 0) {
      // Degenerate split (shouldn't happen for length >= 2); seat individually.
      for (const p of unit) seatUnit([p], groupId, used);
      return;
    }
    seatUnit(left, groupId, used);
    seatUnit(right, groupId, used);
  };

  // 3) Seat groups in a stable order, treating each subgroup as its own unit.
  const orderedGroups = [...doc.groups].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id),
  );
  for (const g of orderedGroups) {
    if (g.isCouple) continue;
    if (g.isPlaceholder && !fillPlaceholders) continue;

    const groupParties = doc.parties.filter(
      (p) => p.groupId === g.id && assignments[p.id] === undefined,
    );
    if (groupParties.length === 0) continue;

    const subgroups = doc.subgroups
      .filter((s) => s.groupId === g.id)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

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

    // A shared "used" set per group keeps its subgroups clustered together.
    const used = new Set<TableId>();
    for (const unit of units) seatUnit(unit, g.id, used);
  }

  if (unseated.length) {
    const seats = unseated.reduce((s, id) => s + (partyById.get(id)?.size ?? 0), 0);
    warnings.push(
      `${unseated.length} ${
        unseated.length === 1 ? "party" : "parties"
      } (${seats} ${seats === 1 ? "guest" : "guests"}) couldn't be seated — not enough open seats.`,
    );
  }
  return { assignments, unseated, warnings };
}

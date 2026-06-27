import { describe, it, expect } from "vitest";
import {
  PlanDoc,
  Party,
  Table,
  Group,
  Subgroup,
  Scenario,
  Assignment,
  SCHEMA_VERSION,
} from "@/lib/types";
import { autoFill, balancedPartition, splitDownMiddle } from "./index";
import { buildSeedPlan } from "@/lib/seed/plan";

// ---------- tiny builders for controlled scenarios ----------

let pSeq = 0;
function party(groupId: string, size: number, opts: Partial<Party> = {}): Party {
  const id = opts.id ?? `${groupId}__p${pSeq++}`;
  return {
    id,
    label: id,
    groupId,
    subgroupId: opts.subgroupId ?? null,
    guestIds: [],
    size,
  };
}

function group(id: string, opts: Partial<Group> = {}): Group {
  return {
    id,
    name: opts.name ?? id,
    color: opts.color ?? "#fff",
    isPlaceholder: opts.isPlaceholder ?? false,
    isCouple: opts.isCouple ?? false,
    order: opts.order ?? 0,
  };
}

function table(id: string, capacity: number, opts: Partial<Table> = {}): Table {
  return {
    id,
    label: opts.label ?? id,
    shape: opts.shape ?? "round",
    capacity,
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    reservedForGroupId: opts.reservedForGroupId ?? null,
    isSweetheart: opts.isSweetheart,
  };
}

function doc(opts: {
  groups: Group[];
  parties: Party[];
  tables: Table[];
  subgroups?: Subgroup[];
  assignments?: Record<string, Assignment>;
}): PlanDoc {
  const now = 0;
  const scenario: Scenario = {
    id: "s1",
    name: "S1",
    assignments: opts.assignments ?? {},
    createdAt: now,
    updatedAt: now,
  };
  return {
    planId: "test",
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    coupleName: "Matt & Ian",
    guests: [],
    parties: opts.parties,
    groups: opts.groups,
    subgroups: opts.subgroups ?? [],
    tables: opts.tables,
    features: [],
    scenarios: [scenario],
    activeScenarioId: "s1",
    updatedAt: now,
  };
}

/** Total seated headcount per tableId from an assignments map. */
function occupancy(d: PlanDoc, assignments: Record<string, Assignment>) {
  const byId = new Map(d.parties.map((p) => [p.id, p]));
  const occ: Record<string, number> = {};
  for (const [pid, a] of Object.entries(assignments)) {
    const p = byId.get(pid);
    if (!p) continue;
    occ[a.tableId] = (occ[a.tableId] ?? 0) + p.size;
  }
  return occ;
}

// ---------- balancedPartition / splitDownMiddle ----------

describe("balancedPartition", () => {
  it("keeps every party intact and respects the max per chunk", () => {
    const ps = [party("g", 4), party("g", 4), party("g", 4)];
    const chunks = balancedPartition(ps, 8);
    for (const c of chunks) {
      expect(c.reduce((s, p) => s + p.size, 0)).toBeLessThanOrEqual(8);
    }
    // No party lost or duplicated.
    const ids = chunks.flat().map((p) => p.id).sort();
    expect(ids).toEqual(ps.map((p) => p.id).sort());
  });

  it("falls back to one party per chunk when a party exceeds the max", () => {
    const ps = [party("g", 10), party("g", 1)];
    const chunks = balancedPartition(ps, 6);
    expect(chunks.length).toBe(2);
  });
});

describe("splitDownMiddle", () => {
  it("splits into two balanced halves keeping parties intact", () => {
    const ps = [party("g", 3), party("g", 3), party("g", 3), party("g", 3)];
    const [left, right] = splitDownMiddle(ps);
    const sum = (xs: Party[]) => xs.reduce((s, p) => s + p.size, 0);
    expect(sum(left)).toBe(6);
    expect(sum(right)).toBe(6);
  });

  it("is deterministic", () => {
    const ps = [party("g", 5, { id: "a" }), party("g", 5, { id: "b" }), party("g", 2, { id: "c" })];
    const r1 = splitDownMiddle(ps);
    const r2 = splitDownMiddle(ps);
    expect(r1).toEqual(r2);
  });
});

// ---------- autoFill ----------

describe("autoFill", () => {
  it("never splits a party across tables (places it whole at a fitting table)", () => {
    const g = group("g");
    const big = party("g", 5, { id: "big" });
    const d = doc({
      groups: [g],
      parties: [big],
      tables: [table("small", 4), table("big", 6)],
    });
    const { assignments, unseated } = autoFill(d, "s1");
    expect(unseated).toEqual([]);
    expect(assignments["big"].tableId).toBe("big");
  });

  it("keeps a whole group together when capacity allows", () => {
    const g = group("g");
    const ps = [party("g", 3, { id: "p1" }), party("g", 2, { id: "p2" }), party("g", 2, { id: "p3" })];
    const d = doc({
      groups: [g],
      parties: ps,
      tables: [table("a", 8), table("b", 8)],
    });
    const { assignments } = autoFill(d, "s1");
    const tables = new Set(ps.map((p) => assignments[p.id].tableId));
    expect(tables.size).toBe(1);
  });

  it("keeps each subgroup together", () => {
    const g = group("g");
    const subs: Subgroup[] = [
      { id: "s_a", groupId: "g", name: "A", order: 0 },
      { id: "s_b", groupId: "g", name: "B", order: 1 },
    ];
    const a1 = party("g", 2, { id: "a1", subgroupId: "s_a" });
    const a2 = party("g", 2, { id: "a2", subgroupId: "s_a" });
    const b1 = party("g", 2, { id: "b1", subgroupId: "s_b" });
    const b2 = party("g", 2, { id: "b2", subgroupId: "s_b" });
    const d = doc({
      groups: [g],
      subgroups: subs,
      parties: [a1, a2, b1, b2],
      tables: [table("t1", 4), table("t2", 4)],
    });
    const { assignments } = autoFill(d, "s1");
    expect(assignments["a1"].tableId).toBe(assignments["a2"].tableId);
    expect(assignments["b1"].tableId).toBe(assignments["b2"].tableId);
  });

  it("splits a too-big unit down the middle into balanced halves", () => {
    const g = group("g");
    const ps = [
      party("g", 3, { id: "p1" }),
      party("g", 3, { id: "p2" }),
      party("g", 3, { id: "p3" }),
      party("g", 3, { id: "p4" }),
    ];
    const d = doc({
      groups: [g],
      parties: ps,
      tables: [table("a", 6), table("b", 6)],
    });
    const { assignments, unseated } = autoFill(d, "s1");
    expect(unseated).toEqual([]);
    const occ = occupancy(d, assignments);
    expect(Object.keys(occ).sort()).toEqual(["a", "b"]);
    expect(occ["a"]).toBe(6);
    expect(occ["b"]).toBe(6);
  });

  it("seats placeholder groups like any other group (reservations removed)", () => {
    const ph = group("ph", { isPlaceholder: true });
    const p = party("ph", 4, { id: "php" });
    const d = doc({
      groups: [ph],
      parties: [p],
      tables: [table("open", 8)],
    });
    const { assignments, unseated } = autoFill(d, "s1");
    expect(unseated).toEqual([]);
    expect(assignments["php"].tableId).toBe("open");
  });

  it("never seats anyone at the sweetheart table", () => {
    const g = group("g");
    const p = party("g", 2, { id: "p" });
    const d = doc({
      groups: [g],
      parties: [p],
      tables: [table("sweetheart", 8, { isSweetheart: true }), table("open", 8)],
    });
    const { assignments } = autoFill(d, "s1");
    expect(assignments["p"].tableId).toBe("open");
  });

  it("preserves locked assignments (respectLocked default true)", () => {
    const g = group("g");
    const p = party("g", 2, { id: "p" });
    const d = doc({
      groups: [g],
      parties: [p],
      tables: [table("a", 8), table("locked", 8)],
      assignments: { p: { tableId: "locked", locked: true } },
    });
    const { assignments } = autoFill(d, "s1");
    expect(assignments["p"].tableId).toBe("locked");
    expect(assignments["p"].locked).toBe(true);
  });

  it("keeps already-placed unlocked parties by default but reflows when keepExisting=false", () => {
    const g = group("g");
    const p = party("g", 2, { id: "p" });
    const d = doc({
      groups: [g],
      parties: [p],
      tables: [table("a", 8, { x: 0, y: 0 }), table("existing", 8, { x: 50, y: 50 })],
      assignments: { p: { tableId: "existing" } },
    });
    const kept = autoFill(d, "s1");
    expect(kept.assignments["p"].tableId).toBe("existing");

    const reflowed = autoFill(d, "s1", { keepExisting: false });
    // Reflow picks the best-fit / deterministic table, dropping the old slot.
    expect(reflowed.assignments["p"]).toBeDefined();
  });

  it("reports parties that don't fit as unseated with a warning", () => {
    const g = group("g");
    const ps = [party("g", 8, { id: "p1" }), party("g", 8, { id: "p2" })];
    const d = doc({
      groups: [g],
      parties: ps,
      tables: [table("only", 8)],
    });
    const { assignments, unseated, warnings } = autoFill(d, "s1");
    // One party fits, the other overflows.
    expect(unseated.length).toBe(1);
    expect(warnings.length).toBe(1);
    expect(Object.keys(assignments).length).toBe(1);
  });

  it("marks a party larger than any table as unseated", () => {
    const g = group("g");
    const ps = [party("g", 20, { id: "huge" }), party("g", 2, { id: "ok" })];
    const d = doc({
      groups: [g],
      parties: ps,
      tables: [table("a", 8), table("b", 8)],
    });
    const { assignments, unseated } = autoFill(d, "s1");
    expect(unseated).toContain("huge");
    expect(assignments["ok"]).toBeDefined();
  });

  it("prefers nearby tables when a unit is split across multiple tables", () => {
    const g = group("g");
    // Two parties of 4 with only cap-4 tables forces a 4/4 split.
    const ps = [party("g", 4, { id: "p1" }), party("g", 4, { id: "p2" })];
    const d = doc({
      groups: [g],
      parties: ps,
      tables: [
        table("a", 4, { x: 0, y: 0 }),
        table("b", 4, { x: 5, y: 5 }), // near a
        table("c", 4, { x: 90, y: 90 }), // far from a
      ],
    });
    const { assignments } = autoFill(d, "s1");
    const used = new Set(ps.map((p) => assignments[p.id].tableId));
    // First chunk lands on "a" (best-fit + id tiebreak); the second should
    // pick the nearby "b" rather than the far "c".
    expect(used.has("a")).toBe(true);
    expect(used.has("b")).toBe(true);
    expect(used.has("c")).toBe(false);
  });

  it("is deterministic across repeated runs", () => {
    const g1 = group("g1", { order: 0 });
    const g2 = group("g2", { order: 1 });
    const d = doc({
      groups: [g1, g2],
      parties: [
        party("g1", 5, { id: "g1p1" }),
        party("g1", 4, { id: "g1p2" }),
        party("g2", 6, { id: "g2p1" }),
        party("g2", 3, { id: "g2p2" }),
      ],
      tables: [
        table("a", 8, { x: 10, y: 10 }),
        table("b", 8, { x: 20, y: 20 }),
        table("c", 8, { x: 30, y: 30 }),
      ],
    });
    const r1 = autoFill(d, "s1");
    const r2 = autoFill(d, "s1");
    expect(r1).toEqual(r2);
  });

  it("seats from scratch when the scenario id is unknown (no existing assignments to preserve)", () => {
    const g = group("g");
    const d = doc({ groups: [g], parties: [party("g", 2, { id: "p" })], tables: [table("a", 8)] });
    const { assignments, unseated, warnings } = autoFill(d, "does-not-exist");
    expect(assignments["p"].tableId).toBe("a");
    expect(unseated).toEqual([]);
    expect(warnings).toEqual([]);
  });
});

// ---------- integration with the real seed plan ----------

describe("autoFill on the seed plan", () => {
  const plan = buildSeedPlan("seed-test");

  it("preserves the locked couple at the sweetheart and seats no one else there", () => {
    const { assignments } = autoFill(plan, "matt-draft");
    const couple = plan.groups.find((g) => g.isCouple);
    expect(couple).toBeDefined();
    const coupleParty = plan.parties.find((p) => p.groupId === couple?.id);
    expect(coupleParty).toBeDefined();
    if (coupleParty) {
      expect(assignments[coupleParty.id]?.tableId).toBe("sweetheart");
      expect(assignments[coupleParty.id]?.locked).toBe(true);
    }
    const atSweetheart = Object.entries(assignments)
      .filter(([, a]) => a.tableId === "sweetheart")
      .map(([pid]) => pid);
    expect(atSweetheart).toEqual(coupleParty ? [coupleParty.id] : []);
  });

  it("never exceeds any table's capacity and is deterministic for a fixed seed", () => {
    const r1 = autoFill(plan, "matt-draft");
    const r2 = autoFill(plan, "matt-draft");
    expect(r1).toEqual(r2);

    const occ = occupancy(plan, r1.assignments);
    for (const t of plan.tables) {
      expect(occ[t.id] ?? 0).toBeLessThanOrEqual(t.capacity);
    }
  });

  it("seats placeholder groups too (they're no longer skipped)", () => {
    const { assignments } = autoFill(plan, "matt-draft");
    const placeholderIds = new Set(
      plan.groups.filter((g) => g.isPlaceholder).map((g) => g.id),
    );
    const seatedPlaceholder = plan.parties.some(
      (p) => placeholderIds.has(p.groupId) && assignments[p.id],
    );
    expect(seatedPlaceholder).toBe(true);
  });
});

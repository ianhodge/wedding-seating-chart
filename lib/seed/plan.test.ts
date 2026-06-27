import { describe, it, expect } from "vitest";
import { buildSeedPlan } from "./plan";

describe("seed plan", () => {
  const plan = buildSeedPlan("test");

  it("has 18 groups (incl. the couple)", () => {
    expect(plan.groups.length).toBe(18);
  });

  it("has 201 attending guests (incl. the couple)", () => {
    expect(plan.guests.length).toBe(201);
  });

  it("starts with Matt's and Ian's drafts", () => {
    expect(plan.scenarios.map((s) => s.name)).toEqual([
      "Matt's Draft",
      "Ian's Draft",
    ]);
    expect(plan.activeScenarioId).toBe("matt-draft");
  });

  it("seats the couple at the sweetheart table (locked) in every draft", () => {
    const couple = plan.groups.find((g) => g.isCouple)!;
    const party = plan.parties.find((p) => p.groupId === couple.id)!;
    for (const s of plan.scenarios) {
      const a = s.assignments[party.id];
      expect(a?.tableId).toBe("sweetheart");
      expect(a?.locked).toBe(true);
    }
  });

  it("has 45 people across the placeholder groups", () => {
    const ph = new Set(plan.groups.filter((g) => g.isPlaceholder).map((g) => g.id));
    const total = plan.parties
      .filter((p) => ph.has(p.groupId))
      .reduce((s, p) => s + p.size, 0);
    expect(total).toBe(45);
  });

  it("has 154 people to actively seat (non-placeholder, non-couple)", () => {
    const exclude = new Set(
      plan.groups.filter((g) => g.isPlaceholder || g.isCouple).map((g) => g.id),
    );
    const total = plan.parties
      .filter((p) => !exclude.has(p.groupId))
      .reduce((s, p) => s + p.size, 0);
    expect(total).toBe(154);
  });

  it("has 200 seats across non-sweetheart tables", () => {
    const seats = plan.tables
      .filter((t) => !t.isSweetheart)
      .reduce((s, t) => s + t.capacity, 0);
    expect(seats).toBe(200);
  });
});

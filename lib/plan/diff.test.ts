import { describe, it, expect } from "vitest";
import { buildSeedPlan } from "@/lib/seed/plan";
import { diffScenarios, consolidateScenarios } from "./diff";
import { assignParty } from "./ops";

function nonCoupleParties(plan: ReturnType<typeof buildSeedPlan>) {
  const couple = new Set(plan.groups.filter((g) => g.isCouple).map((g) => g.id));
  return plan.parties.filter((p) => !couple.has(p.groupId));
}

describe("scenario diff", () => {
  it("classifies same / moved / onlyA", () => {
    let plan = buildSeedPlan("t");
    const [p1, p2, p3] = nonCoupleParties(plan);

    plan = assignParty(plan, p1.id, "t1", "matt-draft");
    plan = assignParty(plan, p2.id, "t1", "matt-draft");
    plan = assignParty(plan, p3.id, "t1", "matt-draft");

    plan = assignParty(plan, p1.id, "t1", "ian-draft"); // same
    plan = assignParty(plan, p2.id, "t2", "ian-draft"); // moved
    // p3 left unassigned in Ian's -> onlyA

    const d = diffScenarios(plan, "matt-draft", "ian-draft");
    const byId = Object.fromEntries(d.parties.map((x) => [x.partyId, x.status]));
    expect(byId[p1.id]).toBe("same");
    expect(byId[p2.id]).toBe("moved");
    expect(byId[p3.id]).toBe("onlyA");
    expect(d.counts.moved).toBe(1);
    expect(d.counts.onlyA).toBe(1);
  });

  it("consolidates by per-party choice", () => {
    let plan = buildSeedPlan("t");
    const [p] = nonCoupleParties(plan);
    plan = assignParty(plan, p.id, "t1", "matt-draft");
    plan = assignParty(plan, p.id, "t2", "ian-draft");

    const merged = consolidateScenarios(plan, "matt-draft", "ian-draft", { [p.id]: "b" }, "a");
    expect(merged[p.id].tableId).toBe("t2");

    const mergedDefault = consolidateScenarios(plan, "matt-draft", "ian-draft", {}, "a");
    expect(mergedDefault[p.id].tableId).toBe("t1");
  });
});

import {
  PlanDoc,
  PartyId,
  TableId,
  ScenarioId,
  Scenario,
  Assignment,
} from "@/lib/types";

/** Pure helpers that return a new PlanDoc. Shared by UI + anything mutating a plan. */

export function getActiveScenario(doc: PlanDoc): Scenario {
  return doc.scenarios.find((s) => s.id === doc.activeScenarioId) ?? doc.scenarios[0];
}

function mapScenario(
  doc: PlanDoc,
  scenarioId: ScenarioId,
  fn: (s: Scenario) => Scenario,
): PlanDoc {
  return {
    ...doc,
    scenarios: doc.scenarios.map((s) => (s.id === scenarioId ? fn(s) : s)),
  };
}

export function assignParty(
  doc: PlanDoc,
  partyId: PartyId,
  tableId: TableId,
  scenarioId: ScenarioId = doc.activeScenarioId,
): PlanDoc {
  return mapScenario(doc, scenarioId, (s) => ({
    ...s,
    updatedAt: Date.now(),
    assignments: {
      ...s.assignments,
      [partyId]: { ...(s.assignments[partyId] || {}), tableId },
    },
  }));
}

export function unassignParty(
  doc: PlanDoc,
  partyId: PartyId,
  scenarioId: ScenarioId = doc.activeScenarioId,
): PlanDoc {
  return mapScenario(doc, scenarioId, (s) => {
    const assignments = { ...s.assignments };
    delete assignments[partyId];
    return { ...s, updatedAt: Date.now(), assignments };
  });
}

export function toggleLock(
  doc: PlanDoc,
  partyId: PartyId,
  scenarioId: ScenarioId = doc.activeScenarioId,
): PlanDoc {
  return mapScenario(doc, scenarioId, (s) => {
    const cur = s.assignments[partyId];
    if (!cur) return s;
    return {
      ...s,
      updatedAt: Date.now(),
      assignments: { ...s.assignments, [partyId]: { ...cur, locked: !cur.locked } },
    };
  });
}

export function applyAssignments(
  doc: PlanDoc,
  assignments: Record<PartyId, Assignment>,
  scenarioId: ScenarioId = doc.activeScenarioId,
): PlanDoc {
  return mapScenario(doc, scenarioId, (s) => ({
    ...s,
    updatedAt: Date.now(),
    assignments,
  }));
}

/** Seats used at each table for a scenario. */
export function tableOccupancy(
  doc: PlanDoc,
  scenarioId: ScenarioId = doc.activeScenarioId,
): Record<TableId, number> {
  const scenario = doc.scenarios.find((s) => s.id === scenarioId);
  const sizeByParty = new Map(doc.parties.map((p) => [p.id, p.size]));
  const occ: Record<TableId, number> = {};
  for (const t of doc.tables) occ[t.id] = 0;
  if (!scenario) return occ;
  for (const [pid, a] of Object.entries(scenario.assignments)) {
    occ[a.tableId] = (occ[a.tableId] || 0) + (sizeByParty.get(pid) || 0);
  }
  return occ;
}

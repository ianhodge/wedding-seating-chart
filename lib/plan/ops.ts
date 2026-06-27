import {
  PlanDoc,
  PartyId,
  TableId,
  ScenarioId,
  Scenario,
  Assignment,
} from "@/lib/types";
import { nanoid } from "nanoid";

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

// --- Scenario (draft) CRUD -------------------------------------------------

export function setActiveScenario(doc: PlanDoc, scenarioId: ScenarioId): PlanDoc {
  return { ...doc, activeScenarioId: scenarioId };
}

/** Adds a new draft and makes it active. Read the new id from activeScenarioId. */
export function addScenario(
  doc: PlanDoc,
  name: string,
  assignments: Record<PartyId, Assignment> = {},
): PlanDoc {
  const now = Date.now();
  const scenario: Scenario = {
    id: nanoid(8),
    name,
    assignments: { ...assignments },
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...doc,
    scenarios: [...doc.scenarios, scenario],
    activeScenarioId: scenario.id,
  };
}

export function duplicateScenario(
  doc: PlanDoc,
  scenarioId: ScenarioId,
  name?: string,
): PlanDoc {
  const src = doc.scenarios.find((s) => s.id === scenarioId);
  if (!src) return doc;
  return addScenario(doc, name ?? `${src.name} (copy)`, src.assignments);
}

export function renameScenario(
  doc: PlanDoc,
  scenarioId: ScenarioId,
  name: string,
): PlanDoc {
  return {
    ...doc,
    scenarios: doc.scenarios.map((s) =>
      s.id === scenarioId ? { ...s, name, updatedAt: Date.now() } : s,
    ),
  };
}

/** Deletes a draft (never the last one), fixing up the active draft. */
export function deleteScenario(doc: PlanDoc, scenarioId: ScenarioId): PlanDoc {
  if (doc.scenarios.length <= 1) return doc;
  const scenarios = doc.scenarios.filter((s) => s.id !== scenarioId);
  const activeScenarioId =
    doc.activeScenarioId === scenarioId ? scenarios[0].id : doc.activeScenarioId;
  return { ...doc, scenarios, activeScenarioId };
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

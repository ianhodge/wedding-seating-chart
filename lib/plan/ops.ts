import {
  PlanDoc,
  PartyId,
  TableId,
  ScenarioId,
  Scenario,
  Assignment,
  GroupId,
  SubgroupId,
  Subgroup,
  Guest,
  GuestId,
  Party,
} from "@/lib/types";
import { splitDownMiddle } from "@/lib/seating";
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

// --- Reservations ----------------------------------------------------------

/** Move (or clear) which placeholder group a table is reserved for. */
export function setTableReservation(
  doc: PlanDoc,
  tableId: TableId,
  groupId: GroupId | null,
): PlanDoc {
  return {
    ...doc,
    updatedAt: Date.now(),
    tables: doc.tables.map((t) =>
      t.id === tableId ? { ...t, reservedForGroupId: groupId } : t,
    ),
  };
}

// --- Subgroup CRUD ---------------------------------------------------------

/** Add a named subgroup to a group. */
export function addSubgroup(doc: PlanDoc, groupId: GroupId, name: string): PlanDoc {
  const order = doc.subgroups.filter((s) => s.groupId === groupId).length;
  const subgroup: Subgroup = { id: nanoid(8), groupId, name, order };
  return { ...doc, updatedAt: Date.now(), subgroups: [...doc.subgroups, subgroup] };
}

export function renameSubgroup(
  doc: PlanDoc,
  subgroupId: SubgroupId,
  name: string,
): PlanDoc {
  return {
    ...doc,
    updatedAt: Date.now(),
    subgroups: doc.subgroups.map((s) => (s.id === subgroupId ? { ...s, name } : s)),
  };
}

/** Delete a subgroup, clearing it from any parties/guests that referenced it. */
export function deleteSubgroup(doc: PlanDoc, subgroupId: SubgroupId): PlanDoc {
  return {
    ...doc,
    updatedAt: Date.now(),
    subgroups: doc.subgroups.filter((s) => s.id !== subgroupId),
    parties: doc.parties.map((p) =>
      p.subgroupId === subgroupId ? { ...p, subgroupId: null } : p,
    ),
    guests: doc.guests.map((g) =>
      g.subgroupId === subgroupId ? { ...g, subgroupId: null } : g,
    ),
  };
}

/** Assign (or clear) the subgroup of a party (and keep its guests in sync). */
export function setPartySubgroup(
  doc: PlanDoc,
  partyId: PartyId,
  subgroupId: SubgroupId | null,
): PlanDoc {
  return {
    ...doc,
    updatedAt: Date.now(),
    parties: doc.parties.map((p) => (p.id === partyId ? { ...p, subgroupId } : p)),
    guests: doc.guests.map((g) =>
      g.partyId === partyId ? { ...g, subgroupId } : g,
    ),
  };
}

/**
 * Split a group's parties into two balanced subgroups ("Side A"/"Side B")
 * by headcount, keeping parties intact. Replaces any existing subgroups of
 * the group. Returns a new PlanDoc.
 */
export function splitGroupEvenly(
  doc: PlanDoc,
  groupId: GroupId,
  names: [string, string] = ["Side A", "Side B"],
): PlanDoc {
  const groupParties = doc.parties.filter((p) => p.groupId === groupId);
  if (groupParties.length === 0) return doc;
  const [left, right] = splitDownMiddle(groupParties);
  const aId = nanoid(8);
  const bId = nanoid(8);
  const subgroups: Subgroup[] = [
    ...doc.subgroups.filter((s) => s.groupId !== groupId),
    { id: aId, groupId, name: names[0], order: 0 },
    { id: bId, groupId, name: names[1], order: 1 },
  ];
  const subByParty = new Map<PartyId, SubgroupId>();
  for (const p of left) subByParty.set(p.id, aId);
  for (const p of right) subByParty.set(p.id, bId);
  return {
    ...doc,
    updatedAt: Date.now(),
    subgroups,
    parties: doc.parties.map((p) => {
      const sub = subByParty.get(p.id);
      return sub ? { ...p, subgroupId: sub } : p;
    }),
    guests: doc.guests.map((g) => {
      const sub = subByParty.get(g.partyId);
      return sub ? { ...g, subgroupId: sub } : g;
    }),
  };
}

// --- Guest / Party CRUD ----------------------------------------------------

const attendingCount = (guests: Guest[], partyId: PartyId): number =>
  guests.filter((g) => g.partyId === partyId && g.attending).length;

/** Create a party (and its guests) in a group. Each name becomes a guest. */
export function addParty(
  doc: PlanDoc,
  groupId: GroupId,
  guestNames: string[],
  subgroupId: SubgroupId | null = null,
): PlanDoc {
  const names = guestNames.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) return doc;
  const partyId = nanoid(10);
  const guests: Guest[] = names.map((full) => {
    const i = full.indexOf(" ");
    const firstName = i === -1 ? full : full.slice(0, i);
    const lastName = i === -1 ? "" : full.slice(i + 1);
    return {
      id: nanoid(10),
      firstName,
      lastName,
      groupId,
      partyId,
      subgroupId,
      attending: true,
    };
  });
  const party: Party = {
    id: partyId,
    label: names.length > 1 ? names.join(" & ") : names[0],
    groupId,
    subgroupId,
    guestIds: guests.map((g) => g.id),
    size: names.length,
  };
  return {
    ...doc,
    updatedAt: Date.now(),
    parties: [...doc.parties, party],
    guests: [...doc.guests, ...guests],
  };
}

export function renameParty(doc: PlanDoc, partyId: PartyId, label: string): PlanDoc {
  return {
    ...doc,
    updatedAt: Date.now(),
    parties: doc.parties.map((p) => (p.id === partyId ? { ...p, label } : p)),
  };
}

/** Remove a party, its guests, and its assignment from every scenario. */
export function removeParty(doc: PlanDoc, partyId: PartyId): PlanDoc {
  return {
    ...doc,
    updatedAt: Date.now(),
    parties: doc.parties.filter((p) => p.id !== partyId),
    guests: doc.guests.filter((g) => g.partyId !== partyId),
    scenarios: doc.scenarios.map((s) => {
      if (!(partyId in s.assignments)) return s;
      const assignments = { ...s.assignments };
      delete assignments[partyId];
      return { ...s, assignments };
    }),
  };
}

/** Add a guest to an existing party, recomputing the party's attending size. */
export function addGuest(
  doc: PlanDoc,
  partyId: PartyId,
  firstName: string,
  lastName: string,
): PlanDoc {
  const party = doc.parties.find((p) => p.id === partyId);
  if (!party) return doc;
  const guest: Guest = {
    id: nanoid(10),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    groupId: party.groupId,
    partyId,
    subgroupId: party.subgroupId ?? null,
    attending: true,
  };
  const guests = [...doc.guests, guest];
  return {
    ...doc,
    updatedAt: Date.now(),
    guests,
    parties: doc.parties.map((p) =>
      p.id === partyId
        ? { ...p, guestIds: [...p.guestIds, guest.id], size: attendingCount(guests, partyId) }
        : p,
    ),
  };
}

export function renameGuest(
  doc: PlanDoc,
  guestId: GuestId,
  firstName: string,
  lastName: string,
): PlanDoc {
  return {
    ...doc,
    updatedAt: Date.now(),
    guests: doc.guests.map((g) =>
      g.id === guestId ? { ...g, firstName, lastName } : g,
    ),
  };
}

/** Remove a guest; removes the party entirely if it was the last guest. */
export function removeGuest(doc: PlanDoc, guestId: GuestId): PlanDoc {
  const guest = doc.guests.find((g) => g.id === guestId);
  if (!guest) return doc;
  const partyId = guest.partyId;
  const guests = doc.guests.filter((g) => g.id !== guestId);
  const remaining = guests.filter((g) => g.partyId === partyId);
  if (remaining.length === 0) return removeParty(doc, partyId);
  return {
    ...doc,
    updatedAt: Date.now(),
    guests,
    parties: doc.parties.map((p) =>
      p.id === partyId
        ? {
            ...p,
            guestIds: p.guestIds.filter((id) => id !== guestId),
            size: attendingCount(guests, partyId),
          }
        : p,
    ),
  };
}

/** Toggle a guest's attendance, recomputing the party's seat count. */
export function toggleGuestAttending(doc: PlanDoc, guestId: GuestId): PlanDoc {
  const guest = doc.guests.find((g) => g.id === guestId);
  if (!guest) return doc;
  const guests = doc.guests.map((g) =>
    g.id === guestId ? { ...g, attending: !g.attending } : g,
  );
  return {
    ...doc,
    updatedAt: Date.now(),
    guests,
    parties: doc.parties.map((p) =>
      p.id === guest.partyId
        ? { ...p, size: attendingCount(guests, guest.partyId) }
        : p,
    ),
  };
}

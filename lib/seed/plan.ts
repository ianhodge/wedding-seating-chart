import {
  PlanDoc,
  Group,
  Party,
  Guest,
  Subgroup,
  Scenario,
  SCHEMA_VERSION,
} from "@/lib/types";
import { RAW_GROUPS } from "./guests";
import { slug, splitName } from "@/lib/util/ids";
import { colorForIndex } from "@/lib/util/colors";
import { DEFAULT_TABLES, DEFAULT_FEATURES } from "@/lib/venue/layout";

/** Build the initial PlanDoc (guests, parties, groups, tables, one scenario). */
export function buildSeedPlan(planId: string): PlanDoc {
  const groups: Group[] = [];
  const parties: Party[] = [];
  const guests: Guest[] = [];

  RAW_GROUPS.forEach((rg, gi) => {
    const groupId = slug(rg.name);
    groups.push({
      id: groupId,
      name: rg.name,
      color: colorForIndex(gi),
      isPlaceholder: !!rg.isPlaceholder,
      isCouple: !!rg.isCouple,
      order: gi,
    });

    rg.parties.forEach((members, pi) => {
      const partyId = `${groupId}__p${pi}`;
      const guestIds: string[] = [];
      members.forEach((name, mi) => {
        const { firstName, lastName } = splitName(name);
        const guestId = `${partyId}__g${mi}`;
        guests.push({
          id: guestId,
          firstName,
          lastName,
          groupId,
          partyId,
          subgroupId: null,
          attending: true,
        });
        guestIds.push(guestId);
      });
      parties.push({
        id: partyId,
        label: members.length > 1 ? members.join(" & ") : members[0],
        groupId,
        subgroupId: null,
        guestIds,
        size: members.length,
      });
    });
  });

  const tables = DEFAULT_TABLES.map((t) => ({ ...t }));
  const sweetheart = tables.find((t) => t.isSweetheart);
  const coupleGroup = groups.find((g) => g.isCouple);
  const coupleParty = coupleGroup
    ? parties.find((p) => p.groupId === coupleGroup.id)
    : undefined;

  // Default scenario: only the couple is pre-seated (at the sweetheart table).
  const assignments: Scenario["assignments"] = {};
  if (sweetheart && coupleParty) {
    assignments[coupleParty.id] = { tableId: sweetheart.id, locked: true };
  }

  const now = Date.now();
  const scenario: Scenario = {
    id: "draft-1",
    name: "Draft 1",
    assignments,
    createdAt: now,
    updatedAt: now,
  };

  return {
    planId,
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    coupleName: "Matt & Ian",
    guests,
    parties,
    groups,
    subgroups: [] as Subgroup[],
    tables,
    features: DEFAULT_FEATURES,
    scenarios: [scenario],
    activeScenarioId: scenario.id,
    updatedAt: now,
  };
}

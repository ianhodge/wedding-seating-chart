import { describe, it, expect } from "vitest";
import { buildSeedPlan } from "@/lib/seed/plan";
import {
  addGuest,
  addParty,
  addSubgroup,
  assignParty,
  deleteSubgroup,
  removeGuest,
  removeParty,
  renameParty,
  renameSubgroup,
  setPartySubgroup,
  setTableReservation,
  splitGroupEvenly,
  toggleGuestAttending,
} from "@/lib/plan/ops";

function firstNonCoupleGroupId(planId = "test") {
  const doc = buildSeedPlan(planId);
  const g = doc.groups.find((x) => !x.isCouple && !x.isPlaceholder);
  if (!g) throw new Error("no group");
  return { doc, groupId: g.id };
}

describe("party CRUD", () => {
  it("addParty creates a party and its guests with correct size", () => {
    const { doc, groupId } = firstNonCoupleGroupId();
    const before = doc.parties.length;
    const next = addParty(doc, groupId, ["Jamie Rivera", "Sky Rivera"]);
    expect(next.parties.length).toBe(before + 1);
    const party = next.parties[next.parties.length - 1];
    expect(party.size).toBe(2);
    expect(party.label).toBe("Jamie Rivera & Sky Rivera");
    expect(next.guests.filter((g) => g.partyId === party.id)).toHaveLength(2);
  });

  it("removeParty deletes the party, its guests, and clears assignments", () => {
    const { doc, groupId } = firstNonCoupleGroupId();
    const party = doc.parties.find((p) => p.groupId === groupId);
    if (!party) throw new Error("no party");
    const seated = assignParty(doc, party.id, doc.tables[0].id);
    const next = removeParty(seated, party.id);
    expect(next.parties.find((p) => p.id === party.id)).toBeUndefined();
    expect(next.guests.some((g) => g.partyId === party.id)).toBe(false);
    for (const s of next.scenarios) {
      expect(s.assignments[party.id]).toBeUndefined();
    }
  });

  it("renameParty updates only the label", () => {
    const { doc } = firstNonCoupleGroupId();
    const p = doc.parties[1];
    const next = renameParty(doc, p.id, "New Label");
    expect(next.parties.find((x) => x.id === p.id)?.label).toBe("New Label");
  });
});

describe("guest CRUD + attendance", () => {
  it("toggleGuestAttending recomputes the party size", () => {
    const { doc } = firstNonCoupleGroupId();
    const party = doc.parties.find((p) => p.size >= 2);
    if (!party) throw new Error("need a party of 2");
    const gid = party.guestIds[0];
    const next = toggleGuestAttending(doc, gid);
    expect(next.parties.find((p) => p.id === party.id)?.size).toBe(party.size - 1);
  });

  it("addGuest grows the party and removeGuest shrinks it", () => {
    const { doc } = firstNonCoupleGroupId();
    const party = doc.parties[1];
    const added = addGuest(doc, party.id, "Pat", "Doe");
    const grown = added.parties.find((p) => p.id === party.id);
    expect(grown?.size).toBe(party.size + 1);
    const newGuestId = grown?.guestIds[grown.guestIds.length - 1] as string;
    const removed = removeGuest(added, newGuestId);
    expect(removed.parties.find((p) => p.id === party.id)?.size).toBe(party.size);
  });

  it("removing the last guest removes the whole party", () => {
    const { doc, groupId } = firstNonCoupleGroupId();
    const solo = addParty(doc, groupId, ["Solo Guest"]);
    const party = solo.parties[solo.parties.length - 1];
    const gid = party.guestIds[0];
    const next = removeGuest(solo, gid);
    expect(next.parties.find((p) => p.id === party.id)).toBeUndefined();
  });
});

describe("subgroups", () => {
  it("add/rename/delete and clearing party references", () => {
    const { doc, groupId } = firstNonCoupleGroupId();
    const added = addSubgroup(doc, groupId, "Side A");
    const sg = added.subgroups[added.subgroups.length - 1];
    expect(sg.name).toBe("Side A");

    const renamed = renameSubgroup(added, sg.id, "VIPs");
    expect(renamed.subgroups.find((s) => s.id === sg.id)?.name).toBe("VIPs");

    const party = renamed.parties.find((p) => p.groupId === groupId);
    if (!party) throw new Error("no party");
    const assigned = setPartySubgroup(renamed, party.id, sg.id);
    expect(assigned.parties.find((p) => p.id === party.id)?.subgroupId).toBe(sg.id);

    const deleted = deleteSubgroup(assigned, sg.id);
    expect(deleted.subgroups.find((s) => s.id === sg.id)).toBeUndefined();
    expect(deleted.parties.find((p) => p.id === party.id)?.subgroupId).toBeNull();
  });

  it("splitGroupEvenly creates two subgroups covering every party intact", () => {
    const { doc, groupId } = firstNonCoupleGroupId();
    const next = splitGroupEvenly(doc, groupId);
    const subs = next.subgroups.filter((s) => s.groupId === groupId);
    expect(subs).toHaveLength(2);
    const groupParties = next.parties.filter((p) => p.groupId === groupId);
    expect(groupParties.every((p) => p.subgroupId)).toBe(true);
    const ids = new Set(subs.map((s) => s.id));
    expect(groupParties.every((p) => ids.has(p.subgroupId as string))).toBe(true);
  });
});

describe("reservations", () => {
  it("setTableReservation moves and clears a reservation", () => {
    const doc = buildSeedPlan("test");
    const table = doc.tables.find((t) => !t.isSweetheart);
    if (!table) throw new Error("no table");
    const placeholder = doc.groups.find((g) => g.isPlaceholder);
    if (!placeholder) throw new Error("no placeholder group");

    const moved = setTableReservation(doc, table.id, placeholder.id);
    expect(moved.tables.find((t) => t.id === table.id)?.reservedForGroupId).toBe(
      placeholder.id,
    );
    const cleared = setTableReservation(moved, table.id, null);
    expect(cleared.tables.find((t) => t.id === table.id)?.reservedForGroupId).toBeNull();
  });
});

"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { usePlan } from "@/lib/client/usePlan";
import { assignParty, unassignParty } from "@/lib/plan/ops";
import { PlanProvider, usePlanCtx } from "@/components/PlanContext";
import { TRAY_ID, parseSubgroupDragId } from "@/components/dnd";
import Header from "@/components/Header";
import Toolbar from "@/components/Toolbar";
import Sidebar from "@/components/Sidebar";
import FloorPlan from "@/components/FloorPlan";
import Legend from "@/components/Legend";
import TableRoster from "@/components/TableRoster";
import DraftBar from "@/components/DraftBar";
import SubgroupDialog from "@/components/SubgroupDialog";
import GuestDialog from "@/components/GuestDialog";
import CompareDialog from "@/components/CompareDialog";
import Toasts from "@/components/Toasts";

function ensurePlanId(): string {
  const url = new URL(window.location.href);
  let id = url.searchParams.get("plan");
  if (!id) {
    id = Math.random().toString(36).slice(2, 12);
    url.searchParams.set("plan", id);
    window.history.replaceState({}, "", url.toString());
  }
  return id;
}

export default function Home() {
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlanId(ensurePlanId());
  }, []);

  const { plan, isLoading, save } = usePlan(planId);

  return (
    <main className="flex-1">
      <Header coupleName={plan?.coupleName ?? "Matt & Ian"} />
      {isLoading || !plan ? (
        <p className="p-10 text-center font-serif text-xl">Loading the love… 💌</p>
      ) : (
        <PlanProvider plan={plan} save={save}>
          <Board />
          <Toasts />
        </PlanProvider>
      )}
    </main>
  );
}

function Board() {
  const { plan, scenario, commit, toast, groupById, tableById, occupancy } =
    usePlanCtx();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [subgroupGroupId, setSubgroupGroupId] = useState<string | null>(null);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [guestsGroupId, setGuestsGroupId] = useState<string | null>(null);
  const [guestsKey, setGuestsKey] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
  );

  const activeParty = activeId
    ? plan.parties.find((p) => p.id === activeId)
    : undefined;
  const activeSubgroupId = activeId ? parseSubgroupDragId(activeId) : null;
  const activeSubgroup = activeSubgroupId
    ? plan.subgroups.find((s) => s.id === activeSubgroupId)
    : undefined;

  function moveSubgroup(sgId: string, overId: string) {
    const parties = plan.parties.filter((p) => p.subgroupId === sgId);
    const movable = parties.filter((p) => !scenario.assignments[p.id]?.locked);
    if (movable.length === 0) {
      toast("Those seats are locked \uD83D\uDD12", "warn");
      return;
    }
    if (overId === TRAY_ID) {
      let next = plan;
      for (const p of movable) next = unassignParty(next, p.id);
      commit(next);
      toast("Subgroup sent back to the tray \uD83E\uDE91", "info");
      return;
    }
    const table = tableById.get(overId);
    if (!table) return;
    if (table.isSweetheart) {
      toast("The sweetheart table is just for the lovebirds \uD83D\uDC95", "warn");
      return;
    }
    const incoming = movable.filter(
      (p) => scenario.assignments[p.id]?.tableId !== table.id,
    );
    const needed = incoming.reduce((s, p) => s + p.size, 0);
    const free = table.capacity - (occupancy[table.id] || 0);
    if (needed > free) {
      toast(
        `${table.label} can't fit the whole subgroup \u2014 needs ${needed}, only ${Math.max(
          0,
          free,
        )} free.`,
        "warn",
      );
      return;
    }
    let next = plan;
    for (const p of movable) next = assignParty(next, p.id, table.id);
    commit(next);
    toast("Seated the whole subgroup together \uD83C\uDF89", "love");
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const partyId = String(e.active.id);
    const over = e.over;
    if (!over) return;
    const overId = String(over.id);

    const sgId = parseSubgroupDragId(partyId);
    if (sgId) {
      moveSubgroup(sgId, overId);
      return;
    }

    if (overId === TRAY_ID) {
      const cur = scenario.assignments[partyId];
      if (cur?.locked) {
        toast("Unlock this seat first 🔒", "warn");
        return;
      }
      commit(unassignParty(plan, partyId));
      return;
    }

    const table = tableById.get(overId);
    const party = plan.parties.find((p) => p.id === partyId);
    if (!table || !party) return;

    const cur = scenario.assignments[partyId];
    if (cur?.tableId === table.id) return;
    if (cur?.locked) {
      toast("Unlock this seat first 🔒", "warn");
      return;
    }

    const group = groupById.get(party.groupId);
    if (table.isSweetheart && !group?.isCouple) {
      toast("The sweetheart table is just for the lovebirds 💕", "warn");
      return;
    }

    const remaining = table.capacity - (occupancy[table.id] || 0);
    if (party.size > remaining) {
      toast(
        `${table.label} is full! Only ${Math.max(0, remaining)} seat(s) left.`,
        "warn",
      );
      return;
    }

    commit(assignParty(plan, partyId, table.id));
  }

  function openGuests(groupId: string | null) {
    setGuestsGroupId(groupId);
    setGuestsKey((k) => k + 1);
    setGuestsOpen(true);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="mx-auto w-full max-w-7xl space-y-4 px-3 pb-20 pt-4 sm:px-5">
        <DraftBar
          onCompare={() => setCompareOpen(true)}
          onOpenGuests={() => openGuests(null)}
        />
        <Toolbar />

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Sidebar
            onOpenSubgroups={(id) => setSubgroupGroupId(id)}
            onOpenGuests={(id) => openGuests(id)}
          />
          <div className="space-y-4">
            <FloorPlan />
            <Legend />
            <TableRoster />
          </div>
        </div>

        <p className="text-center text-xs italic opacity-60">
          Made with 💕 — drag a party onto a table, lock the keepers, and let
          auto-fill do the rest.
        </p>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeParty ? (
          <div
            className="flex items-center gap-2 rounded-xl border-2 bg-white px-2 py-1.5 text-sm shadow-lg"
            style={{
              borderColor: groupById.get(activeParty.groupId)?.color ?? "#ccc",
            }}
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor:
                  groupById.get(activeParty.groupId)?.color ?? "#ccc",
              }}
            />
            <span className="font-medium">{activeParty.label}</span>
            <span className="rounded-full bg-blush/60 px-1.5 text-[11px] font-semibold text-rose">
              {activeParty.size}
            </span>
          </div>
        ) : activeSubgroup ? (
          <div className="rounded-xl border-2 border-plum bg-white px-3 py-1.5 text-sm font-semibold text-plum shadow-lg">
            ✂️ {activeSubgroup.name}
          </div>
        ) : null}
      </DragOverlay>

      <SubgroupDialog
        groupId={subgroupGroupId}
        onClose={() => setSubgroupGroupId(null)}
      />
      <GuestDialog
        key={guestsKey}
        open={guestsOpen}
        initialGroupId={guestsGroupId}
        onClose={() => setGuestsOpen(false)}
      />
      <CompareDialog open={compareOpen} onClose={() => setCompareOpen(false)} />
    </DndContext>
  );
}

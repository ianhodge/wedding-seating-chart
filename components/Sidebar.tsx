"use client";

import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { Group } from "@/lib/types";
import { usePlanCtx } from "./PlanContext";
import PartyCard from "./PartyCard";
import { TRAY_ID, subgroupDragId } from "./dnd";

/** A draggable header that lets you seat a whole finalized subgroup at once. */
function SubgroupHeader({
  id,
  name,
  size,
}: {
  id: string;
  name: string;
  size: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: subgroupDragId(id),
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      title="Drag to seat this whole subgroup at a table"
      className={`flex cursor-grab items-center gap-1 rounded px-0.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide opacity-70 hover:bg-blush/40 active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span aria-hidden>⠿</span>
      <span className="truncate">{name}</span>
      <span className="ml-auto rounded-full bg-blush/60 px-1.5 text-[10px] text-rose">
        {size}
      </span>
    </div>
  );
}

export default function Sidebar({
  onOpenSubgroups,
  onOpenGuests,
}: {
  onOpenSubgroups: (groupId: string) => void;
  onOpenGuests: (groupId: string) => void;
}) {
  const { plan, scenario } = usePlanCtx();
  const assigned = new Set(Object.keys(scenario.assignments));
  const unassigned = plan.parties.filter((p) => !assigned.has(p.id));
  const groups = [...plan.groups].sort((a, b) => a.order - b.order);

  return (
    <aside className="flex flex-col gap-3">
      <UnassignedTray count={unassigned.reduce((s, p) => s + p.size, 0)}>
        {unassigned.length === 0 ? (
          <p className="px-1 py-2 text-center text-xs italic opacity-60">
            🎉 Everyone has a seat! Drag here to un-seat someone.
          </p>
        ) : (
          <div className="grid gap-1.5">
            {unassigned.map((p) => (
              <PartyCard key={p.id} party={p} compact />
            ))}
          </div>
        )}
      </UnassignedTray>

      <div className="rounded-2xl border-2 border-rose/20 bg-white/70 p-3">
        <h2 className="px-1 font-serif text-xl font-semibold">Guest groups</h2>
        <div className="mt-2 space-y-2">
          {groups.map((g) => (
            <GroupSection
              key={g.id}
              group={g}
              onOpenSubgroups={() => onOpenSubgroups(g.id)}
              onOpenGuests={() => onOpenGuests(g.id)}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function UnassignedTray({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: TRAY_ID });
  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border-2 border-dashed p-3 transition ${
        isOver ? "border-rose bg-blush/40" : "border-rose/30 bg-white/60"
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <h2 className="font-serif text-xl font-semibold">🪑 Still mingling</h2>
        <span className="rounded-full bg-blush/60 px-2 text-sm font-semibold tabular-nums text-rose">
          {count}
        </span>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function GroupSection({
  group,
  onOpenSubgroups,
  onOpenGuests,
}: {
  group: Group;
  onOpenSubgroups: () => void;
  onOpenGuests: () => void;
}) {
  const { plan, scenario, tableById, tableByParty } = usePlanCtx();
  const [open, setOpen] = useState(false);

  const parties = plan.parties.filter((p) => p.groupId === group.id);
  const assigned = new Set(Object.keys(scenario.assignments));
  const people = parties.reduce((s, p) => s + p.size, 0);
  const seated = parties
    .filter((p) => assigned.has(p.id))
    .reduce((s, p) => s + p.size, 0);

  const tablesUsed = [
    ...new Set(
      parties
        .map((p) => tableByParty.get(p.id))
        .filter((t): t is string => Boolean(t)),
    ),
  ];
  const subgroups = plan.subgroups
    .filter((s) => s.groupId === group.id)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="rounded-xl border border-rose/20 bg-white">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="w-3 text-xs opacity-60">{open ? "▾" : "▸"}</span>
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ backgroundColor: group.color }}
          />
          <span className="min-w-0 flex-1 truncate font-semibold">
            {group.name}
            {group.isCouple && " 💑"}
          </span>
          {group.isPlaceholder && (
            <span className="shrink-0 rounded-full bg-gold/30 px-1.5 text-[10px] font-semibold text-amber-800">
              for mom
            </span>
          )}
          <span className="shrink-0 text-xs tabular-nums opacity-70">
            {seated}/{people}
          </span>
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t border-rose/10 px-2 py-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={onOpenGuests}
              className="rounded-full border border-rose/30 px-2 py-0.5 text-[11px] font-semibold text-rose transition hover:bg-blush/40"
            >
              👥 Guests
            </button>
            {!group.isCouple && (
              <button
                onClick={onOpenSubgroups}
                className="rounded-full border border-plum/30 px-2 py-0.5 text-[11px] font-semibold text-plum transition hover:bg-plum/10"
              >
                ✂️ Subgroups
              </button>
            )}
          </div>

          {tablesUsed.length > 1 && (
            <p className="text-[11px] italic opacity-70">
              Split across:{" "}
              {tablesUsed
                .map((t) => tableById.get(t)?.label ?? t)
                .join(", ")}
            </p>
          )}

          {subgroups.length > 0 ? (
            <div className="space-y-2">
              {subgroups.map((sg) => {
                const sgParties = parties.filter((p) => p.subgroupId === sg.id);
                if (sgParties.length === 0) return null;
                return (
                  <div key={sg.id}>
                    <SubgroupHeader
                      id={sg.id}
                      name={sg.name}
                      size={sgParties.reduce((s, p) => s + p.size, 0)}
                    />
                    <div className="mt-1 grid gap-1.5">
                      {sgParties.map((p) => (
                        <PartyCard key={p.id} party={p} compact />
                      ))}
                    </div>
                  </div>
                );
              })}
              {parties.filter((p) => !p.subgroupId).length > 0 && (
                <div>
                  <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wide opacity-60">
                    Unsorted
                  </p>
                  <div className="mt-1 grid gap-1.5">
                    {parties
                      .filter((p) => !p.subgroupId)
                      .map((p) => (
                        <PartyCard key={p.id} party={p} compact />
                      ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-1.5">
              {parties.map((p) => (
                <PartyCard key={p.id} party={p} compact />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

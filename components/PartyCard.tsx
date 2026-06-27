"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Party } from "@/lib/types";
import { usePlanCtx } from "./PlanContext";
import { toggleLock, unassignParty } from "@/lib/plan/ops";

export default function PartyCard({
  party,
  compact,
}: {
  party: Party;
  compact?: boolean;
}) {
  const { plan, scenario, groupById, tableById, tableByParty, commit } = usePlanCtx();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: party.id,
  });

  const group = groupById.get(party.groupId);
  const assignment = scenario.assignments[party.id];
  const placed = tableByParty.get(party.id);
  const placedTable = placed ? tableById.get(placed) : undefined;
  const locked = !!assignment?.locked;

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    borderColor: group ? `${group.color}66` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl border-2 bg-white px-2 py-1.5 shadow-sm ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        className="flex min-w-0 flex-1 cursor-grab items-center gap-2 text-left active:cursor-grabbing"
        aria-label={`Drag ${party.label}`}
      >
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: group?.color ?? "#ccc" }}
        />
        <span className="min-w-0 flex-1 truncate font-medium">{party.label}</span>
        <span className="shrink-0 rounded-full bg-blush/60 px-1.5 text-[11px] font-semibold tabular-nums text-rose">
          {party.size}
        </span>
      </button>

      {placed && (
        <span className="shrink-0 truncate rounded-full bg-mint/30 px-1.5 text-[11px] font-semibold text-emerald-800">
          {placedTable?.isSweetheart ? "💕" : placedTable?.label ?? "seated"}
        </span>
      )}

      {placed && (
        <button
          type="button"
          onClick={() => commit(toggleLock(plan, party.id))}
          title={locked ? "Unlock seat" : "Lock seat"}
          className="shrink-0 text-sm transition hover:scale-110"
        >
          {locked ? "🔒" : "🔓"}
        </button>
      )}
      {placed && (
        <button
          type="button"
          onClick={() => {
            if (locked) return;
            commit(unassignParty(plan, party.id));
          }}
          title={locked ? "Unlock first" : "Send back to tray"}
          disabled={locked}
          className="shrink-0 text-rose transition hover:scale-110 disabled:opacity-30"
        >
          ✕
        </button>
      )}
    </div>
  );
}

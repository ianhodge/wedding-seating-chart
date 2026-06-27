"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Table } from "@/lib/types";
import { usePlanCtx } from "./PlanContext";

function nodeSize(table: Table): { w: number; h: number; radius: string } {
  if (table.isSweetheart) return { w: 58, h: 48, radius: "9999px" };
  if (table.shape === "long")
    return { w: table.capacity >= 16 ? 124 : 100, h: 46, radius: "14px" };
  return table.capacity >= 12
    ? { w: 78, h: 78, radius: "9999px" }
    : { w: 62, h: 62, radius: "9999px" };
}

export default function TableNode({
  table,
  selected,
  onSelect,
}: {
  table: Table;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { plan, scenario, groupById, occupancy } = usePlanCtx();
  const { setNodeRef, isOver } = useDroppable({ id: table.id });

  const used = occupancy[table.id] || 0;
  const full = used >= table.capacity;
  const over = used > table.capacity;
  const { w, h, radius } = nodeSize(table);

  const partiesHere = plan.parties.filter(
    (p) => scenario.assignments[p.id]?.tableId === table.id,
  );
  const colors = [
    ...new Set(
      partiesHere
        .map((p) => groupById.get(p.groupId)?.color)
        .filter((c): c is string => Boolean(c)),
    ),
  ].slice(0, 6);
  const reservedGroup = table.reservedForGroupId
    ? groupById.get(table.reservedForGroupId)
    : null;

  const bg = table.isSweetheart
    ? "var(--rose)"
    : over
      ? "#ffdede"
      : full
        ? "var(--blush)"
        : "#ffffff";

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onSelect(table.id)}
      className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${table.x}%`, top: `${table.y}%` }}
      aria-label={`${table.label}, ${used} of ${table.capacity} seats`}
    >
      <div
        className={`relative flex flex-col items-center justify-center border-2 shadow-sm transition ${
          isOver
            ? "scale-110 border-plum ring-4 ring-plum/30"
            : selected
              ? "border-plum"
              : over
                ? "border-red-400"
                : "border-rose/40"
        }`}
        style={{ width: w, height: h, borderRadius: radius, background: bg }}
      >
        {reservedGroup && (
          <span
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full border border-white"
            style={{ backgroundColor: reservedGroup.color }}
            title={`Reserved for ${reservedGroup.name}`}
          />
        )}
        <span
          className={`text-[10px] font-bold leading-none ${
            table.isSweetheart ? "text-white" : "text-foreground"
          }`}
        >
          {table.isSweetheart ? "💕" : table.label.replace("Table ", "T")}
        </span>
        <span
          className={`text-[10px] tabular-nums leading-tight ${
            table.isSweetheart ? "text-white/90" : "opacity-70"
          }`}
        >
          {used}/{table.capacity}
        </span>
        {colors.length > 0 && (
          <span className="mt-0.5 flex max-w-[90%] flex-wrap justify-center gap-0.5">
            {colors.map((c) => (
              <span
                key={c}
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: c }}
              />
            ))}
          </span>
        )}
      </div>

      {/* Hover preview of occupants */}
      {partiesHere.length > 0 && (
        <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-44 -translate-x-1/2 rounded-lg border border-rose/30 bg-white p-2 text-left text-[11px] shadow-lg group-hover:block">
          <p className="mb-1 font-semibold text-rose">{table.label}</p>
          <ul className="space-y-0.5">
            {partiesHere.map((p) => (
              <li key={p.id} className="truncate">
                {p.label}{" "}
                <span className="opacity-60">({p.size})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </button>
  );
}

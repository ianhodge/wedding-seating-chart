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

function Chip({ name, color }: { name: string; color: string }) {
  return (
    <span className="flex items-center gap-[2px]">
      <span
        className="inline-block h-[5px] w-[5px] shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
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
  const reservedGroup = table.reservedForGroupId
    ? groupById.get(table.reservedForGroupId)
    : null;

  // Seated guests (first names, in party order) shown around the table.
  const seatPeople = partiesHere.flatMap((p) => {
    const color = groupById.get(p.groupId)?.color ?? "#e6549b";
    return plan.guests
      .filter((g) => g.partyId === p.id && g.attending)
      .map((g) => ({ id: g.id, name: g.firstName, color }));
  });
  const isLong = table.shape === "long";

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
      className={`group absolute -translate-x-1/2 -translate-y-1/2 ${
        selected || isOver ? "z-30" : ""
      }`}
      style={{ left: `${table.x}%`, top: `${table.y}%` }}
      aria-label={`${table.label}, ${used} of ${table.capacity} seats`}
    >
      {/* Names around the table (a ring for round tables) */}
      {seatPeople.length > 0 && !isLong && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-30"
          style={{ width: 0, height: 0 }}
        >
          {seatPeople.map((s, i) => {
            const m = seatPeople.length;
            const ang = ((-90 + (i * 360) / m) * Math.PI) / 180;
            const r = w / 2 + 11;
            const x = Math.cos(ang) * r;
            const y = Math.sin(ang) * r;
            return (
              <span
                key={s.id}
                className="absolute whitespace-nowrap text-[8px] font-medium leading-none text-foreground/90"
                style={{
                  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
                }}
              >
                <Chip name={s.name} color={s.color} />
              </span>
            );
          })}
        </div>
      )}
      {/* Names in two facing rows for long tables */}
      {seatPeople.length > 0 && isLong && (
        <>
          <div
            className="pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 gap-1 whitespace-nowrap text-[8px] font-medium leading-none text-foreground/90"
            style={{ bottom: "calc(100% + 2px)" }}
          >
            {seatPeople
              .filter((_, i) => i % 2 === 0)
              .map((s) => (
                <Chip key={s.id} name={s.name} color={s.color} />
              ))}
          </div>
          <div
            className="pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 gap-1 whitespace-nowrap text-[8px] font-medium leading-none text-foreground/90"
            style={{ top: "calc(100% + 2px)" }}
          >
            {seatPeople
              .filter((_, i) => i % 2 === 1)
              .map((s) => (
                <Chip key={s.id} name={s.name} color={s.color} />
              ))}
          </div>
        </>
      )}

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
      </div>
    </button>
  );
}

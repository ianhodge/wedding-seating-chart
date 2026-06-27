"use client";

import { useState } from "react";
import type { VenueFeature } from "@/lib/types";
import { usePlanCtx } from "./PlanContext";
import TableNode from "./TableNode";
import PartyCard from "./PartyCard";
import SeatMap, { type SeatPerson } from "./SeatMap";

const FEATURE_STYLE: Record<
  VenueFeature["kind"],
  { bg: string; icon: string }
> = {
  band: { bg: "rgba(108,92,231,0.18)", icon: "🎸" },
  danceFloor: { bg: "rgba(244,178,59,0.20)", icon: "🪩" },
  bar: { bg: "rgba(0,184,148,0.18)", icon: "🍸" },
  restrooms: { bg: "rgba(116,185,255,0.20)", icon: "🚻" },
  other: { bg: "rgba(0,0,0,0.06)", icon: "✨" },
};

export default function FloorPlan() {
  const { plan } = usePlanCtx();
  const [selected, setSelected] = useState<string | null>(null);

  const tables = plan.tables;
  const features = plan.features;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold">🗺️ Floor plan</h2>
        <span className="text-xs italic opacity-60">
          Tap a table to see who&apos;s seated there
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl border-2 border-rose/20 bg-white/70 p-4 shadow-inner">
        <div
          className="relative mx-auto aspect-[1/1] w-full min-w-[1400px]"
          style={{
            background:
              "repeating-linear-gradient(45deg, #fff 0 18px, #fff7fb 18px 36px)",
            borderRadius: 16,
          }}
        >
          {features.map((f) => {
            const s = FEATURE_STYLE[f.kind];
            return (
              <div
                key={f.id}
                className="absolute flex items-center justify-center rounded-xl border border-foreground/10 text-center text-[11px] font-semibold uppercase tracking-wide text-foreground/70"
                style={{
                  left: `${f.x}%`,
                  top: `${f.y}%`,
                  width: `${f.w}%`,
                  height: `${f.h}%`,
                  background: s.bg,
                }}
              >
                <span>
                  {s.icon} {f.label}
                </span>
              </div>
            );
          })}

          {tables.map((t) => (
            <TableNode
              key={t.id}
              table={t}
              selected={selected === t.id}
              onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
            />
          ))}
        </div>
      </div>

      {selected && (
        <TableDetails tableId={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function TableDetails({
  tableId,
  onClose,
}: {
  tableId: string;
  onClose: () => void;
}) {
  const { plan, scenario, groupById, occupancy } = usePlanCtx();
  const table = plan.tables.find((t) => t.id === tableId);
  if (!table) return null;

  const partiesHere = plan.parties.filter(
    (p) => scenario.assignments[p.id]?.tableId === table.id,
  );
  const used = occupancy[table.id] || 0;

  const people: SeatPerson[] = partiesHere.flatMap((p) => {
    const color = groupById.get(p.groupId)?.color ?? "#e6549b";
    return plan.guests
      .filter((g) => g.partyId === p.id && g.attending)
      .map((g) => ({
        id: g.id,
        name: g.firstName + (g.lastName ? ` ${g.lastName[0]}.` : ""),
        color,
      }));
  });

  return (
    <section className="rounded-2xl border-2 border-plum/30 bg-white/80 p-4 shadow-md">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl font-semibold">
          {table.isSweetheart ? "💕 Sweetheart table" : table.label}{" "}
          <span className="text-sm font-normal opacity-60">
            ({used}/{table.capacity} seated · {table.shape})
          </span>
        </h3>
        <button
          onClick={onClose}
          className="rounded-full border border-rose/30 px-2 py-0.5 text-xs text-rose hover:bg-blush/40"
        >
          Close
        </button>
      </div>

      {partiesHere.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-rose/15 bg-white/60 p-3">
          <SeatMap table={table} people={people} />
        </div>
      )}

      <div className="mt-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
          Parties (drag to move or unseat)
        </p>
        {partiesHere.length === 0 ? (
          <p className="text-sm italic opacity-60">
            No one seated yet — drag a party here! 💃🕺
          </p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {partiesHere.map((p) => (
              <PartyCard key={p.id} party={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

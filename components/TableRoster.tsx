"use client";

import { usePlanCtx } from "./PlanContext";

function tableNum(id: string): number {
  const n = parseInt(id.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 999;
}

/** A readable, always-visible roster of every table and who's seated there. */
export default function TableRoster() {
  const { plan, scenario, groupById, occupancy } = usePlanCtx();

  const tables = [...plan.tables].sort((a, b) => {
    if (a.isSweetheart) return -1;
    if (b.isSweetheart) return 1;
    return tableNum(a.id) - tableNum(b.id);
  });

  return (
    <section className="rounded-2xl border-2 border-rose/20 bg-white/70 p-3">
      <h2 className="px-1 font-serif text-xl font-semibold">
        🪑 Who&apos;s sitting where
      </h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {tables.map((t) => {
          const parties = plan.parties.filter(
            (p) => scenario.assignments[p.id]?.tableId === t.id,
          );
          const used = occupancy[t.id] || 0;
          const reserved = t.reservedForGroupId
            ? groupById.get(t.reservedForGroupId)
            : null;
          return (
            <div
              key={t.id}
              className="rounded-xl border border-rose/20 bg-white p-2"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">
                  {t.isSweetheart ? "💕 Sweetheart" : t.label}
                </span>
                <span className="text-xs tabular-nums opacity-60">
                  {used}/{t.capacity}
                </span>
              </div>
              {reserved && (
                <p className="text-[11px] italic text-amber-800">
                  Reserved for {reserved.name}
                </p>
              )}
              {parties.length === 0 ? (
                <p className="mt-1 text-xs italic opacity-50">— empty —</p>
              ) : (
                <ul className="mt-1 space-y-0.5">
                  {parties.map((p) => (
                    <li key={p.id} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: groupById.get(p.groupId)?.color,
                        }}
                      />
                      <span className="truncate">{p.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

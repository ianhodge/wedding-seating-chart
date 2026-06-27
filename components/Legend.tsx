"use client";

import { usePlanCtx } from "./PlanContext";

export default function Legend() {
  const { plan } = usePlanCtx();
  const groups = [...plan.groups].sort((a, b) => a.order - b.order);
  return (
    <section className="rounded-2xl border-2 border-rose/20 bg-white/70 p-3">
      <h2 className="px-1 font-serif text-lg font-semibold">🎨 Color legend</h2>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
        {groups.map((g) => (
          <li key={g.id} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: g.color }}
            />
            <span className="truncate">{g.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

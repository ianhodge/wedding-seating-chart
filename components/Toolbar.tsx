"use client";

import { useState } from "react";
import { usePlanCtx } from "./PlanContext";
import { applyAssignments } from "@/lib/plan/ops";
import { autoFill } from "@/lib/seating";

function loveLabel(pct: number): string {
  if (pct >= 100) return "Everyone's seated — let's party! 🎉";
  if (pct >= 75) return "Love is in the air 💞";
  if (pct >= 40) return "Sparks are flying ✨";
  if (pct > 0) return "Warming up the room 🔥";
  return "Let's find everyone a seat 💐";
}

export default function Toolbar() {
  const { plan, scenario, commit, toast } = usePlanCtx();
  const [busy, setBusy] = useState(false);

  const total = plan.parties.reduce((s, p) => s + p.size, 0);
  const assigned = new Set(Object.keys(scenario.assignments));
  const seated = plan.parties
    .filter((p) => assigned.has(p.id))
    .reduce((s, p) => s + p.size, 0);
  const pct = total ? Math.round((seated / total) * 100) : 0;

  async function onAutoFill() {
    setBusy(true);
    try {
      const res = autoFill(plan, scenario.id);
      await commit(applyAssignments(plan, res.assignments, scenario.id));
      const confetti = (await import("canvas-confetti")).default;
      confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 } });
      if (res.warnings.length) toast(res.warnings[0], "warn");
      else toast("Auto-fill complete — looking gorgeous! 💐", "love");
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setBusy(true);
    try {
      const kept = Object.fromEntries(
        Object.entries(scenario.assignments).filter(([, a]) => a.locked),
      );
      await commit(applyAssignments(plan, kept, scenario.id));
      toast("Reset! Locked seats stayed put 🔒", "info");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-rose/30 bg-white/80 p-4 shadow-md backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>💗 Love-o-meter</span>
          <span className="tabular-nums">
            {seated}/{total} seated ({pct}%)
          </span>
        </div>
        <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-blush">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose to-gold transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs italic opacity-70">{loveLabel(pct)}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          disabled={busy}
          onClick={onAutoFill}
          className="rounded-full bg-plum px-4 py-2 text-sm font-bold text-white shadow transition hover:brightness-110 disabled:opacity-50"
        >
          ✨ Auto-fill
        </button>
        <button
          disabled={busy}
          onClick={onReset}
          className="rounded-full border-2 border-rose/40 px-4 py-2 text-sm font-bold text-rose transition hover:bg-blush/40 disabled:opacity-50"
        >
          ♻️ Reset
        </button>
      </div>
    </div>
  );
}

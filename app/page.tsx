"use client";

// Foundation view: proves data + engine + persistence end-to-end.
// The UI workstream replaces this with the drag-and-drop floor plan.

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePlan } from "@/lib/client/usePlan";
import { getActiveScenario, applyAssignments, tableOccupancy } from "@/lib/plan/ops";
import { autoFill } from "@/lib/seating";
import type { PlanDoc } from "@/lib/types";

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
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Read the plan id from the URL on mount (client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlanId(ensurePlanId());
  }, []);

  const { plan, isLoading, save } = usePlan(planId);

  const stats = useMemo(() => {
    if (!plan) return null;
    const scenario = getActiveScenario(plan);
    const totalPeople = plan.parties.reduce((s, p) => s + p.size, 0);
    const assigned = new Set(Object.keys(scenario.assignments));
    const seated = plan.parties
      .filter((p) => assigned.has(p.id))
      .reduce((s, p) => s + p.size, 0);
    return {
      scenario,
      totalPeople,
      seated,
      occ: tableOccupancy(plan, scenario.id),
      pct: totalPeople ? Math.round((seated / totalPeople) * 100) : 0,
    };
  }, [plan]);

  const onAutoFill = useCallback(async () => {
    if (!plan || !stats) return;
    setBusy(true);
    try {
      const res = autoFill(plan, stats.scenario.id);
      await save(applyAssignments(plan, res.assignments, stats.scenario.id));
      const confetti = (await import("canvas-confetti")).default;
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    } finally {
      setBusy(false);
    }
  }, [plan, stats, save]);

  const onReset = useCallback(async () => {
    if (!plan || !stats) return;
    setBusy(true);
    try {
      const kept = Object.fromEntries(
        Object.entries(stats.scenario.assignments).filter(([, a]) => a.locked),
      );
      await save(applyAssignments(plan, kept, stats.scenario.id));
    } finally {
      setBusy(false);
    }
  }, [plan, stats, save]);

  const onShare = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  return (
    <main className="flex-1">
      <Header onShare={onShare} copied={copied} />
      {isLoading || !plan || !stats ? (
        <p className="p-10 text-center font-serif text-xl">Loading the love… 💌</p>
      ) : (
        <div className="mx-auto w-full max-w-6xl px-4 pb-16">
          <Toolbar
            pct={stats.pct}
            seated={stats.seated}
            total={stats.totalPeople}
            busy={busy}
            onAutoFill={onAutoFill}
            onReset={onReset}
          />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <GroupsPanel plan={plan} />
            <TablesPanel plan={plan} occ={stats.occ} />
          </div>
          <p className="mt-8 text-center text-sm opacity-60">
            ✨ Foundation view — the drag-and-drop floor plan is on its way ✨
          </p>
        </div>
      )}
    </main>
  );
}

function Header({ onShare, copied }: { onShare: () => void; copied: boolean }) {
  return (
    <header className="border-b-4 border-rose/40 bg-white/60 px-4 py-8 text-center backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3">
        <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-rose shadow-lg sm:h-32 sm:w-32">
          <Image
            src="/matt-and-ian.jpg"
            alt="Matt & Ian"
            fill
            sizes="128px"
            className="object-cover"
            priority
          />
        </div>
        <h1 className="font-script text-4xl text-rose drop-shadow-sm sm:text-6xl">
          Matt &amp; Ian
        </h1>
        <p className="font-serif text-lg italic opacity-80">
          💍 The Totally Over-the-Top Seating Extravaganza 💍
        </p>
        <button
          onClick={onShare}
          className="mt-1 rounded-full bg-rose px-4 py-1.5 text-sm font-semibold text-white shadow transition hover:brightness-110"
        >
          {copied ? "Link copied! 💌" : "🔗 Share with the wedding crew"}
        </button>
      </div>
    </header>
  );
}

function Toolbar({
  pct,
  seated,
  total,
  busy,
  onAutoFill,
  onReset,
}: {
  pct: number;
  seated: number;
  total: number;
  busy: boolean;
  onAutoFill: () => void;
  onReset: () => void;
}) {
  return (
    <div className="sticky top-2 z-10 flex flex-col gap-3 rounded-2xl border-2 border-rose/30 bg-white/80 p-4 shadow-md backdrop-blur sm:flex-row sm:items-center sm:justify-between">
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

function GroupsPanel({ plan }: { plan: PlanDoc }) {
  const scenario = getActiveScenario(plan);
  const assigned = new Set(Object.keys(scenario.assignments));
  const groups = [...plan.groups].sort((a, b) => a.order - b.order);
  return (
    <section className="rounded-2xl border-2 border-rose/20 bg-white/70 p-4">
      <h2 className="font-serif text-2xl font-semibold">Groups</h2>
      <ul className="mt-3 space-y-1.5">
        {groups.map((g) => {
          const parties = plan.parties.filter((p) => p.groupId === g.id);
          const people = parties.reduce((s, p) => s + p.size, 0);
          const seated = parties
            .filter((p) => assigned.has(p.id))
            .reduce((s, p) => s + p.size, 0);
          return (
            <li
              key={g.id}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-blush/30"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: g.color }}
              />
              <span className="flex-1 truncate font-medium">
                {g.name}
                {g.isCouple && " 💑"}
                {g.isPlaceholder && (
                  <span className="ml-2 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs text-amber-800">
                    in-law pick
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm tabular-nums opacity-70">
                {seated}/{people}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TablesPanel({
  plan,
  occ,
}: {
  plan: PlanDoc;
  occ: Record<string, number>;
}) {
  const tables = [...plan.tables].sort((a, b) => {
    if (a.isSweetheart) return -1;
    if (b.isSweetheart) return 1;
    const an = parseInt(a.id.replace(/\D/g, ""), 10) || 0;
    const bn = parseInt(b.id.replace(/\D/g, ""), 10) || 0;
    return an - bn;
  });
  const groupById = new Map(plan.groups.map((g) => [g.id, g]));
  return (
    <section className="rounded-2xl border-2 border-rose/20 bg-white/70 p-4">
      <h2 className="font-serif text-2xl font-semibold">Tables</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tables.map((t) => {
          const used = occ[t.id] || 0;
          const full = used >= t.capacity;
          const reserved = t.reservedForGroupId
            ? groupById.get(t.reservedForGroupId)
            : null;
          return (
            <li
              key={t.id}
              className={`rounded-xl border p-2 text-sm ${
                full ? "border-rose bg-blush/40" : "border-rose/20 bg-white"
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span>{t.isSweetheart ? "💕 Sweetheart" : t.label}</span>
                <span className="tabular-nums opacity-70">
                  {used}/{t.capacity}
                </span>
              </div>
              {reserved && (
                <div className="mt-1 truncate text-xs opacity-70">
                  Reserved: {reserved.name}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";
import { usePlanCtx } from "./PlanContext";
import { addScenario, applyAssignments } from "@/lib/plan/ops";
import {
  consolidateScenarios,
  diffScenarios,
  type DiffStatus,
  type MergeChoice,
} from "@/lib/plan/diff";

const STATUS_LABEL: Record<DiffStatus, string> = {
  same: "Agreed 💞",
  moved: "Different seats 🔀",
  onlyA: "Only in A",
  onlyB: "Only in B",
};

const STATUS_CLASS: Record<DiffStatus, string> = {
  same: "bg-mint/30 text-emerald-800",
  moved: "bg-gold/30 text-amber-900",
  onlyA: "bg-blush/60 text-rose",
  onlyB: "bg-plum/20 text-plum",
};

function defaultChoice(status: DiffStatus): MergeChoice {
  return status === "onlyB" ? "b" : "a";
}

export default function CompareDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { plan, commit, toast } = usePlanCtx();
  const scenarios = plan.scenarios;
  const [aId, setAId] = useState(
    () => scenarios.find((s) => s.id === "matt-draft")?.id ?? scenarios[0]?.id ?? "",
  );
  const [bId, setBId] = useState(
    () =>
      scenarios.find((s) => s.id === "ian-draft")?.id ??
      scenarios[1]?.id ??
      scenarios[0]?.id ??
      "",
  );
  const [overrides, setOverrides] = useState<Record<string, MergeChoice>>({});

  const partyById = useMemo(
    () => new Map(plan.parties.map((p) => [p.id, p])),
    [plan.parties],
  );
  const tableById = useMemo(
    () => new Map(plan.tables.map((t) => [t.id, t])),
    [plan.tables],
  );
  const diff = useMemo(
    () => diffScenarios(plan, aId, bId),
    [plan, aId, bId],
  );

  const tableLabel = (id: string | null) =>
    id ? tableById.get(id)?.label ?? id : "—";
  const effective = (pid: string, status: DiffStatus): MergeChoice =>
    overrides[pid] ?? defaultChoice(status);

  function consolidate() {
    const choices: Record<string, MergeChoice> = {};
    for (const d of diff.parties) choices[d.partyId] = effective(d.partyId, d.status);
    const assignments = consolidateScenarios(plan, aId, bId, choices, "a");
    const named = addScenario(plan, "Consolidated 💍");
    commit(applyAssignments(named, assignments, named.activeScenarioId));
    toast("Created the Consolidated draft 💍", "love");
    onClose();
  }

  const aName = scenarios.find((s) => s.id === aId)?.name ?? "A";
  const bName = scenarios.find((s) => s.id === bId)?.name ?? "B";

  return (
    <Modal open={open} onClose={onClose} title="⚖️ Compare & merge drafts" wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1.5">
            <span className="font-semibold text-rose">A:</span>
            <select
              value={aId}
              onChange={(e) => setAId(e.target.value)}
              className="rounded-full border-2 border-rose/30 bg-white px-3 py-1"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <span className="opacity-50">vs</span>
          <label className="flex items-center gap-1.5">
            <span className="font-semibold text-plum">B:</span>
            <select
              value={bId}
              onChange={(e) => setBId(e.target.value)}
              className="rounded-full border-2 border-plum/30 bg-white px-3 py-1"
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {(Object.keys(diff.counts) as DiffStatus[]).map((k) => (
            <span key={k} className={`rounded-full px-2 py-0.5 ${STATUS_CLASS[k]}`}>
              {STATUS_LABEL[k]}: {diff.counts[k]}
            </span>
          ))}
        </div>

        {aId === bId ? (
          <p className="text-sm italic opacity-70">
            Pick two different drafts to compare. 💕
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-rose/20">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-blush/40 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-2 py-1">Party</th>
                  <th className="px-2 py-1 text-rose">{aName}</th>
                  <th className="px-2 py-1 text-plum">{bName}</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1 text-center">Keep</th>
                </tr>
              </thead>
              <tbody>
                {diff.parties.map((d) => {
                  const choice = effective(d.partyId, d.status);
                  return (
                    <tr key={d.partyId} className="border-t border-rose/10">
                      <td className="px-2 py-1">
                        {partyById.get(d.partyId)?.label ?? d.partyId}
                      </td>
                      <td className="px-2 py-1">{tableLabel(d.tableA)}</td>
                      <td className="px-2 py-1">{tableLabel(d.tableB)}</td>
                      <td className="px-2 py-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASS[d.status]}`}
                        >
                          {STATUS_LABEL[d.status]}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex justify-center gap-1">
                          {(["a", "b"] as MergeChoice[]).map((c) => (
                            <button
                              key={c}
                              onClick={() =>
                                setOverrides((o) => ({ ...o, [d.partyId]: c }))
                              }
                              className={`rounded-full px-2 py-0.5 text-xs font-bold transition ${
                                choice === c
                                  ? c === "a"
                                    ? "bg-rose text-white"
                                    : "bg-plum text-white"
                                  : "border border-foreground/20 opacity-70"
                              }`}
                            >
                              {c.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {diff.parties.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-4 text-center italic opacity-60">
                      Nothing seated in either draft yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end">
          <button
            disabled={aId === bId}
            onClick={consolidate}
            className="rounded-full bg-rose px-5 py-2 text-sm font-bold text-white shadow transition hover:brightness-110 disabled:opacity-40"
          >
            💍 Create Consolidated draft
          </button>
        </div>
      </div>
    </Modal>
  );
}

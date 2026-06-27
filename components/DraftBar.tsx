"use client";

import { usePlanCtx } from "./PlanContext";
import {
  addScenario,
  deleteScenario,
  duplicateScenario,
  renameScenario,
  setActiveScenario,
} from "@/lib/plan/ops";

export default function DraftBar({
  onCompare,
  onOpenGuests,
}: {
  onCompare: () => void;
  onOpenGuests: () => void;
}) {
  const { plan, scenario, commit, toast } = usePlanCtx();
  const drafts = plan.scenarios;

  function onNew() {
    const name = window.prompt("Name your new draft", "Fresh Idea");
    if (!name) return;
    commit(addScenario(plan, name.trim()));
    toast(`Created “${name.trim()}” 📝`, "love");
  }

  function onDuplicate() {
    commit(duplicateScenario(plan, scenario.id));
    toast("Draft duplicated 👯", "info");
  }

  function onRename() {
    const name = window.prompt("Rename this draft", scenario.name);
    if (!name) return;
    commit(renameScenario(plan, scenario.id, name.trim()));
  }

  function onDelete() {
    if (drafts.length <= 1) {
      toast("You need at least one draft 💌", "warn");
      return;
    }
    if (!window.confirm(`Delete “${scenario.name}”? This can't be undone.`)) return;
    commit(deleteScenario(plan, scenario.id));
    toast("Draft deleted 🗑️", "info");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-rose/30 bg-white/80 p-3 shadow-sm">
      <span className="font-serif text-lg font-semibold">📋 Drafts</span>
      <div className="flex flex-wrap gap-1.5">
        {drafts.map((d) => (
          <button
            key={d.id}
            onClick={() => commit(setActiveScenario(plan, d.id))}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
              d.id === scenario.id
                ? "bg-rose text-white shadow"
                : "border-2 border-rose/30 text-rose hover:bg-blush/40"
            }`}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="ml-auto flex flex-wrap gap-1.5 text-sm">
        <button
          onClick={onNew}
          className="rounded-full border-2 border-rose/30 px-3 py-1 font-semibold text-rose hover:bg-blush/40"
        >
          ➕ New
        </button>
        <button
          onClick={onDuplicate}
          className="rounded-full border-2 border-rose/30 px-3 py-1 font-semibold text-rose hover:bg-blush/40"
        >
          👯 Duplicate
        </button>
        <button
          onClick={onRename}
          className="rounded-full border-2 border-rose/30 px-3 py-1 font-semibold text-rose hover:bg-blush/40"
        >
          ✏️ Rename
        </button>
        <button
          onClick={onDelete}
          className="rounded-full border-2 border-rose/30 px-3 py-1 font-semibold text-rose hover:bg-blush/40"
        >
          🗑️ Delete
        </button>
        <button
          onClick={onOpenGuests}
          className="rounded-full border-2 border-plum/40 px-3 py-1 font-semibold text-plum hover:bg-plum/10"
        >
          👥 Guest list
        </button>
        <button
          onClick={onCompare}
          className="rounded-full bg-plum px-3 py-1 font-bold text-white shadow hover:brightness-110"
        >
          ⚖️ Compare & merge
        </button>
      </div>
    </div>
  );
}

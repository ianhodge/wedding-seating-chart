"use client";

import { useState } from "react";
import Modal from "./Modal";
import { usePlanCtx } from "./PlanContext";
import {
  addSubgroup,
  deleteSubgroup,
  renameSubgroup,
  setPartySubgroup,
  splitGroupEvenly,
} from "@/lib/plan/ops";

export default function SubgroupDialog({
  groupId,
  onClose,
}: {
  groupId: string | null;
  onClose: () => void;
}) {
  const { plan, commit, toast, groupById } = usePlanCtx();
  const [newName, setNewName] = useState("");

  const group = groupId ? groupById.get(groupId) : undefined;
  const open = !!group;

  const subgroups = group
    ? plan.subgroups
        .filter((s) => s.groupId === group.id)
        .sort((a, b) => a.order - b.order)
    : [];
  const parties = group
    ? plan.parties.filter((p) => p.groupId === group.id)
    : [];

  function add() {
    if (!group || !newName.trim()) return;
    commit(addSubgroup(plan, group.id, newName.trim()));
    setNewName("");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={group ? `✂️ Subgroups · ${group.name}` : ""}
    >
      {group && (
        <div className="space-y-4">
          <p className="text-sm opacity-70">
            Split a big group into named sides so auto-fill can seat them across
            tables while keeping families together.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                commit(splitGroupEvenly(plan, group.id));
                toast("Split down the middle ⚖️", "love");
              }}
              className="rounded-full bg-plum px-3 py-1.5 text-sm font-bold text-white shadow hover:brightness-110"
            >
              ⚖️ Split evenly
            </button>
            <span className="text-xs italic opacity-60">
              Creates balanced “Side A”/“Side B” by headcount.
            </span>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Subgroups</h3>
            {subgroups.length === 0 ? (
              <p className="mt-1 text-sm italic opacity-60">No subgroups yet.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {subgroups.map((sg) => (
                  <li
                    key={sg.id}
                    className="flex items-center gap-2 rounded-lg border border-rose/20 px-2 py-1 text-sm"
                  >
                    <span className="flex-1 truncate font-medium">{sg.name}</span>
                    <span className="text-xs opacity-60">
                      {parties.filter((p) => p.subgroupId === sg.id).length} parties
                    </span>
                    <button
                      onClick={() => {
                        const name = window.prompt("Rename subgroup", sg.name);
                        if (name) commit(renameSubgroup(plan, sg.id, name.trim()));
                      }}
                      className="text-plum hover:scale-110"
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => commit(deleteSubgroup(plan, sg.id))}
                      className="text-rose hover:scale-110"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="New subgroup name"
                className="flex-1 rounded-full border-2 border-rose/30 px-3 py-1 text-sm"
              />
              <button
                onClick={add}
                className="rounded-full border-2 border-rose/30 px-3 py-1 text-sm font-semibold text-rose hover:bg-blush/40"
              >
                Add
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Assign parties</h3>
            <ul className="mt-1 max-h-64 space-y-1 overflow-y-auto pr-1">
              {parties.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{p.label}</span>
                  <select
                    value={p.subgroupId ?? ""}
                    onChange={(e) =>
                      commit(
                        setPartySubgroup(plan, p.id, e.target.value || null),
                      )
                    }
                    className="rounded-full border border-rose/30 bg-white px-2 py-0.5 text-xs"
                  >
                    <option value="">— none —</option>
                    {subgroups.map((sg) => (
                      <option key={sg.id} value={sg.id}>
                        {sg.name}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Modal>
  );
}

"use client";

import { useState } from "react";
import Modal from "./Modal";
import { usePlanCtx } from "./PlanContext";
import {
  addGuest,
  addParty,
  removeGuest,
  removeParty,
  renameGuest,
  renameParty,
  toggleGuestAttending,
} from "@/lib/plan/ops";

export default function GuestDialog({
  open,
  initialGroupId,
  onClose,
}: {
  open: boolean;
  initialGroupId: string | null;
  onClose: () => void;
}) {
  const { plan, commit, toast } = usePlanCtx();
  const groups = [...plan.groups].sort((a, b) => a.order - b.order);
  const [groupId, setGroupId] = useState<string>(
    initialGroupId ?? groups[0]?.id ?? "",
  );
  const [newParty, setNewParty] = useState("");

  const parties = plan.parties.filter((p) => p.groupId === groupId);

  function onAddParty() {
    const names = newParty
      .split(/[,&]/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    commit(addParty(plan, groupId, names));
    setNewParty("");
    toast("Party added 🎈", "love");
  }

  return (
    <Modal open={open} onClose={onClose} title="👥 Guest list" wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold">Group:</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="rounded-full border-2 border-rose/30 bg-white px-3 py-1 text-sm"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <span className="text-xs italic opacity-60">
            Mother-in-law approved ✨ add your side here.
          </span>
        </div>

        <div className="flex gap-2">
          <input
            value={newParty}
            onChange={(e) => setNewParty(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddParty()}
            placeholder="New party — names separated by & or ,"
            className="flex-1 rounded-full border-2 border-rose/30 px-3 py-1.5 text-sm"
          />
          <button
            onClick={onAddParty}
            className="rounded-full bg-rose px-4 py-1.5 text-sm font-bold text-white shadow hover:brightness-110"
          >
            ➕ Add party
          </button>
        </div>

        <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {parties.length === 0 && (
            <li className="text-sm italic opacity-60">No parties in this group yet.</li>
          )}
          {parties.map((p) => (
            <PartyRow key={p.id} partyId={p.id} />
          ))}
        </ul>
      </div>
    </Modal>
  );
}

function PartyRow({ partyId }: { partyId: string }) {
  const { plan, commit } = usePlanCtx();
  const party = plan.parties.find((p) => p.id === partyId);
  const guests = plan.guests.filter((g) => g.partyId === partyId);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  if (!party) return null;

  function addOne() {
    if (!first.trim()) return;
    commit(addGuest(plan, partyId, first, last));
    setFirst("");
    setLast("");
  }

  return (
    <li className="rounded-xl border border-rose/20 bg-white p-2">
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-sm font-semibold">{party.label}</span>
        <span className="rounded-full bg-blush/60 px-2 text-xs font-semibold tabular-nums text-rose">
          {party.size} seated-size
        </span>
        <button
          onClick={() => {
            const label = window.prompt("Rename party", party.label);
            if (label) commit(renameParty(plan, partyId, label.trim()));
          }}
          className="text-plum hover:scale-110"
          title="Rename party"
        >
          ✏️
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Remove “${party.label}” and its guests?`))
              commit(removeParty(plan, partyId));
          }}
          className="text-rose hover:scale-110"
          title="Remove party"
        >
          🗑️
        </button>
      </div>

      <ul className="mt-2 space-y-1">
        {guests.map((g) => (
          <li key={g.id} className="flex items-center gap-2 text-sm">
            <label className="flex flex-1 items-center gap-2">
              <input
                type="checkbox"
                checked={g.attending}
                onChange={() => commit(toggleGuestAttending(plan, g.id))}
                className="accent-rose"
              />
              <span className={g.attending ? "" : "line-through opacity-50"}>
                {g.firstName} {g.lastName}
              </span>
            </label>
            <button
              onClick={() => {
                const name = window.prompt(
                  "Edit name (First Last)",
                  `${g.firstName} ${g.lastName}`.trim(),
                );
                if (name) {
                  const i = name.indexOf(" ");
                  const fn = i === -1 ? name : name.slice(0, i);
                  const ln = i === -1 ? "" : name.slice(i + 1);
                  commit(renameGuest(plan, g.id, fn.trim(), ln.trim()));
                }
              }}
              className="text-plum hover:scale-110"
              title="Rename guest"
            >
              ✏️
            </button>
            <button
              onClick={() => commit(removeGuest(plan, g.id))}
              className="text-rose hover:scale-110"
              title="Remove guest"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex gap-1.5">
        <input
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder="First"
          className="w-24 rounded-full border border-rose/30 px-2 py-0.5 text-xs"
        />
        <input
          value={last}
          onChange={(e) => setLast(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addOne()}
          placeholder="Last"
          className="w-24 rounded-full border border-rose/30 px-2 py-0.5 text-xs"
        />
        <button
          onClick={addOne}
          className="rounded-full border border-rose/30 px-2 py-0.5 text-xs font-semibold text-rose hover:bg-blush/40"
        >
          + guest
        </button>
      </div>
    </li>
  );
}

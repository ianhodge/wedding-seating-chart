"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Group, GroupId, PartyId, PlanDoc, Scenario, Table } from "@/lib/types";
import { getActiveScenario, tableOccupancy } from "@/lib/plan/ops";

export interface Toast {
  id: number;
  message: string;
  tone: "info" | "warn" | "love";
}

interface PlanContextValue {
  plan: PlanDoc;
  scenario: Scenario;
  /** group id -> Group */
  groupById: Map<GroupId, Group>;
  /** table id -> Table */
  tableById: Map<string, Table>;
  /** party id -> table id (active scenario) */
  tableByParty: Map<PartyId, string>;
  /** seats used per table (active scenario) */
  occupancy: Record<string, number>;
  /** Persist a new PlanDoc (optimistic). */
  commit: (next: PlanDoc) => Promise<void>;
  toast: (message: string, tone?: Toast["tone"]) => void;
  toasts: Toast[];
}

const Ctx = createContext<PlanContextValue | null>(null);

export function PlanProvider({
  plan,
  save,
  children,
}: {
  plan: PlanDoc;
  save: (next: PlanDoc) => Promise<PlanDoc>;
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const commit = useCallback(
    async (next: PlanDoc) => {
      await save(next);
    },
    [save],
  );

  const value = useMemo<PlanContextValue>(() => {
    const scenario = getActiveScenario(plan);
    const groupById = new Map(plan.groups.map((g) => [g.id, g]));
    const tableById = new Map(plan.tables.map((t) => [t.id, t]));
    const tableByParty = new Map<PartyId, string>();
    for (const [pid, a] of Object.entries(scenario.assignments)) {
      tableByParty.set(pid, a.tableId);
    }
    return {
      plan,
      scenario,
      groupById,
      tableById,
      tableByParty,
      occupancy: tableOccupancy(plan, scenario.id),
      commit,
      toast,
      toasts,
    };
  }, [plan, commit, toast, toasts]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlanCtx(): PlanContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlanCtx must be used within a PlanProvider");
  return ctx;
}

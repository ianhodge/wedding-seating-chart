"use client";

import useSWR from "swr";
import { PlanDoc } from "@/lib/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json() as Promise<PlanDoc>;
  });

/**
 * Loads a plan by id and provides an optimistic `save`. Polls every few seconds
 * so collaborators (e.g. the mother-in-law) see each other's edits. On a version
 * conflict the server's current doc is adopted and returned so callers can
 * re-apply their change against fresh state.
 */
export function usePlan(planId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PlanDoc>(
    planId ? `/api/plan/${planId}` : null,
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: true, dedupingInterval: 1000 },
  );

  async function save(next: PlanDoc): Promise<PlanDoc> {
    mutate(next, false); // optimistic
    let res: Response;
    try {
      res = await fetch(`/api/plan/${next.planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch (err) {
      // Network failure: re-fetch authoritative state and surface the error.
      await mutate();
      throw err;
    }
    if (res.status === 409) {
      const { current } = (await res.json()) as { current: PlanDoc };
      mutate(current, false); // adopt server's version for 409 reconciliation
      return current;
    }
    if (!res.ok) {
      await mutate();
      throw new Error(`Save failed: ${res.status}`);
    }
    const saved = (await res.json()) as PlanDoc;
    mutate(saved, false);
    return saved;
  }

  return { plan: data, error, isLoading, mutate, save };
}

/**
 * Returns a function that creates a brand-new plan and resolves to its
 * unguessable id (for building a shareable `?plan=<id>` link).
 */
export function useCreatePlan() {
  return async function createPlan(): Promise<string> {
    const res = await fetch("/api/plan", { method: "POST" });
    if (!res.ok) {
      throw new Error(`Failed to create plan: ${res.status}`);
    }
    const { planId } = (await res.json()) as { planId: string };
    return planId;
  };
}

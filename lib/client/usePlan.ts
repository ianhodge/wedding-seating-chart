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
 * so collaborators see each other's edits. On a version conflict the server's
 * current doc is adopted.
 */
export function usePlan(planId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PlanDoc>(
    planId ? `/api/plan/${planId}` : null,
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: true, dedupingInterval: 1000 },
  );

  async function save(next: PlanDoc): Promise<PlanDoc> {
    mutate(next, false); // optimistic
    const res = await fetch(`/api/plan/${next.planId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (res.status === 409) {
      const { current } = (await res.json()) as { current: PlanDoc };
      mutate(current, false);
      return current;
    }
    const saved = (await res.json()) as PlanDoc;
    mutate(saved, false);
    return saved;
  }

  return { plan: data, error, isLoading, mutate, save };
}

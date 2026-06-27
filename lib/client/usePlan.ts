"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { PlanDoc } from "@/lib/types";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json() as Promise<PlanDoc>;
  });

/**
 * Loads a plan by id and provides an optimistic `save`.
 *
 * Persistence note: the durable store (Vercel Blob) is eventually consistent, so
 * a background poll can briefly return an OLDER version than what we just saved.
 * To stop that from clobbering local edits, we keep a version-guarded copy in
 * React state: a polled doc replaces it only when at least as new (by
 * `version`), and reads are ignored entirely while a save is in flight.
 * Genuinely newer updates (e.g. from another collaborator) still flow in.
 */
export function usePlan(planId: string | null) {
  const [plan, setPlan] = useState<PlanDoc | undefined>(undefined);
  const savingRef = useRef(false);

  const { error, isLoading, mutate } = useSWR<PlanDoc>(
    planId ? `/api/plan/${planId}` : null,
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 1000,
      onSuccess: (incoming) => {
        // Ignore any read that lands while we're saving, and never downgrade
        // to an older version (eventual-consistency / CDN-cached reads).
        if (savingRef.current) return;
        setPlan((cur) =>
          !cur ||
          cur.planId !== incoming.planId ||
          incoming.version >= cur.version
            ? incoming
            : cur,
        );
      },
    },
  );

  async function save(next: PlanDoc): Promise<PlanDoc> {
    savingRef.current = true;
    setPlan(next); // optimistic: local is the source of truth
    try {
      const res = await fetch(`/api/plan/${next.planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.status === 409) {
        const { current } = (await res.json()) as { current: PlanDoc };
        setPlan(current); // server is genuinely ahead; adopt it
        return current;
      }
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const saved = (await res.json()) as PlanDoc;
      setPlan(saved);
      return saved;
    } finally {
      savingRef.current = false;
    }
  }

  return { plan, error, isLoading: isLoading && !plan, mutate, save };
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

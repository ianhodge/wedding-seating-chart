import { PlanDoc } from "@/lib/types";

export type PutResult =
  | { ok: true; doc: PlanDoc }
  | { ok: false; conflict: true; current: PlanDoc };

/** Persistence contract. Implemented by the local (dev) and KV (prod) adapters. */
export interface StorageAdapter {
  get(planId: string): Promise<PlanDoc | null>;
  /**
   * Persist a doc. If expectedVersion is provided and does not match the stored
   * version, return a conflict carrying the current doc (optimistic concurrency).
   * On success the returned doc has its `version` incremented.
   */
  put(doc: PlanDoc, expectedVersion?: number): Promise<PutResult>;
}

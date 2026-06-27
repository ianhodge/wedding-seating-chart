import { PlanDoc } from "@/lib/types";
import { StorageAdapter } from "./types";
import { LocalAdapter } from "./local";
import { KvAdapter } from "./kv";
import { BlobAdapter } from "./blob";
import { MemoryAdapter } from "./memory";
import { buildSeedPlan } from "@/lib/seed/plan";

let adapter: StorageAdapter | null = null;

/**
 * Picks a storage backend (first match wins):
 * - Vercel KV when configured (durable, shared).
 * - Vercel Blob when BLOB_READ_WRITE_TOKEN is set (durable, shared) — the
 *   default production store for this app (provisioned via `vercel blob store add`).
 * - In-memory when on Vercel without a durable store (serverless FS is read-only):
 *   keeps the app working but data is not durable/shared.
 * - Local filesystem for dev.
 */
export function getAdapter(): StorageAdapter {
  if (adapter) return adapter;
  const hasKv = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
  const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
  if (hasKv) {
    adapter = new KvAdapter();
  } else if (hasBlob) {
    adapter = new BlobAdapter();
  } else if (process.env.VERCEL) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[store] No durable store configured — using in-memory storage. Data will NOT persist or be shared. Add a Vercel Blob or KV store for durable storage.",
      );
    }
    adapter = new MemoryAdapter();
  } else {
    adapter = new LocalAdapter();
  }
  return adapter;
}

/** Returns the plan, seeding it from the guest list on first access. */
export async function getOrCreatePlan(planId: string): Promise<PlanDoc> {
  const store = getAdapter();
  const existing = await store.get(planId);
  if (existing) return existing;
  const seeded = buildSeedPlan(planId);
  const res = await store.put(seeded);
  if (res.ok) return res.doc;
  // Lost a seeding race against a concurrent request; adopt what's stored.
  const current = await store.get(planId);
  return current ?? seeded;
}

export type { StorageAdapter, PutResult } from "./types";

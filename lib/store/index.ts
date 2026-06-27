import { PlanDoc } from "@/lib/types";
import { StorageAdapter } from "./types";
import { LocalAdapter } from "./local";
import { KvAdapter } from "./kv";
import { buildSeedPlan } from "@/lib/seed/plan";

let adapter: StorageAdapter | null = null;

/** Picks Vercel KV when configured, otherwise the local filesystem adapter. */
export function getAdapter(): StorageAdapter {
  if (adapter) return adapter;
  const hasKv = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
  adapter = hasKv ? new KvAdapter() : new LocalAdapter();
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

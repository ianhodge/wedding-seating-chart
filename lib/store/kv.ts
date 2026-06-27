import { kv } from "@vercel/kv";
import { PlanDoc } from "@/lib/types";
import { StorageAdapter, PutResult } from "./types";

// Production persistence backed by Vercel KV (Upstash Redis).
// Stored as a JSON value at key `plan:{planId}`.
const key = (planId: string) => `plan:${planId}`;

export class KvAdapter implements StorageAdapter {
  async get(planId: string): Promise<PlanDoc | null> {
    const data = await kv.get<PlanDoc>(key(planId));
    return data ?? null;
  }

  async put(doc: PlanDoc, expectedVersion?: number): Promise<PutResult> {
    const current = await this.get(doc.planId);
    if (current) {
      if (expectedVersion !== undefined && current.version !== expectedVersion) {
        return { ok: false, conflict: true, current };
      }
      const next: PlanDoc = { ...doc, version: current.version + 1, updatedAt: Date.now() };
      await kv.set(key(doc.planId), next);
      return { ok: true, doc: next };
    }
    const next: PlanDoc = { ...doc, version: doc.version || 1, updatedAt: Date.now() };
    await kv.set(key(doc.planId), next);
    return { ok: true, doc: next };
  }
}

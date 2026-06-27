import { PlanDoc } from "@/lib/types";
import { StorageAdapter, PutResult } from "./types";

// Process-local fallback used on serverless (read-only FS) when KV isn't
// configured. Survives only within a warm instance — NOT durable or shared.
// Configure Vercel KV for real cross-device persistence.
const store = new Map<string, PlanDoc>();

export class MemoryAdapter implements StorageAdapter {
  async get(planId: string): Promise<PlanDoc | null> {
    return store.get(planId) ?? null;
  }

  async put(doc: PlanDoc, expectedVersion?: number): Promise<PutResult> {
    const current = store.get(doc.planId);
    if (current) {
      if (expectedVersion !== undefined && current.version !== expectedVersion) {
        return { ok: false, conflict: true, current };
      }
      const next: PlanDoc = { ...doc, version: current.version + 1, updatedAt: Date.now() };
      store.set(doc.planId, next);
      return { ok: true, doc: next };
    }
    const next: PlanDoc = { ...doc, version: doc.version || 1, updatedAt: Date.now() };
    store.set(doc.planId, next);
    return { ok: true, doc: next };
  }
}

import { kv } from "@vercel/kv";
import { PlanDoc } from "@/lib/types";
import { StorageAdapter, PutResult } from "./types";

// Production persistence backed by Vercel KV (Upstash Redis).
// Stored as a JSON value at key `plan:{planId}`.
const key = (planId: string) => `plan:${planId}`;

/** True if the value looks like a usable PlanDoc for the given id. */
function isPlanDoc(value: unknown, planId: string): value is PlanDoc {
  return (
    !!value &&
    typeof value === "object" &&
    (value as PlanDoc).planId === planId &&
    typeof (value as PlanDoc).version === "number"
  );
}

export class KvAdapter implements StorageAdapter {
  async get(planId: string): Promise<PlanDoc | null> {
    try {
      const data = await kv.get<PlanDoc>(key(planId));
      return isPlanDoc(data, planId) ? data : null;
    } catch {
      // Transient KV/network errors are treated as a cache miss by callers.
      return null;
    }
  }

  // Best-effort read-modify-write: read the current doc for the version check,
  // then set. KV has no atomic compare-and-set here, so concurrent writers can
  // still race; the version check catches the common case.
  async put(doc: PlanDoc, expectedVersion?: number): Promise<PutResult> {
    const current = await this.get(doc.planId);
    if (
      current &&
      expectedVersion !== undefined &&
      current.version !== expectedVersion
    ) {
      return { ok: false, conflict: true, current };
    }
    const next: PlanDoc = {
      ...doc,
      version: current ? current.version + 1 : doc.version || 1,
      updatedAt: Date.now(),
    };
    await kv.set(key(doc.planId), next);
    return { ok: true, doc: next };
  }
}

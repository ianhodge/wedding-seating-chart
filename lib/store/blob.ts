import { list, put } from "@vercel/blob";
import { PlanDoc } from "@/lib/types";
import { StorageAdapter, PutResult } from "./types";

// Durable storage backed by Vercel Blob (provisioned via `vercel blob store add`).
// Uses BLOB_READ_WRITE_TOKEN from the environment automatically.
// One JSON object per plan at a stable pathname; best-effort optimistic
// concurrency via the doc `version` (Blob has no CAS).
const pathFor = (planId: string) => `plans/${encodeURIComponent(planId)}.json`;

// Per-instance fallback used when the Blob store is unavailable (e.g. suspended
// or rate-limited) so the app keeps loading/working instead of returning 500s.
// Not shared across serverless instances; durable writes resume automatically
// once Blob is healthy again.
const fallback = new Map<string, PlanDoc>();

export class BlobAdapter implements StorageAdapter {
  async get(planId: string): Promise<PlanDoc | null> {
    if (fallback.has(planId)) return fallback.get(planId) ?? null;
    const path = pathFor(planId);
    try {
      const { blobs } = await list({ prefix: path, limit: 1 });
      const hit = blobs.find((b) => b.pathname === path);
      if (!hit) return null;
      // Cache-bust + no-store so collaborators read fresh data.
      const res = await fetch(`${hit.url}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as PlanDoc;
    } catch {
      return null;
    }
  }

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
    try {
      await this.write(next);
      fallback.delete(doc.planId); // durable write succeeded
    } catch {
      // Durable store unavailable (e.g. suspended): keep working in-memory so
      // the UI never gets stuck. Persistence resumes when Blob is restored.
      fallback.set(doc.planId, next);
    }
    return { ok: true, doc: next };
  }

  private async write(doc: PlanDoc): Promise<void> {
    await put(pathFor(doc.planId), JSON.stringify(doc), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    });
  }
}

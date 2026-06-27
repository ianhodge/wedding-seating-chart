import { promises as fs } from "fs";
import path from "path";
import { PlanDoc } from "@/lib/types";
import { StorageAdapter, PutResult } from "./types";

// Dev/local persistence: one JSON file per plan under .data/plans (gitignored).
const DATA_DIR = path.join(process.cwd(), ".data", "plans");
const file = (planId: string) => path.join(DATA_DIR, `${planId}.json`);

export class LocalAdapter implements StorageAdapter {
  async get(planId: string): Promise<PlanDoc | null> {
    try {
      const raw = await fs.readFile(file(planId), "utf8");
      return JSON.parse(raw) as PlanDoc;
    } catch {
      return null;
    }
  }

  async put(doc: PlanDoc, expectedVersion?: number): Promise<PutResult> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const current = await this.get(doc.planId);
    if (current) {
      if (expectedVersion !== undefined && current.version !== expectedVersion) {
        return { ok: false, conflict: true, current };
      }
      const next: PlanDoc = { ...doc, version: current.version + 1, updatedAt: Date.now() };
      await fs.writeFile(file(doc.planId), JSON.stringify(next, null, 2), "utf8");
      return { ok: true, doc: next };
    }
    const next: PlanDoc = { ...doc, version: doc.version || 1, updatedAt: Date.now() };
    await fs.writeFile(file(doc.planId), JSON.stringify(next, null, 2), "utf8");
    return { ok: true, doc: next };
  }
}

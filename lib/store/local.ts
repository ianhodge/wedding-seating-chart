import { promises as fs } from "fs";
import path from "path";
import { PlanDoc } from "@/lib/types";
import { StorageAdapter, PutResult } from "./types";

// Dev/local persistence: one JSON file per plan under .data/plans (gitignored).
const DEFAULT_DATA_DIR = path.join(process.cwd(), ".data", "plans");

/** True if the value looks like a usable PlanDoc for the given id. */
function isPlanDoc(value: unknown, planId: string): value is PlanDoc {
  return (
    !!value &&
    typeof value === "object" &&
    (value as PlanDoc).planId === planId &&
    typeof (value as PlanDoc).version === "number"
  );
}

export class LocalAdapter implements StorageAdapter {
  private readonly dir: string;

  // The directory is configurable so tests can isolate to a temp folder.
  constructor(dir: string = DEFAULT_DATA_DIR) {
    this.dir = dir;
  }

  // encodeURIComponent keeps the planId from escaping the data dir (e.g. "../").
  private file(planId: string): string {
    return path.join(this.dir, `${encodeURIComponent(planId)}.json`);
  }

  async get(planId: string): Promise<PlanDoc | null> {
    try {
      const raw = await fs.readFile(this.file(planId), "utf8");
      const parsed: unknown = JSON.parse(raw);
      return isPlanDoc(parsed, planId) ? parsed : null;
    } catch {
      // Missing file or invalid JSON: treat as absent.
      return null;
    }
  }

  async put(doc: PlanDoc, expectedVersion?: number): Promise<PutResult> {
    await fs.mkdir(this.dir, { recursive: true });
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
    await this.writeAtomic(this.file(doc.planId), JSON.stringify(next, null, 2));
    return { ok: true, doc: next };
  }

  // Write to a temp file then rename so a crash mid-write can't corrupt a plan.
  private async writeAtomic(target: string, contents: string): Promise<void> {
    const tmp = `${target}.${process.pid}.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}.tmp`;
    try {
      await fs.writeFile(tmp, contents, "utf8");
      await fs.rename(tmp, target);
    } catch (err) {
      await fs.rm(tmp, { force: true }).catch(() => {});
      throw err;
    }
  }
}

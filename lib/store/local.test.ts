import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { LocalAdapter } from "./local";
import { buildSeedPlan } from "@/lib/seed/plan";

// Each test gets an isolated temp directory under .data (gitignored, and
// excluded from the vitest include glob) that is removed afterwards.
describe("LocalAdapter", () => {
  let dir: string;
  let adapter: LocalAdapter;

  beforeEach(async () => {
    dir = path.join(
      process.cwd(),
      ".data",
      "test",
      `store-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.mkdir(dir, { recursive: true });
    adapter = new LocalAdapter(dir);
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("returns null for a plan that does not exist", async () => {
    expect(await adapter.get("missing")).toBeNull();
  });

  it("round-trips a put and get", async () => {
    const doc = buildSeedPlan("rt");
    const res = await adapter.put(doc);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.doc.version).toBe(1);
      expect(res.doc.planId).toBe("rt");
    }

    const loaded = await adapter.get("rt");
    expect(loaded).not.toBeNull();
    expect(loaded?.planId).toBe("rt");
    expect(loaded?.version).toBe(1);
    expect(loaded?.parties.length).toBe(doc.parties.length);
  });

  it("increments the version on a matching-version overwrite", async () => {
    const doc = buildSeedPlan("inc");
    const first = await adapter.put(doc);
    expect(first.ok && first.doc.version).toBe(1);

    const second = await adapter.put({ ...doc, version: 1 }, 1);
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.doc.version).toBe(2);
    }

    const loaded = await adapter.get("inc");
    expect(loaded?.version).toBe(2);
  });

  it("returns a conflict carrying the current doc on a version mismatch", async () => {
    const doc = buildSeedPlan("conf");
    await adapter.put(doc); // stored version -> 1

    // A stale writer expecting version 0 should be rejected.
    const res = await adapter.put({ ...doc, version: 0 }, 0);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.conflict).toBe(true);
      expect(res.current.version).toBe(1);
      expect(res.current.planId).toBe("conf");
    }

    // The stored doc must be untouched by the rejected write.
    const loaded = await adapter.get("conf");
    expect(loaded?.version).toBe(1);
  });

  it("treats a corrupt file as absent instead of throwing", async () => {
    await fs.writeFile(path.join(dir, "broken.json"), "{ not valid json", "utf8");
    expect(await adapter.get("broken")).toBeNull();
  });
});

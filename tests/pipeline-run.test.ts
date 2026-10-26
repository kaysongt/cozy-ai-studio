import { beforeAll, describe, expect, it } from "vitest";
import { SqliteQueryable, StudioRepository } from "@/lib/db/repository";
import { runJobStep, startJob } from "@/lib/pipeline/runner";
import { formatCentral } from "@/lib/time";

beforeAll(() => {
  process.env.COZY_FORCE_MOCK = "1";
});

async function memoryStore(): Promise<StudioRepository> {
  const store = new StudioRepository(new SqliteQueryable(":memory:"));
  await store.migrate();
  await store.ensureRoster();
  return store;
}

async function finish(store: StudioRepository, id: string): Promise<void> {
  await startJob(store, id);
  for (let i = 0; i < 80; i += 1) {
    const job = await store.getJob(id);
    if (!job || job.status === "completed" || job.status === "held") return;
    await runJobStep(store, job);
  }
}

describe("mock floor", () => {
  it("pushes a sample brief through every desk without API keys", async () => {
    const store = await memoryStore();
    const job = await store.createJob({
      title: "Closing costs at the kitchen table",
      videoType: "skit",
      goal: "Help a first-time buyer spot lender charges before she signs.",
      platform: "reels",
      mustGoViral: true,
      topic: "A Houston transit scheduler finds the cash due at closing is not the payment she was quoted.",
      themes: ["Black characters", "Black issues", "Finance"],
    });
    await finish(store, job.id);
    const done = await store.getJob(job.id);
    expect(done?.status).toBe("completed");
    expect(done?.stage).toBe("performance");
    expect(done?.qcPassed).toBe(true);
    expect(done?.distributionMode).toBe("viral_ready");

    const debate = await store.listDebate(job.id);
    expect(debate.length).toBeGreaterThan(8);
    const kinds = new Set(debate.map((entry) => entry.kind));
    expect(kinds.has("pitch")).toBe(true);
    expect(kinds.has("critique")).toBe(true);
    expect(kinds.has("vote")).toBe(true);
    for (const entry of debate) {
      expect(entry.signature).toBe(`${entry.agentName} · ${entry.role} · ${entry.timestampCt}`);
      expect(entry.timestampCt).toBe(formatCentral(new Date(entry.timestampUtc)));
      expect(entry.timestampCt).toMatch(/C[SD]T|CT/);
    }

    const qc = await store.listQcForJob(job.id);
    expect(qc).toHaveLength(1);
    expect(qc[0]?.passed).toBe(true);
    expect(qc[0]?.score).toBe(100);
    expect(qc[0]?.disclaimer.toLowerCase()).toContain("not a guarantee of virality");

    const distributions = await store.listDistributionsForJob(job.id);
    expect(distributions.map((row) => row.channel).sort()).toEqual(["muse", "social"]);
    expect(distributions.find((row) => row.channel === "muse")?.stub).toBe(true);

    const performance = await store.listPerformanceForJob(job.id);
    expect(performance[0]?.simulated).toBe(true);
    expect(performance[0]?.feedback.toLowerCase()).toContain("research");
    expect(performance[0]?.feedback.toLowerCase()).not.toContain("will go viral");
  });

  it("sends a forced must-go-viral miss back to the writers' room, then finishes", async () => {
    const store = await memoryStore();
    const job = await store.createJob({
      title: "Payday math on a Thursday",
      videoType: "talking-head",
      goal: "Make a rollover fee visible before anyone calls it a small loan.",
      platform: "shorts",
      mustGoViral: true,
      topic: "An HVAC apprentice in Columbus walks through a payday loan that comes due on Thursday.",
      themes: ["Black characters", "Finance"],
      simulateGateMiss: true,
    });
    await finish(store, job.id);
    const done = await store.getJob(job.id);
    expect(done?.status).toBe("completed");
    expect(done?.revision).toBeGreaterThanOrEqual(1);
    const reports = await store.listQcForJob(job.id);
    expect(reports.some((report) => report.forcedMiss && !report.passed)).toBe(true);
    expect(reports.some((report) => report.passed)).toBe(true);
  });
});

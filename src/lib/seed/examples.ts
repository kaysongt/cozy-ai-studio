import type { StudioStore } from "@/lib/db/repository";
import { holdJob, runJobStep, startJob } from "@/lib/pipeline/runner";

export async function seedIfEmpty(store: StudioStore): Promise<void> {
  if ((await store.countJobs()) > 0) return;

  const closing = await store.createJob({
    title: "Closing costs at the kitchen table",
    videoType: "skit",
    goal: "Help a first-time buyer spot lender charges before she signs.",
    platform: "reels",
    mustGoViral: true,
    topic: "A Houston transit scheduler finds the cash due at closing is not the payment she was quoted.",
    themes: ["Black characters", "Black issues", "Finance"],
    themeNotes: "House slate. Keep it one person and one loan estimate.",
    exampleLabel: "EXAMPLE",
  });
  await runUntil(store, closing.id, (job) => job.status === "completed");

  const band = await store.createJob({
    title: "The band trip and the emergency fund",
    videoType: "explainer",
    goal: "Show which school fee can wait before anyone touches the emergency envelope.",
    platform: "tiktok",
    mustGoViral: true,
    topic: "A New Orleans band director explains an instrument fee, a trip deposit, and an emergency fund.",
    themes: ["Black characters", "Black issues", "Finance"],
    exampleLabel: "EXAMPLE",
  });
  await runUntil(store, band.id, (job) => job.stage === "writers_room" && job.step >= 4);
  await holdJob(store, band.id);

  const payday = await store.createJob({
    title: "Payday math on a Thursday",
    videoType: "talking-head",
    goal: "Make a rollover fee visible before anyone calls it a small loan.",
    platform: "shorts",
    mustGoViral: true,
    topic: "An HVAC apprentice in Columbus walks through a payday loan that comes due on Thursday.",
    themes: ["Black characters", "Finance"],
    exampleLabel: "EXAMPLE",
    simulateGateMiss: true,
  });
  await runUntil(store, payday.id, (job) => job.revision >= 1);
  await holdJob(store, payday.id);
}

async function runUntil(
  store: StudioStore,
  id: string,
  done: (job: { status: string; stage: string; step: number; revision: number }) => boolean,
): Promise<void> {
  await startJob(store, id);
  for (let i = 0; i < 80; i += 1) {
    const job = await store.getJob(id);
    if (!job) return;
    if (done(job) || job.status === "completed" || job.status === "held") return;
    await runJobStep(store, job);
  }
}

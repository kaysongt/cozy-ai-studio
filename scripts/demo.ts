import { getStore } from "../src/lib/db";
import { runJobStep, startJob } from "../src/lib/pipeline/runner";

async function main() {
  const store = await getStore();
  const job = await store.createJob({
    title: "Demo · the quote and the paper",
    videoType: "skit",
    goal: "Show a buyer the difference between the quoted payment and cash due at signing.",
    platform: "reels",
    mustGoViral: true,
    topic: "A Houston transit scheduler finds the cash due at closing is not the payment she was quoted.",
    themes: ["Black characters", "Black issues", "Finance"],
    themeNotes: "Demo brief. Mock desks unless API keys are set.",
  });
  console.log(`Filed ${job.id}`);
  await startJob(store, job.id);
  for (let i = 0; i < 80; i += 1) {
    const current = await store.getJob(job.id);
    if (!current) throw new Error("Brief disappeared.");
    if (current.status === "completed" || current.status === "held") break;
    const tick = await runJobStep(store, current);
    console.log(`${current.stage} step ${current.step} → ${tick.stage ?? "?"} (${tick.status ?? "?"})`);
  }
  const done = await store.getJob(job.id);
  const qc = await store.listQcForJob(job.id);
  const debate = await store.listDebate(job.id);
  console.log("---");
  console.log(`status=${done?.status} stage=${done?.stage} qcPassed=${done?.qcPassed} revision=${done?.revision}`);
  console.log(`debate lines=${debate.length} qc reports=${qc.length} last score=${qc.at(-1)?.score ?? "n/a"}`);
  console.log(qc.at(-1)?.disclaimer ?? "");
  if (done?.status !== "completed" || done.qcPassed !== true) {
    console.error("Demo brief did not clear the floor.");
    process.exit(1);
  }
  console.log("Demo brief wrapped. Performance notes are simulated and looped to Research.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

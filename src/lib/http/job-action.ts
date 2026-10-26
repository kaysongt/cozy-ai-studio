import { getStore } from "@/lib/db";
import type { JobRecord } from "@/lib/db/repository";
import { summarize } from "@/lib/studio/snapshot";

export async function jobAction(
  id: string,
  fn: (store: Awaited<ReturnType<typeof getStore>>) => Promise<JobRecord>,
): Promise<Response> {
  try {
    const store = await getStore();
    const job = await fn(store);
    return Response.json({ job: summarize(job) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not move the brief.";
    const status = message === "Job not found." ? 404 : 400;
    return Response.json({ error: message }, { status });
  }
}

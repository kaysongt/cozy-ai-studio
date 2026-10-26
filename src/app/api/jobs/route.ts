import { parseBrief } from "@/lib/catalog";
import { getStore } from "@/lib/db";
import { startJob } from "@/lib/pipeline/runner";
import { summarize } from "@/lib/studio/snapshot";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Brief has to be JSON." }, { status: 400 });
  }
  const parsed = parseBrief(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const store = await getStore();
    const job = await store.createJob(parsed.value);
    const runNow = !body || typeof body !== "object" ? false : (body as { runNow?: boolean }).runNow === true;
    const started = runNow ? await startJob(store, job.id) : job;
    return Response.json({ job: summarize(started) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not open the brief." }, { status: 500 });
  }
}

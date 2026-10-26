import { jobAction } from "@/lib/http/job-action";
import { resumeJob } from "@/lib/pipeline/runner";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return jobAction(id, (store) => resumeJob(store, id));
}

import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = await getStore();
    const jobs = await store.countJobs();
    return Response.json({ ok: true, jobs });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "unhealthy" }, { status: 500 });
  }
}

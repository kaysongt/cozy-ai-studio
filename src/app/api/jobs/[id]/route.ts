import { getStore } from "@/lib/db";
import { buildJobDetail } from "@/lib/studio/snapshot";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const store = await getStore();
    const detail = await buildJobDetail(store, id);
    if (!detail) return Response.json({ error: "No brief with that id." }, { status: 404 });
    return Response.json(detail);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not load the brief." }, { status: 500 });
  }
}

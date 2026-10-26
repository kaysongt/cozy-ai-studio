import { getStore } from "@/lib/db";
import { buildSnapshot } from "@/lib/studio/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = await getStore();
    return Response.json(await buildSnapshot(store));
  } catch (error) {
    return Response.json({ error: messageOf(error) }, { status: 500 });
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Studio floor failed.";
}

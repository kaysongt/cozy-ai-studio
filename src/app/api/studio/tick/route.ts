import { getStore } from "@/lib/db";
import { tick } from "@/lib/pipeline/runner";

export const dynamic = "force-dynamic";

let chain: Promise<unknown> = Promise.resolve();

export async function POST() {
  const run = chain.then(async () => {
    const store = await getStore();
    return tick(store);
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  try {
    return Response.json(await run);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Tick failed." }, { status: 500 });
  }
}

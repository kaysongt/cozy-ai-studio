import { Suspense } from "react";
import { DebateClient } from "@/app/debate/debate-client";

export default function DebatePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Opening the transcript…</p>}>
      <DebateClient />
    </Suspense>
  );
}

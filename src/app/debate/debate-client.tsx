"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFloor } from "@/components/floor-provider";
import { ExampleMark, FloorState, PageHeader } from "@/components/studio-bits";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DebateView, JobDetail } from "@/lib/studio/types";
import { cn } from "cn";

const ROOM = new Set(["open", "pitch", "critique", "vote", "lock"]);

export function DebateClient() {
  const params = useSearchParams();
  const requested = params.get("job");
  const { data, error, booting } = useFloor();
  const jobs = data?.jobs ?? [];
  const [override, setOverride] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roomOnly, setRoomOnly] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);

  const jobId =
    override ??
    requested ??
    jobs.find((job) => job.stage === "writers_room")?.id ??
    jobs[0]?.id ??
    null;

  useEffect(() => {
    if (!jobId) return;
    let cancel = false;
    fetch(`/api/jobs/${jobId}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as JobDetail & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Could not load the transcript.");
        if (!cancel) {
          setDetail(payload);
          setLoadError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancel) setLoadError(caught instanceof Error ? caught.message : "Could not load the transcript.");
      });
    return () => {
      cancel = true;
    };
  }, [jobId, data?.revisionToken]);

  const entries = useMemo(() => {
    const rows = detail?.debate ?? [];
    return roomOnly ? rows.filter((entry) => ROOM.has(entry.kind)) : rows;
  }, [detail, roomOnly]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [entries.length, jobId]);

  const items = Object.fromEntries(jobs.map((job) => [job.id, job.title]));
  const live = detail?.status === "running" && detail.stage === "writers_room";

  return (
    <div>
      <PageHeader
        kicker="Writers' room"
        title="The debate, signed."
        lede="Every line is signed with the agent’s name and a Central Time timestamp. Leave this page open while a brief is in the room and the transcript grows a turn at a time."
      />
      <FloorState booting={booting} error={error} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select items={items} value={jobId} onValueChange={(value) => setOverride(value)}>
          <SelectTrigger className="w-full sm:w-96">
            <SelectValue placeholder="Choose a brief" />
          </SelectTrigger>
          <SelectContent>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.exampleLabel ? "EXAMPLE · " : ""}
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => setRoomOnly((value) => !value)}
          className="rounded-lg bg-muted px-3 py-2 text-sm"
          aria-pressed={roomOnly}
        >
          {roomOnly ? "Writers’ room only" : "Entire floor"}
        </button>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn("lamp", live && "on")} />
          {live ? "Recording" : "Not in the room"}
        </p>
      </div>
      {loadError ? <p className="mb-3 text-sm text-destructive">{loadError}</p> : null}
      {detail ? (
        <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <ExampleMark label={detail.exampleLabel} />
          <span>
            {detail.stageLabel} · revision {detail.revision}
          </span>
        </p>
      ) : null}
      <div className="script-sheet max-h-[70vh] overflow-y-auto rounded-2xl px-4 py-4 md:px-6">
        {entries.length === 0 ? (
          <p className="script-meta text-sm">No lines yet. File a brief and run it, or pick a seeded example.</p>
        ) : (
          <ol className="space-y-4">
            {entries.map((entry) => (
              <DebateLine key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}

function DebateLine({ entry }: { entry: DebateView }) {
  return (
    <li>
      <p className="script-meta text-[11px] uppercase tracking-[0.14em]">
        {entry.kind} · rev {entry.revision}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{entry.body}</p>
      <p className="script-meta mt-2 text-xs">{entry.signature}</p>
    </li>
  );
}

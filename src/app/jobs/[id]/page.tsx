"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useFloor } from "@/components/floor-provider";
import { ExampleMark, PageHeader, StageRail, StatusMark } from "@/components/studio-bits";
import { Button } from "@/components/ui/button";
import { STAGE_LABELS, type Stage } from "@/lib/pipeline/machine";
import type { JobDetail } from "@/lib/studio/types";

export default function JobPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data } = useFloor();
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancel = false;
    fetch(`/api/jobs/${id}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as JobDetail & { error?: string };
        if (!response.ok) throw new Error(payload.error || "No brief with that id.");
        if (!cancel) {
          setDetail(payload);
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (!cancel) setError(caught instanceof Error ? caught.message : "Could not load the brief.");
      });
    return () => {
      cancel = true;
    };
  }, [id, data?.revisionToken]);

  async function act(path: string) {
    setPending(path);
    setError(null);
    try {
      const response = await fetch(path, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "The floor refused.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The floor refused.");
    } finally {
      setPending(null);
    }
  }

  if (error && !detail) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!detail) {
    return <p className="text-sm text-muted-foreground">Pulling the brief…</p>;
  }

  return (
    <div>
      <PageHeader kicker={detail.stageLabel} title={detail.title} lede={detail.topic} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ExampleMark label={detail.exampleLabel} />
        <StatusMark status={detail.status} />
        {detail.mustGoViral ? <span className="text-xs text-muted-foreground">Must clear the gate</span> : <span className="text-xs text-muted-foreground">Gate is advisory</span>}
        {detail.revision > 0 ? <span className="text-xs text-muted-foreground">Rework {detail.revision}</span> : null}
        {detail.distributionMode ? <span className="text-xs text-muted-foreground">{detail.distributionMode.replaceAll("_", " ")}</span> : null}
      </div>
      <StageRail stage={detail.stage} />
      <div className="mt-4 flex flex-wrap gap-2">
        {detail.status === "queued" ? (
          <Button disabled={pending !== null} onClick={() => act(`/api/jobs/${detail.id}/start`)}>
            Run the floor
          </Button>
        ) : null}
        {detail.status === "running" || detail.status === "rework" ? (
          <Button variant="outline" disabled={pending !== null} onClick={() => act(`/api/jobs/${detail.id}/hold`)}>
            Hold
          </Button>
        ) : null}
        {detail.status === "held" ? (
          <Button disabled={pending !== null} onClick={() => act(`/api/jobs/${detail.id}/resume`)}>
            Resume
          </Button>
        ) : null}
        <Link href={`/debate?job=${detail.id}`} className="rounded-lg bg-muted px-3 py-2 text-sm">
          Open the debate
        </Link>
      </div>
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <Info label="Goal" value={detail.goal} />
        <Info label="Platform" value={`${detail.platformLabel} · ${detail.videoTypeLabel}`} />
        <Info label="Themes" value={detail.themes.join(", ") || "None — follow the topic"} />
      </section>

      <section className="mt-8 space-y-4">
        {detail.artifacts.map((artifact) => (
          <article key={artifact.id} className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10">
            <p className="text-[11px] uppercase tracking-[0.16em] text-primary">
              {STAGE_LABELS[artifact.stage as Stage] ?? artifact.stage} · {artifact.kind} · rev {artifact.revision}
            </p>
            <ArtifactBody kind={artifact.kind} payload={artifact.payload} />
          </article>
        ))}
        {detail.artifacts.length === 0 ? <p className="text-sm text-muted-foreground">No desk packets yet.</p> : null}
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl">Floor log</h2>
        <ol className="mt-3 space-y-2">
          {detail.log.map((entry) => (
            <li key={entry.id} className="text-sm leading-6 text-muted-foreground">
              <span className="text-foreground">
                {entry.fromStage} → {entry.toStage}.
              </span>{" "}
              {entry.reason}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-6">{value}</p>
    </article>
  );
}

function ArtifactBody({ kind, payload }: { kind: string; payload: unknown }) {
  const data = (payload ?? {}) as Record<string, unknown>;
  if (kind === "concept") {
    return (
      <div className="mt-2 space-y-2 text-sm leading-6">
        <p>{String(data.logline ?? "")}</p>
        <p className="text-muted-foreground">Winner: {String(data.winner ?? "")} · {String(data.voteTally ?? "")}</p>
        <p className="whitespace-pre-wrap text-muted-foreground">{String(data.caption ?? "")}</p>
      </div>
    );
  }
  if (kind === "shot_pack") {
    const shots = Array.isArray(data.shots) ? data.shots : [];
    return (
      <ol className="mt-2 space-y-2 text-sm">
        {shots.map((shot) => {
          const row = shot as Record<string, unknown>;
          return (
            <li key={String(row.id)}>
              <span className="text-primary">{String(row.id)}</span> {String(row.purpose)} · {String(row.visual)}
            </li>
          );
        })}
      </ol>
    );
  }
  if (kind === "generation") {
    const todos = Array.isArray(data.todos) ? data.todos : [];
    const assets = Array.isArray(data.assets) ? data.assets : [];
    return (
      <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
        <p>{assets.length} stub assets. No master was rendered.</p>
        {todos.map((todo) => (
          <p key={String(todo)}>{String(todo)}</p>
        ))}
      </div>
    );
  }
  if (kind === "edit") {
    return (
      <div className="mt-2 space-y-2 text-sm leading-6">
        <p>{String(data.scheduledLabel ?? "")}</p>
        <p className="whitespace-pre-wrap">{String(data.caption ?? "")}</p>
        <p className="text-muted-foreground">{String(data.rightsNote ?? "")}</p>
      </div>
    );
  }
  if (kind === "bible") {
    const characters = Array.isArray(data.characters) ? data.characters : [];
    return (
      <div className="mt-2 space-y-2 text-sm leading-6">
        {characters.map((character) => {
          const row = character as Record<string, unknown>;
          return (
            <p key={String(row.name)}>
              {String(row.name)}, {String(row.age)}, {String(row.role)} in {String(row.city)}. Wants {String(row.want)}.
            </p>
          );
        })}
      </div>
    );
  }
  if (typeof data.culture === "string" || typeof data.trend === "string") {
    return (
      <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
        {typeof data.trend === "string" ? <p>{data.trend}</p> : null}
        {typeof data.culture === "string" ? <p>{data.culture}</p> : null}
      </div>
    );
  }
  if (typeof data.body === "string") {
    return <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{data.body}</p>;
  }
  return <p className="mt-2 text-sm text-muted-foreground">{Object.keys(data).join(", ") || "Packet filed."}</p>;
}

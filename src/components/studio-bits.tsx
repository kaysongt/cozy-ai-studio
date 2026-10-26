import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { STAGE_SHORT, STAGES, type Stage } from "@/lib/pipeline/machine";
import type { JobSummary } from "@/lib/studio/types";
import { cn } from "cn";

export function PageHeader({ kicker, title, lede }: { kicker: string; title: string; lede: string }) {
  return (
    <header className="mb-6 max-w-3xl">
      <p className="text-[11px] uppercase tracking-[0.2em] text-primary">{kicker}</p>
      <h1 className="mt-1 font-heading text-3xl tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">{lede}</p>
    </header>
  );
}

export function ExampleMark({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <Badge variant="outline" className="border-primary/50 text-primary">
      {label}
    </Badge>
  );
}

export function StatusMark({ status }: { status: JobSummary["status"] }) {
  const label =
    status === "running"
      ? "On the floor"
      : status === "rework"
        ? "Back in the room"
        : status === "held"
          ? "Held"
          : status === "completed"
            ? "Wrapped"
            : "Queued";
  return <Badge variant={status === "held" ? "destructive" : "secondary"}>{label}</Badge>;
}

export function StageRail({ stage }: { stage: Stage }) {
  const active = STAGES.indexOf(stage);
  return (
    <ol className="flex gap-1 overflow-x-auto pb-1">
      {STAGES.map((item, index) => (
        <li
          key={item}
          title={item}
          className={cn(
            "min-w-[4.5rem] flex-1 rounded-md px-2 py-1 text-center text-[10px] uppercase tracking-wide",
            index < active && "bg-primary/15 text-primary",
            index === active && "bg-primary text-primary-foreground",
            index > active && "bg-muted text-muted-foreground",
          )}
        >
          {index + 1} {STAGE_SHORT[item]}
        </li>
      ))}
    </ol>
  );
}

export function JobCard({ job }: { job: JobSummary }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10 transition hover:ring-primary/50"
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <ExampleMark label={job.exampleLabel} />
        {job.mustGoViral ? <Badge variant="outline">Must clear gate</Badge> : <Badge variant="secondary">Conditional ok</Badge>}
        {job.revision > 0 ? <Badge variant="secondary">Rework {job.revision}</Badge> : null}
      </div>
      <p className="font-heading text-base leading-snug">{job.title}</p>
      <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">{job.topic}</p>
      <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">
        {job.platformLabel} · {job.videoTypeLabel}
      </p>
    </Link>
  );
}

export function FloorState({ booting, error }: { booting: boolean; error: string | null }) {
  if (booting) {
    return <p className="text-sm text-muted-foreground">Opening the floor…</p>;
  }
  if (error) {
    return (
      <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }
  return null;
}

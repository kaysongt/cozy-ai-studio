"use client";

import Link from "next/link";
import { useFloor } from "@/components/floor-provider";
import { FloorState, PageHeader } from "@/components/studio-bits";
import { VIRAL_DISCLAIMER } from "@/lib/viral/gate";
import { cn } from "cn";

export default function QcPage() {
  const { data, error, booting } = useFloor();
  const reports = data?.qc ?? [];
  const jobs = data?.jobs ?? [];

  return (
    <div>
      <PageHeader
        kicker="QC / GO"
        title="The gate, not a forecast."
        lede="The checklist, then a decision. A hard first line, a dollar on screen, one character, a comment keyword, and 15–45 seconds sit beside the original gate. A must-go-viral miss goes back to the writers’ room. A brief that did not have to go viral can ship conditional. Neither outcome means the post will travel."
      />
      <FloorState booting={booting} error={error} />
      <p className="mb-4 max-w-3xl rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm leading-6">{VIRAL_DISCLAIMER}</p>
      {reports.length === 0 && !booting ? (
        <p className="text-sm text-muted-foreground">No gate reports yet. Run a brief and this desk fills in.</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const job = jobs.find((item) => item.id === report.jobId);
            return (
              <article key={report.id} className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10 md:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-primary">
                      {report.decision} · score {report.score}
                    </p>
                    <h2 className="font-heading text-2xl">
                      <Link href={`/jobs/${report.jobId}`} className="hover:text-primary">
                        {job?.title ?? report.jobId}
                      </Link>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Revision {report.revision}
                      {job?.exampleLabel ? ` · ${job.exampleLabel}` : ""} · {new Date(report.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className={cn("text-sm", report.passed ? "text-primary" : "text-destructive")}>
                    {report.passed ? "Checklist clear" : "Checklist miss"}
                  </p>
                </div>
                {report.forcedMiss ? (
                  <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
                    Demo override. The brief was sent back once so the loop is visible. Read the checks themselves.
                  </p>
                ) : null}
                <ul className="mt-4 grid gap-2 md:grid-cols-2">
                  {report.checks.map((check) => (
                    <li key={check.id} className="rounded-lg bg-muted/70 px-3 py-2">
                      <p className="text-sm">
                        <span className={check.passed ? "text-primary" : "text-destructive"}>{check.passed ? "Pass" : "Miss"}</span>
                        {" · "}
                        {check.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{check.detail}</p>
                    </li>
                  ))}
                </ul>
                {report.financeBody ? (
                  <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-background/60 px-3 py-3 text-xs leading-5 text-muted-foreground">
                    {report.financeBody}
                  </pre>
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">{report.disclaimer}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useFloor } from "@/components/floor-provider";
import { FloorState, JobCard, PageHeader } from "@/components/studio-bits";
import { STAGE_LABELS, STAGES } from "@/lib/pipeline/machine";

export default function BoardPage() {
  const { data, error, booting } = useFloor();
  const jobs = data?.jobs ?? [];

  return (
    <div>
      <PageHeader
        kicker="Pipeline"
        title="The board"
        lede="Ten columns, one brief per card. A must-go-viral miss leaves QC and comes back to the writers’ room. Example briefs are stamped EXAMPLE."
      />
      <FloorState booting={booting} error={error} />
      <p className="mb-3 text-xs text-muted-foreground md:hidden">Swipe the floor.</p>
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
        {STAGES.map((stage) => {
          const column = jobs.filter((job) => job.stage === stage);
          return (
            <section key={stage} className="w-[240px] shrink-0 snap-start">
              <header className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-xs uppercase tracking-[0.14em] text-primary">{STAGE_LABELS[stage]}</h2>
                <span className="text-xs text-muted-foreground">{column.length}</span>
              </header>
              <div className="space-y-2">
                {column.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    Empty
                  </p>
                ) : (
                  column.map((job) => <JobCard key={job.id} job={job} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

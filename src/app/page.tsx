"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useFloor } from "@/components/floor-provider";
import { FloorState, JobCard, PageHeader, StageRail } from "@/components/studio-bits";
import { STAGES, STAGE_LABELS } from "@/lib/pipeline/machine";
import { cn } from "cn";

const DESKS = [
  ["Intake", "The brief lands: type, goal, platform, topic, and whether it must clear the gate."],
  ["Research", "Trend Scout carries format references, labeled references only. Culture Desk holds what we're not: no stereotyped or degrading AI portrayals of Black people."],
  ["Writers' Room", "Three writers pitch, critique, and vote. The showrunner locks one concept."],
  ["Bible", "Character and world get locked so later desks cannot drift the portrayal."],
  ["Shot pack", "Hard first line, a dollar on screen, one character, 15–45s, then a comment keyword."],
  ["Generation", "Grok Imagine and Higgsfield adapters. Both are stubs until their APIs are known."],
  ["Edit", "Schedule lands on 9:00 AM or 6:00 PM CT. Audio is original."],
  ["QC / GO", "Finance Fact-Checker wants a source on every money claim. QC runs the gate."],
  ["Distribution", "Muse stub, an optional social webhook, and a Facebook list that stays on the floor."],
  ["Performance", "Simulated numbers, clearly labeled, loop back to Research for the next brief."],
];

export default function HomePage() {
  const { data, error, booting } = useFloor();
  const jobs = data?.jobs ?? [];
  const active = jobs.filter((job) => job.status === "running" || job.status === "rework" || job.status === "held");

  return (
    <div>
      <PageHeader
        kicker="Cozy Digital"
        title="The floor is ten desks and no interns."
        lede="You bring the brief. The agents research it, argue about it, lock a world, and refuse to ship a must-go-viral cut that misses the checklist. A pass is readiness. It is not a promise that anyone will watch."
      />
      <FloorState booting={booting} error={error} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/intake" className={cn(buttonVariants({ size: "lg" }), "h-10 px-4")}>
          File a brief
        </Link>
        <Link href="/board" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 px-4")}>
          Open the board
        </Link>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat label="On the floor" value={String(data?.runningCount ?? 0)} />
        <Stat label="Briefs on the slate" value={String(jobs.length)} />
        <Stat
          label="Desks with a live key"
          value={String(data?.providers.filter((provider) => provider.configured).length ?? 0)}
        />
      </section>

      <section className="mt-8">
        <h2 className="font-heading text-xl">Providers</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {(data?.providers ?? []).map((provider) => (
            <article key={provider.id} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <p className="text-sm">{provider.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {provider.configured ? provider.model : `Mock desk · set ${provider.keyName}`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                ${provider.monthSpendUsd.toFixed(2)} of ${provider.monthlyCapUsd.toFixed(0)} this month
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-heading text-xl">Slate</h2>
          <Link href="/board" className="text-sm text-primary">
            Board
          </Link>
        </div>
        {active.length === 0 && !booting ? (
          <p className="text-sm text-muted-foreground">Nothing is moving. The example briefs are held so they stay put until you resume one.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {active.slice(0, 4).map((job) => (
              <div key={job.id} className="space-y-2">
                <StageRail stage={job.stage} />
                <JobCard job={job} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-heading text-xl">How a brief moves</h2>
        <ol className="mt-3 grid gap-2 md:grid-cols-2">
          {DESKS.map(([title, copy], index) => (
            <li key={title} className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <p className="text-[11px] uppercase tracking-[0.16em] text-primary">
                {index + 1} · {STAGE_LABELS[STAGES[index]!] ?? title}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10">
      <p className="font-heading text-3xl text-primary">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    </article>
  );
}

"use client";

import Link from "next/link";
import { useFloor } from "@/components/floor-provider";
import { FloorState, PageHeader } from "@/components/studio-bits";
import { MUSE_TODO } from "@/lib/adapters/distribution";
import { FACEBOOK_DISTRIBUTION_LIST, FACEBOOK_LIST_NOTE } from "@/lib/house";

export default function DistributionPage() {
  const { data, error, booting } = useFloor();
  const jobs = data?.jobs ?? [];
  const titleFor = (id: string) => jobs.find((job) => job.id === id)?.title ?? id;

  return (
    <div>
      <PageHeader
        kicker="Distribution and performance"
        title="Out the door, then back to Research."
        lede="Muse does not have a known API, so the desk stores a stub receipt and does not send the cut. The social webhook fires only when SOCIAL_WEBHOOK_URL is set. The Facebook list below is saved on the floor and is not posted. Performance numbers on this floor are simulated and labeled that way."
      />
      <FloorState booting={booting} error={error} />
      <p className="mb-6 max-w-3xl rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">{MUSE_TODO}</p>

      <h2 className="font-heading text-2xl">Facebook list</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{FACEBOOK_LIST_NOTE}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {FACEBOOK_DISTRIBUTION_LIST.map((group) => (
          <li key={group} className="rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary">On the list</span>
            <p className="mt-1">{group}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-heading text-2xl">Receipts</h2>
      {(data?.distributions.length ?? 0) === 0 && !booting ? (
        <p className="mt-2 text-sm text-muted-foreground">No receipts yet.</p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(data?.distributions ?? []).map((row) => (
            <article key={row.id} className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10">
              <p className="text-[11px] uppercase tracking-[0.16em] text-primary">
                {row.channel} · {row.status}
                {row.stub ? " · stub" : ""}
              </p>
              <h3 className="mt-1 font-heading text-xl">
                <Link href={`/jobs/${row.jobId}`} className="hover:text-primary">
                  {titleFor(row.jobId)}
                </Link>
              </h3>
              <p className="mt-2 text-sm">{row.scheduledLabel || "No slot"}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{row.detail}</p>
            </article>
          ))}
        </div>
      )}

      <h2 className="mt-10 font-heading text-2xl">Performance loop</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        These figures are not platform analytics. The note is what Research reads on the next brief.
      </p>
      {(data?.performance.length ?? 0) === 0 && !booting ? (
        <p className="mt-2 text-sm text-muted-foreground">No performance notes yet.</p>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {(data?.performance ?? []).map((row) => (
            <article key={row.id} className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10">
              <p className="text-[11px] uppercase tracking-[0.16em] text-primary">
                {row.simulated ? "Simulated" : "Reported"} · looped to Research
              </p>
              <h3 className="mt-1 font-heading text-xl">
                <Link href={`/jobs/${row.jobId}`} className="hover:text-primary">
                  {titleFor(row.jobId)}
                </Link>
              </h3>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Metric label="Views" value={row.views.toLocaleString()} />
                <Metric label="Hold" value={`${Math.round(row.holdRate * 100)}%`} />
                <Metric label="Saves" value={row.saves.toLocaleString()} />
                <Metric label="Comments" value={row.comments.toLocaleString()} />
              </dl>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{row.feedback}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-heading text-lg">{value}</dd>
    </div>
  );
}

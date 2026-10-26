"use client";

import { useFloor } from "@/components/floor-provider";
import { FloorState, PageHeader } from "@/components/studio-bits";
import { GROK_IMAGINE_TODO, HIGGSFIELD_TODO } from "@/lib/adapters/generation";
import { MUSE_TODO } from "@/lib/adapters/distribution";
import { FORMAT_REFERENCES, FORMAT_REFERENCES_NOTE } from "@/lib/house";

const MACHINES = [
  { name: "Grok Imagine", status: "Stub", note: GROK_IMAGINE_TODO },
  { name: "Higgsfield", status: "Stub", note: HIGGSFIELD_TODO },
  { name: "Muse", status: "Stub", note: MUSE_TODO },
  {
    name: "Social webhook",
    status: "Optional",
    note: "Posts the package to SOCIAL_WEBHOOK_URL when that variable is set. Empty means the desk records a skip and sends nothing.",
  },
];

export default function AgentsPage() {
  const { data, error, booting } = useFloor();

  return (
    <div>
      <PageHeader
        kicker="Roster"
        title="Who is on the floor"
        lede="Each desk has a provider, a monthly spend cap, and a status. No key means the mock desk signs the work. A cap stops the live call and the mock desk covers."
      />
      <FloorState booting={booting} error={error} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(data?.agents ?? []).map((agent) => {
          const width = agent.monthlyCapUsd <= 0 ? 0 : Math.min(100, (agent.monthSpendUsd / agent.monthlyCapUsd) * 100);
          return (
            <article key={agent.id} className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl leading-tight">{agent.name}</h2>
                  <p className="text-xs uppercase tracking-[0.14em] text-primary">{agent.role}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-[11px] uppercase tracking-wide">{agent.status}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{agent.mandate}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {agent.provider} · {agent.model}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{agent.detail}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${width}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Shared provider ledger ${agent.monthSpendUsd.toFixed(2)} / ${agent.monthlyCapUsd.toFixed(0)}
              </p>
            </article>
          );
        })}
      </div>
      <h2 className="mt-10 font-heading text-2xl">Trend Scout references</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{FORMAT_REFERENCES_NOTE}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {FORMAT_REFERENCES.map((name) => (
          <li key={name} className="rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
            <span className="text-[11px] uppercase tracking-[0.16em] text-primary">References only</span>
            <p className="mt-1">{name}</p>
          </li>
        ))}
      </ul>
      <h2 className="mt-10 font-heading text-2xl">Machines</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Generation and Muse are adapter interfaces. They record intent and do not call a network until the contract exists.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {MACHINES.map((machine) => (
          <article key={machine.name} className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-lg">{machine.name}</h3>
              <span className="text-[11px] uppercase tracking-wide text-primary">{machine.status}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{machine.note}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

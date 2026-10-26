"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { FloorProvider, useFloor } from "@/components/floor-provider";
import { cn } from "cn";

const NAV = [
  { href: "/", label: "Floor" },
  { href: "/intake", label: "Brief" },
  { href: "/board", label: "Board" },
  { href: "/agents", label: "Roster" },
  { href: "/debate", label: "Debate" },
  { href: "/qc", label: "QC gate" },
  { href: "/distribution", label: "Distribution" },
];

export function StudioShell({ children }: { children: React.ReactNode }) {
  return (
    <FloorProvider>
      <ShellFrame>{children}</ShellFrame>
    </FloorProvider>
  );
}

function ShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useFloor();
  const [open, setOpen] = useState(false);
  const running = data?.runningCount ?? 0;

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link href="/" className="block px-2" onClick={() => setOpen(false)}>
          <p className="font-heading text-2xl tracking-tight text-primary">Cozy</p>
          <p className="text-[11px] uppercase tracking-[0.22em] text-sidebar-foreground/70">AI Studio</p>
          <p className="mt-1 text-xs text-muted-foreground">Cozy Digital</p>
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  active ? "bg-sidebar-accent text-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl border border-sidebar-border px-3 py-3 text-xs leading-5 text-muted-foreground">
          <p className="flex items-center gap-2 text-sidebar-foreground">
            <span className={cn("lamp", running > 0 && "on")} />
            {running > 0 ? `${running} on the floor` : "Floor is quiet"}
          </p>
          <p className="mt-2">Viral-readiness is a checklist. The studio does not promise a hit.</p>
        </div>
      </aside>
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <button type="button" className="rounded-md p-2" aria-label="Open menu" onClick={() => setOpen(true)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <p className="font-heading text-lg text-primary">Cozy AI Studio</p>
          <span className={cn("lamp", running > 0 && "on")} />
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

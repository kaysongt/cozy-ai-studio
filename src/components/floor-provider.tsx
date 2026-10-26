"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { StudioSnapshot } from "@/lib/studio/types";

interface FloorState {
  data: StudioSnapshot | null;
  error: string | null;
  booting: boolean;
}

const FloorContext = createContext<FloorState | null>(null);

export function FloorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FloorState>({ data: null, error: null, booting: true });

  useEffect(() => {
    let cancelled = false;
    let inflight = false;

    async function beat() {
      if (cancelled || inflight) return;
      inflight = true;
      try {
        const first = await fetch("/api/studio", { cache: "no-store" });
        const payload = (await first.json()) as StudioSnapshot & { error?: string };
        if (!first.ok) throw new Error(payload.error || "The floor did not answer.");
        if (cancelled) return;
        if (payload.runningCount > 0) {
          await fetch("/api/studio/tick", { method: "POST" });
          if (cancelled) return;
          const second = await fetch("/api/studio", { cache: "no-store" });
          const next = (await second.json()) as StudioSnapshot & { error?: string };
          if (!second.ok) throw new Error(next.error || "The floor did not answer.");
          if (!cancelled) setState({ data: next, error: null, booting: false });
        } else if (!cancelled) {
          setState({ data: payload, error: null, booting: false });
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            data: prev.data,
            booting: false,
            error: error instanceof Error ? error.message : "The floor did not answer.",
          }));
        }
      } finally {
        inflight = false;
      }
    }

    void beat();
    const id = window.setInterval(() => void beat(), 1200);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return <FloorContext.Provider value={state}>{children}</FloorContext.Provider>;
}

export function useFloor(): FloorState {
  const value = useContext(FloorContext);
  if (!value) throw new Error("useFloor must sit inside the studio shell.");
  return value;
}

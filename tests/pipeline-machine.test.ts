import { describe, expect, it } from "vitest";
import {
  MAX_VIRAL_REWORKS,
  STAGES,
  transition,
  type JobState,
  type PipelineEvent,
} from "@/lib/pipeline/machine";

function fresh(partial: Partial<JobState> = {}): JobState {
  return {
    stage: "intake",
    status: "queued",
    revision: 0,
    mustGoViral: true,
    qcPassed: null,
    distributionMode: null,
    ...partial,
  };
}

function move(state: JobState, event: PipelineEvent = { type: "stage_complete" }): JobState {
  const result = transition(state, event);
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

function walkToQc(state: JobState): JobState {
  let current = state;
  if (current.status === "queued") current = move(current, { type: "start" });
  let guard = 0;
  while (current.stage !== "qc") {
    current = move(current);
    if (++guard > 12) throw new Error(`stuck at ${current.stage}`);
  }
  return current;
}

describe("pipeline state machine", () => {
  it("names ten stages in floor order", () => {
    expect(STAGES).toEqual([
      "intake",
      "research",
      "writers_room",
      "bible",
      "shot_pack",
      "generation",
      "edit",
      "qc",
      "distribution",
      "performance",
    ]);
  });

  it("advances one stage at a time and will not start twice", () => {
    const started = move(fresh(), { type: "start" });
    expect(started).toMatchObject({ stage: "intake", status: "running" });
    const research = move(started);
    expect(research.stage).toBe("research");
    expect(transition(started, { type: "start" }).ok).toBe(false);
  });

  it("walks a passing must-go-viral brief to performance and loops notes to research", () => {
    const qc = walkToQc(fresh({ mustGoViral: true }));
    const passed = transition(qc, { type: "qc_result", passed: true });
    expect(passed.ok).toBe(true);
    if (!passed.ok) return;
    expect(passed.state.stage).toBe("distribution");
    expect(passed.state.distributionMode).toBe("viral_ready");
    expect(passed.state.qcPassed).toBe(true);
    expect(passed.reason.toLowerCase()).toContain("not a guarantee");
    expect(passed.researchLoopback).toBe(false);

    const performance = move(passed.state);
    expect(performance.stage).toBe("performance");
    const recorded = transition(performance, { type: "performance_recorded" });
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) return;
    expect(recorded.state.status).toBe("completed");
    expect(recorded.state.stage).toBe("performance");
    expect(recorded.researchLoopback).toBe(true);
    expect(recorded.reason.toLowerCase()).toContain("research");
    expect(transition(recorded.state, { type: "stage_complete" }).ok).toBe(false);
  });

  it("returns a must-go-viral miss to the writers' room, then holds", () => {
    let state = walkToQc(fresh({ mustGoViral: true }));
    for (let attempt = 0; attempt < MAX_VIRAL_REWORKS; attempt += 1) {
      const missed = transition(state, { type: "qc_result", passed: false });
      expect(missed.ok).toBe(true);
      if (!missed.ok) return;
      expect(missed.state.stage).toBe("writers_room");
      expect(missed.state.status).toBe("rework");
      expect(missed.state.revision).toBe(attempt + 1);
      expect(missed.state.distributionMode).toBeNull();
      expect(missed.reason.toLowerCase()).not.toContain("will go viral");
      state = walkToQc(missed.state);
    }
    const held = transition(state, { type: "qc_result", passed: false });
    expect(held.ok).toBe(true);
    if (!held.ok) return;
    expect(held.state.status).toBe("held");
    expect(held.state.stage).toBe("qc");
    expect(transition(held.state, { type: "stage_complete" }).ok).toBe(false);
    const resumed = transition(held.state, { type: "resume" });
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.state.status).toBe("running");
    expect(resumed.state.stage).toBe("qc");
  });

  it("lets a non-viral miss ship conditional and still close", () => {
    const qc = walkToQc(fresh({ mustGoViral: false }));
    const missed = transition(qc, { type: "qc_result", passed: false });
    expect(missed.ok).toBe(true);
    if (!missed.ok) return;
    expect(missed.state.stage).toBe("distribution");
    expect(missed.state.distributionMode).toBe("conditional");
    expect(missed.state.qcPassed).toBe(false);
    const performance = move(missed.state);
    const recorded = transition(performance, { type: "performance_recorded" });
    expect(recorded.ok).toBe(true);
    if (!recorded.ok) return;
    expect(recorded.researchLoopback).toBe(true);
    expect(recorded.state.status).toBe("completed");
  });

  it("refuses QC shortcuts and a must-go-viral close that never passed", () => {
    const running = move(fresh(), { type: "start" });
    expect(transition(running, { type: "qc_result", passed: true }).ok).toBe(false);
    const qc = walkToQc(fresh());
    expect(transition(qc, { type: "stage_complete" }).ok).toBe(false);
    const illegal = transition(
      {
        stage: "performance",
        status: "running",
        revision: 0,
        mustGoViral: true,
        qcPassed: false,
        distributionMode: null,
      },
      { type: "performance_recorded" },
    );
    expect(illegal.ok).toBe(false);
  });

  it("holds and resumes without skipping the current stage", () => {
    const running = move(move(fresh(), { type: "start" }));
    expect(running.stage).toBe("research");
    const held = transition(running, { type: "hold" });
    expect(held.ok).toBe(true);
    if (!held.ok) return;
    expect(held.state.stage).toBe("research");
    expect(transition(held.state, { type: "stage_complete" }).ok).toBe(false);
    const resumed = move(held.state, { type: "resume" });
    expect(resumed.status).toBe("running");
    expect(move(resumed).stage).toBe("writers_room");
  });
});

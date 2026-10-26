export const STAGES = [
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
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  intake: "Intake",
  research: "Research",
  writers_room: "Writers' Room",
  bible: "Character / World Bible",
  shot_pack: "Shot Pack",
  generation: "Generation",
  edit: "Edit",
  qc: "QC / GO",
  distribution: "Distribution",
  performance: "Performance",
};

export const STAGE_SHORT: Record<Stage, string> = {
  intake: "Intake",
  research: "Research",
  writers_room: "Writers",
  bible: "Bible",
  shot_pack: "Shots",
  generation: "Generate",
  edit: "Edit",
  qc: "QC",
  distribution: "Distro",
  performance: "Perf",
};

export type JobStatus = "queued" | "running" | "rework" | "held" | "completed";
export type DistributionMode = "viral_ready" | "conditional" | null;

export interface JobState {
  stage: Stage;
  status: JobStatus;
  revision: number;
  mustGoViral: boolean;
  qcPassed: boolean | null;
  distributionMode: DistributionMode;
}

/** How many times a must-go-viral miss may return to the writers' room before a person has to hold it. */
export const MAX_VIRAL_REWORKS = 3;

export type PipelineEvent =
  | { type: "start" }
  | { type: "stage_complete" }
  | { type: "qc_result"; passed: boolean }
  | { type: "performance_recorded" }
  | { type: "hold" }
  | { type: "resume" };

export interface TransitionOk {
  ok: true;
  state: JobState;
  from: Stage;
  to: Stage;
  reason: string;
  /** Performance notes are filed back to the research desk. The job itself stays complete. */
  researchLoopback: boolean;
}

export interface TransitionErr {
  ok: false;
  error: string;
  state: JobState;
}

export function nextStage(stage: Stage): Stage | null {
  const index = STAGES.indexOf(stage);
  if (index < 0 || index >= STAGES.length - 1) return null;
  return STAGES[index + 1] ?? null;
}

export function transition(state: JobState, event: PipelineEvent): TransitionOk | TransitionErr {
  const fail = (error: string): TransitionErr => ({ ok: false, error, state });

  if (state.status === "completed" && event.type !== "hold") {
    return fail("Job is already complete.");
  }

  if (state.status === "held" && event.type !== "resume") {
    return fail("Job is held. Resume it before the floor can move.");
  }

  switch (event.type) {
    case "hold":
      if (state.status === "completed") return fail("Completed jobs stay on the performance desk.");
      return ok(state, state.stage, { ...state, status: "held" }, "Held on the floor.", false);
    case "resume":
      if (state.status !== "held") return fail("Only a held job can be resumed.");
      return ok(state, state.stage, { ...state, status: "running" }, "Resumed.", false);
    case "start":
      if (state.status !== "queued") return fail("Only a queued brief can be started.");
      return ok(state, state.stage, { ...state, status: "running" }, "Floor is running.", false);
    case "stage_complete": {
      if (state.status !== "running" && state.status !== "rework") {
        return fail("The floor is not running.");
      }
      if (state.stage === "qc") {
        return fail("QC leaves the stage only through a gate result.");
      }
      if (state.stage === "performance") {
        return fail("Performance closes when feedback is recorded, not with a bare stage complete.");
      }
      if (state.stage === "distribution" && state.mustGoViral && state.qcPassed !== true) {
        return fail("A must-go-viral job cannot leave distribution without a passing gate.");
      }
      const to = nextStage(state.stage);
      if (!to) return fail("No next stage.");
      return ok(
        state,
        to,
        { ...state, stage: to, status: "running" },
        `${STAGE_LABELS[state.stage]} cleared. Next: ${STAGE_LABELS[to]}.`,
        false,
      );
    }
    case "qc_result": {
      if (state.stage !== "qc") return fail("The viral-readiness gate only runs in QC.");
      if (state.status !== "running" && state.status !== "rework") {
        return fail("The floor is not running.");
      }
      if (event.passed) {
        return ok(
          state,
          "distribution",
          {
            ...state,
            stage: "distribution",
            status: "running",
            qcPassed: true,
            distributionMode: "viral_ready",
          },
          "Gate passed. Marked viral-ready for distribution. Readiness is not a guarantee of virality.",
          false,
        );
      }
      if (state.mustGoViral) {
        if (state.revision >= MAX_VIRAL_REWORKS) {
          return ok(
            state,
            "qc",
            { ...state, status: "held", qcPassed: false, distributionMode: null },
            `Must-go-viral job missed the gate after ${MAX_VIRAL_REWORKS} returns to the writers' room. Held for a person. Not sent to distribution.`,
            false,
          );
        }
        return ok(
          state,
          "writers_room",
          {
            ...state,
            stage: "writers_room",
            status: "rework",
            revision: state.revision + 1,
            qcPassed: false,
            distributionMode: null,
          },
          "Must-go-viral job missed the gate and returned to the writers' room.",
          false,
        );
      }
      return ok(
        state,
        "distribution",
        {
          ...state,
          stage: "distribution",
          status: "running",
          qcPassed: false,
          distributionMode: "conditional",
        },
        "Gate missed. This brief is not must-go-viral, so it may ship conditional. Readiness is not a promise of virality.",
        false,
      );
    }
    case "performance_recorded": {
      if (state.stage !== "performance") return fail("Feedback is recorded from the performance stage.");
      if (state.status !== "running") return fail("The floor is not running.");
      if (state.mustGoViral && state.qcPassed !== true) {
        return fail("Refusing to close a must-go-viral job that never passed the gate.");
      }
      return ok(
        state,
        "performance",
        { ...state, status: "completed" },
        "Performance notes filed and looped back to Research.",
        true,
      );
    }
    default:
      return fail("Unknown floor event.");
  }
}

function ok(
  prev: JobState,
  to: Stage,
  state: JobState,
  reason: string,
  researchLoopback: boolean,
): TransitionOk {
  return { ok: true, state, from: prev.stage, to, reason, researchLoopback };
}

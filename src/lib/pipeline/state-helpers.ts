import type { JobRecord } from "@/lib/db/repository";
import { transition, type JobState, type PipelineEvent, MAX_VIRAL_REWORKS } from "@/lib/pipeline/machine";

export { transition, MAX_VIRAL_REWORKS };
export type { PipelineEvent };

export function toState(job: JobRecord): JobState {
  return {
    stage: job.stage,
    status: job.status,
    revision: job.revision,
    mustGoViral: job.mustGoViral,
    qcPassed: job.qcPassed,
    distributionMode: job.distributionMode,
  };
}

export function applyState(job: JobRecord, state: JobState): JobRecord {
  return {
    ...job,
    stage: state.stage,
    status: state.status,
    revision: state.revision,
    mustGoViral: state.mustGoViral,
    qcPassed: state.qcPassed,
    distributionMode: state.distributionMode,
  };
}

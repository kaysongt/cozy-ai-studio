import type { DistributionMode, JobStatus, Stage } from "@/lib/pipeline/machine";
import type { ViralCheck } from "@/lib/viral/gate";

export interface JobSummary {
  id: string;
  title: string;
  topic: string;
  goal: string;
  videoType: string;
  platform: string;
  platformLabel: string;
  videoTypeLabel: string;
  themes: string[];
  themeNotes: string;
  mustGoViral: boolean;
  stage: Stage;
  stageLabel: string;
  status: JobStatus;
  revision: number;
  qcPassed: boolean | null;
  distributionMode: DistributionMode;
  exampleLabel: string | null;
  step: number;
  updatedAt: string;
  createdAt: string;
}

export interface AgentView {
  id: string;
  name: string;
  role: string;
  provider: string;
  mandate: string;
  model: string;
  status: string;
  detail: string;
  monthlyCapUsd: number;
  monthSpendUsd: number;
  mock: boolean;
}

export interface ProviderView {
  id: string;
  label: string;
  keyName: string;
  configured: boolean;
  model: string;
  monthlyCapUsd: number;
  monthSpendUsd: number;
}

export interface QcView {
  id: string;
  jobId: string;
  revision: number;
  passed: boolean;
  score: number;
  decision: "GO" | "REWORK" | "CONDITIONAL_GO" | "HOLD";
  checks: ViralCheck[];
  disclaimer: string;
  financeBody: string;
  forcedMiss: boolean;
  createdAt: string;
}

export interface DistributionView {
  id: string;
  jobId: string;
  channel: "muse" | "social";
  status: string;
  stub: boolean;
  scheduledLabel: string;
  scheduledAtUtc: string;
  detail: string;
  createdAt: string;
}

export interface PerformanceView {
  id: string;
  jobId: string;
  simulated: boolean;
  views: number;
  holdRate: number;
  saves: number;
  comments: number;
  feedback: string;
  createdAt: string;
}

export interface DebateView {
  id: string;
  jobId: string;
  revision: number;
  agentName: string;
  role: string;
  kind: string;
  body: string;
  timestampUtc: string;
  timestampCt: string;
  signature: string;
}

export interface StageLogView {
  id: string;
  fromStage: string;
  toStage: string;
  reason: string;
  createdAt: string;
}

export interface StudioSnapshot {
  jobs: JobSummary[];
  agents: AgentView[];
  providers: ProviderView[];
  qc: QcView[];
  distributions: DistributionView[];
  performance: PerformanceView[];
  runningCount: number;
  revisionToken: string;
}

export interface JobDetail extends JobSummary {
  debate: DebateView[];
  artifacts: Array<{ id: string; stage: string; kind: string; revision: number; payload: unknown; createdAt: string }>;
  qc: QcView[];
  distributions: DistributionView[];
  performance: PerformanceView[];
  log: StageLogView[];
}

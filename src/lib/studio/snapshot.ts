import { providerConfigs } from "@/lib/adapters/llm";
import { ROSTER } from "@/lib/agents/roster";
import { platformLabel, videoTypeLabel } from "@/lib/catalog";
import type { JobRecord, StudioStore } from "@/lib/db/repository";
import { STAGE_LABELS } from "@/lib/pipeline/machine";
import type { AgentView, JobDetail, JobSummary, ProviderView, StudioSnapshot } from "@/lib/studio/types";
import { monthKeyCt } from "@/lib/time";

export async function buildSnapshot(store: StudioStore): Promise<StudioSnapshot> {
  const [jobs, qc, distributions, performance, agents] = await Promise.all([
    store.listJobs(),
    store.listQcReports(),
    store.listDistributions(),
    store.listPerformance(),
    agentViews(store),
  ]);
  const summaries = jobs.map(summarize);
  return {
    jobs: summaries,
    agents,
    providers: providerViews(agents),
    qc,
    distributions,
    performance,
    runningCount: summaries.filter((job) => job.status === "running" || job.status === "rework").length,
    revisionToken: summaries.reduce((max, job) => (job.updatedAt > max ? job.updatedAt : max), ""),
  };
}

export async function buildJobDetail(store: StudioStore, id: string): Promise<JobDetail | null> {
  const job = await store.getJob(id);
  if (!job) return null;
  const [debate, artifacts, qc, distributions, performance, log] = await Promise.all([
    store.listDebate(id),
    store.listArtifacts(id),
    store.listQcForJob(id),
    store.listDistributionsForJob(id),
    store.listPerformanceForJob(id),
    store.listStageLog(id),
  ]);
  return {
    ...summarize(job),
    debate,
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      stage: artifact.stage,
      kind: artifact.kind,
      revision: artifact.revision,
      payload: artifact.payload,
      createdAt: artifact.createdAt,
    })),
    qc,
    distributions,
    performance,
    log: log.map((entry) => ({
      id: entry.id,
      fromStage: entry.fromStage,
      toStage: entry.toStage,
      reason: entry.reason,
      createdAt: entry.createdAt,
    })),
  };
}

export function summarize(job: JobRecord): JobSummary {
  return {
    id: job.id,
    title: job.title,
    topic: job.topic,
    goal: job.goal,
    videoType: job.videoType,
    platform: job.platform,
    platformLabel: platformLabel(job.platform),
    videoTypeLabel: videoTypeLabel(job.videoType),
    themes: job.themes,
    themeNotes: job.themeNotes,
    mustGoViral: job.mustGoViral,
    stage: job.stage,
    stageLabel: STAGE_LABELS[job.stage],
    status: job.status,
    revision: job.revision,
    qcPassed: job.qcPassed,
    distributionMode: job.distributionMode,
    exampleLabel: job.exampleLabel,
    step: job.step,
    updatedAt: job.updatedAt,
    createdAt: job.createdAt,
  };
}

async function agentViews(store: StudioStore): Promise<AgentView[]> {
  const [statuses, spend] = await Promise.all([store.listAgentStatus(), store.spendByProvider(monthKeyCt())]);
  const configs = providerConfigs();
  return ROSTER.map((agent) => {
    const config = configs[agent.provider];
    const row = statuses.find((status) => status.id === agent.id);
    const spent = spend[agent.provider] ?? 0;
    const hasKey = Boolean(config.apiKey);
    let status = row?.status ?? (hasKey ? "ready" : "mock");
    let detail = row?.detail ?? (hasKey ? `${config.model} key loaded` : `No ${config.keyName}. Mock desk.`);
    if (!hasKey) {
      status = "mock";
      detail = `No ${config.keyName}. Mock desk.`;
    } else if (spent >= config.monthlyCapUsd) {
      status = "capped";
      detail = `Monthly cap $${config.monthlyCapUsd.toFixed(2)} reached.`;
    }
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      provider: config.label,
      mandate: agent.mandate,
      model: hasKey ? config.model : "mock-floor",
      status,
      detail,
      monthlyCapUsd: config.monthlyCapUsd,
      monthSpendUsd: spent,
      mock: !hasKey || status === "mock",
    };
  });
}

function providerViews(agents: AgentView[]): ProviderView[] {
  const configs = providerConfigs();
  return (Object.keys(configs) as Array<keyof typeof configs>).map((id) => {
    const config = configs[id];
    const sample = agents.find((agent) => agent.provider === config.label);
    return {
      id,
      label: config.label,
      keyName: config.keyName,
      configured: Boolean(config.apiKey),
      model: config.model,
      monthlyCapUsd: config.monthlyCapUsd,
      monthSpendUsd: sample?.monthSpendUsd ?? 0,
    };
  });
}

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { ROSTER, type ProviderId } from "@/lib/agents/roster";
import type { DistributionMode, JobStatus, Stage } from "@/lib/pipeline/machine";
import type { ViralCheck } from "@/lib/viral/gate";
import { SCHEMA_STATEMENTS } from "@/lib/db/schema";

export interface JobRecord {
  id: string;
  title: string;
  videoType: string;
  goal: string;
  platform: string;
  mustGoViral: boolean;
  topic: string;
  themes: string[];
  themeNotes: string;
  stage: Stage;
  status: JobStatus;
  revision: number;
  qcPassed: boolean | null;
  distributionMode: DistributionMode;
  step: number;
  stepErrors: number;
  exampleLabel: string | null;
  simulateGateMiss: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobInput {
  title: string;
  videoType: string;
  goal: string;
  platform: string;
  mustGoViral: boolean;
  topic: string;
  themes: string[];
  themeNotes?: string;
  simulateGateMiss?: boolean;
  exampleLabel?: string | null;
}

export interface DebateEntry {
  id: string;
  jobId: string;
  seq: number;
  revision: number;
  agentName: string;
  role: string;
  kind: string;
  body: string;
  timestampUtc: string;
  timestampCt: string;
  signature: string;
}

export interface ArtifactRecord {
  id: string;
  jobId: string;
  seq: number;
  stage: string;
  kind: string;
  revision: number;
  payload: unknown;
  createdAt: string;
}

export type QcDecision = "GO" | "REWORK" | "CONDITIONAL_GO" | "HOLD";

export interface QcReport {
  id: string;
  jobId: string;
  seq: number;
  revision: number;
  passed: boolean;
  score: number;
  decision: QcDecision;
  checks: ViralCheck[];
  disclaimer: string;
  financeBody: string;
  forcedMiss: boolean;
  createdAt: string;
}

export interface DistributionRecord {
  id: string;
  jobId: string;
  seq: number;
  channel: "muse" | "social";
  status: string;
  stub: boolean;
  scheduledLabel: string;
  scheduledAtUtc: string;
  detail: string;
  createdAt: string;
}

export interface PerformanceRecord {
  id: string;
  jobId: string;
  seq: number;
  simulated: boolean;
  views: number;
  holdRate: number;
  saves: number;
  comments: number;
  feedback: string;
  createdAt: string;
}

export interface StageLogEntry {
  id: string;
  jobId: string;
  seq: number;
  fromStage: string;
  toStage: string;
  reason: string;
  createdAt: string;
}

export interface AgentStatusRow {
  id: string;
  status: string;
  detail: string;
  updatedAt: string;
}

export interface SpendInput {
  id: string;
  provider: string;
  agentName: string;
  monthKey: string;
  costUsd: number;
  purpose: string;
  createdAt: string;
}

type SqlParams = SQLInputValue[];
type Row = Record<string, SQLInputValue | undefined>;

export interface Queryable {
  exec(sql: string): Promise<void>;
  all(sql: string, params?: SqlParams): Promise<Row[]>;
  get(sql: string, params?: SqlParams): Promise<Row | undefined>;
  run(sql: string, params?: SqlParams): Promise<void>;
}

export class SqliteQueryable implements Queryable {
  private db: DatabaseSync;

  constructor(file: string) {
    if (file !== ":memory:") {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    this.db = new DatabaseSync(file);
    if (file !== ":memory:") this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec("PRAGMA busy_timeout = 3000;");
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async all(sql: string, params: SqlParams = []): Promise<Row[]> {
    return this.db.prepare(sql).all(...params) as Row[];
  }

  async get(sql: string, params: SqlParams = []): Promise<Row | undefined> {
    return this.db.prepare(sql).get(...params) as Row | undefined;
  }

  async run(sql: string, params: SqlParams = []): Promise<void> {
    this.db.prepare(sql).run(...params);
  }
}

export class PostgresQueryable implements Queryable {
  private pool: import("pg").Pool | null = null;

  constructor(private url: string) {}

  private async getPool(): Promise<import("pg").Pool> {
    if (!this.pool) {
      const pg = await import("pg");
      this.pool = new pg.Pool({ connectionString: this.url });
    }
    return this.pool;
  }

  async exec(sql: string): Promise<void> {
    const pool = await this.getPool();
    await pool.query(toPg(sql));
  }

  async all(sql: string, params: SqlParams = []): Promise<Row[]> {
    const pool = await this.getPool();
    const result = await pool.query(toPg(sql), params);
    return result.rows as Row[];
  }

  async get(sql: string, params: SqlParams = []): Promise<Row | undefined> {
    const rows = await this.all(sql, params);
    return rows[0];
  }

  async run(sql: string, params: SqlParams = []): Promise<void> {
    const pool = await this.getPool();
    await pool.query(toPg(sql), params);
  }
}

function toPg(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
}

export class StudioRepository {
  constructor(private q: Queryable) {}

  async migrate(): Promise<void> {
    for (const statement of SCHEMA_STATEMENTS) {
      await this.q.exec(statement);
    }
  }

  async ensureRoster(): Promise<void> {
    const now = new Date().toISOString();
    for (const agent of ROSTER) {
      const existing = await this.q.get(`SELECT status FROM agent_status WHERE id = ?`, [agent.id]);
      const desk = deskAvailability(agent.provider);
      const nextStatus = desk.hasKey ? "ready" : "mock";
      const detail = desk.detail;
      if (!existing) {
        await this.q.run(
          `INSERT INTO agent_status (id, status, detail, updated_at) VALUES (?, ?, ?, ?)`,
          [agent.id, nextStatus, detail, now],
        );
        continue;
      }
      const status = String(existing.status);
      if (status === "mock" || status === "ready") {
        await this.setAgentStatus(agent.id, nextStatus, detail);
      }
    }
  }

  async countJobs(): Promise<number> {
    const row = await this.q.get(`SELECT COUNT(*) AS n FROM jobs`);
    return Number(row?.n ?? 0);
  }

  async createJob(input: CreateJobInput): Promise<JobRecord> {
    const now = new Date().toISOString();
    const job: JobRecord = {
      id: crypto.randomUUID(),
      title: input.title,
      videoType: input.videoType,
      goal: input.goal,
      platform: input.platform,
      mustGoViral: input.mustGoViral,
      topic: input.topic,
      themes: input.themes,
      themeNotes: input.themeNotes ?? "",
      stage: "intake",
      status: "queued",
      revision: 0,
      qcPassed: null,
      distributionMode: null,
      step: 0,
      stepErrors: 0,
      exampleLabel: input.exampleLabel ?? null,
      simulateGateMiss: Boolean(input.simulateGateMiss),
      createdAt: now,
      updatedAt: now,
    };
    await this.insertJob(job);
    return job;
  }

  async insertJob(job: JobRecord): Promise<void> {
    await this.q.run(
      `INSERT INTO jobs (
        id, title, video_type, goal, platform, must_go_viral, topic, themes_json, theme_notes,
        stage, status, revision, qc_passed, distribution_mode, step, step_errors, example_label,
        simulate_gate_miss, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      jobParams(job),
    );
  }

  async saveJob(job: JobRecord): Promise<void> {
    await this.q.run(
      `UPDATE jobs SET
        title = ?, video_type = ?, goal = ?, platform = ?, must_go_viral = ?, topic = ?, themes_json = ?,
        theme_notes = ?, stage = ?, status = ?, revision = ?, qc_passed = ?, distribution_mode = ?,
        step = ?, step_errors = ?, example_label = ?, simulate_gate_miss = ?, updated_at = ?
      WHERE id = ?`,
      [
        job.title,
        job.videoType,
        job.goal,
        job.platform,
        job.mustGoViral ? 1 : 0,
        job.topic,
        JSON.stringify(job.themes),
        job.themeNotes,
        job.stage,
        job.status,
        job.revision,
        job.qcPassed === null ? null : job.qcPassed ? 1 : 0,
        job.distributionMode,
        job.step,
        job.stepErrors,
        job.exampleLabel,
        job.simulateGateMiss ? 1 : 0,
        job.updatedAt,
        job.id,
      ],
    );
  }

  async getJob(id: string): Promise<JobRecord | null> {
    const row = await this.q.get(`SELECT * FROM jobs WHERE id = ?`, [id]);
    return row ? mapJob(row) : null;
  }

  async listJobs(): Promise<JobRecord[]> {
    const rows = await this.q.all(`SELECT * FROM jobs ORDER BY updated_at DESC`);
    return rows.map(mapJob);
  }

  async nextRunnableJob(): Promise<JobRecord | null> {
    const row = await this.q.get(
      `SELECT * FROM jobs WHERE status IN ('running', 'rework') ORDER BY updated_at ASC LIMIT 1`,
    );
    return row ? mapJob(row) : null;
  }

  async addDebate(entry: Omit<DebateEntry, "seq">): Promise<DebateEntry> {
    const seq = await this.nextSeq("debate_entries");
    const stored = { ...entry, seq };
    await this.q.run(
      `INSERT INTO debate_entries (
        id, job_id, seq, revision, agent_name, role, kind, body, timestamp_utc, timestamp_ct, signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        stored.id,
        stored.jobId,
        stored.seq,
        stored.revision,
        stored.agentName,
        stored.role,
        stored.kind,
        stored.body,
        stored.timestampUtc,
        stored.timestampCt,
        stored.signature,
      ],
    );
    return stored;
  }

  async listDebate(jobId: string): Promise<DebateEntry[]> {
    const rows = await this.q.all(`SELECT * FROM debate_entries WHERE job_id = ? ORDER BY seq ASC`, [jobId]);
    return rows.map(mapDebate);
  }

  async addArtifact(input: Omit<ArtifactRecord, "seq" | "createdAt" | "id"> & { id?: string }): Promise<void> {
    const seq = await this.nextSeq("artifacts");
    await this.q.run(
      `INSERT INTO artifacts (id, job_id, seq, stage, kind, revision, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id ?? crypto.randomUUID(),
        input.jobId,
        seq,
        input.stage,
        input.kind,
        input.revision,
        JSON.stringify(input.payload),
        new Date().toISOString(),
      ],
    );
  }

  async listArtifacts(jobId: string): Promise<ArtifactRecord[]> {
    const rows = await this.q.all(`SELECT * FROM artifacts WHERE job_id = ? ORDER BY seq ASC`, [jobId]);
    return rows.map(mapArtifact);
  }

  async latestArtifact(jobId: string, kind: string): Promise<ArtifactRecord | null> {
    const row = await this.q.get(
      `SELECT * FROM artifacts WHERE job_id = ? AND kind = ? ORDER BY seq DESC LIMIT 1`,
      [jobId, kind],
    );
    return row ? mapArtifact(row) : null;
  }

  async addQcReport(input: Omit<QcReport, "seq" | "createdAt" | "id"> & { id?: string }): Promise<QcReport> {
    const seq = await this.nextSeq("qc_reports");
    const report: QcReport = {
      ...input,
      id: input.id ?? crypto.randomUUID(),
      seq,
      createdAt: new Date().toISOString(),
    };
    await this.q.run(
      `INSERT INTO qc_reports (
        id, job_id, seq, revision, passed, score, decision, checks_json, disclaimer, finance_body, forced_miss, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        report.id,
        report.jobId,
        report.seq,
        report.revision,
        report.passed ? 1 : 0,
        report.score,
        report.decision,
        JSON.stringify(report.checks),
        report.disclaimer,
        report.financeBody,
        report.forcedMiss ? 1 : 0,
        report.createdAt,
      ],
    );
    return report;
  }

  async listQcReports(): Promise<QcReport[]> {
    const rows = await this.q.all(`SELECT * FROM qc_reports ORDER BY seq DESC`);
    return rows.map(mapQc);
  }

  async listQcForJob(jobId: string): Promise<QcReport[]> {
    const rows = await this.q.all(`SELECT * FROM qc_reports WHERE job_id = ? ORDER BY seq ASC`, [jobId]);
    return rows.map(mapQc);
  }

  async addDistribution(input: Omit<DistributionRecord, "seq" | "createdAt" | "id">): Promise<void> {
    const seq = await this.nextSeq("distributions");
    await this.q.run(
      `INSERT INTO distributions (
        id, job_id, seq, channel, status, stub, scheduled_label, scheduled_at_utc, detail, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        input.jobId,
        seq,
        input.channel,
        input.status,
        input.stub ? 1 : 0,
        input.scheduledLabel,
        input.scheduledAtUtc,
        input.detail,
        new Date().toISOString(),
      ],
    );
  }

  async listDistributions(): Promise<DistributionRecord[]> {
    const rows = await this.q.all(`SELECT * FROM distributions ORDER BY seq DESC`);
    return rows.map(mapDistribution);
  }

  async listDistributionsForJob(jobId: string): Promise<DistributionRecord[]> {
    const rows = await this.q.all(`SELECT * FROM distributions WHERE job_id = ? ORDER BY seq ASC`, [jobId]);
    return rows.map(mapDistribution);
  }

  async addPerformance(input: Omit<PerformanceRecord, "seq" | "createdAt" | "id">): Promise<void> {
    const seq = await this.nextSeq("performance_reports");
    await this.q.run(
      `INSERT INTO performance_reports (
        id, job_id, seq, simulated, views, hold_rate, saves, comments, feedback, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        input.jobId,
        seq,
        input.simulated ? 1 : 0,
        input.views,
        input.holdRate,
        input.saves,
        input.comments,
        input.feedback,
        new Date().toISOString(),
      ],
    );
  }

  async listPerformance(): Promise<PerformanceRecord[]> {
    const rows = await this.q.all(`SELECT * FROM performance_reports ORDER BY seq DESC`);
    return rows.map(mapPerformance);
  }

  async listPerformanceForJob(jobId: string): Promise<PerformanceRecord[]> {
    const rows = await this.q.all(`SELECT * FROM performance_reports WHERE job_id = ? ORDER BY seq ASC`, [jobId]);
    return rows.map(mapPerformance);
  }

  async recentFeedback(limit: number): Promise<PerformanceRecord[]> {
    const rows = await this.q.all(`SELECT * FROM performance_reports ORDER BY seq DESC LIMIT ?`, [limit]);
    return rows.map(mapPerformance);
  }

  async addStageLog(input: Omit<StageLogEntry, "seq">): Promise<void> {
    const seq = await this.nextSeq("stage_log");
    await this.q.run(
      `INSERT INTO stage_log (id, job_id, seq, from_stage, to_stage, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.id, input.jobId, seq, input.fromStage, input.toStage, input.reason, input.createdAt],
    );
  }

  async listStageLog(jobId: string): Promise<StageLogEntry[]> {
    const rows = await this.q.all(`SELECT * FROM stage_log WHERE job_id = ? ORDER BY seq ASC`, [jobId]);
    return rows.map((row) => ({
      id: String(row.id),
      jobId: String(row.job_id),
      seq: Number(row.seq),
      fromStage: String(row.from_stage),
      toStage: String(row.to_stage),
      reason: String(row.reason),
      createdAt: String(row.created_at),
    }));
  }

  async monthSpend(provider: string, monthKey: string): Promise<number> {
    const row = await this.q.get(
      `SELECT COALESCE(SUM(cost_usd), 0) AS total FROM spend_ledger WHERE provider = ? AND month_key = ?`,
      [provider, monthKey],
    );
    return Number(row?.total ?? 0);
  }

  async spendByProvider(monthKey: string): Promise<Record<string, number>> {
    const rows = await this.q.all(
      `SELECT provider, COALESCE(SUM(cost_usd), 0) AS total FROM spend_ledger WHERE month_key = ? GROUP BY provider`,
      [monthKey],
    );
    const totals: Record<string, number> = {};
    for (const row of rows) totals[String(row.provider)] = Number(row.total ?? 0);
    return totals;
  }

  async addSpend(input: SpendInput): Promise<void> {
    await this.q.run(
      `INSERT INTO spend_ledger (id, provider, agent_name, month_key, cost_usd, purpose, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.id, input.provider, input.agentName, input.monthKey, input.costUsd, input.purpose, input.createdAt],
    );
  }

  async setAgentStatus(id: string, status: string, detail: string): Promise<void> {
    const now = new Date().toISOString();
    await this.q.run(
      `INSERT INTO agent_status (id, status, detail, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET status = excluded.status, detail = excluded.detail, updated_at = excluded.updated_at`,
      [id, status, detail, now],
    );
  }

  async listAgentStatus(): Promise<AgentStatusRow[]> {
    const rows = await this.q.all(`SELECT * FROM agent_status`);
    return rows.map((row) => ({
      id: String(row.id),
      status: String(row.status),
      detail: String(row.detail),
      updatedAt: String(row.updated_at),
    }));
  }

  private async nextSeq(table: "debate_entries" | "artifacts" | "qc_reports" | "distributions" | "performance_reports" | "stage_log"): Promise<number> {
    const row = await this.q.get(`SELECT COALESCE(MAX(seq), 0) AS m FROM ${table}`);
    return Number(row?.m ?? 0) + 1;
  }
}

function deskAvailability(provider: ProviderId): { hasKey: boolean; detail: string } {
  if (provider === "grok") {
    const key = process.env.XAI_API_KEY?.trim();
    const model = process.env.XAI_MODEL?.trim() || "grok-3";
    return key
      ? { hasKey: true, detail: `${model} key loaded` }
      : { hasKey: false, detail: "No XAI_API_KEY. Mock desk." };
  }
  if (provider === "openai") {
    const key = process.env.OPENAI_API_KEY?.trim();
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    return key
      ? { hasKey: true, detail: `${model} key loaded` }
      : { hasKey: false, detail: "No OPENAI_API_KEY. Mock desk." };
  }
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5";
  return key
    ? { hasKey: true, detail: `${model} key loaded` }
    : { hasKey: false, detail: "No ANTHROPIC_API_KEY. Mock desk." };
}

function jobParams(job: JobRecord): SqlParams {
  return [
    job.id,
    job.title,
    job.videoType,
    job.goal,
    job.platform,
    job.mustGoViral ? 1 : 0,
    job.topic,
    JSON.stringify(job.themes),
    job.themeNotes,
    job.stage,
    job.status,
    job.revision,
    job.qcPassed === null ? null : job.qcPassed ? 1 : 0,
    job.distributionMode,
    job.step,
    job.stepErrors,
    job.exampleLabel,
    job.simulateGateMiss ? 1 : 0,
    job.createdAt,
    job.updatedAt,
  ];
}

function mapJob(row: Row): JobRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    videoType: String(row.video_type),
    goal: String(row.goal),
    platform: String(row.platform),
    mustGoViral: Number(row.must_go_viral) === 1,
    topic: String(row.topic),
    themes: parseJson<string[]>(row.themes_json, []),
    themeNotes: String(row.theme_notes ?? ""),
    stage: String(row.stage) as Stage,
    status: String(row.status) as JobStatus,
    revision: Number(row.revision),
    qcPassed: row.qc_passed === null || row.qc_passed === undefined ? null : Number(row.qc_passed) === 1,
    distributionMode: row.distribution_mode ? (String(row.distribution_mode) as DistributionMode) : null,
    step: Number(row.step),
    stepErrors: Number(row.step_errors ?? 0),
    exampleLabel: row.example_label ? String(row.example_label) : null,
    simulateGateMiss: Number(row.simulate_gate_miss) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDebate(row: Row): DebateEntry {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    seq: Number(row.seq),
    revision: Number(row.revision),
    agentName: String(row.agent_name),
    role: String(row.role),
    kind: String(row.kind),
    body: String(row.body),
    timestampUtc: String(row.timestamp_utc),
    timestampCt: String(row.timestamp_ct),
    signature: String(row.signature),
  };
}

function mapArtifact(row: Row): ArtifactRecord {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    seq: Number(row.seq),
    stage: String(row.stage),
    kind: String(row.kind),
    revision: Number(row.revision),
    payload: parseJson(row.payload_json, null),
    createdAt: String(row.created_at),
  };
}

function mapQc(row: Row): QcReport {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    seq: Number(row.seq),
    revision: Number(row.revision),
    passed: Number(row.passed) === 1,
    score: Number(row.score),
    decision: String(row.decision) as QcReport["decision"],
    checks: parseJson<ViralCheck[]>(row.checks_json, []),
    disclaimer: String(row.disclaimer),
    financeBody: String(row.finance_body),
    forcedMiss: Number(row.forced_miss) === 1,
    createdAt: String(row.created_at),
  };
}

function mapDistribution(row: Row): DistributionRecord {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    seq: Number(row.seq),
    channel: String(row.channel) as DistributionRecord["channel"],
    status: String(row.status),
    stub: Number(row.stub) === 1,
    scheduledLabel: String(row.scheduled_label),
    scheduledAtUtc: String(row.scheduled_at_utc),
    detail: String(row.detail),
    createdAt: String(row.created_at),
  };
}

function mapPerformance(row: Row): PerformanceRecord {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    seq: Number(row.seq),
    simulated: Number(row.simulated) === 1,
    views: Number(row.views),
    holdRate: Number(row.hold_rate),
    saves: Number(row.saves),
    comments: Number(row.comments),
    feedback: String(row.feedback),
    createdAt: String(row.created_at),
  };
}

function parseJson<T>(value: SQLInputValue | undefined, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function defaultSqliteFile(): string {
  // SQLite WAL updates a sidecar on read. A file inside this repo makes next dev
  // treat that write as a source change and reload the dashboard in a loop.
  return path.join(os.tmpdir(), "cozy-ai-studio", "studio.db");
}

export function openStore(): StudioRepository {
  const url = process.env.DATABASE_URL?.trim();
  if (url && /^postgres(ql)?:\/\//i.test(url)) {
    return new StudioRepository(new PostgresQueryable(url));
  }
  const file = process.env.SQLITE_PATH?.trim() || defaultSqliteFile();
  return new StudioRepository(new SqliteQueryable(file));
}

export type StudioStore = StudioRepository;

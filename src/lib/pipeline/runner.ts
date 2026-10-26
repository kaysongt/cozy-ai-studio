import { agentById } from "@/lib/agents/roster";
import { museAdapter, publishSocialWebhook } from "@/lib/adapters/distribution";
import { grokImagineAdapter, higgsfieldAdapter, GROK_IMAGINE_TODO, HIGGSFIELD_TODO } from "@/lib/adapters/generation";
import { promptFor, speak } from "@/lib/adapters/llm";
import type { ArtifactRecord, JobRecord, QcDecision, StudioStore } from "@/lib/db/repository";
import { makeContext, toViralPackage, type BriefContext } from "@/lib/floor/context";
import {
  bibleNote,
  critiqueImaniOnJune,
  critiqueJuneOnMarcus,
  critiqueMarcusOnImani,
  cultureResearch,
  facebookListNote,
  financeBody,
  lockLine,
  performanceFeedback,
  pitchImani,
  pitchJune,
  pitchMarcus,
  qcLine,
  showrunnerOpen,
  trendCopy,
  voteImani,
  voteJune,
  voteMarcus,
} from "@/lib/floor/copy";
import { applyState, toState, transition, type PipelineEvent, MAX_VIRAL_REWORKS } from "@/lib/pipeline/state-helpers";
import { nextPostingSlot, stamp } from "@/lib/time";
import { evaluateViralGate, VIRAL_DISCLAIMER, type ViralPackage } from "@/lib/viral/gate";

export interface TickResult {
  didWork: boolean;
  jobId?: string;
  stage?: string;
  status?: string;
  error?: string;
}

type StepOutcome = { event?: PipelineEvent };

export async function startJob(store: StudioStore, id: string): Promise<JobRecord> {
  return applyEvent(store, id, { type: "start" });
}

export async function holdJob(store: StudioStore, id: string): Promise<JobRecord> {
  return applyEvent(store, id, { type: "hold" });
}

export async function resumeJob(store: StudioStore, id: string): Promise<JobRecord> {
  return applyEvent(store, id, { type: "resume" });
}

export async function tick(store: StudioStore): Promise<TickResult> {
  const job = await store.nextRunnableJob();
  if (!job) return { didWork: false };
  return runJobStep(store, job);
}

export async function runJobStep(store: StudioStore, job: JobRecord): Promise<TickResult> {
  if (job.status !== "running" && job.status !== "rework") {
    return { didWork: false, jobId: job.id, status: job.status };
  }
  try {
    await runStep(store, job);
    const after = await store.getJob(job.id);
    if (after && after.stepErrors !== 0 && after.status !== "held") {
      after.stepErrors = 0;
      after.updatedAt = new Date().toISOString();
      await store.saveJob(after);
    }
    return {
      didWork: true,
      jobId: job.id,
      stage: after?.stage ?? job.stage,
      status: after?.status ?? job.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown floor error";
    const fresh = await store.getJob(job.id);
    if (!fresh) return { didWork: false, jobId: job.id, error: message };
    const errors = fresh.stepErrors + 1;
    fresh.stepErrors = errors;
    fresh.updatedAt = new Date().toISOString();
    if (errors >= 3 && fresh.status !== "held") {
      const held = transition(toState(fresh), { type: "hold" });
      if (held.ok) {
        const next = applyState(fresh, held.state);
        next.stepErrors = errors;
        next.updatedAt = fresh.updatedAt;
        await store.saveJob(next);
        await store.addStageLog({
          id: crypto.randomUUID(),
          jobId: job.id,
          fromStage: held.from,
          toStage: held.to,
          reason: `Held after repeated errors: ${message}`,
          createdAt: fresh.updatedAt,
        });
      } else {
        await store.saveJob(fresh);
      }
    } else {
      await store.saveJob(fresh);
    }
    return { didWork: false, jobId: job.id, error: message, stage: fresh.stage, status: fresh.status };
  }
}

async function runStep(store: StudioStore, job: JobRecord): Promise<void> {
  const steps = STEPS[job.stage];
  const step = steps[job.step];
  if (!step) {
    await applyEvent(store, job.id, { type: "stage_complete" });
    return;
  }
  const outcome = await step(store, job);
  const current = await store.getJob(job.id);
  if (!current) return;
  if (outcome.event) {
    await applyEvent(store, current.id, outcome.event);
    return;
  }
  if (job.step + 1 >= steps.length) {
    await applyEvent(store, current.id, { type: "stage_complete" });
    return;
  }
  current.step = job.step + 1;
  current.stepErrors = 0;
  current.updatedAt = new Date().toISOString();
  await store.saveJob(current);
}

async function applyEvent(store: StudioStore, id: string, event: PipelineEvent): Promise<JobRecord> {
  const job = await store.getJob(id);
  if (!job) throw new Error("Job not found.");
  const result = transition(toState(job), event);
  if (!result.ok) throw new Error(result.error);
  const next = applyState(job, result.state);
  if (result.from !== result.to) next.step = 0;
  next.stepErrors = 0;
  next.updatedAt = new Date().toISOString();
  await store.saveJob(next);
  await store.addStageLog({
    id: crypto.randomUUID(),
    jobId: job.id,
    fromStage: result.from,
    toStage: result.to,
    reason: result.reason,
    createdAt: next.updatedAt,
  });
  return next;
}

const STEPS: Record<JobRecord["stage"], Array<(store: StudioStore, job: JobRecord) => Promise<StepOutcome>>> = {
  intake: [intakeStep],
  research: [trendStep, cultureStep],
  writers_room: [
    openStep,
    writerStep("writer-imani", "pitch", pitchImani),
    writerStep("writer-marcus", "pitch", pitchMarcus),
    writerStep("writer-june", "pitch", pitchJune),
    writerStep("writer-marcus", "critique", critiqueMarcusOnImani),
    writerStep("writer-june", "critique", critiqueJuneOnMarcus),
    writerStep("writer-imani", "critique", critiqueImaniOnJune),
    writerStep("writer-imani", "vote", voteImani),
    writerStep("writer-marcus", "vote", () => voteMarcus()),
    writerStep("writer-june", "vote", () => voteJune()),
    lockStep,
  ],
  bible: [bibleStep],
  shot_pack: [shotStep],
  generation: [grokImagineStep, higgsfieldStep],
  edit: [editStep],
  qc: [financeStep, gateStep],
  distribution: [museStep, socialStep],
  performance: [performanceStep],
};

async function intakeStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const ctx = await contextFor(store, job);
  await say(store, job, "showrunner", "note", `Intake accepted. ${ctx.speechTopic}. ${ctx.videoTypeLabel} for ${ctx.platformLabel}.`);
  await store.addArtifact({
    jobId: job.id,
    stage: "intake",
    kind: "intake",
    revision: job.revision,
    payload: {
      title: job.title,
      topic: job.topic,
      goal: job.goal,
      videoType: ctx.videoTypeLabel,
      platform: ctx.platformLabel,
      themes: job.themes,
      mustGoViral: job.mustGoViral,
      themeNotes: job.themeNotes,
    },
  });
  return {};
}

async function trendStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const ctx = await contextFor(store, job);
  const fallback = trendCopy(ctx);
  const result = await speak(store, {
    agent: agentById("trend-scout"),
    purpose: "research.trend",
    fallbackText: fallback,
    user: promptFor(
      "trend-scout",
      "Scout the brief. Name the platform, the money moment, and the posting windows. Carry the format references labeled references only. Do not score virality.",
      summaryOf(ctx),
    ),
  });
  await say(store, job, "trend-scout", "research", withNote(result.text, result));
  return {};
}

async function cultureStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const ctx = await contextFor(store, job);
  const fallback = cultureResearch(ctx);
  const result = await speak(store, {
    agent: agentById("culture-desk"),
    purpose: "research.culture",
    fallbackText: fallback,
    user: promptFor(
      "culture-desk",
      "Preliminary sensitivity read. State what we're not. Do not sign off yet. Flag stereotypes and degrading portrayals. Keep one specific person.",
      summaryOf(ctx),
    ),
  });
  const body = withNote(result.text, result);
  await say(store, job, "culture-desk", "research", body);
  const trend = await store.listDebate(job.id);
  const trendBody = [...trend].reverse().find((entry) => entry.kind === "research" && entry.agentName === "Amina Diallo");
  await store.addArtifact({
    jobId: job.id,
    stage: "research",
    kind: "research",
    revision: job.revision,
    payload: {
      trend: trendBody?.body ?? "",
      culture: body,
      feedbackUsed: ctx.feedback,
    },
  });
  return {};
}

function writerStep(
  agentId: string,
  kind: "pitch" | "critique" | "vote",
  fallbackFor: (ctx: BriefContext) => string,
): (store: StudioStore, job: JobRecord) => Promise<StepOutcome> {
  return async (store, job) => {
    const ctx = await contextFor(store, job);
    const fallback = fallbackFor(ctx);
    const task =
      kind === "pitch"
        ? "Pitch one concept for this brief in under 140 words."
        : kind === "critique"
          ? "Critique the other pitch. Be specific. Under 90 words."
          : "Vote. The first line must be exactly `VOTE: Imani Cole` or `VOTE: Marcus Hale` or `VOTE: June Okonkwo`, then one sentence.";
    const result = await speak(store, {
      agent: agentById(agentId),
      purpose: `writers_room.${kind}.${agentId}`,
      fallbackText: fallback,
      user: promptFor(agentId, task, summaryOf(ctx)),
    });
    await say(store, job, agentId, kind, withNote(result.text, result));
    return {};
  };
}

async function openStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const ctx = await contextFor(store, job);
  const fallback = showrunnerOpen(ctx);
  const result = await speak(store, {
    agent: agentById("showrunner"),
    purpose: "writers_room.open",
    fallbackText: fallback,
    user: promptFor("showrunner", "Open the writers' room. State the gate rule without promising virality.", summaryOf(ctx)),
  });
  await say(store, job, "showrunner", "open", withNote(result.text, result));
  return {};
}

async function lockStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const ctx = await contextFor(store, job);
  const debate = await store.listDebate(job.id);
  const tally = tallyVotes(debate.filter((entry) => entry.revision === job.revision && entry.kind === "vote"));
  const fallback = lockLine(ctx, tally.winner, tally.summary);
  const result = await speak(store, {
    agent: agentById("showrunner"),
    purpose: "writers_room.lock",
    fallbackText: fallback,
    user: promptFor("showrunner", `Lock one concept. The room's tally is ${tally.summary}. Winner leaning ${tally.winner}. Do not promise virality.`, summaryOf(ctx)),
  });
  await say(store, job, "showrunner", "lock", withNote(result.text, result));
  const blocked = ctx.revision === 0 && ctx.flags.length > 0;
  await store.addArtifact({
    jobId: job.id,
    stage: "writers_room",
    kind: "concept",
    revision: job.revision,
    payload: {
      title: job.title,
      winner: tally.winner,
      voteTally: tally.summary,
      logline: `${ctx.cast.name}, a ${ctx.cast.role} in ${ctx.cast.city}, opens on "${ctx.hookText}" with ${ctx.sceneDollar} on screen, then one sourced money sentence. Comment ${ctx.commentKeyword}.`,
      hookText: ctx.hookText,
      hookDurationMs: 420,
      openingBeat: "pain_point",
      caption: ctx.caption,
      character: ctx.cast,
      facts: [ctx.fact, ctx.hypothetical],
      stereotypeFlags: blocked ? ctx.flags : [],
      cultureDeskSignedOff: !blocked,
      portrayalRespectful: !blocked,
      speech: result.text,
    },
  });
  return {};
}

async function bibleStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const ctx = await contextFor(store, job);
  const fallback = bibleNote(ctx);
  const result = await speak(store, {
    agent: agentById("bible-keeper"),
    purpose: "bible.lock",
    fallbackText: fallback,
    user: promptFor("bible-keeper", "Lock the character and world in a short canon note.", summaryOf(ctx)),
  });
  await say(store, job, "bible-keeper", "bible", withNote(result.text, result));
  await store.addArtifact({
    jobId: job.id,
    stage: "bible",
    kind: "bible",
    revision: job.revision,
    payload: {
      logline: `${ctx.cast.name} wants ${ctx.cast.want}.`,
      characters: [
        {
          name: ctx.cast.name,
          age: ctx.cast.age,
          role: ctx.cast.role,
          city: ctx.cast.city,
          want: ctx.cast.want,
          contradiction: ctx.cast.contradiction,
          visual: ctx.cast.visual,
          avoid: ctx.cast.avoid,
        },
      ],
      world: {
        place: ctx.cast.city,
        time: "a weekday morning, before the platform's posting window",
        texture: ctx.cast.visual,
        rules: [
          "One recurring character, one document.",
          "What we're not: a stereotyped or degrading AI portrayal.",
          `${ctx.sceneDollar} on the paper is hypothetical.`,
          "The sourced sentence stays sourced.",
          `End by asking them to comment ${ctx.commentKeyword}.`,
          ...ctx.cast.avoid.map((item) => `Do not: ${item}`),
        ],
      },
      sensitivityNotes: ctx.flags.length
        ? [`Original brief language was refused: ${ctx.flags.join("; ")}.`]
        : ["No stereotype flags on the locked cut."],
      note: result.text,
    },
  });
  return {};
}

async function shotStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const ctx = await contextFor(store, job);
  const shots = [
    {
      id: "s1",
      secondIn: 0,
      durationSec: 2,
      visual: ctx.cast.visual,
      audio: "room tone, no needle-drop",
      onScreenText: ctx.hookText,
      purpose: "hook",
    },
    {
      id: "s2",
      secondIn: 2,
      durationSec: 8,
      visual: `${ctx.cast.name}'s hands on their own paper`,
      audio: ctx.pain,
      onScreenText: ctx.sceneDollar,
      purpose: "pain",
    },
    {
      id: "s3",
      secondIn: 10,
      durationSec: 10,
      visual: "the sourced sentence set in type, with the publisher name",
      audio: ctx.fact.claim,
      onScreenText: "Source on screen",
      purpose: "source",
    },
    {
      id: "s4",
      secondIn: 20,
      durationSec: 8,
      visual: `${ctx.cast.name} looks just off camera`,
      audio: ctx.action,
      onScreenText: `Comment ${ctx.commentKeyword}`,
      purpose: "ask",
    },
  ];
  await say(
    store,
    job,
    "showrunner",
    "note",
    `Shot pack locked at ${ctx.durationSeconds}s. Hook is the first line, frame at 420ms, ${ctx.sceneDollar} on screen. Caption stays two lines. ${ctx.caption.replaceAll("\n", " / ")}`,
  );
  await store.addArtifact({
    jobId: job.id,
    stage: "shot_pack",
    kind: "shot_pack",
    revision: job.revision,
    payload: {
      shots,
      durationSeconds: ctx.durationSeconds,
      hookDurationMs: 420,
      openingBeat: "pain_point",
      onScreenText: ctx.onScreenText,
      recurringCharacter: ctx.cast.name,
      commentKeyword: ctx.commentKeyword,
      caption: ctx.caption,
    },
  });
  return {};
}

async function grokImagineStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const pack = await store.latestArtifact(job.id, "shot_pack");
  const shots = shotsOf(pack);
  const receipt = await grokImagineAdapter.generate({
    jobId: job.id,
    styleNotes: "original studio frame, no third-party footage",
    shots,
  });
  await store.addArtifact({
    jobId: job.id,
    stage: "generation",
    kind: "generation",
    revision: job.revision,
    payload: { assets: receipt.assets, todos: [receipt.todo] },
  });
  await say(store, job, "showrunner", "note", `Grok Imagine stub recorded for ${receipt.assets.length} shots. Nothing was rendered. ${GROK_IMAGINE_TODO}`);
  return {};
}

async function higgsfieldStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const pack = await store.latestArtifact(job.id, "shot_pack");
  const prior = await store.latestArtifact(job.id, "generation");
  const shots = shotsOf(pack);
  const receipt = await higgsfieldAdapter.generate({
    jobId: job.id,
    styleNotes: "motion pass, original media only",
    shots,
  });
  const previous = (prior?.payload as { assets?: unknown[]; todos?: string[] } | undefined) ?? { assets: [], todos: [] };
  await store.addArtifact({
    jobId: job.id,
    stage: "generation",
    kind: "generation",
    revision: job.revision,
    payload: {
      assets: [...(previous.assets ?? []), ...receipt.assets],
      todos: [...(previous.todos ?? []), receipt.todo],
    },
  });
  await say(store, job, "showrunner", "note", `Higgsfield stub recorded. Nothing was rendered. ${HIGGSFIELD_TODO}`);
  return {};
}

async function editStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const ctx = await contextFor(store, job);
  const slot = nextPostingSlot();
  const viral = toViralPackage(ctx, { hourCt: slot.hourCt, minuteCt: slot.minuteCt });
  const rightsNote =
    "Attested original. The audio bed is original to this studio (not a commercial track, not a needle-drop). Picture is a stub until Grok Imagine and Higgsfield are connected. Do not upload the stub as a finished master.";
  await store.addArtifact({
    jobId: job.id,
    stage: "edit",
    kind: "edit",
    revision: job.revision,
    payload: {
      timeline: `${ctx.durationSeconds}s · s1 hook 0.0–2.0 · s2 dollar on screen · s3 sourced line · s4 comment ${ctx.commentKeyword}`,
      caption: ctx.caption,
      audioLicense: "original",
      mediaOriginal: true,
      scheduledHourCt: slot.hourCt,
      scheduledMinuteCt: slot.minuteCt,
      scheduledLabel: slot.label,
      scheduledAtUtc: slot.instant.toISOString(),
      viral,
      rightsNote,
    },
  });
  await say(store, job, "showrunner", "note", `Edit locked to ${slot.label}. ${rightsNote}`);
  return {};
}

async function financeStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const ctx = await contextFor(store, job);
  const fallback = financeBody(ctx);
  const result = await speak(store, {
    agent: agentById("finance-checker"),
    purpose: "qc.finance",
    fallbackText: fallback,
    user: promptFor(
      "finance-checker",
      "Check every money claim. Require a source for anything stated as fact. Label hypotheticals.",
      `${summaryOf(ctx)}\n\nLocked money claim: ${ctx.fact.claim}\nSource: ${ctx.fact.source}\nHypothetical: ${ctx.hypothetical.claim}`,
    ),
  });
  await say(store, job, "finance-checker", "qc", withNote(result.text, result));
  await store.addArtifact({
    jobId: job.id,
    stage: "qc",
    kind: "finance_review",
    revision: job.revision,
    payload: { body: result.text, claims: [ctx.fact, ctx.hypothetical] },
  });
  return {};
}

async function gateStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const edit = await store.latestArtifact(job.id, "edit");
  const payload = edit?.payload as { viral?: ViralPackage } | undefined;
  if (!payload?.viral) throw new Error("QC has no edit package.");
  const gate = evaluateViralGate(payload.viral);
  let forced = false;
  if (job.simulateGateMiss) {
    const cleared = await store.getJob(job.id);
    if (cleared) {
      cleared.simulateGateMiss = false;
      cleared.updatedAt = new Date().toISOString();
      await store.saveJob(cleared);
    }
    if (gate.passed) forced = true;
  }
  const passed = gate.passed && !forced;
  const decision = decisionFor(job, passed);
  const finance = await store.latestArtifact(job.id, "finance_review");
  const financeText = (finance?.payload as { body?: string } | undefined)?.body ?? "";
  await store.addQcReport({
    jobId: job.id,
    revision: job.revision,
    passed,
    score: gate.score,
    decision,
    checks: gate.checks,
    disclaimer: gate.disclaimer || VIRAL_DISCLAIMER,
    financeBody: financeText,
    forcedMiss: forced,
  });
  const line = qcLine(gate, decision, forced);
  const result = await speak(store, {
    agent: agentById("qc"),
    purpose: "qc.gate",
    fallbackText: line,
    user: promptFor("qc", `State the gate result. Decision ${decision}. Score ${gate.score}. Never promise virality.`, line),
  });
  await say(store, job, "qc", "qc", withNote(result.mock ? line : result.text, result));
  return { event: { type: "qc_result", passed } };
}

function decisionFor(job: JobRecord, passed: boolean): QcDecision {
  if (passed) return "GO";
  if (!job.mustGoViral) return "CONDITIONAL_GO";
  if (job.revision >= MAX_VIRAL_REWORKS) return "HOLD";
  return "REWORK";
}

async function museStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const edit = await store.latestArtifact(job.id, "edit");
  const payload = edit?.payload as {
    caption?: string;
    scheduledLabel?: string;
    scheduledAtUtc?: string;
    viral?: ViralPackage;
  } | undefined;
  const receipt = await museAdapter.publish({
    jobId: job.id,
    title: job.title,
    platform: job.platform,
    caption: payload?.caption ?? "",
    scheduledAtUtc: payload?.scheduledAtUtc ?? "",
    scheduledLabel: payload?.scheduledLabel ?? "",
    conditional: job.distributionMode === "conditional",
    assetNotes: ["Generation adapters returned stubs. No master file."],
    disclaimer: VIRAL_DISCLAIMER,
  });
  await store.addDistribution({
    jobId: job.id,
    channel: "muse",
    status: receipt.status,
    stub: true,
    scheduledLabel: receipt.scheduledLabel,
    scheduledAtUtc: payload?.scheduledAtUtc ?? "",
    detail: receipt.todo,
  });
  await say(store, job, "showrunner", "note", `Muse adapter returned a stub receipt (${receipt.status}). The cut was not sent. ${receipt.todo}`);
  return {};
}

async function socialStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const edit = await store.latestArtifact(job.id, "edit");
  const payload = edit?.payload as { caption?: string; scheduledLabel?: string; scheduledAtUtc?: string } | undefined;
  const receipt = await publishSocialWebhook({
    jobId: job.id,
    title: job.title,
    platform: job.platform,
    caption: payload?.caption ?? "",
    scheduledAtUtc: payload?.scheduledAtUtc ?? "",
    scheduledLabel: payload?.scheduledLabel ?? "",
    conditional: job.distributionMode === "conditional",
    assetNotes: ["stub render"],
    disclaimer: VIRAL_DISCLAIMER,
  });
  await store.addDistribution({
    jobId: job.id,
    channel: "social",
    status: receipt.status,
    stub: receipt.stub,
    scheduledLabel: payload?.scheduledLabel ?? "",
    scheduledAtUtc: payload?.scheduledAtUtc ?? "",
    detail: receipt.detail,
  });
  await say(store, job, "showrunner", "note", `Social webhook: ${receipt.status}. ${receipt.detail} ${facebookListNote()}`);
  return {};
}

async function performanceStep(store: StudioStore, job: JobRecord): Promise<StepOutcome> {
  const metrics = simulateMetrics(job.id);
  const feedback = performanceFeedback(job.title, metrics.holdRate);
  await store.addPerformance({
    jobId: job.id,
    simulated: true,
    ...metrics,
    feedback,
  });
  await say(
    store,
    job,
    "trend-scout",
    "note",
    `Filing performance back to Research. ${feedback}`,
  );
  return { event: { type: "performance_recorded" } };
}

async function contextFor(store: StudioStore, job: JobRecord): Promise<BriefContext> {
  const recent = await store.recentFeedback(3);
  return makeContext(
    {
      topic: job.topic,
      goal: job.goal,
      videoType: job.videoType,
      platform: job.platform,
      themes: job.themes,
      mustGoViral: job.mustGoViral,
      revision: job.revision,
    },
    recent.map((row) => row.feedback),
  );
}

async function say(store: StudioStore, job: JobRecord, agentId: string, kind: string, body: string): Promise<void> {
  const agent = agentById(agentId);
  const when = stamp();
  const signature = `${agent.name} · ${agent.role} · ${when.ct}`;
  await store.addDebate({
    id: crypto.randomUUID(),
    jobId: job.id,
    revision: job.revision,
    agentName: agent.name,
    role: agent.role,
    kind,
    body,
    timestampUtc: when.utc,
    timestampCt: when.ct,
    signature,
  });
}

function withNote(text: string, result: { mock: boolean; note: string }): string {
  if (!result.mock || !result.note) return text;
  return `${text}\n\n— ${result.note}`;
}

function summaryOf(ctx: BriefContext): string {
  return [
    `Title context: ${ctx.speechTopic}`,
    `Type: ${ctx.videoTypeLabel}. Platform: ${ctx.platformLabel}.`,
    `Themes: ${ctx.themes.join(", ") || "none"}.`,
    `Must clear viral gate: ${ctx.mustGoViral ? "yes" : "no"}.`,
    `One recurring character: ${ctx.cast.name}, ${ctx.cast.role}, ${ctx.cast.city}.`,
    `Money moment: ${ctx.moneyMoment}.`,
    `Hook, and the first line: ${ctx.hookText}`,
    `Dollar on screen (scene hypothetical): ${ctx.sceneDollar}`,
    `Comment keyword: ${ctx.commentKeyword}`,
    `Runtime target: ${ctx.durationSeconds}s inside 15–45s.`,
    `Pain: ${ctx.pain}`,
    `Goal: ${ctx.goal}`,
  ].join("\n");
}

function tallyVotes(votes: Array<{ body: string }>): { winner: string; summary: string } {
  const names = ["Imani Cole", "Marcus Hale", "June Okonkwo"] as const;
  const counts = new Map<string, number>(names.map((name) => [name, 0]));
  for (const vote of votes) {
    const match = vote.body.match(/VOTE:\s*(Imani Cole|Marcus Hale|June Okonkwo)/);
    const name = match?.[1] ?? "Imani Cole";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let winner: string = names[0];
  let best = -1;
  for (const name of names) {
    const count = counts.get(name) ?? 0;
    if (count > best) {
      best = count;
      winner = name;
    }
  }
  const summary = names.map((name) => `${name.split(" ")[0]} ${counts.get(name) ?? 0}`).join(", ");
  return { winner, summary };
}

function shotsOf(pack: ArtifactRecord | null): Array<{ id: string; visual: string; durationSec: number }> {
  const payload = pack?.payload as { shots?: Array<{ id: string; visual: string; durationSec: number }> } | undefined;
  return payload?.shots ?? [];
}

function simulateMetrics(jobId: string): { views: number; holdRate: number; saves: number; comments: number } {
  let hash = 0;
  for (const char of jobId) hash = (Math.imul(hash, 33) + char.charCodeAt(0)) >>> 0;
  const views = 800 + (hash % 4200);
  const holdRate = Math.round((0.35 + (hash % 40) / 100) * 100) / 100;
  return {
    views,
    holdRate,
    saves: Math.round(views * 0.04),
    comments: Math.round(views * 0.012),
  };
}

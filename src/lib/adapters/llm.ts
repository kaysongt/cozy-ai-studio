import { agentById, type AgentDef, type ProviderId } from "@/lib/agents/roster";
import type { StudioStore } from "@/lib/db/repository";
import { formatReferencesBlock, HOUSE_SHAPE, WHAT_WE_ARE_NOT } from "@/lib/house";
import { monthKeyCt } from "@/lib/time";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  keyName: string;
  apiKey: string;
  model: string;
  monthlyCapUsd: number;
  endpoint: string;
}

export interface LlmRequest {
  agent: AgentDef;
  purpose: string;
  user: string;
  /** Used when no key is set, the cap is hit, or the live call fails. */
  fallbackText: string;
}

export interface LlmResult {
  text: string;
  provider: ProviderId | "mock";
  model: string;
  costUsd: number;
  mock: boolean;
  note: string;
}

const PRICE_PER_MILLION: Record<string, { input: number; output: number }> = {
  "grok-3": { input: 3, output: 15 },
  "grok-4": { input: 3, output: 15 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-3-5-sonnet-latest": { input: 3, output: 15 },
};

const FALLBACK_PRICE = { input: 5, output: 15 };

export function providerConfigs(): Record<ProviderId, ProviderConfig> {
  return {
    grok: {
      id: "grok",
      label: "Grok (xAI)",
      keyName: "XAI_API_KEY",
      apiKey: process.env.XAI_API_KEY?.trim() ?? "",
      model: process.env.XAI_MODEL?.trim() || "grok-3",
      monthlyCapUsd: numberEnv("XAI_MONTHLY_CAP_USD", 25),
      endpoint: "https://api.x.ai/v1/chat/completions",
    },
    openai: {
      id: "openai",
      label: "OpenAI",
      keyName: "OPENAI_API_KEY",
      apiKey: process.env.OPENAI_API_KEY?.trim() ?? "",
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      monthlyCapUsd: numberEnv("OPENAI_MONTHLY_CAP_USD", 25),
      endpoint: "https://api.openai.com/v1/chat/completions",
    },
    anthropic: {
      id: "anthropic",
      label: "Anthropic",
      keyName: "ANTHROPIC_API_KEY",
      apiKey: process.env.ANTHROPIC_API_KEY?.trim() ?? "",
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5",
      monthlyCapUsd: numberEnv("ANTHROPIC_MONTHLY_CAP_USD", 25),
      endpoint: "https://api.anthropic.com/v1/messages",
    },
  };
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICE_PER_MILLION[model] ?? FALLBACK_PRICE;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

export function systemFor(agent: AgentDef): string {
  return [
    `You are ${agent.name}, ${agent.role} at Cozy AI Studio, the short-video floor for Cozy Digital.`,
    agent.mandate,
    "When the brief asks for them, default themes are specific Black characters, Black issues told as a price or a rule in one person's life, and finance.",
    HOUSE_SHAPE,
    WHAT_WE_ARE_NOT,
    "Any video type is allowed. Do not force a theme the brief removed.",
    "Never claim a video will go viral, is guaranteed to travel, or will hit a view count.",
    "A money claim stated as fact needs a named source. Paperwork inside a scene is a hypothetical and must be labeled as one.",
    "Write plain sentences. Stay under 160 words unless asked for a caption.",
  ].join(" ");
}

/**
 * Pluggable desk call. Live Grok, OpenAI, and Anthropic adapters share one shape.
 * Missing keys, a hit cap, or a failed call fall back to the scripted desk so the floor can finish.
 */
export async function speak(store: StudioStore, request: LlmRequest): Promise<LlmResult> {
  const configs = providerConfigs();
  const config = configs[request.agent.provider];
  const month = monthKeyCt();

  const forceMock = process.env.COZY_FORCE_MOCK === "1" || process.env.COZY_FORCE_MOCK === "true";
  if (forceMock || !config.apiKey) {
    const why = forceMock
      ? "COZY_FORCE_MOCK is set. Mock desk."
      : `No ${config.keyName}. Mock desk.`;
    await store.setAgentStatus(request.agent.id, "mock", why);
    return mockResult(request, forceMock ? "Mock desk forced." : `Mock desk. Set ${config.keyName} to use ${config.label}.`);
  }

  const spent = await store.monthSpend(config.id, month);
  const reserve = estimateCost(config.model, 1500, 400);
  if (spent >= config.monthlyCapUsd || spent + reserve > config.monthlyCapUsd) {
    await store.setAgentStatus(
      request.agent.id,
      "capped",
      `Monthly cap $${config.monthlyCapUsd.toFixed(2)} reached ($${spent.toFixed(4)} logged). Mock desk is covering.`,
    );
    return mockResult(request, `Spend cap reached for ${config.label}. Mock desk used.`);
  }

  await store.setAgentStatus(request.agent.id, "working", request.purpose);
  try {
    const live = await callLive(config, request);
    await store.addSpend({
      id: crypto.randomUUID(),
      provider: config.id,
      agentName: request.agent.name,
      monthKey: month,
      costUsd: live.costUsd,
      purpose: request.purpose,
      createdAt: new Date().toISOString(),
    });
    const after = spent + live.costUsd;
    const status = after >= config.monthlyCapUsd ? "capped" : "ready";
    const detail =
      status === "capped"
        ? `Cap reached after this call ($${after.toFixed(4)} of $${config.monthlyCapUsd.toFixed(2)}).`
        : `${config.model} · $${after.toFixed(4)} of $${config.monthlyCapUsd.toFixed(2)} this month`;
    await store.setAgentStatus(request.agent.id, status, detail);
    return live;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live call failed";
    await store.setAgentStatus(request.agent.id, "fallback", message.slice(0, 240));
    return mockResult(request, `Live call failed (${message.slice(0, 180)}). Mock desk used.`);
  }
}

function mockResult(request: LlmRequest, note: string): LlmResult {
  return {
    text: request.fallbackText,
    provider: "mock",
    model: "mock-floor",
    costUsd: 0,
    mock: true,
    note,
  };
}

async function callLive(config: ProviderConfig, request: LlmRequest): Promise<LlmResult> {
  const system = systemFor(request.agent);
  const controller = AbortSignal.timeout(30_000);
  if (config.id === "anthropic") {
    const response = await fetch(config.endpoint, {
      method: "POST",
      signal: controller,
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 700,
        system,
        messages: [{ role: "user", content: request.user }],
      }),
    });
    const payload = (await response.json()) as {
      error?: { message?: string };
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    if (!response.ok) {
      throw new Error(payload.error?.message || `Anthropic HTTP ${response.status}`);
    }
    const text = (payload.content ?? []).map((block) => block.text ?? "").join("\n").trim();
    if (!text) throw new Error("Anthropic returned an empty desk note.");
    const inputTokens = payload.usage?.input_tokens ?? Math.ceil((system.length + request.user.length) / 4);
    const outputTokens = payload.usage?.output_tokens ?? Math.ceil(text.length / 4);
    return {
      text: text.slice(0, 1500),
      provider: config.id,
      model: config.model,
      costUsd: roundCost(estimateCost(config.model, inputTokens, outputTokens)),
      mock: false,
      note: "",
    };
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    signal: controller,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: request.user },
      ],
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || `${config.label} HTTP ${response.status}`);
  }
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error(`${config.label} returned an empty desk note.`);
  const inputTokens = payload.usage?.prompt_tokens ?? Math.ceil((system.length + request.user.length) / 4);
  const outputTokens = payload.usage?.completion_tokens ?? Math.ceil(text.length / 4);
  return {
    text: text.slice(0, 1500),
    provider: config.id,
    model: config.model,
    costUsd: roundCost(estimateCost(config.model, inputTokens, outputTokens)),
    mock: false,
    note: "",
  };
}

function roundCost(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function promptFor(agentId: string, task: string, ctxSummary: string): string {
  const agent = agentById(agentId);
  const extra =
    agentId === "trend-scout"
      ? `\n\n${formatReferencesBlock()}`
      : agentId === "culture-desk"
        ? `\n\n${WHAT_WE_ARE_NOT}`
        : "";
  return `Task: ${task}\nDesk: ${agent.name}, ${agent.role}.\n\n${ctxSummary}${extra}\n\nReply with the desk note only. Do not claim guaranteed virality.`;
}

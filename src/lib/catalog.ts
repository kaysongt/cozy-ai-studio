export const HOUSE_THEMES = ["Black characters", "Black issues", "Finance"] as const;

export const VIDEO_TYPES = [
  { id: "skit", label: "Short skit" },
  { id: "explainer", label: "Explainer" },
  { id: "talking-head", label: "Talking head" },
  { id: "animation", label: "Animated short" },
  { id: "documentary", label: "Documentary bite" },
  { id: "ad", label: "Ad" },
  { id: "tutorial", label: "Tutorial" },
  { id: "other", label: "Other" },
] as const;

export const PLATFORMS = [
  { id: "tiktok", label: "TikTok" },
  { id: "reels", label: "Instagram Reels" },
  { id: "shorts", label: "YouTube Shorts" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X" },
] as const;

export type VideoTypeId = (typeof VIDEO_TYPES)[number]["id"];
export type PlatformId = (typeof PLATFORMS)[number]["id"];

export function videoTypeLabel(id: string): string {
  return VIDEO_TYPES.find((item) => item.id === id)?.label ?? id;
}

export function platformLabel(id: string): string {
  return PLATFORMS.find((item) => item.id === id)?.label ?? id;
}

export interface ParsedBrief {
  title: string;
  videoType: VideoTypeId;
  goal: string;
  platform: PlatformId;
  mustGoViral: boolean;
  topic: string;
  themes: string[];
  themeNotes: string;
  simulateGateMiss: boolean;
}

export function parseBrief(input: unknown): { ok: true; value: ParsedBrief } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Brief has to be an object." };
  }
  const body = input as Record<string, unknown>;
  const videoType = String(body.videoType ?? "");
  const platform = String(body.platform ?? "");
  if (!VIDEO_TYPES.some((item) => item.id === videoType)) {
    return { ok: false, error: "Pick a video type." };
  }
  if (!PLATFORMS.some((item) => item.id === platform)) {
    return { ok: false, error: "Pick a platform." };
  }
  const topic = clean(body.topic, 500);
  const goal = clean(body.goal, 400);
  if (topic.length < 8) return { ok: false, error: "Topic needs at least a sentence." };
  if (goal.length < 8) return { ok: false, error: "Goal needs at least a sentence." };
  const titleRaw = clean(body.title, 120);
  const title = titleRaw || topic.slice(0, 80);
  const themes = Array.isArray(body.themes)
    ? body.themes
        .map((item) => clean(item, 40))
        .filter(Boolean)
        .slice(0, 12)
    : [...HOUSE_THEMES];
  return {
    ok: true,
    value: {
      title,
      videoType: videoType as VideoTypeId,
      goal,
      platform: platform as PlatformId,
      mustGoViral: Boolean(body.mustGoViral),
      topic,
      themes,
      themeNotes: clean(body.themeNotes, 500),
      simulateGateMiss: Boolean(body.simulateGateMiss),
    },
  };
}

function clean(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export const VIRAL_DISCLAIMER =
  "This score measures viral-readiness against a checklist. It is not a prediction and not a guarantee of virality, reach, or revenue.";

export type FactKind = "sourced_fact" | "hypothetical" | "money_claim";

export interface FactClaim {
  claim: string;
  source: string | null;
  kind: FactKind;
}

export type AudioLicense = "original" | "cc0" | "licensed" | "unknown" | "copyrighted";

export interface ViralPackage {
  hookDurationMs: number;
  hookText: string;
  /** The first beat of the cut. The gate requires `pain_point`. */
  openingBeat: string;
  caption: string;
  portrayalRespectful: boolean;
  stereotypeFlags: string[];
  cultureDeskSignedOff: boolean;
  facts: FactClaim[];
  mediaOriginal: boolean;
  audioLicense: AudioLicense;
  /** Hour in America/Chicago. The gate allows 9 or 18, on the hour. */
  scheduledHourCt: number;
  scheduledMinuteCt: number;
}

export type ViralCheckId =
  | "hook_speed"
  | "pain_point_first"
  | "caption_shape"
  | "facts_and_respect"
  | "original_media"
  | "schedule_window";

export interface ViralCheck {
  id: ViralCheckId;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ViralGateResult {
  passed: boolean;
  /** 0–100 checklist score. Not a forecast. */
  score: number;
  checks: ViralCheck[];
  disclaimer: string;
}

export function evaluateViralGate(pkg: ViralPackage): ViralGateResult {
  const checks: ViralCheck[] = [
    hookCheck(pkg),
    painCheck(pkg),
    captionCheck(pkg),
    factsCheck(pkg),
    mediaCheck(pkg),
    scheduleCheck(pkg),
  ];
  const passedCount = checks.filter((check) => check.passed).length;
  return {
    passed: passedCount === checks.length,
    score: Math.round((passedCount / checks.length) * 100),
    checks,
    disclaimer: VIRAL_DISCLAIMER,
  };
}

function hookCheck(pkg: ViralPackage): ViralCheck {
  const passed = pkg.hookText.trim().length > 0 && pkg.hookDurationMs > 0 && pkg.hookDurationMs <= 500;
  return {
    id: "hook_speed",
    label: "Hook lands within 0.5s",
    passed,
    detail: passed
      ? `Hook lands at ${pkg.hookDurationMs}ms.`
      : `The hook has to be a real line and land within 500ms. Got ${pkg.hookDurationMs}ms${pkg.hookText.trim() ? "" : ", and the hook text is empty"}.`,
  };
}

function painCheck(pkg: ViralPackage): ViralCheck {
  const passed = pkg.openingBeat === "pain_point";
  return {
    id: "pain_point_first",
    label: "Relatable pain point comes first",
    passed,
    detail: passed
      ? "Opening beat is a pain point."
      : `Opening beat is "${pkg.openingBeat || "unset"}". The first beat has to be a relatable pain point.`,
  };
}

export function captionShape(caption: string): { lines: string[]; hashtags: string[]; ok: boolean; detail: string } {
  const lines = caption.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const hashtags = caption.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  const lineOk = lines.length >= 1 && lines.length <= 2;
  const tagOk = hashtags.length <= 5;
  const ok = lineOk && tagOk;
  const detail = ok
    ? `Caption is ${lines.length} line${lines.length === 1 ? "" : "s"} with ${hashtags.length} hashtag${hashtags.length === 1 ? "" : "s"}.`
    : `Caption must be 1–2 lines and at most 5 hashtags. Got ${lines.length} line${lines.length === 1 ? "" : "s"} and ${hashtags.length} hashtag${hashtags.length === 1 ? "" : "s"}.`;
  return { lines, hashtags, ok, detail };
}

function captionCheck(pkg: ViralPackage): ViralCheck {
  const shape = captionShape(pkg.caption);
  return {
    id: "caption_shape",
    label: "Caption is 1–2 lines, ≤5 hashtags",
    passed: shape.ok,
    detail: shape.detail,
  };
}

function factsCheck(pkg: ViralPackage): ViralCheck {
  const reasons: string[] = [];
  if (!pkg.portrayalRespectful) reasons.push("portrayal is not marked respectful");
  if (pkg.stereotypeFlags.length > 0) reasons.push(`stereotype flags: ${pkg.stereotypeFlags.join("; ")}`);
  if (!pkg.cultureDeskSignedOff) reasons.push("Culture Desk has not signed off");
  const unsourced = pkg.facts.filter((fact) => fact.kind !== "hypothetical" && !fact.source?.trim());
  const unsourcedMoney = unsourced.filter((fact) => fact.kind === "money_claim");
  if (unsourcedMoney.length > 0) {
    reasons.push(`money claim missing a source: ${unsourcedMoney.map((fact) => fact.claim).join(" | ")}`);
  } else if (unsourced.length > 0) {
    reasons.push(`fact missing a source: ${unsourced.map((fact) => fact.claim).join(" | ")}`);
  }
  const passed = reasons.length === 0;
  return {
    id: "facts_and_respect",
    label: "Facts sourced, portrayal respectful",
    passed,
    detail: passed
      ? "Culture Desk signed off, no stereotype flags, and every non-hypothetical claim has a source."
      : reasons.join(". ") + ".",
  };
}

function mediaCheck(pkg: ViralPackage): ViralCheck {
  const licenseOk = pkg.audioLicense === "original" || pkg.audioLicense === "cc0";
  const passed = pkg.mediaOriginal && licenseOk;
  return {
    id: "original_media",
    label: "Original media, CC0 or original audio",
    passed,
    detail: passed
      ? `Media is original. Audio license: ${pkg.audioLicense}.`
      : `Media must be original and audio must be CC0 or original. Got original=${pkg.mediaOriginal}, audio=${pkg.audioLicense}.`,
  };
}

function scheduleCheck(pkg: ViralPackage): ViralCheck {
  const passed = (pkg.scheduledHourCt === 9 || pkg.scheduledHourCt === 18) && pkg.scheduledMinuteCt === 0;
  const shown = `${String(pkg.scheduledHourCt).padStart(2, "0")}:${String(pkg.scheduledMinuteCt).padStart(2, "0")} CT`;
  return {
    id: "schedule_window",
    label: "Scheduled for 9:00 AM or 6:00 PM CT",
    passed,
    detail: passed
      ? `Scheduled at ${shown}.`
      : `Posting window is 9:00 AM or 6:00 PM CT exactly. Got ${shown}.`,
  };
}

import type { BriefContext } from "@/lib/floor/context";
import type { ViralGateResult } from "@/lib/viral/gate";

export function trendCopy(ctx: BriefContext): string {
  const feedback = ctx.feedback[0]
    ? `Performance left this for Research: ${ctx.feedback[0]}`
    : "No performance loop on file yet. Scouting cold.";
  return [
    `Platform is ${ctx.platformLabel}. The brief wants: ${ctx.goal}`,
    `The repeatable moment is not a hashtag. It is the second someone sees the number change: "${ctx.hookText}"`,
    "Posting windows that satisfy the gate are 9:00 AM CT and 6:00 PM CT. I will not invent a virality score.",
    feedback,
  ].join(" ");
}

export function cultureResearch(ctx: BriefContext): string {
  if (ctx.flags.length > 0 && ctx.revision === 0) {
    return `Preliminary read, not a sign-off. The brief uses language I will not approve on screen (${ctx.flags.join("; ")}). The cut has to be a named person and a specific document. I will not read the raw wording into the room.`;
  }
  if (ctx.flags.length > 0) {
    return `Revision ${ctx.revision}. The original brief had language we are not filming (${ctx.flags.join("; ")}). This pass keeps ${ctx.cast.name}, ${ctx.cast.role} in ${ctx.cast.city}, and the paperwork. I am ready to sign if the locked cut stays there.`;
  }
  const house = ctx.themes.includes("Black characters") || ctx.themes.includes("Black issues");
  const theme = house
    ? `${ctx.cast.name} is a ${ctx.cast.role} in ${ctx.cast.city}, not a stand-in for a people. If the brief touches a Black issue, it is the price or the rule in front of them.`
    : `The brief did not ask for the house themes. We will not invent an identity. ${ctx.cast.name} is a ${ctx.cast.role} in ${ctx.cast.city}.`;
  return `Preliminary read. ${theme} Pain is situational. No dialect costume, no monolith, scene numbers labeled hypothetical. Sign-off waits for the locked cut.`;
}

export function showrunnerOpen(ctx: BriefContext): string {
  const viral = ctx.mustGoViral
    ? "This one must clear the viral-readiness gate or it comes back to this room. That is a gate, not a promise that it will travel."
    : "The viral gate is advisory on this brief. A miss can still ship as conditional, and conditional is not a promise either.";
  const themes = ctx.themes.length > 0 ? ctx.themes.join(", ") : "none — follow the topic, do not invent a theme";
  return `Brief is on the table. ${ctx.speechTopic}. Type: ${ctx.videoTypeLabel}. Platform: ${ctx.platformLabel}. Themes: ${themes}. ${viral} ${ctx.feedback[0] ? `Research is carrying a performance note: ${ctx.feedback[0]}` : "Research has no prior performance note."}`;
}

export function pitchImani(ctx: BriefContext): string {
  return [
    `Open on ${ctx.cast.visual}. No logo. No greeting.`,
    `The hook is on screen before a half-second is gone: "${ctx.hookText}" I have it timed at 420ms, text plus the object, not a speech.`,
    `Then ${ctx.cast.name}, ${ctx.cast.role} in ${ctx.cast.city}, says the pain in one line: "${ctx.pain}"`,
    `Goal on the brief: ${ctx.goal}`,
    "I am not promising this travels. I am promising the first frame is a problem someone already has.",
  ].join(" ");
}

export function pitchMarcus(ctx: BriefContext): string {
  return [
    `${ctx.cast.name} wants ${ctx.cast.want}. The contradiction is the scene: ${ctx.cast.contradiction}.`,
    `We stay in ${ctx.cast.city}. We do not cut to a street to prove anything.`,
    `Avoid: ${ctx.cast.avoid.join("; ")}.`,
    `If the culture desk flinched at the brief, the flinch wins. We shoot the job and the paper, not the wording that got stopped.`,
    "My pitch loses to Imani's if the hook is really at 420ms. I will not trade character for a colder open.",
  ].join(" ");
}

export function pitchJune(ctx: BriefContext): string {
  return [
    `One general money sentence, and it keeps its source: ${ctx.fact.claim} Source: ${ctx.fact.source}.`,
    ctx.hypothetical.claim,
    "Nothing else numeric is a fact. If a writer wants a national average, they bring a URL or they cut the line.",
    `The ask at the end is sayable: "${ctx.action}"`,
    "I will vote against any lock that makes the character the source of a statistic.",
  ].join(" ");
}

export function critiqueMarcusOnImani(ctx: BriefContext): string {
  return `Imani's hook is the right open — "${ctx.hookText}" — if the object is in frame and the sentence is not doing costume work. ${ctx.cast.name} is a ${ctx.cast.role}. ${ctx.cast.visual.split(",")[0]} is enough setting. Do not dress the room as a lesson about struggle. And do not let the topic's worst word get spoken just because it was typed.`;
}

export function critiqueJuneOnMarcus(ctx: BriefContext): string {
  return `Marcus kept the person specific, which is the only way the finance line survives. I still want the sourced sentence in the second beat, not as a caption afterthought. ${ctx.fact.claim} If that sentence cannot carry ${ctx.fact.source}, it does not air. Her paperwork stays hypothetical.`;
}

export function critiqueImaniOnJune(ctx: BriefContext): string {
  return `June is right about the source and wrong about the order if the definition goes first. The half-second belongs to the pain: "${ctx.pain}" The CFPB or FDIC or Investor.gov line can be beat two. If we open on a glossary, we already missed the gate and we still have not promised anyone a view.`;
}

export function voteImani(ctx: BriefContext): string {
  return `VOTE: Imani Cole\nMy hook, Marcus's guardrails, June's sourced sentence. ${ctx.cast.name} does not become a statistic.`;
}

export function voteMarcus(): string {
  return "VOTE: Imani Cole\nThe 420ms open is the one that satisfies the gate. I am in if the character notes are locked in the bible, not left in this transcript.";
}

export function voteJune(): string {
  return "VOTE: Imani Cole\nOnly with the money claim sourced and the scene number marked hypothetical. I am not voting for a vibe.";
}

export function lockLine(ctx: BriefContext, winner: string, tally: string): string {
  return `Locked around ${winner}. Tally: ${tally}. We shoot the hook at 420ms ("${ctx.hookText}"), pain first, ${ctx.cast.name} stays a ${ctx.cast.role} in ${ctx.cast.city}, and the only general money sentence keeps its source. Scene figures stay hypothetical. I am not calling this viral. I am calling it ready to face the gate.`;
}

export function bibleNote(ctx: BriefContext): string {
  return `Bible locked for ${ctx.cast.name}. Later desks do not change the job, the city, or the avoid-list. Sensitivity notes are part of the canon, not a footnote.`;
}

export function financeBody(ctx: BriefContext): string {
  return [
    "Finance desk, claim by claim.",
    `Money claim: ${ctx.fact.claim}`,
    `Source: ${ctx.fact.source}`,
    `Hypothetical: ${ctx.hypothetical.claim}`,
    "No other number in the locked cut is allowed to pose as a national fact.",
  ].join("\n");
}

export function qcLine(gate: ViralGateResult, decision: string, forced: boolean): string {
  if (forced) {
    return `Demo override. Checklist score is ${gate.score} and the checks themselves are what they are. I am sending a must-go-viral brief back once so the loop is visible on the board. ${gate.disclaimer}`;
  }
  const missed = gate.checks.filter((check) => !check.passed).map((check) => check.label);
  if (gate.passed) {
    return `Gate score ${gate.score}. Decision: ${decision}. ${gate.disclaimer}`;
  }
  return `Gate score ${gate.score}. Missed: ${missed.join(", ") || "see checks"}. Decision: ${decision}. ${gate.disclaimer}`;
}

export function performanceFeedback(title: string, holdRate: number): string {
  const pct = Math.round(holdRate * 100);
  return `Simulated hold ${pct}% on “${title}”. Research should keep the paper-in-hand open and cut any line that explains before the pain. These numbers are simulated, not platform analytics, and they are not a virality result.`;
}

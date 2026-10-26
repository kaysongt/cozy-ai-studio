import { platformLabel, videoTypeLabel } from "@/lib/catalog";
import type { FactClaim, ViralPackage } from "@/lib/viral/gate";

export const RUNTIME_SECONDS = 28;

export interface CastMember {
  name: string;
  age: number;
  role: string;
  city: string;
  want: string;
  contradiction: string;
  visual: string;
  avoid: string[];
}

const HOUSE_CAST: CastMember[] = [
  {
    name: "Denise Harper",
    age: 38,
    role: "transit scheduler",
    city: "Houston",
    want: "a closing figure that matches the payment she was quoted",
    contradiction: "calm in a control room, exacting with a form",
    visual: "kitchen at 6:12am, transit uniform on the chair, one lamp, a loan estimate in her hand",
    avoid: ["poverty set dressing", "dialect as costume", "a narrator she did not invite"],
  },
  {
    name: "Malik Adeyemi",
    age: 24,
    role: "HVAC apprentice",
    city: "Columbus",
    want: "overtime that stays overtime, not a fee that eats Thursday",
    contradiction: "good with machines, impatient with fine print",
    visual: "a work van at dawn, a folded loan slip on the dash, coffee going cold",
    avoid: ["a street montage", "a lecture about poor choices", "slang as a costume"],
  },
  {
    name: "Carmen Whitfield",
    age: 41,
    role: "hospital pharmacist",
    city: "Detroit",
    want: "the card balance and the retirement match in the same honest sentence",
    contradiction: "precise at work, tempted to pay only the minimum at home",
    visual: "break room, badge still on, a statement folded once",
    avoid: ["a tragedy score", "a monolith of 'the community'", "unsourced national averages in her mouth"],
  },
  {
    name: "Andre Baptiste",
    age: 45,
    role: "band director",
    city: "New Orleans",
    want: "the instrument fee paid without emptying the emergency envelope",
    contradiction: "will fund the kids' sound before he funds his own cushion",
    visual: "a band room after rehearsal, one parent, a trip deposit and a labeled envelope",
    avoid: ["struggle-porn bleachers", "a saint or a cautionary tale", "music-rights we do not own"],
  },
];

const OPEN_CAST: CastMember[] = [
  {
    name: "Elena Voss",
    age: 36,
    role: "municipal accountant",
    city: "Milwaukee",
    want: "a fee schedule she can explain without a glossary",
    contradiction: "files everyone else's numbers and postpones her own",
    visual: "a dining table, a calculator, a jacket over a chair",
    avoid: ["a stock office smile", "invented statistics"],
  },
  {
    name: "Chris Pell",
    age: 29,
    role: "rideshare mechanic",
    city: "Phoenix",
    want: "to know which repair can wait",
    contradiction: "can hear a belt going and still ignores a statement",
    visual: "a garage bay with the door half down, a bill on the toolbox",
    avoid: ["a chase scene", "unsourced prices presented as averages"],
  },
  {
    name: "Priya Raman",
    age: 33,
    role: "night-shift nurse",
    city: "Cleveland",
    want: "the overtime line to mean what the posting said",
    contradiction: "advocates for patients and signs her own paperwork too fast",
    visual: "a kitchen after a shift, shoes by the door, a pay stub",
    avoid: ["hero lighting", "a medical claim we cannot source"],
  },
];

const STEREOTYPE_PATTERNS: Array<{ re: RegExp; flag: string }> = [
  { re: /\bratchet\b/i, flag: "costume word the desk will not film" },
  { re: /\bghetto\b/i, flag: "using a place-word as a stand-in for people" },
  { re: /\bthugs?\b/i, flag: "thug is doing stereotype work" },
  { re: /\bwelfare queen\b/i, flag: "welfare-queen trope" },
  { re: /\bangry black\b/i, flag: "angry-Black trope" },
  { re: /\bexotic\b/i, flag: "exoticizing language" },
  { re: /\burban youth\b/i, flag: "“urban youth” used as a euphemism" },
];

export function scanFlags(text: string): string[] {
  return STEREOTYPE_PATTERNS.filter((pattern) => pattern.re.test(text)).map((pattern) => pattern.flag);
}

export interface BriefFields {
  topic: string;
  goal: string;
  videoType: string;
  platform: string;
  themes: string[];
  mustGoViral: boolean;
  revision: number;
}

export interface BriefContext extends BriefFields {
  videoTypeLabel: string;
  platformLabel: string;
  cast: CastMember;
  hookText: string;
  pain: string;
  action: string;
  caption: string;
  sceneDollar: string;
  commentKeyword: string;
  moneyMoment: string;
  durationSeconds: number;
  onScreenText: string;
  tags: string[];
  fact: FactClaim;
  hypothetical: FactClaim;
  flags: string[];
  feedback: string[];
  speechTopic: string;
}

const CREDIT_FACT: FactClaim = {
  claim: "Paying only the credit-card minimum leaves the rest of the balance accruing interest.",
  source: "https://www.consumerfinance.gov/consumer-tools/credit-cards/",
  kind: "money_claim",
};

const PAYDAY_FACT: FactClaim = {
  claim:
    "The Consumer Financial Protection Bureau describes payday loans as short-term, high-cost loans generally due on the borrower's next payday.",
  source: "https://www.consumerfinance.gov/consumer-tools/payday-loans/",
  kind: "money_claim",
};

const FDIC_FACT: FactClaim = {
  claim:
    "The FDIC insures deposits up to the standard maximum of $250,000 per depositor, per insured bank, for each account ownership category.",
  source: "https://www.fdic.gov/resources/deposit-insurance",
  kind: "money_claim",
};

const COMPOUND_FACT: FactClaim = {
  claim: "Compound interest is interest earned on both the money saved and the interest already earned.",
  source: "https://www.investor.gov/introduction-investing/investing-basics/glossary/compound-interest",
  kind: "sourced_fact",
};

export function makeContext(brief: BriefFields, feedback: string[]): BriefContext {
  const flags = scanFlags(`${brief.topic} ${brief.goal}`);
  const cast = castFor(brief.topic, brief.themes);
  const lines = hookFor(brief.topic, cast);
  const tags = tagsFor(brief.themes, brief.platform, brief.topic);
  const caption = `${lines.pain}\n${lines.action} Comment ${lines.commentKeyword}. ${tags.join(" ")}`.trim();
  const first = cast.name.split(" ")[0] ?? cast.name;
  return {
    ...brief,
    videoTypeLabel: videoTypeLabel(brief.videoType),
    platformLabel: platformLabel(brief.platform),
    cast,
    hookText: lines.hookText,
    pain: lines.pain,
    action: lines.action,
    caption,
    sceneDollar: lines.sceneDollar,
    commentKeyword: lines.commentKeyword,
    moneyMoment: lines.moneyMoment,
    durationSeconds: RUNTIME_SECONDS,
    onScreenText: lines.hookText,
    tags,
    fact: financeFact(brief.topic),
    hypothetical: {
      claim: `${cast.name}'s paper shows ${lines.sceneDollar}. It is a hypothetical for the story, not a national statistic.`,
      source: null,
      kind: "hypothetical",
    },
    flags,
    feedback,
    speechTopic: flags.length ? `${first}'s paperwork, which the culture desk will not quote from the raw brief` : brief.topic,
  };
}

function wantsHouse(themes: string[]): boolean {
  return themes.includes("Black characters") || themes.includes("Black issues");
}

export function castFor(topic: string, themes: string[]): CastMember {
  const pool = wantsHouse(themes) ? HOUSE_CAST : OPEN_CAST;
  const hay = topic.toLowerCase();
  const named = pool.find(
    (member) => hay.includes(member.city.toLowerCase()) || hay.includes(member.role.split(" ")[0]?.toLowerCase() ?? ""),
  );
  if (named) return named;
  return pool[hash(topic) % pool.length] ?? pool[0]!;
}

function financeFact(topic: string): FactClaim {
  const hay = topic.toLowerCase();
  if (/payday|cash advance|rollover/.test(hay)) return PAYDAY_FACT;
  if (/fdic|savings account|deposit/.test(hay)) return FDIC_FACT;
  if (/compound|invest|stock|etf|401/.test(hay)) return COMPOUND_FACT;
  return CREDIT_FACT;
}

interface StoryShape {
  hookText: string;
  pain: string;
  action: string;
  sceneDollar: string;
  commentKeyword: string;
  moneyMoment: string;
}

function hookFor(topic: string, cast: CastMember): StoryShape {
  const hay = topic.toLowerCase();
  const first = cast.name.split(" ")[0] ?? cast.name;
  const fromTopic = topic.match(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\$\d+(?:\.\d{2})?/)?.[0];
  if (/payday|rollover|cash advance/.test(hay)) {
    const sceneDollar = fromTopic ?? "$375";
    return {
      hookText: `Thursday is payday. ${sceneDollar} is also due.`,
      pain: "The loan comes due on the same day the paycheck lands.",
      action: "Ask what a rollover costs before the next one.",
      sceneDollar,
      commentKeyword: "THURSDAY",
      moneyMoment: "a debt reveal",
    };
  }
  if (/closing|quoted|mortgage|homebuyer|loan estimate|first home/.test(hay)) {
    const sceneDollar = fromTopic ?? "$4,200";
    return {
      hookText: `They quoted one number. The paper says ${sceneDollar}.`,
      pain: "The payment quoted is not the cash due at the table.",
      action: "Ask which fees are lender charges before you sign.",
      sceneDollar,
      commentKeyword: "CLOSING",
      moneyMoment: "a first home",
    };
  }
  if (/emergency|band|trip|instrument|secret/.test(hay)) {
    const sceneDollar = fromTopic ?? "$180";
    return {
      hookText: `The trip wants ${sceneDollar}. That envelope was not for a trip.`,
      pain: "A school fee and an emergency fund are not the same pile of money.",
      action: "Name which bill can wait before you touch savings.",
      sceneDollar,
      commentKeyword: "ENVELOPE",
      moneyMoment: "a family money secret",
    };
  }
  const sceneDollar = fromTopic ?? "$240";
  return {
    hookText: `${sceneDollar} is already on ${first}'s paper.`,
    pain: `${first} is paying for this before anyone explains it.`,
    action: "Start with the part that already costs something.",
    sceneDollar,
    commentKeyword: "PAPER",
    moneyMoment: "a money moment",
  };
}

function tagsFor(themes: string[], platform: string, topic: string): string[] {
  const tags: string[] = [];
  const hay = topic.toLowerCase();
  if (/payday|loan|rollover/.test(hay)) tags.push("#PaydayMath");
  else if (/closing|mortgage|home/.test(hay)) tags.push("#ClosingCosts");
  else if (/emergency|fund|savings/.test(hay)) tags.push("#EmergencyFund");
  else tags.push("#ReadThePaper");
  if (themes.includes("Finance") || /money|fee|loan|pay|fund|cost|tax|credit/.test(hay)) tags.push("#MoneyTalk");
  if (themes.includes("Black characters") || themes.includes("Black issues")) tags.push("#BlackStories");
  const platformTag: Record<string, string> = {
    tiktok: "#TikTok",
    reels: "#Reels",
    shorts: "#Shorts",
    youtube: "#YouTube",
    x: "#OnX",
  };
  const extra = platformTag[platform];
  if (extra) tags.push(extra);
  return tags.slice(0, 4);
}

export function toViralPackage(
  ctx: BriefContext,
  slot: { hourCt: number; minuteCt: number },
): ViralPackage {
  const blocked = ctx.revision === 0 && ctx.flags.length > 0;
  return {
    hookDurationMs: 420,
    hookText: ctx.hookText,
    openingBeat: "pain_point",
    firstLine: ctx.hookText,
    onScreenText: ctx.onScreenText,
    recurringCharacter: ctx.cast.name,
    commentKeyword: ctx.commentKeyword,
    durationSeconds: ctx.durationSeconds,
    caption: ctx.caption,
    portrayalRespectful: !blocked,
    stereotypeFlags: blocked ? ctx.flags : [],
    cultureDeskSignedOff: !blocked,
    facts: [ctx.fact, ctx.hypothetical],
    mediaOriginal: true,
    audioLicense: "original",
    scheduledHourCt: slot.hourCt,
    scheduledMinuteCt: slot.minuteCt,
  };
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

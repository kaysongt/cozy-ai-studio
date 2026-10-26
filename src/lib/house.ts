/**
 * House defaults from Cozy Digital's Facebook-bot notes.
 * A shape to aim at. Not a forecast, and not a claim that a cut will travel.
 */

export const HOUSE_SHAPE = [
  "What has been working is an AI micro-drama with a Black lead, when the brief keeps those themes, built on one money moment: a debt reveal, a family money secret, or a first home.",
  "Open on a hard emotional line and put a specific dollar figure on screen. That dollar is the character's own paper, a hypothetical, unless a source is named.",
  "Keep one recurring character.",
  "End with a comment keyword.",
  "Working length is 15–45 seconds, and the hook is the first line.",
  "Any video type is still allowed. This shape is the default, not a promise of reach.",
].join(" ");

export const WHAT_WE_ARE_NOT =
  "What we're not: stereotyped or degrading AI portrayals of Black people. No costume, no monolith, no dialect as a joke, no poverty set used as the point.";

export const FORMAT_REFERENCES = [
  "Ogun Studios viral AI drama case study",
  "Rich & Regular",
  "Budgetnista",
  "Rahkim Sabree",
  "Journey to Launch",
] as const;

export const FORMAT_REFERENCES_LABEL = "References only";

export const FORMAT_REFERENCES_NOTE =
  "References only. They are not sources, not partners, and not proof a cut will travel. Do not copy a portrayal from them. Do not claim their results.";

export function formatReferencesBlock(): string {
  return `${FORMAT_REFERENCES_LABEL}. ${FORMAT_REFERENCES_NOTE} Names: ${FORMAT_REFERENCES.join("; ")}.`;
}

/** Groups the floor may be aimed at later. Filing a brief does not post into them. */
export const FACEBOOK_DISTRIBUTION_LIST = [
  "Meta Elevate HQ",
  "Black Creatives in AI",
  "DFW Black Owned Businesses",
  "Support Black Owned Business",
  "Black Business Owners Network",
] as const;

export const FACEBOOK_LIST_NOTE =
  "House Facebook list. Saved on the floor. The studio does not post into these groups.";

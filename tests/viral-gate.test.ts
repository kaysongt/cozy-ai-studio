import { describe, expect, it } from "vitest";
import { makeContext, toViralPackage } from "@/lib/floor/context";
import { HOUSE_THEMES } from "@/lib/catalog";
import { evaluateViralGate, VIRAL_DISCLAIMER, type ViralPackage } from "@/lib/viral/gate";

function good(overrides: Partial<ViralPackage> = {}): ViralPackage {
  return {
    hookDurationMs: 420,
    hookText: "They quoted one number. The paper says $4,200.",
    firstLine: "They quoted one number. The paper says $4,200.",
    onScreenText: "They quoted one number. The paper says $4,200.",
    recurringCharacter: "Denise Harper",
    commentKeyword: "CLOSING",
    durationSeconds: 28,
    openingBeat: "pain_point",
    caption:
      "The payment quoted is not the cash due at the table.\nAsk which fees are lender charges before you sign. Comment CLOSING. #ClosingCosts #MoneyTalk #BlackStories",
    portrayalRespectful: true,
    stereotypeFlags: [],
    cultureDeskSignedOff: true,
    facts: [
      {
        claim: "Paying only the credit-card minimum leaves the rest of the balance accruing interest.",
        source: "https://www.consumerfinance.gov/consumer-tools/credit-cards/",
        kind: "money_claim",
      },
      {
        claim: "Her paperwork shows a figure. It is a hypothetical, not a national statistic.",
        source: null,
        kind: "hypothetical",
      },
    ],
    mediaOriginal: true,
    audioLicense: "original",
    scheduledHourCt: 9,
    scheduledMinuteCt: 0,
    ...overrides,
  };
}

describe("viral readiness gate", () => {
  it("passes a clean package and refuses to promise virality", () => {
    const result = evaluateViralGate(good());
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.checks).toHaveLength(11);
    expect(result.disclaimer).toBe(VIRAL_DISCLAIMER);
    expect(result.disclaimer.toLowerCase()).toContain("not a prediction");
    expect(result.disclaimer.toLowerCase()).toContain("not a guarantee of virality");
    expect(result.disclaimer.toLowerCase()).not.toContain("will go viral");
  });

  it("requires the hook to land within 500ms", () => {
    expect(evaluateViralGate(good({ hookDurationMs: 500 })).checks[0]?.passed).toBe(true);
    expect(evaluateViralGate(good({ hookDurationMs: 501 })).passed).toBe(false);
    expect(evaluateViralGate(good({ hookDurationMs: 0 })).passed).toBe(false);
    expect(evaluateViralGate(good({ hookText: "   " })).passed).toBe(false);
  });

  it("requires a pain point first", () => {
    const result = evaluateViralGate(good({ openingBeat: "greeting" }));
    const check = result.checks.find((item) => item.id === "pain_point_first");
    expect(check?.passed).toBe(false);
    expect(result.score).toBe(91);
  });

  it("limits the caption to 1–2 lines and 5 hashtags", () => {
    const five =
      "The payment quoted is not the cash due.\nAsk before you sign. Comment CLOSING. #One #Two #Three #Four #Five";
    expect(evaluateViralGate(good({ caption: five })).passed).toBe(true);
    const six =
      "The payment quoted is not the cash due.\nAsk before you sign. Comment CLOSING. #One #Two #Three #Four #Five #Six";
    expect(evaluateViralGate(good({ caption: six })).passed).toBe(false);
    expect(evaluateViralGate(good({ caption: "The paper is wrong. Comment CLOSING #One" })).passed).toBe(true);
    expect(evaluateViralGate(good({ caption: "One\nTwo\nThree" })).passed).toBe(false);
    expect(evaluateViralGate(good({ caption: "" })).passed).toBe(false);
    expect(evaluateViralGate(good({ caption: "The paper is wrong.\r\n\r\nComment CLOSING #Tag" })).passed).toBe(true);
  });

  it("requires sources on money claims and a respectful sign-off", () => {
    const missing = evaluateViralGate(
      good({
        facts: [
          { claim: "Everyone pays 40% interest.", source: null, kind: "money_claim" },
          { claim: "Her slip shows $80.", source: null, kind: "hypothetical" },
        ],
      }),
    );
    expect(missing.passed).toBe(false);
    expect(missing.checks.find((item) => item.id === "facts_and_respect")?.detail.toLowerCase()).toContain("source");

    const hypotheticalOnly = evaluateViralGate(
      good({
        facts: [{ claim: "Her own estimate shows a number.", source: "  ", kind: "hypothetical" }],
      }),
    );
    expect(hypotheticalOnly.checks.find((item) => item.id === "facts_and_respect")?.passed).toBe(true);

    expect(evaluateViralGate(good({ portrayalRespectful: false })).passed).toBe(false);
    expect(evaluateViralGate(good({ stereotypeFlags: ["costume word"] })).passed).toBe(false);
    expect(evaluateViralGate(good({ cultureDeskSignedOff: false })).passed).toBe(false);
    expect(
      evaluateViralGate(
        good({
          facts: [{ claim: "A general claim with no source.", source: "", kind: "sourced_fact" }],
        }),
      ).passed,
    ).toBe(false);
  });

  it("requires original media and CC0 or original audio", () => {
    expect(evaluateViralGate(good({ audioLicense: "cc0" })).passed).toBe(true);
    expect(evaluateViralGate(good({ audioLicense: "licensed" })).passed).toBe(false);
    expect(evaluateViralGate(good({ audioLicense: "copyrighted" })).passed).toBe(false);
    expect(evaluateViralGate(good({ mediaOriginal: false })).passed).toBe(false);
  });

  it("requires a hard first line, a dollar, one character, a comment keyword, and 15–45s", () => {
    expect(evaluateViralGate(good({ firstLine: "Welcome to the channel" })).checks.find((item) => item.id === "hook_first_line")?.passed).toBe(false);
    expect(evaluateViralGate(good({ firstLine: "Let me explain closing costs" })).checks.find((item) => item.id === "hook_first_line")?.passed).toBe(false);
    expect(evaluateViralGate(good({ hookText: "Hey, so today we talk money", firstLine: "Hey, so today we talk money" })).checks.find((item) => item.id === "hook_first_line")?.passed).toBe(false);
    expect(evaluateViralGate(good({ onScreenText: "a lot of money" })).checks.find((item) => item.id === "dollar_on_screen")?.passed).toBe(false);
    expect(evaluateViralGate(good({ onScreenText: "Cash due $4,200" })).passed).toBe(true);
    expect(evaluateViralGate(good({ recurringCharacter: "" })).passed).toBe(false);
    expect(evaluateViralGate(good({ recurringCharacter: "Denise Harper and Malik Adeyemi" })).passed).toBe(false);
    expect(evaluateViralGate(good({ commentKeyword: "CLOSING", caption: "Pain.\nComment PAPER." })).passed).toBe(false);
    expect(evaluateViralGate(good({ durationSeconds: 14 })).passed).toBe(false);
    expect(evaluateViralGate(good({ durationSeconds: 15 })).passed).toBe(true);
    expect(evaluateViralGate(good({ durationSeconds: 45 })).passed).toBe(true);
    expect(evaluateViralGate(good({ durationSeconds: 46 })).passed).toBe(false);
  });

  it("only allows 9:00 AM and 6:00 PM Central", () => {
    expect(evaluateViralGate(good({ scheduledHourCt: 18, scheduledMinuteCt: 0 })).passed).toBe(true);
    expect(evaluateViralGate(good({ scheduledHourCt: 9, scheduledMinuteCt: 30 })).passed).toBe(false);
    expect(evaluateViralGate(good({ scheduledHourCt: 10, scheduledMinuteCt: 0 })).passed).toBe(false);
    expect(evaluateViralGate(good({ scheduledHourCt: 21, scheduledMinuteCt: 0 })).passed).toBe(false);
  });

  it("accepts the studio package and blocks a flagged brief until revision", () => {
    const clean = makeContext(
      {
        topic: "A Houston transit scheduler finds the cash due at closing is not the payment she was quoted.",
        goal: "Help a first-time buyer spot lender charges before she signs.",
        videoType: "skit",
        platform: "reels",
        themes: [...HOUSE_THEMES],
        mustGoViral: true,
        revision: 0,
      },
      [],
    );
    const cleanGate = evaluateViralGate(toViralPackage(clean, { hourCt: 9, minuteCt: 0 }));
    expect(cleanGate.passed).toBe(true);
    expect(clean.hookText).toMatch(/\$[\d,]+/);
    expect(clean.caption.toLowerCase()).toContain("comment closing");
    expect(clean.cast.name).toBe("Denise Harper");
    expect(clean.moneyMoment).toBe("a first home");
    expect(clean.durationSeconds).toBeGreaterThanOrEqual(15);
    expect(clean.durationSeconds).toBeLessThanOrEqual(45);

    const flagged = makeContext(
      {
        topic: "A ghetto payday loan story",
        goal: "Explain the fee without the slur.",
        videoType: "explainer",
        platform: "shorts",
        themes: ["Finance"],
        mustGoViral: true,
        revision: 0,
      },
      [],
    );
    const blocked = evaluateViralGate(toViralPackage(flagged, { hourCt: 18, minuteCt: 0 }));
    expect(blocked.passed).toBe(false);
    expect(blocked.checks.find((item) => item.id === "facts_and_respect")?.passed).toBe(false);

    const revised = makeContext({ ...flagged, revision: 1 }, []);
    expect(evaluateViralGate(toViralPackage(revised, { hourCt: 18, minuteCt: 0 })).passed).toBe(true);
    expect(revised.caption.toLowerCase()).not.toContain("ghetto");
  });
});

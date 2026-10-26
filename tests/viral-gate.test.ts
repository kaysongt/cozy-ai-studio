import { describe, expect, it } from "vitest";
import { makeContext, toViralPackage } from "@/lib/floor/context";
import { HOUSE_THEMES } from "@/lib/catalog";
import { evaluateViralGate, VIRAL_DISCLAIMER, type ViralPackage } from "@/lib/viral/gate";

function good(overrides: Partial<ViralPackage> = {}): ViralPackage {
  return {
    hookDurationMs: 420,
    hookText: "They quoted one number. The paper says another.",
    openingBeat: "pain_point",
    caption:
      "The payment quoted is not the cash due at the table.\nAsk which fees are lender charges before you sign. #ClosingCosts #MoneyTalk #BlackStories",
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
    expect(result.checks).toHaveLength(6);
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
    expect(result.score).toBe(83);
  });

  it("limits the caption to 1–2 lines and 5 hashtags", () => {
    const five =
      "The payment quoted is not the cash due.\nAsk before you sign. #One #Two #Three #Four #Five";
    expect(evaluateViralGate(good({ caption: five })).passed).toBe(true);
    const six =
      "The payment quoted is not the cash due.\nAsk before you sign. #One #Two #Three #Four #Five #Six";
    expect(evaluateViralGate(good({ caption: six })).passed).toBe(false);
    expect(evaluateViralGate(good({ caption: "Only one line and #One tag" })).passed).toBe(true);
    expect(evaluateViralGate(good({ caption: "One\nTwo\nThree" })).passed).toBe(false);
    expect(evaluateViralGate(good({ caption: "" })).passed).toBe(false);
    expect(evaluateViralGate(good({ caption: "Line\r\n\r\nSecond #Tag" })).passed).toBe(true);
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
    expect(evaluateViralGate(toViralPackage(clean, { hourCt: 9, minuteCt: 0 })).passed).toBe(true);

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

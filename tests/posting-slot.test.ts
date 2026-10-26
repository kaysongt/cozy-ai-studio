import { describe, expect, it } from "vitest";
import { centralParts, nextPostingSlot } from "@/lib/time";

describe("Central Time posting slots", () => {
  it("picks 6:00 PM CT after a winter morning", () => {
    const slot = nextPostingSlot(new Date("2026-01-15T16:00:00.000Z"));
    expect(slot.hourCt).toBe(18);
    expect(slot.minuteCt).toBe(0);
    expect(slot.instant.toISOString()).toBe("2026-01-16T00:00:00.000Z");
    expect(centralParts(slot.instant)).toMatchObject({ hour: 18, minute: 0 });
  });

  it("picks 9:00 AM CT when that window is still ahead", () => {
    const slot = nextPostingSlot(new Date("2026-01-15T14:00:00.000Z"));
    expect(slot.hourCt).toBe(9);
    expect(slot.instant.toISOString()).toBe("2026-01-15T15:00:00.000Z");
  });

  it("picks 6:00 PM CDT in summer", () => {
    const slot = nextPostingSlot(new Date("2026-07-15T15:00:00.000Z"));
    expect(slot.hourCt).toBe(18);
    expect(slot.instant.toISOString()).toBe("2026-07-15T23:00:00.000Z");
    expect(centralParts(slot.instant).hour).toBe(18);
  });

  it("skips a window that is exactly now", () => {
    const slot = nextPostingSlot(new Date("2026-01-15T15:00:00.000Z"));
    expect(slot.instant.toISOString()).toBe("2026-01-16T00:00:00.000Z");
  });
});

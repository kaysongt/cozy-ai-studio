const TZ = "America/Chicago";

export interface CentralParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function centralParts(date: Date): CentralParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
  };
}

/** Wall-clock America/Chicago time, suitable for a signed transcript line. */
export function formatCentral(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}

export function monthKeyCt(date = new Date()): string {
  const parts = centralParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

export function stamp(date = new Date()): { utc: string; ct: string } {
  return { utc: date.toISOString(), ct: formatCentral(date) };
}

/** Convert a Chicago wall-clock time to a UTC instant. Two passes cover DST edges. */
export function chicagoWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 2; i += 1) {
    const parts = centralParts(new Date(utc));
    const got = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = desired - got;
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc);
}

export interface PostingSlot {
  instant: Date;
  hourCt: 9 | 18;
  minuteCt: 0;
  label: string;
}

/** Next 9:00 AM or 6:00 PM America/Chicago, strictly after `from`. */
export function nextPostingSlot(from = new Date()): PostingSlot {
  const parts = centralParts(from);
  const start = Date.UTC(parts.year, parts.month - 1, parts.day);
  const candidates: PostingSlot[] = [];
  for (let add = 0; add <= 3; add += 1) {
    const day = new Date(start + add * 86_400_000);
    const year = day.getUTCFullYear();
    const month = day.getUTCMonth() + 1;
    const date = day.getUTCDate();
    for (const hour of [9, 18] as const) {
      const instant = chicagoWallTimeToUtc(year, month, date, hour, 0);
      candidates.push({
        instant,
        hourCt: hour,
        minuteCt: 0,
        label: `${hour === 9 ? "9:00 AM" : "6:00 PM"} CT · ${formatCentral(instant)}`,
      });
    }
  }
  const upcoming = candidates
    .filter((slot) => slot.instant.getTime() > from.getTime())
    .sort((a, b) => a.instant.getTime() - b.instant.getTime());
  const pick = upcoming[0];
  if (!pick) throw new Error("No Central Time posting slot found.");
  return pick;
}

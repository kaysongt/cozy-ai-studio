# Cozy AI Studio

A ten-stage video floor for Cozy Digital. You file a brief. Agents research it, argue in a writers’ room, lock a character bible, and run a viral-readiness gate before anything is marked for distribution.

A passing gate means the checklist cleared. It is not a prediction, and it is not a guarantee of virality, reach, or revenue.

House defaults on a new brief are **Black characters**, **Black issues**, and **finance**. Clear them when the piece is about something else. Any video type is allowed.

## Run it

Node.js 22 or newer (the studio uses the built-in `node:sqlite` module).

```bash
cp .env.example .env
npm install
npm test
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

With no API keys, every desk is a mock. File a brief on **Brief**, leave “Run it as soon as it’s filed” on, and watch the board, the debate (signed in Central Time), the QC gate, and distribution. Seeded cards are stamped **EXAMPLE**.

Push one brief through the floor from the terminal:

```bash
npm run demo
```

The demo shares the dev server’s SQLite file. The first launch seeds three EXAMPLE briefs: one wrapped, one held mid-debate, one held after a demo QC miss.

## The floor

1. **Intake** — video type, goal, platform, topic, themes, must-clear-the-gate.
2. **Research** — Trend Scout (format references, labeled references only) and Culture Desk (accuracy, sensitivity, stereotype checks, and a “what we’re not” line against stereotyped or degrading AI portrayals of Black people).
3. **Writers’ room** — three writers pitch, critique, and vote. The showrunner locks one concept. The transcript is signed with agent name and a Central Time timestamp.
4. **Character / world bible** — Story Bible Keeper.
5. **Shot pack** — hook is the first line and lands by 500ms, a specific dollar figure on screen, one recurring character, 15–45s, pain first, caption ends with a comment keyword.
6. **Generation** — Grok Imagine and Higgsfield adapter stubs. Nothing is rendered.
7. **Edit** — original audio attestation, schedule at 9:00 AM or 6:00 PM CT.
8. **QC / GO** — Finance Fact-Checker (a source on every money claim) and the viral-readiness gate.
9. **Distribution** — Muse stub, then an optional social webhook. A Facebook list is saved and is not posted.
10. **Performance** — simulated metrics, labeled as simulated, written back to Research for the next brief.

A **must-go-viral** miss returns to the writers’ room (three times, then the brief is held for a person). A brief that is not must-go-viral can ship **conditional**. Neither path promises a hit.

The gate checks:

- hook lands within 0.5s
- the hook is the first line, and it is a hard open
- a relatable pain point is the first beat
- a specific dollar figure is on screen
- one recurring character
- the caption ends with a comment keyword
- runtime is 15–45 seconds
- caption is 1–2 lines and at most 5 hashtags
- facts are sourced and the portrayal is respectful (Culture Desk sign-off, no stereotype flags, every money claim has a source)
- media is original and audio is CC0 or original
- the post is scheduled for 9:00 AM or 6:00 PM CT exactly

Default shape, when the brief keeps the house themes: an AI micro-drama with a Black lead on one money moment (a debt reveal, a family money secret, or a first home). Trend Scout’s format references — Ogun Studios viral AI drama case study, Rich & Regular, Budgetnista, Rahkim Sabree, Journey to Launch — are labeled **references only**. They are not sources and not a result the studio claims.

The Facebook list (Meta Elevate HQ, Black Creatives in AI, DFW Black Owned Businesses, Support Black Owned Business, Black Business Owners Network) is shown on Distribution. The floor does not post into those groups.

## Desks and keys

| Desk | Person | Provider | Env key |
| --- | --- | --- | --- |
| Trend Scout | Amina Diallo | Grok (xAI) | `XAI_API_KEY` |
| Culture Desk | Ruthie Bennett | Anthropic | `ANTHROPIC_API_KEY` |
| Finance Fact-Checker | Calvin Brooks | OpenAI | `OPENAI_API_KEY` |
| Writers’ room | Imani Cole | Grok | `XAI_API_KEY` |
| Writers’ room | Marcus Hale | Anthropic | `ANTHROPIC_API_KEY` |
| Writers’ room | June Okonkwo | OpenAI | `OPENAI_API_KEY` |
| Story Bible Keeper | Nia Okeke | Anthropic | `ANTHROPIC_API_KEY` |
| Showrunner | Ellis Ward | Grok | `XAI_API_KEY` |
| QC | Sable Morris | OpenAI | `OPENAI_API_KEY` |

Each provider has a monthly USD cap (`XAI_MONTHLY_CAP_USD`, `OPENAI_MONTHLY_CAP_USD`, `ANTHROPIC_MONTHLY_CAP_USD`). The ledger is an estimate so the cap can trip. Past the cap, that provider’s desks fall back to the mock and the roster shows **capped**.

Model ids: `XAI_MODEL` (default `grok-3`), `OPENAI_MODEL` (default `gpt-4o-mini`), `ANTHROPIC_MODEL` (default `claude-sonnet-4-5`).

`COZY_FORCE_MOCK=1` ignores keys. Tests set it.

## Adapters that are still stubs

- **Grok Imagine** and **Higgsfield** implement `GenerationAdapter` and return stub receipts. They do not render and they do not download third-party footage. Higgsfield is waiting on `HIGGSFIELD_API_KEY` and `HIGGSFIELD_API_BASE_URL`. Grok Imagine is not wired to `XAI_API_KEY`.
- **Muse** implements `MuseDistributionAdapter.publish()`. Muse’s API is unknown, so the method validates the package and stores a stub. It does not invent endpoints. `MUSE_API_BASE_URL` and `MUSE_API_KEY` are reserved and unread. See the TODO in `src/lib/adapters/distribution.ts`.
- **Social webhook** POSTs the package to `SOCIAL_WEBHOOK_URL` when that variable is set.

The edit desk attests original media and an original audio bed so the gate can be exercised without a render. The job page says the picture is a stub. Do not upload a stub as a finished master.

## Data

SQLite by default, in the OS temp directory (`cozy-ai-studio/studio.db`). That file sits outside the repo so `next dev` does not reload on every write. Set `SQLITE_PATH` for a durable file, or `DATABASE_URL=postgres://…` for the Postgres driver (`src/lib/db/repository.ts`). The SQL is shared (`src/lib/db/schema.ts`). Postgres is ready to connect; this repo does not ship a database server.

## Tests

```bash
npm test
```

- `tests/pipeline-machine.test.ts` — stage order, one-step advances, must-go-viral rework and hold, conditional ship, performance loopback to Research.
- `tests/viral-gate.test.ts` — each gate check, the disclaimer, and the studio package (including a flagged brief that only clears after revision).
- `tests/posting-slot.test.ts` — 9:00 AM / 6:00 PM America/Chicago, including daylight time.
- `tests/pipeline-run.test.ts` — a full mock run, signed Central Time transcript, and a forced QC miss that returns to the writers’ room and then finishes.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dashboard on port 4317 |
| `npm test` | Vitest |
| `npm run demo` | Files a sample brief and walks it with the current desks |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

Every key name is listed in [SECRETS.md](SECRETS.md).

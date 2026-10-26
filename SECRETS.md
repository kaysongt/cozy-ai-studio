# Secrets

No secret values belong in this file or in git. Put values in `.env` (gitignored). Names and empty defaults live in `.env.example`.

| Name | Required to boot | What it is |
| --- | --- | --- |
| `XAI_API_KEY` | No | xAI key for Grok chat (`https://api.x.ai/v1/chat/completions`). Desks on the Grok provider: Trend Scout, Imani Cole, Showrunner. Blank = mock desk. |
| `OPENAI_API_KEY` | No | OpenAI key for chat completions. Desks: Finance Fact-Checker, June Okonkwo, QC. Blank = mock desk. |
| `ANTHROPIC_API_KEY` | No | Anthropic key for Messages API. Desks: Culture Desk, Marcus Hale, Story Bible Keeper. Blank = mock desk. |
| `XAI_MONTHLY_CAP_USD` | No | Soft cap in USD for the xAI ledger this Central Time month. Default `25`. At the cap, that provider falls back to the mock desk. |
| `OPENAI_MONTHLY_CAP_USD` | No | Same cap for OpenAI. Default `25`. |
| `ANTHROPIC_MONTHLY_CAP_USD` | No | Same cap for Anthropic. Default `25`. |
| `XAI_MODEL` | No | Chat model id. Default `grok-3`. |
| `OPENAI_MODEL` | No | Chat model id. Default `gpt-4o-mini`. |
| `ANTHROPIC_MODEL` | No | Chat model id. Default `claude-sonnet-4-5`. |
| `DATABASE_URL` | No | Postgres connection string (`postgres://` or `postgresql://`). When unset, the studio uses SQLite. |
| `SQLITE_PATH` | No | SQLite file path. Default is `cozy-ai-studio/studio.db` in the OS temp directory. Ignored when `DATABASE_URL` is Postgres. Do not point this at a file inside the repo while using `next dev`. |
| `SOCIAL_WEBHOOK_URL` | No | `http` or `https` URL that receives the distribution JSON. Unset = nothing is posted. |
| `MUSE_API_BASE_URL` | No | Reserved. Not read. Muse’s API is unknown; the adapter is a stub. |
| `MUSE_API_KEY` | No | Reserved. Not read. |
| `HIGGSFIELD_API_BASE_URL` | No | Reserved. Not read. Higgsfield generation is a stub. |
| `HIGGSFIELD_API_KEY` | No | Reserved. Not read. |
| `COZY_FORCE_MOCK` | No | `1` forces every desk onto the mock adapter even if keys are present. Tests set this. |

Spend figures are internal estimates from a small price table in `src/lib/adapters/llm.ts`. They are there so the cap can trip. They are not a bill from xAI, OpenAI, or Anthropic.

Grok Imagine does not use `XAI_API_KEY` yet. That adapter does not render.

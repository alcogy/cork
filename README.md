# Cork

Open-source integrated business management platform built on Cloudflare's infrastructure. Combines CRM, project management, approval workflows, WBS / Gantt progress tracking, and a no-code app builder into a single self-hostable product.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/alcogy/cork)

> **Note:** The deploy button handles Worker deployment. After clicking, follow the [post-deploy setup](#post-deploy-setup) steps to wire up D1 and R2.

## Features

| Module | Capabilities |
|---|---|
| **CRM** | Customer list/detail, activities, schedules, sticky notes, contacts, CSV export/import |
| **Projects** | Kanban board, WBS Gantt chart, file uploads (R2), members, activity log |
| **Approvals** | Multi-step approval workflows, approver setup, approve/reject with comments, file attachments (R2); submit saves draft edits in one request |
| **No-code Apps** | Drag-and-drop field builder (10 field types), record list / detail / edit / delete, publish/draft toggle, bookmarks (pinned to sidebar) |
| **Accounts** | User management (admin only), role assignment |
| **Audit Log** | Admin-only operation log; action / resource / user filters; paginated |
| **Email** | Workflow notifications (submit / approve / reject), welcome & password-change emails; supports Resend, AWS SES, SMTP |
| **i18n** | English / Japanese, switchable at runtime |

## Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit 5 (Svelte Runes) |
| Runtime | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| File storage | Cloudflare R2 |
| ORM | Drizzle ORM |
| Language | TypeScript |
| Package manager | Bun |
| Icons | @lucide/svelte |

---

## One-Command Deploy

```bash
git clone https://github.com/alcogy/cork
cd cork
bun install

# Creates D1 + R2, runs migrations, builds, deploys
bash deploy.sh

# With demo seed data (admin@example.com / admin123)
bash deploy.sh --seed
```

The script automatically:
1. Logs you in to Cloudflare (browser, first time only)
2. Creates D1 database `cork` (or reuses existing)
3. Creates R2 bucket `cork-storage` (or reuses existing)
4. Patches `wrangler.jsonc` with the real database ID
5. Runs SQL migrations on the remote D1
6. Builds and deploys the Worker

---

## Post-Deploy Setup

1. Open the Worker URL shown after deployment
2. Log in with `admin@example.com` / `admin123` (if you ran `--seed`)
3. **Change the default password** in Profile settings immediately
4. Add team members in Accounts → New account

---

## Local Development

```bash
bun install
bun run db:generate        # Generate migrations from schema
bun run db:migrate:local   # Apply to local D1
bun run db:seed            # Seed local DB
bun dev                    # → http://localhost:5173
```

Default credentials: `admin@example.com` / `admin123`

### All commands

```bash
bun dev                    # Dev server
bun run build              # Production build
bun run check              # TypeScript + svelte-check
bun run lint               # Prettier + ESLint
bun run format             # Auto-format
bun run test:unit          # Vitest
bun run test:e2e           # Playwright
bun run db:generate        # Schema → migration SQL
bun run db:migrate:local   # Local D1 migration
bun run db:migrate:remote  # Remote D1 migration
bun run db:seed            # Seed local DB
bun run db:studio          # Drizzle Studio (needs remote credentials)
```

### Local secrets (.dev.vars)

Wrangler automatically loads `.dev.vars` when running `bun dev`. This file holds secrets for local development and is **never committed to git**.

Copy the example file and fill in your values:

```bash
cp .dev.vars.example .dev.vars
```

| Variable | Required | Description |
|---|---|---|
| `EMAIL_PROVIDER` | No | Email backend: `resend` (default) \| `ses` \| `smtp` |
| `EMAIL_FROM` | No | Sender address shown on outgoing emails |
| `ALERT_EMAIL_TO` | No | Admin alert recipient for login failures etc. |
| `RESEND_API_KEY` | If using Resend | API key from [resend.com](https://resend.com) |
| `AWS_ACCESS_KEY_ID` | If using SES | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | If using SES | AWS secret key |
| `AWS_REGION` | If using SES | AWS region (e.g. `ap-northeast-1`) |
| `SMTP_API_URL` | If using SMTP | HTTP relay endpoint (MailChannels, Brevo, etc.) |
| `SMTP_API_KEY` | If using SMTP | HTTP relay API key |

> Email sending is **optional for local development**. Leave `EMAIL_FROM` empty to disable all outgoing email.

For production, set secrets via Wrangler instead of `.dev.vars`:

```bash
wrangler secret put RESEND_API_KEY
```

---

## License

MIT

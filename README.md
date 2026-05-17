# Cork

Open-source integrated business management platform built on Cloudflare's infrastructure. Combines CRM, project management, approval workflows, WBS / Gantt progress tracking, and a no-code app builder into a single self-hostable product.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/alcogy/cork)

> **Note:** The deploy button handles Worker deployment. After clicking, follow the [post-deploy setup](#post-deploy-setup) steps to wire up D1 and R2.

## Features

| Module | Capabilities |
|---|---|
| **CRM** | Customer list/detail, activities, schedules, sticky notes, contacts, CSV export/import |
| **Projects** | Kanban board, WBS Gantt chart, file uploads (R2), members, activity log |
| **Approvals** | Multi-step approval workflows, approver setup, approve/reject, comments, file attachments |
| **No-code Apps** | Drag-and-drop field builder, record management, publish/draft toggle, bookmarks |
| **Accounts** | User management (admin only), role assignment |
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

## GitHub Actions (CI/CD)

Every push to `main` triggers automatic deployment.

### Setup

1. **GitHub Secrets** — add in repo Settings → Secrets → Actions:

   | Secret | Where to find |
   |---|---|
   | `CLOUDFLARE_API_TOKEN` | [Create token](https://dash.cloudflare.com/profile/api-tokens) with Workers:Edit + D1:Edit + R2:Edit |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar |

2. **Set real database ID** in `wrangler.jsonc` after first deploy:

   ```bash
   bunx wrangler d1 list   # copy your DB's UUID
   ```

   ```jsonc
   // wrangler.jsonc
   { "d1_databases": [{ "database_id": "<your-uuid>" }] }
   ```

3. Push to `main` — GitHub Actions handles the rest.

You can also trigger manually: **Actions → Deploy to Cloudflare → Run workflow**.

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

---

## License

MIT

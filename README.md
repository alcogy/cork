# Cork

Open-source integrated business management platform built on Cloudflare's infrastructure. Combines CRM, project management, approval workflows, WBS progress tracking, and a no-code app builder into a single self-hostable product.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/alcogyinc/cork)

> **Note:** After clicking the button above, follow the [post-deploy setup](#post-deploy-setup) steps to create the D1 database and run migrations.

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

---

## One-Command Deploy (Recommended)

The fastest way to deploy Cork to your own Cloudflare account:

```bash
# Clone the repo
git clone https://github.com/alcogyinc/cork
cd cork

# Install dependencies
bun install

# Deploy (creates D1 + R2, runs migrations, deploys Worker)
bash deploy.sh

# Optional: seed with demo data (admin@example.com / admin123)
bash deploy.sh --seed
```

The script will:
1. Log you in to Cloudflare via browser (first time only)
2. Create a D1 database named `cork`
3. Create an R2 bucket named `cork-storage`
4. Update `wrangler.jsonc` with the real database ID
5. Run SQL migrations
6. Build and deploy the Worker

---

## GitHub Actions (CI/CD)

For automated deployments on every push to `main`:

### 1. Set GitHub Secrets

In your repository → **Settings → Secrets and variables → Actions**, add:

| Secret | How to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | [Create token](https://dash.cloudflare.com/profile/api-tokens) with **Workers:Edit** + **D1:Edit** + **R2:Edit** permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → right sidebar → Account ID |

### 2. Set the D1 database ID

After running `bash deploy.sh` once (or creating the DB manually), set the real `database_id` in `wrangler.jsonc`:

```bash
bunx wrangler d1 list   # find your DB ID
```

```jsonc
// wrangler.jsonc
{
  "d1_databases": [{
    "binding": "DB",
    "database_name": "cork",
    "database_id": "<your-database-id>"   // ← replace this
  }]
}
```

### 3. Push to main

Every push to `main` will automatically build, migrate, and deploy.

You can also trigger a manual deploy from **Actions → Deploy to Cloudflare → Run workflow**.

---

## Post-Deploy Setup

After first deployment:

1. Open the Worker URL in your browser
2. Log in with `admin@example.com` / `admin123` (if you used `--seed`)
3. **Change the default password immediately** in Profile settings
4. Add your team members in Accounts → New account

---

## Local Development

```bash
# Install dependencies
bun install

# Create and migrate local D1
bun run db:generate
bun run db:migrate:local

# Seed local DB
bun run db:seed

# Start dev server
bun dev
# → http://localhost:5173
# admin: admin@example.com / admin123
# user:  user@example.com  / user123
```

### Available commands

```bash
bun dev                    # Start dev server
bun run build              # Production build
bun run check              # TypeScript + svelte-check
bun run lint               # Prettier + ESLint
bun run format             # Auto-format
bun run test:unit          # Vitest unit tests
bun run test:e2e           # Playwright E2E tests
bun run db:generate        # Generate migrations from schema
bun run db:migrate:local   # Apply migrations to local D1
bun run db:migrate:remote  # Apply migrations to remote D1
bun run db:seed            # Seed local DB
bun run db:studio          # Drizzle Studio (needs remote credentials)
```

---

## License

MIT

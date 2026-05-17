# Cork — Developer Guide

## Project Overview

Cork is an open-source integrated business management platform built on Cloudflare's infrastructure. It combines CRM, project management, approval workflows, progress tracking (WBS), and a no-code app builder into a single self-hostable product.

**Positioning**: CRM/SFA-centric integrated business suite (Salesforce-like). No-code is a supplementary feature. Differentiates from Kintone by being OSS + Cloudflare-native low-cost deployment.

## Stack

| Layer | Technology |
|---|---|
| Framework | SvelteKit 5 (Svelte Runes) |
| Language | TypeScript |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM |
| File storage | Cloudflare R2 |
| Runtime | Cloudflare Workers |
| Package manager | bun |
| Icons | @lucide/svelte |
| CSS | SCSS (via sass-embedded) |

## Project Configuration

- **Language**: TypeScript
- **Package Manager**: bun
- **Add-ons**: prettier, eslint, vitest, playwright, sveltekit-adapter, drizzle, mcp

---

## Implementation Status (2026-05-17)

### ✅ Completed

#### Infrastructure
- Unified Drizzle schema for all 5 modules + `audit_logs` (`src/lib/server/db/schema.ts`)
- PBKDF2 authentication + session cookie (`src/lib/server/auth/index.ts`)
- Audit logging on all write actions (`src/lib/server/audit.ts`)
- DDD-inspired directory structure (`src/lib/domain/`)
- Security headers in `hooks.server.ts`
- DB migration scripts (drizzle/0000 initial, drizzle/0001 wbs schema)
- Seed data (`src/lib/server/db/seed.ts`)

#### i18n
- English (`src/lib/i18n/en.ts`) + Japanese (`src/lib/i18n/ja.ts`) translations
- Reactive language state via Svelte 5 runes (`src/lib/i18n/lang.svelte.ts`)
- `t()` function — call in template to get reactive translations
- Language switcher on Settings page and Login page
- `localStorage` key: `cork_lang`
- **Applied to**: Sidebar nav, Login page, Settings page
- **Not yet applied**: Customer, Project, Workflow, WBS, Apps pages (hardcoded EN)

#### Routes
| Route | Status | Notes |
|---|---|---|
| `/login` | ✅ | Language + theme switcher |
| `/logout` | ✅ | |
| `/` (Dashboard) | ✅ | 7 stats, recent activities, schedule toggle (upcoming/past), projects, pending approvals |
| `/customers` | ✅ | List, CRUD, CSV export/import, note count |
| `/customers/[id]` | ✅ | Activities, Schedules, Notes (sticky), Contacts tabs |
| `/customers/export` | ✅ | CSV export |
| `/projects` | ✅ | List, create (start/end date required) |
| `/projects/[id]` | ✅ | Overview, Kanban, WBS, Members, Activity tabs |
| `/workflows` | ✅ | List, create, status filter |
| `/workflows/[id]` | ✅ | Approver setup (draft), approval steps, approve/reject, comments |
| `/progress` | ✅ | Redirects to `/projects` |
| `/apps` | ✅ | List, create, bookmark toggle/filter |
| `/apps/[id]` | ✅ | Record list, dynamic field rendering, publish toggle |
| `/apps/[id]/build` | ✅ | Drag-and-drop no-code builder (admin only) |
| `/schedules` | ✅ | Exists but removed from nav (Upcoming/Past now on Dashboard) |
| `/settings` | ✅ | Language switch, records/page, project statuses/categories, approval categories (admin only) |
| `/accounts` | ✅ | server: CRUD; **svelte: not yet created** |
| `/profile` | ✅ | server: update name/password; **svelte: not yet created** |

#### UI Components (`src/lib/ui/`)
- Button, Input, Textarea, Label, Card, Modal, ConfirmDialog
- Table (cell snippet takes `(column, row)` — full row available)
- Pagination (`currentPage`, `totalPages`, `onpagechange` props)
- SearchBar (`onsearch` prop — not `onsubmit`)
- Sidebar (accepts `primaryNavItems`, `secondaryNavItems` props; exports `NavItem` type)
- SelectChip, WBSForm

#### No-code Apps
- `/api/bookmarks` POST endpoint — toggles bookmark (aes-nocode pattern)
- App builder: field types: text, textarea, link, number, date, datetime, select, checkbox, radio, user
- Bookmarks stored in `app_bookmarks` table

### ❌ Not Yet Implemented
- ~~`/accounts/+page.svelte`~~ ✅ implemented
- ~~`/profile/+page.svelte`~~ ✅ implemented
- ~~Full i18n~~ ✅ applied to all pages
- ~~Workflow detail: file upload to R2~~ ✅ implemented
- ~~Project file upload to R2~~ ✅ implemented (Files tab)
- ~~WBS Gantt chart~~ ✅ WBSForm wired to `/projects/[id]` WBS tab (saveWbs action added)
- E2E tests

---

## Directory Structure (DDD-inspired)

```
src/
  lib/
    domain/              # Business domain types (user-customizable)
      shared/types.ts
      customer/types.ts  # CustomerStatus, ActivityType, NoteColor, etc.
      project/types.ts   # ProjectPriority, ProjectMemberRole, etc.
      workflow/types.ts  # WorkflowStatus, WorkflowPriority, ApprovalStatus
      progress/types.ts  # WBS, WBSTask types
      apps/types.ts      # FieldType, AppField, AppDef, AppSummary
    server/
      db/
        schema.ts        # All Drizzle tables + relations
        seed.ts          # Dev seed (admin@example.com/admin123, user@example.com/user123)
      auth/index.ts      # hashPassword, verifyPassword, getSession, SESSION_COOKIE_OPTIONS
      audit.ts           # writeAuditLog()
    i18n/
      en.ts              # English (primary)
      ja.ts              # Japanese
      lang.svelte.ts     # Reactive: getLocale(), setLocale(), t(), LOCALES
      index.ts           # Re-exports all of the above
    ui/                  # Internal UI component library (no external UI library)
    utils/               # csv.ts, index.ts (formatDate, formatDateTime, etc.)
    theme.svelte.ts      # Light/Dark/System theme state
  routes/
    api/
      bookmarks/+server.ts  # POST toggle bookmark
    (app)/               # Authenticated route group
      +layout.server.ts  # { user } → page data
      +layout.svelte     # App shell: Sidebar + main content
      +page.*            # Dashboard
      customers/
      projects/
      workflows/
      progress/          # → redirects to /projects
      apps/
      accounts/
      settings/
      schedules/         # Exists but not in sidebar nav
    login/
    logout/
```

---

## Key Conventions

### Authentication
- Session stored as account ID in `session` cookie (httpOnly, secure, sameSite=lax)
- PBKDF2 password hashing via Web Crypto API (Cloudflare Workers compatible)
- Auth guard in `hooks.server.ts` redirects unauthenticated users to `/login`
- Public routes list: `['/login']`

### Audit Logging
Every write action must call `writeAuditLog()` from `$lib/server/audit`:

```ts
await writeAuditLog({
  db: platform!.env.DB,
  account_id: locals.user!.id,
  action: 'create',           // 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import'
  resource_type: 'customer',
  resource_id: newRecord.id,
  request                     // optional: captures IP/UA
});
```

### i18n
Use `t()` from `$lib/i18n` — it's a **function** (not an object), returns translations for current locale:

```ts
import { t, setLocale, getLocale, LOCALES } from '$lib/i18n';

// In template — reactive, re-renders on locale change:
<h1>{t().customer.title}</h1>
<Button>{t().common.save}</Button>

// Switch language:
setLocale('ja');  // persists to localStorage as 'cork_lang'
```

Add new keys to both `en.ts` and `ja.ts`.

### UI Components
Import from `$lib/ui`. Key API notes:
- `Table`: `cell` snippet receives `(column: Column, row: T)` — not just the cell value
- `SearchBar`: prop is `onsearch` (not `onsubmit`)
- `Pagination`: props are `currentPage`, `totalPages`, `onpagechange`
- `Sidebar`: requires `primaryNavItems` and `secondaryNavItems` as props; exports `NavItem` type

### Database
- Always import `* as schema` from `$lib/server/db/schema`
- Get ORM: `const db = drizzle(platform!.env.DB, { schema })`
- All PK: `crypto.randomUUID()` (except integer autoincrement: `project_statuses`, `project_categories`)
- Timestamps: ISO strings stored as SQLite text

### WBS ↔ Project Relationship
- WBS is linked to a project via `wbs.project_id`
- WBS start/end dates are copied from project's dates on creation (project dates are required)
- `wbs_tasks.status`: `'todo' | 'in_progress' | 'done'` (Kanban columns)
- Access WBS via `/projects/[id]` → Kanban / WBS tabs

### Cloudflare Workers Compatibility
- No Node.js APIs — use Web APIs only (fetch, crypto, TextEncoder, etc.)
- File uploads → R2 (not filesystem)
- D1 only (SQLite dialect, no Postgres/MySQL)

---

## Development Commands

```bash
bun dev                    # Start dev server (wrangler local D1 emulation)
bun run db:generate        # Generate SQL migrations from schema changes
bun run db:migrate:local   # Apply migrations to local D1
bun run db:seed            # Seed local DB (admin@example.com / admin123)
bun run db:studio          # Drizzle Studio (needs remote credentials)
bun run check              # TypeScript + svelte-check
bun run lint               # Prettier + ESLint
bun run format             # Auto-format
bun run test:unit          # Vitest unit tests
bun run test:e2e           # Playwright E2E tests
```

**First-time local setup:**
```bash
bun install
bun run db:generate
bun run db:migrate:local
bun run db:seed
bun dev
# → http://localhost:5173
# admin: admin@example.com / admin123
# user:  user@example.com  / user123
```

---

## Adding a New Module

1. Add domain types to `src/lib/domain/<module>/types.ts`
2. Add tables + relations to `src/lib/server/db/schema.ts`
3. Run `bun run db:generate` then `bun run db:migrate:local`
4. Add i18n keys to `src/lib/i18n/en.ts` **and** `src/lib/i18n/ja.ts`
5. Create routes under `src/routes/(app)/<module>/`
6. Add nav item to `src/routes/(app)/+layout.svelte` (`primaryNavItems` array)
7. Add `writeAuditLog()` to all write actions

---

## Security Checklist

- [ ] All write actions call `writeAuditLog()`
- [ ] Admin-only routes: `if (locals.user?.role !== 'admin') throw error(403, 'Forbidden')`
- [ ] No raw SQL string interpolation (Drizzle parameterized queries only)
- [ ] File uploads: validate MIME type + size before R2 upload
- [ ] Passwords: validate with `validatePasswordStrength()` before hashing
- [ ] Session cookie: `httpOnly=true`, `sameSite=lax`, `secure=true`

---

## Svelte MCP Tools

You have access to the Svelte MCP server for comprehensive Svelte 5 and SvelteKit documentation.

### 1. list-sections
Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths. When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation
Retrieves full documentation content for specific sections. Accepts single or multiple sections. After calling list-sections, you MUST analyze the returned sections (especially the use_cases field) and fetch ALL relevant sections.

### 3. svelte-autofixer
Analyzes Svelte code and returns issues and suggestions. You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling until no issues or suggestions are returned.

### 4. playground-link
Generates a Svelte Playground link. Only call after user confirmation and NEVER if code was written to project files.

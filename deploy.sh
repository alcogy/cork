#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# Cork — One-command Cloudflare deployment
# Usage: bash deploy.sh [--seed]
# ─────────────────────────────────────────────

SEED=false
for arg in "$@"; do
  [[ "$arg" == "--seed" ]] && SEED=true
done

# ── Colors ────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✓${NC}  $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✗${NC}  $*"; exit 1; }
step()    { echo -e "\n${BLUE}▶${NC}  $*"; }

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║      Cork — Deploy to Cloudflare      ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# ── 1. Prerequisites ──────────────────────────
step "Checking prerequisites..."

command -v bun    >/dev/null 2>&1 || error "bun is required. Install: https://bun.sh"
command -v wrangler >/dev/null 2>&1 || { command -v npx >/dev/null 2>&1 || error "wrangler / npx not found"; WRANGLER="npx wrangler"; } && WRANGLER="${WRANGLER:-wrangler}"

success "Prerequisites OK"

# ── 2. Cloudflare login ───────────────────────
step "Checking Cloudflare authentication..."

if ! $WRANGLER whoami >/dev/null 2>&1; then
  info "Not logged in. Opening browser for Cloudflare login..."
  $WRANGLER login
fi
success "Authenticated with Cloudflare"

# ── 3. D1 Database ────────────────────────────
step "Setting up D1 database..."

DB_NAME="cork"

# UUID regex
UUID_RE='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

# Try to get existing DB ID via `d1 info`
INFO_OUTPUT=$($WRANGLER d1 info "$DB_NAME" 2>&1 || true)
DB_ID=$(echo "$INFO_OUTPUT" | grep -oE "$UUID_RE" | head -1)

if [[ -n "$DB_ID" ]]; then
  info "Using existing D1 database '$DB_NAME' (ID: $DB_ID)"
else
  info "Creating D1 database '$DB_NAME'..."
  CREATE_OUTPUT=$($WRANGLER d1 create "$DB_NAME" 2>&1)
  DB_ID=$(echo "$CREATE_OUTPUT" | grep -oE "$UUID_RE" | head -1)
  [[ -z "$DB_ID" ]] && error "Failed to create D1 database.\n$CREATE_OUTPUT"
  success "Created D1 database (ID: $DB_ID)"
fi

# ── 4. R2 Bucket ─────────────────────────────
step "Setting up R2 bucket..."

BUCKET_NAME="cork-storage"
if $WRANGLER r2 bucket list 2>/dev/null | grep -qw "$BUCKET_NAME"; then
  info "Using existing R2 bucket '$BUCKET_NAME'"
else
  info "Creating R2 bucket '$BUCKET_NAME'..."
  $WRANGLER r2 bucket create "$BUCKET_NAME"
  success "Created R2 bucket '$BUCKET_NAME'"
fi

# ── 5. Update wrangler.jsonc ──────────────────
step "Updating wrangler.jsonc with D1 database ID..."

# Use node/bun to update the jsonc safely
bun -e "
const fs = require('fs');
const path = './wrangler.jsonc';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  /\"database_id\":\s*\"[^\"]*\"/,
  '\"database_id\": \"${DB_ID}\"'
);
fs.writeFileSync(path, content);
console.log('wrangler.jsonc updated');
"
success "wrangler.jsonc updated"

# ── 6. Install dependencies ───────────────────
step "Installing dependencies..."
bun install --frozen-lockfile
success "Dependencies installed"

# ── 7. Run D1 migrations ──────────────────────
step "Running D1 migrations (remote)..."
$WRANGLER d1 migrations apply DB --remote
success "Migrations applied"

# ── 8. Seed (optional) ────────────────────────
if [[ "$SEED" == "true" ]]; then
  step "Seeding database..."
  warn "Remote seeding via wrangler d1 execute..."
  # Run seed SQL via D1 execute
  $WRANGLER d1 execute DB --remote --command "SELECT 1" >/dev/null 2>&1 && \
    bun run db:seed 2>/dev/null || \
    warn "Seed skipped (seed script may require local D1). Run 'bun run db:seed' manually."
fi

# ── 9. Build ──────────────────────────────────
step "Building application..."
bun run build
success "Build complete"

# ── 10. Deploy ────────────────────────────────
step "Deploying to Cloudflare Workers..."
$WRANGLER deploy
success "Deployed!"

# ── Done ──────────────────────────────────────
echo ""
echo "╔═══════════════════════════════════════╗"
echo "║          Deployment complete!          ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Open the URL shown above in your browser"
echo "  2. Log in with  admin@example.com / admin123  (if you ran --seed)"
echo "  3. Change the default password immediately in Settings"
echo ""
echo -e "  D1 database ID: ${YELLOW}${DB_ID}${NC}"
echo -e "  R2 bucket:      ${YELLOW}${BUCKET_NAME}${NC}"
echo ""

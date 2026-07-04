#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Playbook Runner — bootstrap
#
# Generates a `.env` file with random secrets (openssl), prompts for the initial
# admin credentials, and optionally starts the stack with docker compose.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/v0.3.1/scripts/bootstrap.sh | bash
#
# Requirements: docker, openssl, curl.
#
# Can be run standalone (curl | bash) or from a cloned repo. In both cases it
# writes `.env` and `compose.prod.yml` in the CURRENT DIRECTORY.
# ─────────────────────────────────────────────────────────────────────────────

set -Eeuo pipefail

# The stack is generated/started in the directory where you run the script,
# not where the script file lives. Works the same via `curl | bash` or cloned.
TARGET_DIR="$(pwd -P)"

# Tag/branch used to download compose.prod.yml. Override: PB_REF=main ...
PB_REF="${PB_REF:-v0.3.1}"
RAW_BASE="https://raw.githubusercontent.com/Nonetss/playbook-runner/${PB_REF}"

# ── Output helpers ───────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
    C_RESET=$'\033[0m'; C_CYAN=$'\033[1;36m'; C_GREEN=$'\033[1;32m'; C_RED=$'\033[1;31m'; C_DIM=$'\033[2m'
else
    C_RESET=""; C_CYAN=""; C_GREEN=""; C_RED=""; C_DIM=""
fi
log()  { printf '%s==>%s %s\n' "$C_CYAN"  "$C_RESET" "$*"; }
ok()   { printf '%s[OK]%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
err()  { printf '%s[ERROR]%s %s\n' "$C_RED"  "$C_RESET" "$*" >&2; }
note() { printf '%s%s%s\n'     "$C_DIM"   "$*" "$C_RESET"; }

# ── Dependency check ─────────────────────────────────────────────────────────
for cmd in docker openssl curl; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        err "Missing required command: $cmd"
        exit 1
    fi
done

# This script is interactive (asks for admin/password). With `curl | bash`, stdin
# is the script itself, so we read from the real terminal (/dev/tty).
if [[ ! -r /dev/tty ]]; then
    err "No interactive terminal (/dev/tty). Run this script from a shell."
    exit 1
fi

# ── Banner ───────────────────────────────────────────────────────────────────
cat <<'BANNER'
─────────────────────────────────────────────────────────────
   Playbook Runner · bootstrap
─────────────────────────────────────────────────────────────
BANNER
note "This script generates .env with random secrets."
note "If .env already exists, abort (delete it manually and run again)."
echo

# ── Prompt helpers ───────────────────────────────────────────────────────────
prompt() {
    local label="$1" default="${2:-}" value
    if [[ -n "$default" ]]; then
        read -r -p "$(printf '%s [%s]: ' "$label" "$default")" value </dev/tty
        value="${value:-$default}"
    else
        read -r -p "$(printf '%s: ' "$label")" value </dev/tty
    fi
    printf '%s' "$value"
}

prompt_secret() {
    local label="$1" value=""
    while [[ -z "$value" ]]; do
        read -r -s -p "$(printf '%s: ' "$label")" value </dev/tty
        # Newline goes to /dev/tty, not stdout: if it went to stdout, the $(...)
        # wrapping this function would capture it and leak it into the password.
        echo >/dev/tty
        # Extra guard: no CR/LF inside the value.
        value="${value//[$'\r\n']/}"
    done
    printf '%s' "$value"
}

prompt_confirm() {
    local label="$1" default="${2:-y}" yn
    local hint
    if [[ "$default" =~ ^[Yy]$ ]]; then hint="Y/n"; else hint="y/N"; fi
    read -r -p "$(printf '%s [%s]: ' "$label" "$hint")" yn </dev/tty
    yn="${yn:-$default}"
    [[ "$yn" =~ ^[Yy]$ ]]
}

is_email() {
    [[ "$1" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]
}

gen_secret() {
    openssl rand -base64 48 | tr -d '\n'
}

# Password embedded in a URL (DATABASE_URL): no characters that need escaping
# (/, +, =). Hex is always URL-safe.
gen_password() {
    openssl rand -hex 32
}

# ── Inputs ───────────────────────────────────────────────────────────────────
log "Configuration — answer the prompts."
echo

PUBLIC_URL=$(prompt "Public URL (what the browser will see)" "http://localhost:4321")
if [[ ! "$PUBLIC_URL" =~ ^https?:// ]]; then
    err "Invalid URL (must start with http:// or https://)"
    exit 1
fi

FRONTEND_PORT=$(prompt "Frontend port on the host" "4321")
if ! [[ "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || (( FRONTEND_PORT < 1 || FRONTEND_PORT > 65535 )); then
    err "Invalid port"
    exit 1
fi

ADMIN_NAME=$(prompt "Admin name" "Admin")
[[ -n "$ADMIN_NAME" ]] || { err "Name cannot be empty"; exit 1; }

ADMIN_EMAIL=""
until is_email "$ADMIN_EMAIL"; do
    ADMIN_EMAIL=$(prompt "Admin email" "admin@playbook-runner.local")
    is_email "$ADMIN_EMAIL" || err "Invalid email, try again"
done

ADMIN_PASSWORD=""
until [[ ${#ADMIN_PASSWORD} -ge 8 ]]; do
    ADMIN_PASSWORD=$(prompt_secret "Admin password (min 8 characters)")
    if [[ ${#ADMIN_PASSWORD} -lt 8 ]]; then
        err "Too short, minimum 8 characters"
    fi
done
printf '\n'

# ── Optional OIDC ────────────────────────────────────────────────────────────
OIDC_ID=""; OIDC_SECRET=""; OIDC_ISSUER=""
if prompt_confirm "Configure corporate SSO (OIDC)? (otherwise: email/password only)"; then
    OIDC_ID=$(prompt "OIDC Client ID")
    OIDC_SECRET=$(prompt_secret "OIDC Client Secret")
    OIDC_ISSUER=$(prompt "OIDC Issuer (e.g. https://keycloak.example.com/realms/my-realm)")
    if [[ -z "$OIDC_ID" || -z "$OIDC_SECRET" || -z "$OIDC_ISSUER" ]]; then
        err "Missing OIDC settings — exiting"
        exit 1
    fi
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo
log "Configuration summary:"
echo "  Public URL:        $PUBLIC_URL"
echo "  Frontend port:     $FRONTEND_PORT"
echo "  Admin:             $ADMIN_NAME <$ADMIN_EMAIL>"
echo "  SSO (OIDC):        ${OIDC_ID:+enabled (client_id=$OIDC_ID)}${OIDC_ID:-disabled}"
echo

if ! prompt_confirm "Generate .env and continue?"; then
    note "Aborted. Nothing was written."
    exit 0
fi

# ── Generate secrets ─────────────────────────────────────────────────────────
log "Generating secrets with openssl..."
POSTGRES_DB=playbook_runner
POSTGRES_USER=playbook_runner
POSTGRES_PASSWORD=$(gen_password)
BETTER_AUTH_SECRET=$(gen_secret)
INTERNAL_TOKEN=$(gen_secret)
ok "Secrets generated (POSTGRES_PASSWORD, BETTER_AUTH_SECRET, INTERNAL_TOKEN)"

# ── Write .env ───────────────────────────────────────────────────────────────
ENV_FILE="$TARGET_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
    err "$ENV_FILE already exists — delete it manually if you want to regenerate"
    exit 1
fi

cat > "$ENV_FILE" <<EOF
# Generated by scripts/bootstrap.sh on $(date -u +%FT%TZ)
# Do not commit — contains secrets.

# ── Image registry ───────────────────────────────────────────────────────────
ANSIBLE_IMAGE_TAG=latest
BACKEND_IMAGE_TAG=latest
FRONTEND_IMAGE_TAG=latest

# ── Public host ──────────────────────────────────────────────────────────────
FRONTEND_PORT=$FRONTEND_PORT
CORS_ORIGIN=$PUBLIC_URL

# ── PostgreSQL (only used with the postgres service in compose.yml) ──────────
POSTGRES_DB=$POSTGRES_DB
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# ── Backend ──────────────────────────────────────────────────────────────────
# NOTE: docker compose does NOT interpolate \${...} inside env_file, so the URL
# is written with resolved values. For an external DB (RDS, Cloud SQL, …)
# replace this line and remove the postgres service from compose.yml.
DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB

BETTER_AUTH_URL=$PUBLIC_URL
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET

JOB_SCHEDULER_ENABLED=1

# ── Seed admin ───────────────────────────────────────────────────────────────
SEED_ADMIN_NAME=$ADMIN_NAME
SEED_ADMIN_EMAIL=$ADMIN_EMAIL
SEED_ADMIN_PASSWORD=$ADMIN_PASSWORD

# ── SSO / OIDC (optional) ────────────────────────────────────────────────────
# If any of these three variables is empty, SSO is disabled automatically
# and only email/password remains.
GENERIC_OAUTH_CLIENT_ID=$OIDC_ID
GENERIC_OAUTH_CLIENT_SECRET=$OIDC_SECRET
GENERIC_OAUTH_ISSUER=$OIDC_ISSUER

# ── Service-to-service auth ──────────────────────────────────────────────────
INTERNAL_TOKEN=$INTERNAL_TOKEN
EOF

chmod 600 "$ENV_FILE"
ok ".env written to $ENV_FILE (mode 600)"

# ── compose.yml ──────────────────────────────────────────────────────────────
# Saved as compose.yml (not compose.prod.yml) so `docker compose up -d` picks
# it up without -f. When run standalone (curl | bash) we download it from the
# repo; if it already exists in the folder, we keep it.
COMPOSE_FILE="$TARGET_DIR/compose.yml"
if [[ ! -f "$COMPOSE_FILE" ]]; then
    log "Downloading compose.yml ($PB_REF)..."
    curl -fsSL "$RAW_BASE/compose.prod.yml" -o "$COMPOSE_FILE"
    ok "compose.yml downloaded to $COMPOSE_FILE"
fi

# ── Start stack ──────────────────────────────────────────────────────────────
# The backend runs Drizzle migrations and seeds the admin on startup
# (bootstrap() in apps/backend/src/index.ts), so `up -d` is enough — no manual
# db:push / db:seed required.
echo
if prompt_confirm "Start the stack now with docker compose?"; then
    log "docker compose pull..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull

    log "docker compose up -d..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

    ok "Done. The backend migrates and seeds the admin on startup."
    ok "In ~1-2 min go to $PUBLIC_URL and sign in with $ADMIN_EMAIL"
else
    note "When you're ready to start (from this folder):"
    note "  docker compose up -d"
fi

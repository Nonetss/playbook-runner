#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Playbook Runner — bootstrap
#
# Genera el archivo `.env` con secretos aleatorios (openssl), te pregunta los
# datos del admin inicial y opcionalmente levanta el stack con docker compose.
#
# Uso:
#   ./scripts/bootstrap.sh
#
# Requisitos: docker, openssl.
# ─────────────────────────────────────────────────────────────────────────────

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
cd "$PROJECT_ROOT"

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
for cmd in docker openssl; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        err "Falta el comando requerido: $cmd"
        exit 1
    fi
done

# ── Banner ───────────────────────────────────────────────────────────────────
cat <<'BANNER'
─────────────────────────────────────────────────────────────
   Playbook Runner · bootstrap
─────────────────────────────────────────────────────────────
BANNER
note "Este script genera .env con secretos aleatorios."
note "Si ya existe .env, abortá (borrálo a mano y volvé a correr)."
echo

# ── Prompt helpers ───────────────────────────────────────────────────────────
prompt() {
    local label="$1" default="${2:-}" value
    if [[ -n "$default" ]]; then
        read -r -p "$(printf '%s [%s]: ' "$label" "$default")" value
        value="${value:-$default}"
    else
        read -r -p "$(printf '%s: ' "$label")" value
    fi
    printf '%s' "$value"
}

prompt_secret() {
    local label="$1" value=""
    while [[ -z "$value" ]]; do
        read -r -s -p "$(printf '%s: ' "$label")" value
        echo
    done
    printf '%s' "$value"
}

prompt_confirm() {
    local label="$1" default="${2:-y}" yn
    local hint
    if [[ "$default" =~ ^[Yy]$ ]]; then hint="Y/n"; else hint="y/N"; fi
    read -r -p "$(printf '%s [%s]: ' "$label" "$hint")" yn
    yn="${yn:-$default}"
    [[ "$yn" =~ ^[Yy]$ ]]
}

is_email() {
    [[ "$1" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]
}

gen_secret() {
    openssl rand -base64 48 | tr -d '\n'
}

# ── Inputs ───────────────────────────────────────────────────────────────────
log "Configuración — respondé las preguntas."
echo

PUBLIC_URL=$(prompt "URL pública (la que verá el navegador)" "http://localhost:4321")
if [[ ! "$PUBLIC_URL" =~ ^https?:// ]]; then
    err "URL inválida (tiene que empezar con http:// o https://)"
    exit 1
fi

FRONTEND_PORT=$(prompt "Puerto del frontend en el host" "4321")
if ! [[ "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || (( FRONTEND_PORT < 1 || FRONTEND_PORT > 65535 )); then
    err "Puerto inválido"
    exit 1
fi

ADMIN_NAME=$(prompt "Nombre del admin" "Admin")
[[ -n "$ADMIN_NAME" ]] || { err "El nombre no puede estar vacío"; exit 1; }

ADMIN_EMAIL=""
until is_email "$ADMIN_EMAIL"; do
    ADMIN_EMAIL=$(prompt "Email del admin" "admin@playbook-runner.local")
    is_email "$ADMIN_EMAIL" || err "Email inválido, probá de nuevo"
done

ADMIN_PASSWORD=""
until [[ ${#ADMIN_PASSWORD} -ge 8 ]]; do
    ADMIN_PASSWORD=$(prompt_secret "Contraseña del admin (mín 8 caracteres)")
    if [[ ${#ADMIN_PASSWORD} -lt 8 ]]; then
        err "Muy corta, mínimo 8 caracteres"
    fi
done
printf '\n'

# ── OIDC opcional ────────────────────────────────────────────────────────────
OIDC_ID=""; OIDC_SECRET=""; OIDC_ISSUER=""
if prompt_confirm "¿Configurar SSO (OIDC) corporativo? (sino: solo email/password)"; then
    OIDC_ID=$(prompt "OIDC Client ID")
    OIDC_SECRET=$(prompt_secret "OIDC Client Secret")
    OIDC_ISSUER=$(prompt "OIDC Issuer (ej: https://keycloak.example.com/realms/mi-realm)")
    if [[ -z "$OIDC_ID" || -z "$OIDC_SECRET" || -z "$OIDC_ISSUER" ]]; then
        err "Faltan datos de OIDC — saliendo"
        exit 1
    fi
fi

# ── Resumen ──────────────────────────────────────────────────────────────────
echo
log "Resumen de la configuración:"
echo "  URL pública:       $PUBLIC_URL"
echo "  Puerto frontend:   $FRONTEND_PORT"
echo "  Admin:             $ADMIN_NAME <$ADMIN_EMAIL>"
echo "  SSO (OIDC):        ${OIDC_ID:+activado (client_id=$OIDC_ID)}${OIDC_ID:-desactivado}"
echo

if ! prompt_confirm "¿Generar .env y arrancar?"; then
    note "Abortado. No se escribió nada."
    exit 0
fi

# ── Generar secretos ─────────────────────────────────────────────────────────
log "Generando secretos con openssl..."
POSTGRES_PASSWORD=$(gen_secret)
BETTER_AUTH_SECRET=$(gen_secret)
INTERNAL_TOKEN=$(gen_secret)
ok "Secretos generados (POSTGRES_PASSWORD, BETTER_AUTH_SECRET, INTERNAL_TOKEN)"

# ── Escribir .env ────────────────────────────────────────────────────────────
ENV_FILE="$PROJECT_ROOT/.env"
if [[ -f "$ENV_FILE" ]]; then
    err "Ya existe $ENV_FILE — borrálo a mano si querés regenerarlo"
    exit 1
fi

cat > "$ENV_FILE" <<EOF
# Generado por scripts/bootstrap.sh el $(date -u +%FT%TZ)
# No commitear — contiene secretos.

# ── Image registry ───────────────────────────────────────────────────────────
ANSIBLE_IMAGE_TAG=latest
BACKEND_IMAGE_TAG=latest
FRONTEND_IMAGE_TAG=latest

# ── Public host ──────────────────────────────────────────────────────────────
FRONTEND_PORT=$FRONTEND_PORT
CORS_ORIGIN=$PUBLIC_URL

# ── PostgreSQL (solo se usa con el servicio postgres de compose.prod.yml) ─────
POSTGRES_DB=playbook_runner
POSTGRES_USER=playbook_runner
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# ── Backend ──────────────────────────────────────────────────────────────────
# Si usás una DB externa (RDS, Cloud SQL, etc.) reemplazá esta URL
# y borrá el servicio postgres de compose.prod.yml.
DATABASE_URL=postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@postgres:5432/\${POSTGRES_DB}

BETTER_AUTH_URL=$PUBLIC_URL
BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET

JOB_SCHEDULER_ENABLED=1

# ── Seed admin ───────────────────────────────────────────────────────────────
SEED_ADMIN_NAME=$ADMIN_NAME
SEED_ADMIN_EMAIL=$ADMIN_EMAIL
SEED_ADMIN_PASSWORD=$ADMIN_PASSWORD

# ── SSO / OIDC (opcional) ────────────────────────────────────────────────────
# Si alguna de estas tres variables queda vacía, el SSO se desactiva
# automáticamente y solo queda email/password.
GENERIC_OAUTH_CLIENT_ID=$OIDC_ID
GENERIC_OAUTH_CLIENT_SECRET=$OIDC_SECRET
GENERIC_OAUTH_ISSUER=$OIDC_ISSUER

# ── Service-to-service auth ──────────────────────────────────────────────────
INTERNAL_TOKEN=$INTERNAL_TOKEN
EOF

chmod 600 "$ENV_FILE"
ok ".env escrito en $ENV_FILE (permisos 600)"

# ── Levantar stack ───────────────────────────────────────────────────────────
echo
if prompt_confirm "¿Levantar el stack ahora con docker compose?"; then
    log "docker compose pull..."
    docker compose -f "$PROJECT_ROOT/compose.prod.yml" --env-file "$ENV_FILE" pull

    log "docker compose up -d..."
    docker compose -f "$PROJECT_ROOT/compose.prod.yml" --env-file "$ENV_FILE" up -d

    log "Esperando a que el backend esté healthy..."
    for _ in {1..30}; do
        if docker compose -f "$PROJECT_ROOT/compose.prod.yml" --env-file "$ENV_FILE" ps backend \
            | grep -q "(healthy)"; then
            break
        fi
        sleep 2
    done

    log "Aplicando schema (db:push)..."
    docker compose -f "$PROJECT_ROOT/compose.prod.yml" --env-file "$ENV_FILE" \
        exec -T backend bun run db:push

    log "Sembrando admin inicial (db:seed)..."
    docker compose -f "$PROJECT_ROOT/compose.prod.yml" --env-file "$ENV_FILE" \
        exec -T backend bun run db:seed

    ok "Listo. Andá a $PUBLIC_URL y logueate con $ADMIN_EMAIL"
else
    note "Cuando quieras arrancar:"
    note "  docker compose -f compose.prod.yml --env-file .env up -d"
    note "  docker compose -f compose.prod.yml --env-file .env exec backend bun run db:push"
    note "  docker compose -f compose.prod.yml --env-file .env exec backend bun run db:seed"
fi
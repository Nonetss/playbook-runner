#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Playbook Runner — bootstrap
#
# Genera el archivo `.env` con secretos aleatorios (openssl), te pregunta los
# datos del admin inicial y opcionalmente levanta el stack con docker compose.
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/Nonetss/playbook-runner/v0.1.0/scripts/bootstrap.sh | bash
#
# Requisitos: docker, openssl, curl.
#
# Se puede ejecutar suelto (curl | bash) o desde un repo clonado. En ambos
# casos genera `.env` y `compose.prod.yml` en el DIRECTORIO ACTUAL.
# ─────────────────────────────────────────────────────────────────────────────

set -Eeuo pipefail

# El stack se genera/levanta en el directorio donde corrés el script, no en
# donde vive el script. Así funciona igual via `curl | bash` que clonado.
TARGET_DIR="$(pwd -P)"

# Tag/branch desde donde se baja compose.prod.yml. Overrideable: PB_REF=main ...
PB_REF="${PB_REF:-v0.1.0}"
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
        err "Falta el comando requerido: $cmd"
        exit 1
    fi
done

# El script es interactivo (pregunta admin/contraseña). Via `curl | bash` el
# stdin es el propio script, así que leemos de la terminal real (/dev/tty).
if [[ ! -r /dev/tty ]]; then
    err "No hay terminal interactiva (/dev/tty). Corré el script desde una shell."
    exit 1
fi

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
        # El newline va a /dev/tty, no a stdout: si fuera a stdout lo capturaría
        # el $(...) que envuelve esta función y se colaría en el password.
        echo >/dev/tty
        # Defensa extra: nada de CR/LF dentro del valor.
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

# Password que va dentro de una URL (DATABASE_URL): sin caracteres que haya
# que escapar (/, +, =). Hex es siempre URL-safe.
gen_password() {
    openssl rand -hex 32
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
POSTGRES_DB=playbook_runner
POSTGRES_USER=playbook_runner
POSTGRES_PASSWORD=$(gen_password)
BETTER_AUTH_SECRET=$(gen_secret)
INTERNAL_TOKEN=$(gen_secret)
ok "Secretos generados (POSTGRES_PASSWORD, BETTER_AUTH_SECRET, INTERNAL_TOKEN)"

# ── Escribir .env ────────────────────────────────────────────────────────────
ENV_FILE="$TARGET_DIR/.env"
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

# ── PostgreSQL (solo se usa con el servicio postgres de compose.yml) ──────────
POSTGRES_DB=$POSTGRES_DB
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

# ── Backend ──────────────────────────────────────────────────────────────────
# OJO: docker compose NO interpola \${...} dentro de env_file, así que la URL
# va con los valores ya resueltos. Si usás una DB externa (RDS, Cloud SQL, …)
# reemplazá esta línea y borrá el servicio postgres de compose.yml.
DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB

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

# ── compose.yml ──────────────────────────────────────────────────────────────
# Lo guardamos como compose.yml (no compose.prod.yml) para que `docker compose
# up -d` lo tome solo, sin -f. Si corremos sueltos (curl | bash) lo bajamos del
# repo; si ya existe en la carpeta, lo respetamos.
COMPOSE_FILE="$TARGET_DIR/compose.yml"
if [[ ! -f "$COMPOSE_FILE" ]]; then
    log "Descargando compose.yml ($PB_REF)..."
    curl -fsSL "$RAW_BASE/compose.prod.yml" -o "$COMPOSE_FILE"
    ok "compose.yml descargado en $COMPOSE_FILE"
fi

# ── Levantar stack ───────────────────────────────────────────────────────────
# El backend corre las migraciones de Drizzle y siembra el admin en su propio
# arranque (bootstrap() en apps/backend/src/index.ts), así que con `up -d`
# alcanza: no hace falta db:push / db:seed manuales.
echo
if prompt_confirm "¿Levantar el stack ahora con docker compose?"; then
    log "docker compose pull..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull

    log "docker compose up -d..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

    ok "Listo. El backend migra y siembra el admin solo en su arranque."
    ok "En ~1-2 min andá a $PUBLIC_URL y logueate con $ADMIN_EMAIL"
else
    note "Cuando quieras arrancar (desde esta carpeta):"
    note "  docker compose up -d"
fi
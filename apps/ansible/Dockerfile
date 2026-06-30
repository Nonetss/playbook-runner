# syntax=docker/dockerfile:1.7
#
# Multi-stage build:
#   deps    — installs uv + Python deps into a venv
#   runtime — only the venv + the FastAPI app (no uv, no pyproject, no uv.lock)

# ─── deps ───────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS deps

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY apps/ansible/pyproject.toml apps/ansible/uv.lock ./
RUN --mount=type=cache,target=/root/.uv/cache uv sync --frozen --no-dev


# ─── runtime ────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:${PATH}" \
    ANSIBLE_PLAYBOOK_PATH=/app/playbook \
    ANSIBLE_HOST_KEY_CHECKING=False \
    RUN_SCRATCH_DIR=/tmp/ansible-runs

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        openssh-client \
        ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Copy the venv with everything baked in + the app source. No uv, no
# pyproject, no uv.lock, no .cache.
COPY --from=deps /app/.venv /app/.venv
COPY apps/ansible/app /app/app

WORKDIR /app

EXPOSE 8000

CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
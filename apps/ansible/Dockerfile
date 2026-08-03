# syntax=docker/dockerfile:1.7
#
# Multi-stage build:
#   deps    — installs uv + Python deps into a venv. WORKDIR mirrors the
#             monorepo layout (/app/apps/ansible) so the
#             ../../python/grpc-toolkit path dependency in pyproject.toml/
#             uv.lock resolves.
#   runtime — only the venv + the FastAPI app (no uv, no pyproject, no uv.lock)

# ─── deps ───────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS deps

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app/apps/ansible

# Pre-warm the venv with every third-party dependency before the app source
# (and the local grpc-toolkit source) are copied in. grpc-toolkit is excluded
# here since its source isn't present yet in this bind-mount-only step.
RUN --mount=type=cache,target=/root/.uv/cache \
    --mount=type=bind,source=apps/ansible/uv.lock,target=uv.lock \
    --mount=type=bind,source=apps/ansible/pyproject.toml,target=pyproject.toml \
    --mount=type=bind,source=python,target=/app/python \
    uv sync --frozen --no-install-project --no-dev --no-install-package grpc-toolkit

COPY python /app/python
COPY proto /app/proto
COPY apps/ansible/ .

# app/grpc/gen is gitignored, so regenerate the stubs with the dev-group
# grpcio-tools, then prune dev deps from the final env. The glob keeps every
# contract in proto/ in sync without touching this file.
RUN --mount=type=cache,target=/root/.uv/cache \
    uv sync --frozen && \
    mkdir -p app/grpc/gen && \
    uv run --no-sync python -m grpc_tools.protoc -I /app/proto \
    --python_out=app/grpc/gen --grpc_python_out=app/grpc/gen \
    --pyi_out=app/grpc/gen /app/proto/*.proto && \
    uv sync --frozen --no-dev


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

# Copy the venv with everything baked in + the app source (including the
# regenerated app/grpc/gen stubs). No uv, no pyproject, no uv.lock, no .cache.
COPY --from=deps /app/apps/ansible/.venv /app/.venv
COPY --from=deps /app/apps/ansible/app /app/app

WORKDIR /app

EXPOSE 8000

CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]

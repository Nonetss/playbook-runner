# syntax=docker/dockerfile:1.7

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PATH="/app/.venv/bin:${PATH}"

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        openssh-client \
        ca-certificates \
        git \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/ansible/pyproject.toml apps/ansible/uv.lock ./
RUN uv sync --frozen --no-dev

COPY apps/ansible/app ./app

ENV ANSIBLE_PLAYBOOK_PATH=/app/playbook \
    ANSIBLE_SSH_KEY=/app/playbook/ssh_key \
    ANSIBLE_HOST_KEY_CHECKING=False \
    RUN_SCRATCH_DIR=/tmp/ansible-runs \
    PYTHONPATH=/app

EXPOSE 8000

CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]

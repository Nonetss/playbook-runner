"""Helpers para emitir mensajes Server-Sent Events (SSE).

Compartidos por ``/api/v0/ping`` y ``/api/v0/run``.
"""

from __future__ import annotations

import json
from collections.abc import AsyncGenerator

from app.services.ansible.events import AnsibleEvent
from app.services.ansible.runner import AnsibleRunner


def sse(data: dict[str, object], event: str | None = None) -> str:
    """Formatea un mensaje Server-Sent Events."""
    prefix = f"event: {event}\n" if event else ""
    return f"{prefix}data: {json.dumps(data)}\n\n"


def event_payload(event: AnsibleEvent) -> dict[str, object]:
    """Reduce un evento de ansible-runner a un payload amigable para el cliente."""
    data = event.get("event_data", {})
    res = data.get("res", {})
    return {
        "event": event.get("event", ""),
        "host": data.get("host"),
        "task": data.get("task"),
        "changed": res.get("changed"),
        "msg": res.get("msg"),
    }


async def stream_runner_events(
    runner: AnsibleRunner,
) -> AsyncGenerator[str, None]:
    """Genera mensajes SSE para un runner + terminal ``done``.

    Envuelve la iteración de ``AnsibleRunner.stream()`` y emite:
    - un evento por cada evento ansible (``event: <tipo>``);
    - un evento terminal ``done`` con ``status``/``rc``/``ok``;
    - un evento ``error`` si la ejecución levanta una excepción.
    """
    try:
        async for event in runner.stream():
            yield sse(event_payload(event))
    except Exception as exc:  # noqa: BLE001 - se reporta al cliente vía SSE
        yield sse({"error": str(exc)}, event="error")
        return

    yield sse(
        {
            "status": runner.status,
            "rc": runner.rc,
            "ok": runner.rc == 0,
        },
        event="done",
    )

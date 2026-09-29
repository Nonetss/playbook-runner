"""Reduce ansible-runner events to the payload sent in gRPC ``TaskEvent``s."""

from __future__ import annotations

import json

from app.services.ansible.events import AnsibleEvent


def _as_text(value: object) -> str | None:
    """Proto text fields only take strings; modules may return lists/dicts."""
    if value is None or isinstance(value, str):
        return value
    return json.dumps(value, default=str, ensure_ascii=False)


def event_payload(event: AnsibleEvent) -> dict[str, object]:
    """Reduce un evento de ansible-runner a un payload amigable para el cliente."""
    data = event.get("event_data", {})
    res = data.get("res", {})
    event_name = event.get("event", "")

    payload: dict[str, object] = {
        "event": event_name,
        "host": data.get("host"),
        "play": data.get("play"),
        "task": data.get("task"),
        "task_action": data.get("task_action"),
        "changed": res.get("changed"),
        "msg": _as_text(res.get("msg")),
        "stdout": _as_text(res.get("stdout")),
        "stderr": _as_text(res.get("stderr")),
        "rc": res.get("rc"),
    }

    # playbook_on_stats lleva contadores por host en event_data (no en res).
    if event_name == "playbook_on_stats":
        payload["stats"] = {
            "ok": data.get("ok", {}),
            "changed": data.get("changed", {}),
            "failures": data.get("failures", {}),
            "dark": data.get("dark", {}),
            "skipped": data.get("skipped", {}),
        }

    return payload

"""Materialización de un bundle resuelto en ficheros para ansible-runner.

``ansible-runner`` necesita un playbook accesible como fichero y una clave
privada por host en disco. Por cada run:

- escribimos el ``content`` del playbook en un ``.yml`` con nombre único;
- escribimos cada clave privada en un fichero ``0600`` y mapeamos device →
  ruta de la clave;
- construimos el inventario JSON con ``HostVars`` por host.

Todo se monta en un directorio temporal y se borra al terminar.
"""

from __future__ import annotations

import hashlib
import os
import tempfile
import uuid
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.core.config import settings
from app.services.ansible.backend_client import ResolvedRunBundle
from app.services.ansible.runner import HostVars, Inventory


@dataclass
class MaterializedHosts:
    """Resultado de la materialización de hosts (sin playbook).

    Atributos:
        run_dir: directorio temporal del run (a eliminar al terminar).
        key_path_map: mapping device name -> ruta del fichero con la clave.
        inventory: inventario ya listo para ``ansible_runner.run``.
    """

    run_dir: Path
    key_path_map: dict[str, Path]
    inventory: Inventory


@dataclass
class MaterializedRun:
    """Resultado de la materialización.

    Atributos:
        run_dir: directorio temporal del run (a eliminar al terminar).
        playbook_path: ruta del fichero playbook materializado.
        key_path_map: mapping device name -> ruta del fichero con la clave.
        inventory: inventario ya listo para ``ansible_runner.run``.
    """

    run_dir: Path
    playbook_path: Path
    key_path_map: dict[str, Path]
    inventory: Inventory


def _short_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]


def _write_key_file(key_dir: Path, host_name: str, private_key: str) -> Path:
    """Escribe la clave privada en un fichero ``0600`` y devuelve su ruta."""
    key_dir.mkdir(parents=True, exist_ok=True)
    fd, raw_path = tempfile.mkstemp(prefix=f"{host_name}-", suffix=".key", dir=key_dir)
    try:
        # OpenSSH exige que el fichero de clave privada termine en salto de
        # línea; sin él, ``ssh`` falla al cargarla con "error in libcrypto".
        content = private_key if private_key.endswith("\n") else private_key + "\n"
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            fh.write(content)
        path = Path(raw_path)
        os.chmod(path, 0o600)
        return path
    except Exception:
        try:
            os.unlink(raw_path)
        except OSError:
            pass
        raise


def _build_inventory(hosts: Iterable[Any], keys: dict[str, Path]) -> Inventory:
    """Construye el ``Inventory`` de ansible con ``HostVars`` por host."""
    hosts_map: dict[str, HostVars] = {}
    for host in hosts:
        vars_for_host: HostVars = {
            "ansible_host": host.address,
            "ansible_user": host.username,
            "ansible_connection": host.connection,
            "ansible_ssh_private_key_file": str(keys[host.name]),
        }
        if host.port is not None:
            vars_for_host["ansible_port"] = host.port
        hosts_map[host.name] = vars_for_host
    return Inventory({"all": {"hosts": hosts_map}})


def _new_run_dir(label: str) -> Path:
    scratch = Path(settings.run_scratch_dir)
    scratch.mkdir(parents=True, exist_ok=True)
    safe_label = label.replace("/", "_").replace(" ", "_") or "run"
    run_dir = scratch / f"{safe_label}-{uuid.uuid4().hex[:12]}"
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir


def materialize_hosts(hosts: Iterable[Any], label: str) -> MaterializedHosts:
    """Materializa los hosts (claves + inventario) sin playbook.

    Usado por flujos ad-hoc (``/command``) que ejecutan un módulo Ansible sobre
    una selección de hosts sin pasar por un playbook almacenado.
    """
    run_dir = _new_run_dir(label)
    key_dir = run_dir / "keys"

    hosts_list = list(hosts)
    keys: dict[str, Path] = {}
    for host in hosts_list:
        keys[host.name] = _write_key_file(key_dir, host.name, host.privateKey)

    inventory = _build_inventory(hosts_list, keys)

    return MaterializedHosts(
        run_dir=run_dir,
        key_path_map=keys,
        inventory=inventory,
    )


def write_script_file(
    run_dir: Path, name: str, content: str, language: str = "bash"
) -> Path:
    """Escribe el contenido del script a un fichero ejecutable dentro de ``run_dir``.

    El módulo Ansible ``script`` transfiere este fichero a cada host remoto y
    lo ejecuta allí, por lo que:
    - debe vivir bajo ``run_dir`` para que ``cleanup()`` lo elimine junto con
      el resto del material del run;
    - debe terminar en ``\\n`` para evitar sorpresas con shebangs en la
      primera línea;
    - se marca como ejecutable (``0o755``) para que ``ssh`` no se queje al
      transferirlo (Ansible también ajusta el bit remoto, pero por si acaso).

    El ``language`` (``bash`` | ``python``) elige la extensión del fichero
    (``.sh`` | ``.py``) y, si el contenido no empieza por ``#!``, le prefija
    el shebang del intérprete correspondiente (``#!/usr/bin/env bash`` o
    ``#!/usr/bin/env python3``) para que el módulo ``script`` de Ansible lo
    ejecute con el intérprete adecuado. Si el autor ya incluyó su propio
    shebang, se respeta tal cual.
    """
    run_dir.mkdir(parents=True, exist_ok=True)
    safe_name = name.replace("/", "_").replace(" ", "_") or "script"
    extension = "py" if language == "python" else "sh"
    shebang = (
        "#!/usr/bin/env python3" if language == "python" else "#!/usr/bin/env bash"
    )
    script_path = run_dir / f"{safe_name}.{extension}"

    body = content
    if not body.lstrip().startswith("#!"):
        body = shebang + "\n" + body
    if not body.endswith("\n"):
        body = body + "\n"
    script_path.write_text(body, encoding="utf-8")
    script_path.chmod(0o755)
    return script_path


def materialize(bundle: ResolvedRunBundle) -> MaterializedRun:
    """Materializa el bundle en ficheros y devuelve un ``MaterializedRun``."""
    safe_name = bundle.playbook.name.replace("/", "_").replace(" ", "_") or "playbook"
    materialized_hosts = materialize_hosts(bundle.hosts, safe_name)

    playbook_path = (
        materialized_hosts.run_dir
        / f"{safe_name}-{_short_hash(bundle.playbook.content)}.yml"
    )
    playbook_path.write_text(bundle.playbook.content, encoding="utf-8")

    return MaterializedRun(
        run_dir=materialized_hosts.run_dir,
        playbook_path=playbook_path,
        key_path_map=materialized_hosts.key_path_map,
        inventory=materialized_hosts.inventory,
    )


def cleanup(materialized: MaterializedHosts | MaterializedRun) -> None:
    """Borra el directorio temporal de un run.

    Se llama desde un ``finally`` tanto en éxito como en error para que las
    claves privadas no se queden en disco.
    """
    import shutil

    shutil.rmtree(materialized.run_dir, ignore_errors=True)

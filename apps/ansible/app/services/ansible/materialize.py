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


def materialize(bundle: ResolvedRunBundle) -> MaterializedRun:
    """Materializa el bundle en ficheros y devuelve un ``MaterializedRun``."""
    scratch = Path(settings.run_scratch_dir)
    scratch.mkdir(parents=True, exist_ok=True)

    run_id = uuid.uuid4().hex[:12]
    # El contenido del playbook puede contener ``/`` (multidoc YAML); para
    # evitar colisiones/paths raros usamos un hash del nombre + UUID.
    safe_name = bundle.playbook.name.replace("/", "_").replace(" ", "_") or "playbook"
    run_dir = scratch / f"{safe_name}-{run_id}"
    key_dir = run_dir / "keys"

    run_dir.mkdir(parents=True, exist_ok=True)

    playbook_path = run_dir / f"{safe_name}-{_short_hash(bundle.playbook.content)}.yml"
    playbook_path.write_text(bundle.playbook.content, encoding="utf-8")

    keys: dict[str, Path] = {}
    for host in bundle.hosts:
        keys[host.name] = _write_key_file(key_dir, host.name, host.privateKey)

    inventory = _build_inventory(bundle.hosts, keys)

    return MaterializedRun(
        run_dir=run_dir,
        playbook_path=playbook_path,
        key_path_map=keys,
        inventory=inventory,
    )


def cleanup(materialized: MaterializedRun) -> None:
    """Borra el directorio temporal de un run.

    Se llama desde un ``finally`` tanto en éxito como en error para que las
    claves privadas no se queden en disco.
    """
    import shutil

    shutil.rmtree(materialized.run_dir, ignore_errors=True)

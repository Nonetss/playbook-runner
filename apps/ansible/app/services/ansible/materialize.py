"""Materialización de un bundle resuelto en ficheros para ansible-runner.

``ansible-runner`` necesita un playbook accesible como fichero y una clave
privada por host en disco. Por cada run:

- escribimos el ``content`` del playbook en un ``.yml`` con nombre único o,
  si viene de Git, volcamos el árbol del commit en ``project/``;
- escribimos cada clave privada en un fichero ``0600`` y mapeamos device →
  ruta de la clave;
- construimos el inventario JSON con ``HostVars`` por host.

Todo se monta en un directorio temporal y se borra al terminar.
"""

from __future__ import annotations

import hashlib
import os
import re
import shlex
import tempfile
import uuid
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from app.core.config import settings
from app.services.ansible.disabled_roles import disable_roles
from app.services.ansible.inventory_vars import copy_inventory_vars
from app.services.ansible.models import GitPlaybookSource, ResolvedRunBundle
from app.services.ansible.play_targets import retarget_playbook
from app.services.ansible.runner import HostVars, Inventory
from app.services.git.mirror import GitError, export_tree, safe_repo_path


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
        project_dir: directorio del proyecto Ansible (``run_dir`` o el árbol
            exportado de Git).
        playbook_path: ruta del fichero playbook materializado.
        key_path_map: mapping device name -> ruta del fichero con la clave.
        inventory: inventario ya listo para ``ansible_runner.run``.
        envvars: variables de entorno extra para ansible-runner.
        secret_vars_path: fichero con los valores de las variables de secreto.
    """

    run_dir: Path
    project_dir: Path
    playbook_path: Path
    key_path_map: dict[str, Path]
    inventory: Inventory
    envvars: dict[str, str]
    secret_vars_path: Path | None = None

    @property
    def playbook(self) -> str:
        """Ruta del playbook relativa a ``project_dir``."""
        return self.playbook_path.relative_to(self.project_dir).as_posix()


def _short_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:12]


def _safe_prefix(name: str) -> str:
    """Filename-safe prefix: device names are user input (no ``/`` or ``..``)."""
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)[:48].strip(".") or "host"


class _UnsafeString(str):
    """Se escribe con ``!unsafe``: Ansible nunca lo evalúa como plantilla."""


class _SecretVarsDumper(yaml.SafeDumper):
    pass


_SecretVarsDumper.add_representer(
    _UnsafeString,
    lambda dumper, value: dumper.represent_scalar("!unsafe", str(value), style='"'),
)


def _write_secret_vars(run_dir: Path, values: dict[str, str]) -> Path:
    """Escribe las variables de secreto en un fichero ``0600`` dentro del run."""
    path = run_dir / "secret-vars.yml"
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        yaml.dump(
            {name: _UnsafeString(value) for name, value in values.items()},
            fh,
            Dumper=_SecretVarsDumper,
            allow_unicode=True,
        )
    return path


def _write_vault_password(run_dir: Path, password: str) -> Path:
    """Escribe la contraseña de Vault en un fichero ``0600`` dentro del run.

    Ansible ejecuta como script un fichero de contraseña ejecutable: este nunca
    debe tener ese bit, y queda fuera de ``project/``, el árbol del repositorio.
    """
    path = run_dir / "vault-password"
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(password)
    return path


def secret_vars_cmdline(path: Path) -> str:
    """Argumento de ``ansible-playbook``: ``run_dir`` incluye el nombre del playbook."""
    return f"-e {shlex.quote(f'@{path}')}"


def _write_key_file(key_dir: Path, host_name: str, private_key: str) -> Path:
    """Escribe la clave privada en un fichero ``0600`` y devuelve su ruta."""
    key_dir.mkdir(parents=True, exist_ok=True)
    fd, raw_path = tempfile.mkstemp(
        prefix=f"{_safe_prefix(host_name)}-", suffix=".key", dir=key_dir
    )
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
            # Per-host SSH user from the credential; the setting is a fallback.
            "ansible_user": host.username or settings.ansible_user,
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
    # Filename-safe: a ``:`` here would split ``ANSIBLE_ROLES_PATH``.
    run_dir = scratch / f"{_safe_prefix(label)}-{uuid.uuid4().hex[:12]}"
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


def materialize(
    bundle: ResolvedRunBundle, secret_values: dict[str, str] | None = None
) -> MaterializedRun:
    """Materializa el bundle en ficheros y devuelve un ``MaterializedRun``."""
    safe_name = bundle.playbook.name.replace("/", "_").replace(" ", "_") or "playbook"
    materialized_hosts = materialize_hosts(bundle.hosts, safe_name)
    run_dir = materialized_hosts.run_dir

    try:
        if bundle.playbook.git is not None:
            project_dir, playbook_path, envvars = _materialize_git(
                run_dir, bundle.playbook.git
            )
            disable_roles(project_dir, bundle.disabled_roles)
        else:
            project_dir = run_dir
            playbook_path = (
                run_dir / f"{safe_name}-{_short_hash(bundle.playbook.content)}.yml"
            )
            playbook_path.write_text(bundle.playbook.content, encoding="utf-8")
            envvars = {}
        retarget_playbook(playbook_path, project_dir)
        secret_vars_path = (
            _write_secret_vars(run_dir, secret_values) if secret_values else None
        )
    except Exception:
        cleanup(materialized_hosts)
        raise

    return MaterializedRun(
        run_dir=run_dir,
        project_dir=project_dir,
        playbook_path=playbook_path,
        key_path_map=materialized_hosts.key_path_map,
        inventory=materialized_hosts.inventory,
        envvars=envvars,
        secret_vars_path=secret_vars_path,
    )


def role_search_path(playbook_path: Path, project_dir: Path) -> str | None:
    """``ANSIBLE_ROLES_PATH`` de un playbook, o ``None`` si no hay ``roles/``.

    Recorre desde el directorio del playbook hasta ``project_dir``: el ``roles/``
    más cercano va primero. Se omite el que salga del árbol y el que contenga el
    separador de rutas, que partiría la lista (Ansible sigue encontrando por su
    cuenta el ``roles/`` junto al playbook).
    """
    root = project_dir.resolve()
    paths: list[str] = []
    directory = playbook_path.parent
    while directory.is_relative_to(root):
        candidate = directory / "roles"
        if (
            candidate.is_dir()
            and candidate.resolve().is_relative_to(root)
            and os.pathsep not in str(candidate)
        ):
            paths.append(str(candidate))
        directory = directory.parent
    return os.pathsep.join(paths) or None


def _materialize_git(
    run_dir: Path, source: GitPlaybookSource
) -> tuple[Path, Path, dict[str, str]]:
    """Exporta el commit a ``run_dir/project`` y localiza el playbook.

    El ``ansible.cfg`` del repositorio se ignora: ``ANSIBLE_CONFIG`` apunta a
    un fichero vacío controlado por el runner (tiene prioridad sobre el
    ``ansible.cfg`` del directorio de trabajo). Por eso los ``roles/`` del
    repositorio se pasan con ``ANSIBLE_ROLES_PATH`` y las variables del inventario
    que declara se copian junto al inventario del run.
    """
    project_dir = run_dir / "project"
    export_tree(source.repository_id, source.commit, project_dir)

    relative = safe_repo_path(source.path)
    playbook_path = (project_dir / relative).resolve()
    if (
        not playbook_path.is_relative_to(project_dir.resolve())
        or not playbook_path.is_file()
    ):
        raise GitError(
            "not_found", f"Playbook {source.path!r} not found at {source.commit}"
        )

    runner_cfg = run_dir / "runner-ansible.cfg"
    runner_cfg.write_text("", encoding="utf-8")
    envvars = {"ANSIBLE_CONFIG": str(runner_cfg)}
    if source.vault_password:
        envvars["ANSIBLE_VAULT_PASSWORD_FILE"] = str(
            _write_vault_password(run_dir, source.vault_password)
        )
    roles_path = role_search_path(playbook_path, project_dir)
    if roles_path is not None:
        envvars["ANSIBLE_ROLES_PATH"] = roles_path
    copy_inventory_vars(playbook_path, project_dir, run_dir)
    return project_dir.resolve(), playbook_path, envvars


def cleanup(materialized: MaterializedHosts | MaterializedRun) -> None:
    """Borra el directorio temporal de un run.

    Se llama desde un ``finally`` tanto en éxito como en error para que las
    claves privadas no se queden en disco.
    """
    import shutil

    shutil.rmtree(materialized.run_dir, ignore_errors=True)

"""Caché de repositorios Git de playbooks (``STATE_DIR/repos/<id>.git``).

Cada repositorio registrado en el backend tiene un mirror bare propio:

- ``sync`` hace fetch de la rama configurada y devuelve su commit;
- ``ensure_commit`` garantiza que un commit fijado existe antes de un run
  (un volumen nuevo no tiene el mirror);
- ``export_tree`` vuelca el árbol de un commit en el directorio del run, sin
  ``.git``, para ejecutar el playbook con sus roles/templates/vars.

Solo se permiten los transportes ``https`` y ``ssh`` (``GIT_ALLOW_PROTOCOL``),
nunca ``file``/``ext``, y se ignora cualquier config global o de sistema.
"""

from __future__ import annotations

import asyncio
import os
import re
import shlex
import shutil
import subprocess
import tarfile
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path, PurePosixPath
from typing import Literal
from uuid import UUID

from app.core.config import settings
from app.services.ansible.ssh_policy import known_hosts_path

GitErrorKind = Literal["invalid", "not_found", "unavailable"]

# Remote URL shapes accepted: https://…, ssh://…, and scp-like user@host:path.
_URL_RE = re.compile(
    r"^(https://|ssh://)[^\s]+$|^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:[^\s]+$"
)
_SHA_RE = re.compile(r"^[0-9a-f]{40}([0-9a-f]{24})?$")

SYNC_SLOTS = asyncio.Semaphore(settings.max_concurrent_syncs)
_LOCKS: dict[str, asyncio.Lock] = {}


class GitError(Exception):
    """Fallo de una operación Git, con la categoría que el servicer mapea a gRPC."""

    def __init__(self, kind: GitErrorKind, message: str) -> None:
        super().__init__(message)
        self.kind: GitErrorKind = kind


def repo_lock(repository_id: str) -> asyncio.Lock:
    """Lock por repositorio para serializar los fetch sobre el mismo mirror."""
    return _LOCKS.setdefault(repository_id, asyncio.Lock())


def repos_dir() -> Path:
    return Path(settings.state_dir).resolve() / "repos"


def mirror_path(repository_id: str) -> Path:
    try:
        canonical = str(UUID(repository_id))
    except ValueError as exc:
        raise GitError("invalid", "Invalid repository id") from exc
    return repos_dir() / f"{canonical}.git"


def validate_url(url: str) -> None:
    if not _URL_RE.match(url):
        raise GitError(
            "invalid", "Repository URL must be https://, ssh:// or user@host:path"
        )


def validate_commit(commit: str) -> None:
    if not _SHA_RE.match(commit):
        raise GitError("invalid", "Invalid commit SHA")


def _ssh_command(key_path: Path | None) -> str:
    """``GIT_SSH_COMMAND`` que respeta ``SSH_HOST_KEY_POLICY`` y ``known_hosts``."""
    parts = ["ssh", "-o", "BatchMode=yes"]
    policy = settings.ssh_host_key_policy
    if policy == "off":
        parts += [
            "-o",
            "StrictHostKeyChecking=no",
            "-o",
            "UserKnownHostsFile=/dev/null",
        ]
    else:
        known_hosts = known_hosts_path()
        known_hosts.parent.mkdir(parents=True, exist_ok=True)
        strict = "accept-new" if policy == "accept-new" else "yes"
        parts += [
            "-o",
            f"StrictHostKeyChecking={strict}",
            "-o",
            f"UserKnownHostsFile={known_hosts}",
        ]
    if key_path is not None:
        parts += ["-o", "IdentitiesOnly=yes", "-i", str(key_path)]
    return shlex.join(parts)


@contextmanager
def _git_env(private_key: str | None) -> Iterator[dict[str, str]]:
    """Entorno para git: sin prompts, sin config ajena y con la clave en ``0600``."""
    key_dir: Path | None = None
    key_path: Path | None = None
    try:
        if private_key:
            scratch = Path(settings.run_scratch_dir)
            scratch.mkdir(parents=True, exist_ok=True)
            key_dir = Path(tempfile.mkdtemp(prefix="git-key-", dir=scratch))
            key_path = key_dir / "id"
            content = private_key if private_key.endswith("\n") else private_key + "\n"
            fd = os.open(key_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                fh.write(content)
        env = {
            **os.environ,
            "GIT_TERMINAL_PROMPT": "0",
            "GIT_ALLOW_PROTOCOL": "https:ssh",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": os.devnull,
            "GIT_SSH_COMMAND": _ssh_command(key_path),
        }
        yield env
    finally:
        if key_dir is not None:
            shutil.rmtree(key_dir, ignore_errors=True)


def _git(
    args: list[str],
    *,
    env: dict[str, str] | None = None,
    git_dir: Path | None = None,
    timeout: float | None = None,
) -> bytes:
    cmd = ["git"]
    if git_dir is not None:
        cmd += ["--git-dir", str(git_dir)]
    cmd += args
    try:
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            timeout=timeout or settings.git_timeout_s,
            check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise GitError("unavailable", f"git {args[0]} timed out") from exc
    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", "replace").strip()
        raise GitError(_classify(stderr), stderr or f"git {args[0]} failed")
    return result.stdout


# Listing branches backs a form field: fail fast instead of the sync timeout.
_LIST_BRANCHES_TIMEOUT_S = 20
_MAX_BRANCHES = 1000


def list_branches(url: str, private_key: str | None) -> tuple[list[str], str]:
    """Ramas remotas y rama por defecto (``HEAD``) de ``url`` (bloqueante).

    Usa ``git ls-remote``: no crea mirror ni descarga objetos.
    """
    validate_url(url)
    with _git_env(private_key) as env:
        out = _git(
            ["ls-remote", "--symref", url, "HEAD", "refs/heads/*"],
            env=env,
            timeout=_LIST_BRANCHES_TIMEOUT_S,
        )
    branches: list[str] = []
    default = ""
    for line in out.decode("utf-8", "replace").splitlines():
        target, _, ref = line.partition("\t")
        if target.startswith("ref: refs/heads/") and ref == "HEAD":
            default = target.removeprefix("ref: refs/heads/")
        elif ref.startswith("refs/heads/"):
            branches.append(ref.removeprefix("refs/heads/"))
    branches.sort()
    return branches[:_MAX_BRANCHES], default


def _classify(stderr: str) -> GitErrorKind:
    lowered = stderr.lower()
    if "couldn't find remote ref" in lowered or "not a valid object" in lowered:
        return "not_found"
    if (
        "permission denied" in lowered
        or "authentication failed" in lowered
        or "host key verification failed" in lowered
        or "repository not found" in lowered
        or "could not read username" in lowered
    ):
        return "invalid"
    return "unavailable"


def _dir_size_mb(path: Path) -> float:
    total = 0
    for root, _dirs, files in os.walk(path):
        for name in files:
            try:
                total += (Path(root) / name).stat().st_size
            except OSError:
                pass
    return total / (1024 * 1024)


def _fetch(repository_id: str, url: str, branch: str, private_key: str | None) -> None:
    """Crea el mirror si falta y trae ``branch`` (bloqueante; en un thread)."""
    validate_url(url)
    mirror = mirror_path(repository_id)
    with _git_env(private_key) as env:
        _git(["check-ref-format", "--branch", branch], env=env)
        if not mirror.exists():
            mirror.parent.mkdir(parents=True, exist_ok=True)
            _git(["init", "--bare", "--quiet", str(mirror)], env=env)
        try:
            _git(["config", "remote.origin.url", url], env=env, git_dir=mirror)
            _git(
                [
                    "fetch",
                    "--quiet",
                    "--prune",
                    "--no-tags",
                    "origin",
                    f"+refs/heads/{branch}:refs/heads/{branch}",
                ],
                env=env,
                git_dir=mirror,
            )
        except GitError:
            # Nothing usable was fetched yet: don't leave an empty mirror behind.
            if not _has_refs(mirror):
                shutil.rmtree(mirror, ignore_errors=True)
            raise
    if _dir_size_mb(mirror) > settings.git_max_repo_mb:
        shutil.rmtree(mirror, ignore_errors=True)
        raise GitError("invalid", f"Repository exceeds {settings.git_max_repo_mb} MB")


def _has_refs(mirror: Path) -> bool:
    try:
        return bool(_git(["for-each-ref", "--count=1"], git_dir=mirror).strip())
    except GitError:
        return False


def _has_commit(mirror: Path, commit: str) -> bool:
    if not mirror.exists():
        return False
    try:
        _git(["cat-file", "-e", f"{commit}^{{commit}}"], git_dir=mirror)
        return True
    except GitError:
        return False


async def sync(
    repository_id: str, url: str, branch: str, private_key: str | None
) -> str:
    """Fetch de ``branch`` y devuelve el commit de su cabeza."""
    async with repo_lock(repository_id):
        await asyncio.to_thread(_fetch, repository_id, url, branch, private_key)
    mirror = mirror_path(repository_id)
    out = await asyncio.to_thread(
        _git, ["rev-parse", f"refs/heads/{branch}^{{commit}}"], git_dir=mirror
    )
    return out.decode().strip()


async def ensure_commit(
    repository_id: str, url: str, commit: str, private_key: str | None
) -> None:
    """Garantiza que ``commit`` está en el mirror, haciendo fetch si falta."""
    validate_commit(commit)
    mirror = mirror_path(repository_id)
    if await asyncio.to_thread(_has_commit, mirror, commit):
        return
    async with repo_lock(repository_id):
        if await asyncio.to_thread(_has_commit, mirror, commit):
            return
        # Fetch every branch: the pinned commit may live on any of them.
        await asyncio.to_thread(_fetch_all, repository_id, url, private_key)
    if not await asyncio.to_thread(_has_commit, mirror, commit):
        raise GitError("not_found", f"Commit {commit} not found in repository")


def _fetch_all(repository_id: str, url: str, private_key: str | None) -> None:
    validate_url(url)
    mirror = mirror_path(repository_id)
    with _git_env(private_key) as env:
        if not mirror.exists():
            mirror.parent.mkdir(parents=True, exist_ok=True)
            _git(["init", "--bare", "--quiet", str(mirror)], env=env)
        _git(["config", "remote.origin.url", url], env=env, git_dir=mirror)
        _git(
            [
                "fetch",
                "--quiet",
                "--no-tags",
                "origin",
                "+refs/heads/*:refs/heads/*",
            ],
            env=env,
            git_dir=mirror,
        )


def safe_repo_path(path: str) -> PurePosixPath:
    """Valida una ruta relativa al repo (sin ``..`` ni absoluta)."""
    candidate = PurePosixPath(path)
    if not path or candidate.is_absolute() or ".." in candidate.parts:
        raise GitError("invalid", f"Invalid repository path: {path!r}")
    return candidate


def export_tree(repository_id: str, commit: str, dest: Path) -> None:
    """Vuelca el árbol de ``commit`` en ``dest`` (bloqueante; en un thread).

    Se extrae con el filtro ``data`` de ``tarfile``: rechaza rutas absolutas,
    ``..`` y enlaces que salgan de ``dest``.
    """
    validate_commit(commit)
    mirror = mirror_path(repository_id)
    dest.mkdir(parents=True, exist_ok=True)
    archive = dest.parent / f"{dest.name}.tar"
    try:
        with archive.open("wb") as fh:
            try:
                result = subprocess.run(
                    [
                        "git",
                        "--git-dir",
                        str(mirror),
                        "archive",
                        "--format=tar",
                        commit,
                    ],
                    stdout=fh,
                    stderr=subprocess.PIPE,
                    timeout=settings.git_timeout_s,
                    check=False,
                )
            except subprocess.TimeoutExpired as exc:
                raise GitError("unavailable", "git archive timed out") from exc
        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", "replace").strip()
            raise GitError(_classify(stderr), stderr or "git archive failed")
        with tarfile.open(archive) as tar:
            tar.extractall(dest, filter="data")
    finally:
        archive.unlink(missing_ok=True)


def list_tree(
    repository_id: str, commit: str, subdir: str
) -> list[tuple[str, str, int]]:
    """Ficheros regulares bajo ``subdir``: ``(path, blob, size)``."""
    mirror = mirror_path(repository_id)
    args = ["ls-tree", "-r", "-z", "-l", commit]
    if subdir:
        args += ["--", safe_repo_path(subdir.strip("/")).as_posix()]
    out = _git(args, git_dir=mirror)
    entries: list[tuple[str, str, int]] = []
    for record in out.split(b"\0"):
        if not record:
            continue
        meta, _, raw_path = record.partition(b"\t")
        mode, kind, obj, size = meta.split()
        # Regular files only: skip symlinks (120000) and submodules.
        if kind != b"blob" or mode not in (b"100644", b"100755"):
            continue
        entries.append((raw_path.decode("utf-8", "replace"), obj.decode(), int(size)))
    return entries


def read_blob(repository_id: str, blob: str) -> bytes:
    return _git(["cat-file", "blob", blob], git_dir=mirror_path(repository_id))


async def delete(repository_id: str) -> None:
    mirror = mirror_path(repository_id)
    async with repo_lock(repository_id):
        await asyncio.to_thread(shutil.rmtree, mirror, True)
    _LOCKS.pop(repository_id, None)

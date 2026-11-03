"""Lectura de secretos de Infisical para un run, con el SDK oficial.

Los valores solo existen aquí y en el fichero de variables del run: nunca viajan
al backend. Los mensajes de error se construyen con referencias (nombres de
variable y de secreto) y códigos HTTP, nunca con el texto de una respuesta.
"""

from __future__ import annotations

import asyncio
import json
import re
from collections.abc import Callable, Iterable
from typing import Any

import requests
from infisical_sdk import InfisicalSDKClient
from infisical_sdk.infisical_requests import APIError
from loguru import logger
from requests.adapters import HTTPAdapter

from app.core.config import settings

# Mismo criterio que las extra vars del backend (`run/extravars.ts`).
_VARIABLE_NAME = re.compile(r"^(?!ansible_)[a-z_][a-z0-9_]*$", re.IGNORECASE)

# Un valor más corto enmascarado en toda la salida la haría ilegible.
MIN_MASKED_LENGTH = 4


class SecretFetchError(Exception):
    """Fallo al hablar con Infisical. Su mensaje nunca contiene valores."""


class _TimeoutAdapter(HTTPAdapter):
    """El SDK llama a ``requests`` sin timeout: una petición colgada dejaría el
    hilo vivo aunque ``asyncio.wait_for`` ya haya abandonado la espera."""

    def send(self, request, *args, timeout=None, **kwargs):  # noqa: ANN001, ANN002, ANN003
        return super().send(
            request, *args, timeout=timeout or settings.infisical_timeout_s, **kwargs
        )


def _describe(exc: Exception) -> str:
    if isinstance(exc, APIError):
        if exc.status_code in (401, 403):
            return "Infisical rejected the credentials or the access"
        if exc.status_code == 404:
            return "Infisical could not find the project, environment or path"
        return f"Infisical answered with HTTP {exc.status_code}"
    return "could not reach Infisical"


def _logged_in_client(auth: Any) -> InfisicalSDKClient:
    # The SDK documents ``None`` as "no cache" but types the argument as ``int``.
    client = InfisicalSDKClient(host=auth.url, cache_ttl=None)  # pyright: ignore[reportArgumentType]
    adapter = _TimeoutAdapter()
    client.api.session.mount("http://", adapter)
    client.api.session.mount("https://", adapter)
    try:
        client.auth.universal_auth.login(auth.client_id, auth.client_secret)
    except Exception as exc:  # noqa: BLE001 - se traduce a un mensaje seguro
        raise SecretFetchError(f"Infisical login failed: {_describe(exc)}") from None
    return client


def _secrets_at(
    client: InfisicalSDKClient,
    *,
    project_id: str,
    environment: str,
    path: str,
    view_values: bool,
) -> dict[str, Any]:
    """Los secretos de un path, importados incluidos. Los propios tienen prioridad."""
    response = client.secrets.list_secrets(
        environment_slug=environment,
        secret_path=path,
        project_id=project_id,
        view_secret_value=view_values,
    )
    found = {secret.secretKey: secret for secret in response.secrets}
    for imported in response.imports:
        for secret in imported.secrets:
            found.setdefault(secret.secretKey, secret)
    return found


def _read_variables(request: Any) -> dict[str, str]:
    client = _logged_in_client(request.auth)
    by_path: dict[str, dict[str, Any]] = {}
    values: dict[str, str] = {}
    for variable in request.variables:
        path = variable.secret_path or "/"
        if path not in by_path:
            try:
                by_path[path] = _secrets_at(
                    client,
                    project_id=request.project_id,
                    environment=request.environment,
                    path=path,
                    view_values=True,
                )
            except Exception as exc:  # noqa: BLE001 - mensaje seguro
                raise SecretFetchError(
                    f'Could not read secret variable "{variable.name}": '
                    f"{_describe(exc)}"
                ) from None
        secret = by_path[path].get(variable.secret_name)
        if secret is None:
            raise SecretFetchError(
                f'Secret variable "{variable.name}": secret '
                f'"{variable.secret_name}" not found in environment '
                f'"{request.environment}" at path "{path}"'
            )
        # Sin permiso de lectura Infisical devuelve un marcador, no un valor vacío.
        if secret.secretValueHidden:
            raise SecretFetchError(
                f'Secret variable "{variable.name}": the identity cannot read '
                f'the value of secret "{variable.secret_name}"'
            )
        values[variable.name] = secret.secretValue
    return values


def _read_secret_names(request: Any) -> list[str]:
    client = _logged_in_client(request.auth)
    try:
        found = _secrets_at(
            client,
            project_id=request.project_id,
            environment=request.environment,
            path=request.secret_path or "/",
            view_values=False,
        )
    except Exception as exc:  # noqa: BLE001 - mensaje seguro
        raise SecretFetchError(f"Could not list secrets: {_describe(exc)}") from None
    return sorted(found)


def _read_environments(request: Any) -> list[tuple[str, str]]:
    """Ruta sin recurso en el SDK: cualquier fallo o forma inesperada da ``[]``,
    y el formulario permite escribir el entorno a mano."""
    try:
        client = _logged_in_client(request.auth)
        url = f"{request.auth.url.rstrip('/')}/api/v1/workspace/{request.project_id}"
        response = client.api.session.get(url)
        response.raise_for_status()
        environments = response.json()["workspace"]["environments"]
        return [(env["slug"], env.get("name") or env["slug"]) for env in environments]
    except (SecretFetchError, requests.RequestException, KeyError, TypeError) as exc:
        logger.warning("Could not list Infisical environments: {}", type(exc).__name__)
    except ValueError:
        logger.warning("Infisical environments response is not JSON")
    return []


async def _bounded[T](read: Callable[[Any], T], request: Any) -> T:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(read, request), settings.infisical_timeout_s
        )
    except TimeoutError:
        raise SecretFetchError("Infisical did not answer in time") from None


async def fetch_secret_variables(request: Any) -> dict[str, str]:
    """Lee los secretos de ``SecretVariables``: ``{variable: valor}``."""
    return await _bounded(_read_variables, request)


async def list_secret_names(request: Any) -> list[str]:
    return await _bounded(_read_secret_names, request)


async def list_environments(request: Any) -> list[tuple[str, str]]:
    try:
        return await _bounded(_read_environments, request)
    except SecretFetchError:
        return []


def invalid_variable_names(names: Iterable[str]) -> list[str]:
    return sorted(name for name in names if not _VARIABLE_NAME.match(name))


def masked_values(values: Iterable[str], client_secret: str) -> list[str]:
    """Lo que hay que enmascarar en un run, primero lo más largo.

    Un valor contenido en otro dejaría el resto del largo a la vista si se
    enmascarase antes. La salida de Ansible va en JSON, así que también se busca
    cada valor escapado: comillas y saltos de línea no aparecen tal cual.
    """
    masked: set[str] = {client_secret} if client_secret else set()
    for value in values:
        if len(value) >= MIN_MASKED_LENGTH:
            masked.add(value)
            masked.add(json.dumps(value, ensure_ascii=False)[1:-1])
    return sorted(masked, key=len, reverse=True)

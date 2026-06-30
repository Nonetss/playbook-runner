"""Cliente HTTP hacia el backend para resolver un run."""

from __future__ import annotations

from uuid import UUID

import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.config import settings


class ResolvedHost(BaseModel):
    name: str
    address: str
    port: int | None = None
    username: str
    privateKey: str
    connection: str


class ResolvedPlaybook(BaseModel):
    name: str
    content: str


class ResolvedRunBundle(BaseModel):
    playbook: ResolvedPlaybook
    hosts: list[ResolvedHost]


class ResolverNotFoundError(Exception):
    """El playbook no existe."""


class ResolverValidationError(Exception):
    """La selección es inválida (vacía, devices desconocidos...)."""


class ResolverCredentiallessError(Exception):
    """Algún device seleccionado no tiene credencial asociada."""


class ResolverBackendUnreachableError(Exception):
    """El backend no responde."""


def _resolve_url() -> str:
    return f"{settings.backend_url.rstrip('/')}{settings.backend_resolve_path}"


async def resolve_run(
    *,
    cookie_header: str,
    playbook_id: UUID,
    inventory: list[dict[str, str]],
) -> ResolvedRunBundle:
    """Llama al procedimiento ``run.resolve`` del backend vía su ``OpenAPIHandler``.

    Se usa el handler REST montado en ``/api`` (no el RPC en ``/rpc``): el body
    va plano y la respuesta es JSON normal con estados HTTP estándar. Reenvía el
    ``Cookie`` del llamante para que ``protectedProcedure`` acepte la llamada y
    lanza errores semánticos para que el endpoint HTTP los mapee a respuestas SSE.
    """
    body = {
        "playbookId": str(playbook_id),
        "inventory": inventory,
    }
    return await _post_resolver(
        path=settings.backend_resolve_path,
        body=body,
        cookie_header=cookie_header,
        response_model=ResolvedRunBundle,
    )


async def resolve_device(
    *,
    cookie_header: str,
    device_id: UUID,
) -> ResolvedHost:
    """Llama al procedimiento ``run.resolveDevice`` del backend.

    Devuelve los datos de conexión (address, port, username, privateKey) del
    device asociado al ``device_id``. Usado por endpoints de diagnóstico (ping)
    que necesitan SSH contra un device conocido sin pasar por un playbook.
    """
    body = {"deviceId": str(device_id)}
    return await _post_resolver(
        path=settings.backend_resolve_device_path,
        body=body,
        cookie_header=cookie_header,
        response_model=ResolvedHost,
    )


async def _post_resolver[T](
    *,
    path: str,
    body: dict,
    cookie_header: str,
    response_model: type[T],
) -> T:
    url = f"{settings.backend_url.rstrip('/')}{path}"
    headers = {"cookie": cookie_header, "content-type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=body, headers=headers)
    except httpx.RequestError as exc:
        raise ResolverBackendUnreachableError(str(exc)) from exc

    if resp.status_code == 200:
        try:
            return response_model.model_validate(resp.json())
        except Exception as exc:  # noqa: BLE001 - respuesta inesperada del backend
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Malformed resolver response: {exc}",
            ) from exc

    error_message = _extract_orpc_error(resp)
    if resp.status_code == status.HTTP_404_NOT_FOUND:
        raise ResolverNotFoundError(error_message)
    if resp.status_code == status.HTTP_400_BAD_REQUEST:
        raise ResolverValidationError(error_message)
    if resp.status_code == status.HTTP_412_PRECONDITION_FAILED:
        raise ResolverCredentiallessError(error_message)
    if resp.status_code == status.HTTP_401_UNAUTHORIZED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=error_message
        )
    raise HTTPException(
        status_code=resp.status_code,
        detail=error_message or "Resolver call failed",
    )


def _extract_orpc_error(resp: httpx.Response) -> str:
    try:
        payload = resp.json()
    except Exception:  # noqa: BLE001 - cualquier parse error cae al texto crudo
        return resp.text or f"HTTP {resp.status_code}"

    # El OpenAPIHandler serializa los errores como ``error.toJSON()``:
    # ``{ defined, code, status, message, data }`` en el cuerpo, plano.
    if isinstance(payload, dict) and isinstance(payload.get("message"), str):
        return payload["message"]
    return resp.text or f"HTTP {resp.status_code}"


def map_resolver_error(exc: Exception) -> HTTPException:
    """Traduce una excepción del resolver a un HTTPException apropiado.

    Usado por el endpoint ``/run`` cuando la fase de resolución falla: el
    error se reporta al cliente como un evento SSE ``error`` o como respuesta
    HTTP cuando aún no se ha iniciado el stream.
    """
    if isinstance(exc, ResolverNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, ResolverValidationError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if isinstance(exc, ResolverCredentiallessError):
        return HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED, detail=str(exc)
        )
    if isinstance(exc, ResolverBackendUnreachableError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Backend unreachable: {exc}",
        )
    if isinstance(exc, HTTPException):
        return exc
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
    )

"""Run streams send heartbeats while silent and still clean up on cancel."""

import asyncio
from collections.abc import AsyncGenerator

import pytest

from app.grpc.services.runner import _with_heartbeats

INTERVAL_S = 0.02
HEARTBEAT = "heartbeat"


def heartbeats(frames: AsyncGenerator[str, None]):
    return _with_heartbeats(frames, INTERVAL_S, lambda: HEARTBEAT)


async def frames_with_pauses(*items: tuple[float, str]):
    for pause, item in items:
        await asyncio.sleep(pause)
        yield item


def test_heartbeat_during_silence() -> None:
    async def run() -> list[str]:
        source = frames_with_pauses((0, "start"), (INTERVAL_S * 5, "done"))
        return [frame async for frame in heartbeats(source)]

    frames = asyncio.run(run())

    assert frames[0] == "start"
    assert frames[-1] == "done"
    assert frames.count(HEARTBEAT) >= 2


def test_no_heartbeat_while_frames_flow() -> None:
    async def run() -> list[str]:
        source = frames_with_pauses(*((0, f"event-{i}") for i in range(20)))
        return [frame async for frame in heartbeats(source)]

    assert asyncio.run(run()) == [f"event-{i}" for i in range(20)]


def test_inner_exception_is_reraised() -> None:
    class Boom(Exception):
        pass

    async def failing():
        yield "start"
        await asyncio.sleep(INTERVAL_S * 3)
        raise Boom

    async def run() -> list[str]:
        received: list[str] = []
        with pytest.raises(Boom):
            async for frame in heartbeats(failing()):
                received.append(frame)
        return received

    received = asyncio.run(run())

    assert received[0] == "start"
    assert HEARTBEAT in received


class Run:
    """Stands in for a run: never ends on its own, async cleanup on exit."""

    def __init__(self) -> None:
        self.cleaned = False

    async def frames(self):
        try:
            yield "start"
            await asyncio.Event().wait()
            yield "unreachable"
        finally:
            # Like stopping ansible-runner and deleting the key files.
            await asyncio.sleep(INTERVAL_S)
            self.cleaned = True


def test_close_runs_inner_cleanup_first() -> None:
    run = Run()

    async def main() -> None:
        stream = heartbeats(run.frames())
        assert await anext(stream) == "start"
        assert await anext(stream) == HEARTBEAT
        await stream.aclose()
        assert run.cleaned

    asyncio.run(main())


def test_cancel_runs_inner_cleanup_first() -> None:
    run = Run()

    async def main() -> None:
        started = asyncio.Event()

        async def consume() -> None:
            async for frame in heartbeats(run.frames()):
                if frame == "start":
                    started.set()

        task = asyncio.create_task(consume())
        await started.wait()
        await asyncio.sleep(INTERVAL_S * 2)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert run.cleaned

    asyncio.run(main())

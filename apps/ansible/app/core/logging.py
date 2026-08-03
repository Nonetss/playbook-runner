import json
import logging
import sys
from datetime import UTC

from loguru import logger

_LEVEL_NAMES = {"WARNING": "WARN", "CRITICAL": "FATAL"}
_PINO_LEVELS = {
    "TRACE": 10,
    "DEBUG": 20,
    "INFO": 30,
    "WARNING": 40,
    "ERROR": 50,
    "CRITICAL": 60,
}
_LOG_LEVELS = {
    "trace": "TRACE",
    "debug": "DEBUG",
    "info": "INFO",
    "warn": "WARNING",
    "error": "ERROR",
    "fatal": "CRITICAL",
}


def configure_logging(
    service: str, *, environment: str = "development", log_level: str = "info"
) -> None:
    """Emit Pino-compatible JSON in production and compact logs in development."""
    logger.remove()
    logger.configure(extra={"service": service})
    level = _LOG_LEVELS.get(log_level.lower(), "INFO")
    if environment == "production":
        logger.add(_pino_json_sink, level=level)
    else:
        logger.add(sys.stdout, format=_pretty_format, colorize=True, level=level)
    _intercept_standard_logging()


class _InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        logger.opt(exception=record.exc_info).log(level, record.getMessage())


def _intercept_standard_logging() -> None:
    logging.basicConfig(handlers=[_InterceptHandler()], level=0, force=True)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access", "fastapi"):
        standard_logger = logging.getLogger(name)
        standard_logger.handlers = []
        standard_logger.propagate = True


def _pino_json_sink(message) -> None:
    record = message.record
    time = record["time"].astimezone(UTC)
    line: dict[str, object] = {
        "level": _PINO_LEVELS.get(record["level"].name, record["level"].no),
        "time": time.strftime("%Y-%m-%dT%H:%M:%S.")
        + f"{time.microsecond // 1000:03d}Z",
        **record["extra"],
        "msg": record["message"],
    }
    if record["exception"] is not None:
        line["err"] = {
            "type": getattr(record["exception"].type, "__name__", None),
            "message": str(record["exception"].value),
        }
    sys.stdout.write(json.dumps(line, default=str) + "\n")


def _pretty_format(record) -> str:
    level = _LEVEL_NAMES.get(record["level"].name, record["level"].name)
    fields = "".join(f"    {key}: {value}\n" for key, value in record["extra"].items())
    return (
        f"<dim>[{{time:HH:mm:ss.SSS}}]</dim> <level>{level}</level>: "
        f"<level>{{message}}</level>\n{fields}{{exception}}"
    )

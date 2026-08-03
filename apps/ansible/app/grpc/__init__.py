"""Bootstrap `gen/` onto sys.path before any `*_pb2` import.

grpc_tools.protoc emits flat absolute imports (`import ping_pb2`), so the
generated directory must be on sys.path. Doing it here means `stubs.py` (and
anything under `app.grpc`) can keep normal top-level imports without E402.
"""

from pathlib import Path

from grpc_toolkit.codegen import add_gen_dir_to_syspath

add_gen_dir_to_syspath(Path(__file__).parent / "gen")

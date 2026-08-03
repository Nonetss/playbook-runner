"""Bootstrap for generated `*_pb2*.py` stub modules.

grpc_tools.protoc always emits a flat, absolute import inside the generated
`*_pb2_grpc.py` (e.g. `import ping_pb2 as ping__pb2`), regardless of the output
package structure. Adding the `gen/` directory to `sys.path` lets that import
resolve without post-processing the generated files.
"""

import sys
from pathlib import Path


def add_gen_dir_to_syspath(gen_dir: Path) -> None:
    gen_dir_str = str(gen_dir)
    if gen_dir_str not in sys.path:
        sys.path.insert(0, gen_dir_str)

"""Run a named example from this directory, keeping common.py on the module path."""

import runpy
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
examples = sorted(path.parent.name for path in root.glob("*/main.py"))
if len(sys.argv) < 2 or sys.argv[1] not in examples:
    raise SystemExit("Usage: python run.py <example> [args]\nExamples:\n" + "\n".join(examples))
target = root / sys.argv.pop(1) / "main.py"
runpy.run_path(str(target), run_name="__main__")

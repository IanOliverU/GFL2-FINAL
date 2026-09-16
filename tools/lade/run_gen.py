"""AD2A Lade candidate build driver. Runs part 1 then part 2 in one session."""

import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

for part in ("gen_part1.py", "gen_part2.py"):
    path = os.path.join(BASE, part)
    with open(path, "r", encoding="utf-8") as handle:
        code = compile(handle.read(), path, "exec")
    exec(code, globals())

print("AD2A BUILD DRIVER COMPLETE")

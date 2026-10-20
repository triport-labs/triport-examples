import asyncio
import sys

from common import PROGRAM, run, subscribe


def main():
    logs = "--logs" in sys.argv
    # A mentions filter narrows the log stream to transactions touching this program.
    asyncio.run(subscribe("sol", "logsSubscribe" if logs else "slotSubscribe",
                          [{"mentions": [PROGRAM]}, {"commitment": "confirmed"}] if logs else []))


run(main)

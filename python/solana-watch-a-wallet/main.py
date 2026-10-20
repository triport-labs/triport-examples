import json
import os
import time
from pathlib import Path

from common import WALLET, integer, rpc, run


def main():
    state_file = Path(os.environ.get("STATE_FILE", "watch.state.json"))
    saved = json.loads(state_file.read_text()) if state_file.exists() else {}
    if saved and saved["address"] != WALLET:
        raise RuntimeError("State belongs to another ADDRESS")
    cursor = saved.get("cursor") or os.environ.get("LAST_SEEN")
    rps = integer("RPS", 2, 1000)

    def read(method, params):
        time.sleep(1 / rps)
        return rpc("sol", method, params)

    if not cursor:
        # Start at now, or pass the backfill's newest signature as LAST_SEEN.
        newest = read("getSignaturesForAddress", [WALLET, {"limit": 1, "commitment": "finalized"}])
        cursor = newest[0]["signature"] if newest else None
    deadline = time.monotonic() + integer("SECONDS", 20, 3600)
    while True:
        fresh, before = [], None
        while True:
            config = {"limit": 100, "commitment": "finalized"}
            if cursor:
                config["until"] = cursor
            if before:
                config["before"] = before
            page = read("getSignaturesForAddress", [WALLET, config])
            fresh.extend(page)
            if len(page) < 100:
                break
            before = page[-1]["signature"]  # Drain all pages before moving the cursor.
        for row in reversed(fresh):
            tx = read("getTransaction", [row["signature"], {
                "encoding": "json", "commitment": "finalized", "maxSupportedTransactionVersion": 1,
            }])
            if tx is None:
                break  # Do not skip over a body that is temporarily unavailable.
            print(json.dumps({"signature": row["signature"], "slot": row["slot"], "err": tx["meta"]["err"]}))
            cursor = row["signature"]
            temp = state_file.with_name(state_file.name + ".tmp")
            temp.write_text(json.dumps({"address": WALLET, "cursor": cursor}), encoding="utf-8")
            temp.replace(state_file)  # Handlers should deduplicate signatures after a crash.
        if time.monotonic() >= deadline:
            break
        time.sleep(2)
    print("watch complete")


run(main)

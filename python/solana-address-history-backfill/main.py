import json
import os
import time
from pathlib import Path

from common import WALLET, integer, rpc, run


def main():
    state_file = Path(os.environ.get("STATE_FILE", "history.state.json"))
    output = Path(os.environ.get("OUTPUT_FILE", "history.jsonl"))
    state = json.loads(state_file.read_text()) if state_file.exists() else {"address": WALLET, "stored": 0}
    if state["address"] != WALLET:
        raise RuntimeError("State belongs to another ADDRESS")
    page_size = integer("PAGE", 3, 1000)
    rps = integer("RPS", 2, 1000)

    def paced(method, params):
        # Signatures and bodies spend the same read budget.
        time.sleep(1 / rps)
        return rpc("sol", method, params)

    for _ in range(integer("PAGES", 1)):
        config = {"limit": page_size, "commitment": "finalized"}
        if state.get("before"):
            config["before"] = state["before"]
        rows = paced("getSignaturesForAddress", [WALLET, config])
        if rows:
            state.setdefault("newest", rows[0]["signature"])  # Watcher handover boundary.
        for row in rows:
            tx = paced("getTransaction", [row["signature"], {
                "encoding": "json", "commitment": "finalized", "maxSupportedTransactionVersion": 1,
            }])
            with output.open("a", encoding="utf-8") as stream:
                stream.write(json.dumps({**row, "tx": tx}) + "\n")
            state.update(before=row["signature"], stored=state["stored"] + 1)
            temp = state_file.with_name(state_file.name + ".tmp")
            temp.write_text(json.dumps(state), encoding="utf-8")
            temp.replace(state_file)  # Data first; a crash may duplicate a row, so upsert by signature.
        print("page", len(rows), "stored", state["stored"])
        if len(rows) < page_size:
            break  # Node retention can end history; null tx bodies are kept as raw facts.


run(main)

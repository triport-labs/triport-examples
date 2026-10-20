import json
import os
from pathlib import Path
from urllib.parse import quote, urlencode

from common import request, run


def main():
    subscription = os.environ.get("SUB_ID")
    if not subscription:
        # Read-only entitlement check: no subscription is created implicitly.
        print(json.dumps({"chains": request("/v1/wallet/watch/coverage").get("chains")}))
        return
    state_file = Path(os.environ.get("STATE_FILE", "activity.state.json"))
    saved = json.loads(state_file.read_text()) if state_file.exists() else {}
    if saved and saved["id"] != subscription:
        raise RuntimeError("State belongs to another SUB_ID")
    cursor, seen = saved.get("cursor", ""), set()
    for _ in range(3):
        query = urlencode({"cursor": cursor, "limit": 100})
        page = request(f"/v1/wallet/watch/{quote(subscription, safe='')}/events?{query}")
        for event in page["events"]:
            if event["event_id"] not in seen:
                seen.add(event["event_id"])
                # reorg_revert invalidates previous ids; gap marks unverified ranges.
                print(json.dumps(event))
        cursor = page["next_cursor"]
        temp = state_file.with_name(state_file.name + ".tmp")
        temp.write_text(json.dumps({"id": subscription, "cursor": cursor}), encoding="utf-8")
        temp.replace(state_file)  # Save only after processing the page.
        if not page["has_more"]:
            break  # Production needs durable event_id dedupe and explicit HTTP 410 recovery.


run(main)

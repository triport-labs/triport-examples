import asyncio
import json

from common import chain, run, subscribe


async def show(head):
    # Store parentHash as well as height so a replacement header can reveal a reorg.
    print(json.dumps({field: head[field] for field in ("number", "hash", "parentHash")}))


run(lambda: asyncio.run(subscribe(chain(), "eth_subscribe", ["newHeads"], show)))

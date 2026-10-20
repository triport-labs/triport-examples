import asyncio
import json
import os
import time

from common import chain, rpc, run, subscribe


async def main():
    network = chain("eth")
    if network not in ("eth", "polygon"):
        raise RuntimeError(
            f"Pending transactions are unavailable for {network}; choose CHAIN=eth or CHAIN=polygon. "
            "Base supports newHeads only; BSC supports HTTPS only"
        )
    target = os.environ.get("TO_ADDRESS", "").lower()
    last_read = 0.0

    async def show(item):
        nonlocal last_read
        if isinstance(item, str):
            if os.environ.get("FETCH_BODIES") != "1":
                print("hash", item)
                return
            if time.monotonic() - last_read < 1:
                return
            last_read = time.monotonic()
            # One read/second, sequential handler, bounded socket queue: sampling can miss transactions.
            item = await asyncio.to_thread(rpc, network, "eth_getTransactionByHash", [item])
        if item and (not target or (item.get("to") or "").lower() == target):
            print(json.dumps(item))

    # Ethereum can return objects; Polygon can accept true but still return only hashes.
    await subscribe(network, "eth_subscribe", ["newPendingTransactions", True], show)


run(lambda: asyncio.run(main()))

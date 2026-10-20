import json
import os
import re
import time

from common import chain, integer, rpc, run


def main():
    network = chain()
    address = os.environ.get("CONTRACT_ADDRESS", "")
    if not re.fullmatch(r"0x[0-9a-fA-F]{40}", address):
        raise RuntimeError("Set CONTRACT_ADDRESS")
    head = int(rpc(network, "eth_blockNumber"), 16)
    start = int(os.environ["FROM_BLOCK"], 0) if "FROM_BLOCK" in os.environ else head - 9
    stop = int(os.environ["TO_BLOCK"], 0) if "TO_BLOCK" in os.environ else head
    if start < 0 or stop < start or stop - start > 100_000:
        raise RuntimeError("Invalid block range (max 100001 blocks)")
    chunk = integer("CHUNK", 10, 10_000)
    while start <= stop:
        end = min(start + chunk - 1, stop)
        try:
            logs = rpc(network, "eth_getLogs", [{"address": address,
                       "fromBlock": hex(start), "toBlock": hex(end)}])
            for log in logs:
                print(json.dumps(log))
            # Persist blockHash + transactionHash + logIndex for dedupe and reorg rollback.
            print("range", start, end, "logs", len(logs))
            start = end + 1
        except RuntimeError as error:
            if not str(error).startswith("RPC ") or chunk == 1:
                raise
            chunk = (chunk + 1) // 2  # Retry smaller ranges when a node's limit is lower.
        time.sleep(0.5)


run(main)

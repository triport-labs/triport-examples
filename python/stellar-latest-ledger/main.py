from common import request, run


def main():
    # Horizon is REST/HAL; descending order plus limit=1 selects the newest retained ledger.
    ledger = request("/rpc/stellar/horizon/ledgers?limit=1&order=desc")["_embedded"]["records"][0]
    print("ledger", ledger["sequence"], "hash", ledger["hash"])


run(main)

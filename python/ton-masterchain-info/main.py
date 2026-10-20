import json

from common import rpc, run


def main():
    # TON expects object params and returns a masterchain block reference.
    print(json.dumps(rpc("ton", "getMasterchainInfo", {})["last"]))


run(main)

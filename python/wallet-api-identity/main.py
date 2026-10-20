import json
import os
import re

from common import request, run


def main():
    address = os.environ.get("EVM_ADDRESS", "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
    if not re.fullmatch(r"0x[0-9a-fA-F]{40}", address):
        raise RuntimeError("Invalid EVM_ADDRESS")
    # Projection avoids optional deployer scans. Individual chain failures can appear in a 200 profile.
    profile = request(f"/v1/wallet/{address}/identity?chains=eth&fields=balances,activity")
    print(json.dumps({name: profile.get(name) for name in ("address", "chains", "activity")}))


run(main)

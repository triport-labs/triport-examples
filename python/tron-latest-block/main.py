from common import request, run


def main():
    # Use the native Wallet API for the current solid block.
    block = request("/rpc/tron/wallet/getnowblock", {})
    print("block", block["block_header"]["raw_data"]["number"], "id", block["blockID"])


run(main)

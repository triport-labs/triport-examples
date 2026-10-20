from common import chain, rpc, run


def main():
    network = chain()
    # Python integers keep hexadecimal quantities exact at any chain height.
    print(network, int(rpc(network, "eth_blockNumber"), 16))


run(main)

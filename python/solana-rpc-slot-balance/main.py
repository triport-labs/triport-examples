from common import WALLET, rpc, run


def main():
    # Finalized balances are useful for accounting that must survive a fork.
    print("slot", rpc("sol", "getSlot", [{"commitment": "finalized"}]))
    print("balance", rpc("sol", "getBalance", [WALLET, {"commitment": "finalized"}]))


run(main)

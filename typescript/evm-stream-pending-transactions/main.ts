import { chain, rpc, run, subscribe } from "../common.js";

run(async () => {
  const c = chain("eth");
  if (!["eth", "polygon"].includes(c)) throw new Error(`Pending transactions are unavailable for ${c}; choose CHAIN=eth or CHAIN=polygon. Base supports newHeads only; BSC supports HTTPS only`);
  let busy = false;
  let lastRead = 0;
  const target = process.env.TO_ADDRESS?.toLowerCase();
  // Ethereum can serve full objects; Polygon may ignore true and send hashes instead.
  await subscribe(c, "eth_subscribe", ["newPendingTransactions", true], (item) => {
    if (typeof item === "object") {
      if (!target || item.to?.toLowerCase() === target) console.log(JSON.stringify(item));
    } else if (process.env.FETCH_BODIES !== "1") {
      console.log("hash", item);
    } else if (!busy && Date.now() - lastRead >= 1000) {
      // At most one body read/second and no queue: this is a sample, not complete mempool capture.
      busy = true; lastRead = Date.now();
      void rpc(c, "eth_getTransactionByHash", [item]).then((tx) => {
        if (tx && (!target || tx.to?.toLowerCase() === target)) console.log(JSON.stringify(tx));
      }).catch((e: Error) => console.error(e.message)).finally(() => { busy = false; });
    }
  }); // Pending transactions can disappear or be replaced; they are not confirmations.
});

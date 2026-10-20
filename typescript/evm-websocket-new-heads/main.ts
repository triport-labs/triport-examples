import { chain, run, subscribe } from "../common.js";

run(async () => {
  // Headers can be replaced by a reorg: persist the parentHash as well as the height.
  await subscribe(chain(), "eth_subscribe", ["newHeads"], (head) => {
    console.log(JSON.stringify({ number: head.number, hash: head.hash, parentHash: head.parentHash }));
  });
});

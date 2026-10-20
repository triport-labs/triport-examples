import { chain, rpc, run } from "../common.js";

run(async () => {
  const c = chain();
  // Keep hexadecimal quantities as bigint so large chain counters remain exact.
  console.log(c, BigInt(await rpc<string>(c, "eth_blockNumber")).toString());
});

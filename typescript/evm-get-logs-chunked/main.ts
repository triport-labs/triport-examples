import { chain, integer, rpc, run, sleep } from "../common.js";

run(async () => {
  const c = chain();
  const address = process.env.CONTRACT_ADDRESS;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("Set CONTRACT_ADDRESS");
  const head = BigInt(await rpc<string>(c, "eth_blockNumber"));
  let from = process.env.FROM_BLOCK ? BigInt(process.env.FROM_BLOCK) : head - 9n;
  const to = process.env.TO_BLOCK ? BigInt(process.env.TO_BLOCK) : head;
  if (from < 0n || to < from || to - from > 100_000n) throw new Error("Invalid block range (max 100001 blocks)");
  let span = BigInt(integer("CHUNK", 10, 10_000));
  while (from <= to) {
    const end = from + span - 1n < to ? from + span - 1n : to;
    try {
      const logs = await rpc<any[]>(c, "eth_getLogs", [{
        address, fromBlock: `0x${from.toString(16)}`, toBlock: `0x${end.toString(16)}`,
      }]);
      // Narrow ranges bound response size; persist (blockHash, transactionHash, logIndex) to dedupe.
      for (const log of logs) console.log(JSON.stringify(log));
      console.log("range", from.toString(), end.toString(), "logs", logs.length);
      from = end + 1n;
    } catch (error) {
      // Some nodes enforce smaller ranges. Reduce RPC failures; auth/transport errors must surface.
      if (!(error instanceof Error) || !error.message.startsWith("RPC ") || span === 1n) throw error;
      span = (span + 1n) / 2n;
    }
    await sleep(500);
  }
});

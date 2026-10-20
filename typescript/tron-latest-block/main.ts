import { request, run } from "../common.js";

run(async () => {
  // The native Wallet API returns the solid block, rather than an EVM-shaped header.
  const block = await request("/rpc/tron/wallet/getnowblock", {});
  if (!block.block_header) throw new Error("Missing Tron block header");
  console.log("block", block.block_header.raw_data.number, "id", block.blockID);
});

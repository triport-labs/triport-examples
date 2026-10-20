import { request, run } from "../common.js";

run(async () => {
  // Horizon is REST/HAL: descending order plus limit=1 returns the newest retained ledger.
  const page = await request("/rpc/stellar/horizon/ledgers?limit=1&order=desc");
  const ledger = page._embedded?.records?.[0];
  if (!ledger) throw new Error("Missing Stellar ledger");
  console.log("ledger", ledger.sequence, "hash", ledger.hash);
});

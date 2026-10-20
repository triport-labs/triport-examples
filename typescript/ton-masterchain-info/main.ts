import { rpc, run } from "../common.js";

run(async () => {
  // TON uses object params; the masterchain reference points to the latest chain state.
  const info = await rpc("ton", "getMasterchainInfo", {});
  if (!info.last) throw new Error("Missing TON masterchain reference");
  console.log(JSON.stringify(info.last));
});

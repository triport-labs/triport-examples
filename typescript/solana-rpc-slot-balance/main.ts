import { rpc, run, wallet } from "../common.js";

run(async () => {
  // Finalized reads are useful for accounting that must survive a fork.
  console.log("slot", await rpc("sol", "getSlot", [{ commitment: "finalized" }]));
  console.log("balance", await rpc("sol", "getBalance", [wallet, { commitment: "finalized" }]));
});

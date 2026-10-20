import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { rpc, run } from "../common.js";

run(async () => {
  const send = process.argv.includes("--send");
  if (send && !process.env.KEYPAIR_FILE) throw new Error("--send requires a funded KEYPAIR_FILE");
  const payer = send
    ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(process.env.KEYPAIR_FILE!, "utf8"))))
    : Keypair.generate();
  const latest = await rpc("sol", "getLatestBlockhash", [{ commitment: "confirmed" }]);
  // A self-transfer demonstrates a signed wire transaction without choosing a recipient.
  const tx = new Transaction({ feePayer: payer.publicKey, recentBlockhash: latest.value.blockhash })
    .add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: payer.publicKey, lamports: 1 }));
  tx.sign(payer);
  const wire = tx.serialize().toString("base64");
  const simulation = await rpc("sol", "simulateTransaction", [wire, {
    encoding: "base64", sigVerify: true, commitment: "confirmed",
  }]);
  console.log("simulation", { err: simulation.value.err, unitsConsumed: simulation.value.unitsConsumed });
  // An ephemeral payer has no SOL: AccountNotFound / insufficient funds is an expected result.
  if (!send) return;
  if (simulation.value.err) throw new Error("Simulation failed; refusing send");
  console.log("signature", await rpc("sol", "sendTransaction", [wire, {
    encoding: "base64", skipPreflight: false, maxRetries: 2,
  }])); // The returned signature is submission, not confirmation; fees are charged on inclusion.
});

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { integer, rpc, run, seconds, sleep, wallet } from "../common.js";

interface Sig { signature: string; slot: number }
const file = process.env.STATE_FILE ?? "watch.state.json";
const rps = integer("RPS", 2, 1000);

run(async () => {
  const saved = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;
  if (saved && saved.address !== wallet) throw new Error("State belongs to another ADDRESS");
  let cursor: string | undefined = saved?.cursor ?? process.env.LAST_SEEN;
  async function read(method: string, params: unknown[]): Promise<any> {
    await sleep(1000 / rps);
    return rpc("sol", method, params);
  }
  if (!cursor) {
    // Start at now. LAST_SEEN can bridge the boundary from a history backfill.
    const newest: Sig[] = await read("getSignaturesForAddress", [wallet, { limit: 1, commitment: "finalized" }]);
    cursor = newest[0]?.signature;
  }
  const end = Date.now() + seconds * 1000;
  do {
    const fresh: Sig[] = [];
    let before: string | undefined;
    for (;;) {
      const page: Sig[] = await read("getSignaturesForAddress", [wallet, {
        limit: 100, until: cursor, before, commitment: "finalized",
      }]);
      fresh.push(...page);
      if (page.length < 100) break;
      before = page.at(-1)!.signature; // Drain all pages so busy wallets do not lose signatures.
    }
    for (const row of fresh.reverse()) {
      const tx = await read("getTransaction", [row.signature, {
        encoding: "json", commitment: "finalized", maxSupportedTransactionVersion: 1,
      }]);
      if (tx === null) break; // Retry the missing body before advancing beyond it.
      console.log(JSON.stringify({ signature: row.signature, slot: row.slot, err: tx.meta?.err }));
      cursor = row.signature;
      writeFileSync(`${file}.tmp`, JSON.stringify({ address: wallet, cursor }));
      renameSync(`${file}.tmp`, file); // Handlers should deduplicate by signature after a crash.
    }
    await sleep(2000);
  } while (Date.now() < end);
  console.log("watch complete");
});

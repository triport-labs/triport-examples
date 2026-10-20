import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { integer, rpc, run, sleep, wallet } from "../common.js";

interface State { address: string; before?: string; newest?: string; stored: number }
interface Sig { signature: string; slot: number }
const file = process.env.STATE_FILE ?? "history.state.json";
const output = process.env.OUTPUT_FILE ?? "history.jsonl";
const pageSize = integer("PAGE", 3, 1000);
const pages = integer("PAGES", 1);
const rps = integer("RPS", 2, 1000);
const state: State = existsSync(file)
  ? JSON.parse(readFileSync(file, "utf8")) : { address: wallet, stored: 0 };

run(async () => {
  if (state.address !== wallet) throw new Error("State belongs to another ADDRESS");
  async function paced(method: string, params: unknown[]): Promise<any> {
    // Both methods spend the same read budget; leave capacity for the live watcher.
    await sleep(1000 / rps);
    return rpc("sol", method, params);
  }
  for (let p = 0; p < pages; p++) {
    const rows: Sig[] = await paced("getSignaturesForAddress", [wallet, {
      before: state.before, limit: pageSize, commitment: "finalized",
    }]);
    state.newest ??= rows[0]?.signature; // Hand this boundary to the watcher as LAST_SEEN.
    for (const row of rows) {
      const tx = await paced("getTransaction", [row.signature, {
        encoding: "json", commitment: "finalized", maxSupportedTransactionVersion: 1,
      }]);
      appendFileSync(output, JSON.stringify({ ...row, tx }) + "\n");
      state.before = row.signature; state.stored++;
      // Write data first, then atomically replace the checkpoint. A crash can duplicate a row;
      // consumers should upsert by signature. Null tx bodies can mark the retention boundary.
      writeFileSync(`${file}.tmp`, JSON.stringify(state));
      renameSync(`${file}.tmp`, file);
    }
    console.log("page", rows.length, "stored", state.stored);
    if (rows.length < pageSize) break;
  }
});

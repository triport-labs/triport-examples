import { program, run, subscribe } from "../common.js";

run(async () => {
  const logs = process.argv.includes("--logs");
  // A mentions filter keeps a program's logs from becoming an unbounded firehose.
  await subscribe("sol", logs ? "logsSubscribe" : "slotSubscribe",
    logs ? [{ mentions: [program] }, { commitment: "confirmed" }] : []);
});

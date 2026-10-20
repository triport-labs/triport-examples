import Yellowstone from "@triton-one/yellowstone-grpc";
import type { SubscribeRequest, SubscribeUpdate } from "@triton-one/yellowstone-grpc";
import bs58 from "bs58";
import { key, program, run, seconds } from "../common.js";

run(async () => {
  // The package is CommonJS; Node's ESM loader exposes the client on its default export.
  const { default: Client, CommitmentLevel } = Yellowstone;
  const client = new Client("https://grpc.triport.io", key, {
    "grpc.max_receive_message_length": 64 * 1024 * 1024,
  });
  const stream = await client.subscribe();
  const request: SubscribeRequest = {
    accounts: {}, slots: {}, transactions: { pump: {
      vote: false, failed: false, accountInclude: [program], accountExclude: [], accountRequired: [],
    } }, transactionsStatus: {}, blocks: {}, blocksMeta: {}, entry: {}, accountsDataSlice: [],
    commitment: CommitmentLevel.CONFIRMED,
  };
  // Account inclusion finds transactions touching the program; it does not decode buys/sells.
  await new Promise<void>((resolve, reject) => {
    let seen = false;
    const timer = setTimeout(() => finish(seen ? undefined : new Error("No gRPC transactions before timeout")), seconds * 1000);
    function finish(error?: Error): void {
      clearTimeout(timer); stream.cancel();
      if (error) reject(error); else resolve();
    }
    stream.on("data", (update: SubscribeUpdate) => {
      if (update.ping) {
        stream.write({ ...request, ping: { id: 1 } }); // Answer keepalive without dropping filters.
      }
      if (update.transaction) {
        seen = true;
        const tx = update.transaction;
        console.log("slot", tx.slot, "signature", tx.transaction && bs58.encode(tx.transaction.signature));
      }
    });
    stream.on("error", (e: { code?: number }) => finish(new Error(`gRPC status ${e.code ?? "unknown"}`)));
    stream.on("end", () => finish(new Error("gRPC stream ended")));
    stream.write(request, (error: Error | null) => { if (error) finish(new Error("gRPC write failed")); });
  });
});

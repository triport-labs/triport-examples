# TypeScript examples

Requires Node.js 22+. Uses native `fetch`, `ws`, Solana web3 for signing and
the Yellowstone protobuf client. All endpoints are Triport endpoints.

```sh
npm ci --ignore-scripts
cp .env.example .env
# Set TRIPORT_API_KEY in .env.
npm run check
npm run example -- solana-rpc-slot-balance/main.ts
```

Run commands from this directory. `npm run example` loads `.env`; values already
exported in your shell take precedence. No funded wallet is needed for reads or simulation.

| Command after `npm run example --` | Options in `.env` / arguments |
|---|---|
| `solana-rpc-slot-balance/main.ts` | `ADDRESS` |
| `solana-address-history-backfill/main.ts` | `ADDRESS`, `PAGE=3`, `PAGES=1`, `RPS=2`, `STATE_FILE`, `OUTPUT_FILE` |
| `solana-websocket-slot-logs/main.ts` | `SECONDS`; `--logs` and optional `PROGRAM_ID` |
| `solana-yellowstone-grpc-pump-fun-monitor/main.ts` | `PROGRAM_ID`, `SECONDS`; Pro+ and `stream.grpc.solana` |
| `solana-simulate-send-transaction/main.ts` | Default: ephemeral simulation. `--send` requires funded `KEYPAIR_FILE` |
| `solana-watch-a-wallet/main.ts` | `ADDRESS`, `LAST_SEEN`, `STATE_FILE`, `RPS`, `SECONDS` |
| `evm-rpc-block-number/main.ts` | `CHAIN=base|eth|bsc|polygon|robinhood` |
| `evm-get-logs-chunked/main.ts` | `CHAIN`, required `CONTRACT_ADDRESS`, optional `FROM_BLOCK`, `TO_BLOCK`, `CHUNK=10` |
| `evm-websocket-new-heads/main.ts` | `CHAIN=base|eth|polygon|robinhood`, `SECONDS`, optional `MAX_EVENTS` |
| `evm-stream-pending-transactions/main.ts` | `CHAIN=eth|polygon` (default `eth`); `FETCH_BODIES=1`, `TO_ADDRESS`, `SECONDS`, optional `MAX_EVENTS` |
| `tron-latest-block/main.ts` | API key only |
| `ton-masterchain-info/main.ts` | API key only |
| `stellar-latest-ledger/main.ts` | API key only |
| `wallet-api-identity/main.ts` | Business+; optional `EVM_ADDRESS` |
| `wallet-api-activity/main.ts` | Business+ account key; optional existing `SUB_ID`, `STATE_FILE` |

Block range inputs accept decimal or `0x` hexadecimal. Logs default to the latest
ten blocks and a ten-block chunk. Use a contract on the selected chain. For example,
Base's wrapped native token is `0x4200000000000000000000000000000000000006`.
Pending hash body reads sample at most one transaction per second and can miss
transactions; Ethereum full objects are filtered locally. An omitted `TO_ADDRESS`
prints all observed objects/hashes. Hash-only mode cannot apply a recipient filter.

Backfill output/checkpoints are created in the current directory. Rerunning resumes;
use a different `STATE_FILE` and `OUTPUT_FILE` for each address. A crash between
append and checkpoint can duplicate a row: deduplicate by signature. Pass the
checkpoint's `newest` to the watcher as `LAST_SEEN`. The watcher uses finalized
polling so catch-up works even when an account's lamport balance does not change.
`SECONDS` bounds the polling session between catch-ups; a page drain may take longer.

The pump.fun monitor matches successful, non-vote transactions touching the program;
it prints signature/slot without interpreting trades. Change `PROGRAM_ID` for another program.

To send a transaction intentionally, place a funded Solana JSON secret-key array
outside this repository, set `KEYPAIR_FILE`, then run:

```sh
npm run example -- solana-simulate-send-transaction/main.ts --send
```

This sends a one-lamport self-transfer only if simulation succeeds; fees still apply.
Default simulation uses an unfunded ephemeral payer and can return `AccountNotFound`.

For Wallet activity, the default coverage check creates no subscription. To consume
events, use an existing pull subscription with `events: ["wallet_activity"]`, or
explicitly create one with your account key:

```sh
curl https://triport.io/v1/wallet/watch \
  -H "x-token: $TRIPORT_API_KEY" -H "content-type: application/json" \
  -d '{"name":"examples-wallet-activity","chains":["base"],"events":["wallet_activity"],"watchlist":["0x4200000000000000000000000000000000000006"],"delivery":{"type":"pull"}}'
# Put the returned id in SUB_ID, then:
npm run example -- wallet-api-activity/main.ts
```

The curl command reads the shell environment; export the key before running it.
The reader prints up to three pages, saves the portable cursor after processing,
and deduplicates within the run. Production needs durable event-id dedupe for at
least five minutes. Apply `reorg_revert.removed_event_ids` to your store and mark
`gap` ranges unverified. HTTP 410 means the retained cursor expired; inspect the
Wallet activity guide and backfill the missing range before starting a new cursor.
HTTP 401/403 is an entitlement/account error, not an empty stream.

Only `npm run check` runs in CI; examples require an explicit local invocation.

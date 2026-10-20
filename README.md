<p align="center"><img src="https://raw.githubusercontent.com/triport-labs/.github/main/profile/assets/banner-9-networks.png" alt="Triport" width="100%"></p>

# Triport examples

Clone-and-run examples for nine blockchain networks. They use `fetch`, `ws`,
`requests`, `websockets`, Solana web3 and standard Yellowstone clients; no Triport
SDK or unpublished package is required. Each source file stays within 150 lines.

## Quick start

With Node.js 22+ installed and an API key from the Triport console:

```sh
git clone https://github.com/triport-labs/triport-examples.git
cd triport-examples/typescript
npm ci --ignore-scripts
cp .env.example .env
# Set TRIPORT_API_KEY in .env, then:
npm run example -- solana-rpc-slot-balance/main.ts
```

PowerShell: replace `cp` with `Copy-Item` if needed. Choose the
[TypeScript](typescript/README.md), [Python](python/README.md) or [Rust](rust/README.md)
instructions for all commands and environment options. Dependencies and lock files
are local to each language directory.

## Examples

EVM below means Base, Ethereum, BNB Smart Chain, Polygon and Robinhood Chain.
Set `CHAIN=base|eth|bsc|polygon|robinhood`; the default is Base, except pending transactions default to Ethereum.

| Example | Network | Language | What it shows |
|---|---|---|---|
| [solana-rpc-slot-balance](typescript/solana-rpc-slot-balance/main.ts) | Solana | TS, Python, Rust | Finalized `getSlot` and `getBalance` |
| [solana-address-history-backfill](typescript/solana-address-history-backfill/main.ts) | Solana | TS, Python | Paced signatures + transaction bodies, durable cursor, watcher boundary |
| [solana-websocket-slot-logs](typescript/solana-websocket-slot-logs/main.ts) | Solana | TS, Python | `slotSubscribe`; `--logs` selects program `logsSubscribe` |
| [solana-yellowstone-grpc-pump-fun-monitor](typescript/solana-yellowstone-grpc-pump-fun-monitor/main.ts) | Solana | TS, Rust | Non-vote, successful transactions touching the pump.fun program |
| [solana-simulate-send-transaction](typescript/solana-simulate-send-transaction/main.ts) | Solana | TS | Build, sign and simulate; explicit `--send` with a funded keypair |
| [solana-watch-a-wallet](typescript/solana-watch-a-wallet/main.ts) | Solana | TS, Python | Poll with pagination, persisted cursor and ordered body reads |
| [evm-rpc-block-number](typescript/evm-rpc-block-number/main.ts) | EVM | TS, Python | `eth_blockNumber` with exact integer conversion |
| [evm-get-logs-chunked](typescript/evm-get-logs-chunked/main.ts) | EVM | TS, Python | Bounded `eth_getLogs` ranges, smaller-range retry |
| [evm-websocket-new-heads](typescript/evm-websocket-new-heads/main.ts) | ETH, Polygon, Base, Robinhood | TS, Python | `newHeads`, including hashes needed to detect reorgs |
| [evm-stream-pending-transactions](typescript/evm-stream-pending-transactions/main.ts) | Ethereum, Polygon | TS, Python | Full objects or hashes; optional sampled body reads |
| [tron-latest-block](typescript/tron-latest-block/main.ts) | Tron | TS, Python | Native Wallet API solid block |
| [ton-masterchain-info](typescript/ton-masterchain-info/main.ts) | TON | TS, Python | Latest masterchain block reference |
| [stellar-latest-ledger](typescript/stellar-latest-ledger/main.ts) | Stellar | TS, Python | Horizon's newest retained ledger |
| [wallet-api-identity](typescript/wallet-api-identity/main.ts) | Cross-chain EVM | TS, Python | Business+ profile projection, partial chain results |
| [wallet-api-activity](typescript/wallet-api-activity/main.ts) | ETH, Base, BNB, Polygon, Robinhood | TS, Python | Coverage check or existing subscription events with cursor resume |

## Operating notes

Streams close after `SECONDS` (default 20), or after `MAX_EVENTS` if set. A timeout with no events is reported
as a failure so a subscription acknowledgement is never confused with data delivery.
These are small learning programs: production ingestion needs durable deduplication,
reconnection, catch-up and reorg handling. RPC and WebSocket helpers bound retries
and hide raw transport errors. Keep your key in the environment.

The backfill defaults to one page of three signatures at two requests per second;
set `PAGES`, `PAGE` and `RPS` deliberately. Both signatures and transaction bodies
consume the same read budget. Its `newest` checkpoint is the watcher's `LAST_SEEN`.
An address history only includes transactions mentioning that address; token-account
activity may require watching the wallet's token accounts separately.

Yellowstone needs Pro+ and `stream.grpc.solana`. EVM subscription access depends
on the key's scopes and tier (Base uses `base:ws`). Pending examples allow only
Ethereum and Polygon and default to Ethereum. They reject Base, BSC and Robinhood.
Base supports `newHeads` only; BSC supports HTTPS only. Pending streams depend
on network/tier support and are observations, not inclusion guarantees.

Wallet identity/activity require Business+; activity also needs a dashboard key
backed by an account. The activity example defaults to a read-only coverage check;
with `SUB_ID` it reads an existing `wallet_activity` subscription. See the language
READMEs for creating one explicitly and for cursor/reorg limitations.

Simulation defaults to a fresh ephemeral payer. A funding error is expected and
does not mean the signed request failed to reach the RPC. `--send` requires
`KEYPAIR_FILE`, runs simulation first, and can spend fees; the returned signature
still needs confirmation. Never commit your keypair.

## Guides

[Backfill a Solana address](https://triport.io/docs/guides/backfill-solana-address-history) ·
[Watch a wallet](https://triport.io/docs/guides/watch-a-solana-wallet) ·
[Pending EVM transactions](https://triport.io/docs/guides/stream-pending-evm-transactions) ·
[Yellowstone gRPC](https://triport.io/docs/streaming/sol-grpc) ·
[Wallet identity](https://triport.io/docs/platform/wallet-identity) ·
[Wallet activity](https://triport.io/docs/platform/wallet-activity)

CI runs static checks only (`tsc --noEmit`, `ruff`, `py_compile`, `cargo check`);
it never calls blockchain endpoints or needs API keys.

[Website](https://triport.io) · [Docs](https://triport.io/docs) · [X](https://x.com/triport_io) · [Telegram](https://t.me/triport_dev) · [Email](mailto:sales@triport.io)

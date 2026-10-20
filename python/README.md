# Python examples

Requires Python 3.11+ and [uv](https://docs.astral.sh/uv/). Uses `requests` and
`websockets` without a Triport SDK. Work from this directory:

```sh
uv sync --locked
cp .env.example .env
# Set TRIPORT_API_KEY in .env.
uv run --env-file .env python run.py solana-rpc-slot-balance
uv run ruff check .
uv run python -c "import pathlib,subprocess,sys; subprocess.run([sys.executable,'-m','py_compile',*[str(p) for p in pathlib.Path('.').rglob('*.py') if '.venv' not in p.parts]],check=True)"
```

`run.py` selects a named directory and keeps `common.py` importable. The launcher
accepts the following names after `python run.py`:

| Example | Environment / arguments |
|---|---|
| `solana-rpc-slot-balance` | `ADDRESS` |
| `solana-address-history-backfill` | `ADDRESS`, `PAGE=3`, `PAGES=1`, `RPS=2`, `STATE_FILE`, `OUTPUT_FILE` |
| `solana-websocket-slot-logs` | `SECONDS`; add `--logs` for `PROGRAM_ID` logs |
| `solana-watch-a-wallet` | `ADDRESS`, `LAST_SEEN`, `STATE_FILE`, `RPS=2`, `SECONDS` |
| `evm-rpc-block-number` | `CHAIN=base|eth|bsc|polygon|robinhood` |
| `evm-get-logs-chunked` | `CHAIN`, required `CONTRACT_ADDRESS`, `FROM_BLOCK`, `TO_BLOCK`, `CHUNK=10` |
| `evm-websocket-new-heads` | `CHAIN=base|eth|polygon|robinhood`, `SECONDS`, optional `MAX_EVENTS` |
| `evm-stream-pending-transactions` | `CHAIN=eth|polygon` (default `eth`); `FETCH_BODIES=1`, `TO_ADDRESS`, `SECONDS`, optional `MAX_EVENTS` |
| `tron-latest-block` | Key only |
| `ton-masterchain-info` | Key only |
| `stellar-latest-ledger` | Key only |
| `wallet-api-identity` | Business+; optional `EVM_ADDRESS` |
| `wallet-api-activity` | Business+ account key; optional existing `SUB_ID`, `STATE_FILE` |

TypeScript additionally demonstrates signed Solana simulation/submission; TypeScript
and Rust provide the Yellowstone program monitor. See the [full example table](../README.md#examples).

Streams last `SECONDS` (default 20), or stop after `MAX_EVENTS` if set; no data before timeout is an error. `newHeads`
requires the corresponding key scope/tier. Pending examples allow only Ethereum
and Polygon and default to Ethereum; Base, BSC and Robinhood are rejected.
Base supports `newHeads` only; BSC supports HTTPS only. Ethereum can return
full objects, Polygon can return hashes even with `true`. `FETCH_BODIES=1` samples
hash bodies at most once per second; bounded queues may miss transactions. Without
body reads, a recipient filter cannot be applied to hashes. Pending is not confirmed.

Logs default to the latest ten blocks. Inputs accept decimal or `0x` hexadecimal.
Set a contract on your selected chain, for example on Base:
`CONTRACT_ADDRESS=0x4200000000000000000000000000000000000006`.

Backfill appends raw transactions and saves an atomic checkpoint after each row.
Deduplicate signatures after a crash. Null bodies can reflect the node's retention
boundary. Choose separate output/state files per address. Set the watcher's
`LAST_SEEN` to the backfill checkpoint's `newest` to bridge history and live data.
The watcher polls finalized signatures and drains every page before advancing its
cursor; body reads happen oldest first. `SECONDS` is checked between catch-ups.
Watching a wallet address alone does not cover all its token accounts.

Wallet activity defaults to the read-only `/coverage` check. With `SUB_ID`, it reads
an existing pull subscription configured with `events: ["wallet_activity"]` and a
nonempty `watchlist`. See the explicit creation command in the
[TypeScript README](../typescript/README.md). The shell key must be exported for
that curl command; `uv --env-file` only loads it into the launched process.
The reader handles up to three pages, deduplicates within the run and saves the
portable cursor after each processed page. Production needs durable event-id dedupe
for at least five minutes, rollback for `reorg_revert.removed_event_ids`, and explicit
unverified ranges for `gap`. HTTP 410 requires recovery of expired history; 401/403
requires an account/tier fix. These statuses are surfaced as errors.

CI runs ruff and `py_compile` only; it needs no key and never invokes the examples.

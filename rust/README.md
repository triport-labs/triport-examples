# Rust examples — Solana RPC and Yellowstone gRPC

Requires a current stable Rust toolchain. Dependencies include the standard
Yellowstone protobuf crate and generated Geyser client over `tonic`; no Triport SDK is used. The checked-in
`Cargo.lock` makes clone-and-run dependency resolution reproducible.

```sh
cp .env.example .env
# Set TRIPORT_API_KEY in .env, then export it in your shell.
# POSIX shells: set -a; . ./.env; set +a
cargo run --locked --bin solana-rpc-slot-balance
cargo run --locked --bin solana-yellowstone-grpc-pump-fun-monitor
cargo fmt --check
cargo check --locked --all-targets
```

Rust does not load `.env` automatically. In PowerShell, read the values locally
without displaying the key:

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^([A-Z_]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
```

| Binary | What it shows | Options |
|---|---|---|
| `solana-rpc-slot-balance` | Finalized `getSlot` and `getBalance` with a request timeout | `ADDRESS` |
| `solana-yellowstone-grpc-pump-fun-monitor` | Successful non-vote transactions touching pump.fun | `PROGRAM_ID`, `SECONDS=20` |

The gRPC example uses TLS and `x-token` metadata against `grpc.triport.io:443`.
It requires Pro+ and scope `stream.grpc.solana`. The filter matches account
inclusion; it prints signature and slot without decoding buy/sell events. It answers
server pings and drops the stream after the configured duration. A session with no
transactions returns an error. Production needs reconnection plus a separate RPC
catch-up strategy because a live gRPC subscription provides no replay guarantee.

For EVM, Tron, TON, Stellar, wallet history and signed transaction simulation, see
the [TypeScript](../typescript/README.md) and [Python](../python/README.md) examples.
CI only formats/checks Rust and never opens a live stream.

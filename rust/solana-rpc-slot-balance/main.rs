use anyhow::{bail, Result};
use reqwest::Client;
use serde_json::{json, Value};
use std::{env, time::Duration};

async fn rpc(client: &Client, key: &str, method: &str, params: Value) -> Result<Value> {
    // Never propagate transport errors containing request metadata to the console.
    let response = client
        .post("https://triport.io/sol")
        .header("x-token", key)
        .json(&json!({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}))
        .send()
        .await
        .map_err(|_| anyhow::anyhow!("HTTP transport failed"))?;
    if !response.status().is_success() {
        bail!("HTTP {}", response.status().as_u16());
    }
    let data: Value = response
        .json()
        .await
        .map_err(|_| anyhow::anyhow!("Invalid JSON"))?;
    if let Some(error) = data.get("error") {
        bail!("RPC {}", error["code"]);
    }
    data.get("result")
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("Missing RPC result"))
}

#[tokio::main]
async fn main() -> Result<()> {
    let key = env::var("TRIPORT_API_KEY").map_err(|_| anyhow::anyhow!("Set TRIPORT_API_KEY"))?;
    if key.is_empty() {
        bail!("Set TRIPORT_API_KEY");
    }
    let wallet = env::var("ADDRESS")
        .unwrap_or_else(|_| "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9".into());
    let client = Client::builder().timeout(Duration::from_secs(15)).build()?;
    // Finalized reads make this suitable as a starting point for accounting.
    println!(
        "slot {}",
        rpc(
            &client,
            &key,
            "getSlot",
            json!([{"commitment": "finalized"}])
        )
        .await?
    );
    println!(
        "balance {}",
        rpc(
            &client,
            &key,
            "getBalance",
            json!([wallet, {"commitment": "finalized"}])
        )
        .await?
    );
    Ok(())
}

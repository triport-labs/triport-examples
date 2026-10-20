use anyhow::{bail, Context, Result};
use futures::{SinkExt, StreamExt};
use std::{collections::HashMap, env, time::Duration};
use tonic::{
    metadata::MetadataValue,
    transport::{Channel, ClientTlsConfig},
    Request,
};
use yellowstone_grpc_proto::prelude::{
    geyser_client::GeyserClient, subscribe_update::UpdateOneof, CommitmentLevel, SubscribeRequest,
    SubscribeRequestFilterTransactions, SubscribeRequestPing,
};

#[tokio::main]
async fn main() -> Result<()> {
    let key = env::var("TRIPORT_API_KEY").context("Set TRIPORT_API_KEY")?;
    if key.is_empty() {
        bail!("Set TRIPORT_API_KEY");
    }
    let program = env::var("PROGRAM_ID")
        .unwrap_or_else(|_| "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P".into());
    let seconds: u64 = env::var("SECONDS")
        .unwrap_or_else(|_| "20".into())
        .parse()?;
    if !(1..=3600).contains(&seconds) {
        bail!("Invalid SECONDS");
    }
    // TLS validates the public endpoint; the API key is only x-token metadata.
    let token: MetadataValue<_> = key
        .parse()
        .map_err(|_| anyhow::anyhow!("Invalid token metadata"))?;
    let channel = Channel::from_static("https://grpc.triport.io")
        .tls_config(ClientTlsConfig::new().with_native_roots())?
        .connect_timeout(Duration::from_secs(15))
        .connect()
        .await
        .map_err(|_| anyhow::anyhow!("gRPC connection failed"))?;
    let mut client = GeyserClient::with_interceptor(channel, move |mut req: Request<()>| {
        req.metadata_mut().insert("x-token", token.clone());
        Ok(req)
    })
    .max_decoding_message_size(64 * 1024 * 1024);
    let (mut sink, receiver) = futures::channel::mpsc::channel(4);
    let request = SubscribeRequest {
        transactions: HashMap::from([(
            "pump".into(),
            SubscribeRequestFilterTransactions {
                vote: Some(false),
                failed: Some(false),
                account_include: vec![program],
                ..Default::default()
            },
        )]),
        commitment: Some(CommitmentLevel::Confirmed as i32),
        ..Default::default()
    };
    sink.send(request.clone())
        .await
        .map_err(|_| anyhow::anyhow!("gRPC write failed"))?;
    let mut stream = tokio::time::timeout(Duration::from_secs(15), client.subscribe(receiver))
        .await
        .context("gRPC subscribe timeout")?
        .map_err(|e| anyhow::anyhow!("gRPC status {:?}", e.code()))?
        .into_inner();
    let end = tokio::time::sleep(Duration::from_secs(seconds));
    tokio::pin!(end);
    let mut seen = false;
    loop {
        tokio::select! {
            _ = &mut end => break,
            update = stream.next() => {
                let update = update.context("gRPC stream ended")?
                    .map_err(|e| anyhow::anyhow!("gRPC status {:?}", e.code()))?;
                match update.update_oneof {
                    Some(UpdateOneof::Transaction(tx)) => {
                        // Account inclusion finds program interactions; this does not decode trades.
                        if let Some(info) = tx.transaction {
                            seen = true;
                            println!("slot {} signature {}", tx.slot, bs58::encode(info.signature).into_string());
                        }
                    }
                    Some(UpdateOneof::Ping(_)) => {
                        sink.send(SubscribeRequest {
                            ping: Some(SubscribeRequestPing { id: 1 }), ..request.clone()
                        }).await.map_err(|_| anyhow::anyhow!("gRPC ping failed"))?;
                    }
                    _ => {}
                }
            }
        }
    }
    if !seen {
        bail!("No gRPC transactions before timeout");
    }
    Ok(()) // Dropping the stream closes this bounded monitoring session.
}

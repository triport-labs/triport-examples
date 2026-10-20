import { request, run } from "../common.js";

run(async () => {
  const address = process.env.EVM_ADDRESS ?? "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("Invalid EVM_ADDRESS");
  // A narrow projection avoids optional deployer scans. Partial chain failures are valid responses.
  const profile = await request(`/v1/wallet/${address}/identity?chains=eth&fields=balances,activity`);
  console.log(JSON.stringify({ address: profile.address, chains: profile.chains, activity: profile.activity }));
});

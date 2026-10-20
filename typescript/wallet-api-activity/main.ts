import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { request, run } from "../common.js";

run(async () => {
  // With no subscription id this performs only an entitlement/coverage check and creates nothing.
  const id = process.env.SUB_ID;
  if (!id) {
    const coverage = await request("/v1/wallet/watch/coverage");
    console.log(JSON.stringify({ chains: coverage.chains }));
    return;
  }
  const file = process.env.STATE_FILE ?? "activity.state.json";
  const saved = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;
  if (saved && saved.id !== id) throw new Error("State belongs to another SUB_ID");
  let cursor = saved?.cursor ?? "";
  const seen = new Set<string>();
  for (let p = 0; p < 3; p++) {
    const query = new URLSearchParams({ cursor, limit: "100" });
    const page = await request(`/v1/wallet/watch/${encodeURIComponent(id)}/events?${query}`);
    for (const event of page.events) {
      if (seen.has(event.event_id)) continue;
      seen.add(event.event_id);
      // System events affect trust: reorg_revert invalidates ids; gap marks unverified ranges.
      console.log(JSON.stringify(event));
    }
    cursor = page.next_cursor;
    writeFileSync(`${file}.tmp`, JSON.stringify({ id, cursor }));
    renameSync(`${file}.tmp`, file); // Save only after handling the whole page.
    if (!page.has_more) break;
  } // Production handlers need durable event_id dedupe and must surface HTTP 410 cursor expiry.
});

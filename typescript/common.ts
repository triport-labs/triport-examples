import WebSocket from "ws";

export const key = process.env.TRIPORT_API_KEY;
if (!key) throw new Error("Set TRIPORT_API_KEY");
export const wallet = process.env.ADDRESS ?? "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9";
export const program = process.env.PROGRAM_ID ?? "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const http: Record<string, string> = {
  sol: "/sol", eth: "/eth", base: "/rpc/base", bsc: "/rpc/bsc",
  polygon: "/polygon", robinhood: "/rpc/robinhood", ton: "/rpc/ton",
};
const sockets: Record<string, string> = {
  sol: "/ws/sol", eth: "/ws/eth", base: "/ws/base",
  polygon: "/ws/poly", robinhood: "/ws/robinhood",
};
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export function integer(name: string, fallback: number, max = 1_000_000): number {
  const n = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(n) || n < 1 || n > max) throw new Error(`Invalid ${name}`);
  return n;
}
export const seconds = integer("SECONDS", 20, 3600);
export function chain(fallback = "base"): string {
  const c = process.env.CHAIN ?? fallback;
  if (!["eth", "base", "bsc", "polygon", "robinhood"].includes(c)) throw new Error("Invalid CHAIN");
  return c;
}
export async function request(path: string, body?: unknown): Promise<any> {
  // Bound retries and omit server error text: it may contain routing details or credentials.
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://triport.io${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", "x-token": key! },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    }).catch(() => { throw new Error("HTTP transport failed"); });
    if (res.status === 429 && attempt < 3) {
      const delay = Number(res.headers.get("retry-after") ?? 1);
      await res.body?.cancel();
      await sleep(Math.min(60, Math.max(1, Number.isFinite(delay) ? delay : 1)) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
export async function rpc<T = any>(c: string, method: string, params: unknown = []): Promise<T> {
  if (!http[c]) throw new Error("Unknown chain");
  const data = await request(http[c], { jsonrpc: "2.0", id: 1, method, params });
  if (data.error) throw new Error(`RPC ${data.error.code}`);
  if (!("result" in data)) throw new Error("Missing RPC result");
  return data.result as T;
}
export function run(main: () => Promise<void>): void {
  main().catch((error: Error) => {
    // Only our own short error labels reach the console, never nested transport errors.
    console.error(error.message.replaceAll(key!, "[redacted]"));
    process.exitCode = 1;
  });
}
export async function subscribe(
  c: string, method: string, params: unknown[], onEvent: (value: any) => void = console.log,
): Promise<void> {
  if (!sockets[c]) throw new Error(`WebSocket is unavailable for ${c}; BSC supports HTTPS only`);
  const maxEvents = process.env.MAX_EVENTS ? integer("MAX_EVENTS", 1) : Infinity;
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(c === "eth" ? `wss://triport.io/ws/r/${encodeURIComponent(key!)}/eth` : `wss://triport.io${sockets[c]}`, {
      headers: { "x-token": key! }, handshakeTimeout: 15_000,
    });
    let acknowledged = false;
    let received = false;
    let events = 0;
    const timer = setTimeout(() => {
      if (!received) finish(new Error(acknowledged ? "No events before timeout" : "No subscription acknowledgement"));
      else finish();
    }, seconds * 1000);
    const ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.ping(); }, 10_000);
    function finish(error?: Error): void {
      clearTimeout(timer); clearInterval(ping); ws.terminate();
      if (error) reject(error); else resolve();
    }
    ws.on("open", () => ws.send(JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })));
    ws.on("message", (raw) => {
      try {
        const m = JSON.parse(raw.toString());
        if (m.error) return finish(new Error(`Subscription RPC ${m.error.code}`));
        if (m.id === 1) { acknowledged = true; console.log("subscribed"); }
        if (m.params) {
          received = true; onEvent(m.params.result);
          if (++events >= maxEvents) finish();
        }
      } catch { finish(new Error("Invalid WebSocket frame or handler failed")); }
    });
    ws.on("unexpected-response", (_req, res) => { res.resume(); finish(new Error(`WebSocket HTTP ${res.statusCode}`)); });
    ws.on("error", () => finish(new Error("WebSocket transport failed")));
    ws.on("close", () => finish(new Error("WebSocket closed")));
  });
}

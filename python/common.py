"""Small transport helpers shared by the standalone scripts; no Triport SDK."""

import asyncio
import json
import os
import time
from contextlib import suppress

import requests
from websockets.asyncio.client import connect

KEY = os.environ.get("TRIPORT_API_KEY")
if not KEY:
    raise SystemExit("Set TRIPORT_API_KEY")
WALLET = os.environ.get("ADDRESS", "5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9")
PROGRAM = os.environ.get("PROGRAM_ID", "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P")
HTTP = {"sol": "/sol", "eth": "/eth", "base": "/rpc/base", "bsc": "/rpc/bsc",
        "polygon": "/polygon", "robinhood": "/rpc/robinhood", "ton": "/rpc/ton"}
SOCKETS = {"sol": "/ws/sol", "eth": "/ws/eth", "base": "/ws/base",
           "polygon": "/ws/poly", "robinhood": "/ws/robinhood"}


def integer(name, fallback, maximum=1_000_000):
    value = int(os.environ.get(name, fallback))
    if not 1 <= value <= maximum:
        raise ValueError(f"Invalid {name}")
    return value


def chain(fallback="base"):
    value = os.environ.get("CHAIN", fallback)
    if value not in ("eth", "base", "bsc", "polygon", "robinhood"):
        raise ValueError("Invalid CHAIN")
    return value


def request(path, body=None):
    # Bound retries; never print an exception containing a request URL or server routing details.
    for attempt in range(4):
        try:
            response = requests.request(
                "GET" if body is None else "POST", "https://triport.io" + path,
                headers={"x-token": KEY}, json=body, timeout=15,
            )
        except requests.RequestException:
            raise RuntimeError("HTTP transport failed") from None
        if response.status_code == 429 and attempt < 3:
            with suppress(ValueError):
                delay = min(60, max(1, float(response.headers.get("retry-after", "1"))))
                time.sleep(delay)
                continue
            time.sleep(1)
            continue
        if not response.ok:
            raise RuntimeError(f"HTTP {response.status_code}")
        return response.json()


def rpc(network, method, params=None):
    data = request(HTTP[network], {"jsonrpc": "2.0", "id": 1, "method": method,
                                   "params": [] if params is None else params})
    if data.get("error"):
        raise RuntimeError(f"RPC {data['error'].get('code')}")
    return data["result"]


def run(main):
    try:
        main()
    except Exception as error:
        # Transport exceptions can include a URL. Only controlled RuntimeError labels are shown.
        label = str(error) if isinstance(error, RuntimeError) else type(error).__name__
        raise SystemExit(label.replace(KEY, "[redacted]")) from None


async def subscribe(network, method, params, handler=None):
    if network not in SOCKETS:
        raise RuntimeError(f"WebSocket is unavailable for {network}; BSC supports HTTPS only")
    endpoint = (f"wss://triport.io/ws/r/{KEY}/eth" if network == "eth"
                else "wss://triport.io" + SOCKETS[network])
    duration = integer("SECONDS", 20, 3600)
    max_events = integer("MAX_EVENTS", 1) if os.environ.get("MAX_EVENTS") else None
    events = 0
    seen = False
    acknowledged = False
    try:
        async with connect(endpoint,
                           additional_headers={"x-token": KEY}, open_timeout=15,
                           close_timeout=2, ping_interval=10, max_queue=16) as ws:
            await ws.send(json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}))
            async with asyncio.timeout(duration):
                async for raw in ws:
                    message = json.loads(raw)
                    if "error" in message:
                        raise RuntimeError(f"Subscription RPC {message['error'].get('code')}")
                    if message.get("id") == 1:
                        acknowledged = True
                        print("subscribed")
                    if "params" in message:
                        seen = True
                        value = message["params"]["result"]
                        if handler:
                            await handler(value)
                        else:
                            print(json.dumps(value))
                        events += 1
                        if max_events is not None and events >= max_events:
                            return
            raise RuntimeError("WebSocket closed")
    except TimeoutError:
        if not seen:
            raise RuntimeError("No events before timeout" if acknowledged else "No subscription acknowledgement") from None
    except RuntimeError:
        raise
    except Exception:
        raise RuntimeError("WebSocket transport failed") from None

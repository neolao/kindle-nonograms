# Running the progress-sync server

The sync server is optional. The game works fully without it. Run it only if you want your progress backed up outside the Kindle, so that a Kindle which wipes its browser data (or a second device) can get it back.

This guide takes you from nothing to a working setup. For the full variable list see [configuration.md](configuration.md); for how it works inside see [architecture.md](architecture.md).

> **What is verified and what is an example.** The install, run, configuration and API steps below were run against the real server. The systemd unit and the HTTPS proxy snippets are standard examples that were **not** tried on a real machine — adapt them to yours.

## How the pieces fit

```
Kindle browser ──https──▶ https://neolao.github.io/kindle-nonograms/   (the game, static)
       │
       └─────────https──▶ https://sync.example.org   (reverse proxy, your TLS certificate)
                                  │ http
                                  ▼
                          localhost:3000  (this server, plain HTTP)
```

- The game page is served over HTTPS, so a browser refuses to call a plain `http://` server from it ("mixed content"). **The server must be reachable through an `https://` address.**
- The server itself speaks plain HTTP and should only listen on the machine (or be firewalled); a reverse proxy in front of it provides HTTPS.
- Everything is addressed by a secret key: whoever knows the key can read and overwrite that player's saved progress. Use a long random one and keep it private.

## 1. Install

You need a machine that stays on (a Raspberry Pi, a NAS, a small server) with **Node.js 22 or newer** and git.

```bash
git clone https://github.com/neolao/kindle-nonograms.git
cd kindle-nonograms
npm install
```

The server runs straight from the source with `vite-node` (installed by `npm install`); there is no separate build step.

## 2. Choose a key

A key must be **at least 16 characters**. Generate one:

```bash
openssl rand -hex 24
```

You can allow several keys (one per person), separated by commas; each key has its own, separate saved progress.

## 3. Start it

```bash
KINDLE_SYNC_KEYS=<your key> \
ALLOWED_ORIGIN=https://neolao.github.io \
HOST=127.0.0.1 \
DATA_DIR=/var/lib/kindle-nonograms \
npm run start --workspace packages/server
```

- `ALLOWED_ORIGIN` is the address of the **game page's site**, not of the server: `https://neolao.github.io` for the published game. It must be a bare origin: no path, no trailing `/` (the server refuses to start otherwise, with a message saying so).
- `HOST=127.0.0.1` makes it listen only on the machine itself, which is what you want behind a reverse proxy on the same machine. The default is `0.0.0.0` (every network interface).
- `DATA_DIR` is where the progress files are stored: one JSON file per key, named after a hash of the key. **Set it explicitly.** If you leave it out, the data goes to `sync-data/` inside the directory `npm` runs the server from, which is `packages/server/sync-data/` here (it is git-ignored). Make sure the directory exists and is writable by the user running the server.
- `PORT` defaults to `3000`.

You should see `Sync server listening on 127.0.0.1:3000`.

Check that it answers (replace the key):

```bash
curl -i -H 'Authorization: Bearer <your key>' 'http://127.0.0.1:3000/api/progress?limit=1'
```

A `200` with `{"items":[],"nextCursor":null}` means it works. A `401` means the key is not one of `KINDLE_SYNC_KEYS`.

**Back up `DATA_DIR`** like any other data you care about: it is the only copy of what the server holds. The files are plain JSON, so copying the directory is enough.

## 4. Keep it running (example: systemd)

Not tested on a real machine — adapt the paths and user.

`/etc/systemd/system/kindle-nonograms-sync.service`:

```ini
[Unit]
Description=Kindle Nonograms progress-sync server
After=network.target

[Service]
User=kindle
WorkingDirectory=/home/kindle/kindle-nonograms
EnvironmentFile=/etc/kindle-nonograms-sync.env
ExecStart=/usr/bin/npm run start --workspace packages/server
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

`/etc/kindle-nonograms-sync.env` (readable only by root and the service user, since it holds the key):

```
KINDLE_SYNC_KEYS=<your key>
ALLOWED_ORIGIN=https://neolao.github.io
HOST=127.0.0.1
DATA_DIR=/var/lib/kindle-nonograms
```

```bash
sudo chmod 600 /etc/kindle-nonograms-sync.env
sudo mkdir -p /var/lib/kindle-nonograms && sudo chown kindle /var/lib/kindle-nonograms
sudo systemctl enable --now kindle-nonograms-sync
journalctl -u kindle-nonograms-sync -f      # the server's log
```

The server logs unexpected failures as one JSON line each on stderr (method, path, error); it never logs the key.

## 5. Put HTTPS in front of it

Not tested on a real machine — pick one approach and adapt it.

You need an address like `https://sync.example.org` with a certificate **the Kindle's browser trusts**. That rules out a self-signed certificate or a private certificate authority, because you generally cannot install a custom root certificate on a Kindle.

Practical routes:

- **A domain you own, with a public certificate.** Point a name at your server (a private LAN address works if you obtain the certificate with the DNS challenge, which needs no public access to the machine) and let [Caddy](https://caddyserver.com) fetch and renew it. Caddy needs a DNS plugin for your registrar to use the DNS challenge. Caddyfile:

  ```
  sync.example.org {
      reverse_proxy 127.0.0.1:3000
  }
  ```

- **nginx or another proxy with a Let's Encrypt certificate**, proxying `/` to `http://127.0.0.1:3000`. Pass the request through unchanged; the server answers the browser's CORS preflight itself.
- **A tunnel/overlay service that provides HTTPS** (for example Tailscale Serve or a Cloudflare tunnel), as long as the Kindle can reach and trust that address. The Kindle must be able to use it, which means it must be on that network or the address must be public.

Whatever you choose, the final check is the same: open `https://sync.example.org/api/progress?limit=1` from the Kindle's browser. You should see a short JSON error (`{"error":{"code":"unauthorized",…}}`) — that proves the address, the certificate and the proxy work. (It is an error because the browser sends no key; that is expected.)

## 6. Connect the Kindle

1. On the Kindle, open the game and tap **Sync progress** in the footer of the library page (or go to `https://neolao.github.io/kindle-nonograms/sync/`).
2. Enter the server address, **starting with `https://`** and with no path, for example `https://sync.example.org`. (The hint text on the page shows an `http://` example; that only works when the game itself is opened over `http://`.)
3. Enter the key. Use **Show** to check what you typed.
4. Tap **Save and test**. The page says **Connected** when it works, and any progress already on the server is restored right away.

From then on, each move is sent in the background and progress is fetched whenever a page opens. Nothing is shown during play; the sync page keeps a "Last sync" line, or "Last attempt failed". If the server is unreachable the game simply keeps working and retries on the next move or page open.

**Forget this server** removes the address and key from this Kindle (your progress on the Kindle is kept; the server's copy is kept too).

## 7. A wiped or new Kindle

Open the Sync page again, enter the same address and key, and tap **Save and test**. Your progress comes back. Another Kindle (or any browser) can use the same address and key to continue the same puzzles; the most recent unsent move on a device wins over an older server copy, and a device that has never synced a puzzle always takes the server's copy.

If the server's data directory is ever lost, devices that still hold their progress send it back to the server the next time they open a page.

## Troubleshooting

| What the page says | Meaning and what to do |
|---|---|
| Failed: invalid address – enter an address starting with http:// or https:// | The address is empty or malformed. Use `https://sync.example.org`. |
| Failed: no key | Enter the key. |
| Failed: wrong key – check the key set on the server | The key is not in the server's `KINDLE_SYNC_KEYS`. Compare character by character (use **Show**). |
| Failed: server not reachable – check the address and that the server is running | DNS, firewall, proxy or the server is down, or the request timed out (10 s). Run the `curl` check from step 3, then from the Kindle's network. Also check `ALLOWED_ORIGIN`: a wrong origin makes the browser block the answer, which looks the same. |
| Failed: not a sync server – check the address | Something answered, but not this server (wrong port or path, or the proxy sends the request elsewhere). The address must be the server's root, with no path. |
| Failed: an http address cannot be used from this https page – use an https address | You typed `http://…` while the game is on HTTPS. Set up step 5 and use the `https://` address. |
| Failed: the server reports an internal error – check the server log | Usually the saved data file for that key is unreadable (`storage_corrupt` in the log). The server refuses to overwrite it. Restore it from your backup, or move the file away. |
| Failed: could not save – check that the browser allows local storage | The Kindle's browser refused to store the address and key (storage full or disabled). |
| Server refuses to start: "ALLOWED_ORIGIN …" | Use a bare origin such as `https://neolao.github.io`, with no path or trailing `/`. |
| Server refuses to start: "KINDLE_SYNC_KEYS must list at least one…" or "Every key … must be at least 16 characters long" | At least one key is required, and each must be 16 characters or more. |
| Server stops with "Cannot listen on …: EADDRINUSE" | Another program uses that `PORT`; set a different `PORT` or stop the other one. |

## API reference (for developers)

All calls need `Authorization: Bearer <key>`. Every response has `Cache-Control: no-store` and errors always look like `{"error":{"code":"…","message":"…"}}`.

- `GET /api/progress?limit=<1–500, default 100>&cursor=<opaque>&updatedSince=<ISO date>` → `{"items":[{"puzzleId","cells","rev","openedAt?"}],"nextCursor":"…"|null}`
- `PUT /api/progress/<puzzleId>` with `{"cells":[[…]],"baseRev":<number>}` → `200` with the stored entry and its new `rev`; `409 progress_stale` with `current` (the server's entry) when `baseRev` is not the stored revision. Sending the same cells again changes nothing.

`401 unauthorized` (missing or unknown key), `400` (malformed request), `422 invalid_body`, `413` (body over 100 KB), `500 storage_corrupt`. Revisions, not clocks, settle conflicts: see [decision 054](../.vibe/decisions/054-sync-uses-server-revisions-not-clocks.md).

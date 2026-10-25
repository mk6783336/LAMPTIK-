# Moving `lamptik.online` DNS to Cloudflare (for `bridge.lamptik.online`)

A Cloudflare named tunnel only serves a hostname whose zone lives in the same
Cloudflare account. `lamptik.online` is currently on Namecheap DNS, so the zone
has to move first. This is a nameserver change, not a website move: Vercel
keeps serving the site, Cloudflare only answers DNS.

Do the records **before** the nameservers, so there is no window where the site
has no DNS.

## Status (2026-10-25) — live

The migration is done and `bridge.lamptik.online` serves traffic:

- Zone `lamptik.online` is active on Cloudflare: `gail.ns.cloudflare.com`,
  `piotr.ns.cloudflare.com`.
- `cloudflared tunnel login` was authorized; the origin cert lives at
  `~/.cloudflared/cert.pem`.
- Tunnel **`lamptik-bridge`**: `1914e86b-9d47-49e8-870f-6a793835641b`,
  credentials in `~/.cloudflared/1914e86b-….json`, config in
  `.scratch/cloudflared-bridge.yml`.
- Verified end to end: `/health` 200, `YQHsXMglC9A` (Adele – Hello) resolves
  with duration 367 s, the signed stream answers `206 video/mp4` with a real
  `ftyp`, and the app's `/api/download` proxies it in ~1.3 s.
- `.env.local` holds `YTDLP_BRIDGE_URL=https://bridge.lamptik.online`. The same
  value plus `BRIDGE_SECRET` must be set in Vercel for production.

Restarting the bridge + tunnel after a reboot is two commands:

```bash
python bridge/app.py                                    # with BRIDGE_SECRET set
cloudflared tunnel --config .scratch/cloudflared-bridge.yml run lamptik-bridge
```

## What DNS answers today (verified 2026-10-25)

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| A | `@` | `216.198.79.1` | **DNS only** |
| CNAME | `www` | `81c469aeb080ef76.vercel-dns-017.com` | **DNS only** |
| MX | `@` | `eforward1..3` prio `10`, `eforward4` prio `15`, `eforward5` prio `20` | — |
| TXT | `@` | `v=spf1 include:spf.efwd.registrar-servers.com ~all` | — |
| TXT | `@` | `google-site-verification=dDnacA4XeEm8Rq5P0fdLCTb-fs5iJTgUgdZKldppXZg` | — |

No CAA and no DMARC record exist today, so nothing else has to be preserved.

> Both Vercel records must stay **DNS only (grey cloud)**. Proxying Vercel
> through Cloudflare is what produces redirect loops and 522s; Cloudflare is
> only here to terminate `bridge.lamptik.online`.

## Steps

1. **Cloudflare → Add a site** → `lamptik.online` → Free plan. Cloudflare
   scans the existing records and imports them.
2. **Verify the import** against the table above. Fix anything missing and set
   the `@` and `www` records to *DNS only*. Keep the MX and both TXT records —
   they carry the mailbox and the Search Console verification.
3. **Copy the two Cloudflare nameservers** (Account Home → the zone → Overview).
4. **Namecheap → Domain List → Manage → Nameservers → Custom DNS**: replace
   `dns1/dns2.registrar-servers.com` with the two Cloudflare nameservers. Save.
5. Wait for the zone to show **Active** in Cloudflare (usually minutes, up to a
   few hours). Check with:

   ```bash
   nslookup -type=ns lamptik.online
   ```

   The answer must be `*.ns.cloudflare.com`.

6. Verify the site still answers on Vercel before touching the tunnel:

   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' https://www.lamptik.online/
   curl -sS https://www.lamptik.online/api/health
   ```

7. Tunnel creation is already done here (see *Status* above); the commands are
   kept for a rebuild from scratch:

   ```bash
   cloudflared tunnel login                       # browser, pick lamptik.online
   cloudflared tunnel create lamptik-bridge       # prints the tunnel UUID
   cloudflared tunnel route dns lamptik-bridge bridge.lamptik.online
   ```

   Config used to run it (`.scratch/cloudflared-bridge.yml`):

   ```yaml
   tunnel: <UUID>
   credentials-file: C:\Users\<you>\.cloudflared\<UUID>.json
   ingress:
     - hostname: bridge.lamptik.online
       service: http://127.0.0.1:7860
     - service: http_status:404
   ```

   Start the bridge (`python bridge/app.py` with `BRIDGE_SECRET` set), then:

   ```bash
   cloudflared tunnel --config .scratch/cloudflared-bridge.yml run lamptik-bridge
   ```

   Unlike a quick tunnel, this URL never changes and is not rate-limited.

## Rollback

At Namecheap, set the nameservers back to `dns1/dns2.registrar-servers.com`.
The old zone is still there; the site returns to how it is today.

# Sungate Records · Artist Portal

A mobile-first portal where Sungate uploads video assets once and each artist
opens a private link to a feed that looks and behaves like the platforms they
post to. Fullscreen vertical swipe by default, Instagram-style feed as a
toggle, two-tier downloads on every asset.

## Architecture

```
You (admin page)                    Artist (magic link)
      │                                    │
      │ multipart upload,                  │  /a/{token}
      │ browser → R2 direct               │
      ▼                                    ▼
┌─────────────┐   copy-from-URL   ┌──────────────────┐
│ Cloudflare  │ ────────────────▶ │ Cloudflare Stream │
│ R2          │                   │ (HLS + MP4 rend.) │
│ originals + │                   └──────────────────┘
│ manifest    │       ▲ presigned GET        │ adaptive HLS
└─────────────┘       │ (original download)  ▼ + phone-ready MP4
                 Vercel (Next.js) ──────▶ artist's phone
```

- **Originals** live in R2 (zero egress fees, multi-GB fine).
- **Playback** comes from Stream's adaptive HLS, which is why a 2GB master
  plays instantly on cellular.
- **Downloads** are two tiers: original master (presigned R2 URL) and
  phone-ready 1080p MP4 (Stream's download rendition).
- **Data** is a single JSON manifest in R2 (`_manifest.json`). Deliberate v1
  choice: one admin writer, no concurrency, no database vendor. If multiple
  people ever upload simultaneously, swap `lib/r2.js`'s manifest functions
  for Postgres; nothing else touches storage internals.
- **Artist auth** is a magic link: `/a/{unguessable-token}`. No passwords.
- **Admin auth** is a password (env var) + signed httpOnly cookie.

## Setup (~30 minutes, one time)

1. **Cloudflare account** → R2 → create bucket `sungate-assets`.
   R2 → Manage API Tokens → create token (Object Read & Write).
   Note the Account ID, Access Key ID, Secret Access Key.
2. **Cloudflare Stream** → enable (it's pay-as-you-go).
   Create an API token with `Stream: Edit`.
   Find your customer code: open any Stream video's embed snippet; the
   subdomain is `customer-XXXX.cloudflarestream.com` → `XXXX`.
3. Copy `.env.example` → `.env.local`, fill everything in.
   `ADMIN_PASSWORD`: pick something strong. `SESSION_SECRET`: 32+ random chars.
4. Replace `public/sungate-icon.jpg` with a proper square brand mark
   (the current one is a downscaled placeholder from the prototype).
5. Local test: `npm install && npm run dev` → http://localhost:3000/admin
6. Deploy: push to GitHub → import in Vercel → paste the same env vars →
   deploy. Done.

## Demo feed in one command

After setup, `npm run seed` creates the MARIAMI demo artist and uploads the
included merch mockups + demo visualizer with decision-prompting captions,
then prints her magic link. Safe to re-run; already-seeded files are skipped.

## Daily use

1. Open `/admin`, log in.
2. Add an artist once → copy their magic link → text it to them.
3. Upload a video: pick artist, drop file, write the caption they'll see.
   The browser uploads directly to R2 in 25MB parts (a 2GB file works fine);
   Stream transcodes in the background.
4. The artist's feed shows the asset as soon as transcoding finishes
   (usually 1–3 min for a 500MB file). Until then it shows "Processing".

## Costs (order of magnitude)

- Vercel: free tier is fine at this scale.
- R2: ~$0.015/GB-month stored, zero egress. 100GB of masters ≈ $1.50/mo.
- Stream: ~$5/1,000 min stored + ~$1/1,000 min delivered. A 10-artist
  roster with weekly drops lands in the $10–30/mo range.

## Known v1 boundaries (intentional)

- Single admin writer. Concurrent uploads from two people could race the
  manifest. Fine for you+Em taking turns; not fine for a team. Postgres is
  the fix when that day comes.
- The download API trusts unguessable asset IDs rather than re-checking the
  artist token. Acceptable for media assets; tighten if anything sensitive
  ever flows through.
- Stream API shapes (`/copy`, `/{uid}/downloads`) verified against
  Cloudflare docs as of mid-2026. If Cloudflare versions their API, check
  developers.cloudflare.com/stream.
- No upload resume. If a 2GB upload dies at 90%, it restarts. Annoying but
  rare on a stable connection; add tus/resumable later if it bites.

# freshcoastlab.com

Jason Myers's personal site - Fresh Coast Lab is his lab. Design: "mid-century meets
the fresh coast" (vintage Michigan travel poster). Plain HTML/CSS, no build step.

## Layout

    public/            everything that is published (only this folder)
      index.html       the whole page (CSS inline)
      assets/          portrait and images
      favicon.svg
    src/worker.js      serves public/ and the /api/lab-status endpoint
    wrangler.jsonc     Cloudflare Workers config (worker name: freshcoastlab)

## Deploys

Cloudflare Workers Builds is connected to this GitHub repo: **pushing to `main` deploys
production** (freshcoastlab.com). Work on a branch; merge to `main` only when ready.
family.freshcoastlab.com and plex.freshcoastlab.com are separate and untouched by this repo.

## "The Lab, right now"

A strip under the hero showing aggregate numbers from Jason's Home Assistant. Home
Assistant is never exposed to the internet - it POSTs to `/api/lab-status` with a bearer
token (`wrangler secret put LAB_PUSH_TOKEN`); values live in a KV namespace bound as `LAB`
(uncomment `kv_namespaces` in wrangler.jsonc once created). Only three whitelisted
integers are accepted. The page hides the strip if data is missing or older than 2 hours.

## Local preview

    npx wrangler dev        # http://localhost:8787

This repo is PUBLIC: never commit secrets, tokens, or private details.

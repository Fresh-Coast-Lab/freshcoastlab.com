# Fresh Coast Lab

The marketing site for **Fresh Coast Lab** — practical AI automation for small businesses.

Live at: [freshcoastlab.com](https://freshcoastlab.com)

## Stack

Plain static HTML/CSS, zero build step. Deployed to Cloudflare Pages.

Why no framework: the site is one page right now. When it grows past four or five pages, or when we need a blog or programmatic case studies, the plan is to migrate to [Astro](https://astro.build/).

## File Structure

```
.
├── index.html       # The whole site
├── logo.png         # Main brand logo (transparent PNG)
├── headshot.jpg     # About-section portrait
├── favicon.svg      # Browser tab icon (FC mark)
├── README.md
└── .gitignore
```

All asset paths in `index.html` are root-relative (`/logo.png`, etc.), which works correctly when served from a domain root by Cloudflare Pages.

## Local Preview

No build step. Just open `index.html` in a browser, or run a simple static server from this directory:

```bash
# Python (any version 3.x)
python3 -m http.server 8000

# Or with Node
npx serve .
```

Then visit `http://localhost:8000`.

## Deploying to Cloudflare Pages

One-time setup:

1. Push this repo to GitHub.
2. Go to the [Cloudflare Pages dashboard](https://dash.cloudflare.com/?to=/:account/pages), click **Create a project → Connect to Git**, and select this repository.
3. Build configuration:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/`
4. Click **Save and Deploy**. The site goes live at `<project-name>.pages.dev` within ~30 seconds.
5. To attach the real domain: in the project's **Custom domains** tab, add `freshcoastlab.com` and `www.freshcoastlab.com`. Cloudflare will handle DNS automatically if the domain's nameservers are pointed at Cloudflare.

Every push to `main` triggers an automatic redeploy.

## Brand Tokens

For consistency when editing or adding sections:

| Token        | Hex        | Use                              |
|--------------|------------|----------------------------------|
| `--cream`    | `#F2E6CE`  | Primary background, light text   |
| `--teal`     | `#1E4D58`  | Primary accent, ink color        |
| `--teal-deep`| `#143540`  | Dark sections, deep accents      |
| `--orange`   | `#D55A2F`  | Highlights, CTA, brand accents   |
| `--mustard`  | `#E8B547`  | Secondary accent, subtle marks   |
| `--ink`      | `#1A1F26`  | Body text, hard divisions        |

Typography (loaded from Google Fonts):

- **Bungee Inline** — display numerals and the CTA sign
- **Anton** — section headlines and hero
- **DM Sans** — body copy
- **Space Mono** — small caps tags, eyebrows, credentials

## Roadmap

- [ ] Replace logo PNG with clean redrawn SVG for crisp scaling at all sizes
- [ ] Real demo content for the three "Specimen" cards (currently placeholder copy)
- [ ] Add Calendly or similar to the CTA
- [ ] Migrate to Astro once a second page is needed (blog, case studies, etc.)

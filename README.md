# Brikk Estates website

Bilingual (Albanian default, English at `/en/`) static website for Brikk Estates, with a searchable catalogue built from the agency's own Instagram listings.

- **Stack:** Astro 7 (static output) · TypeScript · plain CSS (custom properties, cascade layers) · Astro content collections with a Zod schema · Astro image pipeline (Sharp → responsive WebP) · small vanilla TS scripts for filters, gallery, menu, copy/share, and the owner and request forms (which open WhatsApp or email; there is no form backend).
- **No** server runtime, database, CMS, accounts, API keys, analytics, tracking, third-party embeds or cookies (so no cookie banner).

## Commands

Requires Node 22.12+.

```bash
npm install            # install dependencies (lockfile: package-lock.json)
npm run import         # re-import listings from ../instagram (idempotent)
npm run dev            # local dev server
npm run build          # production build → dist/ (indexable)
npm run build:staging  # same build, marked noindex (meta robots + robots.txt Disallow)
npm run preview        # serve dist/ locally
npm run check          # TypeScript / Astro diagnostics
npm run check:dist     # after a build: links, assets, titles, hreflang, JSON-LD, contact links
npm run check:contrast # WCAG contrast of every token pair
```

## How the catalogue works

```
../instagram/index.csv + listings/*/description.txt + NN.jpg   (read-only source, never modified)
        │
        ├─ scripts/lib/parse-listing.ts   conservative parser (Albanian number words, ordinal floors, m²/ari, prices…)
        ├─ data/listings/<REF>.json       human annotations: English translation, image review, evidence-backed corrections, status
        ▼
scripts/import-listings.ts
        ├─ src/content/listings/<ref>.json   one validated entry per listing (do not edit by hand)
        ├─ src/assets/listings/<ref>/NN.jpg  optimised copies (≤ 2000 px); the build makes AVIF/WebP sizes
        └─ docs/listing-import-report.md     fields populated/null, warnings, cover chosen, duplicates, ref gaps
```

Rules enforced by the import:

- A value missing from the caption stays `null` and is not shown.
- Every correction in `data/listings/<REF>.json → overrides` must quote its evidence. The quote must appear verbatim in the caption, or name the agency's own listing graphic (`"image:01.jpg 870€/m²"`), otherwise the import fails.
- The annotation guide is `data/ANNOTATION-GUIDE.md`.

### Add a listing

1. Add the new folder and row to `../instagram/` (same format as the existing export).
2. `npm run import -- --allow-incomplete` then `npm run import:sheets` (makes `data/import-draft/sheets/<REF>.jpg`).
3. Create `data/listings/<REF>.json` following `data/ANNOTATION-GUIDE.md`: English paragraphs, image review, and overrides if needed.
4. `npm run import` (must finish with no problems), then `npm run build`.

A listing without an English translation is not published, so the two languages stay complete.

### Hide a listing, or mark it sold / rented / available

Edit `data/listings/<REF>.json`, then run `npm run import && npm run build`:

```json
{ "ref": "B397", "status": "sold", "hidden": false, "…": "…" }
```

- `status`: `unconfirmed` (default), `available`, `reserved`, `sold`, `rented`.
- `hidden: true` removes the listing from every page and the sitemap.
- Sold and rented listings are **excluded** from the site (`CATALOGUE.showSoldOrRented = false` in `src/config/site.ts`). A sold archive adds little for buyers and risks stale claims.

### Show only confirmed listings

All listings are currently `unconfirmed` because the Instagram archive does not say what is still on the market. To hide every unconfirmed listing at once, set `CATALOGUE.showUnconfirmed = false` in `src/config/site.ts`. The site then shows only listings you have marked `available` or `reserved`.

The listing pages never call a property "available". The index pages show the note "Disponueshmëria konfirmohet gjatë kontaktit." / "Availability is confirmed when you contact us.", and the main listing button reads "Pyet për këtë pronë" / "Ask about this property".

## Admin app (office computer)

The team adds and edits listings from a browser on the office Wi-Fi. The app runs on one office computer, saves each listing as files in this project, then imports, builds and uploads the site to Vercel. There is no database and no online service besides the existing Vercel hosting.

```
Browser on office Wi-Fi ──► admin/server.ts (this computer, port 4400)
                              ├─ data/manual/<REF>/listing.json + photos/   new listings (source of truth)
                              ├─ data/listings/<REF>.json                    status / hidden of Instagram listings
                              └─ npm run import → vercel build → vercel deploy --prebuilt --prod
```

### First-time setup (once, on the office computer)

1. `npm install`
2. Create a login for each team member (at least 8 characters):
   ```bash
   npm run admin:user -- add Adi a-strong-password
   ```
   `npm run admin:user -- list` / `-- remove <name>` manage them. Logins are stored hashed in `admin/config.json` (not in git).
3. Link this folder to the existing Vercel project (use the Vercel account that owns brikkestates.com):
   ```bash
   npx vercel login
   npx vercel link
   npx vercel pull --yes --environment=production
   ```
4. Recommended: set `"backupDir"` in `admin/config.json` to a Google Drive, OneDrive or USB folder, e.g. `"backupDir": "G:/My Drive/Brikk backup"`. After every save, all listing data is copied there.
5. Start it: double-click **`Start Brikk Admin.cmd`** (one folder up), or `npm run admin`. The window prints the address for the office Wi-Fi, e.g. `http://192.168.0.100:4400`. The first time, allow Node.js through Windows Firewall on **private networks**.

### Daily use

- **New listing:** photos (first = cover, drag or arrows to reorder), deal, type, location, price, size, features, Albanian description; English is optional (if empty, the English page shows the Albanian text with a note). **Save & publish**. The listing is live about 2–3 minutes later and appears first on the homepage and `/prona/`.
- **Edit / remove:** only listings added in the app. Removing moves the folder to `data/manual-deleted/`, so it can be restored.
- **Status / hide:** works for every listing, including Instagram ones. Sold and rented listings leave the site.
- The green pill at the top shows publishing progress; click it for the log and **Try again** if a publish failed.

### Notes

- New refs continue from the highest used number (B398, B399…). If an Instagram post later uses the same ref, the import stops and asks you to change one.
- Test without uploading: set `"deploy": "build-only"` in `admin/config.json`.
- The app is plain HTTP on the office network. Don't open port 4400 on the router; access from outside the office goes only through the Cloudflare Tunnel (HTTPS) at admin.brikkestates.com.

## Where things live

| What | Where |
|---|---|
| Business facts (phone, emails, Instagram), catalogue switches | `src/config/site.ts` |
| All UI strings and page copy | `src/i18n/sq.ts`, `src/i18n/en.ts` (same keys; TypeScript enforces parity) |
| Routes / localised slugs, number formatting | `src/i18n/index.ts` |
| Feature, type and orientation labels | `src/i18n/vocab.ts` |
| Design tokens (colour, type, spacing, radius) | `src/styles/tokens.css` |
| Global styles | `src/styles/base.css` |
| Page layouts (shared by both languages) | `src/layouts/*.astro`; thin route files in `src/pages/` and `src/pages/en/` |
| Components | `src/components/` |
| Client scripts | `<script>` blocks in the components and layouts; the listing filters in `src/scripts/filters.ts` |
| Listing parser / importer | `scripts/lib/parse-listing.ts`, `scripts/import-listings.ts` |
| Logo artwork (vector paths and brand colours) | `src/assets/brand/logo-parts.json`, drawn by `src/components/Logo.astro` |
| Admin app (office computer) | `admin/`, `scripts/lib/manual-listings.ts` |
| Post-build and contrast checks | `scripts/check-dist.mjs`, `scripts/check-contrast.mjs` |
| Font and icon licences | `licenses/` |

## Logo

The logo is the agency's official vector artwork: paths and brand colours (green `#295A43`, leaf `#90CB8D`, cream `#F0E8D9`) in `src/assets/brand/logo-parts.json`. `src/components/Logo.astro` is the only place it is drawn (`symbol`, `horizontal` and `stacked` variants, light and dark tones); `src/pages/logo.svg.ts` serves the lockup used in the structured data.

The favicons and `public/og-default.jpg` came with the frontend. After a brand change, replace those files in `public/`. The earlier reconstruction tools (`scripts/brand/`) were removed because they wrote an older format of `logo-parts.json`; they remain in git history, and `docs/logo-compare/` is kept only as a record.

## Typography and icons

- **Archivo** (SIL OFL 1.1), self-hosted variable WOFF2 (weight and width axes), Latin + Latin Extended subsets in `public/fonts/`. Wide widths echo the wordmark. It covers ë Ë ç Ç € ² and tabular numerals.
- **Lucide** icons (ISC), inlined at build time from `lucide-static` and used only for functional specs and actions.

## Dependencies (beyond Astro, TypeScript, Sharp, CSV parser, icon set)

- `@fontsource-variable/archivo`: source of the OFL font files, copied into `public/fonts/`.
- `tsx`: runs the TypeScript import script.
- `@astrojs/check`, `@types/node`: type checking.

## Deployment (static hosting)

- Hosted on Vercel (static output, `vercel.json`). The admin app publishes with `vercel build --prod` + `vercel deploy --prebuilt --prod`; `.vercelignore` keeps office-only files out of a plain `vercel deploy`.
- Any static host also works: run `npm run build` and upload `dist/`.
- Canonical URLs, hreflang and the sitemap assume `https://www.brikkestates.com` (set in `astro.config.mjs` → `site`). Redirect the apex domain to `www`.
- Serve `dist/404.html` as the not-found page. URLs use trailing slashes (`/prona/`).
- For preview or staging deployments use `npm run build:staging`, so those copies are never indexed.
- Cache headers (in `vercel.json`): `/_astro/*` immutable for 1 year (file names carry a content hash); `/fonts/*` 30 days, because those file names do not change when the files do.

## Possible later additions (not built)

A headless CMS (e.g. Decap or Keystatic, both file-based) could replace hand-edited annotation files once the agency publishes listings directly on the website.

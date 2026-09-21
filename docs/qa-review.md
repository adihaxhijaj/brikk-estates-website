# Brikk Estates website — final QA review

Reviewed 2026-09-15 against `../brikk-estates-company-profile.md` and the build brief.
Scope: all 173 pages in `dist/` (86 sq, 86 en, 404), checked with node scripts; manual reading of home, `/prona/`, `/prona/toka-dhe-investime/`, B384, B397 and B375 in both languages, owners, wanted, about, contact and 404; `src/i18n/*.ts`; `src/scripts/*.ts`; the production preview at `localhost:4321`. `dist/` was built after the latest source change. `node scripts/check-dist.mjs` reports "No problems found".

---

## 1. Checklist

### Truth and content

| # | Item | Result | Evidence |
|---|---|---|---|
| T1 | No office address, hours, team, founding year, stats, testimonials, reviews, licence, commission, awards, response-time promises | PASS | Regex scan of visible text on all 173 pages for address/adresa, orari, founded/themeluar, team/ekipi, licen[cs]e, komision/commission, award, review, rating, testimonial, "klient i kënaqur", "within N hours": no hits. The only "rating" hit is "illustrating" (B393). JSON-LD `RealEstateAgent` has no `address`, `openingHours`, `aggregateRating`, `review` or `foundingDate` |
| T2 | No other invented claims | **FAIL** | `sq.ts:42` "Çdo shitje prezantohet me statusin e fletës poseduese dhe kontratën te noteri." and `en.ts:44` "Every sale states…". The data disagrees: 11 of 55 sale listings have no legal status at all (B307, B323, B324, B326, B330, B334, B350, B381, B382, B385, B397), and only 27 mention a notary contract. The profile itself says "almost every sale". Softer embellishments are listed in L4 |
| T3 | Developer names only on listings whose caption names the builder | PASS | 31 listings have a `developer` value. A script confirmed the name appears in each one's own `descriptionSq`. There is no partner or developer list on About or Home |
| T4 | Never labelled "available" / "e disponueshme" | PASS | Grep across dist: none. Every listing has `status: "unconfirmed"`. The only "available" hits are in descriptions ("infrastructure available", "Garage available separately") |
| T5 | No [confirm with client] items; no placeholders, "coming soon" or apologies | PASS | No hits for confirm, placeholder, lorem, coming soon, "së shpejti", sorry or "na vjen keq" |
| T6 | No ® added | PASS | No `®` or `&reg;` in any HTML |
| T7 | No client photos or testimonials section | PASS | No such section. The annotation guide excludes images of people |
| T8 | Social links: Instagram only | PASS | Grep for facebook, tiktok, linkedin and youtube: none. External hrefs are limited to wa.me, the Instagram profile and `instagram.com/p/…` post links |

### Contacts and CTAs

| # | Item | Result | Evidence |
|---|---|---|---|
| C1 | Phone display, tel, WhatsApp, Viber, both emails, Instagram URL | PASS | Every contact href in dist: `tel:+38345667705` (660), `https://wa.me/38345667705` (497), `viber://chat?number=%2B38345667705` (333), `mailto:properties@…` (327), `mailto:info@…` (181). The only phone display string is "+383 45 66 77 05" (508) |
| C2 | Listing CTA "Pyet për këtë pronë" / "Ask about this property" | PASS | Present on all 152 listing pages (`ContactPanel.astro:24`, h2) |
| C3 | Availability note on index pages | PASS | Present on 6 sq and 6 en pages (home plus 5 indexes), e.g. `/prona/`: "76 prona … Disponueshmëria konfirmohet gjatë kontaktit." It is not on detail pages (see M2) |
| C4 | English listing pages show "Translated from the original Albanian listing." | PASS | Present on all 76 `/en/properties/b…/` pages |
| C5 | AI disclaimer on B384, B385, B393 | PASS, with defects | Present on all three in both languages (`<p class="ai-note">`). Two defects: the prefix is doubled on B384 and B385 (M1), and 11 other listings with render images have no note (H2) |

### Routes and language switch

| # | Item | Result | Evidence |
|---|---|---|---|
| R1 | All sq and en routes exist | PASS | 10 index/static routes per language plus 76 listing pages per language; 404 returns HTTP 404 on the preview server |
| R2 | Language switch links to the equivalent page, including the same listing | PASS | On every page, each switch href equals the hreflang alternate for that language, and the target file exists with the same Ref. Example `/en/properties/b384-land-for-sale-lipjan/` → `/prona/b384-toke-ne-shitje-lipjan/` |
| R3 | Nav `aria-current` | PASS | `/prona/shitje/` marks "Shitje"; `/en/properties/rent/` marks "Rent" |

### Formats

| # | Item | Result | Evidence |
|---|---|---|---|
| F1 | sq "95.000 €", "133,03 m²", "12.000 €/ari" | PASS | e.g. "76.300 € 700 €/m²", "133,03 m²", "10.000 €/ari", "2.300 € në muaj" |
| F2 | en "€95,000", "133.03 m²", "€12,000 per are" | PASS | e.g. "€236,000", "€2,000 per are", "133.03 m²", "€2,300 per month" |
| F3 | Minor format issues | FAIL (low) | sq "3.5 dhoma gjumi" (B313: screen-reader text and meta description), see L1. Price and unit price run together, e.g. "€57,000 €10,000 per are", see L2. Descriptions keep the caption style "133.03m²" and "2,000€/ari" on sq pages; this is verbatim source text and acceptable |

### SEO

| # | Item | Result | Evidence |
|---|---|---|---|
| S1 | Unique titles, listing pattern "[title] \| Ref Bxxx \| Brikk Estates" | PASS | check-dist found no duplicate titles; all 152 listing titles match the pattern. 27 titles are over 70 characters (L6) |
| S2 | Unique descriptions | PASS | check-dist found no duplicates |
| S3 | Canonical on www domain | PASS | Canonical equals `https://www.brikkestates.com` + path on 172 pages. The 404 page's canonical points to `/` (L5) |
| S4 | hreflang sq / en / x-default | PASS | e.g. B397: `hreflang="sq"` → `/prona/b397-…/`, `hreflang="x-default"` → the sq URL |
| S5 | OG and Twitter tags | PASS | og:title, description, url, image, type and locale plus twitter:card, title and image on all pages. Listing og:image is a 1200×630 crop of the cover |
| S6 | JSON-LD `RealEstateAgent` without address, ratings or hours | PASS | Home and Contact in both languages (4 blocks) |
| S7 | `RealEstateListing` with Offer only when a price exists | PASS | 152 blocks, 46 with Offer. The 12 listings with only a per-m² or per-are price (e.g. B397 "870 €/m²") have no Offer, which is correct because there is no total price. Rentals use a `UnitPriceSpecification` of MON |
| S8 | sitemap.xml with both languages; robots.txt | PASS | 172 `<url>` entries (86 en) with xhtml alternates. robots.txt: `Allow: /` plus the sitemap line |

### Accessibility

| # | Item | Result | Evidence |
|---|---|---|---|
| A1 | Exactly one h1 | PASS | check-dist |
| A2 | Logical heading order | PASS | Script over 173 pages found no skipped levels and h1 first everywhere |
| A3 | Skip link and landmarks | PASS | `<a class="skip-link …" href="#main">` targets `<main id="main" tabindex="-1">`. header, nav (labelled), main and footer are present on all pages |
| A4 | Labelled form controls | PASS | No input, select or textarea without `label[for]`. Filter ranges use a legend plus visually hidden labels |
| A5 | Icon-only controls named; no empty links or buttons | PASS | No empty `<a>` or `<button>`. Lightbox buttons use `aria-label`; the logo link uses `aria-label="Brikk Estates, faqja kryesore"` |
| A6 | lang attributes | PASS | `<html lang="sq|en">`. Switch links carry `lang`/`hreflang`. The 404 English block has `lang="en"` |
| A7 | Images have alt | PASS | Every `<img>` has alt. Mosaic images use `alt=""` inside links labelled "Fotografia 1 nga 3: Vizualizim, banesë …". Cards and no-JS thumbnails use descriptive alt |
| A8 | Touch targets ≥44px on main controls | PASS, with minor exceptions | `.btn` and `.control` 48px, `.check` and `.chip` 44px, header links 44px. Below 44px on fine pointers: breadcrumbs 32px, footer links 40px, language switch 36px, segmented labels 42px (L8) |
| A9 | Gallery focus return | PASS | `gallery.ts`: native `<dialog>` with a `close` listener that runs `opener?.focus()`; focus moves to the close button on open |

### No-JS, privacy, scripts

| # | Item | Result | Evidence |
|---|---|---|---|
| J1 | Cards, details and contact links in static HTML | PASS | `/prona/` has 76 `<li data-deal>` cards; listing specs, price and contact links are server-rendered |
| J2 | Home search is a GET form | PASS | `<form … action="/prona/" method="get" role="search">`; English version: `action="/en/properties/"` |
| J3 | No analytics, tracking, third-party embeds or cookie banners | PASS | No external script, link, img or iframe. CSS and JS bundles contain only the `w3.org` SVG namespace. Fonts are self-hosted in `/fonts/` |
| J4 | Filters keep state in the URL | PASS, with notes | `filters.ts` reads the URL, writes `pushState`/`replaceState` and restores on `popstate`; invalid numbers and unknown options are ignored. Issues: land plots never match the size filter (M4); price sort mixes rent with sale prices (L11); every change adds a history entry |
| J5 | Composer never claims "sent" | PASS | Status text is "Mesazhi u përgatit. Nëse aplikacioni nuk u hap…" / "Your message is ready…". It validates, then opens wa.me or mailto |

### Copy (i18n)

| # | Item | Result | Evidence |
|---|---|---|---|
| I1 | sq/en key parity | PASS | `en: Dict` is type-checked against `sq`; array lengths match (why 4, services 8, process 4, blocks 3, values 8) |
| I2 | Albanian diacritics | PASS | ë and ç are correct throughout `sq.ts` and in sampled pages ("Përshëndetje", "Çmimi", "Kërkojmë", "Zyrë", "Tjetër") |
| I3 | No untranslated strings | PASS, with minor issues | On sq pages the only English-looking UI word is "Menu" (acceptable). On en pages, Albanian appears only in proper nouns ("Lagjja Ndërkombëtare", "Zona Industriale") and the deliberate "(fletë poseduese)" (L7) |
| I4 | Wording quality | FAIL (medium/low) | Composer deal field (M3); "Qëndrimi ditor: Kuzhinë e ndarë" (L3); doubled "Shënim: Shënim:" (M1) |

---

## 2. Prioritised defects

### High

**H1. Invented claim on both home pages.**
- Where: `src/i18n/sq.ts:42`, `src/i18n/en.ts:44`, shown in "Pse Brikk Estates" / "Why Brikk Estates".
- Problem: "Çdo shitje prezantohet me statusin e fletës poseduese dhe kontratën te noteri." / "Every sale states the ownership-certificate status and the notary contract." In the data, 11 of 55 sales have no legal status and only 27 mention a notary.
- Fix, sq: `'Statusi i fletës poseduese dhe kontrata te noteri thuhen hapur në listime.'`
- Fix, en: `'Listings state the ownership-certificate status and notary contract openly.'`

**H2. Visualisation images with no visible note on 11 listings.**
- Where: B307, B313, B321, B322, B334, B335, B337, B339, B349, B387, B397.
- Problem: these listings have `aiVisualisation: true` (they contain `kind: "render"` images) but `aiDisclaimerSq/En` is null, so `ListingView.astro:176` shows nothing. B397 is the first card on both home pages, and its cover is a building render that looks like a photo.
- Fix: in `ListingView.astro`, when `l.aiVisualisation` is true and there is no caption disclaimer, show a generic note:
  - sq: "Disa imazhe janë vizualizime dhe nuk paraqesin gjendjen ekzistuese."
  - en: "Some images are visualisations and do not show the current condition."
- Add these strings as `detail.renderNote` in both i18n files.

### Medium

**M1. Doubled prefix in the AI note, placed far from the images.**
- Problem: B384 and B385 read "Shënim për imazhet: Shënim: Ky imazh…" / "Note about the images: Note: This image…".
- Fix: strip the prefix with `.replace(/^(Shënim|Note):\s*/i, '')` before rendering (or clean the data).
- Also render the note directly under `<Gallery>` rather than at the end of the description.

**M2. Detail pages have no availability note.**
- Problem: all 76 listings are unconfirmed, and detail pages are the search-engine landing pages.
- Fix: add `<p class="availability-note">{t.listings.availability}</p>` under the price in `ContactPanel.astro`.

**M3. Composer deal field copy is a fragment.**
- Problem: the legend reads "Dëshironi ta (e detyrueshme)" with options "shisni" / "jepni me qira". The generated message then says "Marrëveshja: shisni" / "Deal: rent it out".
- Fix in `sq.ts` `composer`: `deal: 'Shitje apo qira?'`, `dealSale: 'Shitje'`, `dealRent: 'Qira'`.
- Fix in `en.ts`: `deal: 'Sell or rent out?'`, `dealSale: 'Sell'`, `dealRent: 'Rent out'`.

**M4. Size filter and sort ignore land plots.**
- Problem: `PropertiesView.astro` sets `data-area={l.areaNet ?? ''}`, and all land cards have an empty `data-area`. On `/prona/toka-dhe-investime/`, any size filter hides all 14 plots and "Sipërfaqja: nga më e madhja" sorts them last.
- Fix: use `data-area={l.areaNet ?? (l.plotAres !== null ? l.plotAres * 100 : '')}` (1 ar = 100 m²), or hide the m² controls on the land page.

### Low

- **L1. Fractional bedrooms in Albanian.** B313 shows "3.5 dhoma gjumi" in the screen-reader label and the meta description. Change `card.bedrooms` in `sq.ts`/`en.ts` to use a formatted number: `formatNumber(n, lang)` in `specItems`/`metaDescription`.
- **L2. Price and unit price run together.** Cards, contact panel and meta descriptions show "€57,000 €10,000 per are" and "270.000 € 675 €/m²". Render the sub-price as `(…)` or with " · " in `ListingCard.astro`, `ContactPanel.astro` and `metaDescription()`.
- **L3. Misleading spec row.** "Qëndrimi ditor: Kuzhinë e ndarë" / "Living room: Separate kitchen". Rename the row to "Kuzhina" / "Kitchen" with values "E integruar me qëndrimin ditor" / "Open-plan with living room" and "E ndarë" / "Separate".
- **L4. Unbacked promises.** Replace these strings:
  - `filters.emptyText` "…ju njoftojmë kur kemi…" / "we will let you know…" → drop the promise.
  - `wanted.blocks[2]` "Rregullisht marrim" / "We regularly receive" → "Marrim" / "We receive".
  - `owners.process[1]` "Vlerësojmë" / "We assess" (implies a valuation service) → "Njihemi me pronën dhe e fotografojmë" / "We visit and photograph the property".
- **L5. 404 SEO head.** Canonical and hreflang point to `/`. Add a `noindex` prop to `BaseLayout` and omit canonical and alternates on `404.astro`.
- **L6. Long titles and descriptions.** 27 titles exceed 70 characters (B304 is 89); home descriptions are 174 and 180 characters. The listing meta description reads "Shtëpi · shitje · …" with a lower-case deal word.
- **L7. English place names.** The profile gives English names that are not used: "Lagjja Ndërkombëtare" → "International Village", "Zona Industriale" → "Industrial Zone" (`scripts/lib/parse-listing.ts` `NEIGHBOURHOODS[].en`). English slugs use "prishtine"; change them before launch if wanted.
- **L8. Touch targets on fine pointers.** Breadcrumbs 32px (`ListingView.astro:208`), footer links 40px (`Footer.astro:65`), language switch 36px (`LanguageSwitch.astro`), segmented labels 42px. Set `min-height: 44px`.
- **L9. Owners page without JS.** The composer is hidden but the intro still says "Plotësoni fushat…". Add a `<noscript>` line pointing to WhatsApp and email.
- **L10. Lightbox markup.** `<img alt data-img>` has no `src` (invalid HTML), and `aria-label` on `<p data-counter>` is ignored. Write "Fotografia 3 nga 10" as the live-region text instead.
- **L11. Price sort mixes deals.** On `/prona/`, price sort and filter compare monthly rent with sale prices when no deal is chosen. Sort within each deal, or enable price controls only after a deal is selected.
- **L12. Missing trailing slash.** `/prona` (no slash) returns 404 on the preview server. Make sure the host redirects to the trailing-slash URL.

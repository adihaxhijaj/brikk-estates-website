# Listing annotations (`data/listings/<REF>.json`)

The import script (`npm run import`) parses each Instagram caption automatically. Everything a parser cannot do reliably lives in one annotation file per listing:

- English translations of the description,
- a visual review of every image (what it shows, whether it carries text, whether to exclude it),
- corrections to parsed fields, **each backed by evidence quoted from the source**,
- the client-controlled `status` and `hidden` switches.

Inputs to read for a listing `B397`:

- `../instagram/listings/<date>_B397_<slug>/description.txt` — the original caption (read-only source).
- `data/import-draft/B397.json` — what the import script extracted: `descriptionSq` (the exact paragraphs that will be published), `extraCaptionsSq`, `aiDisclaimerSq`, `parsed` (all structured fields), `images` (file names).
- `data/import-draft/sheets/B397.jpg` — numbered contact sheet of all images. Open individual images in the source folder when a detail is unclear (small text, people in frames).

## File format

```json
{
  "ref": "B397",
  "descriptionEn": ["…one English paragraph per descriptionSq paragraph, same order…"],
  "extraCaptionsEn": [["…"]],
  "aiDisclaimerEn": "…only if aiDisclaimerSq is not null…",
  "valuesEn": { "landmark": "near …", "tradeIn": "…", "completion": "June 2026" },
  "images": [
    { "file": "01.jpg", "kind": "building", "overlay": "text", "reason": "headline and price banner" },
    { "file": "02.jpg", "kind": "living-kitchen", "overlay": "brand" },
    { "file": "09.jpg", "kind": "graphic", "overlay": "text", "exclude": true, "reason": "contact card only" }
  ],
  "overrides": {
    "complex": { "value": "Eliza B", "evidence": ["lagjen Eliza B"], "note": "complex named as a 'lagje' in the caption" },
    "pricePerM2": { "value": 870, "evidence": ["image:01.jpg 870€/m²"], "note": "price shown on the listing's own cover graphic" }
  },
  "notes": "free text for the maintainer"
}
```

Omit keys that are not needed (no empty `overrides`, no `valuesEn` without values). Do not set `status`, `hidden`, `titleSq` or `titleEn` unless the generated title is wrong (e.g. the caption offers "banesë ose zyrë").

## Translation rules

- Faithful English: same facts, same order, same paragraph and line structure (keep `\n` line breaks inside a paragraph where the Albanian has them). No added adjectives, no marketing polish, no omissions.
- Keep proper nouns in Albanian: street names ("Rruga Hysen Xhakolli"), complexes, neighbourhoods (Bregu i Diellit, Lagjja Ndërkombëtare), businesses. City names: Prishtina, Fushë Kosovë, Ulcinj, Tale, Obiliq, Lipjan.
- Units: `m²` stays; `ari` → "ares" (e.g. "40 ares"); prices as "€160,000", "€2,100/m²", "€3,500 per are".
- Common terms: *qëndrim ditor* → living room; *sallon* → living room; *dhomë gjumi* → bedroom; *banjo* → bathroom; *WC / tualet* → WC; *depo* → storage room; *ballkon* → balcony; *tarracë* → terrace; *fletë poseduese* → ownership certificate; *kontrata te noteri* → the contract is signed at the notary; *çmimi sipas marrëveshjes* → price by agreement; *ngrohje nën dysheme* → underfloor heating; *roleta elektrike* → electric shutters; *pompë termike* → heat pump; *1+1 / 2+1* stay as written.
- `valuesEn.landmark`: translate the verbatim parsed landmark phrase (e.g. "pranë Xhamisë së Re" → "near the New Mosque (Xhamia e Re)"). `valuesEn.tradeIn`: translate `parsed.extras.tradeIn`. `valuesEn.completion`: translate `parsed.completion` when present.

## Image review rules

- `kind` must be one of: living, living-kitchen, kitchen, dining, bedroom, bathroom, hallway, stairs, balcony, terrace, view, exterior, building, entrance, yard, garage, office, interior, warehouse, land, aerial, floorplan, render, graphic, other.
- `overlay`:
  - `none` — clean photograph, no added text or logo.
  - `brand` — photograph with only the small BRIKK ESTATES watermark and/or the thin phone/website footer and decorative symbol shapes.
  - `text` — any headline, price, size, spec list, location label or other copy placed on the image (including floor-plan cards and designed graphics).
- `exclude: true` with a `reason` when the image (a) shows an identifiable private person — including a clearly recognisable face in a framed photo or poster on a wall, (b) only repeats the contact footer with no property information, or (c) shows the old 2025 logo as the main content. Photos of empty rooms with a small unrecognisable figure far away are fine; say so in `reason` if you kept one.
- AI-generated concept images (typically land) are `kind: "render"`.

## Overrides (corrections to `parsed`)

- Only when the parsed value is **wrong** or **missing while the source states it explicitly**. Ambiguous → leave null.
- `evidence` is a list of exact substrings of the caption text (title, primary or secondary captions) — copy them character for character, including ë/ç and typographic quotes. The import fails if a quote is not found.
- For facts visible only on the agency's own listing graphic (price banner, floor-plan card), use `"image:NN.jpg <what it shows>"` and add a `note`. Never infer from photographs of rooms (do not count beds in photos).
- Allowed keys: city, neighbourhood, street, complex, landmark, country, developer, isNewBuild, completion, areaNet, areaApprox, areaTerrace, plotAres, floor, floorTo, totalFloors, orientation (N,S,E,W,NE,NW,SE,SW,E-W,N-S), bedrooms, bathrooms, wc, livingWithKitchen, storage, balcony, features (full array, vocabulary: underfloor-heating, heat-pump, electric-heating, central-heating, air-conditioning, elevator, electric-shutters, garage, parking, furnished, unfurnished, security-24-7, gated-community, playground, green-areas, video-surveillance, basement, terrace, yard), legal.ownershipCertificate, legal.notaryContract, legal.contractViaLawyer, legal.inLegalisation, legal.contractWithDeveloper, price, pricePerM2, pricePerAre, priceOnRequest, rentMonthly, deposit, minContractMonths, extras.financing, extras.installments, extras.tradeIn, extras.tenanted, extras.rentalIncome, extras.garageOptional.
- `city` / `neighbourhood` must use the canonical names already used in `parsed` elsewhere (Prishtinë, Fushë Kosovë, Obiliq, Lipjan, Ulqin, Tale; neighbourhood names from `scripts/lib/parse-listing.ts`).
- A `developer` may be set only when the caption names the builder ("ndërtim nga …", "ndërtues …"). A complex named after a company is not a developer claim.
- Summing counts stated per floor is not allowed; leave the total null unless the caption states it.

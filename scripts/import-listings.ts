// Imports the agency's Instagram listing archive into the site's content collection.
//
//   npm run import            (idempotent: same sources + annotations -> same output)
//
// Sources (read-only, never modified):   ../instagram/index.csv, ../instagram/listings/*/description.txt + NN.jpg
// Human-verified annotations:            data/listings/<REF>.json  (translations, image review, evidence-backed overrides, status)
// Output:                                src/content/listings/<ref>.json, src/assets/listings/<ref>/NN.jpg, docs/listing-import-report.md
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { parse as parseCsv } from 'csv-parse/sync';
import sharp from 'sharp';
import { splitDescriptionFile, cleanCaption, parseFields, CITIES, NEIGHBOURHOODS, type Deal, type PropertyType, type Parsed } from './lib/parse-listing.ts';
import { normalise, slugify } from './lib/text.ts';
import { TYPE, DEAL_PHRASE, IMAGE_KIND, completionEn } from '../src/i18n/vocab.ts';

const SITE = process.cwd();
const SOURCE = path.resolve(SITE, '..', 'instagram');
const ANNOTATIONS = path.join(SITE, 'data', 'listings');
const OUT_CONTENT = path.join(SITE, 'src', 'content', 'listings');
const OUT_IMAGES = path.join(SITE, 'src', 'assets', 'listings');
const REPORT = path.join(SITE, 'docs', 'listing-import-report.md');
const DRAFT = path.join(SITE, 'data', 'import-draft');
const MAX_EDGE = 2000;

const args = new Set(process.argv.slice(2));
const SKIP_IMAGES = args.has('--skip-images');

const TYPE_MAP: Record<string, PropertyType> = {
  'Duplex': 'duplex', 'Banese (apartment)': 'apartment', 'Depo/Showroom': 'warehouse', 'Penthouse': 'penthouse',
  'Shtepi (house)': 'house', 'Lokal (commercial)': 'commercial', 'Truall (land)': 'land', 'Toke (land)': 'land',
  'Objekt afarist': 'building', 'Zyre (office)': 'office',
};

/** overlay: none = clean photo; brand = small logo watermark / contact footer only; text = headline, price, specs or other copy on the image. */
interface ImageNote { file: string; kind: string; overlay: 'none' | 'brand' | 'text'; exclude?: boolean; reason?: string }
interface Annotation {
  ref: string;
  titleSq?: string; titleEn?: string;
  descriptionEn?: string[];
  extraCaptionsEn?: string[][];
  aiDisclaimerEn?: string;
  /** Disclaimer printed only on the agency's own render image (caption has none). */
  aiDisclaimerFromImage?: { file: string; sq: string; en: string };
  valuesEn?: Record<string, string>;
  images?: ImageNote[];
  overrides?: Record<string, { value: unknown; evidence: string[]; note?: string }>;
  status?: 'unconfirmed' | 'available' | 'reserved' | 'sold' | 'rented';
  hidden?: boolean;
  notes?: string;
}

const errors: string[] = [];
const fail = (ref: string, msg: string) => errors.push(`${ref}: ${msg}`);

function setPath(obj: Record<string, any>, key: string, value: unknown) {
  const parts = key.split('.');
  let o = obj;
  for (const p of parts.slice(0, -1)) o = o[p];
  if (!(parts.at(-1)! in o)) throw new Error(`unknown field ${key}`);
  o[parts.at(-1)!] = value;
}
const getPath = (obj: Record<string, any>, key: string) => key.split('.').reduce((o, p) => o?.[p], obj);

async function main() {
  const csv = parseCsv(await fs.readFile(path.join(SOURCE, 'index.csv')), { columns: true, bom: true }) as Record<string, string>[];
  const rows = csv.filter((r) => r.folder.startsWith('listings/'));
  const folders = (await fs.readdir(path.join(SOURCE, 'listings'), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  await fs.mkdir(OUT_CONTENT, { recursive: true });
  await fs.mkdir(OUT_IMAGES, { recursive: true });
  await fs.mkdir(DRAFT, { recursive: true });

  const out: any[] = [];
  const reportRows: string[] = [];

  for (const row of rows) {
    const ref = row.id;
    const refLower = ref.toLowerCase();
    const folderAbs = path.join(SOURCE, row.folder);
    const raw = await fs.readFile(path.join(folderAbs, 'description.txt'), 'utf8');
    const file = splitDescriptionFile(raw);
    const deal: Deal = row.deal.startsWith('Qira') ? 'rent' : 'sale';
    const type = TYPE_MAP[row.property];
    if (!type) { fail(ref, `unknown property type "${row.property}"`); continue; }
    if (file.header['ID'] !== ref) fail(ref, `header ID ${file.header['ID']} differs from CSV`);

    const primary = cleanCaption(file.primary, row.title);
    const secondary = file.secondary.map((s) => ({ url: s.url, ...cleanCaption(s.text, null) })).filter((s) => s.paragraphs.length);
    const parsed = parseFields({ title: row.title, body: primary.paragraphs.join('\n\n'), deal, type, csvSize: row.size, csvPrice: row.price });

    const annPath = path.join(ANNOTATIONS, `${ref}.json`);
    const ann: Annotation = existsSync(annPath) ? JSON.parse(await fs.readFile(annPath, 'utf8')) : { ref };

    // --- evidence-backed overrides ---
    const evidenceSource = normalise([row.title, file.primary, ...file.secondary.map((s) => s.text)].join('\n'));
    const record: Record<string, any> = structuredClone(parsed);
    const overridden: Record<string, { from: unknown; to: unknown; evidence: string[]; note?: string }> = {};
    for (const [key, o] of Object.entries(ann.overrides ?? {})) {
      if (!o.evidence?.length) { fail(ref, `override ${key} has no evidence`); continue; }
      // Text evidence must appear verbatim in the captions; "image:NN.jpg …" evidence must name an existing source image.
      const missing = o.evidence.filter((e) => {
        const img = e.match(/^image:(\S+\.jpe?g)\b/i);
        if (img) return !existsSync(path.join(folderAbs, img[1]));
        return !evidenceSource.includes(normalise(e));
      });
      if (missing.length) { fail(ref, `override ${key}: evidence not found in source: ${missing.map((m) => `"${m}"`).join(', ')}`); continue; }
      try {
        const from = getPath(record, key);
        setPath(record, key, o.value);
        overridden[key] = { from, to: o.value, evidence: o.evidence, note: o.note };
      } catch (e) { fail(ref, String(e)); }
    }
    if (!ann.overrides?.priceOnRequest) {
      record.priceOnRequest = [record.price, record.pricePerM2, record.pricePerAre, record.rentMonthly].every((v) => v === null);
    }
    const p = record as Parsed;

    // --- titles & slugs ---
    const multiple = /^Ofrohen\b/.test(row.title) || /\bbanesat\b/i.test(row.title) || /^Ofrohet për shitje banesa\b/.test(row.title);
    const t = TYPE[type];
    const city = CITIES.find((c) => c.name === p.city);
    const hood = NEIGHBOURHOODS.find((n) => n.name === p.neighbourhood);
    const placeSq = hood && city ? `${hood.loc}, ${city.loc}` : hood ? hood.loc : city ? city.loc : p.street ? p.street.replace(/^Rruga /, 'Rrugën ') : null;
    const placeEn = hood && city ? `${hood.en}, ${city.en}` : hood ? hood.en : city ? city.en : p.street;
    const generatedSq = `${multiple ? t.sqPlural : t.sq} ${DEAL_PHRASE[deal].sq}${placeSq ? ` në ${placeSq}` : ''}`;
    const generatedEn = `${multiple ? t.enPlural : t.en} ${DEAL_PHRASE[deal].en}${placeEn ? ` in ${placeEn}` : ''}`;
    const titleSq = ann.titleSq ?? generatedSq;
    const titleEn = ann.titleEn ?? generatedEn;
    const placeSlug = slugify(city?.name ?? hood?.name ?? p.street?.replace(/^Rruga /, '') ?? '');
    const slugSq = [refLower, t.slugSq, deal === 'sale' ? 'ne-shitje' : 'me-qira', placeSlug].filter(Boolean).join('-');
    const slugEn = [refLower, t.slugEn, deal === 'sale' ? 'for-sale' : 'for-rent', placeSlug].filter(Boolean).join('-');

    // --- translations ---
    const descriptionEn = ann.descriptionEn ?? null;
    if (descriptionEn && descriptionEn.length !== primary.paragraphs.length) fail(ref, `descriptionEn has ${descriptionEn.length} paragraphs, source has ${primary.paragraphs.length}`);
    const extraCaptions = secondary.map((s, i) => ({ url: s.url, sq: s.paragraphs, en: ann.extraCaptionsEn?.[i] ?? null }));
    extraCaptions.forEach((c, i) => { if (c.en && c.en.length !== c.sq.length) fail(ref, `extraCaptionsEn[${i}] paragraph count mismatch`); });
    if (primary.aiDisclaimer && !ann.aiDisclaimerEn) fail(ref, 'aiDisclaimerEn missing');
    const imgAi = ann.aiDisclaimerFromImage;
    if (imgAi && !existsSync(path.join(folderAbs, imgAi.file))) fail(ref, `aiDisclaimerFromImage: ${imgAi.file} not found`);
    const aiSq = primary.aiDisclaimer ?? imgAi?.sq ?? null;
    const aiEn = primary.aiDisclaimer ? ann.aiDisclaimerEn ?? null : imgAi?.en ?? null;

    // --- images ---
    const sourceImages = (await fs.readdir(folderAbs)).filter((f) => /\.jpe?g$/i.test(f)).sort();
    if (Number(row.images) !== sourceImages.length) fail(ref, `CSV says ${row.images} images, folder has ${sourceImages.length}`);
    const notes = new Map((ann.images ?? []).map((n) => [n.file, n]));
    if (ann.images) for (const f of sourceImages) if (!notes.has(f)) fail(ref, `image ${f} not reviewed`);
    const dirOut = path.join(OUT_IMAGES, refLower);
    await fs.mkdir(dirOut, { recursive: true });
    const images: any[] = [];
    for (const f of sourceImages) {
      const note = notes.get(f);
      if (note?.exclude) continue;
      const src = path.join(folderAbs, f);
      const dest = path.join(dirOut, f.replace(/\.jpeg$/i, '.jpg'));
      if (!SKIP_IMAGES) {
        const [s, d] = [await fs.stat(src), existsSync(dest) ? await fs.stat(dest) : null];
        if (!d || d.mtimeMs < s.mtimeMs) {
          await sharp(src).rotate().resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(dest);
        }
      }
      const meta = existsSync(dest) ? await sharp(dest).metadata() : await sharp(src).metadata();
      const kind = note?.kind && IMAGE_KIND[note.kind] ? note.kind : 'other';
      if (note && !IMAGE_KIND[note.kind]) fail(ref, `image ${f}: unknown kind ${note.kind}`);
      images.push({
        src: `../../assets/listings/${refLower}/${path.basename(dest)}`,
        file: f,
        width: meta.width, height: meta.height,
        kind,
        overlay: note?.overlay ?? null,
        hasTextOverlay: note ? note.overlay === 'text' : null,
      });
    }
    // Photographs first (original order), images with text overlays (headlines, prices, spec cards) last.
    images.sort((a, b) => Number(a.hasTextOverlay === true) - Number(b.hasTextOverlay === true));
    const isPhoto = (i: any) => !['floorplan', 'graphic', 'render'].includes(i.kind);
    const coverIndex = Math.max(0, [
      images.findIndex((i) => i.overlay === 'none' && isPhoto(i)),
      images.findIndex((i) => i.overlay === 'brand' && isPhoto(i)),
      images.findIndex((i) => isPhoto(i)),
    ].find((i) => i >= 0) ?? 0);
    const total = images.length;
    images.forEach((img, i) => {
      img.altSq = `${IMAGE_KIND[img.kind].sq}, ${titleSq.charAt(0).toLowerCase() + titleSq.slice(1)}, Ref ${ref} (${i + 1}/${total})`;
      img.altEn = `${IMAGE_KIND[img.kind].en}, ${titleEn.charAt(0).toLowerCase() + titleEn.slice(1)}, Ref ${ref} (${i + 1}/${total})`;
    });

    const completionEnValue = p.completion ? ann.valuesEn?.completion ?? completionEn(p.completion) : null;
    if (p.completion && !completionEnValue) fail(ref, `no English for completion "${p.completion}"`);
    if (p.extras.tradeIn && !ann.valuesEn?.tradeIn) fail(ref, 'valuesEn.tradeIn missing');
    if (p.landmark && !ann.valuesEn?.landmark) fail(ref, 'valuesEn.landmark missing');

    const entry = {
      ref, slugSq, slugEn,
      postedAt: row.posted,
      instagramUrl: row.instagram,
      deal, type, multipleUnits: multiple,
      titleSq, titleEn,
      city: p.city, cityEn: city?.en ?? null,
      neighbourhood: p.neighbourhood, neighbourhoodLoc: hood?.loc ?? null,
      street: p.street, complex: p.complex,
      landmark: p.landmark, landmarkEn: p.landmark ? ann.valuesEn?.landmark ?? null : null,
      country: p.country,
      developer: p.developer, isNewBuild: p.isNewBuild, completion: p.completion, completionEn: completionEnValue,
      areaNet: p.areaNet, areaApprox: p.areaApprox, areaTerrace: p.areaTerrace, plotAres: p.plotAres,
      floor: p.floor, floorTo: p.floorTo, totalFloors: p.totalFloors, orientation: p.orientation,
      bedrooms: p.bedrooms, bathrooms: p.bathrooms, wc: p.wc, livingWithKitchen: p.livingWithKitchen, storage: p.storage, balcony: p.balcony,
      features: p.features,
      legal: p.legal,
      price: p.price, pricePerM2: p.pricePerM2, pricePerAre: p.pricePerAre, priceOnRequest: p.priceOnRequest,
      rentMonthly: p.rentMonthly, deposit: p.deposit, minContractMonths: p.minContractMonths,
      extras: { ...p.extras, tradeInEn: p.extras.tradeIn ? ann.valuesEn?.tradeIn ?? null : null },
      aiVisualisation: Boolean(aiSq) || images.some((i) => i.kind === 'render'),
      aiDisclaimerSq: aiSq, aiDisclaimerEn: aiEn,
      status: ann.status ?? p.status,
      hidden: ann.hidden ?? false,
      descriptionSq: primary.paragraphs,
      descriptionEn,
      descriptionEnIsTranslation: true,
      extraCaptions,
      images, coverIndex,
      provenance: { overridden, warnings: parsed.warnings, reviewedImages: Boolean(ann.images), translated: Boolean(descriptionEn) },
    };
    out.push(entry);
    await fs.writeFile(path.join(OUT_CONTENT, `${refLower}.json`), JSON.stringify(entry, null, 2) + '\n');
    // Draft for translators/reviewers: the exact paragraphs that need English.
    await fs.writeFile(path.join(DRAFT, `${ref}.json`), JSON.stringify({ ref, title: row.title, descriptionSq: primary.paragraphs, extraCaptionsSq: secondary.map((s) => s.paragraphs), aiDisclaimerSq: primary.aiDisclaimer, removedLines: primary.removed, parsed, images: sourceImages }, null, 2) + '\n');
    reportRows.push(ref);
  }

  // Remove stale outputs for listings no longer in the CSV.
  const keep = new Set(out.map((e) => `${e.ref.toLowerCase()}.json`));
  for (const f of await fs.readdir(OUT_CONTENT)) if (f.endsWith('.json') && !keep.has(f)) await fs.unlink(path.join(OUT_CONTENT, f));

  await writeReport(out, folders);

  if (errors.length) {
    console.error(`\n${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join('\n'));
    process.exitCode = args.has('--allow-incomplete') ? 0 : 1;
  }
  console.log(`Imported ${out.length} listings from ${folders.length} folders.`);
}

async function writeReport(entries: any[], folders: string[]) {
  const fields = ['city', 'neighbourhood', 'street', 'complex', 'landmark', 'developer', 'isNewBuild', 'completion', 'areaNet', 'areaTerrace', 'plotAres', 'floor', 'orientation', 'bedrooms', 'bathrooms', 'wc', 'livingWithKitchen', 'storage', 'balcony', 'legal.ownershipCertificate', 'legal.notaryContract', 'legal.contractViaLawyer', 'legal.inLegalisation', 'legal.contractWithDeveloper', 'price', 'pricePerM2', 'pricePerAre', 'rentMonthly', 'deposit', 'minContractMonths', 'extras.financing', 'extras.tradeIn', 'extras.tenanted', 'extras.rentalIncome'];
  const refs = entries.map((e) => Number(e.ref.slice(1))).sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let n = refs[0]; n <= refs.at(-1)!; n++) if (!refs.includes(n)) gaps.push(n);

  // Possible duplicates / reposts: same deal+type and same area, or same street+type within 14 days.
  const dups: string[] = [];
  for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
    const a = entries[i], b = entries[j];
    if (a.deal !== b.deal || a.type !== b.type) continue;
    const days = Math.abs(Date.parse(a.postedAt) - Date.parse(b.postedAt)) / 864e5;
    const reasons: string[] = [];
    if (a.areaNet && a.areaNet === b.areaNet) reasons.push(`same size ${a.areaNet} m²`);
    if (a.plotAres && a.plotAres === b.plotAres) reasons.push(`same plot ${a.plotAres} ari`);
    if (a.street && a.street === b.street && days <= 14) reasons.push(`same street (${a.street}) ${Math.round(days)} days apart`);
    if (normalise(a.descriptionSq.join(' ')) === normalise(b.descriptionSq.join(' '))) reasons.push('identical description');
    if (reasons.length && (reasons.some((r) => r.startsWith('same size') || r.startsWith('identical')) || days <= 14)) dups.push(`| ${a.ref} | ${b.ref} | ${reasons.join('; ')} |`);
  }

  const val = (v: unknown) => (v === null || v === undefined ? null : v);
  const lines: string[] = [];
  lines.push('# Listing import report', '');
  lines.push(`Generated by \`scripts/import-listings.ts\`. Source: \`instagram/index.csv\` and \`instagram/listings/*/description.txt\` (read-only).`, '');
  lines.push('## Totals', '');
  lines.push(`- Listing folders found: **${folders.length}**`);
  lines.push(`- Listings imported: **${entries.length}**`);
  lines.push(`- Sale: ${entries.filter((e) => e.deal === 'sale').length} · Rent: ${entries.filter((e) => e.deal === 'rent').length}`);
  lines.push(`- Translated to English: ${entries.filter((e) => e.descriptionEn).length} · Images reviewed: ${entries.filter((e) => e.provenance.reviewedImages).length}`);
  lines.push(`- Status: ${Object.entries(entries.reduce((acc: Record<string, number>, e) => ((acc[e.status] = (acc[e.status] ?? 0) + 1), acc), {})).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  lines.push('', '## Reference-number gaps', '', `Codes run ${entries.map((e) => e.ref).sort()[0]}–${entries.map((e) => e.ref).sort().at(-1)}. Numbers not published on Instagram (normal, not errors): ${gaps.map((g) => `B${g}`).join(', ') || 'none'}.`);
  lines.push('', '## Possible duplicates or reposts (flagged only, nothing merged or deleted)', '', '| Listing | Listing | Why flagged |', '|---|---|---|', ...(dups.length ? dups : ['| – | – | none |']));
  lines.push('', '## Per listing', '');
  for (const e of entries) {
    const populated = fields.filter((f) => val(getPath(e, f)) !== null);
    const nulls = fields.filter((f) => val(getPath(e, f)) === null);
    const cover = e.images[e.coverIndex];
    lines.push(`### ${e.ref} · ${e.titleSq}`, '');
    lines.push(`- ${e.deal} · ${e.type}${e.multipleUnits ? ' (several units)' : ''} · posted ${e.postedAt} · ${e.images.length} images · cover \`${cover?.file ?? '—'}\`${cover?.hasTextOverlay === null ? ' (not yet reviewed)' : ''}`);
    lines.push(`- Populated: ${populated.map((f) => `\`${f}\`=${JSON.stringify(getPath(e, f))}`).join(', ') || '—'}`);
    lines.push(`- Features: ${e.features.join(', ') || '—'}`);
    lines.push(`- Null: ${nulls.map((f) => `\`${f}\``).join(', ')}`);
    if (Object.keys(e.provenance.overridden).length) lines.push(`- Overrides: ${Object.entries(e.provenance.overridden).map(([k, o]: any) => `\`${k}\` ${JSON.stringify(o.from)} → ${JSON.stringify(o.to)} (evidence: ${o.evidence.map((x: string) => `“${x}”`).join(' + ')}${o.note ? `; ${o.note}` : ''})`).join('; ')}`);
    if (e.provenance.warnings.length) lines.push(`- Parser warnings: ${e.provenance.warnings.join('; ')}`);
    lines.push('');
  }
  const spot = path.join(SITE, 'docs', 'listing-spot-check.md');
  if (existsSync(spot)) lines.push('## Manual spot-check', '', `See [listing-spot-check.md](listing-spot-check.md).`, '');
  await fs.mkdir(path.dirname(REPORT), { recursive: true });
  await fs.writeFile(REPORT, lines.join('\n'));
}

main().catch((e) => { console.error(e); process.exit(1); });

// Listings created in the office admin app (admin/server.ts), as opposed to the Instagram archive.
//
//   data/manual/<REF>/listing.json   structured fields typed by the team (source of truth)
//   data/manual/<REF>/photos/*.jpg   photos, already resized in the browser; order and cover come from listing.json
//
// scripts/import-listings.ts turns each one into src/content/listings/<ref>.json like any other listing.
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CITIES, NEIGHBOURHOODS, type Deal, type PropertyType } from './parse-listing.ts';
import { slugify } from './text.ts';
import { TYPE, DEAL_PHRASE, FEATURE, IMAGE_KIND, completionEn } from '../../src/i18n/vocab.ts';

export const MANUAL_DIR = path.join(process.cwd(), 'data', 'manual');
export const TYPES = Object.keys(TYPE) as PropertyType[];
export const STATUSES = ['unconfirmed', 'available', 'reserved', 'sold', 'rented'] as const;
export type Status = (typeof STATUSES)[number];

export interface ManualPhoto { file: string; kind: string }
export interface ManualListing {
  ref: string;
  postedAt: string;
  createdBy?: string;
  updatedAt?: string;
  deal: Deal;
  type: PropertyType;
  city: string | null;
  neighbourhood: string | null;
  street: string | null;
  complex: string | null;
  country: 'XK' | 'ME' | 'AL';
  price: number | null;
  pricePerM2: number | null;
  rentMonthly: number | null;
  deposit: number | null;
  areaNet: number | null;
  plotAres: number | null;
  floor: number | null;
  totalFloors: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  balcony: boolean | null;
  storage: boolean | null;
  isNewBuild: boolean | null;
  completion: string | null;
  completionEn: string | null;
  features: string[];
  titleSq: string | null;
  titleEn: string | null;
  descriptionSq: string;
  descriptionEn: string;
  photos: ManualPhoto[];
  status: Status;
  hidden: boolean;
}

const paragraphs = (s: string) => s.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const numOrNull = (v: unknown) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const strOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const boolOrNull = (v: unknown) => (v === true ? true : v === false ? false : null);

/** Normalises untrusted form input into a ManualListing; returns the problems found (empty = valid). */
export function validateManual(input: any): { listing: ManualListing; problems: string[] } {
  const problems: string[] = [];
  const ref = String(input?.ref ?? '').trim().toUpperCase();
  if (!/^B\d{3}$/.test(ref)) problems.push('Ref must look like B398.');
  const deal = input?.deal === 'rent' ? 'rent' : input?.deal === 'sale' ? 'sale' : null;
  if (!deal) problems.push('Choose sale or rent.');
  const type = TYPES.includes(input?.type) ? (input.type as PropertyType) : null;
  if (!type) problems.push('Choose a property type.');
  const postedAt = /^\d{4}-\d{2}-\d{2}$/.test(input?.postedAt ?? '') ? input.postedAt : new Date().toISOString().slice(0, 10);
  const descriptionSq = String(input?.descriptionSq ?? '').trim();
  if (!descriptionSq) problems.push('Write the Albanian description.');
  const photos: ManualPhoto[] = Array.isArray(input?.photos)
    ? input.photos
        .filter((p: any) => typeof p?.file === 'string' && /^[\w-]+\.jpg$/.test(p.file))
        .map((p: any) => ({ file: p.file, kind: IMAGE_KIND[p.kind] ? p.kind : 'other' }))
    : [];
  if (!photos.length) problems.push('Add at least one photo.');
  const city = strOrNull(input?.city);
  const known = CITIES.find((c) => c.name === city);
  const listing: ManualListing = {
    ref,
    postedAt,
    createdBy: strOrNull(input?.createdBy) ?? undefined,
    updatedAt: strOrNull(input?.updatedAt) ?? undefined,
    deal: deal ?? 'sale',
    type: type ?? 'apartment',
    city,
    neighbourhood: strOrNull(input?.neighbourhood),
    street: strOrNull(input?.street),
    complex: strOrNull(input?.complex),
    country: known?.country ?? (['XK', 'ME', 'AL'].includes(input?.country) ? input.country : 'XK'),
    price: numOrNull(input?.price),
    pricePerM2: numOrNull(input?.pricePerM2),
    rentMonthly: numOrNull(input?.rentMonthly),
    deposit: numOrNull(input?.deposit),
    areaNet: numOrNull(input?.areaNet),
    plotAres: numOrNull(input?.plotAres),
    floor: numOrNull(input?.floor),
    totalFloors: numOrNull(input?.totalFloors),
    bedrooms: numOrNull(input?.bedrooms),
    bathrooms: numOrNull(input?.bathrooms),
    balcony: boolOrNull(input?.balcony),
    storage: boolOrNull(input?.storage),
    isNewBuild: boolOrNull(input?.isNewBuild),
    completion: strOrNull(input?.completion),
    completionEn: strOrNull(input?.completionEn),
    features: Array.isArray(input?.features) ? [...new Set<string>(input.features.filter((f: string) => FEATURE[f]))] : [],
    titleSq: strOrNull(input?.titleSq),
    titleEn: strOrNull(input?.titleEn),
    descriptionSq,
    descriptionEn: String(input?.descriptionEn ?? '').trim(),
    photos,
    status: STATUSES.includes(input?.status) ? input.status : 'available',
    hidden: input?.hidden === true,
  };
  for (const k of ['price', 'pricePerM2', 'rentMonthly', 'deposit', 'areaNet', 'plotAres', 'bedrooms', 'bathrooms', 'totalFloors'] as const) {
    if (listing[k] !== null && listing[k]! < 0) problems.push(`${k} cannot be negative.`);
  }
  if (listing.completion && !listing.completionEn && !completionEn(listing.completion)) problems.push('Add the English for the completion date.');
  return { listing, problems };
}

export async function readManualListings(): Promise<ManualListing[]> {
  if (!existsSync(MANUAL_DIR)) return [];
  const dirs = (await fs.readdir(MANUAL_DIR, { withFileTypes: true })).filter((d) => d.isDirectory() && /^B\d{3}$/.test(d.name));
  const out: ManualListing[] = [];
  for (const d of dirs) {
    const file = path.join(MANUAL_DIR, d.name, 'listing.json');
    if (existsSync(file)) out.push(JSON.parse(await fs.readFile(file, 'utf8')));
  }
  return out;
}

/** Builds the content-collection entry for a manual listing and writes its optimised images. */
export async function buildManualEntry(m: ManualListing, outImages: string, fail: (ref: string, msg: string) => void) {
  const { problems } = validateManual(m);
  problems.forEach((p) => fail(m.ref, p));
  const refLower = m.ref.toLowerCase();
  const t = TYPE[m.type];
  const city = CITIES.find((c) => c.name === m.city);
  const hood = NEIGHBOURHOODS.find((n) => n.name === m.neighbourhood);
  const hoodLoc = hood?.loc ?? m.neighbourhood;
  const hoodEn = hood?.en ?? m.neighbourhood;
  const cityLoc = city?.loc ?? m.city;
  const cityEn = city?.en ?? m.city;
  const placeSq = hoodLoc && cityLoc ? `${hoodLoc}, ${cityLoc}` : hoodLoc ?? cityLoc;
  const placeEn = hoodEn && cityEn ? `${hoodEn}, ${cityEn}` : hoodEn ?? cityEn;
  const titleSq = m.titleSq ?? `${t.sq} ${DEAL_PHRASE[m.deal].sq}${placeSq ? ` në ${placeSq}` : ''}`;
  const titleEn = m.titleEn ?? `${t.en} ${DEAL_PHRASE[m.deal].en}${placeEn ? ` in ${placeEn}` : ''}`;
  const placeSlug = slugify(m.city ?? m.neighbourhood ?? '');
  const slugSq = [refLower, t.slugSq, m.deal === 'sale' ? 'ne-shitje' : 'me-qira', placeSlug].filter(Boolean).join('-');
  const slugEn = [refLower, t.slugEn, m.deal === 'sale' ? 'for-sale' : 'for-rent', placeSlug].filter(Boolean).join('-');

  // Images: copy in the chosen order; remove outputs for photos that were deleted.
  const srcDir = path.join(MANUAL_DIR, m.ref, 'photos');
  const dirOut = path.join(outImages, refLower);
  await fs.mkdir(dirOut, { recursive: true });
  const wanted = new Set(m.photos.map((p) => p.file));
  for (const f of await fs.readdir(dirOut)) if (!wanted.has(f)) await fs.unlink(path.join(dirOut, f));
  const images: any[] = [];
  for (const p of m.photos) {
    const src = path.join(srcDir, p.file);
    if (!existsSync(src)) { fail(m.ref, `photo ${p.file} is missing`); continue; }
    const dest = path.join(dirOut, p.file);
    const [s, d] = [await fs.stat(src), existsSync(dest) ? await fs.stat(dest) : null];
    if (!d || d.mtimeMs < s.mtimeMs) {
      await sharp(src).rotate().resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toFile(dest);
    }
    const meta = await sharp(dest).metadata();
    images.push({ src: `../../assets/listings/${refLower}/${p.file}`, file: p.file, width: meta.width, height: meta.height, kind: p.kind, overlay: 'none', hasTextOverlay: false });
  }
  images.forEach((img, i) => {
    img.altSq = `${IMAGE_KIND[img.kind].sq}, ${titleSq.charAt(0).toLowerCase() + titleSq.slice(1)}, Ref ${m.ref} (${i + 1}/${images.length})`;
    img.altEn = `${IMAGE_KIND[img.kind].en}, ${titleEn.charAt(0).toLowerCase() + titleEn.slice(1)}, Ref ${m.ref} (${i + 1}/${images.length})`;
  });

  const sq = paragraphs(m.descriptionSq);
  const en = paragraphs(m.descriptionEn);
  const features = [...m.features];
  const pricePerM2 = m.pricePerM2 ?? (m.deal === 'sale' && m.price !== null && m.areaNet ? Math.round(m.price / m.areaNet) : null);

  return {
    ref: m.ref, slugSq, slugEn,
    postedAt: m.postedAt,
    instagramUrl: null,
    deal: m.deal, type: m.type, multipleUnits: false,
    titleSq, titleEn,
    city: m.city, cityEn: cityEn ?? null,
    neighbourhood: m.neighbourhood, neighbourhoodLoc: hoodLoc ?? null,
    street: m.street, complex: m.complex,
    landmark: null, landmarkEn: null,
    country: m.country,
    developer: null, isNewBuild: m.isNewBuild,
    completion: m.completion, completionEn: m.completion ? m.completionEn ?? completionEn(m.completion) : null,
    areaNet: m.areaNet, areaApprox: false, areaTerrace: null, plotAres: m.plotAres,
    floor: m.floor, floorTo: null, totalFloors: m.totalFloors, orientation: null,
    bedrooms: m.bedrooms, bathrooms: m.bathrooms, wc: null, livingWithKitchen: null, storage: m.storage, balcony: m.balcony,
    features,
    legal: { ownershipCertificate: null, notaryContract: null, contractViaLawyer: null, inLegalisation: null, contractWithDeveloper: null },
    price: m.deal === 'sale' ? m.price : null,
    pricePerM2: m.deal === 'sale' ? pricePerM2 : null,
    pricePerAre: null,
    priceOnRequest: m.deal === 'sale' ? m.price === null && pricePerM2 === null : m.rentMonthly === null,
    rentMonthly: m.deal === 'rent' ? m.rentMonthly : null,
    deposit: m.deal === 'rent' ? m.deposit : null,
    minContractMonths: null,
    extras: { financing: null, installments: null, tradeIn: null, tradeInEn: null, tenanted: null, rentalIncome: null, garageOptional: null },
    aiVisualisation: images.some((i) => i.kind === 'render'),
    aiDisclaimerSq: null, aiDisclaimerEn: null,
    status: m.status,
    hidden: m.hidden,
    descriptionSq: sq,
    // No English written: the English page shows the Albanian text with a note, so the listing is never held back.
    descriptionEn: en.length ? en : sq,
    descriptionEnIsTranslation: en.length > 0,
    extraCaptions: [],
    images,
    coverIndex: 0,
    provenance: { source: 'admin', createdBy: m.createdBy ?? null, updatedAt: m.updatedAt ?? null, overridden: {}, warnings: [], reviewedImages: true, translated: en.length > 0 },
  };
}

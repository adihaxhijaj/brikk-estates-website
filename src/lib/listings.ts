import { getCollection, type CollectionEntry } from 'astro:content';
import { CATALOGUE } from '../config/site';
import { CATEGORY, TYPE, ORIENTATION, DEAL } from '../i18n/vocab';
import { dict, formatArea, formatAres, formatEuro, formatNumber, formatPerAre, formatPerM2, type Lang } from '../i18n';

export type Listing = CollectionEntry<'listings'>['data'];

/** Listings the site may show, newest first. */
export async function getVisibleListings(): Promise<Listing[]> {
  const all = (await getCollection('listings')).map((e) => e.data);
  return all
    .filter((l) => !l.hidden)
    .filter((l) => {
      if (l.status === 'available' || l.status === 'reserved') return true;
      if (l.status === 'unconfirmed') return CATALOGUE.showUnconfirmed;
      return CATALOGUE.showSoldOrRented;
    })
    .filter((l) => l.descriptionEn !== null)
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt) || b.ref.localeCompare(a.ref));
}

export const categoryOf = (l: Listing) => (Object.entries(CATEGORY).find(([, c]) => c.types.includes(l.type))?.[0] ?? 'commercial') as keyof typeof CATEGORY;

/** Land & investment: land, commercial units with tenants/income, and coastal listings abroad. */
export const isLandInvestment = (l: Listing) =>
  l.type === 'land' || ((l.type === 'commercial' || l.type === 'building') && l.deal === 'sale') || Boolean(l.extras.tenanted) || l.extras.rentalIncome !== null || l.country === 'ME' || l.country === 'AL';

export const title = (l: Listing, lang: Lang) => (lang === 'en' ? l.titleEn : l.titleSq);
export const cityName = (l: Listing, lang: Lang) => (lang === 'en' ? l.cityEn : l.city);

export function locationLine(l: Listing, lang: Lang) {
  const parts = [l.complex, l.neighbourhood, l.street && !l.neighbourhood ? l.street : null, cityName(l, lang)].filter(Boolean) as string[];
  if (l.country && l.country !== 'XK') parts.push(dict(lang).detail.countries[l.country]);
  return [...new Set(parts)].join(', ');
}

export interface PriceView { main: string | null; sub: string | null; onRequest: boolean }
export function priceView(l: Listing, lang: Lang): PriceView {
  const t = dict(lang);
  if (l.deal === 'rent' && l.rentMonthly !== null) return { main: formatEuro(l.rentMonthly, lang), sub: t.card.perMonth, onRequest: false };
  if (l.price !== null) {
    const sub = l.pricePerM2 !== null ? formatPerM2(l.pricePerM2, lang) : l.pricePerAre !== null ? formatPerAre(l.pricePerAre, lang) : null;
    return { main: formatEuro(l.price, lang), sub, onRequest: false };
  }
  if (l.pricePerM2 !== null) return { main: formatPerM2(l.pricePerM2, lang), sub: null, onRequest: false };
  if (l.pricePerAre !== null) return { main: formatPerAre(l.pricePerAre, lang), sub: null, onRequest: false };
  return { main: null, sub: null, onRequest: true };
}

export function sizeLabel(l: Listing, lang: Lang) {
  const approx = l.areaApprox ? `${dict(lang).detail.approx} ` : '';
  if (l.type === 'land' && l.plotAres !== null) return approx + formatAres(l.plotAres, lang);
  if (l.areaNet !== null) return approx + formatArea(l.areaNet, lang);
  if (l.plotAres !== null) return formatAres(l.plotAres, lang);
  return null;
}

export function floorLabel(l: Listing, lang: Lang) {
  const t = dict(lang);
  if (l.floor === null) return null;
  if (l.floor === 0 && l.floorTo === null) return t.card.ground;
  return l.floorTo !== null ? `${l.floor}–${l.floorTo}` : String(l.floor);
}

/** Compact spec items for cards and the key-facts row. */
export function specItems(l: Listing, lang: Lang) {
  const t = dict(lang);
  const items: { icon: string; label: string; srLabel: string }[] = [];
  const size = sizeLabel(l, lang);
  if (size) items.push({ icon: l.type === 'land' ? 'land-plot' : 'ruler-dimension-line', label: size, srLabel: `${l.type === 'land' ? t.card.plot : t.card.area}: ${size}` });
  if (l.bedrooms !== null) items.push({ icon: 'bed-double', label: formatNumber(l.bedrooms, lang), srLabel: t.card.bedrooms(l.bedrooms) });
  if (l.bathrooms !== null) items.push({ icon: 'bath', label: formatNumber(l.bathrooms, lang), srLabel: t.card.bathrooms(l.bathrooms) });
  const floor = floorLabel(l, lang);
  if (floor !== null) items.push({ icon: 'layers', label: floor === t.card.ground ? floor : `${t.card.floor} ${floor}`, srLabel: floor === t.card.ground ? floor : `${t.card.floor} ${floor}` });
  return items;
}

export const typeLabel = (l: Listing, lang: Lang) => {
  const t = TYPE[l.type];
  return lang === 'en' ? (l.multipleUnits ? t.enPlural : t.en) : l.multipleUnits ? t.sqPlural : t.sq;
};
export const dealLabel = (l: Listing, lang: Lang) => DEAL[l.deal][lang];
export const orientationLabel = (l: Listing, lang: Lang) => (l.orientation ? ORIENTATION[l.orientation]?.[lang] ?? null : null);

/** Similar: same deal and type; nearest by city then price. */
export function similarListings(l: Listing, all: Listing[], n = 3) {
  const p = (x: Listing) => x.price ?? x.rentMonthly ?? null;
  return all
    .filter((x) => x.ref !== l.ref && x.deal === l.deal && categoryOf(x) === categoryOf(l))
    .map((x) => ({ x, score: (x.city === l.city ? 0 : 1) * 1e9 + (p(x) !== null && p(l) !== null ? Math.abs(p(x)! - p(l)!) : 1e8) }))
    .sort((a, b) => a.score - b.score || b.x.postedAt.localeCompare(a.x.postedAt))
    .slice(0, n)
    .map((s) => s.x);
}

export function metaDescription(l: Listing, lang: Lang) {
  const parts = [typeLabel(l, lang), dealLabel(l, lang).toLowerCase(), sizeLabel(l, lang), locationLine(l, lang)].filter(Boolean);
  const pv = priceView(l, lang);
  const t = dict(lang);
  const price = pv.onRequest ? t.card.priceOnRequest : [pv.main, pv.sub].filter(Boolean).join(' ');
  const beds = l.bedrooms !== null ? t.card.bedrooms(l.bedrooms) : null;
  return `${[parts.join(' · '), beds, price].filter(Boolean).join(' · ')}. Ref ${l.ref}, Brikk Estates.`;
}

import { sq } from './sq';
import { en } from './en';
import type { Lang } from './vocab';

export type { Lang };
export const LANGS: Lang[] = ['sq', 'en'];
export const dict = (lang: Lang) => (lang === 'en' ? en : sq);

export type PageKey = 'home' | 'properties' | 'sale' | 'rent' | 'land' | 'newBuilds' | 'owners' | 'wanted' | 'about' | 'contact';

export const ROUTES: Record<PageKey, Record<Lang, string>> = {
  home: { sq: '/', en: '/en/' },
  properties: { sq: '/prona/', en: '/en/properties/' },
  sale: { sq: '/prona/shitje/', en: '/en/properties/sale/' },
  rent: { sq: '/prona/qira/', en: '/en/properties/rent/' },
  land: { sq: '/prona/toka-dhe-investime/', en: '/en/properties/land-investment/' },
  newBuilds: { sq: '/prona/ndertime-te-reja/', en: '/en/properties/new-builds/' },
  owners: { sq: '/per-pronaret/', en: '/en/for-owners/' },
  wanted: { sq: '/kerkojme-prona/', en: '/en/properties-wanted/' },
  about: { sq: '/rreth-nesh/', en: '/en/about/' },
  contact: { sq: '/kontakt/', en: '/en/contact/' },
};

export const route = (key: PageKey, lang: Lang) => ROUTES[key][lang];
export const listingPath = (l: { slugSq: string; slugEn: string }, lang: Lang) => (lang === 'en' ? `/en/properties/${l.slugEn}/` : `/prona/${l.slugSq}/`);

// ---- Number formatting: sq "95.000 €", "133,03 m²"; en "€95,000", "133.03 m²" ----
const numberLocale = (lang: Lang) => (lang === 'en' ? 'en-GB' : 'de-DE');
export function formatNumber(n: number, lang: Lang, maxFractionDigits = 3) {
  return new Intl.NumberFormat(numberLocale(lang), { maximumFractionDigits: maxFractionDigits, useGrouping: true }).format(n);
}
export function formatEuro(n: number, lang: Lang) {
  const s = formatNumber(n, lang, 0);
  return lang === 'en' ? `€${s}` : `${s} €`;
}
export const formatArea = (n: number, lang: Lang) => `${formatNumber(n, lang)} m²`;
export const formatAres = (n: number, lang: Lang) => `${formatNumber(n, lang)} ${lang === 'en' ? (n === 1 ? 'are' : 'ares') : 'ari'}`;
export const formatPerM2 = (n: number, lang: Lang) => (lang === 'en' ? `€${formatNumber(n, lang, 0)}/m²` : `${formatNumber(n, lang, 0)} €/m²`);
export const formatPerAre = (n: number, lang: Lang) => (lang === 'en' ? `€${formatNumber(n, lang, 0)} per are` : `${formatNumber(n, lang, 0)} €/ari`);
export function formatDate(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'sq-AL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

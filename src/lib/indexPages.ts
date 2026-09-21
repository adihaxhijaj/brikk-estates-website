/** Shared definitions for the five property index pages, so SQ and EN stay identical in behaviour. */
import { dict, type Lang, type PageKey } from '../i18n';
import { getVisibleListings, isLandInvestment, type Listing } from './listings';

export type IndexKind = 'all' | 'sale' | 'rent' | 'land' | 'newBuilds';

const PAGE_KEY: Record<IndexKind, PageKey> = {
  all: 'properties',
  sale: 'sale',
  rent: 'rent',
  land: 'land',
  newBuilds: 'newBuilds',
};

const SELECT: Record<IndexKind, (l: Listing) => boolean> = {
  all: () => true,
  sale: (l) => l.deal === 'sale',
  rent: (l) => l.deal === 'rent',
  land: isLandInvestment,
  newBuilds: (l) => l.isNewBuild === true,
};

export async function indexPage(kind: IndexKind, lang: Lang) {
  const t = dict(lang);
  const listings = (await getVisibleListings()).filter(SELECT[kind]);

  const h1 = {
    all: t.listings.allH1,
    sale: t.listings.saleH1,
    rent: t.listings.rentH1,
    land: t.listings.landH1,
    newBuilds: t.listings.newH1,
  }[kind];

  const intro = kind === 'land' ? t.listings.landIntro : kind === 'newBuilds' ? t.listings.newIntro : null;

  return {
    pageKey: PAGE_KEY[kind],
    listings,
    h1,
    intro,
    title: t.listings.metaTitle[kind === 'all' ? 'all' : kind],
    description: t.listings.metaDescription[kind === 'all' ? 'all' : kind](listings.length),
    // Sale and rent pages are already one deal; the control would only ever empty the page.
    showDeal: kind !== 'sale' && kind !== 'rent',
  };
}

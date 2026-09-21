/**
 * Listing labels.
 *
 * The agency supplied a twelve-colour label system. Only the labels the catalogue can actually
 * back with data are ever rendered — nothing here infers or invents a status:
 *
 *   sale / rent   from `deal`
 *   reserved      from `status: "reserved"`
 *   sold          from `status: "sold"`
 *   rented        from `status: "rented"`
 *
 * The remaining eight (exclusive, new, featured, reduced, soon, investment, offmarket) have
 * colours and translated names ready, but no field in the listing schema expresses them, so
 * they are never applied automatically. To start using one, add the field to the annotation
 * file and the schema, then extend `labelsFor` below.
 *
 * "investment" is deliberately NOT auto-applied: isLandInvestment() is a broad grouping used to
 * build the land & investment index, not a claim the agency has made about a specific property.
 */
import { dict, type Lang } from '../i18n';
import type { Listing } from './listings';

export type LabelKey =
  | 'exclusive'
  | 'sale'
  | 'rent'
  | 'new'
  | 'featured'
  | 'reduced'
  | 'reserved'
  | 'sold'
  | 'rented'
  | 'soon'
  | 'investment'
  | 'offmarket';

export interface Label {
  key: LabelKey;
  text: string;
  /** Class from base.css that carries this label's ground and text colour. */
  className: string;
}

export const labelText = (key: LabelKey, lang: Lang) => dict(lang).labels[key];

/** Labels for a listing, most important first. Deal always; status only when the source says so. */
export function labelsFor(l: Listing, lang: Lang): Label[] {
  const out: Label[] = [];

  const add = (key: LabelKey) => out.push({ key, text: labelText(key, lang), className: `badge-${key}` });

  // A closed deal is the headline fact, so it leads.
  if (l.status === 'sold') add('sold');
  else if (l.status === 'rented') add('rented');
  else if (l.status === 'reserved') add('reserved');

  add(l.deal === 'sale' ? 'sale' : 'rent');

  return out;
}

/** The single label used in tight spots such as a card's image corner. */
export const primaryLabel = (l: Listing, lang: Lang): Label => labelsFor(l, lang)[0];

// Controlled vocabularies shared by the import script and the site. Albanian first, English second.

export type Lang = 'sq' | 'en';
type Label = { sq: string; en: string };

export const DEAL: Record<'sale' | 'rent', Label> = {
  sale: { sq: 'Shitje', en: 'Sale' },
  rent: { sq: 'Qira', en: 'Rent' },
};

/** Title phrase used in generated headlines, e.g. "Banesë në shitje në …". */
export const DEAL_PHRASE: Record<'sale' | 'rent', Label> = {
  sale: { sq: 'në shitje', en: 'for sale' },
  rent: { sq: 'me qira', en: 'for rent' },
};

export const TYPE: Record<string, { sq: string; sqPlural: string; en: string; enPlural: string; slugSq: string; slugEn: string }> = {
  apartment: { sq: 'Banesë', sqPlural: 'Banesa', en: 'Apartment', enPlural: 'Apartments', slugSq: 'banese', slugEn: 'apartment' },
  duplex: { sq: 'Duplex', sqPlural: 'Duplex', en: 'Duplex', enPlural: 'Duplexes', slugSq: 'duplex', slugEn: 'duplex' },
  penthouse: { sq: 'Penthouse', sqPlural: 'Penthouse', en: 'Penthouse', enPlural: 'Penthouses', slugSq: 'penthouse', slugEn: 'penthouse' },
  house: { sq: 'Shtëpi', sqPlural: 'Shtëpi', en: 'House', enPlural: 'Houses', slugSq: 'shtepi', slugEn: 'house' },
  land: { sq: 'Tokë', sqPlural: 'Toka', en: 'Land', enPlural: 'Land', slugSq: 'toke', slugEn: 'land' },
  commercial: { sq: 'Lokal', sqPlural: 'Lokale', en: 'Commercial unit', enPlural: 'Commercial units', slugSq: 'lokal', slugEn: 'commercial-unit' },
  office: { sq: 'Zyrë', sqPlural: 'Zyre', en: 'Office', enPlural: 'Offices', slugSq: 'zyre', slugEn: 'office' },
  warehouse: { sq: 'Depo dhe showroom', sqPlural: 'Depo dhe showroom', en: 'Warehouse and showroom', enPlural: 'Warehouses', slugSq: 'depo', slugEn: 'warehouse' },
  building: { sq: 'Objekt afarist', sqPlural: 'Objekte afariste', en: 'Commercial building', enPlural: 'Commercial buildings', slugSq: 'objekt-afarist', slugEn: 'commercial-building' },
};

/** Browse categories on the home page and in filters. */
export const CATEGORY: Record<'apartments' | 'houses' | 'land' | 'commercial', { label: Label; types: string[] }> = {
  apartments: { label: { sq: 'Banesa', en: 'Apartments' }, types: ['apartment', 'duplex', 'penthouse'] },
  houses: { label: { sq: 'Shtëpi', en: 'Houses' }, types: ['house'] },
  land: { label: { sq: 'Toka', en: 'Land' }, types: ['land'] },
  commercial: { label: { sq: 'Lokale & zyre', en: 'Commercial & offices' }, types: ['commercial', 'office', 'warehouse', 'building'] },
};

export const FEATURE: Record<string, Label> = {
  'underfloor-heating': { sq: 'Ngrohje nën dysheme', en: 'Underfloor heating' },
  'heat-pump': { sq: 'Pompë termike', en: 'Heat pump' },
  'electric-heating': { sq: 'Ngrohje me energji elektrike', en: 'Electric heating' },
  'central-heating': { sq: 'Ngrohje qendrore', en: 'Central heating' },
  'air-conditioning': { sq: 'Klimë', en: 'Air conditioning' },
  elevator: { sq: 'Ashensor', en: 'Elevator' },
  'electric-shutters': { sq: 'Roleta elektrike', en: 'Electric shutters' },
  garage: { sq: 'Garazh', en: 'Garage' },
  parking: { sq: 'Parking', en: 'Parking' },
  furnished: { sq: 'E mobiluar', en: 'Furnished' },
  unfurnished: { sq: 'E pamobiluar', en: 'Unfurnished' },
  'security-24-7': { sq: 'Siguri 24/7', en: '24/7 security' },
  'gated-community': { sq: 'Lagje e mbyllur', en: 'Gated community' },
  playground: { sq: 'Hapësirë për fëmijë', en: 'Children’s play area' },
  'green-areas': { sq: 'Hapësira të gjelbëruara', en: 'Green areas' },
  'video-surveillance': { sq: 'Kamera sigurie', en: 'Security cameras' },
  basement: { sq: 'Podrum', en: 'Basement' },
  terrace: { sq: 'Tarracë', en: 'Terrace' },
  yard: { sq: 'Oborr', en: 'Yard' },
};

export const ORIENTATION: Record<string, Label> = {
  N: { sq: 'Veri', en: 'North' }, S: { sq: 'Jug', en: 'South' }, E: { sq: 'Lindje', en: 'East' }, W: { sq: 'Perëndim', en: 'West' },
  NE: { sq: 'Veri-lindje', en: 'North-east' }, NW: { sq: 'Veri-perëndim', en: 'North-west' },
  SE: { sq: 'Jug-lindje', en: 'South-east' }, SW: { sq: 'Jug-perëndim', en: 'South-west' },
  'E-W': { sq: 'Lindje dhe perëndim', en: 'East and west' }, 'N-S': { sq: 'Veri dhe jug', en: 'North and south' },
};

/** What a gallery image shows. Used for alt text. */
export const IMAGE_KIND: Record<string, Label> = {
  living: { sq: 'Qëndrimi ditor', en: 'Living room' },
  'living-kitchen': { sq: 'Qëndrimi ditor me kuzhinë', en: 'Living room with kitchen' },
  kitchen: { sq: 'Kuzhina', en: 'Kitchen' },
  dining: { sq: 'Tryezaria', en: 'Dining area' },
  bedroom: { sq: 'Dhoma e gjumit', en: 'Bedroom' },
  bathroom: { sq: 'Banjo', en: 'Bathroom' },
  hallway: { sq: 'Korridori', en: 'Hallway' },
  stairs: { sq: 'Shkallët', en: 'Staircase' },
  balcony: { sq: 'Ballkoni', en: 'Balcony' },
  terrace: { sq: 'Tarraca', en: 'Terrace' },
  view: { sq: 'Pamja', en: 'View' },
  exterior: { sq: 'Pamja e jashtme', en: 'Exterior' },
  building: { sq: 'Ndërtesa', en: 'Building' },
  entrance: { sq: 'Hyrja', en: 'Entrance' },
  yard: { sq: 'Oborri', en: 'Yard' },
  garage: { sq: 'Garazhi', en: 'Garage' },
  office: { sq: 'Hapësira e zyrës', en: 'Office space' },
  interior: { sq: 'Hapësira e brendshme', en: 'Interior space' },
  warehouse: { sq: 'Hapësira e depos', en: 'Warehouse space' },
  land: { sq: 'Toka', en: 'The land' },
  aerial: { sq: 'Pamje nga lart', en: 'Aerial view' },
  floorplan: { sq: 'Planimetria', en: 'Floor plan' },
  render: { sq: 'Vizualizim', en: 'Visualisation' },
  graphic: { sq: 'Grafikë e postimit', en: 'Listing graphic' },
  other: { sq: 'Fotografi e pronës', en: 'Property photo' },
};

const MONTHS: Record<string, string> = {
  janar: 'January', shkurt: 'February', mars: 'March', prill: 'April', maj: 'May', qershor: 'June',
  korrik: 'July', gusht: 'August', shtator: 'September', tetor: 'October', nentor: 'November', nëntor: 'November', dhjetor: 'December',
};
/** Translates the few completion phrasings used in the listings; returns null if unknown. */
export function completionEn(sq: string): string | null {
  const s = sq.trim().toLowerCase().replace(/\.$/, '');
  let m = s.match(/^(\p{L}+)\s+(\d{4})$/u);
  if (m && MONTHS[m[1]]) return `${MONTHS[m[1]]} ${m[2]}`;
  m = s.match(/^(?:ne\s+|në\s+)?fund t[eë] vitit (\d{4})$/);
  if (m) return `End of ${m[1]}`;
  m = s.match(/^gjat[eë] vitit (\d{4})$/);
  if (m) return `During ${m[1]}`;
  m = s.match(/^(\d{4})$/);
  if (m) return m[1];
  return null;
}

// Business facts and catalogue switches. Every value here comes from the company profile.

export const SITE = {
  name: 'Brikk Estates',
  url: 'https://www.brikkestates.com',
  phoneDisplay: '+383 45 66 77 05',
  phoneE164: '+38345667705',
  whatsapp: 'https://wa.me/38345667705',
  viber: 'viber://chat?number=%2B38345667705',
  emailInfo: 'info@brikkestates.com',
  emailProperties: 'properties@brikkestates.com',
  instagram: 'https://www.instagram.com/brikkestates/',
  instagramHandle: '@brikkestates',
} as const;

export const CATALOGUE = {
  /**
   * Availability of the Instagram archive is not confirmed. While true, listings with status "unconfirmed"
   * are shown (with the note "Availability is confirmed when you contact us"). Set to false to show only
   * listings the agency has marked "available" or "reserved" in data/listings/<REF>.json.
   */
  showUnconfirmed: true,
  /**
   * Sold / rented listings are excluded from the site. (None are marked in the source captions today.)
   * Documented choice: a sold archive adds little for buyers and risks stale claims.
   */
  showSoldOrRented: false,
} as const;

/** Robots: production builds are indexable; set BRIKK_NOINDEX=1 for staging or preview deployments. */
export const NOINDEX = ['1', 'true', 'yes'].includes(String(import.meta.env.BRIKK_NOINDEX ?? process.env.BRIKK_NOINDEX ?? '').toLowerCase());

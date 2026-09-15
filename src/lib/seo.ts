import { SITE } from '../config/site';
import type { Lang } from '../i18n';
import { dict } from '../i18n';
import type { Listing } from './listings';

/** Truthful agency data only: no address, opening hours or ratings (not confirmed by the client). */
export function agentJsonLd(lang: Lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${SITE.url}/#agency`,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/apple-touch-icon.png`,
    image: `${SITE.url}/og-default.jpg`,
    telephone: SITE.phoneE164,
    email: SITE.emailInfo,
    description: dict(lang).meta.homeDescription,
    areaServed: [
      { '@type': 'City', name: 'Prishtina' },
      { '@type': 'City', name: 'Fushë Kosovë' },
    ],
    sameAs: [SITE.instagram],
    inLanguage: lang,
  };
}

export function listingJsonLd(l: Listing, lang: Lang, url: string, imageUrl: string, name: string, description: string) {
  const offerPrice = l.deal === 'rent' ? l.rentMonthly : l.price;
  const floorSize = l.areaNet !== null ? { '@type': 'QuantitativeValue', value: l.areaNet, unitCode: 'MTK' } : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name,
    description,
    url,
    image: imageUrl,
    datePosted: l.postedAt,
    inLanguage: lang,
    identifier: l.ref,
    provider: { '@id': `${SITE.url}/#agency` },
    ...(offerPrice !== null
      ? {
          offers: {
            '@type': 'Offer',
            price: offerPrice,
            priceCurrency: 'EUR',
            businessFunction: l.deal === 'rent' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
            ...(l.deal === 'rent' ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: offerPrice, priceCurrency: 'EUR', unitCode: 'MON' } } : {}),
          },
        }
      : {}),
    ...(l.city || l.neighbourhood
      ? {
          contentLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              ...(l.city ? { addressLocality: lang === 'en' ? l.cityEn : l.city } : {}),
              ...(l.neighbourhood ? { streetAddress: [l.street, l.neighbourhood].filter(Boolean).join(', ') } : l.street ? { streetAddress: l.street } : {}),
              ...(l.country ? { addressCountry: l.country } : {}),
            },
          },
        }
      : {}),
    ...(floorSize ? { about: { '@type': 'Accommodation', floorSize, ...(l.bedrooms !== null ? { numberOfBedrooms: l.bedrooms } : {}), ...(l.bathrooms !== null ? { numberOfBathroomsTotal: l.bathrooms } : {}) } } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}

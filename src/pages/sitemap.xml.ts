// Both languages, with hreflang alternates on every entry.
import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
import { LANGS, ROUTES, listingPath, type Lang, type PageKey } from '../i18n';
import { getVisibleListings } from '../lib/listings';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async () => {
  const listings = await getVisibleListings();

  /** One <url> per language, each carrying the full set of alternates. */
  const entry = (paths: Record<Lang, string>, lastmod?: string) =>
    LANGS.map((lang) => {
      const alts = LANGS.map(
        (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(new URL(paths[l], SITE.url).href)}"/>`,
      ).join('\n');
      return [
        '  <url>',
        `    <loc>${esc(new URL(paths[lang], SITE.url).href)}</loc>`,
        alts,
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(new URL(paths.sq, SITE.url).href)}"/>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    }).join('\n');

  const pages = (Object.keys(ROUTES) as PageKey[]).map((key) => entry(ROUTES[key]));
  const details = listings.map((l) =>
    entry({ sq: listingPath(l, 'sq'), en: listingPath(l, 'en') }, l.postedAt),
  );

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...pages,
    ...details,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

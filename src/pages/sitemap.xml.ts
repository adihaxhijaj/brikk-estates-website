import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
import { ROUTES, listingPath } from '../i18n';
import { getVisibleListings } from '../lib/listings';

export const GET: APIRoute = async () => {
  const listings = await getVisibleListings();
  const pairs: { sq: string; en: string; lastmod?: string }[] = [
    ...Object.values(ROUTES).map((r) => ({ sq: r.sq, en: r.en })),
    ...listings.map((l) => ({ sq: listingPath(l, 'sq'), en: listingPath(l, 'en'), lastmod: l.postedAt })),
  ];
  const abs = (p: string) => new URL(p, SITE.url).href;
  const urls = pairs.flatMap((p) =>
    (['sq', 'en'] as const).map(
      (lang) => `  <url>
    <loc>${abs(p[lang])}</loc>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ''}
    <xhtml:link rel="alternate" hreflang="sq" href="${abs(p.sq)}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${abs(p.en)}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(p.sq)}"/>
  </url>`,
    ),
  );
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

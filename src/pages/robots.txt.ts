// Production is indexable. Staging/preview builds set BRIKK_NOINDEX=1 (see README), which
// disallows everything here and adds a noindex meta tag, without affecting the production domain.
import type { APIRoute } from 'astro';
import { SITE, NOINDEX } from '../config/site';

export const GET: APIRoute = () => {
  const body = NOINDEX
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', SITE.url).href}\n`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

import type { APIRoute } from 'astro';
import { SITE, NOINDEX } from '../config/site';

// Staging/preview builds (BRIKK_NOINDEX=1) disallow everything; production allows crawling and lists the sitemap.
export const GET: APIRoute = () => {
  const body = NOINDEX
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

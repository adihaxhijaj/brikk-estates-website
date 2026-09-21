// Stable URL for the horizontal lockup, referenced by the RealEstateAgent JSON-LD.
// Drawn from the same official artwork as the Logo component.
import type { APIRoute } from 'astro';
import parts from '../assets/brand/logo-parts.json';

export const GET: APIRoute = () => {
  const lock = parts.lockup as { viewBox: number[]; symbol: string[]; wordmark: string[] };
  const group = (paths: string[], fill: string) =>
    `<g fill="${fill}">${paths.map((d) => `<path d="${d}"/>`).join('')}</g>`;

  // Brand green throughout, so the mark reads on the light grounds crawlers composite onto.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${lock.viewBox.join(' ')}" role="img" aria-label="Brikk Estates">` +
    group(lock.symbol, parts.colours.green) +
    group(lock.wordmark, parts.colours.green) +
    `</svg>`;

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};

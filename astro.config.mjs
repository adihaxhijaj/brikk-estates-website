// @ts-check
import { defineConfig } from 'astro/config';

// Production domain. Staging/preview builds set BRIKK_NOINDEX=1 (see README) so they are never indexed.
export default defineConfig({
  site: 'https://www.brikkestates.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  image: {
    // Listing photos are pre-sized to <= 2000px by the import script; derivatives are generated here.
    layout: 'constrained',
  },
  prefetch: false,
  devToolbar: { enabled: false },
});

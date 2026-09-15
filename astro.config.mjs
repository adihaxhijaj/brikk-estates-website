// @ts-check
import { defineConfig } from 'astro/config';

// Production domain. Staging/preview builds set BRIKK_NOINDEX=1 (see README) so they are never indexed.
export default defineConfig({
  site: 'https://www.brikkestates.com',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  // 'class' lets a parent's scoped styles reach the root element of child components it passes a class to.
  scopedStyleStrategy: 'class',
  prefetch: false,
  devToolbar: { enabled: false },
});

// Staging/preview build: identical to production but marked noindex (meta robots + robots.txt Disallow).
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['astro', 'build'], { stdio: 'inherit', shell: true, env: { ...process.env, BRIKK_NOINDEX: '1' } });
process.exit(result.status ?? 1);

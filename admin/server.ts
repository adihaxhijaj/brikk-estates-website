// Brikk Estates office admin app.
//
//   npm run admin        → http://<this computer's IP>:4400 on the office network
//
// The team adds or edits listings in the browser. Every save writes data/manual/<REF>/ (or the status of an
// Instagram listing in data/listings/<REF>.json), then publishes: import → build → deploy to Vercel.
// No database: listings are files in this project, exactly like the Instagram archive.
import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { loadConfig, checkPassword, type Config } from './config.ts';
import { validateManual, readManualListings, MANUAL_DIR, STATUSES, TYPES } from '../scripts/lib/manual-listings.ts';
import { CITIES, NEIGHBOURHOODS } from '../scripts/lib/parse-listing.ts';
import { TYPE, FEATURE, IMAGE_KIND } from '../src/i18n/vocab.ts';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'admin', 'public');
const CONTENT = path.join(ROOT, 'src', 'content', 'listings');
const ASSETS = path.join(ROOT, 'src', 'assets', 'listings');
const ANNOTATIONS = path.join(ROOT, 'data', 'listings');
const DELETED = path.join(ROOT, 'data', 'manual-deleted');
const SESSIONS_FILE = path.join(ROOT, 'admin', 'sessions.json');
const INSTAGRAM_CSV = path.resolve(ROOT, '..', 'instagram', 'index.csv');
const SESSION_DAYS = 30;
const MAX_BODY = 200 * 1024 * 1024;

let config: Config = loadConfig();

// ---------------------------------------------------------------------------
// Sessions and login throttling
// ---------------------------------------------------------------------------
type Session = { user: string; expires: number };
const sessions = new Map<string, Session>();
try {
  for (const [k, v] of Object.entries(JSON.parse(await fs.readFile(SESSIONS_FILE, 'utf8')) as Record<string, Session>)) if (v.expires > Date.now()) sessions.set(k, v);
} catch { /* first run */ }
const persistSessions = () => fs.writeFile(SESSIONS_FILE, JSON.stringify(Object.fromEntries(sessions))).catch(() => {});

const failedLogins = new Map<string, number[]>();
const recent = (list: number[] = []) => list.filter((t) => t > Date.now() - 10 * 60_000);
// Per visitor: 8 wrong passwords per 10 minutes. All visitors together: 40, which stops guessing from many addresses.
const tooManyAttempts = (ip: string) => recent(failedLogins.get(ip)).length >= 8 || [...failedLogins.values()].reduce((n, l) => n + recent(l).length, 0) >= 40;

function sessionOf(req: http.IncomingMessage): Session | null {
  const token = /(?:^|;\s*)brikk_admin=([a-f0-9]{64})/.exec(req.headers.cookie ?? '')?.[1];
  const s = token ? sessions.get(token) : undefined;
  if (!s || s.expires < Date.now()) return null;
  // A removed user loses access immediately (users are re-read, so `npm run admin:user -- remove` works without a restart).
  config = loadConfig();
  if (!config.users.some((u) => u.name === s.user)) return null;
  return s;
}

// ---------------------------------------------------------------------------
// Publishing queue: one run at a time; saves made during a run trigger one more run afterwards.
// ---------------------------------------------------------------------------
const job = {
  running: false,
  pending: false,
  step: '' as string,
  startedAt: null as string | null,
  finishedAt: null as string | null,
  ok: null as boolean | null,
  error: null as string | null,
  requestedBy: [] as string[],
  log: [] as string[],
};
const addLog = (line: string) => {
  for (const l of line.split(/\r?\n/)) if (l.trim()) job.log.push(l.replace(/\x1b\[[0-9;]*m/g, ''));
  if (job.log.length > 600) job.log.splice(0, job.log.length - 600);
};

function run(label: string, command: string) {
  job.step = label;
  addLog(`\n▶ ${label}\n$ ${command}`);
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, { cwd: ROOT, shell: true, env: { ...process.env, FORCE_COLOR: '0' } });
    child.stdout.on('data', (d) => addLog(String(d)));
    child.stderr.on('data', (d) => addLog(String(d)));
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${label} failed (exit code ${code})`))));
  });
}

function requestPublish(user: string) {
  if (!job.requestedBy.includes(user)) job.requestedBy.push(user);
  job.pending = true;
  if (!job.running) void publishLoop();
}

async function publishLoop() {
  job.running = true;
  while (job.pending) {
    job.pending = false;
    job.log = [];
    job.ok = null;
    job.error = null;
    job.startedAt = new Date().toISOString();
    job.finishedAt = null;
    try {
      await run('Preparing listings', 'npm run import');
      if (config.deploy === 'vercel') {
        if (!existsSync(path.join(ROOT, '.vercel', 'project.json'))) {
          throw new Error('This computer is not linked to the Vercel project yet. See "Admin app → first-time setup" in README.md.');
        }
        await run('Building the website', 'npx --yes vercel build --prod');
        await run('Uploading to brikkestates.com', 'npx --yes vercel deploy --prebuilt --prod');
      } else {
        await run('Building the website (test mode, not uploaded)', 'npm run build');
      }
      job.ok = true;
      addLog('\n✔ Done.');
    } catch (e) {
      job.ok = false;
      job.error = e instanceof Error ? e.message : String(e);
      addLog(`\n✖ ${job.error}`);
      job.pending = false; // don't loop on a failure; the next save or "Try again" retries
    }
    job.finishedAt = new Date().toISOString();
    job.step = '';
    if (!job.pending) job.requestedBy = [];
  }
  job.running = false;
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------
const REF_RE = /^B\d{3}$/;
const today = () => new Date().toISOString().slice(0, 10);

async function nextRef() {
  const nums: number[] = [];
  const collect = (s: string) => { const m = /b(\d{3})/i.exec(s); if (m) nums.push(Number(m[1])); };
  for (const dir of [CONTENT, ANNOTATIONS, MANUAL_DIR]) if (existsSync(dir)) (await fs.readdir(dir)).forEach(collect);
  if (existsSync(INSTAGRAM_CSV)) for (const m of (await fs.readFile(INSTAGRAM_CSV, 'utf8')).matchAll(/,B(\d{3}),/g)) nums.push(Number(m[1]));
  return `B${String(Math.max(300, ...nums) + 1).padStart(3, '0')}`;
}

async function refTaken(ref: string) {
  if (existsSync(path.join(MANUAL_DIR, ref))) return true;
  if (existsSync(path.join(ANNOTATIONS, `${ref}.json`))) return true;
  if (existsSync(INSTAGRAM_CSV) && (await fs.readFile(INSTAGRAM_CSV, 'utf8')).includes(`,${ref},`)) return true;
  return false;
}

async function listAll() {
  const manual = new Map((await readManualListings()).map((m) => [m.ref, m]));
  const rows: any[] = [];
  const seen = new Set<string>();
  if (existsSync(CONTENT)) {
    for (const f of await fs.readdir(CONTENT)) {
      if (!f.endsWith('.json')) continue;
      const e = JSON.parse(await fs.readFile(path.join(CONTENT, f), 'utf8'));
      const m = manual.get(e.ref);
      seen.add(e.ref);
      rows.push({
        ref: e.ref, source: m ? 'admin' : 'instagram', title: m ? null : e.titleSq, titleSq: e.titleSq,
        deal: m?.deal ?? e.deal, type: m?.type ?? e.type, city: m ? m.city : e.city, postedAt: m?.postedAt ?? e.postedAt,
        price: m ? m.price : e.price, rentMonthly: m ? m.rentMonthly : e.rentMonthly,
        status: m?.status ?? e.status, hidden: m?.hidden ?? e.hidden,
        cover: m ? `/api/photos/${m.ref}/${m.photos[0]?.file}` : `/api/thumb/${e.ref}`,
        slugSq: e.slugSq, updatedAt: m?.updatedAt ?? null, createdBy: m?.createdBy ?? null, notOnSiteYet: false,
      });
    }
  }
  for (const m of manual.values()) {
    if (seen.has(m.ref)) continue;
    rows.push({
      ref: m.ref, source: 'admin', titleSq: null, deal: m.deal, type: m.type, city: m.city, postedAt: m.postedAt, price: m.price, rentMonthly: m.rentMonthly,
      status: m.status, hidden: m.hidden, cover: m.photos[0] ? `/api/photos/${m.ref}/${m.photos[0].file}` : null,
      slugSq: null, updatedAt: m.updatedAt ?? null, createdBy: m.createdBy ?? null, notOnSiteYet: true,
    });
  }
  return rows.sort((a, b) => b.postedAt.localeCompare(a.postedAt) || b.ref.localeCompare(a.ref));
}

async function backup() {
  if (!config.backupDir) return;
  try {
    await fs.mkdir(config.backupDir, { recursive: true });
    for (const [from, name] of [[MANUAL_DIR, 'manual'], [ANNOTATIONS, 'listings'], [DELETED, 'manual-deleted']] as const) {
      if (existsSync(from)) await fs.cp(from, path.join(config.backupDir, name), { recursive: true, force: true });
    }
    await fs.writeFile(path.join(config.backupDir, 'last-backup.txt'), new Date().toString() + '\n');
  } catch (e) {
    console.error('Backup failed:', e);
  }
}

async function saveListing(body: any, user: string) {
  const isNew = body?.isNew === true;
  const input = body?.listing ?? {};
  const ref = String(input.ref ?? '').toUpperCase();
  if (!REF_RE.test(ref)) return { status: 400, data: { problems: ['Ref must look like B398.'] } };
  const dir = path.join(MANUAL_DIR, ref);
  const photosDir = path.join(dir, 'photos');
  const listingFile = path.join(dir, 'listing.json');

  let previous: any = null;
  if (isNew) {
    if (await refTaken(ref)) return { status: 409, data: { problems: [`Ref ${ref} is already used. Use ${await nextRef()}.`] } };
  } else {
    if (!existsSync(listingFile)) return { status: 404, data: { problems: [`Listing ${ref} not found.`] } };
    previous = JSON.parse(await fs.readFile(listingFile, 'utf8'));
  }

  // Photos: existing ones are referenced by file name; new ones arrive as JPEG data URLs.
  const incoming: any[] = Array.isArray(input.photos) ? input.photos : [];
  const newFiles: { file: string; data: Buffer }[] = [];
  const photos = [];
  for (const p of incoming) {
    const kind = IMAGE_KIND[p?.kind] ? p.kind : 'other';
    if (typeof p?.data === 'string') {
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(p.data);
      if (!m) return { status: 400, data: { problems: ['A photo could not be read. Try adding it again.'] } };
      const data = Buffer.from(m[1], 'base64');
      try { await sharp(data).metadata(); } catch { return { status: 400, data: { problems: ['A photo is not a valid image.'] } }; }
      const file = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.jpg`;
      newFiles.push({ file, data });
      photos.push({ file, kind });
    } else if (typeof p?.file === 'string' && /^[\w-]+\.jpg$/.test(p.file) && existsSync(path.join(photosDir, p.file))) {
      photos.push({ file: p.file, kind });
    }
  }

  const { listing, problems } = validateManual({
    ...input,
    ref,
    photos,
    createdBy: previous?.createdBy ?? user,
    postedAt: previous?.postedAt ?? input.postedAt ?? today(),
    updatedAt: new Date().toISOString(),
  });
  if (problems.length) return { status: 400, data: { problems } };

  await fs.mkdir(photosDir, { recursive: true });
  for (const f of newFiles) await fs.writeFile(path.join(photosDir, f.file), f.data);
  await fs.writeFile(listingFile, JSON.stringify({ ...listing, updatedBy: user }, null, 2) + '\n');
  // Photos removed in the form are moved aside, not destroyed.
  const keep = new Set(listing.photos.map((p) => p.file));
  for (const f of await fs.readdir(photosDir)) {
    if (!keep.has(f)) {
      await fs.mkdir(path.join(DELETED, ref, 'photos'), { recursive: true });
      await fs.rename(path.join(photosDir, f), path.join(DELETED, ref, 'photos', f));
    }
  }
  await backup();
  requestPublish(user);
  return { status: 200, data: { ok: true, ref } };
}

async function setStatus(ref: string, body: any, user: string) {
  const status = STATUSES.includes(body?.status) ? body.status : null;
  const hidden = typeof body?.hidden === 'boolean' ? body.hidden : null;
  if (!status && hidden === null) return { status: 400, data: { problems: ['Nothing to change.'] } };
  const manualFile = path.join(MANUAL_DIR, ref, 'listing.json');
  if (existsSync(manualFile)) {
    const m = JSON.parse(await fs.readFile(manualFile, 'utf8'));
    if (status) m.status = status;
    if (hidden !== null) m.hidden = hidden;
    m.updatedAt = new Date().toISOString();
    m.updatedBy = user;
    await fs.writeFile(manualFile, JSON.stringify(m, null, 2) + '\n');
  } else if (existsSync(path.join(CONTENT, `${ref.toLowerCase()}.json`))) {
    // Instagram listing: status lives in its annotation file.
    // Edited in place so the hand-formatted annotation keeps its layout.
    const file = path.join(ANNOTATIONS, `${ref}.json`);
    let text = existsSync(file) ? await fs.readFile(file, 'utf8') : `{\n  "ref": "${ref}"\n}\n`;
    const setKey = (key: string, value: unknown) => {
      const re = new RegExp(`("${key}"\\s*:\\s*)("[^"]*"|true|false|null)`);
      text = re.test(text) ? text.replace(re, `$1${JSON.stringify(value)}`) : text.replace(/("ref"\s*:\s*"B\d{3}")/, `$1, "${key}": ${JSON.stringify(value)}`);
    };
    if (status) setKey('status', status);
    if (hidden !== null) setKey('hidden', hidden);
    JSON.parse(text); // never write a broken file
    await fs.writeFile(file, text);
  } else {
    return { status: 404, data: { problems: [`Listing ${ref} not found.`] } };
  }
  await backup();
  requestPublish(user);
  return { status: 200, data: { ok: true } };
}

async function removeListing(ref: string, user: string) {
  const dir = path.join(MANUAL_DIR, ref);
  if (!existsSync(dir)) return { status: 404, data: { problems: ['Only listings added in this app can be removed. Hide Instagram listings instead.'] } };
  await fs.mkdir(DELETED, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fs.rename(dir, path.join(DELETED, `${ref}-${stamp}`));
  await backup();
  requestPublish(user);
  return { status: 200, data: { ok: true } };
}

const thumbCache = new Map<string, Buffer>();
async function thumb(ref: string) {
  if (thumbCache.has(ref)) return thumbCache.get(ref)!;
  const file = path.join(CONTENT, `${ref.toLowerCase()}.json`);
  if (!existsSync(file)) return null;
  const e = JSON.parse(await fs.readFile(file, 'utf8'));
  const cover = e.images?.[e.coverIndex ?? 0];
  if (!cover) return null;
  const src = path.join(ASSETS, ref.toLowerCase(), cover.file.replace(/\.jpeg$/i, '.jpg'));
  if (!existsSync(src)) return null;
  const buf = await sharp(src).resize(360, 270, { fit: 'cover' }).jpeg({ quality: 72 }).toBuffer();
  thumbCache.set(ref, buf);
  return buf;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };

function send(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

async function serveFile(res: http.ServerResponse, file: string, cache = 'no-cache') {
  if (!existsSync(file) || !(await fs.stat(file)).isFile()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': cache });
  createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://admin');
  const p = url.pathname;
  // Behind Cloudflare Tunnel every request arrives from this computer; the real visitor is in CF-Connecting-IP.
  const local = /^(::1$|127\.|::ffff:127\.)/.test(req.socket.remoteAddress ?? '');
  const ip = (local && typeof req.headers['cf-connecting-ip'] === 'string' ? req.headers['cf-connecting-ip'] : req.socket.remoteAddress) ?? '';
  const secure = local && req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');

  try {
    // Static app shell (no data inside; data needs a session).
    if (req.method === 'GET' && !p.startsWith('/api/')) {
      if (p === '/' || p === '/index.html') return serveFile(res, path.join(PUBLIC, 'index.html'));
      if (/^\/(app\.js|app\.css)$/.test(p)) return serveFile(res, path.join(PUBLIC, p.slice(1)));
      if (p === '/favicon.svg') return serveFile(res, path.join(ROOT, 'public', 'favicon.svg'), 'max-age=86400');
      if (/^\/fonts\/[\w.-]+\.woff2$/.test(p)) return serveFile(res, path.join(ROOT, 'public', p.slice(1)), 'max-age=31536000');
      res.writeHead(404).end('Not found');
      return;
    }

    // State-changing requests must be same-origin JSON calls from the app (blocks cross-site form posts).
    if (req.method !== 'GET' && req.headers['x-brikk-admin'] !== '1') return send(res, 403, { problems: ['Forbidden'] });

    if (p === '/api/login' && req.method === 'POST') {
      if (tooManyAttempts(ip)) return send(res, 429, { problems: ['Too many wrong attempts. Wait 10 minutes.'] });
      const body = await readBody(req);
      config = loadConfig();
      const user = config.users.find((u) => u.name.toLowerCase() === String(body?.name ?? '').trim().toLowerCase());
      if (!user || !checkPassword(user, String(body?.password ?? ''))) {
        failedLogins.set(ip, [...(failedLogins.get(ip) ?? []), Date.now()]);
        return send(res, 401, { problems: ['Wrong name or password.'] });
      }
      failedLogins.delete(ip);
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, { user: user.name, expires: Date.now() + SESSION_DAYS * 864e5 });
      void persistSessions();
      res.setHeader('Set-Cookie', `brikk_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure}`);
      return send(res, 200, { user: user.name });
    }

    const session = sessionOf(req);
    if (!session) return send(res, 401, { problems: ['Please log in.'] });

    if (p === '/api/logout' && req.method === 'POST') {
      for (const [k, v] of sessions) if (v === session) sessions.delete(k);
      void persistSessions();
      res.setHeader('Set-Cookie', `brikk_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
      return send(res, 200, { ok: true });
    }
    if (p === '/api/session') return send(res, 200, { user: session.user, deploy: config.deploy });
    if (p === '/api/meta') {
      return send(res, 200, {
        nextRef: await nextRef(),
        types: TYPES.map((t) => ({ value: t, label: TYPE[t].en, labelSq: TYPE[t].sq })),
        cities: CITIES.map((c) => ({ value: c.name, label: c.en, country: c.country })),
        neighbourhoods: NEIGHBOURHOODS.map((n) => ({ value: n.name, city: n.city })),
        features: Object.entries(FEATURE).map(([value, l]) => ({ value, label: l.en, labelSq: l.sq })),
        imageKinds: Object.entries(IMAGE_KIND).map(([value, l]) => ({ value, label: l.en })),
        statuses: STATUSES,
      });
    }
    if (p === '/api/listings' && req.method === 'GET') return send(res, 200, { listings: await listAll() });
    if (p === '/api/listings' && req.method === 'POST') {
      const r = await saveListing(await readBody(req), session.user);
      return send(res, r.status, r.data);
    }

    let m = /^\/api\/listings\/(B\d{3})$/.exec(p);
    if (m && req.method === 'GET') {
      const file = path.join(MANUAL_DIR, m[1], 'listing.json');
      if (!existsSync(file)) return send(res, 404, { problems: ['Only listings added in this app can be edited here.'] });
      return send(res, 200, { listing: JSON.parse(await fs.readFile(file, 'utf8')) });
    }
    if (m && req.method === 'DELETE') {
      const r = await removeListing(m[1], session.user);
      return send(res, r.status, r.data);
    }
    m = /^\/api\/listings\/(B\d{3})\/status$/.exec(p);
    if (m && req.method === 'POST') {
      const r = await setStatus(m[1], await readBody(req), session.user);
      return send(res, r.status, r.data);
    }
    m = /^\/api\/photos\/(B\d{3})\/([\w-]+\.jpg)$/.exec(p);
    if (m) return serveFile(res, path.join(MANUAL_DIR, m[1], 'photos', m[2]), 'private, max-age=86400');
    m = /^\/api\/thumb\/(B\d{3})$/.exec(p);
    if (m) {
      const buf = await thumb(m[1]);
      if (!buf) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' });
      res.end(buf);
      return;
    }
    if (p === '/api/publish' && req.method === 'GET') {
      return send(res, 200, { ...job, log: job.log.slice(-200) });
    }
    if (p === '/api/publish' && req.method === 'POST') {
      requestPublish(session.user);
      return send(res, 200, { ok: true });
    }
    send(res, 404, { problems: ['Not found'] });
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, 500, { problems: [e instanceof Error && e.message === 'too large' ? 'Upload too large. Add fewer photos at once.' : 'Something went wrong. Check the admin window on the office computer.'] });
  }
});

server.listen(config.port, '0.0.0.0', () => {
  const addresses = Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => `http://${a!.address}:${config.port}`);
  console.log('\n  Brikk Estates admin is running.\n');
  console.log(`  On this computer:   http://localhost:${config.port}`);
  for (const a of addresses) console.log(`  On the office Wi-Fi: ${a}`);
  console.log(`\n  Publishing mode: ${config.deploy === 'vercel' ? 'build + upload to Vercel' : 'build only (TEST MODE, nothing is uploaded)'}`);
  if (!config.users.length) console.log('\n  ⚠ No logins yet. Add one:  npm run admin:user -- add <name> <password>');
  if (!config.backupDir) console.log('  ⚠ Backups are off. Set "backupDir" in admin/config.json.');
  console.log('\n  Keep this window open. Close it to stop the admin app.\n');
});

// Admin app settings: admin/config.json (not in git — it holds password hashes).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const CONFIG_FILE = path.join(process.cwd(), 'admin', 'config.json');

export interface User { name: string; salt: string; hash: string }
export interface Config {
  /** Port the admin app listens on (office network). */
  port: number;
  /** "vercel": build and deploy with the Vercel CLI. "build-only": build locally, no upload (for testing). */
  deploy: 'vercel' | 'build-only';
  /** Folder that receives a copy of all listing data after every save, e.g. a Google Drive or USB folder. Empty = off. */
  backupDir: string;
  users: User[];
}

const DEFAULTS: Config = { port: 4400, deploy: 'vercel', backupDir: '', users: [] };

export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_FILE)) return structuredClone(DEFAULTS);
  return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
}

export function saveConfig(c: Config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2) + '\n');
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

export function checkPassword(user: User, password: string) {
  const a = Buffer.from(hashPassword(password, user.salt).hash, 'hex');
  const b = Buffer.from(user.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

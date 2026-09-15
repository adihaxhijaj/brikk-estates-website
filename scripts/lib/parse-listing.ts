// Conservative field extraction from Brikk Estates Instagram captions (Albanian).
// Rule: when a phrase is ambiguous, the field stays null. The verbatim description is always published.
import { fold, parseArea, parseCount, parseMoney, parseOrdinal, normalise } from './text.ts';

export type Deal = 'sale' | 'rent';
export type PropertyType = 'apartment' | 'duplex' | 'penthouse' | 'house' | 'land' | 'commercial' | 'office' | 'warehouse' | 'building';

// ---------------------------------------------------------------------------
// 1. description.txt structure
// ---------------------------------------------------------------------------
export interface DescriptionFile {
  header: Record<string, string>;
  primary: string;
  secondary: { url: string; text: string }[];
}

export function splitDescriptionFile(raw: string): DescriptionFile {
  const text = raw.replace(/\r\n?/g, '\n');
  const sep = /\n={20,}\n/;
  const [headerBlock, ...rest] = text.split(sep);
  const header: Record<string, string> = {};
  for (const line of headerBlock.split('\n')) {
    const m = line.match(/^([^:]+?):\s?(.*)$/);
    if (m) header[m[1].trim()] = m[2].trim();
  }
  const primary = (rest[0] ?? '').trim();
  const secondary = rest.slice(1).map((block) => {
    const m = block.match(/^\s*Përshkrimi nga postimi tjetër \/ Caption from (\S+?):?\n/);
    return { url: m ? m[1].replace(/:$/, '') : '', text: m ? block.slice(m[0].length).trim() : block.trim() };
  });
  return { header, primary, secondary };
}

// ---------------------------------------------------------------------------
// 2. Cleaning: remove repeated contact footer, ID/Ref lines, hashtags, duplicated blocks
// ---------------------------------------------------------------------------
const CONTACT_LINE = [
  /^[📞📧✉️🌐☎️\s]*[📞📧✉🌐☎]/u,
  /^\+?[\d\s()]{9,}$/,
  /^(\+383|045)[\d\s()]*$/,
  /^[\w.]*@brikkestates\.com$/i,
  /^(www\.)?brikkestates\.com$/i,
  /^Brikk Estates$/i,
  /^Viber\s*&\s*WhatsApp:/i,
  /^Kontakti:/i,
  /^Për më shumë informata/i,
  /^Na kontaktoni sot per nje investim/i,
  /^#\w/,
];
const REF_LINE = /^(ID|Ref|ID e prones)\s*[:.]?\s*B?\d{3}\.?\s*$/i;
export const AI_NOTE = /^Shënim:\s*Ky imazh është gjeneruar me inteligjencë artificiale/i;

export interface CleanResult { paragraphs: string[]; aiDisclaimer: string | null; removed: string[] }

export function cleanCaption(text: string, title: string | null): CleanResult {
  const removed: string[] = [];
  let aiDisclaimer: string | null = null;
  const blocks = text.split(/\n\s*\n/).map((b) => b.split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').trim()).filter(Boolean);

  // Drop an exact repetition of the caption (seen in B384/B385 where the text was pasted twice).
  let unique = blocks;
  for (let k = 1; k < blocks.length; k++) {
    if (blocks[k] === blocks[0] && blocks.slice(k).every((b, i) => i >= k || b === blocks[i] || AI_NOTE.test(b))) {
      removed.push(...blocks.slice(k).filter((b) => !AI_NOTE.test(b)).map((b) => `[duplicate] ${b.slice(0, 40)}…`));
      unique = [...blocks.slice(0, k), ...blocks.slice(k).filter((b) => AI_NOTE.test(b))];
      break;
    }
  }

  const paragraphs: string[] = [];
  unique.forEach((block, bi) => {
    if (AI_NOTE.test(block)) { aiDisclaimer = normalise(block); return; }
    const lines = block.split('\n').filter((line) => {
      const l = line.trim();
      if (!l) return false;
      if (REF_LINE.test(l) || CONTACT_LINE.some((re) => re.test(l))) { removed.push(l); return false; }
      return true;
    });
    if (!lines.length) return;
    const joined = lines.join('\n');
    // Short 2026-style headline equal to the title adds nothing to the body.
    if (bi === 0 && title && normalise(joined) === normalise(title) && !/[.!]$/.test(joined.trim()) && !/^Ofroh/i.test(joined)) {
      removed.push(`[headline] ${joined}`);
      return;
    }
    paragraphs.push(joined);
  });
  return { paragraphs, aiDisclaimer, removed };
}

// ---------------------------------------------------------------------------
// 3. Gazetteers (canonical spellings of places that appear in the listings)
// ---------------------------------------------------------------------------
// `city` on neighbourhoods and streets comes from the company profile §5 ("Where they operate"), used only when a caption omits the city.
export interface Place { name: string; loc: string; en: string; country?: 'XK' | 'ME' | 'AL'; city?: string; re: RegExp }
export const PROFILE_STREET_CITY: { re: RegExp; city: string }[] = [
  { re: /^Rruga (Dardania|Hysen Xhakolli|Hajrullah Zymi|Pajazit Islami|Tahir Zemaj|Gjergj Fishta|Nene Tereza|Nena Tereze|Hamdi Grajqevci)\b/, city: 'Fushë Kosovë' },
];
export const CITIES: Place[] = [
  { name: 'Fushë Kosovë', loc: 'Fushë Kosovë', en: 'Fushë Kosovë', country: 'XK', re: /Fushe Kosov(e|es|a)\b/ },
  { name: 'Prishtinë', loc: 'Prishtinë', en: 'Prishtina', country: 'XK', re: /Prishtin(e|es|a|en)\b/ },
  { name: 'Obiliq', loc: 'Obiliq', en: 'Obiliq', country: 'XK', re: /Obiliq\b/ },
  { name: 'Lipjan', loc: 'Lipjan', en: 'Lipjan', country: 'XK', re: /Lipjan(it)?\b/ },
  { name: 'Ulqin', loc: 'Ulqin', en: 'Ulcinj', country: 'ME', re: /Ulqin\b/ },
  { name: 'Tale', loc: 'Tale', en: 'Tale', country: 'AL', re: /\bTale(s)?\b/ },
];
export const NEIGHBOURHOODS: Place[] = [
  { name: 'Pejton', city: 'Prishtinë', loc: 'Pejton', en: 'Pejton', re: /\bPejton\b/ },
  { name: 'Mati 1', city: 'Prishtinë', loc: 'Mati 1', en: 'Mati 1', re: /\bMati 1\b/ },
  { name: 'Lakrishte', city: 'Prishtinë', loc: 'Lakrishte', en: 'Lakrishte', re: /\bLakrisht(e|a)\b/ },
  { name: 'Bregu i Diellit', city: 'Prishtinë', loc: 'Bregun e Diellit', en: 'Bregu i Diellit', re: /\bBreg(u|un) (i|e) Diellit\b/ },
  { name: 'Prishtina e Re', city: 'Prishtinë', loc: 'Prishtinën e Re', en: 'Prishtina e Re', re: /\bPrishtin(a|en) e Re\b/ },
  { name: 'Lagjja e Spitalit', city: 'Prishtinë', loc: 'Lagjen e Spitalit', en: 'Lagjja e Spitalit', re: /\bLagj(ja|en|es) e Spitalit\b/ },
  { name: 'Aktash', city: 'Prishtinë', loc: 'Aktash', en: 'Aktash', re: /\bAktash(it)?\b/ },
  { name: 'Taslixhe', city: 'Prishtinë', loc: 'Taslixhe', en: 'Taslixhe', re: /\bTaslixhe\b/ },
  { name: 'Arbëria', city: 'Prishtinë', loc: 'Lagjen Arbëria', en: 'Arbëria', re: /\bLagj(ja|en|es) Arberi/ },
  { name: 'Lagjja Ndërkombëtare', city: 'Prishtinë', loc: 'Lagjen Ndërkombëtare', en: 'Lagjja Ndërkombëtare', re: /\bLagj(ja|en|es) Nderkombetare\b/ },
  { name: 'Zona Industriale', city: 'Prishtinë', loc: 'Zonën Industriale', en: 'Zona Industriale', re: /\bZon(a|en|es) Industriale\b/ },
  { name: 'Shkabaj', city: 'Prishtinë', loc: 'Shkabaj', en: 'Shkabaj', re: /\bShkabaj\b/ },
  { name: 'Llukar', city: 'Prishtinë', loc: 'Llukar', en: 'Llukar', re: /\bLlukar\b/ },
  { name: 'Kodra e Trimave', city: 'Prishtinë', loc: 'Kodrën e Trimave', en: 'Kodra e Trimave', re: /\bKodr(a|en) e Trimave\b/ },
  { name: 'Hajvali', city: 'Prishtinë', loc: 'Hajvali', en: 'Hajvali', re: /\bHajvali\b/ },
  { name: 'Mramor', city: 'Prishtinë', loc: 'Mramor', en: 'Mramor', re: /\bMramor\b/ },
  { name: 'Veternik', city: 'Prishtinë', loc: 'Veternik', en: 'Veternik', re: /\bVeternik\b/ },
  { name: 'Marigona Residence', city: 'Prishtinë', loc: 'Marigona Residence', en: 'Marigona Residence', re: /\bMarigona Residence\b/ },
  { name: 'Bresje', city: 'Fushë Kosovë', loc: 'Bresje', en: 'Bresje', re: /\bBresje\b/ },
  { name: 'Sllatinë', city: 'Fushë Kosovë', loc: 'Sllatinë', en: 'Sllatinë', re: /\bSllatine\b/ },
  { name: 'Miradi e Epërme', city: 'Fushë Kosovë', loc: 'Miradin e Epërme', en: 'Miradi e Epërme', re: /\bMiradi (e|te) Eperme\b/ },
  { name: 'Henc', city: 'Fushë Kosovë', loc: 'Henc', en: 'Henc', re: /\bHenc\b/ },
  { name: 'Milloshevë', city: 'Obiliq', loc: 'Milloshevë', en: 'Milloshevë', re: /\bMillosheve\b/ },
  { name: 'Poturoc', city: 'Lipjan', loc: 'Poturoc', en: 'Poturoc', re: /\bPoturoc\b/ },
  { name: 'Topliqan', city: 'Lipjan', loc: 'Topliqan', en: 'Topliqan', re: /\bTopliqan\b/ },
];
// Mentions preceded by these words describe proximity or direction, not the property's location.
const PROXIMITY = /(prane|afer|larg|dalje[^.]{0,25}|qasje[^.]{0,25}|drejt|nga)\s+(e\s+)?$/i;

function firstPlace(list: Place[], folded: string): Place | null {
  let best: { p: Place; i: number } | null = null;
  for (const p of list) {
    const re = new RegExp(p.re.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(folded))) {
      const before = folded.slice(Math.max(0, m.index - 40), m.index);
      if (PROXIMITY.test(before)) continue;
      if (!best || m.index < best.i) best = { p, i: m.index };
      break;
    }
  }
  return best?.p ?? null;
}

// ---------------------------------------------------------------------------
// 4. Field extraction
// ---------------------------------------------------------------------------
export interface Parsed {
  city: string | null; neighbourhood: string | null; street: string | null; complex: string | null; landmark: string | null;
  country: 'XK' | 'ME' | 'AL' | null;
  developer: string | null; isNewBuild: boolean | null; completion: string | null;
  areaNet: number | null; areaApprox: boolean; areaTerrace: number | null; plotAres: number | null;
  floor: number | null; floorTo: number | null; totalFloors: number | null; orientation: string | null;
  bedrooms: number | null; bathrooms: number | null; wc: number | null; livingWithKitchen: boolean | null;
  storage: boolean | null; balcony: boolean | null; features: string[];
  legal: { ownershipCertificate: boolean | null; notaryContract: boolean | null; contractViaLawyer: boolean | null; inLegalisation: boolean | null; contractWithDeveloper: boolean | null };
  price: number | null; pricePerM2: number | null; pricePerAre: number | null; priceOnRequest: boolean;
  rentMonthly: number | null; deposit: number | null; minContractMonths: number | null;
  extras: { financing: string | null; installments: boolean | null; tradeIn: string | null; tenanted: boolean | null; rentalIncome: number | null; garageOptional: boolean | null };
  status: 'unconfirmed' | 'sold' | 'rented';
  warnings: string[];
}

const RESIDENTIAL: PropertyType[] = ['apartment', 'duplex', 'penthouse', 'house'];
const HAS_FLOOR: PropertyType[] = ['apartment', 'duplex', 'penthouse', 'office', 'commercial'];

const sentences = (s: string) => s.split(/(?<=[.!?])\s+|\n+/);

export function parseFields(opts: { title: string; body: string; deal: Deal; type: PropertyType; csvSize: string; csvPrice: string }): Parsed {
  const { title, body, deal, type } = opts;
  const warnings: string[] = [];
  const all = `${title}\n${body}`;
  const f = fold(all);
  const fb = fold(body);
  const cap = (re: RegExp, src = f) => src.match(re);
  const residential = RESIDENTIAL.includes(type);

  // --- location ---
  const hoodP = firstPlace(NEIGHBOURHOODS, fold(title)) ?? firstPlace(NEIGHBOURHOODS, fold(body.split('\n\n').slice(0, 2).join('\n\n')));
  const street = (() => {
    const re = /\b(?:Rrug(?:en|es|a)|rrug(?:en|es|a)|Rr\.)[ \t]+"?([A-Z0-9][\w]*(?:[ \t]*\/[ \t]*[A-Z0-9][\w]*|[ \t]+[A-Z0-9][\w]*)*)"?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(f))) {
      if (PROXIMITY.test(f.slice(Math.max(0, m.index - 40), m.index))) continue;
      const orig = all.slice(m.index + m[0].indexOf(m[1]), m.index + m[0].indexOf(m[1]) + m[1].length);
      return `Rruga ${orig.replace(/[“”"]/g, '').trim()}`;
    }
    return null;
  })();
  const cityP = firstPlace(CITIES, fold(title)) ?? firstPlace(CITIES, f)
    ?? (hoodP?.city ? CITIES.find((c) => c.name === hoodP.city)! : null)
    ?? (street ? CITIES.find((c) => c.name === PROFILE_STREET_CITY.find((s) => s.re.test(fold(street)))?.city) ?? null : null);
  if (cityP && !firstPlace(CITIES, f)) warnings.push(`city "${cityP.name}" taken from company profile §5 (caption names only ${hoodP?.name ?? street})`);
  const complex = (() => {
    const re = /\b(?:[Kk]ompleks(?:in|it|i)?|objekt(?:in|i))\s*:?\s+"?((?:[A-Z][\w]*|[A-Z0-9]+)(?:[ -]+(?:[A-Z0-9][\w]*))*)"?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(f))) {
      const start = m.index + m[0].indexOf(m[1]);
      const name = all.slice(start, start + m[1].length).replace(/[“”"]/g, '').trim();
      if (/^(ALTRADE)$/.test(name)) continue;
      if (NEIGHBOURHOODS.some((p) => p.re.test(fold(name))) && !/Residence/.test(name)) continue;
      return name;
    }
    const res = cap(/\bne ((?:[A-Z][\w]*\s)+Residence)\b/);
    if (res) return all.slice(res.index! + 3, res.index! + res[0].length).trim();
    return null;
  })();
  const landmark = (() => {
    const m = cap(/\b(?:prane|afer)\s+(?:(?:Restaurant|Kafe|marketit|Xhamise|Albi|Euro)\s[^,.\n]+)/);
    if (!m) return null;
    return all.slice(m.index!, m.index! + m[0].length).trim();
  })();

  // --- developer ---
  const developer = (() => {
    const patterns = [
      /\b[Nn]dertim(?:i|it)?\s+(?:nga|te)\s+(?:kompania\s+|kompanise\s+(?:se\s+njohur\s+)?)?"?([A-Z][^,.\n"]*?)"?(?=[,.\n]|\s+ne\s|\s+dhe\s|$)/,
      /\b[Nn]dertues(?:i)?:?\s+([A-Z][^,\n]*?)(?=[,\n]|\.(?:\s|$)|$)/,
      /\be ndertuar nga\s+([A-Z][^,.\n]*?)(?=[,.\n]|\s+me\s|$)/,
      /\bte ndertuara nga\s+([A-Z][^,.\n]*?)(?=[,.\n]|$)/,
      /\bne objekt nga\s+([A-Z][^,.\n]*?)(?=[,.\n]|$)/,
      /\bme ndertim te\s+(?:kompanise se njohur\s+)?([A-Z][^,.\n]*?)(?=[,.\n]|$)/,
    ];
    for (const re of patterns) {
      const m = cap(re);
      if (m) {
        const start = m.index! + m[0].lastIndexOf(m[1]);
        return all.slice(start, start + m[1].length).replace(/[“”"]/g, '').replace(/\s+SH\.?P\.?K\.?$/i, '').trim();
      }
    }
    return null;
  })();

  // --- new build ---
  const completionM = cap(/\bpunimet\s+perfundojne\s+(?:ne\s+)?([^.\n]+)/) ?? cap(/\bdorezimi i banese?s pritet\s+([^,.\n]+)/);
  const completion = completionM ? all.slice(completionM.index! + completionM[0].lastIndexOf(completionM[1]), completionM.index! + completionM[0].lastIndexOf(completionM[1]) + completionM[1].length).trim() : null;
  const contractWithDeveloper = /direkt me kompanine ndertuese/i.test(f) ? true : null;
  const isNewBuild = completion || contractWithDeveloper || /\bne faze ndertimi\b|\bfazen e perfundimit\b/i.test(f) ? true : null;

  // --- areas ---
  let areaNet: number | null = null;
  let areaApprox = false;
  const plotFromCsv = /ari$/.test(opts.csvSize.trim());
  if (!plotFromCsv) {
    const m = opts.csvSize.match(/^([\d.,]+)\s*m²$/);
    if (m) areaNet = parseArea(m[1]);
  }
  if (/\bnga\s+\d+\s*m²\s+deri ne\s+\d+\s*m²/i.test(f)) { areaNet = null; warnings.push('area is a range (multiple units); areaNet left null'); }
  if (areaNet !== null) {
    const approxRe = new RegExp(`(rreth|afersisht)\\s+${String(areaNet).replace('.', '[.,]')}\\s*m²`, 'i');
    if (approxRe.test(f)) areaApprox = true;
  }
  if (plotFromCsv) {
    const approxRe = new RegExp(`(rreth|afersisht)\\s+${opts.csvSize.replace(/\s*ari$/, '').trim().replace('.', '[.,]')}\\s*ari`, 'i');
    if (approxRe.test(f)) areaApprox = true;
  }
  if (type === 'land' && !plotFromCsv) warnings.push('land listing without ari size in CSV');
  let plotAres: number | null = null;
  if (plotFromCsv) plotAres = parseArea(opts.csvSize.replace(/ari$/, '').trim());
  if (plotFromCsv && type !== 'land') warnings.push(`CSV size "${opts.csvSize}" is a plot size for a ${type}`);
  if (!plotFromCsv) {
    const pm = cap(/\btruall\s+prej\s+([\d.,]+)\s*ari\b/i);
    if (pm) plotAres = parseArea(pm[1]);
  }
  const terraceM = cap(/\b(?:tarrac[ea]|teras[ea])(?:\s+private)?\s+(?:me siperfaqe\s+)?([\d.,]+)\s*m²/i) ?? cap(/\b([\d.,]+)\s*m²\s+(?:teras|tarrac)/i) ?? cap(/\brreth\s+([\d.,]+)\s*m²\s+tarrac/i);
  const areaTerrace = terraceM ? parseArea(terraceM[1]) : null;

  // --- floor ---
  let floor: number | null = null, floorTo: number | null = null;
  if (HAS_FLOOR.includes(type)) {
    const range = cap(/\bkatin e (\d+)\s*(?:dhe|&)\s*(\d+)\b/i);
    const multi = cap(/\bkatet\s+\d/i);
    if (multi) warnings.push('several floors listed (multiple units); floor left null');
    else if (range) { floor = Number(range[1]); floorTo = Number(range[2]); }
    else {
      const found = new Set<number>();
      for (const m of f.matchAll(/\bkati(?:n)? e (\d+(?:-(?:te|re))?|pare|dyte|trete)\b/gi)) { const n = parseOrdinal(m[1]); if (n !== null) found.add(n); }
      for (const m of f.matchAll(/\bKati(?: i banese?s)?:\s*(\d+)\b/g)) found.add(Number(m[1]));
      if (/\bkatin perdhese?\b|\bne perdhes\b/i.test(f)) found.add(0);
      if (found.size === 1) floor = [...found][0];
      else if (found.size > 1) warnings.push(`conflicting floors ${[...found].join(', ')}; floor left null`);
    }
  }

  // --- orientation ---
  const orientation = (() => {
    const m = cap(/\borientim(?:i|in)?\s+(?:nga\s+)?((?:veri|jug|lindj|perendim)\w*(?:\s*[-+]\s*(?:veri|jug|lindj|perendim)\w*)?)/i);
    if (!m) return null;
    const dir = (w: string) => ({ v: 'N', j: 'S', l: 'E', p: 'W' })[w.trim().toLowerCase()[0] as 'v' | 'j' | 'l' | 'p'];
    const parts = m[1].split(/\s*([-+])\s*/);
    if (parts.length === 1) return dir(parts[0]);
    const [a, op, b] = parts;
    if (op === '+') return `${dir(a)}-${dir(b)}`; // two-sided
    const pair = [dir(a), dir(b)];
    const ns = pair.find((d) => d === 'N' || d === 'S'), ew = pair.find((d) => d === 'E' || d === 'W');
    return ns && ew ? ns + ew : null;
  })();

  // --- rooms ---
  const countWord = '(\\d+(?:[.,]5)?|nje|dy|tri|tre|kater|pese|gjashte)';
  function uniqueCount(re: RegExp, label: string): number | null {
    const totalM = fb.match(new RegExp(`ne total[^.]*?${re.source}`, 'i'));
    if (totalM) return parseCount(totalM[1]);
    const values = [...fb.matchAll(new RegExp(re.source, 'gi'))].filter((m) => !/[-–]\s*$/.test(fb.slice(0, m.index))).map((m) => parseCount(m[1]));
    const distinct = [...new Set(values.filter((v): v is number => v !== null))];
    // Repeated identical counts (e.g. text + "Detajet kryesore" summary) agree; on houses they may be per-floor, so require one mention.
    if (distinct.length === 1 && (values.length === 1 || type !== 'house')) return distinct[0];
    if (values.length > 1) warnings.push(`${label}: ${values.length} separate mentions (${distinct.join(', ')}); left null`);
    return null;
  }
  let bedrooms = residential ? uniqueCount(new RegExp(`\\b${countWord}\\s+dhom[aeë]\\s+gjumi`), 'bedrooms') : null;
  if (residential && bedrooms === null && !/\d\s*[-–]\s*\d\s*dhoma gjumi/.test(fb)) {
    const typo = [...fb.matchAll(/\b(\d)\+1\b/g)].map((m) => Number(m[1]));
    if (typo.length === 1) bedrooms = typo[0];
  }
  if (/\d\s*[-–]\s*\d\s*dhoma gjumi/.test(fb)) { bedrooms = null; warnings.push('bedroom range (multiple units); left null'); }
  const bathrooms = (() => {
    if (!residential) return null;
    const n = uniqueCount(new RegExp(`\\b${countWord}\\s+banjo\\b`), 'bathrooms');
    if (n === null || /ne total/i.test(fb)) return n;
    // "banjo" is identical in singular and plural; an unnumbered mention next to a numbered one is ambiguous.
    const unnumbered = [...fb.matchAll(/\bbanjo\b/gi)].filter((m) => !new RegExp(`${countWord}\\s+$`, 'i').test(fb.slice(Math.max(0, m.index - 12), m.index)));
    if (unnumbered.length) { warnings.push('bathrooms: numbered and unnumbered mentions; left null'); return null; }
    return n;
  })();
  const wc = (() => {
    if (!residential && type !== 'office') return null;
    const n = uniqueCount(new RegExp(`\\b${countWord}\\s+(?:wc|tualete?)\\b`), 'wc');
    if (n !== null) return n;
    if (/\btualet\b/i.test(fb) && !/\btualete\b/i.test(fb)) return 1;
    return null;
  })();
  const livingWithKitchen = residential
    ? /\b(qendrim(?:i)? ditor|sallon|dhome dite)\s+(me|&)\s+kuzhin/i.test(fb) || /sallon te gjere me kuzhine/i.test(fb)
      ? true
      : /\bkuzhin(e|a)(\s+eshte)? e ndare\b|\bkuzhine te ndare\b/i.test(fb)
        ? false
        : null
    : null;
  const storage = residential && /\b(depo|shpajz)\b/i.test(fb) ? true : null;
  const balcony = /\bballkon/i.test(fb) ? true : null;

  // --- features (controlled vocabulary) ---
  const features: string[] = [];
  const add = (key: string, re: RegExp, allowedFor?: PropertyType[]) => { if ((!allowedFor || allowedFor.includes(type)) && re.test(f)) features.push(key); };
  const garageSentences = sentences(f).filter((s) => /garazh/i.test(s));
  const garageOptional = garageSentences.length > 0 && garageSentences.every((s) => /jashte cmimit|sipas kerkeses mund te blihet/i.test(s));
  add('underfloor-heating', /nen dysheme/i);
  if (sentences(f).some((s) => /ngroh/i.test(s) && /pomp\w* termike/i.test(s))) features.push('heat-pump');
  add('electric-heating', /ngrohje (elektrike|me energji elektrike|me rryme)|ngrohjes (eshte|e ka|)\s*(te mundesuar |i mundesuar )?(elektrik|me energji elektrike|me rryme)|ngrohjes eshte i mundesuar me energji elektrike|mundesuar me energji elektrike/i);
  add('central-heating', /ngrohje qendrore/i);
  add('air-conditioning', /\bklime\b|kondicioner/i);
  add('elevator', /ashensor|\blift/i);
  add('electric-shutters', /roleta elektrike/i);
  if (garageSentences.length && !garageOptional) features.push('garage');
  add('parking', /\bparking|\bparkim|vendparkim/i);
  const unfurnished = /\bpa mobilim|\bpa ?mobiluar|\bpamobiluar|gati per mobilim/i.test(f);
  if (unfurnished) features.push('unfurnished');
  else add('furnished', /\bmobiluar\b|\bmobilimi eshte/i);
  add('security-24-7', /24\/7/);
  add('gated-community', /lagje (e|te) mbyllur|komunitet (i|te) mbyllur|lagje private me kontroll/i);
  add('playground', /kende lojerash|park privat per femije|hapesire te dedikuar per femije/i);
  add('green-areas', /gjelberuara|gjelberim|park ndermjet/i);
  add('video-surveillance', /kamera/i);
  add('basement', /\bpodrum|\bbodrum/i);
  add('terrace', /tarrac|teras|rooftop/i);
  add('yard', /\boborr/i, ['house']);

  // --- legal ---
  const legal = {
    ownershipCertificate: /flete posed(u|i)?(ese|se|mi)\b|flete poseduse/i.test(f) ? true : null,
    notaryContract: /\bte noteri\b|\btek noteri\b|noterizuar/i.test(f) ? true : null,
    contractViaLawyer: /permes avokatit/i.test(f) ? true : null,
    inLegalisation: /proces(in)? te legalizimit/i.test(f) ? true : null,
    contractWithDeveloper,
  };

  // --- prices ---
  let price: number | null = null, pricePerM2: number | null = null, pricePerAre: number | null = null;
  let rentMonthly: number | null = null, deposit: number | null = null, minContractMonths: number | null = null;
  const money = '(\\d{1,3}(?:[.,]\\d{3})+|\\d+)\\s*(?:€|euro)';
  const m2 = cap(new RegExp(`${money}\\s*\\/\\s*m²`, 'i'));
  if (m2) pricePerM2 = parseMoney(m2[1]);
  const are = cap(new RegExp(`${money}\\s*(?:\\/\\s*ari|per ari)`, 'i'));
  if (are) pricePerAre = parseMoney(are[1]);
  if (deal === 'sale') {
    const total = cap(new RegExp(`cmimi total(?: per [\\d.,]+ ari)?:\\s*${money}`, 'i'))
      ?? cap(new RegExp(`cmimi i prones eshte\\s*${money}(?!\\s*\\/)`, 'i'))
      ?? cap(new RegExp(`cmimi:\\s*${money}(?!\\s*(\\/|per ari))`, 'i'));
    if (total) price = parseMoney(total[1]);
  } else {
    const rent = cap(new RegExp(`qiraja(?: mujore)?:\\s*${money}`, 'i')) ?? cap(new RegExp(`cmimi:\\s*${money}\\s*\\/\\s*muaj`, 'i'));
    if (rent) rentMonthly = parseMoney(rent[1]);
    else if (/^\s*[\d.,]+\s*€\s*$/.test(opts.csvPrice) && new RegExp(`qiraja mujore:\\s*${money}`, 'i').test(f)) rentMonthly = parseMoney(opts.csvPrice.replace('€', ''));
    const dep = cap(new RegExp(`depozita:\\s*${money}`, 'i'));
    if (dep) deposit = parseMoney(dep[1]);
    const c = cap(/kontrata(?: minimale)?:\s*(\d+)[\s-]*(vit|vjecare|muaj)/i);
    if (c) minContractMonths = Number(c[1]) * (/muaj/i.test(c[2]) ? 1 : 12);
    pricePerM2 = pricePerM2 && deal === 'rent' ? pricePerM2 : pricePerM2;
  }
  const hasAnyPrice = price !== null || pricePerM2 !== null || pricePerAre !== null || rentMonthly !== null;
  const priceOnRequest = !hasAnyPrice;

  // --- extras ---
  const fin = cap(/mundesi financimi permes Bank(?:es|a)?\s+(\w+)/i);
  const trade = cap(/kompensim me ([^,.\n]+?)(?:,|\.|\n|$)/i);
  const incomeM = cap(/te ardhura mujore\s*(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:euro|€)/i);
  const extras = {
    financing: fin ? fin[1] : null,
    installments: /pagese me keste/i.test(f) ? true : null,
    tradeIn: trade ? all.slice(trade.index! + 'kompensim me '.length, trade.index! + 'kompensim me '.length + trade[1].length).trim() : null,
    tenanted: /qira aktive|e leshuar me qira/i.test(f) ? true : null,
    rentalIncome: incomeM ? parseMoney(incomeM[1]) : null,
    garageOptional: garageOptional ? true : null,
  };

  const status = /\b(SHITUR|U SHIT)\b/.test(all) ? 'sold' : /\bU DHA ME QIRA\b/i.test(all) ? 'rented' : 'unconfirmed';

  return {
    city: cityP?.name ?? null,
    neighbourhood: hoodP?.name ?? null,
    street, complex, landmark,
    country: cityP?.country ?? null,
    developer, isNewBuild, completion,
    areaNet, areaApprox, areaTerrace, plotAres,
    floor, floorTo, totalFloors: null, orientation,
    bedrooms, bathrooms, wc, livingWithKitchen, storage, balcony,
    features: [...new Set(features)],
    legal,
    price, pricePerM2, pricePerAre, priceOnRequest, rentMonthly, deposit, minContractMonths,
    extras, status: status as Parsed['status'], warnings,
  };
}

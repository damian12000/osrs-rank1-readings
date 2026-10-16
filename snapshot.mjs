// Daily hiscores reading, run by GitHub Actions (see .github/workflows/snapshot.yml).
// Reads the top 25 of every boss table plus your own kill counts from the Old School
// hiscores and appends them to data/history.json. No dependencies; needs Node 20+.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const PLAYER = (process.env.PLAYER || '').trim();
const HISCORE = 'https://secure.runescape.com/m=hiscore_oldschool';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const FILE = 'data/history.json';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const num = s => parseInt(String(s).replace(/,/g, ''), 10);

async function getJson(url, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(res.status + ' ' + url);
      return await res.json();
    } catch (e) { if (i >= tries - 1) throw e; await sleep(3000 * (i + 1)); }
  }
}

// Bosses listed in deep.json are read to rank 100 (the JSON table stops at 50; ranks 51-100
// come from two pages of the public hiscores). Everything else is read to rank 25.
let deep = [];
try { deep = JSON.parse(readFileSync('deep.json', 'utf8')); } catch {}
async function getText(url, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(res.status + ' ' + url);
      return await res.text();
    } catch (e) { if (i >= tries - 1) throw e; await sleep(3000 * (i + 1)); }
  }
}
function parsePage(html) {
  const rows = [], re = /<tr class="personal-hiscores__row[^"]*">\s*<td class="right">([\d,]+)<\/td>[\s\S]*?user1=[^"]*">([^<]*)<\/a>[\s\S]*?<td class="right">\s*([\d,]+)\s*<\/td>/g;
  for (let m; (m = re.exec(html));) rows.push({ rank: num(m[1]), name: m[2].replace(/[^ -~]/g, ' '), score: num(m[3]) });
  return rows;
}

let history = { bosses: {} };
try { history = JSON.parse(readFileSync(FILE, 'utf8')); history.bosses ||= {}; } catch {}

// Same shape the app uses: { boss: { lowercased name: [[ms, kills], ...] } }.
// A run of identical values keeps only its first and latest point.
function record(boss, name, value, at) {
  if (!(value >= 0)) return;
  const series = ((history.bosses[boss] ||= {})[name.toLowerCase()] ||= []);
  const last = series[series.length - 1], prev = series[series.length - 2];
  if (last && last[0] === at) { last[1] = Math.max(last[1], value); return; }
  if (last && prev && last[1] === value && prev[1] === value) last[0] = at;
  else series.push([at, value]);
}

if (!PLAYER) { console.error('Set the PLAYER variable in the workflow file.'); process.exit(1); }
const me = await getJson(`${HISCORE}/index_lite.json?player=${encodeURIComponent(PLAYER)}`);
const first = me.activities.findIndex(a => a.name === 'Abyssal Sire');
if (first < 0) { console.error('Hiscores layout changed: could not find the boss tables.'); process.exit(1); }

const at = Date.now();
let ok = 0, failed = 0;
for (let table = first; table < me.activities.length; table++) {
  const boss = me.activities[table].name;
  record(boss, PLAYER, Math.max(me.activities[table].score, 0), at);
  try {
    const isDeep = deep.includes(boss);
    const rows = await getJson(`${HISCORE}/ranking.json?table=${table}&category=1&size=${isDeep ? 50 : 25}`);
    for (const r of rows) { record(boss, r.name, num(r.score), at); (history.names ||= {})[r.name.toLowerCase()] = r.name; }   // keep the display name: the app rebuilds boards from this file
    if (isDeep) for (const page of [3, 4]) {
      await sleep(600);
      for (const r of parsePage(await getText(`${HISCORE}/overall?category_type=1&table=${table}&page=${page}`))) { record(boss, r.name, r.score, at); (history.names ||= {})[r.name.toLowerCase()] = r.name; }
    }
    ok++;
  } catch (e) { failed++; console.warn('failed:', boss, e.message); }
  await sleep(600);
}

history.player = PLAYER;
history.lastRun = new Date(at).toISOString();
mkdirSync('data', { recursive: true });
writeFileSync(FILE, JSON.stringify(history));
console.log(`Recorded ${ok} boss tables, ${failed} failed.`);
if (failed > ok) process.exit(1);

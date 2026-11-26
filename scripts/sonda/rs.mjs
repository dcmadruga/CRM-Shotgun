import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(60000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0, ct: r.headers.get('content-type') }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const js = (await get('https://portal.meioambiente.go.gov.br/transparencia-web/main.00220232a298b3c4.js')).t;
let i = js.indexOf('boletim-ambiental-server'); log('ENV', js.slice(Math.max(0, i - 400), i + 400));
// chamadas http do Angular: this.http.get(`${...}/xxx`)
const calls = [...new Set([...js.matchAll(/(?:\.get|\.post|\.put)\(\s*`?([^`),]{0,40}\$\{[^}]+\}[^`),]{0,120})`?/g)].map(m => m[1]))];
log('CALLS', calls.slice(0, 80).join('\n'));
const strs = [...new Set([...js.matchAll(/["'`](\/[a-zA-Z][\w\-\/]{3,80})["'`]/g)].map(m => m[1]))].filter(x => !/^\/(assets|node_modules)/.test(x));
log('PATHS', strs.slice(0, 200).join(' | '));
for (const k of ['publicacao', 'boletim', 'filtro', 'pesquisa']) { let j = -1, n = 0; while ((j = js.indexOf(k, j + 1)) >= 0 && n++ < 3) log('CTX', k, js.slice(Math.max(0, j - 300), j + 500).replace(/\s+/g, ' ')); }
const S = 'https://portal.meioambiente.go.gov.br/boletim-ambiental-server';
for (const p of ['', '/', '/api', '/publicacoes', '/api/publicacoes', '/boletim', '/swagger-ui.html', '/v3/api-docs', '/v2/api-docs']) { const r = await get(S + p, { headers: { accept: 'application/json' } }); log('API', p, r.s, r.ct, r.t.slice(0, 600).replace(/\s+/g, ' ')); }
fs.writeFileSync('rs-sondas/go.txt', out.join('\n'));

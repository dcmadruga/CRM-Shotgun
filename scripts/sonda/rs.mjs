import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(60000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0, ct: r.headers.get('content-type') }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const S = 'https://portal.meioambiente.go.gov.br/boletim-ambiental-server';
const sr = await get(S + '/swagger-resources'); log('RES', sr.s, sr.t.slice(0, 600));
let docs = '';
try { for (const g of JSON.parse(sr.t)) { const d = await get(S + g.url || g.location); log('DOCS', g.name, d.s, d.t.length); docs = d.t; } } catch (e) { log('res parse', e.message); }
if (docs) { try { const d = JSON.parse(docs); for (const [p, ms] of Object.entries(d.paths)) for (const [m, op] of Object.entries(ms)) log('  ', m.toUpperCase(), p, '|', op.summary || op.operationId, '|', (op.parameters || []).map(x => `${x.name}:${x.in}${x.required ? '*' : ''}`).join(',')); } catch (e) { log('docs parse', e.message, docs.slice(0, 300)); } }
// chunk do módulo do boletim
const rt = (await get('https://portal.meioambiente.go.gov.br/transparencia-web/runtime.0630e9034004fd6a.js')).t;
const m = rt.match(/892:"([0-9a-f]+)"/); log('chunk892', m?.[1]);
if (m) { const c = (await get(`https://portal.meioambiente.go.gov.br/transparencia-web/892.${m[1]}.js`)).t; log('chunk len', c.length);
  for (const k of ['apiBoletimUrl', 'captcha', 'hcaptcha', 'recaptcha', 'token']) { let j = -1, n = 0; while ((j = c.indexOf(k, j + 1)) >= 0 && n++ < 4) log('CTX', k, c.slice(Math.max(0, j - 250), j + 450).replace(/\s+/g, ' ')); } }
fs.writeFileSync('rs-sondas/go.txt', out.join('\n'));

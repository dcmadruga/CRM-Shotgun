import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(60000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0, ct: r.headers.get('content-type') }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const txt = h => h.replace(/<(script|style)[^]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const js = (await get('https://diariooficial.abc.go.gov.br/buscanova/assets/javascripts/application.88abcf34.js')).t;
const i = js.indexOf('dateFilters = function'); log('JS dateFilters', js.slice(i, i + 900).replace(/\s+/g, ' '));
const j = js.indexOf('.success(function(data, status, headers, config) { var d, dataUtil'); log('JS success', js.slice(j, j + 1500).replace(/\s+/g, ' '));
const B = 'https://diariooficial.abc.go.gov.br/busca/busca/buscar/query/';
for (const q of ['"posto de combustíveis"', 'posto combustível licença', '"torna público que requereu" posto']) {
  const r = await get(B + '0/?1=1&q=' + encodeURIComponent(q), { headers: { accept: 'application/json' } });
  log('DOEGO', q, r.s, r.ct, r.t.length, r.t.slice(0, 2500).replace(/\s+/g, ' '));
}
for (const u of ['https://portal.meioambiente.go.gov.br/consultapublica', 'https://portal.meioambiente.go.gov.br/weblicencas', 'https://portal.meioambiente.go.gov.br/portal/pages/infoSistemaTRANSPARENCIA.mago?sistema=b11de60a-8072-4f9d-ac01-c339ff1c8515', 'https://portal.meioambiente.go.gov.br/ipe']) {
  const r = await get(u); log('SEMAD', u, r.s, r.u, r.t.length, txt(r.t).slice(0, 1200));
  log('  links', [...new Set([...r.t.matchAll(/(?:href|action)="([^"]+)"/g)].map(m => m[1]).filter(x => !/\.css|\.ico|fonts\.g|javax\.faces\.resource/.test(x)))].slice(0, 50).join(' | '));
}
fs.writeFileSync('rs-sondas/go.txt', out.join('\n'));

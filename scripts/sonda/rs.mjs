import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)', accept: 'application/json' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(60000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0, ct: r.headers.get('content-type') }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const c = (await get('https://portal.meioambiente.go.gov.br/transparencia-web/892.a6983ec37acf6d85.js')).t;
const i = c.indexOf('listarPorData('); log('CODE', c.slice(i, i + 1500).replace(/\s+/g, ' '));
const S = 'https://portal.meioambiente.go.gov.br/boletim-ambiental-server';
for (const t of ['posto revendedor', 'combustíveis', 'posto de combustível']) {
  const r = await get(`${S}/itens-boletins/pesquisar?termo=${encodeURIComponent(t)}&page=0&size=20`);
  log('PESQ', t, r.s, r.ms + 'ms', r.t.length);
  try { const d = JSON.parse(r.t); log('  chaves', Object.keys(d).join(','), 'total', d.totalElements, 'pags', d.totalPages);
    for (const x of (d.content || []).slice(0, 20)) log('   ', JSON.stringify(x).replace(/\s+/g, ' ').slice(0, 900)); } catch (e) { log('  ', r.t.slice(0, 500)); }
}
const b = await get(`${S}/boletins?page=0&size=5`); log('BOLETINS', b.s, b.t.slice(0, 1500));
fs.writeFileSync('rs-sondas/go.txt', out.join('\n'));

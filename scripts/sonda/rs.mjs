import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)', accept: 'application/json' };
async function get(u) { const t0 = Date.now(); try { const r = await fetch(u, { signal: AbortSignal.timeout(90000), headers: UA }); const t = await r.text(); return { s: r.status, t, ms: Date.now() - t0 }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const B = 'https://www.diariooficial.ms.gov.br/api/';
const r0 = await get(B + 'diarios-recentes'); log('RECENTES', r0.s, r0.ms, r0.t.slice(0, 1500));
const busca = async (texto, tipo, di, df, pag = 1, n = 10) => { const q = new URLSearchParams({ tipo, texto, dataInicial: di, dataFinal: df, pagina: pag, registrosPorPagina: n }); const r = await get(B + 'diarios/busca-diarios?' + q); log('\nBUSCA', texto, tipo, di, df, pag, r.s, r.ms + 'ms', r.t.length); return r; };
let r = await busca('posto de combustíveis', 1, '2026-08-01', '2026-11-27');
log(r.t.slice(0, 6000));
r = await busca('posto de combustíveis', 1, '01/08/2026', '27/11/2026'); log(r.t.slice(0, 800));
for (const t of ['combustíveis licença prévia', 'combustíveis licença de instalação', 'comércio varejista de combustíveis', 'IMASUL combustíveis', 'posto revendedor']) { const x = await busca(t, 1, '2025-11-27', '2026-11-27', 1, 5); log(x.t.replace(/\s+/g, ' ').slice(0, 2500)); }
fs.writeFileSync('rs-sondas/ms.txt', out.join('\n'));

import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(60000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0, ct: r.headers.get('content-type') }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const txt = h => h.replace(/<(script|style)[^]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const B = 'https://diariooficial.abc.go.gov.br/busca/busca/buscar/query/';
let r = await get(B + '0/di:2026-10-01/df:2026-11-26/?1=1&q=' + encodeURIComponent('"posto de combustíveis"'));
let d = JSON.parse(r.t);
log('DOEGO total', d.hits.total, 'hits nesta página', d.hits.hits.length, 'ms', r.ms);
const h0 = d.hits.hits[0]; log('chaves', Object.keys(h0), Object.keys(h0._source).join(','));
log('fonte sem conteudo', JSON.stringify({ ...h0._source, conteudo: undefined }).slice(0, 800));
log('highlight', JSON.stringify(h0.highlight || {}).slice(0, 500));
log('aggs', JSON.stringify(d.aggregations).slice(0, 600));
for (const h of d.hits.hits) { const c = h._source.conteudo || ''; const i = c.search(/posto de combust/i); log(' HIT', h._id, JSON.stringify({ ...h._source, conteudo: undefined }).slice(0, 200), '|', c.length, '|', c.slice(Math.max(0, i - 400), i + 300).replace(/\s+/g, ' ')); }
r = await get(B + '1/di:2026-10-01/df:2026-11-26/?1=1&q=' + encodeURIComponent('"posto de combustíveis"')); d = JSON.parse(r.t); log('pagina 1', d.hits.hits.map(h => h._id).join(','));
// transparência ambiental SEMAD
for (const u of ['https://portal.meioambiente.go.gov.br/transparencia-web', 'https://portal.meioambiente.go.gov.br/transparencia-web/']) {
  const t = await get(u); log('TRANSP', u, t.s, t.u, t.ct, t.t.length, txt(t.t).slice(0, 1500));
  log('  links', [...new Set([...t.t.matchAll(/(?:href|action|src)="([^"]+)"/g)].map(m => m[1]).filter(x => !/\.css|\.ico|fonts\.g/.test(x)))].slice(0, 60).join(' | '));
  const scripts = [...t.t.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(m => new URL(m[1], t.u).href).filter(x => /main|app|chunk|index/i.test(x));
  for (const s of scripts.slice(0, 4)) { const j = await get(s); const m = [...new Set([...j.t.matchAll(/["'`]((?:https?:)?\/[^"'`\s]{2,120})["'`]/g)].map(x => x[1]).filter(x => /api|boletim|publica|licen|rest|consulta/i.test(x)))]; log('  JS', s, j.s, j.t.length, m.slice(0, 40).join(' | ')); }
}
fs.writeFileSync('rs-sondas/go.txt', out.join('\n'));

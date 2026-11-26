import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(60000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0, ct: r.headers.get('content-type') }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const txt = h => h.replace(/<(script|style)[^]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
// DOE-GO: código da busca
const js = (await get('https://diariooficial.abc.go.gov.br/buscanova/assets/javascripts/application.88abcf34.js')).t;
for (const k of ['busca/busca/buscar', 'edicoes_from_data', '$http.post', '$http.get', 'params']) { let i = -1, n = 0; while ((i = js.indexOf(k, i + 1)) >= 0 && n++ < 3) log('JS', k, js.slice(Math.max(0, i - 600), i + 900).replace(/\s+/g, ' ')); }
// tentativas diretas
const B = 'https://diariooficial.abc.go.gov.br/';
for (const [m, p, body] of [['GET', 'busca/busca/buscar/?q=%22posto%20de%20combust%C3%ADveis%22', null], ['GET', 'busca/busca/buscar/?termo=%22posto%20de%20combust%C3%ADveis%22&page=0&size=10', null], ['POST', 'busca/busca/buscar/', JSON.stringify({ query: '"posto de combustíveis"', page: 0, size: 10 })]]) {
  const r = await get(B + p, { method: m, body, headers: body ? { 'content-type': 'application/json' } : {} }); log('DOEGO', m, p, r.s, r.ct, r.t.slice(0, 1200).replace(/\s+/g, ' '));
}
// SEMAD portal ambiental
for (const u of ['https://portal.meioambiente.go.gov.br/portal/inicio.mago']) { const r = await get(u); log('SEMAD', u, r.s, r.t.length, txt(r.t).slice(0, 1500)); log('  links', [...new Set([...r.t.matchAll(/href="([^"]+)"/g)].map(m => m[1]))].slice(0, 60).join(' | ')); }
fs.writeFileSync('rs-sondas/go.txt', out.join('\n'));

import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(60000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0, h: Object.fromEntries(r.headers) }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const txt = h => h.replace(/<(script|style)[^]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const B = 'https://www.diariooficial.ms.gov.br/';
const h = await get(B); log('HOME', h.s, h.t.length, 'set-cookie:', h.h?.['set-cookie']?.slice(0, 200));
log('FORMS', [...h.t.matchAll(/<form[^>]*>[^]*?<\/form>/g)].map(m => m[0].replace(/\s+/g, ' ')).join('\n').slice(0, 5000));
log('SCRIPTS', [...h.t.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]).join(' | '));
log('INLINE', [...h.t.matchAll(/<script(?![^>]*src)[^>]*>([^]*?)<\/script>/g)].map(m => m[1]).join(' ').replace(/\s+/g, ' ').slice(0, 5000));
log('HREFS', [...new Set([...h.t.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(x => !/assets\.imprensa|fonts/.test(x)))].join(' | ').slice(0, 3000));
for (const m of h.t.matchAll(/<script[^>]*src="([^"]+)"/g)) { const u = new URL(m[1], B).href; if (/jquery|bootstrap|gtag|google/i.test(u)) continue; const r = await get(u); const t = r.t.replace(/\s+/g, ' '); log('JS', u, r.s, t.length); for (const k of t.matchAll(/.{0,200}(ajax|fetch\(|\/api\/|url\s*:|Buscar|busca|pesquis).{0,300}/gi)) log('  >', k[0]); }
fs.writeFileSync('rs-sondas/ms.txt', out.join('\n'));

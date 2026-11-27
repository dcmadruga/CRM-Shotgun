import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(45000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0 }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const txt = h => h.replace(/<(script|style)[^]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const links = (h, re) => [...new Set([...h.matchAll(/(?:href|src|action)="([^"]+)"/g)].map(m => m[1]).filter(x => re.test(x)))].slice(0, 50).join(' | ');
const ver = async (tag, u, re, n = 300) => { const r = await get(u); log(tag, u, r.s, r.u, r.ms + 'ms', r.t.length, txt(r.t).slice(0, n)); if (re) log('  links', links(r.t, re)); return r; };
for (const s of ['assomasul', 'ms', 'diarioms', 'amms', 'mt_ms']) await ver('SIGPUB', `https://www.diariomunicipal.com.br/${s}/`, null, 150);
await ver('ASSOMASUL', 'https://www.diariooficialms.com.br/', /pesquis|busca|edic|api|diario|download/i);
await ver('ASSOMASUL2', 'https://diariooficialms.com.br/pesquisa', /pesquis|busca|edic|api|download/i);
await ver('DOEMS', 'https://www.spdo.ms.gov.br/diariodoe', /pesquis|busca|edic|api|Index|download|Documento/i, 500);
await ver('DOEMS2', 'https://www.spdo.ms.gov.br/', /pesquis|busca|edic|api|diario|Index/i);
await ver('IMASUL', 'https://www.imasul.ms.gov.br/', /licen|consulta|siriema|public|sisla|servic|processo|transpar/i);
for (const u of ['https://siriema.imasul.ms.gov.br/', 'https://servicos.imasul.ms.gov.br/', 'http://sisla.imasul.ms.gov.br/', 'https://www.imasul.ms.gov.br/licenciamento-ambiental/', 'https://www.imasul.ms.gov.br/publicacoes/']) await ver('IMASUL', u, /licen|consulta|public|processo|pesquis|api/i, 200);
await ver('DIOGRANDE', 'https://diogrande.campogrande.ms.gov.br/', /pesquis|busca|edic|api|download|wp-json|diario/i, 300);
await ver('DOURADOS', 'https://do.dourados.ms.gov.br/', /pesquis|busca|edic|api|download|diario/i, 200);
await ver('TRESLAGOAS', 'https://www.treslagoas.ms.gov.br/diario-oficial/', /pesquis|busca|edic|api|download|diario/i, 200);
const q = await get('https://api.queridodiario.org.br/cities?city_name=', { signal: AbortSignal.timeout(90000) });
try { const c = JSON.parse(q.t).cities.filter(x => String(x.territory_id).startsWith('50')); log('QD MS', c.length, c.map(x => x.territory_name + '(' + (x.level || '') + ')').join(', ')); } catch (e) { log('QD', q.s, q.t.slice(0, 200)); }
const q2 = await get('https://api.queridodiario.org.br/gazettes?querystring=%22posto%20de%20combust%C3%ADveis%22&territory_ids=5002704&published_since=2025-11-01&size=5&excerpt_size=300', { signal: AbortSignal.timeout(90000) }); log('QD CampoGrande', q2.s, q2.t.slice(0, 1500));
fs.writeFileSync('rs-sondas/ms.txt', out.join('\n'));

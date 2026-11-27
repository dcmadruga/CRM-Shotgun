import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(45000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0 }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const txt = h => h.replace(/<(script|style)[^]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const links = (h, re) => [...new Set([...h.matchAll(/(?:href|src|action|url)\s*[=:]\s*["']([^"']+)["']/g)].map(m => m[1]).filter(x => re.test(x)))].slice(0, 60).join(' | ');
const ver = async (tag, u, re, n = 300, o) => { const r = await get(u, o); log(tag, u, r.s, r.u, r.ms + 'ms', r.t.length, txt(r.t).slice(0, n)); if (re) log('  links', links(r.t, re)); return r; };
// Assomasul: página de arquivo e o JS que alimenta a tabela
const a = await ver('ASSO', 'https://www.diariooficialms.com.br/assomasul?pagina=filtro-avancado', /api|ajax|pesquis|busca|js\/|\.php|download|edic/i, 800);
for (const m of a.t.matchAll(/src="(https:\/\/www\.diariooficialms\.com\.br\/js\/[^"]+)"/g)) { const r = await get(m[1]); log('ASSO JS', m[1], r.s, r.t.length); log(r.t.replace(/\s+/g, ' ').slice(0, 4000)); }
const sc = [...a.t.matchAll(/<script>([^]*?)<\/script>/g)].map(m => m[1]).join(' ').replace(/\s+/g, ' '); log('ASSO inline', sc.slice(0, 4000));
// SIGPub MS: pesquisa
await ver('SIGPUB-MS pesquisa', 'https://www.diariomunicipal.com.br/ms/pesquisar?busca_avancada%5BtermoBusca%5D=posto+de+combust%C3%ADveis', null, 1500);
// DOE-MS
for (const u of ['https://spdo.ms.gov.br/diariodoe', 'http://www.spdo.ms.gov.br/diariodoe', 'https://www.diariooficial.ms.gov.br/', 'https://diariooficial.ms.gov.br/', 'https://www.ms.gov.br/diario-oficial']) await ver('DOEMS', u, /pesquis|busca|edic|api|Index|download|Documento|diario/i, 400);
// IMASUL consulta de processos
await ver('MSGOV', 'https://www.ms.gov.br/meio-ambiente/realizar-consulta-de-processos2/', /imasul|consulta|processo|siriema|http/i, 1500);
for (const u of ['https://siriema.imasul.ms.gov.br/public/pessoa/default.xhtml', 'https://siriema.imasul.ms.gov.br/public/', 'https://siriema.imasul.ms.gov.br/public/processo/consulta.xhtml', 'https://siriema.imasul.ms.gov.br/public/consulta.xhtml']) await ver('SIRIEMA', u, /public|consulta|processo|licen/i, 400);
// Campo Grande e-diário
for (const u of ['https://diogrande.campogrande.ms.gov.br/e-diario-cidadao/', 'https://apl03.campogrande.ms.gov.br/e-diario', 'https://diogrande.campogrande.ms.gov.br/wp-json/wp/v2/types', 'https://diogrande.campogrande.ms.gov.br/?s=posto+de+combust%C3%ADveis']) await ver('DIOGRANDE', u, /pesquis|busca|edic|api|download|diario|pdf|wp-json\/wp\/v2\/[a-z]/i, 600);
// Querido Diário MS, termos variados
const qd = async (q, terr) => { const r = await get(`https://api.queridodiario.org.br/gazettes?querystring=${encodeURIComponent(q)}&${terr ? 'territory_ids=' + terr + '&' : ''}published_since=2025-11-01&size=5&excerpt_size=250`, { signal: AbortSignal.timeout(90000) }); try { const j = JSON.parse(r.t); log('QD', q, terr || 'todos', j.total_gazettes, j.gazettes.map(g => g.territory_name + ' ' + g.date + ': ' + (g.excerpts || []).join(' / ').replace(/\s+/g, ' ').slice(0, 300)).join(' || ')); } catch { log('QD', q, r.s, r.t.slice(0, 200)); } };
await qd('combustíveis licença', '5002704'); await qd('posto combustíveis', '5002704'); await qd('combustíveis licença', '5003702'); await qd('combustíveis licença prévia', '');
fs.writeFileSync('rs-sondas/ms.txt', out.join('\n'));

import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(45000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0 }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const txt = h => h.replace(/<(script|style)[^]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const links = (h, re) => [...new Set([...h.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(x => re.test(x)))].slice(0, 40).join(' | ');
for (const s of ['agm', 'fgm', 'goias', 'go', 'amg', 'famgo']) { const r = await get(`https://www.diariomunicipal.com.br/${s}/`); log('SIGPUB', s, r.s, r.u, r.t.length, txt(r.t).slice(0, 200)); }
const r1 = await get('https://www.diariomunicipal.com.br/'); log('SIGPUB home', r1.s, links(r1.t, /diariomunicipal\.com\.br\/[a-z]+\/?$|^\/[a-z]+\/?$/));
for (const u of ['https://diariooficial.abc.go.gov.br/', 'https://diariooficial.abc.go.gov.br/buscanova/', 'https://diariooficial.abc.go.gov.br/api/']) { const r = await get(u); log('DOEGO', u, r.s, r.u, r.ms + 'ms', r.t.length, txt(r.t).slice(0, 300)); log('  links', links(r.t, /busca|pesquis|api|edic|portal|materia/i)); }
for (const u of ['https://goias.gov.br/meioambiente/licenciamento-ambiental/', 'https://ipe.meioambiente.go.gov.br/', 'https://portal.meioambiente.go.gov.br/', 'https://goias.gov.br/meioambiente/?p=340562']) { const r = await get(u); log('SEMAD', u, r.s, r.u, r.ms + 'ms', r.t.length, txt(r.t).slice(0, 200)); log('  links', links(r.t, /ipe|consulta|sistema|licen|portal|sigam|processo/i)); }
for (const u of ['https://www.goiania.go.gov.br/casa-civil/diario-oficial/', 'https://www.goiania.go.gov.br/shtml/portal/diariooficial.shtml']) { const r = await get(u); log('GYN', u, r.s, r.u, r.t.length, txt(r.t).slice(0, 200)); log('  links', links(r.t, /diario|Download|busca|pesquis/i)); }
const q = await get('https://api.queridodiario.org.br/cities?city_name=', { signal: AbortSignal.timeout(90000) });
try { const c = JSON.parse(q.t).cities.filter(x => String(x.territory_id).startsWith('52')); log('QD GO', c.length, c.map(x => x.territory_name + '(' + (x.level || '') + ')').join(', ')); } catch (e) { log('QD', q.s, q.t.slice(0, 200)); }
const q2 = await get('https://api.queridodiario.org.br/gazettes?querystring=%22posto%20de%20combust%C3%ADveis%22&territory_ids=5208707&published_since=2025-11-01&size=5&excerpt_size=300', { signal: AbortSignal.timeout(90000) }); log('QD Goiania', q2.s, q2.t.slice(0, 1500));
fs.writeFileSync('rs-sondas/go.txt', out.join('\n'));

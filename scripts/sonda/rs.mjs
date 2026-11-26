import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(60000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0 }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const txt = h => h.replace(/<(script|style)[^]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
// SIGPub AGM / FGM
for (const s of ['agm', 'fgm']) {
  const h = await get(`https://www.diariomunicipal.com.br/${s}/`);
  log('SIGPUB', s, (h.t.match(/<title>([^<]*)/) || [])[1], '|', [...new Set([...h.t.matchAll(/Goi[aá]s|GO\b/g)].map(m => m[0]))].join(','));
  for (const termo of ['"posto de combustíveis"', '"posto de combustível"', '"licença de instalação" combustíveis', '"licença prévia" posto']) {
    const u = `https://www.diariomunicipal.com.br/${s}/pesquisar?busca_avancada%5Btexto%5D=${encodeURIComponent(termo)}&busca_avancada%5BdataInicio%5D=2025-11-26&busca_avancada%5BdataFim%5D=2026-11-26&busca_avancada%5Bpagina%5D=1`;
    const r = await get(u);
    const cards = r.t.split('<li class="materia-card">').slice(1).map(li => txt([(li.match(/materia-card__titulo">([^]*?)<\/h2>/) || [])[1], '·', (li.match(/materia-card__entidade">([^]*?)<\/span>/) || [])[1], '·', (li.match(/materia-card__trecho">([^]*?)<\/p>/) || [])[1]].join(' ')).slice(0, 260));
    const tot = (txt(r.t).match(/(\d[\d.]*)\s+resultado/i) || [])[0];
    log(' ', s, termo, r.s, tot || '', cards.length + ' cards');
    for (const c of cards.slice(0, 12)) log('    ', c);
  }
}
// DOE-GO busca nova: descobrir a API
const b = await get('https://diariooficial.abc.go.gov.br/buscanova/');
const scripts = [...b.t.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(m => new URL(m[1], 'https://diariooficial.abc.go.gov.br/buscanova/').href);
log('DOEGO scripts', scripts.join(' '));
for (const s of scripts.filter(x => !/jquery|angular\.min|bootstrap|google/i.test(x)).slice(0, 6)) { const j = await get(s); const m = [...new Set([...j.t.matchAll(/["'`]((?:https?:)?\/\/?[^"'`\s]*(?:api|search|busca|elastic|_search|materia)[^"'`\s]*)["'`]/gi)].map(x => x[1]))]; log('  JS', s, j.s, j.t.length, m.slice(0, 20).join(' | ')); const i = j.t.search(/\$http|fetch\(|\.post\(|\.get\(/); if (i > 0) log('   ctx', j.t.slice(Math.max(0, i - 300), i + 700).replace(/\s+/g, ' ')); }
log('DOEGO inline', (b.t.match(/<script>[^]*?<\/script>/g) || []).map(s => s.replace(/\s+/g, ' ').slice(0, 800)).join(' ### '));
// SEMAD portal
for (const u of ['https://portal.meioambiente.go.gov.br/portal/', 'https://portal.meioambiente.go.gov.br/portal/consulta', 'https://goias.gov.br/meioambiente/licenciamento-ambiental/']) { const r = await get(u); log('SEMAD', u, r.s, r.u, r.t.length, r.t.slice(0, 600).replace(/\s+/g, ' ')); }
// Querido Diário GO
const ids = ['5208707', '5201108', '5201405', '5204508', '5205109', '5205497', '5208004', '5211503', '5211909', '5212501', '5215231', '5218805', '5220454', '5221403', '5221858', '5200258'];
for (const t of ['"posto de combustíveis"', '"licença de instalação"', '"licença prévia"']) {
  const q = await get(`https://api.queridodiario.org.br/gazettes?querystring=${encodeURIComponent(t)}&${ids.map(i => 'territory_ids=' + i).join('&')}&published_since=2025-11-26&size=10&excerpt_size=300&number_of_excerpts=2`, { signal: AbortSignal.timeout(90000) });
  try { const d = JSON.parse(q.t); log('QD', t, 'total', d.total_gazettes); for (const g of d.gazettes) log('   ', g.date, g.territory_name, '|', (g.excerpts || []).join(' … ').replace(/\s+/g, ' ').slice(0, 400)); } catch { log('QD', t, q.s, q.t.slice(0, 200)); }
}
fs.writeFileSync('rs-sondas/go.txt', out.join('\n'));

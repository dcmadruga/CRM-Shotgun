import fs from 'fs';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)', accept: 'application/json' };
async function get(u, o = {}) { const t0 = Date.now(); try { const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(90000), ...o, headers: { ...UA, ...(o.headers || {}) } }); const t = await r.text(); return { s: r.status, u: r.url, t, ms: Date.now() - t0, ct: r.headers.get('content-type') }; } catch (e) { return { s: 'ERR ' + (e.cause?.code || e.message), t: '', ms: Date.now() - t0 }; } }
const S = 'https://portal.meioambiente.go.gov.br/boletim-ambiental-server';
const limpa = h => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
// ordenação e tamanho
for (const q of ['&size=100&sort=dataPublicacao,desc', '&size=50&sort=dataPublicacao,DESC']) { const r = await get(`${S}/itens-boletins/pesquisar?termo=E3.4&page=0${q}`); try { const d = JSON.parse(r.t); log('ORD', q, r.s, r.ms, 'total', d.totalElements, 'n', d.content.length, 'primeira', d.content[0]?.dataPublicacao, 'ultima', d.content.at(-1)?.dataPublicacao); } catch { log('ORD', q, r.s, r.t.slice(0, 300)); } }
// termos possíveis e últimas páginas
const tipos = {}, secoes = {}; let recentes = [];
for (const termo of ['E3.4', 'combustíveis']) {
  const r0 = JSON.parse((await get(`${S}/itens-boletins/pesquisar?termo=${encodeURIComponent(termo)}&page=0&size=100`)).t);
  log('TERMO', termo, 'total', r0.totalElements, 'paginas', r0.totalPages);
  for (let p = Math.max(0, r0.totalPages - 3); p < r0.totalPages; p++) {
    const d = JSON.parse((await get(`${S}/itens-boletins/pesquisar?termo=${encodeURIComponent(termo)}&page=${p}&size=100`)).t);
    for (const x of d.content) { const t = limpa(x.texto); const tipo = (t.match(/Tipo:\s*(\w+)/) || [])[1]; tipos[tipo] = (tipos[tipo] || 0) + 1; secoes[x.secao] = (secoes[x.secao] || 0) + 1; if (x.dataPublicacao >= '2026-09') recentes.push(x.dataPublicacao.slice(0, 10) + ' | ' + x.secao + ' | ' + t.slice(0, 420)); }
  }
}
log('TIPOS', JSON.stringify(tipos)); log('SECOES', JSON.stringify(secoes));
log('RECENTES', recentes.length); for (const r of [...new Set(recentes)].slice(-40)) log('  ', r);
// boletim completo de uma data (tem município?)
const b = await get(`${S}/boletins`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dataPublicacao: '25-11-2026', codigoAutenticacao: '', proximo: false }) });
log('BOLETIM', b.s, b.ct, b.t.length, b.t.slice(0, 2500).replace(/\s+/g, ' '));
fs.writeFileSync('rs-sondas/go.txt', out.join('\n'));

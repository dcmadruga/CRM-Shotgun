// sonda temporária das fontes de SP (removida antes do PR)
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
await mkdir('sp-sondas', { recursive: true });
const resumo = [];
async function pega(nome, url, opts = {}) {
  try {
    const r = await fetch(url, { headers: { ...UA, ...(opts.headers || {}) }, method: opts.method || 'GET', body: opts.body, redirect: 'follow', signal: AbortSignal.timeout(45000) });
    const t = await r.text();
    await writeFile(`sp-sondas/${nome}.txt`, `${r.status} ${r.url}\n\n${t.slice(0, 400000)}`);
    resumo.push(`${nome}\t${r.status}\t${t.length}\t${r.url}`); return t;
  } catch (e) { resumo.push(`${nome}\tERRO\t${e.message}\t${url}`); return ''; }
}
const API = 'https://do-api-web-search.doe.sp.gov.br/';
const adv = (terms, de = '2026-09-01', ate = '2026-11-22', n = 100) => `${API}v2/advanced-search/publications?${terms.map((t, i) => `Terms%5B${i}%5D=${encodeURIComponent(t)}`).join('&')}&FromDate=${de}&ToDate=${ate}&PageNumber=1&PageSize=${n}`;
// varre termos em 12 meses e guarda tudo que não é do Executivo (Empresarial, Municípios) e o que é da CETESB
const varre = {};
for (const termo of ['CETESB', 'combustíveis', 'posto de serviços', 'junto à CETESB', 'Licença de Instalação']) {
  const fica = []; let total = 0, hier = {};
  for (let p = 1; p <= 25; p++) {
    let j; try { const r = await fetch(`${API}v2/advanced-search/publications?Terms%5B0%5D=${encodeURIComponent(termo)}&FromDate=2025-11-23&ToDate=2026-11-22&PageNumber=${p}&PageSize=100`, { headers: UA, signal: AbortSignal.timeout(60000) }); j = await r.json(); } catch (e) { resumo.push(`varre ${termo} p${p}\tERRO ${e.message}`); break; }
    total = j.totalItems; for (const i of j.items || []) { const h = i.hierarchy.split(' > ').slice(0, 2).join(' > '); hier[h] = (hier[h] || 0) + 1; if (!/^Executivo > Atos Normativos > (Minist|Secretaria da Seg|Secretaria da Fazenda|Secretaria da Justi)/.test(i.hierarchy)) fica.push({ d: i.date.slice(0, 10), id: i.id, h: i.hierarchy, t: i.title, e: i.excerpt }); }
    if (!j.hasNextPage) break;
  }
  varre[termo] = { total, hier, fica };
  resumo.push(`varre ${termo}\t${total}\t${fica.length}`);
}
await writeFile('sp-sondas/varre.json', JSON.stringify(varre, null, 1));
for (const [k, tid] of [['qd-sp', '3550308'], ['qd-campinas', '3509502'], ['qd-ribeirao', '3543402']]) await pega(k, `https://api.queridodiario.org.br/gazettes?querystring=${encodeURIComponent('"posto de combustíveis"')}&published_since=2026-01-01&size=3&excerpt_size=400&territory_ids=${tid}`);
await pega('qd-cidades', 'https://api.queridodiario.org.br/cities?levels=3');
await writeFile('sp-sondas/resumo.tsv', resumo.join('\n') + '\n');

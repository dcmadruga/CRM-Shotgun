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
const termos = { cetesb_combust: ['CETESB', 'combustíveis'], cetesb_posto: ['CETESB', 'posto'], requereu_cetesb: ['requereu', 'CETESB'], varejista: ['comércio varejista de combustíveis'], revendedor: ['revendedor varejista'], lp_combust: ['Licença Prévia', 'combustíveis'], postorev: ['posto revendedor'], cetesb: ['CETESB'], abastecimento: ['posto de abastecimento'], tanques: ['tanques subterrâneos'] };
let slug = '';
for (const [k, t] of Object.entries(termos)) { const j = await pega('adv-' + k, adv(t)); try { slug ||= JSON.parse(j).items?.[0]?.slug; } catch {} }
await pega('filters', `${API}v2/advanced-search/filters`);
await pega('sections', `${API}v2/sections`);
await pega('journals', `${API}v2/journals`);
await pega('unified', `${API}v3/unified-search/publications?Terms%5B0%5D=${encodeURIComponent('CETESB')}&FromDate=2026-11-01&ToDate=2026-11-22&PageNumber=1&PageSize=20`);
await pega('unified-filters', `${API}v3/unified-search/filters`);
if (slug) { await pega('pub-html', 'https://www.doe.sp.gov.br/' + slug); }
await writeFile('sp-sondas/resumo.tsv', resumo.join('\n') + '\n');

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
const termos = { requereu_da: ['requereu da CETESB'], requereu_a: ['requereu à CETESB'], requereu_na: ['requereu na CETESB'], recebeu_da: ['recebeu da CETESB'], torna_recebeu: ['torna público que recebeu'], torna_requereu: ['torna público que requereu'], lic_previa_inst: ['Licença Prévia e de Instalação'], comb_var: ['comércio varejista de combustíveis para veículos automotores'] };
let slug = '', id = '';
for (const [k, t] of Object.entries(termos)) { const j = await pega('adv-' + k, adv(t, '2026-06-01')); try { const it = JSON.parse(j).items?.[0]; if (it && !slug) { slug = it.slug; id = it.id; } } catch {} }
const pag = await pega('page-chunk', 'https://www.doe.sp.gov.br/_next/static/chunks/pages/%5Bjournal%5D/%5Bsection%5D/%5BtitleId%5D-d2c49aed801eaebb.js');
for (const c of ['810-1b3895fcf9c80ab9', '664-49bfed7960604cc4']) await pega('chunk-' + c, `https://www.doe.sp.gov.br/_next/static/chunks/${c}.js`);
if (slug) {
  const tail = slug.split('/').pop();
  await pega('det-slug', `${API}v2/publications/${encodeURIComponent(tail)}`);
  await pega('det-slugq', `${API}v2/publications?slug=${encodeURIComponent(slug)}`);
  await pega('det-id', `${API}v2/publications/${id}`);
  await pega('det-slug2', `${API}v2/publications/slug/${encodeURIComponent(tail)}`);
}
await writeFile('sp-sondas/resumo.tsv', resumo.join('\n') + '\n');

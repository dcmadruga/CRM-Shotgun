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
const js = await pega('ecetesb-js', 'https://e.cetesb.sp.gov.br/portal-servicos-frontend/assets/index-BzvgjvH7.js');
const achados = new Set();
for (const m of js.matchAll(/["'`]([^"'`\s]{0,80}(?:api|consulta|publica|publico|processo)[^"'`\s]{0,120})["'`]/gi)) achados.add(m[1]);
await writeFile('sp-sondas/ecetesb-rotas.txt', [...achados].join('\n'));
for (const m of js.matchAll(/import\(["']\.\/([^"']+\.js)["']\)/g)) {}
await writeFile('sp-sondas/resumo.tsv', resumo.join('\n') + '\n');

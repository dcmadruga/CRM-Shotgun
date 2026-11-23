// sonda temporária das fontes de SP (removida antes do PR)
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
await mkdir('sp-sondas', { recursive: true });
const resumo = [];
async function pega(nome, url, opts = {}) {
  try {
    const r = await fetch(url, { headers: { ...UA, ...(opts.headers || {}) }, method: opts.method || 'GET', body: opts.body, redirect: 'follow', signal: AbortSignal.timeout(45000) });
    const t = await r.text();
    await writeFile(`sp-sondas/${nome}.txt`, `${r.status} ${r.url}\n${[...r.headers].map(h => h.join(': ')).join('\n')}\n\n${t.slice(0, 250000)}`);
    resumo.push(`${nome}\t${r.status}\t${t.length}\t${r.url}`); return t;
  } catch (e) { resumo.push(`${nome}\tERRO\t${e.message}\t${url}`); return ''; }
}
// DOE-SP: acha a API nos scripts do site
const home = await pega('doe-home', 'https://www.doe.sp.gov.br/');
const srcs = [...home.matchAll(/src="([^"]+\.js)"/g)].map(m => new URL(m[1], 'https://www.doe.sp.gov.br/').href);
const apis = new Set();
for (const [i, s] of srcs.slice(0, 15).entries()) {
  const js = await pega('doe-js' + i, s);
  for (const m of js.matchAll(/https?:\/\/[a-z0-9.-]*doe\.sp\.gov\.br[^"'`\s)]*/gi)) apis.add(m[0]);
  for (const m of js.matchAll(/["'`](\/?v\d\/[^"'`]{3,120})["'`]/g)) apis.add(m[1]);
}
await writeFile('sp-sondas/doe-apis.txt', [...apis].join('\n'));
const T = encodeURIComponent('posto de combustíveis');
await pega('doe-api-adv', `https://do-api-web-search.doe.sp.gov.br/v2/advanced-search/publications?Terms%5B0%5D=${T}&FromDate=2026-11-01&ToDate=2026-11-22&PageNumber=1&PageSize=20`);
await pega('doe-api-adv2', `https://do-api-web-search.doe.sp.gov.br/v2/advanced-search/publications?periodStartingDate=2026-11-01&periodEndingDate=2026-11-22&Terms%5B0%5D=${T}&PageNumber=1&PageSize=20`);
// CETESB
await pega('cetesb-proc', 'https://licenciamento.cetesb.sp.gov.br/cetesb/processo_consulta.asp');
await pega('cetesb-lic', 'https://cetesb.sp.gov.br/licenciamentoambiental/');
await pega('cetesb-busca', 'https://cetesb.sp.gov.br/?s=licen%C3%A7as+emitidas');
await pega('cetesb-postos', 'https://cetesb.sp.gov.br/areas-contaminadas/postos-de-combustiveis/');
await pega('cetesb-portal-lic', 'https://cetesb.sp.gov.br/licenciamento/');
await pega('cetesb-autent', 'https://autenticidade.cetesb.sp.gov.br/');
await pega('qd-sp', 'https://api.queridodiario.org.br/gazettes?querystring=%22posto%20de%20combust%C3%ADveis%22%20CETESB&published_since=2026-08-01&size=5&excerpt_size=500&territory_ids=3550308');
await pega('qd-campinas', 'https://api.queridodiario.org.br/gazettes?querystring=%22posto%20de%20combust%C3%ADveis%22&published_since=2026-08-01&size=5&excerpt_size=500&territory_ids=3509502');
await writeFile('sp-sondas/resumo.tsv', resumo.join('\n') + '\n');

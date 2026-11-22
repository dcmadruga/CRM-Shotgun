import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
await mkdir('sc-sondas', { recursive: true });
const resumo = [];
async function pega(nome, url, opts = {}) {
  try {
    const r = await fetch(url, { headers: { ...UA, ...(opts.headers || {}) }, method: opts.method || 'GET', body: opts.body, signal: AbortSignal.timeout(45000) });
    const t = await r.text();
    await writeFile(`sc-sondas/${nome}.txt`, `${r.status} ${url}\n${[...r.headers].map(h => h.join(': ')).join('\n')}\n\n${t.slice(0, 250000)}`);
    resumo.push(`${nome}\t${r.status}\t${t.length}\t${url}`); return t;
  } catch (e) { resumo.push(`${nome}\tERRO\t${e.message}\t${url}`); return ''; }
}
const CK = 'https://dados.ciga.sc.gov.br/api/3/action/';
const ps = await pega('ckan-pkg', CK + 'package_show?id=domsc-publicacoes-de-10-2026');
await pega('ckan-search', CK + 'package_search?q=domsc-publicacoes&rows=3&sort=metadata_modified%20desc');
try {
  const res = JSON.parse(ps).result.resources;
  for (const [i, r] of res.entries()) {
    if (r.datastore_active) {
      await pega('ckan-ds-' + i, CK + 'datastore_search?resource_id=' + r.id + '&limit=2');
      await pega('ckan-dsq-' + i, CK + 'datastore_search?resource_id=' + r.id + '&q=' + encodeURIComponent('posto de combustíveis') + '&limit=5');
    }
  }
} catch (e) { resumo.push('ckan-parse\tERRO\t' + e.message); }
await pega('dom-home', 'https://diariomunicipal.sc.gov.br/');
await pega('dom-integracao', 'https://diariomunicipal.sc.gov.br/?r=site%2Fpage&view=integracao');
await pega('dom-busca', 'https://diariomunicipal.sc.gov.br/?r=site/index&q=' + encodeURIComponent('"posto de combustíveis"'));
await pega('doe-home', 'https://portal.doe.sea.sc.gov.br/');
await pega('doe-busca', 'https://portal.doe.sea.sc.gov.br/apis/consultar?termo=posto');
await pega('ima-consultas', 'https://consultas.ima.sc.gov.br/');
await pega('ima-home', 'https://www.ima.sc.gov.br/');
await pega('sinfatmun', 'https://sinfatmunicipal.ciga.sc.gov.br/');
const q = new URLSearchParams({ querystring: '"posto de combustíveis"', published_since: '2025-11-22', size: '5', excerpt_size: '400', number_of_excerpts: '2' });
for (const c of ['4205407', '4209102', '4204202', '4202404', '4211900']) q.append('territory_ids', c);
await pega('qd-sc', 'https://api.queridodiario.org.br/gazettes?' + q);
await writeFile('sc-sondas/resumo.tsv', resumo.join('\n') + '\n');

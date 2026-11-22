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
const D = 'https://diariomunicipal.sc.gov.br/';
await pega('dom-lic', D + '?r=site/index&q=' + encodeURIComponent('combustíveis') + '&categoria=' + encodeURIComponent('Licenciamento ambiental') + '&dataInicial=01/08/2026&dataFinal=22/11/2026');
await pega('dom-lic2', D + '?r=site/index&q=' + encodeURIComponent('"posto de combustíveis"') + '&categoria=' + encodeURIComponent('Licenciamento ambiental'));
await pega('dom-ato', D + 'atos/8947782');
await pega('ima-consulta', 'https://consultas.ima.sc.gov.br/consulta');
await pega('ima-relatorio', 'https://consultas.ima.sc.gov.br/relatorio');
await pega('gaia-processos', 'https://gaia.ima.sc.gov.br/web/processos');
await pega('sinfat-consulta', 'https://sinfatmunicipal.ciga.sc.gov.br/consulta');
await pega('sinfat-municipios', 'https://sinfatmunicipal.ciga.sc.gov.br/municipios');
await pega('doe-v2', 'https://portal.doe.sea.sc.gov.br/v2.46.00/');
await writeFile('sc-sondas/resumo.tsv', resumo.join('\n') + '\n');

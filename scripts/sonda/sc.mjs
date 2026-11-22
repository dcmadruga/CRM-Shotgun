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
const cat = '&categoria=' + encodeURIComponent('Licenciamento ambiental');
await pega('dom-c-posto', D + '?r=site/index&q=posto' + cat + '&dataInicial=22/08/2026&dataFinal=22/11/2026');
await pega('dom-c-4232', D + '?r=site/index&q=' + encodeURIComponent('"42.32"') + cat + '&dataInicial=22/08/2026&dataFinal=22/11/2026');
await pega('dom-c-vazio', D + '?r=site/index&q=' + cat + '&dataInicial=15/11/2026&dataFinal=22/11/2026');
await pega('dom-c-posto-p2', D + '?r=site/index&q=posto' + cat + '&dataInicial=22/08/2026&dataFinal=22/11/2026&AtoASolrDocument_page=2');
await pega('dom-ato-lic', D + 'atos/8758649');
const S = 'https://sinfatmunicipal.ciga.sc.gov.br/consulta';
await pega('sinfat-form-mes', S + '?status=formalizado&periodo=mes');
await pega('sinfat-emit-semana', S + '?status=emitido&periodo=semana');
await pega('sinfat-razao-posto', S + '?empto_razao=posto&periodo=ano');
await pega('sinfat-razao-comb', S + '?empto_razao=combustiveis&periodo=ano');
await writeFile('sc-sondas/resumo.tsv', resumo.join('\n') + '\n');

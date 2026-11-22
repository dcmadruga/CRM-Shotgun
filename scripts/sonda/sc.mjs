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
const S = 'https://sinfatmunicipal.ciga.sc.gov.br/';
await pega('sinfat-det-1', S + 'consulta_requerimento/135719');
await pega('sinfat-det-2', S + 'consulta_requerimento/134349');
await pega('sinfat-det-3', S + 'consulta_requerimento/132604');
await pega('sinfat-p2', S + 'consulta?empto_razao=posto&periodo=ano&pagina=2');
await pega('sinfat-ano-esp', S + 'consulta?empto_razao=posto&periodo=ano_especifico&ano=2025');
await pega('sinfat-mun', S + 'municipios');
await writeFile('sc-sondas/resumo.tsv', resumo.join('\n') + '\n');

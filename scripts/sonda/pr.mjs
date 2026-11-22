// sonda temporária das fontes do PR (removida antes do PR)
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
await mkdir('pr-sondas', { recursive: true });
const resumo = [];
async function pega(nome, url, opts = {}) {
  try {
    const r = await fetch(url, { headers: { ...UA, ...(opts.headers || {}) }, method: opts.method || 'GET', body: opts.body, redirect: 'follow', signal: AbortSignal.timeout(45000) });
    const t = await r.text();
    await writeFile(`pr-sondas/${nome}.txt`, `${r.status} ${r.url}\n${[...r.headers].map(h => h.join(': ')).join('\n')}\n\n${t.slice(0, 250000)}`);
    resumo.push(`${nome}\t${r.status}\t${t.length}\t${r.url}`); return t;
  } catch (e) { resumo.push(`${nome}\tERRO\t${e.message}\t${url}`); return ''; }
}
const AMP = 'https://www.diariomunicipal.com.br/amp/';
const q = (t) => `${AMP}pesquisar?busca_avancada%5Btexto%5D=${encodeURIComponent(t)}&busca_avancada%5BdataInicio%5D=2026-05-01&busca_avancada%5BdataFim%5D=2026-11-21&busca_avancada%5Bpagina%5D=1`;
const D = 'https://dioe.pr.gov.br';
const B = (q, pag = 0) => `${D}/busca/busca/buscar/query/${pag}/di:2026-08-01/df:2026-11-21/?1=1&q=${encodeURIComponent(q)}`;
await pega('dioe-q1', B('"posto de combustíveis"'));
await pega('dioe-q2', B('"comércio varejista de combustíveis"'));
await pega('dioe-q3', B('"Instituto Água e Terra" licença posto'));
await pega('dioe-q1p2', B('"posto de combustíveis"', 1));
await writeFile('pr-sondas/resumo.tsv', resumo.join('\n') + '\n');

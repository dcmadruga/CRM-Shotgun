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
const D = 'https://www.dioe.pr.gov.br';
await pega('dioe-homejs', D + '/theme/Parana2/js/home.js');
const form = new URLSearchParams({ q: 'posto de combustíveis licença', tipo: '', dataInicial: '01/09/2026', dataFinal: '21/11/2026' });
await pega('dioe-busca-post', D + '/buscanova', { method: 'POST', body: form.toString(), headers: { 'content-type': 'application/x-www-form-urlencoded' } });
await pega('dioe-busca-get', D + '/buscanova?q=' + encodeURIComponent('"posto de combustíveis"'));
await pega('dioe-listagem', D + '/listagem');
await pega('qd-curitiba', 'https://api.queridodiario.org.br/gazettes?querystring=%22posto%20de%20combust%C3%ADveis%22&published_since=2026-05-01&size=5&territory_ids=4106902&excerpt_size=500');
await writeFile('pr-sondas/resumo.tsv', resumo.join('\n') + '\n');

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
await pega('noticia-dioe-nova', 'https://www.parana.pr.gov.br/aen/Noticia/Estado-moderniza-Diario-Oficial-com-nova-plataforma-digital-e-amplia-transparencia');
await pega('servico-dioe', 'https://www.parana.pr.gov.br/servicos/Administracao/Transparencia/Consultar-o-Diario-Oficial-do-Estado-DIOE-Epol8QoB');
await pega('dioe-http', 'http://www.documentos.dioe.pr.gov.br/');
await pega('dioe-raiz', 'https://www.dioe.pr.gov.br/');
await pega('dioe-raiz2', 'https://dioe.pr.gov.br/');
await pega('diariooficial-pr', 'https://www.diariooficial.pr.gov.br/');
await pega('qd-curitiba', 'https://api.queridodiario.org.br/gazettes?querystring=%22posto%20de%20combust%C3%ADveis%22&published_since=2026-05-01&size=5&territory_ids=4106902&excerpt_size=500');
await pega('qd-pr-cidades', 'https://api.queridodiario.org.br/cities?levels=3');
await pega('amp-licenca', q('"licença prévia" posto'));
await pega('amp-licenca2', q('"licença de instalação" combustíveis'));
await pega('amp-meio', q('"meio ambiente" "posto de combustíveis" licença'));
await writeFile('pr-sondas/resumo.tsv', resumo.join('\n') + '\n');

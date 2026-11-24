// sonda temporária das fontes de SE, PA, TO e RO (removida antes do PR)
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
await mkdir('n-sondas', { recursive: true });
const resumo = [];
async function pega(nome, url, opts = {}) {
  try {
    const r = await fetch(url, { headers: { ...UA, ...(opts.headers || {}) }, method: opts.method || 'GET', body: opts.body, redirect: 'follow', signal: AbortSignal.timeout(45000) });
    const buf = Buffer.from(await r.arrayBuffer()); const ct = r.headers.get('content-type') || '';
    const t = /pdf|octet/.test(ct) ? `[binário ${ct} ${buf.length} bytes] ` + buf.slice(0, 400).toString('latin1') : buf.toString('utf8');
    await writeFile(`n-sondas/${nome}.txt`, `${r.status} ${r.url}\n${ct}\n\n${t.slice(0, 300000)}`);
    resumo.push(`${nome}\t${r.status}\t${buf.length}\t${ct.slice(0, 30)}\t${r.url}`); return t;
  } catch (e) { resumo.push(`${nome}\tERRO\t${e.message}\t${url}`); return ''; }
}
const L = [
  ['adema-home', 'https://licenciamento.adema.se.gov.br/'],
  ['adema-lic', 'https://licenciamento.adema.se.gov.br/download-licenca/0000145099'],
  ['adema-site', 'https://adema.se.gov.br/'],
  ['adema-consulta', 'https://licenciamento.adema.se.gov.br/consulta-licenca'],
  ['adema-publicacoes', 'https://licenciamento.adema.se.gov.br/publicacoes'],
  ['doe-se', 'https://www.segrase.se.gov.br/'],
  ['doe-se2', 'https://iose.se.gov.br/'],
  ['ioepa', 'https://www.ioepa.com.br/'],
  ['ioepa-busca', 'https://www.ioepa.com.br/busca/?q=posto+de+combust%C3%ADveis'],
  ['semas', 'https://www.semas.pa.gov.br/'],
  ['simlam', 'https://monitoramento.semas.pa.gov.br/simlam/'],
  ['semas-transp', 'https://www.semas.pa.gov.br/transparencia/'],
  ['doe-to', 'https://diariooficial.to.gov.br/'],
  ['doe-to-busca', 'https://diariooficial.to.gov.br/busca?texto=posto+de+combust%C3%ADveis'],
  ['naturatins', 'https://www.to.gov.br/naturatins'],
  ['sigam-to', 'https://sigam.to.gov.br/'],
  ['doe-ro', 'https://diof.ro.gov.br/'],
  ['doe-ro-busca', 'https://diof.ro.gov.br/busca/?q=posto+de+combust%C3%ADveis'],
  ['sedam', 'https://www.sedam.ro.gov.br/'],
  ['sedam-lic', 'https://sistemas.sedam.ro.gov.br/'],
  ['famep', 'https://www.diariomunicipal.com.br/famep/pesquisar?busca_avancada%5Btexto%5D=%22posto+de+combust%C3%ADveis%22&busca_avancada%5BdataInicio%5D=2026-05-01&busca_avancada%5BdataFim%5D=2026-11-23&busca_avancada%5Bpagina%5D=1'],
  ['arom', 'https://www.diariomunicipal.com.br/arom/pesquisar?busca_avancada%5Btexto%5D=%22posto+de+combust%C3%ADveis%22&busca_avancada%5BdataInicio%5D=2026-05-01&busca_avancada%5BdataFim%5D=2026-11-23&busca_avancada%5Bpagina%5D=1'],
  ['atm', 'https://www.diariomunicipal.com.br/atm/pesquisar?busca_avancada%5Btexto%5D=%22posto+de+combust%C3%ADveis%22&busca_avancada%5BdataInicio%5D=2026-05-01&busca_avancada%5BdataFim%5D=2026-11-23&busca_avancada%5Bpagina%5D=1'],
  ['fames', 'https://www.diariomunicipal.com.br/fames/'],
  ['sigpub-lista', 'https://www.diariomunicipal.com.br/'],
  ['qd-cities', 'https://api.queridodiario.org.br/cities?levels=1,2,3'],
  ['qd-pa', 'https://api.queridodiario.org.br/gazettes?querystring=%22posto%20de%20combust%C3%ADveis%22&published_since=2026-06-01&size=2&territory_ids=1501402'],
];
for (const [n, u] of L) await pega(n, u);
await writeFile('n-sondas/resumo.tsv', resumo.join('\n') + '\n');

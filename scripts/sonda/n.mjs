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
  ['ioepa-pesq', 'http://www.ioepa.com.br/pesquisa'],
  ['ioepa-pesq2', 'https://www.ioepa.com.br/pesquisa/'],
  ['diof-wpsearch', 'https://diof.ro.gov.br/wp-json/wp/v2/search?search=posto%20de%20combust%C3%ADveis&per_page=5'],
  ['diof-busca-js', 'https://diof.ro.gov.br/busca/?q=posto'],
  ['qd-pvh', 'https://api.queridodiario.org.br/gazettes?querystring=combust%C3%ADveis&published_since=2026-01-01&size=2&territory_ids=1100205'],
  ['qd-palmas', 'https://api.queridodiario.org.br/gazettes?querystring=combust%C3%ADveis&published_since=2026-01-01&size=2&territory_ids=1721000'],
  ['qd-aracaju', 'https://api.queridodiario.org.br/gazettes?querystring=combust%C3%ADveis&published_since=2026-01-01&size=2&territory_ids=2800308'],
  ['qd-belem', 'https://api.queridodiario.org.br/gazettes?querystring=combust%C3%ADveis&published_since=2026-01-01&size=2&territory_ids=1501402'],
  ['qd-cities', 'https://api.queridodiario.org.br/cities?levels=3'],
  ['sergipe-sigpub', 'https://www.diariomunicipal.com.br/sergipe/pesquisar?busca_avancada%5Btexto%5D=%22licen%C3%A7a%22+combust%C3%ADveis&busca_avancada%5BdataInicio%5D=2025-11-24&busca_avancada%5BdataFim%5D=2026-11-24&busca_avancada%5Bpagina%5D=1'],
  ['famep-lic', 'https://www.diariomunicipal.com.br/famep/pesquisar?busca_avancada%5Btexto%5D=%22licen%C3%A7a%22+combust%C3%ADveis&busca_avancada%5BdataInicio%5D=2025-11-24&busca_avancada%5BdataFim%5D=2026-11-24&busca_avancada%5Bpagina%5D=1'],
  ['arom-lic', 'https://www.diariomunicipal.com.br/arom/pesquisar?busca_avancada%5Btexto%5D=%22licen%C3%A7a%22+combust%C3%ADveis&busca_avancada%5BdataInicio%5D=2025-11-24&busca_avancada%5BdataFim%5D=2026-11-24&busca_avancada%5Bpagina%5D=1'],
];
// por que SE e TO falham
for (const u of ['https://licenciamento.adema.se.gov.br/', 'https://diariooficial.to.gov.br/', 'https://www.to.gov.br/naturatins', 'https://iose.se.gov.br/portal/']) {
  try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) }); resumo.push(`causa ${u}\t${r.status}`); }
  catch (e) { resumo.push(`causa ${u}\t${e.message}\t${e.cause?.code || ''} ${e.cause?.message || ''}`); }
}
const sim = await pega('simlam', 'https://monitoramento.semas.pa.gov.br/simlam/');
resumo.push('simlam links: ' + [...sim.matchAll(/href="([^"#]+)"/g)].map(m => m[1]).filter(h => !/\.(css|js|png|ico)/.test(h)).join(' '));
const busca = await pega('diof-busca', 'https://diof.ro.gov.br/busca/?q=posto');
resumo.push('diof scripts: ' + [...busca.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(m => m[1]).join(' '));
resumo.push('diof apis: ' + [...new Set([...busca.matchAll(/https?:\/\/[a-z0-9.-]*ro\.gov\.br\/[^"' <)]*api[^"' <)]*/gi)].map(m => m[0]))].join(' '));
for (const [n, u] of L) await pega(n, u);
await writeFile('n-sondas/resumo.tsv', resumo.join('\n') + '\n');

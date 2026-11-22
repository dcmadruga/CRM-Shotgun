// Sonda temporária: testa fontes oficiais do RS a partir do GitHub Actions e salva as respostas em rs-sondas/.
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
const q = encodeURIComponent;
const urls = {
  'doe-home': 'https://www.diariooficial.rs.gov.br/',
  'doe-busca': 'https://www.diariooficial.rs.gov.br/busca?td=&pc=' + q('posto de combustíveis'),
  'famurs-home': 'https://www.diariomunicipal.com.br/famurs/',
  'famurs-busca': 'https://www.diariomunicipal.com.br/famurs/pesquisar?busca_avancada%5Btexto%5D=' + q('"posto de combustíveis"') + '&busca_avancada%5BdataInicio%5D=2026-08-01&busca_avancada%5BdataFim%5D=2026-11-22&busca_avancada%5Bpagina%5D=1',
  'famurs-busca2': 'https://www.diariomunicipal.com.br/famurs/pesquisar?busca_avancada%5Btexto%5D=' + q('comércio varejista de combustíveis') + '&busca_avancada%5BdataInicio%5D=2026-08-01&busca_avancada%5BdataFim%5D=2026-11-22&busca_avancada%5Bpagina%5D=1',
  'qd-cidades': 'https://api.queridodiario.ok.org.br/cities?levenshtein_distance=0&city_name=',
  'qd-busca': 'https://api.queridodiario.ok.org.br/gazettes?querystring=' + q('"posto de combustíveis"') + '&published_since=2026-08-01&size=20&excerpt_size=600&number_of_excerpts=3&territory_ids=4314902',
  'fepam-home': 'https://www.fepam.rs.gov.br/',
  'fepam-ww3': 'http://ww3.fepam.rs.gov.br/licenciamento/area4/consulta.asp',
  'fepam-licencas': 'https://fepam.rs.gov.br/licenciamento-ambiental',
  'sol-home': 'https://secweb.procergs.com.br/sra/',
  'sol-publico': 'https://secweb.procergs.com.br/sra/public/consultaLicencas.xhtml',
};
await mkdir('rs-sondas', { recursive: true });
const resumo = [];
for (const [k, u] of Object.entries(urls)) {
  try {
    const r = await fetch(u, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(45000) });
    const t = await r.text();
    await writeFile(`rs-sondas/${k}.txt`, t.slice(0, 400000));
    resumo.push(`${k}\t${r.status}\t${r.headers.get('content-type')}\t${t.length}\t${r.url}`);
  } catch (e) { resumo.push(`${k}\tERRO\t${e.message} ${e.cause?.code || ''}\t\t${u}`); }
}
await writeFile('rs-sondas/resumo.tsv', resumo.join('\n') + '\n');
console.log(resumo.join('\n'));

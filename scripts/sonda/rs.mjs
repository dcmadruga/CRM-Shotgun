// Sonda temporária: testa fontes oficiais do RS a partir do GitHub Actions e salva as respostas em rs-sondas/.
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
const q = encodeURIComponent;
const famurs = t => 'https://www.diariomunicipal.com.br/famurs/pesquisar?busca_avancada%5Btexto%5D=' + q(t) + '&busca_avancada%5BdataInicio%5D=2026-05-01&busca_avancada%5BdataFim%5D=2026-11-22&busca_avancada%5Bpagina%5D=1';
const urls = {
  'doe-main': 'https://www.diariooficial.rs.gov.br/main-WOM4SM2S.js',
  'doe-rss': 'https://www.diariooficial.rs.gov.br/doe/materias/feed/rss.xml',
  'famurs-lp': famurs('licença combustíveis'),
  'famurs-posto-lic': famurs('posto licença instalação'),
  'famurs-materia': 'https://www.diariomunicipal.com.br/famurs/materia/3FC78255',
  'fepam-consproc': 'https://www.fepam.rs.gov.br/ar-consulta-processos-licenciamento-ambiental',
  'fepam-placa': 'https://www.fepam.rs.gov.br/ar-consulta-licenca-por-placa',
  'qd2-cidades': 'https://queridodiario.ok.org.br/api/cities?levenshtein_distance=0&city_name=',
  'qd2-busca': 'https://queridodiario.ok.org.br/api/gazettes?querystring=' + q('"posto de combustíveis"') + '&published_since=2026-06-01&size=20&excerpt_size=600&number_of_excerpts=3&territory_ids=4314902',
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

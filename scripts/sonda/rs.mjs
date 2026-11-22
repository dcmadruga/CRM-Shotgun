// Sonda temporária: testa fontes oficiais do RS a partir do GitHub Actions e salva as respostas em rs-sondas/.
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
const q = encodeURIComponent;
const F = 'https://ww3.fepam.rs.gov.br/licenciamento/';
const post = body => ({ method: 'POST', body: new URLSearchParams(body).toString(), headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', referer: F + 'Area1/default.asp' } });
const urls = {};
try {
  await mkdir('rs-sondas', { recursive: true });
  const env = await (await fetch('https://www.diariooficial.rs.gov.br/environments/environment.json', { headers: UA })).json();
  await writeFile('rs-sondas/doe-env.json', JSON.stringify(env, null, 1));
  const API = env.restEndPoint;
  const res = {};
  for (const [k, qs] of Object.entries({ req: 'requereu licença posto combustíveis', tp: 'torna público licença instalação posto combustível', lo: 'licença de operação posto de abastecimento' })) {
    const u = API + 'public/materias/?page=1&tipoDiario=DOE&queryString=' + q(qs) + '&dataIni=2026-05-01&dataFim=2026-11-22';
    const r = await fetch(u, { headers: UA }); const d = await r.json(); res[k] = d;
    await writeFile(`rs-sondas/doe2-${k}.json`, JSON.stringify(d, null, 1).slice(0, 300000));
  }
  const id = res.req.collection?.[0]?.id; if (id) await writeFile('rs-sondas/doe2-materia.json', await (await fetch(API + 'public/materias/' + id, { headers: UA })).text());
  const fam = t => 'https://www.diariomunicipal.com.br/famurs/pesquisar?busca_avancada%5Btexto%5D=' + q(t) + '&busca_avancada%5BdataInicio%5D=2026-01-01&busca_avancada%5BdataFim%5D=2026-11-22&busca_avancada%5Bpagina%5D=1';
  for (const [k, t] of Object.entries({ req: 'requereu licença combustíveis', lic: 'licença ambiental posto' })) await writeFile(`rs-sondas/fam2-${k}.html`, await (await fetch(fam(t), { headers: UA })).text());
  const qd = 'https://api.queridodiario.org.br/gazettes?querystring=' + q('"posto de combustíveis" + "licença de instalação"') + '&published_since=2026-01-01&size=30&excerpt_size=700&number_of_excerpts=2';
  await writeFile('rs-sondas/qd2.json', await (await fetch(qd, { headers: UA })).text());
} catch (e) { console.log('doe js', e.message); }
await mkdir('rs-sondas', { recursive: true });
const resumo = [];
for (const [k, u] of Object.entries(urls)) {
  try {
    const [uu, op] = Array.isArray(u) ? u : [u, { headers: UA }]; const r = await fetch(uu, { ...op, redirect: 'follow', signal: AbortSignal.timeout(60000) });
    const buf = Buffer.from(await r.arrayBuffer()); const t = (r.headers.get('content-type') || '').includes('8859') || uu.includes('fepam') ? new TextDecoder('latin1').decode(buf) : buf.toString('utf8');
    await writeFile(`rs-sondas/${k}.txt`, t.slice(0, 400000));
    resumo.push(`${k}\t${r.status}\t${r.headers.get('content-type')}\t${t.length}\t${r.url}`);
  } catch (e) { resumo.push(`${k}\tERRO\t${e.message} ${e.cause?.code || ''}\t\t${u}`); }
}
await writeFile('rs-sondas/resumo.tsv', resumo.join('\n') + '\n');
console.log(resumo.join('\n'));

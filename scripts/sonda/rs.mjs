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
  for (const [k, qs] of Object.entries({ posto: '"posto de combustíveis"', varej: '"comércio varejista de combustíveis"', fepam: 'FEPAM licença posto', lp: '"licença prévia" combustíveis' })) {
    for (const datas of ['', '&dataIni=01-08-2026&dataFim=22-11-2026', '&dataIni=2026-08-01&dataFim=2026-11-22']) {
      const u = API + 'public/materias/?page=1&tipoDiario=DOE&queryString=' + q(qs) + datas;
      try { const r = await fetch(u, { headers: UA }); const t = await r.text(); await writeFile(`rs-sondas/doe-m-${k}${datas ? (datas.includes('-2026&') && datas.startsWith('&dataIni=01') ? '-br' : '-iso') : ''}.json`, `${r.status} ${u}\n` + t.slice(0, 200000)); } catch (e) { await writeFile(`rs-sondas/doe-m-${k}-erro.txt`, e.message + ' ' + u); }
    }
  }
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

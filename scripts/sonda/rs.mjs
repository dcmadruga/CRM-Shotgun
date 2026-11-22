// Sonda temporária: testa fontes oficiais do RS a partir do GitHub Actions e salva as respostas em rs-sondas/.
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
const q = encodeURIComponent;
const F = 'https://ww3.fepam.rs.gov.br/licenciamento/';
const post = body => ({ method: 'POST', body: new URLSearchParams(body).toString(), headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', referer: F + 'Area1/default.asp' } });
const urls = {};
try {
  const js = await (await fetch('https://www.diariooficial.rs.gov.br/main-WOM4SM2S.js', { headers: UA })).text();
  await mkdir('rs-sondas', { recursive: true });
  const pega = re => [...js.matchAll(re)].slice(0, 80).map(m => m[0]).join('\n=====\n');
  await writeFile('rs-sondas/doe-http.txt', pega(/.{0,160}\.http\.(?:get|post)\(.{0,220}/g));
  await writeFile('rs-sondas/doe-svc.txt', pega(/.{0,100}(?:consultarUltimos|sumario\(|pesquisarMaterias|buscar\(|apiUrl|baseUrl|urlApi|environment).{0,260}/g));
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

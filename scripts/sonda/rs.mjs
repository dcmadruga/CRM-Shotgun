// Sonda temporária: testa fontes oficiais do RS a partir do GitHub Actions e salva as respostas em rs-sondas/.
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
const q = encodeURIComponent;
const F = 'https://ww3.fepam.rs.gov.br/licenciamento/';
const post = body => ({ method: 'POST', body: new URLSearchParams(body).toString(), headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', referer: F + 'Area1/default.asp' } });
const urls = {
  'qd-busca-rs': 'https://api.queridodiario.org.br/gazettes?querystring=' + q('"posto de combustíveis" licença') + '&published_since=2026-05-01&size=30&excerpt_size=800&number_of_excerpts=2&territory_ids=4314902&territory_ids=4305108&territory_ids=4304606&territory_ids=4314407&territory_ids=4316907&territory_ids=4309209',
  'famurs-materia2': 'https://www.diariomunicipal.com.br/famurs/materia/A3C22DCD',
  'sol-public': 'https://secweb.procergs.com.br/sra/public/',
  'sol-consulta': 'https://secweb.procergs.com.br/sra/publico/consultaDocumentos.xhtml',
};
// endpoints do app do DOE-RS (Angular)
try {
  const js = await (await fetch('https://www.diariooficial.rs.gov.br/main-WOM4SM2S.js', { headers: UA })).text();
  const achados = [...new Set([...js.matchAll(/["'`]((?:https?:\/\/[^"'`\s]{3,90})|(?:\/[a-z0-9_\-]+(?:\/[a-zA-Z0-9_\-${}.]+){1,6}))["'`]/g)].map(m => m[1]).filter(x => /api|doe|busca|materia|pesquis|diario|edic|ato|caderno/i.test(x)))];
  await mkdir('rs-sondas', { recursive: true });
  await writeFile('rs-sondas/doe-endpoints.txt', achados.join('\n'));
  const i = js.search(/busca|pesquisa/i); await writeFile('rs-sondas/doe-trechos.txt', [...js.matchAll(/.{0,200}(?:materias\/|\/busca|pesquisa)[^]{0,200}/gi)].slice(0, 60).map(m => m[0]).join('\n=====\n'));
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

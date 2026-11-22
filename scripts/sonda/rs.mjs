// Sonda temporária: testa fontes oficiais do RS a partir do GitHub Actions e salva as respostas em rs-sondas/.
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
const q = encodeURIComponent;
const F = 'https://ww3.fepam.rs.gov.br/licenciamento/';
const post = body => ({ method: 'POST', body: new URLSearchParams(body).toString(), headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', referer: F + 'Area1/default.asp' } });
const corpo = { buscar: '1', tamanho: '', tipoBusca: 'muni', estado: 'RS', municipio: '4314902', razao: 'POSTO', atividade: '' };
const urls = {
  'fepam-pal': F + 'area1/popup3.asp?t=0&palavra=' + q('combust'),
  'fepam-pal2': [F + 'area1/popup3.asp?t=0', post({ palavra: 'combustiveis' })],
  'fepam-l-A3': ['https://ww3.fepam.rs.gov.br/licenciamento/Area3/lista2.asp', post(corpo)],
  'fepam-l-up': ['https://ww3.fepam.rs.gov.br/LICENCIAMENTO/area3/lista2.asp', post(corpo)],
  'fepam-l-get': 'https://ww3.fepam.rs.gov.br/licenciamento/area3/lista2.asp?' + new URLSearchParams(corpo),
  'fepam-area3': 'https://ww3.fepam.rs.gov.br/licenciamento/area3/',
};
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

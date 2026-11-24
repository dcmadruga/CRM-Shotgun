// sonda temporária (removida antes do PR)
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
await mkdir('n-sondas', { recursive: true });
const resumo = [];
async function pega(nome, url, opts = {}) {
  try {
    const r = await fetch(url, { headers: { ...UA, ...(opts.headers || {}) }, method: opts.method || 'GET', body: opts.body, redirect: 'follow', signal: AbortSignal.timeout(45000) });
    const t = await r.text();
    await writeFile(`n-sondas/${nome}.txt`, `${r.status} ${r.url}\n\n${t.slice(0, 300000)}`);
    resumo.push(`${nome}\t${r.status}\t${t.length}\t${r.url}`); return t;
  } catch (e) { resumo.push(`${nome}\tERRO\t${e.message} ${e.cause?.code || ''}\t${url}`); return ''; }
}
for (const [n, u] of [
  ['sedam-transp', 'https://transparencia.sedam.ro.gov.br/'],
  ['solar', 'https://solar.sistemas.ro.gov.br/'],
  ['diof-s', 'https://diof.ro.gov.br/?s=posto+de+combust%C3%ADveis'],
  ['semas-transp', 'http://portaldatransparencia.semas.pa.gov.br/'],
  ['simlam-proc', 'https://monitoramento.semas.pa.gov.br/simlam/ListarProcessos.aspx'],
  ['simlam-doc', 'https://monitoramento.semas.pa.gov.br/simlam/ListarDocumentos.aspx'],
  ['simlam-emp', 'https://monitoramento.semas.pa.gov.br/simlam/ListarEmpreendimento.aspx'],
]) await pega(n, u);
for (const [n, q] of [['ioepa-q1', 'posto de combustíveis'], ['ioepa-q2', 'SEMAS licença combustíveis']]) {
  const fd = new URLSearchParams({ InputTexto: q, InputDataInicial: '01/09/2026', InputDataFinal: '23/11/2026' });
  await pega(n, 'https://www.ioepa.com.br/pesquisa/resultado/QueryTexto', { method: 'POST', body: fd, headers: { 'content-type': 'application/x-www-form-urlencoded' } });
}
await writeFile('n-sondas/resumo.tsv', resumo.join('\n') + '\n');

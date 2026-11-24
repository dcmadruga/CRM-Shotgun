// sonda temporária (removida antes do PR)
import { mkdir, writeFile } from 'node:fs/promises';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
await mkdir('n-sondas', { recursive: true });
const B = 'https://monitoramento.semas.pa.gov.br/simlam/';
let cookie = '';
async function req(u, body) {
  const r = await fetch(u, { method: body ? 'POST' : 'GET', body, headers: { ...UA, cookie, ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
  const sc = r.headers.getSetCookie?.() || []; if (sc.length) cookie = sc.map(c => c.split(';')[0]).join('; ');
  return r.text();
}
const campos = h => { const f = new URLSearchParams(); for (const m of h.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) { const n = (m[0].match(/name="([^"]+)"/) || [])[1], v = (m[0].match(/value="([^"]*)"/) || [, ''])[1]; if (n) f.set(n, v.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')); } return f; };
for (const termo of ['posto', 'combustíveis']) {
  const h = await req(B + 'ListarProcessos.aspx');
  const f = campos(h); f.set('__EVENTTARGET', 'ctl00$baseBody$btnPesquisa'); f.set('ctl00$baseBody$txtBusca', termo);
  const r = await req(B + 'ListarProcessos.aspx', f);
  await writeFile(`n-sondas/proc-${termo.slice(0, 5)}.txt`, r);
  const ids = [...r.matchAll(/abrirProcesso\((\d+)\)/g)].map(m => m[1]);
  await writeFile(`n-sondas/proc-${termo.slice(0, 5)}-ids.txt`, ids.join('\n'));
  if (ids[0]) await writeFile(`n-sondas/vis-${termo.slice(0, 5)}.txt`, await req(B + `VisualizarProcesso.aspx?UrlRetorno=ListarProcessos.aspx&id=${ids[0]}`));
}

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
const linhas = h => [...h.matchAll(/abrirProcesso\((\d+)\)[^]*?<\/tr>/g)].length;
const tab = h => h.replace(/<(script|style)[^]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' | ').replace(/\s+/g, ' ').replace(/(\|\s*)+/g, '| ');
const out = [];
// a) busca simples + ordenar por número (2 cliques)
let h = await req(B + 'ListarProcessos.aspx');
let f = campos(h); f.set('__EVENTTARGET', 'ctl00$baseBody$btnPesquisa'); f.set('ctl00$baseBody$txtBusca', 'posto');
h = await req(B + 'ListarProcessos.aspx', f);
for (let k = 1; k <= 2; k++) { f = campos(h); f.set('__EVENTTARGET', 'ctl00$baseBody$gv$ctl02$lkbtnNumeroProcesso'); f.set('ctl00$baseBody$txtBusca', 'posto'); h = await req(B + 'ListarProcessos.aspx', f); const t = tab(h); const i = t.indexOf('Foram encontrados'); out.push(`ORDENA ${k}: ` + t.slice(i, i + 900)); }
// b) busca avançada: número 2026 + empreendimento posto
h = await req(B + 'ListarProcessos.aspx');
f = campos(h); f.set('__EVENTTARGET', 'ctl00$baseBody$btnBuscaAvancada'); f.set('ctl00$baseBody$txtNumeroDocumento', '2026'); f.set('ctl00$baseBody$txtNomeEmpreendimento', 'posto');
h = await req(B + 'ListarProcessos.aspx', f); { const t = tab(h); const i = t.indexOf('Foram encontrados'); out.push('AVANCADA 2026+posto: ' + t.slice(i, i + 900)); }
// c) avançada: só tipo Primeiro Licenciamento? (valor do option)
const ids = [...h.matchAll(/abrirProcesso\((\d+)\)/g)].map(m => m[1]);
if (ids[0]) { const v = tab(await req(B + `VisualizarProcesso.aspx?UrlRetorno=ListarProcessos.aspx&id=${ids[0]}`)); const i = v.indexOf('Número do Processo'); out.push('VIS: ' + v.slice(i, i + 2500)); }
await writeFile('n-sondas/simlam.txt', out.join('\n\n'));

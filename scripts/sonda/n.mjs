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
const tab = h => h.replace(/<(script|style)[^]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' | ').replace(/\s+/g, ' ').replace(/(\|\s*)+/g, '| ');
const out = [];
let h = await req(B + 'ListarProcessos.aspx');
out.push('INPUTS: ' + [...h.matchAll(/<(input|select)[^>]*name="([^"]+)"[^>]*>/g)].map(m => m[1] + ':' + m[2]).join(' ; '));
out.push('SELECTS: ' + [...h.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([^]*?)<\/select>/g)].map(m => m[1] + ' = ' + [...m[2].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)/g)].map(o => o[1] + '/' + o[2]).join(', ')).join('\n'));
async function avancada(ano, nome) {
  let h = await req(B + 'ListarProcessos.aspx');
  let f = campos(h); f.set('__EVENTTARGET', 'ctl00$baseBody$btnBuscaAvancada'); f.set('ctl00$baseBody$txtNumeroDocumento', ano); f.set('ctl00$baseBody$txtNomeEmpreendimento', nome);
  h = await req(B + 'ListarProcessos.aspx', f);
  const total = (tab(h).match(/Foram encontrados (\d+)/) || [])[1];
  const ids = [...h.matchAll(/abrirProcesso\((\d+)\)/g)].map(m => m[1]);
  const pager = [...h.matchAll(/__doPostBack\(&#39;([^&]+)&#39;,&#39;([^&]*)&#39;\)[^>]*>([^<]*)</g)].map(m => m[1] + '|' + m[2] + '|' + m[3]);
  return { h, total, ids, pager, f };
}
for (const [a, n] of [['2026', 'posto'], ['2025', 'posto'], ['2026', 'combust'], ['2026', 'petro']]) { const r = await avancada(a, n); out.push(`AV ${a} ${n}: total ${r.total} ids ${r.ids.length} pager ${r.pager.join(' ; ')}`); }
// paginação 2026 posto
const r = await avancada('2026', 'posto'); let h2 = r.h; const todos = [...r.ids];
for (let p = 2; p <= 12; p++) {
  const alvo = [...h2.matchAll(/__doPostBack\(&#39;([^&]+)&#39;,&#39;([^&]*)&#39;\)[^>]*>\s*(\d+)\s*</g)].find(m => +m[3] === p);
  if (!alvo) { out.push('sem pager para ' + p); break; }
  const f = campos(h2); f.set('__EVENTTARGET', alvo[1]); f.set('__EVENTARGUMENT', alvo[2]); f.set('ctl00$baseBody$txtNumeroDocumento', '2026'); f.set('ctl00$baseBody$txtNomeEmpreendimento', 'posto');
  h2 = await req(B + 'ListarProcessos.aspx', f);
  const ids = [...h2.matchAll(/abrirProcesso\((\d+)\)/g)].map(m => m[1]); out.push(`PAG ${p}: ${ids.join(',')}`); todos.push(...ids);
}
out.push('TOTAL IDS ' + new Set(todos).size);
for (const id of [...new Set(todos)].slice(0, 25)) {
  const v = tab(await req(B + `VisualizarProcesso.aspx?UrlRetorno=ListarProcessos.aspx&id=${id}`));
  const pega = (a, b) => { const i = v.indexOf(a); if (i < 0) return ''; const j = b ? v.indexOf(b, i) : i + 300; return v.slice(i, j > i ? Math.min(j, i + 700) : i + 300); };
  out.push(`VIS ${id}: ${pega('Número do Processo', 'Movimentação')} || ${pega('Atividades Licenciadas', 'Responsáveis')} || ${pega('Títulos emitidos', 'Pendências')} || datas ${(v.match(/\d{2}\/\d{2}\/\d{4}/g) || []).slice(-1)}`);
}
const v0 = await req(B + `VisualizarProcesso.aspx?UrlRetorno=ListarProcessos.aspx&id=${todos[0]}`);
out.push('HTML0: ' + v0.replace(/<(script|style)[^]*?<\/\1>/g, '').replace(/\s+/g, ' ').slice(0, 9000));
await writeFile('n-sondas/simlam.txt', out.join('\n\n'));

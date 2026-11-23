// sonda temporária (removida antes do PR)
import { mkdir, writeFile } from 'node:fs/promises';
import { texto } from '../radar/fontes/doesp.mjs';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
await mkdir('sp-sondas', { recursive: true });
const API = 'https://do-api-web-search.doe.sp.gov.br/';
const out = {};
for (const termo of ['faz publicar a(s) licença', 'faz publicar', 'Resolução SIMA nº 07', 'torna público que concedeu']) {
  const r = await fetch(`${API}v2/advanced-search/publications?Terms%5B0%5D=${encodeURIComponent(termo)}&FromDate=2025-11-23&ToDate=2026-11-23&PageNumber=1&PageSize=100`, { headers: UA }); const j = await r.json();
  out[termo] = { total: j.totalItems, itens: (j.items || []).map(i => ({ d: i.date.slice(0, 10), id: i.id, h: i.hierarchy.split(' > ').pop(), t: i.title, e: i.excerpt.slice(0, 200) })) };
}
await writeFile('sp-sondas/busca.json', JSON.stringify(out, null, 1));
const ids = [...new Set(Object.values(out).flatMap(o => o.itens.filter(i => /Companhia Ambiental/.test(i.h)).map(i => i.id)))].slice(0, 6);
for (const id of ids) { const r = await fetch(`${API}v2/publications/${id}`, { headers: UA }); const j = await r.json(); await writeFile(`sp-sondas/pub-${id}.txt`, `${j.date} ${j.title}\n${texto(j.content)}`); }

// sonda temporária: DOE-RS além das 30 páginas e tipos de matéria de licença
import { mkdir, writeFile } from 'node:fs/promises';
const API = 'https://doe-backend.pro.rs.gov.br/';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)', accept: 'application/json' };
const espera = ms => new Promise(r => setTimeout(r, ms));
await mkdir('rs-sondas', { recursive: true });
const out = [];
const tipos = {}, lic = [];
for (const termo of ['"posto de combustíveis"', 'combustíveis licença']) {
  let total = 0;
  for (let p = 1; p <= 260; p++) {
    let d; try { d = await (await fetch(`${API}public/materias/?page=${p}&tipoDiario=DOE&queryString=${encodeURIComponent(termo)}&dataIni=2025-11-25&dataFim=2026-11-25`, { headers: UA, signal: AbortSignal.timeout(60000) })).json(); } catch (e) { out.push('erro p' + p + ' ' + e.message); await espera(3000); continue; }
    total = d.collectionSize; const col = d.collection || []; if (!col.length) break;
    if (p === 1) out.push(`${termo}: total ${total}, pageSize ${d.pageSize}, campos ${Object.keys(col[0]).join(',')}`);
    for (const c of col) { tipos[c.tipoMateria] = (tipos[c.tipoMateria] || 0) + 1; if (/licen/i.test(c.tipoMateria) && /combust|posto/i.test(c.texto || '')) lic.push(`${p} ${c.data} ${c.id} ${c.tipoMateria} | ${(c.texto || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 300)}`); }
    if (p * (d.pageSize || 10) >= total) break;
    await espera(300);
  }
}
out.push('TIPOS: ' + JSON.stringify(Object.entries(tipos).sort((a, b) => b[1] - a[1])));
out.push('LICENÇAS COM POSTO/COMBUST: ' + lic.length + '\n' + lic.join('\n'));
await writeFile('rs-sondas/doers.txt', out.join('\n\n'));

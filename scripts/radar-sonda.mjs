// Sonda temporária do Radar (só na branch de desenvolvimento): baixa amostras reais da busca do IOMAT e do
// Jornal AMM-MT para desenvolver o classificador. Só leitura de páginas públicas. Será removida antes do merge.
import { mkdir, writeFile } from 'node:fs/promises';
const UA = 'Mozilla/5.0 (compatible; shotgun-radar/0.3; +https://github.com/dcmadruga/crm-shotgun)';
const OUT = new URL('../radar-amostras/', import.meta.url);
await mkdir(OUT, { recursive: true });
const espera = ms => new Promise(r => setTimeout(r, ms));
const TERMOS = ['"posto de combustível"', '"posto de combustíveis"', '"comércio varejista de combustíveis"', '"posto revendedor"', '"posto de abastecimento"', '"revenda de combustíveis"', '"tanques subterrâneos"', '"auto posto"'];
let n = 0;
for (const t of TERMOS) {
  for (let p = 0; p < 6; p++) {
    const u = `https://www.iomat.mt.gov.br/busca/busca/buscar/query/${p}/di:2025-11-01/df:2026-11-21/?1=1&q=${encodeURIComponent(t)}`;
    try {
      const r = await fetch(u, { headers: { 'user-agent': UA } });
      const j = await r.json();
      const hits = j.hits?.hits || [];
      console.log(t, 'pág', p, 'status', r.status, 'total', j.hits?.total, 'hits', hits.length);
      await writeFile(new URL(`iomat-${n++}.json`, OUT), JSON.stringify({ termo: t, pagina: p, url: u, total: j.hits?.total, hits }, null, 0));
      if (hits.length < 10) break;
    } catch (e) { console.log('erro', t, p, e.message); }
    await espera(1500);
  }
}
for (const t of ['"posto de combustível"', '"comércio varejista de combustíveis"', 'requereu posto combustíveis']) {
  const u = `https://amm.diariomunicipal.org/publicacoes/?q=${encodeURIComponent(t)}`;
  const r = await fetch(u, { headers: { 'user-agent': UA } });
  const h = await r.text();
  await writeFile(new URL(`amm-busca-${n++}.html`, OUT), h);
  const ids = [...new Set([...h.matchAll(/\/publicacao\/(\d+)\//g)].map(m => m[1]))].slice(0, 4);
  for (const id of ids) { const x = await (await fetch(`https://amm.diariomunicipal.org/publicacao/${id}/`, { headers: { 'user-agent': UA } })).text(); await writeFile(new URL(`amm-pub-${id}.html`, OUT), x); await espera(1000); }
  console.log('AMM', t, r.status, ids);
}

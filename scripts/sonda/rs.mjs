import fs from 'fs';
import { execFileSync } from 'node:child_process';
fs.mkdirSync('rs-sondas', { recursive: true });
const out = []; const log = (...a) => { const s = a.join(' '); console.log(s); out.push(s); };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0)' };
for (const nome of ['DO12336_19_11_2026.pdf', 'DO12336_19_11_2026']) {
  const u = `https://www.diariooficial.ms.gov.br/api/diarios/baixar-pagina/?nomeArquivo=${nome}&pagina=364`;
  const t0 = Date.now();
  try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(120000) }); const b = Buffer.from(await r.arrayBuffer()); log(nome, r.status, r.headers.get('content-type'), b.length, Date.now() - t0 + 'ms', b.subarray(0, 8).toString('latin1'));
    if (b.subarray(0, 4).toString() === '%PDF') { fs.writeFileSync('/tmp/p.pdf', b); const t1 = Date.now(); const txt = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', '/tmp/p.pdf', '-'], { timeout: 60000 }).toString(); log('pdftotext', Date.now() - t1 + 'ms', txt.length); log(txt.slice(0, 5000)); }
    else log(b.toString('utf8').slice(0, 500));
  } catch (e) { log(nome, 'ERR', e.message, Date.now() - t0 + 'ms'); }
}
fs.writeFileSync('rs-sondas/ms.txt', out.join('\n'));

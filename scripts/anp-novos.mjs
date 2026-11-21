// Telemetria ANP: lista dos postos novos na base da ANP (anp/novos.json), usada pela tela Telemetria > Telemetria ANP.
// Um posto entra na lista quando:
//  - a autorização dele na ANP (dataObtencao, campo "at") é dos últimos JANELA dias; ou
//  - o CNPJ apareceu pela primeira vez na base nesta atualização (campo "v" = dia em que o Shotgun viu o posto pela 1ª vez).
// O arquivo guarda JANELA dias (folga); a tela mostra os últimos 15.
// Chamado por scripts/anp-postos.mjs. Rodando sozinho (node scripts/anp-novos.mjs) recalcula a partir de anp/postos/*.json.
import { readdir, readFile, writeFile } from 'node:fs/promises';

export const JANELA = 30;
const ANP = new URL('../anp/', import.meta.url);

export const hojeBrasilia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const menosDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };

// CNPJs que já estavam na base antes desta atualização (índice anp/uf/*.json). null se não houver base anterior.
export async function cnpjsConhecidos() {
  try {
    const dir = new URL('uf/', ANP), s = new Set();
    for (const f of (await readdir(dir)).filter(f => f.endsWith('.json'))) for (const x of JSON.parse(await readFile(new URL(f, dir), 'utf8'))) s.add(x[0]);
    return s.size ? s : null;
  } catch { return null; }
}

async function anterior() {
  try { return JSON.parse(await readFile(new URL('novos.json', ANP), 'utf8')).postos || []; } catch { return []; }
}

// postos: Map cnpj -> objeto compacto (o mesmo de anp/postos). conhecidos: Set ou null.
export async function gravarNovos(postos, conhecidos, hoje = hojeBrasilia()) {
  const corte = menosDias(hoje, JANELA - 1);
  const visto = new Map((await anterior()).filter(x => x.v).map(x => [x.c, x.v]));
  const lista = [];
  for (const [c, o] of postos) {
    let v = visto.get(c) || '';
    if (!v && conhecidos && !conhecidos.has(c)) v = hoje; // CNPJ que não existia na base de ontem
    if (v && v < corte) v = '';
    const at = o.at && o.at >= corte && o.at <= hoje ? o.at : '';
    if (!v && !at) continue;
    const x = { c, r: o.r, b: o.b, m: o.m, uf: o.uf, at: o.at, dv: o.dv, v, la: o.la, lo: o.lo };
    Object.keys(x).forEach(k => { if (x[k] === '' || x[k] == null) delete x[k]; });
    lista.push(x);
  }
  const data = x => [x.v || '', x.at || ''].sort().pop();
  lista.sort((a, b) => data(b).localeCompare(data(a)) || (a.uf || '').localeCompare(b.uf || '') || (a.m || '').localeCompare(b.m || '') || (a.r || '').localeCompare(b.r || ''));
  await writeFile(new URL('novos.json', ANP), '{"janela":' + JANELA + ',"postos":[\n' + lista.map(x => JSON.stringify(x)).join(',\n') + '\n]}\n');
  return lista.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = new URL('postos/', ANP), postos = new Map();
  for (const f of (await readdir(dir)).filter(f => f.endsWith('.json'))) for (const [c, o] of Object.entries(JSON.parse(await readFile(new URL(f, dir), 'utf8')))) postos.set(c, o);
  console.log(`Telemetria ANP: ${await gravarNovos(postos, null)} postos novos nos últimos ${JANELA} dias.`);
}

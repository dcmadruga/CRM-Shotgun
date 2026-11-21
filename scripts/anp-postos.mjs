// Baixa os postos revendedores da ANP (API pública de revendedores) e grava a base interna do Shotgun.
// Saída: anp/postos/NNN.json (NNN = 3 primeiros dígitos do CNPJ) e anp/meta.json.
// Roda todo dia pelo GitHub Actions (.github/workflows/anp-postos.yml). Uso local: node scripts/anp-postos.mjs
import { mkdir, rm, writeFile } from 'node:fs/promises';

const API = process.env.ANP_API || 'https://revendedoresapi.anp.gov.br/v1/combustivel';
const SAIDA = new URL('../anp/', import.meta.url);
const MINIMO = Number(process.env.ANP_MINIMO) || 30000; // abaixo disso a resposta da ANP veio incompleta: não troca a base

const espera = ms => new Promise(r => setTimeout(r, ms));
async function pagina(n) {
  let erro;
  for (let t = 1; t <= 5; t++) {
    try {
      const r = await fetch(`${API}?numeropagina=${n}`, { headers: { accept: 'application/json', 'user-agent': 'shotgun-crm-anp/1.0' }, signal: AbortSignal.timeout(120000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (!j.succeeded || !Array.isArray(j.data)) throw new Error('resposta inesperada: ' + (j.title || ''));
      return j;
    } catch (e) { erro = e; console.warn(`página ${n}, tentativa ${t}: ${e.message}`); await espera(t * 15000); }
  }
  throw erro;
}

const txt = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const iso = v => { const m = String(v || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };

function compacto(d) {
  const o = {
    r: txt(d.razaoSocial), b: txt(d.distribuidora), e: txt(d.endereco), c: txt(d.complemento), ba: txt(d.bairro),
    cep: txt(d.cep).replace(/\D/g, ''), m: txt(d.municipio), uf: txt(d.uf),
    la: num(d.latitude), lo: num(d.longitude), gv: /não validada/i.test(d.validacao || '') ? 0 : (d.validacao ? 1 : 0),
    p: (d.produtos || []).map(p => [txt(p.produto), num(p.tancagem) ?? 0, Number(p.qtdeBicos) || 0, txt(p.unidMedidaTancagem)]),
    s: txt(d.codigoSIMP), a: txt(d.autorizacao), dv: iso(d.dataVinculacao), at: iso(d.dataObtencao)
  };
  // unidade só quando não for m³ (quase sempre é)
  o.p.forEach(p => { if (/^m(³|3)$/i.test(p[3]) || !p[3]) p.length = 3; });
  Object.keys(o).forEach(k => { if (o[k] === '' || o[k] === null) delete o[k]; });
  return o;
}

const primeira = await pagina(1);
const total = primeira.searchPageFilter?.totalPagina || 1;
const postos = [...primeira.data];
for (let n = 2; n <= total; n++) { postos.push(...(await pagina(n)).data); await espera(1500); }
console.log(`ANP: ${postos.length} postos em ${total} páginas (a API informa ${primeira.searchPageFilter?.totalRegistro}).`);
if (postos.length < MINIMO) throw new Error(`Só vieram ${postos.length} postos. A base anterior foi mantida.`);

const fatias = new Map();
for (const d of postos) {
  const cnpj = String(d.cnpj || '').replace(/\D/g, '').padStart(14, '0');
  if (cnpj.length !== 14 || /^0+$/.test(cnpj)) continue;
  const k = cnpj.slice(0, 3);
  if (!fatias.has(k)) fatias.set(k, new Map());
  fatias.get(k).set(cnpj, compacto(d));
}

await rm(new URL('postos/', SAIDA), { recursive: true, force: true });
await mkdir(new URL('postos/', SAIDA), { recursive: true });
let n = 0;
for (const [k, mapa] of [...fatias].sort()) {
  const linhas = [...mapa].sort(([a], [b]) => a.localeCompare(b)).map(([c, o]) => JSON.stringify(c) + ':' + JSON.stringify(o));
  n += linhas.length;
  await writeFile(new URL(`postos/${k}.json`, SAIDA), '{\n' + linhas.join(',\n') + '\n}\n');
}
// meta.json muda só quando a quantidade muda, para não gerar commit vazio todo dia
await writeFile(new URL('meta.json', SAIDA), JSON.stringify({ fonte: API, postos: n, arquivos: fatias.size, fatia: 'postos/{3 primeiros dígitos do CNPJ}.json' }, null, 1) + '\n');
console.log(`Gravados ${n} postos em ${fatias.size} arquivos.`);

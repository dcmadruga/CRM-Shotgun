// Coletor do Diário Oficial de MS (Imprensa Oficial, www.diariooficial.ms.gov.br): mesma busca pública que o site
// usa (sem login nem CAPTCHA). A busca devolve as páginas do diário que têm a expressão; o texto da página vem do
// PDF de uma página só que o próprio site oferece ("Abrir página"), lido com o pdftotext (poppler-utils).
// Sem o pdftotext fica só o trecho destacado pela busca (uma frase), o que basta para achar o aviso mas não o detalhe.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const API = 'https://www.diariooficial.ms.gov.br/api/';
const SITE = 'https://www.diariooficial.ms.gov.br/';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)', accept: 'application/json' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const limpa = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const POR_PAGINA = 50;
const TEMPO_MAX = 12 * 6e4; // teto para baixar as páginas: não segura a rodada das outras fontes

export const info = { id: 'doe-ms', uf: 'MS', nome: 'Diário Oficial do Estado de MS (avisos de licença)', url: SITE, tipo: 'diario_oficial' };
// busca exata; o diário é indexado sem acento em boa parte das publicações, então vão as duas grafias
export const TERMOS = ['posto revendedor', 'comercio varejista de combustiveis', 'comércio varejista de combustíveis', 'posto de combustiveis', 'posto de combustível', 'posto de combustivel',
  'posto de abastecimento', 'ponto de abastecimento', 'revenda de combustiveis', 'combustiveis automotivos', 'auto posto', 'tanques subterraneos', 'armazenamento de combustiveis'];

async function busca(texto, pagina, de, ate) {
  const q = new URLSearchParams({ tipo: '1', texto, dataInicial: de, dataFinal: ate, pagina: String(pagina), registrosPorPagina: String(POR_PAGINA) });
  let erro;
  for (let t = 1; t <= 4; t++) {
    try {
      const r = await fetch(API + 'diarios/busca-diarios?' + q, { headers: UA, signal: AbortSignal.timeout(60000) });
      const corpo = await r.text();
      // sem resultado o site responde 400 com "Nenhum resultado encontrado."
      if (r.status === 400 && /nenhum resultado/i.test(corpo)) return { paginasDiario: [], totalDeRegistros: 0, totalDePaginas: 0 };
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return JSON.parse(corpo);
    } catch (e) { erro = e; await espera(t * 4000); }
  }
  throw new Error(`DOE-MS (${texto}, pág. ${pagina}): ${erro.message}`);
}

let temPdftotext;
function textoDoPdf(buf) {
  if (temPdftotext === undefined) { try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); temPdftotext = true; } catch { temPdftotext = false; } }
  if (!temPdftotext) return '';
  const dir = mkdtempSync(join(tmpdir(), 'doems-'));
  try { const f = join(dir, 'p.pdf'); writeFileSync(f, buf); return execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', f, '-'], { maxBuffer: 32e6 }).toString('utf8'); }
  catch { return ''; } finally { rmSync(dir, { recursive: true, force: true }); }
}

export const linkPagina = (arquivo, pagina) => `${API}diarios/baixar-pagina/?${new URLSearchParams({ nomeArquivo: arquivo, pagina: String(pagina) })}`;

async function paginaPdf(arquivo, pagina) {
  for (let t = 1; t <= 2; t++) {
    try { const r = await fetch(linkPagina(arquivo, pagina), { headers: { 'user-agent': UA['user-agent'] }, signal: AbortSignal.timeout(90000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return Buffer.from(await r.arrayBuffer()); }
    catch { await espera(t * 3000); }
  }
  return null;
}

// de/ate: AAAA-MM-DD. Devolve as páginas como documentos (o classificador separa os avisos de cada página).
export async function coletar(de, ate, log = console.log) {
  const paginas = new Map(); let consultas = 0;
  for (const termo of TERMOS) {
    let total = 0;
    for (let p = 1; p <= 40; p++) {
      const d = await busca(termo, p, de, ate); consultas++;
      total = d.totalDeRegistros || 0;
      for (const x of d.paginasDiario || []) {
        // o nome do arquivo vai com ".pdf" (sem ele o site responde erro 500)
        const arquivo = String(x.nomeArquivo || '');
        const id = `${arquivo.replace(/\.pdf$/i, '')}-${x.pagina}`;
        const destaque = (x.hiHighlight?.texto || []).map(limpa).join(' … ');
        if (paginas.has(id)) { paginas.get(id).destaques.add(destaque); continue; }
        paginas.set(id, { id, arquivo, numero: x.numero, descricao: x.descricao, pagina: x.pagina, data: String(x.dataPublicacao || '').slice(0, 10), pdfDiario: x.caminhoArquivo, destaques: new Set([destaque]) });
      }
      if (p >= (d.totalDePaginas || 0)) break;
      await espera(700);
    }
    log(`DOE-MS "${termo}": ${total} página(s) no período`);
    await espera(700);
  }
  const docs = []; let lidas = 0, semTexto = 0; const prazo = Date.now() + TEMPO_MAX;
  // mais novas primeiro: se o teto estourar, ficam de fora só as páginas antigas (com o trecho da busca)
  for (const pg of [...paginas.values()].sort((a, b) => b.data.localeCompare(a.data))) {
    const buf = Date.now() < prazo ? await paginaPdf(pg.arquivo, pg.pagina) : null;
    let texto = buf ? textoDoPdf(buf) : '';
    if (texto) lidas++; else { semTexto++; texto = [...pg.destaques].join(' … '); }
    texto = texto.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
    const data = pg.data;
    docs.push({ id: pg.id, titulo: '', entidade: '', data, texto, trecho: [...pg.destaques][0] || '', url: linkPagina(pg.arquivo, pg.pagina), pdf: pg.pdfDiario || linkPagina(pg.arquivo, pg.pagina),
      local: `${pg.descricao || 'Diário Oficial de MS'} de ${data.split('-').reverse().join('/')}, página ${pg.pagina}` });
    await espera(400);
  }
  log(`DOE-MS: ${paginas.size} página(s); texto completo de ${lidas}${semTexto ? `, ${semTexto} só com o trecho da busca` : ''}${temPdftotext === false ? ' (pdftotext ausente)' : ''}`);
  return { docs, consultas, amostra: { encontradas: docs.slice(0, 200).map(d => ({ data: d.data, titulo: d.local, entidade: '', trecho: d.trecho })), docs: docs.slice(0, 60) } };
}

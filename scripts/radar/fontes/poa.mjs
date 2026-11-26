// Coletor da consulta pública de licenças ambientais de Porto Alegre (SMAMUS, RS): mesma API pública que o site
// licencas-ambientais.portoalegre.rs.gov.br usa (sem login nem CAPTCHA). Cada licença traz empresa, CNPJ/CPF,
// endereço, tipo (LP, LI, LO ou Única), número/ano e a atividade licenciada; a lista vem da mais nova para a mais antiga.
// O serviço é lento (cada página traz o PDF das licenças junto) e às vezes falha, então a carga é leve: na rotina
// diária só a primeira página; na primeira coleta (sem cursor) algumas páginas, dentro de um tempo máximo.
import { inflateSync } from 'node:zlib';

const API = 'https://apigateway.procempa.com.br/apiman-gateway/ambiental-urbanismo/lam-api-public/1.0/public/';
const SITE = 'https://licencas-ambientais.portoalegre.rs.gov.br/';
const espera = ms => new Promise(r => setTimeout(r, ms));
const limpa = s => String(s || '').replace(/\s+/g, ' ').trim();
const POR_PAGINA = 20;
const TEMPO_MAX = 5 * 6e4; // teto da fonte inteira: não segura a rodada das outras fontes

export const info = { id: 'poa-rs', uf: 'RS', nome: 'Porto Alegre: consulta pública de licenças ambientais (SMAMUS)', url: SITE, tipo: 'licenciamento' };

// atividade de posto: comércio/revenda/abastecimento de combustíveis (fora "gases não combustíveis", postos de saúde, lavagem)
const POSTO = /combust[ií]ve(l|is)|abastecimento de ve[ií]culos|\bauto\s*posto\b|posto\s+(de\s+)?(gasolina|abastecimento|revenda)/i;
const FORA = /n[aã]o\s+combust|postos?\s+de\s+sa[uú]de|lavagem|g[aá]s(es)?\s+(industriais|medicinais)/i;
// a atividade licenciada diz que é posto (o nome da empresa sozinho não basta para confirmar)
export const atividadePosto = x => { const t = [x.descricao, x.descricaoAtividade].join(' '); return POSTO.test(t) && !FORA.test(t); };
export const ehPosto = x => { const t = [x.descricao, x.descricaoAtividade, x.nomeRazaoSocial].join(' '); return POSTO.test(t) && !(FORA.test(t) && !/posto\s+(de\s+)?(combust|gasolina|abastec|revenda)/i.test(t)); };

// cada tentativa respeita o que sobra do teto da fonte
async function pega(caminho, prazo) {
  let erro;
  for (let t = 1; t <= 2; t++) {
    const resta = prazo - Date.now();
    if (resta < 15000) break;
    try { const r = await fetch(API + caminho, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(Math.min(150000, resta)) }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { erro = e; await espera(3000); }
  }
  if (!erro) erro = new Error('sem tempo para nova tentativa');
  throw new Error(`Porto Alegre: ${erro.message} (${caminho})`);
}

// data de emissão escrita no PDF da licença (o que a consulta não mostra em campo próprio)
const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export function dataDoPdf(bytes, ano) {
  if (!bytes?.length) return '';
  const buf = Buffer.from(bytes), bin = buf.toString('latin1');
  let txt = '';
  for (const m of bin.matchAll(/stream\r?\n/g)) {
    const ini = m.index + m[0].length, fim = bin.indexOf('endstream', ini);
    if (fim < 0) continue;
    try { const s = inflateSync(buf.subarray(ini, fim)).toString('latin1'); txt += ' ' + [...s.matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map(x => x[1]).join(''); } catch {}
  }
  txt = txt.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)).normalize('NFD').replace(/[̀-ͯ]/g, ''));
  const datas = [];
  for (const m of txt.matchAll(/(\d{1,2})\s*de\s*([a-z]+)\s*de\s*(\d{4})/g)) { const i = MESES.indexOf(m[2].replace('ç', 'c')); if (i >= 0) datas.push(`${m[3]}-${String(i + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`); }
  for (const m of txt.matchAll(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g)) datas.push(`${m[3]}-${m[2]}-${m[1]}`);
  const hoje = new Date().toISOString().slice(0, 10);
  // a emissão é do mesmo ano da licença; validade e datas de outros documentos ficam de fora pelo ano
  const ok = datas.filter(d => d.slice(0, 4) === String(ano) && d <= hoje).sort();
  return ok.at(-1) || '';
}

export function registro(x, municipios) {
  if (!ehPosto(x)) return null;
  const t = x.tipoLicenca || '';
  const sigla = /pr[eé]via/i.test(t) ? 'LP' : /instala/i.test(t) ? 'LI' : /opera/i.test(t) ? 'LO' : /[uú]nica/i.test(t) ? 'LU' : '';
  const evento = { LP: 'emitida_lp', LI: 'emitida_li', LO: 'emitida_lo' }[sigla] || 'emitida';
  const categoria = sigla === 'LP' || sigla === 'LI' ? 'novo' : 'outro';
  const doc = String(x.cnpjCpf || '').replace(/\D/g, '');
  const cnpj = doc.length === 14 ? doc : '';
  const mun = municipios?.achar('municipio de porto alegre rs');
  const endereco = limpa([x.logradouro, x.imovelEmpreendimento].filter(Boolean).join(', '));
  const razao = limpa(x.nomeEmpresaInteressado || x.nomeRazaoSocial);
  return {
    tipoDoc: 'licenca_emitida', evento, categoria, situacao: 'aprovado',
    razao, fantasia: limpa(x.nomeRazaoSocial) !== razao ? limpa(x.nomeRazaoSocial) : '', cnpj,
    municipio: mun?.nome || 'Porto Alegre', ibge: mun?.ibge || '4314902', endereco, coord: null,
    processo: limpa(x.processo), licencas: [{ tipo: sigla || 'LO', numero: `${x.numero}/${x.ano}` }],
    atividade: limpa(x.descricao || x.descricaoAtividade).slice(0, 200), orgao: 'Órgão ambiental municipal: SMAMUS – Porto Alegre', esfera: 'municipal',
    confianca: cnpj && categoria === 'novo' && atividadePosto(x) ? 'confirmado' : 'analise',
    trecho: limpa(`${t} nº ${x.numero}/${x.ano} · ${razao} · CNPJ/CPF ${x.cnpjCpf || 'pendente de confirmação'} · ${endereco || 'endereço pendente de confirmação'} · Processo ${x.processo || 'pendente de confirmação'} · Atividade: ${x.descricao || ''}${x.descricaoAtividade ? ' (' + x.descricaoAtividade + ')' : ''}`).slice(0, 1500)
  };
}

// de/ate: AAAA-MM-DD. ctx.mun: municípios do RS
export async function coletar(de, ate, log = console.log, ctx = {}) {
  const t0 = Date.now(), prazo = t0 + TEMPO_MAX;
  const anoDe = Number(de.slice(0, 4));
  // rotina (cursor recente): a primeira página basta; primeira coleta: até 10 páginas, dentro do teto
  const maxPag = Date.parse(ate) - Date.parse(de) > 45 * 864e5 ? 10 : 1;
  const registros = [], amostra = [];
  let consultas = 0, lidas = 0, total = 0;
  for (let p = 1; p <= maxPag; p++) {
    let d;
    try { d = await pega(`consultaLicencas?page=${p}&limit=${POR_PAGINA}`, prazo); consultas++; }
    catch (e) { if (p === 1) throw e; log(`${e.message}: parou na página ${p}, fica com o que já leu`); break; }
    const L = d.consultaLicencas || []; total = d.paginacao?.total || total;
    for (const x of L) {
      lidas++;
      const r = registro(x, ctx.mun);
      const pdfId = `${x.id}|${x.numero}|${x.ano}`;
      const data = r || amostra.length < 15 ? dataDoPdf(x.doc?.data, x.ano) : '';
      if (amostra.length < 15 || r) amostra.push({ data, titulo: `${x.tipoLicenca} ${x.numero}/${x.ano} · ${limpa(x.descricao)} · ${r ? 'POSTO' : 'fora'}`, entidade: limpa(x.nomeEmpresaInteressado || x.nomeRazaoSocial), trecho: '' });
      if (!r) continue;
      // sem data legível no PDF, vale a data em que o robô encontrou a licença (dito no local do documento)
      const dataDoc = data || ate;
      if (data && data < de) continue;
      registros.push({ ...r, id: `${x.numero}-${x.ano}`, data: dataDoc, url: API + 'documentos/' + encodeURIComponent(pdfId) + '/view', pdf: API + 'documentos/' + encodeURIComponent(pdfId) + '/download',
        local: `Licença ${x.numero}/${x.ano} na consulta pública da SMAMUS${data ? '' : ' · data de emissão pendente de confirmação (data = dia em que o robô encontrou)'}` });
    }
    const ultimoAno = Number(L.at(-1)?.ano || 0);
    if (!d.paginacao?.next_page || !L.length || (ultimoAno && ultimoAno < anoDe) || prazo - Date.now() < 30000) break;
    await espera(2000);
  }
  log(`Porto Alegre: ${lidas} licenças lidas (de ${total} na consulta), ${registros.length} de posto`);
  return { docs: [], registros, consultas, amostra: { encontradas: amostra, docs: [] } };
}

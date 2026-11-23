// Coletor do Diário Oficial do Estado de SP (DOE-SP). Usa a mesma pesquisa pública do site (doe.sp.gov.br, sem login
// nem CAPTCHA). Em SP a CETESB não publica no Diário cada licença de posto: ali saem só as súmulas dos licenciamentos
// com estudo de impacto (EIA/RAP), as publicações de empresas em "Atos Empresariais" (pedidos de licença feitos a
// prefeituras e órgãos) e os atos das prefeituras que publicam no DOE. Cada matéria que fala de posto e vem de uma
// dessas seções é lida inteira e vai para o classificador de texto.
const API = 'https://do-api-web-search.doe.sp.gov.br/';
const SITE = 'https://www.doe.sp.gov.br/';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)', accept: 'application/json' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const limpa = s => String(s || '').replace(/\s+/g, ' ').trim();

export const info = { id: 'doe-sp', uf: 'SP', nome: 'Diário Oficial do Estado de SP (DOE-SP)', url: SITE, tipo: 'diario_oficial' };
// a pesquisa trata cada termo como frase exata
export const TERMOS = ['posto de combustíveis', 'postos de combustíveis', 'posto de combustível', 'comércio varejista de combustíveis', 'posto revendedor', 'posto de abastecimento', 'revenda de combustíveis', 'tanques subterrâneos'];
// seções que podem trazer licenciamento de posto (o resto é Procon, Fazenda, Bombeiros, Ministério Público, Jucesp...)
const SECAO = /^Empresarial > Atos Empresariais|^Munic[íi]pios >|Companhia Ambiental do Estado de S[ãa]o Paulo\s*$|Conselho Estadual do Meio Ambiente\s*$/i;
// compras de combustível, credenciamento de postos para a frota e contratos das prefeituras ficam de fora
const COMPRA = /licita[çc][ãa]o|preg[ãa]o|credenciamento|chamamento|chamada\s+p[úu]blica|dispensa|coleta\s+de\s+pre[çc]os|homologa|adjudica|aditamento|aditivo|extrato\s+de\s+contrato|ata\s+de\s+registro|registro\s+de\s+pre[çc]os|rescis[ãa]o|relat[óo]rio\s+da\s+administra|balan[çc]o/i;
// súmulas da CETESB (Diretoria de Avaliação de Impacto Ambiental): licença concedida e pedido recebido
const CONCEDEU = /Processo\s+n[º°o.]\s*([\d/]+)\s*\((CETESB\.[\d./-]+)\)\s*A\s+Cetesb[^,]{0,80},\s*torna\s+p[úu]blico\s+que\s+concedeu,?\s+para\s+(.{2,160}?),\s+a\s+Licen[çc]a\s+Ambiental\s+(Pr[ée]via|de\s+Instala[çc][ãa]o|de\s+Opera[çc][ãa]o)\s+n[º°o.]\s*([\d.]+),\s+de\s+(\d{2}\/\d{2}\/\d{4}),\s+para\s+(.{3,300}?),\s+localizad[oa]s?\s+n[oa]s?\s+munic[íi]pios?\s+de\s+(.{2,120}?)\/SP/g;
const RECEBEU = /Processo\s+n[º°o.]\s*([\d/]+)\s*\((CETESB\.[\d./-]+)\)\s*A\s+Cetesb[^,]{0,80},\s*torna\s+p[úu]blico\s+que\s+recebeu\s+o\s+pedido\s+de\s+Licen[çc]a\s+Ambiental\s+(Pr[ée]via|de\s+Instala[çc][ãa]o|de\s+Opera[çc][ãa]o)\s+de\s+(.{2,160}?)\s+para\s+(.{3,300}?),\s+(?:localizad[oa]s?\s+)?n[oa]s?\s+munic[íi]pios?\s+de\s+(.{2,120}?)\/SP/g;
const ATIV = /posto|combust[ií]ve|abastecimento/i;

const ENT = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', deg: '°', ordm: 'º', ordf: 'ª', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', sect: '§', middot: '·', shy: '' };
const MARCA = { acute: '́', grave: '̀', circ: '̂', tilde: '̃', uml: '̈', cedil: '̧' };
export function texto(html) {
  return limpa(String(html || '').replace(/<(style|script)[^>]*>[^]*?<\/\1>/gi, ' ').replace(/^\s*SEI\/GESP\s*-\s*\d+\s*-\s*DOE:[^)]*\)/, '').replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d)[^>]*>/gi, ' \n').replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([A-Za-z])(acute|grave|circ|tilde|uml|cedil);/g, (_, l, m) => (l + MARCA[m]).normalize('NFC'))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m));
}

async function json(u) {
  let erro;
  for (let t = 1; t <= 5; t++) {
    try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { erro = e; if (t < 5) await espera(t * 5000); }
  }
  throw new Error(`DOE-SP: ${erro.message} (${u.slice(0, 160)})`);
}

const br2iso = d => { const m = String(d).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
const SIGLA = t => /pr[ée]via/i.test(t) ? 'LP' : /instala/i.test(t) ? 'LI' : 'LO';
const cat = (ativ, sigla) => /renova/i.test(ativ) ? 'renovacao' : /amplia/i.test(ativ) ? 'ampliacao' : /reativa|reforma|moderniza/i.test(ativ) ? 'reforma' : sigla === 'LO' ? 'outro' : 'novo';
const ORGAO = 'CETESB (Companhia Ambiental do Estado de SP)';

// transforma as súmulas da CETESB de um texto em registros do Radar (mesmos campos do classificador)
export function registrosCetesb(t, municipios) {
  const out = [];
  for (const m of t.matchAll(CONCEDEU)) {
    const [, proc, eamb, razao, tipoTxt, numero, emissao, ativ, munNome] = m;
    if (!ATIV.test(ativ)) continue;
    const sigla = SIGLA(tipoTxt), mun = municipios?.achar(`municipio de ${munNome} sp`);
    out.push({ chave: `${sigla}-${numero}`, tipoDoc: 'licenca_emitida', evento: { LP: 'emitida_lp', LI: 'emitida_li', LO: 'emitida_lo' }[sigla], categoria: cat(ativ, sigla), situacao: 'aprovado',
      razao: limpa(razao), fantasia: '', cnpj: '', municipio: mun?.nome || '', ibge: mun?.ibge || '', endereco: '', coord: null, processo: limpa(proc),
      licencas: [{ tipo: sigla, numero: limpa(numero), sigla, emissao: br2iso(emissao) }], atividade: limpa(ativ).slice(0, 200), orgao: ORGAO, esfera: 'estadual',
      confianca: 'confirmado', fase: `Licença Ambiental ${limpa(tipoTxt)} nº ${numero}`, trecho: limpa(m[0]).slice(0, 1500), eAmbiente: eamb });
  }
  for (const m of t.matchAll(RECEBEU)) {
    const [, proc, eamb, tipoTxt, razao, ativ, munNome] = m;
    if (!ATIV.test(ativ)) continue;
    const sigla = SIGLA(tipoTxt), mun = municipios?.achar(`municipio de ${munNome} sp`);
    out.push({ chave: `req-${eamb}`, tipoDoc: 'requerimento', evento: { LP: 'req_lp', LI: 'req_li', LO: 'req_lo' }[sigla], categoria: cat(ativ, sigla), situacao: 'solicitado',
      razao: limpa(razao), fantasia: '', cnpj: '', municipio: mun?.nome || '', ibge: mun?.ibge || '', endereco: '', coord: null, processo: limpa(proc),
      atividade: limpa(ativ).slice(0, 200), orgao: ORGAO, esfera: 'estadual', confianca: 'confirmado', fase: `Pedido de Licença Ambiental ${limpa(tipoTxt)}`, trecho: limpa(m[0]).slice(0, 1500), eAmbiente: eamb });
  }
  return out;
}

// de/ate: AAAA-MM-DD. ctx.mun: municípios de SP
export async function coletar(de, ate, log = console.log, ctx = {}) {
  const achados = new Map(); let consultas = 0, vistas = 0;
  for (const termo of TERMOS) {
    let total = 0;
    for (let p = 1; p <= 30; p++) {
      const d = await json(`${API}v2/advanced-search/publications?Terms%5B0%5D=${encodeURIComponent(termo)}&FromDate=${de}&ToDate=${ate}&PageNumber=${p}&PageSize=100`); consultas++;
      total = d.totalItems || 0;
      for (const i of d.items || []) { vistas++; if (SECAO.test(i.hierarchy) && !COMPRA.test(i.title) && !achados.has(i.id)) achados.set(i.id, i); }
      if (!d.hasNextPage) break;
      await espera(500);
    }
    log(`DOE-SP "${termo}": ${total} matéria(s) no período`);
    await espera(500);
  }
  const docs = [], registros = [], vistos = new Set();
  for (const i of achados.values()) {
    const d = await json(`${API}v2/publications/${i.id}`); consultas++;
    const t = texto(d.content);
    if (!t || COMPRA.test(t.slice(0, 400))) continue;
    const data = String(d.date || i.date).slice(0, 10);
    const secao = i.hierarchy.split(' > ').pop().trim();
    const url = SITE + (d.slug || i.slug), local = `DOE-SP de ${data.split('-').reverse().join('/')}, ${i.hierarchy.split(' > ')[0]} › ${secao}`;
    const regs = /Companhia Ambiental/.test(i.hierarchy) ? registrosCetesb(t, ctx.mun) : [];
    for (const { chave, eAmbiente, ...r } of regs) { if (vistos.has(chave)) continue; vistos.add(chave); registros.push({ ...r, id: `${i.id}-${chave.replace(/[^\w-]+/g, '')}`, data, url, pdf: url, local }); }
    if (regs.length) continue;
    docs.push({ id: i.id, titulo: limpa(d.title || i.title), entidade: /^Munic/.test(i.hierarchy) ? `Prefeitura Municipal de ${i.hierarchy.split(' > ')[2].trim()}` : '', data, texto: t, trecho: t.slice(0, 300), url: SITE + (d.slug || i.slug), pdf: SITE + (d.slug || i.slug), local: `DOE-SP de ${data.split('-').reverse().join('/')}, ${i.hierarchy.split(' > ').slice(0, 1)[0]} › ${secao}` });
    await espera(300);
  }
  log(`DOE-SP: ${vistas} resultado(s), ${achados.size} matéria(s) de seções de licenciamento lidas inteiras, ${registros.length} súmula(s) de posto da CETESB`);
  return { docs, registros, consultas, amostra: { encontradas: docs.slice(0, 200).map(d => ({ data: d.data, titulo: d.titulo, entidade: d.entidade, trecho: d.trecho })), docs: docs.slice(0, 60) } };
}

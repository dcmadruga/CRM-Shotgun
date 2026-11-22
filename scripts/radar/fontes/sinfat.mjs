// Coletor do CIGA SINFAT municipal (SC): consulta pública dos requerimentos de licenciamento ambiental das
// prefeituras e fundações municipais consorciadas ao CIGA (sem login nem CAPTCHA). Cada requerimento tem página
// própria com empreendimento, CNPJ, endereço, processo, data de protocolo, atividade (código CONSEMA) e situação.
// Fica só com a atividade 42.32 (comércio de combustíveis em postos e tancagem).
const BASE = 'https://sinfatmunicipal.ciga.sc.gov.br/';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const limpa = s => String(s || '').replace(/\s+/g, ' ').trim();
const ent = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const texto = h => limpa(ent(String(h || '').replace(/<[^>]+>/g, ' ')));
const br2iso = d => { const m = String(d).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };

export const info = { id: 'sinfat-sc', uf: 'SC', nome: 'CIGA SINFAT: licenciamento das prefeituras de SC', url: BASE + 'consulta', tipo: 'licenciamento' };
// pesquisa por nome do empreendimento (a consulta pública não filtra por atividade)
export const NOMES = ['posto', 'combust', 'petro', 'abastec', 'derivados', 'conveniencia'];
// nomes que valem abrir quando aparecem na lista geral da semana
const SUSPEITO = /posto|combust|petr[oó]|abastec|derivad|lubrific|conveni[eê]ncia|\bgas\b|truck|auto\s*center|rede\s/i;

async function pega(u) {
  let erro;
  for (let t = 1; t <= 4; t++) {
    try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); }
    catch (e) { erro = e; await espera(t * 4000); }
  }
  throw new Error(`SINFAT: ${erro.message} (${u})`);
}

function linhas(html) {
  const out = [];
  const re = /consulta_requerimento\/(\d+)">\d+<\/a><\/td>\s*<td>\s*([^]*?)<br\/>\s*<span class="form-text">(\d*)<\/span>\s*·\s*<small>([^<]*)<\/small>\s*<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>/g;
  for (const m of html.matchAll(re)) out.push({ req: m[1], nome: texto(m[2]), doc: m[3], orgao: texto(m[4]), entrada: br2iso(m[5]), fase: texto(m[6]) });
  return { out, temMais: /name="pagina"\s+value="\d+"\s*>\s*Pr[oó]xima/i.test(html) };
}

// lê a página do requerimento
function detalhe(html, req) {
  const tipoLic = texto((html.match(/<div class="small opacity-75 mb-1">([^<]*)<\/div>/) || [])[1]);
  const numero = texto((html.match(/bi-award-fill[^>]*><\/i>\s*([^<]*)<\/h2>/) || [])[1]);
  const situacao = texto((html.match(/<span class="badge bg-white[^>]*>([^]*?)<\/span>/) || [])[1]);
  const orgao = texto((html.match(/<small><i class="bi bi-geo-alt"><\/i>\s*([^<]*)<\/small>/) || [])[1]);
  const emp = html.match(/bi-building"><\/i> Empreendimento[^]*?<h5[^>]*>([^<]*)<\/h5>\s*<p[^>]*>([^<]*)<\/p>\s*<p[^>]*>\s*<i[^>]*><\/i>\s*([^<]*)<\/p>/);
  const dd = rot => texto((html.match(new RegExp(`<dt[^>]*>${rot}<\\/dt>\\s*<dd[^>]*>([^<]*)<\\/dd>`)) || [])[1]);
  const atividades = [...html.matchAll(/<span class="badge bg-outline-dark[^>]*>([\d.]+)<\/span>\s*([^<]*)/g)].map(m => ({ codigo: m[1], nome: texto(m[2]) }));
  const pdfLic = (html.match(/href="(\/download_public\/\d+)"[^>]*>\s*<div>\s*<strong>\s*Licen[cç]a[^<]*\.pdf/i) || [])[1];
  return {
    req, tipoLic, numero: /\d/.test(numero) ? numero : '', situacao, orgao,
    razao: texto(emp?.[1]), doc: texto(emp?.[2]).replace(/\D/g, ''), endereco: texto(emp?.[3]),
    processo: dd('Processo'), protocolo: br2iso(dd('Protocolo')), emissao: br2iso(dd('Emiss[aã]o')), atividades,
    porte: texto((html.match(/Porte:\s*([^<]*)/) || [])[1]), url: BASE + 'consulta_requerimento/' + req, pdf: pdfLic ? BASE + pdfLic.slice(1) : ''
  };
}

// transforma o requerimento num registro do Radar (mesmos campos do classificador)
export function registro(d, municipios) {
  const ativ = d.atividades.filter(a => a.codigo.startsWith('42.32')).sort((a, b) => a.codigo.localeCompare(b.codigo))[0];
  if (!ativ) return null;
  const t = d.tipoLic;
  const tipos = [/pr[eé]via/i.test(t) && 'LP', /instala/i.test(t) && 'LI', /opera/i.test(t) && 'LO'].filter(Boolean);
  const renov = /renova/i.test(t);
  const concedida = /concedid|emitid/i.test(d.situacao);
  const negada = /indeferid|arquivad|cancelad|desist/i.test(d.situacao);
  const t0 = tipos[0] || '';
  let evento;
  if (negada) evento = 'indeferido';
  else if (concedida) evento = t0 === 'LP' ? 'emitida_lp' : t0 === 'LI' ? 'emitida_li' : t0 === 'LO' ? 'emitida_lo' : 'emitida';
  else if (renov) evento = 'req_renov';
  else evento = { LP: 'req_lp', LI: 'req_li', LO: 'req_lo', 'LP+LI': 'req_lp_li', 'LP+LI+LO': 'req_lp_li_lo' }[tipos.join('+')] || 'req_outro';
  const codigo = ativ.codigo;
  const categoria = (codigo === '42.32.20' || codigo === '42.32.40') ? 'ponto_proprio' : renov ? 'renovacao'
    : codigo === '42.32.30' ? 'tanques' : (t0 === 'LP' || t0 === 'LI') ? 'novo' : 'outro';
  const nomeOrgao = d.orgao.replace(/\(.*?\)/g, ' ').replace(/^munic[ií]pio\s+de\s+/i, '');
  const mun = /^ciga$/i.test(limpa(nomeOrgao)) ? null : municipios.achar('municipio de ' + nomeOrgao + ' sc');
  const cnpj = d.doc.length === 14 ? d.doc : '';
  return {
    tipoDoc: concedida ? 'licenca_emitida' : 'requerimento', evento, categoria,
    situacao: negada ? 'indeferido' : concedida ? 'aprovado' : 'solicitado',
    razao: d.razao, fantasia: '', cnpj, municipio: mun?.nome || '', ibge: mun?.ibge || '', endereco: d.endereco, coord: null,
    processo: d.processo, licencas: d.numero ? [{ tipo: t0 || 'LO', numero: d.numero }] : [],
    atividade: `${codigo} ${ativ.nome}`.slice(0, 200), orgao: `Órgão ambiental municipal: ${d.orgao}`, esfera: 'municipal',
    confianca: cnpj && d.processo && categoria !== 'ponto_proprio' ? 'confirmado' : 'analise',
    fase: d.situacao, trecho: limpa(`${t}${d.numero ? ' ' + d.numero : ''} · ${d.situacao} · ${d.razao} · CNPJ/CPF ${d.doc} · ${d.endereco} · Processo ${d.processo} · Requerimento ${d.req} · Protocolo ${d.protocolo.split('-').reverse().join('/')}${d.emissao ? ' · Emissão ' + d.emissao.split('-').reverse().join('/') : ''} · Atividade ${codigo} ${ativ.nome}${d.porte ? ' · Porte ' + d.porte : ''} · ${d.orgao}`).slice(0, 1500),
    dataDoc: concedida && d.emissao ? d.emissao : d.protocolo
  };
}

// de/ate: AAAA-MM-DD. ctx.mun: municípios de SC
export async function coletar(de, ate, log = console.log, ctx = {}) {
  const cand = new Map(); let consultas = 0;
  // requerimentos que entraram antes do período ainda podem ter a licença emitida agora: olha 120 dias para trás
  const limite = new Date(Date.parse(de) - 120 * 864e5).toISOString().slice(0, 10);
  for (const nome of NOMES) {
    let n = 0;
    for (let p = 1; p <= 60; p++) {
      const { out, temMais } = linhas(await pega(`${BASE}consulta?empto_razao=${encodeURIComponent(nome)}&pagina=${p}`)); consultas++;
      for (const l of out) if (l.entrada >= limite && l.entrada <= ate) { cand.set(l.req, l); n++; }
      if (!temMais || !out.length || out[out.length - 1].entrada < limite) break;
      await espera(400);
    }
    log(`SINFAT "${nome}": ${n} requerimento(s) desde ${limite}`);
  }
  // lista geral da semana (pega nomes de posto sem as palavras pesquisadas)
  let geral = 0;
  for (let p = 1; p <= 40; p++) {
    const { out, temMais } = linhas(await pega(`${BASE}consulta?periodo=semana&pagina=${p}`)); consultas++;
    for (const l of out) if (SUSPEITO.test(l.nome) && !cand.has(l.req)) { cand.set(l.req, l); geral++; }
    if (!temMais || !out.length) break;
    await espera(400);
  }
  log(`SINFAT: ${cand.size} requerimento(s) para abrir (${geral} vindos da lista geral da semana)`);
  const registros = [], amostra = [];
  for (const l of cand.values()) {
    try {
      const d = detalhe(await pega(BASE + 'consulta_requerimento/' + l.req), l.req); consultas++;
      if (!d.orgao) d.orgao = l.orgao;
      if (!d.razao) d.razao = l.nome;
      const r = registro(d, ctx.mun);
      amostra.push({ req: l.req, nome: d.razao, tipo: d.tipoLic, situacao: d.situacao, atividades: d.atividades.map(a => a.codigo).join(','), aceito: !!r });
      if (!r || r.dataDoc < de) { await espera(300); continue; }
      registros.push({ ...r, id: `${l.req}-${r.evento}`, data: r.dataDoc, url: d.url, pdf: d.pdf, local: `Requerimento ${l.req} no CIGA SINFAT · ${d.orgao}` });
    } catch (e) { log('SINFAT requerimento ' + l.req + ': ' + e.message); }
    await espera(300);
  }
  log(`SINFAT: ${registros.length} requerimento(s) de posto no período`);
  return { docs: [], registros, consultas, amostra: { encontradas: amostra.map(a => ({ data: '', titulo: `${a.req} ${a.tipo} · ${a.situacao} · ${a.atividades} · ${a.aceito ? 'POSTO' : 'fora'}`, entidade: a.nome, trecho: '' })), docs: [] } };
}

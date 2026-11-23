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
const SECAO = /^Empresarial > Atos Empresariais|^Munic[íi]pios >|Companhia Ambiental do Estado de S[ãa]o Paulo|Meio Ambiente|Conselho Estadual do Meio Ambiente|Comit[êe] de Bacias/i;
const FORA = /Fundação de Proteção e Defesa do Consumidor|Secretaria da Fazenda|Secretaria da Seguran[çc]a|Minist[ée]rio P[úu]blico|Fiscaliza[çc][ãa]o Ambiental|Jucesp/i;

const ENT = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', deg: '°', ordm: 'º', ordf: 'ª', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', sect: '§', middot: '·', shy: '' };
const MARCA = { acute: '́', grave: '̀', circ: '̂', tilde: '̃', uml: '̈', cedil: '̧' };
export function texto(html) {
  return limpa(String(html || '').replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d)[^>]*>/gi, ' \n').replace(/<[^>]+>/g, ' ')
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

// de/ate: AAAA-MM-DD
export async function coletar(de, ate, log = console.log) {
  const achados = new Map(); let consultas = 0, vistas = 0;
  for (const termo of TERMOS) {
    let total = 0;
    for (let p = 1; p <= 30; p++) {
      const d = await json(`${API}v2/advanced-search/publications?Terms%5B0%5D=${encodeURIComponent(termo)}&FromDate=${de}&ToDate=${ate}&PageNumber=${p}&PageSize=100`); consultas++;
      total = d.totalItems || 0;
      for (const i of d.items || []) { vistas++; if (SECAO.test(i.hierarchy) && !FORA.test(i.hierarchy) && !achados.has(i.id)) achados.set(i.id, i); }
      if (!d.hasNextPage) break;
      await espera(500);
    }
    log(`DOE-SP "${termo}": ${total} matéria(s) no período`);
    await espera(500);
  }
  const docs = [];
  for (const i of achados.values()) {
    const d = await json(`${API}v2/publications/${i.id}`); consultas++;
    const t = texto(d.content);
    if (!t) continue;
    const data = String(d.date || i.date).slice(0, 10);
    const secao = i.hierarchy.split(' > ').pop().trim();
    docs.push({ id: i.id, titulo: limpa(d.title || i.title), entidade: /^Munic/.test(i.hierarchy) ? `Prefeitura Municipal de ${i.hierarchy.split(' > ')[2].trim()}` : '', data, texto: t, trecho: t.slice(0, 300), url: SITE + (d.slug || i.slug), pdf: SITE + (d.slug || i.slug), local: `DOE-SP de ${data.split('-').reverse().join('/')}, ${i.hierarchy.split(' > ').slice(0, 1)[0]} › ${secao}` });
    await espera(300);
  }
  log(`DOE-SP: ${vistas} resultado(s), ${achados.size} matéria(s) de seções de licenciamento lidas inteiras`);
  return { docs, consultas, amostra: { encontradas: docs.slice(0, 200).map(d => ({ data: d.data, titulo: d.titulo, entidade: d.entidade, trecho: d.trecho })), docs: docs.slice(0, 60) } };
}

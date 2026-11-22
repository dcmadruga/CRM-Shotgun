// Coletor do Diário Oficial do Estado do PR (DIOE). Usa a mesma pesquisa pública do site novo (dioe.pr.gov.br,
// sem login nem CAPTCHA). Pela Resolução CEMA, o IAT (Instituto Água e Terra) publica ali, de forma automática, a
// súmula de cada licença ambiental concedida: "O Instituto Água e Terra torna público que concedeu à EMPRESA, a
// Licença de Instalação - LI nº 391003 com validade até ..., para Comércio e Serviço - Posto de combustíveis para
// veículos automotores a ser implantada na RUA X no município de Y/PR." A pesquisa devolve o texto da página inteira;
// daqui sai uma súmula por licença de posto.
const BASE = 'https://dioe.pr.gov.br';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)', accept: 'application/json' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const limpa = s => String(s || '').replace(/\s+/g, ' ').trim();
const br2iso = d => { const m = String(d).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };

export const info = { id: 'dioe-pr', uf: 'PR', nome: 'Diário Oficial do Estado do PR (DIOE): licenças do IAT', url: BASE + '/', tipo: 'diario_oficial' };
export const TERMOS = ['"Posto de combustíveis para veículos automotores"', '"posto de combustíveis"', '"posto de abastecimento"', '"sistema retalhista"', '"comércio varejista de combustíveis"'];
const ATIV = /posto|combust[ií]ve|abastecimento|retalhista/i;
// súmula de concessão do IAT (as páginas têm duas colunas, então o texto de uma súmula às vezes se mistura com a
// vizinha; só entra o que casa por inteiro)
const CONCESSAO = /O\s+Instituto\s+[ÁA]gua\s+e\s+Terra\s+torna\s+p[úu]blico\s+que\s+concedeu\s+(?:[àa]o?|ao)\s+(.{2,160}?),\s+a\s+(.{3,90}?)\s+-\s+([A-Z]{2,5}(?:-[A-Z]{1,2})?)\s+n[º°o.]\s*([\w./-]+?)\s+com\s+validade\s+at[ée]\s+(\d{2}\/\d{2}\/\d{4}),\s+para\s+(.{3,220}?)\s+(a\s+ser\s+implantad[ao]|instalad[ao])\s+(?:na|no|em)\s+(.{3,240}?)\s+no\s+munic[íi]pio\s+de\s+([^/]{2,60}?)\/PR\.?(\s+Protocolo\s+(\d{3,}\/\d{4}))?/g;
// súmula de requerimento publicada pelo próprio empreendedor (texto livre): vai para o classificador de texto
const REQUER = /S[ÚU]MULA\s+DE\s+REQUERIMENTO[^]{20,900}?(?=S[ÚU]MULA\s+DE|$)/gi;

async function json(u) {
  let erro;
  for (let t = 1; t <= 5; t++) {
    try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { erro = e; if (t < 5) await espera(t * 5000); }
  }
  throw new Error(`DIOE-PR: ${erro.message} (${u})`);
}

// transforma a súmula num registro do Radar (mesmos campos do classificador)
export function registro(m, municipios) {
  // o número de protocolo que vem depois da súmula fica de fora: com as duas colunas, ele pode ser o da vizinha
  let [, razao, tipoTxt, sigla, numero, validade, atividade, fase, endereco, munNome] = m;
  if (!ATIV.test(atividade)) return null;
  // a captura pode ter começado numa súmula vizinha que não fechou: fica só com a empresa da última
  const viz = [...razao.matchAll(/torna\s+p[úu]blico\s+que\s+concedeu\s+(?:[àa]o?|ao)\s+/gi)].pop();
  if (viz) razao = razao.slice(viz.index + viz[0].length);
  if (/S[ÚU]MULA|Instituto\s+[ÁA]gua/i.test(razao)) return null;
  endereco = endereco.replace(/^Endere[cç]o\s*:\s*/i, '');
  const t = `${tipoTxt} ${sigla}`;
  const renov = /^R/.test(sigla) || /renova/i.test(tipoTxt);
  const ampl = /-A$/.test(sigla) || /amplia/i.test(tipoTxt);
  const regul = /regulariza/i.test(tipoTxt);
  const tipo = /pr[ée]via/i.test(t) ? 'LP' : /instala/i.test(t) ? 'LI' : /opera/i.test(t) ? 'LO' : '';
  const evento = { LP: 'emitida_lp', LI: 'emitida_li', LO: 'emitida_lo' }[tipo] || 'emitida';
  const proprio = /consumo\s+pr[óo]prio|ponto\s+de\s+abastecimento|frota|uso\s+pr[óo]prio/i.test(atividade);
  const categoria = proprio ? 'ponto_proprio' : renov ? 'renovacao' : ampl ? 'ampliacao' : regul ? 'outro' : (tipo === 'LP' || tipo === 'LI') ? 'novo' : 'outro';
  const mun = municipios.achar(`municipio de ${munNome} pr`);
  const nomeLic = limpa(`${tipoTxt} - ${sigla} nº ${numero}`);
  return {
    tipoDoc: 'licenca_emitida', evento, categoria, situacao: 'aprovado',
    razao: limpa(razao), fantasia: '', cnpj: '', municipio: mun?.nome || '', ibge: mun?.ibge || '', endereco: limpa(endereco), coord: null,
    processo: '', licencas: [{ tipo: tipo || sigla, numero: limpa(numero), sigla, validade: br2iso(validade) }],
    atividade: limpa(atividade).slice(0, 200), orgao: 'IAT (Instituto Água e Terra)', esfera: 'estadual',
    confianca: categoria === 'ponto_proprio' ? 'analise' : 'confirmado',
    fase: nomeLic,
    trecho: limpa(`O Instituto Água e Terra torna público que concedeu à ${razao}, a ${nomeLic} com validade até ${validade}, para ${atividade} ${fase} na ${endereco} no município de ${munNome}/PR.`).slice(0, 1500)
  };
}

// de/ate: AAAA-MM-DD. ctx.mun: municípios do PR
export async function coletar(de, ate, log = console.log, ctx = {}) {
  const paginas = new Map(); let consultas = 0;
  for (const termo of TERMOS) {
    let total = 0, n = 0;
    for (let p = 0; p < 80; p++) {
      const d = await json(`${BASE}/busca/busca/buscar/query/${p}/di:${de}/df:${ate}/?1=1&q=${encodeURIComponent(termo)}`); consultas++;
      const hits = d.hits?.hits || []; total = +(d.hits?.total?.value ?? d.hits?.total ?? 0);
      for (const h of hits) { n++; if (!paginas.has(h._id)) paginas.set(h._id, { ...h._source, edicao: h.suplemento || '' }); }
      if (!hits.length || (p + 1) * hits.length >= total) break;
      await espera(600);
    }
    log(`DIOE-PR ${termo}: ${total} página(s) no período`);
    await espera(600);
  }
  const registros = [], docs = [], vistos = new Set(), amostra = [];
  for (const [id, pg] of paginas) {
    const texto = limpa(pg.conteudo);
    const data = pg.data || br2iso(texto);
    const url = `${BASE}/ver/${pg.diario_id}/${pg.pagina}/""`, pdf = `${BASE}/portal/edicoes/download/${pg.diario_id}/${pg.pagina}`;
    const local = `${pg.edicao || 'Edição ' + pg.diario_id}, página ${pg.pagina} (Diário Oficial Executivo)`;
    for (const m of texto.matchAll(CONCESSAO)) {
      const r = registro(m, ctx.mun);
      if (amostra.length < 300 && ATIV.test(m[6])) amostra.push({ data, titulo: `${m[3]} ${m[4]} · ${limpa(m[6]).slice(0, 80)}`, entidade: limpa(m[1]), trecho: limpa(m[0]).slice(0, 300) });
      if (!r) continue;
      const chave = `${m[3]}-${limpa(m[4])}`; if (vistos.has(chave)) continue; vistos.add(chave);
      registros.push({ ...r, id: `${pg.diario_id}-${pg.pagina}-${chave.replace(/[^\w-]+/g, '')}`, data, url, pdf, local });
    }
    let i = 0;
    for (const m of texto.matchAll(REQUER)) {
      if (!ATIV.test(m[0])) continue;
      docs.push({ id: `${id}-r${i++}`, titulo: 'Súmula de requerimento', entidade: '', data, texto: limpa(m[0]), trecho: limpa(m[0]).slice(0, 300), url, pdf, local });
    }
  }
  log(`DIOE-PR: ${paginas.size} página(s) lidas, ${registros.length} licença(s) de posto concedidas pelo IAT, ${docs.length} súmula(s) de requerimento de posto`);
  return { docs, registros, consultas, amostra: { encontradas: amostra, docs: docs.slice(0, 60) } };
}

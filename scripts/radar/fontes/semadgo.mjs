// Coletor do Boletim Ambiental da SEMAD-GO (Transparência Ambiental): mesma API pública que o portal
// portal.meioambiente.go.gov.br/transparencia-web usa na pesquisa (sem login nem CAPTCHA). Cada item é uma
// publicação do sistema Ipê: "torna público que EMPRESA apresentou requerimento / recebeu a licença", com número,
// atividades (código do Anexo da Lei 20.694/2019; posto = E3.4), tipo da licença e data.
// O boletim não traz município, CNPJ nem endereço: ficam como pendente de confirmação.
const API = 'https://portal.meioambiente.go.gov.br/boletim-ambiental-server';
const SITE = 'https://portal.meioambiente.go.gov.br/transparencia-web/#/boletim-ambiental';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)', accept: 'application/json' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const limpa = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const POR_PAGINA = 100;

export const info = { id: 'semad-go', uf: 'GO', nome: 'SEMAD-GO: Boletim Ambiental (pedidos e licenças do Ipê)', url: SITE, tipo: 'licenciamento' };

async function pega(caminho) {
  let erro;
  for (let t = 1; t <= 4; t++) {
    try { const r = await fetch(API + caminho, { headers: UA, signal: AbortSignal.timeout(90000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { erro = e; await espera(t * 4000); }
  }
  throw new Error(`SEMAD-GO: ${erro.message} (${caminho})`);
}

// tipos do Ipê: LP, LI, LO (o sufixo _I aparece em alguns), LAU (única), LAC (adesão e compromisso), LC (corretiva), REG (registro)
const SIGLA = t => String(t || '').toUpperCase().replace(/_I$/, '');

// transforma o item do boletim num registro do Radar (mesmos campos do classificador)
export function registro(x) {
  const t = limpa(x.texto);
  const razao = limpa((String(x.texto).match(/<b>([^<]+)<\/b>/) || [])[1]);
  const codigos = [...t.matchAll(/\b([A-F]\d{1,2}\.\d{1,2})\s+-/g)].map(m => m[1]);
  if (!codigos.includes('E3.4')) return null;
  if (/\bTRR\b|transportador.{0,12}revendedor.{0,12}retalhista/i.test(razao)) return null; // revenda atacadista, não é posto
  const numero = (t.match(/N[uú]mero:\s*(\d+)/) || [])[1] || '';
  const tipo = (t.match(/Tipo:\s*([A-Z_]+)/) || [])[1] || '';
  const sigla = SIGLA(tipo);
  const secao = String(x.secao || '');
  const emitida = /emitid/i.test(secao), cancelada = /cancelad/i.test(secao);
  const s = { LP: 'lp', LI: 'li', LO: 'lo', LAO: 'lo' }[sigla];
  const evento = cancelada ? 'indeferido' : emitida ? (s ? 'emitida_' + s : 'emitida') : ({ lp: 'req_lp', li: 'req_li', lo: 'req_lo' }[s] || 'req_outro');
  // só a atividade de posto: posto revendedor; com outras atividades junto (usina, frigorífico, mineração): abastecimento próprio
  const soPosto = codigos.every(c => c === 'E3.4');
  const categoria = !soPosto ? 'ponto_proprio' : (sigla === 'LP' || sigla === 'LI') ? 'novo' : 'outro';
  const data = String(x.dataPublicacao || '').slice(0, 10);
  return {
    tipoDoc: emitida ? 'licenca_emitida' : 'requerimento', evento, categoria,
    situacao: cancelada ? 'indeferido' : emitida ? 'aprovado' : 'solicitado',
    razao, fantasia: '', cnpj: '', municipio: '', ibge: '', endereco: '', coord: null,
    processo: numero, licencas: emitida && numero ? [{ tipo: sigla || tipo, numero }] : [],
    atividade: soPosto ? 'E3.4 Posto revendedor ou ponto de abastecimento de combustíveis' : `E3.4 junto com ${codigos.filter(c => c !== 'E3.4').join(', ')}`,
    orgao: 'SEMAD-GO (Secretaria de Estado de Meio Ambiente e Desenvolvimento Sustentável)', esfera: 'estadual',
    confianca: soPosto && categoria === 'novo' ? 'possivel' : 'analise',
    trecho: limpa(`${secao} · ${t}`).slice(0, 1500), dataDoc: data, tipoIpe: tipo
  };
}

// de/ate: AAAA-MM-DD. A pesquisa devolve do mais antigo para o mais novo: lê de trás para frente até passar de "de".
export async function coletar(de, ate, log = console.log) {
  const termo = 'E3.4';
  const q = p => `/itens-boletins/pesquisar?termo=${encodeURIComponent(termo)}&page=${p}&size=${POR_PAGINA}`;
  const primeira = await pega(q(0)); let consultas = 1;
  const total = primeira.totalPages || 0;
  const registros = [], amostra = []; let lidos = 0;
  for (let p = total - 1; p >= 0; p--) {
    const d = p === 0 ? primeira : await pega(q(p)); if (p) consultas++;
    const itens = d.content || [];
    for (const x of itens) {
      const data = String(x.dataPublicacao || '').slice(0, 10);
      if (data < de || data > ate) continue;
      lidos++;
      const r = registro(x);
      amostra.push({ data, titulo: `${x.secao} · ${r ? r.categoria + ' · ' + r.tipoIpe : 'fora'}`, entidade: limpa((String(x.texto).match(/<b>([^<]+)<\/b>/) || [])[1]), trecho: '' });
      if (!r) continue;
      const { tipoIpe, ...campos } = r;
      registros.push({ ...campos, id: x.uuid, data, url: SITE, pdf: '', local: `Boletim Ambiental da SEMAD-GO de ${data.split('-').reverse().join('/')} · ${x.secao}${r.processo ? ' · nº ' + r.processo : ''}` });
    }
    if (!itens.length || String(itens[0].dataPublicacao).slice(0, 10) < de) break;
    await espera(800);
  }
  log(`SEMAD-GO: ${lidos} publicação(ões) com E3.4 no período, ${registros.length} registro(s)`);
  return { docs: [], registros, consultas, amostra: { encontradas: amostra, docs: [] } };
}

// Robô do Radar de Novos Postos (MT, RS, SC, PR, SP, SE, PA, TO e RO). Roda no GitHub Actions (.github/workflows/radar-postos.yml).
// 1) decide se é hora de pesquisar (frequência e "Pesquisar agora" ficam em radar_config/geral);
// 2) coleta as fontes integradas; 3) separa e classifica os avisos; 4) cruza com a ANP;
// 5) deduplica e grava empreendimentos, processos, documentos, histórico, alertas e a execução.
// Sem o segredo FIREBASE_SERVICE_ACCOUNT (ou com RADAR_TESTE=true) roda em modo de teste: coleta e classifica
// de verdade, mas não grava nada no Firestore; o resultado vai para radar-saida/ (artefato da execução).
import { mkdir, writeFile } from 'node:fs/promises';
import { firestore } from './firestore.mjs';
import { municipiosUF } from './municipios.mjs';
import { avisosDaPagina, analisarAviso, analisarEmitidas, analisarLicenca, separarPublicacoes, hash, slug } from './classificar.mjs';
import * as iomat from './fontes/iomat.mjs';
import * as famurs from './fontes/famurs.mjs';
import { paraSigpub } from './fontes/famurs.mjs';
import * as doers from './fontes/doers.mjs';
import * as querido from './fontes/querido.mjs';
import * as sinfat from './fontes/sinfat.mjs';
import * as domsc from './fontes/domsc.mjs';
import * as dioepr from './fontes/dioepr.mjs';
import * as doesp from './fontes/doesp.mjs';
import * as simlampa from './fontes/simlampa.mjs';
import * as anpFonte from './fontes/anp.mjs';

const inicio = new Date();
const dia = d => new Date(d).toISOString().slice(0, 10);
const somaDias = (d, n) => dia(new Date(d).getTime() + n * 864e5);
const log = (...a) => console.log(...a);
const teste = process.env.RADAR_TESTE === 'true';
const db = teste ? null : firestore();
const gatilhoBase = process.env.RADAR_GATILHO || 'agendado';
// Fontes de diário oficial integradas, por Estado. RADAR_FONTES (ex.: "famurs,doe-rs") limita a rodada.
const FONTES = [{ mod: iomat, uf: 'MT' }, { mod: famurs, uf: 'RS' }, { mod: doers, uf: 'RS' }, { mod: querido, uf: 'RS' }, { mod: sinfat, uf: 'SC' }, { mod: domsc, uf: 'SC' }, { mod: querido.paraUF('SC', 'SC'), uf: 'SC' },
  { mod: dioepr, uf: 'PR' }, { mod: querido.paraUF('PR', 'PR'), uf: 'PR' },
  { mod: doesp, uf: 'SP' }, { mod: querido.paraUF('SP', 'SP'), uf: 'SP' },
  { mod: paraSigpub('sergipe', 'SE', 'Diário Oficial dos Municípios de Sergipe (SIGPub)', 'dom-se', 'DOM-SE'), uf: 'SE' }, { mod: querido.paraUF('SE', 'SE'), uf: 'SE' },
  { mod: simlampa, uf: 'PA' }, { mod: paraSigpub('famep', 'PA', 'Diário Oficial dos Municípios do Pará (FAMEP)'), uf: 'PA' }, { mod: querido.paraUF('PA', 'PA'), uf: 'PA' },
  { mod: querido.paraUF('TO', 'TO'), uf: 'TO' },
  { mod: paraSigpub('arom', 'RO', 'Diário Oficial dos Municípios de Rondônia (AROM)'), uf: 'RO' }, { mod: querido.paraUF('RO', 'RO'), uf: 'RO' }].filter(f => !process.env.RADAR_FONTES || process.env.RADAR_FONTES.split(',').includes(f.mod.info.id));
const NOME_UF = { MT: 'MATO GROSSO', RS: 'RIO GRANDE DO SUL', SC: 'SANTA CATARINA', PR: 'PARANÁ', SP: 'SÃO PAULO', SE: 'SERGIPE', PA: 'PARÁ', TO: 'TOCANTINS', RO: 'RONDÔNIA' };

const PRIOR_CAT = ['novo', 'tanques', 'ampliacao', 'reforma', 'renovacao', 'titularidade', 'ponto_proprio', 'outro'];
const PRIOR_CONF = ['confirmado', 'possivel', 'analise', 'nao_confirmado'];
const RELEVANTES = /^(req_lp|req_li|req_lp_li|req_lp_li_lo|emitida_lp|emitida_li)$/;
const NOMES_EVENTO = { req_lp: 'Solicitação de Licença Prévia', req_li: 'Solicitação de Licença de Instalação', req_lo: 'Solicitação de Licença de Operação', req_lp_li: 'Solicitação de LP e LI', req_lp_li_lo: 'Solicitação de LP, LI e LO', req_renov: 'Solicitação de renovação', req_titular: 'Mudança de titularidade ou razão social', req_outro: 'Requerimento ao órgão ambiental', emitida_lp: 'Licença Prévia emitida', emitida_li: 'Licença de Instalação emitida', emitida_lo: 'Licença de Operação emitida', emitida: 'Licença emitida', indeferido: 'Indeferido ou arquivado' };
const NOMES_CAT = { novo: 'Novo posto de combustível', ampliacao: 'Ampliação de posto existente', reforma: 'Reforma de posto existente', tanques: 'Instalação de tanques', renovacao: 'Renovação de licença', titularidade: 'Mudança de titularidade', ponto_proprio: 'Ponto de abastecimento próprio (fazenda ou frota)', outro: 'Outro evento de posto' };

// ---------- 1) é hora de pesquisar? ----------
let config = {}, fontesDb = {}, gatilho = gatilhoBase, pedidoPor = '';
if (db) {
  config = (await db.get('radar_config/geral')) || {};
  for (const f of await db.lista('radar_fontes')) fontesDb[f.id] = f;
  const ped = config.pedido && !config.pedido.atendido;
  const freqH = Number(config.frequenciaHoras) || 24;
  // a fonte mais atrasada manda: uma fonte nova (sem coleta) faz a rodada acontecer já
  const ultimaOk = Math.min(...FONTES.map(f => fontesDb[f.mod.info.id]?.ultimaOk ? new Date(fontesDb[f.mod.info.id].ultimaOk).getTime() : 0));
  if (ped) { gatilho = 'manual'; pedidoPor = config.pedido.por || ''; }
  else if (gatilhoBase === 'agendado' && Date.now() - ultimaOk < freqH * 36e5 - 10 * 6e4) { log(`Última pesquisa completa há ${((Date.now() - ultimaOk) / 36e5).toFixed(1)} h (frequência: ${freqH} h). Nada a fazer agora.`); process.exit(0); }
} else {
  if (!teste && gatilhoBase === 'agendado') { log('Sem o segredo FIREBASE_SERVICE_ACCOUNT o Radar não roda pelo agendamento. Configure a chave (docs/radar.md) ou rode manualmente em modo de teste.'); process.exit(0); }
  log(teste ? 'Modo de teste (RADAR_TESTE=true): nada será gravado.' : 'Sem FIREBASE_SERVICE_ACCOUNT: modo de teste, nada será gravado.');
}

// ---------- 2) coleta ----------
const ate = dia(inicio);
const periodo = id => process.env.RADAR_DESDE || (fontesDb[id]?.cursor ? somaDias(fontesDb[id].cursor, -5) : somaDias(ate, -(Number(process.env.RADAR_DIAS) || 365)));
const de = FONTES.map(f => periodo(f.mod.info.id)).sort()[0] || ate;
log(`Gatilho: ${gatilho} · fontes: ${FONTES.map(f => `${f.mod.info.id} (${periodo(f.mod.info.id)} a ${ate})`).join(', ')}`);

const UFS_ATIVAS = [...new Set(FONTES.map(f => f.uf))];
const mun = {}, anp = {};
for (const uf of UFS_ATIVAS) {
  [mun[uf], anp[uf]] = await Promise.all([municipiosUF(uf), anpFonte.carregarANP(uf)]);
  log(`Municípios de ${uf}: ${mun[uf].lista.length} · postos de ${uf} na base da ANP: ${anp[uf].total}`);
}

const porFonte = {}, avisos = [], amostras = {};
for (const { mod, uf } of FONTES) {
  const id = mod.info.id, deF = periodo(id);
  try {
    let n = 0, consultas = 0, lidos = 0;
    if (id === 'iomat') {
      const r = await mod.coletar(deF, ate, log); consultas = r.consultas; lidos = r.paginas.length;
      for (const pg of r.paginas) for (const a of avisosDaPagina(pg.texto)) {
        const rs = a.tipo === 'emitidas' ? analisarEmitidas(a.texto, mun.MT) : [analisarAviso(a.texto, mun.MT, 'MT')].filter(Boolean);
        for (const x of rs) { avisos.push({ ...x, uf, fonte: id, fonteNome: mod.info.nome, dataPublicacao: pg.data, url: pg.url, pdf: pg.pdf, local: `Edição ${pg.diario}, página ${pg.pagina}`, docId: `iomat-${pg.diario}-${pg.pagina}-${hash(x.trecho)}` }); n++; }
      }
    } else {
      // uma matéria por documento: licença emitida (prefeitura/FEPAM) ou aviso de requerimento
      const r = await mod.coletar(deF, ate, log, { mun: mun[uf] }); consultas = r.consultas; lidos = r.docs.length; if (r.amostra) amostras[id] = r.amostra;
      // registros já estruturados pela fonte (consulta de licenciamento): não passam pelo classificador de texto
      for (const x of r.registros || []) {
        const { id: rid, data, url, pdf, local, dataDoc, ...campos } = x;
        avisos.push({ ...campos, uf, fonte: id, fonteNome: mod.info.nome, dataPublicacao: data, url, pdf, local, docId: `${id}-${rid}` }); n++;
      }
      lidos += (r.registros || []).length;
      for (const d of r.docs) {
        const lic = analisarLicenca(d.texto, mun[uf], { titulo: d.titulo, uf, entidade: d.entidade });
        // matéria com várias publicações juntas ("A Secretaria ... torna público que CONCEDEU ..." uma atrás da outra):
        // se alguma delas é licença de posto, lê uma por uma; senão segue a separação de avisos de sempre
        const partes = lic ? [] : separarPublicacoes(d.texto);
        const licPartes = partes.map(p => analisarLicenca(p, mun[uf], { uf, entidade: d.entidade }));
        const rs = lic ? [lic] : licPartes.some(Boolean) ? partes.map((p, i) => licPartes[i] || analisarAviso(p, mun[uf], uf)).filter(Boolean)
          : avisosDaPagina(d.texto).map(a => analisarAviso(a.texto, mun[uf], uf)).filter(Boolean);
        for (const x of rs) {
          // publicação de lista do órgão (ex.: "licenças concedidas pela Fundação X"): o nome achado é o do órgão, não o da empresa
          if (x.razao && (/^(funda[cç][aã]o|prefeitura|munic[ií]pio|instituto|secretaria|departamento)\b/i.test(x.razao) || (d.entidade && slug(d.entidade).includes(slug(x.razao))))) { x.razao = ''; x.confianca = 'analise'; }
          if (!x.municipio && d.entidade) { const m = mun[uf].achar(d.entidade + ' ' + uf); if (m) { x.municipio = m.nome; x.ibge = m.ibge; } }
          avisos.push({ ...x, uf, fonte: id, fonteNome: mod.info.nome, dataPublicacao: d.data, url: d.url, pdf: d.pdf, local: d.local, docId: `${id}-${d.id}-${hash(x.trecho)}` }); n++;
        }
      }
    }
    porFonte[id] = { ok: true, uf, consultas, lidos, docs: n, de: deF };
    log(`${mod.info.nome}: ${consultas} consultas, ${lidos} páginas/matérias lidas, ${n} documentos de posto`);
  } catch (e) { porFonte[id] = { ok: false, uf, erro: e.message, de: deF }; console.error(e); }
}
for (const uf of UFS_ATIVAS) porFonte['anp-' + uf] = { ok: true, uf, docs: 0, postos: anp[uf].total };

// ---------- 3) deduplicação dos avisos (a mesma página aparece em várias buscas) ----------
const unicos = [...new Map(avisos.map(a => [a.docId, a])).values()];

// ---------- 4) empreendimentos ----------
const existentes = db ? await db.lista('radar_empreendimentos') : [];
const docsExist = new Set(db ? (await db.lista('radar_documentos')).map(d => d.id) : []);
const emps = new Map(existentes.map(e => [e.id, e]));
const porNomeMun = new Map(existentes.filter(e => e.razao).map(e => [slug(e.razao) + '|' + (e.ibge || ''), e.id]));
const novosDocs = [], historico = [], alertas = [], processos = new Map();
const recente = somaDias(ate, -10);

for (const a of unicos.sort((x, y) => String(x.dataPublicacao).localeCompare(String(y.dataPublicacao)))) {
  const campoFonte = {};
  // ANP: confirma o CNPJ, ou acha pelo nome + município (marcado como não confirmado)
  const A = anp[a.uf], M = mun[a.uf];
  let ap = a.cnpj ? A.cnpj(a.cnpj) : null;
  if (!a.cnpj && a.razao && a.municipio) { const m = A.nome(a.razao, a.municipio); if (m) { a.cnpj = m.cnpj; campoFonte.cnpj = 'anp_nome'; ap = m; } }
  let eid = a.cnpj || porNomeMun.get(slug(a.razao) + '|' + (a.ibge || ''));
  if (!eid) eid = a.razao ? `n-${slug(a.razao)}-${a.ibge || a.uf.toLowerCase()}` : `d-${a.docId}`;
  if (a.razao) porNomeMun.set(slug(a.razao) + '|' + (a.ibge || ''), eid);
  const novoEmp = !emps.has(eid);
  const e = emps.get(eid) || { id: eid, uf: a.uf, identificado: inicio, eventos: [], docs: [], processos: [] };
  if (!e.uf) e.uf = a.uf;
  const docNovo = !docsExist.has(a.docId);

  // campos: o que já existe só é trocado por um valor vindo de documento (nunca apagado)
  for (const k of ['razao', 'fantasia', 'municipio', 'ibge', 'endereco']) if (a[k] && !e[k]) e[k] = a[k];
  if (a.cnpj && !e.cnpj) { e.cnpj = a.cnpj; if (campoFonte.cnpj) e.campoFonte = { ...(e.campoFonte || {}), cnpj: campoFonte.cnpj }; }
  if (ap) { e.anp = { bandeira: ap.b || '', autorizacao: ap.a || '', vinculada: ap.dv || '' }; if (!e.razao) { e.razao = ap.r; e.campoFonte = { ...(e.campoFonte || {}), razao: 'anp' }; } }
  if (a.coord && (!e.lat || e.coordFonte === 'municipio')) { [e.lat, e.lng] = a.coord; e.coordFonte = 'documento'; }
  if (ap?.la && ap?.lo && (!e.lat || e.coordFonte === 'municipio')) { e.lat = ap.la; e.lng = ap.lo; e.coordFonte = 'anp'; }
  if (!e.lat && a.ibge) { const m = M.lista.find(x => x.ibge === a.ibge); if (m?.centro) { [e.lat, e.lng] = m.centro; e.coordFonte = 'municipio'; } }

  const antes = { situacao: e.situacao, categoria: e.categoria };
  if (!e.eventos.includes(a.evento)) e.eventos.push(a.evento);
  if (!e.docs.some(d => d.id === a.docId)) e.docs.push({ id: a.docId, fonte: a.fonte, url: a.url, data: a.dataPublicacao, evento: a.evento });
  e.docs = e.docs.sort((x, y) => String(y.data).localeCompare(String(x.data))).slice(0, 30);
  if (!e.ultimaData || a.dataPublicacao >= e.ultimaData) { e.ultimaData = a.dataPublicacao; e.ultimoEvento = a.evento; e.situacao = a.situacao; }
  if (!e.primeiraData || a.dataPublicacao < e.primeiraData) e.primeiraData = a.dataPublicacao;
  let cat = a.categoria;
  if (cat === 'novo' && e.anp && a.tipoDoc === 'requerimento') {
    if (a.evento === 'req_lo') cat = 'outro';
    else { cat = 'ampliacao'; e.categoriaMotivo = 'O CNPJ já é posto autorizado na ANP: pedido de LP/LI tratado como ampliação ou reforma.'; }
  }
  if (!e.categoria || PRIOR_CAT.indexOf(cat) < PRIOR_CAT.indexOf(e.categoria)) e.categoria = cat;
  if (!e.confianca || PRIOR_CONF.indexOf(a.confianca) < PRIOR_CONF.indexOf(e.confianca)) e.confianca = a.confianca;
  if (campoFonte.cnpj && e.confianca === 'confirmado' && !a.processo) e.confianca = 'possivel';
  e.pendentes = ['razao', 'cnpj', 'municipio', 'endereco'].filter(k => !e[k]);

  // processo: pelo número (órgão + número) ou, sem número, pelo evento na data
  const pid = a.processo ? `${a.esfera === 'municipal' ? 'mun-' + (a.ibge || a.uf.toLowerCase()) : a.uf === 'MT' ? 'sema' : 'est-' + a.uf.toLowerCase()}-${a.processo.replace(/\D+/g, '-')}` : `${eid}-${a.evento}-${a.dataPublicacao}`;
  const p = processos.get(pid) || { id: pid, eid, uf: a.uf, numero: a.processo || '', orgao: a.orgao || '', esfera: a.esfera || '', eventos: [], docs: [], licencas: [], dataAbertura: '' };
  if (!p.eventos.some(x => x.evento === a.evento && x.data === a.dataPublicacao)) p.eventos.push({ evento: a.evento, data: a.dataPublicacao, doc: a.docId });
  if (!p.docs.includes(a.docId)) p.docs.push(a.docId);
  (a.licencas || []).forEach(l => { if (!p.licencas.some(x => x.numero === l.numero)) p.licencas.push(l); });
  p.evento = a.evento; p.situacao = a.situacao; p.dataPublicacao = p.dataPublicacao && p.dataPublicacao < a.dataPublicacao ? p.dataPublicacao : a.dataPublicacao; p.ultimaData = a.dataPublicacao;
  processos.set(pid, p);
  const resumo = { numero: p.numero, orgao: p.orgao, evento: a.evento, data: a.dataPublicacao, id: pid, ...(p.licencas.length ? { licencas: p.licencas.slice(0, 4).map(l => ({ tipo: l.sigla || l.tipo, numero: l.numero })) } : {}) };
  e.processos = [resumo, ...e.processos.filter(x => x.id !== pid)].slice(0, 15);

  e.atualizado = inicio;
  emps.set(eid, e);

  if (docNovo) {
    docsExist.add(a.docId);
    novosDocs.push({ id: a.docId, eid, pid, uf: a.uf, fonte: a.fonte, fonteNome: a.fonteNome, url: a.url, pdf: a.pdf, local: a.local, titulo: `${NOMES_EVENTO[a.evento] || 'Aviso'} · ${a.razao || 'empresa não identificada'}`, dataPublicacao: a.dataPublicacao, coletado: inicio, tipoDoc: a.tipoDoc, evento: a.evento, categoria: a.categoria, confianca: a.confianca, municipio: a.municipio || '', razao: a.razao || '', cnpj: a.cnpj || '', processo: a.processo || '', orgao: a.orgao || '', atividade: a.atividade || '', trecho: a.trecho });
    historico.push({ eid, pid, uf: a.uf, tipo: novoEmp ? 'identificado' : 'novo_documento', descricao: `${novoEmp ? 'Identificado' : 'Novo documento'}: ${NOMES_EVENTO[a.evento] || a.evento} (${a.fonteNome}, ${a.dataPublicacao.split('-').reverse().join('/')})`, de: antes.situacao || '', para: e.situacao || '', doc: a.docId, por: 'robô', em: inicio });
    const relevante = (novoEmp && ['novo', 'ampliacao', 'tanques', 'reforma'].includes(e.categoria)) || (!novoEmp && RELEVANTES.test(a.evento));
    if (relevante && a.dataPublicacao >= recente) {
      const tit = (novoEmp && e.categoria === 'novo' ? 'NOVO POSTO IDENTIFICADO EM ' : 'MOVIMENTAÇÃO DE POSTO EM ') + NOME_UF[a.uf];
      alertas.push({ eid, uf: a.uf, doc: a.docId, titulo: tit, criado: inicio, lidoPor: [], canal: 'app',
        texto: [`Empresa: ${e.razao || 'pendente de confirmação'}`, `CNPJ: ${e.cnpj ? e.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') + (e.campoFonte?.cnpj ? ' (pela base da ANP, não confirmado)' : '') : 'pendente de confirmação'}`, `Município: ${e.municipio ? e.municipio + ' – ' + a.uf : 'pendente de confirmação'}`, `Processo: ${a.processo || 'pendente de confirmação'}`, `Atividade: ${NOMES_CAT[e.categoria] || ''}`, `Licença: ${NOMES_EVENTO[a.evento] || ''}`, `Fonte: ${a.fonteNome}, ${a.local}`, `Data da identificação: ${inicio.toLocaleString('pt-BR', { timeZone: a.uf === 'MT' ? 'America/Cuiaba' : 'America/Sao_Paulo' })}`, `Documento: ${a.url}`].join('\n') });
    }
  }
}

const tocados = [...new Set(novosDocs.map(d => d.eid))];
const okGeral = Object.values(porFonte).every(f => f.ok);
const exec = { inicio, fim: new Date(), status: okGeral ? 'ok' : 'erro', gatilho, pedidoPor, periodo: { de, ate }, porFonte, documentos: unicos.length, novos: tocados.filter(id => !existentes.some(e => e.id === id)).length, atualizados: tocados.filter(id => existentes.some(e => e.id === id)).length, novosDocumentos: novosDocs.length, alertas: alertas.length, teste: !db };
exec.duracaoSeg = Math.round((exec.fim - inicio) / 1000);
for (const id of Object.keys(porFonte)) if (porFonte[id].ok && porFonte[id].docs !== undefined) porFonte[id].novos = novosDocs.filter(d => d.fonte === id).length;
log(`Resultado: ${unicos.length} avisos únicos · ${emps.size} empreendimentos · ${exec.novos} novos · ${exec.atualizados} atualizados · ${novosDocs.length} documentos novos · ${alertas.length} alertas`);

// ---------- 5) gravação ----------
if (db) {
  const itens = [];
  const campos = e => { const { revisao, leadId, id, ...resto } = e; return resto; }; // revisão e lead são do app: o robô não mexe
  for (const id of tocados) itens.push({ caminho: `radar_empreendimentos/${id}`, dados: campos(emps.get(id)), mesclar: true });
  for (const p of processos.values()) if (p.docs.some(d => novosDocs.some(n => n.id === d))) itens.push({ caminho: `radar_processos/${p.id}`, dados: p, mesclar: true });
  for (const d of novosDocs) itens.push({ caminho: `radar_documentos/${d.id}`, dados: d });
  const auto = () => inicio.getTime().toString(36) + Math.random().toString(36).slice(2, 8);
  for (const h of historico) itens.push({ caminho: `radar_historico/${auto()}`, dados: h });
  for (const a of alertas) itens.push({ caminho: `radar_alertas/${auto()}`, dados: a });
  for (const { mod, uf } of FONTES) {
    const id = mod.info.id, f = porFonte[id];
    itens.push({ caminho: `radar_fontes/${id}`, mesclar: true, dados: { ...mod.info, uf, situacao: f.ok ? 'integrada' : (fontesDb[id]?.situacao || 'nao_integrada'), ultimaColeta: inicio, ...(f.ok ? { ultimaOk: inicio, cursor: ate, ultimoErro: '' } : { ultimoErro: f.erro }) } });
  }
  itens.push({ caminho: 'radar_fontes/anp', mesclar: true, dados: { ...anpFonte.info, ufs: UFS_ATIVAS, situacao: 'integrada', ultimaColeta: inicio, ultimaOk: inicio, ultimoErro: '' } });
  itens.push({ caminho: `radar_execucoes/${auto()}`, dados: exec });
  if (gatilho === 'manual') itens.push({ caminho: 'radar_config/geral', mesclar: true, dados: { pedido: { ...config.pedido, atendido: true, atendidoEm: inicio } } });
  await db.gravar(itens);
  log(`Gravados ${itens.length} registros no Firestore.`);
} else {
  const saida = new URL('../../radar-saida/', import.meta.url);
  await mkdir(saida, { recursive: true });
  await writeFile(new URL('execucao.json', saida), JSON.stringify(exec, null, 1));
  await writeFile(new URL('empreendimentos.json', saida), JSON.stringify([...emps.values()], null, 1));
  await writeFile(new URL('documentos.json', saida), JSON.stringify(novosDocs, null, 1));
  await writeFile(new URL('alertas.json', saida), JSON.stringify(alertas, null, 1));
  // amostra do que cada fonte devolveu, para conferir a extração
  for (const [id, a] of Object.entries(amostras)) await writeFile(new URL(`amostra-${id}.json`, saida), JSON.stringify(a, null, 1));
  if (process.env.RADAR_AMOSTRA_LOG) for (const [id, a] of Object.entries(amostras)) {
    const c = s => String(s || '').replace(/\s+/g, ' ').trim();
    log(`\n=== AMOSTRA ${id}: ${a.encontradas.length} encontradas, ${a.docs.length} lidas ===`);
    if (a.pagina1) { const h = a.pagina1, i = Math.max(0, h.search(/materia-card|Mostrando|resultado|Nenhum/i)); log('PAGINA1 ' + c(h.slice(i, i + 2500))); }
    for (const e of a.encontradas.slice(0, 80)) log(`E ${e.data} | ${c(e.tipoMateria || e.titulo)} | ${c(e.entidade)} | ${c(e.trecho).slice(0, 200)}`);
    for (const d of a.docs) log(`D ${d.id} | ${c(d.titulo)} | ${c(d.entidade)} | ${c(d.texto).slice(0, 900)}`);
  }
  const linhas = [...emps.values()].filter(e => ['novo', 'ampliacao', 'tanques'].includes(e.categoria)).sort((a, b) => b.ultimaData.localeCompare(a.ultimaData));
  log(`\nNovos/ampliações/tanques (${linhas.length}):`);
  for (const e of linhas) log(`  ${e.uf} · ${e.ultimaData} · ${NOMES_CAT[e.categoria]} · ${NOMES_EVENTO[e.ultimoEvento]} · ${e.razao || '?'} · ${e.cnpj || 'sem CNPJ'} · ${e.municipio || '?'} · ${e.confianca}${e.anp ? ' · já na ANP' : ''}`);
}
if (!okGeral) process.exitCode = 1;

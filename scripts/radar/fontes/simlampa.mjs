// Coletor do SIMLAM público da SEMAS-PA (licenciamento ambiental estadual do Pará). Usa a mesma consulta pública de
// processos do site (sem login nem CAPTCHA): pesquisa avançada por ano do processo e nome do empreendimento, depois
// abre a página de cada processo (tipo, situação, atividades licenciadas, títulos emitidos e movimentação).
// Fica só com processos de licenciamento cuja atividade licenciada é de posto (ex.: 310 "Posto Revendedor, Posto
// Flutuante, Posto de Abastecimento..."). Muitos postos aparecem com a atividade 2303 (transporte de produtos
// perigosos, ou seja, o caminhão-tanque) ou com processo infracional: esses ficam de fora.
// A consulta não mostra município, CNPJ nem endereço: ficam "pendente de confirmação"; o núcleo regional vai no trecho.
const BASE = 'https://monitoramento.semas.pa.gov.br/simlam/';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const limpa = s => String(s || '').replace(/\s+/g, ' ').trim();
const ent = s => String(s).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const br2iso = d => { const m = String(d).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
const iso2br = d => d ? d.split('-').reverse().join('/') : '';

export const info = { id: 'simlam-pa', uf: 'PA', nome: 'SEMAS-PA: consulta pública de processos (SIMLAM)', url: BASE + 'ListarProcessos.aspx', tipo: 'licenciamento' };
// a consulta não filtra por atividade: pesquisa por pedaços de nome comuns em postos
export const NOMES = ['posto', 'combust', 'petro', 'abastec', 'derivad'];
const ATIV_POSTO = /posto\s+(revendedor|flutuante|de\s+abastecimento|varejista)|revend\w*\s+de\s+combust|com[eé]rcio\s+varejista\s+de\s+combust/i;

// sessão ASP.NET: guarda o cookie entre a página de pesquisa e os postbacks
function sessao() {
  let cookie = '';
  return async function req(u, body) {
    let erro;
    for (let t = 1; t <= 4; t++) {
      try {
        const r = await fetch(u, { method: body ? 'POST' : 'GET', body, headers: { ...UA, cookie, ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
        const sc = r.headers.getSetCookie?.() || []; if (sc.length) cookie = sc.map(c => c.split(';')[0]).join('; ');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return await r.text();
      } catch (e) { erro = e; await espera(t * 4000); }
    }
    throw new Error(`SIMLAM-PA: ${erro.message} (${u})`);
  };
}
const ocultos = h => { const f = new URLSearchParams(); for (const m of h.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) { const n = (m[0].match(/name="([^"]+)"/) || [])[1], v = (m[0].match(/value="([^"]*)"/) || [, ''])[1]; if (n) f.set(n, ent(v)); } return f; };
const celulas = h => ent(h.replace(/<(script|style)[^]*?<\/\1>/gi, '').replace(/<[^>]+>/g, '|')).split('|').map(limpa).filter(Boolean);

// linhas da lista de resultados: id interno, número, empreendimento, interessado, situação
function linhas(h) {
  const out = [];
  for (const m of h.matchAll(/<tr[^>]*>([^]*?)<\/tr>/g)) {
    const id = (m[1].match(/abrirProcesso\((\d+)\)/) || [])[1]; if (!id) continue;
    const c = celulas(m[1]);
    out.push({ id, numero: c[0] || '', nome: c[1] || '', interessado: c[2] || '', situacao: c[3] || '' });
  }
  return out;
}

async function pesquisar(req, ano, nome, log) {
  let h = await req(BASE + 'ListarProcessos.aspx');
  const campos = f => { f.set('ctl00$baseBody$txtNumeroDocumento', ano); f.set('ctl00$baseBody$txtNomeEmpreendimento', nome); return f; };
  let f = campos(ocultos(h)); f.set('__EVENTTARGET', 'ctl00$baseBody$btnBuscaAvancada');
  h = await req(BASE + 'ListarProcessos.aspx', f);
  const total = +(ent(h).match(/Foram encontrados\s+(\d+)/) || [, 0])[1];
  const todas = linhas(h); let consultas = 2;
  for (let p = 2; p <= 60 && todas.length < total; p++) {
    const alvo = [...h.matchAll(/__doPostBack\(&#39;([^&]+)&#39;,&#39;([^&]*)&#39;\)[^>]*>\s*(\d+|\.\.\.)\s*</g)].find(m => +m[3] === p)
      || [...h.matchAll(/__doPostBack\(&#39;([^&]+)&#39;,&#39;([^&]*)&#39;\)[^>]*>\s*\.\.\.\s*</g)].pop();
    if (!alvo) break;
    f = campos(ocultos(h)); f.set('__EVENTTARGET', alvo[1]); f.set('__EVENTARGUMENT', alvo[2]);
    h = await req(BASE + 'ListarProcessos.aspx', f); consultas++;
    const novas = linhas(h).filter(l => !todas.some(t => t.id === l.id)); if (!novas.length) break;
    todas.push(...novas); await espera(400);
  }
  log(`SIMLAM-PA ${ano} "${nome}": ${total} processo(s), ${todas.length} lido(s) na lista`);
  return { linhas: todas.filter(l => l.numero.startsWith(ano + '/')), consultas };
}

// página do processo
export function detalhe(html, id) {
  const c = celulas(html);
  const apos = rot => { const i = c.findIndex(x => x.replace(/:$/, '') === rot); return i >= 0 ? c[i + 1] || '' : ''; };
  const entre = (a, b) => { const i = c.indexOf(a), j = c.indexOf(b, i + 1); return i >= 0 ? c.slice(i + 1, j > i ? j : undefined) : []; };
  const ativ = entre('Atividades Licenciadas', 'Responsáveis Técnicos');
  const atividades = []; for (let i = 0; i < ativ.length; i++) if (/^\d{2,5}$/.test(ativ[i])) atividades.push({ codigo: ativ[i], nome: ativ[i + 1] || '' });
  const tit = entre('Títulos emitidos para este processo', 'Pendências');
  const titulos = []; for (let i = 0; i < tit.length; i++) if (/^\d{3,7}$/.test(tit[i]) && tit[i + 1] && !/^\d+$/.test(tit[i + 1])) titulos.push({ numero: tit[i], modelo: tit[i + 1], situacao: tit[i + 2] || '', objetivo: /^(Ativo|Inativo|Cancelado|Suspenso)$/i.test(tit[i + 2]) && tit[i + 3] && !/^\d+$/.test(tit[i + 3]) ? tit[i + 3] : '' });
  const datas = [...html.matchAll(/(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}/g)].map(m => br2iso(m[1])).sort();
  return {
    id, numero: apos('Número do Processo'), interessado: apos('Interessado'), tipo: apos('Tipo de Processo'), empreendimento: apos('Empreendimento'),
    situacao: apos('Situação'), setor: apos('Setor Atual') || apos('Arquivado no Setor'), atividades, titulos,
    protocolo: datas[0] || '', ultima: datas[datas.length - 1] || '', url: `${BASE}VisualizarProcesso.aspx?UrlRetorno=ListarProcessos.aspx&id=${id}`
  };
}

// transforma o processo num registro do Radar (mesmos campos do classificador)
export function registro(d) {
  if (!/licenciamento|renova|prorroga/i.test(d.tipo)) return null;
  const ativ = d.atividades.find(a => ATIV_POSTO.test(a.nome) || a.codigo === '310');
  if (!ativ) return null;
  const lic = d.titulos.filter(t => /^licen[cç]a\s+(pr[eé]via|de\s+instala|de\s+opera)/i.test(t.modelo) && !/cancel|suspens/i.test(t.situacao));
  const sigla = t => /pr[eé]via/i.test(t.modelo) ? 'LP' : /instala/i.test(t.modelo) ? 'LI' : 'LO';
  const tipos = [...new Set(lic.map(sigla))];
  const renov = /renova/i.test(d.tipo) || lic.some(t => /renova/i.test(t.objetivo));
  const negada = !lic.length && /indeferid|arquivad|cancelad/i.test(d.situacao);
  const t0 = tipos.includes('LP') ? 'LP' : tipos.includes('LI') ? 'LI' : tipos[0] || '';
  const evento = negada ? 'indeferido' : t0 ? 'emitida_' + t0.toLowerCase() : renov ? 'req_renov' : /instala/i.test(d.tipo) ? 'req_li' : /pr[eé]via/i.test(d.tipo) ? 'req_lp' : 'req_outro';
  const categoria = renov ? 'renovacao' : (t0 === 'LP' || t0 === 'LI' || /\b(LP|LI)\b|pr[eé]via|instala/i.test(d.tipo)) ? 'novo' : 'outro';
  const primeiro = /primeiro/i.test(d.tipo);
  return {
    tipoDoc: lic.length ? 'licenca_emitida' : 'requerimento', evento, categoria,
    situacao: negada ? 'indeferido' : lic.length || /deferid|licenciad/i.test(d.situacao) && !/indeferid/i.test(d.situacao) ? 'aprovado' : 'solicitado',
    razao: d.empreendimento, fantasia: '', cnpj: '', municipio: '', ibge: '', endereco: '', coord: null,
    processo: d.numero, licencas: lic.map(t => ({ tipo: sigla(t), numero: t.numero })),
    atividade: `${ativ.codigo} ${ativ.nome}`.slice(0, 200), orgao: 'SEMAS-PA (Secretaria de Estado de Meio Ambiente e Sustentabilidade do Pará)', esfera: 'estadual',
    confianca: categoria === 'novo' ? 'confirmado' : 'analise',
    fase: limpa(`${d.tipo} · ${d.situacao}${primeiro ? ' (primeiro licenciamento: pode ser posto novo ou regularização de posto existente)' : ''}`),
    trecho: limpa(`Processo ${d.numero} · ${d.tipo} · ${d.situacao} · Empreendimento ${d.empreendimento} · Interessado ${d.interessado} · Atividade ${ativ.codigo} ${ativ.nome} · ${lic.map(t => `${t.modelo} ${t.numero}${t.objetivo ? ' (' + t.objetivo + ')' : ''}`).join(' · ') || 'Nenhuma licença emitida ainda'} · ${d.setor} · Protocolo ${iso2br(d.protocolo)} · Última movimentação ${iso2br(d.ultima)} · Município, CNPJ e endereço não aparecem na consulta pública`).slice(0, 1500),
    dataDoc: lic.length || negada ? d.ultima : d.protocolo
  };
}

export async function coletar(de, ate, log = console.log) {
  const req = sessao();
  // processos protocolados até 1 ano antes ainda podem ter a licença emitida no período
  const anos = []; for (let a = +de.slice(0, 4) - 1; a <= +ate.slice(0, 4); a++) anos.push(String(a));
  const cand = new Map(); let consultas = 0;
  for (const ano of anos) for (const nome of NOMES) {
    const r = await pesquisar(req, ano, nome, log); consultas += r.consultas;
    for (const l of r.linhas) cand.set(l.id, l);
    await espera(800);
  }
  log(`SIMLAM-PA: ${cand.size} processo(s) para abrir`);
  const registros = [], amostra = [];
  for (const l of cand.values()) {
    try {
      const d = detalhe(await req(`${BASE}VisualizarProcesso.aspx?UrlRetorno=ListarProcessos.aspx&id=${l.id}`), l.id); consultas++;
      if (!d.numero) d.numero = l.numero; if (!d.empreendimento) d.empreendimento = l.nome;
      const r = registro(d);
      amostra.push({ data: d.protocolo, titulo: `${d.numero} · ${d.tipo} · ${d.situacao} · ${d.atividades.map(a => a.codigo).join(',') || 'sem atividade'} · ${r ? 'POSTO' : 'fora'}`, entidade: d.empreendimento, trecho: d.titulos.map(t => t.modelo).join(', ') });
      if (r && d.ultima >= de && r.dataDoc <= ate) registros.push({ ...r, dataDoc: r.dataDoc < de ? d.ultima : r.dataDoc, id: `${d.numero.replace(/\D/g, '')}-${r.evento}`, data: r.dataDoc < de ? d.ultima : r.dataDoc, url: d.url, pdf: '', local: `Processo ${d.numero} no SIMLAM da SEMAS-PA · ${d.setor}` });
    } catch (e) { log('SIMLAM-PA processo ' + l.id + ': ' + e.message); }
    await espera(300);
  }
  log(`SIMLAM-PA: ${registros.length} processo(s) de posto no período`);
  return { docs: [], registros, consultas, amostra: { encontradas: amostra, docs: [] } };
}

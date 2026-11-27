// Classificação e extração dos avisos. Tudo por regras sobre o texto publicado: nada é inventado.
// Campo que não aparece no texto fica vazio (o app mostra "pendente de confirmação").
import { createHash } from 'node:crypto';
import { semAcento } from './municipios.mjs';

const limpa = s => String(s || '').replace(/\s+/g, ' ').trim();
export const hash = s => createHash('sha1').update(semAcento(s).replace(/[^a-z0-9]/g, '')).digest('hex').slice(0, 12);
export const slug = s => semAcento(s).replace(/\b(ltda|me|epp|eireli|s\/?a|sa|cia|e)\b/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

// Atividade de posto (revenda varejista) e o que não é posto
const POSTO = /com[eé]rcio\s+(a\s+)?varej(ista|o)\s+de\s+combust|posto\s+(de\s+)?(combust|abastecimento|revendedor|de\s+gasolina)|revend\w*\s+(varejista\s+)?de\s+combust|revenda\s+varejista|tanques?\s+subterr|sistema\s+de\s+armazenamento\s+a[eé]reo\s+de\s+combust|ponto\s+de\s+abastecimento|armazenamento\s+de\s+combust|abastecimento\s+de\s+combust/i;
const NOME_POSTO = /\b(auto\s*posto|posto|combust[ií]ve(l|is)|petr[oó]leo|derivados)\b/i;
const NAO_POSTO = /licita[cç][aã]o|preg[aã]o|contrat(o|ada|ante)|termo\s+aditivo|ata\s+de\s+registro|fornecimento|recupera[cç][aã]o\s+judicial|credores|fal[eê]ncia|edital\s+de\s+intima|g[aá]s\s+liquefeito|\bGLP\b|com[eé]rcio\s+atacadista|\bTRR\b|transportador.{0,10}revendedor.{0,10}retalhista/i;
const REQUER = /torna(-|\s)?(se\s+)?p[uú]blic|requer(eu|ido|imento|e)?|solicit(ou|a)|ir[aá]\s+requerer/i;
const EMITIDAS = /torna\s+p[uú]blicas?\s+as\s+seguintes\s+licen[cç]as\s+emitidas/i;
const INDEFERE = /indeferi|arquivamento|arquivad[oa]/i;

export const cnpjValido = c => {
  const d = String(c || '').replace(/\D/g, ''); if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = n => { let s = 0, p = n - 7; for (let i = 0; i < n; i++) { s += d[i] * p--; if (p < 2) p = 9; } const r = s % 11; return r < 2 ? 0 : 11 - r; };
  return calc(12) === +d[12] && calc(13) === +d[13];
};

// Coordenadas em graus/minutos/segundos ("15°4’1.20”S e 57° 10’43.10”O") ou decimais negativas
function coordenadas(t) {
  const dms = [...t.matchAll(/(\d{1,2})\s*[°º]\s*(\d{1,2})\s*['’′]\s*([\d.,]+)\s*(?:["”″]|['’′]{2})?\s*([NSOWL])/gi)].map(m => { const v = +m[1] + +m[2] / 60 + parseFloat(m[3].replace(',', '.')) / 3600; return /[SOW]/i.test(m[4]) ? -v : v; });
  if (dms.length >= 2) { const [a, b] = dms; const lat = Math.abs(a) < Math.abs(b) ? a : b, lng = lat === a ? b : a; if ((lat < -6 && lat > -19 && lng < -50 && lng > -62) || (lat < -22.4 && lat > -34 && lng < -48 && lng > -58) || (lat < -19.6 && lat > -25.4 && lng < -44 && lng > -53.2) || (lat < 2.7 && lat > -14 && lng < -45 && lng > -67) || (lat < -9.4 && lat > -11.7 && lng < -36.3 && lng > -38.3)) return [+lat.toFixed(6), +lng.toFixed(6)]; }
  const dec = t.match(/(-1\d|-[0-9]|-2\d|-3[0-3])[.,](\d{3,})\D{1,20}(-3[6-9]|-4\d|-5\d|-6[0-7])[.,](\d{3,})/);
  if (dec) return [+(dec[1] + '.' + dec[2]), +(dec[3] + '.' + dec[4])];
  return null;
}

// Separa os avisos de uma página do IOMAT. "Protocolo NNNNNNN" separa matérias; dentro de um bloco do mesmo
// publicador, um novo aviso começa num nome seguido de CNPJ/CPF e de "torna público"/"requereu".
export function avisosDaPagina(texto) {
  const t = limpa(texto)
    .replace(/GOVERNO DO ESTADO DE MATO GROSSO Secretaria de Estado de Planejamento e Gest[aã]o - SEPLAG - Imprensa Oficial - IOMAT C[oó]digo de Autenticidade: \w+( N[ºo°] [\d.]+ P[aá]gina \d+)?/g, ' ')
    // cabeçalho e rodapé das páginas do Diário Oficial de GO (mesmo sistema do IOMAT)
    .replace(/GOI[AÂ]NIA,\s+[A-ZÇ-]+FEIRA,\s+\d{1,2}\s+DE\s+[A-ZÇ]+\s+DE\s+\d{4}\s+ANO\s+\d+\s+-\s+DI[AÁ]RIO\s+OFICIAL\/GO\s+N[°º]\s+[\d.]+(\s+Di[aá]rio\s+Oficial)?(\s+\d+)?/g, ' ')
    .replace(/GOI[AÂ]NIA,\s+(S[AÁ]BADO|DOMINGO),\s+\d{1,2}\s+DE\s+[A-ZÇ]+\s+DE\s+\d{4}\s+ANO\s+\d+\s+-\s+DI[AÁ]RIO\s+OFICIAL\/GO\s+N[°º]\s+[\d.]+/g, ' ')
    .replace(/DIARIO OFICIAL DO ESTADO DE GOIAS Assinado digitalmente pela ABC - AGENCIA BRASIL CENTRAL CODIGO DE AUTENTICACAO: \w+/g, ' ')
    .replace(/PUBLICA[CÇ][OÕ]ES\s+PARTICULARES/g, ' ')
    .replace(/(^|\s)Di[aá]rio\s+Oficial(\s+\d{1,3})?(?=\s+[A-ZÀ-Ú])/g, ' ')
    .replace(/_{4,}/g, ' Protocolo 000000 ') // linha separadora entre avisos
    .replace(/(Di[aá]rio Oficial )?\d{1,2} de [a-zç]+ de \d{4}( Di[aá]rio Oficial)?( P[aá]gina \d+)?( N[ºo°] [\d.]+)?( P[aá]gina \d+)?/gi, ' ');
  const out = [];
  for (const bloco of t.split(/Protocolo\s+\d{6,8}/)) {
    if (EMITIDAS.test(bloco) || (bloco.match(/\b\d{3,7}\/\d{4}\s+(?:LP|LI|LO|LAS|LOP)\s*N[°º.]/gi) || []).length >= 2) { out.push({ tipo: 'emitidas', texto: limpa(bloco) }); continue; }
    const inicios = [0];
    const re = /(?:^|[.;)”"]\s+|\d{4}-\d{4}\)?\s+|Publicar-[\d-]+\s+|ASPLEMAT Publica[cç][oõ]es \(\d+\) [\d-]+\s+)(?=[A-ZÀ-Ú0-9"“])/g;
    let m;
    while ((m = re.exec(bloco))) {
      if (!m[0]) re.lastIndex++; // início do bloco casa vazio: avança para não repetir para sempre
      const i = m.index + m[0].length, adiante = bloco.slice(i, i + 700);
      if (i > 0 && !/^(CNPJ|CPF|inscrit|CEP|IE\b|Inscri)/i.test(adiante) && /CNPJ|CPF/i.test(adiante.slice(0, 320)) && REQUER.test(adiante)) inicios.push(i);
    }
    // nome em maiúsculas seguido de CNPJ no meio do texto: começa outro aviso se o anterior já tinha o seu "torna público"
    const caps = /(?<=\s)(?:[A-ZÀ-Ú0-9&.\-]{2,}\s){1,8}[A-ZÀ-Ú0-9&.\-]{2,}\.?,?\s*[-–]?\s*(?:(?:inscrit[oa]|devidamente\s+inscrit[oa])\s+no\s+)?CNPJ/g;
    while ((m = caps.exec(bloco))) {
      const i = m.index, ant = inicios.filter(x => x < i).pop() ?? 0;
      if (i - ant > 60 && REQUER.test(bloco.slice(ant, i)) && REQUER.test(bloco.slice(i, i + 500)) && !inicios.includes(i)) inicios.push(i);
    }
    inicios.sort((a, b) => a - b);
    inicios.push(bloco.length);
    for (let k = 0; k < inicios.length - 1; k++) { const a = limpa(bloco.slice(inicios[k], inicios[k + 1])); if (a.length > 40) out.push({ tipo: 'aviso', texto: a }); }
  }
  return out;
}

function orgao(t, mun, uf = 'MT') {
  const m = t.match(/((?:Secretaria|Departamento|Diretoria)\s+Municipal[^,.;]{0,90}?)(?:\s*[-–(]\s*[A-Z]{3,8}|,|\.|\s+a\s+|\s+o\s+)/i) || t.match(/Prefeitura\s+Municipal\s+de\s+[A-ZÀ-Úa-zà-ú' ]{3,40}/);
  const sig = t.match(/\b(SMADESS?|SMURB|SEMMA|SEMMEA|SEMAM|SMMA|SAMA|SMAMA|SEMAGRI|SEMMARH|SEMMAS|SEFIC|AMMA|SEMADI|SEMAI|SEMADUR|PLANURB|SEMAGEM)\b/) || t.match(/(Secretaria\s+(?:Municipal\s+)?de\s+Agricultura[^,.;]{0,60}Meio\s+Ambiente|Prefeitura\s+(?:Municipal\s+)?de\s+[A-ZÀ-Ú][A-Za-zÀ-ú' ]{2,30}|Coordenadoria\s+de\s+Meio\s+Ambiente[^,.;]{0,50})/);
  if (m || sig) return { orgao: limpa((m ? m[1] || m[0] : sig[1]).replace(/\s+-\s*$/, '')) + (mun ? ` (${mun.nome})` : ''), esfera: 'municipal' };
  if (uf === 'RS' && /\bFEPAM\b|Funda[cç][aã]o\s+Estadual\s+de\s+Prote[cç][aã]o\s+Ambiental/i.test(t)) return { orgao: 'FEPAM (Fundação Estadual de Proteção Ambiental)', esfera: 'estadual' };
  if (uf === 'SP' && /\bCETESB\b|Companhia\s+Ambiental\s+do\s+Estado\s+de\s+S[ãa]o\s+Paulo/i.test(t)) return { orgao: 'CETESB (Companhia Ambiental do Estado de SP)', esfera: 'estadual' };
  if (uf === 'PR' && /\bIAT\b|Instituto\s+[ÁA]gua\s+e\s+Terra/i.test(t)) return { orgao: 'IAT (Instituto Água e Terra)', esfera: 'estadual' };
  if (uf === 'PA' && /\bSEMAS\b|Secretaria\s+de\s+Estado\s+de\s+Meio\s+Ambiente\s+e\s+Sustentabilidade/i.test(t)) return { orgao: 'SEMAS-PA (Secretaria de Estado de Meio Ambiente e Sustentabilidade)', esfera: 'estadual' };
  if (uf === 'RO' && /\bSEDAM\b|Secretaria\s+de\s+Estado\s+do\s+Desenvolvimento\s+Ambiental/i.test(t)) return { orgao: 'SEDAM (Secretaria de Estado do Desenvolvimento Ambiental de RO)', esfera: 'estadual' };
  if (uf === 'TO' && /\bNATURATINS\b|Instituto\s+Natureza\s+do\s+Tocantins/i.test(t)) return { orgao: 'NATURATINS (Instituto Natureza do Tocantins)', esfera: 'estadual' };
  if (uf === 'SE' && /\bADEMA\b|Administra[cç][aã]o\s+Estadual\s+do\s+Meio\s+Ambiente/i.test(t)) return { orgao: 'ADEMA (Administração Estadual do Meio Ambiente de SE)', esfera: 'estadual' };
  if (uf === 'GO' && /\bSEMAD\b|Secretaria\s+de\s+Estado\s+de\s+Meio\s+Ambiente\s+e\s+Desenvolvimento\s+Sustent/i.test(t)) return { orgao: 'SEMAD-GO (Secretaria de Estado de Meio Ambiente e Desenvolvimento Sustentável)', esfera: 'estadual' };
  if (uf === 'MS' && /\bIMASUL\b|Instituto\s+de\s+Meio\s+Ambiente\s+de\s+Mato\s+Grosso\s+do\s+Sul/i.test(t)) return { orgao: 'IMASUL (Instituto de Meio Ambiente de Mato Grosso do Sul)', esfera: 'estadual' };
  if (uf === 'SC' && /\bIMA\b|Instituto\s+do\s+Meio\s+Ambiente\s+de\s+Santa\s+Catarina/i.test(t)) return { orgao: 'IMA (Instituto do Meio Ambiente de SC)', esfera: 'estadual' };
  if (/\bSEMA\b|Secretaria\s+(de\s+Estado|Estadual)\s+d[eo]\s+Meio\s+Ambiente/i.test(t)) return { orgao: `SEMA-${uf} (Secretaria de Estado de Meio Ambiente)`, esfera: 'estadual' };
  return { orgao: '', esfera: '' };
}

function licencasPedidas(t) {
  const s = semAcento(t);
  const lp = /licenca\s+previa|\blp\b/.test(s), li = /licenca\s+de\s+instalacao|\bli\b/.test(s), lo = /licenca\s+de\s+operacao|\blo\b/.test(s);
  const renov = /renova/.test(s), titular = /titularidade|razao\s+social|alteracao\s+de\s+dados/.test(s);
  const ampl = /amplia/.test(s), tanque = /tancagem|tanques?/.test(s), reforma = /reforma|readequa/.test(s);
  const agua = /uso\s+insignificante|outorga|poco\s+tubular|captacao/.test(s) && !lp && !li && !lo;
  let evento = 'req_outro';
  if (titular && !lp && !li && !renov) evento = 'req_titular';
  else if (renov) evento = 'req_renov';
  else if (lp && li && lo) evento = 'req_lp_li_lo';
  else if (lp && li) evento = 'req_lp_li';
  else if (lp) evento = 'req_lp';
  else if (li) evento = 'req_li';
  else if (lo) evento = 'req_lo';
  let categoria = 'outro';
  const proprio = /ponto\s+de\s+abastecimento|armazenamento\s+a[eé]reo|tanques?\s+a[eé]reos?|abastecimento\s+a[eé]reo|\bSAAC\b|\bP\.\s?A\.?\s*[-–]/i.test(t) || (/posto\s+de\s+abastecimento/i.test(t) && /fazenda|zona\s+rural|s[ií]tio|ch[aá]cara/i.test(t)) || /prefeitura\s+municipal\s+de\s+\S+.{0,40}torna/i.test(t);
  if (proprio && !/com[eé]rcio\s+(a\s+)?varej/i.test(t)) return { evento, categoria: 'ponto_proprio', agua };
  if (ampl && tanque) categoria = 'tanques';
  else if (ampl) categoria = 'ampliacao';
  else if (reforma) categoria = 'reforma';
  else if (tanque && (lp || li)) categoria = 'tanques';
  else if (['req_lp', 'req_li', 'req_lp_li', 'req_lp_li_lo'].includes(evento)) categoria = 'novo';
  else if (evento === 'req_lo') categoria = 'novo'; // LO sem renovação = primeira LO: posto pronto para abrir
  else if (renov) categoria = 'renovacao';
  else if (titular) categoria = 'titularidade';
  if (evento === 'req_outro' && titular) categoria = 'titularidade';
  return { evento, categoria, agua };
}

function empresa(t) {
  // aviso publicado pelo próprio município ("O MUNICÍPIO DE X, com CNPJ ..., torna público que ... o empreendimento Y,
  // inscrito no CNPJ"): o nome é o do empreendimento, não o do município
  if (/^\s*(?:O\s+|A\s+)?(?:MUNIC[IÍ]PIO|PREFEITURA|SECRETARIA)\b/i.test(t)) { const m = t.match(/(?:o\s+empreendimento|a\s+empresa)\s+(?=[A-ZÀ-Ú][^,;]{3,120}?\s*,?\s*(?:inscrit|CNPJ))/i); if (m) t = t.slice(m.index + m[0].length); }
  const i = t.search(/[,(\-–]?\s*(inscrit[oa]\s+no\s+|portador[a]?\s+do\s+|devidamente\s+inscrit[oa]\s+no\s+)?(CNPJ|CPF)\b/i);
  let nome = i > 0 ? t.slice(0, i) : (t.match(/^(.{5,120}?)(?:,|\s+torna|\s+-\s+)/) || [])[1] || '';
  const cab = /^(EDITAL DE COMUNICA[CÇ][AÃ]O|C\.\d|A\s+empresa|O\s+empreendimento|(?:A|O)\s+(?=[A-ZÀ-Ú])|A\s+Pessoa\s+Jur[ií]dica\s+de\s+Direito\s+Privado|[“"])\s*/i;
  for (let k = 0; k < 6 && cab.test(nome); k++) nome = nome.replace(cab, '');
  // cabeçalho de outra matéria colado antes do nome: fica o que vem depois do último cabeçalho
  const hdr = [...nome.matchAll(/\b(EDITAL\s+DE\s+[A-ZÇÃ]+|ASSEMBLEIA\s+GERAL(\s+(EXTRA)?ORDIN[AÁ]RIA)?|AVISO\s+DE\s+[A-ZÇÃ]+(\s+DE\s+LICEN[CÇ]A(\s+AMBIENTAL)?(\s+DE\s+(OPERA[CÇ][AÃ]O|INSTALA[CÇ][AÃ]O)|\s+PR[EÉ]VIA)?)?|CONVOCA[CÇ][AÃ]O|LICEN[CÇ]A\s+(DE\s+)?(OPERA[CÇ][AÃ]O|INSTALA[CÇ][AÃ]O|PR[EÉ]VIA)(\s*[–-]\s*L[PIO]C?)?(\s+N[º°]\s*[\d./]+)?)(?=\s|$)/g)].pop();
  if (hdr) { nome = nome.slice(hdr.index + hdr[0].length).replace(/^[\s\-–:]+/, ''); for (let k = 0; k < 3 && cab.test(nome); k++) nome = nome.replace(cab, ''); }
  nome = limpa(nome.replace(/^[\s\-–:]+/, '').replace(/,\s*pessoa\s+jur[ií]dica.*$/i, '').replace(/[.,;:\-–\s]+$/, ''));
  // aviso publicado pela consultoria em nome do cliente ("X ENGENHARIA torna público que a empresa Y"): fica Y
  nome = nome.replace(/^.*?\b(?:torna\s+p[uú]blico\s+que\s+(?:a\s+empresa|o\s+empreendimento)|informa\s+que\s+(?:a\s+empresa|o\s+empreendimento|o|a))\s+(?=[A-ZÀ-Ú0-9])/i, '')
    .replace(/,\s*(?:estabelecid|registrad|sediad|situad|localizad)[oa]s?\b.*$/i, '');
  // lixo de outra matéria antes do nome (valores, datas, cargos): fica o último pedaço
  const pedacos = nome.split(/\s*(?:R\$[-\s\d.,]+|\b\d{2}\/\d{2}\/\d{4}\b|Portaria\s+n[º°]?\s*\d+|Comiss[aã]o\s+Eleitoral|\bVALOR\b)\s*/i).filter(x => x.trim().split(/\s+/).length >= 2);
  if (pedacos.length > 1) nome = limpa(pedacos.pop());
  let fantasia = '';
  const pf = nome.match(/\(([^)]{3,60})\)/) || t.slice(0, 260).match(/nome\s+fantasia:?\s*([^,;]{3,60})/i);
  if (pf) { fantasia = limpa(pf[1]); nome = limpa(nome.replace(pf[0], '')); }
  const hf = nome.match(/^(.{4,}?)\s+[-–]\s+((?:AUTO\s+)?POSTO\b.{2,50})$/i) || nome.match(/^(.{4,}?\b(?:LTDA|EIRELI|ME|EPP|S\.?A)\.?)\s+[\/–-]\s+(.{2,50})$/i);
  if (hf) { nome = limpa(hf[1]); fantasia = fantasia || limpa(hf[2]); }
  nome = nome.replace(/^[\s,]*(a\s+empresa\s+)?que\s+denominava-se\s+.*?,?\s*passa\s+a\s+(?:ser|denominar-se)\s+/i, '').replace(/[.,;:\-–\s]+$/, '');
  if (nome.length > 140 || nome.length < 3) nome = '';
  return { razao: nome, fantasia };
}

function endereco(t) {
  const m = t.match(/(?:localizad[oa]|situad[oa]|sito|sita|instalad[oa]|endere[cç]o:?|a\s+ser\s+localizad[oa])\s*(?:na|no|à|a|em)?\s*:?\s*((?:Av|Avenida|Rua|R\.|Rod|Rodovia|BR|MT|RS|ERS|SC|PR|SP|PA|TO|RO|SE|Estrada|Travessa|Tv|Alameda|Lote|Quadra|Fazenda|S[ií]tio|Ent\.)[^]{5,170}?)(?=,?\s*(?:no\s+)?munic[ií]pio|\s*-\s*[A-ZÀ-Ú][\wÀ-ú' ]+\/?\s*-?\s*(?:MT|RS|SC|PR|SP|PA|TO|RO|SE)\b|,\s*CEP|\.\s|,?\s*coordenadas|$)/i);
  return m ? limpa(m[1]).replace(/[,.\s]+$/, '') : '';
}

// Um aviso de requerimento (o empreendedor publica que pediu a licença)
export function analisarAviso(texto, municipios, uf = municipios.uf || 'MT') {
  if (!POSTO.test(texto) || NAO_POSTO.test(texto.slice(0, 400))) return null;
  if (!REQUER.test(texto)) return null;
  const mun = municipios.achar(texto);
  // fica de fora o CNPJ do próprio município/órgão ("O MUNICÍPIO DE X, com CNPJ ...")
  const cnpjs = [...texto.matchAll(/\b\d{2}\.?\d{3}\.?\d{3}\s?\/\s?\d{4}\s?-?\s?\d{2}\b/g)].filter(m => !/(munic[ií]pio|prefeitura|secretaria|fundo\s+municipal)\s+(de\s+)?[^,;]{0,40},?\s*(com|inscrit[oa]\s+no|sob\s+o)?\s*(o\s+)?CNPJ[^\d]{0,12}$/i.test(texto.slice(Math.max(0, m.index - 90), m.index))).map(m => m[0].replace(/\D/g, '')).filter(cnpjValido);
  const { razao, fantasia } = empresa(texto);
  const proc = (texto.match(/processo\s*(?:SEMA\s*)?(?:n[º°o.]*|n[uú]mero)?\s*:?\s*(\d{1,7}\s*\/\s*\d{4})/i) || [])[1];
  const { evento, categoria, agua } = INDEFERE.test(texto) ? { evento: 'indeferido', categoria: 'outro', agua: false } : licencasPedidas(texto);
  const og = orgao(texto, mun, uf);
  const coord = coordenadas(texto);
  const forte = /com[eé]rcio\s+(a\s+)?varej|posto\s+(de\s+)?combust|posto\s+revendedor/i.test(texto);
  let confianca = 'possivel';
  if (forte && (cnpjs.length || proc) && evento !== 'req_outro') confianca = 'confirmado';
  if (!forte || agua || categoria === 'ponto_proprio') confianca = 'analise';
  return {
    tipoDoc: 'requerimento', evento: agua ? 'req_outro' : evento, categoria: agua ? 'outro' : categoria, situacao: evento === 'indeferido' ? 'indeferido' : 'solicitado',
    razao, fantasia, cnpj: cnpjs[0] || '', cnpjAnterior: cnpjs[1] || '', municipio: mun?.nome || '', ibge: mun?.ibge || '',
    endereco: endereco(texto), coord, processo: proc ? proc.replace(/\s/g, '') : '', orgao: og.orgao, esfera: og.esfera,
    confianca, trecho: texto.slice(0, 1500)
  };
}

// Lista da SEMA com licenças emitidas: uma linha por licença ("Protocolo · Licença · Razão · Atividade · Município/MT")
export function analisarEmitidas(texto, municipios) {
  const out = [];
  const unidade = (texto.match(/emitidas\s+pela\s+([^.]{5,120}?)\.\s/i) || [])[1] || '';
  const linhas = texto.split(/(?=\b\d{3,7}\/\d{4}\s+(?:LP|LI|LO|LAS|LOP|LAU|LOR|AUTORIZA))/i);
  for (const l of linhas) {
    if (!POSTO.test(l) || /com[eé]rcio\s+atacadista|\bTRR\b|g[aá]s\s+liquefeito/i.test(l)) continue;
    const proc = (l.match(/^(\d{3,7}\/\d{4})/) || [])[1]; if (!proc) continue;
    const lic = [...l.matchAll(/\b(LP|LI|LO|LAS|LOP|LAU|LOR)\s*N[°º.]*\s*([\d./]+)/gi)].map(m => ({ tipo: m[1].toUpperCase(), numero: m[2].replace(/\.$/, '') }));
    const munM = [...l.matchAll(/([A-ZÀ-Ú][A-Za-zÀ-ú'’ ]{2,40}?)\s*\/\s*MT\b/g)].pop();
    const mun = munM ? municipios.achar(munM[1] + '/MT') : municipios.achar(l);
    let resto = l.replace(/^\d{3,7}\/\d{4}\s+/, '').replace(/\b(LP|LI|LO|LAS|LOP|LAU|LOR|AUTORIZA[CÇ][AÃ]O)\s*N[°º.]*\s*[\d./]+\s*/gi, '').replace(/\b(Atividade Licenciada|Raz[aã]o Social|Munic[ií]pio)\b/g, ' ');
    if (munM) { const k = resto.lastIndexOf(munM[1]); if (k > 0) resto = resto.slice(0, k); }
    let iAtiv = resto.search(/Com[eé]rcio\s+(a\s+)?varej/i);
    if (iAtiv < 0) iAtiv = resto.search(/(Posto\s+de\s+Abastecimento|Sistema\s+de|Ponto\s+de|Revenda|Armazenamento|Instala[cç][aã]o)\b/i);
    const razao = iAtiv > 2 ? limpa(resto.slice(0, iAtiv)) : '';
    const atividade = iAtiv >= 0 ? limpa(resto.slice(iAtiv)).slice(0, 160) : '';
    const tipos = lic.map(x => x.tipo);
    const evento = tipos.includes('LP') ? 'emitida_lp' : tipos.includes('LI') ? 'emitida_li' : tipos.includes('LO') || tipos.includes('LOP') ? 'emitida_lo' : 'emitida';
    const proprio = /ponto\s+de\s+abastecimento|posto\s+de\s+abastecimento|a[eé]reo|\bSAAC\b/i.test(l) && !/com[eé]rcio\s+(a\s+)?varej/i.test(l);
    const categoria = proprio ? 'ponto_proprio' : tipos.includes('LP') || tipos.includes('LI') ? 'novo' : 'outro';
    const legivel = razao.length >= 4 && razao.length < 120 && !!mun;
    out.push({
      tipoDoc: 'licenca_emitida', evento, categoria, situacao: 'aprovado', razao: legivel ? razao : '', fantasia: '', cnpj: '', municipio: mun?.nome || '', ibge: mun?.ibge || '',
      endereco: '', coord: null, processo: proc, licencas: lic, atividade, orgao: 'SEMA-MT' + (unidade ? ' · ' + limpa(unidade) : ''), esfera: 'estadual',
      confianca: legivel && !proprio && /com[eé]rcio\s+(a\s+)?varej|posto/i.test(atividade) ? 'confirmado' : 'analise', trecho: limpa(l).slice(0, 700)
    });
  }
  return out;
}

// Licença emitida publicada como matéria própria (prefeituras do RS no Diário dos Municípios, FEPAM no DOE-RS):
// "LICENÇA DE INSTALAÇÃO Nº 12/2026 ... concede a presente licença a FULANO LTDA, CNPJ ..., para a atividade de
// comércio varejista de combustíveis". Só vale se o texto disser que a licença foi emitida e a atividade for de posto.
const TIPO_LIC = [['LP', /licen[cç]a\s+pr[eé]via|\bLP\s*(?:n[º°.]|\d)/i], ['LI', /licen[cç]a\s+(?:de\s+)?instala[cç][aã]o|\bLI\s*(?:n[º°.]|\d)/i], ['LO', /licen[cç]a\s+(?:de\s+)?opera[cç][aã]o|\bLOC?\s*(?:n[º°.]|\d)/i]];
const EMITE = /\b(expede|concede|emite|outorga|licencia|fica\s+licenciad|presente\s+licen[cç]a|v[aá]lid[ao]\s+at[eé]|prazo\s+de\s+validade|validade\s*:|com\s+base\s+nos\s+autos|concedeu|foi\s+concedid|aprova\s+a\s+(?:emiss[aã]o|renova[cç][aã]o)\s+da\s+licen[cç]a|recebeu\s+d[ao]\s+(?:secretaria|semma|semas|prefeitura|munic[ií]pio|funda[cç][aã]o|instituto)[^.]{0,80}licen[cç]a)/i;
export function analisarLicenca(texto, municipios, { titulo = '', uf = municipios.uf || 'MT', entidade = '' } = {}) {
  const cab = titulo + ' ' + texto.slice(0, 700);
  if (!POSTO.test(texto) || NAO_POSTO.test(titulo) || !EMITE.test(texto)) return null;
  // matéria com vários avisos (ex.: a secretaria publica várias licenças juntas) e o primeiro não é de posto:
  // devolve null para o texto ser separado aviso por aviso
  const avisos = [...texto.matchAll(/torna[mr]?\s+p[uú]blico/gi)];
  if (avisos.length >= 2 && !POSTO.test(texto.slice(0, avisos[1].index))) return null;
  const tipos = TIPO_LIC.filter(([, re]) => re.test(titulo)).map(([t]) => t);
  if (!tipos.length) TIPO_LIC.forEach(([t, re]) => { if (re.test(texto.slice(0, 700))) tipos.push(t); });
  if (!tipos.length) return null;
  if (/renova/i.test(cab)) tipos.push('renov');
  const mun = (entidade && municipios.achar(entidade + ' ' + uf)) || municipios.achar(texto);
  // fica de fora o CNPJ do próprio município/órgão ("O MUNICÍPIO DE X, com CNPJ ...")
  const cnpjs = [...texto.matchAll(/\b\d{2}\.?\d{3}\.?\d{3}\s?\/\s?\d{4}\s?-?\s?\d{2}\b/g)].filter(m => !/(munic[ií]pio|prefeitura|secretaria|fundo\s+municipal)\s+(de\s+)?[^,;]{0,40},?\s*(com|inscrit[oa]\s+no|sob\s+o)?\s*(o\s+)?CNPJ[^\d]{0,12}$/i.test(texto.slice(Math.max(0, m.index - 90), m.index))).map(m => m[0].replace(/\D/g, '')).filter(cnpjValido);
  const rot = texto.match(/(?:empreendedor|raz[aã]o\s+social|interessad[oa]|requerente|titular|nome)\s*:\s*([^:\n]{3,120}?)\s*(?:[,;–-]\s*)?(?:CNPJ|CPF|C\.N\.P\.J|endere[cç]o|ativ)/i)
    // "Aprova a emissão da Licença ... para um Posto ... de propriedade da empresa X" (conselho municipal) e
    // "Essa licença foi concedida à X – NOME FANTASIA, inscrito no CNPJ"
    || texto.match(/EMPREENDIMENTO\s*:\s*([^:]{3,120}?)\s+(?:Trata-se|Vistos|CNPJ|Endere[cç]o)/i)
    || texto.match(/de\s+propriedade\s+d[ae]\s+(?:empresa\s+)?([A-ZÀ-Ú].{2,110}?)\.?\s+O\s+CONSELHO/)
    || texto.match(/de\s+propriedade\s+d[ae]\s+(?:empresa\s+)?([A-ZÀ-Ú][^.;:]{3,100}?)(?:\.\s|\s*,|\s+inscrit)/)
    || texto.match(/(?:concedid[ao]|emitid[ao])\s+(?:à|ao|em\s+favor\s+d[ae])\s+(?:empresa\s+)?([A-ZÀ-Ú][^,;]{3,120}?)\s*,?\s*(?:inscrit|CNPJ|pessoa)/);
  const { razao: r2, fantasia } = empresa(texto.replace(/^[^]*?\b(?:a|à)\s+(?=[A-ZÀ-Ú][A-ZÀ-Ú0-9 .&-]{3,}\s*,?\s*(?:inscrit|CNPJ))/, ''));
  // "a empresa que denominava-se X, passa a ser Y": fica o nome novo
  const razao = limpa(rot ? rot[1] : r2).replace(/^[\s,.;–-]*(a\s+empresa|empresa)\s+/i, '').replace(/^.*\bpassa\s+a\s+(?:ser|denominar-se)\s+/i, '').replace(/[.,;\s]+$/, '');
  const numero = (cab.match(/\b(?:L[PIO]C?|licen[cç]a[^\dº°]{0,40})\s*n?[º°.]*\s*(\d{1,6}\s*\/\s*\d{2,4})/i) || [])[1];
  const proc = (texto.match(/processo\s*(?:administrativo\s*)?(?:n[º°o.]*|n[uú]mero)?\s*:?\s*([\d.\-]{3,20}\s*\/\s*\d{2,4}(?:-\d)?)/i) || [])[1];
  const t0 = tipos.find(x => x !== 'renov');
  const evento = t0 === 'LP' ? 'emitida_lp' : t0 === 'LI' ? 'emitida_li' : 'emitida_lo';
  const proprio = /ponto\s+de\s+abastecimento|consumo\s+pr[oó]prio|abastecimento\s+pr[oó]prio|tanques?\s+a[eé]reos?/i.test(texto) && !/com[eé]rcio\s+(a\s+)?varej/i.test(texto);
  const categoria = proprio ? 'ponto_proprio' : tipos.includes('renov') ? 'renovacao' : (t0 === 'LP' || t0 === 'LI') ? (/amplia/i.test(cab) ? 'ampliacao' : /reforma|readequa/i.test(cab) ? 'reforma' : 'novo') : 'outro';
  const og = orgao(entidade + ' ' + texto.slice(0, 900), mun, uf);
  const forte = /com[eé]rcio\s+(a\s+)?varej|posto\s+(de\s+)?combust|posto\s+revendedor|posto\s+de\s+gasolina/i.test(texto);
  const legivel = razao.length >= 4 && razao.length < 140;
  return {
    tipoDoc: 'licenca_emitida', evento, categoria, situacao: 'aprovado', razao: legivel ? razao : '', fantasia, cnpj: cnpjs[0] || '', municipio: mun?.nome || '', ibge: mun?.ibge || '',
    endereco: endereco(texto), coord: coordenadas(texto), processo: limpa(proc || '').replace(/\s/g, ''), licencas: numero ? [{ tipo: t0, numero: numero.replace(/\s/g, '') }] : [],
    atividade: (texto.match(/(com[eé]rcio\s+(?:a\s+)?varej[^.;\n]{0,120}|posto\s+de\s+(?:combust|abastecimento)[^.;\n]{0,100})/i) || [])[1] || '',
    orgao: og.orgao, esfera: og.esfera || (entidade ? 'municipal' : ''),
    confianca: forte && legivel && (cnpjs.length || numero) && !proprio ? 'confirmado' : forte ? 'possivel' : 'analise', trecho: limpa(texto).slice(0, 1500)
  };
}

// Separa uma matéria com várias publicações seguidas, cada uma com o seu "torna público" (ex.: a secretaria municipal
// publica várias licenças juntas). Cada parte começa na frase do "torna público". Com menos de 2, devolve [].
export function separarPublicacoes(texto) {
  const pos = [...texto.matchAll(/torna[mr]?\s+p[uú]blico/gi)].map(m => {
    const antes = texto.slice(Math.max(0, m.index - 250), m.index);
    const ini = Math.max(antes.lastIndexOf('. '), antes.lastIndexOf('” '), antes.lastIndexOf('" '));
    return m.index - antes.length + (ini >= 0 ? ini + 2 : 0);
  });
  if (pos.length < 2) return [];
  return pos.map((p, i) => limpa(texto.slice(i ? p : 0, pos[i + 1] ?? texto.length))).filter(p => p.length > 40);
}

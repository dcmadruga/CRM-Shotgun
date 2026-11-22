// Coletor do Diário Oficial do Estado do RS (DOE-RS). Usa a mesma API pública que o site oficial usa para a
// pesquisa de matérias (sem login nem CAPTCHA) e abre cada matéria candidata para ler o texto completo.
const API = 'https://doe-backend.pro.rs.gov.br/';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)', accept: 'application/json' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const limpa = s => String(s || '').replace(/\s+/g, ' ').trim();
const semTags = h => limpa(String(h || '').replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)));

export const info = { id: 'doe-rs', uf: 'RS', nome: 'Diário Oficial do Estado do RS (DOE-RS)', url: 'https://www.diariooficial.rs.gov.br/', tipo: 'diario_oficial' };
export const TERMOS = ['"posto de combustíveis"', '"comércio varejista de combustíveis"', '"posto de abastecimento"', '"revenda de combustíveis"'];
const FORA_TIPO = /contrat|licita|pessoal|instru[cç][oõ]es\s+normativas|delega|conv[eê]nio|edital|resultado/i;
const SINAL = /licen[cç]|FEPAM|meio\s+ambiente|ambiental|torna\s+p[uú]blic|requer/i;
const br2iso = d => { const m = String(d).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : String(d).slice(0, 10); };

async function json(u) {
  let erro;
  for (let t = 1; t <= 4; t++) {
    try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { erro = e; await espera(t * 4000); }
  }
  throw new Error(`DOE-RS: ${erro.message} (${u})`);
}
// o texto completo vem em algum campo da matéria; pega o maior campo de texto
const maiorTexto = o => { let m = ''; const anda = v => { if (typeof v === 'string') { if (v.length > m.length) m = v; } else if (v && typeof v === 'object') Object.values(v).forEach(anda); }; anda(o); return m; };

export async function coletar(de, ate, log = console.log) {
  const vistos = new Map(); let consultas = 0;
  for (const termo of TERMOS) {
    let total = 0;
    for (let p = 1; p <= 30; p++) {
      const d = await json(`${API}public/materias/?page=${p}&tipoDiario=DOE&queryString=${encodeURIComponent(termo)}&dataIni=${de}&dataFim=${ate}`); consultas++;
      total = d.collectionSize || 0;
      for (const c of d.collection || []) if (!vistos.has(c.id)) vistos.set(c.id, { id: c.id, data: br2iso(c.data), tipoMateria: c.tipoMateria || '', trecho: semTags(c.texto) });
      if (!(d.collection || []).length || p * (d.pageSize || 10) >= total) break;
      await espera(800);
    }
    log(`DOE-RS ${termo}: ${total} matéria(s) no período`);
  }
  const candidatas = [...vistos.values()].filter(c => !FORA_TIPO.test(c.tipoMateria) && SINAL.test(c.trecho));
  const docs = [];
  for (const c of candidatas) {
    try {
      const m = await json(`${API}public/materias/${c.id}`); consultas++;
      if (!docs.length) log('DOE-RS: campos da matéria: ' + Object.keys(m).join(', '));
      const titulo = limpa([m.nomeTipoMateria, m.nomeAssunto].filter(Boolean).join(' · ') || m.titulo || '');
      const entidade = limpa(m.nomeEntidadeCliente || m.nomeEntidade || '');
      docs.push({ ...c, titulo, entidade: typeof entidade === 'string' ? entidade : '', texto: semTags(m.conteudo || maiorTexto(m)), pdf0: m.pdf, url: `https://www.diariooficial.rs.gov.br/materia?id=${c.id}`, pdf: '', local: `Matéria ${c.id}${c.tipoMateria ? ' · ' + c.tipoMateria : ''}` });
    } catch (e) { log('DOE-RS matéria ' + c.id + ': ' + e.message); }
    await espera(600);
  }
  log(`DOE-RS: ${vistos.size} matérias encontradas, ${candidatas.length} candidatas lidas por inteiro`);
  return { docs, consultas, amostra: { encontradas: [...vistos.values()].slice(0, 300), docs: docs.map(d => ({ ...d, texto: d.texto.slice(0, 4000) })) } };
}

// Coletor do Querido Diário (Open Knowledge Brasil): API pública e aberta (sem login nem CAPTCHA) com o texto dos
// diários oficiais das prefeituras que o projeto já cobre. No RS cobre só uma parte das cidades, então complementa
// a FAMURS (cidades com diário próprio, como as maiores). Lê os trechos em volta de cada termo encontrado.
const API = 'https://api.queridodiario.org.br/';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)', accept: 'application/json' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const limpa = s => String(s || '').replace(/\s+/g, ' ').trim();

export const info = { id: 'querido-rs', uf: 'RS', nome: 'Querido Diário (diários próprios das cidades do RS)', url: 'https://queridodiario.ok.org.br/', tipo: 'diario_oficial' };
export const TERMOS = ['"posto de combustíveis"', '"posto de combustível"', '"comércio varejista de combustíveis"', '"posto de abastecimento"', '"revenda de combustíveis"', '"tanques subterrâneos"'];
// trecho que fala de licenciamento (o resto, como compras de combustível, fica de fora)
const SINAL = /licen[cç]a|licenciamento|ambiental|meio\s+ambiente|requer|\bL[PIO]C?\b|alvar[aá]/i;

async function json(u) {
  let erro;
  for (let t = 1; t <= 4; t++) {
    try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    catch (e) { erro = e; await espera(t * 4000); }
  }
  throw new Error(`Querido Diário: ${erro.message} (${u.slice(0, 160)})`);
}

// ctx.mun: municípios do Estado (para filtrar a pesquisa pelos códigos IBGE)
export async function coletar(de, ate, log = console.log, ctx = {}) {
  const codigos = (ctx.mun?.lista || []).map(m => m.ibge).filter(c => /^\d{7}$/.test(c));
  if (!codigos.length) throw new Error('Querido Diário: lista de municípios sem código IBGE');
  const lotes = []; for (let i = 0; i < codigos.length; i += 100) lotes.push(codigos.slice(i, i + 100));
  const docs = [], vistos = new Set(), cidades = new Set(); let consultas = 0, achados = 0;
  for (const termo of TERMOS) {
    let total = 0;
    for (const lote of lotes) {
      for (let off = 0; off < 500; off += 50) {
        const q = new URLSearchParams({ querystring: termo, published_since: de, published_until: ate, excerpt_size: '1500', number_of_excerpts: '10', size: '50', offset: String(off), sort_by: 'descending_date' });
        for (const c of lote) q.append('territory_ids', c);
        const d = await json(`${API}gazettes?${q}`); consultas++;
        const gs = d.gazettes || []; if (!off) total += d.total_gazettes || 0;
        for (const g of gs) {
          cidades.add(g.territory_name);
          (g.excerpts || []).forEach((ex, i) => {
            const texto = limpa(ex); achados++;
            if (!SINAL.test(texto)) return;
            const id = `${g.territory_id}-${g.date}-${g.edition || ''}-${i}-${texto.length}`;
            if (vistos.has(id)) return; vistos.add(id);
            docs.push({ id, titulo: '', entidade: `Prefeitura Municipal de ${g.territory_name}`, data: g.date, texto, trecho: texto.slice(0, 300), url: g.url, pdf: g.url, local: `Diário oficial de ${g.territory_name} de ${g.date.split('-').reverse().join('/')}${g.edition ? ', edição ' + g.edition : ''} (via Querido Diário)` });
          });
        }
        if (gs.length < 50) break;
        await espera(500);
      }
    }
    log(`Querido Diário ${termo}: ${total} diário(s) no período`);
  }
  log(`Querido Diário: ${achados} trechos em diários de ${cidades.size} cidade(s); ${docs.length} falam de licenciamento`);
  return { docs, consultas, amostra: { encontradas: docs.slice(0, 200).map(d => ({ data: d.data, titulo: d.local, entidade: d.entidade, trecho: d.trecho })), docs: docs.slice(0, 60) } };
}

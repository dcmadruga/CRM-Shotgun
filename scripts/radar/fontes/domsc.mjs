// Coletor do Diário Oficial dos Municípios de SC (DOM/SC, do CIGA). Usa a pesquisa pública do site (sem login nem
// CAPTCHA), só na categoria "Licenciamento ambiental", e lê o extrato de cada publicação candidata.
const BASE = 'https://diariomunicipal.sc.gov.br/';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const limpa = s => String(s || '').replace(/\s+/g, ' ').trim();
const ent = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&[a-z]+;/gi, ' ');
const texto = h => limpa(ent(String(h || '').replace(/<(script|style)[^]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ')));
const br = iso => iso.split('-').reverse().join('/');
const br2iso = d => { const m = String(d).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };

export const info = { id: 'dom-sc', uf: 'SC', nome: 'Diário Oficial dos Municípios de SC (DOM/SC)', url: BASE, tipo: 'diario_oficial' };
export const TERMOS = ['posto', 'combustível', 'combustíveis', 'tancagem', '"42.32"'];
const CAT = '&categoria=' + encodeURIComponent('Licenciamento ambiental');

async function pega(u) {
  let erro;
  for (let t = 1; t <= 4; t++) {
    try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); }
    catch (e) { erro = e; await espera(t * 4000); }
  }
  throw new Error(`DOM/SC: ${erro.message} (${u})`);
}

function resultados(html) {
  const out = [];
  for (const bloco of html.split('<h4><a href="/atos/').slice(1)) {
    const id = (bloco.match(/^(\d+)/) || [])[1]; if (!id) continue;
    const titulo = texto((bloco.match(/^\d+">([^]*?)<\/a><\/h4>/) || [])[1]);
    const quiet = texto((bloco.match(/<span class="quiet">([^]*?)<br>/) || [])[1]);
    const partes = quiet.split(' - ').map(limpa);
    const data = br2iso(partes[1] || '');
    const entidade = partes[partes.length - 1] || '';
    const pdf = ent((bloco.match(/<a href="([^"]+)"[^>]*>\[Abrir\/Salvar Original\]/) || [])[1] || '');
    const trecho = texto((bloco.match(/<p>([^]*?)(?:<p\/>|<\/p>|<h4>|$)/) || [])[1]);
    out.push({ id, titulo, data, entidade, pdf: pdf.startsWith('/') ? BASE + pdf.slice(1) : pdf, trecho, extrato: /\[Imprimir Extrato\]/.test(bloco) });
  }
  return { out, temMais: /<li class="next">/.test(html) };
}

export async function coletar(de, ate, log = console.log) {
  const vistos = new Map(); let consultas = 0;
  for (const termo of TERMOS) {
    let n = 0;
    for (let p = 1; p <= 30; p++) {
      const u = `${BASE}?r=site/index&q=${encodeURIComponent(termo)}${CAT}&dataInicial=${br(de)}&dataFinal=${br(ate)}${p > 1 ? '&AtoASolrDocument_page=' + p : ''}`;
      const { out, temMais } = resultados(await pega(u)); consultas++;
      for (const r of out) { n++; if (!vistos.has(r.id)) vistos.set(r.id, r); }
      if (!temMais || !out.length) break;
      await espera(800);
    }
    log(`DOM/SC ${termo}: ${n} publicação(ões) de licenciamento no período`);
    await espera(800);
  }
  const docs = [];
  for (const r of vistos.values()) {
    let corpo = '';
    if (r.extrato) try { corpo = texto(await pega(`${BASE}?r=ato/printExtrato&id=${r.id}&from=index`)); consultas++; } catch (e) { log('DOM/SC extrato ' + r.id + ': ' + e.message); }
    docs.push({ id: r.id, titulo: r.titulo, entidade: r.entidade, data: r.data, texto: corpo.length > r.trecho.length ? corpo : `${r.titulo}. ${r.trecho}`, trecho: r.trecho, url: BASE + 'atos/' + r.id, pdf: r.pdf, local: `Ato ${r.id} · ${r.entidade}` });
    await espera(500);
  }
  log(`DOM/SC: ${vistos.size} publicação(ões) lidas`);
  return { docs, consultas, amostra: { encontradas: [...vistos.values()].map(r => ({ data: r.data, titulo: r.titulo, entidade: r.entidade, trecho: r.trecho })), docs: docs.map(d => ({ ...d, texto: d.texto.slice(0, 4000) })) } };
}

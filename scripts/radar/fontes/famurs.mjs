// Coletor do Diário Oficial dos Municípios do RS (FAMURS, sistema SIGPub). Usa a mesma pesquisa pública do site
// (sem login nem CAPTCHA) e abre cada matéria candidata para ler o texto completo. O mesmo sistema SIGPub publica os
// diários das associações de municípios de outros Estados (FAMEP no PA, AROM em RO, Sergipe): paraSigpub() devolve
// o coletor de cada uma.
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; shotgun-radar/1.0; +https://github.com/dcmadruga/crm-shotgun)' };
const espera = ms => new Promise(r => setTimeout(r, ms));
const limpa = s => String(s || '').replace(/\s+/g, ' ').trim();
const ent = s => s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&[a-z]+;/gi, ' ');
const texto = h => limpa(ent(h.replace(/<(script|style)[^]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ')));

export const TERMOS = ['"posto de combustíveis"', '"posto de combustível"', '"comércio varejista de combustíveis"', '"posto de abastecimento"', '"revenda de combustíveis"', '"auto posto"', '"tanques subterrâneos"', '"armazenamento de combustíveis"', '"licença de operação" combustíveis', '"licença de instalação" combustíveis', '"licença prévia" combustíveis', '"licença ambiental" combustíveis'];
// Matérias que certamente não são licença nem aviso de licenciamento
const FORA = /licita|preg[aã]o|contrat|dispensa|inexigib|aditivo|ata\s+de\s+registro|credenciamento|homolog|adjudica|chamamento|concurso|processo\s+seletivo|gabarito|nomea|exonera|di[aá]rias|empenho|or[cç]amento|tomada\s+de\s+pre[cç]o|leil[aã]o|edital\s+n|cotação|^(gabinete\s+)?lei\s+(municipal\s+|complementar\s+|ordin[aá]ria\s+|org[aâ]nica\s+)*(n[º°]|do\s+munic)|c[oó]digo\s+tribut/i;
const SINAL = /licen[cç]a|ambiental|meio\s+ambiente|torna\s+p[uú]blic|requer|\bL[PIO]C?\b/i;

const br2iso = d => { const m = String(d).match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };

// slugSite: o endereço no diariomunicipal.com.br (famurs, famep, arom, sergipe)
export function paraSigpub(slugSite, uf, nome, id = slugSite, sigla = slugSite.toUpperCase()) {
  const BASE = `https://www.diariomunicipal.com.br/${slugSite}/`, SIGLA = sigla;
  async function pega(u) {
    let erro;
    for (let t = 1; t <= 4; t++) {
      try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); }
      catch (e) { erro = e; await espera(t * 4000); }
    }
    throw new Error(`${SIGLA}: ${erro.message} (${u})`);
  }

  function cartoes(html) {
    const out = [];
    for (const li of html.split('<li class="materia-card">').slice(1)) {
      const cod = (li.match(new RegExp(`/${slugSite}/materia/([0-9A-F]{6,12})`)) || [])[1]; if (!cod) continue;
      out.push({
        cod,
        titulo: texto((li.match(/materia-card__titulo">([^]*?)<\/h2>/) || [])[1] || ''),
        entidade: texto((li.match(/materia-card__entidade">([^]*?)<\/span>/) || [])[1] || ''),
        orgao: texto((li.match(/materia-card__orgao">([^]*?)<\/span>/) || [])[1] || ''),
        trecho: texto((li.match(/materia-card__trecho">([^]*?)<\/p>/) || [])[1] || ''),
        data: br2iso((li.match(/Circula[cç][aã]o<\/dt>\s*<dd>([^<]+)/) || [])[1] || ''),
        edicao: limpa((li.match(/Edi[cç][aã]o<\/dt>\s*<dd>([^<]+)/) || [])[1] || '')
      });
    }
    const total = +((html.match(/Mostrando\s+\d+\s+a\s+\d+\s+de\s+([\d.]+)/) || [])[1] || '0').replace(/\./g, '');
    return { out, total };
  }

  // Corpo da matéria: do div#materia até o fim do documento (a matéria tem divs aninhadas, então não dá para
  // parar no primeiro </div>)
  function corpoMateria(h) {
    const i = h.search(/<div[^>]*id="materia"/); if (i < 0) return '';
    let t = h.slice(i);
    const fim = t.slice(1).search(/<footer|<\/article>|<\/main>|class="documento__rodape|C[oó]digo\s+Identificador/i);
    if (fim > 0) t = t.slice(0, fim + 1 + (/^C/i.test(t.slice(fim + 1)) ? 60 : 0));
    return t.slice(0, 200000);
  }

  // Devolve as matérias candidatas com o texto completo
  async function coletar(de, ate, log = console.log) {
    const vistos = new Map(); let consultas = 0, pagina1 = '';
    for (const termo of TERMOS) {
      let total = 0, cont = 0;
      for (let p = 1; p <= 40; p++) {
        const u = `${BASE}pesquisar?busca_avancada%5Btexto%5D=${encodeURIComponent(termo)}&busca_avancada%5BdataInicio%5D=${de}&busca_avancada%5BdataFim%5D=${ate}&busca_avancada%5Bpagina%5D=${p}`;
        const h = await pega(u); if (!pagina1) pagina1 = h.slice(0, 60000);
        const { out, total: t } = cartoes(h); consultas++; cont += out.length; total = t || cont;
        for (const c of out) if (!vistos.has(c.cod)) vistos.set(c.cod, c);
        if (!out.length || p * 25 >= t) break;
        await espera(1000);
      }
      log(`${SIGLA} ${termo}: ${total} matéria(s) no período`);
      await espera(1000);
    }
    const candidatas = [...vistos.values()].filter(c => !FORA.test(c.titulo) && SINAL.test(`${c.titulo} ${c.orgao} ${c.trecho}`));
    const docs = [];
    for (const c of candidatas) {
      try {
        const h = await pega(BASE + 'materia/' + c.cod); consultas++;
        const corpo = corpoMateria(h);
        docs.push({ ...c, id: c.cod, texto: texto(corpo), url: BASE + 'materia/' + c.cod, pdf: BASE + 'download/edicao/' + c.cod, local: `Edição ${c.edicao}, matéria ${c.cod} · ${c.entidade}` });
      } catch (e) { log(SIGLA + ' matéria ' + c.cod + ': ' + e.message); }
      await espera(700);
    }
    log(`${SIGLA}: ${vistos.size} matérias encontradas, ${candidatas.length} candidatas lidas por inteiro`);
    return { docs, consultas, amostra: { pagina1, encontradas: [...vistos.values()], docs: docs.map(d => ({ ...d, texto: d.texto.slice(0, 4000) })) } };
  }
  return { info: { id, uf, nome, url: BASE, tipo: 'diario_oficial' }, coletar };
}

const famurs = paraSigpub('famurs', 'RS', 'Diário Oficial dos Municípios do RS (FAMURS)');
export const info = famurs.info, coletar = famurs.coletar;

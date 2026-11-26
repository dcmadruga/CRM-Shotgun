// Municípios de um Estado (IBGE) com o centro aproximado de cada um, para reconhecer a cidade no texto e
// pôr no mapa quem não tem coordenada exata. Estados atendidos: MT e RS.
const UA = { 'user-agent': 'shotgun-radar/1.0' };
export const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const chaveMun = s => semAcento(s).replace(/[’'`´]/g, '').replace(/\bnossa\s+s(ra)?\.?\s/g, 'nossa senhora ').replace(/\bsto\.?\s/g, 'santo ').replace(/\bsta\.?\s/g, 'santa ').replace(/\bs\.\s?(?=jose|felix|pedro)/g, 'sao ').replace(/\bd\s?oeste\b/g, 'doeste').replace(/[^a-z0-9]+/g, ' ').trim();

export const UFS = { MT: { cod: 51, nome: 'mato grosso', min: 140 }, RS: { cod: 43, nome: 'rio grande do sul', min: 490 }, SC: { cod: 42, nome: 'santa catarina', min: 290 }, PR: { cod: 41, nome: 'parana', min: 390 }, SP: { cod: 35, nome: 'sao paulo', min: 640 },
  SE: { cod: 28, nome: 'sergipe', min: 70 }, PA: { cod: 15, nome: 'para', min: 138 }, TO: { cod: 17, nome: 'tocantins', min: 132 }, RO: { cod: 11, nome: 'rondonia', min: 49 }, GO: { cod: 52, nome: 'goias', min: 240 } };
export const municipiosMT = listaPronta => municipiosUF('MT', listaPronta);

export async function municipiosUF(uf, listaPronta) {
  const U = UFS[uf]; if (!U) throw new Error('Estado não atendido: ' + uf);
  const sigla = uf.toLowerCase();
  let lista = listaPronta;
  if (!lista) {
    try { lista = await (await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${U.cod}/municipios`, { headers: UA, signal: AbortSignal.timeout(30000) })).json(); }
    catch (e) { // sem o IBGE: usa os nomes do próprio app (sem código IBGE nem centro)
      console.warn('IBGE indisponível, usando lib/municipios.js:', e.message);
      const { readFileSync } = await import('node:fs'); const w = {};
      new Function('window', readFileSync(new URL('../../lib/municipios.js', import.meta.url), 'utf8'))(w);
      lista = w.MUNICIPIOS[uf].split('|').map(nome => ({ id: 'x-' + chaveMun(nome).replace(/ /g, '-'), nome }));
      listaPronta = lista;
    }
  }
  const centro = {};
  if (!listaPronta) try {
    const geo = await (await fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/estados/${U.cod}?intrarregiao=municipio&formato=application/vnd.geo%2Bjson&qualidade=minima`, { headers: UA })).json();
    for (const f of geo.features || []) {
      const pts = []; const junta = c => typeof c[0] === 'number' ? pts.push(c) : c.forEach(junta); junta(f.geometry.coordinates);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      centro[String(f.properties.codarea)] = [+((Math.min(...ys) + Math.max(...ys)) / 2).toFixed(4), +((Math.min(...xs) + Math.max(...xs)) / 2).toFixed(4)];
    }
  } catch (e) { console.warn('IBGE: malha indisponível, mapa sem centro dos municípios:', e.message); }
  const mun = lista.map(m => ({ ibge: String(m.id), nome: m.nome, chave: chaveMun(m.nome), centro: centro[String(m.id)] || null }));
  if (mun.length < U.min) throw new Error(`IBGE devolveu só ${mun.length} municípios de ${uf}`);
  // nomes mais longos primeiro: "Nova Mutum" antes de "Mutum", "São José do Rio Claro" antes de "Rio Claro"
  const ordenados = [...mun].sort((a, b) => b.chave.length - a.chave.length);
  return {
    uf,
    lista: mun,
    porChave: Object.fromEntries(mun.map(m => [m.chave, m])),
    // acha o município num trecho; prefere o que vem colado em "/UF", "- UF", "município de"
    achar(texto) {
      const t = ' ' + chaveMun(texto) + ' ';
      const fortes = [...t.matchAll(new RegExp(`(?:municipio de|municipio|cidade de|em) ([a-z ]{3,40}?) (?:${sigla}|estado d[oe] ${U.nome})\\b`, 'g'))].map(x => x[1]);
      for (const f of fortes) for (const m of ordenados) if ((' ' + f + ' ').includes(' ' + m.chave + ' ')) return m;
      const barras = [...t.matchAll(new RegExp(`([a-z ]{3,40}?) ${sigla}\\b`, 'g'))].map(x => x[1]);
      for (const f of barras) for (const m of ordenados) if ((' ' + f + ' ').endsWith(' ' + m.chave + ' ')) return m;
      // cidade com o nome do Estado (Goiás-GO): só com indicação forte, senão "Estado de Goiás" viraria a cidade
      for (const m of ordenados) if (m.chave.length > 4 && m.chave !== U.nome && t.includes(' ' + m.chave + ' ')) return m;
      return null;
    }
  };
}

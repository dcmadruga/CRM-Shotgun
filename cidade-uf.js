// "Cidade / UF" de um lead, proposta ou cliente, usado nos cards do CRM, na tela Hoje e nos avisos do sino.
// Separa a UF do fim da cidade ("Nova Mutum - MT" → "Nova Mutum / MT"); sem UF na cidade, usa a da ANP; sem cidade, o município da ANP.
// Sem cidade nem UF, devolve '' (quem chama não mostra nada).
(() => {
  const UFS = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
  window.sgCidadeUf = x => {
    if (!x) return '';
    const s = String(x.cidade || '').trim(), m = s.match(/^(.*?)\s*[-\/,]\s*([A-Za-z]{2})$/), ufCid = m && UFS.has(m[2].toUpperCase()) ? m[2].toUpperCase() : '';
    const cid = (ufCid ? m[1] : s).trim() || String(x.anp?.municipio || '').trim();
    const ufAlt = String(x.anp?.uf || x.uf || '').toUpperCase(), uf = ufCid || (UFS.has(ufAlt) ? ufAlt : '');
    return [cid, uf].filter(Boolean).join(' / ');
  };
})();

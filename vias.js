// Vias repetidas de uma proposta: às vezes o vendedor gerava duas propostas iguais para o mesmo cliente (dois links)
// e o cliente aprovava as duas. Desde a v291 isso não acontece mais (a proposta nova igual entra no lugar da antiga),
// mas as que já existem continuam no banco. Aqui elas viram uma só em todas as telas, sem apagar nada:
// propostas aprovadas do mesmo vendedor, mesmo cliente (CNPJ, ou nome) e mesmos valores (licenças e mensalidade).
// Fica a via que andou mais nos passos; empatou, a aprovada por último. A que fica ganha _vias (quantas são),
// _viasIds e _viasNums (as outras), para as telas avisarem e para abrir a certa quando chamarem pelo id de outra.
(() => {
  const seg = ts => ts && ts.seconds ? ts.seconds : ts && ts.toMillis ? ts.toMillis() / 1000 : 0;
  const avanco = p => p.e4Em ? 5 : p.ctAceitoEm ? 4 : p.ctEm ? 3 : p.e2Em ? 2 : 1;
  const chave = p => {
    const cli = String(p.cnpj || '').replace(/\D/g, '') || String(p.cliente || '').trim().toUpperCase();
    return cli ? [p.owner || '', cli, Number(p.totLic) || 0, Number(p.totMen) || 0].join('|') : '';
  };
  window.sgViaChave = p => (p && p.status === 'aprovada' && chave(p)) || '';
  window.sgViaUnica = lista => {
    const grupos = new Map(), out = [];
    (lista || []).forEach(p => {
      const k = window.sgViaChave(p);
      if (!k) { out.push(p); return; }
      if (!grupos.has(k)) { grupos.set(k, []); out.push(k); } // guarda a posição do grupo, para não mudar a ordem da lista
      grupos.get(k).push(p);
    });
    return out.map(x => {
      if (typeof x !== 'string') return x;
      const l = grupos.get(x); if (l.length === 1) return l[0];
      const ord = l.slice().sort((a, b) => avanco(b) - avanco(a) || seg(b.aprovadoEm) - seg(a.aprovadoEm)), p = ord[0], outras = ord.slice(1);
      return { ...p, _vias: l.length, _viasIds: outras.map(q => q.id), _viasNums: outras.map(q => q.numero || '') };
    });
  };
})();

// Base interna de postos da ANP: preenche o cadastro pelo CNPJ.
// Os arquivos anp/postos/NNN.json são gerados todo dia pelo GitHub Actions (scripts/anp-postos.mjs).
// window.anpPosto(cnpj) -> dados do posto, null se o CNPJ não está na ANP. Rejeita se não deu para baixar a base.
(() => {
  const fatias = new Map();
  let meta = null;
  const dig = v => String(v || '').replace(/\D/g, '');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const titulo = s => String(s || '').toLowerCase().replace(/(^|[\s(/-])(\S)/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\s(D[aeo]s?|E)(?=\s)/g, m => m.toLowerCase());
  const SIGLAS = /\b(Gnv|Glp|Arla|Mgo|Dma|Jet|S10|S500)\b/gi;
  const nomeProduto = s => titulo(s).replace(SIGLAS, m => m.toUpperCase());
  const fmtM3 = n => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' m³';
  const fmtD = iso => iso ? iso.split('-').reverse().join('/') : '';
  const TANC_MAX = 1000; // acima disso a ANP registrou em litros ou errado

  // Faixas do porte (m³). O ADM ajusta em Parâmetros Proposta > Valores de base.
  function faixas() {
    const c = typeof CFG !== 'undefined' ? CFG : {};
    const p = Number(c.portePeq) > 0 ? Number(c.portePeq) : 60;
    const m = Number(c.porteMed) > p ? Number(c.porteMed) : Math.max(120, p + 1);
    return { p, m };
  }
  function porte(tanc) {
    if (!(tanc > 0) || tanc > TANC_MAX) return '';
    const f = faixas();
    return tanc <= f.p ? 'Pequeno' : tanc <= f.m ? 'Médio' : 'Grande';
  }

  async function fatia(k) {
    if (!fatias.has(k)) {
      const pr = fetch(`anp/postos/${k}.json`).then(r => {
        if (r.status === 404) return {};
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
      fatias.set(k, pr);
      pr.catch(() => fatias.delete(k));
    }
    return fatias.get(k);
  }
  async function info() {
    if (!meta) meta = fetch('anp/meta.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
    return meta;
  }

  window.anpPosto = async cnpj => {
    const d = dig(cnpj); if (d.length !== 14) return null;
    const [base, m] = await Promise.all([fatia(d.slice(0, 3)), info()]);
    const o = base[d]; if (!o) return null;
    const prods = (o.p || []).map(([nome, tanc, bicos, un]) => ({ nome: nomeProduto(nome), tanc: un ? (/^l/i.test(un) ? tanc / 1000 : tanc) : tanc, bicos: Number(bicos) || 0 }));
    const tancagem = Math.round(prods.reduce((s, p) => s + (Number(p.tanc) || 0), 0) * 10) / 10;
    const bb = /bandeira branca/i.test(o.b || '');
    return {
      cnpj: d, razao: o.r || '', bandeira: bb ? 'Bandeira branca' : (o.b || ''), bandeiraBranca: bb, desde: o.dv || '',
      endereco: [o.e, o.c].filter(Boolean).join(' - '), bairro: o.ba || '', cep: o.cep || '', municipio: titulo(o.m), uf: o.uf || '',
      cidade: o.m ? titulo(o.m) + (o.uf ? ' - ' + o.uf : '') : '',
      lat: o.la ?? null, lng: o.lo ?? null, coordValidada: !!o.gv,
      produtos: prods, combustiveis: prods.map(p => p.nome), bicos: prods.reduce((s, p) => s + p.bicos, 0),
      tancagem, tancagemDuvidosa: tancagem > TANC_MAX || !tancagem, porte: porte(tancagem),
      simp: o.s || '', autorizacao: o.a || '', atualizado: m.atualizado || ''
    };
  };
  window.anpPorte = porte;
  window.anpFaixas = faixas;

  // Resumo para gravar no cadastro (lead/cliente) sem o volume de dados da base
  window.anpResumo = p => p ? {
    bandeira: p.bandeira, endereco: p.endereco, bairro: p.bairro, cep: p.cep, municipio: p.municipio, uf: p.uf,
    lat: p.lat, lng: p.lng, bicos: p.bicos, combustiveis: p.combustiveis, tancagem: p.tancagem, porte: p.porte,
    simp: p.simp, consultado: new Date().toISOString().slice(0, 10)
  } : null;

  // Cartão com os dados da ANP (CRM e Nova proposta)
  window.anpHtml = p => {
    if (!p) return '';
    const f = faixas();
    const cep = p.cep && p.cep.length === 8 ? p.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2') : p.cep;
    const geo = p.lat != null && p.lng != null
      ? `<a href="https://www.google.com/maps?q=${p.lat},${p.lng}" target="_blank" rel="noopener">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</a>${p.coordValidada ? '' : ' <small>(não validadas pela ANP)</small>'}`
      : '<small>Sem coordenadas na ANP</small>';
    const tanc = p.tancagemDuvidosa ? `${fmtM3(p.tancagem)} <small>(valor da ANP parece errado, confira)</small>` : fmtM3(p.tancagem);
    const porteTxt = p.porte ? `<span class="anpporte" data-porte="${esc(p.porte)}" title="Pequeno até ${f.p} m³, Médio até ${f.m} m³, Grande acima">Porte ${esc(p.porte)}</span>` : '';
    return `<div class="anpcard">
      <h4><span>Dados da ANP</span>${porteTxt}</h4>
      <dl>
        <dt>Bandeira</dt><dd>${esc(p.bandeira || '-')}${p.desde && !p.bandeiraBranca ? ` <small>desde ${fmtD(p.desde)}</small>` : ''}</dd>
        <dt>Endereço</dt><dd>${esc([p.endereco, p.bairro].filter(Boolean).join(', '))}<br>${esc([p.cidade, cep].filter(Boolean).join(' · '))}</dd>
        <dt>Coordenadas</dt><dd>${geo}</dd>
        <dt>Bicos</dt><dd>${p.bicos}</dd>
        <dt>Tancagem total</dt><dd>${tanc}</dd>
        <dt>Combustíveis</dt><dd><ul>${p.produtos.map(x => `<li>${esc(x.nome)} <small>${fmtM3(x.tanc)} · ${x.bicos} ${x.bicos === 1 ? 'bico' : 'bicos'}</small></li>`).join('') || '<li>-</li>'}</ul></dd>
      </dl>
      <p class="hint">Fonte: ANP${p.autorizacao ? ', autorização ' + esc(p.autorizacao) : ''}${p.atualizado ? '. Base atualizada em ' + new Date(p.atualizado).toLocaleDateString('pt-BR') : ''}.</p>
    </div>`;
  };
})();

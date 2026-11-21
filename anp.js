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
  const txtAnp = s => String(s || '').replace(/\s+/g, ' ').trim();
  const fmtM3 = n => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' m³';
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
    const prods = (o.p || []).map(([nome, tanc, bicos, un]) => ({ nome: txtAnp(nome), tanc: un ? (/^l/i.test(un) ? tanc / 1000 : tanc) : tanc, bicos: Number(bicos) || 0 }));
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

  // Cartão-resumo da ANP (CRM e Nova proposta), no modelo pedido pelo Diego:
  // razão social, endereço e cidade/UF; selos de bandeira e porte; grade com os números do posto.
  const fmtCnpj = d => String(d).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  window.anpHtml = p => {
    if (!p) return '';
    const f = faixas();
    const cidade = [String(p.municipio || '').toUpperCase(), p.uf].filter(Boolean).join('/');
    const item = (rot, val, cls) => `<div${cls ? ` class="${cls}"` : ''}><small>${rot}</small><span>${val}</span></div>`;
    const prods = p.produtos.map(x => `${esc(x.nome)}: ${fmtM3(x.tanc)}`).join('; ') || '-';
    const bicosPorProd = p.produtos.filter(x => x.bicos).map(x => `${esc(x.nome)}: ${x.bicos}`).join('; ');
    const tanc = fmtM3(p.tancagem) + (p.tancagemDuvidosa ? ' <em>(valor da ANP parece errado, confira)</em>' : '');
    const geo = p.lat != null && p.lng != null
      ? `<a href="https://www.google.com/maps?q=${p.lat},${p.lng}" target="_blank" rel="noopener">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</a>${p.coordValidada ? '' : ' <em>(não validadas pela ANP)</em>'}`
      : '-';
    return `<div class="anpcard">
      <p class="anpfonte">Posto na base da ANP</p>
      <h4>${esc(p.razao)}</h4>
      <p class="anpend">${esc([p.endereco, cidade].filter(Boolean).join(' · '))}</p>
      <div class="anpselos">
        <span class="anpband${p.bandeiraBranca ? ' branca' : ''}">${esc((p.bandeira || 'Sem bandeira').toUpperCase())}</span>
        ${p.porte ? `<span class="anpporte" title="Pequeno até ${f.p} m³, Médio até ${f.m} m³, Grande acima">${esc(p.porte)}</span>` : ''}
      </div>
      <div class="anpgrade">
        ${item('CNPJ', fmtCnpj(p.cnpj))}
        ${item('Tancagem total', tanc)}
        ${item('Porte', esc(p.porte || 'A conferir'))}
        ${item('Bicos', `<span title="${bicosPorProd}">${p.bicos}</span>`)}
        ${item('Produtos', prods)}
        ${item('CEP', esc(p.cep || '-'))}
        ${item('Autorização ANP', esc(p.autorizacao || '-'))}
        ${item('Coordenadas', geo)}
      </div>
      ${p.atualizado ? `<p class="hint">Base da ANP atualizada em ${new Date(p.atualizado).toLocaleDateString('pt-BR')}.</p>` : ''}
    </div>`;
  };
})();

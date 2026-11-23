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
  // Índice por UF (anp/uf/UF.json): [cnpj, razão social, município, bandeira], para pesquisar sem o CNPJ
  const ufs = new Map();
  window.anpUf = uf => {
    uf = String(uf || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(uf)) return Promise.resolve([]);
    if (!ufs.has(uf)) {
      const pr = fetch(`anp/uf/${uf}.json`).then(r => { if (r.status === 404) return []; if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
      ufs.set(uf, pr); pr.catch(() => ufs.delete(uf));
    }
    return ufs.get(uf);
  };
  window.anpNorm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  window.anpTitulo = titulo;

  // Pesquisar na ANP (sem o CNPJ): painel com filtros Nome, Estado, Cidade e Bandeira.
  // Usado no Novo lead (CRM) e na Nova proposta. escolher(cnpj) recebe o posto clicado.
  const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
  const fmtC = d => String(d).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  window.anpPesquisa = (box, ufIni, escolher) => {
    if (!box) return;
    if (!box.hidden && box.dataset.on) { box.hidden = true; return; }
    ufIni = UFS.includes(String(ufIni || '').toUpperCase()) ? String(ufIni).toUpperCase() : '';
    let lista = [];
    const q = sel => box.querySelector(sel);
    box.classList.add('anpbusca');
    box.innerHTML = `<div class="anpbhead"><h4>Pesquisar na base de postos da ANP</h4><button type="button" class="linkbtn" data-anp="fechar">Fechar</button></div>
      <div class="anpbfil">
        <label>Nome<input data-anp="nome" placeholder="Razão social ou parte dela" autocomplete="off"></label>
        <label>Estado<select data-anp="uf"><option value="">Escolha…</option>${UFS.map(u => `<option${u === ufIni ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
        <label>Cidade<select data-anp="cid" disabled><option value="">Todas</option></select></label>
        <label>Bandeira<select data-anp="band" disabled><option value="">Todas</option></select></label>
      </div>
      <div class="anpbres"><p class="hint">Escolha o estado para pesquisar.</p></div>`;
    const res = q('.anpbres');
    const filtrar = () => {
      if (!lista.length) return;
      const n = window.anpNorm, ts = n(q('[data-anp=nome]').value).split(' ').filter(Boolean), cid = q('[data-anp=cid]').value, band = q('[data-anp=band]').value, uf = q('[data-anp=uf]').value;
      const ach = lista.filter(x => (!cid || x[2] === cid) && (!band || x[3] === band) && (!ts.length || ts.every(t => n(x[1]).includes(t) || x[0].includes(t))));
      const MAX = 100;
      res.innerHTML = ach.length ? `<p class="hint">${ach.length} posto${ach.length === 1 ? '' : 's'}${ach.length > MAX ? ` (mostrando ${MAX}; use os filtros para refinar)` : ''}. Clique no posto para usar.</p>
        <ul>${ach.slice(0, MAX).map(x => `<li><button type="button" data-anp="usar" data-cnpj="${x[0]}">
          <span><b>${esc(x[1])}</b><small>${esc(titulo(x[2]))}/${uf} · ${fmtC(x[0])}</small></span>
          <span class="anpbband">${window.anpSeloBandeira(x[3], false, true)}<small>${esc(x[3])}</small></span></button></li>`).join('')}</ul>`
        : '<p class="hint">Nenhum posto encontrado com esses filtros.</p>';
    };
    const carregar = async uf => {
      lista = [];
      ['cid', 'band'].forEach(k => { const el = q(`[data-anp=${k}]`); el.disabled = true; el.innerHTML = '<option value="">Todas</option>'; });
      if (!uf) { res.innerHTML = '<p class="hint">Escolha o estado para pesquisar.</p>'; return; }
      res.innerHTML = `<p class="hint">Carregando os postos de ${esc(uf)}…</p>`;
      let l; try { l = await window.anpUf(uf); } catch (e) { res.innerHTML = '<p class="hint">Não consegui carregar a base da ANP agora. Tente de novo.</p>'; return; }
      if (q('[data-anp=uf]').value !== uf) return;
      lista = l;
      const ord = a => [...new Set(a)].filter(Boolean).sort((x, y) => x.localeCompare(y, 'pt-BR'));
      q('[data-anp=cid]').innerHTML = '<option value="">Todas</option>' + ord(l.map(x => x[2])).map(c => `<option value="${esc(c)}">${esc(titulo(c))}</option>`).join('');
      q('[data-anp=band]').innerHTML = '<option value="">Todas</option>' + ord(l.map(x => x[3])).map(b => `<option value="${esc(b)}">${esc(b)}</option>`).join('');
      q('[data-anp=cid]').disabled = q('[data-anp=band]').disabled = false;
      if (!l.length) res.innerHTML = '<p class="hint">Nenhum posto deste estado na base.</p>'; else filtrar();
    };
    if (!box.dataset.on) {
      box.dataset.on = '1';
      box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) e.preventDefault(); });
      box.addEventListener('input', e => { if (e.target.dataset.anp === 'nome') box._filtrar && box._filtrar(); });
      box.addEventListener('change', e => { const k = e.target.dataset.anp; if (k === 'uf') box._carregar(e.target.value); else if (k === 'cid' || k === 'band') box._filtrar(); });
      box.addEventListener('click', e => {
        const b = e.target.closest('[data-anp]'); if (!b || !box.contains(b)) return;
        e.preventDefault(); e.stopPropagation();
        if (b.dataset.anp === 'fechar') box.hidden = true;
        else if (b.dataset.anp === 'usar') { box.hidden = true; box._escolher && box._escolher(b.dataset.cnpj); }
      });
    }
    box._filtrar = filtrar; box._carregar = carregar; box._escolher = escolher;
    box.hidden = false;
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (ufIni) carregar(ufIni); else q('[data-anp=uf]').focus();
  };
  window.anpPorte = porte;
  window.anpFaixas = faixas;

  // Resumo para gravar no cadastro (lead/cliente) sem o volume de dados da base
  window.anpResumo = p => p ? {
    bandeira: p.bandeira, endereco: p.endereco, bairro: p.bairro, cep: p.cep, municipio: p.municipio, uf: p.uf,
    lat: p.lat, lng: p.lng, bicos: p.bicos, combustiveis: p.combustiveis, tancagem: p.tancagem, porte: p.porte,
    simp: p.simp, consultado: new Date().toISOString().slice(0, 10)
  } : null;

  // Logos das Bandeiras (Administração > Parâmetros Pré TASK). O CRM carrega o cadastro publicado
  // (publico/bandeiras) em window.anpLogos; sem cadastro, usa os logos que vêm com o app.
  const LOGOS_PADRAO = [{ nome: 'Petrobras', img: 'icons/bandeiras/petrobras.svg' }, { nome: 'Ipiranga', img: 'icons/bandeiras/ipiranga.svg' }, { nome: 'ALE', img: 'icons/bandeiras/ale.svg' }];
  // Nome da ANP (distribuidora) -> nome comum da bandeira
  const APELIDOS = [[/\bvibra\b|\bbr\b|petrobras/, 'petrobras'], [/raizen|\bshell\b/, 'shell'], [/alesat|\bale\b/, 'ale'], [/ipiranga/, 'ipiranga'], [/\btotal/, 'total'], [/branca|sem bandeira/, 'bandeira branca']];
  const SUFIXOS = /\b(ltda|s\/?a|sa|eireli|me|epp|distribuidora|distribuicao|distrib|comercio|comercial|combustiveis|combustivel|derivados|de|do|da|e|petroleo|cia|companhia|brasileira|brasil|ind|industria)\b/g;
  const normBand = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^bandeira\s+(?!branca)/, '').replace(/[^a-z0-9/ ]/g, ' ').replace(/\s+/g, ' ').trim();
  const nucleo = x => normBand(x).replace(SUFIXOS, ' ').replace(/\s+/g, ' ').trim();
  const canon = x => { const n = normBand(x); const a = APELIDOS.find(([re]) => re.test(n)); return a ? a[1] : nucleo(x); };
  function logoBandeira(nome) {
    if (!nome) return null;
    const lista = (Array.isArray(window.anpLogos) && window.anpLogos.length ? window.anpLogos : LOGOS_PADRAO).filter(x => x && x.img && x.nome);
    const c = canon(nome), n = nucleo(nome);
    return lista.find(x => canon(x.nome) === c)
      || lista.find(x => { const k = nucleo(x.nome); return k.length >= 3 && n.length >= 3 && (` ${n} `.includes(` ${k} `) || ` ${k} `.includes(` ${n} `)); })
      || null;
  }
  window.anpLogoBandeira = logoBandeira;
  // Selo da bandeira: miniatura do logo cadastrado; sem imagem, o selo de texto
  window.anpSeloBandeira = (nome, branca, mini) => {
    const it = logoBandeira(nome);
    if (it) return `<span class="anpband img${mini ? ' mini' : ''}" title="${esc(nome)}"><img src="${esc(it.img)}" alt="${esc(nome)}"></span>`;
    return mini ? '' : `<span class="anpband${branca ? ' branca' : ''}">${esc(String(nome || 'Sem bandeira').toUpperCase())}</span>`;
  };

  // Cartão-resumo da ANP (CRM e Nova proposta), no modelo pedido pelo Diego:
  // razão social, endereço e cidade/UF; selos de bandeira e porte; grade com os números do posto.
  const fmtCnpj = d => String(d).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  window.anpHtml = p => {
    if (!p) return '';
    const f = faixas();
    const cidade = [String(p.municipio || '').toUpperCase(), p.uf].filter(Boolean).join('/');
    const item = (rot, val, cls) => `<div${cls ? ` class="${cls}"` : ''}><small>${rot}</small><span>${val}</span></div>`;
    const bicosPorProd = p.produtos.filter(x => x.bicos).map(x => `${esc(x.nome)}: ${x.bicos}`).join('; ');
    const tanc = fmtM3(p.tancagem) + (p.tancagemDuvidosa ? ' <em>(valor da ANP parece errado, confira)</em>' : '');
    const temGeo = p.lat != null && p.lng != null;
    // Sem coordenadas na ANP, o botão procura pelo endereço
    const urlMapa = temGeo ? `https://www.google.com/maps?q=${p.lat},${p.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.endereco, p.bairro, p.municipio, p.uf, p.cep].filter(Boolean).join(', '))}`;
    const pino = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>';
    const geo = (temGeo ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}${p.coordValidada ? '' : '<br><em>(não validadas pela ANP)</em>'}` : '<em>Sem coordenadas na ANP</em>')
      + `<a class="anpmapa" href="${esc(urlMapa)}" target="_blank" rel="noopener">${pino}Abrir no mapa</a>`;
    return `<div class="anpcard">
      <p class="anpfonte">Posto na base da ANP</p>
      <h4>${esc(p.razao)}</h4>
      <p class="anpend">${esc(p.endereco || '')}</p>
      <div class="anpselos">
        <div><small>Bandeira</small>${window.anpSeloBandeira(p.bandeira, p.bandeiraBranca)}</div>
        <div><small>Porte</small>${p.porte ? `<span class="anpporte" title="Pequeno até ${f.p} m³, Médio até ${f.m} m³, Grande acima">${esc(p.porte)}</span>` : '<span class="anpporte">A conferir</span>'}</div>
      </div>
      <div class="anpgrade anpg1">
        <div class="anpcol">${item('CNPJ', fmtCnpj(p.cnpj))}${item('Cidade / UF', esc(cidade || '-'))}</div>
        ${item('Coordenadas', geo, 'anpgeo')}
      </div>
      <div class="anpgrade anpg2">
        <div class="anpprod"><details><summary><small>Produtos <b>${p.produtos.length}</b></small></summary><ul>${p.produtos.map(x => `<li>${esc(x.nome)}: ${fmtM3(x.tanc)}${x.bicos ? ` <em>· ${x.bicos} ${x.bicos === 1 ? 'bico' : 'bicos'}</em>` : ''}</li>`).join('') || '<li>-</li>'}</ul></details></div>
        ${item('Tancagem total', tanc)}
        ${item('Bicos', `<span title="${bicosPorProd}">${p.bicos}</span>`)}
      </div>
      <div class="anpgrade anpg3">${item('Autorização ANP', esc(p.autorizacao || '-'))}</div>
      ${p.atualizado ? `<p class="hint">Base da ANP atualizada em ${new Date(p.atualizado).toLocaleDateString('pt-BR')}.</p>` : ''}
    </div>`;
  };
})();

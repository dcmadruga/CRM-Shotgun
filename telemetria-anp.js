// Telemetria ANP: postos novos na base da ANP nos últimos 15 dias, com destaque para os que entraram hoje.
// Lê anp/novos.json, gerado todo dia pelo GitHub Actions (scripts/anp-novos.mjs). A data de entrada do posto é
// o dia em que ele apareceu pela primeira vez na base ("v") ou a data da autorização na ANP ("at"), a mais recente.
(function () {
  const DIAS = 15;
  const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
  const $ = id => document.getElementById(id);
  const box = $('teleAnp'), selUf = $('tanpUf'), selCid = $('tanpCid'), selBand = $('tanpBand'), limpar = $('tanpLimpar'), busca = $('tanpBusca'), area = $('tanpArea');
  if (!box || !selUf || !area) return;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tit = s => window.anpTitulo ? window.anpTitulo(s) : String(s || '');
  const norm = s => window.anpNorm ? window.anpNorm(s) : String(s || '').toLowerCase();
  const fmtCnpj = d => String(d).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  const local = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const menos = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - n); return local(d); };
  const br = iso => iso ? iso.split('-').reverse().join('/') : '';
  const entrada = x => [x.v || '', x.at || ''].sort().pop();
  const bandKey = x => /branca/i.test(x.b || '') || !x.b ? 'BANDEIRA BRANCA' : x.b;
  const bandRot = k => k === 'BANDEIRA BRANCA' ? 'Bandeira branca' : k;
  const SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const rotDia = (iso, hoje) => iso === hoje ? 'Hoje' : iso === menos(hoje, 1) ? 'Ontem' : SEM[new Date(iso + 'T12:00:00').getDay()].replace(/^./, c => c.toUpperCase());

  // quem não é administrador vê só os Estados de atuação do cadastro (usuarios/{uid}.estados, a mesma regra do CRM)
  let meus = null; // null = todos (administrador ou antes do login)
  const ufsVisiveis = () => meus ? UFS.filter(u => meus.includes(u)) : UFS;
  function montarUf() {
    const vis = ufsVisiveis();
    let g = null; try { g = localStorage.getItem('tanpUf'); } catch { }
    const atual = selUf.options.length ? selUf.value : g;
    selUf.innerHTML = (!meus ? '<option value="">Todos os Estados</option>' : vis.length > 1 ? '<option value="">Todos os meus Estados</option>' : '') + vis.map(u => `<option value="${u}">${u}</option>`).join('');
    // fica o Estado escolhido se ele continua na lista; senão MT (administrador) ou o primeiro Estado de atuação
    selUf.value = vis.includes(atual) || (atual === '' && vis.length > 1) ? atual : !meus ? (vis.includes('MT') ? 'MT' : '') : vis.length === 1 ? vis[0] : '';
  }
  montarUf();
  window.addEventListener('shotgun-crm', e => { const { perfil, admin } = e.detail || {}; meus = admin ? null : (Array.isArray(perfil?.estados) ? perfil.estados : []).map(u => String(u).toUpperCase()); montarUf(); selCid.value = ''; aberto = ''; if (!box.hidden && !$('viewTele')?.hidden) desenhar(); });
  window.addEventListener('argo-sair', () => { meus = null; montarUf(); });

  let dados = null, aberto = '';
  async function carregar() {
    if (!dados) dados = Promise.all([
      fetch('anp/novos.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }),
      fetch('anp/meta.json').then(r => r.ok ? r.json() : {}).catch(() => ({}))
    ]);
    dados.catch(() => { dados = null; });
    return dados;
  }

  function cartao(x, hoje) {
    const novoHoje = entrada(x) === hoje;
    const datas = [
      x.v ? `<span><small>Entrou na base</small>${br(x.v)}</span>` : '',
      x.at ? `<span><small>Autorização ANP</small>${br(x.at)}</span>` : '',
      x.dv ? `<span><small>Bandeira desde</small>${br(x.dv)}</span>` : ''
    ].join('');
    const band = x.b || 'Sem bandeira', branca = /branca/i.test(band);
    return `<li class="tanpitem${novoHoje ? ' hoje' : ''}" data-c="${esc(x.c)}">
      <button type="button" class="tanpcab" aria-expanded="${aberto === x.c}">
        <span class="tanpnome">${novoHoje ? '<span class="tanpnovo">Novo hoje</span>' : ''}<b>${esc(x.r || '(sem nome)')}</b>
          <small>${esc(tit(x.m))}${x.uf ? ' - ' + esc(x.uf) : ''} · CNPJ ${fmtCnpj(x.c)}</small></span>
        <span class="tanpband">${window.anpSeloBandeira ? window.anpSeloBandeira(band, branca, true) : ''}<small>${esc(branca ? 'Bandeira branca' : band)}</small></span>
      </button>
      <div class="tanpdatas">${datas}</div>
      <div class="tanpdet" ${aberto === x.c ? '' : 'hidden'}></div>
    </li>`;
  }

  async function desenhar() {
    area.innerHTML = '<p class="hint">Carregando os postos novos da ANP…</p>';
    let novos, meta;
    try { const [j, m] = await carregar(); novos = j.postos || []; meta = m; }
    catch (e) { area.innerHTML = '<p class="hint">Não consegui carregar a base da ANP agora. Confira a internet e tente de novo.</p>'; return; }
    if (meus && !meus.length) { area.innerHTML = '<p class="hint">Nenhum Estado de atuação no seu cadastro. Peça ao administrador para marcar os seus Estados em Administração → Usuários.</p>'; return; }
    const hoje = local(), corte = menos(hoje, DIAS - 1), uf = selUf.value, q = norm(busca.value).split(' ').filter(Boolean);
    const janela = novos.filter(x => { const d = entrada(x); return d >= corte && d <= hoje; }).filter(x => uf ? x.uf === uf : !meus || meus.includes(x.uf));
    // Cidade e Bandeira: só as opções que têm posto novo no Estado escolhido (com a quantidade)
    const opcoes = (sel, lista, chave, rot, todos) => {
      const m = new Map(); lista.forEach(x => { const k = chave(x); if (k) m.set(k, (m.get(k) || 0) + 1); });
      const atual = sel.value;
      sel.innerHTML = `<option value="">${todos}</option>` + [...m].sort((a, b) => rot(a[0]).localeCompare(rot(b[0]), 'pt-BR'))
        .map(([k, n]) => `<option value="${esc(k)}">${esc(rot(k))} (${n})</option>`).join('');
      sel.value = m.has(atual) ? atual : '';
    };
    const cidKey = x => x.m ? x.m + '|' + (x.uf || '') : '';
    const cidRot = k => { const [m, u] = k.split('|'); return tit(m) + (uf ? '' : ' - ' + u); };
    opcoes(selCid, janela, cidKey, cidRot, 'Todas as cidades');
    const cid = selCid.value;
    opcoes(selBand, janela.filter(x => !cid || cidKey(x) === cid), bandKey, bandRot, 'Todas as bandeiras');
    const band = selBand.value;
    limpar.hidden = !(cid || band || q.length);
    const lista = janela
      .filter(x => !cid || cidKey(x) === cid)
      .filter(x => !band || bandKey(x) === band)
      .filter(x => { if (!q.length) return true; const t = norm([x.r, x.m, x.b, x.c].join(' ')); return q.every(p => t.includes(p)); })
      .sort((a, b) => entrada(b).localeCompare(entrada(a)) || (a.m || '').localeCompare(b.m || '') || (a.r || '').localeCompare(b.r || ''));
    const deHoje = lista.filter(x => entrada(x) === hoje);
    const resto = lista.filter(x => entrada(x) !== hoje);
    const onde = cid ? ` em ${esc(cidRot(cid))}${uf ? ' - ' + uf : ''}` : uf ? ` em ${uf}` : meus ? ' nos seus Estados' : ' no Brasil';
    const dias = new Map();
    resto.forEach(x => { const d = entrada(x); if (!dias.has(d)) dias.set(d, []); dias.get(d).push(x); });
    area.innerHTML = `
      <div class="tanpkpis">
        <div class="tanpkpi destaque"><small>Novos hoje${onde}</small><b>${deHoje.length}</b><span>${br(hoje)}</span></div>
        <div class="tanpkpi"><small>Últimos ${DIAS} dias${onde}</small><b>${lista.length}</b><span>desde ${br(corte)}</span></div>
      </div>
      <section class="tanpbloco tanphoje" aria-label="Novos hoje">
        <h3>Novos hoje</h3>
        ${deHoje.length ? `<ul class="tanplista">${deHoje.map(x => cartao(x, hoje)).join('')}</ul>`
          : `<p class="tanpvazio">Nenhum posto novo hoje${onde}. A base da ANP é atualizada todo dia às 5h (Brasília).</p>`}
      </section>
      ${[...dias].map(([d, l]) => `<section class="tanpbloco"><h3>${rotDia(d, hoje)} <small>${br(d)} · ${l.length} ${l.length === 1 ? 'posto' : 'postos'}</small></h3>
        <ul class="tanplista">${l.map(x => cartao(x, hoje)).join('')}</ul></section>`).join('')}
      ${!lista.length && (q.length || cid || band) ? '<p class="tanpvazio">Nenhum posto novo com esses filtros.</p>' : ''}
      <p class="hint">Postos que entraram na base da ANP ou receberam autorização da ANP nos últimos ${DIAS} dias.${meta && meta.atualizado ? ` Base da ANP atualizada em ${new Date(meta.atualizado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.` : ''}</p>`;
    if (aberto) { const li = area.querySelector(`.tanpitem[data-c="${aberto}"]`); if (li) detalhar(li); else aberto = ''; }
  }

  async function detalhar(li) {
    const det = li.querySelector('.tanpdet'), c = li.dataset.c;
    det.hidden = false;
    det.innerHTML = '<p class="hint">Carregando o posto…</p>';
    let p = null; try { p = window.anpPosto ? await window.anpPosto(c) : null; } catch (e) { }
    if (aberto !== c) return;
    det.innerHTML = (p && window.anpHtml ? window.anpHtml(p) : '<p class="hint">Não consegui abrir os dados completos deste posto agora.</p>')
      + '<div class="tanprf"><p class="tanprftit">Sócios na Receita</p><p class="hint">Buscando o CNPJ na Receita…</p></div>'
      + (window.crmLeadDoPosto ? `<div class="tanpacoes"><button type="button" class="primary" data-a="lead">Criar lead no CRM</button></div>` : '');
    receita(c, det.querySelector('.tanprf'));
  }

  // Dados da Receita pelo CNPJ (window.cnpjInfo, auth.js): quadro de sócios, situação, abertura e contato
  const rfCache = new Map();
  const nomeP = n => String(n || '').toLowerCase().replace(/(^|\s)(\S)/g, (m, a, c) => a + c.toUpperCase()).replace(/\s(Da|De|Do|Das|Dos|E)\s/g, m => m.toLowerCase());
  const fone = t => { const d = String(t || '').replace(/\D/g, ''); return d.length >= 10 ? d.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : d; };
  async function receita(c, el) {
    if (!rfCache.has(c)) { const pr = window.cnpjInfo ? window.cnpjInfo(c) : Promise.resolve(null); rfCache.set(c, pr); pr.then(r => { if (!r) rfCache.delete(c); }, () => rfCache.delete(c)); }
    let r = null; try { r = await rfCache.get(c); } catch (e) { }
    if (!el.isConnected) return;
    if (!r) { el.innerHTML = '<p class="tanprftit">Sócios na Receita</p><p class="hint">Não consegui consultar a Receita agora. Feche e abra o posto para tentar de novo.</p>'; return; }
    const soc = r.socios || [];
    const item = (rot, val) => val ? `<div><small>${rot}</small><span>${val}</span></div>` : '';
    const ativa = /ativa/i.test(r.situacao || '');
    el.innerHTML = `<p class="tanprftit">Sócios na Receita <b>${soc.length}</b></p>
      ${soc.length ? `<ul class="tanpsoc">${soc.map(x => `<li><b>${esc(nomeP(x.nome))}</b>${x.qual ? `<small>${esc(x.qual)}</small>` : ''}</li>`).join('')}</ul>`
        : '<p class="hint">A Receita não informa sócios para este CNPJ.</p>'}
      <div class="tanprfgrade">
        ${item('Situação', r.situacao ? `<span class="tanpsit${ativa ? ' ok' : ''}">${esc(r.situacao)}</span>` : '')}
        ${item('Abertura', esc(br(String(r.abertura || '').slice(0, 10))))}
        ${item('Nome fantasia', esc(r.fantasia))}
        ${item('Telefone', r.telefone ? `<a href="tel:${esc(String(r.telefone).replace(/\D/g, ''))}">${esc(fone(r.telefone))}</a>` : '')}
        ${item('E-mail', r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : '')}
      </div>`;
  }

  area.addEventListener('click', e => {
    const lead = e.target.closest('[data-a=lead]');
    if (lead) { window.crmLeadDoPosto(lead.closest('.tanpitem').dataset.c); return; }
    const cab = e.target.closest('.tanpcab'); if (!cab) return;
    const li = cab.closest('.tanpitem'), c = li.dataset.c;
    area.querySelectorAll('.tanpitem').forEach(o => { if (o !== li) { o.querySelector('.tanpdet').hidden = true; o.querySelector('.tanpcab').setAttribute('aria-expanded', 'false'); } });
    if (aberto === c) { aberto = ''; li.querySelector('.tanpdet').hidden = true; cab.setAttribute('aria-expanded', 'false'); return; }
    aberto = c; cab.setAttribute('aria-expanded', 'true'); detalhar(li);
  });
  selUf.addEventListener('change', () => { try { localStorage.setItem('tanpUf', selUf.value); } catch { } selCid.value = ''; aberto = ''; desenhar(); });
  selCid.addEventListener('change', () => { aberto = ''; desenhar(); });
  selBand.addEventListener('change', () => { aberto = ''; desenhar(); });
  limpar.addEventListener('click', () => { selCid.value = ''; selBand.value = ''; busca.value = ''; aberto = ''; desenhar(); });
  let t; busca.addEventListener('input', () => { clearTimeout(t); t = setTimeout(desenhar, 200); });

  // Abas da Telemetria: Postos em construção | Telemetria ANP
  const abas = [...document.querySelectorAll('#teleAbas [data-tele]')];
  function mostrar(qual) {
    abas.forEach(b => b.setAttribute('aria-selected', String(b.dataset.tele === qual)));
    document.querySelectorAll('[data-telepainel]').forEach(p => { p.hidden = p.dataset.telepainel !== qual; });
    try { localStorage.setItem('teleAba', qual); } catch { }
    if (qual === 'anp' && !$('viewTele').hidden) desenhar();
  }
  abas.forEach(b => b.addEventListener('click', () => mostrar(b.dataset.tele)));
  let ini = 'anp'; try { ini = localStorage.getItem('teleAba') || 'anp'; } catch { }
  // Desenha quando a aba Telemetria é aberta (o dia pode ter virado com o app aberto)
  const tab = $('tabTele'); if (tab) tab.addEventListener('click', () => setTimeout(() => { if (!box.hidden && !$('viewTele').hidden) desenhar(); }));
  mostrar(abas.some(b => b.dataset.tele === ini) ? ini : 'anp');
  // Aviso do sino (notificacoes.js): abre a Telemetria ANP filtrada no Estado do aviso
  window.addEventListener('shotgun-abrir-anp', e => {
    const uf = e.detail && e.detail.uf;
    if (uf && ufsVisiveis().includes(uf)) { selUf.value = uf; try { localStorage.setItem('tanpUf', uf); } catch { } }
    selCid.value = ''; selBand.value = ''; busca.value = ''; aberto = '';
    try { localStorage.setItem('teleAba', 'anp'); } catch { }
    if (tab) tab.click();
    mostrar('anp');
  });
})();

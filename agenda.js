// Módulo Agenda: demonstrações do sistema, sempre ligadas a um lead do CRM, e os "Próximo contato" dos leads como lembrete.
// Dados: as demonstrações ficam no próprio lead (crm/{id}.demos), então valem as mesmas regras do CRM:
//   o vendedor dono do lead agenda e apresenta; o ADM vê e mexe em todas.
//   demos: [{ id, data: 'AAAA-MM-DD', hora: 'HH:MM', dur: minutos, formato: 'online' | 'presencial', link, local,
//             participantes: [nomes], obs, status: 'agendada', criado, por, porUid, alterado }]
// Os leads chegam do crm.js pelo evento 'crm-dados' (o CRM já está ouvindo a coleção, a Agenda não lê de novo).
// Para abrir o lead e cadastrar lead novo, usa window.crmAbrirLead / window.crmNovoLead (crm.js).
(() => {
  let F, db, perfil, admin = false, leads = [], usuarios = {}, pronto = false;
  let modo = '', ref = '', fUser = '', verProx = true;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dig = v => String(v || '').replace(/\D/g, '');
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hoje = () => iso(new Date());
  const dt = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const soma = (s, n) => { const d = dt(s); d.setDate(d.getDate() + n); return iso(d); };
  const segunda = s => { const d = dt(s); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return iso(d); };
  const fmtD = s => { const [y, m, d] = String(s || '').split('-'); return d ? `${d}/${m}/${y}` : ''; };
  const fmtDC = s => { const [, m, d] = String(s || '').split('-'); return d ? `${d}/${m}` : ''; };
  const SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const diaLongo = s => { const d = dt(s); return `${SEM[d.getDay()]}, ${d.getDate()} de ${MES[d.getMonth()]}`; };
  const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
  const min = h => { const [a, b] = String(h || '0:0').split(':').map(Number); return a * 60 + (b || 0); };
  const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const fimDe = d => hhmm(min(d.hora) + (Number(d.dur) || 60));
  const quem = () => perfil.nome || perfil.email || '';
  const celular = () => window.matchMedia('(max-width:760px)').matches;
  const contatosDe = l => Array.isArray(l.contatos) && l.contatos.length ? l.contatos : (l.contato || l.fone ? [{ nome: l.contato || '', fone: l.fone || '' }] : []);
  const DURS = [30, 45, 60, 90, 120];
  const durTxt = m => m < 60 ? m + ' min' : m % 60 ? Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0') : (m / 60) + 'h';
  const IC = {
    video: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
    pin: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
    fone: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>',
    esq: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    dir: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    cal: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>'
  };

  window.addEventListener('shotgun-crm', e => { ({ F, db, perfil, admin } = e.detail); pronto = false; fUser = ''; if (!modo) modo = celular() ? 'dia' : 'semana'; ref = hoje(); });
  window.addEventListener('crm-dados', e => { leads = e.detail.leads || []; usuarios = e.detail.usuarios || {}; pronto = true; desenhar(); if (dlg().open && dlg().dataset.modo === 'form') atualizarConflito(); });
  window.addEventListener('argo-sair', () => { leads = []; usuarios = {}; pronto = false; fUser = ''; if (dlg() && dlg().open) dlg().close(); });

  /* ---------- Itens da agenda ---------- */
  const doUser = l => !fUser || l.owner === fUser;
  function demos() {
    const out = [];
    leads.filter(doUser).forEach(l => (Array.isArray(l.demos) ? l.demos : []).forEach(d => { if (d && d.data && d.status !== 'cancelada') out.push({ k: 'demo', l, d, data: d.data, ord: min(d.hora) }); }));
    return out;
  }
  // Próximo contato: só dos leads em aberto (sem proposta e não perdidos), como no funil do CRM
  function lembretes() {
    if (!verProx) return [];
    return leads.filter(l => doUser(l) && l.prox && !l._temProp && l.etapa !== 'perdido').map(l => ({ k: 'prox', l, data: l.prox, ord: -1 }));
  }
  // Itens de um dia. Hoje também traz os próximos contatos que já passaram (atrasados).
  function doDia(s, todos) {
    const h = hoje();
    return todos.filter(x => x.data === s || (s === h && x.k === 'prox' && x.data < h)).sort((a, b) => a.ord - b.ord || String(a.l.empresa).localeCompare(String(b.l.empresa), 'pt-BR'));
  }

  function itemHtml(x, largo) {
    const l = x.l, dono = admin && l.vendedor ? `<small class="agdono">${esc(l.vendedor)}</small>` : '';
    if (x.k === 'prox') {
      const atras = x.data < hoje(), c0 = contatosDe(l)[0] || {};
      return `<button type="button" class="agit prox${atras ? ' atras' : ''}" data-lead="${esc(l.id)}">
        <span class="aghora">${atras ? 'Atrasado · ' + fmtDC(x.data) : 'Próximo contato'}</span><b>${esc(l.empresa || '(sem nome)')}</b>
        ${largo && (c0.nome || c0.fone) ? `<small>${esc([c0.nome, c0.fone].filter(Boolean).join(' · '))}</small>` : ''}${dono}</button>`;
    }
    const d = x.d, on = d.formato !== 'presencial', parts = (d.participantes || []).filter(Boolean);
    return `<button type="button" class="agit demo${x.data < hoje() ? ' passou' : ''}" data-lead="${esc(l.id)}" data-demo="${esc(d.id)}">
      <span class="aghora">${esc(d.hora)} – ${esc(fimDe(d))}</span><b>${esc(l.empresa || '(sem nome)')}</b>
      <small class="agfmt">${on ? IC.video + 'Online' : IC.pin + 'Presencial'} · ${durTxt(Number(d.dur) || 60)}</small>
      ${largo && parts.length ? `<small>Com ${esc(parts.join(', '))}</small>` : ''}
      ${largo && !on && d.local ? `<small>${esc(d.local)}</small>` : ''}${dono}</button>`;
  }

  /* ---------- Telas ---------- */
  function desenhar() {
    if (!$('viewAgenda') || !perfil) return;
    montarFiltro();
    document.querySelectorAll('#agModo button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.modo === modo)));
    $('agProxChk').checked = verProx;
    const todos = [...demos(), ...lembretes()], h = hoje();
    const futuras = todos.filter(x => x.k === 'demo' && x.data >= h).length;
    $('agCount').textContent = pronto ? `${futuras} demonstraç${futuras === 1 ? 'ão agendada' : 'ões agendadas'}` : '';
    $('agNavBox').hidden = modo === 'prox';
    if (!pronto) { $('agArea').innerHTML = '<p class="hint">Carregando a agenda…</p>'; return; }
    if (modo === 'semana') semana(todos); else if (modo === 'dia') dia(todos); else proximas(todos);
  }

  function semana(todos) {
    const ini = segunda(ref), h = hoje(), fim = soma(ini, 6);
    $('agPeriodo').textContent = dt(ini).getMonth() === dt(fim).getMonth() ? `${dt(ini).getDate()} a ${dt(fim).getDate()} de ${MES[dt(fim).getMonth()]}` : `${fmtDC(ini)} a ${fmtDC(fim)}`;
    $('agArea').innerHTML = `<div class="agsemana">${[0, 1, 2, 3, 4, 5, 6].map(i => {
      const s = soma(ini, i), its = doDia(s, todos), d = dt(s);
      return `<div class="agcol${s === h ? ' hoje' : ''}${s < h ? ' passado' : ''}${i > 4 ? ' fds' : ''}" data-dia="${s}">
        <button type="button" class="agcolh" data-irdia="${s}" title="Ver o dia"><span>${SEM[d.getDay()].slice(0, 3)}</span><b>${d.getDate()}</b></button>
        ${its.map(x => itemHtml(x, false)).join('') || '<span class="agvazio" aria-hidden="true"></span>'}
        ${s >= h ? `<button type="button" class="agadd" data-novo="${s}" aria-label="Agendar em ${fmtD(s)}" title="Agendar neste dia">+</button>` : ''}
      </div>`; }).join('')}</div>`;
  }

  function dia(todos) {
    const h = hoje(), its = doDia(ref, todos);
    $('agPeriodo').textContent = ref === h ? 'Hoje, ' + diaLongo(ref) : ref === soma(h, 1) ? 'Amanhã, ' + diaLongo(ref) : ref === soma(h, -1) ? 'Ontem, ' + diaLongo(ref) : cap(diaLongo(ref));
    $('agArea').innerHTML = `<div class="agdia">${its.length ? its.map(x => itemHtml(x, true)).join('') : `<div class="agnada">${IC.cal}<b>Nada marcado ${ref === h ? 'para hoje' : 'neste dia'}.</b>${ref >= h ? '<span>Toque em + Agendar demonstração para marcar uma.</span>' : ''}</div>`}
      ${ref >= h ? `<button type="button" class="agadd largo" data-novo="${ref}">+ Agendar neste dia</button>` : ''}</div>`;
  }

  function proximas(todos) {
    const h = hoje(), lim = soma(h, 60);
    const atras = todos.filter(x => x.k === 'prox' && x.data < h).sort((a, b) => a.data.localeCompare(b.data));
    const vem = todos.filter(x => x.data >= h && x.data <= lim);
    const dias = [...new Set(vem.map(x => x.data))].sort();
    const grupo = (tit, its, cls) => `<div class="aggrupo${cls ? ' ' + cls : ''}"><h4>${tit}</h4><div class="agdia">${its.map(x => itemHtml(x, true)).join('')}</div></div>`;
    $('agArea').innerHTML = (atras.length ? grupo(`Próximos contatos atrasados <b>${atras.length}</b>`, atras, 'atras') : '') +
      (dias.length ? dias.map(s => grupo(s === h ? 'Hoje · ' + diaLongo(s) : s === soma(h, 1) ? 'Amanhã · ' + diaLongo(s) : cap(diaLongo(s)), vem.filter(x => x.data === s).sort((a, b) => a.ord - b.ord))).join('')
        : `<div class="agnada">${IC.cal}<b>Nada marcado nos próximos 60 dias.</b><span>Toque em + Agendar demonstração para marcar uma.</span></div>`);
  }

  function montarFiltro() {
    const sel = $('agUsuario'); sel.hidden = !admin;
    if (!admin) return;
    const us = new Map();
    Object.entries(usuarios).forEach(([uid, u]) => { if (u.ativo && (u.papeis || []).some(p => p === 'vendedor' || p === 'adm')) us.set(uid, u.nome); });
    leads.forEach(l => { if (l.owner && !us.has(l.owner)) us.set(l.owner, usuarios[l.owner]?.nome || l.vendedor || 'Sem nome'); });
    us.delete(perfil.uid);
    const lista = [...us.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'pt-BR'));
    sel.innerHTML = `<option value="">Todos os usuários</option><option value="${esc(perfil.uid)}">Só a minha</option>` + lista.map(([uid, n]) => `<option value="${esc(uid)}">${esc(n)}</option>`).join('');
    sel.value = fUser; sel.classList.toggle('on', !!fUser);
  }

  /* ---------- Diálogo ---------- */
  const dlg = () => $('agDlg');
  const dmsg = t => { $('agDlgMsg').textContent = t || ''; };
  let atual = null; // { leadId, demo (cópia em edição), volta: 'lead' | '' }
  function abrirDlg(tit, html, m) { $('agDlgTit').textContent = tit; $('agDlgBody').innerHTML = html; dmsg(''); dlg().dataset.modo = m; if (!dlg().open) dlg().showModal(); }
  function fechar() { if (window.crmPararDitado) window.crmPararDitado(); if (dlg().open) dlg().close(); }

  // Formulário: novo (leadId opcional, data sugerida) ou edição (leadId + demoId)
  function form(leadId, demoId, opts = {}) {
    if (window.crmFecharDlg) window.crmFecharDlg();
    const l = leadId ? leads.find(x => x.id === leadId) : null;
    const d0 = l && demoId ? (l.demos || []).find(x => x.id === demoId) : null;
    if (demoId && !d0) { msgTela('Essa demonstração não existe mais.'); return; }
    const h = hoje(), agora = new Date(), proxHora = hhmm(Math.min(18 * 60, Math.ceil((agora.getHours() * 60 + agora.getMinutes() + 30) / 30) * 30));
    const data = d0 ? d0.data : opts.data && opts.data >= h ? opts.data : modo === 'dia' && ref >= h ? ref : h;
    const d = d0 ? { ...d0 } : opts.rascunho ? { ...opts.rascunho, data: opts.rascunho.data >= h ? opts.rascunho.data : data, participantes: [] } : { data, hora: data === h ? proxHora : '09:00', dur: 60, formato: 'online', link: '', local: '', participantes: [], obs: '' };
    atual = { leadId: l ? l.id : '', demo: d, editando: !!d0, volta: opts.volta || '' };
    abrirDlg(d0 ? 'Demonstração' : 'Agendar demonstração', `
      <div class="agform" id="agForm">
        <section class="crmbloco"><h4>Lead <em class="agreq">obrigatório</em></h4><div id="agLeadBox"></div></section>
        <section class="crmbloco"><h4>Quando</h4>
          <div class="tkform agquando">
            <label>Data<input type="date" id="agData" min="${d0 && d0.data < h ? d0.data : h}" value="${esc(d.data)}" required></label>
            <label>Hora<input type="time" id="agHora" step="900" value="${esc(d.hora)}" required></label>
            <label>Duração<select id="agDur">${DURS.concat(DURS.includes(Number(d.dur)) ? [] : [Number(d.dur)]).map(m => `<option value="${m}"${m === Number(d.dur) ? ' selected' : ''}>${durTxt(m)}</option>`).join('')}</select></label>
          </div>
          <p class="agconf" id="agConf" hidden></p>
        </section>
        <section class="crmbloco"><h4>Onde</h4>
          <div class="agfmtsel" role="radiogroup" aria-label="Formato">
            <label class="agopt"><input type="radio" name="agFmt" value="online"${d.formato !== 'presencial' ? ' checked' : ''}>${IC.video}<span><b>Online</b><small>Por videochamada</small></span></label>
            <label class="agopt"><input type="radio" name="agFmt" value="presencial"${d.formato === 'presencial' ? ' checked' : ''}>${IC.pin}<span><b>Presencial</b><small>No posto do cliente</small></span></label>
          </div>
          <label id="agLinkL">Link da reunião <small>opcional</small><input id="agLink" type="url" inputmode="url" placeholder="https://meet.google.com/…" value="${esc(d.link || '')}"></label>
          <label id="agLocalL">Endereço<input id="agLocal" placeholder="Rua, número, bairro, cidade" value="${esc(d.local || '')}"></label>
        </section>
        <section class="crmbloco"><h4>Participantes do cliente</h4><div id="agPartBox"></div></section>
        <section class="crmbloco"><h4>O que mostrar</h4>
          <label class="full">Pontos de interesse e observações<span class="ditado"><textarea id="agObs" rows="3" maxlength="1500" placeholder="Ex.: quer ver o PDV, o TEF e a conciliação de cartões">${esc(d.obs || '')}</textarea>${window.crmMicBtn ? window.crmMicBtn() : ''}</span><small class="ditst" hidden></small></label>
        </section>
        <p class="hint agquem" id="agQuem"></p>
      </div>
      <div class="tools crmacts">
        <button type="button" class="primary" data-a="salvar">${d0 ? 'Salvar' : 'Agendar'}</button>
        <button type="button" data-a="cancelar">Fechar</button>
        ${d0 ? '<button type="button" class="danger" data-a="excluir">Excluir</button>' : ''}
      </div>`, 'form');
    desenharLead(); formato(); atualizarConflito();
    if (!l) setTimeout(() => { const b = $('agLeadQ'); if (b) b.focus(); }, 50);
  }

  function leadAtual() { return atual && atual.leadId ? leads.find(x => x.id === atual.leadId) : null; }
  function desenharLead() {
    const box = $('agLeadBox'); if (!box) return;
    const l = leadAtual();
    if (l) {
      const c0 = contatosDe(l)[0] || {};
      box.innerHTML = `<div class="aglead"><span><b>${esc(l.empresa || '(sem nome)')}</b><small>${esc([l.cidade, c0.nome, l.origem].filter(Boolean).join(' · '))}</small></span>
        <span class="aglacts"><button type="button" class="linkbtn" data-a="verlead">Abrir lead</button>${atual.editando ? '' : '<button type="button" class="linkbtn" data-a="trocar">Trocar</button>'}</span></div>`;
    } else {
      box.innerHTML = `<input id="agLeadQ" type="search" autocomplete="off" placeholder="Busque pelo nome do posto, contato ou CNPJ" aria-label="Buscar lead">
        <div class="agres" id="agRes"></div>
        <p class="hint">Toda demonstração precisa de um lead. Não achou? <button type="button" class="linkbtn" data-a="novolead">Cadastrar lead novo</button></p>`;
      buscar();
    }
    desenharPart();
    const q = $('agQuem');
    if (q) q.textContent = l ? `Quem apresenta: ${l.owner === perfil.uid ? 'você' : (l.vendedor || 'o vendedor do lead')}${l.owner === perfil.uid ? '' : ' (vendedor do lead)'}.` : '';
    const loc = $('agLocal');
    if (l && loc && !loc.value.trim()) loc.value = l.anp?.endereco ? [l.anp.endereco, l.anp.bairro, l.anp.municipio && l.anp.uf ? l.anp.municipio + ' - ' + l.anp.uf : l.anp.municipio].filter(Boolean).join(', ') : (l.cidade || '');
  }
  function buscar() {
    const box = $('agRes'); if (!box) return;
    const q = norm($('agLeadQ').value.trim()), qd = dig($('agLeadQ').value);
    const base = leads.filter(l => l.etapa !== 'perdido' || q);
    const lista = (q ? base.filter(l => norm([l.empresa, l.contato, l.cidade].join(' ')).includes(q) || (qd.length >= 3 && dig(l.cnpj).includes(qd))) : base.slice().sort((a, b) => (b.criado?.seconds || 0) - (a.criado?.seconds || 0))).slice(0, 8);
    box.innerHTML = lista.length ? (q ? '' : '<small class="agrestit">Leads mais recentes</small>') + lista.map(l => `<button type="button" class="agresit" data-pick="${esc(l.id)}"><b>${esc(l.empresa || '(sem nome)')}</b><small>${esc([l.cidade, l.contato, admin && l.vendedor].filter(Boolean).join(' · '))}</small></button>`).join('')
      : `<p class="hint">${q ? 'Nenhum lead encontrado com essa busca.' : 'Você ainda não tem leads.'}</p>`;
  }
  function desenharPart() {
    const box = $('agPartBox'); if (!box) return;
    const l = leadAtual(), nomes = l ? [...new Set(contatosDe(l).map(c => String(c.nome || '').trim()).filter(Boolean))] : [];
    const marc = atual.demo.participantes || [];
    nomes.push(...marc.filter(n => !nomes.includes(n)));
    box.innerHTML = !l ? '<p class="hint">Escolha o lead para ver os contatos.</p>' : nomes.length ? `<div class="agparts">${nomes.map(n => `<label class="uchip"><input type="checkbox" data-part="${esc(n)}"${marc.includes(n) ? ' checked' : ''}> ${esc(n)}</label>`).join('')}</div>`
      : '<p class="hint">Este lead não tem contatos com nome. Cadastre no lead para escolher aqui.</p>';
  }
  function formato() {
    const on = (document.querySelector('input[name=agFmt]:checked') || {}).value !== 'presencial';
    $('agLinkL').hidden = !on; $('agLocalL').hidden = on;
  }
  function lerDlg() {
    const d = atual.demo;
    d.data = $('agData').value; d.hora = $('agHora').value; d.dur = Number($('agDur').value) || 60;
    d.formato = (document.querySelector('input[name=agFmt]:checked') || {}).value === 'presencial' ? 'presencial' : 'online';
    d.link = $('agLink').value.trim(); d.local = $('agLocal').value.trim(); d.obs = $('agObs').value.trim();
    d.participantes = [...document.querySelectorAll('#agPartBox [data-part]:checked')].map(i => i.dataset.part);
    return d;
  }
  // Conflito: outra demonstração da mesma pessoa (dono do lead) que se sobrepõe no horário
  function conflitos() {
    const l = leadAtual(); if (!l || !$('agData')) return [];
    const data = $('agData').value, ini = min($('agHora').value), fim = ini + (Number($('agDur').value) || 60);
    if (!data || !$('agHora').value) return [];
    const out = [];
    leads.filter(x => x.owner === l.owner).forEach(x => (x.demos || []).forEach(d => {
      if (d.status === 'cancelada' || d.data !== data || (x.id === l.id && d.id === atual.demo.id)) return;
      const a = min(d.hora), b = a + (Number(d.dur) || 60);
      if (ini < b && a < fim) out.push(`${d.hora}–${fimDe(d)} com ${x.empresa || '(sem nome)'}`);
    }));
    return out;
  }
  function atualizarConflito() {
    const p = $('agConf'); if (!p) return;
    const cs = conflitos(), l = leadAtual();
    p.hidden = !cs.length; delete p.dataset.ok;
    if (cs.length) p.innerHTML = `<b>Choque de horário.</b> ${l && l.owner === perfil.uid ? 'Você já tem' : esc((l?.vendedor || 'O vendedor').split(' ')[0]) + ' já tem'} ${cs.length === 1 ? 'uma demonstração' : 'demonstrações'} nesse horário: ${esc(cs.join('; '))}.`;
  }

  async function salvar(btn) {
    const l = leadAtual();
    if (!l) { dmsg('Escolha o lead da demonstração.'); const q = $('agLeadQ'); if (q) q.focus(); return; }
    const d = lerDlg();
    if (!d.data || !d.hora) { dmsg('Preencha a data e a hora.'); (d.data ? $('agHora') : $('agData')).focus(); return; }
    if (!atual.editando && d.data < hoje()) { dmsg('Escolha uma data de hoje em diante.'); $('agData').focus(); return; }
    if (d.link && !/^https?:\/\//i.test(d.link)) d.link = 'https://' + d.link;
    const conf = $('agConf');
    if (conflitos().length && conf.dataset.ok !== '1') { conf.dataset.ok = '1'; btn.textContent = atual.editando ? 'Salvar mesmo assim' : 'Agendar mesmo assim'; dmsg('Há choque de horário. Toque de novo para salvar assim mesmo.'); return; }
    const agoraIso = new Date().toISOString();
    if (!d.id) Object.assign(d, { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), status: 'agendada', criado: agoraIso, por: quem(), porUid: perfil.uid });
    else Object.assign(d, { alterado: agoraIso, alteradoPor: quem() });
    const lista = (l.demos || []).filter(x => x.id !== d.id).concat([d]).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    btn.disabled = true; dmsg('Salvando…');
    try {
      await F.updateDoc(F.doc(db, 'crm', l.id), { demos: lista, alterado: F.serverTimestamp(), alteradoPor: quem() });
      l.demos = lista;
      const volta = atual.volta, novo = !atual.editando;
      fechar();
      msgTela(`${novo ? 'Demonstração agendada' : 'Demonstração salva'}: ${l.empresa || ''}, ${fmtD(d.data)} às ${d.hora}.`);
      if (volta === 'lead' && window.crmAbrirLead) window.crmAbrirLead(l.id, true);
      else { ref = d.data; desenhar(); }
    } catch (e) { dmsg('Não foi possível salvar (' + (e.code || e.message) + ').'); }
    finally { btn.disabled = false; }
  }
  async function excluir(btn) {
    const l = leadAtual(); if (!l) return;
    if (btn.dataset.confirma !== '1') { btn.dataset.confirma = '1'; btn.textContent = 'Confirmar exclusão'; dmsg('Toque de novo para excluir esta demonstração.'); return; }
    const lista = (l.demos || []).filter(x => x.id !== atual.demo.id);
    try {
      await F.updateDoc(F.doc(db, 'crm', l.id), { demos: lista, alterado: F.serverTimestamp(), alteradoPor: quem() });
      l.demos = lista; const volta = atual.volta; fechar(); msgTela('Demonstração excluída.');
      if (volta === 'lead' && window.crmAbrirLead) window.crmAbrirLead(l.id, true); else desenhar();
    } catch (e) { dmsg('Não foi possível excluir (' + (e.code || e.message) + ').'); }
  }

  function msgTela(t) { const el = $('agMsg'); if (!el) return; el.textContent = t || ''; el.hidden = !t; clearTimeout(msgTela.t); if (t) msgTela.t = setTimeout(() => { el.hidden = true; }, 6000); }

  /* ---------- Para o CRM ---------- */
  // Abre o formulário a partir da ficha do lead (volta para o lead depois de salvar)
  window.agendaNova = (leadId) => form(leadId, '', { volta: 'lead' });
  window.agendaAbrir = (leadId, demoId) => form(leadId, demoId, { volta: 'lead' });
  // Próxima demonstração do lead (para o card do funil e a ficha)
  window.agendaProxima = l => (Array.isArray(l?.demos) ? l.demos : []).filter(d => d.status !== 'cancelada' && d.data >= hoje()).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))[0] || null;
  window.agendaFmt = d => d ? `${fmtDC(d.data)} às ${d.hora}` : '';

  /* ---------- Eventos ---------- */
  function ligar() {
    if (!$('viewAgenda')) return;
    $('agModo').addEventListener('click', e => { const b = e.target.closest('[data-modo]'); if (!b) return; modo = b.dataset.modo; desenhar(); });
    $('agAnt').addEventListener('click', () => { ref = soma(ref, modo === 'semana' ? -7 : -1); desenhar(); });
    $('agProx').addEventListener('click', () => { ref = soma(ref, modo === 'semana' ? 7 : 1); desenhar(); });
    $('agHoje').addEventListener('click', () => { ref = hoje(); desenhar(); });
    $('agUsuario').addEventListener('change', e => { fUser = e.target.value; desenhar(); });
    $('agProxChk').addEventListener('change', e => { verProx = e.target.checked; desenhar(); });
    $('agNova').addEventListener('click', () => form('', '', {}));
    $('agArea').addEventListener('click', e => {
      const ir = e.target.closest('[data-irdia]'); if (ir) { ref = ir.dataset.irdia; modo = 'dia'; desenhar(); return; }
      const nv = e.target.closest('[data-novo]'); if (nv) { form('', '', { data: nv.dataset.novo }); return; }
      const it = e.target.closest('[data-lead]'); if (!it) return;
      if (it.dataset.demo) form(it.dataset.lead, it.dataset.demo, {});
      else if (window.crmAbrirLead) window.crmAbrirLead(it.dataset.lead);
    });
    $('agDlgFechar').addEventListener('click', fechar);
    dlg().addEventListener('close', () => { if (window.crmPararDitado) window.crmPararDitado(); });
    dlg().addEventListener('input', e => { if (e.target.id === 'agLeadQ') buscar(); if (['agData', 'agHora'].includes(e.target.id)) atualizarConflito(); });
    dlg().addEventListener('change', e => { if (e.target.name === 'agFmt') formato(); if (['agData', 'agHora', 'agDur'].includes(e.target.id)) atualizarConflito(); });
    dlg().addEventListener('click', e => {
      const pk = e.target.closest('[data-pick]');
      if (pk) { lerDlgSeguro(); atual.leadId = pk.dataset.pick; atual.demo.participantes = []; desenharLead(); atualizarConflito(); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'ditar') { if (window.crmDitar) window.crmDitar(b); return; }
      if (window.crmPararDitado) window.crmPararDitado();
      if (a === 'salvar') salvar(b);
      else if (a === 'cancelar') { const v = atual.volta, id = atual.leadId; fechar(); if (v === 'lead' && id && window.crmAbrirLead) window.crmAbrirLead(id, true); }
      else if (a === 'excluir') excluir(b);
      else if (a === 'trocar') { lerDlgSeguro(); atual.leadId = ''; atual.demo.participantes = []; desenharLead(); atualizarConflito(); }
      else if (a === 'verlead') { const id = atual.leadId; fechar(); if (window.crmAbrirLead) window.crmAbrirLead(id); }
      else if (a === 'novolead') {
        // Cadastra o lead no CRM e volta para cá com ele escolhido
        const d = lerDlgSeguro(); fechar();
        const rascunho = d ? { ...d } : null;
        const tenta = (id, n) => { if (leads.some(x => x.id === id) || n > 30) form(id, '', { rascunho }); else setTimeout(() => tenta(id, n + 1), 100); };
        if (window.crmNovoLead) window.crmNovoLead(id => tenta(id, 0));
      }
    });
  }
  function lerDlgSeguro() { try { return lerDlg(); } catch (e) { return atual && atual.demo; } }
  ligar();
})();

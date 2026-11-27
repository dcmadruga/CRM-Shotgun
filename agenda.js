// Módulo Agenda: demonstrações do sistema, sempre ligadas a um lead do CRM, e os "Próximo contato" dos leads como lembrete.
// Dados: as demonstrações ficam no próprio lead (crm/{id}.demos), então valem as mesmas regras do CRM:
//   o vendedor dono do lead agenda e apresenta; o ADM vê e mexe em todas.
//   demos: [{ id, data: 'AAAA-MM-DD', hora: 'HH:MM', dur: minutos, formato: 'online' | 'presencial', link, local,
//             participantes: [nomes], obs, status, criado, por, porUid, alterado,
//             resultado: 'proposta' | 'pensar' | 'sem', resultadoObs, feitaEm, motivoCanc, remarcadaPara, statusPor,
//             horaReal, durReal (quando começou e quanto durou de fato, gravados em Realizada),
//             agOrig: { data, hora } (primeiro horário, guardado quando alguém edita a data ou a hora) }]
//   Na tela também há dois estados calculados, sem gravar nada: Em andamento (entre o início e o fim) e Atrasada (passou do fim sem resultado).
//   status: agendada → confirmada → realizada | naocompareceu | remarcada ("Reagendada": vira uma demo nova, com a nova data obrigatória) | cancelada
//   O status 'remarcada' continua com esse nome no banco (demos antigas); na tela aparece como Reagendada.
//   Realizada grava "Demonstração realizada" no histórico do lead e move o lead no funil (Qualificado ou Perdido).
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
  const ST = { agendada: 'Agendada', confirmada: 'Confirmada', realizada: 'Realizada', naocompareceu: 'Não compareceu', remarcada: 'Reagendada', cancelada: 'Cancelada' };
  const RES = { proposta: 'Quer proposta', pensar: 'Vai pensar', sem: 'Sem interesse' };
  const MOTIVOS = ['Preço', 'Escolheu concorrente', 'Sem interesse no momento', 'Sem retorno', 'Fora do perfil', 'Outro'];
  const stDe = d => ST[d.status] ? d.status : 'agendada';
  const aberta = d => ['agendada', 'confirmada'].includes(stDe(d));
  const naAgenda = d => !['remarcada', 'cancelada'].includes(stDe(d));
  // Já passou do fim e ninguém marcou o que aconteceu
  const semResultado = d => { if (!aberta(d)) return false; const h = hoje(); if (d.data !== h) return d.data < h; const a = new Date(); return a.getHours() * 60 + a.getMinutes() >= min(d.hora) + (Number(d.dur) || 60); };
  const agoraMin = () => { const a = new Date(); return a.getHours() * 60 + a.getMinutes(); };
  // Em andamento: aberta, hoje, já passou do início e ainda não do fim
  const emAndamento = d => aberta(d) && d.data === hoje() && agoraMin() >= min(d.hora) && !semResultado(d);
  const stVis = d => semResultado(d) ? 'pend' : emAndamento(d) ? 'andamento' : stDe(d);
  const pillSt = d => semResultado(d) ? '<span class="agst st-pend">Atrasada · registrar resultado</span>' : emAndamento(d) ? '<span class="agst st-andamento">Em andamento</span>' : `<span class="agst st-${stDe(d)}">${esc(ST[stDe(d)])}${stDe(d) === 'realizada' && d.resultado ? ' · ' + esc(RES[d.resultado] || '') : ''}</span>`;
  const durTxt = m => m < 60 ? m + ' min' : m % 60 ? Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0') : (m / 60) + 'h';
  // Planejado × real: horário alterado depois de agendar, reagendada de outra demo e a hora em que começou de fato
  const atrasoTxt = (hora, real) => { const m = min(real) - min(hora); return m > 0 ? `${durTxt(m)} de atraso` : m < 0 ? `${durTxt(-m)} antes` : 'no horário'; };
  function planoReal(l, d) {
    const out = [], o = d.agOrig;
    if (o && o.hora && (o.data !== d.data || o.hora !== d.hora)) out.push(`Marcada antes para ${o.data === d.data ? o.hora : fmtDC(o.data) + ' às ' + o.hora}`);
    const de = l && (l.demos || []).find(x => x.remarcadaPara === d.id);
    if (de) out.push(`Reagendada de ${fmtDC(de.data)} às ${de.hora}`);
    if (stDe(d) === 'realizada' && d.horaReal) out.push(`Começou às ${d.horaReal} (${atrasoTxt(d.hora, d.horaReal)})${d.durReal && Number(d.durReal) !== (Number(d.dur) || 60) ? ' · durou ' + durTxt(Number(d.durReal)) : ''}`);
    return out;
  }
  const IC = {
    video: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
    pin: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
    fone: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>',
    esq: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    dir: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    cal: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
    whats: '<svg class="agic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>'
  };

  window.addEventListener('shotgun-crm', e => { ({ F, db, perfil, admin } = e.detail); pronto = false; fUser = ''; if (!modo) modo = celular() ? 'dia' : 'semana'; ref = hoje(); });
  window.addEventListener('crm-dados', e => { leads = e.detail.leads || []; usuarios = e.detail.usuarios || {}; pronto = true; desenhar(); if (dlg().open && dlg().dataset.modo === 'form') atualizarConflito(); });
  window.addEventListener('argo-sair', () => { leads = []; usuarios = {}; pronto = false; fUser = ''; if (dlg() && dlg().open) dlg().close(); });

  /* ---------- Itens da agenda ---------- */
  const doUser = l => !fUser || l.owner === fUser;
  function demos() {
    const out = [];
    leads.filter(doUser).forEach(l => (Array.isArray(l.demos) ? l.demos : []).forEach(d => { if (d && d.data) out.push({ k: 'demo', l, d, data: d.data, ord: min(d.hora) }); }));
    return out;
  }
  // Próximo contato: só dos leads em aberto (sem proposta e não perdidos), como no funil do CRM
  function lembretes() {
    if (!verProx) return [];
    return leads.filter(l => doUser(l) && l.prox && !l._temProp && l.etapa !== 'perdido' && !proxResolvido(l)).map(l => ({ k: 'prox', l, data: l.prox, ord: -1 }));
  }
  // O próximo contato já está resolvido quando o lead tem uma demonstração (agendada, confirmada ou realizada) do dia dele em diante:
  // ex.: o contato era 26/11 e a demonstração foi reagendada para 28/11. Aí o lembrete some, em vez de ficar "Atrasado".
  function proxResolvido(l) {
    return (Array.isArray(l.demos) ? l.demos : []).some(d => d && d.data && d.data >= l.prox && !['cancelada', 'naocompareceu', 'remarcada'].includes(stDe(d)));
  }
  // Itens de um dia. Hoje também traz os próximos contatos que já passaram (atrasados).
  function doDia(s, todos) {
    const h = hoje();
    return todos.filter(x => x.data === s || (s === h && x.k === 'prox' && x.data < h)).sort((a, b) => a.ord - b.ord || String(a.l.empresa).localeCompare(String(b.l.empresa), 'pt-BR'));
  }

  // Cidade / UF embaixo do nome no quadro da agenda (some quando o cadastro não tem cidade)
  const cidAg = l => { const c = window.sgCidadeUf ? window.sgCidadeUf(l) : ''; return c ? `<small class="agcid">${esc(c)}</small>` : ''; };
  // Atalhos de status no próprio card: Realizada (só do dia em diante que já chegou), Reagendada e Cancelada
  function barraSt(l, d) {
    if (!aberta(d)) return '';
    const b = (a, t) => `<button type="button" class="agq agq-${a}" data-qst="${a}" data-lead="${esc(l.id)}" data-demo="${esc(d.id)}">${t}</button>`;
    return `<div class="agqbar" role="group" aria-label="Status da demonstração">${d.data <= hoje() ? b('realizada', 'Realizada') : ''}${b('reagendar', 'Reagendada')}${b('cancelar', 'Cancelada')}</div>`;
  }
  function itemHtml(x, largo) {
    const l = x.l, dono = admin && l.vendedor ? `<small class="agdono">${esc(l.vendedor)}</small>` : '';
    if (x.k === 'prox') {
      const atras = x.data < hoje(), c0 = contatosDe(l)[0] || {};
      return `<div class="agwrap prox"><button type="button" class="agit prox${atras ? ' atras' : ''}" data-lead="${esc(l.id)}">
        <span class="aghora">${atras ? 'Atrasado · ' + fmtDC(x.data) : 'Próximo contato'}</span><b>${esc(l.empresa || '(sem nome)')}</b>${cidAg(l)}
        ${largo && (c0.nome || c0.fone) ? `<small>${esc([c0.nome, c0.fone].filter(Boolean).join(' · '))}</small>` : ''}${dono}</button>
        <div class="agqbar" role="group" aria-label="Próximo contato"><button type="button" class="agq" data-qprox="reagendar" data-lead="${esc(l.id)}">Reagendar</button><button type="button" class="agq agq-realizada" data-qprox="feito" data-lead="${esc(l.id)}">Feito</button></div></div>`;
    }
    const d = x.d, on = d.formato !== 'presencial', parts = (d.participantes || []).filter(Boolean), st = stVis(d);
    const nova = st === 'remarcada' && d.remarcadaPara ? (l.demos || []).find(y => y.id === d.remarcadaPara) : null;
    return `<div class="agwrap st-${st}"><button type="button" class="agit demo st-${st}${x.data < hoje() && !semResultado(d) ? ' passou' : ''}" data-lead="${esc(l.id)}" data-demo="${esc(d.id)}">
      <span class="aghora">${esc(d.hora)} – ${esc(fimDe(d))}</span><b>${esc(l.empresa || '(sem nome)')}</b>${cidAg(l)}${pillSt(d)}
      ${nova ? `<small class="agnova">Nova data: ${esc(fmtDC(nova.data))} às ${esc(nova.hora)}</small>` : ''}
      ${largo ? planoReal(l, d).map(t => `<small class="agplano">${esc(t)}</small>`).join('') : ''}
      <small class="agfmt">${on ? IC.video + 'Online' : IC.pin + 'Presencial'} · ${durTxt(Number(d.dur) || 60)}</small>
      ${largo && parts.length ? `<small>Com ${esc(parts.join(', '))}</small>` : ''}
      ${largo && !on && d.local ? `<small>${esc(d.local)}</small>` : ''}${dono}</button>${barraSt(l, d)}</div>`;
  }

  /* ---------- Telas ---------- */
  function desenhar() {
    if (!$('viewAgenda') || !perfil) return;
    montarFiltro();
    document.querySelectorAll('#agModo button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.modo === modo)));
    $('agProxChk').checked = verProx;
    const todos = [...demos(), ...lembretes()], h = hoje();
    const futuras = todos.filter(x => x.k === 'demo' && x.data >= h && aberta(x.d)).length, pend = todos.filter(x => x.k === 'demo' && semResultado(x.d)).length;
    $('agCount').textContent = pronto ? `${futuras} demonstraç${futuras === 1 ? 'ão agendada' : 'ões agendadas'}${pend ? ` · ${pend} sem resultado` : ''}` : '';
    $('agNavBox').hidden = modo === 'prox';
    if (!pronto) { $('agArea').innerHTML = '<p class="hint">Carregando a agenda…</p>'; return; }
    if (modo === 'semana') semana(todos); else if (modo === 'dia') dia(todos); else proximas(todos);
    avisos(); telaHoje();
  }

  /* ---------- Sino e tela Hoje (fase 3) ---------- */
  // Avisos do sino, montados a partir das demos (sem gravar nada). Só as demos que a própria pessoa apresenta (dona do lead):
  //   agendada por outra pessoa (ex.: ADM marcou no lead dela), lembrete no dia e "registrar resultado" depois do horário.
  const tsDe = (data, hora) => { const [y, m, d] = data.split('-').map(Number), [hh, mm] = String(hora || '0:0').split(':').map(Number); return new Date(y, m - 1, d, hh || 0, mm || 0).getTime(); };
  const msDe = v => v && v.toMillis ? v.toMillis() : v && v.seconds ? v.seconds * 1000 : v ? Date.parse(v) || 0 : 0;
  function avisos() {
    if (!window.shotgunAvisos || !perfil) return;
    const h = hoje(), out = [], lim = soma(h, -7);
    leads.filter(l => l.owner === perfil.uid).forEach(l => (Array.isArray(l.demos) ? l.demos : []).forEach(d => {
      if (!d || !d.data) return;
      const nome = (l.empresa || '(sem nome)') + (window.sgCidadeUf && window.sgCidadeUf(l) ? ' · ' + window.sgCidadeUf(l) : ''), fmt = (d.formato === 'presencial' ? 'Presencial' : 'Online') + ' · ' + durTxt(Number(d.dur) || 60), abrirDemo = () => { const t = $('tabAgenda'); if (t) t.click(); form(l.id, d.id, {}); };
      if (aberta(d) && d.data >= h && d.porUid && d.porUid !== perfil.uid)
        out.push({ id: 'dag:' + d.id, titulo: `Demonstração agendada para você: ${nome}`, texto: `${quando(d)} · ${fmt}${d.por ? '\nAgendada por ' + d.por : ''}`, setor: 'agenda', t: msDe(d.criado), abrir: abrirDemo });
      if (aberta(d) && d.data === h && !semResultado(d))
        out.push({ id: 'dhj:' + d.id, titulo: `Demonstração hoje às ${d.hora}: ${nome}`, texto: [fmt, (d.participantes || []).length ? 'Com ' + d.participantes.join(', ') : '', d.formato === 'presencial' ? d.local : d.link].filter(Boolean).join('\n'), setor: 'agenda', t: tsDe(h, '00:00'), abrir: abrirDemo });
      if (semResultado(d) && d.data >= lim)
        out.push({ id: 'dres:' + d.id, titulo: `Como foi a demonstração? ${nome}`, texto: `${quando(d)} · Toque para registrar o resultado.`, setor: 'agenda', t: tsDe(d.data, d.hora) + (Number(d.dur) || 60) * 6e4, abrir: abrirDemo });
    }));
    window.shotgunAvisos('agenda', out);
  }
  // Cidade / UF ao lado do nome do cliente (some quando o cadastro não tem cidade)
  const cidHtml = x => { const c = window.sgCidadeUf ? window.sgCidadeUf(x) : ''; return c ? ` <span class="hcid">· ${esc(c)}</span>` : ''; };
  // Tela Hoje: as demos de hoje (e as que ficaram sem resultado) no topo. O ADM vê as de todos, ou só as dele em "Só as minhas".
  function telaHoje() {
    const sec = $('hAgSec'); if (!sec || !perfil) return;
    const h = hoje(), minhas = !admin || ($('hMinhas') && $('hMinhas').checked);
    const its = [];
    leads.filter(l => !minhas || l.owner === perfil.uid).forEach(l => (Array.isArray(l.demos) ? l.demos : []).forEach(d => {
      if (d && d.data && ((d.data === h && naAgenda(d) && stDe(d) !== 'naocompareceu') || (semResultado(d) && d.data >= soma(h, -7)))) its.push({ l, d });
    }));
    its.sort((a, b) => (semResultado(b.d) - semResultado(a.d)) || (a.d.data + a.d.hora).localeCompare(b.d.data + b.d.hora));
    sec.hidden = !its.length;
    const pend = its.filter(x => semResultado(x.d)).length;
    $('hAgCount').textContent = its.length ? `${its.length - pend} hoje${pend ? ` · ${pend} sem resultado` : ''}` : '';
    $('hAgList').innerHTML = its.map(({ l, d }) => {
      const p = semResultado(d), ok = stDe(d) === 'realizada', stTxt = p ? 'Atrasada · sem resultado' : ok ? 'Realizada · ' + (RES[d.resultado] || '') : emAndamento(d) ? 'Em andamento' : ST[stDe(d)];
      return `<div class="hitem${p ? ' agpend' : ok ? ' agok' : ''}"><span class="n agn">${d.data === h ? esc(d.hora) : fmtDC(d.data)}</span>
        <div><b>Demonstração · ${esc(l.empresa || '(sem nome)')}${cidHtml(l)}</b><small>${esc([(d.formato === 'presencial' ? 'Presencial' : 'Online') + ' · ' + durTxt(Number(d.dur) || 60), (d.participantes || []).length ? 'com ' + d.participantes.join(', ') : '', admin && l.owner !== perfil.uid ? l.vendedor : ''].filter(Boolean).join(' · '))}</small>
          <span class="hagst"><span class="agst st-${stVis(d)}">${esc(stTxt)}</span>${planoReal(l, d).map(t => `<small class="agplano">${esc(t)}</small>`).join('')}</span></div>
        <button type="button"${p ? ' class="primary"' : ''} data-hdemo="${esc(d.id)}" data-hlead="${esc(l.id)}">${p ? 'Registrar resultado' : 'Abrir'}</button></div>`;
    }).join('');
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
    const d = d0 ? { ...d0 } : opts.rascunho ? { ...opts.rascunho, data: opts.remarca ? (opts.rascunho.data || '') : opts.rascunho.data >= h ? opts.rascunho.data : data, participantes: opts.remarca ? opts.rascunho.participantes || [] : [] } : { data, hora: data === h ? proxHora : '09:00', dur: 60, formato: 'online', link: '', local: '', participantes: [], obs: '' };
    atual = { leadId: l ? l.id : '', demo: d, editando: !!d0, volta: opts.volta || '', remarca: opts.remarca || '' };
    abrirDlg(d0 ? 'Demonstração' : opts.remarca ? 'Reagendar demonstração' : 'Agendar demonstração', `
      <div class="agform" id="agForm">
        <section class="crmbloco"><h4>Lead <em class="agreq">obrigatório</em></h4><div id="agLeadBox"></div></section>
        ${d0 ? andamentoHtml(d0) : ''}
        <section class="crmbloco"><h4>${opts.remarca ? 'Nova data <em class="agreq">obrigatório</em>' : 'Quando'}</h4>
          ${opts.remarca ? (() => { const v = l && (l.demos || []).find(x => x.id === opts.remarca); return v ? `<p class="agstinfo">Estava marcada para ${esc(diaSemana(v.data))}, ${esc(quando(v))}. Informe a nova data e hora: o resto é repetido da demonstração original.</p>` : ''; })() : ''}
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
          <div id="agLinkL"><label for="agLink">Link da reunião <small>opcional</small></label>
            <div class="aglink"><input id="agLink" type="url" inputmode="url" placeholder="https://meet.google.com/…" value="${esc(d.link || '')}">
              <button type="button" data-a="meetnovo" title="Abre o Google Meet numa aba nova já com uma sala criada">${IC.video}Criar sala no Meet</button>
              ${navigator.clipboard && navigator.clipboard.readText ? '<button type="button" data-a="meetcolar" title="Cola o link copiado">Colar</button>' : ''}</div>
            <small class="aglinkdica" id="agLinkDica" hidden>Na aba do Meet, copie o link da sala (ícone de copiar ou a barra de endereço) e volte aqui para colar.</small></div>
          <label id="agLocalL">Endereço<input id="agLocal" placeholder="Rua, número, bairro, cidade" value="${esc(d.local || '')}"></label>
        </section>
        <section class="crmbloco"><h4>Participantes do cliente</h4><div id="agPartBox"></div></section>
        <section class="crmbloco"><h4>O que mostrar</h4>
          <label class="full">Pontos de interesse e observações<span class="ditado"><textarea id="agObs" rows="3" maxlength="1500" placeholder="Ex.: quer ver o PDV, o TEF e a conciliação de cartões">${esc(d.obs || '')}</textarea>${window.crmMicBtn ? window.crmMicBtn() : ''}</span><small class="ditst" hidden></small></label>
        </section>
        <p class="hint agquem" id="agQuem"></p>
      </div>
      <div class="tools crmacts">
        <button type="button" class="primary" data-a="salvar">${d0 ? 'Salvar' : opts.remarca ? 'Reagendar' : 'Agendar'}</button>
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
      box.innerHTML = `<div class="aglead"><span><b>${esc(l.empresa || '(sem nome)')}</b><small>${esc([window.sgCidadeUf ? window.sgCidadeUf(l) : l.cidade, c0.nome, l.origem].filter(Boolean).join(' · '))}</small></span>
        <span class="aglacts"><button type="button" class="linkbtn" data-a="verlead">Abrir lead</button>${atual.editando || atual.remarca ? '' : '<button type="button" class="linkbtn" data-a="trocar">Trocar</button>'}</span></div>`;
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
    box.innerHTML = lista.length ? (q ? '' : '<small class="agrestit">Leads mais recentes</small>') + lista.map(l => `<button type="button" class="agresit" data-pick="${esc(l.id)}"><b>${esc(l.empresa || '(sem nome)')}</b><small>${esc([window.sgCidadeUf ? window.sgCidadeUf(l) : l.cidade, l.contato, admin && l.vendedor].filter(Boolean).join(' · '))}</small></button>`).join('')
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
      if (!naAgenda(d) || stDe(d) === 'naocompareceu' || d.data !== data || (x.id === l.id && (d.id === atual.demo.id || d.id === atual.remarca))) return;
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
    if (!d.data || !d.hora) { dmsg(atual.remarca ? 'Informe a nova data e a nova hora da demonstração.' : 'Preencha a data e a hora.'); (d.data ? $('agHora') : $('agData')).focus(); return; }
    if (atual.remarca) { const v = (l.demos || []).find(x => x.id === atual.remarca); if (v && v.data === d.data && v.hora === d.hora) { dmsg('A nova data e hora são iguais às da demonstração original. Escolha outro horário.'); $('agData').focus(); return; } }
    if (!atual.editando && d.data < hoje()) { dmsg('Escolha uma data de hoje em diante.'); $('agData').focus(); return; }
    if (d.link && !/^https?:\/\//i.test(d.link)) d.link = 'https://' + d.link;
    const conf = $('agConf');
    if (conflitos().length && conf.dataset.ok !== '1') { conf.dataset.ok = '1'; btn.textContent = atual.editando ? 'Salvar mesmo assim' : 'Agendar mesmo assim'; dmsg('Há choque de horário. Toque de novo para salvar assim mesmo.'); return; }
    const agoraIso = new Date().toISOString();
    if (!d.id) Object.assign(d, { id: 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), status: 'agendada', criado: agoraIso, por: quem(), porUid: perfil.uid });
    else Object.assign(d, { alterado: agoraIso, alteradoPor: quem() });
    const extra = {};
    // Edição que muda a data ou a hora: guarda o primeiro horário (agOrig) e anota no histórico do lead
    if (atual.editando && !atual.remarca) {
      const velha = (l.demos || []).find(x => x.id === d.id);
      if (velha && (velha.data !== d.data || velha.hora !== d.hora)) {
        const o = velha.agOrig || { data: velha.data, hora: velha.hora };
        if (o.data === d.data && o.hora === d.hora) delete d.agOrig; else d.agOrig = o;
        extra.notas = F.arrayUnion(nota(`Horário da demonstração alterado de ${quando(velha)} para ${quando(d)}.`, d));
      }
    }
    let lista = (l.demos || []).filter(x => x.id !== d.id).concat([d]);
    if (atual.remarca) {
      const velha = lista.find(x => x.id === atual.remarca);
      if (velha) {
        lista = lista.map(x => x.id === velha.id ? { ...x, status: 'remarcada', remarcadaPara: d.id, statusEm: agoraIso, statusPor: quem() } : x);
        extra.notas = F.arrayUnion(nota(`Demonstração reagendada de ${fmtD(velha.data)} às ${velha.hora} para ${fmtD(d.data)} às ${d.hora}.`, d));
      }
    }
    lista.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    btn.disabled = true; dmsg('Salvando…');
    try {
      await F.updateDoc(F.doc(db, 'crm', l.id), { demos: lista, ...extra, alterado: F.serverTimestamp(), alteradoPor: quem() });
      l.demos = lista;
      const volta = atual.volta, novo = !atual.editando, remarcou = !!atual.remarca;
      if (novo || remarcou) { ref = d.data; desenhar(); msgTela(`${remarcou ? 'Demonstração reagendada' : 'Demonstração agendada'}: ${l.empresa || ''}, ${fmtD(d.data)} às ${d.hora}.`); telaAgendada(l, d, remarcou ? 'Demonstração reagendada' : 'Demonstração agendada'); return; }
      fechar();
      msgTela(`${atual && atual.remarca ? 'Demonstração reagendada' : novo ? 'Demonstração agendada' : 'Demonstração salva'}: ${l.empresa || ''}, ${fmtD(d.data)} às ${d.hora}.`);
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

  /* ---------- Próximo contato: reagendar ou marcar como feito pelo card ---------- */
  function telaProx(leadId, acao) {
    const l = leads.find(x => x.id === leadId); if (!l) return;
    atual = { leadId: l.id, demo: {}, editando: false, volta: '', remarca: '' };
    const feito = acao === 'feito';
    abrirDlg(feito ? 'Próximo contato feito' : 'Reagendar próximo contato', `
      <p class="agsub"><b>${esc(l.empresa || '')}</b> · estava para ${esc(fmtD(l.prox))}</p>
      <div class="agform"><section class="crmbloco"><h4>${feito ? 'Como foi' : 'Nova data <em class="agreq">obrigatório</em>'}</h4>
        ${feito ? '' : `<label>Nova data do próximo contato<input type="date" id="agProxData" min="${hoje()}" value="" required></label>`}
        <label>Anotação <small>opcional, vai para o histórico do lead</small><input id="agProxObs" maxlength="500" placeholder="${feito ? 'Ex.: liguei, pediu proposta' : 'Ex.: pediu para ligar na semana que vem'}"></label>
        ${feito ? `<label>Marcar outro próximo contato <small>opcional</small><input type="date" id="agProxData" min="${hoje()}" value=""></label>` : ''}
      </section></div>
      <div class="tools crmacts"><button type="button" class="primary" data-a="salvarprox" data-acao="${feito ? 'feito' : 'reagendar'}">Salvar</button><button type="button" data-a="pronto">Fechar</button></div>`, 'prox');
    setTimeout(() => { const i = $(feito ? 'agProxObs' : 'agProxData'); if (i) i.focus(); }, 60);
  }
  async function salvarProx(btn) {
    const l = leadAtual(); if (!l) return;
    const feito = btn.dataset.acao === 'feito', nova = ($('agProxData') || {}).value || '', obs = $('agProxObs').value.trim();
    if (!feito && !nova) { dmsg('Informe a nova data do próximo contato.'); $('agProxData').focus(); return; }
    if (nova && nova < hoje()) { dmsg('Escolha uma data de hoje em diante.'); $('agProxData').focus(); return; }
    const texto = feito ? `Próximo contato de ${fmtD(l.prox)} feito.${obs ? ' ' + obs : ''}${nova ? ' Próximo: ' + fmtD(nova) + '.' : ''}` : `Próximo contato reagendado de ${fmtD(l.prox)} para ${fmtD(nova)}.${obs ? ' ' + obs : ''}`;
    btn.disabled = true; dmsg('Salvando…');
    try {
      await F.updateDoc(F.doc(db, 'crm', l.id), { prox: nova, notas: F.arrayUnion({ tipo: 'Anotação', texto, em: new Date().toISOString(), por: quem() }), alterado: F.serverTimestamp(), alteradoPor: quem() });
      l.prox = nova; fechar(); desenhar();
      msgTela(nova ? `Próximo contato de ${l.empresa || ''}: ${fmtD(nova)}.` : `Próximo contato de ${l.empresa || ''} marcado como feito.`);
    } catch (e) { dmsg('Não foi possível salvar (' + (e.code || e.message) + ').'); btn.disabled = false; }
  }

  /* ---------- Reagendar e atalhos de status ---------- */
  // Reagendar: abre uma demo nova com tudo igual à original (lead, formato, link ou endereço, duração, participantes e observações),
  // mas com a data e a hora em branco: a pessoa é obrigada a informar o novo horário. A original fica como Reagendada.
  function reagendar(leadId, d, volta) {
    form(leadId, '', { volta: volta || '', remarca: d.id, rascunho: { data: '', hora: '', dur: d.dur, formato: d.formato, link: d.link || '', local: d.local || '', participantes: d.participantes || [], obs: d.obs || '' } });
    setTimeout(() => { const i = $('agData'); if (i) i.focus(); }, 60);
  }
  function statusRapido(a, leadId, demoId) {
    const l = leads.find(x => x.id === leadId), d = l && (l.demos || []).find(x => x.id === demoId); if (!d) return;
    if (a === 'reagendar') { reagendar(l.id, d, ''); return; }
    form(l.id, d.id, {});
    if (a === 'realizada') { lerDlgSeguro(); telaResultado(); }
    else if (a === 'cancelar') { const b = document.querySelector('#agDlg .agacoes [data-a=cancelar]'); if (b) { mudarStatus(b, 'cancelar'); b.scrollIntoView({ block: 'center' }); } }
  }

  /* ---------- Andamento (fase 2) ---------- */
  function andamentoHtml(d) {
    const st = stDe(d), passou = d.data <= hoje(), l = leadAtual();
    let corpo = '';
    const pr = planoReal(l, d).map(t => `<p class="agstinfo agplano">${esc(t)}</p>`).join('');
    if (st === 'realizada') corpo = `<p class="agstinfo">Realizada${d.feitaEm ? ' em ' + fmtD(d.feitaEm.slice(0, 10)) : ''}${d.statusPor ? ' · ' + esc(d.statusPor) : ''}. Resultado: <b>${esc(RES[d.resultado] || 'não informado')}</b>.</p>${d.resultadoObs ? `<p class="agstobs">${esc(d.resultadoObs)}</p>` : ''}${d.resultado !== 'sem' && l && !l._temProp && window.crmGerarProposta ? '<div class="agacoes"><button type="button" class="primary" data-a="gerarprop">Gerar proposta</button></div>' : ''}`;
    else if (st === 'naocompareceu') corpo = `<p class="agstinfo">O cliente não compareceu.</p><div class="agacoes"><button type="button" class="primary" data-a="remarcar">Reagendar</button></div>`;
    else if (st === 'cancelada') corpo = `<p class="agstinfo">Cancelada${d.motivoCanc ? ': ' + esc(d.motivoCanc) : ''}.</p>`;
    else if (st === 'remarcada') corpo = (() => { const n = d.remarcadaPara && l ? (l.demos || []).find(x => x.id === d.remarcadaPara) : null; return `<p class="agstinfo">Reagendada${n ? ' para ' + esc(quando(n)) : ' para outra data'}.${n ? ' <button type="button" class="linkbtn" data-a="vernova">Ver a nova</button>' : ''}</p>`; })();
    else corpo = `${semResultado(d) ? '<p class="agstinfo pend">Atrasada: o horário já passou e o resultado não foi registrado. Como foi a demonstração?</p>' : emAndamento(d) ? `<p class="agstinfo">Em andamento: marcada das ${esc(d.hora)} às ${esc(fimDe(d))}.</p>` : ''}<div class="agacoes">
        ${passou ? '<button type="button" class="primary" data-a="realizada">Realizada</button><button type="button" data-a="naocomp">Não compareceu</button>' : ''}
        ${st === 'agendada' && !semResultado(d) ? '<button type="button"' + (passou ? '' : ' class="primary"') + ' data-a="confirmar">Cliente confirmou</button>' : ''}
        <button type="button" data-a="remarcar">Reagendar</button><button type="button" data-a="cancelar">Cancelar demonstração</button></div>
        ${l && !semResultado(d) ? botoesCliente(l, d) : ''}`;
    return `<section class="crmbloco"><h4>Andamento ${pillSt(d)}</h4>${pr}${corpo}</section>`;
  }
  // Nota para o histórico do lead (mesmo formato das anotações do CRM)
  const nota = (texto, d) => ({ tipo: 'Reunião', texto, ...((d && (d.participantes || [])[0]) ? { contato: d.participantes[0] } : {}), em: new Date().toISOString(), por: quem() });
  const quando = d => `${fmtD(d.data)} às ${d.hora}`;
  // Grava a mudança de status na demo (e o que mais vier junto no lead)
  async function gravarStatus(l, id, campos, extra) {
    const agora = new Date().toISOString();
    const lista = (l.demos || []).map(x => x.id === id ? { ...x, ...campos, statusEm: agora, statusPor: quem() } : x);
    await F.updateDoc(F.doc(db, 'crm', l.id), { demos: lista, ...(extra || {}), alterado: F.serverTimestamp(), alteradoPor: quem() });
    l.demos = lista;
    return lista.find(x => x.id === id);
  }
  function telaResultado() {
    const d = atual.demo, l = leadAtual();
    abrirDlg('Como foi a demonstração?', `
      <p class="agsub"><b>${esc(l.empresa || '')}</b> · ${esc(quando(d))}</p>
      <div class="agform">
        <section class="crmbloco"><h4>Resultado</h4>
          <div class="agfmtsel ag3" role="radiogroup" aria-label="Resultado">
            ${Object.entries(RES).map(([k, t], i) => `<label class="agopt"><input type="radio" name="agRes" value="${k}"${i === 0 ? ' checked' : ''}><span><b>${t}</b><small>${k === 'proposta' ? 'Gerar a proposta agora' : k === 'pensar' ? 'Marcar o próximo contato' : 'Lead vai para Perdido'}</small></span></label>`).join('')}
          </div>
          <label id="agResProxL" hidden>Próximo contato<input type="date" id="agResProx" min="${hoje()}" value="${soma(hoje(), 3)}"></label>
          <label id="agResMotL" hidden>Motivo<select id="agResMot">${MOTIVOS.map(m => `<option${m === 'Sem interesse no momento' ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
        </section>
        <section class="crmbloco"><h4>Horário real</h4>
          <p class="hint">Estava marcada para ${esc(d.hora)} (${esc(durTxt(Number(d.dur) || 60))}). Ajuste se começou em outro horário ou durou mais ou menos.</p>
          <div class="tkform agquando">
            <label>Começou às<input type="time" id="agResHora" step="300" value="${esc(d.horaReal || d.hora)}" required></label>
            <label>Duração<select id="agResDur">${(() => { const v = Number(d.durReal || d.dur) || 60; return DURS.concat(DURS.includes(v) ? [] : [v]).sort((a, b) => a - b).map(m => `<option value="${m}"${m === v ? ' selected' : ''}>${durTxt(m)}</option>`).join(''); })()}</select></label>
          </div>
        </section>
        <section class="crmbloco"><h4>Como foi</h4>
          <label class="full">Anotação <small>opcional, vai para o histórico do lead</small><span class="ditado"><textarea id="agResObs" rows="3" maxlength="1500" placeholder="Ex.: gostou do PDV e da conciliação, quer ver preço do TEF">${esc(d.resultadoObs || '')}</textarea>${window.crmMicBtn ? window.crmMicBtn() : ''}</span><small class="ditst" hidden></small></label>
        </section>
        ${l._temProp ? '<p class="hint">Este lead já tem proposta: a etapa no funil segue a proposta.</p>' : ''}
      </div>
      <div class="tools crmacts"><button type="button" class="primary" data-a="registrar">Registrar</button><button type="button" data-a="voltar">Voltar</button></div>`, 'resultado');
    resOpcoes();
  }
  function resOpcoes() {
    const v = (document.querySelector('input[name=agRes]:checked') || {}).value;
    $('agResProxL').hidden = v !== 'pensar'; $('agResMotL').hidden = v !== 'sem';
  }
  async function registrar(btn) {
    const l = leadAtual(), d = atual.demo, res = (document.querySelector('input[name=agRes]:checked') || {}).value || 'proposta';
    const obs = $('agResObs').value.trim(), prox = $('agResProx').value, mot = $('agResMot').value;
    const horaReal = $('agResHora').value, durReal = Number($('agResDur').value) || Number(d.dur) || 60;
    if (!horaReal) { dmsg('Informe a hora em que a demonstração começou.'); $('agResHora').focus(); return; }
    if (res === 'pensar' && !prox) { dmsg('Escolha a data do próximo contato.'); $('agResProx').focus(); return; }
    const realTxt = horaReal !== d.hora ? ` Começou às ${horaReal} (${atrasoTxt(d.hora, horaReal)}).` : '';
    const durTxtNota = durReal !== (Number(d.dur) || 60) ? ` Durou ${durTxt(durReal)}.` : '';
    const extra = { notas: F.arrayUnion(nota(`Demonstração de ${quando(d)} realizada.${realTxt}${durTxtNota} Resultado: ${RES[res].toLowerCase()}.${obs ? ' ' + obs : ''}`, d)) };
    // Funil: só mexe no lead que ainda não virou proposta
    if (!l._temProp) {
      if (res === 'sem') Object.assign(extra, { etapa: 'perdido', motivo: mot || 'Sem interesse no momento' });
      else if (l.etapa !== 'qualificado') Object.assign(extra, { etapa: 'qualificado', motivo: '' });
    }
    if (res === 'pensar') extra.prox = prox;
    btn.disabled = true; dmsg('Registrando…');
    try {
      const nd = await gravarStatus(l, d.id, { status: 'realizada', resultado: res, resultadoObs: obs, feitaEm: new Date().toISOString(), horaReal, durReal }, extra);
      atual.demo = { ...nd };
      if (res === 'proposta' && !l._temProp && window.crmGerarProposta) {
        abrirDlg('Demonstração registrada', `<p class="agsub">Anotada no histórico de <b>${esc(l.empresa || '')}</b>${extra.etapa ? ', que foi para Qualificado no funil' : ''}.</p>
          <div class="tools crmacts"><button type="button" class="primary" data-a="gerarprop">Gerar proposta agora</button><button type="button" data-a="cancelar">Depois</button></div>`, 'feito');
      } else {
        const v = atual.volta; fechar();
        msgTela(`Demonstração registrada: ${l.empresa || ''}. ${res === 'sem' ? (l._temProp ? '' : 'O lead foi para Perdido.') : res === 'pensar' ? 'Próximo contato em ' + fmtD(prox) + '.' : ''}`.trim());
        if (v === 'lead' && window.crmAbrirLead) window.crmAbrirLead(l.id); else desenhar();
      }
    } catch (e) { dmsg('Não foi possível registrar (' + (e.code || e.message) + ').'); }
    finally { btn.disabled = false; }
  }
  async function mudarStatus(btn, a) {
    const l = leadAtual(), d = atual.demo; if (!l) return;
    if (a === 'cancelar' && !$('agCancMot')) {
      btn.insertAdjacentHTML('afterend', '<label class="agcanc">Motivo do cancelamento <small>opcional</small><input id="agCancMot" maxlength="200" placeholder="Ex.: cliente pediu para adiar"></label>');
      btn.textContent = 'Confirmar cancelamento'; btn.classList.add('danger'); $('agCancMot').focus(); return;
    }
    if (a === 'naocomp' && btn.dataset.confirma !== '1') { btn.dataset.confirma = '1'; btn.textContent = 'Confirmar: não compareceu'; dmsg('Toque de novo para confirmar.'); return; }
    const campos = a === 'confirmar' ? { status: 'confirmada' } : a === 'naocomp' ? { status: 'naocompareceu' } : { status: 'cancelada', motivoCanc: ($('agCancMot') || {}).value?.trim() || '' };
    const texto = a === 'confirmar' ? `Cliente confirmou a demonstração de ${quando(d)}.` : a === 'naocomp' ? `Cliente não compareceu à demonstração de ${quando(d)}.` : `Demonstração de ${quando(d)} cancelada${campos.motivoCanc ? ': ' + campos.motivoCanc : ''}.`;
    btn.disabled = true; dmsg('Salvando…');
    try {
      await gravarStatus(l, d.id, campos, { notas: F.arrayUnion(nota(texto, d)) });
      if (a === 'naocomp') { form(l.id, d.id, { volta: atual.volta }); dmsg('Anotado no histórico do lead. Se quiser, remarque.'); return; }
      const v = atual.volta; fechar();
      msgTela(a === 'confirmar' ? `Confirmada: ${l.empresa || ''}, ${quando(d)}.` : `Demonstração cancelada: ${l.empresa || ''}.`);
      if (v === 'lead' && window.crmAbrirLead) window.crmAbrirLead(l.id); else desenhar();
    } catch (e) { dmsg('Não foi possível salvar (' + (e.code || e.message) + ').'); btn.disabled = false; }
  }

  /* ---------- WhatsApp e Google Agenda (fase 4) ---------- */
  // As mensagens para o cliente seguem a marca das outras mensagens do app ao cliente (assinatura "- Argo").
  const waNum = v => { const d = dig(v); return d.length >= 10 && d.length <= 11 ? '55' + d : d; };
  const primeiro = n => String(n || '').trim().split(/\s+/)[0] || '';
  // Contato para o WhatsApp: o primeiro participante com telefone; se não houver, o primeiro contato do lead com telefone
  function contatoWa(l, d) {
    const cs = contatosDe(l).filter(c => dig(c.fone).length >= 10);
    return cs.find(c => (d.participantes || []).includes(String(c.nome || '').trim())) || cs[0] || null;
  }
  const diaSemana = s => SEM[dt(s).getDay()];
  function textoWa(l, d, c) {
    const onde = d.formato === 'presencial' ? `presencial${d.local ? ', em ' + d.local : ''}` : `online${d.link ? '.\n\nLink da reunião: ' + d.link : ', pelo link que envio antes do horário'}`;
    return `Olá${c && c.nome ? ' ' + primeiro(c.nome) : ''}! Confirmando a demonstração do sistema para ${l.empresa || 'o posto'}: ${diaSemana(d.data)}, ${fmtDC(d.data)}, às ${d.hora} (duração de ${durTxt(Number(d.dur) || 60)}), ${onde}${d.formato === 'presencial' || !d.link ? '.' : ''}\n\nPode confirmar se o horário continua bom?\n\n${(l.vendedor || quem())} - Argo`;
  }
  function linkGoogle(l, d) {
    const ini = d.data.replace(/-/g, '') + 'T' + d.hora.replace(':', '') + '00';
    const fimM = min(d.hora) + (Number(d.dur) || 60), fimData = fimM >= 1440 ? soma(d.data, 1) : d.data;
    const fim = fimData.replace(/-/g, '') + 'T' + hhmm(fimM % 1440).replace(':', '') + '00';
    const cs = contatosDe(l), parts = (d.participantes || []);
    const emails = cs.filter(c => parts.includes(String(c.nome || '').trim()) && /@/.test(c.email || '')).map(c => c.email.trim());
    const det = [`Demonstração do sistema para ${l.empresa || ''}.`, parts.length ? 'Participantes: ' + parts.join(', ') : '', d.formato === 'presencial' ? '' : d.link ? 'Link: ' + d.link : '', d.obs ? 'O que mostrar: ' + d.obs : ''].filter(Boolean).join('\n');
    let tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    const q = new URLSearchParams({ action: 'TEMPLATE', text: `Demonstração · ${l.empresa || ''}`, dates: ini + '/' + fim, details: det, location: d.formato === 'presencial' ? (d.local || l.cidade || '') : (d.link || 'Online') });
    if (tz) q.set('ctz', tz);
    if (emails.length) q.set('add', emails.join(','));
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }
  function botoesCliente(l, d) {
    const c = contatoWa(l, d);
    return `<div class="agacoes agcli">
      ${c ? `<button type="button" class="agwa" data-a="whats" title="Abre o WhatsApp com a mensagem pronta para ${esc(c.nome || 'o contato')}">${IC.whats}Confirmar pelo WhatsApp${c.nome ? ' com ' + esc(primeiro(c.nome)) : ''}</button>` : '<span class="hint">Cadastre o WhatsApp de um contato no lead para confirmar por mensagem.</span>'}
      <a class="agg" href="${esc(linkGoogle(l, d))}" target="_blank" rel="noopener">${IC.cal}Adicionar ao Google Agenda</a></div>`;
  }
  function abrirWhats(l, d) {
    const c = contatoWa(l, d); if (!c) return;
    const url = 'https://wa.me/' + waNum(c.fone) + '?text=' + encodeURIComponent(textoWa(l, d, c));
    window.open(url, '_blank', 'noopener') || (location.href = url);
    // Fica no histórico do lead (não bloqueia a abertura do WhatsApp)
    F.updateDoc(F.doc(db, 'crm', l.id), { notas: F.arrayUnion(nota(`Confirmação da demonstração de ${quando(d)} enviada pelo WhatsApp para ${c.nome || waNum(c.fone)}.`, d)), alterado: F.serverTimestamp() }).catch(() => {});
  }
  // Depois de agendar ou remarcar: oferece confirmar com o cliente e pôr na agenda do Google
  function telaAgendada(l, d, titulo) {
    atual = { leadId: l.id, demo: { ...d }, editando: true, volta: atual ? atual.volta : '', remarca: '' };
    abrirDlg(titulo, `<p class="agsub"><b>${esc(l.empresa || '')}</b> · ${esc(diaSemana(d.data))}, ${esc(quando(d))} · ${d.formato === 'presencial' ? 'Presencial' : 'Online'}</p>
      <section class="crmbloco"><h4>Avisar o cliente</h4>${botoesCliente(l, d)}</section>
      <div class="tools crmacts"><button type="button" class="primary" data-a="pronto">Pronto</button></div>`, 'feito');
  }

  function msgTela(t) { const el = $('agMsg'); if (!el) return; el.textContent = t || ''; el.hidden = !t; clearTimeout(msgTela.t); if (t) msgTela.t = setTimeout(() => { el.hidden = true; }, 6000); }

  /* ---------- Para o CRM ---------- */
  // Abre o formulário a partir da ficha do lead (volta para o lead depois de salvar)
  window.agendaNova = (leadId) => form(leadId, '', { volta: 'lead' });
  window.agendaAbrir = (leadId, demoId) => form(leadId, demoId, { volta: 'lead' });
  // Próxima demonstração do lead (para o card do funil e a ficha)
  window.agendaProxima = l => (Array.isArray(l?.demos) ? l.demos : []).filter(d => aberta(d) && d.data >= hoje()).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))[0] || null;
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
      const qp = e.target.closest('[data-qprox]');
      if (qp) { telaProx(qp.dataset.lead, qp.dataset.qprox); return; }
      const q = e.target.closest('[data-qst]');
      if (q) { statusRapido(q.dataset.qst, q.dataset.lead, q.dataset.demo); return; }
      const it = e.target.closest('[data-lead]'); if (!it) return;
      if (it.dataset.demo) form(it.dataset.lead, it.dataset.demo, {});
      else if (window.crmAbrirLead) window.crmAbrirLead(it.dataset.lead);
    });
    $('agDlgFechar').addEventListener('click', fechar);
    if ($('hAgList')) $('hAgList').addEventListener('click', e => { const b = e.target.closest('[data-hdemo]'); if (!b) return; const l = leads.find(x => x.id === b.dataset.hlead), d = l && (l.demos || []).find(x => x.id === b.dataset.hdemo); if (!d) return; form(l.id, d.id, {}); if (semResultado(d)) { lerDlgSeguro(); telaResultado(); } });
    if ($('hMinhas')) $('hMinhas').addEventListener('change', telaHoje);
    // Vira o dia ou passa o horário de uma demo com o app aberto: atualiza avisos, Hoje e a agenda
    setInterval(() => { if (pronto) desenhar(); }, 5 * 60000);
    dlg().addEventListener('close', () => { if (window.crmPararDitado) window.crmPararDitado(); });
    dlg().addEventListener('input', e => { if (e.target.id === 'agLeadQ') buscar(); if (['agData', 'agHora'].includes(e.target.id)) atualizarConflito(); });
    dlg().addEventListener('change', e => { if (e.target.name === 'agRes') resOpcoes(); if (e.target.name === 'agFmt') formato(); if (['agData', 'agHora', 'agDur'].includes(e.target.id)) atualizarConflito(); });
    dlg().addEventListener('click', e => {
      const pk = e.target.closest('[data-pick]');
      if (pk) { lerDlgSeguro(); atual.leadId = pk.dataset.pick; atual.demo.participantes = []; desenharLead(); atualizarConflito(); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'ditar') { if (window.crmDitar) window.crmDitar(b); return; }
      if (window.crmPararDitado) window.crmPararDitado();
      if (a === 'salvar') salvar(b);
      else if (a === 'salvarprox') salvarProx(b);
      else if (a === 'realizada') { lerDlgSeguro(); telaResultado(); }
      else if (a === 'registrar') registrar(b);
      else if (a === 'voltar') form(atual.leadId, atual.demo.id, { volta: atual.volta });
      else if (['confirmar', 'naocomp'].includes(a) || (a === 'cancelar' && dlg().dataset.modo === 'form' && b.closest('.agacoes'))) mudarStatus(b, a);
      else if (a === 'remarcar') reagendar(atual.leadId, atual.demo, atual.volta);
      else if (a === 'vernova') form(atual.leadId, atual.demo.remarcadaPara, { volta: atual.volta });
      else if (a === 'whats') { const l = leadAtual(); if (l) abrirWhats(l, atual.demo); }
      else if (a === 'pronto') { const v = atual.volta, id = atual.leadId; fechar(); if (v === 'lead' && id && window.crmAbrirLead) window.crmAbrirLead(id); }
      else if (a === 'gerarprop') { const id = atual.leadId; fechar(); window.crmGerarProposta(id); }
      else if (a === 'cancelar') { const v = atual.volta, id = atual.leadId; fechar(); if (v === 'lead' && id && window.crmAbrirLead) window.crmAbrirLead(id, true); }
      else if (a === 'excluir') excluir(b);
      else if (a === 'trocar') { lerDlgSeguro(); atual.leadId = ''; atual.demo.participantes = []; desenharLead(); atualizarConflito(); }
      else if (a === 'meetnovo') { window.open('https://meet.google.com/new', '_blank', 'noopener'); const t = $('agLinkDica'); if (t) t.hidden = false; }
      else if (a === 'meetcolar') {
        navigator.clipboard.readText().then(txt => {
          const m = String(txt || '').match(/https?:\/\/\S+/) || (/^meet\.google\.com\/\S+/.test(String(txt).trim()) ? ['https://' + String(txt).trim()] : null);
          const t = $('agLinkDica');
          if (m) { $('agLink').value = m[0]; if (t) t.hidden = true; }
          else if (t) { t.textContent = 'Não achei um link copiado. Copie o link da sala no Meet e toque em Colar de novo.'; t.hidden = false; }
        }).catch(() => { const t = $('agLinkDica'); if (t) { t.textContent = 'O navegador não deixou colar automático. Toque no campo e cole o link.'; t.hidden = false; } $('agLink').focus(); });
      }
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

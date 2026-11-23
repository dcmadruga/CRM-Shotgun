// Central de notificações: sino no cabeçalho com contador de não lidas e a lista.
// Regra de setores (a mesma do TASK): cada pessoa vê as notificações do(s) seu(s) setor(es), as gerais (setor 'todos')
// e as enviadas só para ela (setor 'pessoal' + para = uid). O ADM vê e recebe todas, de todos os setores.
// Dados: notificacoes/{id} { titulo, texto, setor, para, aba, criado, por, porUid }
//        notifLidas/{uid}  { ate, ids }  (lidas até a data "ate", mais as lidas uma a uma em "ids")
// Pedidos de acesso: o ADM recebe um aviso automático para cada cadastro "Aguardando liberação" (lido da coleção usuarios,
// sem gravar nada); o aviso some quando a pessoa é liberada ou o cadastro é excluído. Tocar abre a tela Usuários.
// Proposta aceita: quando o cliente aprova a proposta (página de aprovação), o vendedor dono e o ADM recebem um aviso,
// montado a partir da própria proposta (status 'aprovada', últimos 30 dias), sem gravar nada. Tocar abre a proposta.
// Para criar uma notificação em qualquer parte do app: window.shotgunNotificar({ titulo, texto, setor, para, aba })
// Regras do Firestore: docs/notificacoes-firestore.rules
(() => {
  let F, db, perfil, admin = false, uid = null, unsubs = [], unsubMod = null, unsubLidas = null;
  let porQuery = {}, lidas = { ate: 0, ids: [] }, MODS = null, aberto = false;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ms = ts => ts && ts.toMillis ? ts.toMillis() : ts && ts.seconds ? ts.seconds * 1000 : typeof ts === 'number' ? ts : ts ? Date.parse(ts) || 0 : 0;
  const quando = t => {
    if (!t) return 'agora'; const s = Math.round((Date.now() - t) / 1000);
    if (s < 60) return 'agora'; if (s < 3600) return 'há ' + Math.floor(s / 60) + ' min'; if (s < 86400) return 'há ' + Math.floor(s / 3600) + ' h';
    if (s < 7 * 86400) { const d = Math.floor(s / 86400); return d === 1 ? 'ontem' : 'há ' + d + ' dias'; }
    return new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };
  const SINO = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';

  // Setores = módulos principais do TASK (mesma lista da tela Usuários)
  const setoresTop = () => ((MODS || window.MODULOS_PADRAO || {}).secoes || []).filter(m => !m.pai);
  const nomeSetor = id => id === 'todos' ? 'Todos' : id === 'pessoal' ? 'Para você' : id === 'usuarios' ? 'Usuários' : id === 'propostas' ? 'Propostas' : (setoresTop().find(m => m.id === id) || {}).titulo || id;
  const meusSetores = () => (perfil && Array.isArray(perfil.setores)) ? perfil.setores : [];
  // Quem pode ver (o Firestore aplica a mesma regra no servidor)
  const podeVer = n => admin || n.auto || n.setor === 'todos' || (n.setor === 'pessoal' && n.para === uid) || meusSetores().includes(n.setor);

  function lista() {
    const m = new Map(); Object.values(porQuery).forEach(arr => arr.forEach(n => m.set(n.id, n)));
    return [...m.values()].filter(podeVer).sort((a, b) => (b.t || Date.now()) - (a.t || Date.now())).slice(0, 60);
  }
  const lida = n => n.porUid === uid || (n.t && n.t <= lidas.ate) || lidas.ids.includes(n.id);

  function montar() {
    if ($('sgNotif')) return;
    const box = document.createElement('div'); box.className = 'sgnotif'; box.id = 'sgNotif'; box.hidden = true;
    box.innerHTML = `<button type="button" class="sgnbtn" id="sgnBtn" aria-haspopup="dialog" aria-expanded="false" aria-controls="sgnPainel" aria-label="Notificações">${SINO}<span class="sgnqtd" id="sgnQtd" hidden></span></button>
      <div class="sgnpainel" id="sgnPainel" role="dialog" aria-label="Notificações" hidden>
        <div class="sgntopo"><h3>Notificações</h3><button type="button" class="sgnlink" id="sgnLerTodas">Marcar todas como lidas</button></div>
        <p class="sgnescopo" id="sgnEscopo"></p>
        <div class="sgnlista" id="sgnLista"></div>
        <details class="sgnnova" hidden id="sgnNova"><summary>Enviar aviso</summary>
          <form id="sgnForm"><label>Para<select id="sgnSetor"></select></label>
          <label>Título<input id="sgnTitulo" maxlength="120" required></label>
          <label>Mensagem <small>opcional</small><textarea id="sgnTexto" rows="2" maxlength="500"></textarea></label>
          <div class="sgnacoes"><span class="sgnmsg" id="sgnMsg"></span><button type="submit" class="sgnenviar">Enviar</button></div></form>
        </details>
      </div>`;
    const v = $('versaoApp'); v.parentNode.insertBefore(box, v);
    $('sgnBtn').addEventListener('click', e => { e.stopPropagation(); abrir(!aberto); });
    document.addEventListener('click', e => { if (aberto && !box.contains(e.target)) abrir(false); });
    document.addEventListener('keydown', e => { if (aberto && e.key === 'Escape') { abrir(false); $('sgnBtn').focus(); } });
    $('sgnLerTodas').addEventListener('click', lerTodas);
    $('sgnLista').addEventListener('click', e => {
      const del = e.target.closest('[data-del]'); if (del) { e.stopPropagation(); apagar(del.dataset.del); return; }
      const it = e.target.closest('[data-nid]'); if (!it) return;
      const n = lista().find(x => x.id === it.dataset.nid); if (!n) return;
      if (!lida(n)) marcar(n.id);
      if (n.prop) { abrir(false); window.dispatchEvent(new CustomEvent('shotgun-abrir-proposta', { detail: { id: n.prop } })); }
      else if (n.aba && $(n.aba)) { abrir(false); $(n.aba).click(); }
    });
    $('sgnLista').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-nid]')) { e.preventDefault(); e.target.click(); } });
    $('sgnForm').addEventListener('submit', async e => {
      e.preventDefault(); const b = e.submitter || $('sgnForm').querySelector('button'); b.disabled = true; $('sgnMsg').textContent = 'Enviando…';
      try {
        await window.shotgunNotificar({ titulo: $('sgnTitulo').value, texto: $('sgnTexto').value, setor: $('sgnSetor').value });
        $('sgnTitulo').value = ''; $('sgnTexto').value = ''; $('sgnMsg').textContent = 'Enviado.'; setTimeout(() => { $('sgnMsg').textContent = ''; }, 3000);
      } catch (err) { $('sgnMsg').textContent = 'Não foi possível enviar (' + (err.code || err.message || 'erro') + ').'; }
      finally { b.disabled = false; }
    });
  }

  function abrir(on) {
    aberto = on; $('sgnPainel').hidden = !on; $('sgnBtn').setAttribute('aria-expanded', String(on));
    if (on) posicionar();
    if (on) desenhar();
  }

  // No celular o painel é fixo na tela: fica logo abaixo do sino, qualquer que seja a altura do cabeçalho
  function posicionar() {
    const p = $('sgnPainel'); p.style.top = '';
    if (!window.matchMedia('(max-width:560px)').matches) return;
    const r = $('sgnBtn').getBoundingClientRect(); p.style.top = Math.max(8, Math.round(r.bottom + 10)) + 'px';
  }
  window.addEventListener('resize', () => { if (aberto) posicionar(); });

  function desenhar() {
    if (!$('sgNotif')) return;
    const ns = lista(), nao = ns.filter(n => !lida(n)).length, q = $('sgnQtd');
    q.hidden = !nao; q.textContent = nao > 99 ? '99+' : String(nao);
    $('sgnBtn').setAttribute('aria-label', nao ? `Notificações: ${nao} não lida${nao === 1 ? '' : 's'}` : 'Notificações');
    $('sgnBtn').classList.toggle('tem', !!nao);
    if (!aberto) return;
    $('sgnLerTodas').hidden = !nao;
    const ss = meusSetores().map(nomeSetor);
    $('sgnEscopo').textContent = admin ? 'Administrador: você vê as notificações de todos os setores.' : ss.length ? 'Seu setor: ' + ss.join(', ') + '.' : 'Avisos gerais e os enviados para você.';
    $('sgnLista').innerHTML = ns.length ? ns.map(n => `<div class="sgnit${lida(n) ? '' : ' nova'}${n.aba || n.prop ? ' link' : ''}" data-nid="${esc(n.id)}" role="button" tabindex="0">
        <span class="sgnponto" aria-hidden="true"></span>
        <div class="sgncorpo"><b>${esc(n.titulo)}</b>${n.texto ? `<p>${esc(n.texto)}</p>` : ''}
          <span class="sgnmeta"><span class="sgnsetor">${esc(nomeSetor(n.setor))}</span>${esc(quando(n.t))}${n.por ? ' · ' + esc(n.por) : ''}</span></div>
        ${admin && !n.auto ? `<button type="button" class="sgndel" data-del="${esc(n.id)}" aria-label="Apagar notificação" title="Apagar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>` : ''}
      </div>`).join('') : `<div class="sgnvazio">${SINO}<b>Nenhuma notificação por aqui.</b><span>${admin ? 'Quando qualquer setor receber um aviso, ele aparece aqui.' : 'Os avisos do seu setor aparecem aqui.'}</span></div>`;
    $('sgnNova').hidden = !admin;
    if (admin) {
      const sel = $('sgnSetor'), atual = sel.value;
      sel.innerHTML = [['todos', 'Todos os setores'], ...setoresTop().map(m => [m.id, m.titulo])].map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('');
      if (atual) sel.value = atual;
    }
  }

  async function marcar(id) {
    lidas.ids = [...new Set([...lidas.ids, id])]; desenhar();
    try { await F.setDoc(F.doc(db, 'notifLidas', uid), { ids: F.arrayUnion(id) }, { merge: true }); } catch (e) { console.warn('notif', e); }
  }
  async function lerTodas() {
    lidas = { ate: Date.now(), ids: [] }; desenhar();
    try { await F.setDoc(F.doc(db, 'notifLidas', uid), { ate: F.serverTimestamp(), ids: [] }); } catch (e) { console.warn('notif', e); }
  }
  async function apagar(id) {
    if (!admin) return;
    try { await F.deleteDoc(F.doc(db, 'notificacoes', id)); } catch (e) { console.warn('notif', e); }
  }

  window.shotgunNotificar = async ({ titulo, texto = '', setor = 'todos', para = null, aba = '' } = {}) => {
    if (!F || !uid) throw new Error('sem login');
    titulo = String(titulo || '').trim().slice(0, 120); if (!titulo) throw new Error('sem título');
    const d = { titulo, texto: String(texto || '').trim().slice(0, 500), setor: para ? 'pessoal' : String(setor || 'todos'), para: para || null, aba: String(aba || ''), criado: F.serverTimestamp(), por: perfil.nome || perfil.email || '', porUid: uid };
    return (await F.addDoc(F.collection(db, 'notificacoes'), d)).id;
  };

  function parar() {
    unsubs.forEach(u => { try { u(); } catch (e) {} }); unsubs = [];
    [unsubMod, unsubLidas].forEach(u => { if (u) try { u(); } catch (e) {} }); unsubMod = unsubLidas = null;
    porQuery = {}; lidas = { ate: 0, ids: [] }; uid = null; perfil = null; admin = false;
    if ($('sgNotif')) { abrir(false); $('sgNotif').hidden = true; }
  }

  function ouvir(chave, q) {
    unsubs.push(F.onSnapshot(q, s => {
      porQuery[chave] = s.docs.map(d => { const x = d.data(); return { id: d.id, ...x, t: ms(x.criado) }; }); desenhar();
    }, e => { console.warn('notificações (' + chave + ')', e.code || e); porQuery[chave] = []; desenhar(); }));
  }

  // ADM: cadastros aguardando liberação viram avisos (id fixo por pessoa, para lembrar se já foi lido)
  function ouvirCadastros() {
    unsubs.push(F.onSnapshot(F.query(F.collection(db, 'usuarios'), F.where('pendente', '==', true)), s => {
      porQuery.cad = s.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.ativo !== true && !u.excluido).map(u => {
        const uf = Array.isArray(u.estados) && u.estados.length ? ' · ' + u.estados.join(', ') : '';
        return { id: 'cad:' + u.uid, auto: true, titulo: 'Pedido de acesso: ' + (u.nome || u.email || 'novo usuário'), texto: (u.email || '') + uf + '\nAguardando liberação em Usuários.', setor: 'usuarios', aba: 'tabUsers', t: ms(u.cadastroEm) || ms(u.criado) };
      });
      desenhar();
    }, e => { console.warn('notificações (cadastros)', e.code || e); porQuery.cad = []; desenhar(); }));
  }

  // Propostas aceitas pelo cliente (ADM: todas; vendedor: as suas). Só as dos últimos 30 dias, para não encher o sino com o histórico.
  const brl = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  function ouvirAceitas() {
    const col = F.collection(db, 'propostas');
    const q = admin ? F.query(col, F.where('status', '==', 'aprovada')) : F.query(col, F.where('owner', '==', uid), F.where('status', '==', 'aprovada'));
    unsubs.push(F.onSnapshot(q, s => {
      const lim = Date.now() - 30 * 864e5;
      porQuery.aceitas = s.docs.map(d => ({ id: d.id, ...d.data() })).map(p => ({ p, t: ms(p.aprovadoEm) })).filter(x => !x.t || x.t >= lim).map(({ p, t }) => {
        const quem = [p.aprovadoNome, p.aprovadoCargo].filter(Boolean).join(', ');
        const vals = [Number(p.totLic) ? 'Licenças ' + brl(p.totLic) : '', Number(p.totMen) ? 'Mensalidade ' + brl(p.totMen) : ''].filter(Boolean).join(' · ');
        return { id: 'ace:' + p.id, auto: true, prop: p.id, titulo: 'Proposta aceita: ' + (p.cliente || p.numero || 'cliente'), texto: [vals, quem ? 'Aprovada por ' + quem : ''].filter(Boolean).join('\n'), setor: 'propostas', t, por: admin && p.owner !== uid ? p.vendedor || '' : '' };
      });
      desenhar();
    }, e => { console.warn('notificações (propostas aceitas)', e.code || e); porQuery.aceitas = []; desenhar(); }));
  }

  function iniciar(det) {
    if (det.perfil && det.perfil.uid === uid) { admin = !!det.admin || admin; desenhar(); return; } // o mesmo login avisa por dois eventos
    parar(); ({ F, db, perfil } = det); admin = !!det.admin; uid = perfil.uid;
    montar(); $('sgNotif').hidden = false;
    const col = F.collection(db, 'notificacoes');
    if (admin) { ouvir('adm', F.query(col, F.orderBy('criado', 'desc'), F.limit(100))); ouvirCadastros(); }
    else {
      // Uma consulta por setor (o Firestore só libera consultas que a regra consegue provar)
      ['todos', ...meusSetores()].forEach(s => ouvir('s:' + s, F.query(col, F.where('setor', '==', s))));
      ouvir('eu', F.query(col, F.where('para', '==', uid)));
    }
    ouvirAceitas();
    unsubLidas = F.onSnapshot(F.doc(db, 'notifLidas', uid), d => { const x = d.exists() ? d.data() : {}; lidas = { ate: ms(x.ate) || (x.ate === null ? Date.now() : 0), ids: Array.isArray(x.ids) ? x.ids : [] }; desenhar(); }, () => {});
    unsubMod = F.onSnapshot(F.doc(db, 'config', 'modulos'), d => { try { const j = d.exists() && d.data().json; if (j) MODS = JSON.parse(j); if (MODS && window.modulosCompletar) window.modulosCompletar(MODS); } catch (e) {} desenhar(); }, () => {});
  }
  setInterval(() => { if (aberto) desenhar(); }, 60000);

  window.addEventListener('argo-perfil', e => iniciar(e.detail));
  window.addEventListener('shotgun-crm', e => iniciar(e.detail));
  window.addEventListener('argo-sair', parar);
})();

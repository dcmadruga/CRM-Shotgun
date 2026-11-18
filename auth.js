// Login, perfis e tela de usuários (Firebase). Só roda quando firebase-config.js tem apiKey.
const C = window.FIREBASE_CONFIG || {};
if (C.apiKey) iniciar().catch(e => { console.error(e); erroLogin('Não foi possível carregar o login. Verifique a internet e recarregue.'); });

function erroLogin(t) { const b = document.getElementById('loginBox'); if (b) { b.hidden = false; document.getElementById('loginMsg').textContent = t; } }

async function iniciar() {
  const V = '10.12.2', base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const app = initializeApp(C);
  const auth = A.getAuth(app);
  let db; try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache() }); } catch (e) { db = F.getFirestore(app); }
  const $ = id => document.getElementById(id);
  const body = document.body;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PARAM = F.doc(db, 'config', 'parametros');
  let perfil = null;

  const fb = window.argoFb = { admin: false, carregar, publicar };

  /* ---------- Login ---------- */
  const box = $('loginBox'), lmsg = t => { $('loginMsg').textContent = t };
  function mostrarLogin(t) { body.classList.add('locked'); box.hidden = false; if (t) lmsg(t); setTimeout(() => $('l-email').focus(), 50); }
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('l-email').value.trim(), senha = $('l-senha').value;
    if (!email || !senha) { lmsg('Informe e-mail e senha.'); return; }
    $('btnLogin').disabled = true; lmsg('Entrando…');
    try { await A.signInWithEmailAndPassword(auth, email, senha); $('l-senha').value = ''; }
    catch (err) {
      const c = err.code || '';
      lmsg(/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c) ? 'E-mail ou senha incorretos.' :
        /too-many-requests/.test(c) ? 'Muitas tentativas. Espere alguns minutos ou use "Esqueci minha senha".' :
        /network/.test(c) ? 'Sem internet. Conecte-se para entrar.' : 'Não foi possível entrar (' + c + ').');
    } finally { $('btnLogin').disabled = false; }
  });
  $('btnEsqueci').addEventListener('click', async () => {
    const email = $('l-email').value.trim();
    if (!email) { lmsg('Digite seu e-mail acima e toque de novo em "Esqueci minha senha".'); $('l-email').focus(); return; }
    try { await A.sendPasswordResetEmail(auth, email); lmsg('Se o e-mail estiver cadastrado, chega um link para criar nova senha. Veja também o spam.'); }
    catch (err) { lmsg('Não foi possível enviar (' + (err.code || 'erro') + ').'); }
  });
  $('btnSair').addEventListener('click', () => A.signOut(auth));

  A.onAuthStateChanged(auth, async user => {
    perfil = null; fb.admin = false; body.classList.remove('is-admin');
    if (!user) { mostrarLogin('Entre com o e-mail e a senha que o administrador cadastrou para você.'); return; }
    try {
      const ref = F.doc(db, 'usuarios', user.uid);
      let snap = await F.getDoc(ref);
      if (!snap.exists()) {
        // Primeiro acesso do administrador: as regras só permitem para o e-mail do dono.
        try { await F.setDoc(ref, { nome: user.email.split('@')[0], email: user.email, fone: '', papel: 'adm', ativo: true, criado: F.serverTimestamp() }); snap = await F.getDoc(ref); }
        catch (e) { /* não é o dono */ }
      }
      if (!snap.exists() || snap.data().ativo !== true) { await A.signOut(auth); mostrarLogin('Seu acesso não está liberado. Fale com o administrador.'); return; }
      perfil = { uid: user.uid, ...snap.data() };
    } catch (e) {
      mostrarLogin(e.code === 'unavailable' ? 'Sem internet. Conecte-se para entrar.' : 'Não foi possível verificar seu acesso (' + (e.code || 'erro') + ').'); return;
    }
    fb.admin = perfil.papel === 'adm';
    box.hidden = true; body.classList.remove('locked');
    $('tabUser').textContent = perfil.nome || perfil.email;
    aplicarPerfil();
    aplicarModo();
    await carregar(false);
    if (fb.admin) { ouvirUsuarios(); carregarE2(); carregarE3(); }
    ouvirPropostas();
    if (!fb.admin) F.getDoc(F.doc(db, 'publico', 'etapa2')).then(s => { if (s.exists() && s.data().json) E2PUB = JSON.parse(s.data().json); }).catch(() => {});
    if (!fb.admin) F.getDoc(F.doc(db, 'publico', 'etapa3')).then(s => { if (s.exists() && s.data().json) E3PUB = JSON.parse(s.data().json); }).catch(() => {});
  });

  function aplicarPerfil() {
    const v = { vNome: perfil.nome || '', vFone: perfil.fone || '', vEmail: perfil.email || '' };
    lsSet(VEND_KEY, v); Object.assign(CFG, v); lsSet(CFG_KEY, CFG);
    VEND.forEach(id => { const el = $('c-' + id); el.value = v[id]; el.readOnly = true; el.title = 'Alterado pelo administrador na tela Usuários'; });
    $('firstRun').hidden = true;
  }

  /* ---------- Parâmetros da equipe ---------- */
  async function carregar(forcar) {
    if (!perfil) return;
    if (fb.admin && lsGet(PEND_KEY) && !forcar) { teamStatus('Você tem alterações ainda não publicadas neste aparelho.'); return; }
    try {
      const snap = await F.getDoc(PARAM);
      if (!snap.exists()) { teamStatus(fb.admin ? 'Ainda não há parâmetros publicados. Revise abaixo e clique em Publicar para a equipe.' : 'O administrador ainda não publicou os parâmetros.'); return; }
      const j = snap.data();
      CFG = { ...cfgModelo(), ...semVend(j), ...vendData() };
      lsSet(CFG_KEY, CFG); if (forcar) lsSet(PEND_KEY, false); cfgDirty = false;
      renderCfg(); aplicarValidade(); totals(); aplicarPerfil();
      teamStatus(j._publicado ? 'Parâmetros da equipe atualizados (publicados em ' + fmtQuando(j._publicado) + (j._por ? ' por ' + j._por : '') + ').' : 'Parâmetros da equipe carregados.');
    } catch (e) {
      teamStatus('Sem conexão: usando os últimos parâmetros baixados neste aparelho.');
    }
  }
  async function publicar() {
    if (!fb.admin) return;
    const btn = $('btnPublish'); btn.disabled = true; pubStatus('Publicando…');
    try {
      const dados = JSON.parse(JSON.stringify(cfgParaPublicar()));
      await F.setDoc(PARAM, dados);
      lsSet(PEND_KEY, false); cfgDirty = false; status('');
      pubStatus('Publicado em ' + fmtQuando(dados._publicado) + '. A equipe recebe na próxima vez que abrir o app.');
      teamStatus('Parâmetros da equipe publicados por você.');
    } catch (e) { pubStatus('Não foi possível publicar (' + (e.code || e.message) + ').'); }
    finally { btn.disabled = false; }
  }

  /* ---------- Abas ---------- */
  const EXTRA = { tabUsers: 'viewUsers', tabList: 'viewList', tabE2: 'viewE2', tabE3: 'viewE3' };
  function abrirAba(tab) {
    Object.entries(EXTRA).forEach(([t, v]) => { const on = t === tab; $(v).hidden = !on; $(t).setAttribute('aria-selected', String(on)); });
    document.body.classList.toggle('semBarra', !!EXTRA[tab]);
    if (EXTRA[tab]) { $('viewProp').hidden = true; $('viewCfg').hidden = true; $('tabProp').setAttribute('aria-selected', 'false'); $('tabCfg').setAttribute('aria-selected', 'false'); }
  }
  Object.keys(EXTRA).forEach(t => $(t).addEventListener('click', () => abrirAba(t)));
  ['tabProp', 'tabCfg'].forEach(t => $(t).addEventListener('click', () => abrirAba(t)));
  $('btnPdf').addEventListener('click', () => abrirAba('tabProp'), true);

  /* ---------- Propostas: envio para aprovação ---------- */
  const dig = v => String(v || '').replace(/\D/g, '');
  const waNum = v => { const d = dig(v); return d.length >= 10 && d.length <= 11 ? '55' + d : d; };
  const aprovMsg = t => { $('aprovMsg').textContent = t; };
  const pMsg = t => { $('pMsg').textContent = t; };
  const baseUrl = p => new URL(p, location.href).href.split('#')[0].split('?')[0];
  const linkAprov = id => baseUrl('aprovar.html') + '#' + id;
  const hojeIso = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
  function abrirWa(num, texto, janela) {
    const url = 'https://wa.me/' + (num || '') + '?text=' + encodeURIComponent(texto);
    if (janela && !janela.closed) { janela.location.href = url; return; }
    window.open(url, '_blank') || (location.href = url);
  }
  const textoAprov = p => `Olá${p.contato ? ' ' + p.contato : ''}! Segue a proposta comercial da Argo nº ${p.numero} para ${p.cliente}.\n\nPara ver o PDF e aprovar, acesse:\n${linkAprov(p.id)}\n\n${p.vendedor} - Argo`;

  // Salva a proposta uma vez; se nada mudou desde o último envio, reaproveita o mesmo link.
  let ultimo = null;
  async function salvarProposta(n) {
    const assin = JSON.stringify(S);
    if (ultimo && ultimo.assin === assin) { if (n && n !== ultimo.meta.waCli) { ultimo.meta.waCli = n; F.updateDoc(F.doc(db, 'propostas', ultimo.id), { waCli: n }).catch(() => {}); } return ultimo; }
    const b64 = buildPdf().output('datauristring').split(',')[1];
    if (b64.length > 950000) throw new Error('o PDF ficou grande demais (troque o logo por uma imagem menor)');
    const ref = F.doc(F.collection(db, 'propostas'));
    const numero = hojeIso().replace(/-/g, '').slice(2) + '-' + ref.id.slice(0, 4).toUpperCase();
    const meta = {
      numero, status: 'enviada', owner: perfil.uid, vendedor: perfil.nome || '', vendedorFone: dig(perfil.fone),
      cliente: String(S.cliente || '').trim(), cnpj: S.cnpj || '', contato: String(S.contato || '').trim(), cidade: S.cidade || '',
      waCli: n, data: S.data || hojeIso(), validade: S.validade || '',
      totLic: sumRows(S.lic), totMen: sumRows(S.men), totDes: deslocamento(), arquivo: fileName(),
      dados: JSON.parse(assin), criado: F.serverTimestamp()
    };
    const lote = F.writeBatch(db);
    lote.set(ref, meta);
    lote.set(F.doc(db, 'propostas', ref.id, 'arquivo', 'pdf'), { b64, nome: fileName() });
    await lote.commit();
    ultimo = { id: ref.id, meta, assin };
    return ultimo;
  }
  function validarEnvio() {
    if (!perfil) return null;
    if (!String(S.cliente || '').trim()) { $('cliente').focus(); aprovMsg('Preencha o cliente antes de enviar.'); return null; }
    if (!window.jspdf) { aprovMsg('O gerador de PDF não carregou. Recarregue a página.'); return null; }
    const n = waNum($('waAprov').value);
    if (n && n.length < 12) { $('waAprov').focus(); aprovMsg('Confira o WhatsApp do cliente: DDD e número.'); return null; }
    return { n };
  }
  $('btnAprov').addEventListener('click', async () => {
    const v = validarEnvio(); if (!v) return;
    const janela = window.open('', '_blank');
    const btn = $('btnAprov'); btn.disabled = true; aprovMsg('Salvando a proposta…');
    try {
      const r = await salvarProposta(v.n);
      abrirWa(v.n, textoAprov({ ...r.meta, id: r.id }), janela);
      aprovMsg(`Proposta nº ${r.meta.numero} salva e enviada. Acompanhe na aba Propostas.`);
    } catch (e) {
      if (janela) janela.close();
      aprovMsg('Não foi possível enviar: ' + (e.code || e.message) + '.');
    } finally { btn.disabled = false; }
  });
  $('btnAprovCopy').addEventListener('click', async () => {
    const v = validarEnvio(); if (!v) return;
    const btn = $('btnAprovCopy'); btn.disabled = true; aprovMsg('Salvando a proposta…');
    try {
      const r = await salvarProposta(v.n);
      const link = linkAprov(r.id);
      $('aprovLink').value = link; $('aprovLinkRow').hidden = false;
      try { await navigator.clipboard.writeText(link); aprovMsg(`Proposta nº ${r.meta.numero} salva. Link copiado: cole no WhatsApp, e-mail ou onde preferir.`); }
      catch (_) { $('aprovLink').select(); aprovMsg(`Proposta nº ${r.meta.numero} salva. Toque em Copiar ao lado do link.`); }
    } catch (e) { aprovMsg('Não foi possível salvar: ' + (e.code || e.message) + '.'); }
    finally { btn.disabled = false; }
  });
  $('btnAprovLinkCopy').addEventListener('click', async () => {
    const i = $('aprovLink'); i.select();
    try { await navigator.clipboard.writeText(i.value); aprovMsg('Link copiado.'); } catch (_) { try { document.execCommand('copy'); aprovMsg('Link copiado.'); } catch (__) { aprovMsg('Selecione o link e copie.'); } }
  });
  $('btnNova').addEventListener('click', () => { $('waAprov').value = ''; $('aprovLinkRow').hidden = true; ultimo = null; });

  /* ---------- Aba Propostas ---------- */
  let unsubP = null, props = [];
  function ouvirPropostas() {
    if (unsubP) unsubP();
    const col = F.collection(db, 'propostas');
    const q = fb.admin ? F.query(col, F.orderBy('criado', 'desc'), F.limit(300)) : F.query(col, F.where('owner', '==', perfil.uid));
    unsubP = F.onSnapshot(q, qs => {
      props = qs.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.criado?.seconds || 9e9) - (a.criado?.seconds || 9e9));
      desenharPropostas();
    }, e => pMsg('Não foi possível carregar as propostas (' + (e.code || 'erro') + ').'));
  }
  A.onAuthStateChanged(auth, u => { if (!u && unsubP) { unsubP(); unsubP = null; props = []; } });

  const fmtD = iso => { if (!iso) return ''; const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
  const fmtTs = ts => ts && ts.toDate ? ts.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
  function statusDe(p) {
    if (p.status === 'aprovada') return { cls: 'ok', txt: 'APROVADA' };
    if (p.validade && p.validade < hojeIso()) return { cls: 'exp', txt: 'Vencida' };
    return { cls: 'wait', txt: 'Aguardando aprovação' };
  }
  function desenharPropostas() {
    const busca = $('pBusca').value.trim().toLowerCase(), filtro = $('pFiltro').value;
    const passa = p => !filtro || (filtro === 'ctok' ? !!p.ctAceitoEm : filtro === 'ctenv' ? (!!p.ctEm && !p.ctAceitoEm) : p.status === filtro);
    const vis = props.filter(p => passa(p) &&
      (!busca || [p.cliente, p.cnpj, p.numero, p.cidade, p.vendedor].join(' ').toLowerCase().includes(busca)));
    const ap = props.filter(p => p.status === 'aprovada').length;
    $('pCount').textContent = `${props.length} no total · ${ap} aprovada${ap === 1 ? '' : 's'}`;
    $('pList').innerHTML = vis.length ? vis.map(p => {
      const st = statusDe(p), ok = p.status === 'aprovada';
      return `<div class="pcard" data-id="${esc(p.id)}">
        <div><b>${esc(p.cliente)}</b><div class="meta">Nº ${esc(p.numero)} · ${esc(p.cidade || '')}${fb.admin ? ' · ' + esc(p.vendedor) : ''}</div></div>
        <div class="vals">Licenças ${brl(p.totLic)} · Mensalidade ${brl(p.totMen)} · Deslocamento ${brl(p.totDes)}</div>
        <div class="meta">Enviada em ${esc(fmtTs(p.criado) || fmtD(p.data))}${p.validade ? ' · válida até ' + esc(fmtD(p.validade)) : ''}${ok ? `<br><b style="color:#1f7a46">Aprovada por ${esc(p.aprovadoNome)}${p.aprovadoCargo ? ' (' + esc(p.aprovadoCargo) + ')' : ''} em ${esc(fmtTs(p.aprovadoEm))}</b>` : ''}</div>
        <div class="etapa"><div class="etit">Etapa 1 - Proposta</div>
          <div class="acts">
            <button type="button" data-a="pdf">Ver PDF</button>
            <button type="button" data-a="abrir">Abrir no formulário</button>
            ${ok ? '' : '<button type="button" data-a="reenviar">Reenviar pelo WhatsApp</button>'}
            <button type="button" data-a="copiar">Copiar link da proposta</button>
            <span class="pill ${st.cls}">${st.txt}</span>
          </div></div>
        <div class="etapa${ok ? '' : ' bloq'}"><div class="etit">Etapa 2 - Dados Complementares ${p.e2Em ? `<span class="pill ok">DADOS RECEBIDOS</span> <span class="meta">em ${esc(fmtTs(p.e2Em))}${p.e2Anexos ? ' · ' + p.e2Anexos + ' anexo' + (p.e2Anexos > 1 ? 's' : '') : ''}</span>` : ''}</div>
          <div class="acts">
            ${p.e2Em ? '<button type="button" class="primary" data-a="e2ver">Ver dados e anexos</button>' : ''}
            ${ok ? `<button type="button"${p.e2Em ? '' : ' class="primary"'} data-a="etapa2">Enviar pelo WhatsApp</button><button type="button" data-a="etapa2copy">Copiar link da Etapa 2</button>`
                 : '<button type="button" disabled>Enviar pelo WhatsApp</button><button type="button" disabled>Copiar link da Etapa 2</button><span class="hint">Libera quando o cliente aprovar a proposta.</span>'}
          </div>
          <div class="e2dados" hidden></div></div>
        <div class="etapa${p.e2Em ? '' : ' bloq'}"><div class="etit">Etapa 3 - Contrato ${p.ctAceitoEm ? '<span class="pill ok">CONTRATO ACEITO</span>' : p.ctEm ? '<span class="pill wait">Aguardando aceite</span>' : ''}</div>
          ${p.ctAceitoEm ? `<div class="ctinfo">Aceito por ${esc(p.ctAceitoNome)}${p.ctAceitoCargo ? ' (' + esc(p.ctAceitoCargo) + ')' : ''}, CPF ${esc(p.ctAceitoCpf || '')}, em ${esc(fmtTs(p.ctAceitoEm))}</div>` : p.ctEm ? `<div class="meta">Contrato gerado em ${esc(fmtTs(p.ctEm))}</div>` : ''}
          <div class="acts">
            ${!p.e2Em ? '<button type="button" disabled>Gerar e enviar pelo WhatsApp</button><button type="button" disabled>Copiar link do contrato</button><span class="hint">Libera quando o cliente enviar os dados complementares.</span>'
              : p.ctAceitoEm ? '<button type="button" class="primary" data-a="ctpdf">Ver contrato aceito (PDF)</button><button type="button" data-a="ctcopy">Copiar link do contrato</button>'
              : `<button type="button" class="primary" data-a="ctenviar">${p.ctEm ? 'Gerar de novo e enviar pelo WhatsApp' : 'Gerar e enviar pelo WhatsApp'}</button><button type="button" data-a="ctcopy">Copiar link do contrato</button>${p.ctEm ? '<button type="button" data-a="ctpdf">Ver contrato (PDF)</button>' : ''}`}
          </div></div>
        </div>`;
    }).join('') : `<p class="hint">${props.length ? 'Nenhuma proposta encontrada com esse filtro.' : 'Nenhuma proposta enviada ainda. Use "Enviar proposta para aprovação" na aba Proposta.'}</p>`;
  }
  let E2PUB = null; // formulário publicado (para a mensagem de envio)
  function msgEtapa2(p, link) {
    const cfg = E2 || E2PUB || window.ETAPA2_PADRAO;
    let t = String(cfg.msgEnvio || window.ETAPA2_PADRAO.msgEnvio);
    if (!t.includes('{link}')) t += '\n{link}';
    const v = { contato: p.contato || '', cliente: p.cliente || '', numero: p.numero || '', link, vendedor: perfil.nome || p.vendedor || '' };
    return t.replace(/\{(contato|cliente|numero|link|vendedor)\}/g, (_, k) => v[k]).replace(/ +([,!.?])/g, '$1').replace(/ +\n/g, '\n');
  }
  function linkEtapa2(p) {
    const sc = splitCidade(p.cidade);
    const dados = { c: p.cnpj, r: p.cliente, cid: sc.cidade, uf: sc.uf, v: perfil.nome || p.vendedor, w: dig(perfil.fone) || p.vendedorFone, n: p.numero, p: p.id };
    const b = btoa(unescape(encodeURIComponent(JSON.stringify(dados)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return baseUrl('dados.html') + '#d=' + b;
  }
  $('pBusca').addEventListener('input', desenharPropostas);
  $('pFiltro').addEventListener('change', desenharPropostas);
  $('pList').addEventListener('click', async e => {
    const bt = e.target.closest('[data-a]'), a = bt && bt.dataset.a, card = e.target.closest('.pcard'); if (!a || !card) return;
    const p = props.find(x => x.id === card.dataset.id); if (!p) return;
    if (a === 'reenviar') { abrirWa(p.waCli, textoAprov(p)); pMsg('WhatsApp aberto com o link da proposta.'); }
    if (a === 'copiar') { try { await navigator.clipboard.writeText(linkAprov(p.id)); pMsg('Link da proposta nº ' + p.numero + ' copiado.'); } catch (_) { pMsg('Link: ' + linkAprov(p.id)); } }
    if (a === 'abrir') {
      S = { ...JSON.parse(JSON.stringify(p.dados || {})) }; save(); renderProp(); aplicarValidade(); totals();
      $('waAprov').value = p.waCli ? String(p.waCli).replace(/^55/, '') : '';
      showTab(false); abrirAba('tabProp'); msg(`Proposta nº ${p.numero} carregada. Se mudar algo, envie de novo para aprovação.`);
    }
    if (a === 'pdf') {
      pMsg('Abrindo o PDF…');
      try {
        const snap = await F.getDoc(F.doc(db, 'propostas', p.id, 'arquivo', 'pdf'));
        const bin = atob(snap.data().b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' }));
        const l = document.createElement('a'); l.href = url; l.download = p.arquivo || 'Proposta Argo.pdf'; l.target = '_blank'; l.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000); pMsg('');
      } catch (err) { pMsg('Não foi possível abrir o PDF (' + (err.code || err.message) + ').'); }
    }
    if (a === 'e2ver') {
      const box = card.querySelector('.e2dados');
      if (!box.hidden) { box.hidden = true; return; }
      box.hidden = false; box.textContent = 'Carregando…';
      try {
        const [r, an] = await Promise.all([F.getDoc(F.doc(db, 'propostas', p.id, 'etapa2', 'resposta')), F.getDocs(F.collection(db, 'propostas', p.id, 'anexos'))]);
        const d = r.exists() ? r.data() : { campos: {} };
        const linhas = Object.entries(d.campos || {}).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('');
        const arqs = an.docs.map(x => ({ id: x.id, ...x.data() }));
        box.innerHTML = `<div class="refwrap"><table class="refs e2resp"><tbody>${linhas || '<tr><td>Sem respostas salvas.</td></tr>'}</tbody></table></div>
          ${arqs.length ? `<div class="etit" style="margin-top:6px">Anexos</div><div class="acts">${arqs.map(x => `<button type="button" data-a="anexo" data-aid="${esc(x.id)}">⬇ ${esc(x.nome)} <span class="meta">(${esc(x.campo || '')}, ${(Number(x.tamanho || 0) / 1048576).toFixed(1)} MB)</span></button>`).join('')}</div>` : ''}
          <div class="acts" style="margin-top:6px"><button type="button" data-a="e2copiar">Copiar dados</button></div>`;
        box.dataset.texto = d.texto || '';
      } catch (err) { box.textContent = 'Não foi possível carregar (' + (err.code || err.message) + ').'; }
      return;
    }
    if (a === 'e2copiar') { try { await navigator.clipboard.writeText(card.querySelector('.e2dados').dataset.texto || ''); pMsg('Dados copiados.'); } catch (_) { pMsg('Não foi possível copiar.'); } return; }
    if (a === 'anexo') {
      const aid = e.target.closest('[data-aid]').dataset.aid; const b = e.target.closest('button'); b.disabled = true;
      try {
        const meta = (await F.getDoc(F.doc(db, 'propostas', p.id, 'anexos', aid))).data();
        const ps = await F.getDocs(F.collection(db, 'propostas', p.id, 'anexos', aid, 'partes'));
        const b64 = ps.docs.sort((x, y) => x.id.localeCompare(y.id)).map(x => x.data().d).join('');
        const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([u8], { type: meta.tipo || 'application/octet-stream' }));
        const l = document.createElement('a'); l.href = url; l.download = meta.nome || 'anexo'; l.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (err) { pMsg('Não foi possível baixar o anexo (' + (err.code || err.message) + ').'); }
      finally { b.disabled = false; }
      return;
    }
    if (a === 'etapa2' || a === 'etapa2copy') {
      const link = linkEtapa2(p);
      if (a === 'etapa2copy') {
        try { await navigator.clipboard.writeText(link); pMsg('Link da Etapa 2 (proposta nº ' + p.numero + ') copiado. Cole no WhatsApp ou e-mail do cliente.'); }
        catch (_) { pMsg('Link da Etapa 2: ' + link); }
        return;
      }
      abrirWa(p.waCli, msgEtapa2(p, link));
      pMsg('WhatsApp aberto com o formulário da Etapa 2.');
    }
    if (a === 'ctenviar' || a === 'ctcopy') {
      if (!p.e2Em) return;
      const janela = a === 'ctenviar' ? window.open('', '_blank') : null;
      bt.disabled = true;
      try {
        if (!p.ctEm || (a === 'ctenviar' && !p.ctAceitoEm)) { pMsg('Gerando o contrato…'); await gerarContrato(p); }
        const link = linkContrato(p.id);
        if (a === 'ctcopy') {
          try { await navigator.clipboard.writeText(link); pMsg('Link do contrato (proposta nº ' + p.numero + ') copiado.'); }
          catch (_) { pMsg('Link do contrato: ' + link); }
        } else { abrirWa(p.waCli, msgEtapa3(p, link), janela); pMsg('Contrato gerado e WhatsApp aberto com o link.'); }
      } catch (err) {
        if (janela) janela.close();
        pMsg('Não foi possível gerar o contrato: ' + (err.code || err.message) + '.');
      } finally { bt.disabled = false; }
      return;
    }
    if (a === 'ctpdf') {
      bt.disabled = true; pMsg('Abrindo o contrato…');
      try {
        const d = (await F.getDoc(F.doc(db, 'propostas', p.id, 'arquivo', 'contrato'))).data();
        const doc = window.contratoPdf({ titulo: d.titulo, texto: d.texto, numero: p.numero, logo: logoAtual(), logoW: CFG.logoW, logoH: CFG.logoH,
          aceite: p.ctAceitoEm ? { nome: p.ctAceitoNome, cpf: p.ctAceitoCpf, cargo: p.ctAceitoCargo, em: fmtTs(p.ctAceitoEm), cliente: p.cliente } : null });
        const url = URL.createObjectURL(doc.output('blob'));
        const l = document.createElement('a'); l.href = url; l.download = 'Contrato Argo ' + p.numero + (p.ctAceitoEm ? ' - aceito' : '') + '.pdf'; l.target = '_blank'; l.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000); pMsg('');
      } catch (err) { pMsg('Não foi possível abrir o contrato (' + (err.code || err.message) + ').'); }
      finally { bt.disabled = false; }
      return;
    }
  });

  /* ---------- Etapa 3: contrato ---------- */
  let E3PUB = null;
  const cfgE3 = () => E3 || E3PUB || window.ETAPA3_PADRAO;
  const linkContrato = id => baseUrl('contrato.html') + '#' + id;
  function msgEtapa3(p, link) {
    let t = String(cfgE3().msgEnvio || window.ETAPA3_PADRAO.msgEnvio);
    if (!t.includes('{link}')) t += '\n{link}';
    const v = { contato: p.contato || '', cliente: p.cliente || '', numero: p.numero || '', link, vendedor: perfil.nome || p.vendedor || '' };
    return t.replace(/\{(contato|cliente|numero|link|vendedor)\}/g, (_, k) => v[k]).replace(/ +([,!.?])/g, '$1').replace(/ +\n/g, '\n');
  }
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function itensTexto(rows) {
    const ls = (rows || []).filter(r => !r.oculto && String(r.desc || '').trim()).map(r => {
      const q = qtyNum(r.qty), pr = num(r.price), temp = isentoTemp(r);
      let v = r.isento && !temp ? 'isento' : q === null ? brl(pr) + ' por unidade' : (q === 1 ? brl(pr) : q + ' x ' + brl(pr) + ' = ' + brl(q * pr));
      if (temp) v += ` (isento por ${Math.round(num(r.diasIsento))} dias a contar da emissão do primeiro cupom ou nota pelo sistema; depois, valor integral)`;
      return '- ' + String(r.desc).trim() + (r.sub ? ' (' + String(r.sub).trim() + ')' : '') + ': ' + v;
    });
    return ls.length ? ls.join('\n') : '- (nenhum item)';
  }
  // Dados disponíveis como marcadores: proposta + Etapa 2 + dados da Argo.
  async function valoresContrato(p) {
    const cfg2 = E2 || E2PUB || window.ETAPA2_PADRAO;
    const campos = (cfg2.secoes || []).flatMap(s => s.campos || []);
    const r = await F.getDoc(F.doc(db, 'propostas', p.id, 'etapa2', 'resposta'));
    const d = r.exists() ? r.data() : {};
    const V = {};
    if (d.valores) Object.assign(V, d.valores);
    else Object.entries(d.campos || {}).forEach(([lab, v]) => { const c = campos.find(x => x.label === lab); if (c) V[c.k] = v; });
    campos.forEach(c => { if (c.tipo === 'data' && /^\d{4}-\d{2}-\d{2}$/.test(V[c.k] || '')) V[c.k] = fmtD(V[c.k]); });
    if (V.uf) V.uf = String(V.uf).toUpperCase();
    const ar = cfgE3().argo || {}, t = new Date(), sc = splitCidade(p.cidade);
    // Sede: campos da Etapa 2; se o formulário não pede endereço, busca pelo CNPJ (Receita, via BrasilAPI).
    const E = { log: V.logradouro, num: V.numero, comp: V.complemento, bai: V.bairro, cid: V.cidade, uf: V.uf, cep: V.cep };
    const cnpjD = dig(V.cnpj || p.cnpj);
    if (!E.log && cnpjD.length === 14) {
      try {
        const rr = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + cnpjD);
        if (rr.ok) { const j = await rr.json();
          Object.assign(E, { log: [j.descricao_tipo_de_logradouro, j.logradouro].filter(Boolean).join(' '), num: j.numero, comp: j.complemento, bai: j.bairro, cid: j.municipio, uf: j.uf, cep: j.cep && String(j.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2') }); }
      } catch (_) {}
    }
    const cid = E.cid ? E.cid + (E.uf ? '/' + String(E.uf).toUpperCase() : '') : (sc.cidade + (sc.uf ? '/' + sc.uf : ''));
    const end = [[E.log, E.num].filter(Boolean).join(', nº ') + (E.comp ? ' - ' + E.comp : ''), E.bai ? 'bairro ' + E.bai : '', cid, E.cep ? 'CEP ' + E.cep : ''].filter(Boolean).join(', ');
    // Responsável legal: RG e endereço pelos campos da seção do responsável (achados pelo nome do campo).
    const secR = (cfg2.secoes || []).find(s => /respons/i.test(s.titulo || '') || s.id === 'responsavel') || { campos: [] };
    const porNome = re => { const c = (secR.campos || []).find(x => re.test(String(x.label || '').trim())); return c ? String(V[c.k] || '').trim() : ''; };
    const rgC = campos.find(c => c.tipo === 'rg');
    const rCid = porNome(/^cidade/i), rUf = porNome(/^(estado|uf)/i);
    const endResp = [[porNome(/^endere/i), porNome(/^n[uú]mero/i)].filter(Boolean).join(', nº ') + (porNome(/^complemento/i) ? ' - ' + porNome(/^complemento/i) : ''),
      porNome(/^bairro/i) ? 'bairro ' + porNome(/^bairro/i) : '', rCid ? rCid + (rUf ? '/' + rUf.toUpperCase() : '') : ''].filter(Boolean).join(', ');
    const dd = p.dados || {};
    return {
      ...V,
      razao: V.razao || p.cliente || '', cnpj: V.cnpj || p.cnpj || '', cliente: p.cliente || '', contato: p.contato || '',
      numero: p.numero || '', vendedor: p.vendedor || '', endereco_cliente: end, cidade_cliente: cid,
      rg_responsavel: rgC ? (V[rgC.k] || '') : '', endereco_responsavel: endResp,
      data: fmtD(hojeIso()), data_extenso: `${t.getDate()} de ${MESES[t.getMonth()]} de ${t.getFullYear()}`,
      data_proposta: fmtD(p.data), aprovado_por: p.aprovadoNome || '', aprovado_cargo: p.aprovadoCargo || '',
      total_licencas: brl(p.totLic), total_mensalidade: brl(p.totMen), total_deslocamento: brl(p.totDes),
      itens_licencas: itensTexto(dd.lic), itens_mensalidades: itensTexto(dd.men),
      argo_razao: ar.razao || '', argo_cnpj: ar.cnpj || '', argo_endereco: ar.endereco || '', argo_representante: ar.representante || '', argo_foro: ar.foro || ''
    };
  }
  const preencherModelo = (modelo, V) => String(modelo || '').replace(/\{([A-Za-z0-9_]+)\}/g, (_, k) => V[k] == null ? '' : String(V[k]));
  async function gerarContrato(p) {
    const cfg = cfgE3();
    const texto = preencherModelo(cfg.modelo, await valoresContrato(p));
    const titulo = cfg.titulo || window.ETAPA3_PADRAO.titulo;
    const b64 = window.contratoPdf({ titulo, texto, numero: p.numero, logo: logoAtual(), logoW: CFG.logoW, logoH: CFG.logoH }).output('datauristring').split(',')[1];
    if (b64.length + texto.length > 950000) throw new Error('o contrato ficou grande demais (troque o logo por uma imagem menor)');
    const lote = F.writeBatch(db);
    lote.set(F.doc(db, 'propostas', p.id, 'arquivo', 'contrato'), { b64, texto, titulo, aceiteTxt: cfg.textoAceite || window.ETAPA3_PADRAO.textoAceite, final: cfg.final || window.ETAPA3_PADRAO.final });
    lote.update(F.doc(db, 'propostas', p.id), { ctEm: F.serverTimestamp() });
    await lote.commit();
  }


  /* ---------- Parâmetros da Etapa 2 (ADM) ---------- */
  const E2DOC = F.doc(db, 'publico', 'etapa2');
  const TIPOS = window.ETAPA2_TIPOS || {};
  let E2 = null, e2Sujo = false;
  const e2Status = t => { $('e2Status').textContent = t; };
  const copia = o => JSON.parse(JSON.stringify(o));
  async function carregarE2() {
    try {
      const snap = await F.getDoc(E2DOC);
      E2 = snap.exists() && snap.data().json ? JSON.parse(snap.data().json) : copia(window.ETAPA2_PADRAO);
      e2Status(snap.exists() ? (snap.data().por ? 'Publicado por ' + snap.data().por + (snap.data().em ? ' em ' + fmtQuando(snap.data().em) : '') + '.' : '') : 'Usando o formulário padrão. Ajuste e publique.');
    } catch (e) { E2 = copia(window.ETAPA2_PADRAO); e2Status('Não foi possível carregar o formulário publicado; mostrando o padrão.'); }
    desenharE2();
  }
  function marcarE2() { e2Sujo = true; e2Status('Alterações ainda não publicadas.'); }
  function desenharE2() {
    if (!E2) return;
    if (E2.msgEnvio == null) E2.msgEnvio = window.ETAPA2_PADRAO.msgEnvio;
    $('e2Msg').value = E2.msgEnvio; previewMsg();
    $('e2Titulo').value = E2.titulo || ''; $('e2Intro').value = E2.intro || ''; $('e2Final').value = E2.final || '';
    $('e2Secoes').innerHTML = E2.secoes.map((s, si) => `
      <section class="sec" data-si="${si}"><h2>Seção ${si + 1} <span>${s.campos.filter(c => c.show !== false || c.fixo).length} campos visíveis</span></h2><div class="body">
        <div class="e2head"><input data-s="titulo" value="${esc(s.titulo)}" aria-label="Título da seção">
          <button type="button" data-sa="up" ${si === 0 ? 'disabled' : ''} aria-label="Subir seção">↑</button>
          <button type="button" data-sa="down" ${si === E2.secoes.length - 1 ? 'disabled' : ''} aria-label="Descer seção">↓</button>
          ${s.campos.some(c => c.fixo) ? '' : '<button type="button" data-sa="del">Remover seção</button>'}</div>
        <div class="refwrap"><table class="e2tab"><thead><tr><th>Campo (como o cliente vê)</th><th>Tipo</th><th class="c">Mostrar</th><th class="c">Obrigatório</th><th>Opções / exemplo</th><th><span class="sr">Ações</span></th></tr></thead><tbody>
        ${s.campos.map((c, ci) => `<tr data-ci="${ci}" class="${c.show === false && !c.fixo ? 'off' : ''}">
          <td><input data-f="label" value="${esc(c.label)}" aria-label="Nome do campo"></td>
          <td class="t"><select data-f="tipo" ${c.custom ? '' : 'disabled'} aria-label="Tipo">${Object.entries(TIPOS).map(([k, v]) => `<option value="${k}"${c.tipo === k ? ' selected' : ''}>${v}</option>`).join('')}</select></td>
          <td class="c"><input type="checkbox" data-f="show" ${c.show !== false || c.fixo ? 'checked' : ''} ${c.fixo ? 'disabled' : ''} aria-label="Mostrar"></td>
          <td class="c"><input type="checkbox" data-f="req" ${c.req ? 'checked' : ''} ${c.fixo ? 'disabled' : ''} aria-label="Obrigatório"></td>
          <td class="o">${c.tipo === 'opcoes' ? `<input data-f="opcoes" value="${esc(c.opcoes || '')}" placeholder="Separe por vírgula" aria-label="Opções"><label class="chk"><input type="checkbox" data-f="outros" ${c.outros ? 'checked' : ''}> Incluir "Outros" com campo "Qual?"</label>` : `<input data-f="ph" value="${esc(c.ph || '')}" placeholder="Texto de exemplo" aria-label="Exemplo">`}</td>
          <td class="a"><button type="button" data-ca="up" ${ci === 0 ? 'disabled' : ''} aria-label="Subir">↑</button><button type="button" data-ca="down" ${ci === s.campos.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button>${c.fixo ? '' : '<button type="button" data-ca="del" aria-label="Excluir campo" title="Excluir campo">✕</button>'}</td>
        </tr>`).join('')}
        </tbody></table></div>
        <div class="tools"><button type="button" data-sa="add">+ Campo nesta seção</button></div>
      </div></section>`).join('');
  }
  function previewMsg() {
    if (!perfil) return;
    $('e2MsgPrev').textContent = 'Exemplo: ' + msgEtapa2({ contato: 'Pedro', cliente: 'POSTO EXEMPLO LTDA', numero: '261118-AB12' }, baseUrl('dados.html') + '#d=…');
  }
  $('e2Msg').addEventListener('input', e => { if (!E2) return; E2.msgEnvio = e.target.value; marcarE2(); previewMsg(); });
  ['e2Titulo', 'e2Intro', 'e2Final'].forEach(id => $(id).addEventListener('input', e => { if (!E2) return; E2[{ e2Titulo: 'titulo', e2Intro: 'intro', e2Final: 'final' }[id]] = e.target.value; marcarE2(); }));
  $('e2Secoes').addEventListener('input', e => {
    const sec = e.target.closest('[data-si]'); if (!sec || !E2) return; const s = E2.secoes[+sec.dataset.si];
    if (e.target.dataset.s) { s.titulo = e.target.value; marcarE2(); return; }
    const tr = e.target.closest('[data-ci]'); const f = e.target.dataset.f; if (!tr || !f) return;
    const c = s.campos[+tr.dataset.ci];
    if (e.target.type === 'checkbox') { c[f] = e.target.checked; tr.classList.toggle('off', c.show === false); }
    else c[f] = e.target.value;
    marcarE2();
    if (f === 'tipo') desenharE2();
  });
  $('e2Secoes').addEventListener('change', e => { if (e.target.dataset.f === 'tipo') { const sec = e.target.closest('[data-si]'), tr = e.target.closest('[data-ci]'); E2.secoes[+sec.dataset.si].campos[+tr.dataset.ci].tipo = e.target.value; marcarE2(); desenharE2(); } });
  $('e2Secoes').addEventListener('click', e => {
    const sec = e.target.closest('[data-si]'); if (!sec || !E2) return; const si = +sec.dataset.si, s = E2.secoes[si];
    const troca = (arr, i, j) => { [arr[i], arr[j]] = [arr[j], arr[i]]; };
    const sa = e.target.dataset.sa, ca = e.target.dataset.ca;
    if (sa === 'up' && si > 0) troca(E2.secoes, si, si - 1);
    else if (sa === 'down' && si < E2.secoes.length - 1) troca(E2.secoes, si, si + 1);
    else if (sa === 'del') E2.secoes.splice(si, 1);
    else if (sa === 'add') s.campos.push({ k: 'c' + Date.now().toString(36), label: 'Novo campo', tipo: 'texto', req: false, show: true, custom: true });
    else if (ca) {
      const ci = +e.target.closest('[data-ci]').dataset.ci;
      if (ca === 'up' && ci > 0) troca(s.campos, ci, ci - 1);
      else if (ca === 'down' && ci < s.campos.length - 1) troca(s.campos, ci, ci + 1);
      else if (ca === 'del') s.campos.splice(ci, 1);
      else return;
    } else return;
    marcarE2(); desenharE2();
  });
  $('btnE2Secao').addEventListener('click', () => { if (!E2) return; E2.secoes.push({ id: 's' + Date.now().toString(36), titulo: 'Nova seção', campos: [{ k: 'c' + Date.now().toString(36), label: 'Novo campo', tipo: 'texto', req: false, show: true, custom: true }] }); marcarE2(); desenharE2(); });
  let e2ResetT = 0;
  $('btnE2Padrao').addEventListener('click', () => {
    if (Date.now() - e2ResetT > 4000) { e2ResetT = Date.now(); e2Status('Clique de novo para confirmar: o formulário volta ao padrão (só vale depois de publicar).'); return; }
    e2ResetT = 0; E2 = copia(window.ETAPA2_PADRAO); marcarE2(); desenharE2();
  });
  $('btnE2Salvar').addEventListener('click', async () => {
    if (!E2 || !fb.admin) return;
    const vazio = E2.secoes.flatMap(s => s.campos).find(c => !String(c.label || '').trim());
    if (vazio || E2.secoes.some(s => !String(s.titulo || '').trim())) { e2Status('Todo campo e toda seção precisam de um nome.'); return; }
    const btn = $('btnE2Salvar'); btn.disabled = true; e2Status('Publicando…');
    try {
      const em = new Date().toISOString();
      await F.setDoc(E2DOC, { json: JSON.stringify(E2), em, por: perfil.nome || perfil.email });
      try { localStorage.setItem('argo-etapa2-cfg', JSON.stringify(E2)); } catch (_) {}
      e2Sujo = false; e2Status('Formulário publicado em ' + fmtQuando(em) + '. Vale para todos os links da Etapa 2.');
    } catch (err) { e2Status('Não foi possível publicar (' + (err.code || err.message) + ').'); }
    finally { btn.disabled = false; }
  });
  $('btnE2Ver').addEventListener('click', () => {
    const dados = { c: '', r: '', v: perfil.nome || '', w: dig(perfil.fone), n: 'EXEMPLO' };
    const b = btoa(unescape(encodeURIComponent(JSON.stringify(dados)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    if (e2Sujo) e2Status('Atenção: a visualização mostra a versão publicada. Publique para ver as alterações.');
    window.open(baseUrl('dados.html') + '#d=' + b, '_blank');
  });

  /* ---------- Parâmetros do contrato (ADM) ---------- */
  const E3DOC = F.doc(db, 'publico', 'etapa3');
  let E3 = null, e3Sujo = false;
  const e3Status = t => { $('e3Status').textContent = t; };
  const E3CAMPOS = { e3Msg: 'msgEnvio', e3Titulo: 'titulo', e3Aceite: 'textoAceite', e3Final: 'final', e3Modelo: 'modelo' };
  async function carregarE3() {
    try {
      const snap = await F.getDoc(E3DOC);
      E3 = snap.exists() && snap.data().json ? JSON.parse(snap.data().json) : copia(window.ETAPA3_PADRAO);
      e3Status(snap.exists() ? (snap.data().por ? 'Publicado por ' + snap.data().por + (snap.data().em ? ' em ' + fmtQuando(snap.data().em) : '') + '.' : '') : 'Usando o modelo provisório. Cole o seu contrato, preencha os dados da Argo e publique.');
    } catch (e) { E3 = copia(window.ETAPA3_PADRAO); e3Status('Não foi possível carregar o contrato publicado; mostrando o padrão.'); }
    desenharE3();
  }
  function marcarE3() { e3Sujo = true; e3Status('Alterações ainda não publicadas.'); }
  function desenharE3() {
    if (!E3) return;
    E3.argo = { ...window.ETAPA3_PADRAO.argo, ...(E3.argo || {}) };
    Object.entries(E3CAMPOS).forEach(([id, k]) => { $(id).value = E3[k] ?? window.ETAPA3_PADRAO[k] ?? ''; });
    document.querySelectorAll('[data-argo]').forEach(el => { el.value = E3.argo[el.dataset.argo] || ''; });
    previewMsgE3(); desenharMarcadores();
  }
  function previewMsgE3() {
    if (!perfil) return;
    $('e3MsgPrev').textContent = 'Exemplo: ' + msgEtapa3({ contato: 'Pedro', cliente: 'POSTO EXEMPLO LTDA', numero: '261118-AB12' }, baseUrl('contrato.html') + '#…');
  }
  function desenharMarcadores() {
    const cfg2 = E2 || window.ETAPA2_PADRAO;
    const grupos = [
      ['Proposta', [['numero', 'Nº da proposta'], ['data_extenso', 'Data de hoje por extenso'], ['data', 'Data de hoje'], ['data_proposta', 'Data da proposta'], ['cliente', 'Cliente (proposta)'], ['contato', 'Contato'], ['vendedor', 'Vendedor'], ['aprovado_por', 'Quem aprovou'], ['aprovado_cargo', 'Cargo de quem aprovou'],
        ['total_licencas', 'Total licenças'], ['total_mensalidade', 'Total mensalidade'], ['total_deslocamento', 'Deslocamento'], ['itens_licencas', 'Lista de licenças'], ['itens_mensalidades', 'Lista de mensalidades']]],
      ['Montados automaticamente', [['endereco_cliente', 'Endereço completo do cliente'], ['cidade_cliente', 'Cidade/UF do cliente'], ['rg_responsavel', 'RG do responsável'], ['endereco_responsavel', 'Endereço do responsável']]],
      ['Argo (contratada)', [['argo_razao', 'Razão social'], ['argo_cnpj', 'CNPJ'], ['argo_endereco', 'Endereço'], ['argo_representante', 'Representante'], ['argo_foro', 'Foro']]],
      ...(cfg2.secoes || []).map(s => ['Etapa 2 · ' + s.titulo, (s.campos || []).filter(c => c.tipo !== 'arquivo').map(c => [c.k, c.label])])
    ];
    $('e3Marc').innerHTML = grupos.filter(g => g[1].length).map(([t, ms]) => `<div class="mg">${esc(t)}</div>` + ms.map(([k, l]) => `<button type="button" data-mk="${esc(k)}" title="{${esc(k)}}">${esc(l)}</button>`).join('')).join('');
  }
  $('tabE3').addEventListener('click', () => { if (E3) desenharMarcadores(); });
  Object.keys(E3CAMPOS).forEach(id => $(id).addEventListener('input', e => { if (!E3) return; E3[E3CAMPOS[id]] = e.target.value; marcarE3(); if (id === 'e3Msg') previewMsgE3(); }));
  document.querySelectorAll('[data-argo]').forEach(el => el.addEventListener('input', () => { if (!E3) return; E3.argo[el.dataset.argo] = el.value; marcarE3(); }));
  $('e3Marc').addEventListener('click', e => {
    const k = e.target.closest('[data-mk]')?.dataset.mk; if (!k || !E3) return;
    const ta = $('e3Modelo'), ins = '{' + k + '}', i = ta.selectionStart ?? ta.value.length, j = ta.selectionEnd ?? i;
    ta.value = ta.value.slice(0, i) + ins + ta.value.slice(j); ta.focus(); ta.selectionStart = ta.selectionEnd = i + ins.length;
    E3.modelo = ta.value; marcarE3();
  });
  let e3ResetT = 0;
  $('btnE3Padrao').addEventListener('click', () => {
    if (Date.now() - e3ResetT > 4000) { e3ResetT = Date.now(); e3Status('Clique de novo para confirmar: o modelo volta ao provisório (só vale depois de publicar).'); return; }
    e3ResetT = 0; const argo = E3 && E3.argo; E3 = copia(window.ETAPA3_PADRAO); if (argo) E3.argo = argo; marcarE3(); desenharE3();
  });
  $('btnE3Salvar').addEventListener('click', async () => {
    if (!E3 || !fb.admin) return;
    if (!String(E3.modelo || '').trim()) { e3Status('O modelo do contrato não pode ficar vazio.'); return; }
    const btn = $('btnE3Salvar'); btn.disabled = true; e3Status('Publicando…');
    try {
      const em = new Date().toISOString();
      await F.setDoc(E3DOC, { json: JSON.stringify(E3), em, por: perfil.nome || perfil.email });
      e3Sujo = false; e3Status('Contrato publicado em ' + fmtQuando(em) + '. Vale para os próximos contratos gerados.');
    } catch (err) { e3Status('Não foi possível publicar (' + (err.code || err.message) + ').'); }
    finally { btn.disabled = false; }
  });
  $('btnE3Ver').addEventListener('click', () => {
    if (!E3) return;
    const ex = props.find(p => p.e2Em) || null, janela = window.open('', '_blank');
    const gerar = async () => {
      let V;
      if (ex) V = await valoresContrato(ex);
      else V = { numero: 'EXEMPLO', razao: 'POSTO EXEMPLO LTDA', cnpj: '00.000.000/0001-00', data_extenso: 'data de hoje' };
      const texto = preencherModelo(E3.modelo, V);
      const doc = window.contratoPdf({ titulo: E3.titulo, texto, numero: V.numero, logo: logoAtual(), logoW: CFG.logoW, logoH: CFG.logoH });
      const url = URL.createObjectURL(doc.output('blob'));
      if (janela && !janela.closed) janela.location.href = url; else { const l = document.createElement('a'); l.href = url; l.download = 'Contrato exemplo.pdf'; l.click(); }
      e3Status(ex ? 'Exemplo gerado com os dados da proposta nº ' + ex.numero + ' (nada foi enviado).' : 'Exemplo gerado sem dados: nenhuma proposta com dados complementares recebidos ainda.');
    };
    gerar().catch(err => { if (janela) janela.close(); e3Status('Não foi possível gerar o exemplo (' + (err.code || err.message) + ').'); });
  });

  /* ---------- Usuários (ADM) ---------- */
  let unsub = null, lista = [];
  const uStatus = t => { $('uStatus').textContent = t };
  function ouvirUsuarios() {
    if (unsub) return;
    unsub = F.onSnapshot(F.collection(db, 'usuarios'), qs => {
      lista = qs.docs.map(d => ({ uid: d.id, ...d.data() })).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
      desenharUsuarios();
    }, () => uStatus('Não foi possível carregar a lista de usuários.'));
  }
  A.onAuthStateChanged(auth, u => { if (!u && unsub) { unsub(); unsub = null; } });

  function desenharUsuarios() {
    $('uCount').textContent = lista.length + (lista.length === 1 ? ' usuário' : ' usuários');
    $('usersBody').innerHTML = lista.map(u => {
      const eu = perfil && u.uid === perfil.uid;
      return `<tr data-uid="${esc(u.uid)}">
        <td><input data-f="nome" value="${esc(u.nome)}" aria-label="Nome"></td>
        <td>${esc(u.email)}</td>
        <td><input data-f="fone" value="${esc(u.fone)}" aria-label="Telefone" inputmode="tel"></td>
        <td><select data-f="papel" ${eu ? 'disabled' : ''} aria-label="Perfil"><option value="vendedor"${u.papel !== 'adm' ? ' selected' : ''}>Vendedor</option><option value="adm"${u.papel === 'adm' ? ' selected' : ''}>Administrador</option></select></td>
        <td><span class="pill ${u.ativo ? '' : 'off'}">${u.ativo ? 'Liberado' : 'Bloqueado'}</span></td>
        <td>${eu ? '<span class="hint">você</span>' : `<button type="button" data-a="toggle">${u.ativo ? 'Bloquear' : 'Liberar'}</button>`}
            <button type="button" data-a="reset">Nova senha</button></td></tr>`;
    }).join('');
  }
  $('usersBody').addEventListener('change', async e => {
    const tr = e.target.closest('tr'), f = e.target.dataset.f; if (!tr || !f) return;
    try { await F.updateDoc(F.doc(db, 'usuarios', tr.dataset.uid), { [f]: e.target.value.trim() }); uStatus('Alteração salva.'); }
    catch (err) { uStatus('Não foi possível salvar (' + (err.code || 'erro') + ').'); }
  });
  $('usersBody').addEventListener('click', async e => {
    const a = e.target.dataset.a, tr = e.target.closest('tr'); if (!a || !tr) return;
    const u = lista.find(x => x.uid === tr.dataset.uid); if (!u) return;
    try {
      if (a === 'toggle') { await F.updateDoc(F.doc(db, 'usuarios', u.uid), { ativo: !u.ativo }); uStatus(u.ativo ? `${u.nome} bloqueado.` : `${u.nome} liberado.`); }
      if (a === 'reset') { await A.sendPasswordResetEmail(auth, u.email); uStatus(`E-mail para criar nova senha enviado para ${u.email}.`); }
    } catch (err) { uStatus('Não foi possível concluir (' + (err.code || 'erro') + ').'); }
  });

  // Cadastro: usa uma segunda instância para não deslogar o administrador.
  let app2 = null;
  $('btnAddUser').addEventListener('click', async () => {
    const nome = $('u-nome').value.trim(), email = $('u-email').value.trim().toLowerCase(), fone = $('u-fone').value.trim(), senha = $('u-senha').value, papel = $('u-papel').value;
    if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { uStatus('Informe nome e um e-mail válido.'); return; }
    if (senha.length < 6) { uStatus('A senha inicial precisa ter pelo menos 6 caracteres.'); return; }
    const btn = $('btnAddUser'); btn.disabled = true; uStatus('Cadastrando…');
    try {
      app2 = app2 || initializeApp(C, 'cadastro');
      const auth2 = A.getAuth(app2);
      const cred = await A.createUserWithEmailAndPassword(auth2, email, senha);
      await F.setDoc(F.doc(db, 'usuarios', cred.user.uid), { nome, email, fone, papel, ativo: true, criado: F.serverTimestamp() });
      await A.signOut(auth2);
      ['u-nome', 'u-email', 'u-fone', 'u-senha'].forEach(id => $(id).value = ''); $('u-papel').value = 'vendedor';
      uStatus(`${nome} cadastrado. Passe para a pessoa o link do app, o e-mail e a senha inicial.`);
    } catch (err) {
      const c = err.code || '';
      uStatus(/email-already-in-use/.test(c) ? 'Esse e-mail já tem conta. Se a pessoa estava bloqueada, libere na lista abaixo.' :
        /weak-password/.test(c) ? 'Senha fraca: use pelo menos 6 caracteres.' : 'Não foi possível cadastrar (' + c + ').');
    } finally { btn.disabled = false; }
  });
}

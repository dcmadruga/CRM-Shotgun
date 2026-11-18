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
    if (fb.admin) ouvirUsuarios();
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
  function abaUsuarios(on) {
    $('viewUsers').hidden = !on;
    $('tabUsers').setAttribute('aria-selected', String(on));
    if (on) { $('viewProp').hidden = true; $('viewCfg').hidden = true; $('tabProp').setAttribute('aria-selected', 'false'); $('tabCfg').setAttribute('aria-selected', 'false'); }
  }
  $('tabUsers').addEventListener('click', () => abaUsuarios(true));
  $('tabProp').addEventListener('click', () => abaUsuarios(false));
  $('tabCfg').addEventListener('click', () => abaUsuarios(false));
  $('btnPdf').addEventListener('click', () => abaUsuarios(false), true);

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

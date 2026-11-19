// Módulo TASK: checklist de implantação. Roda para usuários TASK e administradores.
// Dados: tasks/{id} (cadastros com checklists) e taskTemplates/{id} (modelos de checklist).
let F, db, perfil, admin = false, unsubT = null, unsubM = null, unsubP = null, tasksOk = false, aprovadas = null;
let tasks = [], removidas = new Set(), templates = [], resps = [], aba = 'and';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dig = v => String(v || '').replace(/\D/g, '');
const hoje = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmtD = iso => { if (!iso) return ''; const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
const fmtTs = ts => ts && ts.toDate ? ts.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
const fmtCnpj = v => { const d = dig(v); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : (v || ''); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const statusDe = t => t.finalizado ? 'fin' : (t.start && t.start > hoje() ? 'fut' : 'and');
const STATUS = { and: 'Em andamento', fut: 'Futuro', fin: 'Finalizado' };
const progresso = t => { const it = (t.checklists || []).flatMap(c => c.itens || []); return { feitos: it.filter(i => i.ok).length, total: it.length }; };
const msg = t => { const el = $('tkMsg'); el.textContent = t || ''; el.hidden = !t; };

window.addEventListener('argo-perfil', e => { ({ F, db, perfil, admin } = e.detail); iniciar(); });
window.addEventListener('argo-sair', () => { if (unsubT) unsubT(); if (unsubM) unsubM(); if (unsubP) unsubP(); unsubT = unsubM = unsubP = null; aprovadas = null; tasksOk = false; tasks = []; templates = []; });

function iniciar() {
  if (unsubT) unsubT();
  if (unsubM) unsubM();
  if (unsubP) unsubP();
  tasksOk = false; aprovadas = null;
  unsubT = F.onSnapshot(F.collection(db, 'tasks'), qs => {
    const todos = qs.docs.map(d => ({ id: d.id, ...d.data() }));
    // Cards removidos pelo ADM ficam só como marca (removido: true), para o automático não recriar
    removidas = new Set(todos.filter(t => t.removido).flatMap(t => [t.id, t.propostaId]).filter(Boolean));
    tasks = todos.filter(t => !t.removido);
    tasksOk = true; desenhar(); sincronizar(); completarDatas();
  }, e => msg('Não foi possível carregar os cadastros (' + (e.code || 'erro') + ').'));
  unsubP = F.onSnapshot(F.query(F.collection(db, 'propostas'), F.where('status', '==', 'aprovada')), qs => {
    aprovadas = qs.docs.map(d => ({ id: d.id, ...d.data() })); sincronizar(); desenhar();
  }, () => {});
  unsubM = F.onSnapshot(F.collection(db, 'taskTemplates'), qs => {
    templates = qs.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    if ($('tkDlg').open && $('tkDlg').dataset.modo === 'templates') desenharTemplates();
  }, () => {});
  F.getDocs(F.collection(db, 'usuarios')).then(qs => {
    resps = qs.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.ativo && !u.excluido && (u.papel === 'task' || u.papel === 'adm'))
      .map(u => ({ uid: u.uid, nome: u.nome || u.email })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    desenhar();
  }).catch(() => { resps = [{ uid: perfil.uid, nome: perfil.nome || perfil.email }]; desenhar(); });
}

/* ---------- Lista ---------- */
function filtrados(ignorarAba) {
  const b = $('tkBusca').value.trim().toLowerCase(), bd = dig(b), rc = $('tkRespCad').value, rs = $('tkRespStart').value;
  return tasks.filter(t => (ignorarAba || aba === 'todos' || statusDe(t) === aba)
    && (!rc || t.respCadastro?.uid === rc) && (!rs || t.respStart?.uid === rs)
    && (!b || [t.apelido, t.razao, t.cidade].join(' ').toLowerCase().includes(b) || (bd.length >= 3 && dig(t.cnpj).includes(bd))));
}
function opcoesResp(sel, atual) {
  const lista = [...resps]; tasks.forEach(t => [t.respCadastro, t.respStart].forEach(r => { if (r?.uid && !lista.some(x => x.uid === r.uid)) lista.push(r); }));
  return lista.map(r => `<option value="${esc(r.uid)}"${r.uid === atual ? ' selected' : ''}>${esc(r.nome)}</option>`).join('');
}
function desenhar() {
  if (!$('tkGrid')) return;
  const rcV = $('tkRespCad').value, rsV = $('tkRespStart').value, base = tasks.length;
  $('tkRespCad').innerHTML = `<option value="">Todos (${base})</option>` + opcoesResp(null, rcV);
  $('tkRespStart').innerHTML = `<option value="">Todos (${base})</option>` + opcoesResp(null, rsV);
  const sem = filtrados(true);
  const n = { todos: sem.length, and: 0, fut: 0, fin: 0 }; sem.forEach(t => n[statusDe(t)]++);
  document.querySelectorAll('#tkAbas [data-aba]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.aba === aba)); b.querySelector('i').textContent = n[b.dataset.aba]; });
  const vis = filtrados().sort((a, b) => statusDe(a) === 'fin' && statusDe(b) === 'fin' ? (b.finalizadoEm?.seconds || 0) - (a.finalizadoEm?.seconds || 0) : String(a.start || '9').localeCompare(String(b.start || '9')));
  $('tkGrid').innerHTML = vis.length ? vis.map(cartao).join('') : `<p class="hint">${tasks.length ? 'Nenhum cadastro com esse filtro.' : 'Nenhum cadastro ainda. Use "Novo cadastro" ou "Importar das propostas".'}</p>`;
}
// Etapas da venda: proposta vinculada pelo id ou, nos cadastros manuais, pelo CNPJ
function propostaDe(t) {
  const ps = aprovadas || [];
  return ps.find(p => p.id === (t.propostaId || t.id)) || (dig(t.cnpj).length === 14 ? ps.filter(p => dig(p.cnpj) === dig(t.cnpj)).sort((a, b) => (b.aprovadoEm?.seconds || 0) - (a.aprovadoEm?.seconds || 0))[0] : null);
}
function etapas(t) {
  const p = propostaDe(t);
  if (!p) return `<div class="tketapas"><span class="tke none">${t.propostaId ? 'Proposta ainda não aprovada' : 'Sem proposta vinculada'}</span></div>`;
  const e = (n, nome, ok, quando, pend) => `<span class="tke ${ok ? 'ok' : pend ? 'pend' : 'none'}" title="${esc(nome + (quando ? ' em ' + quando : ''))}"><b>${ok ? '✓' : n}</b>${esc(nome)}${ok && quando ? `<small>${esc(quando)}</small>` : pend ? `<small>${esc(pend)}</small>` : ''}</span>`;
  const d = ts => ts && ts.toDate ? ts.toDate().toLocaleDateString('pt-BR') : '';
  return `<div class="tketapas">${e(1, 'Proposta', true, d(p.aprovadoEm)).replace('</span>', `<button type="button" class="tkver" data-tk="pdf" data-pid="${esc(p.id)}">Ver proposta</button></span>`)}${p.e2Em ? e(2, 'Dados', true, d(p.e2Em)).replace('</span>', `<button type="button" class="tkver" data-tk="e2" data-pid="${esc(p.id)}">Ver dados</button></span>`) : e(2, 'Dados', false, '', 'aguardando')}${(() => { const h = e(3, 'Contrato', !!p.ctAceitoEm, d(p.ctAceitoEm), p.ctAceitoEm ? '' : p.ctEm ? 'aguardando aceite' : p.e2Em ? 'a gerar' : ''); return p.ctEm ? h.replace('</span>', `<button type="button" class="tkver" data-tk="ct" data-pid="${esc(p.id)}">Ver contrato</button></span>`) : h; })()}${p.e4Em ? e(4, 'Ref. implantação', true, d(p.e4Em)).replace('</span>', `<button type="button" class="tkver" data-tk="e4" data-pid="${esc(p.id)}">Ver dados</button></span>`) : e(4, 'Ref. implantação', false, '', p.ctAceitoEm ? 'aguardando vendedor' : '')}</div>`;
}
function cartao(t) {
  const st = statusDe(t), pr = progresso(t), pct = pr.total ? Math.round(pr.feitos * 100 / pr.total) : 0;
  return `<article class="tkcard" data-id="${esc(t.id)}">
    <div class="tkpills"><span class="tkst ${st}">${STATUS[st]}</span>${admin ? '<button type="button" class="tkrem" data-tk="remover" title="Remover este card do TASK">Remover</button>' : ''}</div>
    ${t.dataBase || t.start ? `<div class="tkdatas">${t.dataBase ? `<span class="tkstart tkbase">Data da base: ${esc(fmtD(t.dataBase))}</span>` : ''}${t.start ? `<span class="tkstart">Data do start: ${esc(fmtD(t.start))}</span>` : ''}</div>` : ''}
    ${t.logo ? `<div class="tklogobox"><img class="tklogo" src="${esc(t.logo)}" alt="Logo de ${esc(t.apelido || t.razao || '')}"></div>` : ''}
    ${t.central ? '' : `<h3>${esc(t.apelido || t.razao || 'Sem nome')}</h3>
    ${t.razao && t.razao !== t.apelido ? `<div class="tkraz">${esc(t.razao)}</div>` : ''}`}
    ${t.central ? `<div class="tkcentral"><small>${t.central.tipo === 'simples' ? 'Posto simples' : 'Central'}</small>${t.central.tipo === 'simples' ? `<b>${esc(t.apelido || t.razao || '')}</b>` : t.central.nome ? `<b>${esc(t.central.nome)}</b>` : ''}${(t.central.filiais || []).map(f => `<div class="tkfil">${esc([f.cod, f.tipo, f.cnpj].filter(Boolean).join(' - '))}</div>`).join('')}${(t.central.filiais || []).length ? `<button type="button" class="tkver" data-tk="filiais">${t.central.tipo === 'simples' ? 'Dados do posto' : 'Dados das filiais'}</button>` : ''}</div>` : ''}
    ${etapas(t)}
    <div class="tkprog" title="${pr.feitos} de ${pr.total} itens concluídos"><span style="width:${pct}%"></span></div>
    <div class="tkprogtxt">${pr.total ? `${pr.feitos} de ${pr.total} itens concluídos (${pct}%)` : 'Nenhum checklist ainda'}</div>
    <div class="tkacts"><button type="button" data-tk="dados">Dados gerais</button><button type="button" class="primary" data-tk="check">Checklists</button></div>
  </article>`;
}

/* ---------- Diálogo ---------- */
const dlg = () => $('tkDlg');
function abrirDlg(modo, titulo, html) {
  const d = dlg(); d.dataset.modo = modo; $('tkDlgTit').textContent = titulo; $('tkDlgBody').innerHTML = html; $('tkDlgMsg').textContent = '';
  if (!d.open) d.showModal();
}
const dmsg = t => { $('tkDlgMsg').textContent = t || ''; };
let armado = null;
function confirmar(bt, chave, texto) { if (armado === chave) { armado = null; return true; } armado = chave; bt.textContent = texto; dmsg('Clique de novo para confirmar.'); setTimeout(() => { if (armado === chave) armado = null; }, 5000); return false; }

/* Dados gerais / novo cadastro */
function formDados(t) {
  t = t || { respCadastro: { uid: perfil.uid, nome: perfil.nome || perfil.email } };
  const sel = (id, r) => `<select id="${id}"><option value="">Ninguém</option>${opcoesResp(null, r?.uid)}</select>`;
  abrirDlg('dados', t.id ? 'Dados gerais' : 'Novo cadastro', `
    <form id="tkForm" class="tkform" data-id="${esc(t.id || '')}" novalidate>
      <label class="full">Nome do cadastro (como aparece no cartão)<input id="tkApelido" value="${esc(t.apelido || '')}" placeholder="Ex.: Rede - Filial 1 - POSTO CONTINENTAL" required></label>
      <label>CNPJ<span class="tkrow"><input id="tkCnpj" value="${esc(fmtCnpj(t.cnpj))}" inputmode="numeric" placeholder="00.000.000/0000-00"><button type="button" id="tkBuscaCnpj">Pesquisar</button></span></label>
      <label>Razão social<input id="tkRazao" value="${esc(t.razao || '')}"></label>
      <label>Cidade<input id="tkCidade" value="${esc(t.cidade || '')}"></label>
      <label>UF<input id="tkUf" value="${esc(t.uf || '')}" maxlength="2" style="text-transform:uppercase"></label>
      <label>E-mail<input id="tkEmail" type="email" value="${esc(t.email || '')}"></label>
      <label>Contato no posto<input id="tkContato" value="${esc(t.contato || '')}"></label>
      <label>Telefone / WhatsApp<input id="tkFone" inputmode="tel" value="${esc(t.fone || '')}"></label>
      <label>Data da base<input id="tkBase" type="date" value="${esc(t.dataBase || '')}"></label>
      <label>Data do start<input id="tkStart" type="date" value="${esc(t.start || '')}"></label>
      <label>Responsável pelo cadastro${sel('tkRC', t.respCadastro)}</label>
      <label>Responsável pelo start${sel('tkRS', t.respStart)}</label>
      <label class="full">Observações<textarea id="tkObs" rows="3">${esc(t.obs || '')}</textarea></label>
      ${t.id ? `<label class="chk full"><input type="checkbox" id="tkFin" ${t.finalizado ? 'checked' : ''}> Implantação finalizada</label>` : ''}
      ${t.propostaId ? `<p class="hint full">Importado da proposta nº ${esc(t.propostaNumero || '')}.</p>` : ''}
      <div class="tkacts full"><button type="submit" class="primary">Salvar</button>${t.id && admin ? '<button type="button" class="danger" id="tkExcluir">Excluir cadastro</button>' : ''}</div>
    </form>`);
  setTimeout(() => $('tkApelido').focus(), 30);
}
async function buscarCnpj() {
  const d = dig($('tkCnpj').value); if (d.length !== 14) { dmsg('Digite um CNPJ com 14 números.'); return; }
  dmsg('Pesquisando…');
  try {
    const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d); if (!r.ok) { dmsg(r.status === 404 ? 'CNPJ não encontrado na Receita.' : 'Não foi possível pesquisar agora.'); return; }
    const j = await r.json(), set = (id, v) => { if (v && !$(id).value) $(id).value = v; };
    $('tkCnpj').value = fmtCnpj(d); set('tkRazao', j.razao_social); set('tkCidade', j.municipio); set('tkUf', j.uf); set('tkEmail', j.email && String(j.email).toLowerCase());
    set('tkApelido', j.nome_fantasia || j.razao_social);
    const f = dig(j.ddd_telefone_1); if (f.length >= 10) set('tkFone', f.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3'));
    dmsg('Preenchido com os dados da Receita. Confira.');
  } catch (e) { dmsg('Não foi possível pesquisar agora.'); }
}
const respDe = id => { const v = $(id).value; if (!v) return null; const r = resps.find(x => x.uid === v) || tasks.flatMap(t => [t.respCadastro, t.respStart]).find(x => x?.uid === v); return r ? { uid: r.uid, nome: r.nome } : null; };
async function salvarDados(form) {
  const apelido = $('tkApelido').value.trim(); if (!apelido) { dmsg('Informe o nome do cadastro.'); $('tkApelido').focus(); return; }
  const dados = { apelido, cnpj: dig($('tkCnpj').value), razao: $('tkRazao').value.trim(), cidade: $('tkCidade').value.trim(), uf: $('tkUf').value.trim().toUpperCase(),
    email: $('tkEmail').value.trim(), contato: $('tkContato').value.trim(), fone: $('tkFone').value.trim(), start: $('tkStart').value, dataBase: $('tkBase').value, obs: $('tkObs').value.trim(),
    respCadastro: respDe('tkRC'), respStart: respDe('tkRS') };
  const id = form.dataset.id;
  try {
    if (id) {
      const t = tasks.find(x => x.id === id), fin = $('tkFin').checked;
      if (fin !== !!t.finalizado) { dados.finalizado = fin; dados.finalizadoEm = fin ? F.serverTimestamp() : null; }
      await F.updateDoc(F.doc(db, 'tasks', id), { ...dados, alteradoEm: F.serverTimestamp(), alteradoPor: perfil.nome || perfil.email });
    } else {
      await F.addDoc(F.collection(db, 'tasks'), { ...dados, finalizado: false, checklists: [], criado: F.serverTimestamp(), criadoPor: perfil.nome || perfil.email });
    }
    dlg().close(); msg(id ? 'Cadastro salvo.' : 'Cadastro criado. Agora adicione os checklists.');
  } catch (e) { dmsg('Não foi possível salvar (' + (e.code || 'erro') + ').'); }
}

/* Checklists */
function formCheck(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const pr = progresso(t);
  abrirDlg('check', 'Checklists · ' + (t.apelido || t.razao), `
    <div data-id="${esc(id)}" id="tkCk">
      <p class="hint">${pr.total ? `${pr.feitos} de ${pr.total} itens concluídos.` : 'Adicione um checklist a partir de um template.'}</p>
      ${(t.checklists || []).map((c, ci) => {
        const f = (c.itens || []).filter(i => i.ok).length;
        return `<section class="tkck" data-ci="${ci}"><h4>${esc(c.nome)} <span>${f}/${(c.itens || []).length}</span><button type="button" class="linkbtn" data-ck="delck">Remover</button></h4>
          <ul>${(c.itens || []).map((it, ii) => `<li><label class="chk"><input type="checkbox" data-ii="${ii}" ${it.ok ? 'checked' : ''}> <span>${esc(it.t)}</span></label>${it.ok && it.por ? `<small>${esc(it.por)}${it.em ? ' · ' + esc(new Date(it.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })) : ''}</small>` : ''}</li>`).join('')}</ul>
          <div class="tkrow"><input data-novo placeholder="Novo item neste checklist" aria-label="Novo item"><button type="button" data-ck="additem">Adicionar</button></div></section>`;
      }).join('')}
      <div class="tkrow tkadd"><select id="tkTpl">${templates.length ? templates.map(m => `<option value="${esc(m.id)}">${esc(m.nome)} (${(m.itens || []).length} itens)</option>`).join('') : '<option value="">Nenhum template. Crie em "Templates".</option>'}</select><button type="button" data-ck="addck" ${templates.length ? '' : 'disabled'}>Adicionar checklist</button></div>
    </div>`);
}
async function salvarChecklists(id, fn) {
  const t = tasks.find(x => x.id === id); const cl = JSON.parse(JSON.stringify(t.checklists || []));
  fn(cl);
  try {
    const pr = progresso({ checklists: cl }); const extra = {};
    if (pr.total && pr.feitos === pr.total && !t.finalizado) { extra.finalizado = true; extra.finalizadoEm = F.serverTimestamp(); }
    await F.updateDoc(F.doc(db, 'tasks', id), { checklists: cl, alteradoEm: F.serverTimestamp(), alteradoPor: perfil.nome || perfil.email, ...extra });
    t.checklists = cl; if (extra.finalizado) { t.finalizado = true; }
    formCheck(id); if (extra.finalizado) dmsg('Todos os itens concluídos: o cadastro foi marcado como finalizado.');
  } catch (e) { dmsg('Não foi possível salvar (' + (e.code || 'erro') + ').'); }
}

/* Templates */
function desenharTemplates(sel) {
  const atual = sel || $('tkTplSel')?.value || templates[0]?.id || '';
  const m = templates.find(x => x.id === atual);
  abrirDlg('templates', 'Templates de checklist', `
    <div class="tkform">
      <label class="full">Template<select id="tkTplSel">${templates.map(x => `<option value="${esc(x.id)}"${x.id === atual ? ' selected' : ''}>${esc(x.nome)}</option>`).join('')}<option value=""${!m ? ' selected' : ''}>+ Novo template</option></select></label>
      <label class="full">Nome<input id="tkTplNome" value="${esc(m?.nome || '')}" placeholder="Ex.: Implantação posto completo"></label>
      <label class="full">Itens (um por linha)<textarea id="tkTplItens" rows="12" placeholder="Instalar servidor&#10;Cadastrar produtos&#10;Treinar frentistas">${esc((m?.itens || []).join('\n'))}</textarea></label>
      <div class="tkacts full"><button type="button" class="primary" data-tp="salvar">Salvar template</button>${m ? '<button type="button" class="danger" data-tp="excluir">Excluir template</button>' : ''}</div>
      <p class="hint full">Mudar um template não altera os checklists que já foram adicionados aos cadastros.</p>
    </div>`);
}

/* Importar das propostas aprovadas */
async function formImportar() {
  abrirDlg('importar', 'Importar das propostas', '<p class="hint">Carregando propostas aprovadas…</p>');
  try {
    const qs = await F.getDocs(F.query(F.collection(db, 'propostas'), F.where('status', '==', 'aprovada')));
    const ja = new Set(tasks.map(t => t.propostaId).filter(Boolean));
    const ps = qs.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !ja.has(p.id)).sort((a, b) => (b.aprovadoEm?.seconds || 0) - (a.aprovadoEm?.seconds || 0));
    $('tkDlgBody').innerHTML = ps.length ? `<p class="hint">Quando o vendedor conclui a Etapa 4 (Dados Referência Implantação), o cadastro é criado sozinho. Use esta lista para trazer antes uma proposta aprovada que ainda não chegou nessa fase, ou para trazer de volta um card removido.</p>
      <ul class="tkimp">${ps.map(p => `<li><div><b>${esc(p.cliente)}</b><small>Nº ${esc(p.numero)} · ${esc(p.cidade || '')} · ${esc(p.vendedor || '')}${p.e2Em ? ' · dados complementares recebidos' : ''}</small></div><button type="button" data-imp="${esc(p.id)}">Importar</button></li>`).join('')}</ul>`
      : '<p class="hint">Nenhuma proposta aprovada pendente de importação.</p>';
  } catch (e) { $('tkDlgBody').innerHTML = `<p class="hint">Não foi possível carregar as propostas (${esc(e.code || 'erro')}).</p>`; }
}
// Datas da Etapa 4 (pelo nome do campo): "Data da base" e a data do start
const isoDe = v => { v = String(v || ''); let m = v.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`; m = v.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (!m) return ''; const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
async function datasE4(pid) {
  try {
    const r = await F.getDoc(F.doc(db, 'propostas', pid, 'etapa4', 'dados')); if (!r.exists()) return null;
    const c = Object.entries(r.data().campos || {});
    // Só aceita valores que são uma data inteira (evita pegar números de links, por exemplo)
    const ehData = v => /^\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\s*$/.test(String(v || ''));
    const achar = (...res) => { for (const re of res) { const e = c.find(([k, v]) => re.test(k) && ehData(v)); if (e) return isoDe(e[1]); } return ''; };
    // Central: nome da central e filiais (F1 - Posto - CNPJ), quando a Etapa 4 tiver filiais
    const val = r.data().valores || {}, filiais = [].concat(...Object.keys(val).filter(k => /__fil$/.test(k) && Array.isArray(val[k])).map(k => val[k]));
    const nc = c.find(([k, v]) => /nome.*central|central.*nome/i.test(k) && v && !/\n/.test(v)) || c.find(([k, v]) => /central/i.test(k) && !/filia/i.test(k) && v && !/\n/.test(v) && !/^\s*central\s*$/i.test(v));
    const central = filiais.length || nc ? { nome: nc ? String(nc[1]).trim() : '', filiais: filiais.map(f => ({ cod: f.cod || '', tipo: f.tipo || '', cnpj: f.cnpj || '', razao: f.razao || '', info: f.info || null, dados: f.dados || null })) } : null;
    const simples = !central && c.some(([k, v]) => /^\s*(posto\s+)?simples\s*$/i.test(String(v || '')));
    return { dataBase: achar(/da[dt]a.*base|base.*da[dt]a/i, /base/i), start: achar(/start|in[ií]cio da implanta/i), central, simples };
  } catch (e) { return null; }
}
// Logo do posto ou rede: anexo da Etapa 2 com "logo" no nome do campo, reduzido para uma miniatura
async function logoDe(pid) {
  try {
    const an = await F.getDocs(F.collection(db, 'propostas', pid, 'anexos'));
    const a = an.docs.map(d => ({ id: d.id, ...d.data() })).find(x => /logo/i.test(x.campo || '') && /^image\//.test(x.tipo || ''));
    if (!a) return '';
    const ps = await F.getDocs(F.collection(db, 'propostas', pid, 'anexos', a.id, 'partes'));
    const src = `data:${a.tipo};base64,` + ps.docs.sort((x, y) => x.id.localeCompare(y.id)).map(x => x.data().d).join('');
    const img = await new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = src; });
    // Corta as bordas brancas ou transparentes, para o logo ocupar o espaço todo
    const W = img.naturalWidth, H = img.naturalHeight, s0 = Math.min(1, 800 / Math.max(W, H)), w0 = Math.max(1, Math.round(W * s0)), h0 = Math.max(1, Math.round(H * s0));
    const t = document.createElement('canvas'); t.width = w0; t.height = h0; const g = t.getContext('2d'); g.drawImage(img, 0, 0, w0, h0);
    const px = g.getImageData(0, 0, w0, h0).data; let x0 = w0, y0 = h0, x1 = -1, y1 = -1;
    for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) { const i = (y * w0 + x) * 4; if (px[i + 3] > 16 && (px[i] < 235 || px[i + 1] < 235 || px[i + 2] < 235)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = w0 - 1; y1 = h0 - 1; }
    const m = 4; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w0 - 1, x1 + m); y1 = Math.min(h0 - 1, y1 + m);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1, k = Math.min(1, 360 / Math.max(cw, ch)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(cw * k)); c.height = Math.max(1, Math.round(ch * k));
    c.getContext('2d').drawImage(t, x0, y0, cw, ch, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  } catch (e) { return ''; }
}
// Razão social das filiais que vieram sem ela: aproveita a do card ou consulta pelo CNPJ
// Posto simples: mesmo quadro da Central, com o CNPJ do próprio posto
const baseSimples = (d, cnpj) => { if (d && !d.central && d.simples && dig(cnpj).length === 14) d.central = { tipo: 'simples', nome: '', filiais: [{ cod: '', tipo: 'Posto', cnpj: fmtCnpj(cnpj), razao: '', info: null }] }; };
async function razoesFiliais(c, antigo) {
  const ja = {}; ((antigo && antigo.filiais) || []).forEach(f => { if (f.info) ja[dig(f.cnpj)] = f.info; });
  for (const f of c.filiais || []) {
    const d = dig(f.cnpj); if (f.info || d.length !== 14) continue;
    f.info = ja[d] || (window.cnpjInfo ? await window.cnpjInfo(d) : null);
    if (!f.razao && f.info) f.razao = f.info.razao || '';
  }
}
// Dados das filiais da Central, vindos da consulta de CNPJ feita na Etapa 4
function verFiliais(t) {
  const c = (t && t.central) || {}, fd = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : v || ''; };
  const tel = v => { v = dig(v); return v.length >= 10 ? v.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : v; };
  const linha = (l, v) => v ? `<div><small>${l}</small>${esc(v)}</div>` : '';
  abrirDlg('filiais', c.tipo === 'simples' ? 'Posto - ' + (t.apelido || t.razao || '') : 'Filiais' + (c.nome ? ' - ' + c.nome : ''), (c.filiais || []).map(f => { const i = f.info || {}; return `<div class="tkfilinfo"><h4>${esc([f.cod, f.tipo].filter(Boolean).join(' - '))}<span>${esc(f.cnpj)}</span></h4>
    ${linha('Razão social', f.razao || i.razao)}${linha('Nome fantasia', i.fantasia)}${linha('Situação', i.situacao)}${linha('Abertura', fd(i.abertura))}${linha('Atividade principal', i.atividade)}${linha('Endereço', [i.endereco, [i.municipio, i.uf].filter(Boolean).join(' / '), i.cep ? 'CEP ' + String(i.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2') : ''].filter(Boolean).join(' - '))}${linha('Telefone', tel(i.telefone))}${linha('E-mail', i.email)}
    ${Object.keys(f.dados || {}).length ? `<div class="tkfildados"><small>Dados da implantação</small><table>${Object.entries(f.dados).map(([k, x]) => `<tr><td>${esc(k)}</td><td>${esc(x)}</td></tr>`).join('')}</table></div>` : ''}
    ${f.info ? '' : '<p class="hint">Consulta do CNPJ ainda não disponível. Abra o TASK de novo em alguns instantes.</p>'}</div>`; }).join('') || '<p class="hint">Nenhuma filial informada.</p>');
}
const completando = new Set();
function completarDatas() {
  // A Central é conferida uma vez por sessão, para refletir alterações feitas depois na Etapa 4
  tasks.filter(t => t.propostaId && !completando.has(t.id)).forEach(t => {
    completando.add(t.id);
    (async () => {
      const up = {};
      { const d = await datasE4(t.propostaId); baseSimples(d, t.cnpj); if (d && d.central) await razoesFiliais(d.central, t.central); const sig = c => c ? [c.tipo || '', c.nome, ...(c.filiais || []).map(f => [f.cod, f.tipo, f.cnpj, f.razao || '', f.info ? 1 : 0, JSON.stringify(Object.entries(f.dados || {}).sort())].join('|'))].join('\n') : ''; if (d && sig(d.central) !== sig(t.central)) up.central = d.central || null; }
      if (!t.dataBase) { const d = await datasE4(t.propostaId); if (d && d.dataBase) up.dataBase = d.dataBase; else if (t.dataBase === undefined) up.dataBase = ''; if (!t.start && d && d.start) up.start = d.start; }
      if (t.logoV !== 2) { up.logo = await logoDe(t.propostaId); up.logoV = 2; }
      if (Object.keys(up).length) await F.updateDoc(F.doc(db, 'tasks', t.id), up);
    })().catch(() => {});
  });
}
// Cria o cadastro a partir da proposta (id do cadastro = id da proposta, para não duplicar)
async function criarDaProposta(pid, auto) {
  const ref = F.doc(db, 'tasks', pid);
  const atual = await F.getDoc(ref);
  // Removido pelo ADM: o automático respeita a remoção, a importação manual traz de volta
  if (atual.exists() && (auto || !atual.data().removido)) return null;
  const p = (await F.getDoc(F.doc(db, 'propostas', pid))).data();
  let v = {}; try { const r = await F.getDoc(F.doc(db, 'propostas', pid, 'etapa2', 'resposta')); if (r.exists()) v = r.data().valores || {}; } catch (e) {}
  const sc = window.splitCidade ? window.splitCidade(p.cidade) : { cidade: p.cidade || '', uf: '' };
  const d4 = (await datasE4(pid)) || {}; baseSimples(d4, v.cnpj || p.cnpj); if (d4.central) await razoesFiliais(d4.central);
  const novo = { dataBase: d4.dataBase || '', central: d4.central || null, logo: await logoDe(pid), logoV: 2,
    apelido: v.fantasia || p.cliente || '', razao: v.razao || p.cliente || '', cnpj: dig(v.cnpj || p.cnpj), cidade: v.cidade || sc.cidade, uf: (v.uf || sc.uf || '').toUpperCase(),
    email: v.respEmail || v.finEmail || '', contato: v.respNome || p.ctAceitoNome || p.contato || '', fone: v.respFone || p.fone || '',
    respCadastro: auto ? null : { uid: perfil.uid, nome: perfil.nome || perfil.email }, respStart: null, start: d4.start || v.dataImpl || '', obs: v.obs || '',
    propostaId: pid, propostaNumero: p.numero || '', vendedor: p.vendedor || '', finalizado: false, checklists: [],
    criado: F.serverTimestamp(), criadoPor: auto ? 'Automático (Etapa 4 concluída)' : (perfil.nome || perfil.email), auto: !!auto
  };
  await F.setDoc(ref, novo);
  return novo;
}
// Remove o card (só ADM). Se veio de proposta, deixa a marca para o automático não recriar; a proposta volta para "Importar".
async function removerTask(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const pid = t.propostaId || '';
  if (pid || t.auto) await F.setDoc(F.doc(db, 'tasks', id), { removido: true, propostaId: pid || id, apelido: t.apelido || t.razao || '', removidoEm: F.serverTimestamp(), removidoPor: perfil.nome || perfil.email });
  else await F.deleteDoc(F.doc(db, 'tasks', id));
  return t;
}
let armadoCard = null;
async function cliqueRemover(b, id) {
  if (!admin) return;
  if (armadoCard !== id) { armadoCard = id; b.textContent = 'Confirmar remoção'; b.classList.add('armado'); setTimeout(() => { if (armadoCard === id) { armadoCard = null; b.textContent = 'Remover'; b.classList.remove('armado'); } }, 5000); return; }
  armadoCard = null; b.disabled = true; b.textContent = 'Removendo…';
  try { const t = await removerTask(id); msg(`${t?.apelido || 'Card'} removido. A proposta ficou disponível em "Importar" de novo.`); }
  catch (er) { b.disabled = false; b.textContent = 'Remover'; msg('Não foi possível remover (' + (er.code || 'erro') + ').'); }
}
async function importar(pid, bt) {
  bt.disabled = true; bt.textContent = 'Importando…';
  try { const n = await criarDaProposta(pid, false); bt.closest('li').remove(); dmsg(n ? `${n.apelido} importado.` : 'Essa proposta já tinha virado cadastro.'); }
  catch (e) { bt.disabled = false; bt.textContent = 'Importar'; dmsg('Não foi possível importar (' + (e.code || 'erro') + ').'); }
}
// Alimentação automática: Etapa 4 concluída (dados de referência salvos pelo vendedor) vira cadastro no TASK
const criando = new Set();
function sincronizar() {
  if (!tasksOk || !aprovadas) return;
  const tem = new Set([...tasks.flatMap(t => [t.id, t.propostaId]).filter(Boolean), ...removidas]);
  aprovadas.filter(p => p.ctAceitoEm && p.e4Em && !tem.has(p.id) && !criando.has(p.id)).forEach(p => {
    criando.add(p.id);
    criarDaProposta(p.id, true).then(n => { if (n) msg(`Novo cadastro automático: ${n.apelido} (Etapa 4 concluída).`); })
      .catch(e => console.warn('TASK automático', p.id, e)).finally(() => criando.delete(p.id));
  });
}

async function verProposta(pid, bt) {
  const janela = window.open('', '_blank'); const txt = bt.textContent; bt.disabled = true; bt.textContent = 'Abrindo…';
  try {
    const snap = await F.getDoc(F.doc(db, 'propostas', pid, 'arquivo', 'pdf'));
    if (!snap.exists()) throw new Error('PDF não encontrado');
    const bin = atob(snap.data().b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' }));
    if (janela && !janela.closed) janela.location.href = url; else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (e) { if (janela) janela.close(); msg('Não foi possível abrir a proposta (' + (e.code || e.message) + ').'); }
  finally { bt.disabled = false; bt.textContent = txt; }
}

async function verDados(pid) {
  const p = (aprovadas || []).find(x => x.id === pid) || {};
  abrirDlg('e2', 'Dados complementares · ' + (p.cliente || ''), '<p class="hint">Carregando…</p>');
  try {
    const [r, an] = await Promise.all([F.getDoc(F.doc(db, 'propostas', pid, 'etapa2', 'resposta')), F.getDocs(F.collection(db, 'propostas', pid, 'anexos'))]);
    const d = r.exists() ? r.data() : { campos: {} };
    const arqs = an.docs.map(x => ({ id: x.id, ...x.data() }));
    $('tkDlgBody').innerHTML = `<div id="tkE2" data-pid="${esc(pid)}">
      ${d.em ? `<p class="hint">Enviado pelo cliente em ${esc(fmtTs(d.em))}.</p>` : ''}
      <table class="tkdados"><tbody>${Object.entries(d.campos || {}).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('') || '<tr><td>Sem respostas salvas.</td></tr>'}</tbody></table>
      ${arqs.length ? `<h4 class="tkh4">Anexos</h4><div class="tkanexos">${arqs.map(x => `<button type="button" data-anexo="${esc(x.id)}">⬇ ${esc(x.nome)} <small>${esc(x.campo || '')} · ${(Number(x.tamanho || 0) / 1048576).toFixed(1)} MB</small></button>`).join('')}</div>` : ''}
      <div class="tkacts" style="margin-top:12px"><button type="button" id="tkE2Copiar">Copiar dados</button></div></div>`;
    $('tkE2').dataset.texto = d.texto || Object.entries(d.campos || {}).map(([k, v]) => k + ': ' + v).join('\n');
  } catch (e) { $('tkDlgBody').innerHTML = `<p class="hint">Não foi possível carregar (${esc(e.code || e.message)}).</p>`; }
}
async function verContrato(pid, bt) {
  const janela = window.open('', '_blank'); const txt = bt.textContent; bt.disabled = true; bt.textContent = 'Abrindo…';
  try {
    const p = (aprovadas || []).find(x => x.id === pid) || (await F.getDoc(F.doc(db, 'propostas', pid))).data();
    const snap = await F.getDoc(F.doc(db, 'propostas', pid, 'arquivo', 'contrato'));
    if (!snap.exists()) throw new Error('contrato não encontrado');
    const d = snap.data(), C = typeof CFG !== 'undefined' ? CFG : {};
    const doc = window.contratoPdf({ titulo: d.titulo, texto: d.texto, numero: p.numero, logo: typeof logoAtual === 'function' ? logoAtual() : undefined, logoW: C.logoW, logoH: C.logoH,
      aceite: p.ctAceitoEm ? { nome: p.ctAceitoNome, cpf: p.ctAceitoCpf, cargo: p.ctAceitoCargo, em: fmtTs(p.ctAceitoEm), cliente: p.cliente } : null });
    const url = URL.createObjectURL(doc.output('blob'));
    if (janela && !janela.closed) janela.location.href = url; else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (e) { if (janela) janela.close(); msg('Não foi possível abrir o contrato (' + (e.code || e.message) + ').'); }
  finally { bt.disabled = false; bt.textContent = txt; }
}
async function verRef(pid) {
  const p = (aprovadas || []).find(x => x.id === pid) || {};
  abrirDlg('e4', 'Dados referência implantação · ' + (p.cliente || ''), '<p class="hint">Carregando…</p>');
  try {
    const r = await F.getDoc(F.doc(db, 'propostas', pid, 'etapa4', 'dados')); const d = r.exists() ? r.data() : { campos: {} };
    $('tkDlgBody').innerHTML = `${d.por ? `<p class="hint">Preenchido por ${esc(d.por)}${d.em ? ' em ' + esc(fmtTs(d.em)) : ''}.</p>` : ''}
      <table class="tkdados"><tbody>${Object.entries(d.campos || {}).map(([k, v]) => `<tr><th>${esc(k)}</th><td style="white-space:pre-wrap">${esc(v)}</td></tr>`).join('') || '<tr><td>Nada preenchido.</td></tr>'}</tbody></table>`;
  } catch (e) { $('tkDlgBody').innerHTML = `<p class="hint">Não foi possível carregar (${esc(e.code || e.message)}).</p>`; }
}
async function baixarAnexo(pid, aid, bt) {
  bt.disabled = true;
  try {
    const meta = (await F.getDoc(F.doc(db, 'propostas', pid, 'anexos', aid))).data();
    const ps = await F.getDocs(F.collection(db, 'propostas', pid, 'anexos', aid, 'partes'));
    const b64 = ps.docs.sort((x, y) => x.id.localeCompare(y.id)).map(x => x.data().d).join('');
    const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: meta.tipo || 'application/octet-stream' }));
    const l = document.createElement('a'); l.href = url; l.download = meta.nome || 'anexo'; document.body.appendChild(l); l.click(); l.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) { dmsg('Não foi possível baixar o anexo (' + (e.code || e.message) + ').'); }
  finally { bt.disabled = false; }
}

/* ---------- Eventos ---------- */
let ligado = false;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
function ligar() {
  if (ligado || !$('tkGrid')) return; ligado = true;
  $('tkBusca').addEventListener('input', desenhar);
  $('tkRespCad').addEventListener('change', desenhar);
  $('tkRespStart').addEventListener('change', desenhar);
  $('tkAbas').addEventListener('click', e => { const b = e.target.closest('[data-aba]'); if (!b) return; aba = b.dataset.aba; desenhar(); });
  $('tkNovo').addEventListener('click', () => formDados());
  $('tkTemplates').addEventListener('click', () => desenharTemplates());
  $('tkImportar').addEventListener('click', formImportar);
  $('tkGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-tk]'); if (!b) return; const id = b.closest('[data-id]').dataset.id;
    if (b.dataset.tk === 'remover') return cliqueRemover(b, id);
    if (b.dataset.tk === 'pdf') return verProposta(b.dataset.pid, b);
    if (b.dataset.tk === 'e2') return verDados(b.dataset.pid);
    if (b.dataset.tk === 'ct') return verContrato(b.dataset.pid, b);
    if (b.dataset.tk === 'e4') return verRef(b.dataset.pid);
    if (b.dataset.tk === 'filiais') return verFiliais(tasks.find(t => t.id === id));
    if (b.dataset.tk === 'dados') formDados(tasks.find(t => t.id === id)); else formCheck(id);
  });
  $('tkDlgFechar').addEventListener('click', () => dlg().close());
  dlg().addEventListener('click', e => { if (e.target === dlg()) dlg().close(); });
  $('tkDlgBody').addEventListener('submit', e => { if (e.target.id === 'tkForm') { e.preventDefault(); salvarDados(e.target); } });
  $('tkDlgBody').addEventListener('change', async e => {
    if (e.target.id === 'tkTplSel') { desenharTemplates(e.target.value || '__novo'); return; }
    const ii = e.target.dataset.ii; if (ii == null) return;
    const id = $('tkCk').dataset.id, ci = +e.target.closest('[data-ci]').dataset.ci, ok = e.target.checked;
    await salvarChecklists(id, cl => { const it = cl[ci].itens[+ii]; it.ok = ok; it.por = ok ? (perfil.nome || perfil.email) : ''; it.em = ok ? Date.now() : null; });
  });
  $('tkDlgBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-novo]')) { e.preventDefault(); e.target.closest('.tkck').querySelector('[data-ck=additem]').click(); } });
  $('tkDlgBody').addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'tkBuscaCnpj') return buscarCnpj();
    if (b.dataset.anexo) return baixarAnexo($('tkE2').dataset.pid, b.dataset.anexo, b);
    if (b.id === 'tkE2Copiar') { try { await navigator.clipboard.writeText($('tkE2').dataset.texto || ''); dmsg('Dados copiados.'); } catch (_) { dmsg('Não foi possível copiar.'); } return; }
    if (b.id === 'tkExcluir') { const id = $('tkForm').dataset.id; if (!confirmar(b, 'task' + id, 'Confirmar exclusão')) return; try { await removerTask(id); dlg().close(); msg('Cadastro excluído.'); } catch (er) { dmsg('Não foi possível excluir (' + (er.code || 'erro') + ').'); } return; }
    if (b.dataset.imp) return importar(b.dataset.imp, b);
    if (b.dataset.ck) {
      const id = $('tkCk').dataset.id, sec = b.closest('[data-ci]'), ci = sec ? +sec.dataset.ci : -1;
      if (b.dataset.ck === 'addck') { const m = templates.find(x => x.id === $('tkTpl').value); if (!m) return; return salvarChecklists(id, cl => cl.push({ id: uid(), nome: m.nome, itens: (m.itens || []).map(t => ({ t, ok: false })) })); }
      if (b.dataset.ck === 'additem') { const inp = sec.querySelector('[data-novo]'), t = inp.value.trim(); if (!t) { inp.focus(); return; } return salvarChecklists(id, cl => cl[ci].itens.push({ t, ok: false })); }
      if (b.dataset.ck === 'delck') { if (!confirmar(b, 'ck' + id + ci, 'Confirmar remoção')) return; return salvarChecklists(id, cl => cl.splice(ci, 1)); }
    }
    if (b.dataset.tp) {
      const sel = $('tkTplSel').value, m = templates.find(x => x.id === sel);
      if (b.dataset.tp === 'salvar') {
        const nome = $('tkTplNome').value.trim(), itens = $('tkTplItens').value.split('\n').map(x => x.trim()).filter(Boolean);
        if (!nome || !itens.length) { dmsg('Informe o nome e pelo menos um item.'); return; }
        try {
          if (m) { await F.updateDoc(F.doc(db, 'taskTemplates', m.id), { nome, itens, alteradoEm: F.serverTimestamp() }); dmsg('Template salvo.'); }
          else { const r = await F.addDoc(F.collection(db, 'taskTemplates'), { nome, itens, criado: F.serverTimestamp() }); if (!templates.some(x => x.id === r.id)) templates.push({ id: r.id, nome, itens }); desenharTemplates(r.id); dmsg('Template criado.'); }
        } catch (er) { dmsg('Não foi possível salvar (' + (er.code || 'erro') + ').'); }
      }
      if (b.dataset.tp === 'excluir' && m) { if (!confirmar(b, 'tp' + m.id, 'Confirmar exclusão')) return; try { await F.deleteDoc(F.doc(db, 'taskTemplates', m.id)); templates = templates.filter(x => x.id !== m.id); desenharTemplates(templates[0]?.id || '__novo'); dmsg('Template excluído.'); } catch (er) { dmsg('Não foi possível excluir (' + (er.code || 'erro') + ').'); } }
    }
  });
}

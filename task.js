// Módulo TASK: checklist de implantação. Roda para usuários TASK e administradores.
// Dados: tasks/{id} (cadastros com checklists) e taskTemplates/{id} (modelos de checklist).
let F, db, perfil, admin = false, unsubT = null, unsubM = null, unsubP = null, unsubMod = null, tasksOk = false, aprovadas = null;
// Módulos do TASK (Implantação, TEF/PIX…): configurados em Parâmetros Módulos TASK
let MODS = window.MODULOS_PADRAO ? JSON.parse(JSON.stringify(window.MODULOS_PADRAO)) : { secoes: [] };
let tasks = [], removidas = new Set(), templates = [], resps = [], aba = 'and', minhas = false, setorVer = null;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dig = v => String(v || '').replace(/\D/g, '');
const hoje = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmtD = iso => { if (!iso) return ''; const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
const fmtTs = ts => ts && ts.toDate ? ts.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
const fmtCnpj = v => { const d = dig(v); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : (v || ''); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// Status de progressão manual (escolhido em Dados gerais); novo cadastro começa como Futuro
const statusDe = t => STATUS[t.status] ? t.status : t.finalizado ? 'fin' : 'fut';
const STATUS = { and: 'Em andamento', fut: 'Futuro', fin: 'Finalizado' };
const progresso = t => { const it = (t.checklists || []).flatMap(c => c.itens || []); return { feitos: it.filter(i => i.ok).length, total: it.length }; };
// Estados de atuação (Administração → Usuários): quem é vendedor e não é administrador vê só os cards de clientes
// dos seus Estados. Administrador e equipe só TASK (sem perfil de vendedor) continuam vendo todos.
// A UF do cliente vem do card, da cidade ("Cuiabá - MT"), das filiais da Central e da proposta vinculada.
const UFS_BR = new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' '));
let meusUfs = null; // null = vê todos
const ufCidade = c => { const m = String(c || '').trim().match(/[-\/,]\s*([A-Za-z]{2})$/); return m ? m[1].toUpperCase() : ''; };
function ufsDe(t) {
  const out = new Set(), add = u => { u = String(u || '').trim().toUpperCase(); if (UFS_BR.has(u)) out.add(u); };
  add(t.uf); add(ufCidade(t.cidade));
  ((t.central && t.central.filiais) || []).forEach(f => { add(f.uf); add(f.info && f.info.uf); add(ufCidade(f.cidade)); });
  const p = propostaDe(t); if (p) { add(p.uf); add(ufCidade(p.cidade)); }
  return [...out];
}
const visivel = t => !meusUfs || ufsDe(t).some(u => meusUfs.includes(u));
const vistos = () => tasks.filter(visivel);
const msg = t => { const el = $('tkMsg'); el.textContent = t || ''; el.hidden = !t; };

window.addEventListener('argo-perfil', e => { ({ F, db, perfil, admin } = e.detail); iniciar(); });
window.addEventListener('argo-sair', () => { clearTimeout(religT); clearTimeout(religP); if (unsubT) unsubT(); if (unsubM) unsubM(); if (unsubP) unsubP(); if (unsubMod) unsubMod(); unsubT = unsubM = unsubP = unsubMod = null; aprovadas = null; tasksOk = false; tasks = []; templates = []; });

// Ouvintes do quadro: se o banco recusar (ex.: cota diária de leituras esgotada), o Firestore encerra o ouvinte
// para sempre e o automático parava sem aviso até recarregar a página. Agora ele tenta de novo sozinho.
let religT = null, religP = null, tasksErro = false;
function ouvirTasks() {
  if (unsubT) unsubT(); clearTimeout(religT);
  unsubT = F.onSnapshot(F.collection(db, 'tasks'), qs => {
    const todos = qs.docs.map(d => ({ id: d.id, ...d.data() }));
    // Cards removidos pelo ADM ficam só como marca (removido: true), para o automático não recriar
    removidas = new Set(todos.filter(t => t.removido).flatMap(t => [t.id, t.propostaId]).filter(Boolean));
    tasks = todos.filter(t => !t.removido);
    if (window.modulosHerdar) tasks.forEach(t => window.modulosHerdar(t, MODS)); // andamento lançado no módulo PIX da v271 volta para o TEF / PIX
    if (tasksErro) { tasksErro = false; msg(''); }
    tasksOk = true; desenhar(); sincronizar(); completarDatas();
  }, e => { tasksErro = true; msg('Não foi possível carregar os cadastros (' + (e.code || 'erro') + '). Tentando de novo em 1 minuto…'); console.warn('TASK: cards', e); unsubT = null; if (perfil) religT = setTimeout(() => { if (perfil && !unsubT) ouvirTasks(); }, 60000); });
}
function ouvirAprovadas() {
  if (unsubP) unsubP(); clearTimeout(religP);
  unsubP = F.onSnapshot(F.query(F.collection(db, 'propostas'), F.where('status', '==', 'aprovada')), qs => {
    aprovadas = qs.docs.map(d => ({ id: d.id, ...d.data() })); sincronizar(); desenhar();
  }, e => { console.warn('TASK: propostas aprovadas', e); unsubP = null; if (perfil) religP = setTimeout(() => { if (perfil && !unsubP) ouvirAprovadas(); }, 60000); });
}
function iniciar() {
  const papeis = Array.isArray(perfil.papeis) && perfil.papeis.length ? perfil.papeis : [perfil.papel || 'vendedor'];
  meusUfs = admin || !papeis.includes('vendedor') ? null : (Array.isArray(perfil.estados) ? perfil.estados : []).map(u => String(u).toUpperCase());
  if (unsubT) unsubT();
  if (unsubM) unsubM();
  if (unsubP) unsubP();
  tasksOk = false; aprovadas = null;
  ouvirTasks(); ouvirAprovadas();
  if (unsubMod) unsubMod();
  unsubMod = F.onSnapshot(F.doc(db, 'config', 'modulos'), d => { try { const j = d && d.exists && d.exists() && d.data().json; if (j) MODS = JSON.parse(j); if (window.modulosCompletar) window.modulosCompletar(MODS); if (window.modulosHerdar) tasks.forEach(t => window.modulosHerdar(t, MODS)); } catch (e) {} desenhar(); if ($('tkDlg').open && $('tkDlg').dataset.modo === 'mods') formMods($('tkMods').dataset.id, $('tkMods').dataset.mid); }, () => {});
  unsubM = F.onSnapshot(F.collection(db, 'taskTemplates'), qs => {
    templates = qs.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    if ($('tkDlg').open && $('tkDlg').dataset.modo === 'templates') desenharTemplates();
  }, () => {});
  F.getDocs(F.collection(db, 'usuarios')).then(qs => {
    todosU = qs.docs.map(d => ({ uid: d.id, nome: d.data().nome || d.data().email || '' }));
    resps = qs.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.ativo && !u.excluido && (u.papel === 'task' || u.papel === 'adm' || (u.papeis || []).some(x => x === 'task' || x === 'adm')))
      .map(u => ({ uid: u.uid, nome: u.nome || u.email })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    desenhar();
  }).catch(() => { resps = [{ uid: perfil.uid, nome: perfil.nome || perfil.email }]; desenhar(); });
}

/* ---------- Lista ---------- */
function filtrados(ignorarAba) {
  const b = $('tkBusca').value.trim().toLowerCase(), bd = dig(b), rc = $('tkRespCad').value, rs = $('tkRespStart').value;
  return vistos().filter(t => (ignorarAba || aba === 'todos' || (aba === 'prep' ? statusDe(t) !== 'fin' && !pronto(t) : statusDe(t) === aba))
    && (!rc || t.respCadastro?.uid === rc) && (!rs || t.respStart?.uid === rs)
    && (!b || [t.apelido, t.razao, t.cidade].join(' ').toLowerCase().includes(b) || (bd.length >= 3 && dig(t.cnpj).includes(bd))));
}
function opcoesResp(sel, atual) {
  const lista = [...resps]; vistos().forEach(t => [t.respCadastro, t.respStart].forEach(r => { if (r?.uid && !lista.some(x => x.uid === r.uid)) lista.push(r); }));
  return lista.map(r => `<option value="${esc(r.uid)}"${r.uid === atual ? ' selected' : ''}>${esc(r.nome)}</option>`).join('');
}
// Minhas tarefas: processos ainda não finalizados dos módulos do meu setor, em todos os cards que não estão finalizados
function minhasTarefas() {
  const top = (MODS.secoes || []).filter(m => !m.pai), meus = meusSetores().filter(id => top.some(m => m.id === id));
  if (setorVer === null) setorVer = meus.length === 1 ? meus[0] : meus.length ? 'meus' : '';
  const alvo = setorVer === 'meus' ? meus : setorVer ? [setorVer] : top.map(m => m.id);
  const mods = (MODS.secoes || []).filter(m => alvo.includes(topDe(m).id)), hj = hoje(), b = $('tkBusca').value.trim().toLowerCase(), bd = dig(b), itens = [];
  vistos().filter(t => statusDe(t) !== 'fin' && (!b || [t.apelido, t.razao, t.cidade].join(' ').toLowerCase().includes(b) || (bd.length >= 3 && dig(t.cnpj).includes(bd)))).forEach(t => mods.forEach(m => (m.processos || []).forEach(p => {
    const s = procDe(t, m.id, p.id), st = s ? s.st : 'ni'; if (st === 'fi') return;
    itens.push({ t, m, p, st, s, pz: prazoDe(t, p) });
  })));
  itens.sort((a, b) => (a.pz || '9999') .localeCompare(b.pz || '9999') || String(a.t.apelido || a.t.razao || '').localeCompare(String(b.t.apelido || b.t.razao || ''), 'pt-BR'));
  const opt = (v, l) => `<option value="${esc(v)}"${setorVer === v ? ' selected' : ''}>${esc(l)}</option>`;
  const sel = `<label>Setor<select id="tkSetor">${meus.length > 1 ? opt('meus', 'Meus setores') : ''}${opt('', 'Todos os setores')}${top.map(m => opt(m.id, m.titulo)).join('')}</select></label>`;
  const nAtr = itens.filter(x => x.pz && x.pz < hj).length;
  return `<div class="mtwrap"><div class="mttopo">${sel}<span class="hint">${itens.length} processo${itens.length === 1 ? '' : 's'} pendente${itens.length === 1 ? '' : 's'}${nAtr ? ` · <b style="color:var(--danger)">${nAtr} atrasado${nAtr === 1 ? '' : 's'}</b>` : ''}</span></div>
    ${(() => {
      // Fila do setor: separada em grupos, na ordem em que a equipe deve olhar
      const it = x => { const atr = x.pz && x.pz < hj; return `<button type="button" class="mtit${atr ? ' atr' : ''}${x.st === 'pa' ? ' pa' : x.st === 'an' || x.st === 'in' ? ' an' : ''}" data-mtid="${esc(x.t.id)}" data-mtmod="${esc(x.m.id)}"><span class="t">${esc(x.p.t)}</span><span class="st">${esc(PST[x.st] || '')}</span><span class="s">${esc(x.t.apelido || x.t.razao || '')} · ${esc(x.m.titulo)}${x.pd ? ' · pendência com ' + esc(x.pd.com || 'equipe') + ': ' + esc(x.pd.txt) : x.st === 'pa' && x.s.motivo ? ' · ' + esc(x.s.motivo) : ''}</span><span class="pz">${x.pz ? (atr ? 'atrasado · ' : 'prazo ') + fmtD(x.pz) : 'sem prazo'}</span></button>`; };
      itens.forEach(x => { x.lib = liberacao(x.t, x.m).ok; x.pd = pendsDe(x.t, x.m.id).find(q => q.st !== 're' && (q.pid === x.p.id || !q.pid)) || null; });
      const G = [['Com pendência', x => x.lib && (x.st === 'pa' || x.pd)], ['Atrasados', x => x.lib && x.pz && x.pz < hj], ['Em andamento', x => x.lib && (x.st === 'an' || x.st === 'in')], ['Liberados, a iniciar', x => x.lib && x.st === 'ni'], ['Aguardando liberação', x => !x.lib]];
      const usados = new Set();
      const html = G.map(([nome, f]) => { const ls = itens.filter(x => !usados.has(x) && f(x)); ls.forEach(x => usados.add(x)); return ls.length ? `<div class="mtgrupo${nome === 'Aguardando liberação' ? ' ag' : ''}"><h4>${nome}<i>${ls.length}</i></h4><div class="mtlista">${ls.map(it).join('')}</div></div>` : ''; }).join('');
      return html || '<p class="hint">Nenhum processo pendente para este setor.</p>';
    })()}</div>`;
}
function desenhar() {
  if (!$('tkGrid')) return;
  $('tkMinhas').setAttribute('aria-pressed', String(minhas)); $('tkAbas').hidden = minhas; document.querySelector('.tkfiltros').hidden = minhas;
  avisoUfs();
  if (minhas) { $('tkGrid').innerHTML = minhasTarefas(); return; }
  const rcV = $('tkRespCad').value, rsV = $('tkRespStart').value, base = vistos().length;
  $('tkRespCad').innerHTML = `<option value="">Todos (${base})</option>` + opcoesResp(null, rcV);
  $('tkRespStart').innerHTML = `<option value="">Todos (${base})</option>` + opcoesResp(null, rsV);
  const sem = filtrados(true);
  const n = { todos: sem.length, prep: 0, and: 0, fut: 0, fin: 0 }; sem.forEach(t => { n[statusDe(t)]++; if (statusDe(t) !== 'fin' && !pronto(t)) n.prep++; });
  document.querySelectorAll('#tkAbas [data-aba]').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.aba === aba)); b.querySelector('i').textContent = n[b.dataset.aba]; });
  const vis = filtrados().sort((a, b) => statusDe(a) === 'fin' && statusDe(b) === 'fin' ? (b.finalizadoEm?.seconds || 0) - (a.finalizadoEm?.seconds || 0) : String(a.start || '9').localeCompare(String(b.start || '9')));
  $('tkGrid').innerHTML = vis.length ? vis.map(cartao).join('') : `<p class="hint">${base ? 'Nenhum cadastro com esse filtro.' : meusUfs ? (meusUfs.length ? 'Nenhum cadastro de cliente nos seus Estados de atuação.' : 'Nenhum Estado de atuação no seu cadastro.') : 'Nenhum cadastro ainda. Use "Novo cadastro" ou "Importar das propostas".'}</p>`;
}
// Linha acima dos cards dizendo que a lista está limitada aos Estados de atuação
function avisoUfs() {
  const el = $('tkUfs'); if (!el) return;
  el.hidden = !meusUfs;
  if (meusUfs) el.innerHTML = meusUfs.length ? `Mostrando só clientes dos seus Estados de atuação: <b>${esc(meusUfs.slice().sort().join(', '))}</b>.` : 'Nenhum Estado de atuação no seu cadastro. Peça ao administrador para marcar os seus Estados em Administração → Usuários.';
}
// Etapas da venda: proposta vinculada pelo id ou, nos cadastros manuais, pelo CNPJ
function propostaDe(t) {
  const ps = aprovadas || [];
  return ps.find(p => p.id === (t.propostaId || t.propostaVinc || t.id)) || (dig(t.cnpj).length === 14 ? ps.filter(p => dig(p.cnpj) === dig(t.cnpj)).sort((a, b) => (b.aprovadoEm?.seconds || 0) - (a.aprovadoEm?.seconds || 0))[0] : null);
}
function etapas(t) {
  const p = propostaDe(t);
  if (direto(t) && !p) return `<div class="tketapas"><span class="tke none">Cadastro direto no TASK: proposta e contrato não se aplicam</span></div>`;
  if (!p) return `<div class="tketapas"><span class="tke none">${t.propostaId ? 'Proposta ainda não aprovada' : 'Sem proposta vinculada'}</span></div>`;
  const e = (n, nome, ok, quando, pend) => `<span class="tke ${ok ? 'ok' : pend ? 'pend' : 'none'}" title="${esc(nome + (quando ? ' em ' + quando : ''))}"><b>${ok ? '✓' : n}</b>${esc(nome)}${ok && quando ? `<small>${esc(quando)}</small>` : pend ? `<small>${esc(pend)}</small>` : ''}</span>`;
  const d = ts => ts && ts.toDate ? ts.toDate().toLocaleDateString('pt-BR') : '';
  return `<div class="tketapas">${e(1, 'Proposta', true, d(p.aprovadoEm)).replace('</span>', `<button type="button" class="tkver" data-tk="pdf" data-pid="${esc(p.id)}">Ver proposta</button></span>`)}${p.e2Em ? e(2, 'Pré-Contrato', true, d(p.e2Em)).replace('</span>', `<button type="button" class="tkver" data-tk="e2" data-pid="${esc(p.id)}">Ver dados</button></span>`) : e(2, 'Pré-Contrato', false, '', 'aguardando')}${(() => { const h = e(3, 'Contrato', !!p.ctAceitoEm, d(p.ctAceitoEm), p.ctAceitoEm ? '' : p.ctEm ? 'aguardando aceite' : p.e2Em ? 'a gerar' : ''); return p.ctEm ? h.replace('</span>', `<button type="button" class="tkver" data-tk="ct" data-pid="${esc(p.id)}">Ver contrato</button></span>`) : h; })()}${p.e4Em ? e(4, 'Pré TASK', true, d(p.e4Em)).replace('</span>', `<button type="button" class="tkver" data-tk="e4" data-pid="${esc(p.id)}">Ver dados</button></span>`) : e(4, 'Pré TASK', false, '', p.ctAceitoEm ? 'aguardando vendedor' : '')}</div>`;
}
// Pré TASK completo (salvar final com todos os obrigatórios): o botão do card passa de "Pré TASK" para "DADOS".
// preOk é gravado pelo Pré TASK; cards antigos usam o passo 4 da proposta (e4Em só é marcado no salvar final).
const preCompleto = t => t.preOk !== undefined ? !!t.preOk : !!(propostaDe(t) || {}).e4Em;
// Cadastro direto no TASK (sem proposta). Cards manuais antigos também contam como diretos
const direto = t => t.origem === 'direto' || (!t.propostaId && !t.auto);
// TASK pronto: Pré TASK completo. Card manual antigo, sem a marca preOk, já estava em uso: conta como pronto
const pronto = t => t.preOk !== undefined ? !!t.preOk : direto(t) ? true : preCompleto(t);
// Por onde o cliente entrou: lead feito no CRM, proposta direta (lead criado pelo app) ou cadastro direto no TASK
function origemDe(t) {
  if (direto(t)) return { cls: 'dir', txt: 'Cadastro direto' };
  const p = propostaDe(t) || {};
  return p.leadId && !String(p.leadId).startsWith('auto-') ? { cls: 'lead', txt: 'Veio de Lead' } : { cls: 'prop', txt: 'Veio de Proposta' };
}
function faseHtml(t) {
  if (statusDe(t) === 'fin') return '';
  return pronto(t) ? '<span class="tkfase ok" title="Pré TASK completo: as equipes já podem trabalhar">Pronto para as equipes</span>' : '<span class="tkfase prep" title="Faltam dados obrigatórios no Pré TASK">Em preparação</span>';
}
function cartao(t) {
  const st = statusDe(t), pr = progresso(t), pct = pr.total ? Math.round(pr.feitos * 100 / pr.total) : 0;
  return `<article class="tkcard" data-id="${esc(t.id)}">
    <div class="tkpills">${st === 'fin' || pronto(t) ? `<span class="tkst ${st}">${STATUS[st]}</span>` : ''}${faseHtml(t)}<span class="tkorig ${origemDe(t).cls}">${origemDe(t).txt}</span>${admin ? '<button type="button" class="tkrem" data-tk="remover" title="Remover este card do TASK">Remover</button>' : ''}</div>
    ${t.dataBase || t.start ? `<div class="tkdatas">${t.dataBase ? `<span class="tkbaserow"><span class="tkstart tkbase">Data da base: ${esc(fmtD(t.dataBase))}</span>${(() => { const lk = linkBaseDe(t); return `<button type="button" class="tklink${lk ? '' : ' vazio'}" data-tk="linkbase"${lk ? '' : ' disabled'} title="${lk ? 'Copiar link para baixar a base' : 'Link da base ainda não informado e salvo (Módulos › Implantação)'}" aria-label="${lk ? 'Copiar link da base' : 'Link da base ainda não informado'}"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg></button>`; })()}</span>` : ''}${t.start ? `<span class="tkstart">Data do start: ${esc(fmtD(t.start))}</span>` : ''}${t.modalidade ? `<span class="tkstart tkmod">${esc(t.modalidade)}</span>` : ''}</div>` : ''}
    ${t.logo ? `<div class="tklogobox"><img class="tklogo" src="${esc(t.logo)}" alt="Logo de ${esc(t.apelido || t.razao || '')}"></div>` : ''}
    ${t.central ? '' : `<h3>${esc(t.apelido || t.razao || 'Sem nome')}</h3>
    ${t.razao && t.razao !== t.apelido ? `<div class="tkraz">${esc(t.razao)}</div>` : ''}`}
    ${t.central ? `<div class="tkcentral"><small>${t.central.tipo === 'simples' ? 'Posto simples' : 'Central'}</small>${t.central.tipo === 'simples' ? `<b>${esc(t.apelido || t.razao || '')}</b>` : t.central.nome ? `<b>${esc(t.central.nome)}</b>` : ''}${(() => { const fs = t.central.filiais || [], f1 = t.central.tipo === 'simples' ? null : fs.find(f => f.f100 || (t.central.f100 && t.central.f100 === f.cod)); return f1 ? `<div class="tkf100"><span class="tk100">F100</span> = ${esc(f1.cod)}</div>` : ''; })()}${(t.central.filiais || []).map(f => `<div class="tkfil">${esc([f.cod, f.tipo, f.cnpj].filter(Boolean).join(' - '))}</div>`).join('')}${(t.central.filiais || []).length ? `<button type="button" class="tkver" data-tk="filiais">${t.central.tipo === 'simples' ? 'Dados do posto' : 'Dados das filiais'}</button>` : ''}</div>` : ''}
    ${etapas(t)}
    ${modsCard(t)}
    ${pr.total ? `<div class="tkprogtxt">Checklists antigos: ${pr.feitos} de ${pr.total} itens (${pct}%)</div>` : ''}
    <div class="tkacts"><button type="button" data-tk="dados"${pronto(t) ? ' title="Pré TASK completo: todos os obrigatórios lançados"' : ''}>${pronto(t) ? 'DADOS' : 'Pré TASK'}</button><button type="button" class="primary" data-tk="mods">Módulos</button>${pr.total ? '<button type="button" data-tk="check">Checklists</button>' : ''}</div>
  </article>`;
}

/* ---------- Módulos: andamento por processo ---------- */
const PST = window.PROC_STATUS || { ni: 'Não iniciado', in: 'Iniciado', an: 'Em andamento', pa: 'Parado', fi: 'Finalizado' };
const procDe = (t, mid, pid) => ((((t.mods || {})[mid] || {}).proc || {})[pid]) || null;
const filhosDe = m => [m, ...(MODS.secoes || []).filter(x => x.pai === m.id)];
function contaMod(t, lista) { let f = 0, an = 0, tot = 0; const pa = []; lista.forEach(m => (m.processos || []).forEach(p => { tot++; const s = procDe(t, m.id, p.id); if (s && s.st === 'fi') f++; if (s && (s.st === 'in' || s.st === 'an')) an++; if (s && s.st === 'pa') pa.push(m.titulo + ': ' + p.t); })); return { f, an, tot, pa }; }
// Setores: cada módulo principal é um setor (as etapas dele são do mesmo setor). O ADM marca o setor de cada pessoa em Usuários.
const topDe = m => (m && m.pai && (MODS.secoes || []).find(x => x.id === m.pai)) || m;
const meusSetores = () => (perfil && Array.isArray(perfil.setores)) ? perfil.setores : [];
// Quem não tem setor marcado (e o ADM) altera todos os módulos
const podeMod = m => admin || !meusSetores().length || meusSetores().includes(topDe(m).id);
/* ---------- Liberação, pendências e diário dos módulos ----------
   Cada módulo principal é a área de trabalho de uma equipe. Ele fica "Aguardando liberação" até a regra dele valer
   (TASK pronto, ou um processo de outro módulo finalizado: config "libera" em Parâmetros Módulos TASK).
   Quando libera, o setor recebe aviso no sino. Pendências e diário ficam em tasks/{id}.mods[mid].pend e .hist. */
const PEND_COM = window.PEND_COM || ['Cliente', 'Equipe interna', 'Outro setor', 'Banco', 'Adquirente', 'Bandeira', 'Fornecedor', 'Outro'];
const topos = () => (MODS.secoes || []).filter(m => !m.pai);
const regraDe = m => { const top = topDe(m); return (top && top.libera) || { tipo: 'pronto' }; };
// Já começou (algum processo com status): continua liberado, para não travar quem já estava trabalhando
const jaComecou = (t, top) => filhosDe(top).some(m => (m.processos || []).some(p => { const s = procDe(t, m.id, p.id); return s && s.st && s.st !== 'ni'; }));
function liberacao(t, m) {
  const top = topDe(m); if (!top) return { ok: true, txt: '' };
  const x = ((t.mods || {})[top.id] || {}).lib, r = regraDe(top);
  const mm = r.tipo === 'proc' ? (MODS.secoes || []).find(y => y.id === r.mid) : null, pp = mm && (mm.processos || []).find(y => y.id === r.pid);
  const dep = mm ? topDe(mm) : null;
  if (x && x.manual) return { ok: true, manual: true, txt: 'Liberado manualmente por ' + (x.por || ''), em: x.em, dep };
  if (r.tipo === 'livre') return { ok: true, txt: 'Módulo sempre liberado' };
  if (mm && pp) {
    const s = procDe(t, mm.id, pp.id);
    if (s && s.st === 'fi') return { ok: true, txt: `${mm.titulo} finalizou "${pp.t}"${s.por ? ' (' + s.por + ')' : ''}`, em: s.em, dep };
    if (jaComecou(t, top)) return { ok: true, txt: 'Liberado: o trabalho já tinha começado', dep };
    return { ok: false, txt: `Libera quando ${mm.titulo} finalizar "${pp.t}"`, dep };
  }
  if (pronto(t)) return { ok: true, txt: 'TASK pronto: Pré TASK completo' };
  if (jaComecou(t, top)) return { ok: true, txt: 'Liberado: o trabalho já tinha começado' };
  return { ok: false, txt: 'Libera quando o Pré TASK estiver completo' };
}
const pendsDe = (t, mid) => ((((t.mods || {})[mid] || {}).pend) || []);
const pendAbertas = (t, lista) => lista.flatMap(m => pendsDe(t, m.id).filter(p => p.st !== 're').map(p => ({ ...p, mid: m.id, mt: m.titulo })));
// Situação do módulo (com as etapas dele): Aguardando, Liberado, Em andamento, Com pendência, Concluído
function estadoMod(t, m) {
  const top = topDe(m), lista = m.pai ? [m] : filhosDe(top), c = contaMod(t, lista), pa = pendAbertas(t, lista).length;
  if (c.tot && c.f === c.tot) return { k: 'co', txt: 'Concluído' };
  if (!liberacao(t, m).ok) return { k: 'ag', txt: 'Aguardando' };
  if (pa) return { k: 'pe', txt: pa + (pa > 1 ? ' pendências' : ' pendência') };
  if (c.f || c.an || c.pa.length) return { k: 'an', txt: 'Em andamento' };
  return { k: 'li', txt: 'Liberado' };
}
// Pode alterar: é do setor (ou ADM) e o módulo já foi liberado
const podeEditar = (t, m) => podeMod(m) && (admin || liberacao(t, m).ok);
// Quem libera na mão: ADM, ou quem é do setor que normalmente libera
const podeLiberar = (t, m) => { const l = liberacao(t, m); return !l.ok && (admin || (l.dep && meusSetores().includes(l.dep.id))); };
const quemSou = () => (perfil && (perfil.nome || perfil.email)) || '';
const anotar = (mods, mid, txt) => { const x = mods[mid] = mods[mid] || {}; x.hist = (x.hist || []).concat([{ em: Date.now(), por: quemSou(), txt: String(txt).slice(0, 600) }]).slice(-200); };
function avisarLiberado(t, m, txt) {
  if (!window.shotgunNotificar) return;
  window.shotgunNotificar({ titulo: `${m.titulo} liberado: ${t.apelido || t.razao || 'cadastro'}`, texto: (txt || '') + '. Abra o TASK › Módulos para começar.', setor: m.id, aba: 'tabTask' }).catch(e => console.warn('aviso de liberação', e));
}
// Chamado pelo Pré TASK quando o card fica pronto: avisa os setores liberados pelo "TASK pronto"
window.TK_aoPronto = (tid, nome) => {
  const t = tasks.find(x => x.id === tid) || { id: tid, apelido: nome || '', mods: {} };
  topos().filter(m => regraDe(m).tipo === 'pronto' && !jaComecou(t, m)).forEach(m => avisarLiberado({ ...t, apelido: t.apelido || nome }, m, 'TASK pronto: Pré TASK completo'));
};
// Link para baixar a base: campo "Link da base" do módulo Implantação (ou de uma etapa dele), preenchido pelo setor de Implantação
function linkBaseDe(t) {
  const ms = (MODS.secoes || []).filter(m => m.id === 'impl' || topDe(m).id === 'impl' || /implanta/i.test(topDe(m).titulo || ''));
  for (const m of ms) { const c = (m.campos || []).find(x => /link/i.test(x.label || '') && /base/i.test(x.label || '')) || (m.campos || []).find(x => x.k === 'linkBase'); const v = c && (((t.mods || {})[m.id] || {}).dados || {})[c.k]; if (v && String(v).trim()) return { url: String(v).trim(), mid: m.id }; }
  return null;
}
const modDoLink = () => { const m = (MODS.secoes || []).find(m => (m.campos || []).some(x => /link/i.test(x.label || '') && /base/i.test(x.label || '')) && /implanta/i.test(topDe(m).titulo || '')); return m ? m.id : 'impl'; };
// Processo "Criar a base" (Implantação): só finaliza com o link da base, que vai também para o campo "Link da base"
const exigeLink = (m, p) => !!m && !!p && /criar\s+(a\s+)?base/i.test(p.t || '') && (m.id === 'impl' || /implanta/i.test(topDe(m).titulo || ''));
const campoLinkBase = () => { const mid = modDoLink(), m = (MODS.secoes || []).find(x => x.id === mid); const c = m && ((m.campos || []).find(x => /link/i.test(x.label || '') && /base/i.test(x.label || '')) || (m.campos || []).find(x => x.k === 'linkBase')); const lib = m && ((m.campos || []).find(x => x.tipo === 'simnao' && /base/i.test(x.label || '') && /liberad/i.test(x.label || '')) || (m.campos || []).find(x => x.k === 'baseLiberada')); return { mid, k: c ? c.k : 'linkBase', lib: lib ? lib.k : 'baseLiberada' }; };
const urlOk = v => { if (/\s/.test(v)) return false; try { const u = new URL(v); return /^https?:$/.test(u.protocol) && (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname) || u.hostname === 'localhost'); } catch (e) { return false; } };
const comHttp = v => { v = String(v || '').trim(); return v && !/^[a-z][a-z0-9+.-]*:/i.test(v) ? 'https://' + v : v; };
let pedeLink = null; // { id, mid, pid, todos? } enquanto o usuário informa o link para finalizar
// "Finalizar todos": marca Finalizado os processos do módulo que ainda não estão. "Criar a base" leva o link junto (url).
function finalizarTodos(id, mid, url) {
  const m = (MODS.secoes || []).find(x => x.id === mid), quem = perfil.nome || perfil.email, agora = Date.now(), cl = campoLinkBase();
  return salvarMods(id, mods => {
    const x = mods[mid] = mods[mid] || {}; x.proc = x.proc || {}; let lk = false;
    (m.processos || []).forEach(p => { const ant = x.proc[p.id] || {}; if (ant.st === 'fi') return; const exige = exigeLink(m, p); if (exige) lk = true; x.proc[p.id] = { st: 'fi', por: quem, em: agora, desde: agora, motivo: '', ...(exige ? { link: url } : {}) }; });
    if (lk && url) { const y = mods[cl.mid] = mods[cl.mid] || {}; y.dados = { ...(y.dados || {}), [cl.k]: url, [cl.lib]: 'Sim' }; }
    pedeLink = null;
  }, mid, 'finalizou todos os processos do módulo' + (url ? ' (link da base: ' + url + ')' : '') + '.').then(ok => { if (ok) dmsg('Todos os processos deste módulo foram finalizados.'); return ok; });
}
const prazoDe = (t, p) => { if (p.prazo === '' || p.prazo == null || !t.dataBase) return ''; const dt = new Date(t.dataBase + 'T12:00:00'); dt.setDate(dt.getDate() + (+p.prazo || 0)); return dt.toISOString().slice(0, 10); };
// Lista de módulos do card: escondida por padrão, abre no botão Mostrar (o estado fica só nesta tela)
const modsAbertos = new Set();
function modsCard(t) {
  const top = (MODS.secoes || []).filter(m => !m.pai); if (!top.length) return '';
  const linhas = top.map(m => { const c = contaMod(t, filhosDe(m)), pct = c.tot ? c.f * 100 / c.tot : 0, pa = c.tot ? c.an * 100 / c.tot : 0, e = estadoMod(t, m); return `<div class="tkmod est-${e.k}${c.pa.length ? ' parado' : ''}" title="${esc(e.txt + ' · ' + c.f + ' de ' + c.tot + ' processos finalizados' + (c.an ? ' · ' + c.an + ' em andamento' : ''))}"><span><span class="tkdot" aria-hidden="true"></span>${esc(m.titulo)}</span><i><b style="width:${pct}%"></b><b class="an" style="width:${pa}%"></b></i><em>${c.f}/${c.tot}</em></div>`; }).join('');
  const pa = contaMod(t, MODS.secoes || []).pa, pe = pendAbertas(t, MODS.secoes || []), pc = pe.filter(x => x.com === 'Cliente').length;
  const tot = contaMod(t, top.flatMap(filhosDe)), ab = modsAbertos.has(t.id);
  return `<button type="button" class="tkvermods" data-tk="vermods" aria-expanded="${ab}"><span>${ab ? 'Ocultar' : 'Mostrar'} módulos</span><small>${tot.f} de ${tot.tot} processos</small></button>${ab ? `<div class="tkmods">${linhas}</div>` : ''}${pe.length ? `<div class="tkpend" title="${esc(pe.map(x => x.mt + ': ' + x.txt).join('\n'))}">${pe.length} pendência${pe.length > 1 ? 's' : ''} aberta${pe.length > 1 ? 's' : ''}${pc ? ' · ' + pc + ' com o cliente' : ''}</div>` : ''}${pa.length ? `<div class="tkparado" title="${esc(pa.join('\n'))}">${pa.length} processo${pa.length > 1 ? 's' : ''} parado${pa.length > 1 ? 's' : ''} · ${esc(pa[0].split(':')[0])}</div>` : ''}`;
}
const fmtQ = ms => ms ? new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
function libHtml(t, m, lib) {
  if (lib.ok) return `<div class="mdlib ok"><span class="dot"></span><div><b>Liberado${lib.em ? ' em ' + esc(fmtQ(lib.em)) : ''}</b><small>${esc(lib.txt)}</small></div></div>`;
  return `<div class="mdlib ag"><span class="dot"></span><div><b>Aguardando liberação</b><small>${esc(lib.txt)}. Até lá a equipe só acompanha.</small></div>${podeLiberar(t, m) ? '<button type="button" data-mdlib="1">Liberar agora</button>' : ''}</div>`;
}
function pendHtml(t, m, pode) {
  const L = pendsDe(t, m.id), ab = L.filter(p => p.st !== 're'), re = L.filter(p => p.st === 're').slice(-5).reverse(), hj = hoje();
  const proc = pid => ((m.processos || []).find(p => p.id === pid) || {}).t || '';
  const fone = dig(t.fone), wa = p => p.com === 'Cliente' && fone.length >= 10 ? `<a class="mdwa" target="_blank" rel="noopener" href="https://wa.me/${fone.length <= 11 ? '55' + fone : fone}?text=${encodeURIComponent(`Olá${t.contato ? ' ' + t.contato : ''}! Para seguirmos com a implantação, ainda falta: ${p.txt}. Pode nos ajudar?`)}">Cobrar no WhatsApp</a>` : '';
  const linha = p => `<div class="mdpend${p.st === 're' ? ' re' : p.prazo && p.prazo < hj ? ' atr' : ''}"><div><div class="t">${esc(p.txt)}</div><div class="d">${esc(['Com ' + (p.com || 'Equipe interna'), p.prazo ? 'prazo ' + fmtD(p.prazo) : '', proc(p.pid) ? 'processo "' + proc(p.pid) + '"' : '', p.st === 're' ? 'resolvida em ' + fmtQ(p.resEm) + (p.resPor ? ' por ' + p.resPor : '') : 'aberta em ' + fmtQ(p.em) + (p.por ? ' por ' + p.por : '')].filter(Boolean).join(' · '))}</div></div>
    <div class="mdpendacts">${p.st === 're' ? '<span class="mdtag ok">Resolvida</span>' : `${wa(p)}${pode ? `<button type="button" data-pdres="${esc(p.id)}">Resolver</button>` : '<span class="mdtag wa">Aberta</span>'}`}</div></div>`;
  return `<div class="ptsec"><h5>Pendências<small>${ab.length ? ab.length + (ab.length > 1 ? ' abertas' : ' aberta') : 'nenhuma aberta'}</small></h5><div class="mdpends">
    ${ab.map(linha).join('')}${re.length ? `<div class="mdsub">Resolvidas recentemente</div>${re.map(linha).join('')}` : ''}${!L.length ? '<p class="hint">O que estiver travando o trabalho (dado que falta, retorno do banco, credencial da bandeira…) entra aqui, com quem está e o prazo.</p>' : ''}
    ${pode ? `<div class="mdpendnova"><input id="pdTxt" placeholder="O que está faltando? (ex.: cliente não enviou o modelo das maquininhas)" aria-label="Descrição da pendência" maxlength="300">
      <label>Com quem está<select id="pdCom">${PEND_COM.map(x => `<option>${esc(x)}</option>`).join('')}</select></label>
      <label>Prazo<input id="pdPrazo" type="date"></label>
      <label>Processo<select id="pdProc"><option value="">Nenhum em especial</option>${(m.processos || []).filter(p => (procDe(t, m.id, p.id) || {}).st !== 'fi').map(p => `<option value="${esc(p.id)}">${esc(p.t)}</option>`).join('')}</select></label>
      <button type="button" class="primary" data-pdadd="1">Abrir pendência</button>
      <p class="hint">Ligada a um processo, a pendência deixa o processo como Parado até ser resolvida.</p></div>` : ''}
  </div></div>`;
}
function diarioHtml(t, m) {
  const H = ((((t.mods || {})[m.id] || {}).hist) || []).slice().reverse(), mais = !!(diarioTudo[t.id + m.id]), vis = mais ? H : H.slice(0, 12);
  return `<div class="ptsec"><h5>Diário<small>histórico do módulo, com quem fez e quando</small></h5><div class="mddiario">
    <div class="mdnota"><textarea id="hNota" rows="2" maxlength="600" placeholder="Anote uma conversa, combinado ou situação (ex.: falei com o gerente, ele envia as fotos amanhã)" aria-label="Anotação no diário"></textarea><button type="button" data-hnota="1">Anotar</button></div>
    ${vis.length ? `<ul class="mdhist">${vis.map(h => `<li><time>${esc(fmtQ(h.em))}</time><span><b>${esc(h.por || '')}</b> ${esc(h.txt)}</span></li>`).join('')}</ul>` : '<p class="hint">Nada registrado ainda. Mudanças de status, liberações e pendências entram aqui sozinhas.</p>'}
    ${H.length > vis.length ? `<button type="button" class="linkbtn" data-hmais="1">Ver tudo (${H.length})</button>` : ''}
  </div></div>`;
}
const diarioTudo = {};
function formMods(id, mid) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const L = MODS.secoes || [], ordem = []; L.filter(m => !m.pai).forEach(m => { ordem.push(m); L.filter(x => x.pai === m.id).forEach(x => ordem.push(x)); });
  const m = ordem.find(x => x.id === mid) || ordem[0]; if (pedeLink && (pedeLink.id !== id || !m || pedeLink.mid !== m.id)) pedeLink = null; if (!m) { abrirDlg('mods', 'Módulos', '<p class="hint">Nenhum módulo configurado. O administrador cria em Administração → Parâmetros Módulos TASK.</p>'); return; }
  const d = dlg(), top = d.open ? d.scrollTop : 0;
  const nav = x => { const c = contaMod(t, [x]), e = x.pai ? null : estadoMod(t, x); return `<button type="button" class="dgnav${x.pai ? ' sub' : ''}" data-md="${esc(x.id)}" aria-selected="${x.id === m.id}">${iconeDe(x.titulo)}<span>${esc(x.titulo)}${e ? `<em class="mdest ${e.k}">${esc(e.txt)}</em>` : ''}</span><small class="mdn${c.pa.length ? ' pa' : c.tot && c.f === c.tot ? ' ok' : ''}">${c.f}/${c.tot}</small></button>`; };
  const c = contaMod(t, [m]), pct = c.tot ? Math.round(c.f * 100 / c.tot) : 0, dados = ((t.mods || {})[m.id] || {}).dados || {};
  const fmtDia = ms => ms ? new Date(ms).toLocaleDateString('pt-BR') : '';
  const prazo = p => { const d = prazoDe(t, p); return d ? 'prazo ' + fmtD(d) : ''; };
  const pode = podeEditar(t, m), lib = liberacao(t, m), pend = (m.processos || []).filter(p => { const s = procDe(t, m.id, p.id); return !s || s.st !== 'fi'; }).length;
  const meta = (p, s) => { const st = s ? s.st : 'ni'; const quem = s && s.por ? ' · ' + s.por : ''; const txt = st === 'fi' ? `Finalizado em ${fmtDia(s.em)}${quem}` : st === 'pa' ? `Parado desde ${fmtDia(s.desde || s.em)}${quem}` : st === 'an' ? `Em andamento desde ${fmtDia(s.desde || s.em)}${quem}` : st === 'in' ? `Iniciado em ${fmtDia(s.desde || s.em)}${quem}` : 'Não iniciado'; return [txt, p.resp ? 'resp.: ' + p.resp : '', prazo(p)].filter(Boolean).join(' · '); };
  window.PtCampos && window.PtCampos.estilos();
  abrirDlg('mods', 'Módulos · ' + (t.apelido || t.razao || ''), `<div class="dgwrap" id="tkMods" data-id="${esc(id)}" data-mid="${esc(m.id)}">
    <nav class="dgmenu" aria-label="Módulos">${ordem.map(nav).join('')}</nav>
    <div class="dgcorpo">
      <div class="mdtopo"><h4>${esc(m.titulo)}${m.pai ? `<small>etapa de ${esc((L.find(x => x.id === m.pai) || {}).titulo || '')}</small>` : ''}</h4><span class="hint">${c.f} de ${c.tot} processos finalizados</span></div>
      <div class="tkprog"><span style="width:${pct}%"></span></div>
      ${(() => { const d = String(m.desc != null ? m.desc : (window.MODULO_DESC ? window.MODULO_DESC(m.id) : '') || '').trim(); return d ? `<div class="mddesc"><b>Responsabilidades do setor</b><p>${esc(d)}</p></div>` : ''; })()}
      ${libHtml(t, m, lib)}
      ${pode ? '' : podeMod(m) && !lib.ok ? '' : `<p class="mdro">Só o setor ${esc(topDe(m).titulo)} altera este módulo. Você pode acompanhar.</p>`}
      ${(m.campos || []).filter(x => x.show !== false).length ? `<div class="ptsec"><h5>Dados</h5><div class="ptgrid" id="mdDados">${window.PtCampos ? window.PtCampos.camposHtml((m.campos || []).filter(x => x.show !== false), '', dados, {}) : ''}${pode ? '<div class="ptbtns full"><button type="button" class="primary" data-mdsalvar="1">Salvar dados</button></div>' : ''}</div></div>` : ''}
      <div class="ptsec"><h5>Processos${pode && pend > 1 && !(pedeLink && pedeLink.todos && pedeLink.id === id && pedeLink.mid === m.id) ? `<button type="button" class="mdtodos" data-mdtodos="1" title="Marcar como Finalizado os ${pend} processos que ainda não foram finalizados">Finalizar todos</button>` : ''}</h5><div class="mdprocs">${(m.processos || []).map(p => { const s = procDe(t, m.id, p.id), st = s ? s.st : 'ni'; const lk = exigeLink(m, p), lkUrl = lk ? ((s && s.link) || (linkBaseDe(t) || {}).url || '') : '', pede = lk && pedeLink && pedeLink.id === id && pedeLink.mid === m.id && pedeLink.pid === p.id; return `<div class="mdproc" data-pid="${esc(p.id)}"><div><div class="t">${esc(p.t)}</div><div class="d">${esc(meta(p, s))}</div>${lk && st === 'fi' && lkUrl && !pede ? `<div class="mdlink"><span>Link da base:</span> <a href="${esc(lkUrl)}" target="_blank" rel="noopener">${esc(lkUrl)}</a>${pode ? `<button type="button" data-lkalt="${esc(p.id)}">Alterar</button>` : ''}</div>` : ''}${lk && !pede && st !== 'fi' ? `<div class="mdlkdica">Para finalizar, informe o link da base.</div>` : ''}${pede ? `<div class="mdmot mdlkbox"><input type="url" data-lk="${esc(p.id)}" value="${esc(lkUrl)}" placeholder="https://… link para acessar a base" aria-label="Link da base" inputmode="url"><button type="button" class="primary" data-lkok="${esc(p.id)}">${pedeLink.todos ? 'Finalizar todos com este link' : st === 'fi' ? 'Salvar link' : 'Finalizar com este link'}</button><button type="button" data-lkcanc="1">Cancelar</button></div>` : ''}${st === 'pa' ? `<div class="mdmot"><input data-mot="${esc(p.id)}" value="${esc(s.motivo || '')}" placeholder="Motivo da parada (ex.: aguardando o banco)" aria-label="Motivo da parada"><button type="button" data-motok="${esc(p.id)}">Salvar motivo</button></div>` : ''}</div>
        <div class="ptseg ps" role="group" aria-label="Status de ${esc(p.t)}">${Object.entries(PST).map(([k, n]) => `<button type="button" data-pst="${k}" data-pid="${esc(p.id)}" aria-pressed="${st === k}"${pode ? '' : ' disabled'}>${n}</button>`).join('')}</div></div>`; }).join('') || '<p class="hint">Nenhum processo neste módulo.</p>'}</div></div>
      ${pendHtml(t, m, pode)}
      ${diarioHtml(t, m)}
    </div></div>`);
  d.classList.add('largo');
  if (window.PtCampos && $('mdDados')) { window.PtCampos.ligarCampos($('mdDados')); window.PtCampos.sincronizar($('mdDados')); if (!pode) $('mdDados').querySelectorAll('input,select,textarea,button').forEach(x => { x.disabled = true; }); }
  if (!pode) d.querySelectorAll('[data-mot],[data-motok]').forEach(x => { x.disabled = true; });
  d.scrollTop = top;
  const li = pedeLink && d.querySelector('[data-lk]'); if (li) { li.focus(); li.select(); }
}
async function salvarMods(id, fn, mid, nota) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  const mods = JSON.parse(JSON.stringify(t.mods || {}));
  const antes = new Set(topos().filter(m => liberacao(t, m).ok).map(m => m.id));
  fn(mods);
  if (nota && mid) anotar(mods, mid, nota);
  // Módulos que esta alteração libera: registra no diário deles e avisa o setor no sino
  const depois = { ...t, mods }, novos = topos().filter(m => !antes.has(m.id) && liberacao(depois, m).ok);
  novos.forEach(m => anotar(mods, m.id, 'Módulo liberado. ' + liberacao(depois, m).txt + '.'));
  try {
    await F.updateDoc(F.doc(db, 'tasks', id), { mods, alteradoEm: F.serverTimestamp(), alteradoPor: perfil.nome || perfil.email }); t.mods = mods;
    novos.forEach(m => avisarLiberado(depois, m, liberacao(depois, m).txt));
    formMods(id, mid); if (novos.length) setTimeout(() => { const ant = $('tkDlgMsg').textContent; dmsg((ant ? ant + ' ' : '') + 'Liberado para: ' + novos.map(m => m.titulo).join(', ') + '. O setor foi avisado no sino.'); }, 60);
    return true;
  }
  catch (e) { dmsg('Não foi possível salvar (' + (e.code || 'erro') + ').'); return false; }
}

/* ---------- Diálogo ---------- */
const dlg = () => $('tkDlg');
function abrirDlg(modo, titulo, html) {
  const d = dlg(); d.dataset.modo = modo; d.classList.remove('largo'); $('tkDlgTit').textContent = titulo; $('tkDlgBody').innerHTML = html; $('tkDlgMsg').textContent = '';
  if (!d.open) d.showModal();
}
const dmsg = t => { $('tkDlgMsg').textContent = t || ''; };
let armado = null;
function confirmar(bt, chave, texto) { if (armado === chave) { armado = null; return true; } armado = chave; bt.textContent = texto; dmsg('Clique de novo para confirmar.'); setTimeout(() => { if (armado === chave) armado = null; }, 5000); return false; }

/* Dados gerais / novo cadastro */
// Dados gerais: menu lateral por assunto (como um cadastro em etapas), com os campos editáveis do TASK
// e, ao lado, as respostas do Pré-Contrato e da Etapa 4 agrupadas pelas seções configuradas
const ICONES = {
  status: '<path d="M3 12h4l3-8 4 16 3-8h4"/>', posto: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M6 9h6M14 10h2a2 2 0 0 1 2 2v4a2 2 0 0 0 4 0V8l-3-3"/>',
  pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>', banco: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  globo: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', cartao: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>', ajustes: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', clipe: '<path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10.2 17.7a1.7 1.7 0 0 1-2.4-2.4L15.5 7.6"/>',
  agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', lista: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>'
};
const iconeDe = t => { t = String(t || '').toLowerCase(); const k = /status/.test(t) ? 'status' : /posto|empresa|base|central|rede/.test(t) ? 'posto' : /respons|contato|financ|s[oó]cio/.test(t) ? 'pessoas' : /legado|convers/.test(t) ? 'banco' : /argo|sistema/.test(t) ? 'globo' : /tef|pix|pos|cart|pagamento/.test(t) ? 'cartao' : /automa/.test(t) ? 'chip' : /computa|equipa|hardware|m[aá]quina/.test(t) ? 'monitor' : /anexo|arquivo/.test(t) ? 'clipe' : /data|agenda|prazo/.test(t) ? 'agenda' : /extra|opera|outro/.test(t) ? 'ajustes' : 'lista'; return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[k]}</svg>`; };
window.TK_ICONE = iconeDe;
const marcaDe = (feitos, total) => !total || !feitos ? '<span class="dgm vazio"></span>' : feitos >= total ? '<span class="dgm ok" title="Completo">✓</span>' : '<span class="dgm parcial" title="Incompleto"></span>';
function formDados(t) {
  // Card que veio de proposta: abre o Pré TASK (mesma tela do Passo 4), onde tudo é revisado e editado
  if (t && t.propostaId && window.PreTask) {
    if (dlg().open) dlg().close();
    return window.PreTask.abrir({ F, db, perfil, pid: t.propostaId, origem: 'task', task: t, podeTask: true, verContrato });
  }
  // Cadastro direto (perfis TASK e ADM): abre o Pré TASK completo, sem proposta nem contrato obrigatórios
  if (window.PreTask) {
    if (dlg().open) dlg().close();
    const novo = !t, tk = t || { id: F.doc(F.collection(db, 'tasks')).id, respCadastro: { uid: perfil.uid, nome: perfil.nome || perfil.email } };
    const usadas = new Set(tasks.flatMap(x => [x.propostaId, x.propostaVinc]).filter(Boolean));
    const propostasLivres = (window.sgViaUnica ? window.sgViaUnica(aprovadas || []) : aprovadas || []).filter(p => ![p.id, ...(p._viasIds || [])].some(id => usadas.has(id) && id !== tk.propostaVinc) || p.id === tk.propostaVinc).map(p => ({ id: p.id, numero: p.numero || '', cliente: p.cliente || '' }));
    return window.PreTask.abrir({ F, db, perfil, origem: 'task', task: tk, novo, podeTask: true, propostasLivres, propostaVinc: tk.propostaVinc || '' });
  }
  t = t || { respCadastro: { uid: perfil.uid, nome: perfil.nome || perfil.email } };
  const sel = (id, r) => `<select id="${id}"><option value="">Ninguém</option>${opcoesResp(null, r?.uid)}</select>`;
  const cheios = (...v) => v.filter(x => String(x || '').trim()).length;
  const secs = [
    { id: 'status', titulo: 'Status', marca: marcaDe(cheios(t.dataBase, t.start, t.respStart?.uid), 3), html: `
      <label>Status<select id="tkStatus">${['fut', 'and', 'fin'].map(k => `<option value="${k}"${statusDe(t) === k ? ' selected' : ''}>${STATUS[k]}</option>`).join('')}</select></label>
      <label>Data da base<input id="tkBase" type="date" value="${esc(t.dataBase || '')}"></label>
      <label>Data do start<input id="tkStart" type="date" value="${esc(t.start || '')}"></label>
      <label>Responsável pelo cadastro${sel('tkRC', t.respCadastro)}</label>
      <label>Responsável pelo start${sel('tkRS', t.respStart)}</label>
      <label class="full">Observações<textarea id="tkObs" rows="3">${esc(t.obs || '')}</textarea></label>
      ${t.propostaId ? `<p class="hint full">Importado da proposta nº ${esc(t.propostaNumero || '')}.</p>` : ''}` },
    { id: 'posto', titulo: t.central && t.central.tipo !== 'simples' ? 'Central' : 'Posto', marca: marcaDe(cheios(t.apelido, t.cnpj, t.razao, t.cidade, t.uf), 5), html: `
      <div class="full tkanp"><span class="anpacao tkanpacao"><button type="button" id="tkAnpBtn"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M10 3a7 7 0 0 1 5.6 11.2l4.6 4.6-1.4 1.4-4.6-4.6A7 7 0 1 1 10 3Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/></svg>Pesquisar na ANP</button><small>quando não souber o CNPJ</small></span><div id="tkAnpBusca" hidden></div></div>
      <label class="full">Nome do cadastro (como aparece no cartão)<input id="tkApelido" value="${esc(t.apelido || '')}" placeholder="Ex.: Rede - Filial 1 - POSTO CONTINENTAL" required></label>
      <label>CNPJ<span class="tkrow"><input id="tkCnpj" value="${esc(fmtCnpj(t.cnpj))}" inputmode="numeric" placeholder="00.000.000/0000-00"><button type="button" id="tkBuscaCnpj">Pesquisar</button></span></label>
      <label>Razão social<input id="tkRazao" value="${esc(t.razao || '')}"></label>
      <label>Cidade<input id="tkCidade" value="${esc(t.cidade || '')}"></label>
      <label>UF<input id="tkUf" value="${esc(t.uf || '')}" maxlength="2" style="text-transform:uppercase"></label>
      ${t.central && t.central.tipo !== 'simples' ? `<div class="full dgcentral"><small>Central</small><b>${esc(t.central.nome || '')}</b><span class="hint">${(t.central.filiais || []).length} filiais</span></div><div class="full dgfiliais">${filiaisHtml(t)}</div>` : ''}` },
    { id: 'resp', titulo: 'Responsáveis', marca: marcaDe(cheios(t.contato, t.email, t.fone), 3), html: `
      <label>Contato no posto<input id="tkContato" value="${esc(t.contato || '')}"></label>
      <label>E-mail<input id="tkEmail" type="email" value="${esc(t.email || '')}"></label>
      <label>Telefone / WhatsApp<input id="tkFone" inputmode="tel" value="${esc(t.fone || '')}"></label>` }
  ];
  const navItem = sc => `<button type="button" class="dgnav" data-dg="${esc(sc.id)}" aria-selected="false">${iconeDe(sc.titulo)}<span>${esc(sc.titulo)}</span>${sc.marca || ''}</button>`;
  const painel = sc => `<section class="dgpainel${sc.ro ? ' ro' : ''}" data-dgp="${esc(sc.id)}" hidden><h4>${esc(sc.titulo)}${sc.sub ? `<small>${esc(sc.sub)}</small>` : ''}</h4><div class="${sc.ro ? 'dgro' : 'tkform'}">${sc.html}</div></section>`;
  abrirDlg('dados', t.id ? 'Dados gerais' + (t.apelido ? ' · ' + t.apelido : '') : 'Novo cadastro', `
    <form id="tkForm" class="dgwrap" data-id="${esc(t.id || '')}" novalidate>
      <nav class="dgmenu" aria-label="Seções">${secs.map(navItem).join('')}<div class="dgmais"></div></nav>
      <div class="dgcorpo">${secs.map(painel).join('')}<div class="dgmaisp"></div>
        <div class="tkacts"><button type="submit" class="primary">Salvar</button>${t.id && admin ? '<button type="button" class="danger" id="tkExcluir">Excluir cadastro</button>' : ''}</div></div>
    </form>`);
  dlg().classList.add('largo');
  mostrarDg(t.id ? 'status' : 'posto');
  if (!t.id) setTimeout(() => $('tkApelido').focus(), 30);
  if (t.propostaId) carregarDg(t, navItem, painel);
  if (t.central && t.central.tipo !== 'simples') anexosFiliais(t);
}
function mostrarDg(id) {
  document.querySelectorAll('#tkForm .dgnav').forEach(b => b.setAttribute('aria-selected', b.dataset.dg === id));
  document.querySelectorAll('#tkForm .dgpainel').forEach(p => { p.hidden = p.dataset.dgp !== id; });
}
// Respostas do Pré-Contrato e da Etapa 4, agrupadas pelas seções dos formulários
async function carregarDg(t, navItem, painel) {
  const pid = t.propostaId, form = $('tkForm');
  const ler = async (...c) => { try { const r = await F.getDoc(F.doc(db, ...c)); return r.exists() ? r.data() : null; } catch (e) { return null; } };
  const [e2, e4, pub2, cfg4] = await Promise.all([ler('propostas', pid, 'etapa2', 'resposta'), ler('propostas', pid, 'etapa4', 'dados'), ler('publico', 'etapa2'), ler('config', 'etapa4')]);
  let an = []; try { an = (await F.getDocs(F.collection(db, 'propostas', pid, 'anexos'))).docs.map(x => ({ id: x.id, ...x.data() })); } catch (e) {}
  if (!form.isConnected || $('tkForm') !== form) return;
  const json = d => { try { return d && d.json ? JSON.parse(d.json) : null; } catch (e) { return null; } };
  const titulosDe = cfg => ((cfg && cfg.secoes) || []).map(sc => ({ titulo: sc.titulo, labels: (sc.campos || []).filter(c => c.show !== false).map(c => c.label) }));
  // Agrupa "Rótulo: valor" pelas seções; aceita prefixo de filial (F1 - ...) e complementos (... - Senha)
  const agrupar = (campos, secoes, pre) => {
    const ent = Object.entries(campos || {}), usados = new Set(), out = [];
    secoes.forEach((sc, si) => {
      const rows = ent.filter(([k]) => !usados.has(k) && sc.labels.some(L => k === L || k.startsWith(L + ' - ') || k.endsWith(' - ' + L) || k.includes(' - ' + L + ' - ')));
      rows.forEach(([k]) => usados.add(k));
      out.push({ id: pre + si, titulo: sc.titulo, rows, total: sc.labels.length });
    });
    const resto = ent.filter(([k]) => !usados.has(k)); if (resto.length) out.push({ id: pre + 'x', titulo: secoes.length ? 'Outros' : 'Dados', rows: resto, total: resto.length });
    return out.filter(g => g.rows.length);
  };
  const linhas = rows => `<table class="tkdados"><tbody>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td style="white-space:pre-wrap">${valorOuLink(v)}</td></tr>`).join('')}</tbody></table>`;
  const grupos = [];
  if (e2) agrupar(e2.campos, titulosDe(json(pub2) || window.ETAPA2_PADRAO), 'e2_').forEach(g => grupos.push({ ...g, sub: 'Dados do cliente (Pré-Contrato)' }));
  if (e4) agrupar(e4.campos, e4.secoes || titulosDe((window.pretaskCompletar || (x => x))(json(cfg4))), 'e4_').forEach(g => grupos.push({ ...g, sub: 'Referência da implantação (Etapa 4)' }));
  const nomes4 = {}; Object.values((e4 && e4.valores) || {}).forEach(l => { if (Array.isArray(l)) l.forEach(a => { if (a && a.id && a.nome) nomes4[a.id] = a.nome; }); });
  const v2 = (e2 && e2.valores) || {};
  const arqs = an.map(x => { let nome = x.etapa === 4 ? nomes4[x.id] || x.nome : x.nome; if (!x.etapa && /logo/i.test(x.campo || '')) nome = [dig(v2.cnpj), v2.razao].map(y => String(y || '').replace(/[\\/:*?"<>|]+/g, '-').trim()).filter(Boolean).concat('Logo').join('_') + ((String(x.nome || '').match(/\.[^.]+$/) || [''])[0]); return { ...x, nome }; });
  const secs = grupos.map(g => ({ id: g.id, titulo: g.titulo, sub: g.sub, ro: true, marca: marcaDe(g.rows.length, Math.max(g.total, g.rows.length)), html: linhas(g.rows) }));
  if (arqs.length) secs.push({ id: 'anexos', titulo: 'Anexos', ro: true, marca: marcaDe(1, 1), html: botoesAnexos(pid, arqs) });
  if (!secs.length) return;
  form.querySelector('.dgmais').innerHTML = secs.map(navItem).join('');
  form.querySelector('.dgmaisp').innerHTML = secs.map(painel).join('');
}
// Pesquisar na ANP sem o CNPJ: ao escolher o posto, preenche CNPJ, razão social, cidade, UF e o nome do cadastro.
// Depois completa e-mail e telefone pela Receita (só nos campos vazios).
function pesquisarAnp() {
  window.anpPesquisa && window.anpPesquisa($('tkAnpBusca'), $('tkUf').value.trim(), async cnpj => {
    $('tkCnpj').value = fmtCnpj(cnpj);
    let p = null; try { p = await window.anpPosto(cnpj); } catch (e) {}
    if (p) {
      if (p.razao) $('tkRazao').value = p.razao;
      if (p.municipio) $('tkCidade').value = p.municipio;
      if (p.uf) $('tkUf').value = p.uf;
      if (!$('tkApelido').value.trim() && p.razao) $('tkApelido').value = p.razao;
      dmsg('Preenchido com os dados da ANP. Confira.');
    }
    await buscarCnpj(!!p);
    $('tkApelido').focus();
  });
}
async function buscarCnpj(daAnp) {
  // daAnp: veio da Pesquisar na ANP, que já preencheu o principal; a Receita só completa e não troca o aviso se falhar
  const d = dig($('tkCnpj').value); if (d.length !== 14) { dmsg('Digite um CNPJ com 14 números.'); return; }
  if (!daAnp) dmsg('Pesquisando…');
  const falha = t => { if (!daAnp) dmsg(t); };
  try {
    const r = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + d); if (!r.ok) { falha(r.status === 404 ? 'CNPJ não encontrado na Receita.' : 'Não foi possível pesquisar agora.'); return; }
    const j = await r.json(), set = (id, v) => { if (v && !$(id).value) $(id).value = v; };
    $('tkCnpj').value = fmtCnpj(d); set('tkRazao', j.razao_social); set('tkCidade', j.municipio); set('tkUf', j.uf); set('tkEmail', j.email && String(j.email).toLowerCase());
    set('tkApelido', j.nome_fantasia || j.razao_social);
    const f = dig(j.ddd_telefone_1); if (f.length >= 10) set('tkFone', f.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3'));
    dmsg(daAnp ? 'Preenchido com os dados da ANP e da Receita. Confira.' : 'Preenchido com os dados da Receita. Confira.');
  } catch (e) { falha('Não foi possível pesquisar agora.'); }
}
const respDe = id => { const v = $(id).value; if (!v) return null; const r = resps.find(x => x.uid === v) || tasks.flatMap(t => [t.respCadastro, t.respStart]).find(x => x?.uid === v); return r ? { uid: r.uid, nome: r.nome } : null; };
async function salvarDados(form) {
  const apelido = $('tkApelido').value.trim(); if (!apelido) { dmsg('Informe o nome do cadastro.'); mostrarDg('posto'); $('tkApelido').focus(); return; }
  const dados = { apelido, cnpj: dig($('tkCnpj').value), razao: $('tkRazao').value.trim(), cidade: $('tkCidade').value.trim(), uf: $('tkUf').value.trim().toUpperCase(),
    email: $('tkEmail').value.trim(), contato: $('tkContato').value.trim(), fone: $('tkFone').value.trim(), start: $('tkStart').value, dataBase: $('tkBase').value, obs: $('tkObs').value.trim(),
    respCadastro: respDe('tkRC'), respStart: respDe('tkRS'), status: $('tkStatus').value };
  const id = form.dataset.id;
  try {
    if (id) {
      const t = tasks.find(x => x.id === id), fin = dados.status === 'fin';
      if (fin !== !!t.finalizado) { dados.finalizado = fin; dados.finalizadoEm = fin ? F.serverTimestamp() : null; }
      await F.updateDoc(F.doc(db, 'tasks', id), { ...dados, alteradoEm: F.serverTimestamp(), alteradoPor: perfil.nome || perfil.email });
    } else {
      await F.addDoc(F.collection(db, 'tasks'), { ...dados, finalizado: dados.status === 'fin', checklists: [], criado: F.serverTimestamp(), criadoPor: perfil.nome || perfil.email });
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
    if (pr.total && pr.feitos === pr.total && !t.finalizado) { extra.finalizado = true; extra.status = 'fin'; extra.finalizadoEm = F.serverTimestamp(); }
    await F.updateDoc(F.doc(db, 'tasks', id), { checklists: cl, alteradoEm: F.serverTimestamp(), alteradoPor: perfil.nome || perfil.email, ...extra });
    t.checklists = cl; if (extra.finalizado) { t.finalizado = true; t.status = 'fin'; }
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
    const todas = qs.docs.map(d => ({ id: d.id, ...d.data() }));
    const ps = (window.sgViaUnica ? window.sgViaUnica(todas) : todas).filter(p => ![p.id, ...(p._viasIds || [])].some(id => ja.has(id)) && (!meusUfs || meusUfs.includes(String(p.uf || '').toUpperCase()) || meusUfs.includes(ufCidade(p.cidade)))).sort((a, b) => (b.aprovadoEm?.seconds || 0) - (a.aprovadoEm?.seconds || 0));
    $('tkDlgBody').innerHTML = ps.length ? `<p class="hint">Quando o vendedor conclui a Etapa 4 (Dados Referência Implantação), o cadastro é criado sozinho. Use esta lista para trazer antes uma proposta aprovada que ainda não chegou nessa fase, ou para trazer de volta um card removido.</p>
      <ul class="tkimp">${ps.map(p => `<li><div><b>${esc(p.cliente)}</b><small>Nº ${esc(p.numero)} · ${esc(p.cidade || '')} · ${esc(p.vendedor || '')}${p.e2Em ? ' · Pré-Contrato recebido' : ''}</small></div><button type="button" data-imp="${esc(p.id)}">Importar</button></li>`).join('')}</ul>`
      : '<p class="hint">Nenhuma proposta aprovada pendente de importação.</p>';
  } catch (e) { $('tkDlgBody').innerHTML = `<p class="hint">Não foi possível carregar as propostas (${esc(e.code || 'erro')}).</p>`; }
}
// Datas da Etapa 4 (pelo nome do campo): "Data da base" e a data do start
const isoDe = v => { v = String(v || ''); let m = v.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`; m = v.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/); if (!m) return ''; const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
async function datasE4(pid) {
  try {
    const r = await F.getDoc(F.doc(db, 'propostas', pid, 'etapa4', 'dados')); if (!r.exists()) return null;
    if (r.data().parcial) return null; // salvo parcial: o card só recebe o salvar final
    const c = Object.entries(r.data().campos || {}), em = r.data().em, emMs = em && em.toMillis ? em.toMillis() : em && em.seconds ? em.seconds * 1000 : 0;
    // Novo Pré TASK: cabeçalho estruturado (status, datas, modalidade, base e filiais)
    const pre = r.data().pre;
    if (pre && window.PreTask) return { pre, emMs, dataBase: pre.dataBase || '', start: pre.start || '', modalidade: pre.modalidade || '', status: pre.status || 'fut', central: window.PreTask.centralDoPre(pre), simples: false, campos: Object.fromEntries(c), por: r.data().por || '', porUid: r.data().porUid || '', porEmail: r.data().porEmail || '' };
    // Só aceita valores que são uma data inteira (evita pegar números de links, por exemplo)
    const ehData = v => /^\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\s*$/.test(String(v || ''));
    const achar = (...res) => { for (const re of res) { const e = c.find(([k, v]) => re.test(k) && ehData(v)); if (e) return isoDe(e[1]); } return ''; };
    // Central: nome da central e filiais (F1 - Posto - CNPJ), quando a Etapa 4 tiver filiais
    const val = r.data().valores || {}, filiais = [].concat(...Object.keys(val).filter(k => /__fil$/.test(k) && Array.isArray(val[k])).map(k => val[k]));
    const nc = c.find(([k, v]) => /nome.*central|central.*nome/i.test(k) && v && !/\n/.test(v)) || c.find(([k, v]) => /central/i.test(k) && !/filia/i.test(k) && v && !/\n/.test(v) && !/^\s*central\s*$/i.test(v));
    const central = filiais.length || nc ? { nome: nc ? String(nc[1]).trim() : '', filiais: filiais.map(f => ({ cod: f.cod || '', tipo: f.tipo || '', cnpj: f.cnpj || '', razao: f.razao || '', info: f.info || null, dados: f.dados || null })) } : null;
    const simples = !central && c.some(([k, v]) => /^\s*(posto\s+)?simples\s*$/i.test(String(v || '')));
    return { dataBase: achar(/da[dt]a.*base|base.*da[dt]a/i, /base/i), start: achar(/start|in[ií]cio da implanta/i), central, simples, campos: Object.fromEntries(c), por: r.data().por || '', porUid: r.data().porUid || '' };
  } catch (e) { return null; }
}
// Logo do posto ou rede: anexo do Pré-Contrato com "logo" no nome do campo, reduzido para uma miniatura
async function logoDe(pid) {
  try {
    const R = Array.isArray(pid) ? pid : ['propostas', pid]; // cadastro direto: ['tasks', id]
    const an = await F.getDocs(F.collection(db, ...R, 'anexos'));
    // Aceita imagem pelo tipo ou pela extensão, e PDF (usa a primeira página)
    const ehImg = x => /^image\//.test(x.tipo || '') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(x.nome || ''), ehPdf = x => /pdf/i.test(x.tipo || '') || /\.pdf$/i.test(x.nome || '');
    const lista = an.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => /logo|marca/i.test(x.campo || '') || /logo|marca/i.test(x.nome || ''));
    const a = lista.find(ehImg) || lista.find(ehPdf);
    if (!a) return '';
    const ps = await F.getDocs(F.collection(db, ...R, 'anexos', a.id, 'partes'));
    const b64 = ps.docs.sort((x, y) => x.id.localeCompare(y.id)).map(x => x.data().d).join('');
    let src;
    if (ehImg(a)) { const ext = (String(a.nome || '').match(/\.(\w+)$/) || [])[1] || 'png'; const tipo = /^image\//.test(a.tipo || '') ? a.tipo : 'image/' + (/svg/i.test(ext) ? 'svg+xml' : /jpe?g/i.test(ext) ? 'jpeg' : ext.toLowerCase()); src = `data:${tipo};base64,` + b64; }
    else {
      if (!window.ContratoSocial) await new Promise((ok, err) => { const sc = document.createElement('script'); sc.src = 'contrato-social.js'; sc.onload = ok; sc.onerror = err; document.head.appendChild(sc); });
      const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      src = (await window.ContratoSocial.miniatura(new File([u8], a.nome || 'logo.pdf', { type: 'application/pdf' }), 800)).url;
    }
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
const baseSimples = (d, cnpj) => { if (d && !d.central && d.simples && dig(cnpj).length === 14) d.central = { tipo: 'simples', nome: '', filiais: [{ cod: '', tipo: 'Posto', cnpj: fmtCnpj(cnpj), razao: '', info: null, dados: Object.fromEntries(Object.entries(d.campos || {}).filter(([k, v]) => !/^\s*(posto\s+)?simples\s*$/i.test(String(v || '')))) }] }; };
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
  abrirDlg('filiais', c.tipo === 'simples' ? 'Posto - ' + (t.apelido || t.razao || '') : 'Filiais' + (c.nome ? ' - ' + c.nome : ''), filiaisHtml(t));
  anexosFiliais(t);
}
function filiaisHtml(t) {
  const c = (t && t.central) || {}, fd = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : v || ''; };
  const tel = v => { v = dig(v); return v.length >= 10 ? v.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : v; };
  const linha = (l, v) => v ? `<div><small>${l}</small>${esc(v)}</div>` : '';
  return (c.filiais || []).map(f => { const i = f.info || {}; return `<div class="tkfilinfo"><h4>${esc([f.cod, f.tipo].filter(Boolean).join(' - '))}${f.f100 || (c.f100 && c.f100 === f.cod) ? ' <span class="tk100">F100</span>' : ''}<span>${esc(f.cnpj)}</span></h4>
    ${linha('Razão social', f.razao || i.razao)}${!i.municipio && f.cidade ? linha('Cidade', [f.cidade, f.uf].filter(Boolean).join(' - ')) : ''}${linha('Nome fantasia', i.fantasia)}${linha('Situação', i.situacao)}${linha('Abertura', fd(i.abertura))}${linha('Atividade principal', i.atividade)}${linha('Endereço', [i.endereco, [i.municipio, i.uf].filter(Boolean).join(' / '), i.cep ? 'CEP ' + String(i.cep).replace(/^(\d{5})(\d{3})$/, '$1-$2') : ''].filter(Boolean).join(' - '))}${linha('Telefone', tel(i.telefone))}${linha('E-mail', i.email)}
    ${Object.keys(f.dados || {}).length ? `<div class="tkfildados"><small>Dados da implantação</small><table>${Object.entries(f.dados).map(([k, x]) => `<tr><td>${esc(k)}</td><td>${valorOuLink(x)}</td></tr>`).join('')}</table></div>` : ''}
    <div class="tkfilanx" data-cod="${esc(f.cod)}"></div>
    ${f.info ? '' : '<p class="hint">Consulta do CNPJ ainda não disponível. Abra o TASK de novo em alguns instantes.</p>'}</div>`; }).join('') || '<p class="hint">Nenhuma filial informada.</p>';
}
function anexosFiliais(t) {
  const c = (t && t.central) || {};
  // Anexos da Etapa 4 de cada filial (campo começa com o código da filial)
  if (t && t.propostaId && c.tipo !== 'simples') anexosE4(t.propostaId).then(arqs => document.querySelectorAll('#tkDlgBody .tkfilanx').forEach(el => { const pre = el.dataset.cod + ' - '; el.innerHTML = botoesAnexos(t.propostaId, arqs.filter(a => String(a.campo || '').startsWith(pre)), pre); }));
  else if (t && t.propostaId) anexosE4(t.propostaId).then(arqs => { const el = document.querySelector('#tkDlgBody .tkfilanx'); if (el) el.innerHTML = botoesAnexos(t.propostaId, arqs); });
}
// Quem preencheu a Etapa 4 vira o responsável pelo cadastro
let todosU = [];
const respE4 = d => { if (!d || !d.por) return null; const u = (d.porUid && todosU.find(x => x.uid === d.porUid)) || todosU.find(x => x.nome === d.por); return { uid: u ? u.uid : (d.porUid || 'nome:' + d.por), nome: u ? u.nome : d.por, email: d.porEmail || '' }; };
const completando = new Set();
function completarDatas() {
  // Cadastro direto: só o logo (vem do anexo de logo do Pré TASK, guardado no próprio card)
  tasks.filter(t => t.origem === 'direto' && t.pre4 && (t.logoV !== 3 || !t.logo) && !completando.has(t.id)).forEach(t => {
    completando.add(t.id);
    logoDe(['tasks', t.id]).then(lg => { if (lg !== (t.logo || '') || t.logoV !== 3) return F.updateDoc(F.doc(db, 'tasks', t.id), { logo: lg, logoV: 3 }); }).catch(() => {});
  });
  // A Central é conferida uma vez por sessão, para refletir alterações feitas depois na Etapa 4
  tasks.filter(t => t.propostaId && !completando.has(t.id)).forEach(t => {
    completando.add(t.id);
    (async () => {
      const up = {};
      { const d = await datasE4(t.propostaId); baseSimples(d, t.cnpj);
        // Pré TASK salvo depois da última sincronização: o card passa a refletir o que foi validado
        if (d && d.pre && d.emMs && d.emMs > (t.preSync || 0)) { Object.assign(up, { status: d.status, finalizado: d.status === 'fin', dataBase: d.dataBase, start: d.start, modalidade: d.modalidade, preSync: d.emMs }); if (respE4(d)) up.respCadastro = { ...respE4(d), email: d.porEmail || '' }; if (d.status === 'fin' && !t.finalizado) up.finalizadoEm = F.serverTimestamp(); } if (!t.respCadastro?.nome && respE4(d)) up.respCadastro = respE4(d); if (d && d.central) await razoesFiliais(d.central, t.central); const sig = c => c ? [c.tipo || '', c.nome, ...(c.filiais || []).map(f => [f.cod, f.tipo, f.cnpj, f.razao || '', f.info ? 1 : 0, JSON.stringify(Object.entries(f.dados || {}).sort())].join('|'))].join('\n') : ''; if (d && sig(d.central) !== sig(t.central)) up.central = d.central || null; }
      if (!t.dataBase && !up.preSync) { const d = await datasE4(t.propostaId); if (d && d.dataBase) up.dataBase = d.dataBase; else if (t.dataBase === undefined) up.dataBase = ''; if (!t.start && d && d.start) up.start = d.start; }
      // Logo: refaz se é de versão antiga ou se ainda não tinha (o anexo pode ter chegado depois)
      if (t.logoV !== 3 || !t.logo) { const lg = await logoDe(t.propostaId); if (lg !== (t.logo || '') || t.logoV !== 3) { up.logo = lg; up.logoV = 3; } }
      if (Object.keys(up).length) await F.updateDoc(F.doc(db, 'tasks', t.id), up);
    })().catch(() => {});
  });
}
const limite = (pr, ms, padrao) => Promise.race([Promise.resolve(pr).catch(() => padrao), new Promise(ok => setTimeout(() => ok(padrao), ms))]);
// Cria o cadastro a partir da proposta (id do cadastro = id da proposta, para não duplicar)
async function criarDaProposta(pid, auto) {
  const ref = F.doc(db, 'tasks', pid);
  const atual = await F.getDoc(ref);
  // Removido pelo ADM: o automático respeita a remoção, a importação manual traz de volta
  if (atual.exists() && (auto || !atual.data().removido)) return null;
  const p = (await F.getDoc(F.doc(db, 'propostas', pid))).data();
  let v = {}; try { const r = await F.getDoc(F.doc(db, 'propostas', pid, 'etapa2', 'resposta')); if (r.exists()) v = r.data().valores || {}; } catch (e) {}
  const sc = window.splitCidade ? window.splitCidade(p.cidade) : { cidade: p.cidade || '', uf: '' };
  const d4 = (await datasE4(pid)) || {}; baseSimples(d4, v.cnpj || p.cnpj);
  // Consulta de CNPJ das filiais e miniatura do logo têm limite de tempo: antes, se uma delas travasse
  // (site de CNPJ sem responder, PDF do logo que não abre), o card nunca era criado (nem no automático, nem no Importar).
  // O que ficar faltando o completarDatas() refaz depois, com o card já no quadro.
  if (d4.central) await limite(razoesFiliais(d4.central), 15000, null);
  const logo = await limite(logoDe(pid), 15000, '');
  const novo = { dataBase: d4.dataBase || '', central: d4.central || null, logo, logoV: 3,
    apelido: v.fantasia || p.cliente || '', razao: v.razao || p.cliente || '', cnpj: dig(v.cnpj || p.cnpj), cidade: v.cidade || sc.cidade, uf: (v.uf || sc.uf || '').toUpperCase(),
    email: v.respEmail || v.finEmail || '', contato: v.respNome || p.ctAceitoNome || p.contato || '', fone: v.respFone || p.fone || '',
    respCadastro: respE4(d4) || (auto ? null : { uid: perfil.uid, nome: perfil.nome || perfil.email }), respStart: null, start: d4.start || v.dataImpl || '', obs: v.obs || '',
    propostaId: pid, propostaNumero: p.numero || '', vendedor: p.vendedor || '', finalizado: d4.status === 'fin', status: d4.status || 'fut', modalidade: d4.modalidade || '', preSync: d4.emMs || 0, checklists: [],
    criado: F.serverTimestamp(), criadoPor: auto ? 'Automático (Etapa 4 concluída)' : (perfil.nome || perfil.email), auto: !!auto
  };
  await F.setDoc(ref, novo);
  window.TK_aoPronto(pid, novo.apelido); // card nasce pronto (Pré TASK salvo): avisa quem é liberado pelo TASK pronto
  return novo;
}
// Pré TASK salvo (salvar final) por quem pode mexer no TASK: o card nasce na hora, sem depender
// de alguém estar com o quadro do TASK aberto. Respeita card removido e cadastro direto já vinculado à proposta.
window.TK_criarDaProposta = async pid => {
  if (!F || !db || !pid || !tasksOk || criando.has(pid) || removidas.has(pid)) return null;
  if (tasks.some(t => t.id === pid || t.propostaId === pid || t.propostaVinc === pid)) return null;
  criando.add(pid);
  try { return await criarDaProposta(pid, true); } finally { criando.delete(pid); }
};
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
  const tem = new Set([...tasks.flatMap(t => [t.id, t.propostaId, t.propostaVinc]).filter(Boolean), ...removidas]);
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
    const arqs = an.docs.map(x => ({ id: x.id, ...x.data() })).filter(x => !x.etapa);
    $('tkDlgBody').innerHTML = `<div id="tkE2" data-pid="${esc(pid)}">
      ${d.em ? `<p class="hint">Enviado pelo cliente em ${esc(fmtTs(d.em))}.</p>` : ''}
      <table class="tkdados"><tbody>${Object.entries(d.campos || {}).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('') || '<tr><td>Sem respostas salvas.</td></tr>'}</tbody></table>
      ${arqs.length ? `<h4 class="tkh4">Anexos</h4><div class="tkanexos">${arqs.map(x => { if (/logo/i.test(x.campo || '')) { const v = d.valores || {}, ext = (String(x.nome || '').match(/\.[^.]+$/) || [''])[0]; x.nome = [dig(v.cnpj), v.razao].map(y => String(y || '').replace(/[\\/:*?"<>|]+/g, '-').trim()).filter(Boolean).concat('Logo').join('_') + ext; } return x; }).map(x => `<button type="button" data-anexo="${esc(x.id)}" data-nome="${esc(x.nome)}">⬇ ${esc(x.nome)} <small>${esc(x.campo || '')} · ${(Number(x.tamanho || 0) / 1048576).toFixed(1)} MB</small></button>`).join('')}</div>` : ''}
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
// Valor que é um link: mostra só um botão para copiar
const valorOuLink = v => { const t = String(v == null ? '' : v).trim(); return /^https?:\/\/\S+$/i.test(t) ? `<button type="button" class="tkcopia" data-link="${esc(t)}">Copiar link</button>` : esc(v); };
const botoesAnexos = (pid, arqs, tira) => arqs.length ? `<h4 class="tkh4">Anexos</h4><div class="tkanexos">${arqs.map(x => `<button type="button" data-anexo="${esc(x.id)}" data-pid="${esc(pid)}" data-nome="${esc(x.nome)}">⬇ ${esc(x.nome)} <small>${esc(tira ? String(x.campo || '').replace(tira, '') : x.campo || '')} · ${(Number(x.tamanho || 0) / 1024).toFixed(0)} KB</small></button>`).join('')}</div>` : '';
// Anexos da Etapa 4, com o nome padrão (F1_CNPJ_Senha) guardado nas respostas
const anexosE4 = async pid => {
  try {
    const [an, r] = await Promise.all([F.getDocs(F.collection(db, 'propostas', pid, 'anexos')), F.getDoc(F.doc(db, 'propostas', pid, 'etapa4', 'dados')).catch(() => null)]);
    const nomes = {}; Object.values((r && r.exists() && r.data().valores) || {}).forEach(l => { if (Array.isArray(l)) l.forEach(a => { if (a && a.id && a.nome) nomes[a.id] = a.nome; }); });
    return an.docs.map(x => ({ id: x.id, ...x.data() })).filter(x => x.etapa === 4).map(x => ({ ...x, nome: nomes[x.id] || x.nome }));
  } catch (e) { return []; }
};
async function verRef(pid) {
  const p = (aprovadas || []).find(x => x.id === pid) || {};
  abrirDlg('e4', 'Dados referência implantação · ' + (p.cliente || ''), '<p class="hint">Carregando…</p>');
  try {
    const [r, arqs] = await Promise.all([F.getDoc(F.doc(db, 'propostas', pid, 'etapa4', 'dados')), anexosE4(pid)]); const d = r.exists() ? r.data() : { campos: {} };
    $('tkDlgBody').innerHTML = `${d.por ? `<p class="hint">Preenchido por ${esc(d.por)}${d.em ? ' em ' + esc(fmtTs(d.em)) : ''}.</p>` : ''}
      <table class="tkdados"><tbody>${Object.entries(d.campos || {}).map(([k, v]) => `<tr><th>${esc(k)}</th><td style="white-space:pre-wrap">${valorOuLink(v)}</td></tr>`).join('') || '<tr><td>Nada preenchido.</td></tr>'}</tbody></table>${botoesAnexos(pid, arqs)}`;
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
    const l = document.createElement('a'); l.href = url; l.download = bt.dataset.nome || meta.nome || 'anexo'; document.body.appendChild(l); l.click(); l.remove();
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
  $('tkMinhas').addEventListener('click', () => { minhas = !minhas; desenhar(); });
  $('tkGrid').addEventListener('change', e => { if (e.target.id === 'tkSetor') { setorVer = e.target.value; desenhar(); } });
  $('tkGrid').addEventListener('click', e => { const it = e.target.closest('[data-mtid]'); if (it) formMods(it.dataset.mtid, it.dataset.mtmod); });
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
    if (b.dataset.tk === 'mods') return formMods(id);
    if (b.dataset.tk === 'vermods') { if (modsAbertos.has(id)) modsAbertos.delete(id); else modsAbertos.add(id); desenhar(); return; }
    if (b.dataset.tk === 'linkbase') { const lk = linkBaseDe(tasks.find(t => t.id === id) || {}); if (!lk) return formMods(id, modDoLink());
      const ok = () => { b.classList.add('ok'); b.title = 'Link copiado'; msg('Link da base copiado: ' + lk.url); setTimeout(() => { b.classList.remove('ok'); b.title = 'Copiar link para baixar a base'; }, 1800); };
      const reserva = () => { const ta = document.createElement('textarea'); ta.value = lk.url; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { msg('Copie o link: ' + lk.url); } ta.remove(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(lk.url).then(ok, reserva); else reserva(); return; }
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
    const dg = e.target.closest('[data-dg]'); if (dg) return mostrarDg(dg.dataset.dg);
    const md = e.target.closest('[data-md]'); if (md) return formMods($('tkMods').dataset.id, md.dataset.md);
    const ps = e.target.closest('[data-pst]');
    const tkM = () => tasks.find(x => x.id === $('tkMods').dataset.id) || {}, mdM = () => (MODS.secoes || []).find(x => x.id === $('tkMods').dataset.mid);
    if ((ps || e.target.closest('[data-motok]') || e.target.closest('[data-mdsalvar]') || e.target.closest('[data-pdadd]') || e.target.closest('[data-pdres]')) && $('tkMods') && !podeEditar(tkM(), mdM())) { dmsg(podeMod(mdM()) ? 'Este módulo ainda aguarda liberação.' : 'Só o setor responsável altera este módulo.'); return; }
    // Liberar agora (ADM ou setor que normalmente libera)
    if (e.target.closest('[data-mdlib]')) { const id = $('tkMods').dataset.id, m0 = topDe(mdM()); if (!podeLiberar(tkM(), m0)) return; return salvarMods(id, mods => { const x = mods[m0.id] = mods[m0.id] || {}; x.lib = { manual: true, em: Date.now(), por: quemSou() }; }, $('tkMods').dataset.mid); }
    // Pendências
    if (e.target.closest('[data-pdadd]')) {
      const id = $('tkMods').dataset.id, mid = $('tkMods').dataset.mid, txt = $('pdTxt').value.trim(), com = $('pdCom').value, prazo = $('pdPrazo').value, pid = $('pdProc').value;
      if (!txt) { dmsg('Descreva o que está faltando.'); $('pdTxt').focus(); return; }
      const mm = mdM(), pp = pid && (mm.processos || []).find(x => x.id === pid);
      return salvarMods(id, mods => { const x = mods[mid] = mods[mid] || {}; x.pend = (x.pend || []).concat([{ id: uid(), txt, com, prazo, pid: pid || '', st: 'ab', em: Date.now(), por: quemSou() }]);
        if (pp) { x.proc = x.proc || {}; const ant = x.proc[pid] || {}; x.proc[pid] = { ...ant, st: 'pa', por: quemSou(), em: Date.now(), desde: ant.st === 'pa' ? (ant.desde || Date.now()) : Date.now(), motivo: txt }; } },
        mid, `abriu pendência com ${com}: ${txt}${prazo ? ' (prazo ' + fmtD(prazo) + ')' : ''}${pp ? '. "' + pp.t + '" ficou Parado' : ''}.`).then(ok => { if (ok) dmsg('Pendência aberta.'); });
    }
    const pr = e.target.closest('[data-pdres]');
    if (pr) {
      const id = $('tkMods').dataset.id, mid = $('tkMods').dataset.mid, pdid = pr.dataset.pdres, p0 = pendsDe(tkM(), mid).find(x => x.id === pdid); if (!p0) return;
      const mm = mdM(), pp = p0.pid && (mm.processos || []).find(x => x.id === p0.pid);
      return salvarMods(id, mods => { const x = mods[mid] = mods[mid] || {}; x.pend = (x.pend || []).map(q => q.id === pdid ? { ...q, st: 're', resEm: Date.now(), resPor: quemSou() } : q);
        const outras = x.pend.some(q => q.st !== 're' && q.pid === p0.pid); const pc = p0.pid && (x.proc || {})[p0.pid];
        if (pc && pc.st === 'pa' && !outras) x.proc[p0.pid] = { ...pc, st: 'an', por: quemSou(), em: Date.now(), desde: Date.now(), motivo: '' }; },
        mid, `resolveu a pendência: ${p0.txt}${pp ? '. "' + pp.t + '" voltou para Em andamento' : ''}.`).then(ok => { if (ok) dmsg('Pendência resolvida.'); });
    }
    // Diário: anotação livre (qualquer pessoa que abre o TASK)
    if (e.target.closest('[data-hnota]')) { const id = $('tkMods').dataset.id, mid = $('tkMods').dataset.mid, v = $('hNota').value.trim(); if (!v) { $('hNota').focus(); return; } return salvarMods(id, () => {}, mid, 'anotou: ' + v).then(ok => { if (ok) dmsg('Anotado no diário.'); }); }
    if (e.target.closest('[data-hmais]')) { diarioTudo[$('tkMods').dataset.id + $('tkMods').dataset.mid] = true; return formMods($('tkMods').dataset.id, $('tkMods').dataset.mid); }
    if (ps) {
      const id = $('tkMods').dataset.id, mid = $('tkMods').dataset.mid, pid = ps.dataset.pid, st = ps.dataset.pst, quem = perfil.nome || perfil.email;
      const mm = (MODS.secoes || []).find(x => x.id === mid), pp = mm && (mm.processos || []).find(x => x.id === pid);
      if (st === 'fi' && exigeLink(mm, pp)) { const t0 = tasks.find(x => x.id === id), s0 = t0 && procDe(t0, mid, pid); if (s0 && s0.st === 'fi') return; pedeLink = { id, mid, pid }; formMods(id, mid); dmsg('Informe o link da base para finalizar esta etapa.'); return; }
      if (pedeLink && pedeLink.pid === pid) pedeLink = null;
      return salvarMods(id, mods => { const m = mods[mid] = mods[mid] || {}; m.proc = m.proc || {}; const ant = m.proc[pid] || {}; m.proc[pid] = { st, por: quem, em: Date.now(), desde: ant.st === st ? (ant.desde || ant.em || Date.now()) : Date.now(), motivo: st === 'pa' ? (ant.motivo || '') : '' }; }, mid, `mudou "${pp ? pp.t : pid}" para ${PST[st] || st}.`).then(ok => { if (ok && st === 'pa') { const i = document.querySelector(`[data-mot="${CSS.escape(pid)}"]`); if (i) i.focus(); dmsg('Informe o motivo da parada.'); } });
    }
    const ft = e.target.closest('[data-mdtodos]');
    if (ft) {
      const id = $('tkMods').dataset.id, mid = $('tkMods').dataset.mid, t = tasks.find(x => x.id === id), mm = (MODS.secoes || []).find(x => x.id === mid);
      if (!t || !mm || !podeEditar(t, mm)) { dmsg(mm && podeMod(mm) ? 'Este módulo ainda aguarda liberação.' : 'Só o setor responsável altera este módulo.'); return; }
      const pend = (mm.processos || []).filter(p => { const s = procDe(t, mid, p.id); return !s || s.st !== 'fi'; }); if (!pend.length) return;
      if (!confirmar(ft, 'todos' + id + mid, `Confirmar (${pend.length})`)) { const pa = pend.filter(p => (procDe(t, mid, p.id) || {}).st === 'pa').length; dmsg(`Finalizar ${pend.length} processo${pend.length > 1 ? 's' : ''} de uma vez${pa ? ` (${pa} parado${pa > 1 ? 's' : ''})` : ''}? Clique de novo para confirmar.`); return; }
      const pl = pend.find(p => exigeLink(mm, p));
      if (pl) { const url = (linkBaseDe(t) || {}).url || ''; if (!url || !urlOk(url)) { pedeLink = { id, mid, pid: pl.id, todos: true }; formMods(id, mid); dmsg(`"${pl.t}" só finaliza com o link da base. Informe o link para finalizar todos.`); return; } return finalizarTodos(id, mid, url); }
      return finalizarTodos(id, mid, '');
    }
    const la = e.target.closest('[data-lkalt]');
    if (la) { pedeLink = { id: $('tkMods').dataset.id, mid: $('tkMods').dataset.mid, pid: la.dataset.lkalt }; return formMods(pedeLink.id, pedeLink.mid); }
    if (e.target.closest('[data-lkcanc]')) { const id = $('tkMods').dataset.id, mid = $('tkMods').dataset.mid; pedeLink = null; formMods(id, mid); return; }
    const lo = e.target.closest('[data-lkok]');
    if (lo) {
      if (!podeEditar(tasks.find(x => x.id === $('tkMods').dataset.id) || {}, (MODS.secoes || []).find(x => x.id === $('tkMods').dataset.mid))) { dmsg('Só o setor responsável altera este módulo, depois de liberado.'); return; }
      const id = $('tkMods').dataset.id, mid = $('tkMods').dataset.mid, pid = lo.dataset.lkok, inp = document.querySelector(`[data-lk="${CSS.escape(pid)}"]`), url = comHttp(inp && inp.value), quem = perfil.nome || perfil.email;
      if (!url) { dmsg('Informe o link da base. Sem ele a etapa não é finalizada.'); if (inp) inp.focus(); return; }
      if (!urlOk(url)) { dmsg('Link inválido. Cole o endereço completo da base (ex.: https://…).'); if (inp) inp.focus(); return; }
      if (pedeLink && pedeLink.todos && pedeLink.id === id && pedeLink.mid === mid) return finalizarTodos(id, mid, url);
      const cl = campoLinkBase();
      return salvarMods(id, mods => { const m = mods[mid] = mods[mid] || {}; m.proc = m.proc || {}; const ant = m.proc[pid] || {}; m.proc[pid] = ant.st === 'fi' ? { ...ant, link: url, linkPor: quem, linkEm: Date.now() } : { st: 'fi', por: quem, em: Date.now(), desde: Date.now(), motivo: '', link: url }; const x = mods[cl.mid] = mods[cl.mid] || {}; x.dados = { ...(x.dados || {}), [cl.k]: url, [cl.lib]: 'Sim' }; pedeLink = null; }, mid, `finalizou com o link da base: ${url}`).then(ok => { if (ok) dmsg('Etapa finalizada com o link da base.'); });
    }
    const mk = e.target.closest('[data-motok]');
    if (mk) { const id = $('tkMods').dataset.id, mid = $('tkMods').dataset.mid, pid = mk.dataset.motok, v = document.querySelector(`[data-mot="${CSS.escape(pid)}"]`).value.trim(); return salvarMods(id, mods => { const p = ((mods[mid] || {}).proc || {})[pid]; if (p) p.motivo = v; }, mid, v ? 'informou o motivo da parada: ' + v : '').then(ok => { if (ok) dmsg('Motivo salvo.'); }); }
    const ms = e.target.closest('[data-mdsalvar]');
    if (ms) {
      const id = $('tkMods').dataset.id, mid = $('tkMods').dataset.mid, m = (MODS.secoes || []).find(x => x.id === mid), root = $('mdDados');
      const r = window.PtCampos.lerCampos(root, (m.campos || []).filter(x => x.show !== false), '', {});
      if (r.falta) { dmsg('Preencha os campos obrigatórios.'); r.falta.focus(); return; }
      return salvarMods(id, mods => { const x = mods[mid] = mods[mid] || {}; x.dados = r.valores; x.dadosPor = perfil.nome || perfil.email; x.dadosEm = Date.now(); }, mid, 'salvou os dados do módulo.').then(ok => { if (ok) dmsg('Dados salvos.'); });
    }
    const cl = e.target.closest('[data-link]');
    if (cl) { try { await navigator.clipboard.writeText(cl.dataset.link); } catch (er) { const ta = document.createElement('textarea'); ta.value = cl.dataset.link; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } cl.textContent = 'Link copiado ✓'; setTimeout(() => { cl.textContent = 'Copiar link'; }, 1800); return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'tkBuscaCnpj') return buscarCnpj();
    if (b.id === 'tkAnpBtn') return pesquisarAnp();
    if (b.dataset.anexo) return baixarAnexo(b.dataset.pid || $('tkE2').dataset.pid, b.dataset.anexo, b);
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

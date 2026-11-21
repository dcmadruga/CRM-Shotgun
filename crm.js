// Módulo CRM: leads, funil de vendas e clientes. Roda para vendedores e administradores.
// Dados: crm/{id} com tipo 'lead' (contatos antes da proposta) ou 'cliente' (anotações da ficha do cliente).
// O funil e a lista de clientes também usam as propostas (coleção propostas), sem copiar os dados delas.
let F, db, perfil, admin = false, temTask = false, unsubC = null, unsubP = null;
let docs = [], props = [], tasksCache = null, aba = 'funil', soMinhas = false;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dig = v => String(v || '').replace(/\D/g, '');
const hoje = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmtD = iso => { if (!iso) return ''; const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
const fmtTs = ts => ts && ts.toDate ? ts.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : (typeof ts === 'string' ? new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');
const fmtCnpj = v => { const d = dig(v); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : (v || ''); };
const brl = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\b(ltda|me|epp|eireli|s\/?a)\b/g, '').replace(/[^a-z0-9]/g, '');
const chave = (cnpj, nome) => dig(cnpj).length === 14 ? dig(cnpj) : 'n' + norm(nome);
const quem = () => perfil.nome || perfil.email || '';
const msg = t => { const el = $('crmMsg'); if (!el) return; el.textContent = t || ''; el.hidden = !t; if (t) { clearTimeout(msg.t); msg.t = setTimeout(() => { el.hidden = true; }, 6000); } };

const ETAPAS = [
  { id: 'lead', nome: 'Lead' },
  { id: 'qualificado', nome: 'Qualificado' },
  { id: 'enviada', nome: 'Proposta enviada' },
  { id: 'aprovada', nome: 'Proposta aprovada' },
  { id: 'contrato', nome: 'Contrato aceito' },
  { id: 'perdido', nome: 'Perdido' }
];
const ORIGENS = ['Indicação', 'Site', 'Evento', 'Prospecção ativa', 'Redes sociais', 'Cliente antigo', 'Outro'];
const MOTIVOS = ['Preço', 'Escolheu concorrente', 'Sem interesse no momento', 'Sem retorno', 'Fora do perfil', 'Outro'];
const TIPOS_NOTA = ['Ligação', 'WhatsApp', 'Visita', 'E-mail', 'Reunião', 'Anotação'];

window.addEventListener('shotgun-crm', e => { ({ F, db, perfil, admin, temTask } = e.detail); iniciar(); });
window.addEventListener('argo-sair', () => { if (unsubC) unsubC(); if (unsubP) unsubP(); unsubC = unsubP = null; docs = []; props = []; tasksCache = null; });

function iniciar() {
  if (unsubC) unsubC();
  if (unsubP) unsubP();
  const col = F.collection(db, 'crm');
  unsubC = F.onSnapshot(admin ? col : F.query(col, F.where('owner', '==', perfil.uid)), qs => {
    docs = qs.docs.map(d => ({ id: d.id, ...d.data() })); desenhar();
  }, e => msg('Não foi possível carregar o CRM (' + (e.code || 'erro') + ').' + (e.code === 'permission-denied' ? ' As regras do banco ainda não liberam o CRM.' : '')));
  const pc = F.collection(db, 'propostas');
  unsubP = F.onSnapshot(admin ? F.query(pc, F.orderBy('criado', 'desc'), F.limit(500)) : F.query(pc, F.where('owner', '==', perfil.uid)), qs => {
    props = qs.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.status !== 'substituida').sort((a, b) => (b.criado?.seconds || 9e9) - (a.criado?.seconds || 9e9)); desenhar();
  }, () => {});
  $('crmMinhas').closest('label').hidden = !admin;
  desenhar();
}

/* ---------- Dados derivados ---------- */
const meu = x => !soMinhas || x.owner === perfil.uid;
const leads = () => docs.filter(d => d.tipo === 'lead' && meu(d));
const notasCli = () => docs.filter(d => d.tipo === 'cliente');
const etapaProp = p => p.crmPerdida ? 'perdido' : p.ctAceitoEm ? 'contrato' : p.status === 'aprovada' ? 'aprovada' : 'enviada';
// Proposta que nasceu do lead (pelo vínculo gravado, pelo CNPJ ou pelo nome)
function propDoLead(l) {
  const k = chave(l.cnpj, l.empresa);
  return props.find(p => p.leadId === l.id) || props.find(p => chave(p.cnpj, p.cliente) === k);
}
function cards() {
  const out = [];
  leads().forEach(l => { if (!propDoLead(l)) out.push({ tipo: 'lead', id: l.id, etapa: ETAPAS.some(e => e.id === l.etapa) && ['lead', 'qualificado', 'perdido'].includes(l.etapa) ? l.etapa : 'lead', titulo: l.empresa || '(sem nome)', sub: [l.contato, l.origem].filter(Boolean).join(' · '), prox: l.prox, dono: l.vendedor, ref: l }); });
  props.filter(meu).forEach(p => out.push({ tipo: 'prop', id: p.id, etapa: etapaProp(p), titulo: p.cliente || '(sem nome)', sub: `Nº ${p.numero || ''} · ${brl(p.totMen)}/mês`, valor: Number(p.totMen) || 0, lic: Number(p.totLic) || 0, dono: p.vendedor, ref: p }));
  return out;
}
function clientes() {
  const mapa = new Map();
  props.filter(meu).forEach(p => {
    const k = chave(p.cnpj, p.cliente);
    if (!mapa.has(k)) mapa.set(k, { k, nome: p.cliente, cnpj: p.cnpj, cidade: p.cidade, owner: p.owner, vendedor: p.vendedor, props: [], ativo: false });
    const c = mapa.get(k); c.props.push(p);
    if (p.ctAceitoEm) { c.ativo = true; c.nome = p.cliente || c.nome; c.cidade = p.cidade || c.cidade; }
  });
  return [...mapa.values()].filter(c => c.ativo).map(c => {
    const aceitas = c.props.filter(p => p.ctAceitoEm);
    c.men = aceitas.reduce((s, p) => s + (Number(p.totMen) || 0), 0);
    c.desde = aceitas.map(p => p.ctAceitoEm?.toDate ? p.ctAceitoEm.toDate() : null).filter(Boolean).sort((a, b) => a - b)[0];
    c.doc = notasCli().find(d => d.id === 'c_' + c.k);
    return c;
  }).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
}

/* ---------- Telas ---------- */
function desenhar() {
  if (!$('viewCrm') || !perfil) return;
  document.querySelectorAll('#crmNav button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.aba === aba)));
  ['funil', 'leads', 'clientes'].forEach(a => { $('crm-' + a).hidden = a !== aba; });
  $('crmBusca').hidden = aba === 'funil';
  $('crmBusca').placeholder = aba === 'leads' ? 'Buscar lead por empresa, contato ou CNPJ' : 'Buscar cliente por nome ou CNPJ';
  if (aba === 'funil') desenharFunil(); else if (aba === 'leads') desenharLeads(); else desenharClientes();
  const ls = leads().filter(l => !propDoLead(l) && l.etapa !== 'perdido');
  $('crmCount').textContent = `${ls.length} lead${ls.length === 1 ? '' : 's'} em aberto · ${clientes().length} cliente${clientes().length === 1 ? '' : 's'}`;
}

function desenharFunil() {
  const cs = cards(), h = hoje();
  $('crm-funil').innerHTML = ETAPAS.map(e => {
    const lista = cs.filter(c => c.etapa === e.id);
    const men = lista.reduce((s, c) => s + (c.valor || 0), 0);
    return `<div class="crmcol" data-etapa="${e.id}"><h4><span>${e.nome}</span><b>${lista.length}</b></h4>
      <small class="crmtot">${men ? brl(men) + '/mês' : '&nbsp;'}</small>
      ${lista.map(c => `<button type="button" class="crmc ${c.tipo}${c.prox && c.prox < h && c.etapa !== 'perdido' ? ' atras' : ''}" draggable="true" data-tipo="${c.tipo}" data-id="${esc(c.id)}">
        <b>${esc(c.titulo)}</b><small>${esc(c.sub)}</small>
        ${c.tipo === 'lead' && c.prox ? `<small class="crmprox">Próximo contato: ${fmtD(c.prox)}</small>` : ''}
        ${c.tipo === 'prop' && c.ref.crmMotivo ? `<small class="crmprox">${esc(c.ref.crmMotivo)}</small>` : ''}
        ${admin && c.dono ? `<small class="crmdono">${esc(c.dono)}</small>` : ''}
      </button>`).join('') || '<p class="vazio">Nada aqui</p>'}</div>`;
  }).join('');
}

function desenharLeads() {
  const q = norm($('crmBusca').value), h = hoje();
  const ls = leads().filter(l => !q || norm([l.empresa, l.contato, l.cnpj, l.cidade].join(' ')).includes(q))
    .sort((a, b) => (a.prox || '9999') .localeCompare(b.prox || '9999'));
  $('crm-leads').innerHTML = ls.length ? `<div class="crmlist">${ls.map(l => {
    const p = propDoLead(l), et = p ? ETAPAS.find(e => e.id === etapaProp(p)).nome : (ETAPAS.find(e => e.id === l.etapa) || ETAPAS[0]).nome;
    return `<button type="button" class="crmrow${l.prox && l.prox < h && !p && l.etapa !== 'perdido' ? ' atras' : ''}" data-tipo="lead" data-id="${esc(l.id)}">
      <span><b>${esc(l.empresa || '(sem nome)')}</b><small>${esc([l.contato, l.fone, l.cidade].filter(Boolean).join(' · '))}</small></span>
      <span><small>${esc(l.origem || '')}</small>${admin && l.vendedor ? `<small>${esc(l.vendedor)}</small>` : ''}</span>
      <span><small>${l.prox ? 'Próx.: ' + fmtD(l.prox) : 'Sem próximo contato'}</small><span class="pill">${esc(et)}</span></span>
    </button>`; }).join('')}</div>` : `<p class="hint">${q ? 'Nenhum lead encontrado.' : 'Nenhum lead ainda. Clique em "+ Novo lead" para cadastrar o primeiro contato.'}</p>`;
}

function desenharClientes() {
  const q = norm($('crmBusca').value);
  const cs = clientes().filter(c => !q || norm(c.nome + ' ' + c.cnpj).includes(q) || dig(c.cnpj).includes(dig($('crmBusca').value) || '#'));
  $('crm-clientes').innerHTML = cs.length ? `<div class="crmlist">${cs.map(c => {
    const ult = (c.doc?.notas || []).slice(-1)[0];
    return `<button type="button" class="crmrow" data-tipo="cli" data-id="${esc(c.k)}">
      <span><b>${esc(c.nome)}</b><small>${esc([fmtCnpj(c.cnpj), c.cidade].filter(Boolean).join(' · '))}</small></span>
      <span><small>${brl(c.men)}/mês</small>${admin && c.vendedor ? `<small>${esc(c.vendedor)}</small>` : ''}</span>
      <span><small>${ult ? esc(ult.tipo) + ' em ' + fmtTs(ult.em) : c.desde ? 'Cliente desde ' + c.desde.toLocaleDateString('pt-BR') : ''}</small><span class="pill">${c.props.length} proposta${c.props.length === 1 ? '' : 's'}</span></span>
    </button>`; }).join('')}</div>` : `<p class="hint">${q ? 'Nenhum cliente encontrado.' : 'Os clientes aparecem aqui quando o contrato de uma proposta é aceito.'}</p>`;
}

/* ---------- Diálogo ---------- */
const dlg = () => $('crmDlg');
function abrirDlg(tit, html) { $('crmDlgTit').textContent = tit; $('crmDlgBody').innerHTML = html; $('crmDlgMsg').textContent = ''; if (!dlg().open) dlg().showModal(); }
const dmsg = t => { $('crmDlgMsg').textContent = t || ''; };

function notasHtml(notas) {
  const ns = (notas || []).slice().reverse();
  return `<div class="crmhist"><h4>Histórico</h4>
    <div class="crmnova"><select id="crmNTipo" aria-label="Tipo">${TIPOS_NOTA.map(t => `<option>${t}</option>`).join('')}</select>
      <input id="crmNTexto" placeholder="O que aconteceu? Ex.: liguei, pediu retorno na sexta" maxlength="1000">
      <button type="button" id="crmNAdd">Anotar</button></div>
    ${ns.length ? `<ul>${ns.map(n => `<li><span class="pill">${esc(n.tipo)}</span> <small>${fmtTs(n.em)}${n.por ? ' · ' + esc(n.por) : ''}</small><p>${esc(n.texto)}</p></li>`).join('')}</ul>` : '<p class="hint">Nenhuma anotação ainda.</p>'}
  </div>`;
}
const novaNota = () => { const texto = $('crmNTexto').value.trim(); return texto ? { tipo: $('crmNTipo').value, texto, em: new Date().toISOString(), por: quem() } : null; };

function formLead(l) {
  l = l || { etapa: 'lead', origem: '' };
  const p = l.id ? propDoLead(l) : null;
  abrirDlg(l.id ? l.empresa || 'Lead' : 'Novo lead', `
    ${p ? `<p class="crmaviso">Este lead já virou a proposta nº ${esc(p.numero)} (${esc(ETAPAS.find(e => e.id === etapaProp(p)).nome)}). <button type="button" class="linkbtn" data-a="verprop" data-id="${esc(p.id)}">Ver proposta</button></p>` : ''}
    <div class="tkform" id="crmForm" data-id="${esc(l.id || '')}">
      <label>CNPJ<span class="tkrow"><input data-f="cnpj" inputmode="numeric" placeholder="00.000.000/0000-00" value="${esc(fmtCnpj(l.cnpj))}"><button type="button" data-a="cnpj">Buscar</button></span></label>
      <label>Empresa *<input data-f="empresa" value="${esc(l.empresa || '')}" required></label>
      <label>Contato<input data-f="contato" value="${esc(l.contato || '')}"></label>
      <label>WhatsApp / telefone<input data-f="fone" inputmode="tel" placeholder="(65) 99999-0000" value="${esc(l.fone || '')}"></label>
      <label>E-mail<input data-f="email" type="email" value="${esc(l.email || '')}"></label>
      <label>Cidade<input data-f="cidade" placeholder="Ex.: Cuiabá - MT" value="${esc(l.cidade || '')}"></label>
      <label>Origem<select data-f="origem"><option value="">Escolha…</option>${ORIGENS.map(o => `<option${o === l.origem ? ' selected' : ''}>${o}</option>`).join('')}</select></label>
      <label>Próximo contato<input data-f="prox" type="date" value="${esc(l.prox || '')}"></label>
      <label>Etapa<select data-f="etapa">${ETAPAS.filter(e => ['lead', 'qualificado', 'perdido'].includes(e.id)).map(e => `<option value="${e.id}"${e.id === l.etapa ? ' selected' : ''}>${e.nome}</option>`).join('')}</select></label>
      <label class="crmmot" ${l.etapa === 'perdido' ? '' : 'hidden'}>Motivo da perda<select data-f="motivo"><option value="">Escolha…</option>${MOTIVOS.map(m => `<option${m === l.motivo ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
      <label class="full">Observações<textarea data-f="obs" rows="2">${esc(l.obs || '')}</textarea></label>
    </div>
    <div class="tools crmacts">
      <button type="button" class="primary" data-a="salvar">Salvar</button>
      ${p ? '' : '<button type="button" data-a="gerar">Gerar proposta</button>'}
      ${l.id ? '<button type="button" class="danger" data-a="excluir">Excluir lead</button>' : ''}
    </div>
    ${l.id ? notasHtml(l.notas) : ''}`);
  dlg().dataset.modo = 'lead';
}

function lerForm() {
  const o = {};
  $('crmForm').querySelectorAll('[data-f]').forEach(el => { o[el.dataset.f] = el.value.trim(); });
  o.cnpj = dig(o.cnpj);
  if (o.etapa !== 'perdido') o.motivo = '';
  return o;
}

async function salvarLead(depois) {
  const id = $('crmForm').dataset.id, d = lerForm();
  if (!d.empresa) { dmsg('Preencha o nome da empresa.'); $('crmForm').querySelector('[data-f=empresa]').focus(); return null; }
  if (d.cnpj && d.cnpj.length !== 14) { dmsg('Confira o CNPJ: são 14 números.'); return null; }
  dmsg('Salvando…');
  try {
    if (id) { await F.updateDoc(F.doc(db, 'crm', id), { ...d, alterado: F.serverTimestamp(), alteradoPor: quem() }); dmsg('Salvo.'); return id; }
    const ref = await F.addDoc(F.collection(db, 'crm'), { tipo: 'lead', ...d, notas: [], owner: perfil.uid, vendedor: quem(), criado: F.serverTimestamp() });
    $('crmForm').dataset.id = ref.id; dmsg('Lead cadastrado.');
    if (!depois) { const l = { id: ref.id, tipo: 'lead', ...d, notas: [] }; formLead(l); dmsg('Lead cadastrado. Agora dá para anotar o histórico abaixo.'); }
    return ref.id;
  } catch (e) { dmsg('Não foi possível salvar (' + (e.code || e.message) + ').'); return null; }
}

// Leva os dados do lead para a Nova proposta
function gerarProposta(l) {
  if (dlg().open) dlg().close();
  $('btnNova').click();
  window.crmLeadId = l.id;
  const set = (id, v) => { const el = $(id); if (el && v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } };
  set('cliente', l.empresa); set('contato', l.contato); set('cidade', l.cidade); set('waAprov', l.fone);
  if (dig(l.cnpj).length === 14) set('cnpj', fmtCnpj(l.cnpj));
  $('tabProp').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function verProposta(p) {
  if (dlg().open) dlg().close();
  $('tabList').click();
  const b = $('pBusca'); if (b) { b.value = p.numero || p.cliente || ''; b.dispatchEvent(new Event('input', { bubbles: true })); }
}

function formProp(p) {
  const et = etapaProp(p);
  abrirDlg(p.cliente || 'Proposta', `
    <div class="crmresumo">
      <p><b>Proposta nº ${esc(p.numero)}</b> · ${esc(ETAPAS.find(e => e.id === et).nome)}</p>
      <p><small>${esc([fmtCnpj(p.cnpj), p.cidade, p.contato].filter(Boolean).join(' · '))}</small></p>
      <p><small>Licenças ${brl(p.totLic)} · Mensalidade ${brl(p.totMen)}/mês${p.vendedor ? ' · ' + esc(p.vendedor) : ''}</small></p>
      ${p.crmPerdida ? `<p class="crmaviso">Marcada como perdida${p.crmMotivo ? ': ' + esc(p.crmMotivo) : ''}.</p>` : '<p class="hint">As etapas da proposta mudam sozinhas quando o cliente aprova e quando aceita o contrato.</p>'}
    </div>
    ${p.crmPerdida ? '' : `<label>Motivo da perda<select id="crmPMot"><option value="">Escolha…</option>${MOTIVOS.map(m => `<option>${m}</option>`).join('')}</select></label>`}
    <div class="tools crmacts">
      <button type="button" class="primary" data-a="verprop" data-id="${esc(p.id)}">Abrir na aba Propostas</button>
      ${p.crmPerdida ? `<button type="button" data-a="reabrir" data-id="${esc(p.id)}">Reabrir no funil</button>` : `<button type="button" class="danger" data-a="perder" data-id="${esc(p.id)}">Marcar como perdida</button>`}
    </div>`);
  dlg().dataset.modo = 'prop';
}

async function marcarProp(id, perdida, motivo) {
  try {
    await F.updateDoc(F.doc(db, 'propostas', id), perdida ? { crmPerdida: true, crmMotivo: motivo || '', crmPerdidaEm: F.serverTimestamp() } : { crmPerdida: false, crmMotivo: '' });
    return true;
  } catch (e) { msg('Não foi possível mudar a etapa (' + (e.code || e.message) + ').'); dmsg('Não foi possível mudar a etapa (' + (e.code || e.message) + ').'); return false; }
}

async function fichaCliente(k) {
  const c = clientes().find(x => x.k === k); if (!c) return;
  const contatos = new Map();
  c.props.forEach(p => { const n = String(p.contato || '').trim(), f = dig(p.waCli); if (n || f) contatos.set(norm(n) + f, { nome: n, fone: f }); });
  leads().filter(l => chave(l.cnpj, l.empresa) === k).forEach(l => { if (l.contato || l.fone || l.email) contatos.set(norm(l.contato) + dig(l.fone), { nome: l.contato, fone: dig(l.fone), email: l.email }); });
  const fone = f => f ? (f.length > 11 ? f.slice(2) : f).replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : '';
  abrirDlg(c.nome, `
    <div class="crmresumo">
      <p><small>${esc([fmtCnpj(c.cnpj), c.cidade, c.vendedor && 'Vendedor: ' + c.vendedor].filter(Boolean).join(' · '))}</small></p>
      <p><small>${c.desde ? 'Cliente desde ' + c.desde.toLocaleDateString('pt-BR') + ' · ' : ''}${brl(c.men)}/mês em contratos aceitos</small></p>
    </div>
    <div class="crmsec"><h4>Contatos</h4>${contatos.size ? `<ul class="crmul">${[...contatos.values()].map(x => `<li>${esc(x.nome || '(sem nome)')}${x.fone ? ` · <a href="https://wa.me/${x.fone.length <= 11 ? '55' + x.fone : x.fone}" target="_blank" rel="noopener">${fone(x.fone)}</a>` : ''}${x.email ? ` · <a href="mailto:${esc(x.email)}">${esc(x.email)}</a>` : ''}</li>`).join('')}</ul>` : '<p class="hint">Nenhum contato registrado.</p>'}</div>
    <div class="crmsec"><h4>Propostas e contratos</h4><ul class="crmul">${c.props.map(p => `<li><button type="button" class="linkbtn" data-a="verprop" data-id="${esc(p.id)}">Nº ${esc(p.numero)}</button> · ${fmtD(p.data)} · ${esc(ETAPAS.find(e => e.id === etapaProp(p)).nome)} · ${brl(p.totLic)} + ${brl(p.totMen)}/mês</li>`).join('')}</ul></div>
    <div class="crmsec" id="crmTask"></div>
    ${notasHtml(c.doc?.notas)}`);
  dlg().dataset.modo = 'cli'; dlg().dataset.k = k;
  // Implantação (TASK): só quem tem acesso ao TASK enxerga
  if (admin || temTask) {
    try {
      if (!tasksCache) tasksCache = (await F.getDocs(F.collection(db, 'tasks'))).docs.map(d => ({ id: d.id, ...d.data() })).filter(t => !t.removido);
      const ids = new Set(c.props.map(p => p.id));
      const ts = tasksCache.filter(t => ids.has(t.propostaId || t.id) || (dig(t.cnpj).length === 14 && dig(t.cnpj) === dig(c.cnpj)));
      const ST = { and: 'Em andamento', fut: 'Futuro', fin: 'Finalizado' };
      if ($('crmTask') && dlg().dataset.k === k) $('crmTask').innerHTML = `<h4>Implantação (TASK)</h4>${ts.length ? `<ul class="crmul">${ts.map(t => `<li>${esc(t.cliente || t.nome || c.nome)} · ${esc(ST[t.status] || (t.finalizado ? 'Finalizado' : 'Futuro'))}${t.dataBase ? ' · Base ' + fmtD(t.dataBase) : ''}</li>`).join('')}</ul>` : '<p class="hint">Ainda não há card no TASK.</p>'}`;
    } catch (e) { /* sem acesso ao TASK */ }
  }
}

async function anotar() {
  const n = novaNota(); if (!n) { $('crmNTexto').focus(); return; }
  const modo = dlg().dataset.modo;
  try {
    if (modo === 'lead') {
      const id = $('crmForm').dataset.id;
      await F.updateDoc(F.doc(db, 'crm', id), { notas: F.arrayUnion(n), alterado: F.serverTimestamp() });
      const l = docs.find(d => d.id === id) || { id, notas: [] }, ns = l.notas || [];
      formLead({ ...l, ...lerForm(), id, notas: ns.some(x => x.em === n.em && x.texto === n.texto) ? ns : [...ns, n] });
    } else if (modo === 'cli') {
      const k = dlg().dataset.k, c = clientes().find(x => x.k === k), ref = F.doc(db, 'crm', 'c_' + k);
      if (c.doc) await F.updateDoc(ref, { notas: F.arrayUnion(n), alterado: F.serverTimestamp() });
      else await F.setDoc(ref, { tipo: 'cliente', chave: k, nome: c.nome, cnpj: dig(c.cnpj), owner: admin && c.owner ? c.owner : perfil.uid, notas: [n], criado: F.serverTimestamp() });
      const atual = docs.find(d => d.id === 'c_' + k), ns = atual?.notas || [];
      if (!ns.some(x => x.em === n.em && x.texto === n.texto)) docs = docs.filter(d => d.id !== 'c_' + k).concat([{ ...(atual || { id: 'c_' + k, tipo: 'cliente', owner: c.owner }), notas: [...ns, n] }]);
      fichaCliente(k);
    }
    dmsg('Anotado.');
  } catch (e) { dmsg('Não foi possível anotar (' + (e.code || e.message) + ').'); }
}

/* ---------- Motivo da perda (ao arrastar para Perdido) ---------- */
function pedirMotivo(nome, fn) {
  abrirDlg('Perdido: ' + nome, `<label>Motivo da perda<select id="crmPMot"><option value="">Escolha…</option>${MOTIVOS.map(m => `<option>${m}</option>`).join('')}</select></label>
    <div class="tools crmacts"><button type="button" class="primary" id="crmMotOk">Marcar como perdido</button><button type="button" id="crmMotCancel">Cancelar</button></div>`);
  dlg().dataset.modo = 'motivo';
  $('crmMotOk').onclick = async () => { if (await fn($('crmPMot').value)) dlg().close(); };
  $('crmMotCancel').onclick = () => dlg().close();
}

async function mover(tipo, id, destino) {
  if (tipo === 'lead') {
    const l = docs.find(d => d.id === id); if (!l || l.etapa === destino) return;
    if (destino === 'enviada') { gerarProposta(l); return; }
    if (!['lead', 'qualificado', 'perdido'].includes(destino)) { msg('Um lead vai para essas etapas quando vira proposta. Use "Gerar proposta".'); return; }
    const grava = async motivo => { try { await F.updateDoc(F.doc(db, 'crm', id), { etapa: destino, motivo: motivo || '', alterado: F.serverTimestamp(), alteradoPor: quem() }); return true; } catch (e) { msg('Não foi possível mover (' + (e.code || e.message) + ').'); return false; } };
    if (destino === 'perdido') pedirMotivo(l.empresa, grava); else grava('');
    return;
  }
  const p = props.find(x => x.id === id); if (!p) return;
  const atual = etapaProp(p);
  if (destino === atual) return;
  if (destino === 'perdido') { pedirMotivo(p.cliente, m => marcarProp(id, true, m)); return; }
  const natural = etapaProp({ ...p, crmPerdida: false });
  if (atual === 'perdido' && destino === natural) { marcarProp(id, false); return; }
  msg(['lead', 'qualificado'].includes(destino) ? 'Uma proposta não volta a ser lead.' : 'Essa etapa muda sozinha: quando o cliente aprova a proposta e quando aceita o contrato.');
}

/* ---------- Eventos ---------- */
function ligar() {
  if (!$('viewCrm')) return;
  $('crmNav').addEventListener('click', e => { const b = e.target.closest('button[data-aba]'); if (!b) return; aba = b.dataset.aba; $('crmBusca').value = ''; desenhar(); });
  $('crmBusca').addEventListener('input', desenhar);
  $('crmMinhas').addEventListener('change', e => { soMinhas = e.target.checked; desenhar(); });
  $('crmNovo').addEventListener('click', () => formLead());
  $('crmProp').addEventListener('click', () => { $('tabProp').click(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('btnNova').addEventListener('click', () => { window.crmLeadId = ''; });
  $('viewCrm').addEventListener('click', e => {
    const b = e.target.closest('[data-tipo][data-id]'); if (!b || b.closest('dialog')) return;
    if (b.dataset.tipo === 'lead') { const l = docs.find(d => d.id === b.dataset.id); if (l) formLead(l); }
    else if (b.dataset.tipo === 'prop') { const p = props.find(x => x.id === b.dataset.id); if (p) formProp(p); }
    else if (b.dataset.tipo === 'cli') fichaCliente(b.dataset.id);
  });
  // Arrastar no quadro (computador). No celular, toque no card e mude a etapa no formulário.
  const fun = $('crm-funil');
  fun.addEventListener('dragstart', e => { const c = e.target.closest('.crmc'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.tipo + ':' + c.dataset.id); e.dataTransfer.effectAllowed = 'move'; c.classList.add('arrastando'); });
  fun.addEventListener('dragend', e => { const c = e.target.closest('.crmc'); if (c) c.classList.remove('arrastando'); fun.querySelectorAll('.alvo').forEach(x => x.classList.remove('alvo')); });
  fun.addEventListener('dragover', e => { const col = e.target.closest('.crmcol'); if (!col) return; e.preventDefault(); fun.querySelectorAll('.alvo').forEach(x => x !== col && x.classList.remove('alvo')); col.classList.add('alvo'); });
  fun.addEventListener('drop', e => { const col = e.target.closest('.crmcol'); if (!col) return; e.preventDefault(); col.classList.remove('alvo'); const [tipo, id] = String(e.dataTransfer.getData('text/plain')).split(':'); if (id) mover(tipo, id, col.dataset.etapa); });

  $('crmDlgFechar').addEventListener('click', () => dlg().close());
  dlg().addEventListener('change', e => { if (e.target.dataset.f === 'etapa') { const m = dlg().querySelector('.crmmot'); if (m) m.hidden = e.target.value !== 'perdido'; } });
  dlg().addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'crmNTexto') { e.preventDefault(); anotar(); } });
  dlg().addEventListener('click', async e => {
    if (e.target.id === 'crmNAdd') { anotar(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'salvar') { if (await salvarLead()) desenhar(); }
    else if (a === 'gerar') { const id = await salvarLead(true); if (id) gerarProposta({ id, ...lerForm() }); }
    else if (a === 'excluir') {
      if (b.dataset.confirma !== '1') { b.dataset.confirma = '1'; b.textContent = 'Confirmar exclusão'; dmsg('Clique de novo para excluir o lead e o histórico dele.'); return; }
      try { await F.deleteDoc(F.doc(db, 'crm', $('crmForm').dataset.id)); dlg().close(); msg('Lead excluído.'); } catch (er) { dmsg('Não foi possível excluir (' + (er.code || er.message) + ').'); }
    }
    else if (a === 'cnpj') {
      const inp = $('crmForm').querySelector('[data-f=cnpj]'), d = dig(inp.value);
      if (d.length !== 14) { dmsg('Digite os 14 números do CNPJ.'); return; }
      dmsg('Buscando o CNPJ…');
      const r = window.cnpjInfo ? await window.cnpjInfo(d) : null;
      if (!r) { dmsg('Não encontrei esse CNPJ agora. Preencha os dados à mão.'); return; }
      const put = (f, v) => { const el = $('crmForm').querySelector(`[data-f=${f}]`); if (el && v && !el.value.trim()) el.value = v; };
      inp.value = fmtCnpj(d); put('empresa', r.razao); put('cidade', r.municipio && r.uf ? r.municipio + ' - ' + r.uf : r.municipio); put('fone', r.telefone); put('email', r.email);
      dmsg(r.situacao && !/ativa/i.test(r.situacao) ? 'Atenção: situação na Receita: ' + r.situacao + '.' : 'Dados da Receita preenchidos.');
    }
    else if (a === 'verprop') { const p = props.find(x => x.id === b.dataset.id); if (p) verProposta(p); }
    else if (a === 'perder') { if (await marcarProp(b.dataset.id, true, ($('crmPMot') || {}).value)) dlg().close(); }
    else if (a === 'reabrir') { if (await marcarProp(b.dataset.id, false)) dlg().close(); }
  });
}
ligar();

// Módulo CRM: leads, funil de vendas e clientes. Roda para vendedores e administradores.
// Dados: crm/{id} com tipo 'lead' (contatos antes da proposta) ou 'cliente' (anotações da ficha do cliente).
// O funil e a lista de clientes também usam as propostas (coleção propostas), sem copiar os dados delas.
let F, db, perfil, admin = false, temTask = false, unsubC = null, unsubP = null;
let docs = [], props = [], tasksCache = null, aba = 'funil', docsOk = false, propsOk = false;
// Filtros da lista: usuário responsável (só ADM vê de todos) e estado (UF da cidade do lead ou da proposta)
let fUser = '', fUf = '', usuarios = {};
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
  { id: 'salva', nome: 'Pendente de envio' },
  { id: 'enviada', nome: 'Proposta enviada' },
  { id: 'aprovada', nome: 'Proposta aprovada' },
  { id: 'contrato', nome: 'Contrato aceito' },
  { id: 'perdido', nome: 'Perdido' }
];
const ORIGENS = ['Indicação', 'Site', 'Evento', 'Prospecção ativa', 'Telemetria ANP', 'Redes sociais', 'Cliente antigo', 'Proposta direta', 'Outro'];
const MOTIVOS = ['Preço', 'Escolheu concorrente', 'Sem interesse no momento', 'Sem retorno', 'Fora do perfil', 'Outro'];
const TIPOS_NOTA = ['Ligação', 'WhatsApp', 'Visita', 'E-mail', 'Reunião', 'Anotação'];

window.addEventListener('shotgun-crm', e => { ({ F, db, perfil, admin, temTask } = e.detail); iniciar(); });
window.addEventListener('argo-sair', () => { if (unsubC) unsubC(); if (unsubP) unsubP(); unsubC = unsubP = null; docs = []; props = []; tasksCache = null; docsOk = propsOk = false; fUser = fUf = ''; usuarios = {}; });

function iniciar() {
  // Logos das Bandeiras publicados pelo ADM: usados no cartão da ANP e na lista de leads
  F.getDoc(F.doc(db, 'publico', 'bandeiras')).then(snap => {
    const d = snap.exists() ? snap.data() : null;
    if (d && d.json) { try { window.anpLogos = JSON.parse(d.json); desenhar(); window.dispatchEvent(new Event('anp-logos')); } catch (e) {} }
  }).catch(() => {});
  if (unsubC) unsubC();
  if (unsubP) unsubP();
  docsOk = propsOk = false;
  const col = F.collection(db, 'crm');
  unsubC = F.onSnapshot(admin ? col : F.query(col, F.where('owner', '==', perfil.uid)), qs => {
    docs = qs.docs.map(d => ({ id: d.id, ...d.data() })); docsOk = true; desenhar(); leadsAutomaticos();
  }, e => msg('Não foi possível carregar o CRM (' + (e.code || 'erro') + ').' + (e.code === 'permission-denied' ? ' As regras do banco ainda não liberam o CRM.' : '')));
  const pc = F.collection(db, 'propostas');
  unsubP = F.onSnapshot(admin ? F.query(pc, F.orderBy('criado', 'desc'), F.limit(500)) : F.query(pc, F.where('owner', '==', perfil.uid)), qs => {
    props = qs.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.status !== 'substituida').sort((a, b) => (b.criado?.seconds || 9e9) - (a.criado?.seconds || 9e9));
    if (window.sgViaUnica) props = window.sgViaUnica(props); // vias iguais aprovadas contam como uma proposta só (vias.js)
    propsOk = true; desenhar(); leadsAutomaticos();
  }, () => {});
  $('crmUsuario').hidden = !admin;
  fUser = fUf = ''; usuarios = {};
  // ADM: nomes e estados de atuação dos usuários para o filtro (se a leitura falhar, usa os nomes gravados nos leads)
  if (admin) F.getDocs(F.collection(db, 'usuarios')).then(qs => {
    qs.forEach(d => { const u = d.data(); usuarios[d.id] = { nome: u.nome || u.email || '', estados: Array.isArray(u.estados) ? u.estados : [], papeis: Array.isArray(u.papeis) && u.papeis.length ? u.papeis : [u.papel || 'vendedor'], ativo: u.ativo !== false }; });
    desenhar();
  }).catch(() => {});
  desenhar();
}

/* ---------- Lead automático ----------
   Toda proposta tem um lead por trás. Proposta feita direto (sem vir de um lead) ganha um lead criado pelo app,
   com origem "Proposta direta". Se já existe lead com o mesmo CNPJ (ou nome, sem CNPJ), não duplica: o funil já liga
   os dois pela chave. Cada pessoa cria os leads das próprias propostas (o lead fica dela), inclusive as antigas.
   O id do lead é fixo pela proposta (auto-<id>), então dois aparelhos abertos ao mesmo tempo não criam dois
   (o lead é da própria pessoa, então já aparece na lista docs se existir). */
const criandoLead = new Set();
async function leadsAutomaticos() {
  if (!docsOk || !propsOk || !perfil) return;
  const chaves = new Set(docs.filter(d => d.tipo === 'lead').map(l => chave(l.cnpj, l.empresa)));
  const ids = new Set(docs.map(d => d.id));
  const faltam = props.filter(p => p.owner === perfil.uid && !p.leadId && String(p.cliente || '').trim()
    && !ids.has('auto-' + p.id) && !criandoLead.has(p.id) && !chaves.has(chave(p.cnpj, p.cliente)));
  const vistas = new Set();
  for (const p of faltam) {
    const k = chave(p.cnpj, p.cliente); if (vistas.has(k)) continue; vistas.add(k); // duas versões da mesma empresa: um lead só
    criandoLead.add(p.id);
    const fone = dig(p.waCli).replace(/^55(?=\d{10,11}$)/, '');
    const lead = { tipo: 'lead', auto: true, propostaId: p.id, empresa: String(p.cliente || '').trim(), cnpj: dig(p.cnpj).length === 14 ? dig(p.cnpj) : '', cidade: p.cidade || '',
      contato: p.contato || '', fone, email: '', contatos: p.contato || fone ? [{ nome: p.contato || '', fone, email: '' }] : [], origem: 'Proposta direta', etapa: 'qualificado', motivo: '',
      notas: [], owner: perfil.uid, vendedor: p.vendedor || quem(), criado: F.serverTimestamp(), criadoPor: 'Automático (proposta nº ' + (p.numero || '') + ')' };
    try {
      const ref = F.doc(db, 'crm', 'auto-' + p.id);
      await F.setDoc(ref, lead);
      F.updateDoc(F.doc(db, 'propostas', p.id), { leadId: ref.id }).catch(() => {}); // o vínculo pela chave já basta se a regra não deixar
    } catch (e) { console.warn('Lead automático', p.id, e.code || e); }
    finally { criandoLead.delete(p.id); }
  }
}

/* ---------- Dados derivados ---------- */
const UF_NOMES = { AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins' };
// UF do lead/proposta: fim da cidade ("Nova Mutum - MT") ou a UF da ANP
const ufDe = x => { const m = String(x.cidade || '').trim().match(/[-\/,]\s*([A-Za-z]{2})$/); const uf = (m ? m[1] : x.anp?.uf || x.uf || '').toUpperCase(); return UF_NOMES[uf] ? uf : ''; };
// "Cidade / UF" dos cards: helper global em cidade-uf.js
const cidadeUf = x => window.sgCidadeUf ? window.sgCidadeUf(x) : '';
const estadosDe = uid => (uid === perfil.uid && Array.isArray(perfil.estados) ? perfil.estados : usuarios[uid]?.estados) || [];
const meu = x => (!fUser || x.owner === fUser) && (!fUf || ufDe(x) === fUf);
const leads = () => docs.filter(d => d.tipo === 'lead' && meu(d));
const notasCli = () => docs.filter(d => d.tipo === 'cliente');
const etapaProp = p => p.crmPerdida ? 'perdido' : p.ctAceitoEm ? 'contrato' : p.status === 'aprovada' ? 'aprovada' : p.pendenteEnvio === true ? 'salva' : 'enviada';
// Proposta que nasceu do lead (pelo vínculo gravado, pelo CNPJ ou pelo nome)
function propDoLead(l) {
  const k = chave(l.cnpj, l.empresa);
  return props.find(p => p.leadId === l.id) || props.find(p => chave(p.cnpj, p.cliente) === k);
}
function cards() {
  const out = [];
  leads().forEach(l => { if (!propDoLead(l)) out.push({ tipo: 'lead', id: l.id, etapa: ETAPAS.some(e => e.id === l.etapa) && ['lead', 'qualificado', 'perdido'].includes(l.etapa) ? l.etapa : 'lead', titulo: l.empresa || '(sem nome)', sub: [l.contato, l.origem, l.anp?.porte && 'Porte ' + l.anp.porte].filter(Boolean).join(' · '), prox: l.prox, dono: l.vendedor, ref: l }); });
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

/* ---------- Filtros por usuário e estado ---------- */
function montarFiltros() {
  const todos = [...docs.filter(d => d.tipo === 'lead'), ...props];
  // Usuários: os cadastrados como vendedor ou ADM e quem já tem lead/proposta. Com um estado escolhido, só quem atua nele ou tem algo lá.
  if (admin) {
    const us = new Map();
    Object.entries(usuarios).forEach(([uid, u]) => { if (u.ativo && (u.papeis.includes('vendedor') || u.papeis.includes('adm'))) us.set(uid, u.nome); });
    todos.forEach(x => { if (x.owner && !us.has(x.owner)) us.set(x.owner, usuarios[x.owner]?.nome || x.vendedor || 'Sem nome'); });
    us.delete(perfil.uid);
    let lista = [...us.entries()];
    if (fUf) lista = lista.filter(([uid]) => uid === fUser || estadosDe(uid).includes(fUf) || todos.some(x => x.owner === uid && ufDe(x) === fUf));
    lista.sort((a, b) => String(a[1]).localeCompare(String(b[1]), 'pt-BR'));
    if (fUser && fUser !== perfil.uid && !lista.some(([uid]) => uid === fUser)) fUser = '';
    const ufsTxt = uid => { const e = estadosDe(uid); return e.length ? ' · ' + (e.length > 4 ? e.slice(0, 4).join(', ') + '…' : e.join(', ')) : ''; };
    const sel = $('crmUsuario');
    sel.innerHTML = `<option value="">Todos os usuários</option><option value="${esc(perfil.uid)}">Só os meus${esc(ufsTxt(perfil.uid))}</option>` + lista.map(([uid, nome]) => `<option value="${esc(uid)}">${esc(nome + ufsTxt(uid))}</option>`).join('');
    sel.value = fUser; sel.classList.toggle('on', !!fUser);
  }
  // Estados: os vinculados ao usuário escolhido (para o vendedor, os dele) aparecem primeiro; depois os que têm lead/proposta
  const dono = admin ? fUser : perfil.uid, vinc = dono ? estadosDe(dono).filter(u => UF_NOMES[u]) : [];
  const comDados = new Set(todos.filter(x => !admin || !fUser || x.owner === fUser).map(ufDe).filter(Boolean));
  if (admin && !fUser) Object.values(usuarios).forEach(u => u.estados.forEach(e => UF_NOMES[e] && comDados.add(e)));
  if (fUf) comDados.add(fUf);
  const outros = [...comDados].filter(u => !vinc.includes(u)).sort();
  const opt = u => `<option value="${u}">${u} · ${UF_NOMES[u]}</option>`;
  const nomeDono = !dono ? '' : dono === perfil.uid ? (admin ? 'Seus estados' : 'Seus estados de atuação') : 'Estados de ' + String(usuarios[dono]?.nome || 'usuário').split(' ')[0];
  const sel = $('crmUf');
  sel.innerHTML = '<option value="">Todos os estados</option>' + (vinc.length ? `<optgroup label="${esc(nomeDono)}">${vinc.slice().sort().map(opt).join('')}</optgroup>${outros.length ? `<optgroup label="Outros estados">${outros.map(opt).join('')}</optgroup>` : ''}` : outros.map(opt).join(''));
  sel.value = fUf; sel.classList.toggle('on', !!fUf);
  // Resumo do filtro ativo, com atalho para limpar
  const partes = [];
  if (fUser) partes.push(fUser === perfil.uid ? 'só os seus' : 'de ' + (usuarios[fUser]?.nome || todos.find(x => x.owner === fUser)?.vendedor || 'usuário'));
  if (fUf) partes.push('em ' + UF_NOMES[fUf] + ' (' + fUf + ')');
  const box = $('crmFiltro');
  box.hidden = !partes.length;
  box.innerHTML = partes.length ? `<span>Mostrando ${esc(partes.join(', '))}.</span><button type="button" data-a="limparfiltro">Limpar filtros</button>` : '';
}

/* ---------- Telas ---------- */
function desenhar() {
  if (!$('viewCrm') || !perfil) return;
  // Agenda (agenda.js): recebe os leads daqui, com a marca de quem já virou proposta
  if (docsOk) window.dispatchEvent(new CustomEvent('crm-dados', { detail: { leads: docs.filter(d => d.tipo === 'lead').map(l => ({ ...l, _temProp: propsOk && !!propDoLead(l) })), usuarios } }));
  montarFiltros();
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
        <b>${esc(c.titulo)}</b>${cidadeUf(c.ref) ? `<small class="crmcid">${esc(cidadeUf(c.ref))}</small>` : ''}<small>${esc(c.sub)}</small>
        ${c.tipo === 'lead' && c.prox ? `<small class="crmprox">Próximo contato: ${fmtD(c.prox)}</small>` : ''}
        ${c.tipo === 'lead' && window.agendaProxima && window.agendaProxima(c.ref) ? `<small class="crmdemo">Demonstração: ${esc(window.agendaFmt(window.agendaProxima(c.ref)))}</small>` : ''}
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
      <span><b>${l.anp?.bandeira && window.anpSeloBandeira ? window.anpSeloBandeira(l.anp.bandeira, false, true) : ''}${esc(l.empresa || '(sem nome)')}</b><small>${esc([l.contato, l.fone, cidadeUf(l), l.anp?.bandeira, l.anp?.porte && 'Porte ' + l.anp.porte].filter(Boolean).join(' · '))}</small></span>
      <span><small>${esc(l.origem || '')}</small>${admin && l.vendedor ? `<small>${esc(l.vendedor)}</small>` : ''}</span>
      <span><small>${l.prox ? 'Próx.: ' + fmtD(l.prox) : 'Sem próximo contato'}</small>${window.agendaProxima && window.agendaProxima(l) ? `<small class="crmdemo">Demonstração: ${esc(window.agendaFmt(window.agendaProxima(l)))}</small>` : ''}<span class="pill">${esc(et)}</span></span>
    </button>`; }).join('')}</div>` : `<p class="hint">${q ? 'Nenhum lead encontrado.' : fUser || fUf ? 'Nenhum lead com esses filtros.' : 'Nenhum lead ainda. Clique em "+ Novo lead" para cadastrar o primeiro contato.'}</p>`;
}

function desenharClientes() {
  const q = norm($('crmBusca').value);
  const cs = clientes().filter(c => !q || norm(c.nome + ' ' + c.cnpj).includes(q) || dig(c.cnpj).includes(dig($('crmBusca').value) || '#'));
  $('crm-clientes').innerHTML = cs.length ? `<div class="crmlist">${cs.map(c => {
    const ult = (c.doc?.notas || []).slice(-1)[0];
    return `<button type="button" class="crmrow" data-tipo="cli" data-id="${esc(c.k)}">
      <span><b>${esc(c.nome)}</b><small>${esc([fmtCnpj(c.cnpj), cidadeUf(c)].filter(Boolean).join(' · '))}</small></span>
      <span><small>${brl(c.men)}/mês</small>${admin && c.vendedor ? `<small>${esc(c.vendedor)}</small>` : ''}</span>
      <span><small>${ult ? esc(ult.tipo) + ' em ' + fmtTs(ult.em) : c.desde ? 'Cliente desde ' + c.desde.toLocaleDateString('pt-BR') : ''}</small><span class="pill">${c.props.length} proposta${c.props.length === 1 ? '' : 's'}</span></span>
    </button>`; }).join('')}</div>` : `<p class="hint">${q ? 'Nenhum cliente encontrado.' : fUser || fUf ? 'Nenhum cliente com esses filtros.' : 'Os clientes aparecem aqui quando o contrato de uma proposta é aceito.'}</p>`;
}

/* ---------- Ditado: gravar a fala e transcrever no campo ---------- */
// Usa o reconhecimento de voz do próprio navegador (Chrome, Edge, Safari). Não guarda o áudio.
// No Android o modo contínuo repete frases, então lá cada frase é uma rodada e o app reinicia sozinho.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const ANDROID = /Android/i.test(navigator.userAgent);
const MIC = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2Z"/></svg>';
const micBtn = () => `<button type="button" class="ditbtn" data-a="ditar" aria-pressed="false" aria-label="Gravar áudio e transcrever" title="Gravar áudio e transcrever">${MIC}<span>Parar</span></button>`;
let dit = null; // { r, btn, campo, st, base, finais, ativo }
const juntar = (a, b) => { a = a.replace(/\s+$/, ''); b = b.trim(); if (!b) return a; if (!a || /[.!?\n]$/.test(a)) b = b[0].toUpperCase() + b.slice(1); return a ? a + (/\n$/.test(a) ? '' : ' ') + b : b; };
function pararDitado() {
  if (!dit) return;
  const d = dit; dit = null; d.ativo = false;
  try { d.r.stop(); } catch (_) {}
  d.btn.setAttribute('aria-pressed', 'false'); d.btn.setAttribute('aria-label', 'Gravar áudio e transcrever'); d.btn.title = 'Gravar áudio e transcrever';
  if (d.interino) { d.finais = (d.finais + ' ' + d.interino).trim(); d.interino = ''; }
  d.campo.value = juntar(d.base, d.finais);
  d.campo.dispatchEvent(new Event('input', { bubbles: true }));
  if (d.st && !d.erro) { d.st.hidden = true; d.st.textContent = ''; }
}
function ditar(btn) {
  if (dit) { const mesmo = dit.btn === btn; pararDitado(); if (mesmo) return; }
  const box = btn.closest('.ditado'), campo = box.querySelector('textarea,input'), st = box.parentElement.querySelector('.ditst');
  const aviso = t => { if (st) { st.textContent = t; st.hidden = false; st.classList.add('erro'); } else dmsg(t); };
  if (!SR) { aviso('Este navegador não transcreve áudio. Use o Chrome, o Edge ou o Safari.'); return; }
  const d = dit = { btn, campo, st, base: campo.value, finais: '', interino: '', ativo: true, erro: false };
  const mostrar = () => { campo.value = juntar(d.base, d.finais + ' ' + d.interino); campo.scrollTop = campo.scrollHeight; };
  const rodada = () => {
    const r = d.r = new SR();
    r.lang = 'pt-BR'; r.interimResults = true; r.continuous = !ANDROID; r.maxAlternatives = 1;
    let feitos = 0; // resultados finais desta rodada já somados
    r.onresult = e => {
      let interino = '';
      for (let i = feitos; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) { d.finais = (d.finais + ' ' + t).trim(); feitos = i + 1; } else interino += t;
      }
      d.interino = interino; mostrar();
    };
    r.onerror = e => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      d.erro = true;
      aviso({ 'not-allowed': 'O navegador bloqueou o microfone. Libere o microfone para este site e tente de novo.', 'service-not-allowed': 'O navegador bloqueou a transcrição. Libere o microfone para este site e tente de novo.', 'audio-capture': 'Não encontrei um microfone neste aparelho.', network: 'A transcrição precisa de internet. Tente de novo quando estiver conectado.', 'language-not-supported': 'Este navegador não transcreve português.' }[e.error] || 'A gravação parou (' + e.error + ').');
      if (dit === d) pararDitado();
    };
    r.onend = () => {
      if (d.interino) { d.finais = (d.finais + ' ' + d.interino).trim(); d.interino = ''; mostrar(); }
      if (d.ativo && dit === d) { try { rodada(); } catch (_) { pararDitado(); } }
    };
    r.start();
  };
  try { rodada(); } catch (er) { dit = null; aviso('Não foi possível começar a gravar (' + (er.message || er) + ').'); return; }
  btn.setAttribute('aria-pressed', 'true'); btn.setAttribute('aria-label', 'Parar a gravação'); btn.title = 'Parar a gravação';
  if (st) { st.classList.remove('erro'); st.textContent = 'Ouvindo… fale normalmente. Toque em Parar quando terminar.'; st.hidden = false; }
}

/* ---------- Diálogo ---------- */
const dlg = () => $('crmDlg');
let aposNovo = null; // Agenda: o que fazer depois de cadastrar um lead novo (volta para a demonstração)
// Para a Agenda (agenda.js): abrir um lead, cadastrar lead novo, fechar o diálogo e usar o ditado
window.crmAbrirLead = id => { const l = docs.find(d => d.id === id && d.tipo === 'lead'); if (l) formLead(l); };
window.crmNovoLead = fn => { formLead(); aposNovo = fn || null; dmsg('Cadastre o lead e toque em Salvar: a demonstração continua de onde parou.'); };
window.crmGerarProposta = id => { const l = docs.find(d => d.id === id && d.tipo === 'lead'); if (l) gerarProposta(l); };
// Contatos (nome e telefone) cadastrados nos leads e na ficha do cliente com este CNPJ/nome: vão no link dos dados para o contrato
window.crmContatosDe = (cnpj, nome) => {
  const k = chave(cnpj, nome), out = [];
  docs.filter(d => d.tipo === 'lead' && chave(d.cnpj, d.empresa) === k).forEach(l => contatosDe(l).forEach(x => out.push({ nome: x.nome || '', fone: dig(x.fone), email: x.email || '', cargo: x.cargo || '' })));
  const cd = docs.find(d => d.id === 'c_' + k); (cd?.contatos || []).forEach(x => out.push({ nome: x.nome || '', fone: dig(x.fone), email: x.email || '', cargo: x.cargo || '' }));
  return out;
};
window.crmFecharDlg = () => { if (dlg() && dlg().open) dlg().close(); };
window.crmMicBtn = () => micBtn();
window.crmDitar = btn => ditar(btn);
window.crmPararDitado = () => pararDitado();
function abrirDlg(tit, html) { $('crmDlgTit').textContent = tit; $('crmDlgBody').innerHTML = html; $('crmDlgMsg').textContent = ''; if (!dlg().open) dlg().showModal(); }
const dmsg = t => { $('crmDlgMsg').textContent = t || ''; };

function notasHtml(notas, contatos) {
  const ns = (notas || []).slice().reverse();
  const nomes = [...new Set((contatos || []).map(c => String(c || '').trim()).filter(Boolean))];
  return `<div class="crmhist"><h4>Histórico</h4>
    <div class="crmnova"><select id="crmNTipo" aria-label="Tipo">${TIPOS_NOTA.map(t => `<option>${t}</option>`).join('')}</select>
      <input id="crmNCont" list="crmNContL" aria-label="Com quem" placeholder="Com quem?" maxlength="80" autocomplete="off"><datalist id="crmNContL">${nomes.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <span class="ditado ditlinha"><input id="crmNTexto" placeholder="O que aconteceu? Ex.: liguei, pediu retorno na sexta" maxlength="1000">${micBtn()}</span>
      <button type="button" id="crmNAdd">Anotar</button><small class="ditst" hidden></small></div>
    ${ns.length ? `<ul>${ns.map(n => `<li><span class="pill">${esc(n.tipo)}</span> ${n.contato ? `<b class="crmncont">com ${esc(n.contato)}</b> ` : ''}<small>${fmtTs(n.em)}${n.por ? ' · ' + esc(n.por) : ''}</small><p>${esc(n.texto)}</p></li>`).join('')}</ul>` : '<p class="hint">Nenhuma anotação ainda.</p>'}
  </div>`;
}
const novaNota = () => { const texto = $('crmNTexto').value.trim(); const ct = $('crmNCont') ? $('crmNCont').value.trim().replace(/\s+/g, ' ') : ''; return texto ? { tipo: $('crmNTipo').value, texto, ...(ct ? { contato: ct } : {}), em: new Date().toISOString(), por: quem() } : null; };

// Sócios da Receita (QSA): tocar num nome preenche o Contato do lead
const nomeProprio = n => String(n || '').toLowerCase().replace(/(^|\s)(\S)/g, (m, a, c) => a + c.toUpperCase()).replace(/\s(Da|De|Do|Das|Dos|E)\s/g, m => m.toLowerCase());
// Contatos do lead: lista de { nome, fone, email, cargo }. Leads antigos tinham um contato só (contato/fone/email).
const contatosDe = l => Array.isArray(l.contatos) && l.contatos.length ? l.contatos : (l.contato || l.fone || l.email ? [{ nome: l.contato || '', fone: l.fone || '', email: l.email || '', cargo: '' }] : []);
const CARGOS = ['Proprietário', 'Sócio-Administrador', 'Sócio', 'Gerente', 'Financeiro', 'Compras', 'TI', 'Frentista líder'];
const cargosList = () => `<datalist id="crmCargos">${CARGOS.map(c => `<option value="${c}">`).join('')}</datalist>`;
const ctLinha = (c = {}) => `<div class="crmct">
  <label>Nome<input data-c="nome" value="${esc(c.nome || '')}"></label>
  <label>Cargo<input data-c="cargo" list="crmCargos" placeholder="Ex.: Gerente" value="${esc(c.cargo || '')}"></label>
  <label>WhatsApp / telefone<input data-c="fone" inputmode="tel" placeholder="(65) 99999-0000" value="${esc(c.fone || '')}"></label>
  <label>E-mail<input data-c="email" type="email" value="${esc(c.email || '')}"></label>
  <button type="button" class="crmctx" data-a="ctdel" aria-label="Tirar este contato" title="Tirar este contato">✕</button>
</div>`;
// No lead, as sugestões do "Com quem?" do histórico acompanham os contatos que estão no formulário (e dá para digitar qualquer nome)
function atualizarNCont() {
  const dl = $('crmNContL'); if (!dl || !$('crmCts')) return;
  const nomes = [...new Set(lerContatos().map(c => c.nome).filter(Boolean))];
  dl.innerHTML = nomes.map(n => `<option value="${esc(n)}">`).join('');
}
function lerContatos() {
  return [...document.querySelectorAll('#crmCts .crmct')].map(r => ({ nome: r.querySelector('[data-c=nome]').value.trim(), fone: r.querySelector('[data-c=fone]').value.trim(), email: r.querySelector('[data-c=email]').value.trim(), cargo: r.querySelector('[data-c=cargo]').value.trim() })).filter(c => c.nome || c.fone || c.email || c.cargo);
}
function sociosHtml(socios, contato) {
  if (!socios || !socios.length) return '';
  return `<small>Sócios na Receita (toque para adicionar como contato):</small><div class="crmsocl">${socios.map((x, i) => `<button type="button" class="crmsocb" data-a="socio" data-i="${i}" aria-pressed="${[].concat(contato || []).some(n => norm(n) === norm(nomeProprio(x.nome)))}"><b>${esc(nomeProprio(x.nome))}</b>${x.qual ? `<small>${esc(x.qual)}</small>` : ''}</button>`).join('')}</div>`;
}
// Atalhos do Próximo contato: cada botão marca a data de hoje + N dias (a data continua editável à mão)
const PRAZOS = [7, 15, 30, 60];
const isoDaqui = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function prazosHtml(prox) {
  return `<div class="crmprazos" role="group" aria-label="Atalhos de prazo">${PRAZOS.map(n => `<button type="button" class="uchip" data-a="prazo" data-n="${n}" aria-pressed="${prox === isoDaqui(n)}" title="${fmtD(isoDaqui(n))}">${n} dias</button>`).join('')}</div>`;
}
function marcarPrazos() {
  const v = ($('crmForm')?.querySelector('[data-f=prox]') || {}).value || '';
  dlg().querySelectorAll('[data-a=prazo]').forEach(b => { const n = +b.dataset.n; b.setAttribute('aria-pressed', String(v === isoDaqui(n))); b.title = fmtD(isoDaqui(n)); });
}
function formLead(l) {
  l = l || { etapa: 'lead', origem: '' };
  const p = l.id ? propDoLead(l) : null;
  abrirDlg(l.id ? l.empresa || 'Lead' : 'Novo lead', `
    ${p ? `<p class="crmaviso">Este lead já virou a proposta nº ${esc(p.numero)} (${esc(ETAPAS.find(e => e.id === etapaProp(p)).nome)}). <button type="button" class="linkbtn" data-a="verprop" data-id="${esc(p.id)}">Ver proposta</button></p>` : ''}
    <div id="crmForm" class="crmleadf" data-id="${esc(l.id || '')}">
      <section class="crmbloco"><h4>Empresa</h4>
        <div class="tkform">
          <label class="full">CNPJ<span class="tkrow"><input data-f="cnpj" inputmode="numeric" placeholder="00.000.000/0000-00" value="${esc(fmtCnpj(l.cnpj))}"><button type="button" data-a="cnpj">Buscar</button></span><span class="anpacao"><button type="button" data-a="anpbusca"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M10 3a7 7 0 0 1 5.6 11.2l4.6 4.6-1.4 1.4-4.6-4.6A7 7 0 1 1 10 3Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/></svg>Pesquisar na ANP</button><small>quando não souber o CNPJ</small></span></label>
          <label>Empresa *<input data-f="empresa" value="${esc(l.empresa || '')}" required></label>
          <label>Cidade<input data-f="cidade" placeholder="Ex.: Cuiabá - MT" value="${esc(l.cidade || '')}"></label>
        </div>
        <div id="crmAnpBusca" hidden></div>
        <div id="crmAnp" hidden></div>
      </section>
      <section class="crmbloco"><h4>Contatos</h4>
        <div class="crmsoc full" id="crmSoc" data-socios="${esc(JSON.stringify(l.socios || []))}">${sociosHtml(l.socios, contatosDe(l).map(c => c.nome))}</div>
        <div class="crmcts full" id="crmCts">
        ${cargosList()}<div id="crmCtLista">${(contatosDe(l).length ? contatosDe(l) : [{}]).map(ctLinha).join('')}</div>
        <button type="button" class="crmctadd" data-a="ctadd">+ Contato</button></div>
      </section>
      <section class="crmbloco"><h4>Negociação</h4>
        <div class="tkform">
          <label>Etapa<select data-f="etapa">${ETAPAS.filter(e => ['lead', 'qualificado', 'perdido'].includes(e.id)).map(e => `<option value="${e.id}"${e.id === l.etapa ? ' selected' : ''}>${e.nome}</option>`).join('')}</select></label>
          <label>Origem<select data-f="origem"><option value="">Escolha…</option>${ORIGENS.map(o => `<option${o === l.origem ? ' selected' : ''}>${o}</option>`).join('')}</select></label>
          <div class="crmproxc"><label>Próximo contato<input data-f="prox" type="date" value="${esc(l.prox || '')}"></label>${prazosHtml(l.prox)}</div>
          <label class="crmmot" ${l.etapa === 'perdido' ? '' : 'hidden'}>Motivo da perda<select data-f="motivo"><option value="">Escolha…</option>${MOTIVOS.map(m => `<option${m === l.motivo ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
          <label class="full">Observações<span class="ditado"><textarea data-f="obs" rows="2" placeholder="Digite ou toque no microfone e fale">${esc(l.obs || '')}</textarea>${micBtn()}</span><small class="ditst" hidden></small></label>
        </div>
      </section>
      ${demosHtml(l)}
    </div>
    <div class="tools crmacts">
      <button type="button" class="primary" data-a="salvar">Salvar</button>
      ${p ? '' : '<button type="button" data-a="gerar">Gerar proposta</button>'}
      ${l.id ? '<button type="button" class="danger" data-a="excluir">Excluir lead</button>' : ''}
    </div>
    ${l.id ? notasHtml(l.notas, contatosDe(l).map(c => c.nome)) : ''}`);
  dlg().dataset.modo = 'lead';
  anpAtual = null; anpLead(l.cnpj, false);
}

/* ---------- Demonstrações do lead (módulo Agenda, agenda.js) ---------- */
function demosHtml(l) {
  if (!window.agendaNova) return '';
  const h = hoje(), ds = (Array.isArray(l.demos) ? l.demos : []).filter(d => d && d.data);
  const ST = { confirmada: 'Confirmada', realizada: 'Realizada', naocompareceu: 'Não compareceu', remarcada: 'Reagendada', cancelada: 'Cancelada' };
  const RES = { proposta: 'quer proposta', pensar: 'vai pensar', sem: 'sem interesse' };
  const aberta = d => !d.status || d.status === 'agendada' || d.status === 'confirmada';
  const vem = ds.filter(d => aberta(d) && d.data >= h).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const foi = ds.filter(d => !vem.includes(d)).sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  const st = d => aberta(d) && d.data < h ? '<span class="agst st-pend">Registrar resultado</span>' : ST[d.status] ? `<span class="agst st-${d.status}">${ST[d.status]}${d.status === 'realizada' && RES[d.resultado] ? ' · ' + RES[d.resultado] : ''}</span>` : '';
  const linha = d => `<button type="button" class="crmdemol${aberta(d) ? '' : ' passou'}" data-a="demo" data-did="${esc(d.id)}"><span><b>${fmtD(d.data)} · ${esc(d.hora)}</b>${st(d)}</span><small>${d.formato === 'presencial' ? 'Presencial' : 'Online'}${(d.participantes || []).length ? ' · com ' + esc(d.participantes.join(', ')) : ''}</small></button>`;
  return `<section class="crmbloco"><h4>Demonstrações</h4>
    ${vem.length || foi.length ? `<div class="crmdemos">${vem.map(linha).join('')}${foi.length ? `<small class="crmdemot">Anteriores</small>${foi.map(linha).join('')}` : ''}</div>` : `<p class="hint">${l.id ? 'Nenhuma demonstração agendada.' : 'Salve o lead para agendar uma demonstração.'}</p>`}
    ${l.id ? '<button type="button" class="crmctadd" data-a="agendar">+ Agendar demonstração</button>' : ''}
  </section>`;
}

/* ---------- Base de postos da ANP ---------- */
// Busca o CNPJ na base interna da ANP, mostra o cartão e (preencher=true) completa os campos vazios do lead
let anpAtual = null, anpPedido = '';
async function anpLead(cnpj, preencher) {
  const box = $('crmAnp'), d = dig(cnpj);
  if (!box) return null;
  if (d.length !== 14 || !window.anpPosto) { anpAtual = null; anpPedido = ''; box.hidden = true; box.innerHTML = ''; return null; }
  if (anpAtual && anpAtual.cnpj === d && !preencher) return anpAtual;
  anpPedido = d;
  let p;
  try { p = await window.anpPosto(d); } catch (e) { return undefined; }
  if (anpPedido !== d || !$('crmAnp')) return null;
  anpAtual = p;
  box.innerHTML = p ? window.anpHtml(p) : '<p class="hint">Este CNPJ não aparece na base de postos da ANP.</p>';
  box.hidden = false;
  if (p && preencher) {
    const put = (f, v) => { const el = $('crmForm')?.querySelector(`[data-f=${f}]`); if (el && v && !el.value.trim()) el.value = v; };
    put('empresa', p.razao); put('cidade', p.cidade);
  }
  return p;
}

function lerForm() {
  const o = {};
  $('crmForm').querySelectorAll('[data-f]').forEach(el => { o[el.dataset.f] = el.value.trim(); });
  o.cnpj = dig(o.cnpj);
  if (o.etapa !== 'perdido') o.motivo = '';
  if (anpAtual && anpAtual.cnpj === o.cnpj && window.anpResumo) o.anp = window.anpResumo(anpAtual);
  try { o.socios = JSON.parse($('crmSoc').dataset.socios || '[]'); } catch (e) { o.socios = []; }
  // O primeiro contato continua em contato/fone/email (funil, busca e Gerar proposta usam esses campos)
  o.contatos = lerContatos(); const c0 = o.contatos[0] || {};
  o.contato = c0.nome || ''; o.fone = c0.fone || ''; o.email = c0.email || '';
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
    if (aposNovo && !depois) { const f = aposNovo; aposNovo = null; dlg().close(); f(ref.id); return ref.id; }
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
  if (window.shotgunAbrirPropostas) window.shotgunAbrirPropostas(); else $('tabList').click();
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
      <button type="button" class="primary" data-a="verprop" data-id="${esc(p.id)}">Abrir em Propostas</button>
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
  leads().filter(l => chave(l.cnpj, l.empresa) === k).forEach(l => contatosDe(l).forEach(x => contatos.set(norm(x.nome) + dig(x.fone), { nome: x.nome, fone: dig(x.fone), email: x.email, cargo: x.cargo })));
  // Contatos cadastrados na própria ficha (podem ser tirados)
  const proprios = (c.doc?.contatos || []);
  proprios.forEach((x, i) => contatos.set(norm(x.nome) + dig(x.fone), { nome: x.nome, fone: dig(x.fone), email: x.email, cargo: x.cargo, i }));
  const fone = f => f ? (f.length > 11 ? f.slice(2) : f).replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : '';
  abrirDlg(c.nome, `
    <div class="crmresumo">
      <p><small>${esc([fmtCnpj(c.cnpj), c.cidade, c.vendedor && 'Vendedor: ' + c.vendedor].filter(Boolean).join(' · '))}</small></p>
      <p><small>${c.desde ? 'Cliente desde ' + c.desde.toLocaleDateString('pt-BR') + ' · ' : ''}${brl(c.men)}/mês em contratos aceitos</small></p>
    </div>
    <div class="crmsec"><h4>Contatos</h4>${contatos.size ? `<ul class="crmul">${[...contatos.values()].map(x => `<li>${esc(x.nome || '(sem nome)')}${x.cargo ? ` <small>(${esc(x.cargo)})</small>` : ''}${x.fone ? ` · <a href="https://wa.me/${x.fone.length <= 11 ? '55' + x.fone : x.fone}" target="_blank" rel="noopener">${fone(x.fone)}</a>` : ''}${x.email ? ` · <a href="mailto:${esc(x.email)}">${esc(x.email)}</a>` : ''}${x.i !== undefined ? ` <button type="button" class="linkbtn crmctdel" data-a="clictdel" data-i="${x.i}" aria-label="Tirar contato">✕</button>` : ''}</li>`).join('')}</ul>` : '<p class="hint">Nenhum contato registrado.</p>'}
      <div class="crmctnovo">${cargosList()}<input id="crmCliNome" placeholder="Nome"><input id="crmCliCargo" list="crmCargos" placeholder="Cargo"><input id="crmCliFone" inputmode="tel" placeholder="WhatsApp / telefone"><input id="crmCliEmail" type="email" placeholder="E-mail"><button type="button" data-a="clictadd">+ Contato</button></div></div>
    <div class="crmsec"><h4>Propostas e contratos</h4><ul class="crmul">${c.props.map(p => `<li><button type="button" class="linkbtn" data-a="verprop" data-id="${esc(p.id)}">Nº ${esc(p.numero)}</button> · ${fmtD(p.data)} · ${esc(ETAPAS.find(e => e.id === etapaProp(p)).nome)} · ${brl(p.totLic)} + ${brl(p.totMen)}/mês</li>`).join('')}</ul></div>
    <div id="crmAnpCli" hidden></div>
    <div class="crmsec" id="crmTask"></div>
    ${notasHtml(c.doc?.notas, [...contatos.values()].map(x => x.nome))}`);
  dlg().dataset.modo = 'cli'; dlg().dataset.k = k;
  if (dig(c.cnpj).length === 14 && window.anpPosto) window.anpPosto(c.cnpj).then(p => { const b = $('crmAnpCli'); if (p && b && dlg().dataset.k === k) { b.innerHTML = window.anpHtml(p); b.hidden = false; } }).catch(() => {});
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

// Grava no documento da ficha do cliente (cria na primeira vez)
async function gravarCli(k, campos) {
  const c = clientes().find(x => x.k === k), ref = F.doc(db, 'crm', 'c_' + k);
  if (c.doc) await F.updateDoc(ref, { ...campos, alterado: F.serverTimestamp() });
  else await F.setDoc(ref, { tipo: 'cliente', chave: k, nome: c.nome, cnpj: dig(c.cnpj), owner: admin && c.owner ? c.owner : perfil.uid, notas: [], contatos: [], ...campos, criado: F.serverTimestamp() });
  const atual = docs.find(d => d.id === 'c_' + k) || { id: 'c_' + k, tipo: 'cliente', owner: c.owner, notas: [] };
  docs = docs.filter(d => d.id !== 'c_' + k).concat([{ ...atual, ...campos }]);
}
async function addContatoCli() {
  const k = dlg().dataset.k, x = { nome: $('crmCliNome').value.trim(), fone: $('crmCliFone').value.trim(), email: $('crmCliEmail').value.trim(), cargo: $('crmCliCargo').value.trim() };
  if (!x.nome && !x.fone && !x.email) { $('crmCliNome').focus(); dmsg('Preencha o nome, o telefone ou o e-mail do contato.'); return; }
  const c = clientes().find(y => y.k === k);
  try { await gravarCli(k, { contatos: [...(c.doc?.contatos || []), x] }); fichaCliente(k); dmsg('Contato adicionado.'); }
  catch (e) { dmsg('Não foi possível salvar o contato (' + (e.code || e.message) + ').'); }
}
async function delContatoCli(i) {
  const k = dlg().dataset.k, c = clientes().find(y => y.k === k), lista = (c.doc?.contatos || []).filter((_, j) => j !== i);
  try { await gravarCli(k, { contatos: lista }); fichaCliente(k); dmsg('Contato tirado.'); }
  catch (e) { dmsg('Não foi possível tirar o contato (' + (e.code || e.message) + ').'); }
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
    if (destino === 'enviada' || destino === 'salva') { gerarProposta(l); return; }
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
  msg(['lead', 'qualificado'].includes(destino) ? 'Uma proposta não volta a ser lead.' : atual === 'salva' && destino === 'enviada' ? 'Para enviar, abra a proposta e use Enviar pelo WhatsApp ou Copiar link.' : 'Essa etapa muda sozinha: quando a proposta é enviada, quando o cliente aprova e quando aceita o contrato.');
}

/* ---------- Eventos ---------- */
function ligar() {
  if (!$('viewCrm')) return;
  $('crmNav').addEventListener('click', e => { const b = e.target.closest('button[data-aba]'); if (!b) return; aba = b.dataset.aba; $('crmBusca').value = ''; desenhar(); });
  $('crmBusca').addEventListener('input', desenhar);
  $('crmUsuario').addEventListener('change', e => { fUser = e.target.value; desenhar(); });
  $('crmUf').addEventListener('change', e => { fUf = e.target.value; desenhar(); });
  $('crmFiltro').addEventListener('click', e => { if (e.target.closest('[data-a=limparfiltro]')) { fUser = fUf = ''; desenhar(); } });
  $('crmNovo').addEventListener('click', () => formLead());
  // Telemetria ANP: abre o Novo lead com o CNPJ do posto e já busca os dados (Receita e ANP)
  window.crmLeadDoPosto = cnpj => {
    $('tabCrm').click();
    formLead({ etapa: 'lead', origem: 'Telemetria ANP', cnpj });
    const b = $('crmForm') && $('crmForm').querySelector('[data-a=cnpj]'); if (b) b.click();
  };
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
  dlg().addEventListener('close', () => { pararDitado(); aposNovo = null; });
  dlg().addEventListener('input', e => { if (e.target.dataset.f === 'cnpj' && dig(e.target.value).length === 14) anpLead(e.target.value, true); });
  dlg().addEventListener('change', e => { if (e.target.dataset.f === 'etapa') { const m = dlg().querySelector('.crmmot'); if (m) m.hidden = e.target.value !== 'perdido'; } });
  dlg().addEventListener('input', e => { if (e.target.closest('#crmCts')) atualizarNCont(); });
  dlg().addEventListener('input', e => { if (e.target.dataset.f === 'prox') marcarPrazos(); });
  dlg().addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'crmNCont') { e.preventDefault(); $('crmNTexto').focus(); return; }
    if (e.key === 'Enter' && e.target.id === 'crmNTexto') { e.preventDefault(); pararDitado(); anotar(); } });
  dlg().addEventListener('click', async e => {
    if (e.target.id === 'crmNAdd') { pararDitado(); anotar(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'ditar') { ditar(b); return; }
    if (a === 'prazo') { const inp = $('crmForm').querySelector('[data-f=prox]'); inp.value = isoDaqui(+b.dataset.n); marcarPrazos(); return; }
    pararDitado();
    if (a === 'salvar') { if (await salvarLead()) desenhar(); }
    else if (a === 'agendar' || a === 'demo') { const id = await salvarLead(true); if (id && window.agendaNova) { if (a === 'agendar') window.agendaNova(id); else window.agendaAbrir(id, b.dataset.did); } }
    else if (a === 'gerar') { const id = await salvarLead(true); if (id) gerarProposta({ id, ...lerForm() }); }
    else if (a === 'excluir') {
      if (b.dataset.confirma !== '1') { b.dataset.confirma = '1'; b.textContent = 'Confirmar exclusão'; dmsg('Clique de novo para excluir o lead e o histórico dele.'); return; }
      try { await F.deleteDoc(F.doc(db, 'crm', $('crmForm').dataset.id)); dlg().close(); msg('Lead excluído.'); } catch (er) { dmsg('Não foi possível excluir (' + (er.code || er.message) + ').'); }
    }
    else if (a === 'anpbusca') {
      // Estado inicial: o da cidade do lead, se houver. Ao escolher, faz o mesmo que o Buscar
      const uf = (($('crmForm').querySelector('[data-f=cidade]') || {}).value || '').match(/\b([A-Za-z]{2})\s*$/);
      window.anpPesquisa && window.anpPesquisa($('crmAnpBusca'), uf && uf[1], cnpj => { const inp = $('crmForm').querySelector('[data-f=cnpj]'); inp.value = fmtCnpj(cnpj); $('crmForm').querySelector('[data-a=cnpj]').click(); });
    }
    else if (a === 'cnpj') {
      const inp = $('crmForm').querySelector('[data-f=cnpj]'), d = dig(inp.value);
      if (d.length !== 14) { dmsg('Digite os 14 números do CNPJ.'); return; }
      dmsg('Buscando o CNPJ…');
      inp.value = fmtCnpj(d);
      const [r, pa] = await Promise.all([window.cnpjInfo ? window.cnpjInfo(d) : null, anpLead(d, false)]);
      const put = (f, v) => { const el = $('crmForm').querySelector(`[data-f=${f}]`); if (el && v && !el.value.trim()) el.value = v; };
      if (r && r.socios) { const box = $('crmSoc'); box.dataset.socios = JSON.stringify(r.socios); box.innerHTML = sociosHtml(r.socios, lerContatos().map(c => c.nome)); }
      if (r) {
        put('empresa', r.razao); put('cidade', r.municipio && r.uf ? r.municipio + ' - ' + r.uf : r.municipio);
        const r0 = document.querySelector('#crmCts .crmct'), pc = (c, v) => { const el = r0 && r0.querySelector(`[data-c=${c}]`); if (el && v && !el.value.trim()) el.value = v; };
        pc('fone', r.telefone); pc('email', r.email);
      }
      if (pa) { put('empresa', pa.razao); put('cidade', pa.cidade); }
      const anpTxt = pa ? ` Posto encontrado na ANP${pa.porte ? ' (porte ' + pa.porte + ')' : ''}.` : pa === null ? ' Não está na base de postos da ANP.' : '';
      if (!r && !pa) { dmsg('Não encontrei esse CNPJ agora. Preencha os dados à mão.' + anpTxt); return; }
      dmsg((r ? (r.situacao && !/ativa/i.test(r.situacao) ? 'Atenção: situação na Receita: ' + r.situacao + '.' : 'Dados da Receita preenchidos.') : 'A Receita não respondeu agora.') + anpTxt);
    }
    else if (a === 'socio') {
      const socios = JSON.parse($('crmSoc').dataset.socios || '[]'), x = socios[+b.dataset.i]; if (!x) return;
      const nome = nomeProprio(x.nome), lista = $('crmCtLista');
      if (lerContatos().some(c => norm(c.nome) === norm(nome))) { dmsg(nome + ' já está nos contatos.'); return; }
      // Usa a primeira linha sem nome; se todas tiverem nome, cria uma nova
      let row = [...lista.querySelectorAll('.crmct')].find(r => !r.querySelector('[data-c=nome]').value.trim());
      if (!row) { lista.insertAdjacentHTML('beforeend', ctLinha({})); row = lista.lastElementChild; }
      const val = c => row.querySelector(`[data-c=${c}]`).value;
      row.insertAdjacentHTML('afterend', ctLinha({ nome, fone: val('fone'), email: val('email'), cargo: x.qual || '' }));
      const novo = row.nextElementSibling; row.remove(); row = novo;
      b.setAttribute('aria-pressed', 'true');
      row.querySelector('[data-c=fone]').focus();
      atualizarNCont();
      dmsg(nome + (x.qual ? ' (' + x.qual + ')' : '') + ' entrou nos contatos. Complete o telefone e salve.');
    }
    else if (a === 'ctadd') { const lista = $('crmCtLista'); lista.insertAdjacentHTML('beforeend', ctLinha({})); lista.lastElementChild.querySelector('input').focus(); }
    else if (a === 'ctdel') {
      const lista = $('crmCtLista'), row = b.closest('.crmct');
      if (lista.children.length > 1) row.remove(); else row.querySelectorAll('input').forEach(i => { i.value = ''; });
      atualizarNCont();
      const nomes = lerContatos().map(c => c.nome); $('crmSoc').querySelectorAll('.crmsocb').forEach(bt => { const x = JSON.parse($('crmSoc').dataset.socios || '[]')[+bt.dataset.i]; bt.setAttribute('aria-pressed', String(!!x && nomes.some(n => norm(n) === norm(nomeProprio(x.nome))))); });
    }
    else if (a === 'clictadd') { addContatoCli(); }
    else if (a === 'clictdel') { delContatoCli(+b.dataset.i); }
    else if (a === 'verprop') { const p = props.find(x => x.id === b.dataset.id); if (p) verProposta(p); }
    else if (a === 'perder') { if (await marcarProp(b.dataset.id, true, ($('crmPMot') || {}).value)) dlg().close(); }
    else if (a === 'reabrir') { if (await marcarProp(b.dataset.id, false)) dlg().close(); }
  });
}
ligar();

// Pré TASK: tela de validação final de tudo o que foi lançado nos passos anteriores.
// Abre no Passo 4 da proposta (vendedor) e no card do TASK (equipe), sempre a mesma tela.
// Dados: propostas/{id}/etapa4/dados.pre (cabeçalho, base e filiais) + valores/campos (Parâmetros Pré TASK).
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dig = v => String(v || '').replace(/\D/g, '');
  const fmtCnpj = v => { const d = dig(v); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : (v || ''); };
  const fmtD = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || ''); };
  const isoDe = v => { v = String(v || ''); let m = v.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`; m = v.match(/^\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\s*$/); if (!m) return ''; const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
  const fmtTs = ts => ts && ts.toDate ? ts.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
  const brl = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const STATUS = { fut: 'FUTURO', and: 'EM ANDAMENTO', fin: 'FINALIZADO' };
  const copia = o => JSON.parse(JSON.stringify(o));

  /* ---------- Estilos ---------- */
  const css = `
.ptdlg{width:min(1180px,calc(100vw - 24px))}
.ptdlg .tkdlghead{flex-wrap:wrap}
.pthead{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-left:auto}
.pthead .hint{max-width:420px}
#ptSalvar.incompleto{opacity:.5;cursor:not-allowed;filter:grayscale(.4)}
#ptBody{padding:16px}
.ptgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px 14px;align-items:start}
.ptgrid .full,.ptgrid>.ptfull{grid-column:1/-1}
.ptf{display:flex;flex-direction:column;gap:4px;font-size:13px;font-weight:600;color:var(--muted);min-width:0}
.ptf>span b{color:var(--danger)}
.ptf input,.ptf select,.ptf textarea{font:inherit;font-weight:400;font-size:14px;color:var(--fg)}
.ptf .falta,.ptgrid .falta{border-color:#d69e2e!important;background:color-mix(in srgb,#d69e2e 12%,var(--field))}
.ptf .erro,.ptgrid .erro{border-color:var(--danger)!important}
.ptdw{display:contents}
.ptseg{display:inline-flex;flex-wrap:wrap;border:1px solid var(--line);border-radius:999px;overflow:hidden;background:var(--field);align-self:flex-start}
.ptseg button{border:0;border-radius:0;background:none;font:inherit;font-size:13px;font-weight:500;padding:7px 14px;color:var(--fg);cursor:pointer;min-height:0}
.ptseg button+button{border-left:1px solid var(--line)}
.ptseg button[aria-pressed=true]{background:var(--purple);color:#fff;font-weight:600}
.ptseg.st button[data-v=fut][aria-pressed=true]{background:#2b6cb0}.ptseg.st button[data-v=and][aria-pressed=true]{background:#b7791f}.ptseg.st button[data-v=fin][aria-pressed=true]{background:#2f8f57}
.ptseg.erro{border-color:var(--danger)}
.ptro{border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:var(--field);color:var(--fg);font-weight:400;font-size:14px;min-height:38px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ptro small{color:var(--muted)}
.ptsec{border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--surface)}
.ptsec>h5{margin:0;background:var(--accent);color:#fff;font-family:var(--display);font-weight:500;font-size:13.5px;letter-spacing:.03em;padding:8px 14px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.ptsec>h5 small{font-family:var(--body);font-weight:500;font-size:12px;opacity:.92}
.ptsec>.ptgrid,.ptsec>.ptin{padding:14px}
.ptpainel{display:flex;flex-direction:column;gap:14px}
.ptfil{width:100%;border-collapse:collapse;font-size:13px;min-width:760px}
.ptfil th{text-align:left;font-size:11.5px;color:var(--muted);font-weight:600;padding:6px;border-bottom:1px solid var(--line);white-space:nowrap}
.ptfil td{padding:5px 6px;border-bottom:1px solid var(--line);vertical-align:middle}
.ptfil input,.ptfil select{width:100%;font:inherit;font-size:13px}
.ptfil td.cod{width:70px}.ptfil td.tp{width:110px}.ptfil td.cn{width:170px}.ptfil td.f1{width:70px;text-align:center}
.ptfil tr.f100 td{background:color-mix(in srgb,var(--purple) 12%,transparent)}
.ptfil .tag100{display:inline-block;margin-left:4px;font-size:10.5px;font-weight:700;background:var(--purple);color:#fff;border-radius:999px;padding:1px 6px}
.ptscroll{overflow-x:auto}
.ptnote{font-size:12.5px;color:var(--muted);font-weight:400;margin:0}
.pttabs{display:flex;gap:6px;flex-wrap:wrap}
.pttabs button{border-radius:999px;padding:6px 12px;font-size:13px}
.pttabs button[aria-selected=true]{background:var(--purple);border-color:var(--purple);color:#fff}
.ptanx{display:flex;flex-direction:column;gap:6px}
.ptanx .lista{display:flex;flex-wrap:wrap;gap:6px}
.ptanx .it{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:3px 4px 3px 10px;font-size:12.5px;font-weight:500;color:var(--fg);background:var(--field);word-break:break-all}
.ptanx .it.comimg{border-radius:10px;padding:4px 4px 4px 4px}.ptanx .it img.mini{width:56px;height:56px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:6px;cursor:zoom-in;flex:none}
.ptanx .it button{border:0;background:none;padding:0 6px;font-size:15px;color:var(--muted);min-height:0}
.ptanx .bt{align-self:flex-start;cursor:pointer;border:1px dashed var(--line);border-radius:8px;padding:6px 12px;font-size:13px;font-weight:600;color:var(--purple)}
.ptanx .cst{font-size:12.5px;font-weight:500}.ptanx .cst.ok{color:#2f8f57}.ptanx .cst.bad{color:var(--danger)}.ptanx .cst:empty{display:none}.ptanx .ccnpj{display:block;margin-top:4px}.ptanx .ccnpj.alerta{background:#fde2e1;color:#9b1c1c;border-left:4px solid #d93025;border-radius:4px;padding:6px 10px;font-weight:600}.ptanx .cst.venc{display:block;background:#fff3c4;color:#6b4e00;border-left:4px solid #e0a800;border-radius:4px;padding:6px 10px;margin-top:4px}
.ptbtns{display:flex;gap:8px;flex-wrap:wrap}
.pthist{font-size:12px;color:var(--muted);font-weight:400}
.dgm.ok,.dgm.parcial,.dgm.vazio{flex:none}
.dgm.falta{border:2px solid #d69e2e}
`;
  function estilos() { if (document.getElementById('ptCss')) return; const s = document.createElement('style'); s.id = 'ptCss'; s.textContent = css; document.head.appendChild(s); }

  /* ---------- Campos configuráveis (usados no Pré TASK e nos módulos do TASK) ---------- */
  const ehOutro = v => /^outr[oa]s?(\b|$)/i.test(String(v || '').trim());
  const opsDe = c => { const o = String(c.opcoes || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean); if (c.outros && !o.some(ehOutro)) o.push('Outros'); return o; };
  const TIPOIN = { data: 'type="date"', numero: 'type="number" min="0"', email: 'type="email"', telefone: 'inputmode="tel"', cpf: 'inputmode="numeric"', cnpj: 'inputmode="numeric"', cep: 'inputmode="numeric"' };
  // c: definição do campo; key: chave completa (com prefixo de filial); v: valores atuais; anx: estado dos anexos
  function campoHtml(c, key, v, anx) {
    const star = c.req ? ' <b>*</b>' : '', lab = `<span>${esc(c.label)}${star}</span>`, val = v[key] == null ? '' : v[key];
    const full = c.tipo === 'textolongo' || c.full ? ' full' : '';
    if (c.tipo === 'anexo' || c.tipo === 'arquivo') {
      const st = anx[key] = anx[key] || { salvos: Array.isArray(val) ? val.slice() : [], novos: [], senha: v[key + '__senha'] || '', label: c.label };
      return `<div class="ptf full ptanx" data-anx="${esc(key)}">${lab}<div class="lista"></div><label class="bt">📎 Escolher arquivos<input type="file" multiple hidden data-anxin="${esc(key)}"></label><label class="ptf ptpfx" hidden><span>Senha do certificado (.pfx)</span><input data-pfx="${esc(key)}" value="${esc(st.senha)}" autocomplete="off" style="max-width:260px"><span class="cst"></span><span class="cst ccnpj"></span></label></div>`;
    }
    if (c.tipo === 'textolongo') return `<label class="ptf full">${lab}<textarea data-pk="${esc(key)}" rows="3"${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}>${esc(val)}</textarea></label>`;
    if (c.tipo === 'simnao') return `<div class="ptf${full}">${lab}<div class="ptseg" data-pk="${esc(key)}" data-seg="1">${['Sim', 'Não'].map(o => `<button type="button" data-v="${o}" aria-pressed="${val === o}">${o}</button>`).join('')}</div></div>`;
    if (c.tipo === 'opcoes' || c.tipo === 'multicond') {
      const ops = c.tipo === 'multicond' ? String(c.opcoes || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean) : opsDe(c);
      const base = ops.find(o => o === val) || (ehOutro(String(val).split(':')[0]) ? ops.find(ehOutro) : '');
      const outro = base && ehOutro(base) ? String(val).replace(/^[^:]*:\s*/, '') : '';
      let h = `<label class="ptf${full}">${lab}<select data-pk="${esc(key)}"><option value="">Escolha</option>${ops.map(o => `<option${o === base ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>${c.tipo === 'opcoes' && ops.some(ehOutro) ? `<input data-outro="${esc(key)}" placeholder="Qual?" value="${esc(outro)}">` : ''}</label>`;
      if (c.tipo === 'opcoes' && String(c.detalhe || '').trim()) h += `<label class="ptf full" data-det="${esc(key)}"><span>${esc(c.detalhe)}</span><textarea data-pk="${esc(key)}__det" rows="3">${esc(v[key + '__det'] || '')}</textarea></label>`;
      if (c.tipo === 'multicond') {
        const pref = key.slice(0, key.length - c.k.length);
        h += ops.map(op => { const xs = ((c.cond || {})[op] || []).filter(x => x.tipo !== 'filiais'); return xs.length ? `<div class="ptdw" data-cond="${esc(key)}" data-op="${esc(op)}">${xs.map(x => campoHtml(x, pref + x.k, v, anx)).join('')}</div>` : ''; }).join('');
      }
      return h;
    }
    if (c.tipo === 'link') return `<label class="ptf${full}">${lab}<input data-pk="${esc(key)}" type="url" value="${esc(val)}" placeholder="https://"></label>`;
    return `<label class="ptf${full}">${lab}<input data-pk="${esc(key)}" ${TIPOIN[c.tipo] || ''} value="${esc(val)}"${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}></label>`;
  }
  // Seção: Sim/Não que "abre" mostra os campos seguintes só com Sim
  function camposHtml(campos, pref, v, anx) {
    let dep = null;
    return campos.map((c, i) => {
      let h = campoHtml(c, pref + c.k, v, anx);
      // Cada Sim/Não que abre começa um grupo próprio: não fica dentro do grupo anterior (TEF Fixo x PDV Móvel x Cartões Frota são independentes)
      const abre = c.tipo === 'simnao' && (c.abre != null ? c.abre : i === 0) && i < campos.length - 1;
      if (c.solto || abre) dep = null;
      if (dep) h = `<div class="ptdw" data-dep="${esc(dep)}">${h}</div>`;
      if (abre) dep = pref + c.k;
      return h;
    }).join('');
  }
  function sincronizar(root) {
    const valorDe = k => { const el = root.querySelector(`[data-pk="${CSS.escape(k)}"]`); if (!el) return ''; if (el.dataset.seg) return el.querySelector('[aria-pressed=true]')?.dataset.v || ''; return el.value; };
    root.querySelectorAll('[data-dep]').forEach(w => { w.hidden = valorDe(w.dataset.dep) !== 'Sim'; });
    root.querySelectorAll('[data-cond]').forEach(w => { w.hidden = valorDe(w.dataset.cond) !== w.dataset.op; });
    root.querySelectorAll('[data-det]').forEach(w => { w.hidden = !valorDe(w.dataset.det); });
    root.querySelectorAll('[data-outro]').forEach(o => { o.hidden = !ehOutro(valorDe(o.dataset.outro)); });
  }
  // Só os blocos condicionais contam como ocultos (painéis e abas fechados continuam valendo)
  const oculto = (el, root) => { for (let x = el; x && x !== root; x = x.parentElement) if (x.hidden && x.dataset && (x.dataset.dep !== undefined || x.dataset.cond !== undefined || x.dataset.det !== undefined || x.dataset.outro !== undefined || x.classList.contains('ptpfx'))) return true; return false; };
  function lerCampo(root, c, key) {
    const el = root.querySelector(`[data-pk="${CSS.escape(key)}"]`); if (!el || oculto(el, root)) return '';
    if (el.dataset.seg) return el.querySelector('[aria-pressed=true]')?.dataset.v || '';
    let v = String(el.value || '').trim();
    const o = root.querySelector(`[data-outro="${CSS.escape(key)}"]`); if (o && !o.hidden && v && o.value.trim()) v += ': ' + o.value.trim();
    return v;
  }
  // Lê uma lista de campos: devolve valores {chave: valor}, campos {rótulo: valor} e o primeiro obrigatório vazio
  let SILENCIO = false; // conferência silenciosa (habilitar o salvar final) não marca os campos
  function lerCampos(root, campos, pref, anx, rotulo) {
    const valores = {}, legiveis = {}; let falta = null;
    const marca = (el, ruim) => { if (el && !SILENCIO) el.classList.toggle('erro', !!ruim); };
    const um = c => {
      const key = pref + c.k, lab = rotulo ? rotulo(c.label) : c.label;
      if (c.tipo === 'anexo' || c.tipo === 'arquivo') {
        const box = root.querySelector(`[data-anx="${CSS.escape(key)}"]`); if (!box || oculto(box, root)) return;
        const st = anx[key] || { salvos: [], novos: [] }, n = st.salvos.length + st.novos.length;
        marca(box.querySelector('.bt'), c.req && !n); if (c.req && !n) falta = falta || box.querySelector('.bt');
        if (n) { valores[key] = st.salvos; legiveis[lab] = st.salvos.map(a => a.nome).concat(st.novos.map(f => f.name)).join('\n'); }
        const pfx = box.querySelector('[data-pfx]'); if (pfx && !oculto(pfx, root) && pfx.value.trim()) { valores[key + '__senha'] = pfx.value.trim(); legiveis[lab + ' - Senha do certificado'] = pfx.value.trim(); }
        return;
      }
      const val = lerCampo(root, c, key), el = root.querySelector(`[data-pk="${CSS.escape(key)}"]`);
      if (el && !oculto(el, root)) { marca(el, c.req && !val); if (c.req && !val) falta = falta || el; }
      if (val) { valores[key] = val; legiveis[lab] = c.tipo === 'data' ? fmtD(val) : val; }
      if (c.tipo === 'multicond' && val) ((c.cond || {})[val] || []).filter(x => x.tipo !== 'filiais').forEach(um);
      if (c.tipo === 'opcoes' && val) { const d = lerCampo(root, { tipo: 'textolongo' }, key + '__det'); if (d) { valores[key + '__det'] = d; legiveis[lab + ' - ' + c.detalhe] = d; } }
    };
    campos.forEach(um);
    return { valores, legiveis, falta };
  }
  // Conta preenchidos e obrigatórios de uma lista de campos, para o marcador do menu
  function contar(campos, pref, v) {
    let ok = 0, tot = 0;
    campos.forEach(c => { if (!c.req) return; tot++; const x = v[pref + c.k]; if (Array.isArray(x) ? x.length : String(x || '').trim()) ok++; });
    return { ok, tot };
  }
  // Anexos: lista, remover, um certificado por campo e senha conferida no aparelho
  let forgeP = null;
  const carregarForge = () => forgeP || (forgeP = new Promise((ok, err) => { if (window.forge) return ok(window.forge); const sc = document.createElement('script'); sc.src = 'lib/forge.min.js'; sc.onload = () => ok(window.forge); sc.onerror = () => { forgeP = null; err(new Error('forge')); }; document.head.appendChild(sc); }));
  async function conferirPfx(file, senha) {
    const forge = await carregarForge(), buf = new Uint8Array(await file.arrayBuffer()); let bin = ''; for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
    try { const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(bin), false, senha); const c = ((p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]) || []).map(b => b.cert).filter(Boolean)[0]; return { ok: true, cn: c ? ((c.subject.getField('CN') || {}).value || '') : '', ate: c ? c.validity.notAfter : null }; }
    catch (e) { return { ok: false }; }
  }
  const ehPfx = n => /\.(pfx|p12)$/i.test(n || '');
  // CNPJ do certificado x CNPJ da filial: igual = ok; mesma empresa (raiz de 8 dígitos) = aviso; outra empresa = erro (bloqueia o salvar final)
  function cnpjCert(k, r, st, ccn) {
    st.cnpjRes = null; if (!ccn) return; ccn.textContent = ''; ccn.className = 'cst ccnpj';
    if (!r || !r.ok || !C || !C.pre) return;
    const cc = (String(r.cn || '').match(/(\d{14})/) || [])[1]; if (!cc) return;
    const m = String(k).match(/^f(\d+)__/), fil = m ? C.pre.filiais[+m[1]] : C.pre.filiais[0], cf = dig((fil && fil.cnpj) || C.p.cnpj || ''), cod = (fil && fil.cod) || 'cliente';
    if (cf.length !== 14) { ccn.className = 'cst ccnpj venc'; ccn.textContent = '⚠ Informe o CNPJ da ' + cod + ' para conferir com o certificado (' + fmtCnpj(cc) + ').'; return; }
    if (cc === cf) { st.cnpjRes = 'ok'; ccn.className = 'cst ccnpj ok'; ccn.textContent = '✓ CNPJ do certificado confere com a ' + cod + ' (' + fmtCnpj(cc) + ')'; return; }
    if (cc.slice(0, 8) === cf.slice(0, 8)) { st.cnpjRes = 'base'; ccn.className = 'cst ccnpj alerta'; ccn.textContent = '✗ O CNPJ do certificado (' + fmtCnpj(cc) + ') não é o da ' + cod + ' (' + fmtCnpj(cf) + '). É de outra unidade da mesma empresa.'; return; }
    st.cnpjRes = 'dif'; ccn.className = 'cst ccnpj alerta'; ccn.textContent = '✗ O CNPJ do certificado (' + fmtCnpj(cc) + ') não corresponde ao CNPJ da ' + cod + ' (' + fmtCnpj(cf) + ').';
  }
  const MINIS = new Map();
  function miniSalva(id) {
    if (MINIS.has(id)) return MINIS.get(id);
    const pr = (async () => { try { if (!C || !C.F) return ''; const { F, db, pid } = C; const meta = (await F.getDoc(F.doc(db, 'propostas', pid, 'anexos', id))).data() || {}; if ((meta.tamanho || 0) > 4 * 1024 * 1024) return '';
      const ps = await F.getDocs(F.collection(db, 'propostas', pid, 'anexos', id, 'partes')); const b64 = ps.docs.sort((x, y) => x.id.localeCompare(y.id)).map(x => x.data().d).join(''); if (!b64) return '';
      const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([u8], { type: meta.tipo || 'image/png' })); } catch (e) { return ''; } })();
    MINIS.set(id, pr); return pr;
  }
  function desenharAnexo(box, anx) {
    const k = box.dataset.anx, st = anx[k]; if (!st) return;
    const kb = n => Math.max(1, Math.round((n || 0) / 1024)) + ' KB';
    const ehImg = (tipo, nome) => /^image\//.test(tipo || '') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(nome || '');
    const mini = (ehI, attr) => ehI ? `<img class="mini" alt="" ${attr}>` : '📄';
    box.querySelector('.lista').innerHTML = st.salvos.map((a, i) => `<span class="it${ehImg(a.tipo, a.orig || a.nome) ? ' comimg' : ''}">${mini(ehImg(a.tipo, a.orig || a.nome), `data-miniid="${esc(a.id || '')}"`)} ${esc(a.nome)} <small>${kb(a.tamanho)}</small><button type="button" data-anxrm="s${i}" aria-label="Remover ${esc(a.nome)}">×</button></span>`).join('') + st.novos.map((f, i) => `<span class="it${ehImg(f.type, f.name) ? ' comimg' : ''}">${mini(ehImg(f.type, f.name), `data-mininovo="${i}"`)} ${esc(f.name)} <small>${kb(f.size)} · novo</small><button type="button" data-anxrm="n${i}" aria-label="Remover ${esc(f.name)}">×</button></span>`).join('') || '<span class="ptnote">Nenhum arquivo.</span>';
    // Miniatura das imagens: as novas vêm do aparelho; as já salvas são lidas do banco (uma vez)
    box.querySelectorAll('img[data-mininovo]').forEach(im => { const f = st.novos[+im.dataset.mininovo]; if (!f) return; const u = URL.createObjectURL(f); im.src = u; im.onclick = () => window.open(u, '_blank'); });
    box.querySelectorAll('img[data-miniid]').forEach(im => { const id = im.dataset.miniid; if (!id) { im.replaceWith('📄'); return; } miniSalva(id).then(u => { if (u) { im.src = u; im.onclick = () => window.open(u, '_blank'); } else im.replaceWith('📄'); }); });
    const temPfx = st.salvos.some(a => ehPfx(a.nome)) || st.novos.some(f => ehPfx(f.name)), l = box.querySelector('.ptpfx'); l.hidden = !temPfx;
    const novoPfx = st.novos.find(f => ehPfx(f.name)), inp = l.querySelector('input'), cst = l.querySelector('.cst:not(.ccnpj)'), ccn = l.querySelector('.ccnpj');
    const conf = async () => { if (!novoPfx || !inp.value) { cst.textContent = novoPfx && !inp.value ? 'Informe a senha deste certificado.' : ''; cst.className = 'cst'; st.pfxOk = null; st.cnpjRes = null; if (ccn) { ccn.textContent = ''; ccn.className = 'cst ccnpj'; } return; } cst.textContent = 'Conferindo…'; cst.className = 'cst'; const v = inp.value; let r; try { r = await conferirPfx(novoPfx, v); } catch (e) { r = { ok: null }; } if (inp.value !== v) return; st.pfxOk = r.ok; cnpjCert(k, r, st, ccn); const venc = r.ok && r.ate && r.ate < new Date(); cst.className = 'cst' + (venc ? ' venc' : r.ok ? ' ok' : r.ok === false ? ' bad' : ''); cst.textContent = r.ok ? (venc ? '⚠ Senha confere, mas o certificado está VENCIDO desde ' + r.ate.toLocaleDateString('pt-BR') + (r.cn ? ' · ' + r.cn : '') : '✓ Senha confere' + (r.cn ? ' · ' + r.cn : '') + (r.ate ? ' · válido até ' + r.ate.toLocaleDateString('pt-BR') : '')) : r.ok === false ? '✗ A senha não confere com este certificado.' : 'Não foi possível conferir agora.'; };
    inp.oninput = () => { st.senha = inp.value; clearTimeout(inp._t); inp._t = setTimeout(conf, 350); };
    conf();
  }
  function ligarAnexos(root, anx, aviso) {
    root.querySelectorAll('[data-anx]').forEach(b => desenharAnexo(b, anx));
    if (root._anxLigado) return; root._anxLigado = true;
    root.addEventListener('change', ev => {
      const inp = ev.target.closest('[data-anxin]'); if (!inp) return; const k = inp.dataset.anxin, st = anx[k]; let fs = [...inp.files]; inp.value = '';
      const grandes = fs.filter(f => f.size > 10485760); fs = fs.filter(f => f.size <= 10485760);
      const certs = fs.filter(f => ehPfx(f.name)); const msgs = grandes.length ? ['Arquivos acima de 10 MB não são aceitos: ' + grandes.map(f => f.name).join(', ') + '.'] : [];
      if (certs.length) { const novo = certs[certs.length - 1]; const tinha = st.salvos.some(a => ehPfx(a.nome)) || st.novos.some(f => ehPfx(f.name)); fs = fs.filter(f => !ehPfx(f.name) || f === novo); st.salvos = st.salvos.filter(a => !ehPfx(a.nome)); st.novos = st.novos.filter(f => !ehPfx(f.name)); if (tinha || certs.length > 1) msgs.push('Só um certificado digital por CNPJ: ficou o ' + novo.name + '.'); }
      st.novos = st.novos.concat(fs); if (aviso) aviso(msgs.join(' ')); desenharAnexo(inp.closest('[data-anx]'), anx);
    });
    root.addEventListener('click', ev => { const b = ev.target.closest('[data-anxrm]'); if (!b) return; const box = b.closest('[data-anx]'), st = anx[box.dataset.anx], i = +b.dataset.anxrm.slice(1); if (b.dataset.anxrm[0] === 's') st.salvos.splice(i, 1); else st.novos.splice(i, 1); desenharAnexo(box, anx); });
  }
  // Segmentos (botões de escolha) e campos condicionais
  function ligarCampos(root) {
    if (root._segLigado) return; root._segLigado = true;
    root.addEventListener('click', ev => { const b = ev.target.closest('[data-seg] > button'); if (!b) return; const g = b.parentElement; const ja = b.getAttribute('aria-pressed') === 'true'; g.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b && !(ja && g.dataset.limpa)))); g.classList.remove('erro'); sincronizar(root); g.dispatchEvent(new CustomEvent('pt-mudou', { bubbles: true })); });
    root.addEventListener('change', () => sincronizar(root));
    root.addEventListener('input', ev => { if (ev.target.classList) ev.target.classList.remove('erro', 'falta'); });
  }
  // Envia os anexos novos (mesmo formato dos anexos da Etapa 2), com o nome padrão F1_CNPJ_RAZÃO
  async function subirAnexos(F, db, pid, fila, aviso) {
    let n = 0;
    for (const u of fila) {
      n++; if (aviso) aviso(`Enviando anexo ${n} de ${fila.length}…`);
      const b64 = await new Promise((ok, err) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = err; r.readAsDataURL(u.f); });
      const ref = F.doc(F.collection(db, 'propostas', pid, 'anexos')), PART = 700000, partes = Math.max(1, Math.ceil(b64.length / PART));
      for (let i = 0; i < partes; i++) await F.setDoc(F.doc(db, 'propostas', pid, 'anexos', ref.id, 'partes', String(i).padStart(3, '0')), { d: b64.slice(i * PART, (i + 1) * PART) });
      const meta = { nome: u.nome, orig: u.f.name, tipo: u.f.type || 'application/octet-stream', tamanho: u.f.size, campo: u.campo, partes, etapa: u.etapa || 4, em: F.serverTimestamp() };
      await F.setDoc(ref, meta); u.lista.push({ id: ref.id, nome: u.nome, orig: u.f.name, tipo: meta.tipo, tamanho: u.f.size });
    }
  }
  const limpaNome = x => String(x || '').replace(/[\\/:*?"<>|]+/g, '-').trim();
  const nomePadrao = (orig, senha, ctx) => { const m = String(orig).match(/^(.*?)(\.[^.]+)?$/), ext = m[2] || '', pfx = /^\.(pfx|p12)$/i.test(ext); return [ctx.cod, dig(ctx.cnpj), ctx.razao, pfx ? (limpaNome(senha) ? '(' + senha + ')' : '') : m[1]].map(limpaNome).filter(Boolean).join('_') + ext; };

  window.PtCampos = { campoHtml, camposHtml, sincronizar, lerCampo, lerCampos, contar, ligarAnexos, ligarCampos, subirAnexos, nomePadrao, esc, fmtD, estilos };

  /* ---------- Campos do cabeçalho que substituem os antigos dos Parâmetros ---------- */
  // Campos que o cabeçalho fixo já cobre (tipo de start/base, datas, filiais) ficam fora das seções configuráveis
  const DUP = /tipo de start|modalidade|^\s*base\s*$|tipo de base|da[dt]a\s*(d[aoe]\s*)?(base|start)|in[ií]cio da implanta|nome do posto|nome da central|quantidade de filiais|^\s*inclus[aã]o|potencial/i;
  const ehDup = c => DUP.test(c.label || '') || !!String(c.filiaisOp || '').trim() || c.tipo === 'filiais' || (c.tipo === 'multicond' && Object.values(c.cond || {}).some(l => (l || []).some(x => x.tipo === 'filiais')));
  const secoesParam = cfg => ((cfg && cfg.secoes) || []).map(s => ({ ...s, campos: (s.campos || []).filter(c => c.show !== false && !ehDup(c)) })).filter(s => s.campos.length);

  // Monta o cabeçalho a partir dos dados antigos (antes do novo Pré TASK)
  function migrar(e4, task, p, v2) {
    const campos = Object.entries((e4 && e4.campos) || {}), val = (e4 && e4.valores) || {};
    const acha = re => (campos.find(([k, x]) => re.test(k) && x && !/\n/.test(x)) || [])[1] || '';
    const achaData = re => { for (const [k, x] of campos) if (re.test(k) && isoDe(x)) return isoDe(x); return ''; };
    const mod = acha(/tipo de start|modalidade/i), modal = /remot/i.test(mod) ? 'Remoto' : /presen|f[ií]sic/i.test(mod) ? 'Presencial' : '';
    const filAnt = [].concat(...Object.keys(val).filter(k => /__fil$/.test(k) && Array.isArray(val[k])).map(k => val[k]));
    const tc = task && task.central;
    let tipo = tc ? (tc.tipo === 'simples' ? 'Simples' : 'Central') : '';
    if (!tipo) { const b = campos.find(([, x]) => /^\s*(posto\s+)?simples\s*$/i.test(x) || /^\s*central\s*$/i.test(x)); if (b) tipo = /simples/i.test(b[1]) ? 'Simples' : 'Central'; else if (filAnt.length > 1) tipo = 'Central'; }
    const filiais = ((tc && tc.filiais && tc.filiais.length) ? tc.filiais : filAnt).map((f, i) => ({ cod: f.cod || 'F' + (i + 1), tipo: f.tipo || 'Posto', cnpj: fmtCnpj(f.cnpj), razao: f.razao || (f.info && f.info.razao) || '', cidade: f.cidade || (f.info && f.info.municipio) || '', uf: f.uf || (f.info && f.info.uf) || '', info: f.info || null, dados: f.dados || null }));
    if (!filiais.length) { const cn = (v2 && v2.cnpj) || p.cnpj; if (dig(cn).length === 14) filiais.push({ cod: 'F1', tipo: 'Posto', cnpj: fmtCnpj(cn), razao: (v2 && v2.razao) || '', cidade: (v2 && v2.cidade) || '', uf: (v2 && v2.uf) || '', info: null, dados: null }); }
    return {
      status: (task && task.status) || 'fut', dataBase: (task && task.dataBase) || achaData(/da[dt]a.*base|base.*da[dt]a/i), start: (task && task.start) || achaData(/start|in[ií]cio da implanta/i), modalidade: (task && task.modalidade) || modal,
      tipoBase: tipo, inclusao: '', centralExistente: '', potencial: '', nome: (tc && tc.nome) || acha(/nome da central|nome do posto/i) || (tipo === 'Simples' ? ((v2 && v2.fantasia) || p.cliente || '') : ''), f100: (tc && tc.f100) || '', filiais
    };
  }

  /* ---------- Diálogo ---------- */
  let C = null; // contexto aberto
  function dlg() {
    let d = document.getElementById('ptDlg'); if (d) return d;
    estilos();
    d = document.createElement('dialog'); d.id = 'ptDlg'; d.className = 'tkdlg ptdlg'; d.setAttribute('aria-labelledby', 'ptTit');
    d.innerHTML = `<div class="tkdlghead"><h3 id="ptTit">Pré TASK</h3><div class="pthead"><span class="hint" id="ptMsg" role="status"></span><button type="button" id="ptParcial" title="Guarda o que já foi preenchido, mesmo incompleto">Salvar parcial</button><button type="button" class="primary" id="ptSalvar">Salvar</button><button type="button" id="ptFechar" aria-label="Fechar">✕</button></div></div><div id="ptBody"></div>`;
    document.body.appendChild(d);
    d.querySelector('#ptFechar').addEventListener('click', () => d.close());
    d.querySelector('#ptSalvar').addEventListener('click', () => salvar(false));
    d.querySelector('#ptParcial').addEventListener('click', () => salvar(true));
    d.addEventListener('close', () => { C = null; });
    return d;
  }
  const msg = t => { const m = document.getElementById('ptMsg'); if (m) m.textContent = t || ''; };
  const ICO = t => (window.TK_ICONE ? window.TK_ICONE(t) : '');

  async function abrir(ctx) {
    const d = dlg(); C = { ...ctx, anx: {}, filAtiva: 0 };
    d.querySelector('#ptTit').textContent = 'Pré TASK';
    d.querySelector('#ptBody').innerHTML = '<p class="hint">Carregando…</p>'; msg('');
    d.querySelector('#ptSalvar').textContent = ctx.origem === 'proposta' ? 'Salvar e enviar ao TASK' : 'Salvar final';
    if (!d.open) d.showModal();
    const { F, db, pid } = ctx;
    const ler = async (...c) => { try { const r = await F.getDoc(F.doc(db, ...c)); return r.exists() ? r.data() : null; } catch (e) { return null; } };
    const json = x => { try { return x && x.json ? JSON.parse(x.json) : null; } catch (e) { return null; } };
    const [p, e4, e2, cfg4, pub2] = await Promise.all([ler('propostas', pid), ler('propostas', pid, 'etapa4', 'dados'), ler('propostas', pid, 'etapa2', 'resposta'), ler('config', 'etapa4'), ler('publico', 'etapa2')]);
    if (!C || C.pid !== pid) return;
    if (!p) { d.querySelector('#ptBody').innerHTML = '<p class="hint">Proposta não encontrada.</p>'; return; }
    let an = []; try { an = (await F.getDocs(F.collection(db, 'propostas', pid, 'anexos'))).docs.map(x => ({ id: x.id, ...x.data() })); } catch (e) {}
    let dono = null; if (p.owner) dono = await ler('usuarios', p.owner);
    // Centrais já cadastradas no TASK (para "Filial Nova em Central"); quem não lê o TASK digita o nome
    let centrais = []; try { centrais = [...new Set((await F.getDocs(F.collection(db, 'tasks'))).docs.map(x => x.data()).filter(t => !t.removido && t.central && t.central.tipo !== 'simples' && t.central.nome).map(t => t.central.nome.trim()))].sort((a, b) => a.localeCompare(b, 'pt-BR')); } catch (e) {}
    const task = ctx.task || null;
    const v2 = (e2 && e2.valores) || {};
    const pre = e4 && e4.pre ? copia(e4.pre) : migrar(e4, task, p, v2);
    if (task && task.status) pre.status = task.status; // o status do card é o que vale
    if (pre.tipoBase === 'Central' && !pre.nome) { const f = (v2.fantasia || p.cliente || '').trim(); if (f) pre.nome = /^central\b/i.test(f) ? f : 'Central ' + f; }
    Object.assign(C, { p, e4: e4 || {}, e2, cfg4: cfg4 && cfg4.json ? json(cfg4) : copia(window.ETAPA4_PADRAO || { secoes: [] }), cfg2: json(pub2) || window.ETAPA2_PADRAO || { secoes: [] }, an, dono, centrais, pre, v: copia((e4 && e4.valores) || {}), v2: copia(v2) });
    d.querySelector('#ptTit').textContent = 'Pré TASK · ' + (p.cliente || '');
    desenhar();
    if (e4 && e4.parcial) msg('Salvo parcial' + (e4.por ? ' por ' + e4.por : '') + (e4.em && e4.em.toDate ? ' em ' + e4.em.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '') + '. Complete os obrigatórios para o salvar final.');
  }

  /* ---------- Tela ---------- */
  const secs2 = () => (C.cfg2.secoes || []).map(s => ({ ...s, campos: (s.campos || []).filter(c => (c.show !== false || c.fixo) && c.tipo !== 'arquivo') })).filter(s => s.campos.length);
  const porFilial = s => C.pre.tipoBase === 'Central' && s.porFilial !== false && C.pre.filiais.length > 0;
  function marca(ok, tot) { return !tot ? '<span class="dgm ok" title="Sem obrigatórios">✓</span>' : ok >= tot ? '<span class="dgm ok" title="Completo">✓</span>' : ok ? '<span class="dgm parcial" title="Incompleto"></span>' : '<span class="dgm falta" title="Falta preencher"></span>'; }
  function marcadores() {
    const P = C.pre, sts = { status: [P.status, P.modalidade].filter(Boolean).length + '/2' };
    const nStatus = [P.status, P.modalidade, P.dataBase, P.start].filter(Boolean).length;
    const base = [P.tipoBase, P.inclusao, P.potencial, P.nome].filter(Boolean).length + (P.filiais.length && P.filiais.every(f => dig(f.cnpj).length === 14 && f.tipo) ? 1 : 0) + (P.tipoBase !== 'Central' || P.f100 ? 1 : 0);
    const m = { status: marca(nStatus, 4), base: marca(base, 6), proposta: marca(1, 1), contrato: marca(C.p.ctAceitoEm ? 1 : 0, 1) };
    let ok2 = 0, t2 = 0; secs2().forEach(s => { const r = contar(s.campos, '', C.v2); ok2 += r.ok; t2 += r.tot; }); m.e2 = marca(ok2, t2);
    secoesParam(C.cfg4).forEach((s, i) => { let ok = 0, tot = 0; const prefs = porFilial(s) ? C.pre.filiais.map((_, j) => 'f' + j + '__') : ['']; prefs.forEach(pf => { const r = contar(s.campos, pf, C.v); ok += r.ok; tot += r.tot; }); m['p' + i] = marca(ok, tot); });
    m.anexos = marca(1, 1);
    return m;
  }
  function desenhar() {
    const body = document.getElementById('ptBody'), M = marcadores(), ps = secoesParam(C.cfg4);
    const nav = (id, t, ic) => `<button type="button" class="dgnav" data-pt="${id}" aria-selected="false">${ICO(ic || t)}<span>${esc(t)}</span>${M[id] || ''}</button>`;
    const g = t => `<span class="ptnote" style="padding:10px 14px 2px;text-transform:uppercase;letter-spacing:.06em;font-size:10.5px;font-weight:600">${t}</span>`;
    body.innerHTML = `<div class="dgwrap" id="ptWrap">
      <nav class="dgmenu" aria-label="Seções do Pré TASK">${g('Validação')}${nav('status', 'Status e datas', 'status')}${nav('base', C.pre.tipoBase === 'Central' ? 'Central e filiais' : 'Base e posto', 'posto')}
        ${g('Dos passos anteriores')}${nav('proposta', 'Proposta', 'lista')}${nav('e2', 'Dados Primários', 'pessoas')}${nav('contrato', 'Contrato', 'lista')}
        ${ps.length ? g('Parâmetros Pré TASK') : ''}${ps.map((s, i) => nav('p' + i, s.titulo, s.titulo)).join('')}${nav('anexos', 'Anexos', 'anexo')}</nav>
      <div class="dgcorpo" id="ptCorpo">
        ${painelStatus()}${painelBase()}${painelProposta()}${painelE2()}${painelContrato()}${ps.map((s, i) => painelParam(s, i)).join('')}${painelAnexos()}
      </div></div>`;
    const corpo = document.getElementById('ptCorpo');
    ligarCampos(corpo); sincronizar(corpo); ligarAnexos(corpo, C.anx, msg);
    corpo.addEventListener('pt-mudou', ev => { cabecalhoMudou(ev); conferirFinal(); });
    corpo.addEventListener('input', () => conferirFinal()); corpo.addEventListener('change', () => conferirFinal());
    conferirFinal(true);
    body.querySelector('.dgmenu').addEventListener('click', ev => { const b = ev.target.closest('[data-pt]'); if (b) mostrar(b.dataset.pt); });
    mostrar(C.aba || 'status');
    ligarBase();
    destacarFaltas();
  }
  function mostrar(id) {
    C.aba = id;
    document.querySelectorAll('#ptWrap .dgnav').forEach(b => b.setAttribute('aria-selected', String(b.dataset.pt === id)));
    document.querySelectorAll('#ptCorpo > [data-ptp]').forEach(p => { p.hidden = p.dataset.ptp !== id; });
  }
  const painel = (id, titulo, sub, html) => `<section class="dgpainel ptpainel" data-ptp="${id}" hidden><h4>${esc(titulo)}${sub ? `<small>${sub}</small>` : ''}</h4>${html}</section>`;
  const seg = (k, ops, val, cls) => `<div class="ptseg ${cls || ''}" data-hk="${k}" data-seg="1">${ops.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<button type="button" data-v="${esc(v)}" aria-pressed="${val === v}">${esc(t)}</button>`; }).join('')}</div>`;
  function respCadastro() {
    const e4 = C.e4; if (e4 && e4.por) return `${esc(e4.por)}${e4.porEmail ? ' · ' + esc(e4.porEmail) : ''}<small>${e4.em ? 'salvou em ' + esc(fmtTs(e4.em)) : ''}</small>`;
    return `<small>Será ${esc(C.perfil.nome || C.perfil.email || 'você')} ao salvar</small>`;
  }
  function painelStatus() {
    const P = C.pre, p = C.p, email = (C.dono && C.dono.email) || p.vendedorEmail || '';
    return painel('status', 'Status e datas', 'o status é o mesmo do card no quadro do TASK', `<div class="ptsec"><h5>Status</h5><div class="ptgrid">
      <div class="ptf full"><span>Status</span>${seg('status', [['fut', 'FUTURO'], ['and', 'EM ANDAMENTO'], ['fin', 'FINALIZADO']], P.status, 'st')}</div>
      <label class="ptf"><span>Data da Base</span><input type="date" data-hk="dataBase" value="${esc(P.dataBase || '')}"></label>
      <label class="ptf"><span>Data do Start</span><input type="date" data-hk="start" value="${esc(P.start || '')}"></label>
      <div class="ptf"><span>Modalidade <b>*</b></span>${seg('modalidade', ['Presencial', 'Remoto'], P.modalidade)}</div>
      <div class="ptf"><span>Responsável pelo Cadastro</span><div class="ptro">${respCadastro()}</div></div>
      <div class="ptf"><span>Responsável pela Proposta</span><div class="ptro">${esc(p.vendedor || (C.dono && C.dono.nome) || '')}${email ? ' · ' + esc(email) : ''}<small>elaborou e enviou a proposta</small></div></div>
    </div></div>`);
  }
  function linhaFil(f, i, central) {
    const on = central && C.pre.f100 === f.cod;
    return `<tr data-fi="${i}" class="${on ? 'f100' : ''}"><td class="cod"><input data-ff="cod" value="${esc(f.cod)}" aria-label="Código da filial ${i + 1}"></td>
      <td class="tp"><select data-ff="tipo" aria-label="Posto ou Loja"><option value="">Escolha</option>${['Posto', 'Loja'].map(o => `<option${f.tipo === o ? ' selected' : ''}>${o}</option>`).join('')}</select></td>
      <td class="cn"><input data-ff="cnpj" inputmode="numeric" placeholder="00.000.000/0000-00" value="${esc(f.cnpj)}" aria-label="CNPJ"></td>
      <td><input data-ff="razao" placeholder="Vem da consulta do CNPJ" value="${esc(f.razao)}" aria-label="Razão social"></td>
      <td><input data-ff="cidade" placeholder="Cidade - UF" value="${esc([f.cidade, f.uf].filter(Boolean).join(' - '))}" aria-label="Cidade"></td>
      ${central ? `<td class="f1"><input type="radio" name="ptf100" data-ff="f100" ${on ? 'checked' : ''} aria-label="Esta é a F100">${on ? '<span class="tag100">F100</span>' : ''}</td>` : ''}</tr>`;
  }
  function painelBase() {
    const P = C.pre, central = P.tipoBase === 'Central', simples = P.tipoBase === 'Simples';
    const f100 = central && P.f100 ? P.filiais.find(f => f.cod === P.f100) : null;
    const tabela = (P.tipoBase ? `<div class="ptscroll"><table class="ptfil"><thead><tr><th>Filial</th><th>Tipo</th><th>CNPJ</th><th>Razão social</th><th>Cidade</th>${central ? '<th>F100</th>' : ''}</tr></thead><tbody>${P.filiais.map((f, i) => linhaFil(f, i, central)).join('')}</tbody></table></div>` : '');
    return painel('base', central ? 'Central e filiais' : 'Base e posto', '', `<div class="ptsec"><h5>Base</h5><div class="ptgrid">
      <div class="ptf"><span>Tipo de Base <b>*</b></span>${seg('tipoBase', ['Simples', 'Central'], P.tipoBase)}</div>
      <div class="ptf"><span>Inclusão <b>*</b></span>${seg('inclusao', ['Base Nova', 'Filial Nova em Central'], P.inclusao)}</div>
      <div class="ptf"><span>Cliente Potencial + de 5 Unidades <b>*</b></span>${seg('potencial', ['Sim', 'Não'], P.potencial)}</div>
      ${P.inclusao === 'Filial Nova em Central' ? `<label class="ptf"><span>Central que recebe a filial <b>*</b></span>${C.centrais.length ? `<select data-hk="centralExistente"><option value="">Escolha a Central</option>${C.centrais.map(n => `<option${n === P.centralExistente ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : `<input data-hk="centralExistente" value="${esc(P.centralExistente || '')}" placeholder="Nome da Central já existente">`}</label>` : ''}
    </div></div>
    ${central || simples ? `<div class="ptsec"><h5>${central ? 'Central' : 'Posto simples'}${f100 ? `<small>F100 = ${esc(f100.cod)}${f100.cidade ? ' · ' + esc(f100.cidade) : ''}</small>` : ''}</h5><div class="ptgrid">
      <label class="ptf"><span>${central ? 'Nome da Central' : 'Nome do Posto'} <b>*</b></span><input data-hk="nome" value="${esc(P.nome || '')}"></label>
      ${central ? `<label class="ptf"><span>Quantidade de Filiais <b>*</b></span><input type="number" min="1" max="60" data-hk="qtd" value="${P.filiais.length || ''}"></label>` : ''}
      <div class="ptf full"><span>${central ? 'Filiais' : 'Unidade'}</span>${tabela}
        <p class="ptnote">${central ? 'A razão social e a cidade vêm da consulta do CNPJ e podem ser corrigidas. Marque qual filial é a F100: ela aparece no topo e no card do TASK.' : 'A razão social e a cidade vêm da consulta do CNPJ e podem ser corrigidas.'}</p></div>
    </div></div>` : '<p class="ptnote">Escolha o Tipo de Base para informar o posto ou as filiais.</p>'}`);
  }
  function painelProposta() {
    const p = C.p, l = (t, v) => v ? `<div class="ptf"><span>${t}</span><div class="ptro">${v}</div></div>` : '';
    return painel('proposta', 'Proposta', 'valores da proposta só para leitura', `<div class="ptsec"><h5>Proposta nº ${esc(p.numero || '')}</h5><div class="ptgrid">
      ${l('Cliente', esc(p.cliente))}${l('CNPJ', esc(fmtCnpj(p.cnpj)))}${l('Cidade', esc(p.cidade))}${l('Contato', esc(p.contato))}${l('Telefone', esc(p.fone))}${l('Vendedor', esc(p.vendedor))}
      ${l('Licenças', brl(p.totLic))}${l('Mensalidade', brl(p.totMen))}${l('Deslocamento', brl(p.totDes))}
      ${l('Aprovada por', p.aprovadoNome ? esc(p.aprovadoNome) + (p.aprovadoCargo ? ' (' + esc(p.aprovadoCargo) + ')' : '') + `<small>${esc(fmtTs(p.aprovadoEm))}</small>` : '')}
      <div class="ptbtns full"><button type="button" data-pta="pdf">Ver proposta (PDF)</button></div></div></div>`);
  }
  function painelE2() {
    const e2 = C.e2;
    if (!e2) return painel('e2', 'Dados Primários', '', '<p class="ptnote">O cliente ainda não enviou os Dados Primários.</p>');
    const hist = (e2.alteracoes || []).slice(-5).reverse().map(a => `<div>${esc(a.por)} alterou ${esc((a.campos || []).join(', '))} em ${esc(new Date(a.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))}</div>`).join('');
    return painel('e2', 'Dados Primários', `preenchido pelo cliente${e2.em ? ' em ' + esc(fmtTs(e2.em)) : ''} · editável`, secs2().map(s => `<div class="ptsec"><h5>${esc(s.titulo)}</h5><div class="ptgrid" data-e2>${camposHtml(s.campos, 'e2:', prefixar(C.v2, 'e2:'), C.anx)}</div></div>`).join('') + (hist ? `<div class="pthist">${hist}</div>` : '<p class="ptnote">Alterar um dado aqui corrige o dado original e registra quem alterou.</p>'));
  }
  const prefixar = (o, pre) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [pre + k, v]));
  function painelContrato() {
    const p = C.p, l = (t, v) => `<div class="ptf"><span>${t}</span><div class="ptro">${v || '<small>—</small>'}</div></div>`;
    return painel('contrato', 'Contrato', 'contrato aceito fica só para leitura', `<div class="ptsec"><h5>Aceite do contrato</h5><div class="ptgrid">
      ${l('Aceito por', esc(p.ctAceitoNome))}${l('CPF', esc(p.ctAceitoCpf))}${l('Cargo', esc(p.ctAceitoCargo))}${l('Data do aceite', esc(fmtTs(p.ctAceitoEm)))}
      ${C.verContrato && p.ctEm ? '<div class="ptbtns full"><button type="button" data-pta="contrato">Ver contrato (PDF)</button></div>' : ''}</div></div>`);
  }
  function painelParam(s, i) {
    const fils = C.pre.filiais;
    if (!porFilial(s)) return painel('p' + i, s.titulo, 'Parâmetros Pré TASK', `<div class="ptsec"><h5>${esc(s.titulo)}</h5><div class="ptgrid">${camposHtml(s.campos, '', C.v, C.anx)}</div></div>`);
    const at = Math.min(C.filAtiva, fils.length - 1);
    return painel('p' + i, s.titulo, 'preenchido filial por filial', `<div class="pttabs" role="tablist">${fils.map((f, j) => `<button type="button" role="tab" data-ptfi="${j}" aria-selected="${j === at}">${esc([f.cod, f.tipo].filter(Boolean).join(' - '))}</button>`).join('')}</div>` +
      fils.map((f, j) => `<div class="ptsec" data-ptfp="${j}"${j === at ? '' : ' hidden'}><h5>${esc(s.titulo)}<small>${esc([f.cod, f.razao].filter(Boolean).join(' · '))}</small></h5><div class="ptgrid">${j ? `<div class="ptbtns full"><button type="button" data-ptcopia="${j}" data-sec="${i}">Copiar dados da ${esc(fils[0].cod)}</button></div>` : ''}${camposHtml(s.campos, 'f' + j + '__', C.v, C.anx)}</div></div>`).join(''));
  }
  function painelAnexos() {
    const an = C.an;
    return painel('anexos', 'Anexos', 'todos os arquivos recebidos nesta proposta', an.length ? `<div class="ptanx"><div class="lista">${an.map(a => `<button type="button" class="it" data-ptanexo="${esc(a.id)}" data-nome="${esc(a.nome)}">⬇ ${esc(a.nome)} <small>${esc(a.campo || '')} · ${Math.max(1, Math.round((a.tamanho || 0) / 1024))} KB</small></button>`).join('')}</div></div>` : '<p class="ptnote">Nenhum anexo.</p>');
  }
  // Campos que faltam ficam destacados em amarelo
  function destacarFaltas() {
    const corpo = document.getElementById('ptCorpo'); if (!corpo) return;
    corpo.querySelectorAll('[data-hk="dataBase"],[data-hk="start"]').forEach(i => i.classList.toggle('falta', !i.value));
  }

  /* ---------- Cabeçalho, base e filiais ---------- */
  function colherCabecalho() {
    const corpo = document.getElementById('ptCorpo'); if (!corpo) return;
    const P = C.pre;
    corpo.querySelectorAll('[data-hk]').forEach(el => { const k = el.dataset.hk; if (k === 'qtd') return; P[k] = el.dataset.seg ? (el.querySelector('[aria-pressed=true]')?.dataset.v || '') : el.value.trim(); });
    corpo.querySelectorAll('.ptfil tbody tr').forEach(tr => { const f = P.filiais[+tr.dataset.fi]; if (!f) return; const g = k => tr.querySelector(`[data-ff="${k}"]`); f.cod = g('cod').value.trim() || ('F' + (+tr.dataset.fi + 1)); f.tipo = g('tipo').value; f.cnpj = g('cnpj').value.trim(); f.razao = g('razao').value.trim(); const cu = g('cidade').value.trim().match(/^(.*?)(?:\s*[-\/]\s*([A-Za-z]{2}))?$/); f.cidade = (cu && cu[1] || '').trim(); f.uf = (cu && cu[2] || '').toUpperCase(); if (g('f100') && g('f100').checked) P.f100 = f.cod; });
  }
  // Guarda o que já foi digitado nos campos dos parâmetros e dos dados primários antes de redesenhar
  function colherCampos() {
    const corpo = document.getElementById('ptCorpo'); if (!corpo) return;
    corpo.querySelectorAll('[data-pk]').forEach(el => { const k = el.dataset.pk; const alvo = k.startsWith('e2:') ? C.v2 : C.v, kk = k.startsWith('e2:') ? k.slice(3) : k; let v = el.dataset.seg ? (el.querySelector('[aria-pressed=true]')?.dataset.v || '') : el.value; const o = corpo.querySelector(`[data-outro="${CSS.escape(k)}"]`); if (o && !o.hidden && o.value.trim()) v += ': ' + o.value.trim(); alvo[kk] = v; });
  }
  function nomeSugerido(tipo) { const f = ((C.v2 && C.v2.fantasia) || C.p.cliente || '').trim(); return !f || !tipo ? '' : tipo === 'Central' ? (/^central\b/i.test(f) ? f : 'Central ' + f) : f; }
  function redesenhar() { setTimeout(() => { if (!C) return; colherCabecalho(); colherCampos(); desenhar(); }, 0); }
  function cabecalhoMudou(ev) {
    const g = ev.target.closest('[data-hk]'); if (!g) return;
    const k = g.dataset.hk, antes = C.pre[k]; colherCabecalho();
    if (k === 'tipoBase' && C.pre.tipoBase !== antes) {
      // Nome sugerido: Simples = nome fantasia; Central = "Central " + nome fantasia (troca só se ainda for a sugestão do outro tipo)
      const sugAntes = nomeSugerido(antes); if (!C.pre.nome || C.pre.nome === sugAntes) { C.pre.nome = nomeSugerido(C.pre.tipoBase); const ni = document.querySelector('#ptCorpo [data-hk="nome"]'); if (ni) ni.value = C.pre.nome; }
      if (C.pre.tipoBase === 'Simples') { C.pre.filiais = C.pre.filiais.slice(0, 1); C.pre.f100 = ''; if (!C.pre.filiais.length) C.pre.filiais.push({ cod: 'F1', tipo: 'Posto', cnpj: fmtCnpj(C.v2.cnpj || C.p.cnpj), razao: C.v2.razao || '', cidade: C.v2.cidade || '', uf: C.v2.uf || '' }); }
      if (C.pre.tipoBase === 'Central' && !C.pre.filiais.length) C.pre.filiais.push({ cod: 'F1', tipo: 'Posto', cnpj: '', razao: '', cidade: '', uf: '' });
      redesenhar(); return;
    }
    if (k === 'inclusao' && C.pre.inclusao !== antes) { redesenhar(); return; }
  }
  function ligarBase() {
    const corpo = document.getElementById('ptCorpo');
    const q = corpo.querySelector('[data-hk="qtd"]');
    if (q) q.addEventListener('change', () => setTimeout(() => { if (!C) return; colherCabecalho(); const n = Math.min(60, Math.max(1, parseInt(q.value, 10) || 1)); const L = C.pre.filiais; while (L.length < n) L.push({ cod: 'F' + (L.length + 1), tipo: 'Posto', cnpj: '', razao: '', cidade: '', uf: '' }); L.length = n; if (!L.some(f => f.cod === C.pre.f100)) C.pre.f100 = ''; colherCampos(); desenhar(); mostrar('base'); }, 0));
    corpo.querySelectorAll('[data-hk="dataBase"],[data-hk="start"]').forEach(i => i.addEventListener('change', destacarFaltas));
    corpo.querySelectorAll('.ptfil tbody tr').forEach(tr => {
      const c = tr.querySelector('[data-ff="cnpj"]');
      c.addEventListener('input', () => { const d = dig(c.value).slice(0, 14); c.value = d.length === 14 ? fmtCnpj(d) : d; c.classList.remove('erro'); if (d.length === 14) buscarFil(tr, d); });
      tr.querySelector('[data-ff="razao"]').addEventListener('input', e => { delete e.target.dataset.auto; });
      const r = tr.querySelector('[data-ff="f100"]'); if (r) r.addEventListener('change', () => setTimeout(() => { if (!C) return; colherCabecalho(); colherCampos(); desenhar(); mostrar('base'); }, 0));
      const d = dig(c.value); const f = C.pre.filiais[+tr.dataset.fi]; if (d.length === 14 && f && !f.info) buscarFil(tr, d, true);
    });
    corpo.addEventListener('click', ev => {
      const t = ev.target.closest('[data-ptfi]'); if (t) { C.filAtiva = +t.dataset.ptfi; const p = t.closest('[data-ptp]'); p.querySelectorAll('[data-ptfi]').forEach(b => b.setAttribute('aria-selected', String(b === t))); p.querySelectorAll('[data-ptfp]').forEach(x => { x.hidden = x.dataset.ptfp !== t.dataset.ptfi; }); return; }
      const cp = ev.target.closest('[data-ptcopia]'); if (cp) { colherCampos(); const j = cp.dataset.ptcopia, s = secoesParam(C.cfg4)[+cp.dataset.sec]; const ks = []; s.campos.forEach(c => { ks.push(c.k, c.k + '__det'); Object.values(c.cond || {}).forEach(l => (l || []).forEach(x => ks.push(x.k))); }); ks.forEach(k => { if (C.v['f0__' + k] !== undefined && !Array.isArray(C.v['f0__' + k])) C.v['f' + j + '__' + k] = C.v['f0__' + k]; }); colherCabecalho(); desenhar(); mostrar(C.aba); msg('Dados copiados. Confira e salve.'); return; }
      const a = ev.target.closest('[data-pta]'); if (a) { if (a.dataset.pta === 'pdf') return verPdf(a); if (a.dataset.pta === 'contrato' && C.verContrato) return C.verContrato(C.pid, a); }
      const ax = ev.target.closest('[data-ptanexo]'); if (ax) return baixar(ax);
    });
  }
  // Razão social e cidade da filial pela consulta do CNPJ
  async function buscarFil(tr, d, silencioso) {
    const i = +tr.dataset.fi, r = tr.querySelector('[data-ff="razao"]'), cid = tr.querySelector('[data-ff="cidade"]');
    if (tr.dataset.busca === d) return; tr.dataset.busca = d; if (!silencioso) r.placeholder = 'Buscando…';
    const info = window.cnpjInfo ? await window.cnpjInfo(d) : null;
    if (!C || dig(tr.querySelector('[data-ff="cnpj"]').value) !== d) return;
    const f = C.pre.filiais[i]; if (f) f.info = info;
    r.placeholder = info ? 'Razão social' : 'Não encontrada, digite';
    if (info && info.razao && (!r.value.trim() || r.dataset.auto === '1')) { r.value = info.razao; r.dataset.auto = '1'; }
    if (info && info.municipio && !cid.value.trim()) cid.value = [info.municipio, info.uf].filter(Boolean).join(' - ');
  }
  async function verPdf(bt) {
    const janela = window.open('', '_blank'); const txt = bt.textContent; bt.disabled = true; bt.textContent = 'Abrindo…';
    try {
      const s = await C.F.getDoc(C.F.doc(C.db, 'propostas', C.pid, 'arquivo', 'pdf')); if (!s.exists()) throw new Error('PDF não encontrado');
      const bin = atob(s.data().b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' })); if (janela && !janela.closed) janela.location.href = url; else window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (e) { if (janela) janela.close(); msg('Não foi possível abrir a proposta (' + (e.code || e.message) + ').'); }
    finally { bt.disabled = false; bt.textContent = txt; }
  }
  async function baixar(bt) {
    bt.disabled = true;
    try {
      const { F, db, pid } = C, aid = bt.dataset.ptanexo, meta = (await F.getDoc(F.doc(db, 'propostas', pid, 'anexos', aid))).data();
      const ps = await F.getDocs(F.collection(db, 'propostas', pid, 'anexos', aid, 'partes'));
      const b64 = ps.docs.sort((x, y) => x.id.localeCompare(y.id)).map(x => x.data().d).join(''), bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([u8], { type: meta.tipo || 'application/octet-stream' })), l = document.createElement('a'); l.href = url; l.download = bt.dataset.nome || meta.nome || 'anexo'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { msg('Não foi possível baixar (' + (e.code || e.message) + ').'); }
    finally { bt.disabled = false; }
  }

  /* ---------- Salvar ---------- */
  // Confere tudo o que é obrigatório. marcar=false: só conta (para habilitar o botão do salvar final)
  function validar(marcar) {
    const corpo = document.getElementById('ptCorpo');
    colherCabecalho(); colherCampos();
    SILENCIO = !marcar;
    try {
    const P = C.pre, central = P.tipoBase === 'Central';
    // 1) Cabeçalho, base e filiais
    const faltas = [];
    const segErro = k => { const s = corpo.querySelector(`[data-hk="${k}"]`); if (s && marcar) s.classList.add('erro'); };
    if (!P.modalidade) { faltas.push(['status', 'Modalidade']); segErro('modalidade'); }
    ['tipoBase', 'inclusao', 'potencial'].forEach(k => { if (!P[k]) { faltas.push(['base', { tipoBase: 'Tipo de Base', inclusao: 'Inclusão', potencial: 'Cliente Potencial' }[k]]); segErro(k); } });
    if (P.inclusao === 'Filial Nova em Central' && !P.centralExistente) { faltas.push(['base', 'Central que recebe a filial']); segErro('centralExistente'); }
    if (P.tipoBase) {
      if (!P.nome) { faltas.push(['base', central ? 'Nome da Central' : 'Nome do Posto']); segErro('nome'); }
      corpo.querySelectorAll('.ptfil tbody tr').forEach(tr => { const f = P.filiais[+tr.dataset.fi]; if (dig(f.cnpj).length !== 14) { if (marcar) tr.querySelector('[data-ff="cnpj"]').classList.add('erro'); faltas.push(['base', 'CNPJ da ' + f.cod]); } if (!f.tipo) { if (marcar) tr.querySelector('[data-ff="tipo"]').classList.add('erro'); faltas.push(['base', 'Tipo da ' + f.cod]); } });
      if (central && !P.f100) faltas.push(['base', 'qual filial é a F100']);
      const cods = P.filiais.map(f => f.cod); if (new Set(cods).size !== cods.length) faltas.push(['base', 'códigos de filial repetidos']);
    }
    // 2) Dados primários (só o que mudou é gravado)
    const e2Lido = { valores: {}, legiveis: {} }; let faltaE2 = null;
    if (C.e2) secs2().forEach(s => { const r = lerCampos(corpo, s.campos, 'e2:', C.anx); Object.assign(e2Lido.valores, r.valores); Object.assign(e2Lido.legiveis, r.legiveis); faltaE2 = faltaE2 || r.falta; });
    if (faltaE2) faltas.push(['e2', 'campos obrigatórios dos Dados Primários']);
    // 3) Parâmetros Pré TASK (por filial quando for Central)
    const valores = {}, campos = {}, fila = []; let faltaP = null, abaP = null;
    const ps = secoesParam(C.cfg4), dadosFil = P.filiais.map(() => ({}));
    const filCtx = j => j == null ? { cod: '', cnpj: P.filiais[0] ? P.filiais[0].cnpj : (C.p.cnpj || ''), razao: (P.filiais[0] && P.filiais[0].razao) || C.p.cliente || '' } : { cod: P.filiais[j].cod, cnpj: P.filiais[j].cnpj, razao: P.filiais[j].razao };
    ps.forEach((s, i) => {
      const prefs = porFilial(s) ? P.filiais.map((_, j) => j) : [null];
      prefs.forEach(j => {
        const pref = j == null ? '' : 'f' + j + '__', cod = j == null ? '' : P.filiais[j].cod;
        const r = lerCampos(corpo, s.campos, pref, C.anx, cod ? l => cod + ' - ' + l : null);
        if (r.falta && !faltaP) { faltaP = r.falta; abaP = { aba: 'p' + i, fi: j }; }
        Object.assign(valores, r.valores); Object.assign(campos, r.legiveis);
        if (j != null) Object.entries(r.legiveis).forEach(([k, x]) => { dadosFil[j][k.replace(cod + ' - ', '')] = x; });
        // anexos novos com o nome padrão
        s.campos.forEach(c => { if (c.tipo !== 'anexo') return; const key = pref + c.k, st = C.anx[key]; if (!st) return; const senha = String(st.senha || '').trim(); st.salvos = st.salvos.map(a => ({ ...a, orig: a.orig || a.nome, nome: nomePadrao(a.orig || a.nome, senha, filCtx(j)) })); valores[key] = st.salvos; st.novos.forEach(f => fila.push({ f, lista: st.salvos, campo: (cod ? cod + ' - ' : '') + c.label, nome: nomePadrao(f.name, senha, filCtx(j)) })); if (st.novos.some(f => ehPfx(f.name)) && st.pfxOk === false) faltas.push(['p' + i, 'senha do certificado não confere']); if (st.novos.some(f => ehPfx(f.name)) && st.cnpjRes === 'dif') faltas.push(['p' + i, 'CNPJ do certificado diferente da ' + (cod || 'filial')]); });
      });
    });
    if (faltaP) faltas.push([abaP.aba, 'campos obrigatórios em ' + ps[+abaP.aba.slice(1)].titulo]);
    return { P, central, faltas, e2Lido, valores, campos, fila, ps, dadosFil, abaP };
    } finally { SILENCIO = false; }
  }
  const faltaTxt = faltas => 'Falta: ' + [...new Set(faltas.map(x => x[1]))].slice(0, 4).join(', ') + (faltas.length > 4 ? '…' : '.');
  // Botão do salvar final: só fica liberado com todos os obrigatórios preenchidos
  let _conf = null;
  function conferirFinal(ja) {
    clearTimeout(_conf);
    _conf = setTimeout(() => {
      const bt = document.getElementById('ptSalvar'); if (!C || !C.p || !bt || !document.getElementById('ptCorpo')) return;
      let f = []; try { f = validar(false).faltas; } catch (e) { return; }
      bt.classList.toggle('incompleto', f.length > 0); bt.setAttribute('aria-disabled', String(f.length > 0));
      bt.title = f.length ? faltaTxt(f) + ' Use "Salvar parcial" para guardar o que já foi preenchido.' : '';
    }, ja ? 0 : 350);
  }
  async function salvar(parcial) {
    if (!C || !C.p) return;
    const bt = document.getElementById(parcial ? 'ptParcial' : 'ptSalvar');
    const { P, central, faltas, e2Lido, valores, campos, fila, ps, dadosFil, abaP } = validar(!parcial);
    if (!parcial && faltas.length) {
      const [aba] = faltas[0]; mostrar(aba);
      if (abaP && aba === abaP.aba && abaP.fi != null) document.querySelector(`#ptCorpo [data-ptp="${aba}"] [data-ptfi="${abaP.fi}"]`)?.click();
      msg(faltaTxt(faltas) + ' Para guardar assim mesmo, use "Salvar parcial".'); return;
    }
    if (parcial && faltas.some(x => /senha do certificado/.test(x[1]))) { msg('A senha do certificado não confere. Corrija ou remova o certificado para salvar.'); return; }
    bt.disabled = true; msg(parcial ? 'Salvando parcial…' : 'Salvando…');
    try {
      const { F, db, pid, perfil } = C;
      await subirAnexos(F, db, pid, fila, msg);
      Object.values(C.anx).forEach(st => { st.novos = []; });
      const por = perfil.nome || perfil.email, filiais = P.filiais.map((f, j) => ({ cod: f.cod, tipo: f.tipo, cnpj: fmtCnpj(f.cnpj), razao: f.razao, cidade: f.cidade, uf: f.uf, info: f.info && dig(f.info.cnpj) === dig(f.cnpj) ? f.info : (f.info && !f.info.cnpj ? f.info : null), dados: Object.keys(dadosFil[j]).length ? dadosFil[j] : (f.dados || null), f100: central && f.cod === P.f100 }));
      const pre = { parcial: !!parcial, status: P.status || 'fut', dataBase: P.dataBase || '', start: P.start || '', modalidade: P.modalidade, tipoBase: P.tipoBase, inclusao: P.inclusao, centralExistente: P.inclusao === 'Filial Nova em Central' ? P.centralExistente : '', potencial: P.potencial, nome: P.nome, f100: central ? P.f100 : '', filiais };
      // Campos legíveis do cabeçalho (o TASK e a mensagem usam este texto)
      const cab = { 'Status': STATUS[pre.status], 'Data da Base': fmtD(pre.dataBase), 'Data do Start': fmtD(pre.start), 'Modalidade': pre.modalidade, 'Tipo de Base': pre.tipoBase, 'Inclusão': pre.inclusao, 'Central que recebe a filial': pre.centralExistente, 'Cliente Potencial + de 5 Unidades': pre.potencial };
      cab[central ? 'Nome da Central' : 'Nome do Posto'] = pre.nome; if (central) { cab['Quantidade de Filiais'] = String(filiais.length); cab['F100'] = pre.f100; }
      cab[central ? 'Filiais' : 'Unidade'] = filiais.map(f => [f.cod, f.tipo, f.cnpj, f.razao, [f.cidade, f.uf].filter(Boolean).join(' - ')].filter(Boolean).join(' - ') + (f.f100 ? ' (F100)' : '')).join('\n');
      Object.keys(cab).forEach(k => { if (!cab[k]) delete cab[k]; });
      valores.base__fil = filiais;
      const secoes = [{ titulo: 'Status', labels: ['Status', 'Data da Base', 'Data do Start', 'Modalidade'] }, { titulo: central ? 'Central' : 'Base', labels: ['Tipo de Base', 'Inclusão', 'Central que recebe a filial', 'Cliente Potencial + de 5 Unidades', 'Nome da Central', 'Nome do Posto', 'Quantidade de Filiais', 'F100', 'Filiais', 'Unidade'] }]
        .concat(ps.map(s => ({ titulo: s.titulo, labels: s.campos.flatMap(c => [c.label, ...Object.values(c.cond || {}).flatMap(l => (l || []).map(x => x.label))]) })));
      const doc = { pre, parcial: !!parcial, valores, campos: { ...cab, ...campos }, secoes, em: F.serverTimestamp(), por, porUid: perfil.uid, porEmail: perfil.email || '' };
      await F.setDoc(F.doc(db, 'propostas', pid, 'etapa4', 'dados'), doc);
      // Dados primários alterados: corrige o original e registra quem alterou
      if (C.e2) {
        const antes = C.e2.valores || {}, mud = []; const novosV = { ...antes };
        secs2().forEach(s => s.campos.forEach(c => { const k = 'e2:' + c.k, nv = e2Lido.valores[k] || ''; if (String(antes[c.k] || '') !== String(nv)) { mud.push(c.label); if (nv) novosV[c.k] = nv; else delete novosV[c.k]; } const dk = c.k + '__det'; if (e2Lido.valores['e2:' + dk] !== undefined && antes[dk] !== e2Lido.valores['e2:' + dk]) novosV[dk] = e2Lido.valores['e2:' + dk]; }));
        if (mud.length) {
          const camposE2 = { ...(C.e2.campos || {}) }; secs2().forEach(s => s.campos.forEach(c => { if (!mud.includes(c.label)) return; const nv = e2Lido.legiveis[c.label]; if (nv) camposE2[c.label] = nv; else delete camposE2[c.label]; }));
          const alteracoes = (C.e2.alteracoes || []).concat([{ por, em: new Date().toISOString(), campos: mud }]).slice(-50);
          await F.updateDoc(F.doc(db, 'propostas', pid, 'etapa2', 'resposta'), { valores: novosV, campos: camposE2, alteracoes });
          C.e2 = { ...C.e2, valores: novosV, campos: camposE2, alteracoes };
        }
      }
      // Proposta: marca o passo 4 (o vendedor e o ADM podem; a equipe do TASK não altera a proposta)
      // Salvar parcial não conclui o passo nem mexe no card: fica como rascunho até o salvar final
      if (!parcial) try { await F.updateDoc(F.doc(db, 'propostas', pid), { e4Em: F.serverTimestamp(), e4Por: por, e4PorUid: perfil.uid }); } catch (e) {}
      // Card do TASK: status, datas, modalidade, central e responsável pelo cadastro
      let taskOk = false;
      if (!parcial && (C.task || C.podeTask)) {
        try {
          const tid = (C.task && C.task.id) || pid, fin = pre.status === 'fin';
          const up = { status: pre.status, finalizado: fin, dataBase: pre.dataBase, start: pre.start, modalidade: pre.modalidade, central: centralDoPre(pre), respCadastro: { uid: perfil.uid, nome: por, email: perfil.email || '' }, preSync: Date.now(), alteradoEm: F.serverTimestamp(), alteradoPor: por };
          if (C.task && fin !== !!C.task.finalizado) up.finalizadoEm = fin ? F.serverTimestamp() : null;
          const ref = F.doc(db, 'tasks', tid), ex = await F.getDoc(ref);
          if (ex.exists() && !ex.data().removido) { await F.updateDoc(ref, up); taskOk = true; }
        } catch (e) { console.warn('Pré TASK: card do TASK', e); }
      }
      C.e4 = { ...doc, em: { toDate: () => new Date() } };
      msg(parcial ? 'Salvo parcial. Quando tudo estiver preenchido, use o salvar final.' : 'Pré TASK salvo' + (taskOk ? ' e card do TASK atualizado.' : '.'));
      if (C.aoSalvar && !parcial) C.aoSalvar(pre);
      colherCampos(); desenhar();
    } catch (err) { msg('Não foi possível salvar (' + (err.code || err.message) + ').'); }
    finally { bt.disabled = false; }
  }
  // Central no formato do card do TASK
  function centralDoPre(pre) {
    if (!pre || !pre.tipoBase) return null;
    return { tipo: pre.tipoBase === 'Simples' ? 'simples' : 'central', nome: pre.nome || '', f100: pre.f100 || '', inclusao: pre.inclusao || '', centralExistente: pre.centralExistente || '', potencial: pre.potencial || '', filiais: (pre.filiais || []).map(f => ({ cod: f.cod, tipo: f.tipo, cnpj: f.cnpj, razao: f.razao || '', cidade: f.cidade || '', uf: f.uf || '', info: f.info || null, dados: f.dados || null, f100: !!f.f100 })) };
  }

  window.PreTask = { abrir, centralDoPre, migrar, STATUS };
})();

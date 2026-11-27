// Pré TASK: tela de validação final de tudo o que foi lançado nos passos anteriores.
// Abre no Passo 4 da proposta (vendedor) e no card do TASK (equipe), sempre a mesma tela.
// Dados: propostas/{id}/etapa4/dados.pre (cabeçalho, base e filiais) + valores/campos (Parâmetros Pré TASK).
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dig = v => String(v || '').replace(/\D/g, '');
  const fmtCnpj = v => { const d = dig(v); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : (v || ''); };
  const nomePosto = raz => (raz = String(raz || '').trim()) ? 'Posto - ' + raz : ''; // sugestão do Nome do Posto (Posto simples)
  const fmtD = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || ''); };
  const isoDe = v => { v = String(v || ''); let m = v.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`; m = v.match(/^\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\s*$/); if (!m) return ''; const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
  const fmtTs = ts => ts && ts.toDate ? ts.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
  const brl = n => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const STATUS = { fut: 'FUTURO', and: 'EM ANDAMENTO', fin: 'FINALIZADO' };
  const copia = o => JSON.parse(JSON.stringify(o));
  // Onde ficam os anexos: na proposta (propostas/{id}) ou, no cadastro direto do TASK, no próprio card (tasks/{id})
  const raiz = x => Array.isArray(x) ? x : ['propostas', x];
  const raizC = () => C.direto ? ['tasks', C.tid] : ['propostas', C.pid];

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
.ptseg button[aria-pressed=true]{background:var(--accent);color:var(--accent-fg);font-weight:600}
.ptseg.st button[data-v=fut][aria-pressed=true]{background:#2b6cb0}.ptseg.st button[data-v=and][aria-pressed=true]{background:#b7791f}.ptseg.st button[data-v=fin][aria-pressed=true]{background:#2f8f57}
.ptseg.erro{border-color:var(--danger)}
.ptro{border:1px solid var(--line);border-radius:8px;padding:8px 10px;background:var(--field);color:var(--fg);font-weight:400;font-size:14px;min-height:38px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ptro small{color:var(--muted)}
.ptsec{border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--surface)}
.ptsec>h5{margin:0;background:var(--accent);color:var(--accent-fg);font-family:var(--display);font-weight:500;font-size:13.5px;letter-spacing:.03em;padding:8px 14px;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.ptsec>h5 small{font-family:var(--body);font-weight:500;font-size:12px;opacity:.92}
.ptsec>.ptgrid,.ptsec>.ptin{padding:14px}
.ptpainel{display:flex;flex-direction:column;gap:14px}
.ptfil{width:100%;border-collapse:collapse;font-size:13px;min-width:760px}
.ptfil th{text-align:left;font-size:11.5px;color:var(--muted);font-weight:600;padding:6px;border-bottom:1px solid var(--line);white-space:nowrap}
.ptfil td{padding:5px 6px;border-bottom:1px solid var(--line);vertical-align:middle}
.ptfil input,.ptfil select{width:100%;font:inherit;font-size:13px}
.ptfil td.cod{width:70px}.ptfil td.tp{width:110px}.ptfil td.cn{width:170px}.ptfil td.f1{width:70px;text-align:center}
.ptfil tr.f100 td{background:color-mix(in srgb,var(--purple) 12%,transparent)}
.ptfil .tag100{display:inline-block;margin-left:4px;font-size:10.5px;font-weight:700;background:var(--accent);color:var(--accent-fg);border-radius:999px;padding:1px 6px}
.ptscroll{overflow-x:auto}
.ptnote{font-size:12.5px;color:var(--muted);font-weight:400;margin:0}
.ptanp .anpacao{margin-top:0}.ptanp .anpbusca{margin:10px 0 0}
.pttabs{display:flex;gap:6px;flex-wrap:wrap}
.ptemb{display:flex;flex-direction:column;gap:8px;scroll-margin-top:12px}
.pttabs button{border-radius:999px;padding:6px 12px;font-size:13px}
.pttabs button[aria-selected=true]{background:var(--accent);border-color:var(--accent);color:var(--accent-fg)}
.ptanx{display:flex;flex-direction:column;gap:6px}
.ptbsel{display:block;margin-top:6px}.ptlogoband{display:inline-flex;align-items:center;height:50px;padding:6px 12px;background:#fff;border:1px solid #d6d6de;border-radius:8px;box-sizing:border-box}.ptlogoband img{height:34px;max-width:180px;object-fit:contain}.ptbsel:empty{display:none}.ptselo{display:inline-flex;flex-direction:column;justify-content:center;min-width:120px;height:50px;padding:0 14px;border-radius:8px;font-weight:700;font-size:15px;letter-spacing:.04em;text-transform:uppercase;line-height:1.05;box-shadow:inset 0 -6px 0 var(--b2);white-space:nowrap}.ptselo small{font-size:9.5px;font-weight:500;letter-spacing:.08em;opacity:.85}
.ptanx .lista{display:flex;flex-wrap:wrap;gap:6px}
.ptanx .it{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:3px 4px 3px 10px;font-size:12.5px;font-weight:500;color:var(--fg);background:var(--field);word-break:break-all}
.ptanx .it.comimg{border-radius:10px;padding:4px 4px 4px 4px}.ptanx .it img.mini{width:56px;height:56px;object-fit:contain;background:#fff;border:1px solid var(--line);border-radius:6px;cursor:zoom-in;flex:none}
.ptanx .it button{border:0;background:none;padding:0 6px;font-size:15px;color:var(--muted);min-height:0}
.ptanx .bt{align-self:flex-start;cursor:pointer;border:1px dashed var(--line);border-radius:8px;padding:6px 12px;font-size:13px;font-weight:600;color:var(--purple)}
.ptanx .cst{font-size:12.5px;font-weight:500}.ptanx .cst.ok{color:#2f8f57}.ptanx .cst.bad{color:var(--danger)}.ptanx .cst:empty{display:none}.ptanx .ccnpj{display:block;margin-top:4px}.ptanx .ccnpj.alerta{background:#fde2e1;color:#9b1c1c;border-left:4px solid #d93025;border-radius:4px;padding:6px 10px;font-weight:600}.ptanx .cst.venc{display:block;background:#fff3c4;color:#6b4e00;border-left:4px solid #e0a800;border-radius:4px;padding:6px 10px;margin-top:4px}
.ptbtns{display:flex;gap:8px;flex-wrap:wrap}
.ptpfoot{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:14px;flex-wrap:wrap}.ptpfoot .hint{font-size:12.5px}
.pthist{font-size:12px;color:var(--muted);font-weight:400}
.dgm.ok,.dgm.parcial,.dgm.vazio{flex:none}
.dgm.falta{border:2px solid #d69e2e}
.ptauto{font-size:11.5px;font-weight:500;color:var(--muted)}
.ptauto.ok{color:var(--ok-text)}.ptauto.erro{color:var(--danger)}.ptcnpjmsg:empty,.ptiemsg:empty{display:none}
.ptsefaz{margin-top:6px}.ptsefaz.sobre button[data-cartao]{outline:2px dashed var(--accent-text);outline-offset:2px}
.ptsoc{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:4px;font-size:12px}.ptsoc small{color:var(--muted);font-weight:400}.ptsoc button{font:inherit;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;border:1px solid var(--line);background:var(--chip-bg);color:var(--chip-fg);cursor:pointer}
.ptcfc{font-size:12px;font-weight:600;color:var(--accent-text);margin-top:4px;align-self:flex-start}
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
      const st = anx[key] = anx[key] || { salvos: Array.isArray(val) ? val.slice() : [], novos: [], senha: v[key + '__senha'] || '', label: c.label }; st.accept = c.accept || '';
      return `<div class="ptf full ptanx" data-anx="${esc(key)}">${lab}<div class="lista"></div><label class="bt">📎 Escolher arquivos<input type="file" multiple hidden data-anxin="${esc(key)}"${c.accept ? ` accept="${esc(c.accept)}"` : ''}></label><label class="ptf ptpfx" hidden><span>Senha do certificado (.pfx)</span><input data-pfx="${esc(key)}" value="${esc(st.senha)}" autocomplete="off" style="max-width:260px"><span class="cst"></span><span class="cst ccnpj"></span></label></div>`;
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
    return `<label class="ptf${full}">${lab}<input data-pk="${esc(key)}" data-tipo="${esc(c.tipo || 'texto')}" ${TIPOIN[c.tipo] || ''} value="${esc(val)}"${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}></label>`;
  }
  // Seção: Sim/Não que "abre" mostra os campos seguintes só com Sim
  function camposHtml(campos, pref, v, anx) {
    let dep = null;
    return campos.map((c, i) => {
      let h = campoHtml(c, pref + c.k, v, anx);
      if (c.seOpcao) h = `<div class="ptdw" data-cond="${esc(pref + c.seOpcao[0])}" data-op="${esc(c.seOpcao[1])}">${h}</div>`;
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
    // Mesma regra da tela: campo que depende de um Sim/Não só conta quando a resposta é Sim (e o de "Outros" só quando escolheu Outros)
    let dep = null;
    campos.forEach((c, i) => {
      const abre = c.tipo === 'simnao' && (c.abre != null ? c.abre : i === 0) && i < campos.length - 1;
      if (c.solto || abre) dep = null;
      const oculto = (dep && v[pref + dep] !== 'Sim') || (c.seOpcao && String(v[pref + c.seOpcao[0]] || '').split(':')[0].trim() !== c.seOpcao[1]);
      if (abre) dep = c.k;
      if (!c.req || oculto) return; tot++; const x = v[pref + c.k]; if (Array.isArray(x) ? x.length : String(x || '').trim()) ok++;
    });
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
  // Tipo de imagem pelo tipo gravado ou, se ele vier vazio/genérico, pela extensão do nome (como o logo do card)
  const tipoImg = (tipo, nome) => { if (/^image\//.test(tipo || '') || /pdf/i.test(tipo || '')) return tipo; const ext = ((String(nome || '').match(/\.(\w+)$/) || [])[1] || '').toLowerCase(); return ext === 'pdf' ? 'application/pdf' : /^jpe?g|jfif$/.test(ext) ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : ext ? 'image/' + ext : 'image/png'; };
  // Miniatura recortada: tira as bordas brancas ou transparentes (como o logo do card), para o desenho ocupar o quadro
  function recortarMini(src) {
    return new Promise(ok => { const i = new Image(); i.onload = () => { try {
      const W = i.naturalWidth, H = i.naturalHeight; if (!W || !H) return ok(src);
      const s0 = Math.min(1, 400 / Math.max(W, H)), w0 = Math.max(1, Math.round(W * s0)), h0 = Math.max(1, Math.round(H * s0));
      const t = document.createElement('canvas'); t.width = w0; t.height = h0; const g = t.getContext('2d'); g.drawImage(i, 0, 0, w0, h0);
      const px = g.getImageData(0, 0, w0, h0).data; let x0 = w0, y0 = h0, x1 = -1, y1 = -1;
      for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) { const k = (y * w0 + x) * 4; if (px[k + 3] > 16 && (px[k] < 235 || px[k + 1] < 235 || px[k + 2] < 235)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
      if (x1 < 0) return ok(src);
      const m = 2; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w0 - 1, x1 + m); y1 = Math.min(h0 - 1, y1 + m);
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1, z = Math.min(1, 160 / Math.max(cw, ch)), c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(cw * z)); c.height = Math.max(1, Math.round(ch * z)); c.getContext('2d').drawImage(t, x0, y0, cw, ch, 0, 0, c.width, c.height);
      ok(c.toDataURL('image/png'));
    } catch (e) { ok(src); } }; i.onerror = () => ok(src); i.src = src; });
  }
  // Miniatura de anexo já salvo: { img: data URL para a miniatura (igual ao logo do card), abrir: blob URL para ver em outra aba }
  const MINIS = new Map();
  function miniSalva(id, nome) {
    if (MINIS.has(id)) return MINIS.get(id);
    const pr = (async () => { try { if (!C || !C.F) return null; const { F, db } = C, R = raizC(); const meta = (await F.getDoc(F.doc(db, ...R, 'anexos', id))).data() || {}; if ((meta.tamanho || 0) > 4 * 1024 * 1024) return null;
      const ps = await F.getDocs(F.collection(db, ...R, 'anexos', id, 'partes')); const b64 = ps.docs.sort((x, y) => x.id.localeCompare(y.id)).map(x => x.data().d).join('').replace(/\s/g, ''); if (!b64) return null;
      const tipo = tipoImg(meta.tipo, meta.orig || meta.nome || nome);
      const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return { img: `data:${tipo};base64,${b64}`, abrir: URL.createObjectURL(new Blob([u8], { type: tipo })), blob: new Blob([u8], { type: tipo }) }; } catch (e) { return null; } })();
    // falha (sem rede, sem permissão) não fica guardada: tenta de novo no próximo desenho
    pr.then(r => { if (!r) MINIS.delete(id); });
    MINIS.set(id, pr); return pr;
  }
  // Miniatura da 1ª página de PDF (ex.: logo enviado em PDF), com o leitor de PDF carregado só quando precisa
  let csProm = null;
  const carregaCS = () => window.ContratoSocial ? Promise.resolve(window.ContratoSocial) : (csProm = csProm || new Promise((ok, err) => { const sc = document.createElement('script'); sc.src = 'contrato-social.js'; sc.onload = () => ok(window.ContratoSocial); sc.onerror = () => { csProm = null; err(new Error('pdf')); }; document.head.appendChild(sc); }));
  const MINIPDF = new Map();
  function miniPdf(chave, blob) {
    if (MINIPDF.has(chave)) return MINIPDF.get(chave);
    const pr = carregaCS().then(cs => cs.miniatura(blob, 160)).then(r => r.url).catch(() => ''); MINIPDF.set(chave, pr); return pr;
  }
  function desenharAnexo(box, anx) {
    const k = box.dataset.anx, st = anx[k]; if (!st) return;
    const kb = n => Math.max(1, Math.round((n || 0) / 1024)) + ' KB';
    const ehImg = (tipo, nome) => /^image\//.test(tipo || '') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(nome || '');
    const ehPdfA = (tipo, nome) => /pdf/i.test(tipo || '') || /\.pdf$/i.test(nome || '');
    const mini = (ehI, attr) => ehI ? `<img class="mini" alt="" ${attr}>` : '📄';
    const temMini = (tipo, nome) => ehImg(tipo, nome) || ehPdfA(tipo, nome);
    box.querySelector('.lista').innerHTML = st.salvos.map((a, i) => `<span class="it${temMini(a.tipo, a.orig || a.nome) ? ' comimg' : ''}">${mini(temMini(a.tipo, a.orig || a.nome), `data-miniid="${esc(a.id || '')}"${ehPdfA(a.tipo, a.orig || a.nome) ? ' data-pdf="1"' : ''}`)} ${esc(a.nome)} <small>${kb(a.tamanho)}</small><button type="button" data-anxrm="s${i}" aria-label="Remover ${esc(a.nome)}">×</button></span>`).join('') + st.novos.map((f, i) => `<span class="it${temMini(f.type, f.name) ? ' comimg' : ''}">${mini(temMini(f.type, f.name), `data-mininovo="${i}"${ehPdfA(f.type, f.name) ? ' data-pdf="1"' : ''}`)} ${esc(f.name)} <small>${kb(f.size)} · novo</small><button type="button" data-anxrm="n${i}" aria-label="Remover ${esc(f.name)}">×</button></span>`).join('') || '<span class="ptnote">Nenhum arquivo.</span>';
    // Miniatura das imagens: as novas vêm do aparelho; as já salvas são lidas do banco (uma vez)
    // Imagem que não abre (arquivo corrompido ou formato que o navegador não mostra) vira o ícone, nunca um quadro vazio
    const icone = im => { if (im.isConnected) im.replaceWith('📄'); };
    box.querySelectorAll('img.mini').forEach(im => { im.onerror = () => icone(im); });
    box.querySelectorAll('img[data-mininovo]').forEach(im => { const f = st.novos[+im.dataset.mininovo]; if (!f) return; const b = /^image\//.test(f.type) ? f : new Blob([f], { type: tipoImg(f.type, f.name) }), u = URL.createObjectURL(b); im.onclick = () => window.open(u, '_blank'); if (!im.dataset.pdf) { recortarMini(u).then(m => { im.src = m; }); return; } miniPdf(f, f).then(m => { if (m) im.src = m; else icone(im); }); });
    box.querySelectorAll('img[data-miniid]').forEach(im => { const id = im.dataset.miniid; if (!id) { icone(im); return; } const a = st.salvos.find(x => x.id === id) || {}; miniSalva(id, a.orig || a.nome).then(async r => { if (!r) { icone(im); return; } im.onclick = () => window.open(r.abrir, '_blank'); if (!im.dataset.pdf) { im.src = await recortarMini(r.img); return; } const m = await miniPdf(id, r.blob); if (m) im.src = m; else icone(im); }); });
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
      const exts = String(st.accept || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean), recus = exts.length ? fs.filter(f => !exts.some(e => f.name.toLowerCase().endsWith(e))) : []; fs = fs.filter(f => !recus.includes(f));
      const certs = fs.filter(f => ehPfx(f.name)); const msgs = grandes.length ? ['Arquivos acima de 10 MB não são aceitos: ' + grandes.map(f => f.name).join(', ') + '.'] : []; if (recus.length) msgs.push('Aqui só entram arquivos ' + exts.join(', ') + ': ' + recus.map(f => f.name).join(', ') + ' ficou de fora.');
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
  // Envia os anexos novos (mesmo formato dos anexos do Pré-Contrato), com o nome padrão F1_CNPJ_RAZÃO
  async function subirAnexos(F, db, pid, fila, aviso) {
    let n = 0;
    for (const u of fila) {
      n++; if (aviso) aviso(`Enviando anexo ${n} de ${fila.length}…`);
      const b64 = await new Promise((ok, err) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = err; r.readAsDataURL(u.f); });
      const R = raiz(pid), ref = F.doc(F.collection(db, ...R, 'anexos')), PART = 700000, partes = Math.max(1, Math.ceil(b64.length / PART));
      for (let i = 0; i < partes; i++) await F.setDoc(F.doc(db, ...R, 'anexos', ref.id, 'partes', String(i).padStart(3, '0')), { d: b64.slice(i * PART, (i + 1) * PART) });
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
  // Campos da bandeira (Posto é bandeirado, Qual bandeira, dados de integração) ficam na aba Base e posto
  const ehBand = c => /bandeir/i.test(c.label || '');
  const camposBand = () => ((C && C.cfg4 && C.cfg4.secoes) || []).flatMap(s => (s.campos || []).filter(c => c.show !== false && ehBand(c)));
  // Seções que ficam dentro da aba Base e posto (uma vez só, não por filial): Conversão de Dados
  const ehSecBase = s => /convers[aã]o/i.test(s.titulo || '');
  // Blocos da aba Base e posto vindos dos Parâmetros: Bandeira (pelos campos) e as seções acima
  const blocosBase = () => { const cfg = (C && C.cfg4 && C.cfg4.secoes) || [], b = [];
    cfg.filter(ehSecBase).forEach(s => { const cs = (s.campos || []).filter(c => c.show !== false && !ehDup(c)).flatMap(c => { const ou = c.tipo === 'opcoes' && /legado/i.test(c.label || '') && opsDe(c).find(ehOutro); return ou ? [c, { k: c.k + '__arq', label: 'Arquivos da base para conversão (.csv, .txt, Excel)', tipo: 'anexo', accept: ARQ_CONV, seOpcao: [c.k, ou], arqConv: true }] : [c]; }); if (cs.length) b.push({ titulo: String(s.titulo || '').replace(/:\s*$/, ''), campos: cs }); });
    return b; };
  // Seção de anexos (Certificado Digital, Logo da Filial) aparece dentro da aba Base e posto, por posto ou por filial
  const ehSecAnx = s => /anexo/i.test(s.titulo || '') || (s.campos || []).some(c => c.tipo === 'anexo' && /certificad|pfx|logo/i.test(c.label || ''));
  // Seções dos Parâmetros que ficam no grupo Validação do menu, logo abaixo de Implantação (hoje todas: TEF / PIX, Integração…)
  const ehSecVal = s => true;
  // Setor de Validação de uma seção (escolhido nos Parâmetros): 'proprio' (item próprio no menu), 'status', 'base' (Implantação)
  // ou o id/título de outra seção do Pré TASK. Sem escolha: Anexos em Implantação e o resto com item próprio.
  const normT = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  function alvoSetor(v, ps, eu) {
    if (!v || v === 'proprio') return 'proprio';
    if (v === 'status' || v === 'base') return v;
    const j = ps.findIndex((x, k) => k !== eu && ((x.id && x.id === v) || normT(x.titulo) === normT(v)));
    if (j < 0) return 'proprio';
    return alvoSetor(setorBruto(ps[j]), ps, j) === 'proprio' ? j : 'proprio'; // sem encadear: o destino precisa ter item próprio
  }
  const setorBruto = s => s.setor || (ehSecAnx(s) ? 'base' : 'proprio');
  const setorSec = (ps, i) => alvoSetor(setorBruto(ps[i]), ps, i);
  const injeta = (html, extra) => extra ? html.replace(/<\/section>\s*$/, extra + '</section>') : html;
  const ARQ_CONV = '.csv,.txt,.xls,.xlsx,.xlsm,.xlsb,.xltx,.ods';
  const camposBase = () => blocosBase().flatMap(x => x.campos);
  const secoesParam = cfg => ((cfg && cfg.secoes) || []).filter(s => !ehSecBase(s)).map(s => ({ ...s, campos: (s.campos || []).filter(c => c.show !== false && !ehDup(c)) })).filter(s => s.campos.length);
  const BANDS = [[/ipiranga/i, '#0a3d91', '#ffd400', '#ffd400', 'Ipiranga'], [/shell|ra[ií]zen/i, '#ffd500', '#dd1d21', '#dd1d21', 'Shell'], [/petrobras|^br\b|vibra/i, '#00843d', '#fdc82f', '#fff', 'Petrobras'], [/\bale\b|alesat/i, '#0b4ea2', '#e30613', '#fff', 'ALE'], [/total/i, '#ed0000', '#2a5caa', '#fff', 'TotalEnergies'], [/atem/i, '#004b8d', '#f7a600', '#fff', 'Atem'], [/rodoil/i, '#e30613', '#1d1d1b', '#fff', 'Rodoil'], [/larco/i, '#003f7d', '#e4002b', '#fff', 'Larco'], [/charrua/i, '#00539b', '#f6a800', '#fff', 'Charrua'], [/petronas/i, '#00a19c', '#d8e021', '#fff', 'Petronas'], [/idaza/i, '#1b3f8b', '#f39200', '#fff', 'Idaza'], [/branca|sem bandeira|livre/i, '#ffffff', '#c9c9d1', '#33333b', 'Bandeira branca']];
  // Logo oficial (arquivos em icons/bandeiras, do Wikimedia Commons) quando houver; senão o selo com as cores
  // A lista vem do cadastro "Logos das Bandeiras" (Parâmetros Pré TASK); sem cadastro publicado, usa a padrão
  const LOGOS_PADRAO = [{ nome: 'Petrobras', img: 'icons/bandeiras/petrobras.svg' }, { nome: 'Ipiranga', img: 'icons/bandeiras/ipiranga.svg' }, { nome: 'ALE', img: 'icons/bandeiras/ale.svg' }];
  let BAND_LOGOS = null;
  function logoBand(nome) {
    const n = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^bandeira\s+/, '').trim();
    const b = BANDS.find(x => x[0].test(nome)), canon = b ? b[4] : '';
    const it = (BAND_LOGOS || LOGOS_PADRAO).find(x => x.img && (n(x.nome) === n(nome) || (canon && n(x.nome) === n(canon))));
    return it ? `<span class="ptlogoband"><img src="${esc(it.img)}" alt="${esc(it.nome)}"></span>` : '';
  }
  function seloBand(nome) { const b = BANDS.find(x => x[0].test(nome)) || [null, '#4b4b57', '#8a8a99', '#fff', nome]; return `<span class="ptselo" style="background:${b[1]};color:${b[3]};--b2:${b[2]};${b[1] === '#ffffff' ? 'border:1px solid #d6d6de;' : ''}"><small>Posto</small>${esc(b[4] || nome)}</span>`; }
  // Posto simples: a bandeira informada pelo cliente no Pré-Contrato já entra no bloco Bandeira (só se ainda estiver vazio)
  function bandeiraDoE2() {
    if (!C || C.pre.tipoBase !== 'Simples') return false;
    let bE2 = ''; (C.cfg2.secoes || []).forEach(sc => (sc.campos || []).forEach(c => { if (/bandeira/i.test(c.label || '') && !/bandeirad/i.test(c.label || '') && C.v2[c.k]) bE2 = String(C.v2[c.k]).trim(); }));
    if (!bE2) return false;
    const cs = camposBand(), sn = cs.find(c => c.tipo === 'simnao'), qual = cs.find(c => c.tipo === 'opcoes' || c.tipo === 'multicond');
    const branca = /branca|sem bandeira|livre/i.test(bE2); let mudou = false;
    if (sn && !C.v[sn.k]) { C.v[sn.k] = branca ? 'Não' : 'Sim'; mudou = true; }
    if (qual && !C.v[qual.k]) { C.v[qual.k] = opBandeira(qual, bE2); mudou = true; }
    return mudou;
  }
  // Valor do campo "Qual bandeira" para um nome de bandeira: a opção da lista que corresponde, ou Outros: nome
  function opBandeira(qual, nome) {
    const ops = String(qual.opcoes || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean), n = x => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/^bandeira\s+/, '').replace(/^outr[oa]s?:\s*/, '').trim();
    const b = BANDS.find(x => x[0].test(nome)), canon = b ? b[4] : '';
    const alvo = n(nome), op = ops.find(o => n(o) === alvo) || (canon && ops.find(o => n(o) === n(canon))) || ops.find(o => n(o) && !ehOutro(o) && (alvo.includes(n(o)) || n(o).includes(alvo))), outra = ops.find(ehOutro);
    if (qual.tipo !== 'opcoes' && qual.tipo !== 'multicond') return canon || nome;
    return op || (outra ? outra + ': ' + (canon || nome).replace(/^outr[oa]s?:\s*/i, '') : canon || nome);
  }
  // Posto é bandeirado? e Qual bandeira vêm da base da ANP pelo CNPJ do posto (cada filial, na Central), só se vazios.
  // Com bandeira: Sim e a bandeira; bandeira branca: Não. CNPJ fora da ANP: fica como está.
  async function bandeiraDaAnp() {
    if (!window.anpPosto) return;
    const cs = camposBand(), sn = cs.find(c => c.tipo === 'simnao'), qual = cs.find(c => c.tipo === 'opcoes' || c.tipo === 'multicond') || cs.find(c => c.tipo === 'texto' && /^\s*(qual\s+(a\s+)?)?bandeira\b/i.test(c.label || ''));
    if (!sn) return;
    const fs = C.pre.filiais || [], central = C.pre.tipoBase === 'Central';
    const alvos = central ? fs.map((f, j) => ['f' + j + '__', f.cnpj]) : [['', [fs[0] && fs[0].cnpj, C.leadCnpj, C.p.cnpj].find(x => dig(x).length === 14)]];
    for (const [pf, cnpj] of alvos) {
      if (dig(cnpj).length !== 14 || C.v[pf + sn.k]) continue;
      let o = null; try { o = await window.anpPosto(cnpj); } catch (e) {}
      if (!C) return; if (!o || !o.bandeira) continue;
      const fonte = 'Base ANP · CNPJ ' + fmtCnpj(cnpj);
      if (o.bandeiraBranca) { C.v[pf + sn.k] = 'Não'; C.auto[pf + sn.k] = fonte + ' (bandeira branca)'; continue; }
      C.v[pf + sn.k] = 'Sim'; C.auto[pf + sn.k] = fonte;
      if (qual && !C.v[pf + qual.k]) { C.v[pf + qual.k] = opBandeira(qual, o.bandeira); C.auto[pf + qual.k] = fonte + ' · ' + o.bandeira; }
    }
  }
  // Conversão: o "Sistema atual" informado pelo cliente no Pré-Contrato entra no Sistema Legado (só se vazio)
  function legadoDoE2() {
    let sa = ''; (C.cfg2.secoes || []).forEach(sc => (sc.campos || []).forEach(c => { if (/sistema atual|substitu/i.test(c.label || '') && C.v2[c.k]) sa = String(C.v2[c.k]).trim(); }));
    if (!sa) return;
    const sec = ((C.cfg4 && C.cfg4.secoes) || []).find(ehSecBase); if (!sec) return;
    const cs = sec.campos || [], conv = cs.find(c => c.tipo === 'simnao'), leg = cs.find(c => /legado|sistema/i.test(c.label || '') && c.tipo !== 'simnao');
    if (!leg || C.v[leg.k]) return;
    if (conv && !C.v[conv.k]) C.v[conv.k] = 'Sim';
    const n = x => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');
    const ops = String(leg.opcoes || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean), op = ops.find(o => n(o) === n(sa)) || ops.find(o => n(o) && !ehOutro(o) && (n(sa).includes(n(o)) || n(o).includes(n(sa)))), outra = ops.find(ehOutro);
    C.v[leg.k] = leg.tipo === 'opcoes' ? (op || (outra ? outra + ': ' + sa : sa)) : sa;
  }
  // Itens da proposta aceita (os mesmos do contrato) marcam Sim nos campos Sim/Não ligados a eles (só se ainda vazios).
  // Sem o item, o campo fica em branco: não marca Não. Continua editável.
  const VINCULOS = [
    { campo: /\btef\b.*\bfix|\bfix\w*.*\btef\b/i, item: c => /\btef\b/i.test(c) && !/m[oó]vel|pos\b|smart/i.test(c) },
    { campo: /pdv\s*m[oó]vel|tef\s*m[oó]vel|\bpos\b/i, item: c => /pdv\s*m[oó]vel|tef\s*m[oó]vel|espelho de venda|smart\s*pos|\bpos\b/i.test(c) },
    { campo: /cart[oõ]es?\s*(de\s*)?frota|\bfrota\b/i, item: c => /frota/i.test(c) }
  ];
  function itensProposta() {
    const d = (C && C.p && C.p.dados) || {};
    return [].concat(d.lic || [], d.men || []).filter(r => r && !r.oculto && String(r.desc || '').trim() && String(r.qty ?? '').trim() !== '0').map(r => String(r.desc) + ' ' + String(r.sub || ''));
  }
  function itensDaProposta() {
    if (C.direto) return;
    const its = itensProposta(); if (!its.length) return;
    secoesParam(C.cfg4).forEach(sc => {
      const prefs = porFilial(sc) ? C.pre.filiais.map((_, j) => 'f' + j + '__') : [''];
      sc.campos.forEach(c => {
        if (c.tipo !== 'simnao') return;
        const vin = VINCULOS.find(x => x.campo.test(c.label || '')); if (!vin) return;
        const it = its.find(vin.item); if (!it) return;
        prefs.forEach(pf => { const k = pf + c.k; if (!C.v[k]) { C.v[k] = 'Sim'; C.auto[k] = 'Proposta · ' + it.split(/[.(]/)[0].trim(); } });
      });
    });
  }
  // Mostra embaixo do campo de onde veio a resposta (proposta ou ANP); some quando a pessoa muda a resposta
  function marcarAuto(root) {
    Object.entries(C.auto || {}).forEach(([k, de]) => {
      const el = root.querySelector(`[data-pk="${CSS.escape(k)}"]`); if (!el) return;
      const n = document.createElement('small'); n.className = 'ptauto'; n.textContent = '✓ Preenchido pela ' + de;
      const depois = el.parentElement.querySelector('.ptbsel') || el; depois.after(n);
      const tira = () => { delete C.auto[k]; n.remove(); };
      if (el.dataset.seg) el.addEventListener('click', tira, { once: true }); else el.addEventListener('change', tira, { once: true });
    });
  }
  function ligarSelo(root) {
    root.querySelectorAll('select[data-pk]').forEach(sel => {
      const lab = sel.closest('label') || sel.parentElement; if (!/bandeira/i.test(lab.textContent || '')) return;
      let box = lab.querySelector('.ptbsel'); if (!box) { box = document.createElement('span'); box.className = 'ptbsel'; sel.after(box); }
      const d = () => { const v = sel.value; box.innerHTML = v && !ehOutro(v) ? (logoBand(v) || seloBand(v)) : ''; }; sel.addEventListener('change', d); d();
    });
  }

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
      tipoBase: tipo, inclusao: '', centralExistente: '', potencial: '', nome: (tc && tc.nome) || acha(/nome da central|nome do posto/i) || (tipo === 'Simples' ? (nomePosto(filiais[0] && filiais[0].razao) || (v2 && v2.fantasia) || p.cliente || '') : ''), f100: (tc && tc.f100) || '', filiais
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
  const msg = t => { const m = document.getElementById('ptMsg'); if (m) m.textContent = t || ''; document.querySelectorAll('#ptCorpo .ptpfoot .hint').forEach(x => { x.textContent = t || ''; }); };
  const ICO = t => (window.TK_ICONE ? window.TK_ICONE(t) : '');

  async function abrir(ctx) {
    const d = dlg(); C = { ...ctx, anx: {}, filAtiva: 0 };
    d.querySelector('#ptTit').textContent = 'Pré TASK';
    d.querySelector('#ptBody').innerHTML = '<p class="hint">Carregando…</p>'; msg('');
    d.querySelector('#ptSalvar').textContent = ctx.origem === 'proposta' ? 'Salvar e enviar ao TASK' : 'Salvar final';
    if (!d.open) d.showModal();
    const { F, db, pid } = ctx;
    // Cadastro direto no TASK (perfis TASK e ADM): sem proposta nem contrato. Tudo fica no próprio card
    // (tasks/{id}.pre4: cabeçalho, valores e Pré-Contrato; anexos em tasks/{id}/anexos)
    const direto = !pid && !!ctx.task; if (direto) { C.direto = true; C.tid = ctx.task.id; d.querySelector('#ptSalvar').textContent = 'Salvar final'; }
    const ler = async (...c) => { try { const r = await F.getDoc(F.doc(db, ...c)); return r.exists() ? r.data() : null; } catch (e) { return null; } };
    const json = x => { try { return x && x.json ? JSON.parse(x.json) : null; } catch (e) { return null; } };
    const tk = direto ? ctx.task : null, pre4 = (tk && tk.pre4) || null;
    const [p, e4, e2, cfg4, pub2, band] = await Promise.all(direto
      ? [{ direto: true, cliente: tk.apelido || tk.razao || '', cnpj: tk.cnpj || '', cidade: [tk.cidade, tk.uf].filter(Boolean).join(' - ') }, pre4, { valores: (pre4 && pre4.v2) || {}, direto: true }, ler('config', 'etapa4'), ler('publico', 'etapa2'), ler('publico', 'bandeiras')]
      : [ler('propostas', pid), ler('propostas', pid, 'etapa4', 'dados'), ler('propostas', pid, 'etapa2', 'resposta'), ler('config', 'etapa4'), ler('publico', 'etapa2'), ler('publico', 'bandeiras')]);
    if (!C || (direto ? C.tid !== tk.id : C.pid !== pid)) return;
    BAND_LOGOS = json(band);
    if (!p) { d.querySelector('#ptBody').innerHTML = '<p class="hint">Proposta não encontrada.</p>'; return; }
    let an = []; if (!direto || !ctx.novo) try { an = (await F.getDocs(F.collection(db, ...(direto ? ['tasks', tk.id] : ['propostas', pid]), 'anexos'))).docs.map(x => ({ id: x.id, ...x.data() })); } catch (e) {}
    let dono = null; if (p.owner) dono = await ler('usuarios', p.owner);
    // Centrais já cadastradas no TASK (para "Filial Nova em Central"); quem não lê o TASK digita o nome
    let centrais = []; try { centrais = [...new Set((await F.getDocs(F.collection(db, 'tasks'))).docs.map(x => x.data()).filter(t => !t.removido && t.central && t.central.tipo !== 'simples' && t.central.nome).map(t => t.central.nome.trim()))].sort((a, b) => a.localeCompare(b, 'pt-BR')); } catch (e) {}
    const task = ctx.task || null;
    const v2 = (e2 && e2.valores) || {};
    const pre = e4 && e4.pre ? copia(e4.pre) : migrar(e4, task, p, v2);
    if (task && task.status) pre.status = task.status; // o status do card é o que vale
    if (!pre.modalidade) { const im = p.implantacao || (p.dados && p.dados.implantacao); if (im) pre.modalidade = im === 'Remota' ? 'Remoto' : 'Presencial'; } // vem da proposta
    if (pre.tipoBase === 'Central' && !pre.nome) { const f = (v2.fantasia || p.cliente || '').trim(); if (f) pre.nome = /^central\b/i.test(f) ? f : 'Central ' + f; }
    Object.assign(C, { p, e4: e4 || {}, e2, cfg4: cfg4 && cfg4.json ? json(cfg4) : copia(window.ETAPA4_PADRAO || { secoes: [] }), cfg2: json(pub2) || window.ETAPA2_PADRAO || { secoes: [] }, an, dono, centrais, pre, v: copia((e4 && e4.valores) || {}), v2: copia(v2) });
    d.querySelector('#ptTit').textContent = (direto ? (ctx.novo ? 'Novo cadastro direto' : 'Pré TASK · cadastro direto') : 'Pré TASK') + (p.cliente ? ' · ' + p.cliente : '');
    trazerAnexosE2();
    camposBase().forEach(c => [c.k, c.k + '__det'].forEach(k => { if (C.v[k] === undefined && C.v['f0__' + k] !== undefined) C.v[k] = C.v['f0__' + k]; }));
    // a Bandeira voltou para a aba Integração: na Central ela é por filial, então o valor salvo na aba Implantação vai para a F1
    if (C.pre.tipoBase === 'Central') camposBand().forEach(c => [c.k, c.k + '__det'].forEach(k => { if (C.v['f0__' + k] === undefined && C.v[k] !== undefined) C.v['f0__' + k] = C.v[k]; }));
    C.auto = {};
    if (p.leadId && !direto) { const ld = await ler('crm', p.leadId); C.leadCnpj = (ld && ld.cnpj) || ''; }
    await bandeiraDaAnp(); if (!C || (direto ? C.tid !== tk.id : C.pid !== pid)) return;
    bandeiraDoE2(); legadoDoE2(); itensDaProposta();
    desenhar();
    if (e4 && e4.parcial) msg('Salvo parcial' + (e4.por ? ' por ' + e4.por : '') + (e4.em && e4.em.toDate ? ' em ' + e4.em.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '') + '. Complete os obrigatórios para o salvar final.');
  }

  // Certificado e logo já enviados no Pré-Contrato: entram como arquivos já salvos no campo do Pré TASK
  // (Simples: no campo do posto; Central: na F1), só quando o campo ainda não foi preenchido
  function trazerAnexosE2() {
    const doE2 = (C.an || []).filter(a => !a.etapa || a.etapa === 2);
    if (!doE2.length) return;
    const tipoDe = t => /certificad|pfx|\be-?cnpj/i.test(t || '') ? 'cert' : /logo|marca/i.test(t || '') ? 'logo' : '';
    let senhaE2 = ''; (C.cfg2.secoes || []).forEach(sc => (sc.campos || []).forEach(c => { if (/senha/i.test(c.label || '') && /certificad|pfx/i.test(c.label || '') && C.v2[c.k]) senhaE2 = String(C.v2[c.k]); }));
    secoesParam(C.cfg4).forEach(sc => sc.campos.forEach(c => {
      if (c.tipo !== 'anexo') return; const t = tipoDe(c.label); if (!t) return;
      const key = (porFilial(sc) ? 'f0__' : '') + c.k; if (C.v[key] !== undefined) return;
      const lista = doE2.filter(a => tipoDe(a.campo) === t || (t === 'cert' && ehPfx(a.nome))).map(a => ({ id: a.id, nome: a.nome, orig: a.nome, tipo: a.tipo || '', tamanho: a.tamanho || 0, doE2: true }));
      if (!lista.length) return; C.v[key] = lista;
      if (t === 'cert' && senhaE2 && C.v[key + '__senha'] === undefined) C.v[key + '__senha'] = senhaE2;
    }));
  }

  /* ---------- Tela ---------- */
  const secs2 = () => (C.cfg2.secoes || []).map(s => ({ ...s, campos: (s.campos || []).filter(c => (c.show !== false || c.fixo) && c.tipo !== 'arquivo').map(c => ehRegime(c) ? { ...c, req: true } : c) })).filter(s => s.campos.length);
  // Campos do Pré-Contrato marcados "Pré TASK": o cliente não vê, o vendedor completa aqui (gravados junto com o Pré-Contrato)
  // O Regime Tributário também conta como campo do Pré TASK, mas aparece na Implantação (não nos blocos complementares)
  const ehComp = c => (!!c.pretask && !c.fixo) || ehRegime(c);
  const secs2Cli = () => secs2().map(s => ({ ...s, campos: s.campos.filter(c => !ehComp(c)) })).filter(s => s.campos.length);
  const secs2Comp = () => secs2().map(s => ({ ...s, campos: s.campos.filter(c => ehComp(c) && !ehRegime(c)) })).filter(s => s.campos.length);
  const porFilial = s => C.pre.tipoBase === 'Central' && s.porFilial !== false && C.pre.filiais.length > 0;
  function marca(ok, tot) { return !tot ? '<span class="dgm ok" title="Sem obrigatórios">✓</span>' : ok >= tot ? '<span class="dgm ok" title="Completo">✓</span>' : ok ? '<span class="dgm parcial" title="Incompleto"></span>' : '<span class="dgm falta" title="Falta preencher"></span>'; }
  function marcadores() {
    const P = C.pre, sts = { status: [P.status, P.modalidade].filter(Boolean).length + '/2' };
    const nStatus = [P.status, P.modalidade, P.dataBase, P.start].filter(Boolean).length;
    const base = [P.tipoBase, P.inclusao, P.potencial, P.nome].filter(Boolean).length + (P.filiais.length && P.filiais.every(f => dig(f.cnpj).length === 14 && f.tipo) ? 1 : 0) + (P.tipoBase !== 'Central' || P.f100 ? 1 : 0);
    const rg = (C.e2 || C.direto) && campoRegime();
    const m = { status: marca(nStatus, 4), base: rg ? marca(base + (C.v2[rg.k] ? 1 : 0), 7) : marca(base, 6), proposta: marca(1, 1), contrato: marca(C.p.ctAceitoEm || C.direto ? 1 : 0, 1) };
    const conta2 = ss => { let ok = 0, tot = 0; ss.forEach(s => { const r = contar(s.campos, '', C.v2); ok += r.ok; tot += r.tot; }); return marca(ok, tot); };
    // cadastro direto também exige os obrigatórios do Pré-Contrato e complementares (só proposta e contrato ficam de fora)
    m.e2 = C.direto || C.e2 ? conta2(secs2Cli()) : marca(0, 1); secs2Comp().forEach((sc, i) => { m['e2c' + i] = C.e2 ? conta2([sc]) : marca(0, 1); });
    const vv = { ...C.v }; Object.entries(C.anx || {}).forEach(([k, st]) => { if (st && st.salvos) vv[k] = st.salvos.concat(st.novos || []); }); // anexos escolhidos e ainda não salvos também contam
    secoesParam(C.cfg4).forEach((s, i) => { let ok = 0, tot = 0; compDentro(i).forEach(sc => { if (!C.e2) { tot++; return; } const r = contar(sc.campos, '', C.v2); ok += r.ok; tot += r.tot; }); const prefs = porFilial(s) ? C.pre.filiais.map((_, j) => 'f' + j + '__') : ['']; prefs.forEach(pf => { const r = contar(s.campos, pf, vv); ok += r.ok; tot += r.tot; }); m['p' + i] = marca(ok, tot); });
    m.anexos = marca(1, 1);
    // a aba Base e posto também mostra pendência das seções de anexos que estão dentro dela
    const psM = secoesParam(C.cfg4), pend = (dest, mk) => { const k = typeof dest === 'number' ? 'p' + dest : dest; if (k !== 'proprio' && !/dgm ok/.test(mk) && /dgm ok/.test(m[k] || '')) m[k] = marca(0, 1).replace('falta', 'parcial'); };
    psM.forEach((s, i) => pend(setorSec(psM, i), m['p' + i]));
    secs2Comp().forEach((sc, i) => { const d = destinoComp(sc); if (d === 'status' || d === 'base') pend(d, m['e2c' + i]); });
    return m;
  }
  // Cadastro direto: o que já se sabe do posto (F100 ou F1, com a consulta do CNPJ) entra nos campos vazios do Pré-Contrato
  function e2DoPosto() {
    if (!C.direto) return;
    const fs = C.pre.filiais || [], f = fs.find(x => x.cod === C.pre.f100) || fs[0]; if (!f) return;
    const i = f.info || {}, v = C.v2, put = (k, x) => { if (x && !String(v[k] || '').trim()) v[k] = x; };
    if (dig(f.cnpj).length === 14) put('cnpj', fmtCnpj(f.cnpj));
    put('razao', f.razao || i.razao); put('fantasia', i.fantasia); put('cidade', f.cidade || i.municipio); put('uf', f.uf || i.uf); put('cep', i.cep);
  }
  function desenhar() {
    e2DoPosto();
    const body = document.getElementById('ptBody'), M = marcadores(), ps = secoesParam(C.cfg4);
    const nav = (id, t, ic) => `<button type="button" class="dgnav" data-pt="${id}" aria-selected="false">${ICO(ic || t)}<span>${esc(t)}</span>${M[id] || ''}</button>`;
    const g = t => `<span class="ptnote" style="padding:10px 14px 2px;text-transform:uppercase;letter-spacing:.06em;font-size:10.5px;font-weight:600">${t}</span>`;
    body.innerHTML = `<div class="dgwrap" id="ptWrap">
      <nav class="dgmenu" aria-label="Seções do Pré TASK">${g('Validação')}${nav('status', 'Status e datas', 'status')}${nav('base', 'Implantação', 'posto')}${C.direto ? nav('e2', 'Pré-Contrato', 'pessoas') : ''}${secs2Comp().map((sc, i) => destinoComp(sc) !== 'proprio' ? '' : nav('e2c' + i, tituloComp(sc.titulo), 'contato')).join('')}${ps.map((s, i) => setorSec(ps, i) === 'proprio' && ehSecVal(s) ? nav('p' + i, s.titulo, s.titulo) : '').join('')}
        ${g('Dos passos anteriores')}${nav('proposta', 'Proposta', 'lista')}${C.direto ? '' : nav('e2', 'Pré-Contrato', 'pessoas')}${nav('contrato', 'Contrato', 'lista')}
        ${ps.some((s, i) => setorSec(ps, i) === 'proprio' && !ehSecVal(s)) ? g('Parâmetros Pré TASK') : ''}${ps.map((s, i) => setorSec(ps, i) !== 'proprio' || ehSecVal(s) ? '' : nav('p' + i, s.titulo, s.titulo)).join('')}</nav>
      <div class="dgcorpo" id="ptCorpo">
        ${injeta(painelStatus(), dentroDe('status', ps))}${painelBase(dentroDe('base', ps))}${painelE2c()}${painelProposta()}${painelE2()}${painelContrato()}${ps.map((s, i) => setorSec(ps, i) === 'proprio' ? painelParam(s, i) : '').join('')}
      </div></div>`;
    const corpo = document.getElementById('ptCorpo');
    // Salvar parcial também no fim de cada tela de Validação
    corpo.querySelectorAll(':scope > [data-ptp]').forEach(pn => { const id = pn.dataset.ptp; if (id !== 'status' && id !== 'base' && !(/^e2c\d+$/.test(id) && C.e2) && !(id === 'e2' && C.direto) && !/^p\d+$/.test(id)) return; pn.insertAdjacentHTML('beforeend', '<div class="ptpfoot"><span class="hint" role="status"></span><button type="button" data-ptparc="1">Salvar parcial</button></div>'); });
    corpo.addEventListener('click', ev => { if (ev.target.closest('[data-ptparc]')) salvar(true); });
    ligarCampos(corpo); sincronizar(corpo); ligarAnexos(corpo, C.anx, msg); ligarSelo(corpo); marcarAuto(corpo); ligarRegime(corpo); ligarSefaz(corpo);
    corpo.addEventListener('pt-mudou', ev => { cabecalhoMudou(ev); conferirFinal(); });
    corpo.addEventListener('input', () => conferirFinal()); corpo.addEventListener('change', () => conferirFinal());
    conferirFinal(true);
    body.querySelector('.dgmenu').addEventListener('click', ev => { const b = ev.target.closest('[data-pt]'); if (b) mostrar(b.dataset.pt); });
    mostrar(C.aba || 'status');
    ligarBase();
    destacarFaltas();
  }
  function mostrar(id) {
    const emb = document.querySelector(`#ptCorpo .ptemb[data-ptp="${id}"]`);
    if (emb) id = (emb.parentElement.closest('[data-ptp]') || { dataset: { ptp: 'base' } }).dataset.ptp;
    // cadastro direto: ao abrir o Pré-Contrato, traz o CNPJ, a razão social e a cidade do posto já informados na Implantação
    if (id === 'e2' && C.direto && document.getElementById('ptCorpo')) { colherCabecalho(); colherCampos(); const antes = JSON.stringify(C.v2); e2DoPosto(); if (JSON.stringify(C.v2) !== antes) { C.aba = 'e2'; desenhar(); return; } }
    C.aba = id;
    if (emb) setTimeout(() => emb.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0);
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
      ${C.direto ? `<div class="ptf"><span>Origem</span><div class="ptro">Cadastro direto no TASK<small>sem proposta e sem contrato</small></div></div>` : `<div class="ptf"><span>Responsável pela Proposta</span><div class="ptro">${esc(p.vendedor || (C.dono && C.dono.nome) || '')}${email ? ' · ' + esc(email) : ''}<small>elaborou e enviou a proposta</small></div></div>`}
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
  // Regime Tributário: não é pedido ao cliente (sai do link do Pré-Contrato). É exigido aqui, na Implantação.
  // Fica gravado junto com o Pré-Contrato (como os campos "Pré TASK"); vem pronto quando o cliente anexou o
  // cartão de contribuinte ou a busca do CNPJ trouxe o regime, e senão é sugerido pela Receita.
  const ehRegime = c => /regime\s+tribut/i.test(c.label || '') || (/regime/i.test(c.label || '') && !/bens|casamento|uni[aã]o/i.test(c.label || ''));
  function campoRegime() { return [].concat(...secs2().map(s => s.campos)).find(ehRegime); }
  function regimeHtml() {
    const c = campoRegime(); if (!c) return '';
    if (!C.e2 && !C.direto) return `<div class="ptf"><span>${esc(c.label)}</span><div class="ptro"><small>Libera quando o cliente enviar o Pré-Contrato</small></div></div>`;
    const de = C.v2[c.k] && C.v2[c.k + '__de'];
    return campoHtml({ ...c, req: true, detalhe: '', full: false }, 'e2:' + c.k, prefixar(C.v2, 'e2:'), {}).replace('</label>', `<small class="ptauto" data-regnota>${de ? '✓ Preenchido pelo ' + esc(de) + '. Confira.' : ''}</small></label>`);
  }
  function ligarRegime(corpo) {
    const c = campoRegime(), el = c && corpo.querySelector(`[data-pk="${CSS.escape('e2:' + c.k)}"]`); if (!el) return;
    const n = el.parentElement.querySelector('[data-regnota]');
    el.addEventListener('change', () => { if (el._auto) { el._auto = false; return; } if (n) n.textContent = ''; });
    if (!el.value) regimeDaReceita(el, n);
  }
  // Sem o regime (o cliente não anexou o cartão, ou contratos antigos): sugere pela Receita, pelo CNPJ da empresa
  async function regimeDaReceita(el, n) {
    if (el.tagName !== 'SELECT' || !window.cnpjInfo) return;
    const cnpj = [C.v2.cnpj, (C.pre.filiais[0] || {}).cnpj, C.leadCnpj, C.p.cnpj].find(x => dig(x).length === 14); if (!cnpj) return;
    let j = null; try { j = await window.cnpjInfo(dig(cnpj)); } catch (e) {}
    if (!j || !document.body.contains(el) || el.value) return;
    const re = j.mei ? /\bmei\b|microempreendedor/i : j.simples ? /simples/i : /presumido/i.test(j.regime) ? /presumido/i : /real/i.test(j.regime) ? /\breal\b/i : null;
    const o = re && [...el.options].find(o => re.test(o.text)); if (!o) return;
    el.value = o.value; el.classList.remove('erro', 'falta'); el._auto = true; el.dispatchEvent(new Event('change', { bubbles: true }));
    if (n) n.textContent = '✓ Sugerido pela Receita Federal · CNPJ ' + fmtCnpj(cnpj) + '. Confira.';
  }
  /* ---------- Pré-Contrato no Pré TASK: pesquisa do CNPJ (Receita) e da Inscrição estadual (SEFAZ) ---------- */
  // Como na página de dados do cliente: o CNPJ da empresa preenche os campos vazios da empresa e busca a IE; outro CNPJ
  // (contabilidade etc.) preenche os campos da mesma seção e sugere os sócios no nome do contador. Embaixo da IE ficam
  // "Consultar na SEFAZ" (copia o CNPJ e abre a consulta do Estado) e "Anexar cartão de contribuinte" (lê a IE no aparelho).
  const rotuloDe = el => ((el.closest('.ptf') || el.parentElement).querySelector('span')?.textContent || '').replace(/\*/g, '').trim().toLowerCase();
  const foneFmt = v => { const d = dig(v); return d.length >= 10 ? d.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3') : ''; };
  const cepFmt = v => { const d = dig(v); return d ? d.padStart(8, '0').replace(/^(\d{5})(\d{3})$/, '$1-$2') : ''; };
  const nomeBonito = n => String(n || '').toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()).replace(/\s(D[aeo]s?|E)\s/g, m => m.toLowerCase());
  const CNPJ_E2 = {}, IE_E2 = {};
  const consultaE2 = d => CNPJ_E2[d] || (CNPJ_E2[d] = Promise.resolve(window.cnpjInfo ? window.cnpjInfo(d) : null).then(j => { if (!j) delete CNPJ_E2[d]; return j; }, () => { delete CNPJ_E2[d]; return null; }));
  const corpoAtual = () => document.getElementById('ptCorpo');
  const campoE2 = (root, k) => root && root.querySelector(`[data-pk="${CSS.escape('e2:' + k)}"]`);
  function campoIe(root) { return campoE2(root, 'ie') || [...((root && root.querySelectorAll('[data-e2] input[data-pk]')) || [])].find(i => /inscri[cç][aã]o estadual|^ie\b/.test(rotuloDe(i))); }
  const cnpjEmpresa = root => [(campoE2(root, 'cnpj') || {}).value, C.v2.cnpj, (C.pre.filiais[0] || {}).cnpj, C.leadCnpj, C.p.cnpj].find(x => dig(x).length === 14) || '';
  const ufEmpresa = root => String((campoE2(root, 'uf') || {}).value || C.v2.uf || (C.pre.filiais[0] || {}).uf || '').trim().toUpperCase().slice(0, 2);
  // Preenche um campo vazio (ou qualquer um, se forcar) e avisa o resto do Pré TASK
  function poe(inp, v, forcar) {
    if (!inp || !v || (String(inp.value || '').trim() && !forcar)) return false;
    if (inp.tagName === 'SELECT') { const o = [...inp.options].find(o => o.value && (o.value.toUpperCase() === String(v).toUpperCase() || o.text.toUpperCase() === String(v).toUpperCase())); if (!o) return false; inp.value = o.value; }
    else inp.value = v;
    inp.classList.remove('erro', 'falta'); inp.dispatchEvent(new Event(inp.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    return true;
  }
  function sugerirSocios(inp, socios) {
    const lab = inp.closest('.ptf'); if (!lab) return; lab.querySelector('.ptsoc')?.remove();
    const nomes = (socios || []).map(s => s.nome || s).filter(Boolean).slice(0, 6); if (!nomes.length) return;
    const box = document.createElement('div'); box.className = 'ptsoc'; box.innerHTML = '<small>Sócios na Receita:</small>' + nomes.map(n => `<button type="button">${esc(nomeBonito(n))}</button>`).join('');
    box.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; e.preventDefault(); poe(inp, b.textContent, true); inp.focus(); });
    lab.appendChild(box);
  }
  async function pesquisarCnpjE2(el, msg, forcar) {
    const d = dig(el.value), aviso = (t, cls) => { if (msg) { msg.textContent = t || ''; msg.className = 'ptauto ptcnpjmsg' + (cls ? ' ' + cls : ''); } };
    if (d.length !== 14) { aviso(''); el._busca = ''; return; }
    if (!window.SefazIE.cnpjOk(d)) { aviso('CNPJ inválido. Confira os números.', 'erro'); el._busca = ''; return; }
    if (el._busca === d && !forcar) return; el._busca = d;
    aviso('Pesquisando na Receita…');
    const j = await consultaE2(d);
    if (!document.body.contains(el) || dig(el.value) !== d) return;
    if (!j) { aviso('Não foi possível pesquisar agora. Preencha à mão.', 'erro'); el._busca = ''; return; }
    const corpo = corpoAtual(), grid = el.closest('[data-e2]') || corpo, fone = foneFmt(j.telefone), cep = cepFmt(j.cep);
    let n = 0; const put = (inp, v) => { if (poe(inp, v, forcar)) n++; };
    if (el.dataset.pk === 'e2:cnpj') {
      [['razao', j.razao], ['fantasia', j.fantasia], ['cep', cep], ['logradouro', j.rua], ['numero', j.numero], ['complemento', j.complemento], ['bairro', j.bairro], ['cidade', j.municipio], ['uf', j.uf]].forEach(([k, v]) => put(campoE2(corpo, k), v));
      // Campos criados nos Parâmetros na seção da empresa: telefone e e-mail pelo nome
      grid.querySelectorAll('input[data-pk]').forEach(inp => { if (inp === el || /^e2:(razao|fantasia|cep|logradouro|numero|complemento|bairro|cidade|uf|ie)$/.test(inp.dataset.pk)) return; const t = rotuloDe(inp); if (/telefone|fone|whats/.test(t)) put(inp, fone); else if (/e-?mail/.test(t)) put(inp, j.email); });
      atualizarSefaz(corpo);
      ieE2(d, j.uf, forcar);
      const reg = campoRegime(), rel = reg && campoE2(corpo, reg.k); if (rel && !rel.value) regimeDaReceita(rel, rel.parentElement.querySelector('[data-regnota]'));
    } else {
      grid.querySelectorAll('input[data-pk],select[data-pk],textarea[data-pk]').forEach(inp => {
        if (inp === el) return; const t = rotuloDe(inp);
        if (/nome/.test(t) && /contador|respons/.test(t) && !/cpf|crc/.test(t)) { sugerirSocios(inp, j.socios); return; }
        if (/contador|cpf|crc|respons|cnpj/.test(t)) return;
        let v = '';
        if (/fantasia/.test(t)) v = j.fantasia; else if (/raz[aã]o|nome|empresa/.test(t)) v = j.razao;
        else if (inp.type === 'email' || /e-?mail/.test(t)) v = j.email; else if (/telefone|whats|fone/.test(t)) v = fone;
        else if (/\bcep\b/.test(t)) v = cep; else if (/bairro/.test(t)) v = j.bairro; else if (/cidade|munic/.test(t)) v = j.municipio;
        else if (/^(estado|uf)\b/.test(t)) v = j.uf; else if (/endere|logradouro|rua/.test(t)) v = [j.rua, j.numero].filter(Boolean).join(', ');
        put(inp, v);
      });
    }
    const sit = j.situacao && !/ativa/i.test(j.situacao) ? ' Atenção: situação ' + j.situacao.toUpperCase() + ' na Receita.' : '';
    aviso((n ? '✓ Preenchido pela Receita Federal: ' + j.razao + '. Confira.' : 'Encontrado na Receita: ' + j.razao + '.') + sit, sit ? 'erro' : 'ok');
  }
  // Inscrição estadual pela base pública (CNPJ.ws). Pode demorar: tenta de novo em segundo plano; preenche se o campo ainda estiver vazio.
  function notaIe(t, cls) { const m = corpoAtual()?.querySelector('.ptiemsg'); if (m) { m.textContent = t || ''; m.className = 'ptauto ptiemsg' + (cls ? ' ' + cls : ''); } }
  async function ieE2(d, uf, forcar) {
    const inp = campoIe(corpoAtual()); if (!inp || (inp.value.trim() && !forcar)) return;
    notaIe('Buscando a inscrição estadual na Receita…');
    const vivo = () => !!C && dig(cnpjEmpresa(corpoAtual())) === d;
    const ie = await (IE_E2[d] || (IE_E2[d] = window.SefazIE.ieDaReceita(d, uf, vivo).then(r => { if (r == null) delete IE_E2[d]; return r; })));
    if (!vivo()) return;
    const atual = campoIe(corpoAtual()); if (!atual) return;
    if (ie && poe(atual, ie, forcar)) { notaIe('✓ Inscrição estadual ' + ie + ' preenchida pela Receita. Confira.', 'ok'); return; }
    if (ie) { notaIe(''); return; }
    if (!atual.value.trim()) notaIe(ie === '' ? 'A Receita não traz a inscrição estadual deste CNPJ. Consulte na SEFAZ.' : 'Não deu para buscar a inscrição estadual agora. Consulte na SEFAZ.');
  }
  function atualizarSefaz(corpo) {
    const bt = corpo && corpo.querySelector('[data-sefaz]'); if (!bt) return;
    const uf = ufEmpresa(corpo); bt.querySelector('span').textContent = 'Consultar na SEFAZ' + (window.SefazIE.SINTEGRA[uf] ? ' (' + uf + ')' : '');
  }
  const REGIME_RE = { mei: /\bmei\b|microempreendedor/i, simples: /simples/i, presumido: /presumido/i, real: /\breal\b/i };
  async function lerCartaoE2(file, inp) {
    const corpo = corpoAtual(), c = dig(cnpjEmpresa(corpo));
    notaIe('Lendo o cartão…');
    const r = await window.SefazIE.lerCartao(file, c, t => notaIe(t));
    if (!document.body.contains(inp)) return;
    if (r.outroCnpj) { notaIe('Este documento é de outro CNPJ (' + fmtCnpj(r.cnpjs[0]) + '). Confira se anexou o cartão certo.', 'erro'); return; }
    const alerta = /baixad|suspens|cancelad|inapt|nul|nao habilitad/.test(r.situacao) ? ' Atenção: a situação no cartão consta como ' + r.situacao.toUpperCase() + '.' : '';
    if (r.ie || r.isento) {
      poe(inp, r.isento ? 'ISENTO' : r.ie, true);
      const reg = r.regime && campoRegime(), rel = reg && campoE2(corpo, reg.k);
      if (rel && rel.tagName === 'SELECT' && !rel.value) { const o = [...rel.options].find(o => REGIME_RE[r.regime].test(o.text)); if (o) { rel._auto = true; poe(rel, o.value); const n = rel.parentElement.querySelector('[data-regnota]'); if (n) n.textContent = '✓ Preenchido pelo cartão de contribuinte. Confira.'; } }
      notaIe((r.doNome ? 'Preenchido pelo número que está no nome do arquivo: inscrição estadual ' : '✓ Preenchido pelo cartão: inscrição estadual ') + inp.value + '. Confira.' + alerta, alerta ? 'erro' : 'ok'); return;
    }
    if (r.falhou) notaIe('Não conseguimos ler o arquivo. Digite a inscrição estadual.', 'erro');
    else if (!r.tipo) notaIe('Não deu para ler este tipo de arquivo. Digite a inscrição estadual.' + alerta, 'erro');
    else notaIe('Não encontramos a inscrição estadual neste arquivo' + (r.ocr ? ' (a imagem pode estar pouco nítida)' : '') + '. Digite à mão.' + alerta, 'erro');
  }
  // Texto logo abaixo do CNPJ: não há botão de pesquisa, a consulta à Receita é automática ao digitar
  const dicaCnpj = el => el.closest('[data-e2]') ? 'Digite CNPJ para pesquisa automática' : '';
  function ligarSefaz(corpo) {
    if (!window.SefazIE) return;
    corpo.querySelectorAll('[data-e2] input[data-tipo="cnpj"]').forEach(el => {
      const msg = document.createElement('small'); msg.className = 'ptauto ptcnpjmsg'; msg.setAttribute('role', 'status'); el.after(msg);
      const dica = dicaCnpj(el); if (dica) { const h = document.createElement('small'); h.className = 'ptauto ptcnpjdica'; h.textContent = dica; el.after(h); }
      const vai = forcar => { const d = dig(el.value).slice(0, 14); if (d.length === 14 && el.value !== fmtCnpj(d)) el.value = fmtCnpj(d); pesquisarCnpjE2(el, msg, forcar); };
      el.addEventListener('input', () => vai(false));
      el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); vai(true); } });
    });
    const ie = campoIe(corpo), lab = ie && ie.closest('.ptf');
    if (lab) {
      const box = document.createElement('div'); box.className = 'anpacao ptsefaz';
      box.innerHTML = `<button type="button" data-sefaz><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M10 3a7 7 0 0 1 5.6 11.2l4.6 4.6-1.4 1.4-4.6-4.6A7 7 0 1 1 10 3Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/></svg><span>Consultar na SEFAZ</span></button><button type="button" data-cartao><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M16.5 6.5v10a4.5 4.5 0 0 1-9 0V5a3 3 0 0 1 6 0v10.5a1.5 1.5 0 0 1-3 0V6.5H9v9a3 3 0 0 0 6 0V5a4.5 4.5 0 0 0-9 0v11.5a6 6 0 0 0 12 0v-10Z"/></svg><span>Anexar cartão de contribuinte</span></button>`;
      const nota = document.createElement('small'); nota.className = 'ptauto ptiemsg'; nota.setAttribute('role', 'status');
      const arq = document.createElement('input'); arq.type = 'file'; arq.hidden = true; arq.accept = '.pdf,image/*,.html,.htm,.mht,.mhtml,.txt';
      lab.append(box, nota); lab.after(arq);
      box.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return; e.preventDefault(); e.stopPropagation();
        if (b.dataset.cartao !== undefined) { arq.value = ''; arq.click(); return; }
        // Copia o CNPJ ainda dentro do toque, antes da aba da SEFAZ abrir (depois disso o navegador bloqueia a área de transferência)
        const c = dig(cnpjEmpresa(corpo)), url = window.SefazIE.urlUf(ufEmpresa(corpo));
        if (c.length === 14) {
          const ok = window.SefazIE.copiar(c), certo = () => notaIe('CNPJ ' + fmtCnpj(c) + ' copiado. No site, cole no campo do CNPJ (Ctrl+V ou segure e Colar). Depois anexe aqui o cartão (PDF ou print) para preencher a IE.', 'ok');
          if (ok) certo(); else notaIe('Não deu para copiar sozinho. CNPJ para colar: ' + c + '.');
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c).then(certo, () => {});
        } else notaIe('Informe o CNPJ da empresa para ele ir copiado para o site da SEFAZ.', 'erro');
        window.open(url, '_blank', 'noopener');
      });
      const pegou = () => { const f = arq.files && arq.files[0]; if (f) { arq.value = ''; lerCartaoE2(f, ie); } };
      arq.addEventListener('change', pegou);
      ['dragenter', 'dragover'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add('sobre'); }));
      ['dragleave', 'drop'].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.remove('sobre'); }));
      box.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) lerCartaoE2(f, ie); });
      atualizarSefaz(corpo);
      const ufIn = campoE2(corpo, 'uf'); if (ufIn) ufIn.addEventListener('input', () => atualizarSefaz(corpo));
    }
    // CRC: não há busca automática; link para a consulta oficial do CFC, com o nome do contador já copiado
    corpo.querySelectorAll('[data-e2] input[data-pk]').forEach(inp => {
      if (!/^crc\b/.test(rotuloDe(inp))) return;
      const a = document.createElement('a'); a.className = 'ptcfc'; a.href = 'https://www3.cfc.org.br/spw/ConsultaNacionalCFC/'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Consultar no CFC ↗';
      // Copia o CPF do contador (a consulta do CFC aceita CPF); sem CPF, copia o nome
      const h = document.createElement('small'), DICA = 'Ao tocar, o CPF do contador vai copiado: no site do CFC, cole no campo do CPF e traga o número do registro para cá.';
      h.className = 'ptauto'; h.textContent = DICA;
      a.addEventListener('click', () => {
        const xs = [...(inp.closest('[data-e2]') || corpo).querySelectorAll('input[data-pk]')], t = x => rotuloDe(x);
        const cpf = dig((xs.find(x => /cpf/.test(t(x)) && /contador|respons/.test(t(x))) || xs.find(x => x.dataset.tipo === 'cpf') || {}).value);
        const nome = (xs.find(x => /nome/.test(t(x)) && /contador|respons/.test(t(x))) || {}).value;
        if (cpf.length === 11) { window.SefazIE.copiar(cpf); h.className = 'ptauto ok'; h.textContent = 'CPF ' + cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') + ' copiado. No site do CFC, cole no campo do CPF e traga o número do registro para cá.'; }
        else if (nome && nome.trim()) { window.SefazIE.copiar(nome.trim()); h.className = 'ptauto'; h.textContent = 'Sem o CPF do contador: copiamos o nome. No site do CFC, busque pelo nome e traga o número do registro para cá.'; }
        else { h.className = 'ptauto erro'; h.textContent = 'Preencha o CPF do contador para ele ir copiado para o site do CFC.'; }
      });
      inp.after(a, h);
    });
    // Cadastro direto: o CNPJ da empresa já vem da Implantação. Ao abrir, completa o que faltar (uma vez por CNPJ)
    const el = campoE2(corpo, 'cnpj');
    if (C.direto && el && window.SefazIE.cnpjOk(el.value) && C.e2Pesq !== dig(el.value)) { C.e2Pesq = dig(el.value); pesquisarCnpjE2(el, el.parentElement.querySelector('.ptcnpjmsg'), false); }
  }
  function painelBase(anexos) {
    const P = C.pre, central = P.tipoBase === 'Central', simples = P.tipoBase === 'Simples';
    const f100 = central && P.f100 ? P.filiais.find(f => f.cod === P.f100) : null;
    const tabela = (P.tipoBase ? `<div class="ptscroll"><table class="ptfil"><thead><tr><th>Filial</th><th>Tipo</th><th>CNPJ</th><th>Razão social</th><th>Cidade</th>${central ? '<th>F100</th>' : ''}</tr></thead><tbody>${P.filiais.map((f, i) => linhaFil(f, i, central)).join('')}</tbody></table></div>` : '');
    return painel('base', 'Implantação', '', `<div class="ptsec"><h5>Base</h5><div class="ptgrid">
      <div class="ptf"><span>Tipo de Base <b>*</b></span>${seg('tipoBase', ['Simples', 'Central'], P.tipoBase)}</div>
      <div class="ptf"><span>Inclusão <b>*</b></span>${seg('inclusao', ['Base Nova', 'Filial Nova em Central'], P.inclusao)}</div>
      <div class="ptf"><span>Cliente Potencial + de 5 Unidades <b>*</b></span>${seg('potencial', ['Sim', 'Não'], P.potencial)}</div>
      ${regimeHtml()}
      ${P.inclusao === 'Filial Nova em Central' ? `<label class="ptf"><span>Central que recebe a filial <b>*</b></span>${C.centrais.length ? `<select data-hk="centralExistente"><option value="">Escolha a Central</option>${C.centrais.map(n => `<option${n === P.centralExistente ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : `<input data-hk="centralExistente" value="${esc(P.centralExistente || '')}" placeholder="Nome da Central já existente">`}</label>` : ''}
    </div></div>
    ${blocosBase().map(b => `<div class="ptsec"${b.band ? ' data-ptband' : ''}><h5>${esc(b.titulo)}</h5><div class="ptgrid">${camposHtml(b.campos, '', C.v, C.anx)}</div></div>`).join('')}
    ${central || simples ? `<div class="ptsec"><h5>${central ? 'Central' : 'Posto simples'}${f100 ? `<small>F100 = ${esc(f100.cod)}${f100.cidade ? ' · ' + esc(f100.cidade) : ''}</small>` : ''}</h5><div class="ptgrid">
      ${central ? `<label class="ptf"><span>Nome da Central <b>*</b></span><input data-hk="nome" value="${esc(P.nome || '')}"></label>
      <label class="ptf"><span>Quantidade de Filiais <b>*</b></span><input type="number" min="1" max="60" data-hk="qtd" value="${P.filiais.length || ''}"></label>` : ''}
      ${C.direto && window.anpPesquisa ? `<div class="ptf full ptanp"><span class="anpacao"><button type="button" data-ptanp><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M10 3a7 7 0 0 1 5.6 11.2l4.6 4.6-1.4 1.4-4.6-4.6A7 7 0 1 1 10 3Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/></svg>Pesquisar Cliente ANP</button><small>${central ? 'preenche a primeira filial sem CNPJ, ou acrescenta uma filial' : 'quando não souber o CNPJ'}</small></span><div id="ptAnpBusca" hidden></div></div>` : ''}
      <div class="ptf full"><span>${central ? 'Filiais' : 'Unidade'}</span>${tabela}
        <p class="ptnote">${central ? 'A razão social e a cidade vêm da consulta do CNPJ e podem ser corrigidas. Marque qual filial é a F100: ela aparece no topo e no card do TASK.' : 'A razão social e a cidade vêm da consulta do CNPJ e podem ser corrigidas.'}</p></div>
      ${central ? '' : `<label class="ptf"><span>Nome do Posto <b>*</b></span><input data-hk="nome" value="${esc(P.nome || '')}"></label>`}
    </div></div>` : '<p class="ptnote">Escolha o Tipo de Base para informar o posto ou as filiais.</p>'}
    ${anexos || ''}`);
  }
  function painelProposta() {
    if (C.direto) {
      const ls = C.propostasLivres || [], at = C.propostaVinc || '';
      return painel('proposta', 'Proposta', 'não se aplica ao cadastro direto', `<div class="ptsec"><h5>Sem proposta</h5><div class="ptgrid">
        <p class="ptnote full">Este cadastro foi feito direto no TASK, então a proposta não é obrigatória. Se uma proposta aprovada surgir depois para este cliente, vincule aqui para ela aparecer no card.</p>
        <label class="ptf full"><span>Vincular a uma proposta aprovada</span><select id="ptVinc"><option value="">Nenhuma</option>${ls.map(x => `<option value="${esc(x.id)}"${x.id === at ? ' selected' : ''}>Nº ${esc(x.numero || '')} · ${esc(x.cliente || '')}</option>`).join('')}</select></label>
      </div></div>`);
    }
    const p = C.p, l = (t, v) => v ? `<div class="ptf"><span>${t}</span><div class="ptro">${v}</div></div>` : '';
    return painel('proposta', 'Proposta', 'valores da proposta só para leitura', `<div class="ptsec"><h5>Proposta nº ${esc(p.numero || '')}</h5><div class="ptgrid">
      ${l('Cliente', esc(p.cliente))}${l('CNPJ', esc(fmtCnpj(p.cnpj)))}${l('Cidade', esc(p.cidade))}${l('Contato', esc(p.contato))}${l('Telefone', esc(p.fone))}${l('Vendedor', esc(p.vendedor))}
      ${l('Licenças', brl(p.totLic))}${l('Mensalidade', brl(p.totMen))}${p.implantacao === 'Remota' ? l('Implantação', 'Remota (sem custo)') : p.implantacao === 'Combustível' ? l('Deslocamento', 'Só combustível' + (p.dados && p.dados.km ? ' · ' + Number(p.dados.km).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' km' : '')) : l('Deslocamento', brl(p.totDes))}
      ${l('Aprovada por', p.aprovadoNome ? esc(p.aprovadoNome) + (p.aprovadoCargo ? ' (' + esc(p.aprovadoCargo) + ')' : '') + `<small>${esc(fmtTs(p.aprovadoEm))}</small>` : '')}
      <div class="ptbtns full"><button type="button" data-pta="pdf">Ver proposta (PDF)</button></div></div></div>`);
  }
  function painelE2() {
    const e2 = C.e2;
    if (C.direto) return painel('e2', 'Pré-Contrato', 'preenchido aqui no cadastro direto', '<p class="ptnote">Sem link para o cliente: confirme os dados com ele e preencha aqui. Os campos com * são obrigatórios para o salvar final, como no Pré TASK de uma proposta.</p>' + secs2Cli().map(s => `<div class="ptsec"><h5>${esc(s.titulo)}</h5><div class="ptgrid" data-e2>${camposHtml(s.campos, 'e2:', prefixar(C.v2, 'e2:'), C.anx)}</div></div>`).join(''));
    if (!e2) return painel('e2', 'Pré-Contrato', '', '<p class="ptnote">O cliente ainda não enviou o Pré-Contrato.</p>');
    const hist = (e2.alteracoes || []).slice(-5).reverse().map(a => `<div>${esc(a.por)} alterou ${esc((a.campos || []).join(', '))} em ${esc(new Date(a.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))}</div>`).join('');
    return painel('e2', 'Pré-Contrato', `preenchido pelo cliente${e2.em ? ' em ' + esc(fmtTs(e2.em)) : ''} · editável`, secs2Cli().map(s => `<div class="ptsec"><h5>${esc(s.titulo)}</h5><div class="ptgrid" data-e2>${camposHtml(s.campos, 'e2:', prefixar(C.v2, 'e2:'), C.anx)}</div></div>`).join('') + (hist ? `<div class="pthist">${hist}</div>` : '<p class="ptnote">Alterar um dado aqui corrige o dado original e registra quem alterou.</p>'));
  }
  // Dados complementares: o que saiu do formulário do cliente (não entra no contrato) e o vendedor completa aqui
  // Cada seção do Pré-Contrato com campos marcados "Pré TASK" vira um item próprio do menu, com o título da seção
  const tituloComp = t => String(t || 'Dados complementares').replace(/:\s*$/, '').trim();
  // Seção do Pré-Contrato que entra dentro de uma seção do Pré TASK em vez de ter item próprio:
  // a escolhida no campo pretaskEm (título da seção do Pré TASK) ou, por padrão, Dados bancários / boleto dentro de TEF / PIX
  function destinoComp(sc) {
    const ps = secoesParam(C.cfg4);
    let v = sc.setor;
    if (!v && /boleto|banc[aá]ri/i.test(sc.titulo || '')) { const t = ps.find(x => /tef|pix/i.test(x.titulo || '')); v = t ? (t.id || t.titulo) : ''; } // padrão até o ADM escolher
    return alvoSetor(v || 'proprio', ps, -1);
  }
  function blocoComp(sc) {
    const tit = tituloComp(sc.titulo);
    if (!C.e2) return `<div class="ptsec"><h5>${esc(tit)}</h5><div class="ptgrid"><p class="ptnote full">Libera quando o cliente enviar o Pré-Contrato.</p></div></div>`;
    return `<div class="ptsec"><h5>${esc(tit)}<small>do Pré-Contrato · não entra no contrato</small></h5><div class="ptgrid" data-e2>${camposHtml(sc.campos, 'e2:', prefixar(C.v2, 'e2:'), C.anx)}</div></div>`;
  }
  const compDentro = i => secs2Comp().filter(sc => destinoComp(sc) === i);
  // Blocos que entram dentro de Status e datas ou Implantação: seções do Pré TASK e do Pré-Contrato com esse setor
  const dentroDe = (alvo, ps) => ps.map((s, i) => setorSec(ps, i) === alvo ? painelParam(s, i, true) : '').join('') + compDentro(alvo).map(blocoComp).join('');
  function painelE2c() {
    return secs2Comp().map((sc, i) => {
      if (destinoComp(sc) !== 'proprio') return '';
      const id = 'e2c' + i, tit = tituloComp(sc.titulo);
      if (!C.e2) return painel(id, tit, 'dados complementares', '<p class="ptnote">Libera quando o cliente enviar o Pré-Contrato.</p>');
      return painel(id, tit, 'completados pelo vendedor · não entram no contrato', '<p class="ptnote">Estes dados não são pedidos ao cliente no link do Pré-Contrato. Confirme com ele e preencha aqui.</p>' + `<div class="ptsec"><h5>${esc(tit)}</h5><div class="ptgrid" data-e2>${camposHtml(sc.campos, 'e2:', prefixar(C.v2, 'e2:'), C.anx)}</div></div>`);
    }).join('');
  }
  const prefixar = (o, pre) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [pre + k, v]));
  function painelContrato() {
    if (C.direto) return painel('contrato', 'Contrato', 'não se aplica ao cadastro direto', '<p class="ptnote">Cadastro direto no TASK: o contrato não é obrigatório para seguir com a implantação.</p>');
    const p = C.p, l = (t, v) => `<div class="ptf"><span>${t}</span><div class="ptro">${v || '<small>—</small>'}</div></div>`;
    return painel('contrato', 'Contrato', 'contrato aceito fica só para leitura', `<div class="ptsec"><h5>Aceite do contrato</h5><div class="ptgrid">
      ${l('Aceito por', esc(p.ctAceitoNome))}${l('CPF', esc(p.ctAceitoCpf))}${l('Cargo', esc(p.ctAceitoCargo))}${l('Data do aceite', esc(fmtTs(p.ctAceitoEm)))}
      ${C.verContrato && p.ctEm ? '<div class="ptbtns full"><button type="button" data-pta="contrato">Ver contrato (PDF)</button></div>' : ''}</div></div>`);
  }
  function painelParam(s, i, emb) {
    const fils = C.pre.filiais, tit = String(s.titulo || '').replace(/:\s*$/, '');
    // dentro da aba Base e posto: sem painel próprio, só o bloco
    const psX = secoesParam(C.cfg4), extra = emb ? compDentro(i).map(blocoComp).join('') : psX.map((x, k) => k !== i && setorSec(psX, k) === i ? painelParam(x, k, true) : '').join('') + compDentro(i).map(blocoComp).join('');
    const pn = emb ? (id, t, sub, html) => `<div class="ptemb" data-ptp="${id}">${html}${extra}</div>` : (id, t, sub, html) => painel(id, t, sub, html + extra);
    if (!porFilial(s)) return pn('p' + i, s.titulo, 'Parâmetros Pré TASK', `<div class="ptsec"><h5>${esc(tit)}</h5><div class="ptgrid">${camposHtml(s.campos, '', C.v, C.anx)}</div></div>`);
    const at = Math.min(C.filAtiva, fils.length - 1);
    return pn('p' + i, s.titulo, 'preenchido filial por filial', `<div class="pttabs" role="tablist">${fils.map((f, j) => `<button type="button" role="tab" data-ptfi="${j}" aria-selected="${j === at}">${esc([f.cod, f.tipo].filter(Boolean).join(' - '))}</button>`).join('')}</div>` +
      fils.map((f, j) => `<div class="ptsec" data-ptfp="${j}"${j === at ? '' : ' hidden'}><h5>${esc(s.titulo)}<small>${esc([f.cod, f.razao].filter(Boolean).join(' · '))}</small></h5><div class="ptgrid">${j ? `<div class="ptbtns full"><button type="button" data-ptcopia="${j}" data-sec="${i}">Copiar dados da ${esc(fils[0].cod)}</button></div>` : ''}${camposHtml(s.campos, 'f' + j + '__', C.v, C.anx)}</div></div>`).join(''));
  }
  function painelAnexos() {
    const an = C.an, pend = (C.p && C.p.e2Pendentes) || (C.e2 && C.e2.pendentes) || [];
    const avisoPend = pend.length ? `<p class="ptnote" style="color:var(--danger);font-weight:600;margin-bottom:6px">Pendente: ${esc(pend.join(', '))}. O cliente vai enviar depois pelo link do Pré-Contrato.</p>` : '';
    return painel('anexos', 'Anexos', 'todos os arquivos recebidos nesta proposta', avisoPend + (an.length ? `<div class="ptanx"><div class="lista">${an.map(a => `<button type="button" class="it" data-ptanexo="${esc(a.id)}" data-nome="${esc(a.nome)}">⬇ ${esc(a.nome)} <small>${esc(a.campo || '')} · ${Math.max(1, Math.round((a.tamanho || 0) / 1024))} KB</small></button>`).join('')}</div></div>` : '<p class="ptnote">Nenhum anexo.</p>'));
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
  // Guarda o que já foi digitado nos campos dos parâmetros e do Pré-Contrato antes de redesenhar
  function colherCampos() {
    const corpo = document.getElementById('ptCorpo'); if (!corpo) return;
    corpo.querySelectorAll('[data-pk]').forEach(el => { const k = el.dataset.pk; const alvo = k.startsWith('e2:') ? C.v2 : C.v, kk = k.startsWith('e2:') ? k.slice(3) : k; let v = el.dataset.seg ? (el.querySelector('[aria-pressed=true]')?.dataset.v || '') : el.value; const o = corpo.querySelector(`[data-outro="${CSS.escape(k)}"]`); if (o && !o.hidden && o.value.trim()) v += ': ' + o.value.trim(); alvo[kk] = v; });
  }
  // Simples: "Posto - <razão social>" da unidade (sem razão, o nome fantasia). Central: "Central " + nome fantasia
  function nomeSugerido(tipo) { const f = ((C.v2 && C.v2.fantasia) || C.p.cliente || '').trim(); if (tipo === 'Simples') return nomePosto((C.pre.filiais[0] || {}).razao) || f; return !f || !tipo ? '' : /^central\b/i.test(f) ? f : 'Central ' + f; }
  // O nome do posto ainda é sugestão (pode ser trocado sozinho)? Vazio, o nome fantasia/cliente antigo ou "Posto - <razão anterior>"
  function nomeEhSugestao(nome, razaoAntes) { const n = String(nome || '').trim(); return !n || n === nomePosto(razaoAntes) || n === ((C.v2 && C.v2.fantasia) || '').trim() || n === (C.p.cliente || '').trim(); }
  // Posto simples: ao achar (ou corrigir) a razão social da unidade, o Nome do Posto vira "Posto - <razão>", se ainda for sugestão
  // tr.dataset.raz guarda a razão social anterior, para reconhecer "Posto - <razão anterior>" como sugestão
  function sugerirNomePosto(tr, soVazio) {
    if (!C || C.pre.tipoBase !== 'Simples' || +tr.dataset.fi !== 0) return;
    const ni = document.querySelector('#ptCorpo [data-hk="nome"]'), raz = tr.querySelector('[data-ff="razao"]').value.trim(), razaoAntes = tr.dataset.raz || '';
    if (!ni || !raz) return; tr.dataset.raz = raz;
    if (soVazio ? ni.value.trim() : !nomeEhSugestao(ni.value, razaoAntes)) return;
    ni.value = nomePosto(raz); C.pre.nome = ni.value; ni.classList.remove('erro', 'falta');
  }
  function redesenhar() { setTimeout(() => { if (!C) return; colherCabecalho(); colherCampos(); bandeiraDoE2(); desenhar(); }, 0); }
  function cabecalhoMudou(ev) {
    const g = ev.target.closest('[data-hk]'); if (!g) return;
    const k = g.dataset.hk, antes = C.pre[k]; colherCabecalho();
    if (k === 'tipoBase' && C.pre.tipoBase !== antes) {
      // Nome sugerido: Simples = nome fantasia; Central = "Central " + nome fantasia (troca só se ainda for a sugestão do outro tipo)
      const sugAntes = nomeSugerido(antes);
      if (C.pre.tipoBase === 'Simples') { C.pre.filiais = C.pre.filiais.slice(0, 1); C.pre.f100 = ''; if (!C.pre.filiais.length) C.pre.filiais.push({ cod: 'F1', tipo: 'Posto', cnpj: fmtCnpj(C.v2.cnpj || C.p.cnpj), razao: C.v2.razao || '', cidade: C.v2.cidade || '', uf: C.v2.uf || '' }); }
      if (C.pre.tipoBase === 'Central' && !C.pre.filiais.length) C.pre.filiais.push({ cod: 'F1', tipo: 'Posto', cnpj: '', razao: '', cidade: '', uf: '' });
      if (!C.pre.nome || C.pre.nome === sugAntes) C.pre.nome = nomeSugerido(C.pre.tipoBase);
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
      const rz = tr.querySelector('[data-ff="razao"]'); tr.dataset.raz = rz.value.trim();
      rz.addEventListener('input', e => { delete e.target.dataset.auto; sugerirNomePosto(tr); });
      const r = tr.querySelector('[data-ff="f100"]'); if (r) r.addEventListener('change', () => setTimeout(() => { if (!C) return; colherCabecalho(); colherCampos(); desenhar(); mostrar('base'); }, 0));
      const d = dig(c.value); const f = C.pre.filiais[+tr.dataset.fi]; if (d.length === 14 && f && !f.info) buscarFil(tr, d, true);
    });
    corpo.addEventListener('click', ev => {
      const t = ev.target.closest('[data-ptfi]'); if (t) { C.filAtiva = +t.dataset.ptfi; const p = t.closest('[data-ptp]'); p.querySelectorAll('[data-ptfi]').forEach(b => b.setAttribute('aria-selected', String(b === t))); p.querySelectorAll('[data-ptfp]').forEach(x => { x.hidden = x.dataset.ptfp !== t.dataset.ptfi; }); return; }
      const cp = ev.target.closest('[data-ptcopia]'); if (cp) { colherCampos(); const j = cp.dataset.ptcopia, s = secoesParam(C.cfg4)[+cp.dataset.sec]; const ks = []; s.campos.forEach(c => { ks.push(c.k, c.k + '__det'); Object.values(c.cond || {}).forEach(l => (l || []).forEach(x => ks.push(x.k))); }); ks.forEach(k => { if (C.v['f0__' + k] !== undefined && !Array.isArray(C.v['f0__' + k])) C.v['f' + j + '__' + k] = C.v['f0__' + k]; }); colherCabecalho(); desenhar(); mostrar(C.aba); msg('Dados copiados. Confira e salve.'); return; }
      if (ev.target.closest('[data-ptanp]')) return pesquisarAnp();
      const a = ev.target.closest('[data-pta]'); if (a) { if (a.dataset.pta === 'pdf') return verPdf(a); if (a.dataset.pta === 'contrato' && C.verContrato) return C.verContrato(C.pid, a); }
      const ax = ev.target.closest('[data-ptanexo]'); if (ax) return baixar(ax);
    });
  }
  // Cadastro direto: pesquisa na base de postos da ANP (sem o CNPJ). O posto escolhido preenche CNPJ, razão social
  // e cidade da unidade (Posto simples, com a sugestão "Posto - <razão>" do Nome do Posto) ou da primeira filial
  // sem CNPJ (Central; com todas preenchidas, acrescenta uma filial). A Receita completa depois.
  function pesquisarAnp() {
    const box = document.getElementById('ptAnpBusca'); if (!box) return;
    const uf = v => (String(v || '').match(/[-\/]\s*([A-Za-z]{2})\s*$/) || [])[1] || '';
    const cids = [...document.querySelectorAll('#ptCorpo .ptfil [data-ff="cidade"]')].map(x => uf(x.value)).filter(Boolean);
    window.anpPesquisa(box, cids[0] || uf(C.p.cidade), async cnpj => {
      if (!C) return;
      let p = null; try { p = await window.anpPosto(cnpj); } catch (e) {}
      if (!C) return;
      const razao = (p && p.razao) || '', cidade = (p && p.municipio) || '', ufp = (p && p.uf) || '';
      const trs = [...document.querySelectorAll('#ptCorpo .ptfil tbody tr')];
      const ja = C.pre.tipoBase === 'Central' && trs.find(t => dig(t.querySelector('[data-ff="cnpj"]').value) === dig(cnpj));
      if (ja) { msg('Este posto já está na filial ' + (ja.querySelector('[data-ff="cod"]').value || '') + '.'); return; }
      const tr = C.pre.tipoBase === 'Central' ? trs.find(t => !dig(t.querySelector('[data-ff="cnpj"]').value)) : trs[0];
      if (!tr) {
        // Central com todas as filiais preenchidas: acrescenta uma (até 60) já com os dados da ANP
        colherCabecalho(); const L = C.pre.filiais; if (L.length >= 60) { msg('A Central já tem 60 filiais.'); return; }
        L.push({ cod: 'F' + (L.length + 1), tipo: 'Posto', cnpj: fmtCnpj(cnpj), razao, cidade, uf: ufp });
        colherCampos(); desenhar(); mostrar('base'); msg('Filial ' + L[L.length - 1].cod + ' acrescentada com os dados da ANP. Confira.'); return;
      }
      const c = tr.querySelector('[data-ff="cnpj"]'), r = tr.querySelector('[data-ff="razao"]'), cid = tr.querySelector('[data-ff="cidade"]');
      c.value = fmtCnpj(cnpj); c.classList.remove('erro'); delete tr.dataset.busca;
      if (razao) { r.value = razao; r.dataset.auto = '1'; } else if (r.dataset.auto === '1') r.value = '';
      cid.value = cidade ? [cidade, ufp].filter(Boolean).join(' - ') : '';
      sugerirNomePosto(tr);
      msg(p ? (C.pre.tipoBase === 'Central' ? 'Filial ' + (tr.querySelector('[data-ff="cod"]').value || '') + ' preenchida' : 'Preenchido') + ' com os dados da ANP. Confira.' : '');
      buscarFil(tr, dig(cnpj));
      c.focus();
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
    sugerirNomePosto(tr, silencioso); // abrindo a tela, só preenche se o nome estiver vazio
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
      const { F, db } = C, R = raizC(), aid = bt.dataset.ptanexo, meta = (await F.getDoc(F.doc(db, ...R, 'anexos', aid))).data();
      const ps = await F.getDocs(F.collection(db, ...R, 'anexos', aid, 'partes'));
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
    // 2) Pré-Contrato (só o que mudou é gravado)
    const e2Lido = { valores: {}, legiveis: {} }; let faltaE2 = null, faltaE2c = null;
    if (C.e2) secs2().forEach(s => { const r = lerCampos(corpo, s.campos.filter(c => !ehComp(c)), 'e2:', C.anx), rc = lerCampos(corpo, s.campos.filter(ehComp), 'e2:', C.anx); [r, rc].forEach(x => { Object.assign(e2Lido.valores, x.valores); Object.assign(e2Lido.legiveis, x.legiveis); }); faltaE2 = faltaE2 || r.falta; faltaE2c = faltaE2c || rc.falta; });
    const fE2 = faltaE2 ? [['e2', 'campos obrigatórios do Pré-Contrato']] : [], pnC = faltaE2c && faltaE2c.closest('[data-ptp]'), fE2c = faltaE2c ? [[pnC ? pnC.dataset.ptp : 'e2c0', 'campos obrigatórios de ' + (pnC ? (pnC.querySelector('h4') || {}).firstChild?.textContent || 'Dados complementares' : 'Dados complementares')]] : [];
    faltas.push(...(C.direto ? fE2.concat(fE2c) : fE2c.concat(fE2))); // na ordem do menu
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
    blocosBase().forEach(b => { const rb = lerCampos(corpo, b.campos, '', C.anx); Object.assign(valores, rb.valores); Object.assign(campos, rb.legiveis); if (rb.falta) faltas.push(['base', 'campos de ' + b.titulo]);
      // anexos dos blocos da aba (ex.: arquivos da conversão quando o sistema legado é Outros), com o nome original
      b.campos.forEach(c => { if (c.tipo !== 'anexo' || rb.valores[c.k] === undefined) return; const st = C.anx[c.k]; if (!st) return; valores[c.k] = st.salvos; st.novos.forEach(f => fila.push({ f, lista: st.salvos, campo: c.label, nome: f.name })); }); });
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
      // marcas do menu acompanham o preenchimento, sem precisar salvar
      try { colherCampos(); const M = marcadores(); document.querySelectorAll('#ptWrap .dgnav[data-pt]').forEach(b => { const n = M[b.dataset.pt], old = b.querySelector('.dgm'); if (!n || !old) return; const t = document.createElement('span'); t.innerHTML = n; old.replaceWith(t.firstChild); }); } catch (e) {}
    }, ja ? 0 : 350);
  }
  async function salvar(parcial) {
    if (!C || !C.p) return;
    const bt = document.getElementById(parcial ? 'ptParcial' : 'ptSalvar');
    const { P, central, faltas, e2Lido, valores, campos, fila, ps, dadosFil, abaP } = validar(!parcial);
    if (!parcial && faltas.length) {
      const [aba] = faltas[0]; mostrar(aba); validar(true); // marca de novo (abrir o Pré-Contrato pode redesenhar a tela)
      if (abaP && aba === abaP.aba && abaP.fi != null) document.querySelector(`#ptCorpo [data-ptp="${aba}"] [data-ptfi="${abaP.fi}"]`)?.click();
      msg(faltaTxt(faltas) + ' Para guardar assim mesmo, use "Salvar parcial".'); return;
    }
    if (parcial && faltas.some(x => /senha do certificado/.test(x[1]))) { msg('A senha do certificado não confere. Corrija ou remova o certificado para salvar.'); return; }
    // Cadastro direto: o salvar parcial já cria o card no TASK, então exige o mínimo para identificar o cliente:
    // Tipo de Base e, conforme o tipo, Nome do Posto + CNPJ da unidade (Simples) ou Nome da Central + CNPJ de cada filial (Central)
    if (parcial && C.direto) {
      const ess = faltas.filter(x => x[0] === 'base' && /^(Tipo de Base|Nome do Posto|Nome da Central|CNPJ da )/.test(x[1]));
      if (ess.length) {
        mostrar('base'); const corpo = document.getElementById('ptCorpo');
        ess.forEach(([, t]) => {
          const el = t === 'Tipo de Base' ? corpo.querySelector('[data-hk="tipoBase"]') : /^Nome/.test(t) ? corpo.querySelector('[data-hk="nome"]')
            : [...corpo.querySelectorAll('.ptfil tbody tr')].find(tr => 'CNPJ da ' + (C.pre.filiais[+tr.dataset.fi] || {}).cod === t)?.querySelector('[data-ff="cnpj"]');
          if (el) el.classList.add('erro');
        });
        const prim = corpo.querySelector('[data-hk="tipoBase"].erro, .ptfil .erro, [data-hk="nome"].erro'); if (prim) { prim.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (prim.focus && prim.tagName === 'INPUT') prim.focus({ preventScroll: true }); }
        msg(faltaTxt(ess) + ' No cadastro direto, o salvar parcial precisa do Tipo de Base e ' + (C.pre.tipoBase === 'Central' ? 'do nome da Central e do CNPJ de cada filial.' : C.pre.tipoBase ? 'do CNPJ e do nome do posto.' : 'do CNPJ e do nome do posto ou da Central.'));
        return;
      }
    }
    bt.disabled = true; document.querySelectorAll('#ptCorpo [data-ptparc]').forEach(x => { x.disabled = true; }); msg(parcial ? 'Salvando parcial…' : 'Salvando…');
    try {
      const { F, db, pid, perfil } = C;
      await subirAnexos(F, db, raizC(), fila, msg);
      Object.values(C.anx).forEach(st => { st.novos = []; });
      const por = perfil.nome || perfil.email, filiais = P.filiais.map((f, j) => ({ cod: f.cod, tipo: f.tipo, cnpj: fmtCnpj(f.cnpj), razao: f.razao, cidade: f.cidade, uf: f.uf, info: f.info && dig(f.info.cnpj) === dig(f.cnpj) ? f.info : (f.info && !f.info.cnpj ? f.info : null), dados: Object.keys(dadosFil[j]).length ? dadosFil[j] : (f.dados || null), f100: central && f.cod === P.f100 }));
      const pre = { parcial: !!parcial, status: P.status || 'fut', dataBase: P.dataBase || '', start: P.start || '', modalidade: P.modalidade, tipoBase: P.tipoBase, inclusao: P.inclusao, centralExistente: P.inclusao === 'Filial Nova em Central' ? P.centralExistente : '', potencial: P.potencial, nome: P.nome, f100: central ? P.f100 : '', filiais };
      // Campos legíveis do cabeçalho (o TASK e a mensagem usam este texto)
      const cab = { 'Status': STATUS[pre.status], 'Data da Base': fmtD(pre.dataBase), 'Data do Start': fmtD(pre.start), 'Modalidade': pre.modalidade, 'Tipo de Base': pre.tipoBase, 'Inclusão': pre.inclusao, 'Central que recebe a filial': pre.centralExistente, 'Cliente Potencial + de 5 Unidades': pre.potencial };
      cab[central ? 'Nome da Central' : 'Nome do Posto'] = pre.nome; if (central) { cab['Quantidade de Filiais'] = String(filiais.length); cab['F100'] = pre.f100; }
      cab[central ? 'Filiais' : 'Unidade'] = filiais.map(f => [f.cod, f.tipo, f.cnpj, f.razao, [f.cidade, f.uf].filter(Boolean).join(' - ')].filter(Boolean).join(' - ') + (f.f100 ? ' (F100)' : '')).join('\n');
      Object.keys(cab).forEach(k => { if (!cab[k]) delete cab[k]; });
      valores.base__fil = filiais;
      const secoes = [{ titulo: 'Status', labels: ['Status', 'Data da Base', 'Data do Start', 'Modalidade'] }, { titulo: 'Base', labels: ['Tipo de Base', 'Inclusão', 'Central que recebe a filial', 'Cliente Potencial + de 5 Unidades'] }]
        // Conversão de Dados logo abaixo da Base, antes do Posto simples / Central (mesma ordem do formulário)
        .concat(blocosBase().map(b => ({ titulo: b.titulo, labels: b.campos.flatMap(c => [c.label, c.label + ' - ' + (c.detalhe || '')]) })))
        .concat([{ titulo: central ? 'Central' : 'Posto simples', labels: ['Nome da Central', 'Nome do Posto', 'Quantidade de Filiais', 'F100', 'Filiais', 'Unidade'] }]).concat(ps.map(s => ({ titulo: s.titulo, labels: s.campos.flatMap(c => [c.label, ...Object.values(c.cond || {}).flatMap(l => (l || []).map(x => x.label))]) })));
      const doc = { pre, parcial: !!parcial, valores, campos: { ...cab, ...campos }, secoes, em: F.serverTimestamp(), por, porUid: perfil.uid, porEmail: perfil.email || '' };
      if (C.direto) { await salvarDireto(doc, pre, e2Lido, parcial, por); return; }
      await F.setDoc(F.doc(db, 'propostas', pid, 'etapa4', 'dados'), doc);
      // Pré-Contrato alterado: corrige o original e registra quem alterou
      if (C.e2) {
        const antes = C.e2.valores || {}, mud = []; const novosV = { ...antes };
        secs2().forEach(s => s.campos.forEach(c => { const k = 'e2:' + c.k, nv = e2Lido.valores[k] || ''; if (String(antes[c.k] || '') !== String(nv)) { mud.push(c.label); delete novosV[c.k + '__de']; if (nv) novosV[c.k] = nv; else delete novosV[c.k]; } const dk = c.k + '__det'; if (e2Lido.valores['e2:' + dk] !== undefined && antes[dk] !== e2Lido.valores['e2:' + dk]) novosV[dk] = e2Lido.valores['e2:' + dk]; }));
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
          const up = { preOk: true, status: pre.status, finalizado: fin, dataBase: pre.dataBase, start: pre.start, modalidade: pre.modalidade, central: centralDoPre(pre), respCadastro: { uid: perfil.uid, nome: por, email: perfil.email || '' }, preSync: Date.now(), alteradoEm: F.serverTimestamp(), alteradoPor: por };
          if (C.task && fin !== !!C.task.finalizado) up.finalizadoEm = fin ? F.serverTimestamp() : null;
          const ref = F.doc(db, 'tasks', tid), ex = await F.getDoc(ref);
          if (ex.exists() && !ex.data().removido) { await F.updateDoc(ref, up); taskOk = true; if (ex.data().preOk !== true && window.TK_aoPronto) window.TK_aoPronto(tid, ex.data().apelido || C.p.cliente || ''); }
        } catch (e) { console.warn('Pré TASK: card do TASK', e); }
      }
      // Salvar parcial depois de um salvar final: o card volta a mostrar "Pré TASK" (só esse campo muda)
      if (parcial && (C.task || C.podeTask)) {
        try { const ref = F.doc(db, 'tasks', (C.task && C.task.id) || pid), ex = await F.getDoc(ref); if (ex.exists() && !ex.data().removido && ex.data().preOk !== false) await F.updateDoc(ref, { preOk: false }); } catch (e) { console.warn('Pré TASK: card do TASK', e); }
      }
      C.e4 = { ...doc, em: { toDate: () => new Date() } };
      if (C.aoSalvar && !parcial) C.aoSalvar(pre);
      colherCampos(); desenhar();
      msg(parcial ? 'Salvo parcial. Quando tudo estiver preenchido, use o salvar final.' : 'Pré TASK salvo' + (taskOk ? ' e card do TASK atualizado.' : '.'));
    } catch (err) { msg('Não foi possível salvar (' + (err.code || err.message) + ').'); }
    finally { bt.disabled = false; document.querySelectorAll('#ptCorpo [data-ptparc]').forEach(x => { x.disabled = false; }); }
  }
  // Cadastro direto: grava o Pré TASK dentro do próprio card do TASK (cria o card no primeiro salvar)
  async function salvarDireto(doc, pre, e2Lido, parcial, por) {
    const { F, db, perfil } = C, ref = F.doc(db, 'tasks', C.tid), fin = pre.status === 'fin';
    const v2 = {}; Object.entries(e2Lido.valores || {}).forEach(([k, x]) => { if (x !== '' && x != null) v2[k.replace(/^e2:/, '')] = x; });
    const f1 = (pre.filiais || []).find(f => f.f100) || (pre.filiais || [])[0] || {};
    const vinc = (document.getElementById('ptVinc') || {}).value; if (vinc !== undefined) C.propostaVinc = vinc || '';
    const pv = (C.propostasLivres || []).find(x => x.id === C.propostaVinc);
    const card = {
      origem: 'direto', pre4: { ...doc, v2 }, preOk: !parcial, preSync: Date.now(),
      apelido: pre.nome || C.p.cliente || f1.razao || '', razao: f1.razao || v2.razao || '', cnpj: dig(f1.cnpj || ''), cidade: f1.cidade || v2.cidade || '', uf: String(f1.uf || v2.uf || '').toUpperCase(),
      contato: v2.respNome || (C.task && C.task.contato) || '', email: v2.respEmail || v2.finEmail || (C.task && C.task.email) || '', fone: v2.respFone || (C.task && C.task.fone) || '',
      status: pre.status, finalizado: fin, dataBase: pre.dataBase, start: pre.start, modalidade: pre.modalidade, central: centralDoPre(pre),
      respCadastro: { uid: perfil.uid, nome: por, email: perfil.email || '' }, propostaVinc: C.propostaVinc || '', propostaNumero: pv ? pv.numero || '' : '',
      alteradoEm: F.serverTimestamp(), alteradoPor: por
    };
    if (C.novo) Object.assign(card, { criado: F.serverTimestamp(), criadoPor: por, checklists: [], respStart: null, obs: '' });
    if (C.task && fin !== !!C.task.finalizado) card.finalizadoEm = fin ? F.serverTimestamp() : null;
    const jaPronto = !!(C.task && C.task.preOk === true);
    await F.setDoc(ref, card, { merge: true });
    if (!parcial && !jaPronto && window.TK_aoPronto) window.TK_aoPronto(C.tid, card.apelido);
    C.novo = false; C.task = { ...(C.task || {}), ...card, id: C.tid };
    C.e4 = { ...doc, em: { toDate: () => new Date() } }; C.v2 = v2;
    document.getElementById('ptTit').textContent = 'Pré TASK · cadastro direto' + (card.apelido ? ' · ' + card.apelido : '');
    if (C.aoSalvar && !parcial) C.aoSalvar(pre);
    colherCampos(); desenhar();
    msg(parcial ? 'Salvo parcial. O card já está no TASK como "Em preparação".' : 'Cadastro salvo. O card está pronto para as equipes.');
  }
  // Central no formato do card do TASK
  function centralDoPre(pre) {
    if (!pre || !pre.tipoBase) return null;
    return { tipo: pre.tipoBase === 'Simples' ? 'simples' : 'central', nome: pre.nome || '', f100: pre.f100 || '', inclusao: pre.inclusao || '', centralExistente: pre.centralExistente || '', potencial: pre.potencial || '', filiais: (pre.filiais || []).map(f => ({ cod: f.cod, tipo: f.tipo, cnpj: f.cnpj, razao: f.razao || '', cidade: f.cidade || '', uf: f.uf || '', info: f.info || null, dados: f.dados || null, f100: !!f.f100 })) };
  }

  window.PreTask = { abrir, centralDoPre, migrar, STATUS };
})();

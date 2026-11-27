// Telemetria: monitoramento de postos em construção. As pesquisas são sempre por Estado.
// Estados integrados abrem o Radar de Novos Postos (radar.js); os outros mostram "em breve". Quem não é administrador
// só vê os seus Estados de atuação (usuarios/{uid}.estados).
(function () {
  const ATIVOS = ['MT', 'RS', 'SC', 'PR', 'SP', 'SE', 'PA', 'TO', 'RO', 'GO', 'MS'];
  const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
  const sel = document.getElementById('teleUf'), area = document.getElementById('teleArea');
  if (!sel || !area) return;
  const NOMES = { MT: 'Mato Grosso', RS: 'Rio Grande do Sul', SC: 'Santa Catarina', PR: 'Paraná', SP: 'São Paulo', SE: 'Sergipe', PA: 'Pará', TO: 'Tocantins', RO: 'Rondônia', GO: 'Goiás', MS: 'Mato Grosso do Sul' };
  const lista = us => { const t = us.map(u => `${NOMES[u] || u} (${u})`); return t.length > 1 ? t.slice(0, -1).join(', ') + ' e ' + t.at(-1) : t[0] || ''; };
  // quem não é administrador vê só os Estados de atuação do cadastro (usuarios/{uid}.estados, a mesma regra do CRM)
  let meus = null; // null = todos (administrador ou antes do login)
  const ufsVisiveis = () => meus ? UFS.filter(u => meus.includes(u)) : UFS;
  const inicial = () => {
    if (meus && !meus.length) return '<span class="pill">Sem Estado</span><b>Nenhum Estado de atuação no seu cadastro</b><small>Peça ao administrador para marcar os seus Estados de atuação em Administração → Usuários.</small>';
    const ativos = ATIVOS.filter(u => ufsVisiveis().includes(u));
    if (meus) return `<span class="pill">Em construção</span><b>Escolha um Estado</b><small>${ativos.length ? `Seus Estados já monitorados: ${lista(ativos)}.` : 'Nenhum dos seus Estados de atuação está monitorado ainda.'}${ufsVisiveis().length > ativos.length ? ' Os outros entram depois.' : ''}</small>`;
    return `<span class="pill">Em construção</span><b>Escolha um Estado</b><small>Já monitorados: ${lista(ATIVOS)}. Os outros Estados entram depois.</small>`;
  };
  function montar() {
    const vis = ufsVisiveis(), ord = [...ATIVOS.filter(u => vis.includes(u)), ...vis.filter(u => !ATIVOS.includes(u))];
    const atual = sel.value;
    sel.innerHTML = '<option value="">Escolha o Estado…</option>' + ord.map(u => ATIVOS.includes(u) ? `<option value="${u}">${u}</option>` : `<option value="${u}" disabled>${u} (em breve)</option>`).join('');
    const ativos = ord.filter(u => ATIVOS.includes(u));
    // mantém o Estado escolhido se ele continua na lista; com um só Estado monitorado, já abre nele
    sel.value = ativos.includes(atual) ? atual : meus && ativos.length === 1 ? ativos[0] : '';
    sel.dispatchEvent(new Event('change'));
  }
  window.addEventListener('shotgun-crm', e => { const { perfil, admin } = e.detail || {}; meus = admin ? null : (Array.isArray(perfil?.estados) ? perfil.estados : []).map(u => String(u).toUpperCase()); setTimeout(montar); });
  window.addEventListener('argo-sair', () => { meus = null; montar(); });
  sel.addEventListener('change', () => {
    const uf = sel.value;
    if (uf && !ufsVisiveis().includes(uf)) { sel.value = ''; return sel.dispatchEvent(new Event('change')); }
    const cid = document.getElementById('teleCidWrap'); if (cid && !ATIVOS.includes(uf)) cid.hidden = true; // o filtro de Cidade é preenchido pelo Radar
    if (ATIVOS.includes(uf) && window.radarMT) return window.radarMT.mostrar(area, uf); // Radar de Novos Postos (radar.js)
    area.className = 'teleembreve';
    area.innerHTML = uf
      ? `<span class="pill">Em construção</span><b>Postos em construção em ${uf}</b><small>A integração de ${uf} está em construção. Assim que o funcionamento for definido, a lista de postos aparece aqui.</small>`
      : inicial();
  });
  montar();
})();

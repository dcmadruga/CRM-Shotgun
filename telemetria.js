// Telemetria: monitoramento de postos em construção. As pesquisas são sempre por Estado.
// Estados integrados (MT, RS e SC) abrem o Radar de Novos Postos (radar.js); os outros mostram "em breve".
(function () {
  const ATIVOS = ['MT', 'RS', 'SC'];
  const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
  const sel = document.getElementById('teleUf'), area = document.getElementById('teleArea');
  if (!sel || !area) return;
  const ord = [...ATIVOS, ...UFS.filter(u => !ATIVOS.includes(u))];
  sel.insertAdjacentHTML('beforeend', ord.map(u => ATIVOS.includes(u) ? `<option value="${u}">${u}</option>` : `<option value="${u}" disabled>${u} (em breve)</option>`).join(''));
  sel.addEventListener('change', () => {
    const uf = sel.value;
    if (ATIVOS.includes(uf) && window.radarMT) return window.radarMT.mostrar(area, uf); // Radar de Novos Postos (radar.js)
    area.className = 'teleembreve';
    area.innerHTML = uf
      ? `<span class="pill">Em construção</span><b>Postos em construção em ${uf}</b><small>A integração de ${uf} está em construção. Assim que o funcionamento for definido, a lista de postos aparece aqui.</small>`
      : '<span class="pill">Em construção</span><b>Escolha um Estado</b><small>Já monitorados: Mato Grosso (MT), Rio Grande do Sul (RS) e Santa Catarina (SC). Os outros Estados entram depois.</small>';
  });
})();

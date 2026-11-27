// Etapa 4 - Dados Referência Implantação: preenchida pelo vendedor depois do contrato aceito.
// O administrador altera pela aba "Parâmetros Referência Implantação"; isto é só o ponto de partida.
window.ETAPA4_PADRAO = {
  secoes: [
    { id: 'contato', titulo: 'Contato e agenda', campos: [
      { k: 'contatoImpl', label: 'Contato do cliente para a implantação', tipo: 'texto', req: true, show: true },
      { k: 'contatoFone', label: 'Telefone / WhatsApp do contato', tipo: 'telefone', req: true, show: true },
      { k: 'dataCombinada', label: 'Data combinada com o cliente para o start', tipo: 'data', req: true, show: true },
      { k: 'horario', label: 'Melhor horário para a implantação', tipo: 'opcoes', req: false, show: true, opcoes: 'Manhã, Tarde, Noite, Madrugada, Qualquer horário' }
    ] },
    { id: 'comercial', titulo: 'O que foi vendido', campos: [
      { k: 'modulos', label: 'Módulos e serviços vendidos', tipo: 'textolongo', req: true, show: true },
      { k: 'negociado', label: 'Condições especiais negociadas (descontos, brindes, prazos)', tipo: 'textolongo', req: false, show: true }
    ] },
    { id: 'operacao', titulo: 'Operação do cliente', campos: [
      { k: 'sistemaAnterior', label: 'Sistema anterior e migração de dados', tipo: 'textolongo', req: false, show: true },
      { k: 'particularidades', label: 'Particularidades do cliente (rede, filiais, operação)', tipo: 'textolongo', req: false, show: true },
      { k: 'obsImpl', label: 'Observações para a equipe de implantação', tipo: 'textolongo', req: false, show: true }
    ] }
  ]
};
// TEF / PIX: um item só no menu do Pré TASK, com dois blocos dentro, TEF e PIX (v273).
// Nos parâmetros já publicados, a seção "TEF / PIX" ganha o título de bloco "TEF" (mesmos campos, então o que já foi
// preenchido continua lá) e a seção "PIX" entra logo depois, com o Setor de Validação apontando para TEF / PIX (é o que
// a coloca dentro do mesmo item). Também desfaz a v271, que tinha virado dois itens ("TEF" com "antes", e "PIX").
// Uma vez só (marca tefPixJunto): se o ADM mudar ou apagar a seção PIX e publicar, fica como ele deixou.
(function () {
  const PIX = () => ({ id: 'pix', titulo: 'PIX', campos: [
    { k: 'pixIntegrado', label: 'PIX integrado ao PDV', tipo: 'simnao', req: true, show: true },
    { k: 'pixBanco', label: 'Banco ou adquirente do PIX', tipo: 'texto', req: true, show: true },
    { k: 'pixTipoChave', label: 'Tipo de chave PIX', tipo: 'opcoes', req: true, show: true, opcoes: 'CNPJ, E-mail, Telefone, Chave aleatória' },
    { k: 'pixChave', label: 'Chave PIX', tipo: 'texto', req: true, show: true }
  ] });
  const tefPix = x => /\btef\b/i.test(x || '') && /\bpix\b/i.test(x || '');
  window.pretaskCompletar = cfg => {
    if (!cfg || !Array.isArray(cfg.secoes) || cfg.tefPixJunto) return cfg;
    const L = cfg.secoes, t = L.find(s => tefPix(s.titulo)) || L.find(s => tefPix(s.antes));
    if (t) {
      if (tefPix(t.antes)) t.titulo = t.antes; delete t.antes;
      if (!t.bloco) t.bloco = 'TEF';
      let px = L.find(x => x !== t && (x.id === 'pix' || /^\s*pix\s*$/i.test(x.titulo || '')));
      if (!px && !cfg.tefPixSeparado) { px = PIX(); L.splice(L.indexOf(t) + 1, 0, px); }
      if (px) { px.setor = t.id || String(t.titulo).trim(); if (t.porFilial === false) px.porFilial = false; else delete px.porFilial; }
      cfg.tefPixMudou = true;
    }
    delete cfg.tefPixSeparado; cfg.tefPixJunto = true;
    return cfg;
  };
  window.ETAPA4_PADRAO.tefPixJunto = true;
})();

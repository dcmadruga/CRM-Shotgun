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
// TEF e PIX eram uma seção só ("TEF / PIX") até a v271. Nos parâmetros já publicados, a seção vira "TEF" (com os
// mesmos campos, então o que já foi preenchido continua lá) e a seção "PIX" entra logo depois. Uma vez só (marca
// tefPixSeparado): se o ADM mudar ou apagar a seção PIX e publicar, fica como ele deixou.
(function () {
  const PIX = () => ({ id: 'pix', titulo: 'PIX', campos: [
    { k: 'pixIntegrado', label: 'PIX integrado ao PDV', tipo: 'simnao', req: true, show: true },
    { k: 'pixBanco', label: 'Banco ou adquirente do PIX', tipo: 'texto', req: true, show: true },
    { k: 'pixTipoChave', label: 'Tipo de chave PIX', tipo: 'opcoes', req: true, show: true, opcoes: 'CNPJ, E-mail, Telefone, Chave aleatória' },
    { k: 'pixChave', label: 'Chave PIX', tipo: 'texto', req: true, show: true }
  ] });
  window.pretaskCompletar = cfg => {
    if (!cfg || !Array.isArray(cfg.secoes) || cfg.tefPixSeparado) return cfg;
    const i = cfg.secoes.findIndex(s => /\btef\b/i.test(s.titulo || '') && /\bpix\b/i.test(s.titulo || ''));
    if (i >= 0) {
      const s = cfg.secoes[i], pix = PIX();
      s.antes = s.titulo; s.titulo = 'TEF'; // "antes": quem apontava para "TEF / PIX" (Setor de Validação) passa a achar o TEF
      if (s.porFilial === false) pix.porFilial = false;
      if (s.setor && s.setor !== 'proprio') pix.setor = s.setor;
      if (!cfg.secoes.some(x => /^\s*pix\s*$/i.test(x.titulo || '') || x.id === 'pix')) cfg.secoes.splice(i + 1, 0, pix);
      cfg.tefPixMudou = true;
    }
    cfg.tefPixSeparado = true;
    return cfg;
  };
  window.ETAPA4_PADRAO.tefPixSeparado = true;
})();

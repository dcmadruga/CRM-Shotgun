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

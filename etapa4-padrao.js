// Etapa 4 - Dados Referência Implantação: preenchida pelo vendedor depois do contrato aceito.
// Tipos: texto, telefone, data, opcoes, textolongo
window.ETAPA4_CAMPOS = [
  { k: 'contatoImpl', label: 'Contato do cliente para a implantação', tipo: 'texto', req: true },
  { k: 'contatoFone', label: 'Telefone / WhatsApp do contato', tipo: 'telefone', req: true },
  { k: 'dataCombinada', label: 'Data combinada com o cliente para o start', tipo: 'data', req: true },
  { k: 'horario', label: 'Melhor horário para a implantação', tipo: 'opcoes', opcoes: 'Manhã, Tarde, Noite, Madrugada, Qualquer horário' },
  { k: 'modulos', label: 'Módulos e serviços vendidos', tipo: 'textolongo', req: true },
  { k: 'negociado', label: 'Condições especiais negociadas (descontos, brindes, prazos)', tipo: 'textolongo' },
  { k: 'sistemaAnterior', label: 'Sistema anterior e migração de dados', tipo: 'textolongo' },
  { k: 'particularidades', label: 'Particularidades do cliente (rede, filiais, operação)', tipo: 'textolongo' },
  { k: 'obsImpl', label: 'Observações para a equipe de implantação', tipo: 'textolongo' }
];

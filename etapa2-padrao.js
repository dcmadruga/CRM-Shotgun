// Formulário padrão da Etapa 2 (Dados Primários: só o que o contrato usa; o resto o vendedor completa na Pré TASK).
// O administrador altera pela aba "Etapa 2" do app; isto é só o ponto de partida.
// pretask: true = o cliente não vê o campo; o vendedor completa na Pré TASK (fica guardado junto com os Dados Primários).
// Tipos: texto, email, telefone, cpf, cnpj, cep, numero, data, simnao, opcoes, textolongo
window.ETAPA2_PADRAO = {
  titulo: 'Dados para o contrato',
  intro: 'Obrigado por aprovar a proposta! Preencha os dados abaixo para elaborarmos o seu contrato. Ao terminar, toque em Enviar pelo WhatsApp.',
  msgEnvio: 'Olá {contato}! Obrigado por aprovar a proposta nº {numero}. Para elaborarmos o seu contrato, preencha os dados neste link:\n{link}\n\n{vendedor} - Argo',
  contratoSocial: true,
  divisaoPretask: 1,
  final: 'Pronto! O WhatsApp abriu com os seus dados. Confira e toque em enviar.',
  secoes: [
    { id: 'empresa', titulo: 'Empresa', campos: [
      { k: 'cnpj', label: 'CNPJ', tipo: 'cnpj', req: true, show: true, fixo: true },
      { k: 'razao', label: 'Razão social', tipo: 'texto', req: true, show: true, fixo: true },
      { k: 'fantasia', label: 'Nome fantasia', tipo: 'texto', req: false, show: true, pretask: true },
      { k: 'ie', label: 'Inscrição estadual', tipo: 'texto', req: true, show: true, ph: 'ou ISENTO', pretask: true },
      { k: 'cep', label: 'CEP', tipo: 'cep', req: true, show: true },
      { k: 'logradouro', label: 'Endereço', tipo: 'texto', req: true, show: true, full: true },
      { k: 'numero', label: 'Número', tipo: 'texto', req: true, show: true },
      { k: 'complemento', label: 'Complemento', tipo: 'texto', req: false, show: true },
      { k: 'bairro', label: 'Bairro', tipo: 'texto', req: true, show: true },
      { k: 'cidade', label: 'Cidade', tipo: 'texto', req: true, show: true },
      { k: 'uf', label: 'UF', tipo: 'texto', req: true, show: true }
    ] },
    { id: 'responsavel', titulo: 'Responsável legal', campos: [
      { k: 'respNome', label: 'Nome completo', tipo: 'texto', req: true, show: true },
      { k: 'respCpf', label: 'CPF', tipo: 'cpf', req: true, show: true },
      { k: 'respRg', label: 'RG ou CNH', tipo: 'rg', req: true, show: true },
      { k: 'respEstadoCivil', label: 'Estado civil', tipo: 'opcoes', req: false, show: true, opcoes: 'Solteiro(a), Casado(a), Divorciado(a), Viúvo(a), União estável', pretask: true },
      { k: 'respCargo', label: 'Cargo', tipo: 'texto', req: true, show: true, pretask: true },
      { k: 'respEmail', label: 'E-mail', tipo: 'email', req: true, show: true, pretask: true },
      { k: 'respFone', label: 'Telefone / WhatsApp', tipo: 'telefone', req: true, show: true, pretask: true },
      { k: 'respEndereco', label: 'Endereço residencial', tipo: 'texto', req: false, show: true, full: true }
    ] },
    { id: 'financeiro', titulo: 'Financeiro', campos: [
      { k: 'finNome', label: 'Nome do contato', tipo: 'texto', req: true, show: true, pretask: true },
      { k: 'finEmail', label: 'E-mail para boleto e nota fiscal', tipo: 'email', req: true, show: true, pretask: true },
      { k: 'finFone', label: 'Telefone', tipo: 'telefone', req: true, show: true, pretask: true },
      { k: 'vencimento', label: 'Dia de vencimento da mensalidade', tipo: 'opcoes', req: true, show: true, opcoes: '5, 10, 15, 20, 25', pretask: true }
    ] },
    { id: 'tecnico', titulo: 'Contato técnico no posto', campos: [
      { k: 'tecNome', label: 'Nome', tipo: 'texto', req: true, show: true, pretask: true },
      { k: 'tecFone', label: 'Telefone / WhatsApp', tipo: 'telefone', req: true, show: true, pretask: true }
    ] },
    { id: 'operacao', titulo: 'Operação', campos: [
      { k: 'pdvFixos', label: 'Quantidade de PDVs fixos', tipo: 'numero', req: true, show: true, pretask: true },
      { k: 'pdvMoveis', label: 'Quantidade de PDVs móveis', tipo: 'numero', req: false, show: true, pretask: true },
      { k: 'tef', label: 'Usa TEF (cartão integrado)?', tipo: 'simnao', req: true, show: true, pretask: true },
      { k: 'sistemaAtual', label: 'Sistema atual (que será substituído)', tipo: 'texto', req: false, show: true, pretask: true },
      { k: 'obs', label: 'Observações', tipo: 'textolongo', req: false, show: true, full: true, pretask: true }
    ] }
  ]
};
window.ETAPA2_TIPOS = { texto: 'Texto', textolongo: 'Texto longo', numero: 'Número', data: 'Data', email: 'E-mail', telefone: 'Telefone', cpf: 'CPF', rg: 'RG', cnpj: 'CNPJ', cep: 'CEP', simnao: 'Sim / Não', opcoes: 'Lista de opções', arquivo: 'Anexo (arquivos)' };

// Formulário padrão da Etapa 2 (dados complementares obrigatórios).
// O administrador altera pela aba "Etapa 2" do app; isto é só o ponto de partida.
// Tipos: texto, email, telefone, cpf, cnpj, cep, numero, data, simnao, opcoes, textolongo
window.ETAPA2_PADRAO = {
  titulo: 'Dados complementares obrigatórios',
  intro: 'Obrigado por aprovar a proposta! Preencha os dados abaixo para darmos início à implantação. Ao terminar, toque em Enviar pelo WhatsApp.',
  msgEnvio: 'Olá {contato}! Obrigado por aprovar a proposta nº {numero}. Para iniciarmos a implantação, preencha os dados complementares obrigatórios neste link:\n{link}\n\n{vendedor} - Argo',
  contratoSocial: true,
  final: 'Pronto! O WhatsApp abriu com os seus dados. Confira e toque em enviar.',
  secoes: [
    { id: 'empresa', titulo: 'Empresa', campos: [
      { k: 'cnpj', label: 'CNPJ', tipo: 'cnpj', req: true, show: true, fixo: true },
      { k: 'razao', label: 'Razão social', tipo: 'texto', req: true, show: true, fixo: true },
      { k: 'fantasia', label: 'Nome fantasia', tipo: 'texto', req: false, show: true },
      { k: 'ie', label: 'Inscrição estadual', tipo: 'texto', req: true, show: true, ph: 'ou ISENTO' },
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
      { k: 'respEstadoCivil', label: 'Estado civil', tipo: 'opcoes', req: false, show: true, opcoes: 'Solteiro(a), Casado(a), Divorciado(a), Viúvo(a), União estável' },
      { k: 'respCargo', label: 'Cargo', tipo: 'texto', req: true, show: true },
      { k: 'respEmail', label: 'E-mail', tipo: 'email', req: true, show: true },
      { k: 'respFone', label: 'Telefone / WhatsApp', tipo: 'telefone', req: true, show: true },
      { k: 'respEndereco', label: 'Endereço residencial', tipo: 'texto', req: false, show: true, full: true }
    ] },
    { id: 'financeiro', titulo: 'Financeiro', campos: [
      { k: 'finNome', label: 'Nome do contato', tipo: 'texto', req: true, show: true },
      { k: 'finEmail', label: 'E-mail para boleto e nota fiscal', tipo: 'email', req: true, show: true },
      { k: 'finFone', label: 'Telefone', tipo: 'telefone', req: true, show: true },
      { k: 'vencimento', label: 'Dia de vencimento da mensalidade', tipo: 'opcoes', req: true, show: true, opcoes: '5, 10, 15, 20, 25' }
    ] },
    { id: 'tecnico', titulo: 'Contato técnico no posto', campos: [
      { k: 'tecNome', label: 'Nome', tipo: 'texto', req: true, show: true },
      { k: 'tecFone', label: 'Telefone / WhatsApp', tipo: 'telefone', req: true, show: true }
    ] },
    { id: 'operacao', titulo: 'Operação', campos: [
      { k: 'pdvFixos', label: 'Quantidade de PDVs fixos', tipo: 'numero', req: true, show: true },
      { k: 'pdvMoveis', label: 'Quantidade de PDVs móveis', tipo: 'numero', req: false, show: true },
      { k: 'tef', label: 'Usa TEF (cartão integrado)?', tipo: 'simnao', req: true, show: true },
      { k: 'sistemaAtual', label: 'Sistema atual (que será substituído)', tipo: 'texto', req: false, show: true },
      { k: 'dataImpl', label: 'Data desejada para a implantação', tipo: 'data', req: true, show: true },
      { k: 'obs', label: 'Observações', tipo: 'textolongo', req: false, show: true, full: true }
    ] }
  ]
};
window.ETAPA2_TIPOS = { texto: 'Texto', textolongo: 'Texto longo', numero: 'Número', data: 'Data', email: 'E-mail', telefone: 'Telefone', cpf: 'CPF', rg: 'RG', cnpj: 'CNPJ', cep: 'CEP', simnao: 'Sim / Não', opcoes: 'Lista de opções', arquivo: 'Anexo (arquivos)' };

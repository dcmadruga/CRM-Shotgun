// Modelo padrão da Etapa 3 (contrato). O administrador altera pela aba "Parâmetros Contrato";
// isto é só o ponto de partida. Marcadores entre chaves, como {razao}, são trocados pelos dados
// da proposta e da Etapa 2 na hora de gerar o contrato. Linha começando com "# " vira título.
window.ETAPA3_PADRAO = {
  titulo: 'Contrato de Licença de Uso de Software e Prestação de Serviços',
  msgEnvio: 'Olá {contato}! Recebemos os dados complementares da proposta nº {numero}. Segue o contrato para você ler e dar o aceite:\n{link}\n\n{vendedor} - Argo',
  textoAceite: 'Li o contrato e concordo com todas as cláusulas, em nome da empresa contratante.',
  final: 'Contrato aceito. Obrigado! Seu consultor já foi avisado e vai combinar a implantação.',
  argo: { razao: '', cnpj: '', endereco: '', representante: '', foro: '' },
  modelo: `(MODELO PROVISÓRIO: substitua este texto pelo contrato da Argo em Parâmetros Contrato)

Contrato nº {numero}

CONTRATADA: {argo_razao}, inscrita no CNPJ sob o nº {argo_cnpj}, com sede em {argo_endereco}, neste ato representada por {argo_representante}.

CONTRATANTE: {razao}, nome fantasia {fantasia}, inscrita no CNPJ sob o nº {cnpj}, inscrição estadual {ie}, com sede em {endereco_cliente}, neste ato representada por {respNome}, {respCargo}, CPF {respCpf}.

As partes acima identificadas têm entre si justo e contratado o seguinte:

# CLÁUSULA 1 - OBJETO
1.1. Licença de uso do sistema Argo e prestação dos serviços de implantação, suporte e manutenção, conforme a proposta comercial nº {numero}, que faz parte deste contrato.

# CLÁUSULA 2 - LICENÇAS
2.1. Pela licença de uso, a CONTRATANTE pagará o valor de {total_licencas}, em parcela única, referente aos itens:
{itens_licencas}

# CLÁUSULA 3 - MENSALIDADE
3.1. Pelos serviços de suporte e manutenção, a CONTRATANTE pagará mensalmente o valor de {total_mensalidade}, referente aos itens:
{itens_mensalidades}
3.2. A mensalidade vence todo dia {vencimento} de cada mês. Boletos e notas fiscais serão enviados para {finEmail}.

# CLÁUSULA 4 - IMPLANTAÇÃO
4.1. A implantação será feita em {pdvFixos} PDV(s) fixo(s), com data desejada em {dataImpl}. O deslocamento da equipe de implantação tem o valor de {total_deslocamento}.
4.2. O contato técnico da CONTRATANTE no posto é {tecNome}, telefone {tecFone}.

# CLÁUSULA 5 - VIGÊNCIA
5.1. Este contrato vigora por prazo indeterminado a partir do aceite eletrônico, podendo ser rescindido por qualquer das partes com aviso prévio de 30 (trinta) dias.

# CLÁUSULA 6 - FORO
6.1. Fica eleito o foro da comarca de {argo_foro} para resolver qualquer questão deste contrato.

{cidade_cliente}, {data_extenso}.`
};

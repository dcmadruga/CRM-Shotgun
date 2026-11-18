// Modelo padrão da Etapa 3 (contrato da Argo). O administrador altera pela aba "Parâmetros Contrato".
// Marcadores entre chaves, como {razao}, são trocados pelos dados da proposta e da Etapa 2 na hora
// de gerar o contrato. Linha começando com "# " vira título.
window.ETAPA3_PADRAO = {
  titulo: 'Contrato de Licenciamento de Uso de Programa de Informática e de Prestação de Serviços de Instalação e Manutenção do Sistema por Prazo Determinado',
  msgEnvio: 'Olá {contato}! Recebemos os dados complementares da proposta nº {numero}. Segue o contrato para você ler e dar o aceite:\n{link}\n\n{vendedor} - Argo',
  textoAceite: 'Li o contrato e concordo com todas as cláusulas, em nome da empresa contratante.',
  final: 'Contrato aceito. Obrigado! Seu consultor já foi avisado e vai combinar a implantação.',
  argo: { razao: 'ARGO SISTEMAS LTDA.', cnpj: '24.961.335/0001-34', endereco: 'Rua Domingos Oliva dos Santos, 90, Oitavo andar, CEP 95012-320, Bairro Sanvitto, Caxias do Sul/RS', representante: 'Rodrigo Grillo Policastro', foro: 'Caxias do Sul/RS' },
  modelo: `Contrato referente à proposta nº {numero}

CONTRATANTE: {razao}, pessoa jurídica de direito privado, devidamente inscrita no CNPJ sob o nº {cnpj}, com sede na {endereco_cliente}, neste ato representada por {respNome}, brasileiro(a), portador(a) do CPF nº {respCpf} e RG {rg_responsavel}, com endereço na {endereco_responsavel}.

CONTRATADA: ARGO SISTEMAS LTDA., inscrita no CNPJ nº 24.961.335/0001-34, com sede na Rua DOMINGOS OLIVA DOS SANTOS, 90, Oitavo andar, CEP 95012-320, Bairro Sanvitto, Caxias do Sul - RS, neste ato representada por RODRIGO GRILLO POLICASTRO, brasileiro, casado, administrador de empresas, inscrito no CPF/MF sob o nº 004.611.810-10, portador da carteira de identidade RG nº 1074407659, com endereço na Rua Domingos Santos Oliva, 90, Oitavo andar, CEP 95012-320, Bairro Sanvitto, Caxias do Sul - RS, (PP - LUISA CARLA VANZIN, brasileira, solteira, inscrita no CPF sob o nº 802.033.880-20, portadora da carteira de identidade RG nº 1074065581, com endereço na Av. São Leopoldo, nº 203/302, Bairro São Leopoldo, Caxias do Sul/RS - CEP 95097-350).

LOCAL E DATA: A licença referente a este contrato será instalada na data prevista de {dataImpl}.

# DO OBJETO DA COMPRA E VENDA E DA PRESTAÇÃO DE SERVIÇOS

Cláusula 1ª: O presente instrumento tem como objeto, a venda do direito de uso por prazo determinado, oneroso, intransferível e não exclusivo de 01 (um) SOFTWARE denominado ARGO GERENCIADOR e ARGO PDV de propriedade da CONTRATADA para desempenho das atividades empresariais do CONTRATANTE.

Cláusula 2ª: O software é MULTIUSUÁRIO, podendo ser utilizado, por mais de 01 (um) terminal, desde que, pertencente à mesma empresa CONTRATANTE (mesmo CNPJ) e vinculado diretamente ao mesmo servidor de dados.

Cláusula 3ª: O objeto do presente instrumento com sua respectiva versão, será requerido on-line, via acesso remoto e após o devido pagamento será entregue o software com todos os programas executáveis (códigos objetos).

Cláusula 4ª: Todas as características estruturais e funcionais com as especificações quanto à versão e potencialidades do software contratado, bem como as configurações mínimas de hardware necessárias ao apropriado funcionamento do software, são fornecidas para a contratante.

Cláusula 5ª: Fica estabelecido que as futuras atualizações, caso sejam de interesse do CONTRATANTE, serão sem ônus, mediante ao agendamento prévio efetuado.

Cláusula 6ª: Considerar-se-á como aceite de todos os termos deste contrato, o pagamento da fatura pelo CONTRATANTE, obrigando-se desde então as partes contratadas. O uso dos serviços ofertados configurará a aceitação tácita dos termos contratuais estabelecidos neste instrumento.

Cláusula 7ª: As partes estabelecem que, em caso de aumento da carga tributária sobre a prestação de serviços efetuada pela Contratada, a Contratada repassará o custo do aumento da carga tributária à Contratante, sem necessidade de aceitação e aviso prévio, não constituindo em aumento do valor de serviços, apenas na atualização do custo da atividade.

# DO PREÇO, FORMA DE PAGAMENTO E EMISSÃO DA NOTA FISCAL CORRESPONDENTE

Cláusula 8ª: O CONTRATANTE pagará a CONTRATADA a título de licenciamento os seguintes valores a serem cobrados através de boleto bancário a ser emitido pela CONTRATADA:
{itens_licencas}
Total: {total_licencas}, a serem pagos uma única vez durante a validade do contrato.

Cláusula 9ª: Obriga-se ainda o CONTRATANTE a pagar mensalmente ao CONTRATADO, referente taxa de manutenção mensal que engloba os serviços descritos na cláusula 4ª e seus Parágrafos a ser realizado até o dia 5 de cada mês vencendo, através de boleto bancário e apresentação de nota fiscal via e-mail, a ser emitido pela CONTRATADA:
{itens_mensalidades}
Total mensal: {total_mensalidade}.

Cláusula 10ª: Referida taxa de manutenção será reajustada de acordo com o reajuste do IGPM ou IPCA, o que for mais alto, sempre repassado anualmente em JANEIRO.

Cláusula 11ª: O CONTRATANTE, deverá pagar o valor correspondente ao nº de horas técnicas necessárias para a instalação, deslocamento e hospedagem, cujo valor da hora será fornecido pela CONTRATADA no momento da contratação e deverá ser efetuado em depósito bancário, após a finalização das instalações.

Cláusula 12ª: Os valores descritos nas Cláusulas 7 e 8 que não forem tempestivamente pagos, ficarão sujeitos a correção monetária de acordo com a variação do IGP-M/FGV, contados a partir da data do vencimento até a data do efetivo pagamento, bem como multa de 2% (dois por cento) sobre o montante atualizado, e juros de mora de 1% (um por cento) ao mês pró-rata, contados a partir do vencimento.

Cláusula 13ª: O não pagamento das mensalidades em suas datas próprias acarretará, após o 5º dia útil do vencimento, o bloqueio/suspensão imediato dos serviços prestados pela CONTRATADA, no que concerne ao software objeto do presente instrumento, bem como os demais serviços por ele habitualmente prestados ao CONTRATANTE.

# DO PRAZO, RENOVAÇÃO E RESCISÃO

Cláusula 14ª: O presente instrumento vigorará pelo prazo mínimo de 01 (um) ano a contar da data do pagamento do boleto bancário que será emitido pela CONTRATADA em até 03 (três) dias após o devido ACEITE ON LINE efetuado pelo CONTRATANTE, com a renovação condicionada ao pagamento da anuidade ou mensalidade do exercício seguinte.

# DOS SERVIÇOS E DA MANUTENÇÃO

Cláusula 15ª: A CONTRATADA prestará assistência técnica, quando se fizer necessário, neste caso no período agendado, conforme a natureza e a complexidade do serviço relatado.
a) Os serviços serão realizados por profissionais habilitados, online, para manter a agilidade e baixo custo ao CONTRATANTE e a CONTRATADA dará manutenção apenas no que se refere ao SISTEMA GERENCIAL.
b) Para o fim de realização da manutenção descrita no caput do presente artigo, correrão por conta do CONTRATANTE todos os custos e despesas eventualmente suportadas pela CONTRATADA e seus prepostos, tais como transporte, viagem, alimentação e estadia, de forma direta, ou, por reembolso das despesas.

# DAS OBRIGAÇÕES DA CONTRATADA

Cláusula 16ª: A CONTRATADA mediante contraprestação mensal obriga-se a:
a) Realizar a instalação / implantação do Software, objeto do presente instrumento, no(s) servidor(es) do CONTRATANTE;
b) Realizar o treinamento dos indivíduos / usuários indicados pelo CONTRATANTE que irão utilizar o Software;
c) Promover as devidas correções no que concerne às falhas e/ou impropriedades do software, bem como atualizar o mesmo, por razão de erro não detectado anteriormente;
d) Fornecer suporte técnico ao CONTRATANTE, ou qualquer outro atendimento ou consulta, referente ao software gerencial ARGO GERENCIAL, de segunda-feira à sexta-feira, das 08:00hs às 12:00hs e das 13:00hs às 18:00hs e referente ao ARGO PDV, durante 24 horas por dia, 7 dias por semana, para questões em que a CONTRATANTE estiver impossibilitada de faturar.
e) Não divulgar, transferir, fornecer ou ceder, a qualquer título, quaisquer dados ou informações do CONTRATANTE e de seus clientes, contidos no banco de dados e/ou obtidos por força do presente instrumento.
f) A CONTRATANTE, autoriza a CONTRATADA, a divulgar sua marca para possíveis novos clientes da CONTRATADA, e a realizar visitas in loco para demonstrações.
g) A CONTRATANTE, compromete-se com a confidencialidade e particularidade dos valores negociados e isenções acordadas entre as partes e autoriza a CONTRATADA, a cobrar tais isenções caso seja descumprido.

# DAS OBRIGAÇÕES DO CONTRATANTE

Cláusula 17ª: O CONTRATANTE obriga-se a:
a) Remunerar a CONTRATADA, nos termos descritos na cláusula 2ª e parágrafos;
b) Utilizar o sistema contratado de acordo com suas finalidades e exigências técnicas;
c) Disponibilizar o meio adequado para a implantação e utilização do (s) software (s), tais como: hardware, rede, pessoas capacitadas, entre outros;
d) Responsabilizar-se legalmente pelos dados e informações armazenados no sistema contratado;
e) Arcar com os prejuízos advindos da danificação permanente e irreparável de banco de dados quando estes advierem por sua própria responsabilidade (não efetuação de backups, danos físicos em unidades de armazenamento, vírus);
f) Responsabilizar-se por qualquer infração legal, nos âmbitos civil, penal, autoral e todos os demais, que, eventualmente, venha a ser cometida com a utilização do software contratado;

Cláusula 18ª: É vedado ainda ao CONTRATANTE, sem prévia e escrita autorização da CONTRATADA:
a) Divulgar, revelar ou disponibilizar o software, objeto do presente instrumento, a qualquer terceiro, salvo de acordo com o expressamente previsto neste contrato;
b) Utilizar, vender, distribuir, sublicenciar, alugar, arrendar, emprestar, dar, dispor, ceder ou de qualquer forma transferir total ou parcialmente o software objeto deste contrato e/ou quaisquer direitos a ele relativos salvo se e de acordo com o expressamente previsto neste instrumento;
c) Copiar, adaptar, aprimorar, alterar, corrigir, traduzir, atualizar, desenvolver novas versões ou elaborar obras derivadas do software, objeto deste contrato, ou ainda de qualquer de suas partes e componentes salvo se e de acordo com o expressamente previsto neste contrato;
d) Desmontar, descompilar, fazer engenharia reversa do software, ou por intermédio de qualquer outra forma, obter, acessar ou tentar obter ou acessar o código-fonte do software e/ou qualquer dado ou informação confidencial relativa ao software, objeto do presente contrato;
e) Remover os avisos de direitos autorais ou quaisquer outros avisos de direitos de propriedade contidos no software, objeto do presente instrumento;
PARÁGRAFO 1º: A ocorrência de tais hipóteses previstas acima acarretará a aplicação de multa, equivalente a 10 (dez) vezes o valor do presente instrumento, sem prejuízo das perdas e danos e do direito da CONTRATADA de rescindir o presente contrato imediatamente.
PARÁGRAFO 2º: A transferência pelo CONTRATANTE a terceiros, a qualquer título, da posse ou propriedade de qualquer equipamento no qual esteja instalado o software, objeto do presente, não implicará cessão ou transferência da licença de uso conferida ao mesmo, ficando condicionada a contratação de nova licença de uso;

# DA PROPRIEDADE INTELECTUAL E CONFIDENCIALIDADE

Cláusula 19ª: Todos os direitos e propriedade intelectual no tocante ao software, objeto do presente contrato, são e permanecerão na propriedade exclusiva da CONTRATADA, de forma que os direitos autorais e outros direitos de propriedade intelectual relativos ao mesmo são iguais aos conferidos às obras literárias nos moldes da legislação de direitos autorais vigentes no país, conforme expressa determinação do Artigo 2º e Parágrafos da Lei 9.609/98.
a) O CONTRATANTE obriga-se a guardar e a manter o sigilo e a confidencialidade de todas as informações e/ou dados de natureza confidencial, que lhe seja divulgado pela CONTRATADA ou aos quais venha a ter acesso sob e em função deste contrato.
b) A CONTRATADA obriga-se a guardar e a manter o sigilo e a confidencialidade de todas as informações e/ou dados de natureza confidencial, que lhe seja divulgado pela CONTRATANTE ou aos quais venha a ter acesso sob e em função deste contrato, obrigando-se inclusive com a pena de multa de 3 vezes o valor contratado, sob a qual, inclusive o administrador, responde pessoalmente pelo pagamento.
c) O CONTRATANTE e A CONTRATADA obrigam-se ainda a utilizar informações referentes ao objeto deste contrato, apenas e tão somente o estritamente necessário para o desempenho de suas atividades, adotando ainda todas as precauções necessárias para evitar que tais dados/informações sejam utilizadas, reproduzidas, publicadas ou divulgadas sem expressa autorização por escrito de qualquer das partes.
d) Em caso de término e/ou rescisão do presente instrumento, seja por qual motivo for, o CONTRATANTE, deverá imediatamente interromper o uso do software e devolver à CONTRATADA todos os materiais e meios físicos que constituam e/ou incorporem a propriedade intelectual deste, ou ainda, inutilizá-las, a exclusivo critério da CONTRATADA.
e) Todas as obrigações contidas nesta cláusula permanecerão em vigor, não só durante a vigência do presente instrumento, como também por um período de 05 (cinco) anos contados da data de seu término.

# DAS DISPOSIÇÕES GERAIS

Cláusula 20ª: O CONTRATANTE concorda que a CONTRATADA pode coletar e usar informações técnicas que sejam fornecidas como parte dos serviços de suporte ou outros, relacionados ao objeto do presente instrumento. Frisando que poderá usar essas informações somente para aprimorar seus produtos ou para fornecer serviços personalizados ou tecnologias, e não poderá divulgar essas informações de modo que possam identificá-lo pessoalmente.
a) A CONTRATADA poderá compartilhar com escritórios jurídicos e contábeis parceiros, informações registradas em seu sistema relativas aos dados contábeis do CONTRATANTE, bem como referentes à todas as transações realizadas e identificadas pelo mesmo sistema, que poderá gerar e compartilhar arquivos .XLS e .XLSX.
b) O tratamento e utilização dos dados, dentro do mais absoluto sigilo, cujo fornecimento é autorizado neste ato pelo CONTRATANTE, deverão ser utilizados exclusivamente para fins de realização de diagnóstico tributário, para verificação de eventual tributo a ser recuperado pelas vias administrativa e judicial.

Cláusula 21ª: Eventuais omissões ou meras tolerâncias das partes no exigir o estrito e pleno cumprimento dos termos e condições deste contrato ou de prerrogativas decorrentes dele ou de lei, não constituirão novação ou renúncia, nem afetarão o exercício de quaisquer direitos, que poderão ser plena e integralmente exercidos, a qualquer tempo.

Cláusula 22ª: Nenhuma das partes será responsável por qualquer atraso ou falha no cumprimento de suas obrigações descritas no presente instrumento, caso tal atraso ou falha seja resultante de fatos alheios à vontade das partes, ou de seu controle razoável, incluindo casos fortuitos e/ou eventos de força maior.

Cláusula 23ª: Qualquer prejuízo que o CONTRATANTE, vier a experimentar, pelo uso inadequado e ou cadastramento incorreto de dados bancários (boletos) não será de responsabilidade da CONTRATADA.

Cláusula 24ª: A responsabilidade da CONTRATADA por quaisquer eventuais prejuízos ou danos, de qualquer natureza, comprovadamente resultantes da concessão da licença e prestação dos serviços, de acordo com este contrato, não excederá o preço de implantação estabelecido na cláusula 9ª deste.

Cláusula 25ª: A CONTRATADA não terá qualquer responsabilidade perante o CONTRATANTE e/ou terceiros, no tocante a qualquer ação que resulte de:
a) Qualquer violação pelo CONTRATANTE de suas obrigações descritas neste contrato;
b) Mau uso do software, caracterizado pelo uso em desacordo com as especificações técnicas aplicáveis;
c) Qualquer alteração, modificação ou ajuste do objeto do presente contrato executado, por terceiro que não autorizado por escrito pela CONTRATADA;
d) Combinação, conexão, operação ou uso de qualquer componente do software com equipamento ou documentação não fornecidos pela CONTRATADA;

Cláusula 26ª: A presente avença não poderá, sob nenhum aspecto, ser interpretada como uma associação ou um ato de sociedade entre as partes, para todo e qualquer fim de direito.

Cláusula 27ª: As partes elegem o foro da Comarca de Caxias do Sul - RS, como o competente para dirimir quaisquer dúvidas ou controvérsias advindas do presente contrato, em preferência a qualquer outro, por mais privilegiado que seja ou venha a ser.

Cláusula 28ª: O presente instrumento constitui título executivo extrajudicial, nos termos do art. 784, II, do Novo CPC, firmado na presença de duas testemunhas.

E por estarem justos e acordados, firmam o presente instrumento, que será assinado exclusivamente na forma eletrônica, reconhecendo a existência, validade e eficácia deste documento eletrônico e das assinaturas eletrônicas para todos os fins legais, nos termos do artigo 10, caput e §2º, da MP 2.200-2/2001, ficando dispensada a obrigatoriedade do uso de assinaturas por meio de certificados emitidos pela ICP-Brasil, concordando as partes que qualquer meio idôneo de certificação digital de autoria e integridade deste instrumento será válido como comprovação de suas assinaturas. Considerar-se-á a data de assinatura, a data descrita neste instrumento. Ficam dispensadas as assinaturas das testemunhas, conforme permissivo contido no art. 784, §4º, do CPC.

Caxias do Sul, {data_extenso}.

CONTRATANTE: {razao} - representada por {respNome}
CONTRATADA: ARGO SISTEMAS LTDA.`
};

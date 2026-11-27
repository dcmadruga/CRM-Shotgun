// Novidades do Shotgun: o que mudou em cada versão, em linguagem de usuário.
// A janela "Novidades" abre sozinha uma vez quando o app atualiza (uma vez por versão, por usuário, em cada aparelho)
// e pode ser revista a qualquer momento tocando em "Versão N" no cabeçalho.
//
// COMO ACRESCENTAR UMA VERSÃO (em todo PR que sobe a versão do sw.js):
//   1. Suba a versão em sw.js (const VERSAO = 'shotgun-vNNN').
//   2. Coloque uma entrada NO TOPO da lista abaixo com o mesmo número:
//        { v: NNN, data: 'AAAA-MM-DD', titulo: 'Frase curta', itens: ['O que a pessoa vê de diferente.', '...'] },
//      Escreva para quem usa o app: o que mudou na tela e onde encontrar. Sem nomes de código ou de arquivo.
//   3. Mudança só interna (sem nada visível para o usuário)? Pode pular a entrada: a janela não abre para essa versão.
//   Se dois PRs disputarem o mesmo número, quem fizer o merge depois troca para o próximo número livre aqui e no sw.js.
window.SHOTGUN_NOVIDADES = [
  { v: 278, data: '2026-11-27', titulo: 'Nome sugerido para loja', itens: [
    'No Pré TASK, bloco Posto simples: quando o Tipo da unidade é Loja, o nome sugerido vem como "Loja - Razão social" (antes era sempre "Posto - Razão social"). Trocar o Tipo entre Posto e Loja ajusta a sugestão, desde que o nome ainda seja o sugerido.'
  ] },
  { v: 277, data: '2026-11-27', titulo: 'Qual Banco: dá para trocar o banco escolhido', itens: [
    'Depois de escolher um banco, clicar no campo (ou na setinha) abre a lista completa de novo, com o banco atual destacado, para trocar por outro.',
    'Digitando, a lista filtra pelo nome ou pelo código, sem ligar para acentos. Também dá para usar as setas e o Enter.'
  ] },
  { v: 276, data: '2026-11-27', titulo: 'Qual Banco com a lista da FEBRABAN', itens: [
    'No Pré TASK, o campo Qual Banco (e Banco ou adquirente do PIX) mostra a lista de bancos da FEBRABAN, com código e nome. Digite parte do nome ou o código para achar.',
    'Banco que não está na lista: marque "Outro banco (não está na lista)" e digite o nome.'
  ] },
  { v: 275, data: '2026-11-27', titulo: 'Menu do Pré TASK: ✓ só quando algo foi respondido; contato no topo do TEF / PIX', itens: [
    'No menu do Pré TASK, um item sem perguntas obrigatórias (como Homologação de Boleto) só mostra o ✓ depois que alguma pergunta é respondida. Antes de responder, aparece o círculo de pendente.',
    'Isso não muda o Salvar final: ele continua exigindo só os campos obrigatórios.',
    'No item TEF / PIX, o bloco Contato Cliente: TEF / PIX passou para o topo, antes de TEF e PIX.',
    'Qual Bandeira: a lista agora inclui a WATT e também as bandeiras cadastradas em Logos das Bandeiras. Uma bandeira nova cadastrada lá aparece na lista sem editar o campo. Vale no Pré TASK e na página de dados do cliente.',
    'No item Integração, a pergunta "Tem integração com APP de terceiros?" ganhou um bloco próprio, APP de terceiros. A resposta já dada continua lá.'
  ] },
  { v: 274, data: '2026-11-27', titulo: 'Contato do cliente em TEF / PIX', itens: [
    'No Pré TASK, o item TEF / PIX ganhou o bloco Contato Cliente: TEF / PIX, com nome, telefone / WhatsApp e e-mail de quem cuida do TEF e do PIX no cliente.',
    'Embaixo do nome aparecem os contatos já informados (responsável legal, financeiro, contato técnico, proposta, CRM): um toque preenche o nome, o telefone e o e-mail.'
  ] },
  { v: 273, data: '2026-11-27', titulo: 'TEF / PIX volta a ser um item só, com TEF e PIX separados dentro', itens: [
    'No Pré TASK, TEF / PIX volta a ser um item só no menu de Validação. Dentro dele, as informações ficam em dois blocos: TEF (TEF Fixo, PDV Móvel, Cartões Frota e adquirentes) e PIX (PIX integrado ao PDV, banco ou adquirente, tipo de chave e chave PIX).',
    'O que já tinha sido preenchido continua no lugar.'
  ] },
  { v: 272, data: '2026-11-27', titulo: 'TEF / PIX volta a ser um setor só', itens: [
    'No TASK, TEF / PIX volta a ser um módulo e um setor só, como antes da versão 271, com o processo "Configurar PIX" de novo dentro dele. O que foi lançado no módulo PIX nesse meio-tempo voltou para o TEF / PIX.',
    'Usuários e avisos do sino seguem o setor TEF / PIX de sempre: não precisa mudar nada no cadastro das pessoas.',
    'No Pré TASK, TEF e PIX continuam como dois itens separados no menu.'
  ] },
  { v: 271, data: '2026-11-27', titulo: 'TEF e PIX separados', itens: [
    'No Pré TASK, o item TEF / PIX virou dois: TEF, com os mesmos campos de antes (TEF Fixo, PDV Móvel, Cartões Frota e adquirentes), e PIX, que pergunta se o PIX é integrado ao PDV, o banco ou adquirente, o tipo de chave e a chave PIX. O que já tinha sido preenchido continua no TEF.',
    'No TASK, o módulo TEF / PIX também virou dois setores, TEF e PIX. O processo "Configurar PIX" passou para o PIX, com o andamento que já tinha. Quem era do setor TEF / PIX passa a ver os dois.',
    'Para o ADM: em Parâmetros Pré TASK, a seção PIX já aparece pronta para conferir e publicar. Em Usuários, marque ou desmarque o setor PIX de cada pessoa. Os avisos do sino do PIX chegam para quem tiver o setor PIX salvo no cadastro.'
  ] },
  { v: 270, data: '2026-11-27', titulo: 'Cadastro direto sem a aba Pré-Contrato', itens: [
    'No Pré TASK do cadastro direto, a aba Pré-Contrato saiu: os dados do contrato não se aplicam a esse cadastro e deixam de ser exigidos no Salvar final. Os blocos que ficam nas outras abas continuam valendo.',
    'Em blocos com dois e-mails, como o Financeiro, o segundo ganhou a opção "Usar o mesmo e-mail para nota fiscal": ele copia o e-mail do boleto e acompanha se você mudar.'
  ] },
  { v: 269, data: '2026-11-27', titulo: 'Contatos já informados como sugestão', itens: [
    'No Pré TASK, embaixo do nome do contato de blocos como Financeiro e Contato técnico, aparecem os contatos já informados antes: o responsável legal, o contador, os outros blocos, o contato da proposta e os contatos do lead no CRM. Um toque preenche o nome, o telefone e o e-mail do bloco.',
    'A página de dados que o cliente preenche faz o mesmo com os contatos que ele já digitou e com o contato da proposta.',
    'A explicação embaixo do CNPJ ficou mais curta: "Digite CNPJ para pesquisa automática".'
  ] },
  { v: 268, data: '2026-11-27', titulo: 'Cadastro direto: explicação embaixo do CNPJ e CPF copiado para o CFC', itens: [
    'No Pré TASK do cadastro direto, embaixo do CNPJ da empresa contábil aparece uma explicação: não há botão de pesquisar, porque ao digitar o CNPJ a busca na Receita é automática e preenche Nome da Empresa, E-mail e Telefone. Os sócios aparecem embaixo do Nome do contador para escolher com um toque.',
    'O CNPJ da empresa no Pré-Contrato também ganhou a explicação de que a pesquisa é automática e busca a Inscrição estadual.',
    'Consultar no CFC (embaixo do CRC) agora copia o CPF do contador, e não mais o nome. No site do CFC é só colar no campo do CPF. Sem o CPF preenchido, vai o nome. Vale também para a página de dados que o cliente preenche.'
  ] },
  { v: 267, data: '2026-11-27', titulo: 'Miniatura dos anexos de imagem', itens: [
    'No Pré TASK, os anexos de imagem (como o Logo da Filial) mostram a miniatura recortada nas bordas brancas, então o desenho ocupa o quadro mesmo quando a imagem tem muita margem. Tocar na miniatura abre a imagem inteira.',
    'Se a imagem não puder ser mostrada, aparece o ícone de arquivo em vez de um quadro vazio.'
  ] },
  { v: 266, data: '2026-11-27', titulo: 'Card em preparação sem status', itens: [
    'Na TASK, o card que ainda está "Em preparação" (Pré TASK incompleto) não mostra mais o status (Futuro, Em andamento…). O status aparece quando o card fica "Pronto para as equipes".'
  ] },
  { v: 265, data: '2026-11-27', titulo: 'Cadastro direto: pesquisa na Receita e na SEFAZ', itens: [
    'No Pré TASK do cadastro direto, o CNPJ da empresa já vem da Implantação e completa sozinho os campos vazios do Pré-Contrato: razão social, nome fantasia, endereço, cidade, UF e a Inscrição estadual (quando a Receita traz).',
    'Embaixo da Inscrição estadual há o botão Consultar na SEFAZ: ele copia o CNPJ e abre a consulta da SEFAZ do Estado da empresa. É só colar o CNPJ no site. Ao lado, Anexar cartão de contribuinte lê o PDF ou o print da consulta e preenche a IE.',
    'No bloco da empresa contábil, digitar o CNPJ da contabilidade preenche o Nome da Empresa, o E-mail e o Telefone pela Receita, e mostra os sócios para escolher o Nome do contador com um toque. O CRC ganhou o link Consultar no CFC, com o nome do contador já copiado.'
  ] },
  { v: 264, data: '2026-11-27', titulo: 'Cadastro direto só salva com o cliente identificado', itens: [
    'No Novo cadastro direto da TASK, o Salvar parcial agora pede o Tipo de Base e os dados que identificam o cliente: no Posto simples, o CNPJ e o Nome do Posto; na Central, o Nome da Central e o CNPJ de cada filial. O que falta fica marcado em vermelho na aba Implantação. Assim não aparecem mais cards "Sem nome" na TASK.',
    'No card da TASK, o botão de link ao lado da Data da base fica desligado até o link da base ser informado e salvo em Módulos › Implantação.',
    'Os cards da TASK ficaram mais curtos: a lista de módulos (Implantação, Homologação de Boleto, Pré Start…) fica escondida. Toque em "Mostrar módulos" para ver o andamento de cada um, e em "Ocultar módulos" para fechar. Pendências e processos parados continuam aparecendo no card.'
  ] },
  { v: 263, data: '2026-11-27', titulo: 'Pré TASK do cadastro direto: Pesquisar Cliente ANP', itens: [
    'No cadastro direto da TASK, o Pré TASK (aba Implantação) ganhou o botão Pesquisar Cliente ANP nos blocos Posto simples e Central. Serve para quando você não sabe o CNPJ.',
    'Posto simples: o posto escolhido preenche CNPJ, razão social e cidade da Unidade, e o Nome do Posto vem como "Posto - Razão social".',
    'Central: o posto escolhido entra na primeira filial ainda sem CNPJ. Se todas já estiverem preenchidas, uma nova filial é acrescentada com os dados.'
  ] },
  { v: 262, data: '2026-11-27', titulo: 'Pré TASK: Nome do Posto sugerido pelo CNPJ', itens: [
    'No Pré TASK, aba Implantação, bloco Posto simples: a Unidade (Filial, Tipo, CNPJ, Razão social e Cidade) agora vem antes do Nome do Posto.',
    'Ao digitar o CNPJ, o Nome do Posto já aparece preenchido como "Posto - Razão social" (por exemplo, "Posto - SALAMONI PETROLEO LTDA"). Dá para trocar à vontade.',
    'Se você já tinha escrito um nome próprio para o posto, ele não é trocado. Corrigir a razão social atualiza a sugestão, enquanto o nome ainda for o sugerido.'
  ] },
  { v: 261, data: '2026-11-27', titulo: 'Próximo contato atrasado some quando a demonstração já está marcada', itens: [
    'Na Agenda, o lembrete "Atrasado" do Próximo contato de um lead deixa de aparecer quando esse lead já tem uma demonstração marcada (ou reagendada) para depois daquela data.',
    'Embaixo de cada lembrete de Próximo contato há agora os botões Reagendar (escolhe a nova data) e Feito (marca o contato como feito, com nova data se quiser). Os dois deixam uma anotação no histórico do lead.'
  ] },
  { v: 260, data: '2026-11-27', titulo: 'Tela de entrada e links do cliente mais claros', itens: [
    'Na tela de entrada, os avisos de erro (senha errada, campo vazio, sem internet) agora aparecem em vermelho, numa caixa própria, e não se confundem com as instruções.',
    'Nos links que o cliente abre (aprovar a proposta, aceitar o contrato e preencher os dados), os botões reagem ao passar o mouse, o botão de anexar arquivo ficou no padrão das telas e as caixas de aviso (aprovada, erro, pendências) ficaram mais fáceis de ler.',
    'No tema escuro desses links, os títulos das seções e os botões principais passam a usar texto escuro, que fica mais legível sobre o rosa e o roxo.'
  ] },
  { v: 259, data: '2026-11-26', titulo: 'Demonstração: horário marcado × horário real', itens: [
    'Na tela Hoje, cada demonstração mostra o status: Agendada, Confirmada, Em andamento, Atrasada ou Realizada.',
    'Atrasada aparece sozinha quando o horário da demonstração já terminou e ninguém registrou o resultado. Em andamento aparece entre o início e o fim marcados.',
    'Ao marcar como Realizada, informe a hora em que a demonstração começou e quanto durou. O card mostra, por exemplo, "Começou às 15:30 (30 min de atraso)", e isso vai para o histórico do lead.',
    'Se alguém muda a data ou a hora de uma demonstração já agendada, o card mostra o horário anterior ("Marcada antes para 15:00") e a mudança fica anotada no histórico do lead. Uma demonstração reagendada mostra de qual data veio.'
  ] },
  { v: 258, data: '2026-11-26', titulo: 'Cartão de contribuinte mais confiável e aba do vendedor fecha ao salvar', itens: [
    'Dados para o contrato: o botão "Anexar cartão de contribuinte" foi refeito para abrir a escolha de arquivo em qualquer navegador. Também dá para arrastar o arquivo e soltar em cima do botão.',
    'Ao escolher o arquivo, ele aparece logo abaixo do botão e a Inscrição estadual é preenchida pela leitura.',
    'Quando o vendedor preenche os dados em nome do cliente (Pré-Contrato), a aba fecha sozinha depois de Salvar dados e volta para a proposta. Se o navegador não deixar fechar, aparece o link para voltar ao app.'
  ] },
  { v: 257, data: '2026-11-26', titulo: 'Status da demonstração direto na Agenda', itens: [
    'Cada demonstração na Agenda agora mostra o status (Agendada, Realizada, Reagendada, Cancelada…) e tem os botões Realizada, Reagendada e Cancelada logo abaixo do card. Realizada aparece a partir do dia da demonstração.',
    'Reagendada: o app abre uma demonstração nova com tudo igual à original (lead, online ou presencial, link ou endereço, duração, participantes e observações) e obriga a informar a nova data e hora. A original fica marcada como Reagendada, com a nova data no card.',
    'Cancelada: pede o motivo (opcional) e fica anotado no histórico do lead. As demonstrações canceladas e reagendadas continuam aparecendo na Agenda, mais apagadas, para você ver o que aconteceu.'
  ] },
  { v: 256, data: '2026-11-26', titulo: 'Cartão de contribuinte salvo sem extensão também é lido', itens: [
    'Dados para o contrato: ao anexar o cartão de contribuinte, a página descobre o tipo pelo conteúdo do arquivo, e não pelo nome. Um PDF ou print salvo sem extensão, ou a página da SEFAZ salva no navegador, agora é lido e preenche a Inscrição estadual na hora.',
    'Se o conteúdo não der para ler, mas o nome do arquivo trouxer o número da IE (como "Cartão Contribuinte Inscrição Estadual 141994762"), esse número é usado, com o aviso para conferir.'
  ] },
  { v: 255, data: '2026-11-26', titulo: 'CNPJ copiado ao consultar o SINTEGRA', itens: [
    'Dados para o contrato: ao tocar em "Consultar no SINTEGRA", o CNPJ da empresa vai copiado (só os números) antes de o site da SEFAZ abrir. No site, é só tocar no campo do CNPJ e colar.',
    'A mensagem mostra o CNPJ copiado. Se o navegador não deixar copiar, ela mostra o número para colar à mão. Sem CNPJ digitado, pede para preencher primeiro.'
  ] },
  { v: 254, data: '2026-11-26', titulo: 'Telefone do responsável legal já preenchido', itens: [
    'Dados para o contrato: quando o nome do Responsável legal (vindo do contrato social ou digitado) é o mesmo de um contato cadastrado na proposta ou no lead do CRM, o Telefone / WhatsApp dele já vem preenchido. Embaixo aparece de qual contato veio, para conferir.',
    'O campo continua editável: o que for digitado nele fica. Vale para links do Pré-Contrato gerados a partir desta versão.'
  ] },
  { v: 253, data: '2026-11-26', titulo: 'Cartão de contribuinte aceita qualquer arquivo', itens: [
    'Dados para o contrato: o botão "Anexar cartão de contribuinte" aceita agora qualquer tipo de arquivo. PDF e imagem continuam sendo lidos para preencher a Inscrição estadual. Os outros tipos ficam guardados nos anexos da proposta, e a IE é digitada à mão.'
  ] },
  { v: 252, data: '2026-11-26', titulo: 'Formulário aguarda a leitura do contrato social', itens: [
    'Dados para o contrato: enquanto o app lê o contrato social, os demais campos e o botão Enviar ficam bloqueados, com o aviso "Aguarde a leitura do contrato social terminar". Assim ninguém preenche um campo que a leitura vai sobrescrever logo depois.',
    'Tudo é liberado quando a leitura termina, achando os sócios ou não. Durante a leitura dá para trocar o arquivo ou marcar "Não tenho disponível agora", que também libera os campos na hora.'
  ] },
  { v: 251, data: '2026-11-26', titulo: 'Regime Tributário só no Pré TASK', itens: [
    'Dados para o contrato: o cliente não precisa mais escolher o Regime Tributário. Se ele anexar o cartão de contribuinte ou pesquisar o CNPJ, o regime encontrado segue junto com os dados, sem aparecer na tela.',
    'Pré TASK, aba Implantação: o Regime Tributário passou a ser exigido aqui. Ele abre preenchido pelo cartão de contribuinte ou pela Receita Federal, com a origem indicada embaixo, para conferir.'
  ] },
  { v: 250, data: '2026-11-26', titulo: 'Cartão de contribuinte preenche a Inscrição Estadual', itens: [
    'Página de dados para o contrato: embaixo da Inscrição estadual tem o botão "Anexar cartão de contribuinte". O cliente anexa o PDF ou o print da consulta do SINTEGRA/SEFAZ e a página lê o documento no próprio aparelho.',
    'A Inscrição estadual (ou ISENTO) já vem preenchida, e o Regime Tributário também quando o cartão diz Simples Nacional, MEI, Lucro Presumido ou Real. Se o cartão for de outro CNPJ, a página avisa e não preenche.',
    'O cartão fica salvo nos anexos da proposta, junto com os outros documentos, e aparece no Pré TASK e na TASK.'
  ] },
  { v: 249, data: '2026-11-26', titulo: 'Cidade / UF na Agenda', itens: [
    'Agenda: nas visões Semana, Dia e Próximas, cada demonstração e cada lembrete de Próximo contato mostra a Cidade / UF do cliente logo abaixo do nome da empresa.',
    'Se o cadastro do lead não tiver cidade, o item fica como antes.'
  ] },
  { v: 248, data: '2026-11-26', titulo: 'Sócios lidos também em contrato escaneado junto com o requerimento', itens: [
    'Dados para o contrato: quando o PDF do contrato social mistura páginas digitais (como o requerimento da Junta) com páginas escaneadas, o app agora lê as páginas escaneadas uma a uma e encontra os sócios. Antes ele achava que o PDF inteiro tinha texto e pulava a leitura das imagens.',
    'Se o texto do PDF não trouxer nenhum sócio, o app lê todas as páginas como imagem antes de desistir. Pode levar alguns minutos, e a tela mostra a página que está sendo lida.'
  ] },
  { v: 247, data: '2026-11-26', titulo: 'Regime Tributário no Pré TASK', itens: [
    'Pré TASK, aba Implantação: o Regime Tributário informado pelo cliente nos dados para o contrato agora aparece no bloco Base, já preenchido.',
    'É o mesmo campo do Pré-Contrato: corrigir aqui corrige lá também, com o registro de quem alterou. Se o cliente não informou (contratos antigos), o Pré TASK sugere o regime pela Receita Federal, para conferir.'
  ] },
  { v: 246, data: '2026-11-26', titulo: 'Cidade / UF nos avisos e na tela Hoje', itens: [
    'Tela Hoje: em Demonstrações de hoje e na lista do próximo passo de cada proposta, a Cidade / UF do cliente aparece logo depois do nome da empresa.',
    'Sino: os avisos de demonstração (agendada para você, hoje e registrar resultado) e de proposta aceita também mostram a Cidade / UF. Se o cadastro não tiver cidade, o aviso fica como antes.'
  ] },
  { v: 245, data: '2026-11-26', titulo: 'Link para achar a Inscrição Estadual', itens: [
    'Página de dados para o contrato: abaixo do campo Inscrição estadual aparece o link "Consultar no SINTEGRA". Depois de pesquisar o CNPJ, ele abre direto a consulta da SEFAZ do Estado da empresa.',
    'Serve para quando a busca do CNPJ não traz a IE, o que é comum em empresa aberta há pouco tempo: as bases públicas gratuitas demoram a receber esse dado.'
  ] },
  { v: 244, data: '2026-11-26', titulo: 'Contrato social ao lado do formulário', itens: [
    'Dados para o contrato: ao tocar na miniatura do contrato social, o documento agora abre ao lado do formulário (no computador) ou na parte de cima da tela (no celular). Dá para ler o documento e preencher os campos ao mesmo tempo, sem fechar a visualização.',
    'No painel do documento tem zoom (− e +, tocar na porcentagem volta a ajustar à largura) e todas as páginas e fotos enviadas em sequência. Arraste a borda colorida para aumentar ou diminuir o painel. No celular, Recolher deixa só a barra de cima.',
    'Quem prefere o jeito antigo toca em Tela cheia, e o aparelho lembra a escolha.'
  ] },
  { v: 243, data: '2026-11-26', titulo: 'Cidade / UF nos cards do funil', itens: [
    'CRM → Funil de vendas: cada card de lead e de proposta mostra agora a Cidade / UF do cliente logo abaixo do nome da empresa, em todas as colunas.',
    'Nas listas de Leads e de Clientes a cidade aparece no mesmo formato. Se o cadastro não tiver cidade, o card fica como antes.'
  ] },
  { v: 242, data: '2026-11-26', titulo: 'Postos em construção em Goiás', itens: [
    'Telemetria → Postos em construção: o Estado agora tem também Goiás (GO), com os mesmos filtros de Cidade, mapa, lista, alertas e fontes.',
    'Em Goiás o Radar lê o Boletim Ambiental da SEMAD (pedidos e licenças de posto do Estado), os avisos de licença das prefeituras no Diário Oficial do Estado, os diários dos municípios (AGM e FGM) e os diários próprios das cidades (Querido Diário). No Boletim da SEMAD o município e o CNPJ não aparecem: ficam como pendente de confirmação.'
  ] },
  { v: 241, data: '2026-11-26', titulo: 'Postos em construção: licenças de Porto Alegre no RS', itens: [
    'Telemetria → Postos em construção, Estado RS: o Radar passa a ler também a consulta pública de licenças ambientais da Prefeitura de Porto Alegre e mostra as licenças de posto de combustível emitidas lá (LP e LI entram como novo posto).',
    'A fonte aparece na lista de fontes do RS. Porto Alegre emite poucas licenças de posto, então os achados devem ser raros.'
  ] },
  { v: 240, data: '2026-11-26', titulo: 'Atalhos de prazo no Próximo contato', itens: [
    'CRM → ficha do lead, em Negociação: embaixo de Próximo contato agora tem os botões 7 dias, 15 dias, 30 dias e 60 dias. Um toque marca a data de hoje mais esse prazo, e o botão fica destacado.',
    'A data continua editável à mão. Passando o dedo ou o mouse sobre o botão aparece a data que ele vai marcar.'
  ] },
  { v: 239, data: '2026-11-26', titulo: 'Postos novos da ANP no sino', itens: [
    'O sino de notificações agora avisa quando entram postos novos na base da ANP, todo dia, só nos seus Estados de atuação (os mesmos dos filtros do CRM). Vem um aviso por Estado e por dia, com os nomes dos postos e a cidade.',
    'Tocar no aviso abre Telemetria → Telemetria ANP já filtrada no Estado. Se mais postos entram no mesmo dia, o aviso volta como não lido. Quem não tem Estado de atuação marcado não recebe esses avisos.'
  ] },
  { v: 238, data: '2026-11-25', titulo: 'Agenda de demonstrações', itens: [
    'Novo item Agenda no menu, logo depois de Hoje. Nele você marca as demonstrações do sistema, sempre ligadas a um lead do CRM.',
    'Toque em + Agendar demonstração, escolha o lead (ou cadastre um novo ali mesmo), a data, a hora, a duração, se é online (com o link da reunião) ou presencial (o endereço vem do lead) e quem do cliente vai participar.',
    'Três jeitos de ver: Semana, Dia e Próximas. Os Próximos contatos dos leads também aparecem como lembrete, e os atrasados ficam em vermelho. Para esconder, desmarque Próximos contatos.',
    'Se você já tiver outra demonstração no mesmo horário, o app avisa antes de salvar.',
    'No CRM, a ficha do lead ganhou o bloco Demonstrações, com o botão para agendar, e o card do lead no funil mostra a data da próxima demonstração.',
    'Andamento: abra a demonstração e marque Cliente confirmou, Realizada, Não compareceu, Remarcar ou Cancelar. Tudo fica anotado no histórico do lead.',
    'Ao marcar Realizada, escolha o resultado: Quer proposta (o app oferece Gerar proposta), Vai pensar (marca o próximo contato) ou Sem interesse (o lead vai para Perdido). O lead em aberto passa para Qualificado no funil.',
    'Demonstração que já passou sem resultado aparece com o aviso Registrar resultado, na Agenda e no lead.',
    'Sino: quem apresenta recebe um aviso quando outra pessoa agenda uma demonstração no lead dele, um lembrete no dia ("Demonstração hoje às 14:00") e, depois do horário, o pedido para registrar como foi. Tocar no aviso abre a demonstração.',
    'Tela Hoje: as demonstrações do dia e as que ficaram sem resultado aparecem no topo, com o botão Abrir ou Registrar resultado.',
    'Depois de agendar ou remarcar, e dentro de cada demonstração: Confirmar pelo WhatsApp abre a conversa com o participante com a mensagem pronta (dia, hora, duração e o link ou o endereço), e Adicionar ao Google Agenda cria o evento já preenchido, convidando os participantes que têm e-mail.'
  ] },
  { v: 235, data: '2026-11-24', titulo: 'Postos em construção em Sergipe, Pará, Tocantins e Rondônia', itens: [
    'Telemetria → Postos em construção: o Estado agora tem também Sergipe (SE), Pará (PA), Tocantins (TO) e Rondônia (RO), com os mesmos filtros de Cidade, mapa, lista, alertas e fontes.',
    'No Pará o Radar lê os processos de licenciamento de posto na consulta pública da SEMAS-PA e as licenças publicadas pelas prefeituras no Diário dos Municípios (FAMEP). Nos processos da SEMAS o município, o CNPJ e o endereço não aparecem: ficam como pendente de confirmação.',
    'Em Rondônia e Sergipe entram os diários dos municípios (AROM e Sergipe) e, nos quatro Estados, os diários próprios das cidades (Querido Diário). Os sites da ADEMA (SE), do NATURATINS (TO) e da SEDAM (RO) recusam acesso de fora do Brasil e aparecem como não monitorados.'
  ] },
  { v: 234, data: '2026-11-24', titulo: 'Pré Start, Start e Pós Start como módulos próprios', itens: [
    'No TASK, Pré Start, Start e Pós Start deixaram de ser etapas dentro de Implantação e viraram módulos principais, cada um com a sua liberação.',
    'Liberação padrão: Pré Start quando "Liberar a base" (Implantação) é finalizado, Start quando "Agendar o start com o cliente" (Pré Start) é finalizado e Pós Start quando "Aceite do cliente" (Start) é finalizado. O administrador muda em Administração → Parâmetros Módulos TASK.'
  ] },
  { v: 233, data: '2026-11-24', titulo: 'Módulos do TASK com menu próprio', itens: [
    'Administração ganhou o item "Parâmetros Módulos TASK": é ali que ficam agora os módulos do TASK, quando cada um é liberado para a equipe, as responsabilidades do setor e as seções e campos de cada módulo.',
    'Parâmetros Pré TASK ficou só com o formulário do Pré TASK e os Logos das Bandeiras. Nada muda nos módulos já publicados.'
  ] },
  { v: 232, data: '2026-11-24', titulo: 'Setor de Validação nas seções do Pré TASK', itens: [
    'Administração → Parâmetros Pré TASK e Parâmetros Pré-Contrato: cada seção ganhou o campo "Setor de Validação", que escolhe onde ela aparece no Pré TASK: item próprio no menu, dentro de Status e datas, de Implantação ou de outra seção (ex.: TEF / PIX, Integração).',
    'No Pré-Contrato, o campo aparece nas seções que têm campos marcados "Pré TASK". A seção de Dados bancários para boleto já vem apontando para TEF / PIX. Depois de escolher, toque em Salvar e publicar.'
  ] },
  { v: 231, data: '2026-11-24', titulo: 'Pré TASK já vem marcado pela proposta e pela ANP', itens: [
    'No Pré TASK, a seção TEF / PIX já abre com Sim em TEF Fixo quando a proposta aceita tem item de TEF, e com Sim em PDV Móvel quando tem item de PDV Móvel. Cartões Frota fica marcado quando houver item de frota.',
    'Embaixo do campo aparece "Preenchido pela Proposta" com o item que deu origem. Sem o item, o campo continua em branco (não marca Não sozinho) e tudo segue editável.',
    'Na seção Integração, "Posto é Bandeirado?" vem da base da ANP pelo CNPJ do posto (na Central, de cada filial): com bandeira já marca Sim e preenche a bandeira; bandeira branca marca Não.',
    'Cada seção do Pré-Contrato com campos marcados "Pré TASK" (ex.: Dados da empresa contábil e do contador, Financeiro) agora aparece como item próprio no menu do Pré TASK, com o título da seção, em vez de tudo junto em "Dados complementares". A seção de Dados bancários para homologação de boleto entra dentro de TEF / PIX, mantendo o Sim/Não que abre os campos.'
  ] },
  { v: 230, data: '2026-11-24', titulo: 'Pesquisar na ANP: só as bandeiras que existem', itens: [
    'No painel Pesquisar na ANP, o filtro Bandeira agora lista só as bandeiras dos postos do estado e da cidade escolhidos, com quantos postos cada uma tem. Trocou a cidade, a lista de bandeiras se atualiza sozinha.'
  ] },
  { v: 229, data: '2026-11-24', titulo: 'Filtros na lista de revendas', itens: [
    'Administração → Revendas: acima das revendas cadastradas agora tem filtros por Estado de atuação e por Gerente de revenda (inclusive "Sem estado" e "Sem gerente").',
    'Os filtros se combinam, o contador mostra quantas revendas aparecem do total, e "Limpar filtros" volta a mostrar todas.'
  ] },
  { v: 228, data: '2026-11-24', titulo: 'Pesquisar na ANP: cidade pelo nome', itens: [
    'No painel Pesquisar na ANP (Novo lead, Nova proposta e Novo cadastro da TASK), o filtro Cidade virou um campo de digitar. Escreva parte do nome, sem se preocupar com acento ou maiúscula, e a lista de postos já filtra enquanto você digita.',
    'Abaixo do campo aparecem as cidades do estado que batem com o que você digitou, com quantos postos cada uma tem. Clique numa delas, ou use as setas e Enter, para ver só os postos dessa cidade.'
  ] },
  { v: 227, data: '2026-11-24', titulo: 'Templates e referências no cadastro da revenda', itens: [
    'Cada revenda agora tem os próprios Templates de proposta e a própria lista de Referências (página 2 do PDF). O administrador edita em Administração → Revendas, nos botões Editar templates e Editar referências.',
    'O gerente da revenda edita os dois em Parâmetros Proposta → Valores de base, e eles valem na hora para a equipe dele, sem precisar publicar. "Usar os gerais" volta para a lista geral.',
    'Os Templates e Referências de Parâmetros Proposta continuam valendo para quem não tem revenda.',
    'No bloco Logo da revenda tem a opção "Não vincular logo da revenda nas propostas". Marcada, os PDFs da revenda saem só com o logo principal, mesmo com logo cadastrado.'
  ] },
  { v: 226, data: '2026-11-24', titulo: 'Dados do vendedor vêm do cadastro', itens: [
    'Parâmetros Proposta: saiu o bloco Seus dados (Nome, Telefone e E-mail). O cabeçalho do PDF já usa o nome, o telefone e o e-mail do cadastro de cada usuário, ajustados pelo administrador em Usuários.',
    'No lugar fica só o Logo do PDF, para o administrador.'
  ] },
  { v: 225, data: '2026-11-24', titulo: 'Valores de base e logo no cadastro da revenda', itens: [
    'O logo da revenda, que sai no cabeçalho do PDF ao lado do logo principal, agora fica no cadastro de cada revenda. O PDF usa o logo da revenda do vendedor; quem não tem revenda sai só com o logo principal.',
    'Administração → Revendas: cada revenda agora tem os seus Valores de base (deslocamento em R$ por km, validade da condição, limites de porte por tancagem e bases de deslocamento). Campo vazio segue o valor geral.',
    'O gerente da revenda ajusta esses valores e o logo em Parâmetros Proposta → Valores de base, e eles valem na hora para a equipe dele, sem precisar publicar.',
    'Os Valores de base em Parâmetros Proposta do administrador continuam valendo para quem não tem revenda.',
    'Tela Hoje do gerente da revenda: além das próprias, mostra os próximos passos das propostas de todos os usuários da revenda, com o nome do vendedor e o botão Ver proposta. "Só as minhas" volta a mostrar só as dele.'
  ] },
  { v: 224, data: '2026-11-24', titulo: 'Dados Primários agora se chama Pré-Contrato', itens: [
    'O passo 2 da proposta (antes "Dados Primários") passou a se chamar Pré-Contrato: nos passos da proposta, no quadro por etapa, no Pré TASK, nos cards do TASK e nos avisos.',
    'Administração → Parâmetros Pré-Contrato é a antiga aba Parâmetros Dados Primários. Os botões de link agora dizem "Copiar link do Pré-Contrato".',
    'Nada muda nos dados: tudo o que os clientes já enviaram continua no mesmo lugar.'
  ] },
  { v: 223, data: '2026-11-24', titulo: 'Correção: menus e usuário sumindo', itens: [
    'O app às vezes abria só com Nova proposta e Administração, sem o usuário. A causa era um dado com problema guardado no aparelho (de uma proposta em edição ou dos parâmetros), que travava a abertura antes do login.',
    'Agora o app limpa esses dados antes de usar e, se mesmo assim algo falhar, volta ao padrão só aquela parte e continua abrindo com login e menus. Os parâmetros voltam da nuvem quando você entra.'
  ] },
  { v: 222, data: '2026-11-24', titulo: 'Filtros na lista de usuários', itens: [
    'Administração → Usuários: acima da lista de usuários cadastrados agora tem filtros por Revenda (inclusive "Sem revenda"), Estado de atuação e Perfil (Vendedor, TASK, Administrador ou Gerente de revenda).',
    'Os filtros se combinam, o contador mostra quantos usuários aparecem do total, e "Limpar filtros" volta a mostrar todos.'
  ] },
  { v: 221, data: '2026-11-24', titulo: 'Aceite do contrato já preenchido', itens: [
    'Na página de aceite do contrato, nome, CPF e cargo do representante já vêm preenchidos com os dados informados antes: o responsável legal do link de dados ou, sem ele, quem aprovou a proposta.',
    'O cliente confere e pode trocar tudo, se quem for aceitar for outra pessoa.',
    'Contratos gerados antes desta versão também trazem o nome e o CPF que aparecem no texto do contrato.'
  ] },
  { v: 220, data: '2026-11-24', titulo: 'Templates de proposta mais legíveis', itens: [
    'Parâmetros Proposta → Templates de proposta: licenças e mensalidades ficam uma embaixo da outra, com a descrição inteira, o preço e a quantidade sempre visíveis, no computador e no celular.'
  ] },
  { v: 219, data: '2026-11-23', titulo: 'Link de dados do cliente mais simples', itens: [
    'O link de dados que o cliente preenche não pede mais a "Data desejada para a implantação". O bloco Operação, que só tinha esse campo para o cliente, saiu da tela.',
    'O contrato passa a dizer que a licença será instalada em data a ser combinada entre as partes. Propostas antigas que já tinham a data continuam com ela no contrato.',
    'A data do Start continua sendo definida na Pré TASK.',
    'Contrato social: novo botão "Não tenho disponível agora, vou lançar as informações manualmente". Com ele marcado, o arquivo deixa de ser obrigatório e o cliente preenche os dados do representante legal à mão. No Responsável legal aparecem os sócios que constam no CNPJ (Receita Federal) para o cliente marcar quem vai assinar, e o nome já é preenchido. A proposta registra que o contrato social não foi enviado.'
  ] },
  { v: 218, data: '2026-11-23', titulo: 'Templates de proposta', itens: [
    'Nova proposta: no topo da tela há uma fileira de templates (Posto Simples, Loja Simples, Posto + Loja e Central). Escolha um e as licenças e mensalidades são preenchidas com os itens dele. Depois é só ajustar.',
    'Se a proposta já tiver itens, o app pede um segundo toque para confirmar a troca.',
    'Administração → Parâmetros Proposta → Templates de proposta: o administrador escolhe os itens do catálogo e a quantidade de cada template, cria templates novos e publica para a equipe.'
  ] },
  { v: 217, data: '2026-11-23', titulo: 'Cadastro de revendas', itens: [
    'Administração → Revendas (só o administrador): cadastre cada revenda com o nome, os estados de atuação, o gerente e os usuários que fazem parte dela. Cada usuário pertence a uma revenda só, e a tela Usuários também mostra e troca a revenda de cada um.',
    'O gerente da revenda ganha o menu Administração → Parâmetros Proposta: ajusta preços, textos e referências e clica em Publicar para a revenda. Só os usuários da revenda dele recebem esses valores; quem não tem revenda continua com os parâmetros gerais.',
    'Na tela Revendas o administrador vê quando o gerente publicou os parâmetros da revenda e pode voltar a revenda para os parâmetros gerais.'
  ] },
  { v: 216, data: '2026-11-23', titulo: 'Itens da aprovação em blocos separados', itens: [
    'Na página de aprovação que o cliente abre pelo link, Licenças e Mensalidades agora ficam em blocos separados, cada um com cabeçalho e total em destaque.',
    'Novo bloco Deslocamento da implantação: mostra os km rodados (com a rota ida e volta), o valor por km e o total. Em implantação remota aparece "Sem custo".'
  ] },
  { v: 215, data: '2026-11-23', titulo: 'Itens da proposta na página de aprovação', itens: [
    'A página que o cliente abre pelo link para aprovar a proposta agora mostra, abaixo dos totais, a lista dos itens: cada licença e cada mensalidade com quantidade, preço e total, igual ao PDF.',
    'Itens isentos aparecem com o valor riscado e o prazo da isenção. Itens ocultos na proposta continuam fora da lista.'
  ] },
  { v: 214, data: '2026-11-23', titulo: 'Postos em construção em São Paulo', itens: [
    'Telemetria → Postos em construção: São Paulo (SP) já pode ser escolhido no filtro de Estado, com o filtro de Cidade.',
    'Em SP o Radar lê o Diário Oficial do Estado: as licenças e os pedidos de licença de posto que a CETESB publica ali, o parecer técnico levado ao CONSEMA e as publicações de empresas e prefeituras. Compras de combustível e contratos ficam de fora.',
    'A CETESB só publica no Diário os licenciamentos com estudo de impacto, então em SP aparecem poucos casos por essa fonte. Os diários das prefeituras entram pelo Querido Diário assim que a API dele voltar a responder.',
    'O portal da CETESB não aceita consulta automática e o e-CETESB exige login, por isso aparecem na tela como fonte não monitorada.'
  ] },
  { v: 213, data: '2026-11-23', titulo: 'Telefone do cadastro sem sugestões', itens: [
    'No cadastro novo, o campo Telefone / WhatsApp não sugere mais números salvos no aparelho nem mostra o botão de contatos. A pessoa digita o celular com DDD e o app formata sozinho.'
  ] },
  { v: 212, data: '2026-11-23', titulo: 'Selfie do cadastro só aceita um rosto de verdade', itens: [
    'No primeiro acesso, a selfie agora confere o rosto antes de liberar o "Tirar foto": precisa ter uma pessoa só, com o rosto dentro do oval e de frente para a câmera. O oval fica laranja quando o rosto está no lugar e verde quando a foto pode ser tirada.',
    'Para provar que é uma pessoa de verdade, o app pede para piscar os olhos. Foto impressa ou na tela de outro celular não passa.',
    'A opção "Enviar uma foto" só aparece quando a câmera não abre, e a foto enviada também precisa mostrar um rosto, inteiro e de frente.'
  ] },
  { v: 211, data: '2026-11-23', titulo: 'Cadastro novo pede o telefone / WhatsApp', itens: [
    'Quem entra pela primeira vez e cria o próprio cadastro agora informa o celular com DDD (o WhatsApp). O campo já formata o número e, no celular, sugere os números salvos na conta Google do aparelho.',
    'O telefone chega junto com o pedido de acesso e aparece em Administração > Usuários, pronto para sair nas propostas.'
  ] },
  { v: 210, data: '2026-11-23', titulo: 'Novo cadastro do TASK pede os dados obrigatórios do Pré TASK', itens: [
    'No TASK, o "+ Novo cadastro" agora exige os mesmos dados obrigatórios do Pré TASK de uma proposta, incluindo o Pré-Contrato e os Dados complementares. O Salvar final só libera com tudo preenchido; o Salvar parcial continua guardando o card em "Em preparação".',
    'O Pré-Contrato aparece logo abaixo de Implantação e já vem com o CNPJ, a razão social, a cidade e o CEP do posto informado. Proposta e contrato continuam opcionais nesse cadastro.'
  ] },
  { v: 209, data: '2026-11-23', titulo: 'Excluir usuário apaga a conta de vez', itens: [
    'Em Administração > Usuários, o botão Excluir agora também apaga a conta da pessoa no Firebase, sem você precisar abrir o console. O acesso continua sendo cortado na hora; a conta some do Firebase em até 1 hora.',
    'Se precisar cadastrar o mesmo e-mail de novo depois, é só usar o cadastro normal.'
  ] },
  { v: 208, data: '2026-11-23', titulo: 'Conversão de Dados logo abaixo da Base', itens: [
    'No Pré TASK, aba Implantação, o bloco Conversão de Dados agora fica logo abaixo do bloco Base, antes do Posto simples ou da Central. No TASK, os dados aparecem na mesma ordem.'
  ] },
  { v: 207, data: '2026-11-23', titulo: 'Novo fluxo até o TASK pronto e Módulos por equipe', itens: [
    'Toda proposta agora tem um lead no CRM. Se a proposta foi feita direto, sem vir de um lead, o app cria o lead sozinho (origem "Proposta direta"). Se já existe lead com o mesmo CNPJ, ele é aproveitado.',
    'No TASK, o "+ Novo cadastro" (perfis TASK e Administrador) abre o Pré TASK completo. Proposta, Pré-Contrato e contrato não são obrigatórios nesse cadastro direto, e dá para vincular uma proposta aprovada depois.',
    'Cada card do TASK mostra por onde o cliente entrou (Veio de Lead, Veio de Proposta ou Cadastro direto) e se está "Em preparação" ou "Pronto para as equipes". Há uma aba nova, Em preparação, com os cards que ainda têm o Pré TASK incompleto.',
    'Módulos: cada equipe só começa quando o módulo dela é liberado. A Implantação libera quando o TASK fica pronto; TEF / PIX, Homologação de Boletos, Integração e Conciliação, quando a Implantação finaliza "Criar a base"; o Pós-vendas, no encerramento da implantação. O setor recebe aviso no sino. O administrador pode liberar na hora e mudar a ordem em Parâmetros Pré TASK > Módulos do TASK.',
    'Pendências: registre o que está faltando, com quem está (cliente, banco, adquirente, bandeira…) e o prazo. Ligada a um processo, ela deixa o processo Parado até ser resolvida. Pendência com o cliente tem o atalho Cobrar no WhatsApp.',
    'Diário: cada módulo guarda o histórico com quem fez e quando (status, liberações, pendências) e aceita anotações livres.',
    'Novo módulo Pós-vendas, e o botão Minhas tarefas agora separa a fila do setor em Com pendência, Atrasados, Em andamento, Liberados e Aguardando liberação.'
  ] },
  { v: 206, data: '2026-11-23', titulo: 'Pesquisar na ANP no Novo cadastro da TASK', itens: [
    'No Novo cadastro da TASK, aba Posto, apareceu o botão Pesquisar na ANP, no topo. Serve para quando você não sabe o CNPJ do posto.',
    'Filtre por nome, estado, cidade e bandeira e clique no posto: o app preenche CNPJ, razão social, cidade e UF, e sugere o nome do cadastro. E-mail e telefone vêm da Receita, quando houver.'
  ] },
  { v: 205, data: '2026-11-23', titulo: 'Cada setor do TASK explica pelo que é responsável', itens: [
    'Ao abrir os Módulos de um card no TASK, cada setor (Implantação, Pré Start, Start, Pós Start, Homologação de Boletos, TEF / PIX, Integração e Conciliação) mostra no topo um quadro com as responsabilidades e atribuições dele.',
    'O administrador ajusta esse texto em Parâmetros Pré TASK > Módulos do TASK, no campo Responsabilidades do setor de cada módulo, e publica.'
  ] },
  { v: 204, data: '2026-11-23', titulo: 'Propostas dentro do CRM', itens: [
    'As propostas agora ficam no CRM, num bloco abaixo do funil de vendas. Tudo continua igual: quadro por etapa, lista, busca e filtro.',
    'O item Propostas saiu do menu lateral. Abra o CRM e role a tela até o bloco Propostas.',
    'Os atalhos do painel Hoje, do sino de notificações e dos cards do CRM levam direto ao bloco Propostas.'
  ] },
  { v: 203, data: '2026-11-22', titulo: 'O app lembra o seu tema claro ou escuro', itens: [
    'O tema que você escolher no botão de sol e lua, no cabeçalho, fica guardado no seu usuário. Se fechou o app no escuro, ele abre no escuro; se fechou no claro, abre no claro.',
    'Vale em todos os aparelhos em que você entrar com o seu e-mail, e cada pessoa que usa o mesmo aparelho tem o seu próprio tema.'
  ] },
  { v: 202, data: '2026-11-22', titulo: 'Correção: menus e usuário sumindo depois de uma atualização', itens: [
    'Logo depois de uma atualização, o app às vezes abria sem o usuário e só com Nova proposta e Administração. Corrigido: se algum arquivo não chegar, o app usa a cópia guardada no aparelho.',
    'Se mesmo assim o app não carregar por completo, aparece um aviso com o botão Recarregar o app.'
  ] },
  { v: 201, data: '2026-11-22', titulo: 'Correção: Salvar proposta', itens: [
    'O botão Salvar proposta dava "permission-denied". Agora a proposta é salva e fica como Pendente de envio.'
  ] },
  { v: 200, data: '2026-11-22', titulo: 'Correção: menus e usuário sumindo depois da atualização', itens: [
    'Em alguns aparelhos, logo depois da versão 199, o menu mostrava só Nova proposta e Administração e o nome do usuário não aparecia. Corrigido.'
  ] },
  { v: 199, data: '2026-11-22', titulo: 'Salvar a proposta para enviar depois', itens: [
    'Nova proposta → Envio para aprovação: novo botão "Salvar proposta". Ele guarda a proposta sem enviar ao cliente.',
    'A proposta salva aparece na aba Propostas como "Pendente de envio", no painel Hoje como "Enviar a proposta ao cliente" e no funil do CRM, na nova coluna "Pendente de envio".',
    'Para enviar depois, abra o card na aba Propostas e use "Enviar pelo WhatsApp" ou "Copiar link da proposta". Na hora ela passa para "Aguardando aprovação".',
    'Também dá para abrir a proposta pendente no formulário, ajustar o que precisar e enviar: a versão nova entra no lugar da pendente.',
    'Novo filtro "Pendentes de envio" na aba Propostas.'
  ] },
  { v: 198, data: '2026-11-22', titulo: 'Pré-Contrato só com o que o contrato precisa', itens: [
    'O link do Pré-Contrato ficou mais curto: o cliente informa só o que entra no contrato (CNPJ, razão social, dados e endereço do responsável legal e o contrato social).',
    'Os demais dados (nome fantasia, inscrição estadual, telefone comercial, regime tributário, contabilidade, financeiro, dados bancários e observações) passaram para a Pré TASK, no novo item "Dados complementares", e o vendedor completa ali.',
    'Bandeira, sistema atual, certificado digital e logo saíram do link do cliente porque a Pré TASK já pede esses dados.',
    'Processos que já existem não perdem nada: o que o cliente já tinha enviado aparece preenchido nos Dados complementares.',
    'Administração → Parâmetros Pré-Contrato: nova coluna "Pré TASK" para escolher, campo a campo, o que o cliente preenche e o que fica para o vendedor.'
  ] },
  { v: 197, data: '2026-11-22', titulo: 'Postos em construção no Paraná e filtro de Cidade', itens: [
    'Telemetria → Postos em construção: o Paraná (PR) já pode ser escolhido no filtro de Estado.',
    'No PR o Radar lê as licenças ambientais de posto que o IAT (Instituto Água e Terra) concede e publica no Diário Oficial do Estado: Licença Prévia, de Instalação, de Operação, ampliações e renovações, com empresa, endereço, município e número da licença.',
    'Novo filtro de Cidade ao lado do Estado. Ele vale para a visão geral, a lista, o mapa, os documentos e os alertas.',
    'O Diário Oficial não traz o CNPJ: quando o Radar acha o posto na base da ANP, o CNPJ aparece marcado como vindo de lá. O que não aparece no documento fica como "pendente de confirmação".'
  ] },
  { v: 196, data: '2026-11-22', titulo: 'Postos em construção em Santa Catarina', itens: [
    'Telemetria → Postos em construção: Santa Catarina (SC) já pode ser escolhida no filtro de Estado.',
    'Em SC o Radar lê os pedidos de licença ambiental feitos às prefeituras (consulta pública do CIGA SINFAT), as licenças publicadas no Diário Oficial dos Municípios (DOM/SC) e os diários próprios das cidades (Querido Diário).',
    'Os pedidos aparecem ainda no protocolo, com empresa, CNPJ, endereço, número do processo e fase. Cada registro leva o link da consulta ou da publicação original.'
  ] },
  { v: 195, data: '2026-11-22', titulo: 'Postos em construção no Rio Grande do Sul', itens: [
    'Telemetria → Postos em construção: o Rio Grande do Sul (RS) já pode ser escolhido no filtro de Estado.',
    'O Radar do RS procura licenças de postos publicadas no Diário Oficial dos Municípios (FAMURS), no Diário Oficial do Estado e nos diários próprios das cidades (Querido Diário), cruza com a base da ANP e mostra empreendimentos, mapa, documentos e alertas, como no MT.',
    'No RS os pedidos de licença de posto quase não saem nos diários oficiais, então a lista deve começar pequena. Em Fontes e execuções dá para ver o que cada fonte trouxe.',
    'Cada registro traz o link do documento original. O que não aparece no documento fica como "pendente de confirmação".'
  ] },
  { v: 194, data: '2026-11-22', titulo: 'Menu em nova ordem', itens: [
    'O menu (lateral no computador e abas no celular) agora segue a ordem: Hoje, CRM, Propostas, TASK, Telemetria e Administração.'
  ] },
  { v: 193, data: '2026-11-22', titulo: 'Ícone do app: reinstale para ver o S', itens: [
    'O app instalado passa a ser reconhecido como um app novo, com o ícone do S. Para trocar o ícone antigo: desinstale o Shotgun (clique com o botão direito no atalho ou nas configurações do navegador) e instale de novo pelo botão Instalar app ou pelo ícone de instalar na barra de endereço.',
    'Seus dados e o seu login continuam os mesmos. Não é preciso fazer nada no celular se o ícone já estiver certo.'
  ] },
  { v: 192, data: '2026-11-22', titulo: 'Ícone novo do app e e-mail no menu', itens: [
    'O ícone do app instalado (atalho do computador, menu Iniciar e tela inicial do celular) passa a ser o S da nova marca.',
    'No computador, o Chrome ou o Edge pode pedir para confirmar a troca do ícone: aceite. Se o ícone antigo continuar depois de fechar e abrir o app, desinstale o Shotgun e instale de novo (os dados ficam salvos na conta).',
    'No computador, o pé do menu lateral mostra o seu e-mail logo abaixo do nome.'
  ] },
  { v: 191, data: '2026-11-22', titulo: 'Sino de notificações volta a abrir', itens: [
    'Tocar no sino mostra de novo a lista de notificações, no computador e no celular, no tema claro e no escuro.'
  ] },
  { v: 190, data: '2026-11-22', titulo: 'Endereço do estabelecimento no responsável legal', itens: [
    'Nos dados complementares, a seção do responsável legal tem o botão "Usar endereço do estabelecimento". Um toque busca na Receita o endereço do CNPJ da proposta e preenche endereço, número, complemento, bairro, cidade e estado. Depois é só conferir.'
  ] },
  { v: 189, data: '2026-11-22', titulo: 'Slogan no cabeçalho do celular', itens: [
    'No celular, o slogan "O cliente na mira, do primeiro contato ao pós-venda." voltou a aparecer no cabeçalho, logo abaixo da logomarca.'
  ] },
  { v: 188, data: '2026-11-22', titulo: 'Shotgun de cara nova', itens: [
    'Nova identidade visual em todo o app: logomarca com o S estilizado, cores grafite e laranja e a fonte Montserrat. O slogan agora é "O cliente na mira, do primeiro contato ao pós-venda."',
    'O app abre no tema escuro. Para usar o claro, toque no botão de sol no cabeçalho (ao lado do sino). A escolha fica salva no aparelho.',
    'No computador, o menu fica na lateral esquerda, com ícones. O botão no topo do menu recolhe a lateral e deixa só os ícones, para sobrar mais espaço.',
    'Botões principais em laranja, cards com cantos arredondados e novo ícone do app. Se o ícone antigo continuar na tela inicial do celular, remova e instale o app de novo.'
  ] },
  { v: 187, data: '2026-11-22', titulo: 'Documento pode ficar para depois', itens: [
    'Nos dados complementares, cada anexo obrigatório (como Certificado Digital e Logo) tem a opção "Não tenho em mãos, mando mais tarde". O cliente salva os dados sem o arquivo.',
    'A proposta mostra DOCUMENTO PENDENTE no Passo 2, com o que falta, e o botão Cobrar documento pelo WhatsApp. O Pré TASK também avisa na aba Anexos.',
    'Para enviar depois, o cliente abre o mesmo link do Pré-Contrato: a página mostra só os documentos que faltam.'
  ] },
  { v: 186, data: '2026-11-22', titulo: 'Proposta aceita no sino', itens: [
    'Quando o cliente aprova a proposta, o sino de notificações avisa o vendedor dono da proposta e o administrador, com o cliente, os valores e quem aprovou. Tocar no aviso abre a proposta.'
  ] },
  { v: 185, data: '2026-11-22', titulo: 'Proposta mais fácil de preencher no celular', itens: [
    'Nova proposta no celular: em Licenças e Mensalidades, cada item mostra a descrição em cima, Qtd. e Preço unitário lado a lado em campos grandes, e as opções Isento, Ocultar e Não constar em contrato embaixo, sem nada cortado na lateral.'
  ] },
  { v: 184, data: '2026-11-22', titulo: 'Pedidos de acesso no sino', itens: [
    'Administrador: quando alguém se cadastra pelo "Me cadastrar" e fica aguardando liberação, o pedido aparece no sino de notificações. Tocar no aviso abre a tela Usuários.'
  ] },
  { v: 183, data: '2026-11-22', titulo: 'Filtros por usuário e estado no CRM', itens: [
    'CRM: filtre o Funil, os Leads e os Clientes por estado. O estado vem da cidade do lead ou da proposta.',
    'Os seus estados de atuação aparecem primeiro na lista de estados.',
    'Administrador: o novo filtro de usuário (no lugar de "Só os meus") mostra os leads de cada vendedor, com os estados de atuação ao lado do nome. Escolhendo um estado, a lista mostra só quem atua nele.'
  ] },
  { v: 182, data: '2026-11-21', titulo: 'Nova senha em português e correção no cadastro', itens: [
    'Esqueci minha senha: o e-mail e a página para criar a nova senha agora vêm em português, com a cara do Shotgun.',
    'Login: se você começou o cadastro antes e não terminou, "Me cadastrar" com o mesmo e-mail e a mesma senha agora entra e leva você de volta para terminar o cadastro.'
  ] },
  { v: 181, data: '2026-11-21', titulo: 'Central de notificações e outras novidades', itens: [
    'Sino de notificações no topo da tela, ao lado da versão: o número mostra quantos avisos você ainda não leu. Cada pessoa vê os avisos do seu setor; o administrador vê os de todos.',
    'Login: "Me cadastrar" cria a sua conta. No primeiro acesso, o app pede nome completo, estado de atuação e uma selfie, e o cadastro fica aguardando liberação do administrador.',
    'Seus dados: você pode colocar a logo da sua revenda no cabeçalho do PDF da proposta (opcional).',
    'Implantação: nova modalidade "Só combustível". A proposta mostra a quilometragem de ida e volta e informa que é cobrado apenas o combustível.',
    'Módulos: botão "Finalizar todos" no cabeçalho de Processos marca de uma vez os processos que faltam.',
    'TASK: quando o Pré TASK está completo, o botão do card passa a se chamar DADOS.',
    'Telemetria: nova tela "Postos em construção" do Mato Grosso, com os avisos publicados no Diário Oficial (IOMAT).'
  ] },
  { v: 179, data: '2026-11-21', titulo: 'Ditado nas Observações do CRM', itens: [
    'CRM: grave um áudio e o app transcreve o texto direto no campo Observações.'
  ] },
  { v: 176, data: '2026-11-21', titulo: 'Novidades a cada atualização', itens: [
    'Sempre que o app atualizar, esta janela mostra o que mudou.',
    'Para rever depois, toque em "Versão" no topo da tela. Lá também fica o botão para forçar a atualização do app.'
  ] },
  { v: 175, data: '2026-11-21', titulo: 'Link da base ao finalizar "Criar a base"', itens: [
    'Módulos: ao marcar "Criar a base" como Finalizado, o app pede o link da base e só finaliza com um endereço válido.',
    'O link aparece abaixo do processo (com Alterar), preenche "Link da base" nos Dados do módulo e marca "Base liberada" como Sim.'
  ] },
  { v: 174, data: '2026-11-21', titulo: 'Filtros na Telemetria ANP', itens: [
    'Telemetria ANP: filtre os postos novos por Estado, Cidade e Bandeira.'
  ] },
  { v: 171, data: '2026-11-21', titulo: 'Sócios no cartão do posto', itens: [
    'Telemetria ANP: o cartão de cada posto mostra os sócios cadastrados na Receita.'
  ] },
  { v: 169, data: '2026-11-21', titulo: 'Telemetria ANP: postos novos', itens: [
    'Nova tela com os postos que entraram na ANP nos últimos 15 dias, com destaque para os que entraram hoje.'
  ] },
  { v: 167, data: '2026-11-21', titulo: 'Nova aba Telemetria', itens: [
    'Aba Telemetria para acompanhar postos em construção. As pesquisas são feitas por Estado, começando pelo Mato Grosso.'
  ] },
  { v: 166, data: '2026-11-21', titulo: 'Novo lead em blocos', itens: [
    'CRM: a tela do lead foi organizada em blocos (Empresa, Contatos e Negociação), mais fácil de preencher.'
  ] },
  { v: 165, data: '2026-11-21', titulo: 'Pesquisar na ANP sem o CNPJ', itens: [
    'CRM e Nova proposta: encontre o posto na ANP pelo nome, Estado, cidade e bandeira, mesmo sem saber o CNPJ.'
  ] },
  { v: 164, data: '2026-11-21', titulo: 'Cartão da ANP reorganizado', itens: [
    'CRM: o cartão da ANP ganhou o botão Abrir no mapa e legendas de Bandeira e Porte.',
    'Os Produtos ficam recolhidos no fim do cartão; toque para abrir. O CEP saiu do cartão.'
  ] },
  { v: 161, data: '2026-11-21', titulo: 'Cargo nos contatos', itens: [
    'CRM: cada contato do lead e do cliente agora tem o campo Cargo.'
  ] }
];

(function () {
  const LISTA = window.SHOTGUN_NOVIDADES || [];
  const ULTIMA = LISTA.reduce((m, n) => Math.max(m, n.v), 0);
  const MAX_AUTO = 5;                 // na abertura automática, no máximo as 5 versões mais recentes que a pessoa ainda não viu
  const CHAVE = 'shotgun-novidades-vista';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtD = d => { const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ''; };
  const ler = k => { try { return +(localStorage.getItem(k) || 0); } catch (_) { return 0; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (_) {} };

  // auto: abertura automática, mostra só o que a pessoa ainda não viu (desde = última versão vista; 0 = nunca viu)
  function abrir(auto, desde) {
    const dlg = document.getElementById('novDlg'), body = document.getElementById('novBody');
    if (!dlg || !body || !LISTA.length) return;
    const novas = auto ? LISTA.filter(n => n.v > (desde || 0)).slice(0, MAX_AUTO) : [];
    const mostrar = novas.length ? novas : LISTA;
    document.getElementById('novTit').textContent = novas.length ? 'Novidades desta versão' : 'Novidades do Shotgun';
    body.innerHTML = mostrar.map((n, i) => `
      <article class="novitem${novas.length && i === 0 ? ' atual' : ''}">
        <div class="novv"><span class="novnum">Versão ${n.v}</span>${n.data ? `<span class="novdata">${fmtD(n.data)}</span>` : ''}</div>
        <h4>${esc(n.titulo)}</h4>
        <ul>${(n.itens || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      </article>`).join('') + (novas.length && LISTA.length > novas.length ? '<button type="button" class="lnk novtodas" id="novTodas">Ver versões anteriores</button>' : '');
    const todas = document.getElementById('novTodas');
    if (todas) todas.addEventListener('click', () => abrir(false));
    body.scrollTop = 0;
    if (!dlg.open) dlg.showModal();
  }

  // Abre sozinha quando a versão mais nova desta lista ainda não foi vista por este usuário neste aparelho
  function conferir(uid) {
    if (!ULTIMA) return;
    const chave = CHAVE + (uid ? ':' + uid : '');
    const vista = ler(chave);
    if (vista >= ULTIMA) return;
    gravar(chave, ULTIMA);
    abrir(true, vista); // primeira vez com esta janela: mostra as versões mais recentes
  }

  window.shotgunNovidades = { abrir: () => abrir(false), conferir, ultima: ULTIMA };

  document.addEventListener('DOMContentLoaded', () => {
    const dlg = document.getElementById('novDlg'); if (!dlg) return;
    document.getElementById('novFechar').addEventListener('click', () => dlg.close());
    document.getElementById('novOk').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    document.getElementById('novAtualizar').addEventListener('click', () => { if (typeof window.atualizarApp === 'function') window.atualizarApp(document.getElementById('versaoApp')); });
  });
  // Com login: espera a pessoa entrar (auth.js avisa com o evento shotgun-entrou). Sem login (Firebase desligado): confere ao abrir.
  window.addEventListener('shotgun-entrou', e => setTimeout(() => conferir(e.detail && e.detail.uid), 400));
  window.addEventListener('load', () => { if (!document.body.classList.contains('locked') && typeof FB_ON !== 'undefined' && !FB_ON) setTimeout(() => conferir(''), 400); });
})();

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
    'No TASK, o "+ Novo cadastro" agora exige os mesmos dados obrigatórios do Pré TASK de uma proposta, incluindo os Dados Primários e os Dados complementares. O Salvar final só libera com tudo preenchido; o Salvar parcial continua guardando o card em "Em preparação".',
    'Os Dados Primários aparecem logo abaixo de Implantação e já vêm com o CNPJ, a razão social, a cidade e o CEP do posto informado. Proposta e contrato continuam opcionais nesse cadastro.'
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
    'No TASK, o "+ Novo cadastro" (perfis TASK e Administrador) abre o Pré TASK completo. Proposta, Dados Primários e contrato não são obrigatórios nesse cadastro direto, e dá para vincular uma proposta aprovada depois.',
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
  { v: 198, data: '2026-11-22', titulo: 'Dados Primários só com o que o contrato precisa', itens: [
    'O link dos Dados Primários ficou mais curto: o cliente informa só o que entra no contrato (CNPJ, razão social, dados e endereço do responsável legal e o contrato social).',
    'Os demais dados (nome fantasia, inscrição estadual, telefone comercial, regime tributário, contabilidade, financeiro, dados bancários e observações) passaram para a Pré TASK, no novo item "Dados complementares", e o vendedor completa ali.',
    'Bandeira, sistema atual, certificado digital e logo saíram do link do cliente porque a Pré TASK já pede esses dados.',
    'Processos que já existem não perdem nada: o que o cliente já tinha enviado aparece preenchido nos Dados complementares.',
    'Administração → Parâmetros Dados Primários: nova coluna "Pré TASK" para escolher, campo a campo, o que o cliente preenche e o que fica para o vendedor.'
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
    'Para enviar depois, o cliente abre o mesmo link da Etapa 2: a página mostra só os documentos que faltam.'
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

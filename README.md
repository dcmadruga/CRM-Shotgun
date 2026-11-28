# Shotgun

> O cliente na mira, do primeiro contato ao pós-venda.

Shotgun é o app (PWA) para a equipes Proposta Comercial em PDF, no celular e no computador.

- `index.html`: o app. Funciona sem internet depois da primeira abertura (exceto busca de CNPJ e cálculo de km).
- Preços, textos e referências ficam no Firebase (protegidos pelo login) e são publicados pelo administrador.
- Os dados do vendedor (nome, telefone, e-mail) ficam em cada aparelho.

## Base de postos da ANP

- `anp/postos/NNN.json` guarda os postos revendedores da ANP (NNN = 3 primeiros dígitos do CNPJ). Não aparece em nenhuma tela: o CRM e a Nova proposta consultam pelo CNPJ e preenchem bandeira, endereço, coordenadas, bicos, combustíveis, tancagem e porte.
- Atualizada todo dia às 5h (Brasília) pela tarefa `.github/workflows/anp-postos.yml`, a partir da API pública `revendedoresapi.anp.gov.br`. Para atualizar na hora: Actions > Base de postos da ANP > Run workflow.
- As faixas de porte (Pequeno, Médio, Grande) ficam em Parâmetros Proposta > Valores de base.
- `anp/novos.json` alimenta a tela Telemetria > Telemetria ANP (postos novos dos últimos 15 dias, com destaque para os que entraram hoje). Gerado na mesma tarefa diária por `scripts/anp-novos.mjs`: entra o posto cuja autorização na ANP é recente ou cujo CNPJ apareceu pela primeira vez na base naquele dia.

- Os postos novos também viram aviso no sino (`notificacoes.js`): um por dia e por Estado, dos últimos 7 dias, só nos Estados de atuação da pessoa (`usuarios/{uid}.estados`, a mesma regra dos filtros do CRM). Vale para o ADM também; sem Estado marcado não há aviso. Tocar abre a Telemetria ANP filtrada no Estado.

## Identidade visual

- `tema.css` concentra os design tokens (cores, Montserrat, espaçamentos, raios, sombras e tempos de animação) e a camada visual compartilhada: cabeçalho, menu lateral recolhível no computador, login, tela de carregamento, botões e cards. Telas novas devem usar as variáveis de lá (`--bg`, `--surface`, `--fg`, `--muted`, `--line`, `--accent`, `--accent-fg`, `--accent-text`, `--danger`, `--ok-text`...) em vez de cores fixas.
- Tema escuro é o inicial; o botão de sol/lua no cabeçalho troca para o claro e grava a escolha no aparelho (`sg-tema`).
- Logos em `icons/`: `shotgun-logo.png` (fundos claros), `shotgun-logo-negativo.png` (fundos escuros) e `shotgun-simbolo-negativo.png` (o S, na tela de carregamento e no menu recolhido). Ícones do app e favicon usam só o S (`icons/shotgun-s-*.png`). Ao trocar um ícone, troque também o nome do arquivo: o Chrome e o Edge só atualizam o ícone do app instalado quando o endereço no manifest muda.
- As páginas que o cliente abre (`aprovar.html`, `contrato.html`, `dados.html`) seguem com a marca Argo.

## Cadastro no primeiro acesso

- No primeiro login, o app pede nome completo, estado(s) de atuação e uma foto do rosto (selfie). Quem já tem tudo isso preenchido não vê a tela.
- Na tela de login, "Me cadastrar" cria a conta (e-mail e senha) e leva para o cadastro. Quem entra com uma conta que ainda não está cadastrada em Usuários preenche os mesmos dados e fica "Aguardando liberação": o cadastro aparece no topo da tela Usuários, com a foto, e o administrador clica em Liberar.
- Precisa das regras de `docs/cadastro-firestore.rules` publicadas no Firestore.

## Revendas

- Administração > Revendas (só ADM): `revendas/{id}` guarda `nome`, `estados` (UFs de atuação) e `gerente` (uid). O vínculo de cada pessoa fica no cadastro dela (`usuarios/{uid}.revenda`), então cada usuário pertence a uma revenda só. A tela Usuários também troca a revenda.
- O gerente da revenda vê Parâmetros Proposta e publica em `revendas/{id}/parametros/proposta` (cópia completa dos parâmetros). Os usuários da revenda carregam esse documento; se ele não existir, usam `config/parametros`. O ADM sempre edita os gerais e pode apagar os da revenda ("Voltar aos parâmetros gerais").
- Logo da revenda (`base.logoRev`, com `logoRevW`/`logoRevH`) e valores de base (R$ por km, validade, portes por tancagem e bases de deslocamento) ficam no cadastro da revenda (`revendas/{id}.base`), editados pelo ADM em Revendas e pelo gerente em Parâmetros Proposta. Campo vazio segue o valor geral (`config/parametros`). O app aplica esses valores por cima dos parâmetros carregados.
- Precisa das regras de `docs/revendas-firestore.rules` publicadas no Firestore.

## Novidades a cada versão

- `novidades.js` guarda o que mudou em cada versão, em linguagem de usuário. Quando o app atualiza, a janela "Novidades" abre sozinha uma vez (por usuário, em cada aparelho), depois do login. Tocar em "Versão A.M.R" no cabeçalho reabre a janela, que também tem o botão "Forçar atualização do app".
- Todo PR que sobe a versão do `sw.js` acrescenta no topo de `novidades.js` uma entrada com a mesma versão (instruções no começo do arquivo).
- A versão segue o formato A.M.R, por exemplo 1.11.302: A = ano do app (1 = 2026), M = mês, R = release dentro do mês, que volta a 1 quando o mês vira (1.12.1). Mudança sem nada visível pode ficar sem entrada.

## Nova senha e e-mails da conta

- `acao.html` é a página das ações de conta do Firebase (criar nova senha, confirmar e-mail), em português e com a marca Shotgun. O app pede os e-mails em `pt-BR`.
- Configuração no Console do Firebase (idioma dos modelos e URL de ação): `docs/emails-firebase.md`.

## Agenda de demonstrações

- Menu Agenda (`agenda.js`): demonstrações do sistema, sempre ligadas a um lead do CRM. Quem apresenta é o vendedor dono do lead. Modos Semana, Dia e Próximas; os "Próximo contato" dos leads em aberto aparecem como lembrete (atrasados em vermelho); o lembrete some quando o lead já tem demo válida (não cancelada, não remarcada, não "não compareceu") com data igual ou posterior ao `prox`. Cada lembrete tem os botões Reagendar e Feito, que gravam um novo `prox` e uma anotação no histórico.
- As demonstrações ficam no próprio lead, em `crm/{id}.demos` (lista com `id`, `data`, `hora`, `dur`, `formato`, `link`, `local`, `participantes`, `obs`, `status`). Por isso valem as mesmas regras do CRM, sem regra nova no Firestore: o vendedor vê as dele e o ADM vê todas (com filtro por usuário).
- Andamento (`status`): agendada, confirmada, realizada (com `resultado`: proposta, pensar ou sem), naocompareceu, remarcada (na tela "Reagendada": obriga nova data e hora, repete o resto da demo original e `remarcadaPara` aponta a demo nova) e cancelada (`motivoCanc`). Os botões Realizada, Reagendada e Cancelada também ficam embaixo de cada card da Agenda. Cada mudança grava uma anotação "Reunião" no histórico do lead. Realizada move o lead em aberto para Qualificado, ou para Perdido quando não há interesse; "Vai pensar" grava o Próximo contato.
- Planejado × real: Realizada pede a hora em que começou (`horaReal`) e a duração real (`durReal`). Editar a data ou a hora de uma demo já agendada guarda o primeiro horário em `agOrig` e anota a mudança no histórico. Na tela (sem gravar nada) há também Em andamento (entre o início e o fim) e Atrasada (passou do fim sem resultado). Os cards da Agenda e da tela Hoje mostram horário anterior, origem da reagendada e atraso de início.
- Avisos sem gravar nada: a Agenda monta os avisos do sino (`window.shotgunAvisos('agenda', lista)`, em `notificacoes.js`) só para quem apresenta: demo agendada por outra pessoa, lembrete no dia e "Como foi a demonstração?" depois do horário. O lido/não lido usa o mesmo `notifLidas` do sino. A tela Hoje ganha o bloco "Demonstrações de hoje".
- Cliente: "Confirmar pelo WhatsApp" (wa.me com a mensagem pronta, assinada "- Argo" como as outras mensagens ao cliente; o envio fica anotado no histórico do lead) e "Adicionar ao Google Agenda" (link `calendar.google.com/calendar/render?action=TEMPLATE`, com fuso do aparelho e convite para os participantes com e-mail). Sem integração automática.
- A Agenda não lê o banco: recebe os leads do `crm.js` pelo evento `crm-dados`. O formulário avisa quando a pessoa já tem outra demonstração no mesmo horário.

## Fluxo até o TASK pronto

- O cliente entra por três caminhos: **Lead** (CRM), **Proposta** (o app cria o lead sozinho, `crm/auto-<id da proposta>`, origem "Proposta direta", se ainda não houver lead com o mesmo CNPJ ou nome) e **cadastro direto no TASK** (perfis TASK e ADM, sem proposta nem contrato). O card mostra a origem e a fase: "Em preparação" (Pré TASK incompleto) ou "Pronto para as equipes".
- Cadastro direto: o "+ Novo cadastro" abre o Pré TASK completo. Tudo fica no próprio card (`tasks/{id}.pre4`, com o Pré-Contrato opcionais em `pre4.v2`); os anexos ficam em `tasks/{id}/anexos`, que precisa da regra de `docs/task-direto-firestore.rules`. Uma proposta aprovada pode ser vinculada depois (`propostaVinc`).
- Módulos: cada módulo principal é a área de trabalho de uma equipe e fica "Aguardando liberação" até a regra `libera` valer (TASK pronto, processo de outro módulo finalizado ou sempre liberado; o ADM muda em Parâmetros Pré TASK > Módulos do TASK). Ao liberar, o setor recebe aviso no sino. Quem é do setor anterior ou o ADM pode "Liberar agora". Módulo que já tinha trabalho começado continua liberado.
- Pendências (`mods[mid].pend`) e diário (`mods[mid].hist`, últimas 200 entradas) ficam no card. Pendência ligada a um processo deixa o processo Parado até ser resolvida.

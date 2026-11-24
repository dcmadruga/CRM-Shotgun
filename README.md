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
- Precisa das regras de `docs/revendas-firestore.rules` publicadas no Firestore.

## Novidades a cada versão

- `novidades.js` guarda o que mudou em cada versão, em linguagem de usuário. Quando o app atualiza, a janela "Novidades" abre sozinha uma vez (por usuário, em cada aparelho), depois do login. Tocar em "Versão N" no cabeçalho reabre a janela, que também tem o botão "Forçar atualização do app".
- Todo PR que sobe a versão do `sw.js` acrescenta no topo de `novidades.js` uma entrada com o mesmo número (instruções no começo do arquivo). Mudança sem nada visível pode ficar sem entrada.

## Nova senha e e-mails da conta

- `acao.html` é a página das ações de conta do Firebase (criar nova senha, confirmar e-mail), em português e com a marca Shotgun. O app pede os e-mails em `pt-BR`.
- Configuração no Console do Firebase (idioma dos modelos e URL de ação): `docs/emails-firebase.md`.

## Fluxo até o TASK pronto

- O cliente entra por três caminhos: **Lead** (CRM), **Proposta** (o app cria o lead sozinho, `crm/auto-<id da proposta>`, origem "Proposta direta", se ainda não houver lead com o mesmo CNPJ ou nome) e **cadastro direto no TASK** (perfis TASK e ADM, sem proposta nem contrato). O card mostra a origem e a fase: "Em preparação" (Pré TASK incompleto) ou "Pronto para as equipes".
- Cadastro direto: o "+ Novo cadastro" abre o Pré TASK completo. Tudo fica no próprio card (`tasks/{id}.pre4`, com o Pré-Contrato opcionais em `pre4.v2`); os anexos ficam em `tasks/{id}/anexos`, que precisa da regra de `docs/task-direto-firestore.rules`. Uma proposta aprovada pode ser vinculada depois (`propostaVinc`).
- Módulos: cada módulo principal é a área de trabalho de uma equipe e fica "Aguardando liberação" até a regra `libera` valer (TASK pronto, processo de outro módulo finalizado ou sempre liberado; o ADM muda em Parâmetros Pré TASK > Módulos do TASK). Ao liberar, o setor recebe aviso no sino. Quem é do setor anterior ou o ADM pode "Liberar agora". Módulo que já tinha trabalho começado continua liberado.
- Pendências (`mods[mid].pend`) e diário (`mods[mid].hist`, últimas 200 entradas) ficam no card. Pendência ligada a um processo deixa o processo Parado até ser resolvida.

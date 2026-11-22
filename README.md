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

## Novidades a cada versão

- `novidades.js` guarda o que mudou em cada versão, em linguagem de usuário. Quando o app atualiza, a janela "Novidades" abre sozinha uma vez (por usuário, em cada aparelho), depois do login. Tocar em "Versão N" no cabeçalho reabre a janela, que também tem o botão "Forçar atualização do app".
- Todo PR que sobe a versão do `sw.js` acrescenta no topo de `novidades.js` uma entrada com o mesmo número (instruções no começo do arquivo). Mudança sem nada visível pode ficar sem entrada.

## Nova senha e e-mails da conta

- `acao.html` é a página das ações de conta do Firebase (criar nova senha, confirmar e-mail), em português e com a marca Shotgun. O app pede os e-mails em `pt-BR`.
- Configuração no Console do Firebase (idioma dos modelos e URL de ação): `docs/emails-firebase.md`.

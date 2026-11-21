# Shotgun

> Cada cliente na mira, do primeiro contato ao pós-venda.

Shotgun é o app (PWA) para a equipes Proposta Comercial em PDF, no celular e no computador.

- `index.html`: o app. Funciona sem internet depois da primeira abertura (exceto busca de CNPJ e cálculo de km).
- Preços, textos e referências ficam no Firebase (protegidos pelo login) e são publicados pelo administrador.
- Os dados do vendedor (nome, telefone, e-mail) ficam em cada aparelho.

## Base de postos da ANP

- `anp/postos/NNN.json` guarda os postos revendedores da ANP (NNN = 3 primeiros dígitos do CNPJ). Não aparece em nenhuma tela: o CRM e a Nova proposta consultam pelo CNPJ e preenchem bandeira, endereço, coordenadas, bicos, combustíveis, tancagem e porte.
- Atualizada todo dia às 5h (Brasília) pela tarefa `.github/workflows/anp-postos.yml`, a partir da API pública `revendedoresapi.anp.gov.br`. Para atualizar na hora: Actions > Base de postos da ANP > Run workflow.
- As faixas de porte (Pequeno, Médio, Grande) ficam em Parâmetros Proposta > Valores de base.
- `anp/novos.json` alimenta a tela Telemetria > Telemetria ANP (postos novos dos últimos 15 dias, com destaque para os que entraram hoje). Gerado na mesma tarefa diária por `scripts/anp-novos.mjs`: entra o posto cuja autorização na ANP é recente ou cujo CNPJ apareceu pela primeira vez na base naquele dia.

## Novidades a cada versão

- `novidades.js` guarda o que mudou em cada versão, em linguagem de usuário. Quando o app atualiza, a janela "Novidades" abre sozinha uma vez (por usuário, em cada aparelho), depois do login. Tocar em "Versão N" no cabeçalho reabre a janela, que também tem o botão "Forçar atualização do app".
- Todo PR que sobe a versão do `sw.js` acrescenta no topo de `novidades.js` uma entrada com o mesmo número (instruções no começo do arquivo). Mudança sem nada visível pode ficar sem entrada.

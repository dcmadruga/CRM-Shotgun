# Radar de Novos Postos – MT, RS e SC

Módulo da aba **Telemetria → Postos em construção** (Estados MT, RS e SC) que procura, todo dia, publicações oficiais sobre abertura, ampliação e licenciamento de postos de combustíveis em Mato Grosso, no Rio Grande do Sul e em Santa Catarina. O objetivo é achar o posto na fase de protocolo (pedido de Licença Prévia ou de Instalação), antes de ele abrir.

Nada é inventado: cada registro vem de um documento público, com link para o original e o trecho de texto que o sustenta. Campo que não aparece no documento fica como "pendente de confirmação".

## Fontes

### Mato Grosso

| Fonte | Situação | Observação |
| --- | --- | --- |
| Diário Oficial de MT (IOMAT) | Integrada | Busca pública do site, em JSON. Traz os avisos "torna público que requereu" (LP, LI, LO, renovação, titularidade) e as listas de licenças emitidas pela SEMA. |
| Base de postos da ANP | Integrada (cruzamento) | Usa a base que o Shotgun já baixa todo dia (`anp/`). Diz se o CNPJ já é posto autorizado e dá bandeira e coordenadas. |
| Jornal Oficial dos Municípios (AMM-MT) | Prevista | Busca pública funciona a partir do GitHub Actions. |
| Querido Diário | Prevista | API aberta; em MT só cobre Rondonópolis. |
| SIMLAM público (SEMA) | Não integrada | Recusa conexões vindas de servidores fora do Brasil (testado do GitHub Actions). |
| SEM@ Virtual, PNLA | Não integradas | Exigem login. O robô não usa senhas nem contorna login ou CAPTCHA. |
| Consulta de protocolo SEPLAG | Não integrada | Tem CAPTCHA. |

### Rio Grande do Sul

No RS a maior parte dos postos é licenciada pelas prefeituras (impacto local); a FEPAM licencia onde o município não é habilitado.

| Fonte | Situação | Observação |
| --- | --- | --- |
| Diário Oficial dos Municípios do RS (FAMURS) | Integrada | Pesquisa pública do site (SIGPub). O robô lê por inteiro as matérias com sinal de licenciamento (licenças emitidas pelas prefeituras e avisos de requerimento). |
| Diário Oficial do Estado (DOE-RS) | Integrada | Mesma API pública que o site usa na pesquisa (`doe-backend.pro.rs.gov.br`). Pesquisa é aproximada: o classificador descarta o que não é licença de posto. |
| Base de postos da ANP | Integrada (cruzamento) | Mesma base, filtrada pelo RS. |
| FEPAM: consulta de licenças / SOL | Não integrada | A consulta pública antiga (ww3.fepam.rs.gov.br) saiu do ar e o SOL exige login. |
| Querido Diário (diários próprios das cidades) | Integrada | API aberta (`api.queridodiario.org.br`), filtrada pelos códigos IBGE do RS. Cobre só parte das cidades; o robô lê os trechos em volta dos termos e fica com os que falam de licenciamento. |

**O que o teste real mostrou (nov/2026):** pesquisando 12 meses, as três fontes do RS responderam normalmente, mas nenhuma trouxe licença ou pedido de licença de posto. Na FAMURS e no DOE-RS os resultados com "posto de combustíveis" são compras de combustível, contratos e editais; as poucas licenças ambientais publicadas eram de outras atividades. No RS a publicação do pedido de licença costuma sair em jornal local (súmula), que não tem fonte pública pesquisável. O Radar do RS continua rodando e mostra o que aparecer, mas a expectativa é de poucos achados até entrar uma fonte com as licenças (por exemplo, uma consulta pública da FEPAM, se voltar ao ar).

### Santa Catarina

Em SC boa parte dos postos é licenciada pelas prefeituras e fundações municipais, e mais de 100 delas usam o CIGA SINFAT, que tem consulta pública dos requerimentos.

| Fonte | Situação | Observação |
| --- | --- | --- |
| CIGA SINFAT municipal (consulta pública) | Integrada | `sinfatmunicipal.ciga.sc.gov.br/consulta`, sem login nem CAPTCHA. O robô pesquisa pelo nome do empreendimento (posto, combust, petro, abastec, derivados, conveniência) e pela lista geral da semana, abre cada requerimento e fica só com a atividade CONSEMA 42.32 (42.32.00 posto; 42.32.30 troca de tanques; 42.32.20/40 tancagem para consumo próprio). Traz pedido de LAP/LAI/LAO, renovação e licença concedida, com CNPJ, endereço, processo e fase. |
| Diário Oficial dos Municípios (DOM/SC) | Integrada | Pesquisa pública do site, só na categoria "Licenciamento ambiental". Lê o extrato de cada publicação. |
| Querido Diário (diários próprios das cidades) | Integrada | Mesma fonte do RS, filtrada pelos códigos IBGE de SC (hoje traz Joinville, por exemplo). |
| Base de postos da ANP | Integrada (cruzamento) | Mesma base, filtrada por SC. |
| IMA-SC: consulta e relatórios de licenciamento | Não integrada | Exigem reCAPTCHA. O robô não contorna CAPTCHA. |
| Diário Oficial do Estado (DOE-SC) | Não integrada | Fica para uma próxima entrega. |

**Teste real (nov/2026, 12 meses):** o SINFAT devolveu 247 requerimentos de posto (atividade 42.32), o DOM/SC 4 e o Querido Diário 7. Entre eles, 29 novos postos, ampliações ou trocas de tanques.

Uma fonte só aparece como "Monitorada" no app depois de uma execução real com sucesso.

## Como funciona

```
GitHub Actions (a cada 15 min)
  └─ scripts/radar/radar.mjs  (uma rodada cobre todas as fontes; cada uma tem o seu cursor de datas)
       ├─ lê radar_config/geral (frequência, "Pesquisar agora")
       ├─ fontes/iomat.mjs   → MT: páginas do diário com as expressões pesquisadas
       ├─ fontes/famurs.mjs  → RS: matérias do Diário dos Municípios
       ├─ fontes/doers.mjs   → RS: matérias do Diário Oficial do Estado
       ├─ fontes/querido.mjs → RS e SC: trechos dos diários próprios das cidades (Querido Diário)
       ├─ fontes/sinfat.mjs  → SC: requerimentos de licença das prefeituras (CIGA SINFAT, já estruturados)
       ├─ fontes/domsc.mjs   → SC: publicações de licenciamento do Diário dos Municípios
       ├─ classificar.mjs    → separa os avisos, decide se é posto, extrai os campos, classifica
       ├─ fontes/anp.mjs     → confirma o CNPJ e acha CNPJ pelo nome + município
       ├─ deduplica (CNPJ; sem CNPJ, razão social + município; processo = órgão + número)
       └─ firestore.mjs      → grava as coleções radar_* (API REST, conta de serviço)
App (radar.js, aba Telemetria → Postos em construção → MT, RS ou SC) lê as coleções e permite revisão, filtros, mapa e alertas.
```

O agendamento confere a cada 15 minutos, mas só pesquisa quando passou o tempo configurado no app (padrão 24 h) ou quando um administrador usa **Pesquisar agora**. Isso roda no GitHub, mesmo com o app fechado.

### Classificação

- **Categoria** (empreendimento): novo posto, ampliação, reforma, instalação de tanques, renovação, mudança de titularidade, ponto de abastecimento próprio (fazenda/frota), outro.
- **Evento** (cada documento): solicitação de LP, LI, LO, LP+LI, LP+LI+LO, renovação, titularidade; licença emitida (LP, LI, LO); indeferido/arquivado. Pedido de licença e licença emitida são eventos diferentes.
- **Situação**: solicitado (protocolo), em análise, aprovado, indeferido.
- **Confiança**: *processo confirmado* (atividade de posto explícita + CNPJ ou nº de processo), *possível novo empreendimento* (posto sem CNPJ nem processo), *documento aguardando análise* (ponto de abastecimento de fazenda, texto truncado), *informação não confirmada* (campo deduzido, como CNPJ achado pelo nome na ANP).
- Pedido de LP/LI de um CNPJ que já é posto autorizado na ANP é tratado como ampliação/reforma.

Cada registro tem o campo `uf` (MT, RS ou SC). Registros antigos sem `uf` são de MT.

## Coleções no Firestore

| Coleção | Conteúdo |
| --- | --- |
| `radar_empreendimentos` | Um por empresa/local: razão social, CNPJ, município, endereço, coordenadas, categoria, situação, confiança, eventos, resumo dos processos e documentos, `revisao` (feita pelo adm), `leadId` (lead criado no CRM). |
| `radar_processos` | Por órgão + número do processo (ou evento + data quando não há número). |
| `radar_documentos` | Cada aviso encontrado: fonte, link, data de publicação, data da coleta, trecho, classificação. |
| `radar_fontes` | Situação real de cada fonte, última coleta, último erro, cursor de datas, ligada/desligada. |
| `radar_historico` | Cada documento novo e cada revisão manual. |
| `radar_alertas` | Alertas no app (quem já leu). Só para registro novo ou mudança relevante publicada nos últimos 10 dias. |
| `radar_execucoes` | Cada rodada do robô: período, fontes, quantidades, erros. |
| `radar_config/geral` | Frequência e pedido de "Pesquisar agora". |

## Instalação (uma vez, feita pelo administrador do Firebase)

1. **Chave da conta de serviço.** No [console do Firebase](https://console.firebase.google.com/), projeto `propostas-argo` → engrenagem → **Configurações do projeto** → aba **Contas de serviço** → **Gerar nova chave privada**. Baixa um arquivo `.json`. Guarde com cuidado: ele dá acesso de administrador ao banco.
2. **Segredo no GitHub.** No repositório → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Nome: `FIREBASE_SERVICE_ACCOUNT`. Valor: o conteúdo inteiro do arquivo `.json`. Salve e apague o arquivo do computador.
3. **Regras do Firestore.** Console do Firebase → **Firestore Database** → **Regras**. Cole os blocos de [`docs/radar-firestore.rules`](radar-firestore.rules) dentro do `match /databases/{database}/documents { ... }` existente, sem apagar o resto, e **Publique**.
4. **Primeira execução.** GitHub → **Actions** → **Radar de novos postos (MT)** → **Run workflow**. Sem data, a primeira rodada busca os últimos 12 meses (leva alguns minutos). Depois disso o agendamento segue sozinho.

Sem o segredo, o agendamento não faz nada, e o push de código roda em **modo de teste**: pesquisa e classifica de verdade, mas não grava; o resultado fica como artefato `radar-saida` na execução.

## Operação

- **Frequência:** aba Telemetria → Postos em construção → MT → Configuração (adm). 6, 12, 24, 48 ou 72 horas.
- **Pesquisar agora:** botão no topo do Radar (adm). O robô atende na próxima checagem (até 15 min).
- **Reprocessar um período:** Actions → Run workflow → campo "Pesquisar a partir de". Documentos já gravados não são duplicados.
- **Revisão:** no detalhe do empreendimento, o adm confirma ou descarta (descartados somem das listas e indicadores). O robô nunca altera a revisão.
- **Criar lead no CRM:** botão no detalhe; leva razão social, CNPJ e município.

## Manutenção

- **Nova fonte:** criar `scripts/radar/fontes/<id>.mjs` exportando `info` ({ id, uf, nome, url, tipo }) e `coletar(de, ate, log)` que devolva `{ docs: [{ id, titulo, entidade, texto, data, url, local }], consultas }`; acrescentar em `FONTES` no `radar.mjs` e na lista de fontes do Estado no `radar.js`.
- **Novo Estado:** acrescentar em `UFS` (`municipios.mjs`), em `ATIVOS` (`telemetria.js`) e em `NOME_UF`/`CENTRO_UF` (`radar.js`). Ela só aparece como monitorada depois da primeira coleta com sucesso.
- **Novas expressões de busca:** `TERMOS` em `fontes/iomat.mjs`.
- **Regras de classificação:** `classificar.mjs`. Para testar sem gravar: `RADAR_TESTE=true node scripts/radar/radar.mjs` (`RADAR_FONTES=famurs,doe-rs,querido-rs` limita às fontes do RS e `RADAR_FONTES=sinfat-sc,dom-sc,querido-sc` às de SC; `RADAR_AMOSTRA_LOG=1` mostra no log o que cada fonte devolveu) (precisa de internet para o IOMAT e o IBGE).
- **Erros:** aparecem em Fontes e execuções (no app) e no log da execução no GitHub Actions. Se o IOMAT mudar o formato da busca, a fonte fica "Com erro" e o cursor de datas não avança, então nada se perde: a próxima rodada boa recupera o período.
- **Custo:** o GitHub Actions é gratuito para repositório público; cada checagem sem trabalho leva poucos segundos.

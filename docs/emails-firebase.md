# E-mails e página de nova senha em português

O app já pede ao Firebase os e-mails em português do Brasil e tem a página própria `acao.html` (com a marca Shotgun) para criar a nova senha. Faltam dois ajustes no Console do Firebase (projeto **propostas-argo**):

## 1. Idioma dos e-mails
Console do Firebase > **Authentication** > aba **Templates** > ícone de lápis ao lado de "Idioma do modelo" (Template language) > escolha **Português (Brasil)** > Salvar.

## 2. Página de nova senha com a marca Shotgun
Ainda em **Templates**, abra **Redefinição de senha** (Password reset) > lápis > **Personalizar URL de ação** (Customize action URL) e cole:

```
https://dcmadruga.github.io/CRM-Shotgun/acao.html
```

Salvar. Essa URL vale para todos os modelos (verificação de e-mail e troca de e-mail também). O endereço `dcmadruga.github.io` precisa estar em Authentication > Configurações > **Domínios autorizados** (normalmente já está, porque o app entra por ele).

## Texto sugerido (opcional)
No mesmo modelo de Redefinição de senha:

- **Nome do remetente:** Shotgun
- **Assunto:** Crie uma nova senha no Shotgun
- **Mensagem:**

```
<p>Olá,</p>
<p>Recebemos um pedido para criar uma nova senha para a sua conta do Shotgun (%EMAIL%).</p>
<p><a href='%LINK%'>Toque aqui para criar a nova senha</a></p>
<p>Se não foi você que pediu, ignore este e-mail: a sua senha atual continua valendo.</p>
<p>Equipe Shotgun</p>
```

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
  { v: 185, data: '2026-11-22', titulo: 'Proposta mais fácil de preencher no celular', itens: [
    'Nova proposta no celular: em Licenças e Mensalidades, cada item mostra a descrição em cima, Qtd. e Preço unitário lado a lado em campos grandes, e as opções Isento, Ocultar e Não constar em contrato embaixo, sem nada cortado na lateral.'
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

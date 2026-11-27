// Módulos do TASK: cada módulo tem campos (dados) e processos, cada processo com o seu status.
// O administrador altera em "Administração > Parâmetros Módulos TASK"; isto é só o ponto de partida.
// "desc" é o texto que explica pelo que o setor é responsável (aparece no topo do módulo, no TASK).
// "pai" indica que o módulo é uma etapa dentro de outro (ex.: Homologação de Boletos dentro de Implantação).
// "libera" diz quando o módulo é liberado para a equipe: { tipo: 'pronto' } quando o TASK fica pronto (Pré TASK completo),
// { tipo: 'proc', mid, pid } quando o processo pid do módulo mid é finalizado, { tipo: 'livre' } sempre liberado.
// As etapas (módulos com "pai") seguem a liberação do módulo principal.
(function () {
  const p = (id, t, resp, prazo) => ({ id, t, resp: resp || '', prazo: prazo == null ? '' : String(prazo) });
  const c = (k, label, tipo, extra) => ({ k, label, tipo: tipo || 'texto', req: false, show: true, custom: true, ...(extra || {}) });
  const POSVENDA = { id: 'posvenda', titulo: 'Pós-vendas', pai: '', libera: { tipo: 'proc', mid: 'posstart', pid: 'p3' }, desc: 'Cuida do cliente depois que a implantação termina. Faz o contato de boas-vindas, acompanha os primeiros 30 dias, aplica a pesquisa de satisfação e passa o cliente para o suporte com tudo registrado.', campos: [c('respPos', 'Responsável no pós-vendas'), c('notaSat', 'Nota de satisfação (0 a 10)', 'numero'), c('obsPosv', 'Observações', 'textolongo')],
    processos: [p('p1', 'Contato de boas-vindas'), p('p2', 'Acompanhamento de 30 dias'), p('p3', 'Pesquisa de satisfação'), p('p4', 'Passagem para o suporte')] };
  // TEF / PIX é um setor só (id tef). A v271 chegou a separar o módulo PIX (id pix, com "herda"); a v272 junta de volta
  const TEF_DESC_ANTIGA = 'Cuida dos pagamentos eletrônicos do posto. Solicita os números lógicos à adquirente, instala o TEF fixo e o TEF móvel, configura o PIX e homologa as transações antes de liberar para uso.';
  const TEF_DESC_V271 = 'Cuida dos pagamentos com cartão no posto. Solicita os números lógicos à adquirente, instala o TEF fixo e o TEF móvel (PDV Móvel), configura os cartões frota e homologa as transações antes de liberar para uso.';
  window.MODULOS_PADRAO = {
    secoes: [
      { id: 'impl', titulo: 'Implantação', pai: '', libera: { tipo: 'pronto' }, desc: 'Responsável por colocar o sistema no ar para o cliente. Confere os dados do Pré TASK, cria a base, converte os dados do sistema anterior, libera a base e envia o link de acesso. Coordena as etapas Pré Start, Start e Pós Start até o encerramento da implantação.', campos: [c('baseLiberada', 'Base liberada', 'simnao', { abre: false }), c('linkBase', 'Link da base', 'link'), c('obsImpl', 'Observações', 'textolongo')],
        processos: [p('p1', 'Conferir dados do Pré TASK', 'Cadastro', 0), p('p2', 'Criar a base', 'Implantação', 1), p('p3', 'Converter dados do sistema legado', 'Implantação', 3), p('p4', 'Liberar a base', 'Implantação', 4), p('p5', 'Enviar link da base ao cliente', 'Implantação', 4)] },
      { id: 'boletos', titulo: 'Homologação de Boletos', pai: '', libera: { tipo: 'proc', mid: 'impl', pid: 'p2' }, desc: 'Deixa a emissão de boletos pronta para uso. Pede ao cliente os dados bancários (banco, agência, conta e carteira ou convênio), gera um boleto de teste e valida o retorno com o banco até concluir a homologação.', campos: [c('banco', 'Banco'), c('agencia', 'Agência'), c('conta', 'Conta'), c('carteira', 'Carteira / convênio')],
        processos: [p('p1', 'Solicitar dados bancários ao cliente'), p('p2', 'Gerar boleto de teste'), p('p3', 'Validar retorno com o banco'), p('p4', 'Homologação concluída')] },
      { id: 'prestart', titulo: 'Pré Start', pai: '', libera: { tipo: 'proc', mid: 'impl', pid: 'p4' }, desc: 'Prepara a base antes da instalação no posto: cadastro de produtos, tanques e bicos, usuários e permissões, configuração fiscal e teste de emissão de notas. Termina agendando o start com o cliente.', campos: [c('obsPre', 'Observações', 'textolongo')],
        processos: [p('p1', 'Cadastro de produtos'), p('p2', 'Cadastro de tanques e bicos'), p('p3', 'Cadastro de usuários e permissões'), p('p4', 'Configuração fiscal'), p('p5', 'Teste de emissão de notas'), p('p6', 'Agendar o start com o cliente')] },
      { id: 'start', titulo: 'Start', pai: '', libera: { tipo: 'proc', mid: 'prestart', pid: 'p6' }, desc: 'É o dia da virada no posto. O técnico responsável instala os PDVs, treina os frentistas e o escritório, acompanha o primeiro fechamento de caixa e colhe o aceite do cliente.', campos: [c('tecnico', 'Técnico responsável'), c('pdvs', 'PDVs instalados', 'numero')],
        processos: [p('p1', 'Instalação dos PDVs'), p('p2', 'Treinamento dos frentistas'), p('p3', 'Treinamento do escritório'), p('p4', 'Primeiro fechamento de caixa'), p('p5', 'Aceite do cliente')] },
      { id: 'posstart', titulo: 'Pós Start', pai: '', libera: { tipo: 'proc', mid: 'start', pid: 'p5' }, desc: 'Acompanha o cliente nos primeiros dias de uso, tira dúvidas, faz os retreinamentos necessários e encerra formalmente a implantação.', campos: [c('obsPos', 'Observações e retreinamentos', 'textolongo')],
        processos: [p('p1', 'Acompanhamento da primeira semana'), p('p2', 'Retreinamento'), p('p3', 'Encerramento da implantação')] },
      { id: 'tef', titulo: 'TEF / PIX', pai: '', libera: { tipo: 'proc', mid: 'impl', pid: 'p2' }, desc: TEF_DESC_ANTIGA, campos: [c('adqPrincipal', 'Adquirente principal'), c('logicos', 'Números lógicos', 'textolongo'), c('outrosAdq', 'Outros adquirentes'), c('tefFixo', 'TEF Fixo', 'simnao', { abre: false }), c('tefMovel', 'TEF Móvel', 'simnao', { abre: false })],
        processos: [p('p1', 'Solicitar números lógicos'), p('p2', 'Instalar TEF fixo'), p('p3', 'Instalar TEF móvel'), p('p4', 'Configurar PIX'), p('p5', 'Homologar transações')] },
      { id: 'integ', titulo: 'Integração', pai: '', libera: { tipo: 'proc', mid: 'impl', pid: 'p2' }, desc: 'Conecta o sistema às plataformas externas que o posto usa, como os aplicativos e programas de fidelidade da bandeira e a loja franqueada. Levanta as integrações necessárias, solicita as credenciais e confirma que tudo está funcionando.', campos: [c('bandeirado', 'Posto bandeirado', 'simnao', { abre: false }), c('bandeira', 'Bandeira'), c('franquia', 'Tem loja franqueada', 'simnao', { abre: false }), c('apps', 'Integração com aplicativos da companhia', 'textolongo')],
        processos: [p('p1', 'Levantar as integrações necessárias'), p('p2', 'Solicitar credenciais'), p('p3', 'Integração concluída')] },
      { id: 'conc', titulo: 'Conciliação', pai: '', libera: { tipo: 'proc', mid: 'impl', pid: 'p2' }, desc: 'Configura a conciliação das vendas em cartão e PIX com o que as adquirentes pagam, para o posto conferir taxas e recebimentos sem trabalho manual. Termina quando a conciliação é validada com o cliente.', campos: [c('dadosConc', 'Dados de conciliação', 'textolongo')],
        processos: [p('p1', 'Configurar a conciliação'), p('p2', 'Conciliação validada')] },
      POSVENDA
    ]
  };
  // Texto padrão de cada módulo, para quem publicou os módulos antes de existir a descrição
  window.MODULO_DESC = id => { const m = window.MODULOS_PADRAO.secoes.find(x => x.id === id); return m ? m.desc : ''; };
  // Completa os módulos publicados pelo ADM antes destas novidades: regra de liberação padrão de cada módulo conhecido
  // e o módulo Pós-vendas (entra uma vez só; se o ADM tirar e publicar, a marca temPosvenda impede que volte)
  // Pré Start, Start e Pós Start deixaram de ser etapas da Implantação (v234): nos módulos já publicados, soltam uma vez só
  // (marca etapasSoltas), cada um com a regra de liberação padrão; se o ADM voltar a prender e publicar, fica como ele deixou
  const SOLTAS = ['prestart', 'start', 'posstart'];
  window.modulosCompletar = mods => {
    if (!mods || !Array.isArray(mods.secoes)) return mods;
    if (!mods.etapasSoltas) { mods.secoes.forEach(m => { if (SOLTAS.includes(m.id) && m.pai === 'impl') { m.pai = ''; delete m.libera; } }); mods.etapasSoltas = true; }
    mods.secoes.forEach(m => { if (!m.libera && !m.pai) { const d = window.MODULOS_PADRAO.secoes.find(x => x.id === m.id); m.libera = d && d.libera ? JSON.parse(JSON.stringify(d.libera)) : { tipo: 'pronto' }; } });
    // Junta de volta o módulo PIX separado na v271 (o que tem "herda" do TEF): os processos e campos voltam para o TEF / PIX
    const ix = mods.secoes.findIndex(m => m.id === 'pix' && m.herda && m.herda.mid);
    if (ix >= 0) {
      const px = mods.secoes[ix], t = mods.secoes.find(m => m.id === px.herda.mid);
      if (t) {
        if (/^\s*tef\s*$/i.test(t.titulo || '')) t.titulo = 'TEF / PIX';
        if (t.desc === TEF_DESC_V271) t.desc = TEF_DESC_ANTIGA;
        const L = t.processos = t.processos || [], volta = (px.processos || []).filter(x => (px.herda.procs || []).includes(x.id) && !L.some(y => y.id === x.id));
        const j = L.findIndex(x => /homolog/i.test(x.t || '')); L.splice(j < 0 ? L.length : j, 0, ...volta);
        t.campos = (t.campos || []).concat((px.campos || []).filter(x => (px.herda.campos || []).includes(x.k) && !(t.campos || []).some(y => y.k === x.k)));
      }
      mods.secoes.splice(ix, 1);
    }
    delete mods.tefPixSeparado;
    if (!mods.temPosvenda) { if (!mods.secoes.some(m => m.id === 'posvenda')) mods.secoes.push(JSON.parse(JSON.stringify(POSVENDA))); mods.temPosvenda = true; }
    return mods;
  };
  window.MODULOS_PADRAO.temPosvenda = true;
  window.MODULOS_PADRAO.etapasSoltas = true;
  // Cards que receberam andamento no módulo PIX da v271 (tasks/{id}.mods.pix): volta para o TEF / PIX, em memória,
  // e é gravado na próxima alteração do card. Só quando não existe mais módulo pix (o ADM pode criar um de propósito)
  window.modulosHerdar = (t, mods) => {
    if (!t || !t.mods || !t.mods.pix || !mods || !Array.isArray(mods.secoes) || mods.secoes.some(m => m.id === 'pix')) return t;
    const de = t.mods.pix, para = t.mods.tef = t.mods.tef || {};
    Object.entries(de.proc || {}).forEach(([pid, v]) => { if (/^px\d/.test(pid)) return; para.proc = para.proc || {}; if (!para.proc[pid]) para.proc[pid] = v; });
    if (Array.isArray(de.pend) && de.pend.length) para.pend = (para.pend || []).concat(de.pend.filter(q => !(para.pend || []).some(x => x.id === q.id)));
    if (Array.isArray(de.hist) && de.hist.length) para.hist = (para.hist || []).concat(de.hist).sort((a, b) => (a.em || 0) - (b.em || 0)).slice(-200);
    Object.entries(de.dados || {}).forEach(([k, v]) => { para.dados = para.dados || {}; if (para.dados[k] == null) para.dados[k] = v; });
    delete t.mods.pix;
    return t;
  };
  // Com quem está a pendência
  window.PEND_COM = ['Cliente', 'Equipe interna', 'Outro setor', 'Banco', 'Adquirente', 'Bandeira', 'Fornecedor', 'Outro'];
  window.PROC_STATUS = { ni: 'Não iniciado', in: 'Iniciado', an: 'Em andamento', pa: 'Parado', fi: 'Finalizado' };
})();

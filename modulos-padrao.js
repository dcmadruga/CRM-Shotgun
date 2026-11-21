// Módulos do TASK: cada módulo tem campos (dados) e processos, cada processo com o seu status.
// O administrador altera em "Parâmetros Pré TASK > Módulos do TASK"; isto é só o ponto de partida.
// "pai" indica que o módulo é uma etapa dentro de outro (ex.: Homologação de Boletos dentro de Implantação).
(function () {
  const p = (id, t, resp, prazo) => ({ id, t, resp: resp || '', prazo: prazo == null ? '' : String(prazo) });
  const c = (k, label, tipo, extra) => ({ k, label, tipo: tipo || 'texto', req: false, show: true, custom: true, ...(extra || {}) });
  window.MODULOS_PADRAO = {
    secoes: [
      { id: 'impl', titulo: 'Implantação', pai: '', campos: [c('baseLiberada', 'Base liberada', 'simnao', { abre: false }), c('linkBase', 'Link da base', 'link'), c('obsImpl', 'Observações', 'textolongo')],
        processos: [p('p1', 'Conferir dados do Pré TASK', 'Cadastro', 0), p('p2', 'Criar a base', 'Implantação', 1), p('p3', 'Converter dados do sistema legado', 'Implantação', 3), p('p4', 'Liberar a base', 'Implantação', 4), p('p5', 'Enviar link da base ao cliente', 'Implantação', 4)] },
      { id: 'boletos', titulo: 'Homologação de Boletos', pai: '', campos: [c('banco', 'Banco'), c('agencia', 'Agência'), c('conta', 'Conta'), c('carteira', 'Carteira / convênio')],
        processos: [p('p1', 'Solicitar dados bancários ao cliente'), p('p2', 'Gerar boleto de teste'), p('p3', 'Validar retorno com o banco'), p('p4', 'Homologação concluída')] },
      { id: 'prestart', titulo: 'Pré Start', pai: 'impl', campos: [c('obsPre', 'Observações', 'textolongo')],
        processos: [p('p1', 'Cadastro de produtos'), p('p2', 'Cadastro de tanques e bicos'), p('p3', 'Cadastro de usuários e permissões'), p('p4', 'Configuração fiscal'), p('p5', 'Teste de emissão de notas'), p('p6', 'Agendar o start com o cliente')] },
      { id: 'start', titulo: 'Start', pai: 'impl', campos: [c('tecnico', 'Técnico responsável'), c('pdvs', 'PDVs instalados', 'numero')],
        processos: [p('p1', 'Instalação dos PDVs'), p('p2', 'Treinamento dos frentistas'), p('p3', 'Treinamento do escritório'), p('p4', 'Primeiro fechamento de caixa'), p('p5', 'Aceite do cliente')] },
      { id: 'posstart', titulo: 'Pós Start', pai: 'impl', campos: [c('obsPos', 'Observações e retreinamentos', 'textolongo')],
        processos: [p('p1', 'Acompanhamento da primeira semana'), p('p2', 'Retreinamento'), p('p3', 'Encerramento da implantação')] },
      { id: 'tef', titulo: 'TEF / PIX', pai: '', campos: [c('adqPrincipal', 'Adquirente principal'), c('logicos', 'Números lógicos', 'textolongo'), c('outrosAdq', 'Outros adquirentes'), c('tefFixo', 'TEF Fixo', 'simnao', { abre: false }), c('tefMovel', 'TEF Móvel', 'simnao', { abre: false })],
        processos: [p('p1', 'Solicitar números lógicos'), p('p2', 'Instalar TEF fixo'), p('p3', 'Instalar TEF móvel'), p('p4', 'Configurar PIX'), p('p5', 'Homologar transações')] },
      { id: 'integ', titulo: 'Integração', pai: '', campos: [c('bandeirado', 'Posto bandeirado', 'simnao', { abre: false }), c('bandeira', 'Bandeira'), c('franquia', 'Tem loja franqueada', 'simnao', { abre: false }), c('apps', 'Integração com aplicativos da companhia', 'textolongo')],
        processos: [p('p1', 'Levantar as integrações necessárias'), p('p2', 'Solicitar credenciais'), p('p3', 'Integração concluída')] },
      { id: 'conc', titulo: 'Conciliação', pai: '', campos: [c('dadosConc', 'Dados de conciliação', 'textolongo')],
        processos: [p('p1', 'Configurar a conciliação'), p('p2', 'Conciliação validada')] }
    ]
  };
  window.PROC_STATUS = { ni: 'Não iniciado', in: 'Iniciado', an: 'Em andamento', pa: 'Parado', fi: 'Finalizado' };
})();

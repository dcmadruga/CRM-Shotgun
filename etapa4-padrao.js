// Etapa 4 - Dados Referência Implantação: preenchida pelo vendedor depois do contrato aceito.
// O administrador altera pela aba "Parâmetros Referência Implantação"; isto é só o ponto de partida.
window.ETAPA4_PADRAO = {
  secoes: [
    { id: 'contato', titulo: 'Contato e agenda', campos: [
      { k: 'contatoImpl', label: 'Contato do cliente para a implantação', tipo: 'texto', req: true, show: true },
      { k: 'contatoFone', label: 'Telefone / WhatsApp do contato', tipo: 'telefone', req: true, show: true },
      { k: 'dataCombinada', label: 'Data combinada com o cliente para o start', tipo: 'data', req: true, show: true },
      { k: 'horario', label: 'Melhor horário para a implantação', tipo: 'opcoes', req: false, show: true, opcoes: 'Manhã, Tarde, Noite, Madrugada, Qualquer horário' }
    ] },
    { id: 'comercial', titulo: 'O que foi vendido', campos: [
      { k: 'modulos', label: 'Módulos e serviços vendidos', tipo: 'textolongo', req: true, show: true },
      { k: 'negociado', label: 'Condições especiais negociadas (descontos, brindes, prazos)', tipo: 'textolongo', req: false, show: true }
    ] },
    { id: 'operacao', titulo: 'Operação do cliente', campos: [
      { k: 'sistemaAnterior', label: 'Sistema anterior e migração de dados', tipo: 'textolongo', req: false, show: true },
      { k: 'particularidades', label: 'Particularidades do cliente (rede, filiais, operação)', tipo: 'textolongo', req: false, show: true },
      { k: 'obsImpl', label: 'Observações para a equipe de implantação', tipo: 'textolongo', req: false, show: true }
    ] }
  ]
};
// TEF / PIX: um item só no menu do Pré TASK, com dois blocos dentro, TEF e PIX (v273).
// Nos parâmetros já publicados, a seção "TEF / PIX" ganha o título de bloco "TEF" (mesmos campos, então o que já foi
// preenchido continua lá) e a seção "PIX" entra logo depois, com o Setor de Validação apontando para TEF / PIX (é o que
// a coloca dentro do mesmo item). Também desfaz a v271, que tinha virado dois itens ("TEF" com "antes", e "PIX").
// Uma vez só (marca tefPixJunto): se o ADM mudar ou apagar a seção PIX e publicar, fica como ele deixou.
(function () {
  const PIX = () => ({ id: 'pix', titulo: 'PIX', campos: [
    { k: 'pixIntegrado', label: 'PIX integrado ao PDV', tipo: 'simnao', req: true, show: true },
    { k: 'pixBanco', label: 'Banco ou adquirente do PIX', tipo: 'texto', req: true, show: true },
    { k: 'pixTipoChave', label: 'Tipo de chave PIX', tipo: 'opcoes', req: true, show: true, opcoes: 'CNPJ, E-mail, Telefone, Chave aleatória' },
    { k: 'pixChave', label: 'Chave PIX', tipo: 'texto', req: true, show: true }
  ] });
  // Contato do cliente para TEF / PIX: terceiro bloco do mesmo item (v274). Marca tefPixContato, uma vez só
  const CONTATO = () => ({ id: 'contatoTefPix', titulo: 'Contato Cliente: TEF / PIX', topo: true, campos: [
    { k: 'tefPixContatoNome', label: 'Nome do contato', tipo: 'texto', req: true, show: true },
    { k: 'tefPixContatoFone', label: 'Telefone / WhatsApp', tipo: 'telefone', req: true, show: true },
    { k: 'tefPixContatoEmail', label: 'E-mail', tipo: 'email', req: false, show: true }
  ] });
  const tefPix = x => /\btef\b/i.test(x || '') && /\bpix\b/i.test(x || '');
  window.pretaskCompletar = cfg => {
    if (!cfg || !Array.isArray(cfg.secoes)) return cfg;
    juntar(cfg);
    if (!cfg.tefPixContato) {
      const L = cfg.secoes, t = L.find(s => tefPix(s.titulo));
      if (t && !L.some(x => x.id === 'contatoTefPix' || (/contato/i.test(x.titulo || '') && tefPix(x.titulo)))) {
        const ct = CONTATO(), alvo = t.id || String(t.titulo).trim(), ult = L.reduce((u, x, k) => x === t || x.setor === alvo ? k : u, -1);
        ct.setor = alvo; if (t.porFilial === false) ct.porFilial = false;
        L.splice(ult + 1, 0, ct); cfg.tefPixMudou = true;
      }
      cfg.tefPixContato = true;
    }
    // v275: a pergunta "Tem integração com APP de terceiros?" vira o bloco próprio APP de terceiros, no mesmo item em que estava
    // (normalmente Integração). Vai junto o que depende dela (campos que só aparecem com Sim ou com uma opção dela).
    // Mesma chave do campo, então a resposta já dada continua. Uma vez só (marca appTerceirosBloco)
    if (!cfg.appTerceirosBloco) {
      const L = cfg.secoes, ehApp = c => /integra[cç][aã]o\s+com\s+(o\s+)?app/i.test(c.label || '');
      const s = L.find(x => x.id !== 'appTerceiros' && (x.campos || []).some(ehApp));
      if (s && !L.some(x => x.id === 'appTerceiros')) {
        const cs = s.campos, i = cs.findIndex(ehApp), c = cs[i], vai = [c];
        const abre = c.tipo === 'simnao' && (c.abre != null ? c.abre : i === 0) && i < cs.length - 1;
        for (let j = i + 1; j < cs.length; j++) {
          const x = cs[j];
          if (x.seOpcao && x.seOpcao[0] === c.k) { vai.push(x); continue; }
          if (abre && !x.solto && !(x.tipo === 'simnao' && x.abre)) { vai.push(x); continue; }
          if (abre) break;
        }
        s.campos = cs.filter(x => !vai.includes(x));
        const alvo = s.setor && s.setor !== 'proprio' ? s.setor : (s.id || String(s.titulo || '').trim());
        const app = { id: 'appTerceiros', titulo: 'APP de terceiros', setor: alvo, campos: vai.map((x, k) => k === 0 && x.tipo === 'simnao' && x.abre == null ? { ...x, abre: abre } : x) };
        if (s.porFilial === false) app.porFilial = false;
        L.splice(L.indexOf(s) + 1, 0, app); cfg.tefPixMudou = true;
      }
      cfg.appTerceirosBloco = true;
    }
    // v275: o contato vem primeiro dentro do item TEF / PIX (topo). Uma vez só (marca tefPixContatoTopo)
    if (!cfg.tefPixContatoTopo) { const ct = cfg.secoes.find(x => x.id === 'contatoTefPix'); if (ct && !ct.topo) { ct.topo = true; cfg.tefPixMudou = true; } cfg.tefPixContatoTopo = true; }
    // v280: onde tem Nome + Telefone do Gerente (ex.: Homologação de Boleto) entra o E-mail do Gerente logo depois do telefone,
    // com as mesmas condições de exibição do telefone. A sugestão "Contatos já informados" também preenche o e-mail.
    // Uma vez só (marca emailGerente): se o ADM apagar o campo e publicar, fica como ele deixou
    if (!cfg.emailGerente) {
      const chaves = new Set(cfg.secoes.flatMap(x => (x.campos || []).map(c => c.k)));
      cfg.secoes.forEach(x => {
        const cs = x.campos || [], ger = c => /gerente/i.test(c.label || '');
        const fone = cs.find(c => ger(c) && (c.tipo === 'telefone' || /telefone|whats|celular|\bfone\b/i.test(c.label || '')));
        if (!fone || cs.some(c => ger(c) && (c.tipo === 'email' || /e-?mail/i.test(c.label || '')))) return;
        let k = 'emailGerente', n = 2; while (chaves.has(k)) k = 'emailGerente' + n++; chaves.add(k);
        const em = { ...fone, k, label: String(fone.label).replace(/telefone(\s*\/\s*whats\s*app)?|whats\s*app|celular|\bfone\b/i, 'E-mail'), tipo: 'email', req: false };
        if (em.label === fone.label) em.label = 'E-mail do Gerente';
        delete em.ph; delete em.opcoes; delete em.abre;
        cs.splice(cs.indexOf(fone) + 1, 0, em); cfg.tefPixMudou = true;
      });
      cfg.emailGerente = true;
    }
    // v292: perguntas extras por bandeira (bloco Perguntas por bandeira dos Parâmetros Pré TASK). Começa com a Ipiranga.
    // Uma vez só (marca perguntasBandeiraV292): se o ADM mudar ou apagar e publicar, fica como ele deixou
    if (!cfg.perguntasBandeiraV292) {
      if (!Array.isArray(cfg.perguntasBandeira)) { cfg.perguntasBandeira = window.PERGUNTAS_BANDEIRA_PADRAO(); cfg.bandPergMudou = true; }
      cfg.perguntasBandeiraV292 = true;
    }
    return cfg;
  };
  function juntar(cfg) {
    if (cfg.tefPixJunto) return;
    const L = cfg.secoes, t = L.find(s => tefPix(s.titulo)) || L.find(s => tefPix(s.antes));
    if (t) {
      if (tefPix(t.antes)) t.titulo = t.antes; delete t.antes;
      if (!t.bloco) t.bloco = 'TEF';
      let px = L.find(x => x !== t && (x.id === 'pix' || /^\s*pix\s*$/i.test(x.titulo || '')));
      if (!px && !cfg.tefPixSeparado) { px = PIX(); L.splice(L.indexOf(t) + 1, 0, px); }
      if (px) { px.setor = t.id || String(t.titulo).trim(); if (t.porFilial === false) px.porFilial = false; else delete px.porFilial; }
      cfg.tefPixMudou = true;
    }
    delete cfg.tefPixSeparado; cfg.tefPixJunto = true;
  }
  window.ETAPA4_PADRAO.tefPixJunto = true;
  window.ETAPA4_PADRAO.tefPixContato = true;
  window.ETAPA4_PADRAO.tefPixContatoTopo = true;
  window.ETAPA4_PADRAO.appTerceirosBloco = true;
  window.ETAPA4_PADRAO.emailGerente = true;
  // Perguntas que aparecem no bloco Integração do Pré TASK quando "Qual bandeira" é a do grupo
  window.PERGUNTAS_BANDEIRA_PADRAO = () => [{ bandeira: 'Ipiranga', campos: [
    { k: 'pbIpPista', label: 'Integra PISTA', tipo: 'simnao', req: false },
    { k: 'pbIpAmpm', label: 'Integra AMPM', tipo: 'simnao', req: false },
    { k: 'pbIpJetoil', label: 'Integra JETOIL', tipo: 'simnao', req: false },
    { k: 'pbIpJetoilAtivo', label: 'Necessário ter Jetoil ativo', tipo: 'simnao', req: false, seSim: 'pbIpJetoil' },
    { k: 'pbIpProFrotas', label: 'Integra PRO FROTAS', tipo: 'simnao', req: false },
    { k: 'pbIpKmv', label: 'Integra KMV', tipo: 'simnao', req: false },
    { k: 'pbIpIndicar', label: 'Integra INDICAR', tipo: 'simnao', req: false },
    { k: 'pbIpIndicarAcesso', label: 'Acesso do Indicar', tipo: 'texto', req: false, ph: 'Usuário e senha de acesso ao Indicar', seSim: 'pbIpIndicar' }
  ] }, { bandeira: 'Petrobras', campos: [
    { k: 'pbBrMania', label: 'Integra BrMania', tipo: 'simnao', req: false },
    { k: 'pbBrPremmia', label: 'Integra Premmia', tipo: 'simnao', req: false },
    { k: 'pbBrLubrax', label: 'Integra Lubrax+', tipo: 'simnao', req: false }
  ] }];
  window.ETAPA4_PADRAO.perguntasBandeira = window.PERGUNTAS_BANDEIRA_PADRAO();
  window.ETAPA4_PADRAO.perguntasBandeiraV292 = true;
})();

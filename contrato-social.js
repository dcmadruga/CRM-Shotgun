// Leitura do contrato social no navegador do cliente: extrai o texto do PDF (pdf.js)
// ou, se for escaneado/foto, usa OCR (Tesseract). Depois procura os sócios e os dados deles.
// Nada é enviado para servidores: tudo roda no aparelho do cliente.
(function () {
  const PDFJS = 'lib/pdf.min.js', PDFJS_WORKER = 'lib/pdf.worker.min.js';
  const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/';
  const TESS_CORE = 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1';
  const TESS_LANG = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/por/4.0.0_best_int';
  const MAX_PAG = 12;

  const scripts = {};
  function carregar(src) {
    return scripts[src] || (scripts[src] = new Promise((ok, err) => {
      const s = document.createElement('script'); s.src = src; s.onload = ok;
      s.onerror = () => { delete scripts[src]; err(new Error('Não foi possível carregar ' + src)); };
      document.head.appendChild(s);
    }));
  }

  /* ---------- Texto ---------- */
  async function pdfDoc(file) {
    await carregar(PDFJS);
    const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  }
  async function textoPdf(pdf) {
    const pags = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 40); i++) {
      const tc = await (await pdf.getPage(i)).getTextContent();
      pags.push(tc.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join(''));
    }
    return pags;
  }
  let ocrWorker = null;
  async function ocr() {
    if (ocrWorker) return ocrWorker;
    await carregar(TESS + 'tesseract.min.js');
    ocrWorker = await window.Tesseract.createWorker('por', 1, { workerPath: TESS + 'worker.min.js', corePath: TESS_CORE, langPath: TESS_LANG });
    return ocrWorker;
  }
  async function canvasDaPagina(pdf, n) {
    const pg = await pdf.getPage(n), vp0 = pg.getViewport({ scale: 1 });
    const vp = pg.getViewport({ scale: Math.min(2.5, 2000 / Math.max(vp0.width, vp0.height)) });
    const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: cx, viewport: vp }).promise;
    return cv;
  }
  async function imagemReduzida(file) {
    try {
      const img = await createImageBitmap(file), m = Math.min(1, 2200 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * m); cv.height = Math.round(img.height * m);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); return cv;
    } catch (e) { return file; }
  }

  // ler(arquivos, aviso) -> { socios, ocr, paginas }. aviso(texto, sociosParciais) é chamado durante a leitura.
  async function ler(arquivos, aviso) {
    aviso = aviso || (() => {});
    arquivos = [...arquivos];
    const pdfs = arquivos.filter(f => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
    const imgs = arquivos.filter(f => /^image\//.test(f.type));
    let textos = [], usouOcr = false;
    const parcial = () => extrair(textos.join('\n'));
    for (const f of pdfs) {
      aviso('Abrindo o PDF…');
      const pdf = await pdfDoc(f);
      const pags = await textoPdf(pdf);
      const letras = pags.join('').replace(/[^A-Za-zÀ-ú]/g, '').length;
      if (letras > 120 * pags.length) { textos.push(...pags); continue; }
      // PDF escaneado: OCR página por página, mostrando os sócios assim que aparecem
      usouOcr = true;
      const n = Math.min(pdf.numPages, MAX_PAG);
      aviso('O PDF é uma imagem escaneada. Preparando a leitura (pode levar alguns minutos)…');
      const w = await ocr();
      for (let i = 1; i <= n; i++) {
        aviso(`Lendo página ${i} de ${n}…`, parcial());
        const { data } = await w.recognize(await canvasDaPagina(pdf, i));
        textos.push(data.text);
      }
    }
    if (imgs.length) {
      usouOcr = true;
      aviso('Preparando a leitura das fotos…');
      const w = await ocr();
      for (let i = 0; i < imgs.length; i++) {
        aviso(`Lendo foto ${i + 1} de ${imgs.length}…`, parcial());
        const { data } = await w.recognize(await imagemReduzida(imgs[i]));
        textos.push(data.text);
      }
    }
    return { socios: parcial(), ocr: usouOcr, texto: textos.join('\n') };
  }

  /* ---------- Sócios ---------- */
  const U = 'A-ZÁÂÃÀÉÊÍÓÔÕÚÜÇ', L = 'a-záâãàéêíóôõúüç';
  const PAL = `[${U}][${U}${L}'´\`.]+`;
  const LIG = '(?:d[aeo]s?|D[AEO]S?|e|E|de|DE|di|DI)';
  const NOME_QUAL = new RegExp(`(${PAL}(?:\\s+(?:${LIG}\\s+)?${PAL}){1,8})\\s*,?\\s*(?:brasileir|nacionalidade|portugu|naturalizad|estrangeir|argentin|italian|espanhol|paraguai|boliv)`, 'g');
  const NOME_CAPS = new RegExp(`[${U}]{2,}(?:\\s+(?:D[AEO]S?|E|DE)?\\s*[${U}]{2,}){1,8}`, 'g');
  const NAO_NOME = /\b(CPF|RG|SSP|LTDA|EIRELI|CEP|CNPJ|MF|CL[AÁ]USULA|CONTRATO|SOCIAL|ALTERA[CÇ][AÃ]O|JUNTA|COMERCIAL|ESTADO|REP[UÚ]BLICA|S\.?A\b|ME\b|EPP\b|N[º°]|RUA|AVENIDA|BAIRRO|QUOTAS?|CAPITAL)\b/;
  const CPF_RE = /(?<![\d\/.])(\d{3})\s?\.?\s?(\d{3})\s?\.?\s?(\d{3})\s?[-–.]?\s?(\d{2})(?![\d\/])/g;

  const dig = v => String(v || '').replace(/\D/g, '');
  function cpfOk(v) { const d = dig(v); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const c = n => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }; return c(9) === +d[9] && c(10) === +d[10]; }
  const tit = s => s.toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()).replace(/\s(D[aeo]s?|E|De)\s/g, m => m.toLowerCase());
  const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  const limpa = s => String(s || '').replace(/\s+/g, ' ').replace(/^[\s,;:.-]+|[\s,;:-]+$/g, '').trim();

  function normalizar(t) {
    return String(t || '')
      .replace(/-\s*\n\s*(?=[a-záâãàéêíóôõúç])/g, '')      // palavra quebrada no fim da linha
      .replace(/[“”]/g, '"').replace(/[‐‑–—]/g, '-')
      .replace(/\s+/g, ' ');
  }

  // fica só com o final do trecho que parece nome de pessoa (corta "CONTRATO SOCIAL ... LTDA" grudado antes)
  const LIGS = /^(D[AEO]S?|E|DE|DI)$/i;
  function sufixoNome(str) {
    const ws = str.trim().split(/\s+/), out = [];
    for (let i = ws.length - 1; i >= 0 && out.length < 9; i--) {
      const w = ws[i];
      if (NAO_NOME.test(semAcento(w)) || /:/.test(w) || /^(SOCI[OA]S?|SR|SRA|EU|O|A|OS|AS|SENHORA?)\.?$/.test(semAcento(w))) break;
      out.unshift(w);
    }
    while (out.length && LIGS.test(out[0])) out.shift();
    return out.length >= 2 ? out.join(' ') : null;
  }
  function acharNome(antes) {
    let m, ult = null; NOME_QUAL.lastIndex = 0;
    while ((m = NOME_QUAL.exec(antes))) ult = { bruto: m[1], i: m.index };
    if (ult) { const nome = sufixoNome(ult.bruto); if (nome) return { nome, i: ult.i + ult.bruto.lastIndexOf(nome) }; }
    let c = null; NOME_CAPS.lastIndex = 0;
    while ((m = NOME_CAPS.exec(antes))) { const nome = sufixoNome(m[0]); if (nome) c = { nome, i: m.index + m[0].lastIndexOf(nome) }; }
    return c;
  }

  function campos(bloco) {
    const r = {};
    let m;
    if ((m = bloco.match(/\b(brasileir[oa]|portugu[eê]sa?|naturalizad[oa]|estrangeir[oa]|argentin[oa]|italian[oa]|paraguai[oa])\b/i))) r.nacionalidade = m[1].toLowerCase();
    if ((m = bloco.match(/\b(solteir[oa]|casad[oa]|divorciad[oa]|vi[uú]v[oa]|separad[oa](?: judicialmente)?|convivente(?: em uni[aã]o est[aá]vel)?|em uni[aã]o est[aá]vel)\b/i))) r.estadoCivil = m[1].toLowerCase();
    if ((m = bloco.match(/(comunh[aã]o (?:parcial|universal) de bens|separa[cç][aã]o (?:total |obrigat[oó]ria |convencional )?de bens|participa[cç][aã]o final nos aquestos)/i))) r.regime = m[1].toLowerCase();
    if ((m = bloco.match(/nascid[oa]\s+(?:em|aos?|no dia)\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/i))) r.nascimento = m[1].padStart(2, '0') + '/' + m[2].padStart(2, '0') + '/' + m[3];
    if ((m = bloco.match(/(?:\bRG\b|R\.G\.|c[ée]dula de identidade|carteira de identidade|documento de identidade|identidade)(?:\s*(?:civil|profissional|n[º°o.]*|sob o|n[uú]mero|:|-))*\s*([\dXx][\dXx.\-\s]{2,16}[\dXx])\b(?:\s*[-,]?\s*(?:expedid[oa] pel[oa]|emitid[oa] pel[oa]|[\/-])?\s*((?:SSP|SESP|SJSP|SJS|PC|DGPC|SDS|SSPDS|SSPMT|DETRAN|IFP|SEJUSP|PJC|POLITEC|SESDC|SPTC|SSPSC|SEDS|ITEP|IGP|IIRGD)(?:\s*[\/-]?\s*[A-Z]{2})?))?/i))) {
      r.rg = m[1].replace(/\s+/g, '').replace(/[.\-]+$/, '');
      if (m[2]) r.orgaoRg = m[2].replace(/\s+/g, '').toUpperCase();
    }
    if (r.rg && !r.orgaoRg && (m = bloco.match(/[óo]rg[aã]o\s+(?:expedidor|emissor)\s*:?\s*([A-Z]{2,7}\s*[-\/]?\s*[A-Z]{2})\b/i))) r.orgaoRg = m[1].replace(/\s+/g, '').toUpperCase();
    if (!r.rg && (m = bloco.match(/\bCNH\b[^0-9]{0,30}(\d{9,12})/i))) r.cnh = m[1];
    if ((m = bloco.match(/resident[ea]s?\s+e\s+domiciliad[oa]s?\s*(?:n[oa](?:\s*\([oa]\))?|à|a|em|ao)?\s*:?\s+(.{5,260}?)(?:,?\s*(?:CEP)[:\s nº°.]*(\d{2}\.?\d{3}\s?-?\s?\d{3})|;|\.\s+(?=[A-Z]{3})|$)/i))) {
      r.endereco = limpa(m[1]).replace(/[,.\s]+$/, '');
      if (m[2]) r.cep = dig(m[2]).replace(/^(\d{5})(\d{3})$/, '$1-$2');
    }
    if ((m = bloco.match(/profiss[aã]o\s*:\s*([^,;:]{3,45}?)\s*[,;]/i))) r.profissao = m[1].trim().toLowerCase();
    // profissão: primeira parte curta entre vírgulas que não é nenhum dos dados acima
    const partes = bloco.split(/[,;]/).slice(1, 8).map(s => s.trim());
    for (const p of (r.profissao ? [] : partes)) {
      if (!p || p.length > 45 || /\d/.test(p)) continue;
      if (/brasileir|portugu|naturaliz|estrangeir|solteir|casad|divorciad|vi[uú]v|separad|convivente|uni[aã]o|regime|comunh|bens|natural d|nascid|portador|inscrit|identidade|\bRG\b|CPF|resident|domicil|maior|capaz|filh[oa]|nacionalidade/i.test(p)) continue;
      if (/^[a-záâãàéêíóôõúç][a-záâãàéêíóôõúç\s\/()-]+$/i.test(p) && p.split(/\s+/).length <= 5) { r.profissao = p.toLowerCase(); break; }
    }
    return r;
  }

  // CPF dentro de um trecho: o que vem logo depois de "CPF" tem prioridade; número solto só se tiver pontuação de CPF
  function cpfNoBloco(bloco) {
    let m, achado = null; CPF_RE.lastIndex = 0;
    while ((m = CPF_RE.exec(bloco))) {
      const cpf = m[1] + m[2] + m[3] + m[4], antes = bloco.slice(Math.max(0, m.index - 40), m.index);
      const rotulado = /C\.?P\.?F/i.test(antes), pontuado = /[.\-]/.test(m[0]);
      if (/CNH|habilita|NIRE|registro|protocolo|RG\b|identidade/i.test(antes.slice(-25)) && !rotulado) continue;
      if (rotulado || (pontuado && cpfOk(cpf))) { const r = { cpf, valido: cpfOk(cpf) }; if (rotulado) return r; achado = achado || r; }
    }
    return achado;
  }

  function extrair(texto) {
    const t = normalizar(texto);
    const lista = [];
    // 1) Qualificação das partes: "NOME, brasileiro, casado, ..., CPF nº ..., residente ..."
    const quals = []; let m; NOME_QUAL.lastIndex = 0;
    while ((m = NOME_QUAL.exec(t))) { const nome = sufixoNome(m[1]); if (nome) quals.push({ nome, i: m.index + m[1].lastIndexOf(nome) }); }
    quals.forEach((q, k) => {
      const fim = Math.min(t.length, q.i + 700, k + 1 < quals.length ? quals[k + 1].i : t.length);
      const bloco = t.slice(q.i, fim);
      const antes = t.slice(Math.max(0, q.i - 160), q.i);
      if (/testemunha|\bOAB\b|\bCRC\b|contador|advogad/i.test(antes.slice(-120))) return;
      const c = cpfNoBloco(bloco);
      if (!c) return;   // sem CPF não é sócio pessoa física (ou não deu para ler)
      lista.push({ nome: tit(limpa(q.nome)), cpf: c.cpf, cpfValido: c.valido, ...campos(bloco) });
    });
    // 2) Sem qualificação legível: usa os blocos de assinatura "NOME  CPF nº ..."
    if (!lista.length) {
      CPF_RE.lastIndex = 0;
      while ((m = CPF_RE.exec(t))) {
        const antes = t.slice(Math.max(0, m.index - 140), m.index);
        if (!/C\.?P\.?F[^\d]{0,12}$/i.test(antes) || /testemunha|\bOAB\b|\bCRC\b|contador|advogad/i.test(antes)) continue;
        const n = acharNome(antes.replace(/C\.?P\.?F[^\d]*$/i, '')); if (!n) continue;
        const cpf = m[1] + m[2] + m[3] + m[4];
        lista.push({ nome: tit(limpa(n.nome)), cpf, cpfValido: cpfOk(cpf) });
      }
    }
    // junta repetidos (o mesmo sócio aparece na alteração e na consolidação)
    const grupos = [];
    for (const s of lista) {
      const N = semAcento(s.nome);
      const g = grupos.find(x => (s.cpfValido && x.cpfValido && x.cpf === s.cpf) || semAcento(x.nome) === N);
      if (!g) { grupos.push(s); continue; }
      if (s.cpfValido && !g.cpfValido) { g.cpf = s.cpf; g.cpfValido = true; }
      for (const [c, v] of Object.entries(s)) if (v && !g[c]) g[c] = v;
    }
    const socios = grupos.filter(s => s.cpfValido || !grupos.some(o => o !== s && o.cpfValido && semAcento(o.nome) === semAcento(s.nome)));
    const T = semAcento(t);
    for (const s of socios) {
      const N = semAcento(s.nome);
      let i = -1, admin = false, quotas = null;
      while ((i = T.indexOf(N, i + 1)) >= 0) {
        const antes = T.slice(Math.max(0, i - 260), i), depois = T.slice(i + N.length, i + N.length + 160);
        if (/ADMINISTR[^.;]{0,200}$/.test(antes) && !/TESTEMUNHA/.test(antes.slice(-120))) admin = true;
        if (/^[^.;]{0,60}(?:COMO |NA (?:QUALIDADE|FUNCAO) DE |SOCI[OA]\s*[-\/ ]\s*)ADMINISTRADOR|^[^.;]{0,40}ADMINISTRADOR[A]? (?:DA SOCIEDADE|NAO SOCIO)/.test(depois)) admin = true;
        // quadro de quotas: "Fulano .... 50.000 50.000,00" ou "Fulano ... 50.000 (cinquenta mil) quotas"; vale o último (contrato consolidado)
        let q = depois.match(/^[\s.:|-]*(\d{1,3}(?:\.\d{3})+|\d+)\s+(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}/);
        if (!q && !/TRANSFER|CEDE|CESS|VEND|ADQUIR/.test(antes.slice(-80) + depois.slice(0, 60))) q = depois.match(/^[^;]{0,80}?(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:\([^)]{0,120}\))?\s*QUOTAS/);
        if (q) quotas = q[1].replace(/\./g, '');
      }
      s.administrador = admin; if (quotas) s.quotas = +quotas;
    }
    return socios;
  }

  // Miniatura da primeira página de um PDF (para mostrar na tela)
  async function miniatura(file, larg = 220) {
    const pdf = await pdfDoc(file), pg = await pdf.getPage(1), v1 = pg.getViewport({ scale: 1 });
    const vp = pg.getViewport({ scale: larg / v1.width }), c = document.createElement('canvas');
    c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    const url = c.toDataURL('image/jpeg', 0.8); pdf.destroy && pdf.destroy(); return { url, paginas: pdf.numPages };
  }
  // Todas as páginas de um PDF como imagens, uma a uma (para abrir o documento na tela)
  async function paginas(file, larg, cadaUma) {
    const pdf = await pdfDoc(file);
    for (let i = 1; i <= pdf.numPages; i++) {
      const pg = await pdf.getPage(i), v1 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: larg / v1.width });
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      if (cadaUma(c.toDataURL('image/jpeg', 0.85), i, pdf.numPages) === false) break;
    }
    pdf.destroy && pdf.destroy(); return pdf.numPages;
  }
  window.ContratoSocial = { ler, extrair, cpfOk, miniatura, paginas };
})();

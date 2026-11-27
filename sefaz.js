// Inscrição estadual e consulta da SEFAZ: usado na página de dados do cliente (dados.html) e no Pré TASK (cadastro direto).
// - SINTEGRA: endereço da consulta pública da SEFAZ de cada Estado (lista oficial do sintegra.gov.br); sem Estado, o portal nacional.
// - copiar: copia de forma síncrona, ainda dentro do toque (funciona no iPhone e no app instalado), antes de a aba da SEFAZ abrir.
// - ieDaReceita: a IE pela base pública do CNPJ.ws (a única gratuita que traz). Limita a 3 consultas por minuto: tenta algumas vezes.
// - lerCartao: lê o cartão de contribuinte / consulta do SINTEGRA (PDF, print ou página salva) no próprio aparelho e tira a IE,
//   o regime e a situação. Nada é enviado para servidores.
(function () {
  const dig = v => String(v || '').replace(/\D/g, '');
  const fmtCnpj = v => dig(v).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
  function cnpjOk(v) {
    const d = dig(v); if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
    const c = n => { let s = 0, w = n - 7; for (let i = 0; i < n; i++) { s += +d[i] * w--; if (w < 2) w = 9; } const r = s % 11; return r < 2 ? 0 : 11 - r; };
    return c(12) === +d[12] && c(13) === +d[13];
  }
  const SINTEGRA = { AC: 'http://sefaznet.ac.gov.br/sefazonline/servlet/hpfsincon', AL: 'http://www.sefaz.al.gov.br/asp/sintegra/sintegra.asp?estado=AL', AP: 'http://www.sefaz.ap.gov.br/sate/seg/SEGf_AcessarFuncao.jsp?cdFuncao=CAD_011', AM: 'http://www.sefaz.am.gov.br/sintegra/sintegra0.asp', BA: 'https://portal.sefaz.ba.gov.br/scripts/cadastro/cadastroBa/consultaBa.asp', CE: 'https://servicos.sefaz.ce.gov.br/internet/Sintegra/Sintegra.Asp?estado=CE', DF: 'https://ww1.receita.fazenda.df.gov.br/icms/sintegra-consulta', ES: 'http://www.sintegra.es.gov.br/', GO: 'http://appasp.sefaz.go.gov.br/Sintegra/Consulta/default.asp?', MA: 'http://aplicacoes.ma.gov.br/sintegra/jsp/consultaSintegra/consultaSintegraFiltro.jsf', MT: 'https://www.sefaz.mt.gov.br/cadastro/emissaocartao/emissaocartaocontribuinteacessodireto', MS: 'https://servicos.efazenda.ms.gov.br/consultapublica/Home/Index', MG: 'http://consultasintegra.fazenda.mg.gov.br/', PA: 'http://app.sefa.pa.gov.br/Sintegra/', PB: 'https://www4.sefaz.pb.gov.br/sintegra', PR: 'https://sintegra.paas.pr.gov.br/', PE: 'http://www.sintegra.sefaz.pe.gov.br/', PI: 'http://web.sintegra.sefaz.pi.gov.br/', RJ: 'https://sucief-sincad-web.fazenda.rj.gov.br/sincad-web/index.jsf', RN: 'http://www.set.rn.gov.br/uvt/consultacontribuinte.aspx', RS: 'https://www.sefaz.rs.gov.br/consultas/contribuinte', RO: 'http://www.sefin.ro.gov.br/sint_consul.asp', RR: 'https://portalapp.sefaz.rr.gov.br/siate/servlet/wp_siate_consultasintegra', SC: 'https://sat.sef.sc.gov.br/tax.NET/Sat.Cadastro.Web/ComprovanteIE/Consulta.aspx', SP: 'https://www.cadesp.fazenda.sp.gov.br/Pages/Cadastro/Consultas/ConsultaPublica/ConsultaPublica.aspx', SE: 'https://security.sefaz.se.gov.br/SIC/sintegra/index.jsp', TO: 'http://sintegra.sefaz.to.gov.br/' };
  const urlUf = uf => SINTEGRA[String(uf || '').trim().toUpperCase().slice(0, 2)] || 'http://www.sintegra.gov.br/';

  function copiar(t) {
    const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
    document.body.appendChild(ta); const ativo = document.activeElement; ta.focus(); ta.select(); ta.setSelectionRange(0, t.length);
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove(); if (ativo && ativo.focus) try { ativo.focus({ preventScroll: true }); } catch (e) {}
    return ok;
  }

  // IE do CNPJ.ws: a ativa do Estado da empresa; senão qualquer ativa
  function ieDe(W, uf) { const ies = (W && W.estabelecimento && W.estabelecimento.inscricoes_estaduais) || []; const ie = ies.find(x => x.ativo && x.estado && x.estado.sigla === uf) || ies.find(x => x.ativo) || ies.find(x => x.estado && x.estado.sigla === uf); return ie ? ie.inscricao_estadual : ''; }
  const tempo = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  // '' = a base não tem IE para este CNPJ; null = não deu para consultar. vivo() false interrompe as novas tentativas.
  async function ieDaReceita(cnpj, uf, vivo, esperas) {
    const d = dig(cnpj); if (d.length !== 14) return null;
    for (const espera of esperas || [0, 4000, 15000, 30000]) {
      if (espera) await new Promise(r => setTimeout(r, espera)); if (vivo && !vivo()) return null;
      try { const r = await tempo(fetch('https://publica.cnpj.ws/cnpj/' + d), 12000); if (r.status === 404) return ''; if (!r.ok) continue; return ieDe(await r.json(), String(uf || '').toUpperCase()); } catch (_) {}
    }
    return null;
  }

  // Texto do cartão -> { ie, isento, regime, cnpjs, outroCnpj, situacao }
  function dadosCartao(txt, cnpjForm) {
    const t = String(txt || '').replace(/\r/g, ''), r = { ie: '', isento: false, regime: '', cnpjs: [], outroCnpj: false, situacao: '' };
    // CNPJs no documento (para conferir se o cartão é da mesma empresa)
    (t.match(/\d{2}[.\s]?\d{3}[.\s]?\d{3}\s?\/\s?\d{4}\s?[-–]?\s?\d{2}/g) || []).forEach(x => { const d = dig(x); if (d.length === 14 && !r.cnpjs.includes(d)) r.cnpjs.push(d); });
    const quase = (a, b) => a.length === b.length && [...a].filter((c, i) => c !== b[i]).length <= 2;
    if (cnpjForm && r.cnpjs.length && !r.cnpjs.some(c => quase(c, cnpjForm))) r.outroCnpj = true;
    // IE: o número logo depois do rótulo "Inscrição Estadual" (mesma linha ou linhas seguintes)
    const rot = /inscri[cç][aã]o\s*estadual|\bI\.\s?E\.|\bIE\s*[:nN°º]/gi; let m;
    while (!r.ie && !r.isento && (m = rot.exec(t))) {
      const jan = t.slice(m.index + m[0].length, m.index + m[0].length + 220);
      const tokens = jan.match(/ISENT[OA]|\d[\d.\-\/]{4,20}\d/gi) || [];
      for (const tk of tokens) {
        if (/^isent/i.test(tk)) { r.isento = true; break; }
        const s0 = tk.trim(), d = dig(s0);
        if (d.length < 8 || d.length > 14) continue;
        if (/^\d{2}\/\d{2}\/\d{2,4}/.test(s0) || /^\d{5}-\d{3}$/.test(s0)) continue;      // data, CEP
        if (d.length === 14 && (r.cnpjs.includes(d) || cnpjOk(d))) continue;              // é o CNPJ
        if (cnpjForm && d === cnpjForm.slice(0, d.length)) continue;
        r.ie = s0.replace(/\s+/g, ''); break;
      }
    }
    // Regime: valor perto do rótulo; depois, frases claras no texto todo
    const nt = t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const qual = v => /simei|\bmei\b|microempreendedor/.test(v) ? 'mei' : /simples/.test(v) ? 'simples' : /presumido/.test(v) ? 'presumido' : /lucro real|\breal\b/.test(v) ? 'real' : '';
    const rr = /regime|enquadramento|forma de tributacao|tipo de contribuinte/g;
    while (!r.regime && (m = rr.exec(nt))) { const v = nt.slice(m.index, m.index + 90); if (!/nao optante|optante\s*:\s*nao/.test(v)) r.regime = qual(v.slice(m[0].length)); }
    if (!r.regime && /optante pelo simples|simples nacional\s*:?\s*sim\b/.test(nt) && !/nao optante/.test(nt)) r.regime = 'simples';
    const sit = nt.match(/situacao[^\n]{0,50}?(baixad[ao]|suspens[ao]|cancelad[ao]|inapt[ao]|nul[ao]|ativ[ao]|habilitad[ao]|nao habilitad[ao])/);
    if (sit) r.situacao = sit[1];
    return r;
  }
  // Descobre o tipo pelos primeiros bytes; sem assinatura conhecida, usa o tipo/extensão; texto legível (HTML salvo) vira 'texto'
  async function tipoPeloConteudo(file) {
    const b = new Uint8Array(await file.slice(0, 2048).arrayBuffer()), ini = String.fromCharCode(...b.slice(0, 12));
    if (String.fromCharCode(...b.slice(0, 1024)).includes('%PDF-')) return 'application/pdf';
    if (b[0] === 0x89 && ini.slice(1, 4) === 'PNG') return 'image/png';
    if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
    if (ini.startsWith('GIF8')) return 'image/gif';
    if (ini.startsWith('RIFF') && ini.slice(8, 12) === 'WEBP') return 'image/webp';
    if (ini.startsWith('BM')) return 'image/bmp';
    if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) return 'application/pdf';
    if (/^image\/(png|jpe?g|webp|gif|bmp)$/i.test(file.type)) return file.type;
    if (!b.length) return '';
    const ruins = [...b].filter(x => x === 0 || (x < 9) || (x > 13 && x < 32)).length;
    return ruins / b.length < 0.02 ? 'texto' : '';
  }
  // Texto de uma página salva (HTML, MHTML) ou .txt, com quebras de linha nos blocos para os rótulos ficarem separados
  async function textoDeArquivo(file) {
    let bytes = new Uint8Array(await file.arrayBuffer()); const bruto = new TextDecoder('latin1').decode(bytes);
    if (/quoted-printable/i.test(bruto)) {
      const qp = bruto.replace(/=\r?\n/g, ''), out = []; for (let i = 0; i < qp.length; i++) { const m = qp[i] === '=' && /^[0-9A-F]{2}$/i.test(qp.substr(i + 1, 2)); out.push(m ? parseInt(qp.substr(i + 1, 2), 16) : qp.charCodeAt(i) & 255); if (m) i += 2; } bytes = new Uint8Array(out);
    }
    let t; try { t = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) { t = new TextDecoder('windows-1252').decode(bytes); }
    if (/<(html|body|table|div|td|p)\b/i.test(t)) {
      t = t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<(br|\/p|\/div|\/tr|\/td|\/th|\/li|\/h\d|\/label|\/span)\b[^>]*>/gi, '$&\n');
      const doc = new DOMParser().parseFromString(t, 'text/html'); t = (doc.body || doc.documentElement).textContent;
    }
    return t.replace(/[ \t ]+/g, ' ');
  }
  // Leitor de PDF/OCR (contrato-social.js): já vem na página de dados; no app é carregado só quando precisa
  let leitorP = null;
  function leitor() {
    if (window.ContratoSocial && window.ContratoSocial.texto) return Promise.resolve(window.ContratoSocial);
    return leitorP || (leitorP = new Promise((ok, erro) => { const s = document.createElement('script'); s.src = 'contrato-social.js'; s.onload = () => window.ContratoSocial && window.ContratoSocial.texto ? ok(window.ContratoSocial) : erro(new Error('leitor')); s.onerror = () => { leitorP = null; erro(new Error('leitor')); }; document.head.appendChild(s); }));
  }
  // Lê o arquivo e devolve { tipo, ocr, falhou, ...dadosCartao }; se o conteúdo não tiver a IE, tenta o número no nome do arquivo
  async function lerCartao(file, cnpjForm, aviso) {
    let tipo = '', texto = '', ocr = false, falhou = false;
    try {
      tipo = await tipoPeloConteudo(file);
      if (tipo === 'texto') texto = await textoDeArquivo(file);
      else if (tipo) { const L = await leitor(); const lido = await L.texto([new File([file], /pdf/.test(tipo) ? 'cartao.pdf' : 'cartao', { type: tipo })], aviso || (() => {})); texto = lido.texto; ocr = lido.ocr; }
    } catch (e) { console.error(e); falhou = true; }
    const d = dadosCartao(texto, dig(cnpjForm).length === 14 ? dig(cnpjForm) : '');
    if (!d.ie && !d.isento && !d.outroCnpj) { const n = dadosCartao(String(file.name || '').replace(/\.[a-z0-9]{2,5}$/i, '')).ie; if (n) { d.ie = n; d.doNome = true; } }
    return { ...d, tipo, ocr, falhou };
  }

  window.SefazIE = { SINTEGRA, urlUf, copiar, ieDe, ieDaReceita, dadosCartao, tipoPeloConteudo, textoDeArquivo, lerCartao, cnpjOk, fmtCnpj };
})();

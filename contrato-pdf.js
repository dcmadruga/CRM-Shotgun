// Gera o PDF do contrato (Etapa 3) a partir do texto já preenchido.
// Linha começando com "# " vira título; linha em branco separa parágrafos.
window.contratoPdf = function ({ titulo, texto, numero, logo, logoW, logoH, aceite }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, M = 18, R = W - M, LW = W - 2 * M;
  const safe = s => String(s ?? '').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/ /g, ' ').replace(/\t/g, '    ');
  const font = (st = 'normal', sz = 10) => { doc.setFont('helvetica', st); doc.setFontSize(sz); };
  const ink = [23, 24, 16], accent = [203, 45, 160], txt = [25, 25, 25];
  let y = 0;

  doc.setFillColor(...ink); doc.rect(0, 0, W, 22, 'F');
  if (logo) {
    try {
      const lw = Number(logoW) || 1, lh = Number(logoH) || 1, k = Math.min(14 / lw, 14 / lh), w = logoW ? lw * k : 14, h = logoH ? lh * k : 14;
      doc.addImage(logo, 'PNG', M - 2 + (14 - w) / 2, 4 + (14 - h) / 2, w, h);
    } catch (e) {}
  }
  doc.setTextColor(255, 255, 255); font('bold', 13); doc.text('Contrato', M + 16, 11);
  font('normal', 9); doc.text(numero ? 'Proposta nº ' + safe(numero) : '', M + 16, 16.5);
  doc.setFillColor(...accent); doc.rect(0, 22, W, 1.4, 'F');

  y = 34; doc.setTextColor(...txt);
  font('bold', 12.5);
  const tl = doc.splitTextToSize(safe(titulo || 'Contrato').toUpperCase(), LW);
  doc.text(tl, W / 2, y, { align: 'center' }); y += tl.length * 5.6 + 4;

  const ensure = h => { if (y + h > H - 16) { doc.addPage(); y = 18; } };
  const linhas = safe(texto).split(/\r?\n/);
  linhas.forEach((ln, i) => {
    const t = ln.trimEnd();
    if (!t.trim()) { y += 2.6; return; }
    if (/^#\s+/.test(t)) {
      font('bold', 10.2); const hl = doc.splitTextToSize(t.replace(/^#\s+/, ''), LW);
      ensure(hl.length * 4.6 + 8); y += 2.2; doc.text(hl, M, y); y += hl.length * 4.6 + 1; return;
    }
    font('normal', 9.6); const pl = doc.splitTextToSize(t, LW);
    pl.forEach(l => { ensure(4.6); doc.text(l, M, y); y += 4.4; });
  });

  if (aceite) {
    ensure(46); y += 8;
    doc.setDrawColor(31, 122, 70); doc.setLineWidth(0.5); doc.setFillColor(240, 248, 243);
    doc.roundedRect(M, y, LW, 34, 2, 2, 'FD');
    doc.setTextColor(31, 122, 70); font('bold', 10.5); doc.text('ACEITE ELETRÔNICO', M + 5, y + 7);
    doc.setTextColor(...txt); font('normal', 9.4);
    const al = [
      `Contrato aceito por ${safe(aceite.nome)}${aceite.cargo ? ' (' + safe(aceite.cargo) + ')' : ''}, CPF ${safe(aceite.cpf || '')},`,
      `em nome de ${safe(aceite.cliente || 'CONTRATANTE')}, em ${safe(aceite.em)},`,
      'pelo link enviado pela Argo, marcando a confirmação de leitura e concordância com todas as cláusulas.'
    ];
    al.forEach((l, i) => doc.text(doc.splitTextToSize(l, LW - 10), M + 5, y + 14 + i * 5.4));
    y += 38;
  } else {
    ensure(20); y += 6;
    font('italic', 8.8); doc.setTextColor(90, 90, 90);
    doc.text(doc.splitTextToSize('Este contrato é aceito eletronicamente pelo representante da CONTRATANTE no link enviado pela Argo. O registro do aceite (nome, CPF, data e hora) fica guardado no sistema.', LW), M, y);
    doc.setTextColor(...txt);
  }

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); font('normal', 8); doc.setTextColor(120, 120, 120);
    doc.text((numero ? 'Contrato · proposta nº ' + safe(numero) + '   ·   ' : '') + 'página ' + i + ' de ' + n, W / 2, H - 8, { align: 'center' });
  }
  return doc;
};

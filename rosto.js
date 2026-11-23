// Verificação do rosto na selfie do cadastro (MediaPipe Face Landmarker, roda no aparelho, nada sai do navegador).
// Só libera a foto com exatamente um rosto de verdade: centralizado no oval, de frente e piscando os olhos (prova de vida:
// foto impressa ou na tela de outro celular não pisca). Bibliotecas e modelo ficam em lib/mediapipe (sem custo, sem CDN).
const BASE = new URL('lib/mediapipe/', import.meta.url).href;
let carga = null;

// Carrega uma vez e reaproveita. GPU quando dá; senão CPU.
export function carregar() {
  if (!carga) carga = (async () => {
    const { FilesetResolver, FaceLandmarker } = await import(BASE + 'vision_bundle.mjs');
    const fs = await FilesetResolver.forVisionTasks(BASE);
    const opt = d => ({ baseOptions: { modelAssetPath: BASE + 'face_landmarker.task', delegate: d }, runningMode: 'VIDEO', numFaces: 2, outputFaceBlendshapes: true, minFaceDetectionConfidence: 0.6, minFacePresenceConfidence: 0.6 });
    try { return await FaceLandmarker.createFromOptions(fs, opt('GPU')); } catch (e) { return FaceLandmarker.createFromOptions(fs, opt('CPU')); }
  })().catch(e => { carga = null; throw e; });
  return carga;
}

// Lê um resultado do Face Landmarker. w,h = tamanho da imagem; a área visível é o quadrado central (como na tela e na foto salva).
// Oval da tela: centro no meio, raios 34% (largura) e 42% (altura) do quadrado.
function ler(res, w, h, arquivo) {
  const faces = res.faceLandmarks || [];
  if (!faces.length) return { ok: false, cod: 'sem', txt: arquivo ? 'Não encontramos um rosto nessa foto.' : 'Posicione o rosto dentro do oval.' };
  if (faces.length > 1) return { ok: false, cod: 'varios', txt: 'Só uma pessoa na foto, por favor.' };
  const lado = Math.min(w, h), ox = (w - lado) / 2, oy = (h - lado) / 2;
  const pts = faces[0].map(p => ({ x: (p.x * w - ox) / lado, y: (p.y * h - oy) / lado }));
  let x0 = 1, x1 = 0, y0 = 1, y1 = 0; pts.forEach(p => { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, alt = y1 - y0;
  // De frente: o nariz (1) fica no meio entre os cantos de fora dos olhos (33 e 263); o meio dos olhos fica na altura certa entre testa (10) e queixo (152)
  const ol = pts[33], or = pts[263], na = pts[1], te = pts[10], qu = pts[152];
  const giro = (na.x - Math.min(ol.x, or.x)) / Math.max(1e-6, Math.abs(or.x - ol.x));
  const incl = ((ol.y + or.y) / 2 - te.y) / Math.max(1e-6, qu.y - te.y);
  const bs = {}; ((res.faceBlendshapes || [])[0]?.categories || []).forEach(c => { bs[c.categoryName] = c.score; });
  const olhos = Math.min(bs.eyeBlinkLeft ?? 0, bs.eyeBlinkRight ?? 0); // 0 = abertos, 1 = fechados
  const base = { olhos, giro, incl, alt, cx, cy };
  if (x0 < -0.04 || x1 > 1.04 || y0 < -0.06 || y1 > 1.06) return { ...base, ok: false, cod: 'corte', txt: arquivo ? 'O rosto está cortado. Envie uma foto com o rosto inteiro.' : 'Centralize o rosto no oval.' };
  if (alt < (arquivo ? 0.3 : 0.42)) return { ...base, ok: false, cod: 'longe', txt: arquivo ? 'O rosto está muito pequeno. Envie uma foto mais de perto.' : 'Aproxime um pouco o rosto.' };
  if (!arquivo && alt > 0.92) return { ...base, ok: false, cod: 'perto', txt: 'Afaste um pouco o rosto.' };
  if (!arquivo && (Math.abs(cx - 0.5) > 0.11 || Math.abs(cy - 0.5) > 0.12)) return { ...base, ok: false, cod: 'centro', txt: 'Centralize o rosto no oval.' };
  if (giro < 0.3 || giro > 0.7 || incl < 0.22 || incl > 0.5) return { ...base, ok: false, cod: 'frente', txt: arquivo ? 'O rosto precisa estar de frente para a câmera.' : 'Olhe de frente para a câmera.' };
  return { ...base, ok: true, cod: 'ok', txt: '' };
}

// Acompanha a câmera. onEstado({ fase, txt, pronto }) a cada mudança. fase: 'ajuste' | 'piscar' | 'pronto'.
// Devolve { parar, agora } — agora() diz se o quadro atual ainda está bom para tirar a foto.
export async function vigiar(video, onEstado) {
  const fl = await carregar();
  let vivo = true, ultimo = -1, piscou = false, abertos = false, fechou = false, semRosto = 0, est = null, atual = null, lo = 1;
  // Piscar = olhos passam de abertos para fechados e voltam. 'lo' é o nível de olhos abertos da pessoa (sorriso e olhos puxados
  // já dão uns 0,3), então o fechado é medido em relação a ele.
  const fechado = () => Math.max(0.45, lo + 0.25);
  const avisa = e => { if (!est || est.fase !== e.fase || est.txt !== e.txt) { est = e; onEstado(e); } };
  const passo = () => {
    if (!vivo) return;
    const t = performance.now();
    if (video.readyState >= 2 && video.videoWidth && t - ultimo > 66) {
      ultimo = t;
      let r; try { r = ler(fl.detectForVideo(video, t), video.videoWidth, video.videoHeight, false); } catch (e) { r = { ok: false, cod: 'sem', txt: 'Posicione o rosto dentro do oval.' }; }
      atual = r;
      // Sumiu o rosto (ou entrou outra pessoa) por mais de 1 s: pede para piscar de novo
      if (r.cod === 'sem' || r.cod === 'varios') { if (++semRosto > 15) { piscou = abertos = fechou = false; lo = 1; } } else semRosto = 0;
      if (r.olhos !== undefined && r.cod !== 'varios') {
        lo = Math.min(lo + 0.002, r.olhos);
        if (r.olhos < Math.min(0.45, lo + 0.12)) { if (fechou && abertos) piscou = true; abertos = true; fechou = false; }
        else if (r.olhos > fechado() && abertos) fechou = true;
      }
      if (!r.ok) avisa({ fase: 'ajuste', txt: r.txt, pronto: false });
      else if (!piscou) avisa({ fase: 'piscar', txt: 'Agora pisque os olhos devagar.', pronto: false });
      else if (r.olhos > fechado()) avisa({ fase: 'piscar', txt: 'Mantenha os olhos abertos.', pronto: false });
      else avisa({ fase: 'pronto', txt: 'Rosto confirmado. Toque em Tirar foto.', pronto: true });
    }
    requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
  return { parar: () => { vivo = false; }, agora: () => !!(piscou && atual && atual.ok && atual.olhos <= fechado()) };
}

// Confere uma foto enviada (sem câmera): um rosto só, inteiro, grande o bastante e de frente. Devolve { ok, txt }.
export async function conferirFoto(img) {
  const fl = await carregar();
  await fl.setOptions({ runningMode: 'IMAGE' });
  try { return ler(fl.detect(img), img.naturalWidth || img.width, img.naturalHeight || img.height, true); }
  finally { await fl.setOptions({ runningMode: 'VIDEO' }); }
}

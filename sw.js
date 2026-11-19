// Funciona sem internet: guarda o app no aparelho. Parâmetros sempre tentam a rede primeiro.
const VERSAO = 'argo-v70';
const ARQUIVOS = ['./', 'index.html', 'dados.html', 'auth.js', 'task.js', 'firebase-config.js', 'etapa2-padrao.js', 'aprovar.html', 'contrato.html', 'etapa3-padrao.js', 'etapa4-padrao.js', 'contrato-pdf.js', 'contrato-social.js', 'lib/pdf.min.js', 'lib/pdf.worker.min.js', 'jspdf.umd.min.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())) });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())) });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === 'https://www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) { // bibliotecas do login: guarda para usar sem internet
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(VERSAO).then(ca => ca.put(e.request, c)); return res })));
    return;
  }
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('parametros.json')) return; // sempre da rede; o app guarda a última cópia
  // App: rede primeiro (pega atualizações), cache se estiver sem internet
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(e.request, c)) } return r })
    .catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('index.html'))));
});

// Sonda temporária do Radar de novos postos: testa, a partir do GitHub Actions, quais fontes públicas respondem
// sem login nem CAPTCHA. Só lê páginas públicas e o robots.txt; não envia formulários.
const UA = 'Mozilla/5.0 (compatible; shotgun-radar-sonda/0.1; +https://github.com/dcmadruga/crm-shotgun)';
const alvos = (process.env.ALVOS || '').split(/\s+/).filter(Boolean);
const PALAVRAS = /simlam|consulta|processo|licen|pesquis|edi[cç]|di[aá]rio|busca|api|download|pdf|publica|caderno|atos|empreendimento|sema|virtual|servi/i;
const robots = new Set();
async function pega(u, ms = 40000) {
  const t0 = Date.now();
  try {
    const r = await fetch(u, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow', signal: AbortSignal.timeout(ms) });
    const ct = r.headers.get('content-type') || '';
    const buf = Buffer.from(await r.arrayBuffer());
    const txt = /text|json|xml|javascript/.test(ct) ? buf.toString('utf8') : '';
    return { u, status: r.status, final: r.url, ct, bytes: buf.length, ms: Date.now() - t0, txt };
  } catch (e) { return { u, erro: String(e.cause?.code || e.cause?.message || e.message), ms: Date.now() - t0 }; }
}
for (const u of alvos) {
  const r = await pega(u);
  const host = (() => { try { return new URL(r.final || u).origin } catch { return '' } })();
  console.log('\n##### ' + u);
  if (r.erro) { console.log('ERRO', r.erro, r.ms + 'ms'); continue; }
  const t = r.txt;
  const titulo = (t.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/\s+/g, ' ').trim();
  const flags = ['recaptcha', 'hcaptcha', 'captcha', 'cloudflare', 'cf-chl', 'turnstile', 'type="password"', 'login', 'g-recaptcha'].filter(f => t.toLowerCase().includes(f));
  console.log(JSON.stringify({ status: r.status, final: r.final, ct: r.ct, bytes: r.bytes, ms: r.ms, titulo, flags }));
  if (/json/.test(r.ct)) console.log('JSON:', t.slice(0, 1500));
  else if (/html/.test(r.ct)) {
    const links = [...t.matchAll(/<(?:a|form|iframe)[^>]+(?:href|action|src)=["']([^"'#]+)["'][^>]*>([\s\S]{0,120}?)<\/?/gi)]
      .map(m => [m[1], m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()]).filter(([h, x]) => PALAVRAS.test(h + ' ' + x));
    const vistos = new Set(); let n = 0;
    for (const [h, x] of links) { if (vistos.has(h) || n > 70) continue; vistos.add(h); n++; console.log('  link:', h, '|', x.slice(0, 80)); }
    const forms = [...t.matchAll(/<form[^>]*>/gi)].map(m => m[0].slice(0, 200)); if (forms.length) console.log('  forms:', forms.slice(0, 5));
    const ajax = [...new Set([...t.matchAll(/["'](\/?[\w\-./]*(?:api|ajax|service|ws|json|graphql)[\w\-./?=&]*)["']/gi)].map(m => m[1]))].slice(0, 25);
    if (ajax.length) console.log('  ajax:', ajax.join(' '));
  } else console.log('  (corpo não textual ou texto):', t.slice(0, 600));
  if (host && !robots.has(host)) { robots.add(host); const rb = await pega(host + '/robots.txt', 20000); console.log('  robots.txt:', rb.erro || rb.status, rb.status === 200 && /text\/plain/.test(rb.ct) ? rb.txt.slice(0, 700).replace(/\n/g, ' ⏎ ') : ''); }
}

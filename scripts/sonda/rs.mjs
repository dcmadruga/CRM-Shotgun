import fs from 'fs';
fs.mkdirSync('rs-sondas',{recursive:true});
const out=[]; const log=(...a)=>{const s=a.join(' ');console.log(s);out.push(s);};
async function get(u,opt={}){try{const r=await fetch(u,{redirect:'follow',signal:AbortSignal.timeout(30000),headers:{'user-agent':'Mozilla/5.0',...(opt.headers||{})},...opt});const t=await r.text();return {s:r.status,u:r.url,t,ct:r.headers.get('content-type')};}catch(e){return {s:'ERR '+e.message,t:''};}}
// 1. POA licenças
let r=await get('https://licencas-ambientais.portoalegre.rs.gov.br/');
log('POA',r.s,r.u,r.ct,r.t.length); fs.writeFileSync('rs-sondas/poa.html',r.t.slice(0,20000));
const scripts=[...r.t.matchAll(/src="([^"]+\.js[^"]*)"/g)].map(m=>new URL(m[1],r.u||'https://licencas-ambientais.portoalegre.rs.gov.br/').href);
log('scripts',scripts.join(' '));
for(const s of scripts.slice(0,6)){const j=await get(s);log('JS',s,j.s,j.t.length);
 const urls=[...new Set([...j.t.matchAll(/["'`]((?:https?:)?\/[^"'`\s]{3,120})["'`]/g)].map(m=>m[1]).filter(x=>/api|licen|consulta|busca|search|graphql/i.test(x)))];
 log('  endpoints',urls.slice(0,60).join(' | '));}
// 2. Querido Diário cidades RS
r=await get('https://queridodiario.ok.org.br/api/cities?levenshtein_distance=0');
log('QD cities',r.s,r.t.length);
try{const c=JSON.parse(r.t).cities.filter(x=>x.state_code==='RS');log('QD RS',c.length,c.map(x=>x.territory_name+(x.publication_urls?'':'')).join(', '));}catch(e){log('QD parse',e.message,r.t.slice(0,300));}
// 3. FEPAM
for(const u of ['https://www.fepam.rs.gov.br/','https://secweb.procergs.com.br/sra/','https://secweb.procergs.com.br/sra/public/consultaDocumento.xhtml']){r=await get(u);log('FEPAM',u,r.s,r.u,r.t.length);
 const links=[...new Set([...r.t.matchAll(/href="([^"]+)"/g)].map(m=>m[1]).filter(x=>/consult|licen|document|public|sol/i.test(x)))];log('  links',links.slice(0,40).join(' | '));}
fs.writeFileSync('rs-sondas/novas.txt',out.join('\n'));

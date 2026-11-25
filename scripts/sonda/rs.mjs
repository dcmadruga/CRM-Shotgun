import fs from 'fs';
fs.mkdirSync('rs-sondas',{recursive:true});
const out=[]; const log=(...a)=>{const s=a.join(' ');console.log(s);out.push(s);};
async function get(u,opt={}){try{const r=await fetch(u,{redirect:'follow',signal:AbortSignal.timeout(40000),...opt,headers:{'user-agent':'Mozilla/5.0','accept':'application/json, text/plain, */*',...(opt.headers||{})}});const t=await r.text();return {s:r.status,u:r.url,t,ct:r.headers.get('content-type')};}catch(e){return {s:'ERR '+e.message,t:''};}}
const js=(await get('https://licencas-ambientais.portoalegre.rs.gov.br/main-RX4QA7RZ.js')).t;
// contexts around http calls
const ctx=[];
for(const m of js.matchAll(/(lam-api-public|\.get\(|\.post\(|HttpParams|params\.set|append\(")/g)){ctx.push(js.slice(Math.max(0,m.index-250),m.index+350));}
fs.writeFileSync('rs-sondas/poa-ctx.txt',ctx.slice(0,80).join('\n\n-----\n\n'));
log('ctx',ctx.length);
const strs=[...new Set([...js.matchAll(/["'`]([a-zA-Z\-\/]{3,60})["'`]/g)].map(m=>m[1]).filter(x=>x.includes('/')&&!x.startsWith('/@')))];
log('paths',strs.slice(0,200).join(' | '));
const B='https://apigateway.procempa.com.br/apiman-gateway/ambiental-urbanismo/lam-api-public/1.0/public/';
for(const p of ['','licencas','licenca','licencas?page=0&size=5','tipos-licenca','atividades','licencas/busca?termo=posto','licencas?nomeEmpreendimento=posto','consulta?texto=posto']){const r=await get(B+p);log('API',p,r.s,r.ct,r.t.slice(0,400).replace(/\s+/g,' '));}
const s=await get('https://secweb.procergs.com.br/sra/');fs.writeFileSync('rs-sondas/sra.html',s.t);
const f=await get('https://www.fepam.rs.gov.br/');log('fepam',f.t);
const q=await get('https://queridodiario.ok.org.br/api/cities?levenshtein_distance=0',{signal:AbortSignal.timeout(90000)});
try{const c=JSON.parse(q.t).cities.filter(x=>x.state_code==='RS');log('QD RS',c.length,c.map(x=>x.territory_name).join(', '));}catch(e){log('QD',q.s,e.message);}
fs.writeFileSync('rs-sondas/novas.txt',out.join('\n'));

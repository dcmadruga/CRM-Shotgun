import fs from 'fs';
fs.mkdirSync('rs-sondas',{recursive:true});
const out=[]; const log=(...a)=>{const s=a.join(' ');console.log(s);out.push(s);};
const B='https://apigateway.procempa.com.br/apiman-gateway/ambiental-urbanismo/lam-api-public/1.0/public/';
async function j(p){const t0=Date.now();try{const r=await fetch(B+p,{signal:AbortSignal.timeout(400000)});const d=await r.json();return [r.status,d,Date.now()-t0];}catch(e){return ['ERR '+e.message,null,Date.now()-t0];}}
const all=[];let pag;
const [s0,d0,ms0]=await j('consultaLicencas?page=1&limit=10');log('limit10',s0,ms0+'ms');
const pages=[];for(let page=1;page<=14;page+=1)pages.push(page);
const res={};await Promise.all([0,1,2,3].map(async w=>{for(let k=w;k<pages.length;k+=4){res[pages[k]]=await j(`consultaLicencas?page=${pages[k]}&limit=100`);}}));
for(const page of pages){const [s,d,ms]=res[page];
 if(!d){log('page',page,s,ms);continue;}
 pag=d.paginacao; const L=d.consultaLicencas||[];
 for(const x of L){delete x.doc; all.push(x);}
 log('page',page,s,ms+'ms',L.length,'anos',[...new Set(L.map(x=>x.ano))].join(','),'nums',L[0]?.numero,L.at(-1)?.numero);
 }
log('paginacao',JSON.stringify(pag));
log('keys',Object.keys(all[0]||{}).join(','));
const re=/posto|combust|abastec|revenda de/i;
const hit=all.filter(x=>re.test([x.descricao,x.descricaoAtividade,x.nomeRazaoSocial,x.nomeEmpresaInteressado].join(' ')));
log('total lido',all.length,'postos',hit.length);
for(const x of hit) log(' ',x.ano,x.numero,x.tipoLicenca,'|',x.nomeRazaoSocial,'|',x.descricaoAtividade,'|',x.descricao,'|',x.cnpjCpf,'|log',x.logradouroEmpreendimento,x.imovelEmpreendimento);
const cnt={};for(const x of all){cnt[x.descricao]=(cnt[x.descricao]||0)+1;}
log('top descricoes',Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,25).map(e=>e[1]+' '+e[0]).join(' || '));
const [s2,d2]=await j('logradourosSugestoes?q=ipiranga&limit=3');log('logr',s2,JSON.stringify(d2).slice(0,500));
fs.writeFileSync('rs-sondas/novas.txt',out.join('\n'));

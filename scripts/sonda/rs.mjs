import fs from 'fs';
fs.mkdirSync('rs-sondas',{recursive:true});
const out=[]; const log=(...a)=>{const s=a.join(' ');console.log(s);out.push(s);};
const B='https://apigateway.procempa.com.br/apiman-gateway/ambiental-urbanismo/lam-api-public/1.0/public/';
async function j(p){const t0=Date.now();try{const r=await fetch(B+p,{signal:AbortSignal.timeout(120000)});const d=await r.json();return [r.status,d,Date.now()-t0];}catch(e){return ['ERR '+e.message,null,Date.now()-t0];}}
const all=[];let pag;
for(let page=1;page<=40;page++){const [s,d,ms]=await j(`consultaLicencas?page=${page}&limit=100`);
 if(!d){log('page',page,s,ms);break;}
 pag=d.paginacao; const L=d.consultaLicencas||[];
 for(const x of L){delete x.doc; all.push(x);}
 log('page',page,s,ms+'ms',L.length,'anos',[...new Set(L.map(x=>x.ano))].join(','),'nums',L[0]?.numero,L.at(-1)?.numero);
 if(!pag?.next_page) break;}
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

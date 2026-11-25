import fs from 'fs';
fs.mkdirSync('rs-sondas',{recursive:true});
const out=[]; const log=(...a)=>{const s=a.join(' ');console.log(s);out.push(s);};
const B='https://apigateway.procempa.com.br/apiman-gateway/ambiental-urbanismo/lam-api-public/1.0/public/';
async function j(p){try{const r=await fetch(B+p,{signal:AbortSignal.timeout(60000),headers:{accept:'application/json'}});const t=await r.text();return [r.status,t];}catch(e){return ['ERR '+e.message,''];}}
let [s,t]=await j('tiposLicenca'); log('tipos',s,t.slice(0,1500));
[s,t]=await j('processamentoUltimo'); log('ultimo',s,t.slice(0,500));
[s,t]=await j('consultaLicencas?page=1&limit=5'); log('lista',s,t.slice(0,4000));
let d; try{d=JSON.parse(t);}catch{}
const arr=d&&(Array.isArray(d)?d:(d.data||d.items||d.licencas||d.content||d.rows||Object.values(d).find(Array.isArray)));
if(arr?.[0]){const x=arr[0];const id=`${x.id}|${x.numero}|${x.ano}`;[s,t]=await j('consultaLicencas/'+encodeURIComponent(id));log('detalhe',s,t.slice(0,4000));}
for(const q of ['empreendedor=posto','empreendedor=combust','empreendedor=auto%20posto']){[s,t]=await j('consultaLicencas?'+q+'&limit=50');log('busca',q,s,t.length,t.slice(0,3000));}
fs.writeFileSync('rs-sondas/novas.txt',out.join('\n'));

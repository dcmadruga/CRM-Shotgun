import fs from 'fs';
import { municipiosUF } from '../radar/municipios.mjs';
import * as poa from '../radar/fontes/poa.mjs';
fs.mkdirSync('rs-sondas',{recursive:true});
const out=[];const log=(...a)=>{const s=a.join(' ');console.log(s);out.push(s);};
const mun=await municipiosUF('RS');
for(const [de,ate] of [['2026-11-20','2026-11-26'],['2025-11-26','2026-11-26']]){
 const t=Date.now();
 try{const r=await poa.coletar(de,ate,log,{mun});log('periodo',de,ate,'seg',Math.round((Date.now()-t)/1000),'consultas',r.consultas,'registros',r.registros.length);
  for(const a of r.amostra.encontradas) log('  A',a.data,'|',a.titulo,'|',a.entidade);
  for(const x of r.registros) log('  R',JSON.stringify(x).slice(0,600));
 }catch(e){log('periodo',de,ate,'ERRO',e.message,'seg',Math.round((Date.now()-t)/1000));}
}
fs.writeFileSync('rs-sondas/poa.txt',out.join('\n'));

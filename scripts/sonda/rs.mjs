import fs from 'fs';
fs.mkdirSync('rs-sondas',{recursive:true});
const r=await fetch('https://licencas-ambientais.portoalegre.rs.gov.br/main-RX4QA7RZ.js');
fs.writeFileSync('rs-sondas/poa-main.js',await r.text());

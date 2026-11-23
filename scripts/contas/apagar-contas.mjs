// Robô que apaga de vez, no Firebase Authentication, as contas que um administrador excluiu na tela de Usuários.
// O app só consegue marcar o cadastro (usuarios/{uid}.excluido = true) e cortar o acesso; apagar a conta de outra
// pessoa exige a chave de administrador, que fica no segredo FIREBASE_SERVICE_ACCOUNT do GitHub Actions.
// Sem o segredo, ou com CONTAS_TESTE=true, só lista o que seria apagado, sem apagar nada.
import { createSign } from 'node:crypto';
import { firestore } from '../radar/firestore.mjs';

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const teste = process.env.CONTAS_TESTE === 'true';

const db = firestore();
if (!db) { log('Sem o segredo FIREBASE_SERVICE_ACCOUNT: nada a fazer.'); process.exit(0); }

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
const projeto = process.env.FIREBASE_PROJECT || sa.project_id;

async function tokenAuth() {
  const agora = Math.floor(Date.now() / 1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const corpo = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 3600 });
  const ass = createSign('RSA-SHA256').update(corpo).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${corpo}.${ass}` });
  const j = await r.json();
  if (!j.access_token) throw new Error('A chave de serviço foi recusada (' + (j.error_description || j.error || r.status) + ')');
  return j.access_token;
}

const usuarios = await db.lista('usuarios');
const fila = usuarios.filter(u => u.excluido === true && u.contaApagada !== true);
if (!fila.length) { log(`Nenhuma conta para apagar (${usuarios.length} cadastros conferidos).`); process.exit(0); }
log(`${fila.length} conta(s) excluída(s) no app aguardando: ${fila.map(u => u.email || u.id).join(', ')}`);
if (teste) { log('Modo de teste: nada foi apagado.'); process.exit(0); }

const token = await tokenAuth();
const apagadas = [];
for (let i = 0; i < fila.length; i += 1000) {
  const lote = fila.slice(i, i + 1000);
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projeto}/accounts:batchDelete`, { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: JSON.stringify({ localIds: lote.map(u => u.id), force: true }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Authentication ${r.status}: ${j.error?.message || ''}. A chave precisa do papel "Administrador do Firebase Authentication".`);
  // conta que já não existia (apagada à mão no console) também conta como apagada
  const falhas = new Map((j.errors || []).filter(e => !/USER_NOT_FOUND/.test(e.message || '')).map(e => [e.index, e.message]));
  lote.forEach((u, k) => falhas.has(k) ? log(`Não apagou ${u.email || u.id}: ${falhas.get(k)}`) : apagadas.push(u));
}
const em = new Date();
if (apagadas.length) await db.gravar(apagadas.map(u => ({ caminho: `usuarios/${u.id}`, dados: { contaApagada: true, contaApagadaEm: em }, mesclar: true })));
log(`${apagadas.length} conta(s) apagada(s) do Firebase Authentication: ${apagadas.map(u => u.email || u.id).join(', ')}`);
if (apagadas.length < fila.length) process.exit(1);

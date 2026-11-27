// Configuração do Firebase (não é segredo: a proteção fica nas regras do Firestore).
// Se apiKey ficar vazio, o app funciona sem login.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCl3ES4L-5EHzEOdE-PoUq6jEnxovY8kW8",
  authDomain: "propostas-argo.firebaseapp.com",
  projectId: "propostas-argo",
  storageBucket: "propostas-argo.firebasestorage.app",
  messagingSenderId: "696362967875",
  appId: "1:696362967875:web:b0061e09974e776fd645f6"
};

// Google Agenda + Meet automático na Agenda (ID do cliente OAuth do Google Cloud, tipo Aplicativo da Web).
// Não é segredo. Vazio = o app mostra só o botão "Criar sala no Meet".
window.GOOGLE_CLIENT_ID = '';

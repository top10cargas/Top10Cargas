/**
 * TOP10 CARGAS - Configuração do Firebase
 * ==========================================
 * Para ativar a sincronização em tempo real entre dispositivos:
 *
 * 1. Acesse https://console.firebase.google.com
 * 2. Clique em "Criar um projeto" → nome: "Top10Cargas"
 * 3. No menu lateral, clique em "Realtime Database"
 * 4. Clique em "Criar banco de dados" → escolha "Modo de teste" → Avançar
 * 5. Clique no ⚙️ Configurações do projeto (engrenagem no topo esquerdo)
 * 6. Role até "Seus apps" → clique em "</> Web" → nome: "top10cargas-web"
 * 7. Copie o objeto firebaseConfig mostrado na tela
 * 8. Cole abaixo substituindo os valores "COLE_AQUI_..."
 * 9. Faça git push para o GitHub — pronto! Dados sincronizados entre todos os dispositivos.
 *
 * IMPORTANTE: Após configurar o Firebase, vá em "Realtime Database" → "Regras" e cole:
 * {
 *   "rules": {
 *     ".read": true,
 *     ".write": true
 *   }
 * }
 * Clique em "Publicar". Depois mude para regras mais seguras quando quiser.
 */

window.FIREBASE_CONFIG = {
  apiKey:            "COLE_AQUI_SUA_API_KEY",
  authDomain:        "COLE_AQUI.firebaseapp.com",
  databaseURL:       "https://COLE_AQUI-default-rtdb.firebaseio.com",
  projectId:         "COLE_AQUI_PROJECT_ID",
  storageBucket:     "COLE_AQUI.appspot.com",
  messagingSenderId: "COLE_AQUI_SENDER_ID",
  appId:             "COLE_AQUI_APP_ID"
};

# 🔥 Configuração do Firebase — Top10 Cargas

> **Por que Firebase?**  
> O GitHub Pages não pode rodar código no servidor.  
> O Firebase é um banco de dados **gratuito** do Google que sincroniza dados  
> entre todos os dispositivos em tempo real — celular, tablet, computador.

---

## Passo a Passo (10 minutos)

### 1. Criar o Projeto Firebase

1. Acesse **https://console.firebase.google.com**
2. Clique em **"Criar um projeto"**
3. Nome do projeto: **Top10Cargas** → Clique em **Continuar**
4. Google Analytics: pode desativar → Clique em **Criar projeto**
5. Aguarde e clique em **Continuar**

---

### 2. Criar o Banco de Dados

1. No menu lateral esquerdo, clique em **"Realtime Database"**
2. Clique em **"Criar banco de dados"**
3. Localização: escolha **Estados Unidos (us-central1)** ou qualquer uma
4. Modo de segurança: selecione **"Iniciar no modo de teste"** → Clique em **Avançar**
5. Clique em **Concluído**

> ⚠️ O modo de teste permite acesso público por 30 dias. Configure regras de segurança depois (veja abaixo).

---

### 3. Registrar o App Web

1. Na página do projeto, clique no ícone **`</>`** (Web)
2. Nome do app: **top10cargas-web**
3. Clique em **"Registrar app"**
4. Você verá um bloco de código parecido com este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "top10cargas.firebaseapp.com",
  databaseURL: "https://top10cargas-default-rtdb.firebaseio.com",
  projectId: "top10cargas",
  storageBucket: "top10cargas.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

5. **Copie esses valores** (cada chave do objeto)
6. Clique em **Continuar no console**

---

### 4. Editar o Arquivo de Configuração

Abra o arquivo **`js/firebase-config.js`** e substitua os valores:

```javascript
window.FIREBASE_CONFIG = {
  apiKey:            "COLE_AQUI_SUA_API_KEY",        // ← substitua pelo seu apiKey
  authDomain:        "COLE_AQUI.firebaseapp.com",    // ← substitua pelo seu authDomain
  databaseURL:       "https://COLE_AQUI-default-rtdb.firebaseio.com", // ← o mais importante!
  projectId:         "COLE_AQUI_PROJECT_ID",         // ← substitua pelo seu projectId
  storageBucket:     "COLE_AQUI.appspot.com",        // ← substitua
  messagingSenderId: "COLE_AQUI_SENDER_ID",          // ← substitua
  appId:             "COLE_AQUI_APP_ID"              // ← substitua
};
```

**Exemplo preenchido:**
```javascript
window.FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain:        "top10cargas-12345.firebaseapp.com",
  databaseURL:       "https://top10cargas-12345-default-rtdb.firebaseio.com",
  projectId:         "top10cargas-12345",
  storageBucket:     "top10cargas-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abcdef1234567890"
};
```

---

### 5. Configurar Regras de Segurança

No Firebase Console → **Realtime Database** → aba **"Regras"**, cole:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Clique em **Publicar**.

> 🔒 **Depois de testar**, você pode usar regras mais seguras. Por ora, essas regras abertas funcionam para o uso do sistema.

---

### 6. Publicar no GitHub

No terminal, execute:

```bash
git add -A
git commit -m "feat: Firebase sincronização em tempo real entre dispositivos"
git push origin main
```

Aguarde ~2 minutos para o GitHub Pages atualizar.

---

## ✅ Como Verificar

1. Abra **https://top10cargas.com** no celular
2. Crie um novo usuário / cotação
3. Abra o site no computador com a conta **admin**
4. O novo usuário e a cotação aparecerão **automaticamente** sem precisar recarregar

---

## ❓ Problemas Comuns

| Problema | Solução |
|----------|---------|
| "Firebase não configurado" | Verifique se colou o `databaseURL` corretamente em `firebase-config.js` |
| Dados não aparecem | Verifique as regras no Realtime Database (devem ser `.read: true, .write: true`) |
| Erro de CORS | Certifique-se de acessar por `https://top10cargas.com` e não por arquivo local |
| Dados de imagens não sincronizam | Imagens grandes são salvas apenas localmente para economizar cota gratuita |

---

## 📊 Limites Gratuitos do Firebase (Plano Spark)

| Recurso | Limite Gratuito |
|---------|-----------------|
| Armazenamento de dados | 1 GB |
| Download de dados | 10 GB/mês |
| Conexões simultâneas | 100 |
| **Custo** | **R$ 0,00 (grátis)** |

Para uma transportadora pequena/média, o plano gratuito é mais que suficiente.

---

*Top10 Cargas — Sistema de Logística e Frete | top10cargas.com*

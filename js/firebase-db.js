/**
 * TOP10 CARGAS - Integração Firebase Realtime Database
 * ======================================================
 * Módulo responsável pela sincronização em tempo real entre dispositivos.
 * Utiliza Firebase Realtime Database (gratuito - plano Spark).
 *
 * Sem Firebase configurado: o app funciona normalmente via localStorage (modo offline).
 * Com Firebase configurado: todos os usuários e cotações são compartilhados em tempo real.
 */

(function() {
  'use strict';

  // ============================================================
  // VERIFICAÇÃO: Firebase configurado e SDKs carregados?
  // ============================================================
  function isFirebaseReady() {
    return (
      typeof firebase !== 'undefined' &&
      typeof firebase.database === 'function' &&
      typeof window.FIREBASE_CONFIG !== 'undefined' &&
      window.FIREBASE_CONFIG.apiKey &&
      !window.FIREBASE_CONFIG.apiKey.startsWith('COLE_AQUI') &&
      window.FIREBASE_CONFIG.databaseURL &&
      !window.FIREBASE_CONFIG.databaseURL.includes('COLE_AQUI')
    );
  }

  // ============================================================
  // OBJETO PRINCIPAL FirebaseDB
  // ============================================================
  const FirebaseDB = {
    _db: null,
    _initialized: false,
    _listenersActive: false,
    _changeCallback: null,
    _adminEmail: 'top10cargas@hotmail.com',

    // ----------------------------------------------------------
    // INICIALIZAÇÃO
    // ----------------------------------------------------------
    init() {
      if (this._initialized) return true;
      if (!isFirebaseReady()) {
        console.info('[FirebaseDB] Firebase não configurado. Operando em modo localStorage.');
        return false;
      }
      try {
        if (!firebase.apps || firebase.apps.length === 0) {
          firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        this._db = firebase.database();
        this._initialized = true;
        console.info('[FirebaseDB] ✅ Firebase Realtime Database conectado com sucesso!');
        return true;
      } catch (err) {
        console.error('[FirebaseDB] Erro ao inicializar Firebase:', err);
        this._initialized = false;
        return false;
      }
    },

    // ----------------------------------------------------------
    // VERIFICAÇÃO DE DISPONIBILIDADE
    // ----------------------------------------------------------
    isAvailable() {
      return this._initialized && this._db !== null;
    },

    // ----------------------------------------------------------
    // LIMPAR DADOS LEGADOS (IDs incorretos com ponto)
    // ----------------------------------------------------------------
    _sanitizeId(id) {
      // Firebase não aceita: . # $ [ ] /
      return String(id || '').replace(/[.#$[\]/]/g, '_');
    },

    // ----------------------------------------------------------
    // USUÁRIOS
    // ----------------------------------------------------------
    async saveUser(user) {
      if (!this.isAvailable() || !user || !user.id) return;
      // Nunca salvar admin no Firebase
      if (user.email && user.email.toLowerCase() === this._adminEmail.toLowerCase()) return;
      try {
        const safeId = this._sanitizeId(user.id);
        // Remover senha antes de salvar no Firebase por segurança
        const userToSave = Object.assign({}, user);
        delete userToSave.password;
        await this._db.ref('users/' + safeId).set(userToSave);
      } catch (err) {
        console.warn('[FirebaseDB] Erro ao salvar usuário:', err);
      }
    },

    async deleteUser(userId) {
      if (!this.isAvailable() || !userId) return;
      try {
        const safeId = this._sanitizeId(userId);
        await this._db.ref('users/' + safeId).remove();
      } catch (err) {
        console.warn('[FirebaseDB] Erro ao deletar usuário:', err);
      }
    },

    async getAllUsers() {
      if (!this.isAvailable()) return [];
      try {
        const snap = await this._db.ref('users').once('value');
        const data = snap.val();
        if (!data) return [];
        return Object.values(data).filter(u => u && u.id);
      } catch (err) {
        console.warn('[FirebaseDB] Erro ao carregar usuários:', err);
        return [];
      }
    },

    // ----------------------------------------------------------
    // COTAÇÕES
    // ----------------------------------------------------------
    async saveQuote(quote) {
      if (!this.isAvailable() || !quote || !quote.id) return;
      try {
        const safeId = this._sanitizeId(quote.id);
        // Limitar tamanho de packageImage para não estourar o limite gratuito
        const quoteToSave = Object.assign({}, quote);
        if (quoteToSave.packageImage && quoteToSave.packageImage.length > 50000) {
          quoteToSave.packageImage = null; // Imagens grandes não são salvas no Firebase
        }
        await this._db.ref('quotes/' + safeId).set(quoteToSave);
      } catch (err) {
        console.warn('[FirebaseDB] Erro ao salvar cotação:', err);
      }
    },

    async updateQuote(quoteId, updates) {
      if (!this.isAvailable() || !quoteId) return;
      try {
        const safeId = this._sanitizeId(quoteId);
        const cleanUpdates = Object.assign({}, updates);
        if (cleanUpdates.packageImage && cleanUpdates.packageImage.length > 50000) {
          delete cleanUpdates.packageImage;
        }
        await this._db.ref('quotes/' + safeId).update(cleanUpdates);
      } catch (err) {
        console.warn('[FirebaseDB] Erro ao atualizar cotação:', err);
      }
    },

    async deleteQuote(quoteId) {
      if (!this.isAvailable() || !quoteId) return;
      try {
        const safeId = this._sanitizeId(quoteId);
        await this._db.ref('quotes/' + safeId).remove();
      } catch (err) {
        console.warn('[FirebaseDB] Erro ao deletar cotação:', err);
      }
    },

    async getAllQuotes() {
      if (!this.isAvailable()) return [];
      try {
        const snap = await this._db.ref('quotes').once('value');
        const data = snap.val();
        if (!data) return [];
        return Object.values(data).filter(q => q && q.id);
      } catch (err) {
        console.warn('[FirebaseDB] Erro ao carregar cotações:', err);
        return [];
      }
    },

    // ----------------------------------------------------------
    // MENSAGENS
    // ----------------------------------------------------------
    async saveMessage(msg) {
      if (!this.isAvailable() || !msg || !msg.id) return;
      try {
        const safeId = this._sanitizeId(msg.id);
        await this._db.ref('messages/' + safeId).set(msg);
      } catch (err) {
        console.warn('[FirebaseDB] Erro ao salvar mensagem:', err);
      }
    },

    async getAllMessages() {
      if (!this.isAvailable()) return [];
      try {
        const snap = await this._db.ref('messages').once('value');
        const data = snap.val();
        if (!data) return [];
        return Object.values(data).filter(m => m && m.id);
      } catch (err) {
        console.warn('[FirebaseDB] Erro ao carregar mensagens:', err);
        return [];
      }
    },

    // ----------------------------------------------------------
    // CARREGAMENTO COMPLETO (usado na inicialização do Store)
    // ----------------------------------------------------------
    async loadAll() {
      if (!this.isAvailable()) return { users: [], quotes: [], messages: [] };
      try {
        const [users, quotes, messages] = await Promise.all([
          this.getAllUsers(),
          this.getAllQuotes(),
          this.getAllMessages()
        ]);
        console.info(`[FirebaseDB] ✅ Carregado: ${users.length} usuários, ${quotes.length} cotações, ${messages.length} mensagens`);
        return { users, quotes, messages };
      } catch (err) {
        console.warn('[FirebaseDB] Erro no loadAll:', err);
        return { users: [], quotes: [], messages: [] };
      }
    },

    // ----------------------------------------------------------
    // ESCUTA EM TEMPO REAL (listeners para atualizações live)
    // ----------------------------------------------------------
    listenForChanges(callback) {
      if (!this.isAvailable() || this._listenersActive) return;
      this._changeCallback = callback;
      this._listenersActive = true;

      // Escuta mudanças em cotações
      this._db.ref('quotes').on('value', (snap) => {
        const data = snap.val();
        const quotes = data ? Object.values(data).filter(q => q && q.id) : [];
        if (this._changeCallback) {
          this._changeCallback({ type: 'quotes', data: quotes });
        }
      }, (err) => {
        console.warn('[FirebaseDB] Erro no listener de cotações:', err);
      });

      // Escuta mudanças em usuários
      this._db.ref('users').on('value', (snap) => {
        const data = snap.val();
        const users = data ? Object.values(data).filter(u => u && u.id) : [];
        if (this._changeCallback) {
          this._changeCallback({ type: 'users', data: users });
        }
      }, (err) => {
        console.warn('[FirebaseDB] Erro no listener de usuários:', err);
      });

      // Escuta mudanças em mensagens
      this._db.ref('messages').on('value', (snap) => {
        const data = snap.val();
        const messages = data ? Object.values(data).filter(m => m && m.id) : [];
        if (this._changeCallback) {
          this._changeCallback({ type: 'messages', data: messages });
        }
      }, (err) => {
        console.warn('[FirebaseDB] Erro no listener de mensagens:', err);
      });

      console.info('[FirebaseDB] 🔴 Listeners em tempo real ativados.');
    },

    // Para de escutar mudanças
    stopListening() {
      if (!this.isAvailable()) return;
      this._db.ref('quotes').off();
      this._db.ref('users').off();
      this._db.ref('messages').off();
      this._listenersActive = false;
      this._changeCallback = null;
      console.info('[FirebaseDB] Listeners desativados.');
    },

    // ----------------------------------------------------------
    // STATUS
    // ----------------------------------------------------------
    getStatus() {
      return {
        initialized: this._initialized,
        available: this.isAvailable(),
        listening: this._listenersActive,
        configured: isFirebaseReady()
      };
    }
  };

  // Expor globalmente
  window.FirebaseDB = FirebaseDB;

})();

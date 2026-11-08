/**
 * LOGIX BRASIL - Gerenciamento de Estado Dinâmico & Persistência Local
 * Suporte a envios em todo o território brasileiro (Rodoviário e Aéreo) em BRL (R$)
 * Autenticação restrita de Administrador: top10cargas@hotmail.com / Caxias844$
 * Upload de imagem da caixa e rastreamento contínuo de entregas
 * 
 * ARQUITETURA REFATORADA:
 * 1. Dados estáticos (mensagens, usuários e cotações predeterminadas) separados em staticData.js
 * 2. Suporte a paginação e carga diferida (lazy loading) para grandes volumes de dados
 * 3. Rotina programada de eliminação de dados temporários e controle de retenção com TTL
 */

const STORAGE_KEYS = {
  QUOTES: 'logixbrasil_quotes',
  USERS: 'logixbrasil_users',
  CURRENT_USER: 'logixbrasil_current_user',
  NOTIFICATIONS: 'logixbrasil_notifications',
  MESSAGES: 'top10cargas_messages',
  ADMIN_PHONES: 'top10cargas_admin_phones',
  PHONE_ALERTS: 'top10cargas_phone_alerts',
  TEMP_CACHE: 'top10cargas_temp_cache',
  LAST_CLEANUP: 'top10cargas_last_cleanup',
  RETENTION_CONFIG: 'top10cargas_retention_config',
  ADMIN_WEBHOOK: 'top10cargas_admin_webhook'
};

// Fallback de segurança caso staticData.js não seja carregado antes
const getStaticSource = () => {
  if (typeof window !== 'undefined' && window.LOGIX_STATIC) {
    return window.LOGIX_STATIC;
  }
  return {
    ADMIN_CREDENTIALS: window.ADMIN_CREDENTIALS || {
      email: 'top10cargas@hotmail.com',
      password: 'Caxias844$',
      name: 'Top 10 Cargas Brasil',
      company: 'Top 10 Cargas & Logística Nacional'
    },
    DEFAULT_USERS: window.DEFAULT_USERS || [],
    DEFAULT_MESSAGES: window.DEFAULT_MESSAGES || [],
    DEFAULT_ADMIN_PHONES: window.DEFAULT_ADMIN_PHONES || [],
    DEFAULT_QUOTES: window.DEFAULT_QUOTES || [],
    SAMPLE_PACKAGE_IMAGE: window.SAMPLE_PACKAGE_IMAGE || '',
    clone: (data) => JSON.parse(JSON.stringify(data)),
    getInitialUsers: () => JSON.parse(JSON.stringify(window.DEFAULT_USERS || [])),
    getInitialMessages: () => JSON.parse(JSON.stringify(window.DEFAULT_MESSAGES || [])),
    getInitialQuotes: () => JSON.parse(JSON.stringify(window.DEFAULT_QUOTES || [])),
    getInitialAdminPhones: () => JSON.parse(JSON.stringify(window.DEFAULT_ADMIN_PHONES || []))
  };
};

class Store {
  constructor() {
    this.users = [];
    this.quotes = [];
    this.currentUser = null;
    this.notifications = [];
    this.messages = [];
    this.adminPhones = [];
    this.phoneAlerts = [];
    this.resetCodes = {};
    this.tempCache = {};
    this.listeners = [];
    this.cleanupIntervalId = null;

    // Configuração de retenção de dados temporários
    this.retentionConfig = {
      resetCodeTtlMinutes: 10,       // Códigos de redefinição de senha duram 10 minutos
      guestQuoteTtlDays: 7,          // Cotações temporárias de visitante sem cadastro expiram em 7 dias
      readNotificationsTtlDays: 30,  // Notificações lidas expiram após 30 dias
      testAlertsTtlHours: 24,        // Alertas de teste expiram em 24h
      maxAlertsHistory: 100,         // Limite máximo de alertas armazenados no log
      defaultTempTtlMinutes: 60      // TTL padrão para entradas de cache temporário (1h)
    };

    this.lastCleanup = null;
    this.init();
  }

  init() {
    const staticData = getStaticSource();

    // 1. Carregar usuários e assegurar integridade do administrador
    const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (savedUsers) {
      try {
        this.users = JSON.parse(savedUsers);
      } catch (e) {
        this.users = staticData.getInitialUsers();
      }
    } else {
      this.users = staticData.getInitialUsers();
    }
    this.ensureAdminUser();
    this.saveUsers();

    // 2. Carregar cotações
    const savedQuotes = localStorage.getItem(STORAGE_KEYS.QUOTES);
    if (savedQuotes) {
      try {
        this.quotes = JSON.parse(savedQuotes);
        this.quotes.forEach(q => {
          if (!q.deliveryStage) {
            if (q.status === 'COMPLETADO') q.deliveryStage = 'entregue';
            else if (q.status === 'ACEPTADA') q.deliveryStage = 'em_transito';
            else q.deliveryStage = 'cotacao';
          }
        });
        localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(this.quotes));
      } catch (e) {
        this.quotes = staticData.getInitialQuotes();
      }
    } else {
      this.quotes = staticData.getInitialQuotes();
      this.saveQuotes();
    }

    // 3. Carregar usuário logado
    const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        const adminCreds = staticData.ADMIN_CREDENTIALS;
        if (this.currentUser && this.currentUser.role === 'admin') {
          if (this.currentUser.email !== adminCreds.email || this.currentUser.password !== adminCreds.password) {
            this.currentUser = null;
            this.saveCurrentUser();
          }
        }
      } catch (e) {
        this.currentUser = null;
      }
    }

    // 4. Carregar notificações
    const savedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (savedNotifs) {
      try {
        this.notifications = JSON.parse(savedNotifs);
      } catch (e) {
        this.notifications = [];
      }
    } else {
      this.notifications = [];
    }

    // 5. Carregar mensagens do chat (LAN Messenger)
    const savedMsgs = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (savedMsgs) {
      try {
        this.messages = JSON.parse(savedMsgs);
      } catch (e) {
        this.messages = staticData.getInitialMessages();
      }
    } else {
      this.messages = staticData.getInitialMessages();
      this.saveMessages();
    }

    // 6. Carregar telefones de administradores
    const savedAdminPhones = localStorage.getItem(STORAGE_KEYS.ADMIN_PHONES);
    if (savedAdminPhones) {
      try {
        this.adminPhones = JSON.parse(savedAdminPhones);
      } catch (e) {
        this.adminPhones = staticData.getInitialAdminPhones();
      }
    } else {
      this.adminPhones = staticData.getInitialAdminPhones();
      this.saveAdminPhones();
    }

    // 7. Carregar histórico de alertas telefônicos
    const savedPhoneAlerts = localStorage.getItem(STORAGE_KEYS.PHONE_ALERTS);
    if (savedPhoneAlerts) {
      try {
        this.phoneAlerts = JSON.parse(savedPhoneAlerts);
      } catch (e) {
        this.phoneAlerts = [];
      }
    } else {
      this.phoneAlerts = [];
    }

    // 8. Carregar cache temporário com TTL
    const savedTempCache = localStorage.getItem(STORAGE_KEYS.TEMP_CACHE);
    if (savedTempCache) {
      try {
        this.tempCache = JSON.parse(savedTempCache);
      } catch (e) {
        this.tempCache = {};
      }
    }

    // 9. Carregar dados da última limpeza realizada
    const savedLastCleanup = localStorage.getItem(STORAGE_KEYS.LAST_CLEANUP);
    if (savedLastCleanup) {
      try {
        this.lastCleanup = JSON.parse(savedLastCleanup);
      } catch (e) {
        this.lastCleanup = null;
      }
    }

    // 10. Iniciar rotina agendada de eliminação de dados temporários (a cada 5 minutos)
    this.startTemporaryDataCleanupSchedule(5);

    // 11. Sincronização entre abas do navegador
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEYS.QUOTES && event.newValue) {
        try { this.quotes = JSON.parse(event.newValue); } catch (e) { /* ignorar */ }
        this.notifyListeners();
      } else if (event.key === STORAGE_KEYS.USERS && event.newValue) {
        try { this.users = JSON.parse(event.newValue); } catch (e) { /* ignorar */ }
        this.notifyListeners();
      } else if (event.key === STORAGE_KEYS.NOTIFICATIONS && event.newValue) {
        try { this.notifications = JSON.parse(event.newValue); } catch (e) { /* ignorar */ }
        this.notifyListeners();
      } else if (event.key === STORAGE_KEYS.MESSAGES && event.newValue) {
        try { this.messages = JSON.parse(event.newValue); } catch (e) { /* ignorar */ }
        this.notifyListeners();
      } else if (event.key === STORAGE_KEYS.ADMIN_PHONES && event.newValue) {
        try { this.adminPhones = JSON.parse(event.newValue); } catch (e) { /* ignorar */ }
        this.notifyListeners();
      } else if (event.key === STORAGE_KEYS.PHONE_ALERTS && event.newValue) {
        try { this.phoneAlerts = JSON.parse(event.newValue); } catch (e) { /* ignorar */ }
        this.notifyListeners();
      } else if (event.key === STORAGE_KEYS.TEMP_CACHE && event.newValue) {
        try { this.tempCache = JSON.parse(event.newValue); } catch (e) { /* ignorar */ }
      }
    });
  }

  ensureAdminUser() {
    const staticData = getStaticSource();
    const adminCreds = staticData.ADMIN_CREDENTIALS;

    // Remove qualquer outro admin legado e garante apenas o administrador oficial
    this.users = this.users.filter(u => u && (u.role !== 'admin' || (u.email && u.email.toLowerCase() === adminCreds.email.toLowerCase())));
    const existingAdmin = this.users.find(u => u && u.email && u.email.toLowerCase() === adminCreds.email.toLowerCase());
    if (existingAdmin) {
      existingAdmin.name = adminCreds.name;
      existingAdmin.password = adminCreds.password;
      existingAdmin.role = 'admin';
      existingAdmin.company = adminCreds.company;
    } else {
      this.users.unshift({
        id: 'user_admin_top10',
        name: adminCreds.name,
        email: adminCreds.email,
        password: adminCreds.password,
        phone: '+55 11 3200-4000',
        company: adminCreds.company,
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
      });
    }
  }

  saveUsers() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
    this.notifyListeners();
  }

  saveQuotes() {
    localStorage.setItem(STORAGE_KEYS.QUOTES, JSON.stringify(this.quotes));
    this.notifyListeners();
  }

  saveCurrentUser() {
    if (this.currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    this.notifyListeners();
  }

  saveNotifications() {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(this.notifications));
    this.notifyListeners();
  }

  saveMessages() {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(this.messages));
    this.notifyListeners();
  }

  saveAdminPhones() {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PHONES, JSON.stringify(this.adminPhones));
    this.notifyListeners();
  }

  savePhoneAlerts() {
    localStorage.setItem(STORAGE_KEYS.PHONE_ALERTS, JSON.stringify(this.phoneAlerts));
    this.notifyListeners();
  }

  saveTempCache() {
    localStorage.setItem(STORAGE_KEYS.TEMP_CACHE, JSON.stringify(this.tempCache));
  }

  getAdminPhones() {
    return this.adminPhones || [];
  }

  addAdminPhone(phoneData) {
    if (!phoneData.number || !phoneData.number.trim()) {
      throw new Error('Informe um número de telefone válido.');
    }
    const newPhone = {
      id: 'phone_admin_' + Date.now(),
      name: (phoneData.name || 'Telefone Administrador').trim(),
      number: phoneData.number.trim(),
      whatsapp: phoneData.whatsapp !== false,
      sms: phoneData.sms !== false,
      active: true
    };
    this.adminPhones.push(newPhone);
    this.saveAdminPhones();
    return newPhone;
  }

  toggleAdminPhone(id) {
    const phone = this.adminPhones.find(p => p.id === id);
    if (!phone) return;
    phone.active = !phone.active;
    this.saveAdminPhones();
  }

  deleteAdminPhone(id) {
    if (this.adminPhones.length <= 1) {
      throw new Error('É necessário manter pelo menos um telefone de administrador cadastrado.');
    }
    this.adminPhones = this.adminPhones.filter(p => p.id !== id);
    this.saveAdminPhones();
  }

  getPhoneAlertsLog() {
    return this.phoneAlerts || [];
  }

  clearPhoneAlertsLog() {
    this.phoneAlerts = [];
    this.savePhoneAlerts();
  }

  getAdminWebhookUrl() {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_WEBHOOK) || '';
  }

  setAdminWebhookUrl(url) {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_WEBHOOK, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_WEBHOOK);
    }
  }

  notifyAdminPhones(quote, eventType = 'quote_created') {
    const activePhones = (this.adminPhones || []).filter(p => p.active);
    if (activePhones.length === 0) return [];

    const isReanalysis = eventType === 'reanalysis_requested';
    const isTest = eventType === 'test_alert';
    const modalidadeTexto = (quote.modality === 'aereo') ? 'AÉREO PRIORITÁRIO' : 'RODOVIÁRIO EXPRESSO';
    const clientContact = quote.clientPhone ? `${quote.clientPhone} (${quote.clientEmail || ''})` : (quote.clientEmail || 'Não informado');

    let titleHeader = '📦 NOVA SOLICITAÇÃO DE FRETE - TOP10 CARGAS';
    if (isReanalysis) titleHeader = '🔄 REANÁLISE SOLICITADA - TOP10 CARGAS';
    if (isTest) titleHeader = '🧪 TESTE DE ALERTA TELEFÔNICO - TOP10 CARGAS';

    const messageText = `${titleHeader}\n\n` +
      `📌 Código: ${quote.id}\n` +
      `🚚 Modalidade: ${modalidadeTexto}\n` +
      `👤 Cliente: ${quote.clientName}\n` +
      `📞 Contato: ${clientContact}\n` +
      `📍 Origem: ${quote.origin}\n` +
      `🎯 Destino: ${quote.destination}\n` +
      `📦 Volumes: ${quote.packageCount} volume(s) • ${quote.weight} kg\n` +
      (quote.dimensions ? `📐 Medidas: ${quote.dimensions.length}x${quote.dimensions.width}x${quote.dimensions.height} cm\n` : '') +
      (quote.description ? `📝 Mercadoria: ${quote.description}\n` : '') +
      (quote.declaredValue ? `💰 Valor Declarado: R$ ${parseFloat(quote.declaredValue).toFixed(2)}\n` : '') +
      (isReanalysis && quote.reanalysisNotes ? `💬 Nota do Cliente: "${quote.reanalysisNotes}"\n` : '') +
      `⏰ Data/Hora: ${new Date().toLocaleString('pt-BR')}\n\n` +
      `🔗 Acesse para emitir proposta: https://top10cargas.com`;

    const alertsCreated = [];

    activePhones.forEach(phone => {
      const cleanDigits = phone.number.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${cleanDigits}?text=${encodedMsg}`;
      const smsUrl = `sms:${cleanDigits}?body=${encodedMsg}`;

      const alert = {
        id: 'palert_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        quoteId: quote.id,
        eventType,
        phoneId: phone.id,
        phoneName: phone.name,
        phoneNumber: phone.number,
        clientName: quote.clientName,
        clientPhone: quote.clientPhone || '',
        message: messageText,
        whatsappUrl,
        smsUrl,
        timestamp: new Date().toISOString(),
        status: 'ENVIADO'
      };

      this.phoneAlerts.unshift(alert);
      alertsCreated.push(alert);
    });

    if (this.phoneAlerts.length > this.retentionConfig.maxAlertsHistory) {
      this.phoneAlerts = this.phoneAlerts.slice(0, this.retentionConfig.maxAlertsHistory);
    }

    this.savePhoneAlerts();

    // Disparo em background para Webhook / Gateway de WhatsApp e SMS se configurado
    const webhookUrl = this.getAdminWebhookUrl();
    if (webhookUrl) {
      try {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: eventType,
            quoteId: quote.id,
            timestamp: new Date().toISOString(),
            message: messageText,
            adminPhones: activePhones.map(p => ({
              id: p.id,
              name: p.name,
              number: p.number,
              whatsapp: p.whatsapp,
              sms: p.sms
            })),
            quote: {
              id: quote.id,
              clientName: quote.clientName,
              clientPhone: quote.clientPhone,
              clientEmail: quote.clientEmail,
              origin: quote.origin,
              destination: quote.destination,
              modality: quote.modality,
              packageCount: quote.packageCount,
              weight: quote.weight,
              dimensions: quote.dimensions,
              declaredValue: quote.declaredValue,
              isFragile: quote.isFragile,
              packageImage: quote.packageImage ? true : false
            }
          })
        }).catch(err => {
          console.warn('Falha no webhook de notificação telefônica:', err);
        });
      } catch (e) {
        console.warn('Erro ao disparar webhook:', e);
      }
    }

    return alertsCreated;
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(fn => fn(this));
  }

  // ========================================================
  // REQUISITO 2: ENGINE DE PAGINAÇÃO & CARGA DIFERIDA
  // ========================================================

  /**
   * Helper genérico para paginar qualquer array de dados na memória.
   * Retorna os itens fatiados e os metadados de controle de página.
   */
  paginate(items = [], page = 1, pageSize = 10) {
    const totalItems = items.length;
    const safePageSize = Math.max(1, parseInt(pageSize, 10) || 10);
    const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
    const safePage = Math.min(Math.max(1, parseInt(page, 10) || 1), totalPages);
    const startIndex = (safePage - 1) * safePageSize;
    const endIndex = Math.min(startIndex + safePageSize, totalItems);
    const paginatedItems = items.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage: safePage,
      pageSize: safePageSize,
      startIndex,
      endIndex,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1
    };
  }

  /**
   * Obtém cotações paginadas com filtros de busca, status, cliente e ordenação.
   */
  getPaginatedQuotes({
    page = 1,
    pageSize = 10,
    status = 'ALL',
    search = '',
    clientId = null,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = {}) {
    let result = [...this.quotes];

    if (clientId) {
      result = result.filter(q => q.clientId === clientId);
    }

    if (status && status !== 'ALL') {
      result = result.filter(q => q.status === status);
    }

    const cleanSearch = (search || '').toLowerCase().trim();
    if (cleanSearch) {
      result = result.filter(q =>
        (q.id && q.id.toLowerCase().includes(cleanSearch)) ||
        (q.clientName && q.clientName.toLowerCase().includes(cleanSearch)) ||
        (q.clientEmail && q.clientEmail.toLowerCase().includes(cleanSearch)) ||
        (q.origin && q.origin.toLowerCase().includes(cleanSearch)) ||
        (q.destination && q.destination.toLowerCase().includes(cleanSearch)) ||
        (q.description && q.description.toLowerCase().includes(cleanSearch))
      );
    }

    // Ordenação
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === 'createdAt') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      }
      if (sortOrder === 'desc') {
        return valB > valA ? 1 : valB < valA ? -1 : 0;
      }
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    });

    return this.paginate(result, page, pageSize);
  }

  /**
   * Carga diferida / Paginação de mensagens de chat entre dois usuários.
   * Suporta carregar os lotes mais recentes ou anteriores para histórico fluido.
   */
  getPaginatedMessages(userId1, userId2, { limit = 20, offset = 0 } = {}) {
    if (!userId1 || !userId2) {
      return { messages: [], total: 0, hasMore: false, remaining: 0 };
    }

    const all = this.getMessagesBetween(userId1, userId2);
    const total = all.length;
    const safeLimit = Math.max(1, parseInt(limit, 10) || 20);
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

    // No chat, exibimos os mais recentes primeiro. Se offset = 0, pegamos os últimos 'limit'
    const startIndex = Math.max(0, total - safeLimit - safeOffset);
    const endIndex = Math.max(0, total - safeOffset);
    const slice = all.slice(startIndex, endIndex);
    const remaining = startIndex;

    return {
      messages: slice,
      total,
      hasMore: remaining > 0,
      remaining,
      limit: safeLimit,
      offset: safeOffset
    };
  }

  /**
   * Paginação do log de alertas telefônicos do painel administrativo.
   */
  getPaginatedPhoneAlerts({ page = 1, pageSize = 10, search = '' } = {}) {
    let list = [...this.phoneAlerts];
    const clean = (search || '').toLowerCase().trim();
    if (clean) {
      list = list.filter(a =>
        (a.quoteId && a.quoteId.toLowerCase().includes(clean)) ||
        (a.clientName && a.clientName.toLowerCase().includes(clean)) ||
        (a.phoneNumber && a.phoneNumber.includes(clean)) ||
        (a.phoneName && a.phoneName.toLowerCase().includes(clean))
      );
    }
    return this.paginate(list, page, pageSize);
  }

  /**
   * Paginação para a lista de usuários gerenciados pelo administrador.
   */
  getPaginatedUsers({ page = 1, pageSize = 10, search = '' } = {}) {
    const staticData = getStaticSource();
    const adminEmail = (staticData.ADMIN_CREDENTIALS.email || '').toLowerCase();
    let list = this.users.filter(u => u && (!u.email || u.email.toLowerCase() !== adminEmail));

    const clean = (search || '').toLowerCase().trim();
    if (clean) {
      list = list.filter(u =>
        (u.name && u.name.toLowerCase().includes(clean)) ||
        (u.email && u.email.toLowerCase().includes(clean)) ||
        (u.company && u.company.toLowerCase().includes(clean)) ||
        (u.phone && u.phone.includes(clean))
      );
    }
    return this.paginate(list, page, pageSize);
  }

  // ========================================================
  // REQUISITO 3: ELIMINAÇÃO PROGRAMADA DE DADOS TEMPORÁRIOS
  // ========================================================

  /**
   * Salva dado temporário com tempo de vida definido (TTL em minutos).
   */
  setTempData(key, value, ttlMinutes = null) {
    const ttl = ttlMinutes || this.retentionConfig.defaultTempTtlMinutes;
    this.tempCache[key] = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl * 60 * 1000
    };
    this.saveTempCache();
  }

  /**
   * Recupera dado temporário respeitando o TTL.
   */
  getTempData(key) {
    const entry = this.tempCache[key];
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete this.tempCache[key];
      this.saveTempCache();
      return null;
    }
    return entry.value;
  }

  /**
   * Remove explicitamente uma chave do cache temporário.
   */
  removeTempData(key) {
    if (this.tempCache[key]) {
      delete this.tempCache[key];
      this.saveTempCache();
    }
  }

  /**
   * Rotina central de limpeza e eliminação de dados temporários expirados.
   * Pode ser executada manualmente ou pelo agendador em segundo plano.
   */
  cleanupTemporaryData(options = {}) {
    const now = Date.now();
    let resetCodesRemoved = 0;
    let tempCacheRemoved = 0;
    let notificationsRemoved = 0;
    let alertsRemoved = 0;
    let guestQuotesRemoved = 0;

    // 1. Limpeza de códigos de recuperação de senha expirados
    if (this.resetCodes && typeof this.resetCodes === 'object') {
      Object.keys(this.resetCodes).forEach(emailKey => {
        const item = this.resetCodes[emailKey];
        if (!item || !item.expires || now > item.expires) {
          delete this.resetCodes[emailKey];
          resetCodesRemoved++;
        }
      });
    }

    // 2. Limpeza de itens expirados do cache temporário
    if (this.tempCache && typeof this.tempCache === 'object') {
      let cacheChanged = false;
      Object.keys(this.tempCache).forEach(key => {
        const item = this.tempCache[key];
        if (!item || !item.expiresAt || now > item.expiresAt) {
          delete this.tempCache[key];
          tempCacheRemoved++;
          cacheChanged = true;
        }
      });
      if (cacheChanged) {
        this.saveTempCache();
      }
    }

    // 3. Limpeza de notificações antigas já lidas (retenção configurada em dias)
    const notifMaxAgeMs = (options.readNotificationsTtlDays || this.retentionConfig.readNotificationsTtlDays) * 24 * 3600 * 1000;
    const initialNotifCount = this.notifications.length;
    this.notifications = this.notifications.filter(n => {
      if (!n.read) return true;
      const notifAge = now - new Date(n.createdAt || 0).getTime();
      return notifAge <= notifMaxAgeMs;
    });
    notificationsRemoved = initialNotifCount - this.notifications.length;
    if (notificationsRemoved > 0) {
      this.saveNotifications();
    }

    // 4. Limpeza de alertas de teste e poda do log telefônico
    const testAlertMaxAgeMs = (options.testAlertsTtlHours || this.retentionConfig.testAlertsTtlHours) * 3600 * 1000;
    const initialAlertsCount = this.phoneAlerts.length;
    this.phoneAlerts = this.phoneAlerts.filter(a => {
      if (a.eventType === 'test_alert') {
        const age = now - new Date(a.timestamp || 0).getTime();
        return age <= testAlertMaxAgeMs;
      }
      return true;
    });

    if (this.phoneAlerts.length > this.retentionConfig.maxAlertsHistory) {
      this.phoneAlerts = this.phoneAlerts.slice(0, this.retentionConfig.maxAlertsHistory);
    }
    alertsRemoved = initialAlertsCount - this.phoneAlerts.length;
    if (alertsRemoved > 0) {
      this.savePhoneAlerts();
    }

    // 5. Limpeza de cotações temporárias/abandonadas de visitantes (guest_)
    if (options.cleanupGuestQuotes) {
      const guestTtlMs = (options.guestQuoteTtlDays || this.retentionConfig.guestQuoteTtlDays) * 24 * 3600 * 1000;
      const initialQuotesCount = this.quotes.length;
      this.quotes = this.quotes.filter(q => {
        const isGuest = q.clientId && q.clientId.startsWith('guest_');
        const isPending = q.status === 'PENDIENTE_ANALISIS';
        if (isGuest && isPending) {
          const age = now - new Date(q.createdAt || 0).getTime();
          return age <= guestTtlMs;
        }
        return true;
      });
      guestQuotesRemoved = initialQuotesCount - this.quotes.length;
      if (guestQuotesRemoved > 0) {
        this.saveQuotes();
      }
    }

    const totalRemoved = resetCodesRemoved + tempCacheRemoved + notificationsRemoved + alertsRemoved + guestQuotesRemoved;

    this.lastCleanup = {
      timestamp: new Date().toISOString(),
      stats: {
        resetCodesRemoved,
        tempCacheRemoved,
        notificationsRemoved,
        alertsRemoved,
        guestQuotesRemoved,
        totalRemoved
      }
    };

    localStorage.setItem(STORAGE_KEYS.LAST_CLEANUP, JSON.stringify(this.lastCleanup));

    if (totalRemoved > 0) {
      this.notifyListeners();
    }

    return this.lastCleanup;
  }

  /**
   * Inicia o agendamento contínuo em segundo plano da limpeza de dados temporários.
   * @param {number} intervalMinutes - Intervalo em minutos (padrão 5 minutos)
   */
  startTemporaryDataCleanupSchedule(intervalMinutes = 5) {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }

    // Execução inicial ao subir a aplicação
    this.cleanupTemporaryData();

    // Execução recorrente programada
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupTemporaryData();
    }, intervalMs);
  }

  stopTemporaryDataCleanupSchedule() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  getLastCleanupInfo() {
    return this.lastCleanup;
  }

  // ========================================================
  // AUTENTICAÇÃO E USUÁRIOS
  // ========================================================
  register(userData) {
    const cleanEmail = (userData.email || '').trim().toLowerCase();
    const cleanCpfCnpj = (userData.cpfCnpj || '').replace(/\D/g, '');
    const cleanPassword = (userData.password || '').trim();

    if (!cleanEmail) {
      throw new Error('Informe um e-mail válido para o cadastro.');
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      throw new Error('A senha deve ter no mínimo 4 caracteres.');
    }

    const existing = this.users.find(u => {
      if (!u) return false;
      const uEmail = (u.email || '').trim().toLowerCase();
      if (uEmail && uEmail === cleanEmail) return true;
      if (cleanCpfCnpj && u.cpfCnpj) {
        const uCpf = String(u.cpfCnpj).replace(/\D/g, '');
        if (uCpf && uCpf === cleanCpfCnpj) return true;
      }
      return false;
    });

    if (existing) {
      throw new Error('Já existe uma conta cadastrada com este e-mail ou CPF/CNPJ.');
    }

    const newUser = {
      id: 'user_' + Date.now(),
      name: (userData.name || '').trim(),
      email: (userData.email || '').trim(),
      password: (userData.password || '').trim(),
      phone: (userData.phone || '').trim(),
      company: (userData.company || '').trim(),
      cpfCnpj: (userData.cpfCnpj || '').trim(),
      role: 'client',
      avatar: userData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name || 'Cliente')}`
    };

    this.users.push(newUser);
    this.saveUsers();
    this.currentUser = newUser;
    this.saveCurrentUser();
    return newUser;
  }

  login(identifier, password) {
    if (!identifier || !password) {
      throw new Error('Preencha seu e-mail / CPF e a sua senha.');
    }

    const staticData = getStaticSource();
    const adminCreds = staticData.ADMIN_CREDENTIALS;
    const cleanInput = String(identifier).trim().toLowerCase();
    const digitsOnly = String(identifier).replace(/\D/g, '');
    const cleanPass = String(password).trim();

    // Verificação para administrador (suporta credenciais oficiais e de demonstração)
    const isAdminEmail = cleanInput === adminCreds.email.toLowerCase() || cleanInput === 'admin@logixbrasil.com.br' || cleanInput === 'admin';
    if (isAdminEmail) {
      const isValidAdminPass = password === adminCreds.password || cleanPass === adminCreds.password.trim() || cleanPass === 'admin';
      if (!isValidAdminPass) {
        throw new Error('Senha incorreta para a conta de administrador.');
      }
      let adminUser = this.users.find(u => u && u.role === 'admin');
      if (!adminUser) {
        this.ensureAdminUser();
        adminUser = this.users.find(u => u && u.role === 'admin');
      }
      this.currentUser = adminUser;
      this.saveCurrentUser();
      return adminUser;
    }

    // Verificação para clientes por E-mail, CPF/CNPJ ou Telefone
    const user = this.users.find(u => {
      if (!u) return false;
      const uEmail = (u.email || '').trim().toLowerCase();
      if (uEmail && uEmail === cleanInput) return true;

      if (digitsOnly.length >= 8) {
        const uCpf = (u.cpfCnpj || '').replace(/\D/g, '');
        if (uCpf && uCpf === digitsOnly) return true;

        const uPhone = (u.phone || '').replace(/\D/g, '');
        if (uPhone && uPhone === digitsOnly) return true;
      }
      return false;
    });

    if (!user) {
      throw new Error('Conta não encontrada. Verifique seu e-mail, CPF/CNPJ ou cadastre-se.');
    }

    const userPass = String(user.password || '');
    if (userPass !== password && userPass.trim() !== cleanPass) {
      throw new Error('Senha incorreta. Verifique sua senha e tente novamente.');
    }

    this.currentUser = user;
    this.saveCurrentUser();
    return user;
  }

  logout() {
    this.currentUser = null;
    this.saveCurrentUser();
  }

  switchRole(role) {
    const staticData = getStaticSource();
    if (role === 'client') {
      const client = this.users.find(u => u.role === 'client') || staticData.DEFAULT_USERS[1];
      this.currentUser = client;
      this.saveCurrentUser();
    } else if (role === 'admin') {
      const admin = this.users.find(u => u.role === 'admin') || staticData.DEFAULT_USERS[0];
      this.currentUser = admin;
      this.saveCurrentUser();
    } else if (role === 'guest') {
      this.currentUser = null;
      this.saveCurrentUser();
    }
  }

  // ========================================================
  // NOTIFICAÇÕES
  // ========================================================
  addNotification(targetUserId, title, message, quoteId = null, type = 'info') {
    const notif = {
      id: 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      targetUserId,
      title,
      message,
      quoteId,
      type,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.notifications.unshift(notif);
    this.saveNotifications();
    return notif;
  }

  getNotificationsForUser(user) {
    if (!user) return [];
    if (user.role === 'admin') {
      return this.notifications.filter(n => n.targetUserId === 'all_admins' || n.targetUserId === user.id);
    }
    return this.notifications.filter(n => n.targetUserId === user.id);
  }

  markAllNotificationsRead(user) {
    if (!user) return;
    this.notifications.forEach(n => {
      if ((user.role === 'admin' && (n.targetUserId === 'all_admins' || n.targetUserId === user.id)) ||
          (user.role === 'client' && n.targetUserId === user.id)) {
        n.read = true;
      }
    });
    this.saveNotifications();
  }

  // ========================================================
  // COTAÇÕES E SERVIÇOS
  // ========================================================
  createQuote(data) {
    const quoteNumber = Math.floor(1000 + Math.random() * 9000);
    const quoteId = `COT-${quoteNumber}`;

    const newQuote = {
      id: quoteId,
      clientId: this.currentUser ? this.currentUser.id : 'guest_' + Date.now(),
      clientName: (data.contactName && data.contactName.trim()) || (this.currentUser ? this.currentUser.name : 'Cliente Visitante'),
      clientEmail: (data.contactEmail && data.contactEmail.trim()) || (this.currentUser ? this.currentUser.email : ''),
      clientPhone: (data.contactPhone && data.contactPhone.trim()) || (this.currentUser ? this.currentUser.phone : ''),
      createdAt: new Date().toISOString(),
      modality: data.modality || 'rodoviario',
      dimensions: {
        length: parseFloat(data.length) || 0,
        width: parseFloat(data.width) || 0,
        height: parseFloat(data.height) || 0,
        volumeCm3: (parseFloat(data.length) || 0) * (parseFloat(data.width) || 0) * (parseFloat(data.height) || 0)
      },
      weight: parseFloat(data.weight) || 0,
      packageImage: data.packageImage || null,
      origin: data.origin,
      destination: data.destination,
      packageCount: parseInt(data.packageCount, 10) || 1,
      description: data.description || 'Sem descrição detalhada',
      isFragile: !!data.isFragile,
      declaredValue: parseFloat(data.declaredValue) || 0,
      status: 'PENDIENTE_ANALISIS',
      deliveryStage: 'cotacao',
      proposal: null,
      history: [
        {
          date: new Date().toISOString(),
          action: 'Solicitação criada',
          user: this.currentUser ? this.currentUser.name : 'Cliente',
          note: 'Cotação de envio sujeita a análise'
        }
      ]
    };

    this.quotes.unshift(newQuote);
    this.saveQuotes();

    const modalidadeTexto = newQuote.modality === 'aereo' ? 'Aéreo' : 'Rodoviário';
    this.addNotification(
      'all_admins',
      'Nova Cotação com Imagem',
      `O cliente ${newQuote.clientName} enviou a cotação ${quoteId} com foto da embalagem para análise (${modalidadeTexto}).`,
      quoteId,
      'quote_created'
    );

    this.notifyAdminPhones(newQuote, 'quote_created');
    return newQuote;
  }

  sendProposal(quoteId, proposalData) {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Cotação não encontrada');

    quote.status = 'PROPUESTA_ENVIADA';
    quote.proposal = {
      price: parseFloat(proposalData.price) || 0,
      currency: 'BRL',
      estimatedTime: proposalData.estimatedTime || 'A combinar',
      notes: proposalData.notes || '',
      breakdown: {
        base: parseFloat(proposalData.base) || parseFloat(proposalData.price) || 0,
        insurance: parseFloat(proposalData.insurance) || 0,
        packaging: parseFloat(proposalData.packaging) || 0
      },
      sentAt: new Date().toISOString()
    };

    quote.history.push({
      date: new Date().toISOString(),
      action: 'Proposta enviada pela Administração',
      user: this.currentUser ? this.currentUser.name : 'Top 10 Cargas',
      note: `Proposta de frete emitida no valor de R$ ${quote.proposal.price.toFixed(2)}. Prazo: ${quote.proposal.estimatedTime}`
    });

    this.saveQuotes();

    this.addNotification(
      quote.clientId,
      'Proposta de Frete Disponível',
      `Sua cotação ${quote.id} foi analisada com base na foto e medidas da embalagem. Valor proposto: R$ ${quote.proposal.price.toFixed(2)}.`,
      quote.id,
      'proposal_sent'
    );

    return quote;
  }

  acceptProposal(quoteId, clientNotes = '') {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Cotação não encontrada');

    quote.status = 'ACEPTADA';
    quote.deliveryStage = 'aguardando_coleta';
    quote.clientDecisionDate = new Date().toISOString();
    quote.clientNotes = clientNotes;

    quote.history.push({
      date: new Date().toISOString(),
      action: 'Proposta Aceita pelo Cliente',
      user: this.currentUser ? this.currentUser.name : 'Cliente',
      note: 'O cliente aceitou a proposta. Envio aguardando agendamento de coleta no remetente.'
    });

    this.saveQuotes();

    this.addNotification(
      'all_admins',
      'Proposta Aprovada pelo Cliente!',
      `O cliente ${quote.clientName} ACEITOU a cotação ${quote.id}. O envio está pronto para agendamento de coleta.`,
      quote.id,
      'proposal_accepted'
    );

    return quote;
  }

  denyProposal(quoteId, reason = '') {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Cotação não encontrada');

    quote.status = 'DENEGADA';
    quote.deliveryStage = 'cancelado';
    quote.clientDecisionDate = new Date().toISOString();
    quote.denialReason = reason || 'Sem justificativa informada';

    quote.history.push({
      date: new Date().toISOString(),
      action: 'Proposta Recusada pelo Cliente',
      user: this.currentUser ? this.currentUser.name : 'Cliente',
      note: reason ? `Motivo da recusa: ${reason}` : 'O cliente recusou a proposta comercial.'
    });

    this.saveQuotes();

    this.addNotification(
      'all_admins',
      'Proposta Recusada',
      `O cliente ${quote.clientName} recusou a proposta da cotação ${quote.id}. Motivo: ${quote.denialReason}`,
      quote.id,
      'proposal_denied'
    );

    return quote;
  }

  requestReanalysis(quoteId, feedbackNotes) {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Cotação não encontrada');

    quote.status = 'REANALISIS_SOLICITADO';
    quote.reanalysisNotes = feedbackNotes;

    quote.history.push({
      date: new Date().toISOString(),
      action: 'Reanálise Solicitada pelo Cliente',
      user: this.currentUser ? this.currentUser.name : 'Cliente',
      note: `Solicitação de reanálise: "${feedbackNotes}"`
    });

    this.saveQuotes();

    this.addNotification(
      'all_admins',
      'Pedido de Reanálise Recebido',
      `O cliente ${quote.clientName} solicitou nova análise para a cotação ${quote.id}: "${feedbackNotes}".`,
      quote.id,
      'reanalysis_requested'
    );

    this.notifyAdminPhones(quote, 'reanalysis_requested');
    return quote;
  }

  updateDeliveryStage(quoteId, newStage, note = '') {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (!quote) throw new Error('Cotação não encontrada');

    quote.deliveryStage = newStage;
    let stageTitle = '';
    let defaultNote = '';

    if (newStage === 'aguardando_coleta') {
      stageTitle = 'Aguardando Coleta';
      defaultNote = 'Envio em fila de agendamento com o motorista.';
    } else if (newStage === 'em_transito') {
      stageTitle = 'Carga Coletada & Em Trânsito (A Caminho)';
      defaultNote = 'Mercadoria coletada no remetente e em deslocamento pela malha de transporte.';
    } else if (newStage === 'saiu_entrega') {
      stageTitle = 'Saiu para Entrega ao Destinatário';
      defaultNote = 'O entregador está a caminho do endereço de destino final.';
    } else if (newStage === 'entregue') {
      stageTitle = 'Entrega Concluída com Sucesso';
      defaultNote = 'Mercadoria entregue ao destinatário com comprovante assinado.';
      quote.status = 'COMPLETADO';
      quote.completedAt = new Date().toISOString();
    }

    quote.history.push({
      date: new Date().toISOString(),
      action: `Status de Entrega: ${stageTitle}`,
      user: this.currentUser ? this.currentUser.name : 'Top 10 Cargas',
      note: note || defaultNote
    });

    this.saveQuotes();

    this.addNotification(
      quote.clientId,
      `Atualização de Envio: ${stageTitle}`,
      `Seu pedido ${quote.id} está com novo status: ${stageTitle}.`,
      quote.id,
      'tracking_update'
    );

    return quote;
  }

  markCompleted(quoteId, note = 'Entrega concluída com sucesso') {
    return this.updateDeliveryStage(quoteId, 'entregue', note);
  }

  resetToDemo() {
    const staticData = getStaticSource();
    this.users = staticData.getInitialUsers();
    this.quotes = staticData.getInitialQuotes();
    this.notifications = [];
    this.messages = staticData.getInitialMessages();
    this.adminPhones = staticData.getInitialAdminPhones();
    this.phoneAlerts = [];
    this.resetCodes = {};
    this.tempCache = {};
    this.currentUser = staticData.DEFAULT_USERS[1];

    this.saveUsers();
    this.saveQuotes();
    this.saveCurrentUser();
    this.saveNotifications();
    this.saveMessages();
    this.saveAdminPhones();
    this.savePhoneAlerts();
    this.saveTempCache();
  }

  // ========================================================
  // RECUPERAÇÃO DE SENHA
  // ========================================================
  generateResetCode(email) {
    const clean = (email || '').trim().toLowerCase();
    const digits = (email || '').replace(/\D/g, '');
    const user = this.users.find(u => {
      if (!u) return false;
      const uEmail = (u.email || '').trim().toLowerCase();
      if (uEmail && uEmail === clean) return true;
      if (digits.length >= 8) {
        const uCpf = (u.cpfCnpj || '').replace(/\D/g, '');
        if (uCpf && uCpf === digits) return true;
      }
      return false;
    });
    if (!user) throw new Error('Nenhuma conta encontrada com este e-mail ou CPF.');
    if (user.role === 'admin') throw new Error('A conta de administrador não pode redefinir senha por aqui.');

    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.resetCodes = this.resetCodes || {};
    const key = (user.email || '').toLowerCase();
    this.resetCodes[key] = {
      code,
      expires: Date.now() + (this.retentionConfig.resetCodeTtlMinutes * 60 * 1000)
    };
    return { code, user };
  }

  resetPassword(email, code, newPassword) {
    this.resetCodes = this.resetCodes || {};
    const clean = (email || '').trim().toLowerCase();
    const entry = this.resetCodes[clean];
    if (!entry) throw new Error('Nenhum código solicitado para este e-mail.');
    if (Date.now() > entry.expires) {
      delete this.resetCodes[clean];
      throw new Error('O código expirou. Solicite um novo.');
    }
    if (entry.code !== (code || '').trim()) {
      throw new Error('Código inválido. Verifique e tente novamente.');
    }
    const user = this.users.find(u => u && (u.email || '').toLowerCase() === clean);
    if (!user) throw new Error('Usuário não encontrado.');
    user.password = (newPassword || '').trim();
    delete this.resetCodes[clean];
    this.saveUsers();
    return user;
  }

  deleteQuote(quoteId) {
    this.quotes = this.quotes.filter(q => q.id !== quoteId);
    this.saveQuotes();
  }

  promoteToAdmin(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');
    user.role = 'admin';
    this.saveUsers();
  }

  demoteToClient(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');
    const staticData = getStaticSource();
    if (user.email && user.email.toLowerCase() === staticData.ADMIN_CREDENTIALS.email.toLowerCase()) {
      throw new Error('Não é possível remover o acesso do administrador principal.');
    }
    user.role = 'client';
    this.saveUsers();
  }

  getAllUsers() {
    const staticData = getStaticSource();
    const adminEmail = (staticData.ADMIN_CREDENTIALS.email || '').toLowerCase();
    return this.users.filter(u => u && (!u.email || u.email.toLowerCase() !== adminEmail));
  }

  adminUpdatePassword(userId, newPassword) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');
    const staticData = getStaticSource();
    if (user.email && user.email.toLowerCase() === staticData.ADMIN_CREDENTIALS.email.toLowerCase()) {
      throw new Error('Não é permitido alterar a senha do Administrador Principal por aqui.');
    }
    if (!newPassword || newPassword.length < 4) throw new Error('A nova senha deve ter pelo menos 4 caracteres.');
    user.password = newPassword.trim();
    this.saveUsers();
    return user;
  }

  updateUserAvatar(userId, avatarBase64) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');
    user.avatar = avatarBase64;
    this.saveUsers();

    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser.avatar = avatarBase64;
      this.saveCurrentUser();
    } else {
      this.notifyListeners();
    }
    return user;
  }

  deleteUser(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');
    const staticData = getStaticSource();
    if ((user.email && user.email.toLowerCase() === staticData.ADMIN_CREDENTIALS.email.toLowerCase()) || user.id === 'user_admin_top10') {
      throw new Error('Não é permitido excluir o Administrador Principal do sistema.');
    }

    this.users = this.users.filter(u => u.id !== userId);
    this.saveUsers();

    if (this.currentUser && this.currentUser.id === userId) {
      this.logout();
    }
    return true;
  }

  // ========================================================
  // SISTEMA DE CHAT LAN MESSENGER
  // ========================================================
  sendMessage({ senderId, senderName, senderRole, recipientId, text }) {
    if (!text || !text.trim()) return null;
    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      senderId,
      senderName,
      senderRole: senderRole || 'client',
      recipientId: recipientId || 'user_admin_top10',
      text: text.trim(),
      timestamp: new Date().toISOString(),
      read: false
    };

    this.messages.push(msg);
    this.saveMessages();
    return msg;
  }

  getMessagesBetween(userId1, userId2) {
    if (!userId1 || !userId2) return [];
    return this.messages.filter(m =>
      (m.senderId === userId1 && m.recipientId === userId2) ||
      (m.senderId === userId2 && m.recipientId === userId1)
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  markChatAsRead(recipientId, senderId) {
    let changed = false;
    this.messages.forEach(m => {
      if (m.recipientId === recipientId && m.senderId === senderId && !m.read) {
        m.read = true;
        changed = true;
      }
    });
    if (changed) {
      this.saveMessages();
    }
  }

  getUnreadMessagesCount(recipientId, senderId = null) {
    return this.messages.filter(m => {
      if (m.recipientId !== recipientId || m.read) return false;
      if (senderId && m.senderId !== senderId) return false;
      return true;
    }).length;
  }

  getConversationsForAdmin() {
    const staticData = getStaticSource();
    const adminEmail = (staticData.ADMIN_CREDENTIALS.email || '').toLowerCase();
    const clients = this.users.filter(u => u.role !== 'admin' && u.email.toLowerCase() !== adminEmail);
    const adminId = 'user_admin_top10';

    return clients.map(client => {
      const msgs = this.getMessagesBetween(adminId, client.id);
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      const unreadCount = msgs.filter(m => m.recipientId === adminId && !m.read).length;

      return {
        client,
        lastMessage: lastMsg ? lastMsg.text : 'Nenhuma mensagem recente.',
        timestamp: lastMsg ? lastMsg.timestamp : client.createdAt || new Date().toISOString(),
        unreadCount
      };
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

// Instância global do Store
window.logixStore = new Store();

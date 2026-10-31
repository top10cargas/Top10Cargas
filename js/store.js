/**
 * LOGIX BRASIL - Gerenciamento de Estado & Persistência Local
 * Suporte a envios em todo o território brasileiro (Rodoviário e Aéreo) em BRL (R$)
 * Autenticação restrita de Administrador: top10cargas@hotmail.com / Caxias844$
 * Upload de imagem da caixa e rastreamento contínuo de entregas
 */

const STORAGE_KEYS = {
  QUOTES: 'logixbrasil_quotes',
  USERS: 'logixbrasil_users',
  CURRENT_USER: 'logixbrasil_current_user',
  NOTIFICATIONS: 'logixbrasil_notifications',
  MESSAGES: 'top10cargas_messages'
};

// Mensagens padrão de demonstração para o LAN Messenger
const DEFAULT_MESSAGES = [
  {
    id: 'msg_1',
    senderId: 'user_admin_top10',
    senderName: 'Top 10 Cargas (Suporte)',
    senderRole: 'admin',
    recipientId: 'user_client_demo',
    text: 'Olá! Seja bem-vindo à Top10 Cargas (top10cargas.com). Em que podemos ajudar com sua cotação ou entrega hoje?',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    read: true
  },
  {
    id: 'msg_2',
    senderId: 'user_client_demo',
    senderName: 'Lucas Silveira',
    senderRole: 'client',
    recipientId: 'user_admin_top10',
    text: 'Boa tarde! Gostaria de confirmar se o frete aéreo para Manaus tem coleta direta no meu galpão.',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    read: true
  },
  {
    id: 'msg_3',
    senderId: 'user_admin_top10',
    senderName: 'Top 10 Cargas (Suporte)',
    senderRole: 'admin',
    recipientId: 'user_client_demo',
    text: 'Com certeza, Lucas! Realizamos a coleta no remetente com conferência da foto e peso da caixa.',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    read: true
  }
];

// Credenciais exclusivas do Administrador
const ADMIN_CREDENTIALS = {
  email: 'top10cargas@hotmail.com',
  password: 'Caxias844$',
  name: 'Top 10 Cargas Brasil',
  company: 'Top 10 Cargas & Logística Nacional'
};

// Usuários padrão de demonstração no Brasil
const DEFAULT_USERS = [
  {
    id: 'user_admin_top10',
    name: ADMIN_CREDENTIALS.name,
    email: ADMIN_CREDENTIALS.email,
    password: ADMIN_CREDENTIALS.password,
    phone: '+55 11 3200-4000',
    company: ADMIN_CREDENTIALS.company,
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'user_client_demo',
    name: 'Lucas Silveira',
    email: 'lucas@empresa.com.br',
    password: 'demo',
    phone: '+55 11 98765-4321',
    company: 'Silveira Distribuição & Comércio Ltda',
    role: 'client',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
  }
];

// Imagem padrão de exemplo para cargas
const SAMPLE_PACKAGE_IMAGE = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80';

// Cotações e serviços iniciais com rastreamento ativo
const DEFAULT_QUOTES = [
  {
    id: 'COT-8921',
    clientId: 'user_client_demo',
    clientName: 'Lucas Silveira',
    clientEmail: 'lucas@empresa.com.br',
    clientPhone: '+55 11 98765-4321',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    modality: 'aereo',
    dimensions: { length: 45, width: 35, height: 30, volumeCm3: 47250 },
    weight: 8.5,
    packageImage: SAMPLE_PACKAGE_IMAGE,
    origin: 'Av. Paulista, 1578, Bela Vista - São Paulo / SP - CEP 01310-200',
    destination: 'Av. Djalma Batista, 1661, Chapada - Manaus / AM - CEP 69050-010',
    packageCount: 2,
    description: 'Equipamentos eletrônicos e placas de circuito integrado',
    isFragile: true,
    declaredValue: 4200.00,
    status: 'PROPUESTA_ENVIADA',
    deliveryStage: 'cotacao', // 'cotacao', 'aguardando_coleta', 'em_transito', 'saiu_entrega', 'entregue'
    proposal: {
      price: 680.00,
      currency: 'BRL',
      estimatedTime: '24 a 48 horas (Aéreo Prioritário)',
      notes: 'Envio aéreo com conexão direta e seguro de carga eletrônica frágil incluso.',
      breakdown: { base: 580.00, insurance: 65.00, packaging: 35.00 },
      sentAt: new Date(Date.now() - 3600000).toISOString()
    },
    history: [
      { date: new Date(Date.now() - 3600000 * 2).toISOString(), action: 'Solicitação criada', user: 'Lucas Silveira', note: 'Cotação de envio sujeita a análise' },
      { date: new Date(Date.now() - 3600000).toISOString(), action: 'Proposta enviada pela Administração', user: 'Top 10 Cargas', note: 'Proposta emitida no valor de R$ 680,00 (Modal Aéreo)' }
    ]
  },
  {
    id: 'COT-6743',
    clientId: 'user_client_demo',
    clientName: 'Lucas Silveira',
    clientEmail: 'lucas@empresa.com.br',
    clientPhone: '+55 11 98765-4321',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    modality: 'rodoviario',
    dimensions: { length: 60, width: 50, height: 40, volumeCm3: 120000 },
    weight: 42.0,
    packageImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=400&q=80',
    origin: 'Rodovia Anhanguera, km 15 - Osasco / SP - CEP 06276-000',
    destination: 'Rua das Flores, 820, Batel - Curitiba / PR - CEP 80420-010',
    packageCount: 4,
    description: 'Peças industriais e mostruários automotivos',
    isFragile: false,
    declaredValue: 8500.00,
    status: 'ACEPTADA',
    deliveryStage: 'em_transito', // O CLIENTE PODE VER QUE ESTÁ A CAMINHO!
    proposal: {
      price: 490.00,
      currency: 'BRL',
      estimatedTime: '2 a 3 dias úteis (Rodoviário Expresso)',
      notes: 'Transporte rodoviário fracionado com rastreamento por satélite e entrega agendada.',
      breakdown: { base: 430.00, insurance: 60.00, packaging: 0.00 },
      sentAt: new Date(Date.now() - 3600000 * 24 * 2.5).toISOString()
    },
    clientDecisionDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    history: [
      { date: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), action: 'Solicitação criada', user: 'Lucas Silveira', note: 'Cotação de envio sujeita a análise' },
      { date: new Date(Date.now() - 3600000 * 24 * 2.5).toISOString(), action: 'Proposta enviada', user: 'Top 10 Cargas', note: 'Proposta emitida no valor de R$ 490,00' },
      { date: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), action: 'Proposta aceita pelo cliente', user: 'Lucas Silveira', note: 'Serviço confirmado para coleta.' },
      { date: new Date(Date.now() - 3600000 * 24 * 1.5).toISOString(), action: 'Coleta efetuada no remetente', user: 'Top 10 Cargas', note: 'Volumes conferidos e estipulados no veículo.' },
      { date: new Date(Date.now() - 3600000 * 12).toISOString(), action: 'Carga em trânsito', user: 'Top 10 Cargas', note: 'Veículo em rota pela Rodovia Régis Bittencourt (BR-116).' }
    ]
  },
  {
    id: 'COT-4310',
    clientId: 'user_client_demo',
    clientName: 'Lucas Silveira',
    clientEmail: 'lucas@empresa.com.br',
    clientPhone: '+55 11 98765-4321',
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    modality: 'rodoviario',
    dimensions: { length: 30, width: 25, height: 15, volumeCm3: 11250 },
    weight: 4.0,
    packageImage: SAMPLE_PACKAGE_IMAGE,
    origin: 'Av. Brigadeiro Faria Lima, 2200 - São Paulo / SP',
    destination: 'Av. Rio Branco, 115, Centro - Rio de Janeiro / RJ',
    packageCount: 1,
    description: 'Documentos e contratos corporativos originais',
    isFragile: false,
    declaredValue: 300.00,
    status: 'COMPLETADO',
    deliveryStage: 'entregue',
    proposal: {
      price: 135.00,
      currency: 'BRL',
      estimatedTime: '24 horas (Ponte Express SP-RJ)',
      notes: 'Entrega porta a porta com confirmação e assinatura digital.',
      breakdown: { base: 120.00, insurance: 15.00, packaging: 0.00 },
      sentAt: new Date(Date.now() - 3600000 * 24 * 6.8).toISOString()
    },
    clientDecisionDate: new Date(Date.now() - 3600000 * 24 * 6.5).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    history: [
      { date: new Date(Date.now() - 3600000 * 24 * 7).toISOString(), action: 'Solicitação criada', user: 'Lucas Silveira', note: 'Cotação de envio sujeita a análise' },
      { date: new Date(Date.now() - 3600000 * 24 * 6.8).toISOString(), action: 'Proposta enviada', user: 'Top 10 Cargas', note: 'Valor de R$ 135,00' },
      { date: new Date(Date.now() - 3600000 * 24 * 6.5).toISOString(), action: 'Proposta aceita', user: 'Lucas Silveira', note: 'Cliente aprovou proposta' },
      { date: new Date(Date.now() - 3600000 * 24 * 5).toISOString(), action: 'Entrega realizada com sucesso', user: 'Top 10 Cargas', note: 'Mercadoria entregue ao destinatário com canhoto assinado.' }
    ]
  }
];

class Store {
  constructor() {
    this.users = [];
    this.quotes = [];
    this.currentUser = null;
    this.notifications = [];
    this.listeners = [];
    this.init();
  }

  init() {
    // Carregar usuários e garantir que o admin único seja top10cargas@hotmail.com / Caxias844$
    const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (savedUsers) {
      try {
        this.users = JSON.parse(savedUsers);
      } catch (e) {
        this.users = [...DEFAULT_USERS];
      }
    } else {
      this.users = [...DEFAULT_USERS];
    }

    // Atualização rigorosa: garantir usuário admin obrigatório
    this.ensureAdminUser();
    this.saveUsers();

    // Carregar cotações
    const savedQuotes = localStorage.getItem(STORAGE_KEYS.QUOTES);
    if (savedQuotes) {
      try {
        this.quotes = JSON.parse(savedQuotes);
        // Garantir que todas as cotações possuam deliveryStage
        this.quotes.forEach(q => {
          if (!q.deliveryStage) {
            if (q.status === 'COMPLETADO') q.deliveryStage = 'entregue';
            else if (q.status === 'ACEPTADA') q.deliveryStage = 'em_transito';
            else q.deliveryStage = 'cotacao';
          }
        });
      } catch (e) {
        this.quotes = [...DEFAULT_QUOTES];
      }
    } else {
      this.quotes = [...DEFAULT_QUOTES];
      this.saveQuotes();
    }

    // Carregar usuário atual
    const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        // Se o usuário logado for admin, validar credenciais
        if (this.currentUser && this.currentUser.role === 'admin') {
          if (this.currentUser.email !== ADMIN_CREDENTIALS.email || this.currentUser.password !== ADMIN_CREDENTIALS.password) {
            this.currentUser = null;
            this.saveCurrentUser();
          }
        }
      } catch (e) {
        this.currentUser = null;
      }
    }

    // Carregar notificações
    const savedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (savedNotifs) {
      try {
        this.notifications = JSON.parse(savedNotifs);
      } catch (e) {
        this.notifications = [];
      }
    }

    // Carregar mensagens do chat (LAN Messenger)
    const savedMsgs = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (savedMsgs) {
      try {
        this.messages = JSON.parse(savedMsgs);
      } catch (e) {
        this.messages = [...DEFAULT_MESSAGES];
      }
    } else {
      this.messages = [...DEFAULT_MESSAGES];
      this.saveMessages();
    }
  }

  ensureAdminUser() {
    // Remove qualquer outro admin legado e garante apenas top10cargas@hotmail.com
    this.users = this.users.filter(u => u.role !== 'admin' || u.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase());
    const existingAdmin = this.users.find(u => u.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase());
    if (existingAdmin) {
      existingAdmin.name = ADMIN_CREDENTIALS.name;
      existingAdmin.password = ADMIN_CREDENTIALS.password;
      existingAdmin.role = 'admin';
      existingAdmin.company = ADMIN_CREDENTIALS.company;
    } else {
      this.users.unshift({
        id: 'user_admin_top10',
        name: ADMIN_CREDENTIALS.name,
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
        phone: '+55 11 3200-4000',
        company: ADMIN_CREDENTIALS.company,
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
      });
    }
  }

  saveUsers() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
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

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(fn => fn(this));
  }

  // --- AUTENTICAÇÃO E USUÁRIOS ---
  register(userData) {
    const existing = this.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existing) {
      throw new Error('Já existe uma conta cadastrada com este e-mail.');
    }

    const newUser = {
      id: 'user_' + Date.now(),
      name: userData.name,
      email: userData.email.trim(),
      password: userData.password,
      phone: userData.phone || '',
      company: userData.company || '',
      cpfCnpj: userData.cpfCnpj || '',
      role: 'client',
      avatar: userData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name)}`
    };

    this.users.push(newUser);
    this.saveUsers();
    this.currentUser = newUser;
    this.saveCurrentUser();
    return newUser;
  }

  login(email, password) {
    const trimmedEmail = email.trim().toLowerCase();
    
    // Verificação estrita para administrador
    if (trimmedEmail === ADMIN_CREDENTIALS.email.toLowerCase()) {
      if (password !== ADMIN_CREDENTIALS.password) {
        throw new Error('Senha incorreta para a conta de administrador.');
      }
      const adminUser = this.users.find(u => u.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase());
      this.currentUser = adminUser;
      this.saveCurrentUser();
      return adminUser;
    }

    // Verificação para clientes
    const user = this.users.find(u => u.email.toLowerCase() === trimmedEmail);
    if (!user || user.password !== password) {
      throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.');
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
    if (role === 'client') {
      const client = this.users.find(u => u.role === 'client') || DEFAULT_USERS[1];
      this.currentUser = client;
      this.saveCurrentUser();
    } else if (role === 'guest') {
      this.currentUser = null;
      this.saveCurrentUser();
    }
    // Nota: O papel de administrador não pode ser ativado sem autenticação!
  }

  // --- NOTIFICAÇÕES ---
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

  // --- COTAÇÕES E SERVIÇOS ---
  createQuote(data) {
    const quoteNumber = Math.floor(1000 + Math.random() * 9000);
    const quoteId = `COT-${quoteNumber}`;

    const newQuote = {
      id: quoteId,
      clientId: this.currentUser ? this.currentUser.id : 'guest_' + Date.now(),
      clientName: this.currentUser ? this.currentUser.name : (data.contactName || 'Cliente Visitante'),
      clientEmail: this.currentUser ? this.currentUser.email : (data.contactEmail || ''),
      clientPhone: this.currentUser ? this.currentUser.phone : (data.contactPhone || ''),
      createdAt: new Date().toISOString(),
      modality: data.modality || 'rodoviario',
      dimensions: {
        length: parseFloat(data.length) || 0,
        width: parseFloat(data.width) || 0,
        height: parseFloat(data.height) || 0,
        volumeCm3: (parseFloat(data.length) || 0) * (parseFloat(data.width) || 0) * (parseFloat(data.height) || 0)
      },
      weight: parseFloat(data.weight) || 0,
      packageImage: data.packageImage || null, // Imagem da caixa anexada pelo cliente
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
    quote.deliveryStage = 'aguardando_coleta'; // Inicia o rastreamento ativo
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

    return quote;
  }

  // Atualização do status de rastreamento da entrega pelo Administrador
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

    // Notificar cliente da mudança de status
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
    this.users = [...DEFAULT_USERS];
    this.quotes = [...DEFAULT_QUOTES];
    this.notifications = [];
    this.currentUser = DEFAULT_USERS[1];
    this.saveUsers();
    this.saveQuotes();
    this.saveCurrentUser();
    this.saveNotifications();
  }

  // --- RECUPERAÇÃO DE SENHA ---
  generateResetCode(email) {
    const user = this.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) throw new Error('Nenhuma conta encontrada com este e-mail.');
    if (user.role === 'admin') throw new Error('A conta de administrador não pode redefinir senha por aqui.');
    const code = String(Math.floor(100000 + Math.random() * 900000));
    this.resetCodes = this.resetCodes || {};
    this.resetCodes[email.toLowerCase()] = { code, expires: Date.now() + 10 * 60 * 1000 };
    return { code, user };
  }

  resetPassword(email, code, newPassword) {
    this.resetCodes = this.resetCodes || {};
    const entry = this.resetCodes[email.toLowerCase()];
    if (!entry) throw new Error('Nenhum código solicitado para este e-mail.');
    if (Date.now() > entry.expires) throw new Error('O código expirou. Solicite um novo.');
    if (entry.code !== code.trim()) throw new Error('Código inválido. Verifique e tente novamente.');
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('Usuário não encontrado.');
    user.password = newPassword;
    delete this.resetCodes[email.toLowerCase()];
    this.saveUsers();
    return user;
  }

  // --- EXCLUSÃO DE PEDIDOS ---
  deleteQuote(quoteId) {
    this.quotes = this.quotes.filter(q => q.id !== quoteId);
    this.saveQuotes();
  }

  // --- PROMOÇÃO / REBAIXAMENTO DE USUÁRIOS ---
  promoteToAdmin(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');
    user.role = 'admin';
    this.saveUsers();
    this.notifyListeners();
  }

  demoteToClient(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');
    if (user.email.toLowerCase() === 'top10cargas@hotmail.com') throw new Error('Não é possível remover o acesso do administrador principal.');
    user.role = 'client';
    this.saveUsers();
    this.notifyListeners();
  }

  // --- LISTAR TODOS OS USUÁRIOS ---
  getAllUsers() {
    return this.users.filter(u => u.email.toLowerCase() !== 'top10cargas@hotmail.com');
  }

  // --- ATUALIZAR SENHA POR ADMIN ---
  adminUpdatePassword(userId, newPassword) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');
    if (user.email.toLowerCase() === 'top10cargas@hotmail.com') throw new Error('Não é permitido alterar a senha do Administrador Principal por aqui.');
    if (!newPassword || newPassword.length < 4) throw new Error('A nova senha deve ter pelo menos 4 caracteres.');
    user.password = newPassword;
    this.saveUsers();
    this.notifyListeners();
    return user;
  }

  // --- ATUALIZAR FOTO DE PERFIL (BASE64) ---
  updateUserAvatar(userId, avatarBase64) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');
    user.avatar = avatarBase64;
    this.saveUsers();

    if (this.currentUser && this.currentUser.id === userId) {
      this.currentUser.avatar = avatarBase64;
      this.saveCurrentUser();
    }
    this.notifyListeners();
    return user;
  }

  // --- EXCLUSÃO DE CONTAS DE USUÁRIOS (ADMIN) ---
  deleteUser(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new Error('Usuário não encontrado.');
    if (user.email.toLowerCase() === 'top10cargas@hotmail.com' || user.id === 'user_admin_top10') {
      throw new Error('Não é permitido excluir o Administrador Principal do sistema.');
    }
    
    // Remove usuário da lista
    this.users = this.users.filter(u => u.id !== userId);
    this.saveUsers();

    // Se o usuário excluído for o logado atualmente, desconecta
    if (this.currentUser && this.currentUser.id === userId) {
      this.logout();
    }
    this.notifyListeners();
    return true;
  }

  // --- SISTEMA DE CHAT LAN MESSENGER (CLIENTE <-> ADMIN) ---
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
    const clients = this.users.filter(u => u.role !== 'admin' && u.email.toLowerCase() !== 'top10cargas@hotmail.com');
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

// Instância global
window.logixStore = new Store();

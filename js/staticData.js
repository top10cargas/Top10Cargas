/**
 * LOGIX BRASIL - DADOS ESTÁTICOS & PRÉ-CONFIGURAÇÕES (Seed / Fixtures)
 * 
 * Este arquivo isola os dados estáticos (mensagens padrão, usuários predeterminados,
 * credenciais do administrador, cotações iniciais e telefones) da lógica dinâmica de
 * persistência, paginação e ciclo de vida do estado local (store.js).
 */

const STATIC_ADMIN_CREDENTIALS = Object.freeze({
  email: 'top10cargas@hotmail.com',
  password: 'Caxias844$',
  name: 'Top 10 Cargas Brasil',
  company: 'Top 10 Cargas & Logística Nacional'
});

const STATIC_SAMPLE_PACKAGE_IMAGE = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80';

const STATIC_DEFAULT_ADMIN_PHONES = Object.freeze([
  {
    id: 'phone_admin_1',
    name: 'Top10 WhatsApp Central & Suporte',
    number: '+55 41 99655-2323',
    whatsapp: true,
    sms: true,
    active: true
  },
  {
    id: 'phone_admin_2',
    name: 'Central Operacional SP',
    number: '+55 11 3200-4000',
    whatsapp: false,
    sms: true,
    active: true
  }
]);

const STATIC_DEFAULT_USERS = Object.freeze([
  {
    id: 'user_admin_top10',
    name: STATIC_ADMIN_CREDENTIALS.name,
    email: STATIC_ADMIN_CREDENTIALS.email,
    password: STATIC_ADMIN_CREDENTIALS.password,
    phone: '+55 11 3200-4000',
    company: STATIC_ADMIN_CREDENTIALS.company,
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
]);

const STATIC_DEFAULT_MESSAGES = Object.freeze([
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
]);

const STATIC_DEFAULT_QUOTES = Object.freeze([
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
    packageImage: STATIC_SAMPLE_PACKAGE_IMAGE,
    origin: 'Av. Paulista, 1578, Bela Vista - São Paulo / SP - CEP 01310-200',
    destination: 'Av. Djalma Batista, 1661, Chapada - Manaus / AM - CEP 69050-010',
    packageCount: 2,
    description: 'Equipamentos eletrônicos e placas de circuito integrado',
    isFragile: true,
    declaredValue: 4200.00,
    status: 'PROPUESTA_ENVIADA',
    deliveryStage: 'cotacao',
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
    deliveryStage: 'em_transito',
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
    packageImage: STATIC_SAMPLE_PACKAGE_IMAGE,
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
]);

// Exportação global encapsulada
window.LOGIX_STATIC = {
  ADMIN_CREDENTIALS: STATIC_ADMIN_CREDENTIALS,
  DEFAULT_USERS: STATIC_DEFAULT_USERS,
  DEFAULT_MESSAGES: STATIC_DEFAULT_MESSAGES,
  DEFAULT_ADMIN_PHONES: STATIC_DEFAULT_ADMIN_PHONES,
  DEFAULT_QUOTES: STATIC_DEFAULT_QUOTES,
  SAMPLE_PACKAGE_IMAGE: STATIC_SAMPLE_PACKAGE_IMAGE,

  // Helper utilitário para clonar dados estáticos de forma segura sem risco de mutação
  clone(data) {
    return JSON.parse(JSON.stringify(data));
  },
  getInitialUsers() {
    return this.clone(STATIC_DEFAULT_USERS);
  },
  getInitialMessages() {
    return this.clone(STATIC_DEFAULT_MESSAGES);
  },
  getInitialQuotes() {
    return this.clone(STATIC_DEFAULT_QUOTES);
  },
  getInitialAdminPhones() {
    return this.clone(STATIC_DEFAULT_ADMIN_PHONES);
  }
};

// Compatibilidade com variáveis globais do escopo window
window.ADMIN_CREDENTIALS = STATIC_ADMIN_CREDENTIALS;
window.DEFAULT_USERS = STATIC_DEFAULT_USERS;
window.DEFAULT_MESSAGES = STATIC_DEFAULT_MESSAGES;
window.DEFAULT_ADMIN_PHONES = STATIC_DEFAULT_ADMIN_PHONES;
window.DEFAULT_QUOTES = STATIC_DEFAULT_QUOTES;
window.SAMPLE_PACKAGE_IMAGE = STATIC_SAMPLE_PACKAGE_IMAGE;

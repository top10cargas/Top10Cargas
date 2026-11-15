/**
 * TOP10 CARGAS - Servidor Node.js / Express Centralizado
 * Permite que clientes e administradores acessem usuários, cotações e mensagens de qualquer dispositivo.
 * 
 * Como executar:
 * 1. cd server
 * 2. npm install
 * 3. npm start
 * 
 * O servidor rodará na porta 3000 (ou porta definida em process.env.PORT)
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Diretório de armazenamento persistente
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const QUOTES_FILE = path.join(DATA_DIR, 'quotes.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

const ADMIN_CREDENTIALS = {
  email: 'top10cargas@hotmail.com',
  password: 'Caxias844$',
  name: 'Top 10 Cargas Brasil',
  company: 'Top 10 Cargas & Logística Nacional'
};

function readJson(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`Erro ao ler ${file}:`, err);
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Erro ao escrever ${file}:`, err);
    return false;
  }
}

// Inicializar dados padrão se necessário
if (!fs.existsSync(USERS_FILE)) {
  writeJson(USERS_FILE, [
    {
      id: 'user_admin_top10',
      name: ADMIN_CREDENTIALS.name,
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
      phone: '+55 11 3200-4000',
      company: ADMIN_CREDENTIALS.company,
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      createdAt: new Date().toISOString()
    },
    {
      id: 'user_client_demo',
      name: 'Lucas Silveira',
      email: 'lucas@empresa.com.br',
      password: 'demo',
      phone: '+55 11 98765-4321',
      company: 'Silveira Distribuição & Comércio Ltda',
      role: 'client',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      createdAt: new Date().toISOString()
    }
  ]);
}

if (!fs.existsSync(QUOTES_FILE)) {
  writeJson(QUOTES_FILE, [
    {
      id: 'COT-8921',
      clientId: 'user_client_demo',
      clientName: 'Lucas Silveira',
      clientEmail: 'lucas@empresa.com.br',
      clientPhone: '+55 11 98765-4321',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      modality: 'rodoviario',
      dimensions: { length: 45, width: 35, height: 30, volumeCm3: 47250 },
      weight: 14.5,
      packageImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80',
      origin: 'São Paulo / SP - Região Central',
      destination: 'Curitiba / PR - Distrito Industrial',
      packageCount: 2,
      description: 'Peças e insumos industriais embalados em caixa de papelão reforçada',
      isFragile: true,
      declaredValue: 1800,
      status: 'PENDIENTE_ANALISIS',
      deliveryStage: 'cotacao',
      proposal: null,
      history: [
        {
          date: new Date(Date.now() - 7200000).toISOString(),
          action: 'Solicitação criada no Servidor',
          user: 'Lucas Silveira',
          note: 'Cotação de envio sujeita a análise'
        }
      ]
    }
  ]);
}

if (!fs.existsSync(MESSAGES_FILE)) {
  writeJson(MESSAGES_FILE, [
    {
      id: 'msg_1',
      senderId: 'user_admin_top10',
      senderName: 'Top 10 Cargas (Suporte)',
      senderRole: 'admin',
      recipientId: 'user_client_demo',
      text: 'Olá! Seja bem-vindo à Top10 Cargas. Em que podemos ajudar com sua cotação ou entrega hoje?',
      timestamp: new Date(Date.now() - 14400000).toISOString(),
      read: true
    }
  ]);
}

// ----------------------------------------------------
// ROTAS DA API
// ----------------------------------------------------

// Health Check
app.get(['/api/health', '/api/health.php'], (req, res) => {
  const users = readJson(USERS_FILE);
  const quotes = readJson(QUOTES_FILE);
  res.json({
    status: 'online',
    server: 'Top10 Cargas Express Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      users_count: users.length,
      quotes_count: quotes.length
    }
  });
});

// Autenticação: Login / Register (compatível com PHP e REST)
app.post(['/api/auth.php', '/api/auth/login'], (req, res) => {
  const action = req.query.action;
  if (action === 'register') {
    return handleRegister(req, res);
  }
  handleLogin(req, res);
});

app.post('/api/auth/register', (req, res) => {
  handleRegister(req, res);
});

function handleLogin(req, res) {
  const { identifier, email, password } = req.body;
  const idInput = (identifier || email || '').trim().toLowerCase();
  const pass = (password || '').trim();

  if (!idInput || !pass) {
    return res.status(400).json({ error: 'Informe e-mail ou CPF e senha.' });
  }

  // Admin
  if (idInput === ADMIN_CREDENTIALS.email.toLowerCase()) {
    if (pass !== ADMIN_CREDENTIALS.password) {
      return res.status(401).json({ error: 'Senha incorreta para o administrador.' });
    }
    return res.json({
      success: true,
      user: {
        id: 'user_admin_top10',
        name: ADMIN_CREDENTIALS.name,
        email: ADMIN_CREDENTIALS.email,
        role: 'admin',
        company: ADMIN_CREDENTIALS.company
      }
    });
  }

  const users = readJson(USERS_FILE);
  const digitsOnly = idInput.replace(/\D/g, '');
  const user = users.find(u => {
    if (u.email && u.email.toLowerCase() === idInput) return true;
    if (digitsOnly.length >= 8) {
      const uCpf = (u.cpfCnpj || '').replace(/\D/g, '');
      const uPhone = (u.phone || '').replace(/\D/g, '');
      if (uCpf === digitsOnly || uPhone === digitsOnly) return true;
    }
    return false;
  });

  if (!user) {
    return res.status(404).json({ error: 'Conta não encontrada.' });
  }

  if (user.password !== pass) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  res.json({ success: true, user });
}

function handleRegister(req, res) {
  const { name, email, password, phone, company, cpfCnpj, avatar } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 4 caracteres.' });
  }

  const users = readJson(USERS_FILE);
  if (users.some(u => u.email && u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
  }

  const newUser = {
    id: 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: (name || cleanEmail).trim(),
    email: cleanEmail,
    password: password.trim(),
    phone: (phone || '').trim(),
    company: (company || '').trim(),
    cpfCnpj: (cpfCnpj || '').trim(),
    role: 'client',
    avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || cleanEmail)}`,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeJson(USERS_FILE, users);

  res.status(201).json({ success: true, user: newUser });
}

// Usuários: Listagem
app.get(['/api/users', '/api/users.php'], (req, res) => {
  const users = readJson(USERS_FILE);
  const adminEmail = ADMIN_CREDENTIALS.email.toLowerCase();
  const clientsOnly = users.filter(u => !u.email || u.email.toLowerCase() !== adminEmail);
  res.json({ success: true, total: clientsOnly.length, users: clientsOnly });
});

// Usuários: Criar ou sincronizar
app.post(['/api/users', '/api/users.php'], (req, res) => {
  const userData = req.body;
  const cleanEmail = (userData.email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return res.status(400).json({ error: 'E-mail obrigatório.' });
  }

  const users = readJson(USERS_FILE);
  const idx = users.findIndex(u => u.email && u.email.toLowerCase() === cleanEmail);

  if (idx >= 0) {
    if (userData.name) users[idx].name = userData.name.trim();
    if (userData.phone) users[idx].phone = userData.phone.trim();
    if (userData.company) users[idx].company = userData.company.trim();
    writeJson(USERS_FILE, users);
    return res.json({ success: true, user: users[idx], updated: true });
  }

  const newUser = {
    id: userData.id || ('user_' + Date.now() + '_' + Math.floor(Math.random() * 1000)),
    name: (userData.name || cleanEmail).trim(),
    email: cleanEmail,
    password: (userData.password || ('cli' + Math.floor(1000 + Math.random() * 9000))).trim(),
    phone: (userData.phone || '').trim(),
    company: (userData.company || '').trim(),
    cpfCnpj: (userData.cpfCnpj || '').trim(),
    role: userData.role || 'client',
    avatar: userData.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userData.name || cleanEmail)}`,
    createdAt: userData.createdAt || new Date().toISOString()
  };

  users.push(newUser);
  writeJson(USERS_FILE, users);
  res.status(201).json({ success: true, user: newUser, created: true });
});

// Usuários: Atualizar (senha, role, etc)
app.put(['/api/users/:id', '/api/users.php'], (req, res) => {
  const id = req.params.id || req.query.id || req.body.id;
  const updates = req.body;
  const users = readJson(USERS_FILE);
  const idx = users.findIndex(u => u.id === id);

  if (idx < 0) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  if (updates.password) users[idx].password = updates.password.trim();
  if (updates.role) users[idx].role = updates.role;
  if (updates.name) users[idx].name = updates.name.trim();
  if (updates.phone) users[idx].phone = updates.phone.trim();

  writeJson(USERS_FILE, users);
  res.json({ success: true, user: users[idx] });
});

// Usuários: Excluir
app.delete(['/api/users/:id', '/api/users.php'], (req, res) => {
  const id = req.params.id || req.query.id;
  let users = readJson(USERS_FILE);
  const before = users.length;
  users = users.filter(u => u.id !== id);

  if (users.length === before) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  writeJson(USERS_FILE, users);
  res.json({ success: true, message: 'Usuário excluído.' });
});

// Cotações: Listar
app.get(['/api/quotes', '/api/quotes.php'], (req, res) => {
  const quotes = readJson(QUOTES_FILE);
  const { clientId, status, id } = req.query;

  if (id) {
    const q = quotes.find(x => x.id === id);
    if (!q) return res.status(404).json({ error: 'Cotação não encontrada.' });
    return res.json({ success: true, quote: q });
  }

  let filtered = quotes;
  if (clientId) {
    filtered = filtered.filter(q => q.clientId === clientId);
  }
  if (status && status !== 'ALL') {
    filtered = filtered.filter(q => q.status === status);
  }

  res.json({ success: true, total: filtered.length, quotes: filtered });
});

// Cotações: Criar
app.post(['/api/quotes', '/api/quotes.php'], (req, res) => {
  const data = req.body;
  const quotes = readJson(QUOTES_FILE);
  const users = readJson(USERS_FILE);

  const cleanEmail = (data.clientEmail || data.contactEmail || '').trim().toLowerCase();
  const cleanName = (data.clientName || data.contactName || '').trim();
  const cleanPhone = (data.clientPhone || data.contactPhone || '').trim();

  let clientId = data.clientId;
  if (cleanEmail) {
    let u = users.find(x => x.email && x.email.toLowerCase() === cleanEmail);
    if (!u) {
      u = {
        id: 'user_cli_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        name: cleanName || cleanEmail,
        email: cleanEmail,
        password: 'cli' + Math.floor(1000 + Math.random() * 9000),
        phone: cleanPhone,
        company: '',
        cpfCnpj: '',
        role: 'client',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName || cleanEmail)}`,
        createdAt: new Date().toISOString()
      };
      users.push(u);
      writeJson(USERS_FILE, users);
      clientId = u.id;
    } else {
      clientId = u.id;
      if (!u.phone && cleanPhone) {
        u.phone = cleanPhone;
        writeJson(USERS_FILE, users);
      }
    }
  }

  const quoteId = data.id || ('COT-' + Math.floor(1000 + Math.random() * 9000));
  const newQuote = {
    id: quoteId,
    clientId: clientId || ('guest_' + Date.now()),
    clientName: cleanName || 'Cliente',
    clientEmail: cleanEmail,
    clientPhone: cleanPhone,
    createdAt: data.createdAt || new Date().toISOString(),
    modality: data.modality || 'rodoviario',
    dimensions: data.dimensions || {
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
    status: data.status || 'PENDIENTE_ANALISIS',
    deliveryStage: data.deliveryStage || 'cotacao',
    proposal: data.proposal || null,
    history: data.history || [
      {
        date: new Date().toISOString(),
        action: 'Solicitação criada no Servidor',
        user: cleanName || 'Cliente',
        note: 'Cotação de envio sujeita a análise'
      }
    ]
  };

  const existingIdx = quotes.findIndex(q => q.id === quoteId);
  if (existingIdx >= 0) {
    quotes[existingIdx] = newQuote;
  } else {
    quotes.unshift(newQuote);
  }

  writeJson(QUOTES_FILE, quotes);
  res.status(201).json({ success: true, quote: newQuote });
});

// Cotações: Atualizar (proposta, status, entrega)
app.put(['/api/quotes/:id', '/api/quotes.php'], (req, res) => {
  const id = req.params.id || req.query.id || req.body.id;
  const updates = req.body;
  const quotes = readJson(QUOTES_FILE);
  const idx = quotes.findIndex(q => q.id === id);

  if (idx < 0) {
    return res.status(404).json({ error: 'Cotação não encontrada.' });
  }

  Object.assign(quotes[idx], updates);
  writeJson(QUOTES_FILE, quotes);
  res.json({ success: true, quote: quotes[idx] });
});

// Cotações: Excluir
app.delete(['/api/quotes/:id', '/api/quotes.php'], (req, res) => {
  const id = req.params.id || req.query.id;
  let quotes = readJson(QUOTES_FILE);
  const before = quotes.length;
  quotes = quotes.filter(q => q.id !== id);

  if (quotes.length === before) {
    return res.status(404).json({ error: 'Cotação não encontrada.' });
  }

  writeJson(QUOTES_FILE, quotes);
  res.json({ success: true, message: 'Cotação excluída.' });
});

// Mensagens: Listar
app.get(['/api/messages', '/api/messages.php'], (req, res) => {
  const messages = readJson(MESSAGES_FILE);
  const { user1, user2 } = req.query;

  if (user1 && user2) {
    const filtered = messages.filter(m =>
      (m.senderId === user1 && m.recipientId === user2) ||
      (m.senderId === user2 && m.recipientId === user1)
    );
    return res.json({ success: true, messages: filtered });
  }

  res.json({ success: true, messages });
});

// Mensagens: Enviar
app.post(['/api/messages', '/api/messages.php'], (req, res) => {
  const { senderId, senderName, senderRole, recipientId, text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Texto da mensagem obrigatório.' });
  }

  const messages = readJson(MESSAGES_FILE);
  const newMsg = {
    id: 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    senderId: senderId || 'user_admin_top10',
    senderName: senderName || 'Top 10 Cargas',
    senderRole: senderRole || 'admin',
    recipientId: recipientId || 'user_admin_top10',
    text: text.trim(),
    timestamp: new Date().toISOString(),
    read: false
  };

  messages.push(newMsg);
  writeJson(MESSAGES_FILE, messages);
  res.status(201).json({ success: true, message: newMsg });
});

// Servir os arquivos estáticos do site completo (para que o servidor rode o frontend e a API juntos)
const FRONTEND_DIR = path.resolve(__dirname, '..');
if (fs.existsSync(path.join(FRONTEND_DIR, 'index.html'))) {
  app.use(express.static(FRONTEND_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });
}

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  const localIps = [];
  Object.values(networkInterfaces).forEach(ifaceList => {
    if (ifaceList) {
      ifaceList.forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIps.push(iface.address);
        }
      });
    }
  });

  console.log(`================================================================`);
  console.log(`🚀 TOP10 CARGAS - Servidor Backend & Frontend Online!`);
  console.log(`📡 Porta: ${PORT}`);
  console.log(`💻 Acesso local no computador:     http://localhost:${PORT}`);
  localIps.forEach(ip => {
    console.log(`📱 Acesso no celular (mesma rede): http://${ip}:${PORT}`);
    console.log(`🌐 URL da API para o celular:      http://${ip}:${PORT}/api`);
  });
  console.log(`💾 Banco de dados persistente:     ${DATA_DIR}`);
  console.log(`================================================================`);
});

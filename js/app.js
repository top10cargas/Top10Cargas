/**
 * LOGIX BRASIL - Aplicación Web Principal
 * Controlador de interface, cotações com análise técnica (Aéreo e Rodoviário) em BRL (R$)
 * Autenticação estrita do Administrador: top10cargas@hotmail.com / Caxias844$
 * Upload de imagem da caixa e rastreamento contínuo de entregas em tempo real
 */

class App {
  constructor() {
    this.currentView = 'landing';
    this.currentClientTab = 'proposals';
    this.currentAdminTab = 'pending';
    this.currentQuoteForAction = null;
    this.currentUploadedImage = null;
    this.currentRegisterAvatar = null;
    this.currentChatRecipientId = null;

    // Configurações de paginação e carga diferida (lazy-loading)
    this.adminHistoryPage = 1;
    this.adminHistoryPageSize = 10;
    this.adminPhonesAlertsPage = 1;
    this.adminPhonesAlertsPageSize = 10;
    this.clientChatLimit = 15;
    this.adminChatLimit = 15;

    this.init();
  }

  init() {
    window.logixStore.subscribe(() => {
      this.render();
    });

    document.addEventListener('DOMContentLoaded', () => {
      this.setupEventListeners();
      this.render();
      lucide.createIcons();

      // Solicitar permissão para notificações push de desktop em segundo plano
      document.addEventListener('click', () => {
        this.requestNotificationPermission();
      }, { once: true });

      // Escuta em tempo real quando qualquer aba ou cliente submeter uma nova cotação
      window.addEventListener('storage', (event) => {
        if (event.key === 'logixbrasil_quotes' && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            if (Array.isArray(parsed) && parsed.length > window.logixStore.quotes.length) {
              const newest = parsed[0];
              if (window.logixStore.currentUser?.role === 'admin') {
                this.playNotificationChime();
                this.triggerDesktopNotification(
                  `📦 Nova Cotação Recebida (${newest?.id || ''})`,
                  `${newest?.clientName || 'Cliente'} enviou cotação de frete. Destino: ${newest?.destination || ''}.`
                );
                this.showToast(`📦 Nova cotação ${newest?.id || ''} recebida! Notificação despachada aos telefones dos administradores.`, 'success');
              }
            }
          } catch (e) { /* ignorar */ }
        }
      });

      // Auto-atualização do painel admin a cada 30 segundos
      // (sincroniza cotações e usuários quando outras abas ou clientes enviam dados)
      setInterval(() => {
        if (this.currentView === 'admin_dashboard' && window.logixStore.currentUser?.role === 'admin') {
          const savedQuotes = localStorage.getItem('logixbrasil_quotes');
          const savedUsers = localStorage.getItem('logixbrasil_users');
          const savedNotifs = localStorage.getItem('logixbrasil_notifications');
          const savedMsgs = localStorage.getItem('top10cargas_messages');

          let changed = false;
          if (savedQuotes) {
            try {
              const parsed = JSON.parse(savedQuotes);
              if (JSON.stringify(parsed) !== JSON.stringify(window.logixStore.quotes)) {
                const hadFewer = parsed.length > window.logixStore.quotes.length;
                window.logixStore.quotes = parsed;
                changed = true;
                if (hadFewer) {
                  this.playNotificationChime();
                  this.triggerDesktopNotification(
                    '📦 Nova Cotação Recebida!',
                    'Um novo frete foi solicitado e o alerta telefônico foi registrado.'
                  );
                  this.showToast('📦 Nova solicitação de frete recebida! Notificação despachada aos administradores.', 'success');
                }
              }
            } catch (e) { /* ignorar */ }
          }
          if (savedUsers) {
            try {
              const parsed = JSON.parse(savedUsers);
              if (JSON.stringify(parsed) !== JSON.stringify(window.logixStore.users)) {
                window.logixStore.users = parsed;
                changed = true;
              }
            } catch (e) { /* ignorar */ }
          }
          if (savedNotifs) {
            try {
              const parsed = JSON.parse(savedNotifs);
              if (JSON.stringify(parsed) !== JSON.stringify(window.logixStore.notifications)) {
                window.logixStore.notifications = parsed;
                changed = true;
              }
            } catch (e) { /* ignorar */ }
          }
          if (savedMsgs) {
            try {
              const parsed = JSON.parse(savedMsgs);
              if (JSON.stringify(parsed) !== JSON.stringify(window.logixStore.messages)) {
                window.logixStore.messages = parsed;
                changed = true;
              }
            } catch (e) { /* ignorar */ }
          }
          if (changed) {
            this.renderAdminDashboard();
          }
        }
      }, 30000);
    });

    // Inicia a visualização respeitando a sessão ativa do usuário (sem forçar logout)
    this.navigateTo('landing');
  }

  setupEventListeners() {
    // Alternância de Perfil
    document.getElementById('btn-role-visitor')?.addEventListener('click', () => {
      window.logixStore.switchRole('guest');
      this.navigateTo('landing');
      this.showToast('Modo Visitante ativado (Landing pública)', 'info');
    });

    document.getElementById('btn-role-client')?.addEventListener('click', () => {
      window.logixStore.switchRole('client');
      this.navigateTo('client_dashboard');
      this.showToast('Modo Cliente ativado (Lucas Silveira)', 'success');
    });

    document.getElementById('btn-reset-demo')?.addEventListener('click', () => {
      if (confirm('Deseja restaurar todos os dados e cotações de demonstração?')) {
        window.logixStore.resetToDemo();
        this.navigateTo('client_dashboard');
        this.showToast('Dados de teste restaurados com sucesso!', 'info');
      }
    });

    // Dropdown Notificações
    const notifBtn = document.getElementById('btn-notifications-toggle');
    const notifDropdown = document.getElementById('notifications-dropdown');
    notifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!notifDropdown?.contains(e.target) && e.target !== notifBtn) {
        notifDropdown?.classList.add('hidden');
      }
    });

    document.getElementById('btn-mark-all-read')?.addEventListener('click', () => {
      window.logixStore.markAllNotificationsRead(window.logixStore.currentUser);
      this.showToast('Notificações marcadas como lidas', 'info');
    });
  }

  // --- CONTROLE DE ACESSO ADMINISTRATIVO RESTRITO ---
  requestAdminAccess() {
    const user = window.logixStore.currentUser;
    // Se já estiver logado como o admin autorizado, abre o painel direto
    if (user && user.role === 'admin' && user.email.toLowerCase() === 'top10cargas@hotmail.com') {
      this.navigateTo('admin_dashboard');
      return;
    }

    // Caso contrário, exige autenticação obrigatória
    document.getElementById('admin-auth-email').value = '';
    document.getElementById('admin-auth-password').value = '';
    document.getElementById('admin-auth-error-message').classList.add('hidden');
    document.getElementById('modal-admin-auth').classList.remove('hidden');
    lucide.createIcons();
  }

  closeAdminAuthModal() {
    document.getElementById('modal-admin-auth').classList.add('hidden');
  }

  handleAdminLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('admin-auth-email').value.trim();
    const pass = document.getElementById('admin-auth-password').value;

    try {
      const admin = window.logixStore.login(email, pass);
      if (admin.role !== 'admin') {
        throw new Error('Esta conta não possui permissões administrativas.');
      }
      this.closeAdminAuthModal();
      this.navigateTo('admin_dashboard');
      this.requestNotificationPermission();
      this.showToast(`Acesso autorizado! Bem-vindo à gestão Top 10 Cargas.`, 'success');
    } catch (err) {
      document.getElementById('admin-auth-error-text').textContent = err.message || 'Credenciais inválidas. Acesso exclusivo para top10cargas@hotmail.com.';
      document.getElementById('admin-auth-error-message').classList.remove('hidden');
    }
  }

  // --- NAVEGAÇÃO ENTRE TELAS ---
  navigateTo(viewName) {
    this.currentView = viewName;

    document.getElementById('view-landing').classList.add('hidden');
    document.getElementById('view-client-dashboard').classList.add('hidden');
    document.getElementById('view-admin-dashboard').classList.add('hidden');

    if (viewName === 'landing') {
      document.getElementById('view-landing').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'client_dashboard') {
      if (!window.logixStore.currentUser) {
        window.logixStore.switchRole('client');
      }
      document.getElementById('view-client-dashboard').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'admin_dashboard') {
      // Bloqueio de segurança
      const user = window.logixStore.currentUser;
      if (!user || user.role !== 'admin' || user.email.toLowerCase() !== 'top10cargas@hotmail.com') {
        this.requestAdminAccess();
        return;
      }
      document.getElementById('view-admin-dashboard').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    this.render();
  }

  // --- RENDERIZAÇÃO GERAL ---
  render() {
    this.renderNavbar();
    this.renderNotifications();
    this.updateChatUnreadBadges();

    if (this.currentView === 'client_dashboard') {
      this.renderClientDashboard();
    } else if (this.currentView === 'admin_dashboard') {
      this.renderAdminDashboard();
    }

    lucide.createIcons();
  }

  renderNavbar() {
    const user = window.logixStore.currentUser;
    const badge = document.getElementById('current-role-badge');
    const guestNav = document.getElementById('nav-auth-guest');
    const clientNav = document.getElementById('nav-auth-client');
    const adminNav = document.getElementById('nav-auth-admin');
    const clientNameNav = document.getElementById('nav-client-name');
    const clientNavAvatar = document.getElementById('nav-client-avatar');

    if (!user) {
      if (badge) {
        badge.textContent = 'Visitante Público';
        badge.className = 'bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700';
      }
      guestNav?.classList.remove('hidden');
      clientNav?.classList.add('hidden');
      adminNav?.classList.add('hidden');
    } else if (user.role === 'admin') {
      if (badge) {
        badge.textContent = `Administrador (${user.name})`;
        badge.className = 'bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800';
      }
      guestNav?.classList.add('hidden');
      clientNav?.classList.add('hidden');
      adminNav?.classList.remove('hidden');

      const pendingQuotes = window.logixStore.quotes.filter(q => q.status === 'PENDIENTE_ANALISIS' || q.status === 'REANALISIS_SOLICITADO');
      const navPendingBadge = document.getElementById('nav-admin-pending-badge');
      if (navPendingBadge) {
        if (pendingQuotes.length > 0) {
          navPendingBadge.textContent = pendingQuotes.length;
          navPendingBadge.classList.remove('hidden');
        } else {
          navPendingBadge.classList.add('hidden');
        }
      }
    } else {
      if (badge) {
        badge.textContent = `Cliente (${user.name})`;
        badge.className = 'bg-wine-950 text-yellowbrand-300 px-2 py-0.5 rounded border border-wine-800 font-semibold';
      }
      guestNav?.classList.add('hidden');
      clientNav?.classList.remove('hidden');
      adminNav?.classList.add('hidden');
      if (clientNameNav) clientNameNav.textContent = user.name;

      // Renderizar avatar do cliente no header
      if (clientNavAvatar) {
        if (user.avatar) {
          clientNavAvatar.src = user.avatar;
          clientNavAvatar.classList.remove('hidden');
        } else {
          clientNavAvatar.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`;
          clientNavAvatar.classList.remove('hidden');
        }
      }
    }
  }

  renderNotifications() {
    const user = window.logixStore.currentUser;
    const notifs = window.logixStore.getNotificationsForUser(user);
    const badgeCount = document.getElementById('notif-badge-count');
    const listContainer = document.getElementById('notifications-list');

    const unreadCount = notifs.filter(n => !n.read).length;

    if (unreadCount > 0) {
      badgeCount.textContent = unreadCount;
      badgeCount.classList.remove('hidden');
    } else {
      badgeCount.classList.add('hidden');
    }

    if (!listContainer) return;

    if (notifs.length === 0) {
      listContainer.innerHTML = `
        <div class="p-6 text-center text-slate-400">
          <i data-lucide="bell-off" class="w-6 h-6 mx-auto mb-2 opacity-50"></i>
          <p>Nenhuma notificação no momento.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = notifs.map(n => `
      <div class="p-3 hover:bg-slate-50 transition flex items-start gap-2.5 ${n.read ? 'opacity-70' : 'bg-wine-50/50 font-medium'}">
        <div class="mt-0.5 w-2 h-2 rounded-full ${n.read ? 'bg-slate-300' : 'bg-wine-800'} flex-shrink-0"></div>
        <div class="flex-grow">
          <p class="text-xs font-bold text-slate-900">${this.escapeHtml(n.title)}</p>
          <p class="text-[11px] text-slate-600 mt-0.5 leading-snug">${this.escapeHtml(n.message)}</p>
          <span class="text-[9px] text-slate-400 mt-1 block">${this.formatDate(n.createdAt)}</span>
        </div>
        ${n.quoteId ? `
          <button onclick="app.viewQuoteDetails('${n.quoteId}')" class="text-xs text-wine-800 font-bold hover:underline flex-shrink-0">
            Ver
          </button>
        ` : ''}
      </div>
    `).join('');
  }

  // --- RENDERIZAÇÃO DO PAINEL DO CLIENTE (Com Rastreamento) ---
  renderClientDashboard() {
    const user = window.logixStore.currentUser;
    if (!user) return;

    document.getElementById('client-profile-name').textContent = user.name;
    document.getElementById('client-profile-email').textContent = user.email;
    document.getElementById('client-profile-phone').textContent = user.phone || 'Sem telefone informado';

    // Foto de perfil do cliente (Base64)
    const avatarImg = document.getElementById('profile-avatar-img');
    const avatarIcon = document.getElementById('profile-avatar-icon');
    if (avatarImg && avatarIcon) {
      if (user.avatar) {
        avatarImg.src = user.avatar;
        avatarImg.classList.remove('hidden');
        avatarIcon.classList.add('hidden');
      } else {
        avatarImg.classList.add('hidden');
        avatarIcon.classList.remove('hidden');
      }
    }

    if (this.currentClientTab === 'chat') {
      this.renderClientChat();
    }

    const myQuotes = window.logixStore.quotes.filter(q => q.clientId === user.id);
    
    // Cotações ativas ou em andamento de entrega (inclui ACEPTADA para que o cliente acompanhe a entrega!)
    const activeQuotes = myQuotes.filter(q => ['PENDIENTE_ANALISIS', 'PROPUESTA_ENVIADA', 'REANALISIS_SOLICITADO', 'ACEPTADA'].includes(q.status));
    const historyQuotes = myQuotes.filter(q => ['COMPLETADO', 'DENEGADA'].includes(q.status));

    document.getElementById('client-proposals-count').textContent = activeQuotes.length;
    document.getElementById('client-history-count').textContent = historyQuotes.length;

    const activeContainer = document.getElementById('client-active-quotes-list');
    if (activeQuotes.length === 0) {
      activeContainer.innerHTML = `
        <div class="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
          <div class="w-16 h-16 bg-wine-50 text-wine-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-wine-100">
            <i data-lucide="package" class="w-8 h-8"></i>
          </div>
          <h3 class="text-base font-bold text-slate-900">Você não tem cotações ou entregas em andamento</h3>
          <p class="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            Inicie uma nova cotação informando volumes, medidas, anexando foto da embalagem e rotas no Brasil.
          </p>
          <button onclick="app.openQuoteFormModal()" class="px-6 py-2.5 bg-wine-900 hover:bg-wine-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition inline-flex items-center gap-2">
            <i data-lucide="plus-circle" class="w-4 h-4 text-yellowbrand-400"></i>
            Solicitar Nova Cotação com Foto
          </button>
        </div>
      `;
    } else {
      activeContainer.innerHTML = activeQuotes.map(q => this.buildClientActiveQuoteCard(q)).join('');
    }

    // Histórico finalizado
    const historyTable = document.getElementById('client-history-table-body');
    if (historyQuotes.length === 0) {
      historyTable.innerHTML = `
        <tr>
          <td colspan="8" class="p-8 text-center text-slate-400">
            Nenhum serviço arquivado no histórico finalizado.
          </td>
        </tr>
      `;
    } else {
      historyTable.innerHTML = historyQuotes.map(q => `
        <tr class="hover:bg-slate-50 transition">
          <td class="p-3.5 font-mono font-bold text-slate-900">
            ${q.id}
            <span class="block font-sans text-[10px] text-slate-400 font-normal">${this.formatDate(q.createdAt)}</span>
          </td>
          <td class="p-3.5">
            ${q.packageImage ? `<img src="${q.packageImage}" alt="Carga" class="w-9 h-9 object-cover rounded border border-slate-200 shadow-xs cursor-pointer" onclick="window.open('${q.packageImage}', '_blank')">` : '<span class="text-[10px] text-slate-400">Sem foto</span>'}
          </td>
          <td class="p-3.5">
            ${this.buildModalityBadge(q.modality)}
          </td>
          <td class="p-3.5">
            <span class="font-medium text-slate-800">${this.escapeHtml(q.origin)}</span>
            <span class="text-slate-400 mx-1">➔</span>
            <span class="font-medium text-slate-800">${this.escapeHtml(q.destination)}</span>
          </td>
          <td class="p-3.5">
            <span class="font-bold text-slate-800">${q.packageCount} volume(s)</span> • ${q.weight} kg
          </td>
          <td class="p-3.5 font-bold text-slate-900">
            ${q.proposal ? this.formatCurrencyBRL(q.proposal.price) : 'N/A'}
          </td>
          <td class="p-3.5">
            ${this.buildStatusBadge(q.status, q.deliveryStage)}
          </td>
          <td class="p-3.5 text-right">
            <button onclick="app.viewQuoteDetails('${q.id}')" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition">
              Comprovante
            </button>
          </td>
        </tr>
      `).join('');
    }
  }

  buildClientActiveQuoteCard(quote) {
    const isProposalReady = quote.status === 'PROPUESTA_ENVIADA';
    const isPending = quote.status === 'PENDIENTE_ANALISIS';
    const isReanalysis = quote.status === 'REANALISIS_SOLICITADO';
    const isAccepted = quote.status === 'ACEPTADA';

    return `
      <div class="bg-white rounded-2xl border ${isAccepted ? 'border-emerald-300 ring-2 ring-emerald-500/15' : isProposalReady ? 'border-wine-300 ring-2 ring-wine-800/15' : 'border-slate-200'} shadow-sm overflow-hidden animate-fade-in">
        
        <!-- Cabeçalho do Card -->
        <div class="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl ${isAccepted ? 'bg-emerald-100 text-emerald-700' : isProposalReady ? 'bg-wine-100 text-wine-900' : 'bg-slate-200 text-slate-600'}">
              <i data-lucide="${quote.modality === 'aereo' ? 'plane' : 'truck'}" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-bold text-slate-900 text-sm">Código ${quote.id}</h4>
                ${this.buildModalityBadge(quote.modality)}
                ${this.buildStatusBadge(quote.status, quote.deliveryStage)}
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">Criado em ${this.formatDate(quote.createdAt)}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="app.viewQuoteDetails('${quote.id}')" class="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition flex items-center gap-1">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i> Ver Ficha Completa
            </button>
          </div>
        </div>

        <!-- Dados da Carga com Miniatura da Foto -->
        <div class="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs border-b border-slate-100 bg-white">
          <div class="flex items-start gap-3">
            ${quote.packageImage ? `
              <img src="${quote.packageImage}" alt="Foto da Embalagem" class="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm flex-shrink-0 cursor-pointer" onclick="window.open('${quote.packageImage}', '_blank')" title="Clique para ampliar a foto da caixa">
            ` : `
              <div class="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                <i data-lucide="image" class="w-6 h-6"></i>
              </div>
            `}
            <div>
              <span class="text-slate-400 text-[10px] uppercase font-bold block">Rota de Transporte</span>
              <p class="font-semibold text-slate-800 mt-0.5">${this.escapeHtml(quote.origin)}</p>
              <p class="text-slate-400 text-[10px] my-0.5">para</p>
              <p class="font-semibold text-slate-800">${this.escapeHtml(quote.destination)}</p>
            </div>
          </div>

          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold block">Volumes & Dimensões</span>
            <p class="font-semibold text-slate-800 mt-0.5">${quote.packageCount} volume(s) / ${quote.weight} kg</p>
            <p class="text-slate-500 text-[11px] mt-0.5">Medidas: ${quote.dimensions.length} x ${quote.dimensions.width} x ${quote.dimensions.height} cm</p>
            <p class="text-slate-400 text-[10px]">Cubagem: ${(quote.dimensions.volumeCm3 / 1000).toFixed(1)} dm³</p>
          </div>

          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold block">Mercadoria</span>
            <p class="text-slate-700 mt-0.5">${this.escapeHtml(quote.description)}</p>
            ${quote.isFragile ? '<span class="inline-block mt-1 px-2 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-bold border border-red-200">Mercadoria Frágil</span>' : ''}
          </div>

          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold block">Situação do Pedido</span>
            ${isPending ? `
              <div class="mt-1 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                <i data-lucide="hourglass" class="w-3.5 h-3.5 inline mr-1 text-amber-600"></i>
                <strong>Cotação de envio sujeita a análise</strong>. Analisando foto e cubagem da caixa.
              </div>
            ` : ''}
            ${isReanalysis ? `
              <div class="mt-1 p-2.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-900 text-[11px]">
                <i data-lucide="refresh-cw" class="w-3.5 h-3.5 inline mr-1 text-orange-600"></i>
                Reanálise solicitada. A equipe Top10 Cargas está revisando seus comentários.
              </div>
            ` : ''}
            ${isProposalReady ? `
              <div class="mt-1 p-2.5 rounded-lg bg-wine-50 border border-wine-200 text-wine-900 text-[11px]">
                <i data-lucide="check-circle" class="w-3.5 h-3.5 inline mr-1 text-wine-800"></i>
                <strong>Proposta comercial disponível!</strong> Avalie e tome uma decisão abaixo.
              </div>
            ` : ''}
            ${isAccepted ? `
              <div class="mt-1 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
                <i data-lucide="truck" class="w-3.5 h-3.5 inline mr-1 text-emerald-600"></i>
                <strong>Proposta Aceita!</strong> Acompanhe abaixo o rastreamento do envio.
              </div>
            ` : ''}
          </div>
        </div>

        <!-- RASTREADOR DE ENTREGA EM TEMPO REAL (Para pedidos Aceitos) -->
        ${isAccepted ? this.buildDeliveryTrackingStepper(quote) : ''}

        <!-- SEÇÃO DA PROPOSTA EM BRL COM AS 3 AÇÕES (Para propostas aguardando resposta) -->
        ${isProposalReady ? `
          <div class="p-5 bg-gradient-to-br from-wine-50/70 to-amber-50/40 border-t border-wine-200">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              <div class="space-y-1">
                <div class="flex items-baseline gap-2">
                  <span class="text-xs font-bold uppercase tracking-wider text-wine-900">Valor da Proposta:</span>
                  <span class="text-2xl font-black text-wine-950">${this.formatCurrencyBRL(quote.proposal.price)}</span>
                  <span class="text-xs text-slate-600 font-medium">(${quote.proposal.estimatedTime})</span>
                </div>
                <p class="text-xs text-slate-600 mt-1">
                  <strong>Condições do Operador Top10:</strong> ${this.escapeHtml(quote.proposal.notes || 'Frete porta a porta conforme imagem e especificações técnicas.')}
                </p>
                <div class="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                  <span>Frete Peso: ${this.formatCurrencyBRL(quote.proposal.breakdown.base)}</span>
                  <span>•</span>
                  <span>Seguro: ${this.formatCurrencyBRL(quote.proposal.breakdown.insurance)}</span>
                  <span>•</span>
                  <span>Taxas/Coleta: ${this.formatCurrencyBRL(quote.proposal.breakdown.packaging)}</span>
                </div>
              </div>

              <!-- AS 3 AÇÕES DISPONÍVEIS -->
              <div class="flex items-center gap-2 flex-wrap">
                <button onclick="app.actionAcceptProposal('${quote.id}')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-1.5">
                  <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                  Aceitar Proposta
                </button>
                <button onclick="app.openDenyModal('${quote.id}')" class="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5">
                  <i data-lucide="x-circle" class="w-4 h-4"></i>
                  Recusar
                </button>
                <button onclick="app.openReanalysisModal('${quote.id}')" class="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5">
                  <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                  Solicitar Outra Análise
                </button>
              </div>

            </div>
          </div>
        ` : ''}

      </div>
    `;
  }

  // Stepper Visual de Rastreamento de Entrega
  buildDeliveryTrackingStepper(quote) {
    const stage = quote.deliveryStage || 'aguardando_coleta';
    
    const isStep1 = true; // Proposta Aceita
    const isStep2 = ['aguardando_coleta', 'em_transito', 'saiu_entrega', 'entregue'].includes(stage);
    const isStep3 = ['em_transito', 'saiu_entrega', 'entregue'].includes(stage);
    const isStep4 = stage === 'entregue';

    let currentStatusText = 'Aguardando agendamento de coleta no remetente.';
    let statusClass = 'text-amber-700 bg-amber-50 border-amber-200';
    let iconName = 'clock';

    if (stage === 'em_transito') {
      currentStatusText = 'Carga coletada e em deslocamento! A mercadoria está a caminho do destino.';
      statusClass = 'text-wine-900 bg-wine-50 border-wine-200 animate-pulse font-bold';
      iconName = 'truck';
    } else if (stage === 'saiu_entrega') {
      currentStatusText = 'Saiu para entrega! O veículo está em rota final para entrega ao destinatário.';
      statusClass = 'text-purple-800 bg-purple-50 border-purple-200 animate-pulse';
      iconName = 'map-pin';
    } else if (stage === 'entregue') {
      currentStatusText = 'Entrega concluída com sucesso! Pacote entregue com canhoto assinado.';
      statusClass = 'text-emerald-800 bg-emerald-50 border-emerald-200';
      iconName = 'check-circle-2';
    }

    return `
      <div class="p-5 bg-slate-50/80 border-t border-slate-200 space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i data-lucide="navigation-2" class="w-4 h-4 text-emerald-600"></i>
            <h5 class="font-bold text-xs uppercase tracking-wider text-slate-800">Acompanhamento de Entrega em Tempo Real</h5>
          </div>
          <span class="text-xs font-bold px-3 py-1 rounded-full border ${statusClass} flex items-center gap-1.5">
            <i data-lucide="${iconName}" class="w-3.5 h-3.5"></i>
            ${stage === 'em_transito' ? 'A Caminho / Em Trânsito' : stage === 'saiu_entrega' ? 'Saiu para Entrega' : stage === 'entregue' ? 'Entregue' : 'Aguardando Coleta'}
          </span>
        </div>

        <p class="text-xs text-slate-600 italic">
          "${currentStatusText}"
        </p>

        <!-- Stepper Visual -->
        <div class="relative py-2">
          <div class="absolute top-1/2 left-4 right-4 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
          <div class="absolute top-1/2 left-4 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500" style="width: ${isStep4 ? '100%' : isStep3 ? '66%' : isStep2 ? '33%' : '0%'}"></div>

          <div class="relative z-10 grid grid-cols-4 text-center">
            <!-- Passo 1 -->
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center shadow-md">
                <i data-lucide="check" class="w-4 h-4"></i>
              </div>
              <span class="text-[11px] font-bold text-slate-800 mt-1.5">1. Aprovado</span>
              <span class="text-[9px] text-slate-400">Proposta aceita</span>
            </div>

            <!-- Passo 2 -->
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full ${isStep2 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'} font-bold text-xs flex items-center justify-center shadow-md">
                <i data-lucide="package" class="w-4 h-4"></i>
              </div>
              <span class="text-[11px] font-bold ${isStep2 ? 'text-slate-800' : 'text-slate-400'} mt-1.5">2. Coleta</span>
              <span class="text-[9px] text-slate-400">No remetente</span>
            </div>

            <!-- Passo 3 -->
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full ${isStep3 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'} font-bold text-xs flex items-center justify-center shadow-md">
                <i data-lucide="truck" class="w-4 h-4"></i>
              </div>
              <span class="text-[11px] font-bold ${isStep3 ? 'text-slate-800' : 'text-slate-400'} mt-1.5">3. Em Trânsito</span>
              <span class="text-[9px] text-slate-400">A caminho</span>
            </div>

            <!-- Passo 4 -->
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full ${isStep4 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'} font-bold text-xs flex items-center justify-center shadow-md">
                <i data-lucide="award" class="w-4 h-4"></i>
              </div>
              <span class="text-[11px] font-bold ${isStep4 ? 'text-slate-800' : 'text-slate-400'} mt-1.5">4. Entregue</span>
              <span class="text-[9px] text-slate-400">Destino final</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- RENDERIZAÇÃO DO PAINEL DO ADMINISTRADOR (Top 10 Cargas) ---
  renderAdminDashboard() {
    const allQuotes = window.logixStore.quotes;

    const pendingQuotes = allQuotes.filter(q => q.status === 'PENDIENTE_ANALISIS' || q.status === 'REANALISIS_SOLICITADO');
    const sentQuotes = allQuotes.filter(q => q.status === 'PROPUESTA_ENVIADA');
    const acceptedQuotes = allQuotes.filter(q => q.status === 'ACEPTADA');
    const completedQuotes = allQuotes.filter(q => q.status === 'COMPLETADO');

    const totalRevenue = allQuotes
      .filter(q => q.status === 'ACEPTADA' || q.status === 'COMPLETADO')
      .reduce((sum, q) => sum + (q.proposal ? q.proposal.price : 0), 0);

    document.getElementById('kpi-pending-count').textContent = pendingQuotes.length;
    document.getElementById('kpi-sent-count').textContent = sentQuotes.length;
    document.getElementById('kpi-accepted-count').textContent = acceptedQuotes.length;
    document.getElementById('kpi-total-revenue').textContent = this.formatCurrencyBRL(totalRevenue);

    document.getElementById('admin-pending-badge').textContent = pendingQuotes.length;
    document.getElementById('admin-active-badge').textContent = acceptedQuotes.length;
    document.getElementById('admin-history-badge').textContent = allQuotes.length;

    const phoneAlerts = window.logixStore.getPhoneAlertsLog();
    const adminPhonesBadge = document.getElementById('admin-phones-badge');
    const adminPhonesHistoryCount = document.getElementById('admin-phones-history-count');
    if (adminPhonesBadge) adminPhonesBadge.textContent = phoneAlerts.length;
    if (adminPhonesHistoryCount) adminPhonesHistoryCount.textContent = phoneAlerts.length;

    // Aba 1: Pendentes
    const pendingContainer = document.getElementById('admin-pending-quotes-container');
    if (pendingQuotes.length === 0) {
      pendingContainer.innerHTML = `
        <div class="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <i data-lucide="check-circle" class="w-12 h-12 text-emerald-500 mx-auto mb-3"></i>
          <h4 class="font-bold text-slate-800 text-base">Fila de cotações em dia!</h4>
          <p class="text-xs text-slate-400 mt-1">Nenhuma solicitação pendente de análise no momento.</p>
        </div>
      `;
    } else {
      pendingContainer.innerHTML = pendingQuotes.map(q => this.buildAdminPendingQuoteCard(q)).join('');
    }

    // Aba 2: Gestão de Entregas e Rastreamento Ativo
    const activeContainer = document.getElementById('admin-accepted-quotes-container');
    if (acceptedQuotes.length === 0) {
      activeContainer.innerHTML = `
        <div class="bg-white p-12 text-center rounded-2xl border border-slate-200">
          <i data-lucide="truck" class="w-12 h-12 text-slate-400 mx-auto mb-3"></i>
          <h4 class="font-bold text-slate-800 text-base">Nenhuma entrega em rota no momento</h4>
          <p class="text-xs text-slate-400 mt-1">Quando os clientes aceitarem suas propostas, elas aparecerão aqui com a foto da carga para avanço de status.</p>
        </div>
      `;
    } else {
      activeContainer.innerHTML = acceptedQuotes.map(q => `
        <div class="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-fade-in">
          <div class="flex items-start gap-3">
            ${q.packageImage ? `
              <img src="${q.packageImage}" alt="Foto da Carga" class="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-sm flex-shrink-0 cursor-pointer" onclick="window.open('${q.packageImage}', '_blank')" title="Clique para ampliar foto">
            ` : `
              <div class="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                <i data-lucide="package" class="w-8 h-8"></i>
              </div>
            `}
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono font-bold text-slate-900">${q.id}</span>
                ${this.buildModalityBadge(q.modality)}
                ${this.buildStatusBadge(q.status, q.deliveryStage)}
              </div>
              <p class="text-xs font-semibold text-slate-800">
                Cliente: ${this.escapeHtml(q.clientName)} (${q.clientPhone || q.clientEmail})
              </p>
              <p class="text-xs text-slate-600">
                Trajeto: <strong>${this.escapeHtml(q.origin)}</strong> ➔ <strong>${this.escapeHtml(q.destination)}</strong>
              </p>
              <p class="text-xs text-emerald-700 font-bold">
                Valor Fechado: ${this.formatCurrencyBRL(q.proposal.price)} | ${q.packageCount} volume(s) (${q.weight} kg)
              </p>
            </div>
          </div>

          <!-- Ações do Administrador para Atualizar Rastreamento -->
          <div class="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
            <span class="text-[10px] uppercase font-bold text-slate-400 hidden sm:inline">Mudar Etapa:</span>
            
            <button onclick="app.actionUpdateDeliveryStage('${q.id}', 'em_transito')" title="Marcar como carga coletada e em trânsito" class="px-3 py-1.5 ${q.deliveryStage === 'em_transito' ? 'bg-wine-900 text-white' : 'bg-slate-100 hover:bg-wine-50 text-wine-900 border border-slate-200'} text-xs font-bold rounded-lg transition flex items-center gap-1">
              <i data-lucide="truck" class="w-3.5 h-3.5"></i> A Caminho
            </button>

            <button onclick="app.actionUpdateDeliveryStage('${q.id}', 'saiu_entrega')" title="Marcar como veículo em rota de entrega final" class="px-3 py-1.5 ${q.deliveryStage === 'saiu_entrega' ? 'bg-purple-600 text-white' : 'bg-slate-100 hover:bg-purple-50 text-purple-800 border border-slate-200'} text-xs font-bold rounded-lg transition flex items-center gap-1">
              <i data-lucide="map-pin" class="w-3.5 h-3.5"></i> Saiu p/ Entrega
            </button>

            <button onclick="app.actionUpdateDeliveryStage('${q.id}', 'entregue')" title="Confirmar que foi entregue com canhoto assinado" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1">
              <i data-lucide="check" class="w-3.5 h-3.5"></i> Entregue
            </button>

            <button onclick="app.viewQuoteDetails('${q.id}')" class="p-1.5 text-slate-500 hover:text-slate-800" title="Ver Comprovante">
              <i data-lucide="file-text" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `).join('');
    }

    // Aba 3: Histórico Geral
    this.filterAdminHistory();

    // Default dates para Relatório Financeiro (últimos 30 dias)
    const dateFrom = document.getElementById('financial-date-from');
    const dateTo = document.getElementById('financial-date-to');
    if (dateFrom && !dateFrom.value) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      dateFrom.value = d.toISOString().slice(0, 10);
    }
    if (dateTo && !dateTo.value) {
      dateTo.value = new Date().toISOString().slice(0, 10);
    }

    if (this.currentAdminTab === 'users') this.renderUsersManagement();
    if (this.currentAdminTab === 'financial') this.renderFinancialReport();
    if (this.currentAdminTab === 'chat') this.renderAdminChat();
    if (this.currentAdminTab === 'phones') this.renderAdminPhones();

    // Atualização de status da rotina de limpeza programada de dados temporários
    const cleanupInfo = window.logixStore.getLastCleanupInfo();
    const cleanupInfoEl = document.getElementById('admin-cleanup-status-info');
    if (cleanupInfoEl) {
      if (cleanupInfo && cleanupInfo.timestamp) {
        const d = new Date(cleanupInfo.timestamp);
        const timeStr = `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        cleanupInfoEl.innerHTML = `Última execução: <strong>${timeStr}</strong> (${cleanupInfo.stats?.totalRemoved || 0} itens liberados). Agendado a cada 5 min.`;
      } else {
        cleanupInfoEl.textContent = 'Rotina ativa em segundo plano com eliminação por TTL (a cada 5 min).';
      }
    }
  }

  buildAdminPendingQuoteCard(quote) {
    const isReanalysis = quote.status === 'REANALISIS_SOLICITADO';
    return `
      <div class="bg-white rounded-2xl border ${isReanalysis ? 'border-orange-300 ring-2 ring-orange-500/10' : 'border-slate-200'} shadow-sm p-6 animate-fade-in">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl ${isReanalysis ? 'bg-orange-100 text-orange-600' : 'bg-amber-100 text-amber-600'}">
              <i data-lucide="${isReanalysis ? 'refresh-cw' : 'clipboard-list'}" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-slate-900">${quote.id}</span>
                ${this.buildModalityBadge(quote.modality)}
                ${this.buildStatusBadge(quote.status, quote.deliveryStage)}
              </div>
              <p class="text-xs text-slate-500 mt-0.5">
                Cliente: <strong class="text-slate-800">${this.escapeHtml(quote.clientName)}</strong> • Tel: ${this.escapeHtml(quote.clientPhone || 'N/A')} • E-mail: ${this.escapeHtml(quote.clientEmail)}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="app.openAdminProposalModal('${quote.id}')" class="px-5 py-2.5 bg-wine-900 hover:bg-wine-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-2">
              <i data-lucide="calculator" class="w-4 h-4 text-yellowbrand-400"></i>
              ${isReanalysis ? 'Reanalisar & Enviar Nova Proposta' : 'Calcular & Enviar Proposta'}
            </button>
            <button onclick="app.actionDeleteQuote('${quote.id}')" class="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl transition" title="Excluir pedido">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        ${isReanalysis ? `
          <div class="my-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-900 flex items-start gap-2">
            <i data-lucide="message-square" class="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0"></i>
            <div>
              <strong class="font-bold">Observações do Cliente para Reanálise:</strong>
              <p class="italic mt-0.5">"${this.escapeHtml(quote.reanalysisNotes)}"</p>
            </div>
          </div>
        ` : ''}

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-4">
          <div class="flex items-start gap-3">
            ${quote.packageImage ? `
              <img src="${quote.packageImage}" alt="Foto da Carga" class="w-14 h-14 object-cover rounded-lg border border-slate-300 shadow-sm flex-shrink-0 cursor-pointer" onclick="window.open('${quote.packageImage}', '_blank')" title="Clique para ver a foto ampliada">
            ` : '<div class="w-14 h-14 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] text-center flex-shrink-0">Sem foto</div>'}
            <div>
              <span class="text-slate-400 text-[10px] uppercase font-bold block">Rota Solicitada</span>
              <p class="font-semibold text-slate-800 mt-0.5">De: ${this.escapeHtml(quote.origin)}</p>
              <p class="font-semibold text-slate-800">Para: ${this.escapeHtml(quote.destination)}</p>
            </div>
          </div>

          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold block">Dados da Carga</span>
            <p class="font-semibold text-slate-800 mt-0.5">Volumes: <strong class="text-wine-900">${quote.packageCount} volume(s)</strong></p>
            <p class="text-slate-700">Peso Real: <strong>${quote.weight} kg</strong></p>
            <p class="text-slate-700">Dimensões: ${quote.dimensions.length} x ${quote.dimensions.width} x ${quote.dimensions.height} cm</p>
          </div>

          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold block">Cubagem & Fator de Cálculo</span>
            <p class="text-slate-700 mt-0.5">Volume Total: <strong>${(quote.dimensions.volumeCm3 / 1000).toFixed(1)} dm³</strong></p>
            <p class="text-slate-700">Peso Cubado: <strong>${((quote.dimensions.length * quote.dimensions.width * quote.dimensions.height) / (quote.modality === 'aereo' ? 6000 : 5000)).toFixed(1)} kg</strong></p>
            <p class="text-slate-500 text-[10px]">Valor Declarado: ${this.formatCurrencyBRL(quote.declaredValue || 0)}</p>
          </div>

          <div>
            <span class="text-slate-400 text-[10px] uppercase font-bold block">Mercadoria & Segurança</span>
            <p class="text-slate-800 mt-0.5">${this.escapeHtml(quote.description)}</p>
            ${quote.isFragile ? '<span class="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-bold">Carga Frágil</span>' : '<span class="text-slate-400 text-[10px]">Carga Convencional</span>'}
          </div>
        </div>
      </div>
    `;
  }

  filterAdminHistory(page = null) {
    if (page !== null) {
      this.adminHistoryPage = page;
    }
    const search = (document.getElementById('admin-history-search')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('admin-history-filter-status')?.value || 'ALL';
    const tbody = document.getElementById('admin-history-table-body');
    const paginationContainer = document.getElementById('admin-history-pagination');
    if (!tbody) return;

    // Utiliza a engine de paginação do Store para fatiar o volume de cotações
    const paginated = window.logixStore.getPaginatedQuotes({
      page: this.adminHistoryPage || 1,
      pageSize: this.adminHistoryPageSize || 10,
      status: statusFilter,
      search: search,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    this.adminHistoryPage = paginated.currentPage;

    if (paginated.totalItems === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="p-8 text-center text-slate-400">
            Nenhum registro encontrado com os critérios selecionados.
          </td>
        </tr>
      `;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    tbody.innerHTML = paginated.items.map(q => `
      <tr class="hover:bg-slate-50 transition">
        <td class="p-3.5 font-mono font-bold text-slate-900">
          ${q.id}
          <span class="block font-sans text-[10px] text-slate-400 font-normal">${this.formatDate(q.createdAt)}</span>
        </td>
        <td class="p-3.5">
          ${q.packageImage ? `<img src="${q.packageImage}" alt="Carga" class="w-10 h-10 object-cover rounded border border-slate-200 cursor-pointer shadow-xs" onclick="window.open('${q.packageImage}', '_blank')">` : '<span class="text-[10px] text-slate-400">Sem foto</span>'}
        </td>
        <td class="p-3.5">
          <span class="font-bold text-slate-800 block">${this.escapeHtml(q.clientName)}</span>
          <span class="text-[10px] text-slate-400">${this.escapeHtml(q.clientPhone || q.clientEmail)}</span>
        </td>
        <td class="p-3.5">
          ${this.buildModalityBadge(q.modality)}
        </td>
        <td class="p-3.5 text-[11px]">
          <span class="text-slate-700">${this.escapeHtml(q.origin)}</span>
          <span class="text-slate-400 block">➔ ${this.escapeHtml(q.destination)}</span>
        </td>
        <td class="p-3.5 text-[11px]">
          <span class="font-bold text-slate-800">${q.packageCount} volume(s)</span> • ${q.weight} kg
          <span class="block text-[10px] text-slate-400">${q.dimensions.length}x${q.dimensions.width}x${q.dimensions.height} cm</span>
        </td>
        <td class="p-3.5">
          ${q.proposal ? `
            <span class="font-bold text-slate-900 block">${this.formatCurrencyBRL(q.proposal.price)}</span>
            <span class="text-[10px] text-slate-500">${this.escapeHtml(q.proposal.estimatedTime)}</span>
          ` : '<span class="text-slate-400 italic">Sem proposta</span>'}
        </td>
        <td class="p-3.5">
          ${this.buildStatusBadge(q.status, q.deliveryStage)}
        </td>
        <td class="p-3.5 text-right">
          <button onclick="app.viewQuoteDetails('${q.id}')" class="p-1.5 hover:bg-slate-200 text-slate-600 rounded-md transition" title="Ver Comprovante Oficial">
            <i data-lucide="file-text" class="w-4 h-4"></i>
          </button>
        </td>
        <td class="p-3.5">
          <button onclick="app.actionDeleteQuote('${q.id}')" class="p-1.5 hover:bg-red-100 text-red-600 rounded-md transition" title="Excluir pedido permanentemente">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `).join('');

    this.renderAdminHistoryPagination(paginated);
    lucide.createIcons();
  }

  setAdminHistoryPage(page) {
    this.adminHistoryPage = page;
    this.filterAdminHistory();
  }

  setAdminHistoryPageSize(size) {
    this.adminHistoryPageSize = parseInt(size, 10) || 10;
    this.adminHistoryPage = 1;
    this.filterAdminHistory();
  }

  renderAdminHistoryPagination(p) {
    const container = document.getElementById('admin-history-pagination');
    if (!container) return;

    container.innerHTML = `
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-stone-500">
          Exibindo <strong>${p.totalItems === 0 ? 0 : p.startIndex + 1}</strong> a <strong>${p.endIndex}</strong> de <strong>${p.totalItems}</strong> cotações
        </span>
        <span class="text-stone-300">|</span>
        <label class="flex items-center gap-1.5 text-xs text-stone-500">
          <span>Por página:</span>
          <select onchange="app.setAdminHistoryPageSize(this.value)" class="text-xs px-2 py-1 bg-white border border-stone-300 rounded focus:outline-none font-semibold text-stone-700">
            <option value="5" ${p.pageSize === 5 ? 'selected' : ''}>5</option>
            <option value="10" ${p.pageSize === 10 ? 'selected' : ''}>10</option>
            <option value="25" ${p.pageSize === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${p.pageSize === 50 ? 'selected' : ''}>50</option>
          </select>
        </label>
      </div>

      <div class="flex items-center gap-1.5">
        <button onclick="app.setAdminHistoryPage(${p.currentPage - 1})" ${!p.hasPrevPage ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 bg-stone-100 text-stone-500 rounded-lg text-xs font-semibold flex items-center gap-1"' : 'class="px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-xs"'}>
          <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i> Anterior
        </button>

        <span class="px-3 py-1 bg-wine-900 text-white font-bold rounded-lg text-xs">
          ${p.currentPage} / ${p.totalPages}
        </span>

        <button onclick="app.setAdminHistoryPage(${p.currentPage + 1})" ${!p.hasNextPage ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 bg-stone-100 text-stone-500 rounded-lg text-xs font-semibold flex items-center gap-1"' : 'class="px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-xs"'}>
          Próxima <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
  }

    lucide.createIcons();
  }

  // --- UPLOAD DE IMAGEM DA CAIXA ---
  handleImageSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      this.currentUploadedImage = event.target.result;
      const preview = document.getElementById('quote-image-preview');
      const container = document.getElementById('quote-image-preview-container');
      if (preview && container) {
        preview.src = this.currentUploadedImage;
        container.classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  }

  removeSelectedImage() {
    this.currentUploadedImage = null;
    const fileInput = document.getElementById('quote-package-image-file');
    const container = document.getElementById('quote-image-preview-container');
    if (fileInput) fileInput.value = '';
    if (container) container.classList.add('hidden');
  }

  // --- MODAL DE COTAÇÃO ---
  openQuoteFormModal(prefill = {}) {
    document.getElementById('modal-quote-form').classList.remove('hidden');
    
    // Auto-preenchimento dos dados de contato do cliente ou solicitante
    const user = window.logixStore.currentUser;
    const nameInput = document.getElementById('quote-contact-name');
    const phoneInput = document.getElementById('quote-contact-phone');
    const emailInput = document.getElementById('quote-contact-email');
    if (nameInput) nameInput.value = prefill.contactName || (user ? user.name : '');
    if (phoneInput) phoneInput.value = prefill.contactPhone || (user ? (user.phone || '') : '');
    if (emailInput) emailInput.value = prefill.contactEmail || (user ? (user.email || '') : '');

    if (prefill.modality) {
      if (prefill.modality === 'aereo') {
        const radAereo = document.getElementById('modal-mod-aereo');
        if (radAereo) radAereo.checked = true;
      } else {
        const radRodo = document.getElementById('modal-mod-rodoviario');
        if (radRodo) radRodo.checked = true;
      }
    }

    if (prefill.origin) document.getElementById('quote-origin').value = prefill.origin;
    if (prefill.destination) document.getElementById('quote-destination').value = prefill.destination;
    if (prefill.packageCount) document.getElementById('quote-package-count').value = prefill.packageCount;
    if (prefill.weight) document.getElementById('quote-weight').value = prefill.weight;

    if (prefill.preset) {
      if (prefill.preset === 'pequeno') {
        document.getElementById('quote-length').value = 25;
        document.getElementById('quote-width').value = 20;
        document.getElementById('quote-height').value = 15;
      } else if (prefill.preset === 'mediano') {
        document.getElementById('quote-length').value = 40;
        document.getElementById('quote-width').value = 30;
        document.getElementById('quote-height').value = 25;
      } else if (prefill.preset === 'grande') {
        document.getElementById('quote-length').value = 70;
        document.getElementById('quote-width').value = 50;
        document.getElementById('quote-height').value = 45;
      }
    }

    this.calculateVolumePreview();
    lucide.createIcons();
  }

  closeQuoteFormModal() {
    document.getElementById('modal-quote-form').classList.add('hidden');
  }

  calculateVolumePreview() {
    const l = parseFloat(document.getElementById('quote-length').value) || 0;
    const w = parseFloat(document.getElementById('quote-width').value) || 0;
    const h = parseFloat(document.getElementById('quote-height').value) || 0;
    const volCm3 = l * w * h;
    const volM3 = volCm3 / 1000000;
    const volWeight = (volCm3 / 5000).toFixed(2);

    const preview = document.getElementById('volume-preview-text');
    if (preview) {
      preview.textContent = `Cubagem calculada: ${volCm3.toLocaleString('pt-BR')} cm³ (${volM3.toFixed(3)} m³) • Peso cubado estimado: ${volWeight} kg`;
    }
  }

  handleHeroFormSubmit(e) {
    e.preventDefault();
    const modality = document.querySelector('input[name="hero-modality"]:checked')?.value || 'rodoviario';
    const origin = document.getElementById('hero-origin').value;
    const destination = document.getElementById('hero-destination').value;
    const count = document.getElementById('hero-count').value;
    const weight = document.getElementById('hero-weight').value;
    const preset = document.getElementById('hero-size-preset').value;

    this.openQuoteFormModal({
      modality,
      origin,
      destination,
      packageCount: count,
      weight,
      preset
    });
  }

  actionStartQuote() {
    this.openQuoteFormModal();
  }

  handleQuoteSubmit(e) {
    e.preventDefault();

    const modality = document.querySelector('input[name="quote-modality"]:checked')?.value || 'rodoviario';
    const contactName = document.getElementById('quote-contact-name')?.value?.trim() || '';
    const contactPhone = document.getElementById('quote-contact-phone')?.value?.trim() || '';
    const contactEmail = document.getElementById('quote-contact-email')?.value?.trim() || '';

    const data = {
      modality: modality,
      contactName,
      contactPhone,
      contactEmail,
      packageCount: document.getElementById('quote-package-count').value,
      length: document.getElementById('quote-length').value,
      width: document.getElementById('quote-width').value,
      height: document.getElementById('quote-height').value,
      weight: document.getElementById('quote-weight').value,
      packageImage: this.currentUploadedImage || null, // Imagem da caixa enviada pelo cliente
      origin: document.getElementById('quote-origin').value,
      destination: document.getElementById('quote-destination').value,
      declaredValue: document.getElementById('quote-declared-value').value,
      description: document.getElementById('quote-description').value,
      isFragile: document.getElementById('quote-is-fragile').checked
    };

    // Cria a cotação e dispara a notificação automática para todos os telefones de administradores
    const createdQuote = window.logixStore.createQuote(data);

    this.closeQuoteFormModal();
    document.getElementById('form-new-quote').reset();
    this.removeSelectedImage();

    // Exibe modal oficial com aviso de notificação enviada aos administradores e canais diretos
    this.showSujetaAnalisisModal(createdQuote.id);
  }

  showSujetaAnalisisModal(quoteId) {
    const quote = window.logixStore.quotes.find(q => q.id === quoteId);
    if (!quote) return;

    document.getElementById('modal-sujeta-folio').textContent = quoteId;

    const activeAdminPhones = window.logixStore.getAdminPhones().filter(p => p.active);
    const container = document.getElementById('modal-sujeta-admin-phones-container');

    const modalidadeTexto = (quote.modality === 'aereo') ? 'AÉREO PRIORITÁRIO' : 'RODOVIÁRIO EXPRESSO';
    const clientContact = quote.clientPhone ? `${quote.clientPhone} (${quote.clientEmail || ''})` : (quote.clientEmail || 'Não informado');

    const messageText = `📦 *NOVA SOLICITAÇÃO DE COTAÇÃO - TOP10 CARGAS*\n\n` +
      `📌 *Código:* ${quote.id}\n` +
      `🚚 *Modalidade:* ${modalidadeTexto}\n` +
      `👤 *Cliente:* ${quote.clientName}\n` +
      `📞 *Contato:* ${clientContact}\n` +
      `📍 *Origem:* ${quote.origin}\n` +
      `🎯 *Destino:* ${quote.destination}\n` +
      `📦 *Volumes:* ${quote.packageCount} volume(s) • ${quote.weight} kg\n` +
      (quote.dimensions ? `📐 *Medidas:* ${quote.dimensions.length}x${quote.dimensions.width}x${quote.dimensions.height} cm\n` : '') +
      (quote.description ? `📝 *Mercadoria:* ${quote.description}\n` : '') +
      (quote.declaredValue ? `💰 *Valor Declarado:* R$ ${parseFloat(quote.declaredValue).toFixed(2)}\n` : '') +
      `⏰ *Data/Hora:* ${new Date().toLocaleString('pt-BR')}\n\n` +
      `🔗 *Acesse para emitir proposta:* https://top10cargas.com`;

    if (container) {
      if (activeAdminPhones.length === 0) {
        container.innerHTML = `
          <div class="p-3 bg-amber-50 text-amber-900 rounded-lg text-xs">
            Nenhum telefone de administrador cadastrado no momento. A cotação foi registrada com sucesso no sistema.
          </div>
        `;
      } else {
        const primaryPhone = activeAdminPhones.find(p => p.whatsapp !== false) || activeAdminPhones[0];
        const primaryClean = primaryPhone.number.replace(/\D/g, '');
        const primaryWaUrl = `https://wa.me/${primaryClean}?text=${encodeURIComponent(messageText)}`;

        container.innerHTML = `
          <div class="space-y-3">
            <div class="flex items-center justify-between pb-1.5 border-b border-emerald-200">
              <span class="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                <i data-lucide="smartphone" class="w-4 h-4 text-emerald-700"></i>
                Notificação Telefônica Enviada aos Administradores:
              </span>
              <span class="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-black text-[9px] rounded-full uppercase">SMS & WhatsApp</span>
            </div>

            <p class="text-[11px] text-emerald-800 leading-snug">
              Os dados desta carga foram despachados para os números de telefone cadastrados da administração:
            </p>

            <div class="space-y-2">
              ${activeAdminPhones.map(phone => {
                const cleanDigits = phone.number.replace(/\D/g, '');
                const encodedMsg = encodeURIComponent(messageText);
                const waUrl = `https://wa.me/${cleanDigits}?text=${encodedMsg}`;
                const smsUrl = `sms:${cleanDigits}?body=${encodedMsg}`;

                return `
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-emerald-200 shadow-xs">
                    <div>
                      <p class="font-bold text-stone-900 text-xs">${this.escapeHtml(phone.name)}</p>
                      <p class="font-mono text-[11px] font-bold text-emerald-900">${this.escapeHtml(phone.number)}</p>
                    </div>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                      ${phone.whatsapp !== false ? `
                        <a href="${waUrl}" target="_blank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition inline-flex items-center gap-1 shadow-xs">
                          <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WhatsApp
                        </a>
                      ` : ''}
                      ${phone.sms !== false ? `
                        <a href="${smsUrl}" class="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition inline-flex items-center gap-1 shadow-xs">
                          <i data-lucide="message-square" class="w-3.5 h-3.5"></i> SMS
                        </a>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Botão de Ação Rápida WhatsApp -->
            <a href="${primaryWaUrl}" target="_blank" class="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-md">
              <i data-lucide="send" class="w-4 h-4 text-yellowbrand-300"></i>
              <span>Abrir WhatsApp com Administrador (${primaryPhone.name})</span>
            </a>
          </div>
        `;
      }
    }

    this.playNotificationChime();
    this.triggerDesktopNotification(
      `Nova Cotação Solicitada (${quote.id})`,
      `${quote.clientName} enviou solicitação de frete ${modalidadeTexto}. Destino: ${quote.destination}.`,
      quote.id
    );

    document.getElementById('modal-sujeta-analisis').classList.remove('hidden');
    lucide.createIcons();
  }

  closeSujetaAnalisisModal(goToDashboard = false) {
    document.getElementById('modal-sujeta-analisis').classList.add('hidden');
    if (goToDashboard) {
      if (!window.logixStore.currentUser) {
        window.logixStore.switchRole('client');
      }
      this.navigateTo('client_dashboard');
      this.setClientTab('proposals');
    }
  }

  // --- ADMINISTRADOR: MODAL DE PROPOSTA COM VISUALIZAÇÃO DE FOTO ---
  openAdminProposalModal(quoteId) {
    const quote = window.logixStore.quotes.find(q => q.id === quoteId);
    if (!quote) return;

    this.currentQuoteForAction = quote;
    document.getElementById('admin-modal-quote-id').textContent = quote.id;
    document.getElementById('admin-view-client').textContent = `${quote.clientName} (${quote.clientPhone || quote.clientEmail})`;
    document.getElementById('admin-view-packages').textContent = `${quote.packageCount} volume(s)`;
    document.getElementById('admin-view-weight').textContent = quote.weight;
    document.getElementById('admin-view-dimensions').textContent = `${quote.dimensions.length}x${quote.dimensions.width}x${quote.dimensions.height} cm`;
    document.getElementById('admin-view-origin').textContent = quote.origin;
    document.getElementById('admin-view-destination').textContent = quote.destination;

    // Foto da Carga
    const imageBox = document.getElementById('admin-view-image-box');
    const imagePreview = document.getElementById('admin-view-image-preview');
    if (quote.packageImage) {
      imagePreview.src = quote.packageImage;
      imageBox.classList.remove('hidden');
    } else {
      imagePreview.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80';
      imageBox.classList.remove('hidden');
    }

    const modBadge = document.getElementById('admin-view-modality-badge');
    if (modBadge) {
      modBadge.textContent = quote.modality === 'aereo' ? 'Frete Aéreo Express' : 'Rodoviário Nacional';
      modBadge.className = quote.modality === 'aereo' 
        ? 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300'
        : 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
    }

    const reanalysisBox = document.getElementById('admin-view-reanalysis-box');
    const reanalysisText = document.getElementById('admin-view-reanalysis-text');
    if (quote.reanalysisNotes) {
      reanalysisText.textContent = quote.reanalysisNotes;
      reanalysisBox.classList.remove('hidden');
    } else {
      reanalysisBox.classList.add('hidden');
    }

    if (quote.proposal) {
      document.getElementById('admin-proposal-price').value = quote.proposal.price;
      document.getElementById('admin-proposal-eta').value = quote.proposal.estimatedTime;
      document.getElementById('admin-proposal-base').value = quote.proposal.breakdown.base;
      document.getElementById('admin-proposal-insurance').value = quote.proposal.breakdown.insurance;
      document.getElementById('admin-proposal-packaging').value = quote.proposal.breakdown.packaging;
      document.getElementById('admin-proposal-notes').value = quote.proposal.notes;
    } else {
      const mult = quote.modality === 'aereo' ? 18 : 8;
      const suggestedBase = Math.max(90, Math.round(quote.weight * mult + (quote.dimensions.volumeCm3 / 5000) * 12));
      const suggestedInsurance = quote.declaredValue ? Math.round(quote.declaredValue * 0.015) : 35;
      const suggestedPackaging = quote.isFragile ? 40 : 20;
      const suggestedTotal = suggestedBase + suggestedInsurance + suggestedPackaging;

      document.getElementById('admin-proposal-price').value = suggestedTotal;
      document.getElementById('admin-proposal-eta').value = quote.modality === 'aereo' ? '24 a 48 horas úteis (Aéreo)' : '3 a 5 dias úteis (Rodoviário)';
      document.getElementById('admin-proposal-base').value = suggestedBase;
      document.getElementById('admin-proposal-insurance').value = suggestedInsurance;
      document.getElementById('admin-proposal-packaging').value = suggestedPackaging;
      document.getElementById('admin-proposal-notes').value = 'Coleta no remetente inclusa com apólice de seguro contra extravio e rastreamento em tempo real.';
    }

    document.getElementById('modal-admin-proposal').classList.remove('hidden');
    lucide.createIcons();
  }

  closeAdminProposalModal() {
    document.getElementById('modal-admin-proposal').classList.add('hidden');
    this.currentQuoteForAction = null;
  }

  handleAdminProposalSubmit(e) {
    e.preventDefault();
    if (!this.currentQuoteForAction) return;

    const proposalData = {
      price: document.getElementById('admin-proposal-price').value,
      currency: 'BRL',
      estimatedTime: document.getElementById('admin-proposal-eta').value,
      base: document.getElementById('admin-proposal-base').value,
      insurance: document.getElementById('admin-proposal-insurance').value,
      packaging: document.getElementById('admin-proposal-packaging').value,
      notes: document.getElementById('admin-proposal-notes').value
    };

    window.logixStore.sendProposal(this.currentQuoteForAction.id, proposalData);
    this.closeAdminProposalModal();
    this.showToast('Proposta enviada ao cliente com sucesso!', 'success');
  }

  // --- CLIENTE: DECISÕES DA PROPOSTA ---
  actionAcceptProposal(quoteId) {
    if (confirm('Confirma a aprovação desta proposta? O envio será confirmado e você poderá acompanhar o rastreamento em tempo real.')) {
      window.logixStore.acceptProposal(quoteId);
      this.showToast('Você aceitou a proposta! O rastreamento de entrega já está ativo.', 'success');
    }
  }

  openDenyModal(quoteId) {
    document.getElementById('deny-quote-id').value = quoteId;
    document.getElementById('deny-reason').value = '';
    document.getElementById('modal-deny-proposal').classList.remove('hidden');
    lucide.createIcons();
  }

  closeDenyModal() {
    document.getElementById('modal-deny-proposal').classList.add('hidden');
  }

  handleDenySubmit(e) {
    e.preventDefault();
    const quoteId = document.getElementById('deny-quote-id').value;
    const reason = document.getElementById('deny-reason').value;

    window.logixStore.denyProposal(quoteId, reason);
    this.closeDenyModal();
    this.showToast('Você recusou a proposta comercial.', 'info');
  }

  openReanalysisModal(quoteId) {
    document.getElementById('reanalysis-quote-id').value = quoteId;
    document.getElementById('reanalysis-feedback').value = '';
    document.getElementById('modal-reanalysis').classList.remove('hidden');
    lucide.createIcons();
  }

  closeReanalysisModal() {
    document.getElementById('modal-reanalysis').classList.add('hidden');
  }

  handleReanalysisSubmit(e) {
    e.preventDefault();
    const quoteId = document.getElementById('reanalysis-quote-id').value;
    const feedback = document.getElementById('reanalysis-feedback').value;

    window.logixStore.requestReanalysis(quoteId, feedback);
    this.closeReanalysisModal();
    this.showToast('Solicitação de reanálise enviada à administração!', 'warning');
  }

  // --- ADMINISTRADOR: AVANÇO DE ETAPA DE RASTREAMENTO ---
  actionUpdateDeliveryStage(quoteId, stage) {
    window.logixStore.updateDeliveryStage(quoteId, stage);
    let msg = 'Status de entrega atualizado com sucesso!';
    if (stage === 'em_transito') msg = 'Status atualizado: Carga Coletada e A Caminho!';
    else if (stage === 'saiu_entrega') msg = 'Status atualizado: Saiu para Entrega!';
    else if (stage === 'entregue') msg = 'Status atualizado: Entrega Concluída com Sucesso!';
    this.showToast(msg, 'success');
  }

  // --- COMPROVANTE OFICIAL (IMPRIMÍVEL) ---
  viewQuoteDetails(quoteId) {
    const quote = window.logixStore.quotes.find(q => q.id === quoteId);
    if (!quote) return;

    const receipt = document.getElementById('printable-receipt');
    receipt.innerHTML = `
      <div class="border-b border-slate-200 pb-4 mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-wine-900 flex items-center justify-center text-white shadow-sm flex-shrink-0 p-1">
            <svg viewBox="0 0 48 48" class="w-full h-full" fill="none">
              <!-- Caixa Isométrica Top10 -->
              <path d="M24 6L8 15V33L24 42L40 33V15L24 6Z" fill="#881337" stroke="#ffffff" stroke-width="1.2"/>
              <path d="M24 6L40 15L24 24L8 15L24 6Z" fill="#9f1239"/>
              <path d="M8 15L24 24V42L8 33V15Z" fill="#5c061d"/>
              <path d="M40 15L24 24V42L40 33V15Z" fill="#881337"/>
              <text x="16" y="32" font-family="'Inter', sans-serif" font-weight="900" font-size="7" fill="#ffffff">Top10</text>
              <!-- Flecha Amarela em Volta -->
              <path d="M6 25C4 28 8 36 24 37C38 38 43 31 43 25C43 18 34 14 28 14" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" fill="none"/>
              <polygon points="27,10 32,14 27,18" fill="#facc15"/>
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-black text-wine-950 tracking-tight">Top10 <span class="text-yellowbrand-500">Cargas</span></h2>
            <p class="text-[10px] text-slate-500">top10cargas.com • Documento Oficial de Cotação de Transporte Nacional • Rodoviário & Aéreo</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-mono text-sm font-black text-wine-950">${quote.id}</p>
          <p class="text-[10px] text-slate-400">Emissão: ${this.formatDate(quote.createdAt)}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200">
        <div>
          <h5 class="font-bold text-slate-900 text-xs uppercase mb-1">Cliente / Solicitante:</h5>
          <p class="font-semibold text-slate-800">${this.escapeHtml(quote.clientName)}</p>
          <p class="text-slate-600">${this.escapeHtml(quote.clientEmail)}</p>
          <p class="text-slate-600">${this.escapeHtml(quote.clientPhone || 'Sem telefone informado')}</p>
        </div>
        <div>
          <h5 class="font-bold text-slate-900 text-xs uppercase mb-1">Modalidade & Situação:</h5>
          <div class="flex items-center gap-2 mt-1">
            ${this.buildModalityBadge(quote.modality)}
            ${this.buildStatusBadge(quote.status, quote.deliveryStage)}
          </div>
        </div>
      </div>

      <!-- Foto da Embalagem no Comprovante -->
      ${quote.packageImage ? `
        <div class="py-3 border-b border-slate-200 flex items-center gap-4">
          <img src="${quote.packageImage}" alt="Foto da Carga" class="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm">
          <div>
            <span class="font-bold text-slate-900 uppercase text-[10px] block">Registro Fotográfico da Embalagem:</span>
            <p class="text-[11px] text-slate-500">Foto anexada pelo cliente para conferência de cubagem e integridade da embalagem.</p>
          </div>
        </div>
      ` : ''}

      <div class="grid grid-cols-2 gap-4 py-3 border-b border-slate-200">
        <div>
          <h5 class="font-bold text-slate-900 text-xs uppercase mb-1">Endereço de Origem (Coleta):</h5>
          <p class="text-slate-800">${this.escapeHtml(quote.origin)}</p>
        </div>
        <div>
          <h5 class="font-bold text-slate-900 text-xs uppercase mb-1">Endereço de Destino (Entrega):</h5>
          <p class="text-slate-800">${this.escapeHtml(quote.destination)}</p>
        </div>
      </div>

      <div class="py-3 border-b border-slate-200">
        <h5 class="font-bold text-slate-900 text-xs uppercase mb-2">Especificações da Carga:</h5>
        <div class="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
          <div>
            <span class="text-slate-400 text-[10px] block">Quantidade Volumes</span>
            <span class="font-bold text-slate-900 text-sm">${quote.packageCount}</span>
          </div>
          <div>
            <span class="text-slate-400 text-[10px] block">Peso Real</span>
            <span class="font-bold text-slate-900 text-sm">${quote.weight} kg</span>
          </div>
          <div>
            <span class="text-slate-400 text-[10px] block">Dimensões</span>
            <span class="font-bold text-slate-900 text-xs">${quote.dimensions.length}x${quote.dimensions.width}x${quote.dimensions.height} cm</span>
          </div>
          <div>
            <span class="text-slate-400 text-[10px] block">Cubagem Total</span>
            <span class="font-bold text-slate-900 text-xs">${(quote.dimensions.volumeCm3 / 1000).toFixed(1)} dm³</span>
          </div>
        </div>
        <p class="mt-2 text-slate-600"><strong>Conteúdo:</strong> ${this.escapeHtml(quote.description)}</p>
        ${quote.isFragile ? '<p class="text-red-700 font-semibold mt-1">⚠️ Mercadoria classificada como Frágil.</p>' : ''}
      </div>

      ${quote.proposal ? `
        <div class="py-4 border-b border-slate-200 bg-wine-50/60 p-4 rounded-xl border border-wine-200">
          <h5 class="font-bold text-wine-900 text-xs uppercase mb-2">Condições Comerciais Propostas:</h5>
          <div class="flex items-baseline justify-between mb-2">
            <span class="text-slate-600 font-semibold">Valor Total do Frete:</span>
            <span class="text-2xl font-black text-wine-950">${this.formatCurrencyBRL(quote.proposal.price)}</span>
          </div>
          <div class="text-[11px] text-slate-600 space-y-1">
            <p><strong>Prazo Estimado de Entrega:</strong> ${this.escapeHtml(quote.proposal.estimatedTime)}</p>
            <p><strong>Observações:</strong> ${this.escapeHtml(quote.proposal.notes)}</p>
          </div>
        </div>
      ` : ''}

      <div class="pt-2">
        <h5 class="font-bold text-slate-900 text-xs uppercase mb-2">Linha do Tempo / Auditoria de Eventos:</h5>
        <div class="space-y-2">
          ${quote.history.map(h => `
            <div class="flex items-start gap-2 text-[11px] text-slate-600">
              <span class="w-2 h-2 rounded-full bg-slate-400 mt-1 flex-shrink-0"></span>
              <div>
                <span class="font-semibold text-slate-800">${h.action}</span> (${this.formatDate(h.date)}) por <em>${this.escapeHtml(h.user)}</em>
                <p class="text-slate-500 text-[10px]">${this.escapeHtml(h.note)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('modal-quote-details').classList.remove('hidden');
    lucide.createIcons();
  }

  closeQuoteDetailsModal() {
    document.getElementById('modal-quote-details').classList.add('hidden');
  }

  // --- AUTENTICAÇÃO DE CLIENTE ---
  openAuthModal(tab = 'login') {
    document.getElementById('modal-auth').classList.remove('hidden');
    document.getElementById('auth-error-message').classList.add('hidden');
    this.switchAuthTab(tab);
    lucide.createIcons();
    setTimeout(() => {
      if (tab === 'login') {
        document.getElementById('login-email')?.focus();
      } else {
        document.getElementById('reg-name')?.focus();
      }
    }, 100);
  }

  closeAuthModal() {
    document.getElementById('modal-auth').classList.add('hidden');
  }

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>`;
    lucide.createIcons();
  }

  switchAuthTab(tab) {
    const loginBtn = document.getElementById('auth-tab-login-btn');
    const registerBtn = document.getElementById('auth-tab-register-btn');
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');

    if (tab === 'login') {
      loginBtn.className = 'py-4 border-b-2 border-wine-800 text-wine-900 bg-wine-50/50 font-bold';
      registerBtn.className = 'py-4 border-b-2 border-transparent text-slate-500 hover:text-slate-800';
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      registerBtn.className = 'py-4 border-b-2 border-wine-800 text-wine-900 bg-wine-50/50 font-bold';
      loginBtn.className = 'py-4 border-b-2 border-transparent text-slate-500 hover:text-slate-800';
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
    lucide.createIcons();
  }

  handleLoginSubmit(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;

    try {
      const user = window.logixStore.login(identifier, pass);
      this.closeAuthModal();
      this.showToast(`Bem-vindo de volta, ${user.name}!`, 'success');
      if (user.role === 'admin') {
        this.navigateTo('admin_dashboard');
      } else {
        this.navigateTo('client_dashboard');
      }
    } catch (err) {
      document.getElementById('auth-error-text').textContent = err.message || 'Credenciais inválidas. Verifique os dados digitados.';
      document.getElementById('auth-error-message').classList.remove('hidden');
    }
  }

  handleRegisterSubmit(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById('reg-name').value.trim(),
      email: document.getElementById('reg-email').value.trim(),
      phone: document.getElementById('reg-phone').value.trim(),
      company: document.getElementById('reg-company').value.trim(),
      cpfCnpj: document.getElementById('reg-cpf-cnpj').value.trim(),
      password: document.getElementById('reg-password').value.trim(),
      avatar: this.currentRegisterAvatar || null
    };

    try {
      const user = window.logixStore.register(data);
      // Pré-preenche o campo de login com o e-mail cadastrado para facilitar novo acesso
      const loginEmailInput = document.getElementById('login-email');
      if (loginEmailInput) loginEmailInput.value = user.email;

      this.closeAuthModal();
      this.removeRegisterAvatar();
      document.getElementById('form-register')?.reset();
      this.showToast(`Cadastro realizado com sucesso! Bem-vindo, ${user.name}`, 'success');
      this.navigateTo('client_dashboard');
    } catch (err) {
      document.getElementById('auth-error-text').textContent = err.message || 'Erro ao realizar cadastro.';
      document.getElementById('auth-error-message').classList.remove('hidden');
    }
  }

  logout() {
    window.logixStore.logout();
    this.navigateTo('landing');
    this.showToast('Você saiu da sua conta.', 'info');
  }

  // --- CONTROLE DE ABAS ---
  setClientTab(tab) {
    this.currentClientTab = tab;
    const btnProposals = document.getElementById('tab-client-proposals-btn');
    const btnHistory = document.getElementById('tab-client-history-btn');
    const btnChat = document.getElementById('tab-client-chat-btn');
    const contentProposals = document.getElementById('tab-client-proposals-content');
    const contentHistory = document.getElementById('tab-client-history-content');
    const contentChat = document.getElementById('tab-client-chat-content');

    const activeClasses = 'pb-3 text-sm font-bold border-b-2 border-wine-800 text-wine-900 flex items-center gap-2';
    const inactiveClasses = 'pb-3 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2';

    if (btnProposals) btnProposals.className = tab === 'proposals' ? activeClasses : inactiveClasses;
    if (btnHistory) btnHistory.className = tab === 'history' ? activeClasses : inactiveClasses;
    if (btnChat) btnChat.className = tab === 'chat' ? activeClasses : inactiveClasses;

    if (contentProposals) contentProposals.classList.toggle('hidden', tab !== 'proposals');
    if (contentHistory) contentHistory.classList.toggle('hidden', tab !== 'history');
    if (contentChat) contentChat.classList.toggle('hidden', tab !== 'chat');

    if (tab === 'chat') {
      this.renderClientChat();
    }
    lucide.createIcons();
  }

  setAdminTab(tab) {
    this.currentAdminTab = tab;
    const btnPending = document.getElementById('tab-admin-pending-btn');
    const btnActive = document.getElementById('tab-admin-active-btn');
    const btnHistory = document.getElementById('tab-admin-history-btn');
    const btnUsers = document.getElementById('tab-admin-users-btn');
    const btnFinancial = document.getElementById('tab-admin-financial-btn');
    const btnChat = document.getElementById('tab-admin-chat-btn');
    const btnPhones = document.getElementById('tab-admin-phones-btn');

    const contentPending = document.getElementById('tab-admin-pending-content');
    const contentActive = document.getElementById('tab-admin-active-content');
    const contentHistory = document.getElementById('tab-admin-history-content');
    const contentUsers = document.getElementById('tab-admin-users-content');
    const contentFinancial = document.getElementById('tab-admin-financial-content');
    const contentChat = document.getElementById('tab-admin-chat-content');
    const contentPhones = document.getElementById('tab-admin-phones-content');

    const activeClasses = 'pb-3 text-sm font-bold border-b-2 border-wine-800 text-wine-900 flex items-center gap-2';
    const inactiveClasses = 'pb-3 text-sm font-bold border-b-2 border-transparent text-slate-500 hover:text-slate-800 flex items-center gap-2';

    if (btnPending) btnPending.className = tab === 'pending' ? activeClasses : inactiveClasses;
    if (btnActive) btnActive.className = tab === 'active' ? activeClasses : inactiveClasses;
    if (btnHistory) btnHistory.className = tab === 'history' ? activeClasses : inactiveClasses;
    if (btnUsers) btnUsers.className = tab === 'users' ? activeClasses : inactiveClasses;
    if (btnFinancial) btnFinancial.className = tab === 'financial' ? activeClasses : inactiveClasses;
    if (btnChat) btnChat.className = tab === 'chat' ? activeClasses : inactiveClasses;
    if (btnPhones) btnPhones.className = tab === 'phones' ? activeClasses : inactiveClasses;

    if (contentPending) contentPending.classList.toggle('hidden', tab !== 'pending');
    if (contentActive) contentActive.classList.toggle('hidden', tab !== 'active');
    if (contentHistory) contentHistory.classList.toggle('hidden', tab !== 'history');
    if (contentUsers) contentUsers.classList.toggle('hidden', tab !== 'users');
    if (contentFinancial) contentFinancial.classList.toggle('hidden', tab !== 'financial');
    if (contentChat) contentChat.classList.toggle('hidden', tab !== 'chat');
    if (contentPhones) contentPhones.classList.toggle('hidden', tab !== 'phones');

    if (tab === 'users') this.renderUsersManagement();
    if (tab === 'financial') this.renderFinancialReport();
    if (tab === 'chat') this.renderAdminChat();
    if (tab === 'phones') this.renderAdminPhones();

    lucide.createIcons();
  }

  // --- EXPORTAÇÃO CSV ---
  exportHistoryCSV() {
    const quotes = window.logixStore.quotes;
    let csv = 'Codigo,Data,Cliente,Email,Telefone,Modalidade,Origem,Destino,Volumes,Peso_kg,Status,Etapa_Entrega,Preco_BRL,Prazo_Entrega\n';

    quotes.forEach(q => {
      const price = q.proposal ? q.proposal.price : '';
      const eta = q.proposal ? `"${q.proposal.estimatedTime.replace(/"/g, '""')}"` : '';
      const mod = q.modality === 'aereo' ? 'Aereo' : 'Rodoviario';
      csv += `${q.id},"${q.createdAt}","${q.clientName}","${q.clientEmail}","${q.clientPhone}","${mod}","${q.origin}","${q.destination}",${q.packageCount},${q.weight},"${q.status}","${q.deliveryStage || 'N/A'}",${price},${eta}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `top10cargas_historico_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Relatório baixado em CSV com sucesso!', 'info');
  }

  // --- AUXILIARES E FORMATAÇÃO ---
  formatCurrencyBRL(value) {
    if (typeof value !== 'number') value = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  buildModalityBadge(modality) {
    if (modality === 'aereo') {
      return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"><i data-lucide="plane" class="w-3 h-3 text-amber-700"></i> Aéreo</span>';
    }
    return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><i data-lucide="truck" class="w-3 h-3 text-emerald-600"></i> Rodoviário</span>';
  }

  buildStatusBadge(status, deliveryStage = null) {
    if (status === 'ACEPTADA') {
      if (deliveryStage === 'em_transito') {
        return '<span class="badge-status badge-propuesta"><i data-lucide="truck" class="w-3 h-3 animate-pulse"></i> A Caminho / Em Trânsito</span>';
      } else if (deliveryStage === 'saiu_entrega') {
        return '<span class="badge-status bg-purple-100 text-purple-800 border border-purple-200"><i data-lucide="map-pin" class="w-3 h-3 animate-pulse"></i> Saiu para Entrega</span>';
      } else if (deliveryStage === 'entregue') {
        return '<span class="badge-status badge-completado"><i data-lucide="check-circle-2" class="w-3 h-3"></i> Entregue</span>';
      }
      return '<span class="badge-status badge-aceptada"><i data-lucide="clock" class="w-3 h-3"></i> Aguardando Coleta</span>';
    }

    switch (status) {
      case 'PENDIENTE_ANALISIS':
        return '<span class="badge-status badge-pendiente"><i data-lucide="clock" class="w-3 h-3"></i> Sujeita a Análise</span>';
      case 'PROPUESTA_ENVIADA':
        return '<span class="badge-status badge-propuesta"><i data-lucide="send" class="w-3 h-3"></i> Proposta Enviada</span>';
      case 'DENEGADA':
        return '<span class="badge-status badge-denegada"><i data-lucide="x-circle" class="w-3 h-3"></i> Recusada</span>';
      case 'REANALISIS_SOLICITADO':
        return '<span class="badge-status badge-reanalisis"><i data-lucide="refresh-cw" class="w-3 h-3"></i> Reanálise Solicitada</span>';
      case 'COMPLETADO':
        return '<span class="badge-status badge-completado"><i data-lucide="award" class="w-3 h-3"></i> Entregue com Sucesso</span>';
      default:
        return `<span class="badge-status badge-completado">${status}</span>`;
    }
  }

  formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  showToast(message, type = 'info') {
    const existing = document.getElementById('app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'app-toast';
    
    let bg = 'bg-slate-900 text-white';
    let icon = 'info';
    if (type === 'success') { bg = 'bg-emerald-600 text-white'; icon = 'check-circle'; }
    if (type === 'warning') { bg = 'bg-amber-600 text-white'; icon = 'alert-triangle'; }
    if (type === 'error') { bg = 'bg-red-600 text-white'; icon = 'alert-circle'; }

    toast.className = `fixed bottom-6 right-6 z-50 ${bg} px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-fade-in border border-white/10`;
    toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i> <span>${this.escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // --- FORMATAÇÃO CPF / CNPJ ---
  formatCpfCnpj(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length <= 11) {
      // Formato CPF: 000.000.000-00
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      input.maxLength = 14;
    } else {
      // Formato CNPJ: 00.000.000/0000-00
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
      input.maxLength = 18;
    }
    input.value = value;
  }
  // --- RECUPERAÇÃO DE SENHA ---
  openForgotPasswordModal() {
    document.getElementById('modal-forgot-password').classList.remove('hidden');
    document.getElementById('forgot-step-1').classList.remove('hidden');
    document.getElementById('forgot-step-2').classList.add('hidden');
    document.getElementById('forgot-error-message').classList.add('hidden');
    document.getElementById('forgot-email').value = '';
    lucide.createIcons();
  }

  closeForgotPasswordModal() {
    document.getElementById('modal-forgot-password').classList.add('hidden');
  }

  handleSendResetCode(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    try {
      const result = window.logixStore.generateResetCode(email);
      document.getElementById('forgot-code-value').textContent = result.code;
      document.getElementById('forgot-step-1').classList.add('hidden');
      document.getElementById('forgot-step-2').classList.remove('hidden');
      document.getElementById('forgot-error-message').classList.add('hidden');
      lucide.createIcons();
    } catch (err) {
      document.getElementById('forgot-error-text').textContent = err.message;
      document.getElementById('forgot-error-message').classList.remove('hidden');
    }
  }

  handleConfirmResetCode(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const code = document.getElementById('forgot-code-input').value;
    const newPass = document.getElementById('forgot-new-password').value;
    const confirmPass = document.getElementById('forgot-confirm-password').value;
    if (newPass !== confirmPass) {
      document.getElementById('forgot-error-text').textContent = 'As senhas não coincidem.';
      document.getElementById('forgot-error-message').classList.remove('hidden');
      return;
    }
    try {
      window.logixStore.resetPassword(email, code, newPass);
      this.closeForgotPasswordModal();
      this.showToast('Senha redefinida com sucesso! Faça login com a nova senha.', 'success');
    } catch (err) {
      document.getElementById('forgot-error-text').textContent = err.message;
      document.getElementById('forgot-error-message').classList.remove('hidden');
    }
  }

  actionDeleteQuote(quoteId) {
    if (confirm(`Tem certeza que deseja EXCLUIR permanentemente o pedido ${quoteId}? Esta ação não pode ser desfeita.`)) {
      window.logixStore.deleteQuote(quoteId);
      this.showToast(`Pedido ${quoteId} excluído com sucesso.`, 'success');
      this.renderAdminDashboard();
    }
  }

  // --- ATUALIZAÇÃO MANUAL DOS DADOS DO PAINEL ADMIN ---
  refreshAdminData() {
    // Recarrega cotações, usuários e notificações do localStorage
    // (útil quando clientes enviaram cotações em outra aba ou dispositivo)
    const savedQuotes = localStorage.getItem('logixbrasil_quotes');
    if (savedQuotes) {
      try { window.logixStore.quotes = JSON.parse(savedQuotes); } catch (e) { /* ignorar */ }
    }
    const savedUsers = localStorage.getItem('logixbrasil_users');
    if (savedUsers) {
      try { window.logixStore.users = JSON.parse(savedUsers); } catch (e) { /* ignorar */ }
    }
    const savedNotifs = localStorage.getItem('logixbrasil_notifications');
    if (savedNotifs) {
      try { window.logixStore.notifications = JSON.parse(savedNotifs); } catch (e) { /* ignorar */ }
    }
    const savedMsgs = localStorage.getItem('top10cargas_messages');
    if (savedMsgs) {
      try { window.logixStore.messages = JSON.parse(savedMsgs); } catch (e) { /* ignorar */ }
    }
    this.renderAdminDashboard();
    this.showToast('Dados atualizados com sucesso!', 'success');
  }

  renderUsersManagement() {
    const users = window.logixStore.getAllUsers();
    const container = document.getElementById('admin-users-list');
    if (!container) return;
    if (users.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-stone-400 text-xs">Nenhum usuário cadastrado ainda.</div>`;
      return;
    }
    container.innerHTML = users.map(u => `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
        <div class="flex items-center gap-3">
          ${u.avatar ? `
            <img src="${u.avatar}" alt="${this.escapeHtml(u.name)}" class="w-10 h-10 rounded-xl object-cover border border-stone-300 shadow-xs flex-shrink-0">
          ` : `
            <div class="w-10 h-10 rounded-xl ${u.role === 'admin' ? 'bg-yellowbrand-400 text-wine-950' : 'bg-wine-100 text-wine-900'} flex items-center justify-center font-bold text-sm flex-shrink-0">
              ${u.name.charAt(0).toUpperCase()}
            </div>
          `}
          <div>
            <p class="font-bold text-slate-900 text-sm">${this.escapeHtml(u.name)}</p>
            <p class="text-xs text-slate-500">${this.escapeHtml(u.email)} ${u.company ? '• ' + this.escapeHtml(u.company) : ''}</p>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-yellowbrand-200 text-wine-950' : 'bg-slate-200 text-slate-700'}">${u.role === 'admin' ? 'Administrador' : 'Cliente'}</span>
              <span class="text-[10px] text-slate-400">Senha: <code class="bg-white px-1 py-0.5 rounded border border-slate-200 text-slate-700 font-mono">${this.escapeHtml(u.password)}</code></span>
              ${u.cpfCnpj ? `<span class="text-[10px] text-slate-400">CPF/CNPJ: ${this.escapeHtml(u.cpfCnpj)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
          ${u.role !== 'admin' ? `
            <button onclick="app.actionPromoteUser('${u.id}')" class="px-3 py-1.5 bg-yellowbrand-400 hover:bg-yellowbrand-300 text-wine-950 text-xs font-bold rounded-lg flex items-center gap-1 transition">
              <i data-lucide="shield-plus" class="w-3.5 h-3.5"></i> Tornar Admin
            </button>
          ` : `
            <button onclick="app.actionDemoteUser('${u.id}')" class="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold rounded-lg flex items-center gap-1 transition">
              <i data-lucide="shield-minus" class="w-3.5 h-3.5"></i> Remover Admin
            </button>
          `}
          <button onclick="app.openEditPasswordModal('${u.id}', '${this.escapeHtml(u.name)}')" class="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg flex items-center gap-1 transition" title="Editar senha desta conta">
            <i data-lucide="key" class="w-3.5 h-3.5"></i> Editar Senha
          </button>
          <button onclick="app.actionDeleteUser('${u.id}')" class="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg flex items-center gap-1 transition" title="Excluir Conta Permanentemente">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Excluir Conta
          </button>
        </div>
      </div>
    `).join('');
    lucide.createIcons();
  }

  actionPromoteUser(userId) {
    if (confirm('Tem certeza que deseja conceder acesso de Administrador a este usuário?')) {
      window.logixStore.promoteToAdmin(userId);
      this.renderUsersManagement();
      this.showToast('Usuário promovido a Administrador com sucesso!', 'success');
    }
  }

  actionDemoteUser(userId) {
    if (confirm('Remover acesso de Administrador deste usuário?')) {
      try {
        window.logixStore.demoteToClient(userId);
        this.renderUsersManagement();
        this.showToast('Acesso de administrador removido.', 'info');
      } catch(err) {
        this.showToast(err.message, 'error');
      }
    }
  }

  actionDeleteUser(userId) {
    const user = window.logixStore.users.find(u => u.id === userId);
    if (!user) return;
    if (confirm(`Tem certeza que deseja EXCLUIR permanentemente a conta de "${user.name}" (${user.email})?\nEsta ação apagará a conta do sistema.`)) {
      try {
        window.logixStore.deleteUser(userId);
        this.renderUsersManagement();
        this.renderAdminDashboard();
        this.showToast(`Conta de ${user.name} excluída com sucesso.`, 'success');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    }
  }

  openEditPasswordModal(userId, userName) {
    document.getElementById('edit-password-user-id').value = userId;
    document.getElementById('edit-password-user-name').textContent = userName;
    document.getElementById('edit-password-new').value = '';
    document.getElementById('edit-password-confirm').value = '';
    document.getElementById('edit-password-error').classList.add('hidden');
    document.getElementById('modal-edit-password').classList.remove('hidden');
    lucide.createIcons();
  }

  closeEditPasswordModal() {
    document.getElementById('modal-edit-password').classList.add('hidden');
  }

  handleEditPasswordSubmit(e) {
    e.preventDefault();
    const userId = document.getElementById('edit-password-user-id').value;
    const newPass = document.getElementById('edit-password-new').value;
    const confirmPass = document.getElementById('edit-password-confirm').value;
    const errEl = document.getElementById('edit-password-error');
    const errText = document.getElementById('edit-password-error-text');

    if (newPass.length < 4) {
      errText.textContent = 'A senha deve ter pelo menos 4 caracteres.';
      errEl.classList.remove('hidden');
      return;
    }
    if (newPass !== confirmPass) {
      errText.textContent = 'As senhas não coincidem.';
      errEl.classList.remove('hidden');
      return;
    }

    try {
      window.logixStore.adminUpdatePassword(userId, newPass);
      this.closeEditPasswordModal();
      this.renderUsersManagement();
      this.showToast('Senha atualizada com sucesso!', 'success');
    } catch (err) {
      errText.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  }

  renderFinancialReport() {
    const groupBy = document.getElementById('financial-group-by')?.value || 'month';
    const fromVal = document.getElementById('financial-date-from')?.value;
    const toVal = document.getElementById('financial-date-to')?.value;

    let quotes = window.logixStore.quotes.filter(q =>
      q.proposal && (q.status === 'ACEPTADA' || q.status === 'COMPLETADO')
    );

    if (fromVal) {
      const from = new Date(fromVal + 'T00:00:00');
      quotes = quotes.filter(q => new Date(q.createdAt) >= from);
    }
    if (toVal) {
      const to = new Date(toVal + 'T23:59:59');
      quotes = quotes.filter(q => new Date(q.createdAt) <= to);
    }

    // KPIs
    const totalRev = quotes.reduce((s, q) => s + q.proposal.price, 0);
    const totalOrders = quotes.length;
    const avgTicket = totalOrders > 0 ? totalRev / totalOrders : 0;
    const uniqueClients = new Set(quotes.map(q => q.clientId)).size;

    const kpisEl = document.getElementById('financial-kpis');
    if (kpisEl) {
      kpisEl.innerHTML = [
        { label: 'Receita Total', value: this.formatCurrencyBRL(totalRev), icon: 'banknote', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Pedidos no Período', value: totalOrders, icon: 'package', color: 'text-wine-800', bg: 'bg-wine-50' },
        { label: 'Ticket Médio', value: this.formatCurrencyBRL(avgTicket), icon: 'trending-up', color: 'text-amber-700', bg: 'bg-amber-50' },
        { label: 'Clientes Ativos', value: uniqueClients, icon: 'users', color: 'text-blue-600', bg: 'bg-blue-50' }
      ].map(k => `
        <div class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-stone-500">${k.label}</span>
            <span class="p-2 ${k.bg} ${k.color} rounded-lg"><i data-lucide="${k.icon}" class="w-4 h-4"></i></span>
          </div>
          <p class="text-2xl font-black ${k.color}">${k.value}</p>
        </div>
      `).join('');
    }

    // Agrupar por semana ou mês
    const groups = {};
    quotes.forEach(q => {
      const d = new Date(q.createdAt);
      let key;
      if (groupBy === 'week') {
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        key = startOfWeek.toISOString().slice(0, 10);
      } else {
        key = d.toISOString().slice(0, 7);
      }
      if (!groups[key]) groups[key] = { total: 0, count: 0, label: key };
      groups[key].total += q.proposal.price;
      groups[key].count += 1;
    });

    const labels = Object.keys(groups).sort();
    const values = labels.map(l => groups[l].total);
    const maxVal = Math.max(...values, 1);
    const chartH = 260;
    const barW = Math.max(30, Math.min(80, Math.floor(700 / Math.max(labels.length, 1)) - 10));
    const totalW = Math.max(600, labels.length * (barW + 14));

    const bars = labels.map((l, i) => {
      const barH = Math.round((values[i] / maxVal) * (chartH - 60));
      const x = i * (barW + 14) + 30;
      const y = chartH - 40 - barH;
      const color = i % 2 === 0 ? '#881337' : '#facc15';
      const labelText = groupBy === 'week' ? `Sem ${l.slice(5, 10)}` : l;
      return `
        <g>
          <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="4" fill="${color}" opacity="0.9"/>
          <text x="${x + barW/2}" y="${y - 6}" text-anchor="middle" font-size="10" font-weight="bold" fill="#881337">${this.formatCurrencyBRL(values[i]).replace('R$\u00a0','R$')}</text>
          <text x="${x + barW/2}" y="${chartH - 22}" text-anchor="middle" font-size="9" fill="#64748b">${labelText}</text>
          <text x="${x + barW/2}" y="${chartH - 10}" text-anchor="middle" font-size="8" fill="#94a3b8">${groups[l].count} pedido(s)</text>
        </g>
      `;
    }).join('');

    const chartEl = document.getElementById('financial-chart');
    if (chartEl) {
      if (labels.length === 0) {
        chartEl.innerHTML = `<div class="flex items-center justify-center h-64 text-stone-400 text-xs"><i data-lucide="bar-chart-2" class="w-8 h-8 mr-2"></i>Nenhum dado financeiro no período selecionado.</div>`;
      } else {
        chartEl.innerHTML = `
          <div class="flex items-center gap-3 mb-4">
            <i data-lucide="bar-chart-2" class="w-5 h-5 text-wine-800"></i>
            <h4 class="font-bold text-wine-950 text-sm">Fluxo de Receita — ${groupBy === 'week' ? 'Por Semana' : 'Por Mês'}</h4>
            <span class="ml-auto text-xs text-stone-400">${totalOrders} pedido(s) • ${this.formatCurrencyBRL(totalRev)} total</span>
          </div>
          <div class="overflow-x-auto">
            <svg width="${totalW}" height="${chartH}" xmlns="http://www.w3.org/2000/svg">
              <line x1="20" y1="10" x2="20" y2="${chartH - 38}" stroke="#e2e8f0" stroke-width="1"/>
              <line x1="20" y1="${chartH - 38}" x2="${totalW - 10}" y2="${chartH - 38}" stroke="#e2e8f0" stroke-width="1"/>
              ${bars}
            </svg>
          </div>
        `;
      }
    }

    // Tabela detalhada
    const tbody = document.getElementById('financial-table-body');
    if (tbody) {
      if (quotes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-stone-400">Nenhum pedido no período selecionado.</td></tr>`;
      } else {
        tbody.innerHTML = quotes.map(q => `
          <tr class="hover:bg-stone-50 transition">
            <td class="p-3 font-mono font-bold text-slate-900">${q.id}</td>
            <td class="p-3">${this.formatDate(q.createdAt)}</td>
            <td class="p-3 font-semibold text-slate-800">${this.escapeHtml(q.clientName)}</td>
            <td class="p-3">${this.buildModalityBadge(q.modality)}</td>
            <td class="p-3 text-[11px]">${this.escapeHtml(q.origin)} ➔ ${this.escapeHtml(q.destination)}</td>
            <td class="p-3">${this.buildStatusBadge(q.status, q.deliveryStage)}</td>
            <td class="p-3 text-right font-black text-emerald-700">${this.formatCurrencyBRL(q.proposal.price)}</td>
          </tr>
        `).join('');
      }
    }

    lucide.createIcons();
  }

  exportFinancialExcel() {
    const groupBy = document.getElementById('financial-group-by')?.value || 'month';
    const fromVal = document.getElementById('financial-date-from')?.value;
    const toVal = document.getElementById('financial-date-to')?.value;

    let quotes = window.logixStore.quotes.filter(q =>
      q.proposal && (q.status === 'ACEPTADA' || q.status === 'COMPLETADO')
    );
    if (fromVal) { const from = new Date(fromVal + 'T00:00:00'); quotes = quotes.filter(q => new Date(q.createdAt) >= from); }
    if (toVal) { const to = new Date(toVal + 'T23:59:59'); quotes = quotes.filter(q => new Date(q.createdAt) <= to); }

    if (typeof XLSX === 'undefined') {
      this.showToast('Biblioteca de Excel não carregada. Verifique sua conexão.', 'error');
      return;
    }

    const wsData = [
      ['Código', 'Data', 'Cliente', 'E-mail', 'Telefone', 'Modalidade', 'Origem', 'Destino', 'Volumes', 'Peso (kg)', 'Status', 'Valor (R$)']
    ];
    quotes.forEach(q => {
      wsData.push([
        q.id,
        new Date(q.createdAt).toLocaleDateString('pt-BR'),
        q.clientName,
        q.clientEmail,
        q.clientPhone || '',
        q.modality === 'aereo' ? 'Aéreo' : 'Rodoviário',
        q.origin,
        q.destination,
        q.packageCount,
        q.weight,
        q.status,
        q.proposal.price
      ]);
    });

    const totalRow = ['TOTAL', '', '', '', '', '', '', '', '', '', '', quotes.reduce((s, q) => s + q.proposal.price, 0)];
    wsData.push([]);
    wsData.push(totalRow);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [12,14,20,25,15,12,35,35,8,10,18,14].map(w => ({wch: w}));
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Financeiro');
    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    XLSX.writeFile(wb, `Top10Cargas_Relatorio_${dateStr}.xlsx`);
    this.showToast('Relatório Excel exportado com sucesso!', 'success');
  }

  // --- NOTIFICAÇÕES TELEFÔNICAS (WHATSAPP / SMS) PARA ADMINISTRADORES ---
  playNotificationChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) { /* audio bloqueado ou indisponível */ }
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch (e) { /* ignorar */ }
    }
  }

  triggerDesktopNotification(title, body, quoteId = null) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=128&q=80',
          tag: quoteId || 'quote_alert_' + Date.now()
        });
        notif.onclick = () => {
          window.focus();
          if (quoteId && window.logixStore.currentUser?.role === 'admin') {
            this.navigateTo('admin_dashboard');
            this.setAdminTab('pending');
          }
        };
      } catch (e) {
        console.warn('Erro ao disparar notificação desktop:', e);
      }
    }
  }

  renderAdminPhones(page = null) {
    if (page !== null) {
      this.adminPhonesAlertsPage = page;
    }
    const phones = window.logixStore.getAdminPhones();
    const allAlerts = window.logixStore.getPhoneAlertsLog();
    const container = document.getElementById('admin-phones-list');
    const tableBody = document.getElementById('admin-phone-alerts-table-body');
    const paginationEl = document.getElementById('admin-phone-alerts-pagination');
    const badge = document.getElementById('admin-phones-badge');
    const historyCount = document.getElementById('admin-phones-history-count');

    if (badge) badge.textContent = allAlerts.length;
    if (historyCount) historyCount.textContent = allAlerts.length;

    // 1. Lista de Telefones Configurados
    if (container) {
      if (phones.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-stone-400 text-xs">Nenhum telefone configurado. Clique em "Cadastrar Número" para adicionar.</div>`;
      } else {
        container.innerHTML = phones.map(p => `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 ${p.active ? 'bg-white' : 'bg-stone-50 opacity-60'} rounded-xl border border-stone-200 transition">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl ${p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-500'} flex items-center justify-center font-bold text-sm flex-shrink-0">
                <i data-lucide="smartphone" class="w-5 h-5"></i>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-bold text-slate-900 text-sm">${this.escapeHtml(p.name)}</p>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}">
                    ${p.active ? 'Ativo para Alertas' : 'Pausado'}
                  </span>
                </div>
                <p class="text-xs font-mono font-bold text-emerald-900 mt-0.5">${this.escapeHtml(p.number)}</p>
                <div class="flex items-center gap-2 mt-1">
                  ${p.whatsapp ? '<span class="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold flex items-center gap-1"><i data-lucide="message-circle" class="w-3 h-3"></i> WhatsApp Ativo</span>' : ''}
                  ${p.sms ? '<span class="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200 font-semibold flex items-center gap-1"><i data-lucide="message-square" class="w-3 h-3"></i> SMS</span>' : ''}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <a href="https://wa.me/${p.number.replace(/\D/g, '')}" target="_blank" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 flex items-center gap-1 transition">
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> Abrir WhatsApp
              </a>
              <button onclick="app.actionToggleAdminPhone('${p.id}')" class="px-3 py-1.5 ${p.active ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'} text-xs font-bold rounded-lg border transition">
                ${p.active ? 'Desativar' : 'Ativar'}
              </button>
              ${phones.length > 1 ? `
                <button onclick="app.actionDeleteAdminPhone('${p.id}')" class="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Excluir Telefone">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `).join('');
      }
    }

    // 2. Histórico de Notificações Telefônicas com Paginação
    const paginated = window.logixStore.getPaginatedPhoneAlerts({
      page: this.adminPhonesAlertsPage || 1,
      pageSize: this.adminPhonesAlertsPageSize || 10
    });
    this.adminPhonesAlertsPage = paginated.currentPage;
    const alerts = paginated.items;

    if (tableBody) {
      if (paginated.totalItems === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" class="p-8 text-center text-stone-400">
              Nenhuma notificação telefônica registrada ainda. Quando qualquer cliente enviar uma solicitação de frete ou cotação, o registro do alerta aparecerá aqui.
            </td>
          </tr>
        `;
        if (paginationEl) paginationEl.innerHTML = '';
      } else {
        tableBody.innerHTML = alerts.map(a => `
          <tr class="hover:bg-stone-50 transition">
            <td class="p-3.5 font-sans">
              <span class="font-bold text-stone-900 block">${new Date(a.timestamp).toLocaleDateString('pt-BR')}</span>
              <span class="text-[10px] text-stone-400">${new Date(a.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </td>
            <td class="p-3.5">
              <span class="font-mono font-bold text-wine-950">${a.quoteId}</span>
              <span class="block text-[9px] text-stone-400 uppercase font-semibold">${a.eventType === 'reanalysis_requested' ? 'Reanálise' : a.eventType === 'test_alert' ? 'Teste de Alerta' : 'Nova Solicitação'}</span>
            </td>
            <td class="p-3.5">
              <span class="font-bold text-stone-800">${this.escapeHtml(a.clientName || 'Cliente')}</span>
              ${a.clientPhone ? `<span class="block text-[10px] text-stone-400">${this.escapeHtml(a.clientPhone)}</span>` : ''}
            </td>
            <td class="p-3.5">
              <span class="font-bold text-stone-800">${this.escapeHtml(a.phoneName || 'Admin')}</span>
              <span class="block font-mono text-[11px] text-emerald-800 font-bold">${this.escapeHtml(a.phoneNumber)}</span>
            </td>
            <td class="p-3.5">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                WhatsApp & SMS
              </span>
            </td>
            <td class="p-3.5">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 flex items-center gap-1 w-max">
                <i data-lucide="check-check" class="w-3 h-3 text-emerald-600"></i> Despachado
              </span>
            </td>
            <td class="p-3.5 text-right">
              <a href="${a.whatsappUrl}" target="_blank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1 shadow-xs">
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> Abrir WhatsApp
              </a>
            </td>
          </tr>
        `).join('');

        this.renderAdminPhoneAlertsPagination(paginated);
      }
    }

    // Carregar URL de Webhook salva para disparo automático de WhatsApp/SMS
    const webhookInput = document.getElementById('admin-webhook-url');
    if (webhookInput) {
      webhookInput.value = window.logixStore.getAdminWebhookUrl();
    }

    lucide.createIcons();
  }

  setAdminPhoneAlertsPage(page) {
    this.adminPhonesAlertsPage = page;
    this.renderAdminPhones();
  }

  setAdminPhoneAlertsPageSize(size) {
    this.adminPhonesAlertsPageSize = parseInt(size, 10) || 10;
    this.adminPhonesAlertsPage = 1;
    this.renderAdminPhones();
  }

  renderAdminPhoneAlertsPagination(p) {
    const container = document.getElementById('admin-phone-alerts-pagination');
    if (!container) return;

    container.innerHTML = `
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-stone-500">
          Exibindo <strong>${p.totalItems === 0 ? 0 : p.startIndex + 1}</strong> a <strong>${p.endIndex}</strong> de <strong>${p.totalItems}</strong> alertas
        </span>
        <span class="text-stone-300">|</span>
        <label class="flex items-center gap-1.5 text-xs text-stone-500">
          <span>Por página:</span>
          <select onchange="app.setAdminPhoneAlertsPageSize(this.value)" class="text-xs px-2 py-1 bg-white border border-stone-300 rounded focus:outline-none font-semibold text-stone-700">
            <option value="5" ${p.pageSize === 5 ? 'selected' : ''}>5</option>
            <option value="10" ${p.pageSize === 10 ? 'selected' : ''}>10</option>
            <option value="25" ${p.pageSize === 25 ? 'selected' : ''}>25</option>
            <option value="50" ${p.pageSize === 50 ? 'selected' : ''}>50</option>
          </select>
        </label>
      </div>

      <div class="flex items-center gap-1.5">
        <button onclick="app.setAdminPhoneAlertsPage(${p.currentPage - 1})" ${!p.hasPrevPage ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 bg-stone-100 text-stone-500 rounded-lg text-xs font-semibold flex items-center gap-1"' : 'class="px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-xs"'}>
          <i data-lucide="chevron-left" class="w-3.5 h-3.5"></i> Anterior
        </button>

        <span class="px-3 py-1 bg-wine-900 text-white font-bold rounded-lg text-xs">
          ${p.currentPage} / ${p.totalPages}
        </span>

        <button onclick="app.setAdminPhoneAlertsPage(${p.currentPage + 1})" ${!p.hasNextPage ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 bg-stone-100 text-stone-500 rounded-lg text-xs font-semibold flex items-center gap-1"' : 'class="px-2.5 py-1 bg-white hover:bg-stone-200 border border-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-xs"'}>
          Próxima <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
  }

    lucide.createIcons();
  }

  openAdminPhoneModal() {
    document.getElementById('modal-admin-phone').classList.remove('hidden');
    document.getElementById('admin-phone-error').classList.add('hidden');
    document.getElementById('admin-phone-name').value = '';
    document.getElementById('admin-phone-number').value = '';
    lucide.createIcons();
  }

  closeAdminPhoneModal() {
    document.getElementById('modal-admin-phone').classList.add('hidden');
  }

  handleAdminPhoneSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('admin-phone-name').value.trim();
    const number = document.getElementById('admin-phone-number').value.trim();
    const whatsapp = document.getElementById('admin-phone-whatsapp').checked;
    const sms = document.getElementById('admin-phone-sms').checked;

    try {
      window.logixStore.addAdminPhone({ name, number, whatsapp, sms });
      this.closeAdminPhoneModal();
      this.renderAdminPhones();
      this.showToast('Telefone de administrador cadastrado com sucesso!', 'success');
    } catch (err) {
      document.getElementById('admin-phone-error-text').textContent = err.message;
      document.getElementById('admin-phone-error').classList.remove('hidden');
    }
  }

  actionToggleAdminPhone(id) {
    window.logixStore.toggleAdminPhone(id);
    this.renderAdminPhones();
    this.showToast('Status do telefone atualizado.', 'info');
  }

  actionDeleteAdminPhone(id) {
    if (confirm('Deseja realmente remover este telefone das notificações de cotação?')) {
      try {
        window.logixStore.deleteAdminPhone(id);
        this.renderAdminPhones();
        this.showToast('Telefone removido com sucesso.', 'info');
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    }
  }

  clearPhoneAlertsHistory() {
    if (confirm('Deseja limpar todo o histórico de notificações telefônicas despachadas?')) {
      window.logixStore.clearPhoneAlertsLog();
      this.renderAdminPhones();
      this.showToast('Histórico de alertas limpo.', 'info');
    }
  }

  testAdminPhoneAlert() {
    const demoQuote = {
      id: `COT-${Math.floor(1000 + Math.random() * 9000)}`,
      modality: 'rodoviario',
      clientName: 'Cliente Demonstração Alerta',
      clientPhone: '+55 41 99655-2323',
      clientEmail: 'contato@top10cargas.com',
      origin: 'Curitiba / PR - CEP 80420-010',
      destination: 'São Paulo / SP - CEP 01310-200',
      packageCount: 3,
      weight: 18.5,
      dimensions: { length: 45, width: 35, height: 30 },
      description: 'Caixa de demonstração para conferência de notificação no telefone',
      declaredValue: 2400.00
    };

    const alerts = window.logixStore.notifyAdminPhones(demoQuote, 'test_alert');
    this.playNotificationChime();
    this.renderAdminPhones();
    this.showToast(`Notificação disparada com sucesso para ${alerts.length} telefone(s) de administradores!`, 'success');
  }

  saveAdminWebhookUrl() {
    const input = document.getElementById('admin-webhook-url');
    if (!input) return;
    const val = input.value.trim();
    window.logixStore.setAdminWebhookUrl(val);
    if (val) {
      this.showToast('URL de Webhook salva! Notificações automáticas ativadas para os telefones dos administradores.', 'success');
    } else {
      this.showToast('Webhook removido. As notificações ocorrerão via links diretos de WhatsApp e SMS.', 'info');
    }
  }

  testAdminWebhook() {
    const input = document.getElementById('admin-webhook-url');
    const val = input ? input.value.trim() : '';
    if (!val) {
      this.showToast('Informe a URL do Webhook antes de realizar o teste.', 'warning');
      return;
    }
    window.logixStore.setAdminWebhookUrl(val);
    this.testAdminPhoneAlert();
  }

  // --- UPLOAD E GERENCIAMENTO DE FOTO DE PERFIL (BASE64) ---
  handleProfilePhotoSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).', 'error');
      return;
    }
    const user = window.logixStore.currentUser;
    if (!user) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      window.logixStore.updateUserAvatar(user.id, base64);
      this.showToast('Foto de perfil atualizada com sucesso!', 'success');
      this.render();
    };
    reader.readAsDataURL(file);
  }

  handleRegisterAvatarSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      this.currentRegisterAvatar = event.target.result;
      const previewImg = document.getElementById('reg-avatar-preview');
      const placeholder = document.getElementById('reg-avatar-placeholder');
      const removeBtn = document.getElementById('reg-avatar-remove-btn');
      if (previewImg && placeholder) {
        previewImg.src = this.currentRegisterAvatar;
        previewImg.classList.remove('hidden');
        placeholder.classList.add('hidden');
        removeBtn?.classList.remove('hidden');
      }
    };
    reader.readAsDataURL(file);
  }

  removeRegisterAvatar() {
    this.currentRegisterAvatar = null;
    const fileInput = document.getElementById('reg-avatar-file');
    const previewImg = document.getElementById('reg-avatar-preview');
    const placeholder = document.getElementById('reg-avatar-placeholder');
    const removeBtn = document.getElementById('reg-avatar-remove-btn');
    if (fileInput) fileInput.value = '';
    if (previewImg) {
      previewImg.src = '';
      previewImg.classList.add('hidden');
    }
    if (placeholder) placeholder.classList.remove('hidden');
    if (removeBtn) removeBtn.classList.add('hidden');
  }

  // --- LAN MESSENGER, WIDGET FLUTUANTE & FALE CONOSCO ---
  updateChatUnreadBadges() {
    const user = window.logixStore.currentUser;
    const adminId = 'user_admin_top10';
    const floatingContainer = document.getElementById('floating-chat-container');
    const floatingBadge = document.getElementById('floating-chat-badge');

    if (!user) {
      if (floatingContainer) floatingContainer.classList.add('hidden');
      return;
    }

    if (user.role === 'admin') {
      if (floatingContainer) floatingContainer.classList.add('hidden');
      const unreadCount = window.logixStore.getUnreadMessagesCount(adminId);
      const adminBadge = document.getElementById('admin-chat-unread-badge');
      if (adminBadge) {
        if (unreadCount > 0) {
          adminBadge.textContent = unreadCount;
          adminBadge.classList.remove('hidden');
        } else {
          adminBadge.classList.add('hidden');
        }
      }
    } else {
      // Usuário cliente autenticado: exibir widget flutuante
      if (floatingContainer) floatingContainer.classList.remove('hidden');

      const unreadCount = window.logixStore.getUnreadMessagesCount(user.id, adminId);
      const dot = document.getElementById('nav-chat-unread-dot');
      const clientBadge = document.getElementById('client-chat-unread-badge');

      if (dot) {
        if (unreadCount > 0) dot.classList.remove('hidden');
        else dot.classList.add('hidden');
      }

      if (clientBadge) {
        if (unreadCount > 0) {
          clientBadge.textContent = unreadCount;
          clientBadge.classList.remove('hidden');
        } else {
          clientBadge.classList.add('hidden');
        }
      }

      if (floatingBadge) {
        if (unreadCount > 0) {
          floatingBadge.textContent = unreadCount;
          floatingBadge.classList.remove('hidden');
        } else {
          floatingBadge.classList.add('hidden');
        }
      }

      // Se a janela flutuante estiver aberta, renderizar novas mensagens
      const floatingWindow = document.getElementById('floating-chat-window');
      if (floatingWindow && !floatingWindow.classList.contains('hidden')) {
        this.renderFloatingChat();
      }
    }
  }

  toggleFloatingChat() {
    const user = window.logixStore.currentUser;
    if (!user) {
      this.openAuthModal('login');
      return;
    }

    const floatingWindow = document.getElementById('floating-chat-window');
    const iconOpen = document.getElementById('floating-chat-toggle-icon');
    const iconClose = document.getElementById('floating-chat-close-icon');

    if (!floatingWindow) return;
    const isHidden = floatingWindow.classList.contains('hidden');

    if (isHidden) {
      floatingWindow.classList.remove('hidden');
      iconOpen?.classList.add('hidden');
      iconClose?.classList.remove('hidden');
      this.renderFloatingChat();
      window.logixStore.markChatAsRead(user.id, 'user_admin_top10');
      this.updateChatUnreadBadges();
      setTimeout(() => {
        document.getElementById('floating-chat-input')?.focus();
      }, 100);
    } else {
      floatingWindow.classList.add('hidden');
      iconOpen?.classList.remove('hidden');
      iconClose?.classList.add('hidden');
    }
  }

  renderFloatingChat() {
    const user = window.logixStore.currentUser;
    if (!user) return;
    const adminId = 'user_admin_top10';

    const messages = window.logixStore.getMessagesBetween(user.id, adminId);
    const container = document.getElementById('floating-chat-messages');
    if (!container) return;

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-stone-400 text-center py-8">
          <div class="w-10 h-10 rounded-xl bg-wine-50 text-wine-900 flex items-center justify-center mb-2 border border-wine-100">
            <i data-lucide="message-square" class="w-5 h-5"></i>
          </div>
          <h6 class="font-bold text-wine-950 text-xs">Chat de Atendimento Top10</h6>
          <p class="text-stone-500 text-[11px] max-w-xs mt-1">
            Envie sua dúvida ou mensagem. Nosso operador responderá em instantes!
          </p>
        </div>
      `;
    } else {
      container.innerHTML = messages.map(m => {
        const isMe = m.senderId === user.id;
        const timeStr = new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in">
            ${!isMe ? `
              <div class="w-7 h-7 rounded-lg bg-yellowbrand-400 text-wine-950 flex items-center justify-center font-bold text-[10px] flex-shrink-0 shadow-xs">
                <i data-lucide="headphones" class="w-3.5 h-3.5"></i>
              </div>
            ` : ''}
            <div class="max-w-[80%] space-y-0.5">
              <div class="flex items-center gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}">
                <span class="text-[9px] font-bold text-stone-500">${this.escapeHtml(m.senderName)}</span>
                <span class="text-[8px] text-stone-400">${timeStr}</span>
              </div>
              <div class="p-2.5 rounded-xl ${isMe ? 'bg-wine-900 text-white rounded-br-none shadow-xs' : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none shadow-xs'}">
                <p class="text-[11px] leading-relaxed whitespace-pre-wrap">${this.escapeHtml(m.text)}</p>
              </div>
            </div>
            ${isMe ? `
              ${user.avatar ? `
                <img src="${user.avatar}" alt="${this.escapeHtml(user.name)}" class="w-7 h-7 rounded-lg object-cover border border-wine-200 shadow-xs flex-shrink-0">
              ` : `
                <div class="w-7 h-7 rounded-lg bg-wine-100 text-wine-900 flex items-center justify-center font-bold text-[10px] flex-shrink-0 shadow-xs">
                  ${user.name.charAt(0).toUpperCase()}
                </div>
              `}
            ` : ''}
          </div>
        `;
      }).join('');
    }

    container.scrollTop = container.scrollHeight;
    lucide.createIcons();
  }

  handleFloatingSendMessage(e) {
    e.preventDefault();
    const user = window.logixStore.currentUser;
    if (!user) return;
    const input = document.getElementById('floating-chat-input');
    const text = input.value.trim();
    if (!text) return;

    window.logixStore.sendMessage({
      senderId: user.id,
      senderName: user.name,
      senderRole: 'client',
      recipientId: 'user_admin_top10',
      text
    });

    input.value = '';
    this.renderFloatingChat();
    if (this.currentClientTab === 'chat') {
      this.renderClientChat();
    }
  }

  openClientChatTab() {
    if (this.currentView !== 'client_dashboard') {
      this.navigateTo('client_dashboard');
    }
    this.setClientTab('chat');
  }

  handleNavContatoClick(e) {
    const user = window.logixStore.currentUser;
    if (user) {
      e.preventDefault();
      if (user.role === 'admin') {
        this.navigateTo('admin_dashboard');
        this.setAdminTab('chat');
      } else {
        this.openClientChatTab();
      }
    }
  }

  handleContactChatClick() {
    const user = window.logixStore.currentUser;
    if (!user) {
      this.showToast('Faça login ou cadastre-se para iniciar o chat com o Administrador.', 'info');
      this.openAuthModal('login');
      return;
    }
    if (user.role === 'admin') {
      this.navigateTo('admin_dashboard');
      this.setAdminTab('chat');
    } else {
      this.openClientChatTab();
    }
  }

  renderClientChat(scrollToBottom = true) {
    const user = window.logixStore.currentUser;
    if (!user) return;
    const adminId = 'user_admin_top10';

    // Marcar mensagens do admin para o cliente como lidas
    window.logixStore.markChatAsRead(user.id, adminId);
    this.updateChatUnreadBadges();

    // Carga diferida (lazy-loading): busca apenas o lote mais recente
    this.clientChatLimit = this.clientChatLimit || 15;
    const pResult = window.logixStore.getPaginatedMessages(user.id, adminId, { limit: this.clientChatLimit });
    const messages = pResult.messages;
    const container = document.getElementById('client-chat-messages');
    if (!container) return;

    if (pResult.total === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-stone-400 text-center py-10">
          <div class="w-12 h-12 rounded-2xl bg-wine-50 text-wine-900 flex items-center justify-center mb-3 border border-wine-100">
            <i data-lucide="message-square" class="w-6 h-6"></i>
          </div>
          <h5 class="font-bold text-wine-950 text-sm">Inicie sua conversa com o Suporte Top10</h5>
          <p class="text-stone-500 text-xs max-w-sm mt-1">
            Envie suas dúvidas sobre frete rodoviário, aéreo, cotações personalizadas ou rastreamento. Responderemos em tempo real!
          </p>
        </div>
      `;
    } else {
      let loadMoreHtml = '';
      if (pResult.hasMore) {
        loadMoreHtml = `
          <div class="text-center py-2 sticky top-0 z-10">
            <button onclick="app.loadMoreClientMessages()" class="px-3.5 py-1.5 bg-white hover:bg-wine-50 text-wine-900 border border-wine-200 rounded-full text-[11px] font-bold shadow-sm transition inline-flex items-center gap-1.5">
              <i data-lucide="history" class="w-3.5 h-3.5 text-wine-800"></i> Carregar mensagens anteriores (${pResult.remaining} mais)
            </button>
          </div>
        `;
      }

      container.innerHTML = loadMoreHtml + messages.map(m => {
        const isMe = m.senderId === user.id;
        const timeStr = new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in">
            ${!isMe ? `
              <div class="w-8 h-8 rounded-xl bg-yellowbrand-400 text-wine-950 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                <i data-lucide="headphones" class="w-4 h-4"></i>
              </div>
            ` : ''}
            <div class="max-w-[78%] sm:max-w-[65%] space-y-1">
              <div class="flex items-center gap-2 ${isMe ? 'justify-end' : 'justify-start'}">
                <span class="text-[10px] font-bold text-stone-500">${this.escapeHtml(m.senderName)}</span>
                <span class="text-[9px] text-stone-400">${timeStr}</span>
              </div>
              <div class="p-3.5 rounded-2xl ${isMe ? 'bg-wine-900 text-white rounded-br-none shadow-sm' : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none shadow-xs'}">
                <p class="text-xs leading-relaxed whitespace-pre-wrap">${this.escapeHtml(m.text)}</p>
              </div>
            </div>
            ${isMe ? `
              ${user.avatar ? `
                <img src="${user.avatar}" alt="${this.escapeHtml(user.name)}" class="w-8 h-8 rounded-xl object-cover border border-wine-200 shadow-xs flex-shrink-0">
              ` : `
                <div class="w-8 h-8 rounded-xl bg-wine-100 text-wine-900 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                  ${user.name.charAt(0).toUpperCase()}
                </div>
              `}
            ` : ''}
          </div>
        `;
      }).join('');
    }

    if (scrollToBottom) {
      container.scrollTop = container.scrollHeight;
    }
    lucide.createIcons();
  }

  loadMoreClientMessages() {
    this.clientChatLimit = (this.clientChatLimit || 15) + 15;
    this.renderClientChat(false);
  }

  handleClientSendMessage(e) {
    e.preventDefault();
    const user = window.logixStore.currentUser;
    if (!user) return;
    const input = document.getElementById('client-chat-input');
    const text = input.value.trim();
    if (!text) return;

    window.logixStore.sendMessage({
      senderId: user.id,
      senderName: user.name,
      senderRole: 'client',
      recipientId: 'user_admin_top10',
      text
    });

    input.value = '';
    this.renderClientChat();
    this.showToast('Mensagem enviada!', 'info');
  }

  renderAdminChat() {
    const conversations = window.logixStore.getConversationsForAdmin();
    const contactsListEl = document.getElementById('admin-chat-contacts-list');
    const totalEl = document.getElementById('admin-chat-total-clients');
    if (totalEl) totalEl.textContent = `${conversations.length} clientes`;

    if (!contactsListEl) return;

    if (conversations.length === 0) {
      contactsListEl.innerHTML = `
        <div class="p-6 text-center text-stone-400 text-xs">
          Nenhum cliente cadastrado no sistema ainda.
        </div>
      `;
    } else {
      if (!this.currentChatRecipientId && conversations.length > 0) {
        this.currentChatRecipientId = conversations[0].client.id;
      }

      contactsListEl.innerHTML = conversations.map(c => {
        const isSelected = c.client.id === this.currentChatRecipientId;
        const timeStr = new Date(c.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return `
          <div onclick="app.selectAdminChatClient('${c.client.id}')" class="p-3 cursor-pointer transition flex items-center gap-3 ${isSelected ? 'bg-wine-100/70 border-r-4 border-wine-800' : 'hover:bg-stone-100'}">
            <div class="relative flex-shrink-0">
              ${c.client.avatar ? `
                <img src="${c.client.avatar}" alt="${this.escapeHtml(c.client.name)}" class="w-10 h-10 rounded-xl object-cover border border-stone-300 shadow-xs">
              ` : `
                <div class="w-10 h-10 rounded-xl bg-wine-900 text-yellowbrand-400 flex items-center justify-center font-bold text-sm shadow-xs">
                  ${c.client.name.charAt(0).toUpperCase()}
                </div>
              `}
              <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div class="flex-grow min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <h5 class="font-bold text-xs text-slate-900 truncate">${this.escapeHtml(c.client.name)}</h5>
                <span class="text-[9px] text-stone-400">${timeStr}</span>
              </div>
              <p class="text-[11px] text-stone-500 truncate">${this.escapeHtml(c.lastMessage)}</p>
            </div>
            ${c.unreadCount > 0 ? `
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-wine-800 text-yellowbrand-300 flex-shrink-0 animate-pulse">
                ${c.unreadCount}
              </span>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    // Renderizar conversa ativa
    const activeClient = window.logixStore.users.find(u => u.id === this.currentChatRecipientId);
    const headerName = document.getElementById('admin-chat-header-name');
    const headerMeta = document.getElementById('admin-chat-header-meta');
    const headerAvatar = document.getElementById('admin-chat-header-avatar');
    const headerBadge = document.getElementById('admin-chat-header-badge');
    const chatInput = document.getElementById('admin-chat-input');
    const sendBtn = document.getElementById('btn-admin-chat-send');
    const messagesContainer = document.getElementById('admin-chat-messages');

    if (!activeClient || !messagesContainer) return;

    // Marcar mensagens do cliente como lidas pelo admin
    window.logixStore.markChatAsRead('user_admin_top10', activeClient.id);
    this.updateChatUnreadBadges();

    // Atualizar header
    if (headerName) headerName.textContent = activeClient.name;
    if (headerMeta) headerMeta.textContent = `${activeClient.email} ${activeClient.company ? '• ' + activeClient.company : ''} ${activeClient.phone ? '• ' + activeClient.phone : ''}`;
    if (headerBadge) {
      headerBadge.textContent = activeClient.role === 'admin' ? 'Administrador' : 'Cliente';
      headerBadge.className = activeClient.role === 'admin' ? 'text-[9px] px-2 py-0.5 rounded-full font-semibold bg-yellowbrand-200 text-wine-950' : 'text-[9px] px-2 py-0.5 rounded-full font-semibold bg-stone-200 text-stone-800';
      headerBadge.classList.remove('hidden');
    }
    if (headerAvatar) {
      if (activeClient.avatar) {
        headerAvatar.innerHTML = `<img src="${activeClient.avatar}" alt="${this.escapeHtml(activeClient.name)}" class="w-full h-full object-cover">`;
      } else {
        headerAvatar.innerHTML = `<span class="font-bold text-wine-900">${activeClient.name.charAt(0).toUpperCase()}</span>`;
      }
    }

    // Habilitar input
    if (chatInput) {
      chatInput.disabled = false;
      chatInput.placeholder = `Escreva uma resposta para ${activeClient.name}...`;
    }
    if (sendBtn) sendBtn.disabled = false;

    // Renderizar mensagens com suporte a carga diferida (lazy loading)
    this.adminChatLimit = this.adminChatLimit || 15;
    const pResult = window.logixStore.getPaginatedMessages('user_admin_top10', activeClient.id, { limit: this.adminChatLimit });
    const messages = pResult.messages;

    if (pResult.total === 0) {
      messagesContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-stone-400 text-center py-10">
          <i data-lucide="message-square" class="w-8 h-8 mb-2 opacity-40"></i>
          <p class="font-bold text-xs text-stone-600">Nenhuma mensagem com ${this.escapeHtml(activeClient.name)}</p>
          <p class="text-[11px] mt-1 text-stone-400">Envie uma mensagem abaixo para iniciar o atendimento.</p>
        </div>
      `;
    } else {
      let loadMoreHtml = '';
      if (pResult.hasMore) {
        loadMoreHtml = `
          <div class="text-center py-2 sticky top-0 z-10">
            <button onclick="app.loadMoreAdminMessages()" class="px-3.5 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-full text-[11px] font-bold shadow-sm transition inline-flex items-center gap-1.5">
              <i data-lucide="history" class="w-3.5 h-3.5 text-wine-800"></i> Carregar mensagens anteriores (${pResult.remaining} mais)
            </button>
          </div>
        `;
      }

      messagesContainer.innerHTML = loadMoreHtml + messages.map(m => {
        const isMe = m.senderId === 'user_admin_top10' || m.senderRole === 'admin';
        const timeStr = new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in">
            ${!isMe ? `
              ${activeClient.avatar ? `
                <img src="${activeClient.avatar}" alt="${this.escapeHtml(activeClient.name)}" class="w-8 h-8 rounded-xl object-cover border border-stone-300 shadow-xs flex-shrink-0">
              ` : `
                <div class="w-8 h-8 rounded-xl bg-stone-200 text-stone-800 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                  ${activeClient.name.charAt(0).toUpperCase()}
                </div>
              `}
            ` : ''}
            <div class="max-w-[78%] sm:max-w-[65%] space-y-1">
              <div class="flex items-center gap-2 ${isMe ? 'justify-end' : 'justify-start'}">
                <span class="text-[10px] font-bold text-stone-500">${this.escapeHtml(m.senderName)}</span>
                <span class="text-[9px] text-stone-400">${timeStr}</span>
              </div>
              <div class="p-3.5 rounded-2xl ${isMe ? 'bg-wine-900 text-white rounded-br-none shadow-sm' : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none shadow-xs'}">
                <p class="text-xs leading-relaxed whitespace-pre-wrap">${this.escapeHtml(m.text)}</p>
              </div>
            </div>
            ${isMe ? `
              <div class="w-8 h-8 rounded-xl bg-yellowbrand-400 text-wine-950 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    if (scrollToBottom) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    lucide.createIcons();
  }

  loadMoreAdminMessages() {
    this.adminChatLimit = (this.adminChatLimit || 15) + 15;
    this.renderAdminChat(false);
  }

  selectAdminChatClient(clientId) {
    this.currentChatRecipientId = clientId;
    this.adminChatLimit = 15;
    this.renderAdminChat(true);
  }

  handleAdminSendMessage(e) {
    e.preventDefault();
    if (!this.currentChatRecipientId) return;
    const input = document.getElementById('admin-chat-input');
    const text = input.value.trim();
    if (!text) return;

    window.logixStore.sendMessage({
      senderId: 'user_admin_top10',
      senderName: 'Top 10 Cargas (Suporte)',
      senderRole: 'admin',
      recipientId: this.currentChatRecipientId,
      text
    });

    input.value = '';
    this.renderAdminChat(true);
  }

  filterAdminChatContacts() {
    const query = document.getElementById('admin-chat-search')?.value.toLowerCase() || '';
    const items = document.querySelectorAll('#admin-chat-contacts-list > div');
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(query) ? '' : 'none';
    });
  }

  // --- REQUISITO 3: AÇÃO DE LIMPEZA DE DADOS TEMPORÁRIOS ---
  actionRunTemporaryDataCleanup() {
    try {
      const result = window.logixStore.cleanupTemporaryData({ cleanupGuestQuotes: true });
      const stats = result.stats;
      this.showToast(`Limpeza executada com sucesso! ${stats.totalRemoved} registros temporários liberados (Cache: ${stats.tempCacheRemoved}, Códigos: ${stats.resetCodesRemoved}, Alertas: ${stats.alertsRemoved}, Notificações: ${stats.notificationsRemoved}).`, 'success');
      this.renderAdminDashboard();
    } catch (err) {
      this.showToast('Erro ao executar limpeza: ' + err.message, 'error');
    }
  }
}

window.app = new App();

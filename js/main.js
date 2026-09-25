document.addEventListener('DOMContentLoaded', () => {
    try {
        if (window.sigeDB && typeof window.sigeDB.init === 'function') {
            window.sigeDB.init();
        }
        renderPortalAuth();
        updateActionPillars();
        loadSystems();
    } catch (err) {
        console.error("Erro ao inicializar portal IntegraRizzi:", err);
    }
});

const defaultSystems = [
    {
        id: "op",
        moduloKey: "op",
        title: "Orientação Educacional (OE)",
        iconClass: "fa-solid fa-heart-pulse",
        bgClass: "theme-emerald",
        tag: "ATENDIMENTOS & PRONTUÁRIOS",
        description: "Gestão da agenda semanal de atendimento com 4 vagas/turno, prontuário único do aluno e emissão de declarações.",
        url: "sistema-gestao.html?aba=op",
        status: "online",
        badge: "CORE SIGE",
        isLive: true
    },
    {
        id: "mural",
        moduloKey: "mural",
        title: "Mural de Recados & Avisos",
        iconClass: "fa-solid fa-bullhorn",
        bgClass: "theme-blue",
        tag: "COMUNICAÇÃO INTERNA",
        description: "Mural colaborativo de informes, comunicados urgentes, calendário e alinhamentos pedagógicos da equipe escolar.",
        url: "sistema-gestao.html?aba=mural",
        status: "online",
        badge: "CORE SIGE",
        isLive: true
    },
    {
        id: "supervisao",
        moduloKey: "supervisao",
        title: "Supervisão Escolar & Diário",
        iconClass: "fa-solid fa-book-open-reader",
        bgClass: "theme-purple",
        tag: "PEDAGÓGICO & OCORRÊNCIAS",
        description: "Supervisão pedagógica de turmas, ocorrências docentes, planejamento curricular e apoio aos professores.",
        url: "sistema-gestao.html?aba=supervisao",
        status: "online",
        badge: "CORE SIGE",
        isLive: true
    },
    {
        id: "direcao",
        moduloKey: "direcao",
        title: "Direção Escolar & Gestão",
        iconClass: "fa-solid fa-crown",
        bgClass: "theme-amber",
        tag: "GESTÃO INSTITUCIONAL",
        description: "Visão estratégica, demandas da secretaria, encaminhamentos à SME e relatórios executivos da unidade.",
        url: "sistema-gestao.html?aba=direcao",
        status: "online",
        badge: "CORE SIGE",
        isLive: true
    },
    {
        id: "uniformes",
        moduloKey: "uniformes",
        title: "Controle de Uniformes",
        iconClass: "fa-solid fa-shirt",
        bgClass: "theme-cyan",
        tag: "LOGÍSTICA & ENTREGAS",
        description: "Gestão de pedidos de uniformes, remessas para a SME, estoque local e emissão de listas de entrega por turma com assinatura.",
        url: "sistema-gestao.html?aba=uniformes",
        status: "online",
        badge: "NOVO MÓDULO",
        isLive: true
    },
    {
        id: "desenvolvedor",
        moduloKey: "dev",
        title: "Desenvolvedor & Acessos",
        iconClass: "fa-solid fa-shield-halved",
        bgClass: "theme-purple",
        tag: "RBAC & CONTROLE TOTAL",
        description: "Painel exclusivo para controle de permissões por módulo (RBAC), auditoria e gestão da equipe escolar.",
        url: "sistema-gestao.html?aba=dev",
        status: "online",
        badge: "DEV / TI",
        isLive: true
    },
    {
        id: "recursos",
        moduloKey: "ext_recursos",
        title: "Agendamento de Recursos & Lab",
        iconClass: "fa-solid fa-calendar-check",
        bgClass: "theme-orange",
        tag: "RESERVA DE ESPAÇOS",
        description: "Reserva de horários para uso do Laboratório de Informática, projetores, auditório e recursos tecnológicos da escola.",
        url: "https://elcortelini.github.io/agendamento-cepr/",
        status: "online",
        badge: "EXTERNO",
        isLive: true
    },
    {
        id: "dashboard",
        moduloKey: "ext_dashboard",
        title: "Dashboard de Avaliação",
        iconClass: "fa-solid fa-chart-line",
        bgClass: "theme-emerald",
        tag: "PESQUISA & DIAGNÓSTICO",
        description: "Análise gráfica e estatística em tempo real da pesquisa de avaliação dos estudantes (6º ao 8º Ano).",
        url: "dashboard.html",
        status: "online",
        badge: "TEMPO REAL",
        isLive: true
    },
    {
        id: "contabil",
        moduloKey: "ext_contabil",
        title: "Sistema Contábil (APMF)",
        iconClass: "fa-solid fa-calculator",
        bgClass: "theme-blue",
        tag: "GESTÃO FINANCEIRA",
        description: "Controle de receitas, despesas, fluxo de caixa e prestação de contas da APMF da escola.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    },
    {
        id: "biblioteca",
        moduloKey: "ext_biblioteca",
        title: "Sistema da Biblioteca",
        iconClass: "fa-solid fa-book-bookmark",
        bgClass: "theme-rose",
        tag: "ACERVO DIGITAL",
        description: "Gestão do acervo escolar, controle de empréstimos, devoluções e pesquisas acadêmicas.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    },
    {
        id: "patrimonio",
        moduloKey: "ext_patrimonio",
        title: "Sistema de Patrimônio",
        iconClass: "fa-solid fa-boxes-stacked",
        bgClass: "theme-orange",
        tag: "CONTROLE PATRIMONIAL",
        description: "Inventário de bens, móveis, equipamentos tecnológicos, tombamento e gestão de ativos.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    }
];

function getCustomSystems() {
    try {
        return JSON.parse(localStorage.getItem('pedro_rizzi_custom_systems') || '[]');
    } catch (e) {
        return [];
    }
}

// Renderiza a autenticação tanto na barra superior quanto no card central
function renderPortalAuth() {
    renderPortalAuthBar();
    renderPortalAuthHeroCard();
}

// 1. Barra Compacta Superior
function renderPortalAuthBar() {
    const authBar = document.getElementById('portalAuthBar');
    if (!authBar) return;

    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;

    if (loggedUser) {
        // Se o usuário logado ainda não concluiu o cadastro obrigatório (WhatsApp + consentimento)
        if (!loggedUser.cadastroCompleto) {
            setTimeout(() => {
                abrirModalOnboardingCadastro(loggedUser);
            }, 100);
        }

        const isDev = loggedUser.role === "desenvolvedor";
        const activeRole = window.sigeDB ? window.sigeDB.getRole() : loggedUser.role;
        const isSimulating = isDev && activeRole !== "desenvolvedor";
        const modulosKeys = ['op', 'mural', 'supervisao', 'direcao', 'uniformes', 'admin'];
        const allowedCount = modulosKeys.filter(k => window.sigeDB.temPermissaoModulo(k)).length;
        const cargoText = loggedUser.cargo || getRoleLabel(loggedUser.role);
        const pendentes = isDev && window.sigeDB ? window.sigeDB.getUsuariosPendentes() : [];

        authBar.innerHTML = `
            <div class="portal-user-badge">
                <div class="portal-avatar-mini" title="${loggedUser.nome}">
                    <i class="${getRoleIcon(loggedUser.role)}"></i>
                </div>
                <div class="portal-user-meta">
                    <span style="font-weight:800; color:#ffffff;">${loggedUser.nome}</span>
                    <span class="portal-role-pill">${cargoText}</span>
                    ${isSimulating ? `
                        <span style="background:#f59e0b; color:#0f172a; font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:10px;">
                            <i class="fa-solid fa-eye"></i> Simulando: ${getRoleLabel(activeRole)}
                        </span>
                    ` : ''}
                    <span style="color:#4ade80; font-size:0.75rem; font-weight:700;"><i class="fa-solid fa-shield-halved"></i> ${allowedCount}/6 módulos liberados</span>
                </div>
            </div>
            <div class="portal-auth-actions">
                ${isDev && pendentes.length > 0 ? `
                    <a href="sistema-gestao.html?aba=admin#adminPendingUsersCard" style="background:#f59e0b; color:#0f172a; font-weight:800; padding:4px 10px; border-radius:8px; font-size:0.75rem; text-decoration:none; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 8px rgba(245,158,11,0.3);" title="Clique para gerenciar acessos pendentes">
                        <i class="fa-solid fa-user-clock"></i> ${pendentes.length} Pendente(s)
                    </a>
                ` : ''}
                ${isDev ? `
                    <button type="button" onclick="openAddCustomSystemModal()" style="background:rgba(255,255,255,0.1); color:#4ade80; border:1px solid rgba(74,222,128,0.3); border-radius:8px; padding:4px 8px; font-size:0.75rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="Adicionar Novo Sistema ao Portal">
                        <i class="fa-solid fa-plus-circle"></i> <span>Novo Sistema</span>
                    </button>
                    <button type="button" onclick="openConfigModal()" style="background:rgba(255,255,255,0.1); color:#93c5fd; border:1px solid rgba(147,197,253,0.3); border-radius:8px; padding:4px 8px; font-size:0.75rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="Configurar Links dos Sistemas Padrão">
                        <i class="fa-solid fa-sliders"></i> <span>Links Padrão</span>
                    </button>
                ` : ''}
                ${isDev ? `
                    <div class="portal-top-dev-view" style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.08); padding:3px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.15);">
                        <label for="topDevViewSelector" style="color:#fbbf24; font-size:0.75rem; font-weight:800; display:flex; align-items:center; gap:4px; white-space:nowrap;">
                            <i class="fa-solid fa-eye"></i> Visão:
                        </label>
                        <select id="topDevViewSelector" onchange="switchDevView(this.value)" style="background:#1e293b; color:#f8fafc; border:1px solid #475569; border-radius:6px; padding:3px 8px; font-size:0.75rem; font-weight:700; cursor:pointer; outline:none;">
                            <option value="desenvolvedor" ${activeRole === 'desenvolvedor' ? 'selected' : ''}>👑 Desenvolvedor (Total)</option>
                            <option value="orientacao" ${activeRole === 'orientacao' || activeRole.startsWith('orientadora_') ? 'selected' : ''}>💜 Orientação Educacional</option>
                            <option value="supervisao" ${activeRole === 'supervisao' ? 'selected' : ''}>📚 Supervisão Escolar</option>
                            <option value="direcao" ${activeRole === 'direcao' ? 'selected' : ''}>🏛️ Direção Escolar</option>
                            <option value="uniformes" ${activeRole === 'uniformes' ? 'selected' : ''}>👕 Uniformes</option>
                            <option value="secretaria" ${activeRole === 'secretaria' ? 'selected' : ''}>📋 Secretaria</option>
                            <option value="docentes" ${activeRole === 'docentes' ? 'selected' : ''}>👨‍🏫 Docentes</option>
                            <option value="visitante" ${activeRole === 'visitante' ? 'selected' : ''}>🔒 Visitante</option>
                        </select>
                        ${isSimulating ? `
                            <button type="button" onclick="resetDevView()" style="background:#f59e0b; color:#0f172a; border:none; border-radius:6px; padding:3px 8px; font-size:0.72rem; font-weight:800; cursor:pointer;" title="Restaurar Visão Desenvolvedor">
                                <i class="fa-solid fa-rotate-left"></i> Restaurar
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
                <button type="button" onclick="portalLogout()" class="portal-btn-logout" title="Encerrar sessão e deslogar">
                    <i class="fa-solid fa-right-from-bracket"></i> Deslogar / Sair
                </button>
            </div>
        `;
    } else {
        authBar.innerHTML = `
            <div class="portal-user-badge">
                <div class="portal-avatar-mini" style="background:#475569;" title="Identificação Escolar">
                    <i class="fa-solid fa-lock"></i>
                </div>
                <div class="portal-user-meta">
                    <span style="font-weight:800; color:#f8fafc; font-size:0.85rem;">Portal IntegraRizzi — Identificação Necessária</span>
                    <span style="color:#94a3b8; font-size:0.75rem;">Faça seu login para liberar suas ferramentas e atendimentos escolares</span>
                </div>
            </div>
            <div class="portal-auth-actions">
                <button type="button" onclick="scrollToAuthCard()" class="portal-login-btn">
                    <i class="fa-solid fa-arrow-right-to-bracket"></i> Identificar-se / Login
                </button>
            </div>
        `;
    }
}

// ==========================================
// AUTENTICAÇÃO NATIVA POR CPF + DATA DE NASCIMENTO (HERO PORTAL)
// ==========================================

async function heroLoginWithCpf() {
    const cpfInput = document.getElementById('heroLoginCpfInput');
    const senhaInput = document.getElementById('heroLoginSenhaInput');
    if (!cpfInput || !senhaInput) return;
    const cpf = cpfInput.value.trim();
    const senha = senhaInput.value.trim();
    if (!cpf || !senha) {
        alert("Por favor, preencha seu CPF e sua Data de Nascimento (senha).");
        return;
    }
    if (!window.sigeDB) return;

    const res = await window.sigeDB.loginWithCpf(cpf, senha);

    if (!res.success) {
        alert(res.message);
        return;
    }

    if (res.user && (res.user.role === 'desenvolvedor' || (res.user.cpf && res.user.cpf.includes('806.037.420')))) {
        window.sigeDB.setRole('desenvolvedor');
    }

    renderPortalAuth();
    updateActionPillars();
    loadSystems();
}

function abrirModalPrimeiroAcesso() {
    const modal = document.getElementById("modalPrimeiroAcesso");
    if (!modal) return;
    const form = document.getElementById("formPrimeiroAcesso");
    if (form) form.reset();
    modal.style.display = "flex";
}

function fecharModalPrimeiroAcesso() {
    const modal = document.getElementById("modalPrimeiroAcesso");
    if (modal) modal.style.display = "none";
}

function submitPrimeiroAcesso(e) {
    if (e && e.preventDefault) e.preventDefault();
    const cpf = document.getElementById("primeiroAcessoCpf")?.value.trim() || "";
    const dataNascimento = document.getElementById("primeiroAcessoDataNascimento")?.value.trim() || "";
    const nome = document.getElementById("primeiroAcessoNome")?.value.trim() || "";
    const cargo = document.getElementById("primeiroAcessoCargo")?.value.trim() || "";
    const turno = document.getElementById("primeiroAcessoTurno")?.value || "Matutino";
    const whatsapp = document.getElementById("primeiroAcessoWhatsapp")?.value.trim() || "";
    const email = document.getElementById("primeiroAcessoEmail")?.value.trim() || "";
    const autorizaWhatsApp = document.getElementById("primeiroAcessoAutorizacaoWhatsApp")?.checked || false;

    if (!window.sigeDB) return;

    const res = window.sigeDB.cadastrarPrimeiroAcesso({
        cpf,
        dataNascimento,
        nome,
        cargo,
        turno,
        whatsapp,
        email,
        autorizaWhatsApp
    });

    if (!res.success) {
        alert(res.message);
        return;
    }

    alert(res.message);
    fecharModalPrimeiroAcesso();
}

// 2. Painel Central Hero (Apenas quando NÃO logado)
function renderPortalAuthHeroCard() {
    const card = document.getElementById('portalAuthCard');
    if (!card) return;

    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;

    if (!loggedUser) {
        card.style.display = 'block';
        // Se o formulário de login já está montado na tela, preserva para não roubar foco ou apagar o que está sendo digitado
        if (document.getElementById('heroLoginCpfInput')) {
            return;
        }
        card.innerHTML = `
            <div class="portal-login-card-inner">
                <div class="login-card-header" style="margin-bottom: 1.2rem;">
                    <div class="login-badge"><i class="fa-solid fa-shield-halved"></i> IDENTIFICAÇÃO & ACESSO SEGURO</div>
                    <h2 class="login-card-title"><i class="fa-solid fa-id-card-clip"></i> Acesso ao Portal IntegraRizzi</h2>
                    <p class="login-card-subtitle">Informe seu CPF e sua Data de Nascimento (sua senha de acesso):</p>
                </div>

                <div class="login-card-body" style="max-width:540px; margin:0 auto; width:100%;">
                    <!-- ENTRADA POR CPF E DATA DE NASCIMENTO -->
                    <form class="login-method-box" onsubmit="event.preventDefault(); heroLoginWithCpf();" style="border:none; background:transparent; padding:0; display:flex; flex-direction:column; gap:12px;">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div>
                                <label style="font-size:0.8rem; font-weight:800; color:#334155; display:block; margin-bottom:4px; text-align:left;">
                                    <i class="fa-solid fa-id-card" style="color:#2563eb;"></i> CPF:
                                </label>
                                <input type="text" id="heroLoginCpfInput" placeholder="000.000.000-00" required maxlength="14" oninput="mascaraCpfInput(this)" class="hero-login-input" style="width:100%; padding:10px 14px; font-size:0.92rem; font-weight:700; border-radius:10px; border:2px solid #cbd5e1;" />
                            </div>
                            <div>
                                <label style="font-size:0.8rem; font-weight:800; color:#334155; display:block; margin-bottom:4px; text-align:left;">
                                    <i class="fa-solid fa-lock" style="color:#2563eb;"></i> Senha (Data Nasc.):
                                </label>
                                <input type="password" id="heroLoginSenhaInput" placeholder="DD/MM/AAAA" required maxlength="10" oninput="mascaraDataInput(this)" class="hero-login-input" style="width:100%; padding:10px 14px; font-size:0.92rem; font-weight:700; border-radius:10px; border:2px solid #cbd5e1;" />
                            </div>
                        </div>

                        <button type="submit" class="hero-login-btn btn-enter-email" style="padding:12px 20px; font-size:0.95rem; font-weight:800; border-radius:10px; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:white; border:none; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 12px rgba(37,99,235,0.3); width:100%;">
                            <i class="fa-solid fa-right-to-bracket"></i> Entrar no Sistema
                        </button>
                    </form>

                    <!-- DIVISOR OU PRIMEIRO ACESSO -->
                    <div style="display:flex; align-items:center; margin:16px 0 12px 0; color:#94a3b8; font-size:0.75rem; font-weight:800; letter-spacing:0.5px;">
                        <div style="flex:1; height:1px; background:#e2e8f0;"></div>
                        <span style="padding:0 10px; text-transform:uppercase;">primeiro acesso na escola?</span>
                        <div style="flex:1; height:1px; background:#e2e8f0;"></div>
                    </div>

                    <button type="button" onclick="abrirModalPrimeiroAcesso()" style="width:100%; padding:11px; font-size:0.92rem; font-weight:800; background:#f0fdf4; color:#166534; border:2px solid #86efac; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 2px 6px rgba(22,101,52,0.08); transition:all 0.2s;">
                        <i class="fa-solid fa-user-plus"></i> Primeiro Acesso? Solicitar Cadastro
                    </button>

                    <!-- BOX DE AJUDA / SUPORTE WHATSAPP -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:12px 16px; margin-top:14px; display:flex; flex-direction:column; gap:8px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:32px; height:32px; border-radius:50%; background:#dcfce7; color:#16a34a; display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0;">
                                <i class="fa-solid fa-headset"></i>
                            </div>
                            <div style="flex:1; text-align:left;">
                                <strong style="color:#0f172a; font-size:0.85rem; display:block;">Dúvidas ou Dificuldade no Acesso?</strong>
                                <span style="font-size:0.78rem; color:#64748b; display:block;">Sua senha é sua data de nascimento (DD/MM/AAAA). Para suporte ou dúvidas, contate Elevi Cortelini:</span>
                            </div>
                        </div>
                        <div style="text-align:center;">
                            <a href="https://api.whatsapp.com/send?phone=5548996692174&text=Ol%C3%A1%20Elevi%2C%20preciso%20de%20ajuda%20para%20acessar%20o%20portal%20IntegraRizzi." target="_blank" rel="noopener noreferrer" style="background:#16a34a; color:white; font-weight:800; font-size:0.82rem; padding:7px 14px; border-radius:8px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                                <i class="fa-brands fa-whatsapp"></i> Suporte WhatsApp: (48) 99669-2174
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Quando logado, NÃO mostra o card central (tudo fica discretamente no topo)
        card.style.display = 'none';
        card.innerHTML = '';
    }
}

function abrirModalOnboardingCadastro(user) {
    const modal = document.getElementById("modalOnboardingCadastro");
    if (!modal) return;
    document.getElementById("onboardingEmail").value = user.email || "";
    document.getElementById("onboardingNome").value = user.nome || "";
    document.getElementById("onboardingCargo").value = (user.cargo && !user.cargo.includes('Aguardando')) ? user.cargo : "";
    document.getElementById("onboardingTurno").value = user.turno || "Matutino";
    const phoneInput = document.getElementById("onboardingWhatsapp");
    if (user.whatsapp || user.telefone) {
        phoneInput.value = user.whatsapp || user.telefone;
        mascaraTelefoneInput(phoneInput);
    } else {
        phoneInput.value = "";
    }
    document.getElementById("onboardingAutorizacaoWhatsApp").checked = false;
    modal.style.display = "flex";
}

function submitOnboardingCadastro() {
    const email = document.getElementById("onboardingEmail").value.trim();
    const nome = document.getElementById("onboardingNome").value.trim();
    const cargo = document.getElementById("onboardingCargo").value.trim();
    const turno = document.getElementById("onboardingTurno").value;
    const whatsapp = document.getElementById("onboardingWhatsapp").value.trim();
    const autorizou = document.getElementById("onboardingAutorizacaoWhatsApp").checked;

    if (!nome) {
        alert("Por favor, informe seu nome completo.");
        return;
    }
    if (!cargo) {
        alert("Por favor, informe seu cargo ou função.");
        return;
    }
    const cleanPhone = whatsapp.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
        alert("Por favor, informe um telefone de WhatsApp válido com DDD (mínimo 10 dígitos).");
        return;
    }
    if (!autorizou) {
        alert("É obrigatório marcar a caixa autorizando o recebimento de mensagens oficiais no seu WhatsApp.");
        return;
    }

    if (window.sigeDB) {
        const user = window.sigeDB.concluirCadastroUsuario(email, {
            nome,
            cargo,
            turno,
            whatsapp: cleanPhone,
            autorizaMensagensWhatsApp: true
        });

        if (user) {
            const modal = document.getElementById("modalOnboardingCadastro");
            if (modal) modal.style.display = "none";
            alert("🎉 Cadastro concluído com sucesso! Bem-vindo(a) ao IntegraRizzi.");
            renderPortalAuth();
            updateActionPillars();
            loadSystems();
        }
    }
}

function cancelarOnboardingCadastro() {
    const modal = document.getElementById("modalOnboardingCadastro");
    if (modal) modal.style.display = "none";
    if (window.sigeDB) window.sigeDB.logout();
    renderPortalAuth();
    updateActionPillars();
    loadSystems();
}

function switchDevView(role) {
    if (!window.sigeDB) return;
    window.sigeDB.setRole(role);
    renderPortalAuth();
    updateActionPillars();
    loadSystems();
}

function resetDevView() {
    switchDevView("desenvolvedor");
}

function portalLogout() {
    if (window.sigeDB) {
        window.sigeDB.logout();
    }
    renderPortalAuth();
    updateActionPillars();
    loadSystems();
}

function scrollToAuthCard() {
    const card = document.getElementById('portalAuthCard');
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = document.getElementById('heroLoginCpfInput');
        if (input) setTimeout(() => input.focus(), 400);
    }
}

// Atualiza os pilares de destaque da seção Hero conforme a permissão principal do usuário
function updateActionPillars() {
    const pillarsGrid = document.getElementById('actionPillarsGrid');
    if (!pillarsGrid) return;

    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;

    let p1 = {
        badge: '<i class="fa-solid fa-bolt"></i> ACESSO DIRETO',
        badgeClass: 'badge-oe',
        iconBoxClass: 'icon-op',
        icon: 'fa-solid fa-heart-pulse',
        title: 'Orientação Educacional (OE)',
        desc: 'Gestão completa da agenda semanal, controle de 4 vagas por turno, prontuário único do aluno e emissão de declarações.',
        url: 'sistema-gestao.html?aba=op',
        btnText: 'Acessar Agenda OE',
        btnClass: 'btn-op-primary'
    };

    if (window.sigeDB && loggedUser) {
        const currentRole = window.sigeDB.getRole ? window.sigeDB.getRole() : loggedUser.role;
        if (loggedUser.role === 'desenvolvedor' && currentRole === 'desenvolvedor') {
            p1 = {
                badge: '<i class="fa-solid fa-shield-halved"></i> DEV / ADMIN',
                badgeClass: 'badge-oe',
                iconBoxClass: 'icon-op',
                icon: 'fa-solid fa-shield-halved',
                title: 'Desenvolvedor & Acessos (RBAC)',
                desc: 'Painel exclusivo para controle de permissões por módulo (RBAC), auditoria e gestão da equipe escolar.',
                url: 'sistema-gestao.html?aba=admin&action=dev',
                btnText: 'Acessar Painel Dev',
                btnClass: 'btn-op-primary'
            };
        } else if (window.sigeDB.temPermissaoModulo('op')) {
            // Mantém Orientação Educacional
        } else if (window.sigeDB.temPermissaoModulo('supervisao')) {
            p1 = {
                badge: '<i class="fa-solid fa-book-open-reader"></i> SUPERVISÃO',
                badgeClass: 'badge-oe',
                iconBoxClass: 'icon-op',
                icon: 'fa-solid fa-book-open-reader',
                title: 'Supervisão Escolar & Diário',
                desc: 'Acompanhamento pedagógico das turmas, suporte aos docentes, ocorrências pedagógicas e planejamento.',
                url: 'sistema-gestao.html?aba=supervisao',
                btnText: 'Acessar Supervisão',
                btnClass: 'btn-op-primary'
            };
        } else if (window.sigeDB.temPermissaoModulo('direcao')) {
            p1 = {
                badge: '<i class="fa-solid fa-crown"></i> DIREÇÃO',
                badgeClass: 'badge-oe',
                iconBoxClass: 'icon-op',
                icon: 'fa-solid fa-crown',
                title: 'Direção Escolar & Gestão',
                desc: 'Gestão institucional, encaminhamentos à SME, demandas de secretaria e relatórios executivos.',
                url: 'sistema-gestao.html?aba=direcao',
                btnText: 'Acessar Gestão',
                btnClass: 'btn-op-primary'
            };
        } else if (window.sigeDB.temPermissaoModulo('uniformes')) {
            p1 = {
                badge: '<i class="fa-solid fa-shirt"></i> UNIFORMES',
                badgeClass: 'badge-oe',
                iconBoxClass: 'icon-op',
                icon: 'fa-solid fa-shirt',
                title: 'Controle de Uniformes',
                desc: 'Gestão de pedidos de uniformes, remessas à SME, estoque local e listas de entrega por turma com assinatura.',
                url: 'sistema-gestao.html?aba=uniformes',
                btnText: 'Acessar Uniformes',
                btnClass: 'btn-op-primary'
            };
        } else if (window.sigeDB.temPermissaoModulo('mural')) {
            p1 = {
                badge: '<i class="fa-solid fa-bullhorn"></i> MURAL',
                badgeClass: 'badge-oe',
                iconBoxClass: 'icon-op',
                icon: 'fa-solid fa-bullhorn',
                title: 'Mural de Recados & Avisos',
                desc: 'Mural colaborativo de informes, comunicados urgentes, calendário e alinhamentos pedagógicos da equipe.',
                url: 'sistema-gestao.html?aba=mural',
                btnText: 'Acessar Mural',
                btnClass: 'btn-op-primary'
            };
        } else if (window.sigeDB.temPermissaoModulo('admin')) {
            p1 = {
                badge: '<i class="fa-solid fa-shield-halved"></i> DEV / ADMIN',
                badgeClass: 'badge-oe',
                iconBoxClass: 'icon-op',
                icon: 'fa-solid fa-shield-halved',
                title: 'Desenvolvedor & Acessos',
                desc: 'Painel exclusivo para controle de permissões por módulo (RBAC), auditoria e gestão da equipe escolar.',
                url: 'sistema-gestao.html?aba=admin&action=dev',
                btnText: 'Acessar Painel Dev',
                btnClass: 'btn-op-primary'
            };
        } else {
            p1 = {
                badge: '<i class="fa-solid fa-lock"></i> RESTRITO',
                badgeClass: 'badge-oe',
                iconBoxClass: 'icon-op',
                icon: 'fa-solid fa-user-lock',
                title: 'Módulos Protegidos',
                desc: 'Seu perfil atual possui acesso de leitura ou necessita de liberação de permissões adicionais.',
                url: 'javascript:alert("Solicite liberação deste módulo à direção ou desenvolvedor.");',
                btnText: 'Acesso Restrito',
                btnClass: 'btn-op-primary'
            };
        }
    } else if (!loggedUser) {
        p1.badge = '<i class="fa-solid fa-lock"></i> REQUER LOGIN';
        p1.btnText = 'Identificar-se para Acessar';
        p1.url = 'javascript:scrollToAuthCard()';
    }

    pillarsGrid.innerHTML = `
        <!-- Pillar 1: Acesso Dinâmico ao Módulo Principal -->
        <div class="pillar-card pillar-op">
            <div>
                <div class="pillar-badge ${p1.badgeClass}">${p1.badge}</div>
                <div class="pillar-icon-box ${p1.iconBoxClass}">
                    <i class="${p1.icon}"></i>
                </div>
                <h3>${p1.title}</h3>
                <p>${p1.desc}</p>
            </div>
            <a href="${p1.url}" class="pillar-btn ${p1.btnClass}">
                <span>${p1.btnText}</span> <i class="fa-solid fa-arrow-right"></i>
            </a>
        </div>

        <!-- Pillar 2: Agendamento do Laboratório & Recursos -->
        <div class="pillar-card pillar-lab">
            <div>
                <div class="pillar-badge badge-lab"><i class="fa-solid fa-calendar-days"></i> RESERVA DE ESPAÇOS</div>
                <div class="pillar-icon-box icon-lab">
                    <i class="fa-solid fa-laptop-code"></i>
                </div>
                <h3>Agendamento do Laboratório</h3>
                <p>Reserva de horários para uso do Laboratório de Informática, projetores, auditório e recursos tecnológicos da escola.</p>
            </div>
            <a href="https://elcortelini.github.io/agendamento-cepr/" target="_blank" rel="noopener noreferrer" onclick="openAgendamentoLabDirect(event)" class="pillar-btn btn-lab-primary">
                <span>Agendar Laboratório</span> <i class="fa-solid fa-calendar-check"></i> <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.8rem; margin-left:2px;"></i>
            </a>
        </div>
    `;
}

let _lastRenderedUserRole = '__init__';
let _lastRenderedUserId = '__init__';

function loadSystems(force = false) {
    const grid = document.getElementById('systemsGrid');
    const gridRestritos = document.getElementById('systemsGridRestritos');
    const secRestritos = document.getElementById('sectionSistemasRestritos');
    if (!grid) return;

    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;
    const currentRole = window.sigeDB ? window.sigeDB.getRole() : 'visitante';
    const currentUserId = loggedUser ? (loggedUser.id || loggedUser.cpf || loggedUser.email) : 'anonymous';

    // Evita recriar o grid do zero repetidamente se o usuário e papel não mudaram (elimina piscar de ícones)
    if (!force && grid.children.length > 0 && _lastRenderedUserRole === currentRole && _lastRenderedUserId === currentUserId) {
        return;
    }

    _lastRenderedUserRole = currentRole;
    _lastRenderedUserId = currentUserId;

    grid.innerHTML = '';
    if (gridRestritos) gridRestritos.innerHTML = '';

    const savedUrls = JSON.parse(localStorage.getItem('pedro_rizzi_urls') || '{}');
    const customSystems = getCustomSystems();
    const allSystems = [...defaultSystems, ...customSystems];

    let countRestritos = 0;

    allSystems.forEach(sys => {
        let finalUrl = sys.isCustom ? sys.url : (savedUrls[sys.id] || sys.url);

        if (sys.id === 'recursos' && (finalUrl === 'sistema-gestao.html?aba=op' || !finalUrl || finalUrl === '#')) {
            finalUrl = "https://elcortelini.github.io/agendamento-cepr/";
        }
        if (sys.id === 'direcao') {
            finalUrl = "sistema-gestao.html?aba=direcao";
        }
        if (sys.id === 'uniformes') {
            finalUrl = "sistema-gestao.html?aba=admin#adminSecUniformes";
        }
        if (sys.id === 'desenvolvedor') {
            finalUrl = "sistema-gestao.html?aba=dev";
        }

        const isConfigured = finalUrl && finalUrl !== '#';
        const isExternal = finalUrl && (finalUrl.startsWith("http://") || finalUrl.startsWith("https://"));

        // Verificação RBAC
        let isAllowed = true;
        if (sys.moduloKey) {
            if (!loggedUser) {
                isAllowed = false;
            } else {
                isAllowed = window.sigeDB ? window.sigeDB.temPermissaoModulo(sys.moduloKey) : false;
            }
        }

        if (isAllowed) {
            // ==========================================
            // SISTEMAS LIBERADOS: GRANDES EM DESTAQUE NO TOPO
            // ==========================================
            const badgeHtml = sys.moduloKey
                ? `<span class="sys-access-badge badge-access-liberado"><i class="fa-solid fa-circle-check"></i> ACESSO LIBERADO</span>`
                : `<span class="sys-access-badge badge-access-geral"><i class="fa-solid fa-globe"></i> ${sys.badge || 'ACESSO LIVRE'}</span>`;

            const card = document.createElement('a');
            card.className = `system-card ${sys.isLive ? 'featured' : ''} ${sys.isCustom ? 'custom-system-card' : ''}`.trim();
            card.href = isConfigured ? finalUrl : 'javascript:void(0);';
            if (isExternal) {
                card.target = '_blank';
                card.rel = 'noopener noreferrer';
            }

            card.addEventListener('click', function(e) {
                if (!isConfigured) {
                    e.preventDefault();
                    alert(`O link para o sistema "${sys.title}" ainda não foi configurado.`);
                }
            });

            card.innerHTML = `
                <div>
                    <!-- ÍCONE GRANDE -->
                    <div class="giant-icon-wrapper ${sys.bgClass || 'theme-emerald'}">
                        <i class="${sys.iconClass || 'fa-solid fa-cubes'}"></i>
                    </div>

                    <div style="margin-bottom: 8px;">
                        ${badgeHtml}
                    </div>

                    <h4 class="card-title">${sys.title}</h4>
                    <p class="card-desc">${sys.description}</p>
                </div>
                ${(sys.isCustom && loggedUser && loggedUser.role === 'desenvolvedor') ? `
                    <div style="display:flex; flex-direction:column; gap:6px; margin-top: auto;">
                        <button onclick="event.stopPropagation(); deleteCustomSystem('${sys.id}')" style="background:none; border:none; color:#ef4444; font-size:0.75rem; font-weight:700; cursor:pointer; text-align:center; padding:4px;"><i class="fa-solid fa-trash"></i> Remover Sistema</button>
                    </div>
                ` : ''}
            `;

            grid.appendChild(card);
        } else {
            // ==========================================
            // SISTEMAS RESTRITOS: PEQUENOS EM BAIXO COM ÍCONE DE RESTRIÇÃO
            // ==========================================
            countRestritos++;
            if (gridRestritos) {
                const compactCard = document.createElement('div');
                compactCard.className = 'system-card-compact';
                compactCard.setAttribute('role', 'button');
                compactCard.setAttribute('tabindex', '0');
                compactCard.title = `Acesso Restrito: ${sys.title}`;
                compactCard.onclick = function() {
                    if (!loggedUser) {
                        alert(`🔒 Módulo Protegido: É necessário se identificar no portal para acessar o módulo "${sys.title}".`);
                        scrollToAuthCard();
                    } else {
                        const papelTxt = typeof getRoleLabel === 'function' ? getRoleLabel(currentRole) : currentRole;
                        alert(`🔒 Acesso Restrito: Seu perfil atual (${papelTxt}) não possui permissão de acesso ao módulo "${sys.title}".\n\nCaso necessite de liberação, solicite ao desenvolvedor ou à direção escolar no Painel de Acessos.`);
                    }
                };

                compactCard.innerHTML = `
                    <div class="compact-icon-box ${sys.bgClass || 'theme-blue'}">
                        <i class="${sys.iconClass || 'fa-solid fa-cube'}"></i>
                    </div>
                    <div class="compact-info">
                        <div class="compact-title">${sys.title}</div>
                        <div class="compact-tag">${sys.tag || 'MÓDULO ESCOLAR'}</div>
                        <div class="compact-badge"><i class="fa-solid fa-lock"></i> ACESSO RESTRITO</div>
                    </div>
                `;

                gridRestritos.appendChild(compactCard);
            }
        }
    });

    if (secRestritos) {
        secRestritos.style.display = countRestritos > 0 ? 'block' : 'none';
    }
}

function openConfigModal() {
    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;
    if (!loggedUser || loggedUser.role !== 'desenvolvedor') {
        alert("🔒 Acesso Restrito: Apenas o Desenvolvedor do sistema pode alterar as configurações de links dos sistemas padrão.");
        return;
    }

    const modal = document.getElementById('configModal');
    if (!modal) return;

    const savedUrls = JSON.parse(localStorage.getItem('pedro_rizzi_urls') || '{}');
    const savedSheetUrl = localStorage.getItem('pedro_rizzi_sheet_url') || '';

    if (document.getElementById('url_sheet')) document.getElementById('url_sheet').value = savedSheetUrl;
    if (document.getElementById('url_contabil')) document.getElementById('url_contabil').value = savedUrls['contabil'] || '';
    if (document.getElementById('url_recursos')) document.getElementById('url_recursos').value = savedUrls['recursos'] || '';
    if (document.getElementById('url_biblioteca')) document.getElementById('url_biblioteca').value = savedUrls['biblioteca'] || '';
    if (document.getElementById('url_patrimonio')) document.getElementById('url_patrimonio').value = savedUrls['patrimonio'] || '';

    modal.style.display = 'flex';
}

function closeConfigModal() {
    const modal = document.getElementById('configModal');
    if (modal) modal.style.display = 'none';
}

function openAddCustomSystemModal() {
    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;
    if (!loggedUser || loggedUser.role !== 'desenvolvedor') {
        alert("🔒 Acesso Restrito: Apenas o Desenvolvedor do sistema pode cadastrar novos sistemas.");
        return;
    }

    const modal = document.getElementById('modalAddCustomSystem');
    if (!modal) return;
    modal.style.display = 'flex';
}

function closeAddCustomSystemModal() {
    const modal = document.getElementById('modalAddCustomSystem');
    if (modal) modal.style.display = 'none';
}

function submitAddCustomSystem(e) {
    if (e && e.preventDefault) e.preventDefault();

    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;
    if (!loggedUser || loggedUser.role !== 'desenvolvedor') {
        alert("🔒 Acesso Restrito: Apenas o Desenvolvedor pode cadastrar novos sistemas.");
        return;
    }

    const title = document.getElementById('customSysTitle')?.value.trim();
    const tag = document.getElementById('customSysTag')?.value.trim().toUpperCase();
    const iconClass = document.getElementById('customSysIcon')?.value;
    const url = document.getElementById('customSysUrl')?.value.trim();
    const description = document.getElementById('customSysDesc')?.value.trim();

    if (!title || !tag || !url || !description) return;

    const customSystems = getCustomSystems();
    const newId = "custom-" + Date.now();
    const newSys = {
        id: newId,
        moduloKey: newId,
        title,
        iconClass,
        bgClass: "theme-emerald",
        tag,
        description,
        url,
        status: "online",
        badge: "NOVO LINK",
        isLive: true,
        isCustom: true
    };

    customSystems.push(newSys);
    localStorage.setItem('pedro_rizzi_custom_systems', JSON.stringify(customSystems));
    if (window.sigeDB && typeof window.sigeDB.syncToFirebase === 'function') {
        window.sigeDB.syncToFirebase();
    }

    closeAddCustomSystemModal();
    loadSystems(true);
    alert(`Sistema "${title}" cadastrado com sucesso!`);

    // Reset inputs
    if (document.getElementById('customSysTitle')) document.getElementById('customSysTitle').value = "";
    if (document.getElementById('customSysTag')) document.getElementById('customSysTag').value = "";
    if (document.getElementById('customSysUrl')) document.getElementById('customSysUrl').value = "";
    if (document.getElementById('customSysDesc')) document.getElementById('customSysDesc').value = "";
}

function deleteCustomSystem(id) {
    if (confirm("Deseja realmente remover este sistema cadastrado?")) {
        let customSystems = getCustomSystems();
        customSystems = customSystems.filter(s => s.id !== id);
        localStorage.setItem('pedro_rizzi_custom_systems', JSON.stringify(customSystems));
        loadSystems();
    }
}

function openAgendamentoLabDirect(e) {
    if (e && e.preventDefault) e.preventDefault();
    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;
    if (!loggedUser) {
        alert("🔒 Módulo Protegido: É necessário se identificar no portal para acessar o Agendamento de Recursos.");
        scrollToAuthCard();
        return;
    }
    if (window.sigeDB && !window.sigeDB.temPermissaoModulo('ext_recursos')) {
        alert("🔒 Acesso Restrito: Seu perfil atual não possui permissão de acesso ao Agendamento de Recursos & Laboratório.\n\nSolicite liberação ao desenvolvedor ou à direção escolar.");
        return;
    }

    const savedUrls = JSON.parse(localStorage.getItem('pedro_rizzi_urls') || '{}');
    let labUrl = savedUrls['recursos'] || "https://elcortelini.github.io/agendamento-cepr/";
    
    if (!labUrl || labUrl === '#' || labUrl === 'sistema-gestao.html?aba=op') {
        labUrl = "https://elcortelini.github.io/agendamento-cepr/";
    }

    if (labUrl.startsWith("http://") || labUrl.startsWith("https://")) {
        window.open(labUrl, '_blank');
    } else {
        window.location.href = labUrl;
    }
}

window.renderPortalAuth = renderPortalAuth;
window.renderPortalAuthBar = renderPortalAuthBar;
window.renderPortalAuthHeroCard = renderPortalAuthHeroCard;
window.heroLoginWithCpf = heroLoginWithCpf;
window.abrirModalPrimeiroAcesso = abrirModalPrimeiroAcesso;
window.fecharModalPrimeiroAcesso = fecharModalPrimeiroAcesso;
window.submitPrimeiroAcesso = submitPrimeiroAcesso;
window.switchDevView = switchDevView;
window.resetDevView = resetDevView;
window.portalLogout = portalLogout;
window.scrollToAuthCard = scrollToAuthCard;
window.updateActionPillars = updateActionPillars;
window.loadSystems = loadSystems;
window.openConfigModal = openConfigModal;
window.closeConfigModal = closeConfigModal;
window.openAddCustomSystemModal = openAddCustomSystemModal;
window.closeAddCustomSystemModal = closeAddCustomSystemModal;
window.submitAddCustomSystem = submitAddCustomSystem;
window.deleteCustomSystem = deleteCustomSystem;
window.openAgendamentoLabDirect = openAgendamentoLabDirect;

const configForm = document.getElementById('configForm');
if (configForm) {
    configForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const sheetUrl = document.getElementById('url_sheet') ? document.getElementById('url_sheet').value.trim() : '';
        if (sheetUrl) {
            localStorage.setItem('pedro_rizzi_sheet_url', sheetUrl);
        }

        const savedUrls = {
            contabil: document.getElementById('url_contabil') ? document.getElementById('url_contabil').value.trim() : '',
            recursos: document.getElementById('url_recursos') ? document.getElementById('url_recursos').value.trim() : '',
            biblioteca: document.getElementById('url_biblioteca') ? document.getElementById('url_biblioteca').value.trim() : '',
            patrimonio: document.getElementById('url_patrimonio') ? document.getElementById('url_patrimonio').value.trim() : ''
        };
        localStorage.setItem('pedro_rizzi_urls', JSON.stringify(savedUrls));

        closeConfigModal();
        loadSystems();
        alert('Configurações e links atualizados com sucesso!');
    });
}

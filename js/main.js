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
        moduloKey: "admin",
        title: "Desenvolvedor & Acessos",
        iconClass: "fa-solid fa-shield-halved",
        bgClass: "theme-purple",
        tag: "RBAC & CONTROLE TOTAL",
        description: "Painel exclusivo para controle de permissões por módulo (RBAC), auditoria e gestão da equipe escolar.",
        url: "sistema-gestao.html?aba=admin&action=dev",
        status: "online",
        badge: "ADMIN / DEV",
        isLive: true
    },
    {
        id: "recursos",
        moduloKey: null,
        title: "Agendamento de Recursos & Lab",
        iconClass: "fa-solid fa-calendar-check",
        bgClass: "theme-orange",
        tag: "RESERVA DE ESPAÇOS",
        description: "Reserva de horários para uso do Laboratório de Informática, projetores, auditório e recursos tecnológicos da escola.",
        url: "https://elcortelini.github.io/agendamento-cepr/",
        status: "online",
        badge: "ACESSO LIVRE",
        isLive: true
    },
    {
        id: "dashboard",
        moduloKey: null,
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
        moduloKey: null,
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
        moduloKey: null,
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
        moduloKey: null,
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

function getRoleLabel(role) {
    const map = {
        desenvolvedor: "Desenvolvedor do Sistema",
        direcao: "Direção Escolar & Gestão",
        supervisao: "Supervisão Escolar & Diário",
        orientadora_daiane: "Orientadora Educacional — Séries Finais",
        orientadora_clarinda: "Orientadora Educacional — Séries Iniciais",
        secretaria: "Secretaria Escolar & Recepção",
        uniformes: "Controle de Uniformes & Logística",
        docentes: "Corpo Docente / Professores",
        comunidade: "Comunidade / Alunos / Pais",
        visitante: "Visitante / Não Autenticado"
    };
    return map[role] || (role ? role.toUpperCase() : "Membro da Equipe");
}

function getRoleIcon(role) {
    const map = {
        desenvolvedor: "fa-solid fa-shield-halved",
        direcao: "fa-solid fa-crown",
        supervisao: "fa-solid fa-book-open-reader",
        orientadora_daiane: "fa-solid fa-heart-pulse",
        orientadora_clarinda: "fa-solid fa-heart-pulse",
        secretaria: "fa-solid fa-clipboard-check",
        uniformes: "fa-solid fa-shirt",
        docentes: "fa-solid fa-chalkboard-user",
        visitante: "fa-solid fa-user-lock"
    };
    return map[role] || "fa-solid fa-user";
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
                    <div class="portal-top-dev-view" style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.08); padding:3px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.15);">
                        <label for="topDevViewSelector" style="color:#fbbf24; font-size:0.75rem; font-weight:800; display:flex; align-items:center; gap:4px; white-space:nowrap;">
                            <i class="fa-solid fa-eye"></i> Visão:
                        </label>
                        <select id="topDevViewSelector" onchange="switchDevView(this.value)" style="background:#1e293b; color:#f8fafc; border:1px solid #475569; border-radius:6px; padding:3px 8px; font-size:0.75rem; font-weight:700; cursor:pointer; outline:none;">
                            <option value="desenvolvedor" ${activeRole === 'desenvolvedor' ? 'selected' : ''}>👑 Desenvolvedor (Total)</option>
                            <option value="orientadora_daiane" ${activeRole === 'orientadora_daiane' ? 'selected' : ''}>💜 OE — Daiane (Finais)</option>
                            <option value="orientadora_clarinda" ${activeRole === 'orientadora_clarinda' ? 'selected' : ''}>💜 OE — Clarinda (Iniciais)</option>
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

// 2. Painel Central Hero (Apenas quando NÃO logado)
function renderPortalAuthHeroCard() {
    const card = document.getElementById('portalAuthCard');
    if (!card) return;

    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;

    if (!loggedUser) {
        card.style.display = 'block';
        card.innerHTML = `
            <div class="portal-login-card-inner">
                <div class="login-card-header">
                    <div class="login-badge"><i class="fa-solid fa-shield-halved"></i> IDENTIFICAÇÃO DO USUÁRIO</div>
                    <h2 class="login-card-title"><i class="fa-solid fa-id-card-clip"></i> Acesso ao Portal IntegraRizzi</h2>
                    <p class="login-card-subtitle">Informe seu e-mail funcional institucional (@edu.itajai.sc.gov.br ou @itajai.sc.gov.br) para autenticar e liberar suas ferramentas:</p>
                </div>

                <div class="login-card-body" style="max-width:560px; margin:0 auto; width:100%;">
                    <form class="login-method-box" onsubmit="event.preventDefault(); heroLoginWithEmail();" style="border:none; background:transparent; padding:0;">
                        <label class="login-method-label" style="font-size:0.9rem; margin-bottom:8px;"><i class="fa-solid fa-envelope"></i> E-mail Institucional Oficial:</label>
                        <div class="login-input-row" style="display:flex; gap:10px;">
                            <input type="email" id="heroLoginEmailInput" class="hero-login-input" placeholder="ex: seu.nome@edu.itajai.sc.gov.br" required style="flex:1; padding:12px 14px; font-size:0.95rem; border-radius:10px; border:2px solid #cbd5e1;" />
                            <button type="submit" class="hero-login-btn btn-enter-email" style="padding:12px 22px; font-size:0.95rem; font-weight:800; border-radius:10px; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:white; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                                <i class="fa-solid fa-right-to-bracket"></i> Entrar
                            </button>
                        </div>
                        <div style="margin-top:12px; font-size:0.82rem; color:#64748b; line-height:1.4;">
                            <i class="fa-solid fa-circle-info" style="color:#2563eb;"></i> <strong>Primeiro Acesso:</strong> Ao informar seu e-mail institucional pela primeira vez, sua solicitação será registrada e aguardará a habilitação de módulos pelo Desenvolvedor do Sistema.
                        </div>
                    </form>
                </div>
            </div>
        `;
    } else {
        // Quando logado, NÃO mostra o card central (tudo fica discretamente no topo)
        card.style.display = 'none';
        card.innerHTML = '';
    }
}

function heroLoginWithEmail() {
    const input = document.getElementById('heroLoginEmailInput');
    if (!input) return;
    const email = input.value.trim();
    if (!email) {
        alert("Por favor, digite seu e-mail institucional oficial (@edu.itajai.sc.gov.br ou @itajai.sc.gov.br).");
        input.focus();
        return;
    }

    if (window.sigeDB) {
        const res = window.sigeDB.loginWithEmail(email);
        
        if (res.code === 'INVALID_DOMAIN') {
            alert(`🔒 Acesso Negado\n\n${res.message}\n\nE-mails pessoais (como @gmail.com ou @hotmail.com) não são aceitos.`);
            return;
        }

        if (res.code === 'FIRST_ACCESS_PENDING') {
            alert(`📝 Solicitação Registrada!\n\n${res.message}`);
            input.value = '';
            return;
        }

        if (res.code === 'PENDING_APPROVAL') {
            alert(`⏳ Acesso em Análise\n\n${res.message}`);
            input.value = '';
            return;
        }

        if (res.code === 'BLOCKED') {
            alert(`🚫 Acesso Bloqueado\n\n${res.message}`);
            return;
        }

        if (res.code === 'NEEDS_ONBOARDING') {
            abrirModalOnboardingCadastro(res.user);
            return;
        }

        if (res.success && res.user) {
            renderPortalAuth();
            updateActionPillars();
            loadSystems();
        }
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

function mascaraTelefoneInput(input) {
    if (!input) return;
    let v = input.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10) {
        input.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
    } else if (v.length > 6) {
        input.value = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
    } else if (v.length > 2) {
        input.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    } else if (v.length > 0) {
        input.value = `(${v}`;
    }
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
        const input = document.getElementById('heroLoginEmailInput');
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
        if (window.sigeDB.temPermissaoModulo('op')) {
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

function loadSystems() {
    const grid = document.getElementById('systemsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const savedUrls = JSON.parse(localStorage.getItem('pedro_rizzi_urls') || '{}');
    const customSystems = getCustomSystems();
    const allSystems = [...defaultSystems, ...customSystems];
    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;

    allSystems.forEach(sys => {
        let finalUrl = sys.isCustom ? sys.url : (savedUrls[sys.id] || sys.url);

        if (sys.id === 'recursos' && (finalUrl === 'sistema-gestao.html?aba=op' || !finalUrl || finalUrl === '#')) {
            finalUrl = "https://elcortelini.github.io/agendamento-cepr/";
        }
        if (sys.id === 'direcao') {
            finalUrl = "sistema-gestao.html?aba=direcao";
        }

        const isConfigured = finalUrl && finalUrl !== '#';
        const isExternal = finalUrl && (finalUrl.startsWith("http://") || finalUrl.startsWith("https://"));

        // Verificação RBAC
        let isAllowed = true;
        let badgeHtml = '';

        if (sys.moduloKey) {
            if (!loggedUser) {
                isAllowed = false;
                badgeHtml = `<span class="sys-access-badge badge-access-restrito"><i class="fa-solid fa-lock"></i> REQUER LOGIN</span>`;
            } else {
                isAllowed = window.sigeDB ? window.sigeDB.temPermissaoModulo(sys.moduloKey) : false;
                if (isAllowed) {
                    badgeHtml = `<span class="sys-access-badge badge-access-liberado"><i class="fa-solid fa-circle-check"></i> ACESSO LIBERADO</span>`;
                } else {
                    badgeHtml = `<span class="sys-access-badge badge-access-restrito"><i class="fa-solid fa-lock"></i> ACESSO RESTRITO</span>`;
                }
            }
        } else {
            badgeHtml = `<span class="sys-access-badge badge-access-geral"><i class="fa-solid fa-globe"></i> ${sys.badge || 'ACESSO LIVRE'}</span>`;
        }

        const card = document.createElement('div');
        const restrictedClass = !isAllowed ? 'card-access-restricted' : '';
        card.className = `system-card ${sys.isLive ? 'featured' : ''} ${sys.isCustom ? 'custom-system-card' : ''} ${restrictedClass}`.trim();
        card.style.cursor = 'pointer';

        // Clique no card
        card.addEventListener('click', function() {
            if (sys.moduloKey && !loggedUser) {
                alert(`🔒 Módulo Protegido: É necessário se identificar no portal para acessar o módulo "${sys.title}".`);
                scrollToAuthCard();
                return;
            }

            if (!isAllowed) {
                alert(`🔒 Acesso Restrito: Seu perfil atual não possui permissão de acesso ao módulo "${sys.title}".\n\nCaso necessite de liberação, solicite ao desenvolvedor ou à direção escolar no Painel de Acessos.`);
                return;
            }

            if (finalUrl && finalUrl !== '#') {
                if (isExternal || (!sys.isLive && isConfigured)) {
                    window.open(finalUrl, '_blank', 'noopener,noreferrer');
                } else {
                    window.location.href = finalUrl;
                }
            } else {
                alert(`O link para o sistema "${sys.title}" ainda não foi configurado.`);
            }
        });

        card.innerHTML = `
            <div>
                <!-- ÍCONE -->
                <div class="giant-icon-wrapper ${sys.bgClass || 'theme-emerald'}">
                    <i class="${sys.iconClass || 'fa-solid fa-cubes'}"></i>
                </div>

                <div style="margin-bottom: 8px;">
                    ${badgeHtml}
                </div>

                <h4 class="card-title">${sys.title}</h4>
                <p class="card-desc">${sys.description}</p>
            </div>
            ${sys.isCustom ? `
                <div style="display:flex; flex-direction:column; gap:6px; margin-top: auto;">
                    <button onclick="event.stopPropagation(); deleteCustomSystem('${sys.id}')" style="background:none; border:none; color:#ef4444; font-size:0.75rem; font-weight:700; cursor:pointer; text-align:center; padding:4px;"><i class="fa-solid fa-trash"></i> Remover Sistema</button>
                </div>
            ` : ''}
        `;

        grid.appendChild(card);
    });
}

function openConfigModal() {
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

    const title = document.getElementById('customSysTitle')?.value.trim();
    const tag = document.getElementById('customSysTag')?.value.trim().toUpperCase();
    const iconClass = document.getElementById('customSysIcon')?.value;
    const url = document.getElementById('customSysUrl')?.value.trim();
    const description = document.getElementById('customSysDesc')?.value.trim();

    if (!title || !tag || !url || !description) return;

    const customSystems = getCustomSystems();
    const newSys = {
        id: "custom-" + Date.now(),
        title,
        iconClass,
        bgClass: "icon-emerald",
        tag,
        description,
        url,
        status: "online",
        badge: "CUSTOMIZADO",
        isLive: false,
        isCustom: true
    };

    customSystems.push(newSys);
    localStorage.setItem('pedro_rizzi_custom_systems', JSON.stringify(customSystems));

    closeAddCustomSystemModal();
    loadSystems();
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
window.heroLoginWithEmail = heroLoginWithEmail;
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

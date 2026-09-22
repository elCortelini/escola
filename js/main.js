document.addEventListener('DOMContentLoaded', () => {
    if (window.sigeDB) {
        window.sigeDB.init();
    }
    renderPortalAuthBar();
    updateActionPillars();
    loadSystems();
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

// Renderiza a barra de status de autenticação / RBAC no topo do portal
function renderPortalAuthBar() {
    const authBar = document.getElementById('portalAuthBar');
    if (!authBar) return;

    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;

    if (loggedUser) {
        const modulosKeys = ['op', 'mural', 'supervisao', 'direcao', 'uniformes', 'admin'];
        const allowedCount = modulosKeys.filter(k => window.sigeDB.temPermissaoModulo(k)).length;
        const cargoText = loggedUser.cargo || loggedUser.role || "Membro da Equipe";

        authBar.innerHTML = `
            <div class="portal-user-badge">
                <div class="portal-avatar-mini" title="${loggedUser.nome}">
                    <i class="fa-solid fa-user-shield"></i>
                </div>
                <div class="portal-user-meta">
                    <span style="font-weight:800; color:#ffffff;">${loggedUser.nome || loggedUser.email}</span>
                    <span class="portal-role-pill">${cargoText}</span>
                    <span style="color:#94a3b8; font-size:0.75rem;"><i class="fa-solid fa-envelope"></i> ${loggedUser.email}</span>
                    <span style="color:#4ade80; font-size:0.75rem; font-weight:700;"><i class="fa-solid fa-circle-check"></i> ${allowedCount}/6 módulos liberados</span>
                </div>
            </div>
            <div class="portal-auth-actions">
                <a href="sistema-gestao.html" class="portal-btn-sige">
                    <i class="fa-solid fa-layer-group"></i> Abrir SIGE Integrado
                </a>
                <button type="button" onclick="portalLogout()" class="portal-btn-logout" title="Alternar usuário ou desconectar">
                    <i class="fa-solid fa-right-from-bracket"></i> Trocar Usuário
                </button>
            </div>
        `;
    } else {
        const equipe = window.sigeDB ? window.sigeDB.getEquipeEscola() : [];
        const equipeComEmail = equipe.filter(p => p.email && p.email.trim());

        let optionsHtml = '';
        equipeComEmail.forEach(p => {
            optionsHtml += `<option value="${p.email}">${p.nome} (${p.cargoFuncao || p.setor || 'Equipe'})</option>`;
        });

        authBar.innerHTML = `
            <div class="portal-user-badge">
                <div class="portal-avatar-mini" style="background:#475569;" title="Identificação Escolar">
                    <i class="fa-solid fa-id-badge"></i>
                </div>
                <div class="portal-user-meta">
                    <span style="font-weight:800; color:#f8fafc; font-size:0.85rem;">Portal de Acessos RBAC</span>
                    <span style="color:#94a3b8; font-size:0.75rem;">Selecione seu perfil escolar ou entre com seu e-mail para carregar suas permissões automáticas:</span>
                </div>
            </div>
            <div class="portal-login-form-inline">
                <select id="portalUserSelect" class="portal-login-select" onchange="portalLoginWithSelect(this.value)">
                    <option value="">-- Selecione seu usuário na Equipe --</option>
                    ${optionsHtml}
                </select>
                <button type="button" onclick="portalPromptLoginEmail()" class="portal-login-btn">
                    <i class="fa-solid fa-key"></i> Digitar E-mail
                </button>
            </div>
        `;
    }
}

function portalLoginWithSelect(email) {
    if (!email) return;
    if (window.sigeDB) {
        window.sigeDB.loginWithEmail(email);
        renderPortalAuthBar();
        updateActionPillars();
        loadSystems();
    }
}

function portalPromptLoginEmail() {
    const email = prompt("Informe seu e-mail funcional/institucional para entrar:");
    if (email && email.trim()) {
        if (window.sigeDB) {
            const user = window.sigeDB.loginWithEmail(email.trim());
            if (!user) {
                alert(`E-mail "${email}" não localizado na equipe escolar cadastrada. Se necessário, solicite inclusão ao desenvolvedor/direção.`);
            }
            renderPortalAuthBar();
            updateActionPillars();
            loadSystems();
        }
    }
}

function portalLogout() {
    if (window.sigeDB) {
        window.sigeDB.logout();
        renderPortalAuthBar();
        updateActionPillars();
        loadSystems();
    }
}

// Atualiza os pilares de destaque da seção Hero conforme a permissão principal do usuário
function updateActionPillars() {
    const pillarsGrid = document.getElementById('actionPillarsGrid');
    if (!pillarsGrid) return;

    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;

    // Configura o Pilar 1 de acordo com o módulo de maior relevância com permissão
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
            // Permanece Orientação Educacional
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
        }
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
            if (window.sigeDB) {
                isAllowed = window.sigeDB.temPermissaoModulo(sys.moduloKey);
            }
            if (isAllowed) {
                badgeHtml = `<span class="sys-access-badge badge-access-liberado"><i class="fa-solid fa-circle-check"></i> ACESSO LIBERADO</span>`;
            } else {
                badgeHtml = `<span class="sys-access-badge badge-access-restrito"><i class="fa-solid fa-lock"></i> ACESSO RESTRITO</span>`;
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
    if (modal) modal.style.display = 'flex';
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

window.renderPortalAuthBar = renderPortalAuthBar;
window.portalLoginWithSelect = portalLoginWithSelect;
window.portalPromptLoginEmail = portalPromptLoginEmail;
window.portalLogout = portalLogout;
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

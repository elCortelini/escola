/**
 * gestao-app.js - Orquestrador Central e Navegação da Aplicação SIGE
 * Centro Educacional Pedro Rizzi
 * Módulos especialistas divididos em js/modules/ (auth, op, supervisao, direcao, admin-rbac, uniformes)
 */

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// UTILITÁRIOS E FEEDBACK
// ==========================================
function formatDateBR(dateStr) {
    if (!dateStr) return '';
    const dateOnly = String(dateStr).split('T')[0].split(' ')[0];
    const parts = dateOnly.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function showToast(msg) {
    let toast = document.getElementById("sigeToastElem");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "sigeToastElem";
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #0f172a;
            color: #f59e0b;
            padding: 12px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.25);
            font-weight: 700;
            font-size: 0.9rem;
            z-index: 9999;
            border: 1px solid #334155;
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${msg}`;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
    }, 3000);
}

window.escapeHtml = escapeHtml;
window.formatDateBR = formatDateBR;
window.showToast = showToast;
window.initApp = initApp;

// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    checkSigeAuth();
    updateAllSchoolLogoDisplays();
    setupRoleSelector();
    setupTabNavigation();
    setupNotificationBell();
    updateAllDynamicSelects();
    renderAllModules(null, true);
    setupOpButtons();

    try {
        renderWhatsappConfigPanel();
        if (typeof evolutionClient !== 'undefined' && evolutionClient.isConfigured()) {
            atualizarStatusWhatsAppUnificado();
        }
    } catch (e) {
        console.warn("Aviso ao inicializar status do WhatsApp:", e);
    }
}

function setupOpButtons() {
    const btnOp = document.getElementById("btnOpenNovoProjetoOP");
    if (btnOp) {
        btnOp.onclick = (e) => {
            if (e && e.preventDefault) e.preventDefault();
            openNovoProjetoOPModal();
        };
    }
}

// ==========================================

// NAVEGAÇÃO POR ABAS
// ==========================================
function renderExternalNavTabLinks() {
    const container = document.getElementById("externalNavTabsContainer");
    if (!container) return;

    let savedUrls = {};
    try {
        savedUrls = JSON.parse(localStorage.getItem('pedro_rizzi_urls') || '{}');
    } catch (e) {
        savedUrls = {};
    }

    const extModules = [
        {
            key: 'ext_recursos',
            title: 'Laboratório & Recursos',
            icon: 'fa-solid fa-calendar-check',
            color: '#ea580c',
            url: savedUrls['recursos'] || 'https://elcortelini.github.io/agendamento-cepr/'
        },
        {
            key: 'ext_dashboard',
            title: 'Dashboard Avaliação',
            icon: 'fa-solid fa-chart-line',
            color: '#10b981',
            url: 'dashboard.html'
        },
        {
            key: 'ext_contabil',
            title: 'Contábil (APMF)',
            icon: 'fa-solid fa-calculator',
            color: '#2563eb',
            url: savedUrls['contabil'] || '#'
        },
        {
            key: 'ext_biblioteca',
            title: 'Biblioteca',
            icon: 'fa-solid fa-book-bookmark',
            color: '#9333ea',
            url: savedUrls['biblioteca'] || '#'
        },
        {
            key: 'ext_patrimonio',
            title: 'Patrimônio',
            icon: 'fa-solid fa-boxes-stacked',
            color: '#e11d48',
            url: savedUrls['patrimonio'] || '#'
        }
    ];

    let html = '';
    extModules.forEach(mod => {
        if (sigeDB.temPermissaoModulo(mod.key)) {
            const isPlaceholder = !mod.url || mod.url === '#' || mod.url === 'javascript:void(0)';
            const clickAttr = isPlaceholder 
                ? `onclick="event.preventDefault(); showToast('⚠️ Link do sistema ${mod.title} ainda não configurado pelo Desenvolvedor.', 'warning');"`
                : `target="_blank" rel="noopener noreferrer"`;
            const hrefAttr = isPlaceholder ? 'href="#"' : `href="${mod.url}"`;

            html += `
                <a class="sige-tab-btn sige-tab-link" ${hrefAttr} ${clickAttr} title="Acessar ${mod.title} (Link Externo)">
                    <i class="${mod.icon}" style="color:${mod.color};"></i> ${mod.title}
                    <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.7rem; margin-left:4px; opacity:0.6;"></i>
                </a>
            `;
        }
    });

    container.innerHTML = html;
}
window.renderExternalNavTabLinks = function() {}; // Mantido como no-op para compatibilidade

let currentPedSubTab = 'op';

function switchPedSubTab(subTab) {
    if (subTab === 'supervisao') {
        switchTab('supervisao');
        return;
    }
    switchTab('op');
}
window.switchPedSubTab = switchPedSubTab;

function atualizarAbasNavegacaoVisibilidade() {
    const tabBtns = document.querySelectorAll(".sige-tab-btn:not(.sige-tab-link)");
    tabBtns.forEach(btn => {
        const tabKey = btn.dataset.tab;
        if (!tabKey) return;
        let hasPerm = false;
        
        if (tabKey === 'direcao') {
            hasPerm = sigeDB.temPermissaoModulo('direcao');
        } else if (tabKey === 'op') {
            hasPerm = sigeDB.temPermissaoModulo('op') || sigeDB.temPermissaoModulo('direcao');
        } else if (tabKey === 'supervisao') {
            hasPerm = sigeDB.temPermissaoModulo('supervisao') || sigeDB.temPermissaoModulo('direcao');
        } else if (tabKey === 'admin') {
            hasPerm = sigeDB.temPermissaoModulo('admin') || sigeDB.temPermissaoModulo('secretaria') || sigeDB.temPermissaoModulo('direcao') || sigeDB.temPermissaoModulo('uniformes');
        } else if (tabKey === 'externos') {
            hasPerm = true;
        } else if (tabKey === 'dev') {
            hasPerm = sigeDB.temPermissaoModulo('dev');
        } else {
            hasPerm = sigeDB.temPermissaoModulo(tabKey);
        }
        
        btn.style.display = hasPerm ? "inline-flex" : "none";
    });
}
window.atualizarAbasNavegacaoVisibilidade = atualizarAbasNavegacaoVisibilidade;

function setupTabNavigation() {
    const tabBtns = document.querySelectorAll(".sige-tab-btn:not(.sige-tab-link)");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.tab;
            const dirSub = btn.dataset.dirsub;
            if (targetId) {
                switchTab(targetId, dirSub);
            }
        });
    });

    // Ativação automática via URL ou Role do usuário autenticado
    const urlParams = new URLSearchParams(window.location.search);
    let abaParam = urlParams.get('aba');
    if (!abaParam && window.location.hash) {
        abaParam = window.location.hash.replace('#tab-', '').replace('#', '');
    }
    if (!abaParam) {
        const loggedUser = sigeDB.getLoggedUser();
        const activeRole = (typeof sigeDB.getRole === 'function') ? sigeDB.getRole() : (loggedUser ? loggedUser.role : 'comunidade');
        if (activeRole === 'desenvolvedor' || (loggedUser && loggedUser.role === 'desenvolvedor')) {
            abaParam = 'dev'; // Visão padrão do desenvolvedor
        } else if (activeRole === 'direcao') {
            abaParam = 'direcao'; // Visão padrão da Direção
        } else if (activeRole === 'admin' || activeRole === 'secretaria') {
            abaParam = 'admin';
        } else if (activeRole.startsWith('supervisora') || activeRole === 'supervisao') {
            abaParam = 'supervisao';
        } else if (activeRole.includes('orientadora') || activeRole === 'op') {
            abaParam = 'op';
        } else {
            abaParam = 'direcao';
        }
    }

    switchTab(abaParam);

    const navTabs = document.querySelector(".sige-nav-tabs");
    if (navTabs) {
        navTabs.style.display = "flex";
        atualizarAbasNavegacaoVisibilidade();
    }
}

function switchTab(tabId, subKey) {
    // Normalização e Redirecionamento de Rotas Legadas
    if (!tabId) tabId = 'direcao';

    if (tabId === 'pedagogico') {
        tabId = 'op';
    } else if (tabId === 'dossie' || tabId === 'dir_mural') {
        tabId = 'op';
    } else if (tabId === 'uniformes') {
        tabId = 'admin';
        subKey = 'uniformes';
    } else if (tabId === 'dir_mensagens') {
        tabId = 'direcao';
        subKey = 'whatsapp';
    } else if (tabId === 'dir_atas') {
        tabId = 'direcao';
        subKey = 'atas';
    } else if (tabId === 'dir_calendario') {
        tabId = 'direcao';
        subKey = 'calendario';
    } else if (tabId === 'dir_atendimentos') {
        tabId = 'op';
    } else if (tabId === 'mural') {
        tabId = 'direcao';
        subKey = 'calendario';
    }

    const modulosLabels = {
        direcao: "Gestão & Direção",
        op: "Orientação Educacional",
        supervisao: "Supervisão Pedagógica",
        admin: "Secretaria & Operacional",
        externos: "Sistemas",
        dev: "Painel do Desenvolvedor & TI"
    };

    // Verificação de permissões
    let hasPerm = false;
    if (tabId === 'direcao') {
        hasPerm = sigeDB.temPermissaoModulo('direcao');
    } else if (tabId === 'op') {
        hasPerm = sigeDB.temPermissaoModulo('op') || sigeDB.temPermissaoModulo('direcao');
    } else if (tabId === 'supervisao') {
        hasPerm = sigeDB.temPermissaoModulo('supervisao') || sigeDB.temPermissaoModulo('direcao');
    } else if (tabId === 'admin') {
        hasPerm = sigeDB.temPermissaoModulo('admin') || sigeDB.temPermissaoModulo('secretaria') || sigeDB.temPermissaoModulo('direcao') || sigeDB.temPermissaoModulo('uniformes');
    } else if (tabId === 'externos') {
        hasPerm = true;
    } else if (tabId === 'dev') {
        hasPerm = sigeDB.temPermissaoModulo('dev');
    } else {
        hasPerm = sigeDB.temPermissaoModulo(tabId);
    }

    if (!hasPerm) {
        const moduloNome = modulosLabels[tabId] || tabId;
        showToast(`⚠️ Acesso Restrito: Seu perfil de usuário não possui permissão para acessar o módulo "${moduloNome}".`, "warning");
        const modulosOrdem = ['direcao', 'op', 'supervisao', 'admin', 'externos', 'dev'];
        const primeiroPermitido = modulosOrdem.find(m => {
            if (m === 'direcao') return sigeDB.temPermissaoModulo('direcao');
            if (m === 'op') return sigeDB.temPermissaoModulo('op') || sigeDB.temPermissaoModulo('direcao');
            if (m === 'supervisao') return sigeDB.temPermissaoModulo('supervisao') || sigeDB.temPermissaoModulo('direcao');
            if (m === 'admin') return sigeDB.temPermissaoModulo('admin') || sigeDB.temPermissaoModulo('secretaria') || sigeDB.temPermissaoModulo('direcao') || sigeDB.temPermissaoModulo('uniformes');
            if (m === 'externos') return true;
            if (m === 'dev') return sigeDB.temPermissaoModulo('dev');
            return false;
        }) || 'externos';
        tabId = primeiroPermitido;
    }

    const sections = document.querySelectorAll(".tab-content-section");
    const tabBtns = document.querySelectorAll(".sige-tab-btn:not(.sige-tab-link)");

    sections.forEach(s => s.classList.remove("active"));
    tabBtns.forEach(b => b.classList.remove("active"));

    const targetSectionId = `tab-${tabId}`;
    const targetSection = document.getElementById(targetSectionId) || document.getElementById("tab-direcao") || document.getElementById("tab-op");
    if (targetSection) targetSection.classList.add("active");

    const btn = document.querySelector(`.sige-tab-btn[data-tab="${tabId}"]`);
    if (btn) btn.classList.add("active");

    renderAllModules(tabId);

    // Ativação das sub-abas internas
    if (tabId === 'direcao') {
        switchDirSubTab(subKey || currentDirSubTab || 'whatsapp');
    } else if (tabId === 'op') {
        renderModuleOrientacaoPedagogica();
    } else if (tabId === 'supervisao') {
        renderModuleSupervisao();
    } else if (tabId === 'admin') {
        switchAdminSubTab(subKey || 'assinaturas_docs');
    } else if (tabId === 'externos') {
        // Sistemas externos já renderizados nos cards
    } else if (tabId === 'dev') {
        switchDevSubTab(subKey || currentDevSubTab || 'rbac');
    }
}
window.switchTab = switchTab;
window.switchSigeTab = switchTab;

// ==========================================
// NOTIFICAÇÕES INTELIGENTES E SINO
// ==========================================
function setupNotificationBell() {
    const bellBtn = document.getElementById("notifBellBtn");
    const dropdown = document.getElementById("notifDropdown");

    if (!bellBtn || !dropdown) return;

    bellBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && e.target !== bellBtn) {
            dropdown.classList.remove("active");
        }
    });

    renderNotifications();
}

function renderNotifications() {
    const badge = document.getElementById("notifBadgeCount");
    const listElem = document.getElementById("notifListElem");
    if (!listElem || !badge) return;

    const notifs = sigeDB.getNotificacoesPertinentes();
    const unreadCount = notifs.filter(n => n.unread).length;

    if (unreadCount > 0) {
        badge.style.display = "flex";
        badge.innerText = unreadCount > 9 ? "9+" : unreadCount;
    } else {
        badge.style.display = "none";
    }

    if (notifs.length === 0) {
        listElem.innerHTML = `
            <div style="padding: 1.5rem; text-align: center; color: #94a3b8; font-size: 0.85rem;">
                <i class="fa-solid fa-bell-slash" style="font-size: 1.5rem; margin-bottom: 6px; display: block;"></i>
                Nenhuma notificação pendente para o seu perfil.
            </div>
        `;
        return;
    }

    listElem.innerHTML = notifs.map(n => `
        <div class="notification-item ${n.unread ? 'unread' : ''}" onclick="clickNotification('${n.targetTab}', '${n.id}')">
            <div class="notif-title">${n.title}</div>
            <div class="notif-desc">${n.desc}</div>
            <div class="notif-time"><i class="fa-regular fa-clock"></i> ${n.time}</div>
        </div>
    `).join("");
}

function markAllNotifsRead() {
    sigeDB.markAllNotificationsAsRead();
    renderNotifications();
    showToast("Todas as notificações foram marcadas como lidas.");
}

function clickNotification(targetTab, notifId) {
    if (!sigeDB.data.notificacoesLidas.includes(notifId)) {
        sigeDB.data.notificacoesLidas.push(notifId);
        sigeDB.saveData(sigeDB.data);
    }
    renderNotifications();
    document.getElementById("notifDropdown").classList.remove("active");
    switchTab(targetTab);
}

// ==========================================
// RENDERIZAÇÃO INTELIGENTE (LAZY RENDERING DOS MÓDULOS)
// ==========================================
function renderAllModules(targetModule = null, forceAll = false) {
    // 1. Sempre atualiza as contagens das badges das abas do topo de forma rápida e leve
    try { updateBadgesCounts(); } catch (e) { console.error("Erro em updateBadgesCounts:", e); }

    // 2. Se forçada (boot inicial ou logout/troca de perfil), renderiza todos os módulos
    if (forceAll) {
        try { renderModuleMuralECalendario(); } catch (e) { console.error("Erro em renderModuleMuralECalendario:", e); }
        try { renderModuleOrientacaoPedagogica(); } catch (e) { console.error("Erro em renderModuleOrientacaoPedagogica:", e); }
        try { renderModuleSupervisao(); } catch (e) { console.error("Erro em renderModuleSupervisao:", e); }
        try { renderModuleAdministracao(); } catch (e) { console.error("Erro em renderModuleAdministracao:", e); }
        try { renderModuleDirecao(); } catch (e) { console.error("Erro em renderModuleDirecao:", e); }
        try { renderModuleDev(); } catch (e) { console.error("Erro em renderModuleDev:", e); }
        return;
    }

    // 3. Lazy Rendering: detecta e renderiza estritamente o módulo ativo
    let activeTab = targetModule;
    if (!activeTab) {
        const activeBtn = document.querySelector(".sige-tab-btn.active");
        activeTab = activeBtn ? activeBtn.getAttribute("data-tab") : "op";
    }

    switch (activeTab) {
        case 'op':
        case 'pedagogico':
        case 'dossie':
            try { renderModuleOrientacaoPedagogica(); } catch (e) { console.error("Erro em renderModuleOrientacaoPedagogica:", e); }
            break;
        case 'supervisao':
            try { renderModuleSupervisao(); } catch (e) { console.error("Erro em renderModuleSupervisao:", e); }
            break;
        case 'direcao':
            try { renderModuleDirecao(); } catch (e) { console.error("Erro em renderModuleDirecao:", e); }
            break;
        case 'admin':
        case 'uniformes':
            try { renderModuleAdministracao(); } catch (e) { console.error("Erro em renderModuleAdministracao:", e); }
            break;
        case 'externos':
            // Sistemas externos já renderizados nos cards
            break;
        case 'dev':
            try { renderModuleDev(); } catch (e) { console.error("Erro em renderModuleDev:", e); }
            break;
        default:
            try { renderModuleOrientacaoPedagogica(); } catch (e) { console.error("Erro default render:", e); }
            break;
    }
}

function updateBadgesCounts() {
    const isHidden = localStorage.getItem("sige_hide_tab_bells") === "true";
    const btnToggle = document.getElementById("btnToggleTabBells");
    if (btnToggle) {
        btnToggle.innerHTML = isHidden 
            ? `<i class="fa-solid fa-bell-slash" style="color:#fca5a5;"></i> <span id="btnToggleTabBellsText">Sininhos (Off)</span>`
            : `<i class="fa-solid fa-bell" style="color:#fde047;"></i> <span id="btnToggleTabBellsText">Sininhos (On)</span>`;
        btnToggle.title = isHidden ? "Clique para reativar os sininhos interativos nas abas" : "Clique para ocultar os sininhos nas abas";
    }

    const bDirecao = document.getElementById("badgeTabDirecao");
    const bOp = document.getElementById("badgeTabOP");
    const bSup = document.getElementById("badgeTabSup");
    const bAdm = document.getElementById("badgeTabAdm");
    const bDev = document.getElementById("badgeTabDev");
    const bUni = document.getElementById("badgeTabUniformes");

    if (isHidden) {
        if (bDirecao) bDirecao.style.display = "none";
        if (bOp) bOp.style.display = "none";
        if (bSup) bSup.style.display = "none";
        if (bAdm) bAdm.style.display = "none";
        if (bDev) bDev.style.display = "none";
        return;
    }

    const role = sigeDB.getRole();
    const filterSelect = document.getElementById("opFilterOrientadora");
    const filterVal = filterSelect ? filterSelect.value : "todas";

    const countOp = (typeof sigeDB.getAgendamentosOP === "function") 
        ? sigeDB.getAgendamentosOP().filter(a => a.statusSecretaria === "pendente" && matchOrientadora(a, filterVal)).length
        : 0;

    const countSup = (typeof sigeDB.getDemandasSupervisao === "function")
        ? sigeDB.getDemandasSupervisao().filter(d => d.status === "pendente" || d.status === "em_atendimento").length
        : 0;

    const countAdmDemandas = (typeof sigeDB.getDemandasAdmin === "function")
        ? sigeDB.getDemandasAdmin().filter(d => d.status === "pendente").length
        : 0;

    const countUni = (typeof sigeDB.getPedidosUniformes === "function") 
        ? sigeDB.getPedidosUniformes().filter(p => p.status === "pendente_envio" || p.status === "disponivel_estoque").length 
        : 0;

    const totalAdm = countAdmDemandas + countUni;

    const countDevPending = (typeof sigeDB.getUsuarios === "function")
        ? sigeDB.getUsuarios().filter(u => u.status === "pendente").length
        : 0;

    if (bOp) {
        bOp.innerHTML = `<i class="fa-solid fa-bell" style="font-size:0.65rem; margin-right:3px;"></i>${countOp}`;
        bOp.title = `${countOp} atendimento(s) pendente(s) na Orientação — Clique para abrir e resolver`;
        bOp.style.display = countOp > 0 ? "inline-flex" : "none";
    }
    if (bSup) {
        bSup.innerHTML = `<i class="fa-solid fa-bell" style="font-size:0.65rem; margin-right:3px;"></i>${countSup}`;
        bSup.title = `${countSup} demanda(s) pendente(s) na Supervisão — Clique para abrir e resolver`;
        bSup.style.display = countSup > 0 ? "inline-flex" : "none";
    }
    if (bAdm) {
        bAdm.innerHTML = `<i class="fa-solid fa-bell" style="font-size:0.65rem; margin-right:3px;"></i>${totalAdm}`;
        bAdm.title = `${totalAdm} pendência(s) na Secretaria (Demandas / Uniformes) — Clique para abrir e resolver`;
        bAdm.style.display = totalAdm > 0 ? "inline-flex" : "none";
    }
    if (bDev) {
        bDev.innerHTML = `<i class="fa-solid fa-bell" style="font-size:0.65rem; margin-right:3px;"></i>${countDevPending}`;
        bDev.title = `${countDevPending} solicitação(ões) de acesso aguardando aprovação — Clique para abrir`;
        bDev.style.display = countDevPending > 0 ? "inline-flex" : "none";
    }
    if (bUni) {
        bUni.innerText = countUni;
        bUni.title = `${countUni} pedido(s) de uniforme aguardando envio ou entrega`;
        bUni.style.display = countUni > 0 ? "inline-block" : "none";
    }
}

// ==========================================
// CENTRAL INTERATIVA DE PENDÊNCIAS DOS SININHOS
// ==========================================
let currentPendenciasModulo = null;

function formatDataIsoExibicao(d) {
    if (!d) return "";
    const str = String(d).trim();
    if (str.includes("-")) {
        const parts = str.split("T")[0].split("-");
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return str;
}

function formatItensUniformeResumo(itens) {
    if (!itens) return "Nenhum item informado";
    if (typeof itens === "string") return escapeHtml(itens);
    if (Array.isArray(itens)) {
        return itens.map(i => `${i.qtd || 1}x ${escapeHtml(i.tipo || 'Peça')} (${escapeHtml(i.tamanho || '-')})`).join(', ');
    }
    if (typeof itens === "object") {
        return Object.entries(itens).filter(([_, q]) => q > 0).map(([k, q]) => `${q}x ${escapeHtml(k)}`).join(', ');
    }
    return "";
}

function toggleSininhoBadges(forceState = null) {
    const currentState = localStorage.getItem("sige_hide_tab_bells") === "true";
    const newState = (forceState !== null) ? !forceState : !currentState;
    localStorage.setItem("sige_hide_tab_bells", newState ? "true" : "false");
    updateBadgesCounts();
    if (newState) {
        closePendenciasModuloModal();
        if (typeof showToast === "function") {
            showToast("🔕 Sininhos ocultados das abas do sistema.");
        }
    } else {
        if (typeof showToast === "function") {
            showToast("🔔 Sininhos interativos ativados com sucesso nas abas!");
        }
    }
}

function openPendenciasModuloModal(e, moduloKey) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    currentPendenciasModulo = moduloKey;

    const modal = document.getElementById("modalPendenciasModulo");
    const titulo = document.getElementById("modalPendenciasTitulo");
    const subtitulo = document.getElementById("modalPendenciasSubtitulo");
    const iconBox = document.getElementById("modalPendenciasIconBox");
    const lista = document.getElementById("modalPendenciasLista");
    const btnToggleModal = document.getElementById("btnToggleOcultarSininhos");

    if (!modal || !lista) return;

    if (btnToggleModal) {
        btnToggleModal.innerHTML = `<i class="fa-solid fa-bell-slash"></i> Ocultar sininhos de todas as abas`;
    }

    let itemsHtml = "";
    let count = 0;

    if (moduloKey === "op") {
        if (iconBox) {
            iconBox.style.background = "#fce7f3";
            iconBox.style.color = "#ec4899";
            iconBox.innerHTML = `<i class="fa-solid fa-heart-pulse"></i>`;
        }
        if (subtitulo) subtitulo.innerText = "Atendimentos e agendamentos aguardando atendimento ou recepção na Orientação.";
        
        const filterSelect = document.getElementById("opFilterOrientadora");
        const filterVal = filterSelect ? filterSelect.value : "todas";
        const pendentes = sigeDB.getAgendamentosOP().filter(a => a.statusSecretaria === "pendente" && matchOrientadora(a, filterVal));
        count = pendentes.length;
        if (titulo) titulo.innerHTML = `<i class="fa-solid fa-heart-pulse" style="color:#ec4899;"></i> Orientação Educacional — ${count} Pendência(s)`;

        if (count === 0) {
            itemsHtml = `
                <div style="text-align:center; padding:2.5rem 1rem; color:#64748b;">
                    <i class="fa-solid fa-circle-check" style="font-size:2.5rem; color:#10b981; margin-bottom:10px; display:block;"></i>
                    <strong style="color:#0f172a; font-size:1rem;">Nenhum atendimento pendente!</strong>
                    <p style="font-size:0.85rem; margin-top:4px;">A agenda da Orientação Educacional está em dia.</p>
                </div>
            `;
        } else {
            itemsHtml = pendentes.map(p => `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #ec4899; border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:240px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <span style="background:#fce7f3; color:#be185d; font-size:0.72rem; font-weight:800; padding:2px 7px; border-radius:6px;">
                                <i class="fa-solid fa-clock"></i> Pendente
                            </span>
                            <span style="font-size:0.75rem; color:#64748b; font-weight:700;">
                                <i class="fa-regular fa-calendar"></i> ${formatDataIsoExibicao(p.data)} ${p.horario ? 'às ' + p.horario : ''}
                            </span>
                            ${p.turma ? `<span style="background:#e0f2fe; color:#0369a1; font-size:0.72rem; font-weight:700; padding:2px 6px; border-radius:6px;">${escapeHtml(p.turma)}</span>` : ''}
                        </div>
                        <div style="font-weight:800; color:#0f172a; font-size:0.95rem;">
                            👤 ${escapeHtml(p.aluno || 'Estudante')}
                        </div>
                        <div style="font-size:0.8rem; color:#475569; margin-top:3px;">
                            <strong>Motivo:</strong> ${escapeHtml(p.motivo || 'Atendimento agendado')}
                        </div>
                        ${p.solicitante ? `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Solicitado por: ${escapeHtml(p.solicitante)}</div>` : ''}
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0;">
                        <button type="button" onclick="resolverPendenciaOPDireta('${p.id}')" class="btn btn-primary" style="padding:6px 12px; font-size:0.78rem; background:#ec4899; border:none; font-weight:800;" title="Abrir ficha e iniciar atendimento">
                            <i class="fa-solid fa-play"></i> Atender / Ver
                        </button>
                    </div>
                </div>
            `).join("");
        }

    } else if (moduloKey === "supervisao") {
        if (iconBox) {
            iconBox.style.background = "#e0f2fe";
            iconBox.style.color = "#0284c7";
            iconBox.innerHTML = `<i class="fa-solid fa-clipboard-check"></i>`;
        }
        if (subtitulo) subtitulo.innerText = "Demandas pedagógicas e apoio aos professores aguardando resolução.";
        const demandas = sigeDB.getDemandasSupervisao().filter(d => d.status === "pendente" || d.status === "em_atendimento");
        count = demandas.length;
        if (titulo) titulo.innerHTML = `<i class="fa-solid fa-clipboard-check" style="color:#0284c7;"></i> Supervisão Pedagógica — ${count} Demanda(s)`;

        if (count === 0) {
            itemsHtml = `
                <div style="text-align:center; padding:2.5rem 1rem; color:#64748b;">
                    <i class="fa-solid fa-circle-check" style="font-size:2.5rem; color:#10b981; margin-bottom:10px; display:block;"></i>
                    <strong style="color:#0f172a; font-size:1rem;">Nenhuma demanda pendente!</strong>
                    <p style="font-size:0.85rem; margin-top:4px;">Todas as demandas pedagógicas foram atendidas.</p>
                </div>
            `;
        } else {
            itemsHtml = demandas.map(d => `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #0284c7; border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:240px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <span style="background:#fee2e2; color:#b91c1c; font-size:0.72rem; font-weight:800; padding:2px 7px; border-radius:6px;">
                                ${d.status === 'em_atendimento' ? '🟡 Em Atendimento' : '🔴 Pendente'}
                            </span>
                            <span style="background:#f1f5f9; color:#475569; font-size:0.72rem; font-weight:700; padding:2px 6px; border-radius:6px;">
                                Prioridade: ${(d.prioridade || 'Média').toUpperCase()}
                            </span>
                            <span style="font-size:0.75rem; color:#64748b;">
                                <i class="fa-regular fa-calendar"></i> ${formatDataIsoExibicao(d.dataInicio || d.data)}
                            </span>
                        </div>
                        <div style="font-weight:800; color:#0f172a; font-size:0.95rem;">
                            📋 ${escapeHtml(d.titulo)}
                        </div>
                        <div style="font-size:0.8rem; color:#475569; margin-top:3px;">
                            <strong>Alvo:</strong> ${escapeHtml(d.turmaOuProfessor || d.responsavel || 'Equipe')}
                        </div>
                        ${d.descricao ? `<div style="font-size:0.75rem; color:#64748b; margin-top:2px; max-height:2.4em; overflow:hidden;">${escapeHtml(d.descricao)}</div>` : ''}
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0;">
                        <button type="button" onclick="resolverPendenciaSupDireta('${d.id}')" class="btn btn-primary" style="padding:6px 12px; font-size:0.78rem; background:#0284c7; border:none; font-weight:800;">
                            <i class="fa-solid fa-folder-open"></i> Abrir Demanda
                        </button>
                    </div>
                </div>
            `).join("");
        }

    } else if (moduloKey === "admin") {
        if (iconBox) {
            iconBox.style.background = "#e0e7ff";
            iconBox.style.color = "#4338ca";
            iconBox.innerHTML = `<i class="fa-solid fa-school"></i>`;
        }
        if (subtitulo) subtitulo.innerText = "Demandas administrativas e pedidos de uniforme aguardando ação.";
        const demandasAdm = sigeDB.getDemandasAdmin().filter(d => d.status === "pendente");
        const pedidosUni = (typeof sigeDB.getPedidosUniformes === "function")
            ? sigeDB.getPedidosUniformes().filter(p => p.status === "pendente_envio" || p.status === "disponivel_estoque")
            : [];
        count = demandasAdm.length + pedidosUni.length;
        if (titulo) titulo.innerHTML = `<i class="fa-solid fa-school" style="color:#4338ca;"></i> Secretaria & Operacional — ${count} Pendência(s)`;

        if (count === 0) {
            itemsHtml = `
                <div style="text-align:center; padding:2.5rem 1rem; color:#64748b;">
                    <i class="fa-solid fa-circle-check" style="font-size:2.5rem; color:#10b981; margin-bottom:10px; display:block;"></i>
                    <strong style="color:#0f172a; font-size:1rem;">Secretaria em dia!</strong>
                    <p style="font-size:0.85rem; margin-top:4px;">Nenhuma demanda administrativa ou pedido de uniforme pendente.</p>
                </div>
            `;
        } else {
            const listDemandas = demandasAdm.map(d => `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #4338ca; border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:8px;">
                    <div style="flex:1; min-width:240px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <span style="background:#fee2e2; color:#b91c1c; font-size:0.72rem; font-weight:800; padding:2px 7px; border-radius:6px;">
                                📁 Demanda Administrativa
                            </span>
                            <span style="font-size:0.75rem; color:#64748b;">
                                <i class="fa-regular fa-calendar"></i> ${formatDataIsoExibicao(d.dataInicio || d.data)}
                            </span>
                        </div>
                        <div style="font-weight:800; color:#0f172a; font-size:0.95rem;">
                            ${escapeHtml(d.titulo)}
                        </div>
                        ${d.solicitante ? `<div style="font-size:0.78rem; color:#475569; margin-top:2px;">Solicitante: ${escapeHtml(d.solicitante)}</div>` : ''}
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0;">
                        <button type="button" onclick="resolverPendenciaAdmDireta('${d.id}')" class="btn btn-primary" style="padding:6px 12px; font-size:0.78rem; background:#4338ca; border:none; font-weight:800;">
                            <i class="fa-solid fa-folder-open"></i> Abrir Demanda
                        </button>
                    </div>
                </div>
            `).join("");

            const listUniformes = pedidosUni.map(u => `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #0284c7; border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:8px;">
                    <div style="flex:1; min-width:240px;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                            <span style="background:#e0f2fe; color:#0369a1; font-size:0.72rem; font-weight:800; padding:2px 7px; border-radius:6px;">
                                <i class="fa-solid fa-shirt"></i> Pedido Uniforme
                            </span>
                            <span style="font-size:0.75rem; color:#64748b; font-weight:700;">
                                Status: ${u.status === 'disponivel_estoque' ? '📦 Disponível para Entrega' : '⏳ Aguardando Envio'}
                            </span>
                        </div>
                        <div style="font-weight:800; color:#0f172a; font-size:0.95rem;">
                            👤 ${escapeHtml(u.aluno || 'Estudante')} ${u.turma ? '(' + escapeHtml(u.turma) + ')' : ''}
                        </div>
                        <div style="font-size:0.78rem; color:#475569; margin-top:2px;">
                            ${formatItensUniformeResumo(u.itens)}
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0;">
                        <button type="button" onclick="resolverPedidoUniformeDireto('${u.id}')" class="btn btn-primary" style="padding:6px 12px; font-size:0.78rem; background:#0284c7; border:none; font-weight:800;">
                            <i class="fa-solid fa-box-open"></i> Atender Pedido
                        </button>
                    </div>
                </div>
            `).join("");

            itemsHtml = listDemandas + listUniformes;
        }

    } else if (moduloKey === "dev") {
        if (iconBox) {
            iconBox.style.background = "#fef3c7";
            iconBox.style.color = "#d97706";
            iconBox.innerHTML = `<i class="fa-solid fa-shield-halved"></i>`;
        }
        if (subtitulo) subtitulo.innerText = "Solicitações de cadastro aguardando autorização de acesso ao sistema.";
        const pendentes = sigeDB.getUsuarios().filter(u => u.status === "pendente");
        count = pendentes.length;
        if (titulo) titulo.innerHTML = `<i class="fa-solid fa-shield-halved" style="color:#d97706;"></i> Desenvolvedor & TI — ${count} Solicitação(ões)`;

        if (count === 0) {
            itemsHtml = `
                <div style="text-align:center; padding:2.5rem 1rem; color:#64748b;">
                    <i class="fa-solid fa-circle-check" style="font-size:2.5rem; color:#10b981; margin-bottom:10px; display:block;"></i>
                    <strong style="color:#0f172a; font-size:1rem;">Nenhuma solicitação pendente!</strong>
                    <p style="font-size:0.85rem; margin-top:4px;">Todos os acessos solicitados foram analisados.</p>
                </div>
            `;
        } else {
            itemsHtml = pendentes.map(u => `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #d97706; border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:240px;">
                        <div style="font-weight:800; color:#0f172a; font-size:0.95rem;">
                            👤 ${escapeHtml(u.nome || u.email)}
                        </div>
                        <div style="font-size:0.8rem; color:#475569; margin-top:2px;">
                            <strong>E-mail:</strong> ${escapeHtml(u.email || 'Não informado')} | <strong>CPF:</strong> ${escapeHtml(u.cpf || 'Não informado')}
                        </div>
                        <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                            Perfil Solicitado: <strong>${escapeHtml(u.role || 'Geral')}</strong>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0;">
                        <button type="button" onclick="aprovarUsuarioPendenteDireto('${u.id || u.cpf || u.email}')" class="btn btn-primary" style="padding:6px 12px; font-size:0.78rem; background:#16a34a; border:none; font-weight:800;">
                            <i class="fa-solid fa-check"></i> Aprovar
                        </button>
                        <button type="button" onclick="recusarUsuarioPendenteDireto('${u.id || u.cpf || u.email}')" class="btn btn-secondary" style="padding:6px 10px; font-size:0.78rem; color:#dc2626; border-color:#fca5a5;">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            `).join("");
        }

    } else if (moduloKey === "direcao") {
        if (iconBox) {
            iconBox.style.background = "#fef3c7";
            iconBox.style.color = "#d97706";
            iconBox.innerHTML = `<i class="fa-solid fa-crown"></i>`;
        }
        if (subtitulo) subtitulo.innerText = "Demandas e encaminhamentos da Direção Escolar.";
        const pendentes = sigeDB.getDemandasAdmin().filter(d => (d.categoria === "direcao" || (d.responsavel && d.responsavel.toLowerCase().includes("dire"))) && d.status === "pendente");
        count = pendentes.length;
        if (titulo) titulo.innerHTML = `<i class="fa-solid fa-crown" style="color:var(--accent-gold);"></i> Gestão & Direção — ${count} Pendência(s)`;
        if (count === 0) {
            itemsHtml = `
                <div style="text-align:center; padding:2.5rem 1rem; color:#64748b;">
                    <i class="fa-solid fa-circle-check" style="font-size:2.5rem; color:#10b981; margin-bottom:10px; display:block;"></i>
                    <strong style="color:#0f172a; font-size:1rem;">Gabinete em dia!</strong>
                    <p style="font-size:0.85rem; margin-top:4px;">Nenhuma pendência administrativa pendente na Direção.</p>
                </div>
            `;
        } else {
            itemsHtml = pendentes.map(d => `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #d97706; border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:12px;">
                    <div>
                        <div style="font-weight:800; color:#0f172a;">${escapeHtml(d.titulo)}</div>
                        <div style="font-size:0.8rem; color:#475569;">${escapeHtml(d.descricao || '')}</div>
                    </div>
                    <button type="button" onclick="resolverPendenciaAdmDireta('${d.id}')" class="btn btn-primary" style="padding:6px 12px; font-size:0.78rem;">Abrir</button>
                </div>
            `).join("");
        }
    }

    lista.innerHTML = itemsHtml;
    modal.style.display = "flex";
}

function closePendenciasModuloModal() {
    const modal = document.getElementById("modalPendenciasModulo");
    if (modal) modal.style.display = "none";
}

function irParaModuloFiltrandoPendencias() {
    if (!currentPendenciasModulo) return;
    const mod = currentPendenciasModulo;
    closePendenciasModuloModal();
    switchTab(mod);
}

function resolverPendenciaOPDireta(id) {
    closePendenciasModuloModal();
    switchTab('op');
    setTimeout(() => {
        const itemElem = document.querySelector(`[data-id="${id}"]`) || document.querySelector(`[data-op-id="${id}"]`) || document.getElementById(`card-op-${id}`);
        if (itemElem) {
            itemElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            itemElem.style.transition = 'all 0.4s ease';
            itemElem.style.boxShadow = '0 0 0 3px #ec4899';
            setTimeout(() => { itemElem.style.boxShadow = ''; }, 3000);
        }
    }, 250);
}

function resolverPendenciaSupDireta(id) {
    closePendenciasModuloModal();
    switchTab('supervisao');
    if (typeof openDemandaSupervisaoModalWithData === 'function') {
        openDemandaSupervisaoModalWithData(id);
    }
}

function resolverPendenciaAdmDireta(id) {
    closePendenciasModuloModal();
    switchTab('admin');
    if (typeof openDemandaAdminModalWithData === 'function') {
        openDemandaAdminModalWithData(id);
    }
}

function resolverPedidoUniformeDireto(id) {
    closePendenciasModuloModal();
    switchTab('admin', 'uniformes');
    if (typeof openModalConfirmarEntrega === 'function') {
        openModalConfirmarEntrega(id);
    }
}

function aprovarUsuarioPendenteDireto(key) {
    if (typeof aprovarUsuario === 'function') {
        aprovarUsuario(key);
    } else {
        sigeDB.aprovarUsuarioPendente(key);
    }
    openPendenciasModuloModal(null, 'dev');
    updateBadgesCounts();
}

function recusarUsuarioPendenteDireto(key) {
    if (typeof recusarUsuario === 'function') {
        recusarUsuario(key);
    } else {
        sigeDB.recusarUsuarioPendente(key);
    }
    openPendenciasModuloModal(null, 'dev');
    updateBadgesCounts();
}

window.openPendenciasModuloModal = openPendenciasModuloModal;
window.closePendenciasModuloModal = closePendenciasModuloModal;
window.toggleSininhoBadges = toggleSininhoBadges;
window.irParaModuloFiltrandoPendencias = irParaModuloFiltrandoPendencias;
window.resolverPendenciaOPDireta = resolverPendenciaOPDireta;
window.resolverPendenciaSupDireta = resolverPendenciaSupDireta;
window.resolverPendenciaAdmDireta = resolverPendenciaAdmDireta;
window.resolverPedidoUniformeDireto = resolverPedidoUniformeDireto;
window.aprovarUsuarioPendenteDireto = aprovarUsuarioPendenteDireto;
window.recusarUsuarioPendenteDireto = recusarUsuarioPendenteDireto;

// ==========================================
// MÓDULO PEDAGÓGICO: DOSSIÊ DO ESTUDANTE 360º
// ==========================================
let dossieFiltroTexto = '';
let dossieFiltroTurma = 'todas';

function renderDossieEstudantesModulo() {
    const container = document.getElementById("dossieEstudantesGridContainer");
    const badgeTotal = document.getElementById("dossieTotalAlunosBadge");
    const selectTurma = document.getElementById("dossieFilterTurma");
    if (!container) return;

    const alunosCadastrados = (typeof sigeDB.getAlunosImportados === 'function') ? sigeDB.getAlunosImportados() : [];
    const allOp = (typeof sigeDB.getAgendamentosOP === 'function') ? sigeDB.getAgendamentosOP() : [];
    const allUniformes = (typeof sigeDB.getPedidosUniformes === 'function') ? sigeDB.getPedidosUniformes() : [];

    // Mapa unificado de estudantes (nome como chave primária)
    const mapaAlunos = new Map();

    // 1. Alunos da base importada (SME)
    alunosCadastrados.forEach(a => {
        if (!a || !a.nome) return;
        const key = a.nome.trim().toLowerCase();
        mapaAlunos.set(key, {
            nome: a.nome.trim(),
            turma: a.turma || 'Não informada',
            turno: a.turno || 'Matutino',
            responsavel: a.responsavel || 'Responsável Legal',
            whatsapp: a.whatsapp || a.telefone || '',
            origem: 'SME / Importação'
        });
    });

    // 2. Alunos com atendimentos na OE
    allOp.forEach(op => {
        if (!op || !op.aluno) return;
        const key = op.aluno.trim().toLowerCase();
        if (!mapaAlunos.has(key)) {
            mapaAlunos.set(key, {
                nome: op.aluno.trim(),
                turma: op.turma || 'OE',
                turno: op.turno || 'Matutino',
                responsavel: op.responsavel || 'Responsável',
                whatsapp: op.whatsapp || op.telefone || '',
                origem: 'Orientação Educacional'
            });
        }
    });

    const listaGeral = Array.from(mapaAlunos.values());

    // Popula select de turmas dinamicamente
    if (selectTurma && selectTurma.options.length <= 1) {
        const turmasSet = new Set();
        listaGeral.forEach(al => { if (al.turma && al.turma !== 'Não informada' && al.turma !== 'OE') turmasSet.add(al.turma); });
        Array.from(turmasSet).sort().forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = `Turma ${t}`;
            selectTurma.appendChild(opt);
        });
    }

    if (badgeTotal) {
        badgeTotal.innerHTML = `<i class="fa-solid fa-users"></i> ${listaGeral.length} Alunos na Base`;
    }

    // Aplica filtros
    let filtrados = listaGeral;
    if (dossieFiltroTurma && dossieFiltroTurma !== 'todas') {
        filtrados = filtrados.filter(a => a.turma === dossieFiltroTurma);
    }
    if (dossieFiltroTexto) {
        filtrados = filtrados.filter(a => 
            a.nome.toLowerCase().includes(dossieFiltroTexto) ||
            a.turma.toLowerCase().includes(dossieFiltroTexto) ||
            (a.responsavel && a.responsavel.toLowerCase().includes(dossieFiltroTexto))
        );
    }

    // Ordena alfabeticamente
    filtrados.sort((a, b) => a.nome.localeCompare(b.nome));

    // Exibe até 60 alunos para fluidez instantânea
    const exibidos = filtrados.slice(0, 60);

    if (exibidos.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 3rem 1rem; text-align: center; color: #64748b; background: white; border-radius: 16px; border: 1px dashed #cbd5e1;">
                <i class="fa-solid fa-user-slash" style="font-size: 2.2rem; color: #cbd5e1; margin-bottom: 10px; display: block;"></i>
                <h4 style="margin: 0 0 4px 0; color: #334155;">Nenhum estudante encontrado</h4>
                <p style="font-size: 0.85rem; margin: 0;">Tente outro nome ou selecione outra turma nos filtros acima.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = exibidos.map(al => {
        const atendimentosAluno = allOp.filter(op => (op.aluno || '').toLowerCase().trim() === al.nome.toLowerCase());
        const uniformesAluno = allUniformes.filter(u => (u.aluno || '').toLowerCase().trim() === al.nome.toLowerCase());
        const totalAtend = atendimentosAluno.length;
        const totalUni = uniformesAluno.length;

        const cleanPhone = (al.whatsapp || '').replace(/\D/g, '');
        const waLink = cleanPhone.length >= 10 
            ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent('Olá, responsável pelo(a) estudante ' + al.nome + ' do C.E. Pedro Rizzi:')}`
            : null;

        const badgeAtend = totalAtend > 0 
            ? `<span style="background:#fef3c7; color:#92400e; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px;"><i class="fa-solid fa-heart-pulse"></i> ${totalAtend} Atendimento(s)</span>`
            : `<span style="background:#f1f5f9; color:#64748b; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:6px;">Sem Atendimentos OE</span>`;

        return `
            <div class="dir-card" style="padding:16px; display:flex; flex-direction:column; justify-content:space-between; border-radius:14px; border:1px solid #cbd5e1; background:white; transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 6px 18px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow='none'">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:10px;">
                        <div>
                            <h4 style="margin:0; font-size:1.02rem; font-weight:800; color:#0f172a;">${escapeHtml(al.nome)}</h4>
                            <div style="font-size:0.8rem; color:#475569; margin-top:2px; display:flex; align-items:center; gap:6px;">
                                <span style="background:#eff6ff; color:#1e40af; font-weight:800; padding:2px 6px; border-radius:4px;">Turma ${escapeHtml(al.turma)}</span>
                                <span>• ${escapeHtml(al.turno)}</span>
                            </div>
                        </div>
                        <div>${badgeAtend}</div>
                    </div>

                    <div style="font-size:0.8rem; color:#64748b; line-height:1.5; margin-bottom:12px; background:#f8fafc; padding:8px 10px; border-radius:8px; border:1px solid #f1f5f9;">
                        <div><strong>Responsável:</strong> ${escapeHtml(al.responsavel)}</div>
                        <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                            <strong>Telefone:</strong> ${al.whatsapp ? escapeHtml(al.whatsapp) : '<span style="color:#94a3b8;">Não informado</span>'}
                            ${waLink ? `
                                <a href="${waLink}" target="_blank" rel="noopener noreferrer" style="color:#16a34a; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:3px; margin-left:4px;" title="Conversar no WhatsApp">
                                    <i class="fa-brands fa-whatsapp"></i> Conversar
                                </a>
                            ` : ''}
                        </div>
                        ${totalUni > 0 ? `<div style="margin-top:2px; color:#0369a1;"><i class="fa-solid fa-shirt"></i> Possui registro de uniforme</div>` : ''}
                    </div>
                </div>

                <div style="display:flex; gap:6px; flex-wrap:wrap; border-top:1px solid #f1f5f9; padding-top:10px;">
                    <button type="button" onclick="openPrintDossieModal('${escapeHtml(al.nome)}')" class="btn" style="flex:1; background:#1e3a8a; color:white; font-size:0.75rem; font-weight:800; padding:6px 10px; border-radius:8px; border:none; cursor:pointer;" title="Visualizar e Imprimir Ficha Timbrada Completa">
                        <i class="fa-solid fa-print"></i> Ficha 360º
                    </button>
                    ${totalAtend > 0 ? `
                        <button type="button" onclick="abrirProntuarioDoAlunoDireto('${escapeHtml(al.nome)}')" class="btn" style="background:#7c3aed; color:white; font-size:0.75rem; font-weight:800; padding:6px 10px; border-radius:8px; border:none; cursor:pointer;" title="Abrir Histórico Detalhado de Atendimentos">
                            <i class="fa-solid fa-folder-open"></i> Prontuário
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join("");
}

function filtrarDossieAlunosUI() {
    const input = document.getElementById("dossieSearchInput");
    const select = document.getElementById("dossieFilterTurma");
    dossieFiltroTexto = input ? input.value.trim().toLowerCase() : '';
    dossieFiltroTurma = select ? select.value : 'todas';
    renderDossieEstudantesModulo();
}

function resetDossieBuscaUI() {
    const input = document.getElementById("dossieSearchInput");
    const select = document.getElementById("dossieFilterTurma");
    if (input) input.value = '';
    if (select) select.value = 'todas';
    dossieFiltroTexto = '';
    dossieFiltroTurma = 'todas';
    renderDossieEstudantesModulo();
}

function abrirProntuarioDoAlunoDireto(alunoNome) {
    const allOp = sigeDB.getAgendamentosOP() || [];
    const primeiro = allOp.find(a => (a.aluno || '').toLowerCase().trim() === alunoNome.toLowerCase().trim());
    if (primeiro) {
        if (typeof openProntuarioModal === 'function') {
            openProntuarioModal(primeiro);
        } else if (typeof openPrintDossieModal === 'function') {
            openPrintDossieModal(alunoNome);
        }
    } else {
        openPrintDossieModal(alunoNome);
    }
}
window.renderDossieEstudantesModulo = renderDossieEstudantesModulo;
window.filtrarDossieAlunosUI = filtrarDossieAlunosUI;
window.resetDossieBuscaUI = resetDossieBuscaUI;
window.abrirProntuarioDoAlunoDireto = abrirProntuarioDoAlunoDireto;

function openExternalModuleUrlDirect(key, event) {
    if (event) event.preventDefault();
    let savedUrls = {};
    try {
        savedUrls = JSON.parse(localStorage.getItem('pedro_rizzi_urls') || '{}');
    } catch (e) {
        savedUrls = {};
    }
    const defaultUrls = {
        recursos: 'https://elcortelini.github.io/agendamento-cepr/',
        dashboard: 'dashboard.html',
        contabil: '#',
        biblioteca: '#',
        patrimonio: '#'
    };
    const url = savedUrls[key] || defaultUrls[key];
    if (!url || url === '#' || url === 'javascript:void(0)') {
        showToast(`⚠️ O link oficial do sistema ${key.toUpperCase()} ainda não foi configurado pelo Desenvolvedor.`, "warning");
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}
window.openExternalModuleUrlDirect = openExternalModuleUrlDirect;

// ==========================================
// MÓDULO 1: MURAL DO DIA & CALENDÁRIO
// ==========================================
function renderModuleMuralECalendario() {
    const containerMural = document.getElementById("muralContainer");
    const containerCal = document.getElementById("calendarioContainer");

    if (containerMural) {
        const avisos = sigeDB.getMuralAvisos();
        if (avisos.length === 0) {
            containerMural.innerHTML = `<div class="empty-state"><i class="fa-solid fa-bullhorn"></i><p>Nenhum aviso publicado no momento.</p></div>`;
        } else {
            containerMural.innerHTML = avisos.map(a => `
                <div class="notice-card ${a.urgente ? 'urgent' : ''}">
                    <span class="notice-badge-target"><i class="fa-solid fa-tag"></i> ${a.target.toUpperCase()}</span>
                    ${a.urgente ? '<span class="priority-tag prio-alta" style="float:right;">🚨 URGENTE</span>' : ''}
                    <h4 class="notice-title">${a.titulo}</h4>
                    <p class="notice-body">${a.conteudo}</p>
                    <div class="notice-footer">
                        <span><i class="fa-solid fa-user-pen"></i> ${a.autor}</span>
                        <span><i class="fa-regular fa-calendar"></i> ${formatDateBR(a.data)}</span>
                    </div>
                </div>
            `).join("");
        }
    }

    if (containerCal) {
        const tarefas = sigeDB.getCalendarioTarefas();
        if (tarefas.length === 0) {
            containerCal.innerHTML = `<div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><p>Nenhuma tarefa no calendário.</p></div>`;
        } else {
            containerCal.innerHTML = tarefas.map(t => `
                <div class="demanda-card" style="border-left: 4px solid ${t.status === 'concluido' ? '#10b981' : '#f59e0b'};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <div class="demanda-title" style="text-decoration: ${t.status === 'concluido' ? 'line-through' : 'none'};">
                                ${t.tarefa}
                            </div>
                            <div style="font-size:0.8rem; color:#64748b; margin-top:4px;">
                                <i class="fa-solid fa-user-check" style="color:var(--primary-light);"></i> <strong>Quem faz:</strong> ${t.responsavel}
                            </div>
                        </div>
                        <button onclick="toggleTarefaStatus('${t.id}')" class="btn-sec ${t.status === 'concluido' ? 'btn-sec-ok' : 'btn-sec-fail'}" style="white-space:nowrap;">
                            ${t.status === 'concluido' ? '<i class="fa-solid fa-circle-check"></i> Concluído' : '<i class="fa-regular fa-circle"></i> Marcar OK'}
                        </button>
                    </div>
                    <div class="demanda-meta">
                        <span><i class="fa-regular fa-clock"></i> <strong>Quando:</strong> ${formatDateBR(t.quando)}</span>
                        <span class="role-badge-pill role-pill-comunidade">${t.destinatario}</span>
                    </div>
                </div>
            `).join("");
        }
    }
}

function toggleTarefaStatus(id) {
    sigeDB.toggleStatusTarefa(id);
    renderModuleMuralECalendario();
    showToast("Status da tarefa atualizado!");
}

// ==========================================
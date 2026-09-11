/**
 * gestao-app.js - Lógica Principal da Aplicação SIGE
 * Centro Educacional Pedro Rizzi
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

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    checkSigeAuth();
    setupRoleSelector();
    setupTabNavigation();
    setupNotificationBell();
    updateAllDynamicSelects();
    renderAllModules();
    setupOpButtons();
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
// AUTENTICAÇÃO E PERMISSÕES (RBAC)
// ==========================================
function checkSigeAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const actionParam = urlParams.get('action') || urlParams.get('aba');

    // Se o acesso veio do link "Desenvolvedor do Sistema", realiza o login automático do desenvolvedor
    if (actionParam === 'dev') {
        sigeDB.loginWithEmail('elcortelini@gmail.com');
    }

    const user = sigeDB.getLoggedUser();
    const loginModal = document.getElementById("modalSigeLogin");
    const roleWrapper = document.getElementById("roleSelectorContainerWrapper");
    const btnDev = document.getElementById("btnDevManageUsers");
    const userText = document.getElementById("loggedUserEmailText");
    const opFilter = document.getElementById("opFilterOrientadora");

    if (!user) {
        if (loginModal) loginModal.style.display = "flex";
        return false;
    }

    if (loginModal) loginModal.style.display = "none";

    if (userText) {
        userText.innerHTML = `<i class="fa-solid fa-user-circle"></i> <strong>${user.nome}</strong> (${user.email})`;
    }

    // Define papel no BD local
    sigeDB.setRole(user.role);

    // O Seletor de Perfis e o botão de Gestão de Usuários são EXCLUSIVOS do Desenvolvedor
    const isDev = user.role === "desenvolvedor";
    if (roleWrapper) roleWrapper.style.display = isDev ? "inline-flex" : "none";
    if (btnDev) btnDev.style.display = isDev ? "inline-flex" : "none";

    // Trava de Orientadoras: Orientadora Clarinda / Daiane vêm bloqueadas para a sua própria visão
    if (opFilter) {
        if (user.role === "orientadora_clarinda") {
            opFilter.value = "Clarinda Rosa Pereira";
            opFilter.disabled = true;
        } else if (user.role === "orientadora_daiane") {
            opFilter.value = "Daiane Caetano Costa de Aquino";
            opFilter.disabled = true;
        } else {
            opFilter.disabled = false;
        }
    }

    // Se o acesso veio do botão Desenvolvedor, abre diretamente o painel de cadastro de usuários e acessos
    if (actionParam === 'dev' && isDev) {
        setTimeout(() => {
            openDevUserModal();
        }, 200);
    }

    return true;
}

function submitSigeLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const emailInput = document.getElementById("loginEmailInput");
    if (!emailInput) return;
    const email = emailInput.value.trim();
    if (!email) return;

    const user = sigeDB.loginWithEmail(email);
    if (user) {
        showToast(`Bem-vindo(a), ${user.nome}!`);
        checkSigeAuth();
        renderAllModules();
    } else {
        alert("E-mail não cadastrado no sistema. Verifique a digitação ou solicite autorização ao Desenvolvedor (elcortelini@gmail.com).");
    }
}

function fillLoginEmail(email) {
    const emailInput = document.getElementById("loginEmailInput");
    if (emailInput) {
        emailInput.value = email;
    }
}

function handleSigeLogout() {
    sigeDB.logout();
    showToast("Sessão encerrada.");
    checkSigeAuth();
    renderAllModules();
}

function openDevUserModal() {
    const modal = document.getElementById("modalDevUserConfig");
    if (modal) {
        modal.style.display = "flex";
        renderDevUsersList();
    }
}

function closeDevUserModal() {
    const modal = document.getElementById("modalDevUserConfig");
    if (modal) {
        modal.style.display = "none";
    }
}

function renderDevUsersList() {
    const container = document.getElementById("devUsersListTableContainer");
    if (!container) return;

    const users = sigeDB.getUsuarios();

    if (!users || users.length === 0) {
        container.innerHTML = `<div style="padding:1rem; color:#64748b; font-size:0.85rem;">Nenhum usuário cadastrado.</div>`;
        return;
    }

    let html = `
        <table style="width:100%; border-collapse:collapse; font-size:0.82rem; margin-top:8px;">
            <thead>
                <tr style="background:#f1f5f9; text-align:left; color:#475569; border-bottom:2px solid #cbd5e1;">
                    <th style="padding:8px;">Nome / E-mail</th>
                    <th style="padding:8px;">Nível de Acesso (Perfil)</th>
                    <th style="padding:8px;">Cargo</th>
                    <th style="padding:8px; text-align:center;">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(u => {
        const isDevDefault = u.email.toLowerCase().trim() === "elcortelini@gmail.com";
        html += `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;">
                    <strong style="color:#0f172a; display:block;">${u.nome}</strong>
                    <span style="color:#64748b; font-size:0.78rem;">${u.email}</span>
                </td>
                <td style="padding:8px;">
                    <span class="role-badge-pill role-pill-${u.role}" style="font-size:0.75rem;">${getRoleLabel(u.role)}</span>
                </td>
                <td style="padding:8px; color:#334155;">${u.cargo || '-'}</td>
                <td style="padding:8px; text-align:center;">
                    ${isDevDefault ? `
                        <span style="color:#94a3b8; font-size:0.75rem; font-style:italic;">(Padrão Dev)</span>
                    ` : `
                        <button onclick="deleteDevUser('${u.email}')" class="btn-sec btn-sec-fail" style="padding:3px 8px; font-size:0.72rem;">
                            <i class="fa-solid fa-trash"></i> Excluir
                        </button>
                    `}
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function submitAddDevUser(e) {
    if (e && e.preventDefault) e.preventDefault();
    const email = document.getElementById("devUserEmail")?.value.trim();
    const nome = document.getElementById("devUserName")?.value.trim();
    const role = document.getElementById("devUserRole")?.value;
    const cargo = document.getElementById("devUserCargo")?.value.trim();

    if (!email || !nome || !role || !cargo) return;

    sigeDB.addUsuario({ email, nome, role, cargo });
    showToast(`Usuário ${nome} (${email}) salvo com sucesso!`);
    
    if (document.getElementById("devUserEmail")) document.getElementById("devUserEmail").value = "";
    if (document.getElementById("devUserName")) document.getElementById("devUserName").value = "";
    if (document.getElementById("devUserCargo")) document.getElementById("devUserCargo").value = "";

    renderDevUsersList();
}

function deleteDevUser(email) {
    if (confirm(`Tem certeza que deseja remover as permissões do e-mail ${email}?`)) {
        if (sigeDB.removeUsuario(email)) {
            showToast("Usuário removido com sucesso!");
            renderDevUsersList();
        } else {
            alert("Não é possível remover o desenvolvedor principal.");
        }
    }
}

function marcarAguardandoSecretaria(id) {
    const agora = new Date().toISOString();
    sigeDB.updateSecretariaStatusOP(id, "aguardando", "Aluno/Responsável aguardando na recepção.", agora);
    renderNotifications();
    renderModuleOrientacaoPedagogica();
    showToast("🔔 Aluno marcado como AGUARDANDO na recepção! Notificação enviada à Orientadora.");
}

// ==========================================
// PERFIL E NÍVEIS DE ACESSO (RBAC)
// ==========================================
function setupRoleSelector() {
    const roleSelect = document.getElementById("activeRoleSelect");
    const roleBadge = document.getElementById("activeRoleBadge");
    if (!roleSelect) return;

    const currentRole = sigeDB.getRole();
    roleSelect.value = currentRole;
    updateRoleBadgePill(currentRole, roleBadge);

    roleSelect.addEventListener("change", (e) => {
        const newRole = e.target.value;
        sigeDB.setRole(newRole);
        updateRoleBadgePill(newRole, roleBadge);

        const opFilter = document.getElementById("opFilterOrientadora");
        if (opFilter) {
            if (newRole === "orientadora_clarinda") {
                opFilter.value = "Clarinda Rosa Pereira";
                opFilter.disabled = true;
            } else if (newRole === "orientadora_daiane") {
                opFilter.value = "Daiane Caetano Costa de Aquino";
                opFilter.disabled = true;
            } else {
                opFilter.disabled = false;
            }
        }

        renderNotifications();
        renderAllModules();
        showToast(`Perfil de testes alterado para: ${getRoleLabel(newRole)}`);
    });
}

function updateRoleBadgePill(role, badgeElem) {
    if (!badgeElem) return;
    badgeElem.className = `role-badge-pill role-pill-${role}`;
    badgeElem.innerHTML = `<i class="${getRoleIcon(role)}"></i> ${getRoleLabel(role)}`;
}

function getRoleLabel(role) {
    const labels = {
        desenvolvedor: "🛠️ Desenvolvedor do Sistema",
        admin: "Administrador do Sistema",
        direcao: "Gestor / Direção Escolar",
        orientadora_clarinda: "Orientadora Clarinda (Iniciais)",
        orientadora_daiane: "Orientadora Daiane (Finais)",
        orientacao: "Orientador Educacional (OE)",
        supervisao: "Supervisor Pedagógico",
        secretaria: "Secretaria Escolar",
        comunidade: "Professor / Aluno / Comunidade"
    };
    return labels[role] || role;
}

function getRoleIcon(role) {
    const icons = {
        desenvolvedor: "fa-solid fa-code",
        admin: "fa-solid fa-user-shield",
        direcao: "fa-solid fa-crown",
        orientadora_clarinda: "fa-solid fa-heart-pulse",
        orientadora_daiane: "fa-solid fa-heart-pulse",
        orientacao: "fa-solid fa-heart-pulse",
        supervisao: "fa-solid fa-clipboard-check",
        secretaria: "fa-solid fa-id-card",
        comunidade: "fa-solid fa-users"
    };
    return icons[role] || "fa-solid fa-user";
}

window.checkSigeAuth = checkSigeAuth;
window.submitSigeLogin = submitSigeLogin;
window.fillLoginEmail = fillLoginEmail;
window.handleSigeLogout = handleSigeLogout;
window.openDevUserModal = openDevUserModal;
window.closeDevUserModal = closeDevUserModal;
window.submitAddDevUser = submitAddDevUser;
window.deleteDevUser = deleteDevUser;
window.marcarAguardandoSecretaria = marcarAguardandoSecretaria;

// ==========================================
// NAVEGAÇÃO POR ABAS
// ==========================================
function setupTabNavigation() {
    const tabBtns = document.querySelectorAll(".sige-tab-btn");
    const sections = document.querySelectorAll(".tab-content-section");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove("active"));
            sections.forEach(s => s.classList.remove("active"));

            btn.classList.add("active");
            const targetSection = document.getElementById(`tab-${targetId}`);
            if (targetSection) targetSection.classList.add("active");

            renderAllModules();
        });
    });

    // Ativação automática via URL (?aba=op por padrão para Orientação Educacional)
    const urlParams = new URLSearchParams(window.location.search);
    let abaParam = urlParams.get('aba');
    if (!abaParam && window.location.hash) {
        abaParam = window.location.hash.replace('#tab-', '').replace('#', '');
    }
    if (!abaParam) abaParam = 'op'; // Padrão: Orientação Educacional (OE)

    switchTab(abaParam);

    // Oculta a barra de navegação de abas internas para manter acesso exclusivo via Portal Inicial
    const navTabs = document.querySelector(".sige-nav-tabs");
    if (navTabs) {
        navTabs.style.display = "none";
    }
}

function switchTab(tabId) {
    const btn = document.querySelector(`.sige-tab-btn[data-tab="${tabId}"]`);
    const sections = document.querySelectorAll(".tab-content-section");

    sections.forEach(s => s.classList.remove("active"));
    const targetSection = document.getElementById(`tab-${tabId}`) || document.getElementById("tab-op");
    if (targetSection) targetSection.classList.add("active");
    if (btn) btn.classList.add("active");

    renderAllModules();
}

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
// RENDERIZAÇÃO GERAL DOS MÓDULOS
// ==========================================
function renderAllModules() {
    renderModuleMuralECalendario();
    renderModuleOrientacaoPedagogica();
    renderModuleSupervisao();
    renderModuleAdministracao();
    renderModuleDirecao();
    updateBadgesCounts();
}

function updateBadgesCounts() {
    const role = sigeDB.getRole();
    const countOp = sigeDB.getAgendamentosOP().filter(a => a.statusSecretaria === "pendente").length;
    const countSup = sigeDB.getDemandasSupervisao().filter(d => d.status === "pendente").length;
    const countAdm = sigeDB.getDemandasAdmin().filter(d => d.status === "pendente").length;

    const bOp = document.getElementById("badgeTabOP");
    const bSup = document.getElementById("badgeTabSup");
    const bAdm = document.getElementById("badgeTabAdm");

    if (bOp) bOp.innerText = countOp;
    if (bSup) bSup.innerText = countSup;
    if (bAdm) bAdm.innerText = countAdm;
}

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
// MÓDULO 2: ORIENTAÇÃO PEDAGÓGICA (OP)
// ==========================================
let opViewMode = "semanal"; // "semanal", "cards", "projetos"
let currentWeekRefDate = new Date();

function setOpViewMode(mode) {
    if (mode === "projetos") mode = "semanal";
    opViewMode = mode;
    document.querySelectorAll(".op-toggle-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    const semanalView = document.getElementById("opWeeklyViewContainer");
    const listaView = document.getElementById("opListViewContainer");
    const projetosView = document.getElementById("opProjectsViewContainer");

    if (semanalView && listaView && projetosView) {
        semanalView.style.display = mode === "semanal" ? "block" : "none";
        listaView.style.display = mode === "cards" ? "block" : "none";
        projetosView.style.display = "none";
    }
    renderModuleOrientacaoPedagogica();
}

function moveWeek(deltaDays) {
    currentWeekRefDate.setDate(currentWeekRefDate.getDate() + deltaDays);
    renderModuleOrientacaoPedagogica();
}

function resetWeekToToday() {
    currentWeekRefDate = new Date();
    renderModuleOrientacaoPedagogica();
}

function getWeekDays(refDate) {
    const dayOfWeek = refDate.getDay();
    const distanceToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() + distanceToMon);

    const week = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const iso = d.toISOString().split("T")[0];
        const dayNames = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];
        const todayIso = new Date().toISOString().split("T")[0];
        week.push({
            dateIso: iso,
            dayName: dayNames[d.getDay()],
            dayMonth: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
            isToday: iso === todayIso
        });
    }
    return week;
}

function getWhatsAppUrl(phone, aluno, responsavel, data, horario) {
    if (!phone) return "#";
    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = "55" + cleanPhone;
    }
    const textMsg = encodeURIComponent(`Olá ${responsavel || 'Responsável'}! Entramos em contato do Centro Educacional Pedro Rizzi referente ao atendimento da Orientação Educacional (OE)${aluno ? ' referente a ' + aluno : ''}${data ? ' em ' + formatDateBR(data) : ''}${horario ? ' às ' + horario : ''}.`);
    return `https://wa.me/${cleanPhone}?text=${textMsg}`;
}

function updateModalWhatsAppPreview() {
    const telElem = document.getElementById("opInputTelefone");
    const tel = telElem ? telElem.value : "";
    const aluno = document.getElementById("opInputAluno") ? document.getElementById("opInputAluno").value : "";
    const resp = document.getElementById("opInputResponsavel") ? document.getElementById("opInputResponsavel").value : "";
    const data = document.getElementById("opInputData") ? document.getElementById("opInputData").value : "";
    const hor = document.getElementById("opInputHorario") ? document.getElementById("opInputHorario").value : "";

    const container = document.getElementById("modalWaPreviewContainer");
    const btn = document.getElementById("modalWaPreviewBtn");

    if (container && btn) {
        if (tel.replace(/\D/g, "").length >= 8) {
            btn.href = getWhatsAppUrl(tel, aluno, resp, data, hor);
            container.style.display = "block";
        } else {
            container.style.display = "none";
        }
    }
}

function renderModuleOrientacaoPedagogica() {
    const filterOrientadoraSelect = document.getElementById("opFilterOrientadora");
    const filterOrientadora = filterOrientadoraSelect ? filterOrientadoraSelect.value : "todas";

    const isClarinda = (a) => !a.orientadora || a.orientadora.includes("Clarinda") || a.orientadora.includes("1") || a.orientadora.includes("Carmen");
    const isDaiane = (a) => a.orientadora && (a.orientadora.includes("Daiane") || a.orientadora.includes("2") || a.orientadora.includes("Luciana"));

    const todosAtendimentos = sigeDB.getAgendamentosOP().filter(a => {
        if (filterOrientadora === "todas") return true;
        if (filterOrientadora.includes("Clarinda")) return isClarinda(a);
        if (filterOrientadora.includes("Daiane")) return isDaiane(a);
        return true;
    });

    const cardClarinda = document.querySelector(".turno-card.matutino");
    const cardDaiane = document.querySelector(".turno-card.vespertino");

    if (cardClarinda && cardDaiane) {
        if (filterOrientadora.includes("Clarinda")) {
            cardClarinda.style.display = "flex";
            cardDaiane.style.display = "none";
        } else if (filterOrientadora.includes("Daiane")) {
            cardClarinda.style.display = "none";
            cardDaiane.style.display = "flex";
        } else {
            cardClarinda.style.display = "flex";
            cardDaiane.style.display = "flex";
        }
    }

    const weekDays = getWeekDays(currentWeekRefDate);

    // Atualiza contadores de atendimento por orientadora (Semanal & Mês)
    updateOrientadorasCounters(weekDays);

    // 1. Renderiza Visão Semanal (Inspirada no modelo)
    renderWeeklyAgenda(weekDays, todosAtendimentos);

    // 2. Renderiza Visão Cards (Filtro por Data)
    renderCardsView(todosAtendimentos);

    // 3. Renderiza Visão Projetos OP
    renderOpProjetosList();
}

let agendaLayoutMode = localStorage.getItem("sige_op_agenda_layout_mode") || "timeline"; // "timeline" or "grid"

function toggleAgendaLayoutMode() {
    agendaLayoutMode = agendaLayoutMode === "timeline" ? "grid" : "timeline";
    localStorage.setItem("sige_op_agenda_layout_mode", agendaLayoutMode);
    renderModuleOrientacaoPedagogica();
}
window.toggleAgendaLayoutMode = toggleAgendaLayoutMode;

function renderWeeklyAgenda(weekDays, todosAtendimentos) {
    const rangeText = document.getElementById("opWeekRangeText");
    if (rangeText && weekDays.length === 5) {
        rangeText.innerText = `${weekDays[0].dayMonth} - ${weekDays[4].dayMonth}`;
    }

    const btnLabel = document.getElementById("lblAgendaLayoutMode");
    if (btnLabel) {
        btnLabel.innerText = agendaLayoutMode === "timeline" ? "Linhas por Dia (Novo)" : "Grade de Vagas (Anterior)";
    }

    const container = document.getElementById("agendaWeeklyContent");
    if (!container) return;

    const filterOrientadoraSelect = document.getElementById("opFilterOrientadora");
    const filterOrientadora = filterOrientadoraSelect ? filterOrientadoraSelect.value : "todas";

    const isClarinda = (a) => !a.orientadora || a.orientadora.includes("Clarinda") || a.orientadora.includes("1") || a.orientadora.includes("Carmen");
    const isDaiane = (a) => a.orientadora && (a.orientadora.includes("Daiane") || a.orientadora.includes("2") || a.orientadora.includes("Luciana"));

    if (agendaLayoutMode === "timeline") {
        // MODO 1: LINHAS POR DIA (VISUAL CRONOLÓGICO RESPONSIVO)
        let html = `<div class="day-timeline-list">`;

        weekDays.forEach(d => {
            const isBlocked = sigeDB.isDiaBloqueado(d.dateIso);
            const blockObj = isBlocked ? (sigeDB.getDiasBloqueados().find(b => b.data === d.dateIso) || {}) : null;

            const dateAppointments = todosAtendimentos.filter(a => 
                a.data === d.dateIso && 
                a.statusSecretaria !== 'cancelado'
            );

            // Ordenação estrita por horário marcado
            dateAppointments.sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));

            html += `
                <div class="day-timeline-card ${d.isToday ? 'today-day-card' : ''} ${isBlocked ? 'blocked-day-card' : ''}">
                    <div class="day-timeline-sidebar">
                        <div>
                            <div class="day-name">${d.dayName}</div>
                            <div class="day-date">
                                ${d.dayMonth} 
                                ${d.isToday ? '<span class="today-pill">HOJE</span>' : ''}
                                ${isBlocked ? '<span class="day-blocked-pill"><i class="fa-solid fa-lock"></i> BLOQUEADO</span>' : ''}
                            </div>
                            <div class="day-count-badge">
                                <i class="fa-solid fa-calendar-check"></i> ${dateAppointments.length} agendamento(s)
                            </div>
                        </div>

                        <div class="day-sidebar-actions">
                            ${isBlocked ? `
                                <button onclick="alert('A data ${d.dayMonth} está BLOQUEADA para novos agendamentos: ${blockObj.motivo || 'Recesso / Conselho'}. Desbloqueie o dia primeiro se desejar agendar.')" class="btn-day-action btn-add-day-slot" style="opacity:0.65; background:#94a3b8; cursor:not-allowed;" title="Data Bloqueada">
                                    <i class="fa-solid fa-lock"></i> Agendar
                                </button>
                            ` : `
                                <button onclick="openAgendamentoModal('${d.dateIso}')" class="btn-day-action btn-add-day-slot" title="Cadastrar novo agendamento para este dia">
                                    <i class="fa-solid fa-calendar-plus"></i> Agendar
                                </button>
                            `}
                            <button onclick="imprimirAtendimentosDoDia('${d.dateIso}')" class="btn-day-action btn-print-day-slot" title="Gerar relatório de atendimentos deste dia para impressão">
                                <i class="fa-solid fa-print"></i> Imprimir
                            </button>
                            <button onclick="abrirVisaoDetalhadaDoDia('${d.dateIso}')" class="btn-day-action btn-view-day-slot" title="Ver atendimentos deste dia na tela com todos os detalhes individuais">
                                <i class="fa-solid fa-expand"></i> Ver Atendimentos
                            </button>
                            <button onclick="toggleBloqueioDiaHandler('${d.dateIso}')" class="btn-day-action ${isBlocked ? 'btn-unblock-day-slot' : 'btn-block-day-slot'}" title="${isBlocked ? 'Desbloquear esta data para permitir agendamentos' : 'Bloquear novos agendamentos nesta data (ex: Conselho/Feriado)'}">
                                <i class="fa-solid ${isBlocked ? 'fa-lock-open' : 'fa-lock'}"></i> ${isBlocked ? 'Desbloquear Dia' : 'Bloquear Dia'}
                            </button>
                        </div>
                    </div>

                    <div class="day-timeline-content">
            `;

            if (isBlocked && dateAppointments.length === 0) {
                html += `
                    <div class="day-blocked-banner">
                        <i class="fa-solid fa-ban" style="font-size:1.5rem; color:#ef4444;"></i>
                        <div>
                            <div style="font-size:0.95rem; font-weight:900;">Dia Bloqueado para Agendamentos</div>
                            <div style="font-size:0.78rem; font-weight:600; opacity:0.9;">Motivo: ${blockObj.motivo || 'Conselho de Classe / Recesso'}</div>
                        </div>
                    </div>
                `;
            } else if (dateAppointments.length === 0) {
                html += `
                    <div class="day-empty-state">
                        <i class="fa-regular fa-calendar-plus" style="font-size:1.3rem; color:#94a3b8;"></i>
                        <span>Nenhum atendimento agendado para ${d.dayName} (${d.dayMonth}).</span>
                    </div>
                `;
            } else {
                if (isBlocked) {
                    html += `
                        <div class="day-blocked-banner" style="margin-bottom:8px; width:100%;">
                            <i class="fa-solid fa-lock" style="font-size:1.1rem; color:#ef4444;"></i>
                            <div><strong>Atenção: Data Bloqueada (${blockObj.motivo || 'Recesso'})</strong> — Exibindo agendamentos já cadastrados.</div>
                        </div>
                    `;
                }

                const isPastStatus = (a) => a.statusSecretaria === 'realizado' || a.statusSecretaria === 'faltou' || a.statusSecretaria === 'ausente';
                const activeAppointments = dateAppointments.filter(a => !isPastStatus(a));
                const pastAppointments = dateAppointments.filter(a => isPastStatus(a));

                html += `<div class="day-timeline-content-split">`;

                // 1. Agendamentos Ativos / Pendentes (Lado Esquerdo)
                html += `<div class="active-appointments-container">`;
                if (activeAppointments.length === 0 && pastAppointments.length > 0) {
                    html += `
                        <div style="font-size:0.82rem; color:#64748b; font-weight:700; font-style:italic; padding:12px 14px; background:#f8fafc; border-radius:10px; border:1px dashed #cbd5e1; width:100%; display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid fa-circle-check" style="color:#10b981; font-size:1.2rem;"></i>
                            <span>Todos os agendamentos deste dia foram concluídos (atendidos ou ausentes).</span>
                        </div>
                    `;
                } else {
                    activeAppointments.forEach(item => {
                        const waUrl = getWhatsAppUrl(item.telefone, item.aluno, item.responsavel, item.data, item.horario);
                        const isProf = item.publico === "professor";
                        const isClar = isClarinda(item);

                        html += `
                            <div class="timeline-item-card ${isClar ? 'clarinda-card' : 'daiane-card'} ${item.tipo}" onclick="openDetalhesModal('${item.id}')" style="cursor:pointer;" title="Clique para ver os detalhes">
                                <div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                        <span class="timeline-item-time"><i class="fa-regular fa-clock"></i> ${item.horario} (${item.turno ? item.turno.toUpperCase() : ''})</span>
                                        <span class="secretaria-status-badge status-${item.statusSecretaria}" style="font-size:0.68rem; padding:2px 6px;">
                                            ${getSecretariaBadgeText(item.statusSecretaria)}
                                        </span>
                                    </div>

                                    <div style="margin-bottom:6px;">
                                        <div style="font-size:0.92rem; font-weight:900; color:#0f172a;">
                                            ${isProf ? '👨‍🏫 ' + item.aluno : item.aluno}
                                            <span class="weekly-class-badge" style="${isProf ? 'background:#f3e8ff; color:#6b21a8; border:1px solid #d8b4fe;' : ''}">${item.turma}</span>
                                        </div>
                                        <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                                            <i class="fa-regular fa-user"></i> ${item.responsavel || '-'}
                                        </div>
                                        <div style="font-size:0.73rem; color:${isClar ? '#b91c1c' : '#0369a1'}; font-weight:800; margin-top:3px;">
                                            <i class="fa-solid fa-user-gear"></i> ${item.orientadora || (isClar ? 'Clarinda (Séries Iniciais)' : 'Daiane (Séries Finais)')}
                                        </div>
                                    </div>

                                    <div class="weekly-motive" title="${item.motivo}" style="margin-bottom:6px;">
                                        "${item.motivo}"
                                    </div>

                                    <!-- AÇÃO RÁPIDA DA SECRETARIA: BOTÃO DIRETO NA TELA GERAL -->
                                    <div style="margin-bottom:8px;" onclick="event.stopPropagation();">
                                        ${item.statusSecretaria === 'aguardando' ? `
                                            <div style="background:#fffbeb; color:#b45309; border:1px solid #fde68a; padding:4px 8px; border-radius:8px; font-size:0.75rem; font-weight:800; display:flex; align-items:center; justify-content:space-between;">
                                                <span><i class="fa-solid fa-bell" style="color:#d97706;"></i> ⏳ <strong>Esperando na Recepção</strong></span>
                                                <button onclick="marcarAguardandoSecretaria('${item.id}')" style="background:#d97706; color:white; border:none; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800; cursor:pointer;" title="Notificar novamente">🔔 Reenviar</button>
                                            </div>
                                        ` : `
                                            <button onclick="marcarAguardandoSecretaria('${item.id}')" style="width:100%; background:linear-gradient(135deg, #f59e0b, #d97706); color:white; font-weight:900; font-size:0.78rem; padding:6px 10px; border-radius:8px; border:none; cursor:pointer; box-shadow:0 2px 6px rgba(245,158,11,0.35); display:flex; align-items:center; justify-content:center; gap:6px;" title="Clique aqui para registrar que a pessoa chegou e está aguardando na recepção">
                                                <i class="fa-solid fa-bell" style="font-size:0.85rem;"></i> 🔔 Marcar: Chegou / Esperando
                                            </button>
                                        `}
                                    </div>
                                </div>

                                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:6px; border-top:1px dashed #e2e8f0;">
                                    <button onclick="event.stopPropagation(); excluirAgendamentoDirect('${item.id}');" class="btn-delete-card" title="Excluir Agendamento">
                                        <i class="fa-solid fa-trash-can"></i> Excluir
                                    </button>
                                    <a href="${waUrl}" onclick="event.stopPropagation();" target="_blank" class="btn-wa-compact">
                                        <i class="fa-brands fa-whatsapp"></i> Enviar Mensagem
                                    </a>
                                </div>
                            </div>
                        `;
                    });
                }
                html += `</div>`; // fim active-appointments-container

                // 2. Agendamentos Concluídos / Ausentes (Ultra-Compactos Empilhados no Lado Direito)
                if (pastAppointments.length > 0) {
                    html += `
                        <div class="past-appointments-container">
                            <div style="font-size:0.7rem; font-weight:900; color:#64748b; text-transform:uppercase; letter-spacing:0.4px; display:flex; align-items:center; gap:4px; margin-bottom:4px;">
                                <i class="fa-solid fa-clock-rotate-left"></i> Concluídos (${pastAppointments.length})
                            </div>
                            <div style="display:flex; flex-direction:column; gap:5px; width:100%;">
                    `;

                    pastAppointments.forEach(item => {
                        const isProf = item.publico === "professor";
                        const isClar = isClarinda(item);

                        html += `
                            <div class="timeline-item-card ultra-compact-past-card ${isClar ? 'clarinda-card' : 'daiane-card'}" onclick="openDetalhesModal('${item.id}')" style="cursor:pointer;" title="Clique para ver os detalhes completos de ${item.aluno}">
                                <div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
                                    <span style="font-size:0.78rem; font-weight:800; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                        ${isProf ? '👨‍🏫 ' + item.aluno : item.aluno}
                                    </span>
                                    <span class="secretaria-status-badge status-${item.statusSecretaria}" style="font-size:0.62rem; padding:1px 5px; flex-shrink:0;">
                                        ${item.statusSecretaria === 'realizado' ? '✅ Atendido' : (item.statusSecretaria === 'faltou' || item.statusSecretaria === 'ausente' ? '❌ Ausente' : getSecretariaBadgeText(item.statusSecretaria))}
                                    </span>
                                </div>
                            </div>
                        `;
                    });

                    html += `
                            </div>
                        </div>
                    `;
                }

                html += `</div>`; // fim day-timeline-content-split
            }

            html += `
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    } else {
        // MODO 2: GRADE DE VAGAS (ESTRUTURA DE MATUTINO 3+1 E VESPERTINO 3+1)
        const slotsConfig = [
            { isHeader: true, header: "☀️ TURNO MATUTINO (MANHÃ)", turno: "matutino" },
            
            { label: "1ª Vaga", turno: "matutino", tipo: "agendado", slotIndex: 0, orientadoraKey: "clarinda", orientadoraNome: "Clarinda Rosa Pereira", orientadoraTag: "Séries Iniciais", bgColor: "#ffffff" },
            { label: "1ª Vaga", turno: "matutino", tipo: "agendado", slotIndex: 0, orientadoraKey: "daiane", orientadoraNome: "Daiane Caetano Costa de Aquino", orientadoraTag: "Séries Finais", bgColor: "#ffffff" },
            
            { label: "2ª Vaga", turno: "matutino", tipo: "agendado", slotIndex: 1, orientadoraKey: "clarinda", orientadoraNome: "Clarinda Rosa Pereira", orientadoraTag: "Séries Iniciais", bgColor: "#f1f5f9" },
            { label: "2ª Vaga", turno: "matutino", tipo: "agendado", slotIndex: 1, orientadoraKey: "daiane", orientadoraNome: "Daiane Caetano Costa de Aquino", orientadoraTag: "Séries Finais", bgColor: "#f1f5f9" },
            
            { label: "3ª Vaga", turno: "matutino", tipo: "agendado", slotIndex: 2, orientadoraKey: "clarinda", orientadoraNome: "Clarinda Rosa Pereira", orientadoraTag: "Séries Iniciais", bgColor: "#ffffff" },
            { label: "3ª Vaga", turno: "matutino", tipo: "agendado", slotIndex: 2, orientadoraKey: "daiane", orientadoraNome: "Daiane Caetano Costa de Aquino", orientadoraTag: "Séries Finais", bgColor: "#ffffff" },
            
            { label: "🚨 Emergencial", turno: "matutino", tipo: "emergencial", slotIndex: 0, isEmergencial: true, orientadoraKey: "clarinda", orientadoraNome: "Clarinda Rosa Pereira", orientadoraTag: "Séries Iniciais", bgColor: "#fef2f2" },
            { label: "🚨 Emergencial", turno: "matutino", tipo: "emergencial", slotIndex: 0, isEmergencial: true, orientadoraKey: "daiane", orientadoraNome: "Daiane Caetano Costa de Aquino", orientadoraTag: "Séries Finais", bgColor: "#fef2f2" },

            { isHeader: true, header: "⛅ TURNO VESPERTINO (TARDE)", turno: "vespertino" },

            { label: "1ª Vaga", turno: "vespertino", tipo: "agendado", slotIndex: 0, orientadoraKey: "clarinda", orientadoraNome: "Clarinda Rosa Pereira", orientadoraTag: "Séries Iniciais", bgColor: "#ffffff" },
            { label: "2ª Vaga", turno: "vespertino", tipo: "agendado", slotIndex: 1, orientadoraKey: "clarinda", orientadoraNome: "Clarinda Rosa Pereira", orientadoraTag: "Séries Iniciais", bgColor: "#f1f5f9" },
            { label: "3ª Vaga", turno: "vespertino", tipo: "agendado", slotIndex: 2, orientadoraKey: "clarinda", orientadoraNome: "Clarinda Rosa Pereira", orientadoraTag: "Séries Iniciais", bgColor: "#ffffff" },
            { label: "🚨 Emergencial", turno: "vespertino", tipo: "emergencial", slotIndex: 0, isEmergencial: true, orientadoraKey: "clarinda", orientadoraNome: "Clarinda Rosa Pereira", orientadoraTag: "Séries Iniciais", bgColor: "#fef2f2" }
        ];

        let activeSlots = slotsConfig.filter(s => {
            if (filterOrientadora === "todas") return true;
            if (filterOrientadora.includes("Clarinda")) {
                return s.isHeader || s.orientadoraKey === "clarinda";
            }
            if (filterOrientadora.includes("Daiane")) {
                if (s.isHeader && s.turno === "vespertino") return false;
                return s.isHeader || s.orientadoraKey === "daiane";
            }
            return true;
        });

        let tableHtml = `
            <div class="weekly-table-wrapper">
                <table class="weekly-table">
                    <thead>
                        <tr>
                            <th class="col-periodo">ORIENTADORA / VAGA</th>
                            ${weekDays.map(d => `
                                <th class="${d.isToday ? 'col-today' : ''}">
                                    ${d.dayName}<br>
                                    <span style="font-size:0.8rem; opacity:0.9;">${d.dayMonth}</span>
                                    ${d.isToday ? '<span class="today-pill">HOJE</span>' : ''}
                                </th>
                            `).join("")}
                        </tr>
                    </thead>
                    <tbody>
        `;

        tableHtml += activeSlots.map(s => {
            if (s.isHeader) {
                return `
                    <tr>
                        <td colspan="6" class="turno-section-header" style="background:#1e3a8a; color:white; font-weight:900; font-size:0.85rem; padding:8px 14px; text-transform:uppercase; letter-spacing:0.5px;">
                            ${s.header}
                        </td>
                    </tr>
                `;
            }

            const rowBg = s.bgColor || "#ffffff";

            return `
                <tr style="background-color: ${rowBg};">
                    <td class="slot-time-cell ${s.isEmergencial ? 'emergencial-slot' : ''}" style="background-color: ${rowBg}; padding:6px 6px; width:110px;">
                        <span class="vaga-num" style="font-weight:800; font-size:0.78rem;">${s.label}</span>
                        <span style="font-size:0.72rem; color:${s.orientadoraKey === 'clarinda' ? '#b45309' : '#0369a1'}; font-weight:800; display:block; margin-top:1px;">
                            <i class="fa-solid fa-user-gear"></i> ${s.orientadoraNome.split(" ")[0]}
                        </span>
                        <span style="font-size:0.65rem; color:#64748b; font-weight:700; display:block; white-space:nowrap;">
                            ${s.orientadoraTag}
                        </span>
                    </td>
                    ${weekDays.map(d => {
                        const matcher = s.orientadoraKey === "clarinda" ? isClarinda : isDaiane;
                        const dateAppointments = todosAtendimentos.filter(a => 
                            a.data === d.dateIso && 
                            a.turno === s.turno &&
                            a.tipo === s.tipo && 
                            a.statusSecretaria !== 'cancelado' &&
                            matcher(a)
                        );

                        const item = dateAppointments[s.slotIndex];

                        if (item) {
                            const waUrl = getWhatsAppUrl(item.telefone, item.aluno, item.responsavel, item.data, item.horario);
                            const isProf = item.publico === "professor";
                            return `
                                <td class="${d.isToday ? 'today-column-cell' : ''}" style="background-color: ${d.isToday ? '#fffbeb' : rowBg};">
                                    <div class="weekly-slot-card ${item.tipo}" onclick="openDetalhesModal('${item.id}')" style="cursor:pointer;" title="Clique para ver os detalhes completos">
                                        <div class="weekly-slot-header">
                                            <span class="weekly-student-name">${isProf ? '👨‍🏫 ' + item.aluno : item.aluno}</span>
                                            <span class="weekly-class-badge" style="${isProf ? 'background:#f3e8ff; color:#6b21a8; border:1px solid #d8b4fe;' : ''}">${item.turma}</span>
                                        </div>
                                        <div style="font-size:0.73rem; color:#1e3a8a; font-weight:700;">
                                            <i class="fa-solid fa-user-gear"></i> ${item.orientadora || s.orientadoraNome}
                                        </div>
                                        <div class="weekly-motive" title="${item.motivo}">
                                            "${item.motivo}"
                                        </div>
                                         <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                                            <span class="secretaria-status-badge status-${item.statusSecretaria}" style="font-size:0.68rem; padding:2px 5px;">
                                                ${getSecretariaBadgeText(item.statusSecretaria)}
                                            </span>
                                            <span style="font-size:0.72rem; color:#64748b; font-weight:700;"><i class="fa-regular fa-clock"></i> ${item.horario}</span>
                                        </div>

                                        <!-- AÇÃO RÁPIDA DA SECRETARIA NA GRADE -->
                                        <div style="margin-top:4px;" onclick="event.stopPropagation();">
                                            ${item.statusSecretaria === 'aguardando' ? `
                                                <div style="background:#fffbeb; color:#b45309; border:1px solid #fde68a; font-weight:900; font-size:0.68rem; padding:3px 5px; border-radius:6px; text-align:center;">
                                                    <i class="fa-solid fa-bell"></i> ⏳ Esperando
                                                </div>
                                            ` : `
                                                <button onclick="marcarAguardandoSecretaria('${item.id}')" style="background:#f59e0b; color:white; font-weight:900; font-size:0.7rem; padding:4px 6px; border-radius:6px; border:none; cursor:pointer; width:100%; text-align:center; box-shadow:0 2px 4px rgba(245,158,11,0.25);" title="Clique para registrar que a pessoa chegou">
                                                    <i class="fa-solid fa-bell"></i> 🔔 Chegou / Esperando
                                                </button>
                                            `}
                                        </div>

                                        <!-- Botão WhatsApp Direto no Card -->
                                        <a href="${waUrl}" onclick="event.stopPropagation();" target="_blank" class="btn-wa-compact" style="margin-top:4px;">
                                            <i class="fa-brands fa-whatsapp"></i> Enviar Mensagem
                                        </a>
                                    </div>
                                </td>
                            `;
                        } else {
                            return `
                                <td class="${d.isToday ? 'today-column-cell' : ''}" style="background-color: ${d.isToday ? '#fffbeb' : rowBg};">
                                    <button onclick="openAgendamentoModal('${d.dateIso}', '${s.turno}', '${s.tipo}', '${s.orientadoraNome}')" class="weekly-slot-empty-btn" title="Adicionar Agendamento para ${s.orientadoraNome}">
                                        <i class="fa-solid fa-plus"></i>
                                    </button>
                                </td>
                            `;
                        }
                    }).join("")}
                </tr>
            `;
        }).join("");

        tableHtml += `
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = tableHtml;
    }
}

function renderCardsView(todosAtendimentos) {
    const container = document.getElementById("opAppointmentsGrid");
    const filterDataInput = document.getElementById("opFilterData");
    const filterData = filterDataInput ? filterDataInput.value : new Date().toISOString().split("T")[0];

    const filtrados = todosAtendimentos.filter(a => !filterData || a.data === filterData);

    if (!container) return;

    if (filtrados.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fa-solid fa-calendar-day"></i>
                <p>Nenhum atendimento agendado para a data escolhida (${formatDateBR(filterData)}).</p>
                <button onclick="openAgendamentoModal('${filterData}')" class="btn btn-primary" style="margin-top:1rem; width:auto;">
                    <i class="fa-solid fa-plus"></i> Criar Agendamento na OE
                </button>
            </div>
        `;
        return;
    }

    const role = sigeDB.getRole();
    const isSecretaria = ["secretaria", "admin", "direcao"].includes(role);
    const isOrientadora = ["orientacao", "admin", "direcao"].includes(role);

    container.innerHTML = filtrados.map(a => {
        const waUrl = getWhatsAppUrl(a.telefone, a.aluno, a.responsavel, a.data, a.horario);
        const isProf = a.publico === "professor";

        return `
            <div class="op-card" onclick="openDetalhesModal('${a.id}')" style="cursor:pointer;">
                <div>
                    <div class="op-card-header">
                        <div>
                            <div class="op-patient-name" style="display:flex; align-items:center; gap:6px;">
                                ${isProf ? '<span class="sup-event-cat-badge" style="background:#f3e8ff; color:#6b21a8; border:1px solid #d8b4fe;">👨‍🏫 Professor</span>' : ''}
                                <span>${a.aluno}</span>
                            </div>
                            <div class="op-meta-sub">
                                <i class="fa-solid fa-graduation-cap"></i> ${a.turma} • <i class="fa-regular fa-user"></i> ${a.responsavel}
                                <br><strong style="color:#1e3a8a;"><i class="fa-solid fa-user-gear"></i> ${a.orientadora || 'OE'}</strong>
                            </div>
                        </div>
                        <span class="op-type-tag ${a.tipo}">${a.tipo === 'emergencial' ? '🚨 Emergencial' : '📅 Agendado'}</span>
                    </div>

                    <div class="op-body">
                        <p style="margin-bottom: 8px;"><strong>Motivo / Assunto:</strong> ${a.motivo}</p>
                        ${a.relatoConversa ? `<p style="margin-bottom:8px; font-size:0.82rem; color:#475569; background:#f8fafc; padding:6px 8px; border-radius:6px; border:1px solid #e2e8f0;"><strong>💬 Relato da Conversa:</strong> ${a.relatoConversa}</p>` : ''}
                        <div style="font-size: 0.8rem; color: #64748b;">
                            <i class="fa-regular fa-clock"></i> <strong>Data/Horário:</strong> ${formatDateBR(a.data)} às ${a.horario} (${a.turno.toUpperCase()})
                        </div>
                        
                        ${a.telefone ? `
                            <a href="${waUrl}" onclick="event.stopPropagation();" target="_blank" class="btn-whatsapp-direct">
                                <i class="fa-brands fa-whatsapp"></i> Enviar Mensagem
                            </a>
                        ` : ''}
                    </div>
                </div>

                <!-- Painel da Secretaria & Orientadoras para confirmação -->
                <div class="op-secretaria-box" onclick="event.stopPropagation();">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; font-weight:700; color:#475569;"><i class="fa-solid fa-user-check"></i> Status Recepção:</span>
                        <span class="secretaria-status-badge status-${a.statusSecretaria}">
                            ${getSecretariaBadgeText(a.statusSecretaria)}
                        </span>
                    </div>
                    
                    ${a.obsSecretaria ? `
                        <div style="font-size:0.75rem; color:#64748b; margin-top:4px; font-style:italic;">
                            "${a.obsSecretaria}"
                        </div>
                    ` : ''}

                    <div class="secretaria-action-btns" style="flex-wrap:wrap; margin-top:8px;">
                        <button onclick="marcarAguardandoSecretaria('${a.id}')" class="btn-sec" style="background:linear-gradient(135deg, #f59e0b, #d97706); color:white; font-weight:900; width:100%; border:none; box-shadow:0 2px 4px rgba(245,158,11,0.3);">
                            🔔 Marcar que Chegou / Está Esperando
                        </button>

                        ${isOrientadora ? `
                            <button onclick="detalhesMudarStatus('realizado', '${a.id}')" class="btn-sec btn-sec-ok">
                                ✅ Atendido
                            </button>
                            <button onclick="detalhesMudarStatus('ausente', '${a.id}')" class="btn-sec btn-sec-fail">
                                ❌ Não Veio
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function updateOrientadorasCounters(weekDays) {
    const todosAgendamentos = sigeDB.getAgendamentosOP() || [];
    if (!weekDays || weekDays.length < 5) return;

    const weekStart = weekDays[0].dateIso;
    const weekEnd = weekDays[4].dateIso;
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);

    const isClarinda = (a) => !a.orientadora || a.orientadora.includes("Clarinda") || a.orientadora.includes("1") || a.orientadora.includes("Carmen");
    const isDaiane = (a) => a.orientadora && (a.orientadora.includes("Daiane") || a.orientadora.includes("2") || a.orientadora.includes("Luciana"));

    function calcMetrics(list) {
        const total = list.length;
        const agendados = list.filter(a => a.statusSecretaria === 'agendado' || a.statusSecretaria === 'pendente' || a.statusSecretaria === 'aguardando' || !a.statusSecretaria).length;
        const atendidos = list.filter(a => a.statusSecretaria === 'realizado').length;
        const ausentes = list.filter(a => a.statusSecretaria === 'faltou' || a.statusSecretaria === 'ausente').length;
        const cancelados = list.filter(a => a.statusSecretaria === 'cancelado').length;
        return { total, agendados, atendidos, ausentes, cancelados };
    }

    // Clarinda
    const clarSemList = todosAgendamentos.filter(a => isClarinda(a) && a.data >= weekStart && a.data <= weekEnd);
    const clarMesList = todosAgendamentos.filter(a => isClarinda(a) && a.data && a.data.startsWith(currentMonthPrefix));
    const clarSem = calcMetrics(clarSemList);
    const clarMes = calcMetrics(clarMesList);

    // Daiane
    const daiSemList = todosAgendamentos.filter(a => isDaiane(a) && a.data >= weekStart && a.data <= weekEnd);
    const daiMesList = todosAgendamentos.filter(a => isDaiane(a) && a.data && a.data.startsWith(currentMonthPrefix));
    const daiSem = calcMetrics(daiSemList);
    const daiMes = calcMetrics(daiMesList);

    renderOrientadoraStatusPills("clarindaPillsContainer", clarSem, clarMes);
    renderOrientadoraStatusPills("daianePillsContainer", daiSem, daiMes);
}

function renderOrientadoraStatusPills(containerId, sem, mes) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-end;">
            <!-- Linha Semanal -->
            <div style="display:flex; align-items:center; gap:4px; background:#f8fafc; padding:3px 8px; border-radius:8px; border:1px solid #e2e8f0; font-size:0.72rem; font-weight:700;">
                <span style="color:#1e3a8a; font-weight:800; padding-right:6px; border-right:1px solid #cbd5e1; white-space:nowrap;" title="Total Semanal">📅 Semanal: <strong>${sem.total}</strong></span>
                <span style="background:#dbeafe; color:#1e40af; border:1px solid #93c5fd; padding:1px 5px; border-radius:4px; white-space:nowrap;" title="Agendados/Pendentes">🔵 ${sem.agendados}</span>
                <span style="background:#dcfce7; color:#166534; border:1px solid #86efac; padding:1px 5px; border-radius:4px; white-space:nowrap;" title="Atendidos">🟢 ${sem.atendidos}</span>
                <span style="background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; padding:1px 5px; border-radius:4px; white-space:nowrap;" title="Ausentes / Não Veio">🔴 ${sem.ausentes}</span>
                <span style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:1px 5px; border-radius:4px; white-space:nowrap;" title="Cancelados">⚪ ${sem.cancelados}</span>
            </div>

            <!-- Linha Mensal -->
            <div style="display:flex; align-items:center; gap:4px; background:#f8fafc; padding:3px 8px; border-radius:8px; border:1px solid #e2e8f0; font-size:0.72rem; font-weight:700;">
                <span style="color:#15803d; font-weight:800; padding-right:6px; border-right:1px solid #cbd5e1; white-space:nowrap;" title="Total Acumulado no Mês">📊 Mês: <strong>${mes.total}</strong></span>
                <span style="background:#dbeafe; color:#1e40af; border:1px solid #93c5fd; padding:1px 5px; border-radius:4px; white-space:nowrap;" title="Agendados/Pendentes">🔵 ${mes.agendados}</span>
                <span style="background:#dcfce7; color:#166534; border:1px solid #86efac; padding:1px 5px; border-radius:4px; white-space:nowrap;" title="Atendidos">🟢 ${mes.atendidos}</span>
                <span style="background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; padding:1px 5px; border-radius:4px; white-space:nowrap;" title="Ausentes / Não Veio">🔴 ${mes.ausentes}</span>
                <span style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:1px 5px; border-radius:4px; white-space:nowrap;" title="Cancelados">⚪ ${mes.cancelados}</span>
            </div>
        </div>
    `;
}

function getSecretariaBadgeText(status) {
    const map = {
        pendente: "⏳ Pendente",
        aguardando: "🔔 Chegou / Aguardando",
        realizado: "✅ Atendido",
        ausente: "❌ Ausente / Não Veio",
        cancelado: "🚫 Cancelado"
    };
    return map[status] || status;
}

// ==========================================
// PROJETOS CONTINUADOS DA ORIENTAÇÃO PEDAGÓGICA (OP)
// ==========================================
function renderOpProjetosList() {
    const container = document.getElementById("opProjetosListContainer");
    if (!container) return;

    const filterOrientadoraSelect = document.getElementById("opFilterOrientadora");
    const filterOrientadora = filterOrientadoraSelect ? filterOrientadoraSelect.value : "todas";

    let projetos = sigeDB.getProjetosOrientacao();

    if (filterOrientadora !== "todas") {
        const orientNum = filterOrientadora.includes("1") ? "1" : "2";
        projetos = projetos.filter(p => !p.orientadoraLider || p.orientadoraLider.includes(orientNum) || p.orientadoraLider.toLowerCase().includes("equipe"));
    }

    if (projetos.length === 0) {
        container.innerHTML = `<div style="font-size:0.85rem; color:#94a3b8; text-align:center; padding:2rem; background:white; border-radius:14px; border:1px solid #cbd5e1;"><i class="fa-solid fa-folder-open" style="font-size:2rem; margin-bottom:8px; display:block;"></i>Nenhum projeto continuado da OP cadastrado. Clique em <strong>"+ Projeto OP"</strong> para iniciar.</div>`;
        return;
    }

    container.innerHTML = projetos.map(p => {
        const totalEtapas = p.etapas ? p.etapas.length : 0;
        const concluidasEtapas = p.etapas ? p.etapas.filter(e => e.concluido).length : 0;
        const pctProgresso = totalEtapas > 0 ? Math.round((concluidasEtapas / totalEtapas) * 100) : 0;

        let statusBadge = `<span class="secretaria-status-badge status-realizado">🟢 Em Dia</span>`;
        if (p.status === "atencao") statusBadge = `<span class="secretaria-status-badge status-adiado">🟡 Atenção (Acompanhamento)</span>`;
        if (p.status === "atrasado") statusBadge = `<span class="secretaria-status-badge status-naoresolvido">🔴 Atrasado / Intervenção urgente</span>`;
        if (p.status === "concluido" || pctProgresso === 100) statusBadge = `<span class="secretaria-status-badge status-realizado">🏁 Concluído (100%)</span>`;

        return `
            <div style="background:white; border-radius:18px; padding:1.5rem; border:1px solid #cbd5e1; box-shadow:var(--shadow-sm);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <h4 style="font-size:1.1rem; font-weight:900; color:#0f172a;">${p.titulo}</h4>
                            <span class="sup-event-cat-badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a;">${p.categoria || 'Projeto OP'}</span>
                            ${statusBadge}
                        </div>
                        <p style="font-size:0.83rem; color:#64748b; margin-top:4px;">${p.descricao}</p>
                        <div style="font-size:0.78rem; font-weight:700; color:#1e3a8a; margin-top:4px;">
                            <i class="fa-solid fa-user-gear"></i> <strong>Líder OP:</strong> ${p.orientadoraLider || 'Orientação Pedagógica'}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.75rem; color:#64748b; font-weight:700;">PERÍODO DE EXECUÇÃO</div>
                        <div style="font-size:0.85rem; font-weight:800; color:#0f172a; margin-top:2px;">
                            ${formatDateBR(p.dataInicio)} até ${formatDateBR(p.dataFim)}
                        </div>
                        <button onclick="excluirProjetoOP('${p.id}')" style="background:none; border:none; color:#ef4444; font-size:0.75rem; font-weight:700; cursor:pointer; margin-top:6px;"><i class="fa-solid fa-trash"></i> Excluir Projeto</button>
                    </div>
                </div>

                <!-- Barra de Progresso -->
                <div style="margin-top:1rem; background:#f1f5f9; border-radius:10px; padding:6px 10px; border:1px solid #e2e8f0;">
                    <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">
                        <span>Progresso do Acompanhamento (${concluidasEtapas}/${totalEtapas} etapas concluídas)</span>
                        <span>${pctProgresso}%</span>
                    </div>
                    <div style="background:#cbd5e1; height:10px; border-radius:5px; overflow:hidden;">
                        <div style="background:linear-gradient(90deg, #d97706, #10b981); height:100%; width:${pctProgresso}%;"></div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:1.2rem; margin-top:1.2rem;">
                    <!-- Lista de Sub-Etapas / Marcos de Orientação -->
                    <div style="background:#f8fafc; padding:1rem; border-radius:14px; border:1px solid #e2e8f0;">
                        <div style="font-size:0.82rem; font-weight:900; color:#1e293b; margin-bottom:8px; display:flex; justify-content:space-between;">
                            <span><i class="fa-solid fa-list-check" style="color:#d97706;"></i> Etapas & Ações Continuadas:</span>
                            <span style="font-size:0.72rem; color:#64748b;">Marcar para concluir</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${p.etapas ? p.etapas.map(et => `
                                <div style="display:flex; align-items:center; justify-content:space-between; background:white; padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1;">
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.8rem; color:${et.concluido ? '#64748b' : '#0f172a'}; text-decoration:${et.concluido ? 'line-through' : 'none'}; flex:1;">
                                        <input type="checkbox" ${et.concluido ? 'checked' : ''} onchange="sigeDB.toggleEtapaProjetoOrientacao('${p.id}', '${et.id}'); renderModuleOrientacaoPedagogica();">
                                        <strong>${et.titulo}</strong>
                                    </label>
                                    <div style="display:flex; align-items:center; gap:6px;">
                                        <span style="font-size:0.72rem; color:#64748b;"><i class="fa-solid fa-user"></i> ${et.responsavel} (${formatDateBR(et.dataLimite)})</span>
                                        ${!et.concluido ? `<button onclick="cobrarEtapaOPWhatsapp('${et.responsavel}', '${p.titulo.replace(/'/g, "\\'")}', '${et.titulo.replace(/'/g, "\\'")}', '${et.dataLimite}')" class="btn-sec" style="font-size:0.68rem; padding:2px 8px; background:#d97706; color:white; border-radius:6px;" title="Cobrar/Notificar no WhatsApp">📲 Notificar</button>` : ''}
                                    </div>
                                </div>
                            `).join("") : ''}
                        </div>
                    </div>

                    <!-- Checklist de Procedimentos OP -->
                    <div style="background:#f8fafc; padding:1rem; border-radius:14px; border:1px solid #e2e8f0;">
                        <div style="font-size:0.82rem; font-weight:900; color:#1e293b; margin-bottom:8px;">
                            <i class="fa-solid fa-clipboard-list" style="color:#059669;"></i> Checklist de Acompanhamento:
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${p.checklistAcompanhamento ? p.checklistAcompanhamento.map((item, idx) => `
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.78rem; color:${item.concluido ? '#64748b' : '#0f172a'}; text-decoration:${item.concluido ? 'line-through' : 'none'}; background:white; padding:5px 8px; border-radius:6px; border:1px solid #e2e8f0;">
                                    <input type="checkbox" ${item.concluido ? 'checked' : ''} onchange="sigeDB.toggleChecklistProjetoOrientacao('${p.id}', ${idx}); renderModuleOrientacaoPedagogica();">
                                    ${item.item}
                                </label>
                            `).join("") : ''}
                        </div>

                        <div style="margin-top:10px; font-size:0.75rem; color:#475569; background:white; padding:6px 10px; border-radius:8px; border:1px solid #e2e8f0;">
                            <i class="fa-solid fa-users" style="color:var(--op-color);"></i> <strong>Professores & Atores:</strong> ${p.envolvidos || 'Equipe Pedagógica'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function openNovoProjetoOPModal() {
    try {
        if (typeof setOpViewMode === "function") {
            setOpViewMode('projetos');
        }

        const modal = document.getElementById("modalNovoProjetoOP");
        if (modal) {
            const elTit = document.getElementById("projOpInputTitulo");
            const elCat = document.getElementById("projOpInputCategoria");
            const elOri = document.getElementById("projOpInputOrientadora");
            const elIni = document.getElementById("projOpInputDataInicio");
            const elFim = document.getElementById("projOpInputDataFim");
            const elSts = document.getElementById("projOpInputStatus");
            const elEnv = document.getElementById("projOpInputEnvolvidos");
            const elDes = document.getElementById("projOpInputDescricao");
            const elEtp = document.getElementById("projOpInputEtapasText");
            const elChk = document.getElementById("projOpInputChecklistText");

            const hojeIso = new Date().toISOString().split("T")[0];
            const futuroIso = (typeof getFutureDateIso === "function") ? getFutureDateIso(60) : hojeIso;

            if (elTit) elTit.value = "";
            if (elCat) elCat.value = "Mediação de Conflitos";
            if (elOri) elOri.value = "Orientadora 1 (Carmen)";
            if (elIni) elIni.value = hojeIso;
            if (elFim) elFim.value = futuroIso;
            if (elSts) elSts.value = "em_dia";
            if (elEnv) elEnv.value = "";
            if (elDes) elDes.value = "";
            if (elEtp) elEtp.value = "";
            if (elChk) elChk.value = "";

            modal.style.setProperty("display", "flex", "important");
        } else {
            console.error("modalNovoProjetoOP não encontrado no DOM!");
        }
    } catch (err) {
        console.error("Erro ao abrir modalNovoProjetoOP:", err);
    }
}

function closeNovoProjetoOPModal() {
    const modal = document.getElementById("modalNovoProjetoOP");
    if (modal) {
        modal.style.setProperty("display", "none", "important");
    }
}

function submitNovoProjetoOP(e) {
    if (e && e.preventDefault) e.preventDefault();

    try {
        const elTit = document.getElementById("projOpInputTitulo");
        const elCat = document.getElementById("projOpInputCategoria");
        const elOri = document.getElementById("projOpInputOrientadora");
        const elIni = document.getElementById("projOpInputDataInicio");
        const elFim = document.getElementById("projOpInputDataFim");
        const elSts = document.getElementById("projOpInputStatus");
        const elEnv = document.getElementById("projOpInputEnvolvidos");
        const elDes = document.getElementById("projOpInputDescricao");
        const elEtp = document.getElementById("projOpInputEtapasText");
        const elChk = document.getElementById("projOpInputChecklistText");

        const titulo = elTit ? elTit.value.trim() : "";
        if (!titulo) {
            showToast("Por favor, informe o título do projeto.");
            return false;
        }

        const categoria = elCat ? elCat.value : "Mediação de Conflitos";
        const orientadoraLider = elOri ? elOri.value : "Orientadora 1 (Carmen)";
        const hojeIso = new Date().toISOString().split("T")[0];
        const dataInicio = elIni && elIni.value ? elIni.value : hojeIso;
        const dataFim = elFim && elFim.value ? elFim.value : hojeIso;
        const status = elSts ? elSts.value : "em_dia";
        const envolvidos = elEnv ? elEnv.value.trim() : "";
        const descricao = elDes ? elDes.value.trim() : "";

        // Parse sub-etapas
        const etapasRaw = elEtp && elEtp.value ? elEtp.value.trim().split("\n") : [];
        const etapas = [];
        etapasRaw.forEach((line, idx) => {
            if (!line.trim()) return;
            const parts = line.split("|").map(p => p.trim());
            etapas.push({
                id: `e-op-${Date.now()}-${idx}`,
                titulo: parts[0] || "Etapa sem título",
                dataLimite: parts[1] || dataFim,
                responsavel: parts[2] || orientadoraLider,
                concluido: false
            });
        });

        // Parse checklist
        const checkRaw = elChk && elChk.value ? elChk.value.trim().split("\n") : [];
        const checklistAcompanhamento = [];
        checkRaw.forEach(line => {
            if (!line.trim()) return;
            checklistAcompanhamento.push({
                item: line.trim(),
                concluido: false
            });
        });

        const newProj = {
            titulo,
            categoria,
            orientadoraLider,
            dataInicio,
            dataFim,
            status,
            envolvidos,
            descricao,
            etapas,
            checklistAcompanhamento
        };

        sigeDB.addProjetoOrientacao(newProj);
        closeNovoProjetoOPModal();
        setOpViewMode('projetos');
        showToast("Projeto continuado da OP cadastrado com sucesso!");
    } catch (err) {
        console.error("Erro ao cadastrar projeto OP:", err);
        showToast("Erro ao cadastrar projeto. Tente novamente.");
    }
    return false;
}

function excluirProjetoOP(id) {
    if (confirm("Tem certeza que deseja excluir este projeto da Orientação Pedagógica?")) {
        sigeDB.deleteProjetoOrientacao(id);
        renderModuleOrientacaoPedagogica();
        showToast("Projeto removido!");
    }
}

function cobrarEtapaOPWhatsapp(responsavel, projTitulo, etapaTitulo, dataLimite) {
    const textMsg = encodeURIComponent(`Olá ${responsavel}! Lembramos sobre a etapa "${etapaTitulo}" do projeto OP "${projTitulo}", com prazo limite em ${formatDateBR(dataLimite)}. Por favor, confirme o andamento.`);
    window.open(`https://wa.me/?text=${textMsg}`, '_blank');
    sigeDB.logAuditEvent("Orientação Pedagógica", `Lembrete WhatsApp enviado para ${responsavel} (Projeto OP: ${projTitulo})`, "Orientação");
}

// Bind de segurança global no escopo window
window.openNovoProjetoOPModal = openNovoProjetoOPModal;
window.closeNovoProjetoOPModal = closeNovoProjetoOPModal;
window.submitNovoProjetoOP = submitNovoProjetoOP;
window.excluirProjetoOP = excluirProjetoOP;
window.cobrarEtapaOPWhatsapp = cobrarEtapaOPWhatsapp;

let currentDetailAppointmentId = null;

function playArrivalChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
        console.log("AudioChime fallback:", e);
    }
}

function openDetalhesModal(id) {
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === id);
    if (!ag) return;

    currentDetailAppointmentId = id;

    const isProf = ag.publico === "professor";
    document.getElementById("detalhesAlunoNome").innerText = isProf ? `👨‍🏫 ${ag.aluno}` : ag.aluno;
    document.getElementById("detalhesTurmaBadge").innerText = isProf ? `Docente: ${ag.turma}` : ag.turma;
    document.getElementById("detalhesResponsavelNome").innerText = ag.responsavel || (isProf ? 'Contato Direto' : '-');
    document.getElementById("detalhesOrientadora").innerText = ag.orientadora || "Orientação Educacional (OE)";
    document.getElementById("detalhesDataHorario").innerText = `${formatDateBR(ag.data)} às ${ag.horario} (${ag.turno.toUpperCase()})`;
    
    document.getElementById("detalhesTipoVaga").innerHTML = `<span class="op-type-tag ${ag.tipo}">${ag.tipo === 'emergencial' ? '🚨 Emergencial' : '📅 Agendado'}</span>`;
    document.getElementById("detalhesStatusBadge").innerHTML = `<span class="secretaria-status-badge status-${ag.statusSecretaria}">${getSecretariaBadgeText(ag.statusSecretaria)}</span>`;

    const waBtn = document.getElementById("detalhesWaBtn");
    const waText = document.getElementById("detalhesTelefoneText");
    if (waBtn && waText) {
        waText.innerText = ag.telefone || "Sem telefone";
    }

    document.getElementById("detalhesMotivoText").innerText = ag.motivo;
    
    // Preenche a caixa de mensagem editável com o template padrão de lembrete
    aplicarTemplateMensagem('lembrete_dia');

    const obsBox = document.getElementById("detalhesObsBox");
    const obsText = document.getElementById("detalhesObsText");
    if (obsBox && obsText) {
        if (ag.obsSecretaria || ag.chegadaEm) {
            let info = ag.obsSecretaria ? `"${ag.obsSecretaria}"` : "";
            if (ag.chegadaEm) {
                const hor = ag.chegadaEm.split("T")[1]?.substring(0, 5) || "";
                info += ` (Chegou na recepção às ${hor})`;
            }
            obsText.innerText = info;
            obsBox.style.display = "block";
        } else {
            obsBox.style.display = "none";
        }
    }

    // Visibilidade dos botões conforme o perfil
    const role = sigeDB.getRole();
    const btnAguardando = document.getElementById("btnAcaoAguardando");
    const btnAtendido = document.getElementById("btnAcaoAtendido");
    const btnNaoVeio = document.getElementById("btnAcaoNaoVeio");

    if (btnAguardando) btnAguardando.style.display = ["secretaria", "admin", "direcao"].includes(role) ? "inline-flex" : "none";
    if (btnAtendido) btnAtendido.style.display = ["orientacao", "admin", "direcao"].includes(role) ? "inline-flex" : "none";
    if (btnNaoVeio) btnNaoVeio.style.display = ["orientacao", "admin", "direcao"].includes(role) ? "inline-flex" : "none";

    // Renderizar histórico de disparos de WhatsApp
    renderWhatsappDispatchHistory(ag);

    document.getElementById("modalDetalhesOP").style.display = "flex";
}

function closeDetalhesModal() {
    const modal = document.getElementById("modalDetalhesOP");
    if (modal) modal.style.display = "none";
    currentDetailAppointmentId = null;
}

function detalhesMudarStatus(newStatus, customId = null) {
    const id = customId || currentDetailAppointmentId;
    if (!id) return;

    let obsPrompt = "";
    let chegadaEm = null;

    if (newStatus === "aguardando") {
        chegadaEm = new Date().toISOString();
        obsPrompt = "Chegou na recepção.";
        playArrivalChime(); // Bipe sonoro
        
        const agObj = sigeDB.getAgendamentosOP().find(a => a.id === id);
        if (agObj) sendAutomaticWhatsapp(agObj, "aluno_chegou");
    }

    sigeDB.updateSecretariaStatusOP(id, newStatus, obsPrompt, chegadaEm);

    renderModuleOrientacaoPedagogica();
    updateBadgesCounts();
    renderNotifications();

    if (newStatus === "aguardando") {
        showToast("🔔 Marcado como AGUARDANDO na recepção.");
    } else if (newStatus === "realizado") {
        showToast("✅ Atendimento marcado como CONCLUÍDO!");
    } else if (newStatus === "ausente") {
        showToast("❌ Marcado como NÃO VEIO / Ausente.");
    }

    if (currentDetailAppointmentId === id) {
        openDetalhesModal(id);
    }
}

function salvarEncaminhamentoEDeliberacao() {
    if (!currentDetailAppointmentId) return;
    const encElem = document.getElementById("detalhesInputEncaminhamento");
    const enc = encElem ? encElem.value : "Nenhum";
    const histElem = document.getElementById("detalhesInputHistoricoTratado");
    const hist = histElem ? histElem.value : "";

    sigeDB.updateEncaminhamentoOP(currentDetailAppointmentId, enc, hist);
    showToast("💾 Relato da conversa e combinados salvos com sucesso!");
    renderModuleOrientacaoPedagogica();
}

function dispararLembrete24h() {
    if (!currentDetailAppointmentId) return;
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === currentDetailAppointmentId);
    if (!ag || !ag.telefone) return alert("Sem telefone cadastrado!");

    sendAutomaticWhatsapp(ag, "lembrete_24h");
    renderWhatsappDispatchHistory(ag);
}

function dispararLembreteHoje() {
    if (!currentDetailAppointmentId) return;
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === currentDetailAppointmentId);
    if (!ag || !ag.telefone) return alert("Sem telefone cadastrado!");

    sendAutomaticWhatsapp(ag, "lembrete_dia");
    renderWhatsappDispatchHistory(ag);
}

function addOneHour(timeStr) {
    if (!timeStr || !timeStr.includes(":")) return "09:00";
    const parts = timeStr.split(":");
    let h = parseInt(parts[0], 10);
    let m = parts[1];
    h = (h + 1) % 24;
    const hStr = h < 10 ? `0${h}` : `${h}`;
    return `${hStr}:${m}`;
}

function gerarDeclaracaoComparecimento(id) {
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === id);
    if (!ag) return;

    const dataAtual = new Date().toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' });
    const horInicio = ag.horario || "08:00";
    const horFim = addOneHour(horInicio);

    const isClar = !ag.orientadora || ag.orientadora.includes("Clarinda") || ag.orientadora.includes("1") || ag.orientadora.includes("Carmen");
    const orientadoraNome = isClar ? "Clarinda Rosa Pereira" : "Daiane Caetano Costa de Aquino";
    const orientadoraCargo = isClar ? "Orientadora Educacional — Séries Iniciais" : "Orientadora Educacional — Séries Finais";

    const isProf = ag.publico === "professor";
    const corpoTexto = isProf ? 
        `Declaramos para os devidos fins a quem interessar possa que o(a) docente/professor(a) <strong>${ag.aluno}</strong> (Disciplina/Turma: <strong>${ag.turma}</strong>) compareceu a este estabelecimento de ensino no dia <strong>${formatDateBR(ag.data)}</strong>, no período das <strong>${horInicio}</strong> às <strong>${horFim}</strong>, para reunião, alinhamento pedagógico e atendimento com o setor de Orientação Educacional.` :
        `Declaramos para os devidos fins a quem interessar possa que o(a) Sr(a). <strong>${ag.responsavel}</strong> compareceu a este estabelecimento de ensino no dia <strong>${formatDateBR(ag.data)}</strong>, no período das <strong>${horInicio}</strong> às <strong>${horFim}</strong>, para reunião e atendimento da Orientação Educacional referente ao estudante <strong>${ag.aluno}</strong>, regularmente matriculado no <strong>${ag.turma}</strong>.`;

    const certHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Declaração de Comparecimento - Orientação Educacional - C.E. Pedro Rizzi</title>
            <style>
                @page { size: portrait; margin: 20mm; }
                body { font-family: 'Times New Roman', serif; padding: 20px; color: #111; line-height: 1.8; background: #fff; }
                .cert-box { border: 2px solid #000; padding: 40px 30px; max-width: 700px; margin: 0 auto; min-height: 850px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h2 { font-size: 20px; font-weight: bold; margin: 0 0 5px 0; letter-spacing: 1px; }
                .header p { font-size: 13px; margin: 0; color: #333; }
                .title { font-size: 20px; font-weight: bold; margin: 40px 0 30px 0; text-align: center; text-transform: uppercase; letter-spacing: 2px; text-decoration: underline; }
                .content { font-size: 16px; text-align: justify; text-indent: 40px; margin-bottom: 40px; line-height: 2; }
                .footer-sign { margin-top: 80px; display: flex; justify-content: center; }
                .sign-line { border-top: 1px solid #000; width: 300px; text-align: center; font-size: 14px; padding-top: 6px; }
                @media print { .no-print { display: none !important; } .cert-box { border: none; padding: 0; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align:center; margin-bottom:20px;">
                <button onclick="window.print()" style="padding:12px 24px; font-size:16px; background:#1e3a8a; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                    🖨️ Imprimir / Salvar PDF (Formato Retrato A4)
                </button>
            </div>

            <div class="cert-box">
                <div>
                    <div class="header">
                        <img src="img/logo-pedro-rizzi.png" alt="Logo Escola" style="max-height:65px; display:block; margin:0 auto 10px auto;">
                        <h2>CENTRO EDUCACIONAL PEDRO RIZZI</h2>
                        <p>SETOR DE ORIENTAÇÃO EDUCACIONAL (OE)</p>
                        <p style="font-size:12px; margin-top:2px;">Rua Agílio Cunha, 812 - Cidade Nova - Itajaí - SC • Fone: (47) 3508-0264</p>
                        <hr style="border: 0.5px solid #000; margin-top:15px;">
                    </div>

                    <div class="title">DECLARAÇÃO DE COMPARECIMENTO</div>

                    <div class="content">
                        ${corpoTexto}
                    </div>
                </div>

                <div>
                    <p style="text-align:right; font-size:15px; margin-bottom:60px;">
                        Itajaí/SC, ${dataAtual}.
                    </p>

                    <div class="footer-sign">
                        <div class="sign-line">
                            <strong>${orientadoraNome}</strong><br>
                            ${orientadoraCargo}
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(certHtml);
    win.document.close();
}

function abrirProntuarioDoAlunoAtual() {
    if (!currentDetailAppointmentId) return;
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === currentDetailAppointmentId);
    if (ag) openProntuarioModal(ag.aluno);
}

function getOrientadoraInfoForRecord(ag) {
    const isClar = !ag || !ag.orientadora || ag.orientadora.includes("Clarinda") || ag.orientadora.includes("1") || ag.orientadora.includes("Carmen");
    return {
        nome: isClar ? "Clarinda Rosa Pereira" : "Daiane Caetano Costa de Aquino",
        cargo: isClar ? "Orientadora Educacional — Séries Iniciais" : "Orientadora Educacional — Séries Finais",
        short: isClar ? "Clarinda Rosa Pereira (Séries Iniciais)" : "Daiane Caetano Costa de Aquino (Séries Finais)",
        isClar: isClar
    };
}

function openProntuarioModal(alunoNome) {
    const todos = sigeDB.getAgendamentosOP().filter(a => a.aluno.toLowerCase().trim() === alunoNome.toLowerCase().trim());
    
    const ultAg = todos.length > 0 ? todos[todos.length - 1] : null;
    const oriMain = getOrientadoraInfoForRecord(ultAg);

    document.getElementById("prontuarioAlunoNome").innerText = alunoNome;
    document.getElementById("prontuarioTotalCount").innerText = `${todos.length} atendimento(s) no histórico • Orientadora: ${oriMain.short}`;

    const bodyContainer = document.getElementById("prontuarioTimelineContainer");
    if (bodyContainer) {
        if (todos.length === 0) {
            bodyContainer.innerHTML = `<div class="empty-state"><p>Nenhum atendimento cadastrado para este aluno.</p></div>`;
        } else {
            bodyContainer.innerHTML = todos.map(a => {
                const itemOri = getOrientadoraInfoForRecord(a);
                return `
                <div style="background:#f8fafc; border-left:4px solid #7c3aed; border-radius:12px; padding:1.2rem; margin-bottom:1rem; border:1px solid #e2e8f0;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:800; color:#0f172a; font-size:0.95rem;">
                            <i class="fa-regular fa-calendar"></i> ${formatDateBR(a.data)} às ${a.horario} (${a.turno.toUpperCase()})
                        </span>
                        <span class="secretaria-status-badge status-${a.statusSecretaria}">${getSecretariaBadgeText(a.statusSecretaria)}</span>
                    </div>
                    <div style="font-size:0.85rem; color:#475569; margin-top:6px;">
                        <strong>Responsável:</strong> ${a.responsavel} • <strong>Orientadora:</strong> ${itemOri.short}
                    </div>
                    <div style="font-size:0.88rem; color:#1e293b; margin-top:8px; background:white; padding:10px; border-radius:8px; border:1px solid #cbd5e1;">
                        <strong>Motivo / Assunto:</strong> ${a.motivo}
                    </div>
                    ${a.historicoTratado || a.encaminhamento ? `
                        <div style="font-size:0.85rem; color:#15803d; margin-top:6px; background:#f0fdf4; padding:8px 10px; border-radius:8px; border:1px solid #bbf7d0;">
                            <strong>Encaminhamento:</strong> ${a.encaminhamento || 'Nenhum'}
                            ${a.historicoTratado ? `<br><strong>Deliberações:</strong> ${a.historicoTratado}` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
            }).join("");
        }
    }

    document.getElementById("modalProntuarioAluno").style.display = "flex";
}

function closeProntuarioModal() {
    const modal = document.getElementById("modalProntuarioAluno");
    if (modal) modal.style.display = "none";
}

let currentReagendarId = null;

function reagendarAluno(id) {
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === id);
    if (!ag) return;

    currentReagendarId = id;
    
    const isProf = ag.publico === "professor";
    const elemAluno = document.getElementById("reagendarNomeAluno");
    if (elemAluno) elemAluno.innerText = isProf ? `👨‍🏫 ${ag.aluno}` : `${ag.aluno} (${ag.turma || '-'})`;

    const elemOri = document.getElementById("reagendarInfoOri");
    if (elemOri) elemOri.innerText = `Orientadora: ${ag.orientadora || 'Orientação Educacional'}`;

    const inpData = document.getElementById("reagendarInputData");
    if (inpData) inpData.value = ag.data || new Date().toISOString().split("T")[0];

    const inpHorario = document.getElementById("reagendarInputHorario");
    if (inpHorario) inpHorario.value = ag.horario || "08:00";

    const inpTurno = document.getElementById("reagendarInputTurno");
    if (inpTurno) inpTurno.value = ag.turno || "matutino";

    closeDetalhesModal();

    const modal = document.getElementById("modalReagendarOP");
    if (modal) modal.style.display = "flex";
}

function closeReagendarModal() {
    const modal = document.getElementById("modalReagendarOP");
    if (modal) modal.style.display = "none";
    currentReagendarId = null;
}

function autoSelectTurnoReagendamento() {
    const horElem = document.getElementById("reagendarInputHorario");
    const turElem = document.getElementById("reagendarInputTurno");
    if (!horElem || !turElem) return;
    const val = horElem.value;
    if (!val) return;
    const hour = parseInt(val.split(":")[0], 10);
    if (!isNaN(hour)) {
        turElem.value = hour < 12 ? "matutino" : "vespertino";
    }
}

function submitReagendamentoOP(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentReagendarId) return;

    const ags = sigeDB.getAgendamentosOP() || [];
    const ag = ags.find(a => a.id === currentReagendarId);
    if (!ag) return;

    const novaData = document.getElementById("reagendarInputData").value;
    const novoHorario = document.getElementById("reagendarInputHorario").value;
    const novoTurno = document.getElementById("reagendarInputTurno").value;

    if (!novaData || !novoHorario) {
        showToast("Por favor, selecione a nova data e o novo horário.", "error");
        return;
    }

    if (sigeDB.isDiaBloqueado(novaData)) {
        const blockObj = sigeDB.getDiasBloqueados().find(b => b.data === novaData);
        alert(`A data ${formatDateBR(novaData)} está BLOQUEADA (${blockObj ? blockObj.motivo : 'Recesso/Conselho'}). Escolha outra data.`);
        return;
    }

    const dataAntiga = ag.data;
    const horarioAntigo = ag.horario;

    ag.data = novaData;
    ag.horario = novoHorario;
    ag.turno = novoTurno;
    ag.statusSecretaria = "agendado";

    // Registrar histórico do disparo de WhatsApp
    if (!ag.historicoWhatsapp) ag.historicoWhatsapp = [];
    const msgAuto = `📅 Reagendado de ${formatDateBR(dataAntiga)} (${horarioAntigo}) para ${formatDateBR(novaData)} às ${novoHorario}`;
    ag.historicoWhatsapp.unshift({
        id: "wlog-" + Date.now(),
        tipo: "Reagendamento de Data/Horário",
        mensagem: msgAuto,
        enviadoEm: new Date().toISOString(),
        modo: "automático",
        status: "sucesso",
        destinatario: ag.telefone || ""
    });

    sigeDB.saveAgendamentosOP(ags);

    showToast(`📅 Agendamento de "${ag.aluno}" reagendado para ${formatDateBR(novaData)} às ${novoHorario}!`, "success");
    closeReagendarModal();
    renderModuleOrientacaoPedagogica();
}

function aplicarTemplateMensagem(tipo) {
    if (!currentDetailAppointmentId) return;
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === currentDetailAppointmentId);
    if (!ag) return;

    const textarea = document.getElementById("detalhesMensagemEditavel");
    if (!textarea) return;

    const dataFmt = formatDateBR(ag.data);
    const alunoNome = ag.aluno;
    const respNome = ag.responsavel || "Família";
    const oriNome = ag.orientadora || "Orientação Educacional";
    const hor = ag.horario || "";

    let text = "";
    if (tipo === "lembrete_dia") {
        text = `Olá ${respNome}! Lembramos do agendamento do estudante ${alunoNome} (${ag.turma}) com a Orientadora Educacional ${oriNome} HOJE, às ${hor}. Aguardamos vocês no Centro Educacional Pedro Rizzi.`;
    } else if (tipo === "lembrete_24h") {
        text = `Olá ${respNome}! Lembramos do agendamento do estudante ${alunoNome} (${ag.turma}) com a Orientadora Educacional ${oriNome} amanhã, dia ${dataFmt} às ${hor}. Centro Educacional Pedro Rizzi.`;
    } else if (tipo === "reagendado") {
        text = `Olá ${respNome}! Confirmamos o REAGENDAMENTO do atendimento do estudante ${alunoNome} (${ag.turma}) para o dia ${dataFmt} às ${hor} com a Orientação Educacional do Centro Educacional Pedro Rizzi.`;
    } else if (tipo === "falta") {
        text = `Olá ${respNome}! Registramos a ausência no atendimento agendado do estudante ${alunoNome} (${ag.turma}) no dia ${dataFmt} às ${hor}. Por favor, entre em contato conosco para reagendarmos.`;
    }

    textarea.value = text;
    showToast(`Mensagem carregada (${tipo.toUpperCase()}). Você pode editar antes de enviar!`);
}

function enviarMensagemPersonalizadaWhatsApp(e) {
    if (!currentDetailAppointmentId) return;
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === currentDetailAppointmentId);
    if (!ag) return;

    const textarea = document.getElementById("detalhesMensagemEditavel");
    const customText = textarea ? textarea.value.trim() : "";
    if (!customText) {
        if (e && e.preventDefault) e.preventDefault();
        alert("Por favor, digite ou selecione uma mensagem antes de enviar.");
        return;
    }

    const cleanPhone = (ag.telefone || "").replace(/\D/g, "");
    if (!cleanPhone) {
        if (e && e.preventDefault) e.preventDefault();
        alert("Telefone/WhatsApp de contato não cadastrado para este atendimento.");
        return;
    }

    // Registra disparo no histórico auditável
    sigeDB.logWhatsappDispatch(ag.id, {
        tipo: "Mensagem WhatsApp (Personalizada)",
        mensagem: customText,
        modo: "manual",
        status: "sucesso",
        destinatario: cleanPhone
    });

    renderWhatsappDispatchHistory(ag);

    const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(customText)}`;
    window.open(waUrl, "_blank");
}

function dispararLembretesDoDiaAutomated() {
    const todosAtendimentos = sigeDB.getAgendamentosOP() || [];
    const hojeIso = new Date().toISOString().split("T")[0];
    const atendimentosHoje = todosAtendimentos.filter(a => a.data === hojeIso && a.statusSecretaria !== "cancelado");

    if (atendimentosHoje.length === 0) {
        showToast("Nenhum agendamento cadastrado para hoje para disparar lembretes.", "info");
        return;
    }

    let count = 0;
    atendimentosHoje.forEach(ag => {
        const dataFmt = formatDateBR(ag.data);
        const textAuto = `🤖 [Lembrete Automático HOJE] Olá ${ag.responsavel || 'Família'}! Lembramos do atendimento do estudante ${ag.aluno} (${ag.turma}) agendado para HOJE, ${dataFmt} às ${ag.horario} com a Orientação Educacional (CE Pedro Rizzi).`;
        
        sigeDB.logWhatsappDispatch(ag.id, {
            tipo: "🤖 Lembrete Automático do Dia",
            mensagem: textAuto,
            modo: "automático",
            status: "sucesso",
            destinatario: ag.telefone || ""
        });
        count++;
    });

    showToast(`🤖 ${count} lembrete(s) automático(s) registrado(s) no histórico dos atendimentos de hoje!`, "success");
    renderModuleOrientacaoPedagogica();
}

window.reagendarAluno = reagendarAluno;
window.closeReagendarModal = closeReagendarModal;
window.autoSelectTurnoReagendamento = autoSelectTurnoReagendamento;
window.submitReagendamentoOP = submitReagendamentoOP;
window.aplicarTemplateMensagem = aplicarTemplateMensagem;
window.enviarMensagemPersonalizadaWhatsApp = enviarMensagemPersonalizadaWhatsApp;
window.dispararLembretesDoDiaAutomated = dispararLembretesDoDiaAutomated;

function togglePublicoAgendamentoOP() {
    const selectPub = document.getElementById("opInputPublico");
    if (!selectPub) return;
    const val = selectPub.value;

    const lblAluno = document.getElementById("opLabelAluno");
    const inpAluno = document.getElementById("opInputAluno");
    const lblTurma = document.getElementById("opLabelTurma");
    const inpTurma = document.getElementById("opInputTurma");
    const lblResp = document.getElementById("opLabelResponsavel");
    const inpResp = document.getElementById("opInputResponsavel");
    const lblTel = document.getElementById("opLabelTelefone");
    const inpTel = document.getElementById("opInputTelefone");

    if (val === "professor") {
        if (lblAluno) lblAluno.innerText = "Nome do Professor / Docente:";
        if (inpAluno) inpAluno.placeholder = "Ex: Prof. Carlos Silva";
        if (lblTurma) lblTurma.innerText = "Disciplina / Turma:";
        if (inpTurma) inpTurma.placeholder = "Ex: Matemática / 7º Ano A";
        if (lblResp) lblResp.innerText = "Contato / Coordenação (Opcional):";
        if (inpResp) inpResp.placeholder = "Ex: Coordenação Pedagógica";
        if (lblTel) lblTel.innerText = "Telefone / WhatsApp do Professor:";
    } else {
        if (lblAluno) lblAluno.innerText = "Nome do Aluno:";
        if (inpAluno) inpAluno.placeholder = "Ex: Gabriel Souza";
        if (lblTurma) lblTurma.innerText = "Turma:";
        if (inpTurma) inpTurma.placeholder = "Ex: 7º Ano A";
        if (lblResp) lblResp.innerText = "Nome do Responsável:";
        if (inpResp) inpResp.placeholder = "Ex: Ana Souza (Mãe)";
        if (lblTel) lblTel.innerText = "Telefone / WhatsApp de Contato:";
    }
}
window.togglePublicoAgendamentoOP = togglePublicoAgendamentoOP;

function autoSelectTurnoByHorario() {
    const horElem = document.getElementById("opInputHorario");
    const turElem = document.getElementById("opInputTurno");
    if (!horElem || !turElem) return;
    const val = horElem.value;
    if (!val) return;
    const hour = parseInt(val.split(":")[0], 10);
    if (!isNaN(hour)) {
        if (hour < 12) {
            turElem.value = "matutino";
        } else {
            turElem.value = "vespertino";
        }
    }
}
window.autoSelectTurnoByHorario = autoSelectTurnoByHorario;

// ==========================================
// BLOQUEIO DE DIA & EXCLUSÃO DE AGENDAMENTOS
// ==========================================
function toggleBloqueioDiaHandler(dateIso) {
    if (!dateIso) return;
    const isBlocked = sigeDB.isDiaBloqueado(dateIso);
    const parts = dateIso.split("-");
    const dataFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;

    if (isBlocked) {
        if (confirm(`Deseja DESBLOQUEAR a data ${dataFormatada} para permitir novos agendamentos?`)) {
            sigeDB.toggleBloqueioDia(dateIso);
            showToast(`Data ${dataFormatada} desbloqueada com sucesso!`, "success");
            renderModuleOrientacaoPedagogica();
        }
    } else {
        const motivo = prompt(`Digite o motivo do bloqueio para a data ${dataFormatada}:`, "Conselho de Classe / Recesso / Feriado");
        if (motivo !== null) {
            sigeDB.toggleBloqueioDia(dateIso, motivo || "Dia Bloqueado");
            showToast(`Data ${dataFormatada} bloqueada para novos agendamentos!`, "info");
            renderModuleOrientacaoPedagogica();
        }
    }
}

function excluirAgendamentoDirect(id) {
    if (!id) return;
    const ags = sigeDB.getAgendamentosOP() || [];
    const item = ags.find(a => a.id === id);
    const nomeAluno = item ? item.aluno : 'este agendamento';

    if (confirm(`Tem certeza que deseja EXCLUIR permanentemente o agendamento de "${nomeAluno}"?`)) {
        const deleted = sigeDB.deleteAgendamentoOP(id);
        if (deleted) {
            showToast(`Agendamento de "${nomeAluno}" excluído com sucesso!`, "success");
            closeVisaoDetalhadaDiaModal();
            closeDetalhesModal();
            renderModuleOrientacaoPedagogica();
        }
    }
}

window.toggleBloqueioDiaHandler = toggleBloqueioDiaHandler;
window.excluirAgendamentoDirect = excluirAgendamentoDirect;

// ==========================================
// IMPRESSÃO E VISÃO DETALHADA DO DIA (OE)
// ==========================================
function imprimirAtendimentosDoDia(dateIso) {
    if (!dateIso) return;

    const filterOrientadoraSelect = document.getElementById("opFilterOrientadora");
    const filterVal = filterOrientadoraSelect ? filterOrientadoraSelect.value : "todas";

    const isClarinda = (a) => !a.orientadora || a.orientadora.includes("Clarinda") || a.orientadora.includes("1") || a.orientadora.includes("Carmen");
    const isDaiane = (a) => a.orientadora && (a.orientadora.includes("Daiane") || a.orientadora.includes("2") || a.orientadora.includes("Luciana"));

    const todosAtendimentos = sigeDB.getAgendamentosOP() || [];
    let dateAppointments = todosAtendimentos.filter(a => 
        a.data === dateIso && a.statusSecretaria !== 'cancelado'
    );

    let subTitleText = "Orientação Educacional (OE) — Relatório Diário de Atendimentos";
    let signaturesHtml = `
        <div class="sig-box">
            Clarinda Rosa Pereira<br>Orientadora Educacional — Séries Iniciais
        </div>
        <div class="sig-box">
            Daiane Caetano Costa de Aquino<br>Orientadora Educacional — Séries Finais
        </div>
    `;

    if (filterVal !== "todas") {
        if (filterVal.includes("Clarinda")) {
            dateAppointments = dateAppointments.filter(isClarinda);
            subTitleText = "Orientação Educacional (OE) — Relatório Diário (Clarinda - Séries Iniciais)";
            signaturesHtml = `
                <div class="sig-box" style="margin:0 auto; max-width:350px;">
                    Clarinda Rosa Pereira<br>Orientadora Educacional — Séries Iniciais
                </div>
            `;
        } else if (filterVal.includes("Daiane")) {
            dateAppointments = dateAppointments.filter(isDaiane);
            subTitleText = "Orientação Educacional (OE) — Relatório Diário (Daiane - Séries Finais)";
            signaturesHtml = `
                <div class="sig-box" style="margin:0 auto; max-width:350px;">
                    Daiane Caetano Costa de Aquino<br>Orientadora Educacional — Séries Finais
                </div>
            `;
        }
    }

    dateAppointments.sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));

    const parts = dateIso.split("-");
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const diaNome = diasSemana[dateObj.getDay()] || "Dia da Semana";
    const dataFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;

    let printHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Relatório de Atendimentos OE - ${diaNome} (${dataFormatada})</title>
            <style>
                @page { size: A4 portrait; margin: 10mm; }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: #0f172a;
                    background: #ffffff;
                    margin: 0;
                    padding: 10px;
                    font-size: 12px;
                }
                .print-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #1e3a8a;
                    padding-bottom: 10px;
                    margin-bottom: 14px;
                }
                .school-title {
                    font-size: 16px;
                    font-weight: 800;
                    color: #1e3a8a;
                    margin: 0;
                }
                .sub-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #d97706;
                    margin: 2px 0 0 0;
                }
                .meta-info {
                    text-align: right;
                    font-size: 11px;
                    color: #64748b;
                }
                .date-badge {
                    display: inline-block;
                    background: #eff6ff;
                    color: #1e3a8a;
                    border: 1px solid #93c5fd;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-weight: 800;
                    font-size: 12px;
                    margin-bottom: 12px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 8px;
                }
                th {
                    background: #f1f5f9;
                    color: #334155;
                    font-weight: 800;
                    text-align: left;
                    padding: 8px 6px;
                    font-size: 11px;
                    border: 1px solid #cbd5e1;
                    text-transform: uppercase;
                }
                td {
                    padding: 8px 6px;
                    border: 1px solid #e2e8f0;
                    vertical-align: top;
                    font-size: 11px;
                }
                tr:nth-child(even) td {
                    background: #f8fafc;
                }
                .badge-status {
                    font-size: 10px;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 4px;
                    display: inline-block;
                }
                .status-realizado { background: #dcfce7; color: #166534; }
                .status-agendado { background: #dbeafe; color: #1e40af; }
                .status-faltou { background: #fee2e2; color: #991b1b; }
                .status-pendente { background: #fef3c7; color: #92400e; }
                
                .orientadora-tag {
                    font-weight: 800;
                    font-size: 10px;
                }
                .tag-clarinda { color: #b45309; }
                .tag-daiane { color: #0369a1; }
                
                .motive-box {
                    font-style: italic;
                    color: #334155;
                }
                .footer-signatures {
                    margin-top: 40px;
                    display: flex;
                    justify-content: space-between;
                    gap: 30px;
                }
                .sig-box {
                    flex: 1;
                    border-top: 1px solid #94a3b8;
                    padding-top: 6px;
                    text-align: center;
                    font-size: 10px;
                    color: #475569;
                    font-weight: 700;
                }
                .empty-notice {
                    text-align: center;
                    padding: 30px;
                    color: #64748b;
                    font-style: italic;
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <div style="display:flex; align-items:center;">
                    <img src="img/logo-pedro-rizzi.png" alt="Logo Escola" style="max-height:55px; margin-right:12px;">
                    <div>
                        <h1 class="school-title">Centro Educacional Pedro Rizzi</h1>
                        <h2 class="sub-title">${subTitleText}</h2>
                    </div>
                </div>
                <div class="meta-info">
                    <strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}<br>
                    <strong>Total:</strong> ${dateAppointments.length} agendamento(s)
                </div>
            </div>

            <div class="date-badge">
                📅 ${diaNome.toUpperCase()}, ${dataFormatada}
            </div>

            ${dateAppointments.length === 0 ? `
                <div class="empty-notice">Nenhum atendimento agendado para esta orientadora neste dia.</div>
            ` : `
                <table>
                    <thead>
                        <tr>
                            <th style="width: 55px;">Horário</th>
                            <th style="width: 65px;">Turno</th>
                            <th>Aluno / Turma</th>
                            <th>Responsável / Contato</th>
                            <th>Orientadora</th>
                            <th>Motivo do Atendimento</th>
                            <th style="width: 75px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${dateAppointments.map(item => {
                            const isClar = isClarinda(item);
                            const oriNome = item.orientadora || (isClar ? 'Clarinda (Séries Iniciais)' : 'Daiane (Séries Finais)');
                            const isProf = item.publico === "professor";
                            
                            return `
                                <tr>
                                    <td><strong>${item.horario || '-'}</strong></td>
                                    <td style="text-transform: capitalize;">${item.turno || '-'}</td>
                                    <td>
                                        <strong>${isProf ? '👨‍🏫 ' + item.aluno : item.aluno}</strong><br>
                                        <span style="color:#64748b; font-size:10px;">Turma: ${item.turma || '-'}</span>
                                    </td>
                                    <td>
                                        ${item.responsavel || '-'}<br>
                                        <span style="color:#64748b; font-size:10px;">📞 ${item.telefone || '-'}</span>
                                    </td>
                                    <td class="orientadora-tag ${isClar ? 'tag-clarinda' : 'tag-daiane'}">
                                        ${oriNome}
                                    </td>
                                    <td class="motive-box">
                                        "${item.motivo || 'Sem motivo registrado'}"
                                    </td>
                                    <td>
                                        <span class="badge-status status-${item.statusSecretaria}">
                                            ${getSecretariaBadgeText(item.statusSecretaria)}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `}

            <div class="footer-signatures">
                ${signaturesHtml}
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 350);
                }
            </script>
        </body>
        </html>
    `;

    const printWin = window.open('', '_blank', 'width=900,height=800');
    if (printWin) {
        printWin.document.open();
        printWin.document.write(printHtml);
        printWin.document.close();
    } else {
        showToast("Por favor, permita pop-ups no seu navegador para imprimir.", "error");
    }
}

function abrirVisaoDetalhadaDoDia(dateIso) {
    if (!dateIso) return;
    const modal = document.getElementById("modalVisaoDetalhadaDia");
    if (!modal) return;

    const filterOrientadoraSelect = document.getElementById("opFilterOrientadora");
    const filterVal = filterOrientadoraSelect ? filterOrientadoraSelect.value : "todas";

    const isClarinda = (a) => !a.orientadora || a.orientadora.includes("Clarinda") || a.orientadora.includes("1") || a.orientadora.includes("Carmen");
    const isDaiane = (a) => a.orientadora && (a.orientadora.includes("Daiane") || a.orientadora.includes("2") || a.orientadora.includes("Luciana"));

    const todosAtendimentos = sigeDB.getAgendamentosOP() || [];
    let dateAppointments = todosAtendimentos.filter(a => 
        a.data === dateIso && a.statusSecretaria !== 'cancelado'
    );

    if (filterVal !== "todas") {
        if (filterVal.includes("Clarinda")) {
            dateAppointments = dateAppointments.filter(isClarinda);
        } else if (filterVal.includes("Daiane")) {
            dateAppointments = dateAppointments.filter(isDaiane);
        }
    }

    dateAppointments.sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));

    const parts = dateIso.split("-");
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const diasSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const diaNome = diasSemana[dateObj.getDay()] || "Dia da Semana";
    const dataFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;

    const titleElem = document.getElementById("modalDiaHeaderTitle");
    if (titleElem) {
        titleElem.innerHTML = `<i class="fa-solid fa-calendar-day" style="color:#2563eb;"></i> ${diaNome}, ${dataFormatada}`;
    }

    const subElem = document.getElementById("modalDiaHeaderSub");
    if (subElem) {
        subElem.innerText = `Total de ${dateAppointments.length} agendamento(s) individual(ais) cadastrado(s) para este dia.`;
    }

    const btnPrint = document.getElementById("btnModalDiaImprimir");
    if (btnPrint) {
        btnPrint.onclick = () => imprimirAtendimentosDoDia(dateIso);
    }

    const container = document.getElementById("modalDiaContentBody");
    if (!container) return;

    if (dateAppointments.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:3rem 1rem; color:#64748b;">
                <i class="fa-regular fa-calendar-xmark" style="font-size:2.5rem; color:#cbd5e1; margin-bottom:12px;"></i>
                <div style="font-size:1.1rem; font-weight:800; color:#334155;">Nenhum atendimento agendado para ${diaNome} (${dataFormatada})</div>
                <div style="font-size:0.85rem; margin-top:4px;">Use o botão "Agendar" para registrar um atendimento neste dia.</div>
                <button onclick="closeVisaoDetalhadaDiaModal(); openAgendamentoModal('${dateIso}');" class="btn btn-primary" style="margin-top:16px; width:auto; background:#10b981; border-color:#10b981; cursor:pointer;">
                    <i class="fa-solid fa-calendar-plus"></i> Agendar Atendimento para ${dataFormatada}
                </button>
            </div>
        `;
    } else {
        let html = `
            <div style="margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:10px 14px; border-radius:12px; border:1px solid #e2e8f0;">
                <span style="font-size:0.85rem; font-weight:800; color:#334155;">
                    <i class="fa-solid fa-layer-group" style="color:#6366f1;"></i> Visão Individual Detalhada dos Atendimentos
                </span>
                <button onclick="closeVisaoDetalhadaDiaModal(); openAgendamentoModal('${dateIso}');" class="btn btn-primary" style="font-size:0.78rem; padding:4px 10px; background:#10b981; border:none; width:auto; cursor:pointer;">
                    <i class="fa-solid fa-plus"></i> Novo Agendamento
                </button>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:16px;">
        `;

        dateAppointments.forEach((item) => {
            const waUrl = getWhatsAppUrl(item.telefone, item.aluno, item.responsavel, item.data, item.horario);
            const isProf = item.publico === "professor";
            const isClar = isClarinda(item);
            const oriNome = item.orientadora || (isClar ? 'Clarinda Rosa Pereira (Séries Iniciais)' : 'Daiane Caetano Costa de Aquino (Séries Finais)');

            html += `
                <div style="background:white; border:2px solid ${isClar ? '#f59e0b' : '#0284c7'}; border-radius:14px; padding:16px; box-shadow:0 4px 12px rgba(0,0,0,0.05); position:relative;">
                    
                    <!-- Header do Card Individual -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                            <span style="background:${isClar ? '#fffbeb' : '#f0f9ff'}; color:${isClar ? '#b45309' : '#0369a1'}; border:1px solid ${isClar ? '#fde68a' : '#bae6fd'}; font-weight:900; font-size:0.95rem; padding:4px 10px; border-radius:8px;">
                                <i class="fa-regular fa-clock"></i> ${item.horario || 'Horário a definir'} (${item.turno ? item.turno.toUpperCase() : 'MANHÃ'})
                            </span>
                            <span style="font-size:0.8rem; font-weight:800; color:${isClar ? '#d97706' : '#0284c7'}; background:#f8fafc; padding:3px 8px; border-radius:6px; border:1px solid #e2e8f0;">
                                <i class="fa-solid fa-user-gear"></i> ${oriNome}
                            </span>
                        </div>
                        <div>
                            <select onchange="updateAgendamentoStatusDirect('${item.id}', this.value)" class="search-input" style="font-size:0.8rem; font-weight:800; padding:4px 8px; border-radius:8px; cursor:pointer;">
                                <option value="agendado" ${item.statusSecretaria === 'agendado' ? 'selected' : ''}>🔵 Agendado</option>
                                <option value="realizado" ${item.statusSecretaria === 'realizado' ? 'selected' : ''}>🟢 Realizado</option>
                                <option value="faltou" ${item.statusSecretaria === 'faltou' ? 'selected' : ''}>🔴 Faltou</option>
                                <option value="pendente" ${item.statusSecretaria === 'pendente' ? 'selected' : ''}>🟡 Pendente</option>
                                <option value="cancelado" ${item.statusSecretaria === 'cancelado' ? 'selected' : ''}>⚪ Cancelado</option>
                            </select>
                        </div>
                    </div>

                    <!-- Dados Principais -->
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:14px; margin-bottom:12px;">
                        <div>
                            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:800; color:#64748b;">Aluno / Atendido:</div>
                            <div style="font-size:1.05rem; font-weight:900; color:#0f172a; margin-top:2px;">
                                ${isProf ? '👨‍🏫 ' + item.aluno : item.aluno}
                            </div>
                            <div style="margin-top:4px;">
                                <span class="weekly-class-badge" style="font-size:0.75rem; padding:2px 8px;">Turma: ${item.turma || '-'}</span>
                                <span style="font-size:0.72rem; background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:6px; font-weight:700;">${item.publico === 'professor' ? 'Professor' : 'Aluno / Família'}</span>
                            </div>
                        </div>

                        <div>
                            <div style="font-size:0.75rem; text-transform:uppercase; font-weight:800; color:#64748b;">Responsável / Contato:</div>
                            <div style="font-size:0.92rem; font-weight:800; color:#1e293b; margin-top:2px;">
                                <i class="fa-regular fa-user" style="color:#64748b;"></i> ${item.responsavel || '-'}
                            </div>
                            <div style="font-size:0.83rem; color:#475569; margin-top:2px; display:flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-phone" style="color:#16a34a;"></i> ${item.telefone || '-'}
                            </div>
                        </div>
                    </div>

                    <!-- Motivo -->
                    <div style="background:#f8fafc; border-left:4px solid ${isClar ? '#f59e0b' : '#0284c7'}; padding:10px 12px; border-radius:0 8px 8px 0; margin-bottom:12px;">
                        <div style="font-size:0.73rem; text-transform:uppercase; font-weight:900; color:#475569; margin-bottom:2px;">
                            <i class="fa-solid fa-comment-dots"></i> Motivo do Atendimento:
                        </div>
                        <div style="font-size:0.9rem; font-weight:700; color:#0f172a;">
                            "${item.motivo || 'Motivo não registrado'}"
                        </div>
                    </div>

                    <!-- Rodapé do Card com Ações Rápidas -->
                    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:10px; flex-wrap:wrap; gap:8px;">
                        <a href="${waUrl}" target="_blank" class="btn-whatsapp-direct" style="padding:6px 12px; font-size:0.8rem; text-decoration:none;">
                            <i class="fa-brands fa-whatsapp"></i> Enviar Mensagem
                        </a>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <button onclick="excluirAgendamentoDirect('${item.id}');" class="btn btn-secondary" style="font-size:0.78rem; padding:6px 12px; background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; cursor:pointer;" title="Excluir este agendamento">
                                <i class="fa-solid fa-trash-can"></i> Excluir
                            </button>
                            <button onclick="closeVisaoDetalhadaDiaModal(); openDetalhesModal('${item.id}');" class="btn btn-secondary" style="font-size:0.78rem; padding:6px 12px; background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; cursor:pointer;">
                                <i class="fa-solid fa-pen-to-square"></i> Editar / Ver Histórico
                            </button>
                        </div>
                    </div>

                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    modal.style.display = "flex";
    modal.onclick = (e) => {
        if (e.target === modal) closeVisaoDetalhadaDiaModal();
    };
}

function closeVisaoDetalhadaDiaModal() {
    const modal = document.getElementById("modalVisaoDetalhadaDia");
    if (modal) modal.style.display = "none";
}

function updateAgendamentoStatusDirect(id, newStatus) {
    const ags = sigeDB.getAgendamentosOP() || [];
    const item = ags.find(a => a.id === id);
    if (item) {
        item.statusSecretaria = newStatus;
        sigeDB.saveAgendamentosOP(ags);
        showToast(`Status atualizado para: ${getSecretariaBadgeText(newStatus)}`);
        renderModuleOrientacaoPedagogica();
    }
}

window.imprimirAtendimentosDoDia = imprimirAtendimentosDoDia;
window.abrirVisaoDetalhadaDoDia = abrirVisaoDetalhadaDoDia;
window.closeVisaoDetalhadaDiaModal = closeVisaoDetalhadaDiaModal;
window.updateAgendamentoStatusDirect = updateAgendamentoStatusDirect;

// MODAL AGENDAMENTO OE
function openAgendamentoModal(dateIso = "", turno = "", tipo = "", orientadoraNome = "") {
    const modal = document.getElementById("modalAgendamentoOP");
    if (!modal) return;
    document.getElementById("formAgendamentoOP").reset();

    const selectPub = document.getElementById("opInputPublico");
    if (selectPub) selectPub.value = "aluno";
    if (typeof togglePublicoAgendamentoOP === "function") togglePublicoAgendamentoOP();
    
    document.getElementById("opInputData").value = dateIso || new Date().toISOString().split("T")[0];
    if (turno) document.getElementById("opInputTurno").value = turno;
    if (tipo) document.getElementById("opInputTipo").value = tipo;

    // Verificar orientadora selecionada no filtro superior se nenhuma foi passada explicitamente
    const filterSelect = document.getElementById("opFilterOrientadora");
    const filterVal = filterSelect ? filterSelect.value : "todas";

    let targetOri = orientadoraNome;
    if (!targetOri && filterVal !== "todas") {
        targetOri = filterVal;
    }

    if (targetOri) {
        const selectOri = document.getElementById("opInputOrientadora");
        if (selectOri) {
            for (let opt of selectOri.options) {
                if (opt.value.includes(targetOri) || opt.text.includes(targetOri) || targetOri.includes(opt.value.split(" ")[0])) {
                    selectOri.value = opt.value;
                    break;
                }
            }
        }
    }

    autoSelectTurnoByHorario();
    updateModalWhatsAppPreview();
    modal.style.display = "flex";
}

function closeAgendamentoModal() {
    const modal = document.getElementById("modalAgendamentoOP");
    if (modal) modal.style.display = "none";
}

function submitAgendamentoOP(e) {
    if (e && e.preventDefault) e.preventDefault();
    const publicoSelect = document.getElementById("opInputPublico");
    const publico = publicoSelect ? publicoSelect.value : "aluno";
    const aluno = document.getElementById("opInputAluno").value;
    const turma = document.getElementById("opInputTurma").value;
    const responsavel = document.getElementById("opInputResponsavel").value;
    const telefone = document.getElementById("opInputTelefone").value;
    const orientadora = document.getElementById("opInputOrientadora").value;
    const data = document.getElementById("opInputData").value;
    const horario = document.getElementById("opInputHorario").value;
    const turno = document.getElementById("opInputTurno").value;
    const tipo = document.getElementById("opInputTipo").value;
    const motivo = document.getElementById("opInputMotivo").value;

    try {
        const novoAg = sigeDB.addAgendamentoOP({
            publico, aluno, turma, responsavel, telefone, orientadora, data, horario, turno, tipo, motivo,
            relatoConversa: "",
            historicoTratado: "",
            statusSecretaria: "pendente",
            obsSecretaria: "",
            registradoPor: getRoleLabel(sigeDB.getRole())
        });

        // Disparo automático de WhatsApp sem intervenção humana
        sendAutomaticWhatsapp(novoAg, "agendamento_criado");

        closeAgendamentoModal();
        renderModuleOrientacaoPedagogica();
        updateBadgesCounts();
        renderNotifications();
        showToast("✅ Agendamento de Orientação Educacional registrado com sucesso!");
    } catch (err) {
        alert(err.message);
    }
}

// ==========================================
// EDIÇÃO DE AGENDAMENTO OE
// ==========================================
let currentEditingAppointmentId = null;

function openEditarModal(id) {
    if (!id) return;
    const ags = sigeDB.getAgendamentosOP() || [];
    const item = ags.find(a => a.id === id);
    if (!item) return;

    currentEditingAppointmentId = id;

    const elPub = document.getElementById("editInputPublico");
    const elAluno = document.getElementById("editInputAluno");
    const elTurma = document.getElementById("editInputTurma");
    const elResp = document.getElementById("editInputResponsavel");
    const elTel = document.getElementById("editInputTelefone");
    const elData = document.getElementById("editInputData");
    const elHora = document.getElementById("editInputHorario");
    const elOri = document.getElementById("editInputOrientadora");
    const elSts = document.getElementById("editInputStatus");
    const elMot = document.getElementById("editInputMotivo");

    if (elPub) elPub.value = item.publico || "aluno";
    if (elAluno) elAluno.value = item.aluno || "";
    if (elTurma) elTurma.value = item.turma || "";
    if (elResp) elResp.value = item.responsavel || "";
    if (elTel) elTel.value = item.telefone || "";
    if (elData) elData.value = item.data || "";
    if (elHora) elHora.value = item.horario || "";
    if (elMot) elMot.value = item.motivo || "";
    if (elSts) elSts.value = item.statusSecretaria || "pendente";

    if (elOri) {
        const isClar = !item.orientadora || item.orientadora.includes("Clarinda") || item.orientadora.includes("1");
        elOri.value = isClar ? "Clarinda Rosa Pereira (Séries Iniciais)" : "Daiane Caetano Costa de Aquino (Séries Finais)";
    }

    const modal = document.getElementById("modalEditarOP");
    if (modal) modal.style.display = "flex";
}

function closeEditarModal() {
    const modal = document.getElementById("modalEditarOP");
    if (modal) modal.style.display = "none";
}

function submitEditarAgendamentoOP(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentEditingAppointmentId) return false;

    const ags = sigeDB.getAgendamentosOP() || [];
    const itemIndex = ags.findIndex(a => a.id === currentEditingAppointmentId);
    if (itemIndex === -1) return false;

    const elPub = document.getElementById("editInputPublico");
    const elAluno = document.getElementById("editInputAluno");
    const elTurma = document.getElementById("editInputTurma");
    const elResp = document.getElementById("editInputResponsavel");
    const elTel = document.getElementById("editInputTelefone");
    const elData = document.getElementById("editInputData");
    const elHora = document.getElementById("editInputHorario");
    const elOri = document.getElementById("editInputOrientadora");
    const elSts = document.getElementById("editInputStatus");
    const elMot = document.getElementById("editInputMotivo");

    let turno = ags[itemIndex].turno || "matutino";
    if (elHora && elHora.value) {
        const h = parseInt(elHora.value.split(":")[0], 10);
        turno = h < 12 ? "matutino" : "vespertino";
    }

    ags[itemIndex] = {
        ...ags[itemIndex],
        publico: elPub ? elPub.value : ags[itemIndex].publico,
        aluno: elAluno ? elAluno.value.trim() : ags[itemIndex].aluno,
        turma: elTurma ? elTurma.value.trim() : ags[itemIndex].turma,
        responsavel: elResp ? elResp.value.trim() : ags[itemIndex].responsavel,
        telefone: elTel ? elTel.value.trim() : ags[itemIndex].telefone,
        data: elData ? elData.value : ags[itemIndex].data,
        horario: elHora ? elHora.value : ags[itemIndex].horario,
        orientadora: elOri ? elOri.value : ags[itemIndex].orientadora,
        statusSecretaria: elSts ? elSts.value : ags[itemIndex].statusSecretaria,
        motivo: elMot ? elMot.value.trim() : ags[itemIndex].motivo,
        turno
    };

    sigeDB.saveAgendamentosOP(ags);
    closeEditarModal();
    closeDetalhesModal();
    renderModuleOrientacaoPedagogica();
    showToast("✅ Dados do agendamento editados e salvos!");
    return false;
}

// ==========================================
// RELATÓRIO DE ATENDIMENTOS POR PERÍODO / DATA (OE)
// ==========================================
function openRelatorioModal() {
    const modal = document.getElementById("modalRelatorioOP");
    if (!modal) return;

    const hoje = new Date();
    const isoHoje = hoje.toISOString().split("T")[0];
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0];

    const elIni = document.getElementById("relatorioDataInicio");
    const elFim = document.getElementById("relatorioDataFim");
    if (elIni && !elIni.value) elIni.value = primeiroDiaMes;
    if (elFim && !elFim.value) elFim.value = isoHoje;

    gerarVisualizacaoRelatorioOP();
    modal.style.display = "flex";
}

function closeRelatorioModal() {
    const modal = document.getElementById("modalRelatorioOP");
    if (modal) modal.style.display = "none";
}

function getFiltradosRelatorio() {
    const elIni = document.getElementById("relatorioDataInicio");
    const elFim = document.getElementById("relatorioDataFim");
    const elOri = document.getElementById("relatorioFilterOrientadora");

    const dataIni = elIni ? elIni.value : "";
    const dataFim = elFim ? elFim.value : "";
    const oriFiltro = elOri ? elOri.value : "todas";

    let ags = sigeDB.getAgendamentosOP() || [];
    ags = ags.filter(a => a.statusSecretaria !== 'cancelado');

    if (dataIni) ags = ags.filter(a => a.data >= dataIni);
    if (dataFim) ags = ags.filter(a => a.data <= dataFim);

    const isClarinda = (a) => !a.orientadora || a.orientadora.includes("Clarinda") || a.orientadora.includes("1") || a.orientadora.includes("Carmen");
    const isDaiane = (a) => a.orientadora && (a.orientadora.includes("Daiane") || a.orientadora.includes("2") || a.orientadora.includes("Luciana"));

    if (oriFiltro === "Clarinda") {
        ags = ags.filter(isClarinda);
    } else if (oriFiltro === "Daiane") {
        ags = ags.filter(isDaiane);
    }

    ags.sort((a, b) => (a.data + (a.horario || "")).localeCompare(b.data + (b.horario || "")));
    return { ags, dataIni, dataFim, oriFiltro };
}

function gerarVisualizacaoRelatorioOP() {
    const container = document.getElementById("relatorioResultBody");
    if (!container) return;

    const { ags, dataIni, dataFim, oriFiltro } = getFiltradosRelatorio();

    const isClarinda = (a) => !a.orientadora || a.orientadora.includes("Clarinda") || a.orientadora.includes("1") || a.orientadora.includes("Carmen");
    const isDaiane = (a) => a.orientadora && (a.orientadora.includes("Daiane") || a.orientadora.includes("2") || a.orientadora.includes("Luciana"));

    const total = ags.length;
    const countClarinda = ags.filter(isClarinda).length;
    const countDaiane = ags.filter(isDaiane).length;

    const countRealizados = ags.filter(a => a.statusSecretaria === 'realizado').length;
    const countAgendados = ags.filter(a => a.statusSecretaria === 'agendado').length;
    const countFaltas = ags.filter(a => a.statusSecretaria === 'faltou' || a.statusSecretaria === 'ausente').length;
    const countPendentes = ags.filter(a => a.statusSecretaria === 'pendente').length;

    let html = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-bottom:16px;">
            <div style="background:#f0f9ff; border:1px solid #bae6fd; padding:12px; border-radius:12px; text-align:center;">
                <div style="font-size:0.75rem; font-weight:800; color:#0369a1; text-transform:uppercase;">TOTAL</div>
                <div style="font-size:1.8rem; font-weight:900; color:#0284c7; margin-top:2px;">${total}</div>
            </div>
            <div style="background:#fffbeb; border:1px solid #fde68a; padding:12px; border-radius:12px; text-align:center;">
                <div style="font-size:0.75rem; font-weight:800; color:#b45309; text-transform:uppercase;">CLARINDA (INICIAIS)</div>
                <div style="font-size:1.8rem; font-weight:900; color:#d97706; margin-top:2px;">${countClarinda}</div>
            </div>
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:12px; border-radius:12px; text-align:center;">
                <div style="font-size:0.75rem; font-weight:800; color:#15803d; text-transform:uppercase;">DAIANE (FINAIS)</div>
                <div style="font-size:1.8rem; font-weight:900; color:#16a34a; margin-top:2px;">${countDaiane}</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:12px; text-align:center;">
                <div style="font-size:0.75rem; font-weight:800; color:#475569; text-transform:uppercase;">POR STATUS</div>
                <div style="font-size:0.78rem; font-weight:700; color:#1e293b; margin-top:4px;">
                    🟢 ${countRealizados} Realiz. | 🔵 ${countAgendados} Agend.<br>
                    🔴 ${countFaltas} Faltas | 🟡 ${countPendentes} Pend.
                </div>
            </div>
        </div>
    `;

    if (total === 0) {
        html += `
            <div style="text-align:center; padding:2rem; color:#64748b; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1;">
                <i class="fa-regular fa-folder-open" style="font-size:2rem; color:#cbd5e1; margin-bottom:8px;"></i>
                <p style="font-weight:700;">Nenhum atendimento encontrado para o período selecionado.</p>
            </div>
        `;
    } else {
        html += `
            <table style="width:100%; border-collapse:collapse; font-size:0.82rem;">
                <thead>
                    <tr style="background:#f1f5f9; text-align:left;">
                        <th style="padding:8px; border:1px solid #cbd5e1;">Data/Hora</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Aluno / Turma</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Responsável / Contato</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Orientadora</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Motivo</th>
                        <th style="padding:8px; border:1px solid #cbd5e1;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${ags.map(a => {
                        const isClar = isClarinda(a);
                        const oriNome = a.orientadora || (isClar ? 'Clarinda Rosa Pereira' : 'Daiane Caetano Costa');
                        return `
                            <tr>
                                <td style="padding:8px; border:1px solid #e2e8f0; font-weight:800;">
                                    ${formatDateBR(a.data)}<br>
                                    <span style="font-size:0.75rem; color:#64748b;">${a.horario || '-'} (${a.turno ? a.turno.substring(0,3).toUpperCase() : ''})</span>
                                </td>
                                <td style="padding:8px; border:1px solid #e2e8f0;">
                                    <strong>${a.aluno}</strong><br>
                                    <span style="font-size:0.75rem; color:#64748b;">Turma: ${a.turma || '-'}</span>
                                </td>
                                <td style="padding:8px; border:1px solid #e2e8f0;">
                                    ${a.responsavel || '-'}<br>
                                    <span style="font-size:0.75rem; color:#64748b;">📞 ${a.telefone || '-'}</span>
                                </td>
                                <td style="padding:8px; border:1px solid #e2e8f0; font-weight:700; color:${isClar ? '#b45309' : '#0369a1'};">
                                    ${oriNome}
                                </td>
                                <td style="padding:8px; border:1px solid #e2e8f0; font-style:italic;">
                                    "${a.motivo || 'Não informado'}"
                                </td>
                                <td style="padding:8px; border:1px solid #e2e8f0;">
                                    <span class="secretaria-status-badge status-${a.statusSecretaria}">
                                        ${getSecretariaBadgeText(a.statusSecretaria)}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        `;
    }

    container.innerHTML = html;
}

function imprimirRelatorioAtendimentosOP() {
    const { ags, dataIni, dataFim, oriFiltro } = getFiltradosRelatorio();

    const isClarinda = (a) => !a.orientadora || a.orientadora.includes("Clarinda") || a.orientadora.includes("1") || a.orientadora.includes("Carmen");
    const isDaiane = (a) => a.orientadora && (a.orientadora.includes("Daiane") || a.orientadora.includes("2") || a.orientadora.includes("Luciana"));

    const total = ags.length;
    const countClarinda = ags.filter(isClarinda).length;
    const countDaiane = ags.filter(isDaiane).length;
    const countRealizados = ags.filter(a => a.statusSecretaria === 'realizado').length;
    const countAgendados = ags.filter(a => a.statusSecretaria === 'agendado').length;
    const countFaltas = ags.filter(a => a.statusSecretaria === 'faltou' || a.statusSecretaria === 'ausente').length;
    const countPendentes = ags.filter(a => a.statusSecretaria === 'pendente').length;

    const dataIniFormat = dataIni ? formatDateBR(dataIni) : 'Início';
    const dataFimFormat = dataFim ? formatDateBR(dataFim) : 'Atual';

    let printHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Relatório OE - ${dataIniFormat} a ${dataFimFormat}</title>
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 11px; }
                .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 14px; }
                .logo-img { max-height: 55px; margin-right: 12px; }
                .title-area { flex: 1; }
                .school-name { font-size: 16px; font-weight: 900; color: #1e3a8a; margin: 0; }
                .sub-name { font-size: 12px; font-weight: 800; color: #d97706; margin: 2px 0 0 0; }
                .stats-grid { display: flex; justify-content: space-between; gap: 10px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 14px; }
                .stat-box { text-align: center; flex: 1; }
                .stat-num { font-size: 16px; font-weight: 900; color: #1e3a8a; }
                .stat-label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th { background: #f1f5f9; color: #334155; font-weight: 800; text-align: left; padding: 6px; font-size: 10px; border: 1px solid #cbd5e1; text-transform: uppercase; }
                td { padding: 6px; border: 1px solid #e2e8f0; vertical-align: top; font-size: 10.5px; }
                tr:nth-child(even) td { background: #f8fafc; }
                .badge-status { font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px; display: inline-block; }
                .status-realizado { background: #dcfce7; color: #166534; }
                .status-agendado { background: #dbeafe; color: #1e40af; }
                .status-faltou { background: #fee2e2; color: #991b1b; }
                .status-pendente { background: #fef3c7; color: #92400e; }
                .footer-signatures { margin-top: 35px; display: flex; justify-content: space-between; gap: 30px; }
                .sig-box { flex: 1; border-top: 1px solid #94a3b8; padding-top: 4px; text-align: center; font-size: 10px; color: #475569; font-weight: 700; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div style="display:flex; align-items:center;">
                    <img src="img/logo-pedro-rizzi.png" class="logo-img" alt="Logo Escola">
                    <div class="title-area">
                        <h1 class="school-name">CENTRO EDUCACIONAL PEDRO RIZZI</h1>
                        <h2 class="sub-name">Orientação Educacional (OE) — Relatório Consolidado por Data</h2>
                    </div>
                </div>
                <div style="text-align:right; font-size:10px; color:#64748b;">
                    <strong>Período:</strong> ${dataIniFormat} a ${dataFimFormat}<br>
                    <strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-num">${total}</div>
                    <div class="stat-label">Total Agendamentos</div>
                </div>
                <div class="stat-box">
                    <div class="stat-num" style="color:#d97706;">${countClarinda}</div>
                    <div class="stat-label">Clarinda (Iniciais)</div>
                </div>
                <div class="stat-box">
                    <div class="stat-num" style="color:#16a34a;">${countDaiane}</div>
                    <div class="stat-label">Daiane (Finais)</div>
                </div>
                <div class="stat-box">
                    <div class="stat-num" style="color:#166534;">${countRealizados}</div>
                    <div class="stat-label">Realizados</div>
                </div>
                <div class="stat-box">
                    <div class="stat-num" style="color:#991b1b;">${countFaltas}</div>
                    <div class="stat-label">Faltas / Ausentes</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width:70px;">Data/Hora</th>
                        <th>Aluno / Turma</th>
                        <th>Responsável / Telefone</th>
                        <th>Orientadora</th>
                        <th>Motivo do Atendimento</th>
                        <th style="width:70px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${ags.map(a => {
                        const isClar = isClarinda(a);
                        const oriNome = a.orientadora || (isClar ? 'Clarinda Rosa Pereira' : 'Daiane Caetano');
                        return `
                            <tr>
                                <td><strong>${formatDateBR(a.data)}</strong><br>${a.horario || '-'}</td>
                                <td><strong>${a.aluno}</strong><br><span style="color:#64748b; font-size:9.5px;">Turma: ${a.turma || '-'}</span></td>
                                <td>${a.responsavel || '-'}<br><span style="color:#64748b; font-size:9.5px;">📞 ${a.telefone || '-'}</span></td>
                                <td style="font-weight:700; color:${isClar ? '#b45309' : '#0369a1'};">${oriNome}</td>
                                <td style="font-style:italic;">"${a.motivo || '-'}"</td>
                                <td><span class="badge-status status-${a.statusSecretaria}">${getSecretariaBadgeText(a.statusSecretaria)}</span></td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>

            <div class="footer-signatures">
                <div class="sig-box">Clarinda Rosa Pereira<br>Orientadora Educacional — Séries Iniciais</div>
                <div class="sig-box">Daiane Caetano Costa de Aquino<br>Orientadora Educacional — Séries Finais</div>
            </div>

            <script>
                window.onload = function() { setTimeout(function() { window.print(); }, 350); }
            </script>
        </body>
        </html>
    `;

    const printWin = window.open('', '_blank', 'width=900,height=800');
    if (printWin) {
        printWin.document.open();
        printWin.document.write(printHtml);
        printWin.document.close();
    } else {
        showToast("Permita pop-ups no navegador para imprimir.", "error");
    }
}

// ==========================================
// IMPRESSÃO DE PRONTUÁRIO INDIVIDUAL COM LOGO
// ==========================================
function imprimirProntuarioAlunoCurrent() {
    const alunoNome = document.getElementById("prontuarioAlunoNome")?.innerText || "";
    if (!alunoNome) return;

    const todos = sigeDB.getAgendamentosOP().filter(a => a.aluno.toLowerCase().trim() === alunoNome.toLowerCase().trim());
    todos.sort((a, b) => (a.data + (a.horario || "")).localeCompare(b.data + (b.horario || "")));

    const ultAg = todos.length > 0 ? todos[todos.length - 1] : null;
    const oriMain = getOrientadoraInfoForRecord(ultAg);

    let printHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Prontuário Individual - ${alunoNome}</title>
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 10px; font-size: 11px; }
                .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 14px; }
                .logo-img { max-height: 55px; margin-right: 12px; }
                .school-name { font-size: 16px; font-weight: 900; color: #1e3a8a; margin: 0; }
                .sub-name { font-size: 12px; font-weight: 800; color: #7c3aed; margin: 2px 0 0 0; }
                .aluno-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; }
                .aluno-name { font-size: 14px; font-weight: 900; color: #0f172a; }
                .item-card { background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #7c3aed; border-radius: 6px; padding: 10px; margin-bottom: 10px; }
                .item-header { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 6px; font-weight: 800; }
                .footer-signatures { margin-top: 35px; display: flex; justify-content: center; }
                .sig-box { max-width: 350px; width: 100%; border-top: 1px solid #94a3b8; padding-top: 4px; text-align: center; font-size: 10px; color: #475569; font-weight: 700; }
            </style>
        </head>
        <body>
            <div class="header-container">
                <div style="display:flex; align-items:center;">
                    <img src="img/logo-pedro-rizzi.png" class="logo-img" alt="Logo Escola">
                    <div>
                        <h1 class="school-name">CENTRO EDUCACIONAL PEDRO RIZZI</h1>
                        <h2 class="sub-name">Orientação Educacional — Prontuário Individual do Aluno</h2>
                    </div>
                </div>
                <div style="text-align:right; font-size:10px; color:#64748b;">
                    <strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                </div>
            </div>

            <div class="aluno-card">
                <div class="aluno-name">👨‍🎓 ${alunoNome}</div>
                <div style="font-size:10.5px; color:#475569; margin-top:4px;">
                    <strong>Orientadora Responsável:</strong> ${oriMain.short}<br>
                    <strong>Histórico de Atendimentos:</strong> ${todos.length} registro(s) encontrado(s) na Orientação Educacional
                </div>
            </div>

            ${todos.map(a => {
                const itemOri = getOrientadoraInfoForRecord(a);
                return `
                <div class="item-card">
                    <div class="item-header">
                        <span>📅 ${formatDateBR(a.data)} às ${a.horario || '-'} (${(a.turno || '').toUpperCase()})</span>
                        <span>Status: ${getSecretariaBadgeText(a.statusSecretaria)}</span>
                    </div>
                    <div style="font-size:10.5px; margin-bottom:4px;">
                        <strong>Turma:</strong> ${a.turma || '-'} • <strong>Responsável:</strong> ${a.responsavel || '-'} (📞 ${a.telefone || '-'}) • <strong>Orientadora:</strong> ${itemOri.short}
                    </div>
                    <div style="background:#f8fafc; padding:6px 8px; border-radius:4px; border:1px solid #e2e8f0; margin-top:4px;">
                        <strong>Motivo:</strong> ${a.motivo || 'Não informado'}
                    </div>
                    ${a.historicoTratado || a.encaminhamento ? `
                        <div style="background:#f0fdf4; padding:6px 8px; border-radius:4px; border:1px solid #bbf7d0; margin-top:4px; color:#166534;">
                            ${a.encaminhamento ? `<strong>Encaminhamento:</strong> ${a.encaminhamento}<br>` : ''}
                            ${a.historicoTratado ? `<strong>Deliberações:</strong> ${a.historicoTratado}` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
            }).join("")}

            <div class="footer-signatures">
                <div class="sig-box">${oriMain.nome}<br>${oriMain.cargo}</div>
            </div>

            <script>
                window.onload = function() { setTimeout(function() { window.print(); }, 350); }
            </script>
        </body>
        </html>
    `;

    const printWin = window.open('', '_blank', 'width=900,height=800');
    if (printWin) {
        printWin.document.open();
        printWin.document.write(printHtml);
        printWin.document.close();
    }
}

window.openEditarModal = openEditarModal;
window.closeEditarModal = closeEditarModal;
window.submitEditarAgendamentoOP = submitEditarAgendamentoOP;
window.openRelatorioModal = openRelatorioModal;
window.closeRelatorioModal = closeRelatorioModal;
window.gerarVisualizacaoRelatorioOP = gerarVisualizacaoRelatorioOP;
window.imprimirRelatorioAtendimentosOP = imprimirRelatorioAtendimentosOP;
window.imprimirProntuarioAlunoCurrent = imprimirProntuarioAlunoCurrent;

// ==========================================
// MÓDULO 3: SUPERVISÃO PEDAGÓGICA
// ==========================================
// ==========================================
// MÓDULO 3: SUPERVISÃO PEDAGÓGICA (QUADRO SEMANAL & MULTI-DIAS)
// ==========================================
let supViewMode = "semanal"; // "semanal" ou "kanban"
let currentSupWeekRefDate = new Date();
let currentDetailDemandaSupId = null;

function setSupViewMode(mode) {
    supViewMode = mode;
    document.querySelectorAll(".sup-toggle-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === mode);
    });

    const views = {
        semanal: document.getElementById("supWeeklyViewContainer"),
        projetos: document.getElementById("supProjetosViewContainer"),
        cobrancas: document.getElementById("supCobrancasViewContainer"),
        eventos: document.getElementById("supEventosViewContainer"),
        kanban: document.getElementById("supListViewContainer")
    };

    Object.keys(views).forEach(key => {
        if (views[key]) {
            views[key].style.display = (key === mode) ? "block" : "none";
        }
    });

    renderModuleSupervisao();
}

function moveSupWeek(deltaDays) {
    currentSupWeekRefDate.setDate(currentSupWeekRefDate.getDate() + deltaDays);
    renderModuleSupervisao();
}

function resetSupWeekToToday() {
    currentSupWeekRefDate = new Date();
    renderModuleSupervisao();
}

function renderModuleSupervisao() {
    let demandas = sigeDB.getDemandasSupervisao();
    const filterSup = document.getElementById("supFilterSupervisora");
    if (filterSup && filterSup.value && filterSup.value !== "todas") {
        demandas = demandas.filter(d => d.responsavel === filterSup.value || d.responsavel === "Equipe Supervisão");
    }
    const weekDays = getWeekDays(currentSupWeekRefDate);

    // 1. Renderiza Quadro Semanal da Supervisão
    renderSupervisaoWeeklyAgenda(weekDays, demandas);

    // 2. Renderiza Kanban de Status
    renderSupervisaoKanban(demandas);

    // 3. Renderiza Gestão de Projetos Institucionais
    renderSupervisaoProjetos();

    // 4. Renderiza Central de Cobranças Docentes
    renderSupervisaoCobrancas();

    // 5. Renderiza Saídas de Campo & Reuniões Pedagógicas
    renderSupervisaoEventos();
}

function renderSupervisaoWeeklyAgenda(weekDays, demandas) {
    const rangeText = document.getElementById("supWeekRangeText");
    if (rangeText && weekDays.length === 5) {
        rangeText.innerText = `${weekDays[0].dayMonth} - ${weekDays[4].dayMonth}`;
    }

    const headerRow = document.getElementById("supWeeklyTableHeaderRow");
    const bodyTable = document.getElementById("supWeeklyTableBody");
    if (!headerRow || !bodyTable) return;

    // Header da Tabela
    headerRow.innerHTML = `
        <th class="col-periodo" style="background:#334155; color:white;">TURNO / PERÍODO</th>
        ${weekDays.map(d => `
            <th class="${d.isToday ? 'col-today' : ''}">
                ${d.dayName}<br>
                <span style="font-size:0.8rem; opacity:0.9;">${d.dayMonth}</span>
                ${d.isToday ? '<span class="today-pill">HOJE</span>' : ''}
            </th>
        `).join("")}
    `;

    const turnosConfig = [
        { header: "TURNO MATUTINO (MANHÃ)", turno: "matutino", icon: "fa-solid fa-sun", color: "#f59e0b" },
        { header: "TURNO VESPERTINO (TARDE)", turno: "vespertino", icon: "fa-solid fa-cloud-sun", color: "#d97706" }
    ];

    bodyTable.innerHTML = turnosConfig.map(t => {
        return `
            <tr>
                <td class="slot-time-cell" style="vertical-align:top; background:#f8fafc; border-right:2px solid #cbd5e1; padding:12px 8px;">
                    <div style="font-weight:900; color:#1e293b; font-size:0.82rem; display:flex; align-items:center; gap:6px;">
                        <i class="${t.icon}" style="color:${t.color}; font-size:1rem;"></i> ${t.turno.toUpperCase()}
                    </div>
                    <div style="font-size:0.68rem; color:#64748b; margin-top:4px;">Sem limite fixo</div>
                </td>
                ${weekDays.map(d => {
                    // Filtra eventos ativos nesta data e neste turno
                    const dateItems = demandas.filter(item => {
                        const matchesTurno = item.turno === t.turno || item.turno === "ambos" || !item.turno;
                        const dataInicio = item.dataInicio || item.prazo || item.criadoEm;
                        const dataFim = item.dataFim || dataInicio;

                        return matchesTurno && (dataInicio <= d.dateIso && dataFim >= d.dateIso);
                    });

                    return `
                        <td class="${d.isToday ? 'today-column-cell' : ''}" style="vertical-align:top; padding:8px;">
                            <div style="display:flex; flex-direction:column; gap:6px; min-height:90px;">
                                ${dateItems.map(item => {
                                    const dataInicio = item.dataInicio || item.prazo || item.criadoEm;
                                    const dataFim = item.dataFim || dataInicio;
                                    const isMultiDay = dataInicio !== dataFim;

                                    let spanType = "single";
                                    if (isMultiDay) {
                                        if (d.dateIso === dataInicio) spanType = "start";
                                        else if (d.dateIso === dataFim) spanType = "end";
                                        else spanType = "middle";
                                    }

                                    const categoryClass = getCategoryCssClass(item.categoria);
                                    const statusCss = getDemandaStatusCssClass(item.status);
                                    const statusText = getDemandaStatusBadgeText(item.status);

                                    return `
                                        <div class="sup-event-card ${spanType} ${categoryClass}" onclick="openDemandaSupervisaoModalWithData('${item.id}')" title="${item.descricao || item.titulo}">
                                            <div class="sup-event-header">
                                                <span class="sup-event-cat-badge">${item.categoria || 'Supervisão'}</span>
                                                <span class="priority-tag prio-${item.prioridade || 'media'}" style="font-size:0.65rem; padding:2px 4px;">${(item.prioridade || 'media').toUpperCase()}</span>
                                            </div>
                                            <div class="sup-event-title">${item.titulo}</div>
                                            <div class="sup-event-target"><i class="fa-solid fa-user-tag"></i> ${item.turmaOuProfessor}</div>
                                            ${item.envolvidos ? `<div style="font-size:0.68rem; color:#475569; margin-top:2px; font-weight:600;"><i class="fa-solid fa-users" style="color:var(--supervisao-color);"></i> ${item.envolvidos}</div>` : ''}

                                            ${isMultiDay ? `
                                                <div class="sup-event-multiday-bar">
                                                    <i class="fa-regular fa-calendar-days"></i> 
                                                    ${spanType === 'start' ? '🚩 Início (Multi-Dias)' : (spanType === 'end' ? '🏁 Término' : '──► Em Andamento')}
                                                </div>
                                            ` : ''}

                                            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                                                <span class="secretaria-status-badge ${statusCss}" style="font-size:0.65rem; padding:2px 6px;">
                                                    ${statusText}
                                                </span>
                                                <span style="font-size:0.68rem; color:#64748b; font-weight:700;"><i class="fa-solid fa-user-gear"></i> ${item.responsavel ? item.responsavel.split(" ")[0] : 'Sup'}</span>
                                            </div>
                                        </div>
                                    `;
                                }).join("")}

                                <button onclick="openDemandaSupervisaoModal('${d.dateIso}', '${t.turno}')" class="weekly-slot-empty-btn" style="min-height:36px; font-size:0.8rem;" title="Adicionar Evento na Supervisão">
                                    <i class="fa-solid fa-plus"></i>
                                </button>
                            </div>
                        </td>
                    `;
                }).join("")}
            </tr>
        `;
    }).join("");
}

function renderSupervisaoKanban(demandas) {
    const colPendente = document.getElementById("supColPendente");
    const colAdiado = document.getElementById("supColAdiado");
    const colResolvido = document.getElementById("supColResolvido");
    const colNaoResolvido = document.getElementById("supColNaoResolvido");

    if (!colPendente || !colAdiado || !colResolvido || !colNaoResolvido) return;

    const pendentes = demandas.filter(d => d.status === "pendente" || d.status === "em_atendimento" || d.status === "em_andamento" || !d.status);
    const adiados = demandas.filter(d => d.status === "adiado" || d.status === "reformular");
    const resolvidos = demandas.filter(d => d.status === "resolvido" || d.status === "concluido");
    const naoResolvidos = demandas.filter(d => d.status === "nao_resolvido");

    colPendente.innerHTML = renderDemandaCardsList(pendentes, "supervisao");
    colAdiado.innerHTML = renderDemandaCardsList(adiados, "supervisao");
    colResolvido.innerHTML = renderDemandaCardsList(resolvidos, "supervisao");
    colNaoResolvido.innerHTML = renderDemandaCardsList(naoResolvidos, "supervisao");
}

function getCategoryCssClass(cat) {
    if (!cat) return "cat-planejamento";
    if (cat.includes("Planejamento")) return "cat-planejamento";
    if (cat.includes("Observação")) return "cat-observacao";
    if (cat.includes("Conselho")) return "cat-conselho";
    if (cat.includes("Capacitação")) return "cat-capacitacao";
    if (cat.includes("Documentação")) return "cat-documentacao";
    if (cat.includes("Projetos")) return "cat-projetos";
    return "cat-atendimento";
}

function getDemandaStatusBadgeText(status) {
    if (status === "resolvido" || status === "concluido") return "✅ Resolvido";
    if (status === "adiado") return "⏸️ Adiado";
    if (status === "nao_resolvido") return "❌ Não Resolvido";
    if (status === "reformular") return "🔄 Reformular";
    if (status === "em_atendimento" || status === "em_andamento") return "⏳ Em Andamento";
    return "📌 Pendente";
}

function getDemandaStatusCssClass(status) {
    if (status === "resolvido" || status === "concluido") return "status-resolvido";
    if (status === "adiado") return "status-adiado";
    if (status === "nao_resolvido") return "status-naoresolvido";
    if (status === "reformular") return "status-reformular";
    if (status === "em_atendimento" || status === "em_andamento") return "status-aguardando";
    return "status-pendente";
}

function renderDemandaCardsList(items, moduleType) {
    if (items.length === 0) {
        return `<div style="font-size: 0.8rem; color: #94a3b8; text-align: center; padding: 1rem;">Nenhum item nesta coluna.</div>`;
    }

    return items.map(d => `
        <div class="demanda-card" onclick="${moduleType === 'supervisao' ? `openDemandaSupervisaoModalWithData('${d.id}')` : ''}" style="cursor:pointer;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <span class="priority-tag prio-${d.prioridade}">${(d.prioridade || 'media').toUpperCase()}</span>
                <span style="font-size:0.75rem; color:#94a3b8;"><i class="fa-regular fa-clock"></i> ${formatDateBR(d.dataFim || d.prazo)}</span>
            </div>
            <div class="demanda-title" style="margin-top:6px;">${d.titulo}</div>
            <p style="font-size:0.82rem; color:#475569; margin-top:4px;">${d.descricao}</p>
            ${d.envolvidos ? `<div style="font-size:0.75rem; color:#475569; margin-top:4px; font-weight:600;"><i class="fa-solid fa-users" style="color:var(--supervisao-color);"></i> ${d.envolvidos}</div>` : ''}
            <div style="font-size:0.75rem; color:#64748b; margin-top:8px;">
                <i class="fa-solid fa-user-tag"></i> ${d.turmaOuProfessor || d.setor || ''} • <strong style="color:var(--primary-dark);">${d.categoria || ''}</strong>
            </div>
            <div class="demanda-meta">
                <span>Resp: <strong>${d.responsavel}</strong></span>
                <span class="secretaria-status-badge ${getDemandaStatusCssClass(d.status)}" style="font-size:0.68rem; padding:2px 6px;">
                    ${getDemandaStatusBadgeText(d.status)}
                </span>
            </div>
        </div>
    `).join("");
}

function updateDemandaStatus(moduleType, id, newStatus) {
    if (moduleType === "supervisao") {
        sigeDB.updateStatusDemandaSupervisao(id, newStatus);
        renderModuleSupervisao();
    } else {
        sigeDB.updateStatusDemandaAdmin(id, newStatus);
        renderModuleAdministracao();
    }
    updateBadgesCounts();
    renderNotifications();
    showToast("Status da demanda atualizado!");
}

function addEnvolvidoTag(tag) {
    const input = document.getElementById("supInputEnvolvidos");
    if (!input) return;
    let val = input.value.trim();
    if (!val) {
        input.value = tag;
    } else if (!val.includes(tag)) {
        input.value = val + ", " + tag;
    }
}

function openDemandaSupervisaoModal(dateIso = null, turno = "matutino") {
    const hojeIso = dateIso || new Date().toISOString().split("T")[0];
    const form = document.querySelector("#modalDemandaSupervisao form");
    if (form) form.reset();

    const elDataInicio = document.getElementById("supInputDataInicio");
    const elDataFim = document.getElementById("supInputDataFim");
    const elTurno = document.getElementById("supInputTurno");

    if (elDataInicio) elDataInicio.value = hojeIso;
    if (elDataFim) elDataFim.value = hojeIso;
    if (elTurno) elTurno.value = turno;

    const modal = document.getElementById("modalDemandaSupervisao");
    if (modal) modal.style.display = "flex";
}

function closeDemandaSupervisaoModal() {
    const modal = document.getElementById("modalDemandaSupervisao");
    if (modal) modal.style.display = "none";
}

function submitDemandaSupervisao(e) {
    e.preventDefault();
    const titulo = document.getElementById("supInputTitulo").value;
    const turmaOuProfessor = document.getElementById("supInputAlvo").value;
    const envolvidosInput = document.getElementById("supInputEnvolvidos");
    const envolvidos = envolvidosInput ? envolvidosInput.value : "";
    const categoria = document.getElementById("supInputCategoria").value;
    const turno = document.getElementById("supInputTurno").value;
    const dataInicio = document.getElementById("supInputDataInicio").value;
    const dataFim = document.getElementById("supInputDataFim").value;
    const prioridade = document.getElementById("supInputPrioridade").value;
    const responsavel = document.getElementById("supInputResponsavel").value;
    const descricao = document.getElementById("supInputDescricao").value;

    sigeDB.addDemandaSupervisao({
        titulo, turmaOuProfessor, envolvidos, categoria, turno, dataInicio, dataFim,
        prioridade, responsavel, descricao,
        prazo: dataFim,
        status: "pendente"
    });

    closeDemandaSupervisaoModal();
    renderModuleSupervisao();
    updateBadgesCounts();
    renderNotifications();
    showToast("✅ Demanda / Evento registrado no Quadro da Supervisão!");
}

function openDemandaSupervisaoModalWithData(id) {
    const demandas = sigeDB.getDemandasSupervisao();
    const item = demandas.find(d => String(d.id) === String(id));
    if (!item) return;

    currentDetailDemandaSupId = id;

    const elTitulo = document.getElementById("detalhesSupTitulo");
    const elAlvo = document.getElementById("detalhesSupAlvo");
    const elEnvolvidos = document.getElementById("detalhesSupEnvolvidos");
    const elCategoria = document.getElementById("detalhesSupCategoria");
    const elResponsavel = document.getElementById("detalhesSupResponsavel");
    const elDatas = document.getElementById("detalhesSupDatas");
    const elStatus = document.getElementById("detalhesSupStatus");
    const elDescricao = document.getElementById("detalhesSupDescricao");

    if (elTitulo) elTitulo.innerText = item.titulo || "Demanda da Supervisão";
    if (elAlvo) elAlvo.innerText = item.turmaOuProfessor || "Docentes / Turmas";
    if (elEnvolvidos) elEnvolvidos.innerText = item.envolvidos || "Não especificado";
    if (elCategoria) elCategoria.innerText = item.categoria || "Supervisão Pedagógica";
    if (elResponsavel) elResponsavel.innerText = item.responsavel || "Supervisora 1";

    const dataInicio = formatDateBR(item.dataInicio || item.prazo || item.criadoEm);
    const dataFim = formatDateBR(item.dataFim || item.dataInicio || item.prazo || item.criadoEm);
    const turnoText = item.turno === 'matutino' ? 'Manhã' : (item.turno === 'vespertino' ? 'Tarde' : 'Integral/Ambos');

    if (elDatas) {
        if (dataInicio === dataFim) {
            elDatas.innerText = `${dataInicio} (${turnoText})`;
        } else {
            elDatas.innerText = `${dataInicio} até ${dataFim} (${turnoText})`;
        }
    }

    if (elStatus) {
        const statusCss = getDemandaStatusCssClass(item.status);
        const statusText = getDemandaStatusBadgeText(item.status);
        elStatus.innerHTML = `
            <span class="secretaria-status-badge ${statusCss}">
                ${statusText}
            </span>
        `;
    }

    if (elDescricao) elDescricao.innerText = item.descricao || "Sem detalhes adicionais fornecidos.";

    const modal = document.getElementById("modalDetalhesDemandaSupervisao");
    if (modal) modal.style.display = "flex";
}

function closeDetalhesDemandaSupervisaoModal() {
    currentDetailDemandaSupId = null;
    const modal = document.getElementById("modalDetalhesDemandaSupervisao");
    if (modal) modal.style.display = "none";
}

function mudarStatusDemandaSupervisaoAtual(newStatus) {
    if (!currentDetailDemandaSupId) return;
    sigeDB.updateStatusDemandaSupervisao(currentDetailDemandaSupId, newStatus);
    closeDetalhesDemandaSupervisaoModal();
    renderModuleSupervisao();
    updateBadgesCounts();
    renderNotifications();
    showToast("Status do evento da Supervisão atualizado!");
}

function renderSupervisaoProjetos() {
    const container = document.getElementById("supProjetosListContainer");
    if (!container) return;

    let projetos = sigeDB.getProjetosSupervisao();
    const filterSup = document.getElementById("supFilterSupervisora");
    if (filterSup && filterSup.value && filterSup.value !== "todas") {
        projetos = projetos.filter(p => p.responsavelLider === filterSup.value || p.responsavelLider === "Equipe Supervisão");
    }

    if (projetos.length === 0) {
        container.innerHTML = `<div style="background:white; padding:2rem; border-radius:16px; text-align:center; color:#94a3b8; border:1px solid #e2e8f0;">Nenhum projeto cadastrado nesta supervisão.</div>`;
        return;
    }

    container.innerHTML = projetos.map(p => {
        const totalEtapas = p.etapas ? p.etapas.length : 0;
        const concluidasEtapas = p.etapas ? p.etapas.filter(e => e.concluido).length : 0;
        const pctProgresso = totalEtapas > 0 ? Math.round((concluidasEtapas / totalEtapas) * 100) : 0;

        let statusBadge = `<span class="secretaria-status-badge status-realizado">🟢 Em Dia</span>`;
        if (p.status === "atencao") statusBadge = `<span class="secretaria-status-badge status-adiado">🟡 Atenção (Prazo Próximo)</span>`;
        if (p.status === "atrasado") statusBadge = `<span class="secretaria-status-badge status-naoresolvido">🔴 Atrasado / Requer Intervenção</span>`;
        if (pctProgresso === 100) statusBadge = `<span class="secretaria-status-badge status-realizado">🏁 Concluído (100%)</span>`;

        return `
            <div style="background:white; border-radius:18px; padding:1.5rem; border:1px solid #cbd5e1; box-shadow:var(--shadow-sm);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
                    <div>
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <h4 style="font-size:1.1rem; font-weight:900; color:#0f172a;">${p.titulo}</h4>
                            <span class="sup-event-cat-badge">${p.categoria || 'Projeto'}</span>
                            ${statusBadge}
                        </div>
                        <p style="font-size:0.83rem; color:#64748b; margin-top:4px;">${p.descricao}</p>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.75rem; color:#64748b; font-weight:700;">PERÍODO DO PROJETO</div>
                        <div style="font-size:0.85rem; font-weight:800; color:#0f172a; margin-top:2px;">
                            ${formatDateBR(p.dataInicio)} até ${formatDateBR(p.dataFim)}
                        </div>
                    </div>
                </div>

                <!-- Barra de Progresso -->
                <div style="margin-top:1rem; background:#f1f5f9; border-radius:10px; padding:6px 10px; border:1px solid #e2e8f0;">
                    <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:800; color:#334155; margin-bottom:4px;">
                        <span>Progresso das Entregas (${concluidasEtapas}/${totalEtapas} etapas concluídas)</span>
                        <span>${pctProgresso}%</span>
                    </div>
                    <div style="background:#cbd5e1; height:10px; border-radius:5px; overflow:hidden;">
                        <div style="background:linear-gradient(90deg, #7c3aed, #10b981); height:100%; width:${pctProgresso}%;"></div>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:1.2rem; margin-top:1.2rem;">
                    <!-- Lista de Sub-Etapas / Marcos (Milestones) -->
                    <div style="background:#f8fafc; padding:1rem; border-radius:14px; border:1px solid #e2e8f0;">
                        <div style="font-size:0.82rem; font-weight:900; color:#1e293b; margin-bottom:8px; display:flex; justify-content:space-between;">
                            <span><i class="fa-solid fa-list-check" style="color:#7c3aed;"></i> Marcos & Entregas Intermediárias:</span>
                            <span style="font-size:0.72rem; color:#64748b;">Clique no box para concluir</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${p.etapas ? p.etapas.map(et => `
                                <div style="display:flex; align-items:center; justify-content:space-between; background:white; padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1;">
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.8rem; color:${et.concluido ? '#64748b' : '#0f172a'}; text-decoration:${et.concluido ? 'line-through' : 'none'}; flex:1;">
                                        <input type="checkbox" ${et.concluido ? 'checked' : ''} onchange="sigeDB.toggleEtapaProjetoSupervisao('${p.id}', '${et.id}'); renderModuleSupervisao();">
                                        <strong>${et.titulo}</strong>
                                    </label>
                                    <div style="display:flex; align-items:center; gap:6px;">
                                        <span style="font-size:0.72rem; color:#64748b;"><i class="fa-solid fa-user"></i> ${et.responsavel} (${formatDateBR(et.dataLimite)})</span>
                                        ${!et.concluido ? `<button onclick="cobrarProfessorWhatsapp('${et.responsavel}', '${p.titulo}', '${et.titulo}', '${et.dataLimite}')" class="btn-sec" style="font-size:0.68rem; padding:2px 8px; background:#2563eb; color:white; border-radius:6px;" title="Cobrar no WhatsApp">📲 Cobrar</button>` : ''}
                                    </div>
                                </div>
                            `).join("") : ''}
                        </div>
                    </div>

                    <!-- Checklist Pré-Evento & Equipe Envolvida -->
                    <div style="background:#f8fafc; padding:1rem; border-radius:14px; border:1px solid #e2e8f0;">
                        <div style="font-size:0.82rem; font-weight:900; color:#1e293b; margin-bottom:8px;">
                            <i class="fa-solid fa-clipboard-list" style="color:#059669;"></i> Checklist Logístico Pré-Evento:
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${p.checklistPreEvento ? p.checklistPreEvento.map((item, idx) => `
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:0.78rem; color:${item.concluido ? '#64748b' : '#0f172a'}; text-decoration:${item.concluido ? 'line-through' : 'none'}; background:white; padding:5px 8px; border-radius:6px; border:1px solid #e2e8f0;">
                                    <input type="checkbox" ${item.concluido ? 'checked' : ''} onchange="sigeDB.toggleChecklistProjetoSupervisao('${p.id}', ${idx}); renderModuleSupervisao();">
                                    ${item.item}
                                </label>
                            `).join("") : ''}
                        </div>

                        <div style="margin-top:10px; font-size:0.75rem; color:#475569; background:white; padding:6px 10px; border-radius:8px; border:1px solid #e2e8f0;">
                            <i class="fa-solid fa-users" style="color:var(--supervisao-color);"></i> <strong>Equipe Envolvida:</strong> ${p.professoresEnvolvidos}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function renderSupervisaoCobrancas() {
    const container = document.getElementById("supCobrancasTableContainer");
    if (!container) return;

    const projetos = sigeDB.getProjetosSupervisao();
    const hojeIso = new Date().toISOString().split("T")[0];

    let tarefasDocentes = [];

    projetos.forEach(p => {
        if (p.etapas) {
            p.etapas.forEach(et => {
                let statusTask = "em_dia";
                if (!et.concluido) {
                    if (et.dataLimite < hojeIso) statusTask = "atrasado";
                    else if (et.dataLimite <= getFutureDateIso(3)) statusTask = "proximo";
                } else {
                    statusTask = "concluido";
                }

                tarefasDocentes.push({
                    projId: p.id,
                    projTitulo: p.titulo,
                    etapaId: et.id,
                    etapaTitulo: et.titulo,
                    responsavel: et.responsavel,
                    dataLimite: et.dataLimite,
                    concluido: et.concluido,
                    statusTask: statusTask
                });
            });
        }
    });

    const countAtrasadas = tarefasDocentes.filter(t => t.statusTask === "atrasado").length;
    const countProximas = tarefasDocentes.filter(t => t.statusTask === "proximo").length;
    const countConcluidas = tarefasDocentes.filter(t => t.concluido).length;

    const kpiAtras = document.getElementById("kpiCobrancasAtrasadas");
    const kpiProx = document.getElementById("kpiCobrancasProximas");
    const kpiConc = document.getElementById("kpiCobrancasConcluidas");

    if (kpiAtras) kpiAtras.innerText = countAtrasadas;
    if (kpiProx) kpiProx.innerText = countProximas;
    if (kpiConc) kpiConc.innerText = countConcluidas;

    if (tarefasDocentes.length === 0) {
        container.innerHTML = `<div style="font-size:0.85rem; color:#94a3b8; text-align:center; padding:1.5rem;">Nenhuma tarefa docente pendente para cobrança.</div>`;
        return;
    }

    container.innerHTML = `
        <table class="weekly-table" style="width:100%; border-radius:12px; overflow:hidden;">
            <thead>
                <tr style="background:#1e293b; color:white; font-size:0.8rem;">
                    <th style="padding:10px;">PROFESSOR / RESPONSÁVEL</th>
                    <th style="padding:10px;">PROJETO / ATIVIDADE</th>
                    <th style="padding:10px;">ETAPA / MARCO</th>
                    <th style="padding:10px;">PRAZO LIMITE</th>
                    <th style="padding:10px;">SITUAÇÃO</th>
                    <th style="padding:10px; text-align:center;">AÇÃO DE COBRANÇA</th>
                </tr>
            </thead>
            <tbody>
                ${tarefasDocentes.map(t => {
                    let badgeStatus = `<span class="secretaria-status-badge status-realizado">✅ Concluído</span>`;
                    if (t.statusTask === "atrasado") badgeStatus = `<span class="secretaria-status-badge status-naoresolvido">🚨 Atrasado</span>`;
                    else if (t.statusTask === "proximo") badgeStatus = `<span class="secretaria-status-badge status-adiado">⏳ Vence em breve</span>`;
                    else if (!t.concluido) badgeStatus = `<span class="secretaria-status-badge status-pendente">📌 Em Aberto</span>`;

                    return `
                        <tr style="font-size:0.83rem; border-bottom:1px solid #e2e8f0;">
                            <td style="padding:10px; font-weight:800; color:#0f172a;"><i class="fa-solid fa-user-tie" style="color:#7c3aed;"></i> ${t.responsavel}</td>
                            <td style="padding:10px; font-weight:700; color:#334155;">${t.projTitulo}</td>
                            <td style="padding:10px; color:#475569;">${t.etapaTitulo}</td>
                            <td style="padding:10px; font-weight:800; color:${t.statusTask === 'atrasado' ? '#dc2626' : '#0f172a'};">${formatDateBR(t.dataLimite)}</td>
                            <td style="padding:10px;">${badgeStatus}</td>
                            <td style="padding:10px; text-align:center;">
                                ${!t.concluido ? `
                                    <button onclick="cobrarProfessorWhatsapp('${t.responsavel}', '${t.projTitulo}', '${t.etapaTitulo}', '${t.dataLimite}')" class="btn-sec" style="background:#2563eb; color:white; font-weight:800; padding:6px 12px; font-size:0.75rem;">
                                        📲 Cobrar via WhatsApp
                                    </button>
                                ` : '<span style="color:#10b981; font-weight:800;">✓ Entregue</span>'}
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
}

function renderSupervisaoEventos() {
    const containerSaidas = document.getElementById("supSaidasCampoListContainer");
    const containerReunioes = document.getElementById("supReunioesListContainer");

    if (containerSaidas) {
        const saidas = sigeDB.getAtividadesExternasSupervisao();
        if (saidas.length === 0) {
            containerSaidas.innerHTML = `<div style="font-size:0.8rem; color:#94a3b8; text-align:center; padding:1rem;">Nenhuma saída de campo agendada.</div>`;
        } else {
            containerSaidas.innerHTML = saidas.map(s => `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:1rem; border-radius:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h5 style="font-weight:900; color:#0f172a; font-size:0.92rem;">${s.titulo}</h5>
                        <span class="secretaria-status-badge status-realizado" style="font-size:0.68rem;">📅 ${formatDateBR(s.data)}</span>
                    </div>
                    <p style="font-size:0.8rem; color:#475569; margin-top:3px;"><i class="fa-solid fa-location-dot" style="color:#dc2626;"></i> <strong>Destino:</strong> ${s.destino}</p>
                    <div style="font-size:0.75rem; color:#64748b; margin-top:4px;">
                        <i class="fa-regular fa-clock"></i> ${s.horarioSaida} às ${s.horarioRetorno} • <strong>Turmas:</strong> ${s.turmasEnvolvidas}
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                        <i class="fa-solid fa-bus"></i> <strong>Transporte:</strong> ${s.transporteContratado}
                    </div>
                    <div style="font-size:0.75rem; color:#059669; margin-top:4px; font-weight:800;">
                        📝 Autorizações dos Pais: ${s.autorizacoesAssinadas}/${s.totalAlunos} alunos entregaram.
                    </div>

                    <div style="margin-top:8px; border-top:1px solid #e2e8f0; padding-top:6px;">
                        <div style="font-size:0.72rem; font-weight:800; color:#334155; margin-bottom:4px;">Checklist Logístico:</div>
                        ${s.checklistLogistica ? s.checklistLogistica.map((item, idx) => `
                            <label style="display:flex; align-items:center; gap:6px; font-size:0.74rem; color:${item.concluido ? '#64748b' : '#0f172a'}; cursor:pointer;">
                                <input type="checkbox" ${item.concluido ? 'checked' : ''} onchange="sigeDB.toggleChecklistAtividadeExterna('${s.id}', ${idx}); renderModuleSupervisao();">
                                ${item.item}
                            </label>
                        `).join("") : ''}
                    </div>
                </div>
            `).join("");
        }
    }

    if (containerReunioes) {
        const reunioes = sigeDB.getReunioesPedagogicasSupervisao();
        if (reunioes.length === 0) {
            containerReunioes.innerHTML = `<div style="font-size:0.8rem; color:#94a3b8; text-align:center; padding:1rem;">Nenhuma reunião agendada.</div>`;
        } else {
            containerReunioes.innerHTML = reunioes.map(r => `
                <div style="background:#f8fafc; border:1px solid #cbd5e1; padding:1rem; border-radius:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h5 style="font-weight:900; color:#0f172a; font-size:0.92rem;">${r.titulo}</h5>
                        <span class="sup-event-cat-badge">${r.tipo}</span>
                    </div>
                    <div style="font-size:0.78rem; color:#475569; margin-top:4px;">
                        <i class="fa-regular fa-calendar"></i> ${formatDateBR(r.data)} às ${r.horario} • 📍 <strong>Local:</strong> ${r.local}
                    </div>
                    <p style="font-size:0.8rem; color:#334155; margin-top:4px; font-style:italic;">"${r.pauta}"</p>
                    <div style="font-size:0.75rem; color:#64748b; margin-top:4px;">
                        <i class="fa-solid fa-users"></i> <strong>Convocados:</strong> ${r.participantes} (${r.confirmadosCount}/${r.totalConvocados} confirmados)
                    </div>
                    <div style="margin-top:8px;">
                        <button onclick="convocarReuniaoWhatsapp('${r.titulo}', '${r.data}', '${r.horario}', '${r.participantes}')" class="btn-sec" style="background:#2563eb; color:white; font-size:0.72rem; padding:4px 10px;">
                            📲 Convocar Professores via WhatsApp
                        </button>
                    </div>
                </div>
            `).join("");
        }
    }
}

function getFutureDateIso(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split("T")[0];
}

function cobrarProfessorWhatsapp(profName, projTitle, taskTitle, deadline) {
    const dataFmt = formatDateBR(deadline);
    const msg = `Olá, Prof. ${profName}! A Supervisão Pedagógica (C.E. Pedro Rizzi) lembra que a etapa '${taskTitle}' do projeto '${projTitle}' tem prazo de entrega para ${dataFmt}. Podemos contar com o envio? Qualquer dúvida estamos à disposição!`;

    const professores = sigeDB.getProfessores();
    const profObj = professores.find(p => p.nome.toLowerCase().includes(profName.toLowerCase()) || profName.toLowerCase().includes(p.nome.toLowerCase()));
    
    let phoneParam = "";
    if (profObj && profObj.telefone) {
        let cleanPhone = profObj.telefone.replace(/\D/g, "");
        if (cleanPhone.length >= 10 && !cleanPhone.startsWith("55")) {
            cleanPhone = "55" + cleanPhone;
        }
        if (cleanPhone) phoneParam = `phone=${cleanPhone}&`;
    }

    sigeDB.logWhatsappDispatch("sup-cobranca", {
        tipo: "Cobrança de Projeto Docente",
        mensagem: msg,
        destinatario: profName,
        modo: "manual",
        status: "sucesso"
    });

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?${phoneParam}text=${encodedMsg}`, "_blank");
    showToast(`📲 Mensagem de cobrança enviada ao docente ${profName}!`);
}

function convocarReuniaoWhatsapp(titulo, data, horario, participantes) {
    const msg = `Prezados Professores (${participantes})! Convocamos todos para a Reunião Pedagógica '${titulo}' no dia ${formatDateBR(data)} às ${horario}. Sua presença é fundamental para o alinhamento da escola. Obrigado!`;
    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, "_blank");
    showToast(`📲 Convocação enviada via WhatsApp para a reunião!`);
}

// Modal Handlers para Novos Projetos, Saídas de Campo e Reuniões
function openNovoProjetoModal() {
    const modal = document.getElementById("modalNovoProjetoSupervisao");
    if (modal) modal.style.display = "flex";
}
function closeNovoProjetoModal() {
    const modal = document.getElementById("modalNovoProjetoSupervisao");
    if (modal) modal.style.display = "none";
}
function submitNovoProjetoSupervisao(e) {
    e.preventDefault();
    const titulo = document.getElementById("projInputTitulo").value;
    const categoria = document.getElementById("projInputCategoria").value;
    const responsavelLider = document.getElementById("projInputLider").value;
    const dataInicio = document.getElementById("projInputDataInicio").value;
    const dataFim = document.getElementById("projInputDataFim").value;
    const professoresEnvolvidos = document.getElementById("projInputProfessores").value;
    const descricao = document.getElementById("projInputDescricao").value;

    sigeDB.addProjetoSupervisao({
        titulo, categoria, responsavelLider, dataInicio, dataFim, professoresEnvolvidos, descricao,
        status: "em_dia",
        etapas: [
            { id: "et-1", titulo: "Planejamento e Apresentação", dataLimite: dataInicio, responsavel: professoresEnvolvidos.split(",")[0] || responsavelLider, concluido: true },
            { id: "et-2", titulo: "Execução das Atividades com os Alunos", dataLimite: dataFim, responsavel: professoresEnvolvidos, concluido: false }
        ],
        checklistPreEvento: [
            { item: "Espaço e Logística Organizados", concluido: false },
            { item: "Comunicação aos Pais enviada", concluido: false }
        ]
    });

    closeNovoProjetoModal();
    renderModuleSupervisao();
    showToast("🚀 Projeto Institucional cadastrado com sucesso!");
}

function openNovaAtividadeExternaModal() {
    const modal = document.getElementById("modalNovaAtividadeExternaSupervisao");
    if (modal) modal.style.display = "flex";
}
function closeNovaAtividadeExternaModal() {
    const modal = document.getElementById("modalNovaAtividadeExternaSupervisao");
    if (modal) modal.style.display = "none";
}
function submitNovaAtividadeExternaSupervisao(e) {
    e.preventDefault();
    const titulo = document.getElementById("extInputTitulo").value;
    const destino = document.getElementById("extInputDestino").value;
    const data = document.getElementById("extInputData").value;
    const horarioSaida = document.getElementById("extInputHorarioSaida").value;
    const horarioRetorno = document.getElementById("extInputHorarioRetorno").value;
    const turmasEnvolvidas = document.getElementById("extInputTurmas").value;
    const totalAlunos = parseInt(document.getElementById("extInputTotalAlunos").value) || 40;
    const professoresAcompanhantes = document.getElementById("extInputProfessores").value;
    const transporteContratado = document.getElementById("extInputTransporte").value;

    sigeDB.addAtividadeExternaSupervisao({
        titulo, destino, data, horarioSaida, horarioRetorno, turmasEnvolvidas, totalAlunos,
        professoresAcompanhantes, transporteContratado,
        autorizacoesAssinadas: 0,
        responsavel: "Supervisão Pedagógica",
        checklistLogistica: [
            { item: "Contrato de Ônibus / Transporte Confirmado", concluido: true },
            { item: "Autorizações Coletadas", concluido: false },
            { item: "Kit de Primeiros Socorros Organizado", concluido: false }
        ]
    });

    closeNovaAtividadeExternaModal();
    renderModuleSupervisao();
    showToast("🚌 Saída de Campo cadastrada com sucesso!");
}

function openNovaReuniaoModal() {
    const modal = document.getElementById("modalNovaReuniaoPedagogica");
    if (modal) modal.style.display = "flex";
}
function closeNovaReuniaoModal() {
    const modal = document.getElementById("modalNovaReuniaoPedagogica");
    if (modal) modal.style.display = "none";
}
function submitNovaReuniaoPedagogica(e) {
    e.preventDefault();
    const titulo = document.getElementById("reunInputTitulo").value;
    const tipo = document.getElementById("reunInputTipo").value;
    const local = document.getElementById("reunInputLocal").value;
    const data = document.getElementById("reunInputData").value;
    const horario = document.getElementById("reunInputHorario").value;
    const participantes = document.getElementById("reunInputParticipantes").value;
    const pauta = document.getElementById("reunInputPauta").value;

    sigeDB.addReuniaoPedagogicaSupervisao({
        titulo, tipo, local, data, horario, participantes, pauta,
        responsavel: "Supervisão Pedagógica",
        confirmadosCount: 0,
        totalConvocados: 15
    });

    closeNovaReuniaoModal();
    renderModuleSupervisao();
    showToast("📌 Reunião Pedagógica agendada!");
}

// ==========================================
// MÓDULO 4: ADMINISTRAÇÃO
// ==========================================
function renderModuleAdministracao() {
    const colPendente = document.getElementById("admColPendente");
    const colAnalise = document.getElementById("admColAnalise");
    const colConcluido = document.getElementById("admColConcluido");

    if (colPendente && colAnalise && colConcluido) {
        const demandas = sigeDB.getDemandasAdmin();

        const pendentes = demandas.filter(d => d.status === "pendente");
        const analise = demandas.filter(d => d.status === "em_atendimento");
        const concluidas = demandas.filter(d => d.status === "concluido");

        colPendente.innerHTML = renderDemandaCardsList(pendentes, "admin");
        colAnalise.innerHTML = renderDemandaCardsList(analise, "admin");
        colConcluido.innerHTML = renderDemandaCardsList(concluidas, "admin");
    }

    renderWhatsappConfigPanel();
    renderFirebaseConfigPanel();
    renderEquipeEscolarTable(typeof currentSetorFilter !== "undefined" ? currentSetorFilter : "todos");
    renderTurmasAdminTable();
    renderConfigEscolaForm();
    renderAuditLogsTable();
}

function renderWhatsappConfigPanel() {
    const config = sigeDB.getWhatsappConfig();
    const selProv = document.getElementById("waConfigProvider");
    const inputUrl = document.getElementById("waConfigApiUrl");
    const inputToken = document.getElementById("waConfigApiToken");
    const chkCreate = document.getElementById("waConfigAutoCreate");
    const chkArrival = document.getElementById("waConfigAutoArrival");
    const chkRemind = document.getElementById("waConfigAutoReminders");

    if (selProv) selProv.value = config.provider || "simulated";
    if (inputUrl) inputUrl.value = config.apiUrl || "";
    if (inputToken) inputToken.value = config.apiToken || "";
    if (chkCreate) chkCreate.checked = config.autoSendOnCreate !== false;
    if (chkArrival) chkArrival.checked = config.autoSendOnArrival !== false;
    if (chkRemind) chkRemind.checked = config.autoSendReminders !== false;
}

function salvarConfiguracoesWhatsapp() {
    const provider = document.getElementById("waConfigProvider")?.value || "simulated";
    const apiUrl = document.getElementById("waConfigApiUrl")?.value || "";
    const apiToken = document.getElementById("waConfigApiToken")?.value || "";
    const autoSendOnCreate = document.getElementById("waConfigAutoCreate")?.checked !== false;
    const autoSendOnArrival = document.getElementById("waConfigAutoArrival")?.checked !== false;
    const autoSendReminders = document.getElementById("waConfigAutoReminders")?.checked !== false;

    sigeDB.saveWhatsappConfig({
        enabled: true,
        provider,
        apiUrl,
        apiToken,
        autoSendOnCreate,
        autoSendOnArrival,
        autoSendReminders
    });

    showToast("💾 Configurações do WhatsApp Automático salvas!");
}

function testarConexaoWhatsapp() {
    salvarConfiguracoesWhatsapp();
    const mockAg = {
        id: "test-" + Date.now(),
        aluno: "Aluno Teste SIGE",
        turma: "7º Ano A",
        responsavel: "Direção Escolar",
        telefone: "47999887766",
        orientadora: "Carmen",
        data: new Date().toISOString().split("T")[0],
        horario: "10:00"
    };

    sendAutomaticWhatsapp(mockAg, "agendamento_criado", "⚡ Teste de conexão do Motor de WhatsApp Automático do SIGE Pedro Rizzi! Tudo operacional sem intervenção humana.");
    showToast("⚡ Teste de disparo automático enviado com sucesso!");
}

// ==========================================
// MOTOR DE DISPARO AUTOMÁTICO DE WHATSAPP
// ==========================================
async function sendAutomaticWhatsapp(agendamento, tipoEvento, customMsg = "") {
    if (!agendamento || !agendamento.telefone) return false;

    const config = sigeDB.getWhatsappConfig();
    if (!config.enabled) return false;

    if (tipoEvento === 'agendamento_criado' && !config.autoSendOnCreate) return false;
    if (tipoEvento === 'aluno_chegou' && !config.autoSendOnArrival) return false;
    if ((tipoEvento === 'lembrete_24h' || tipoEvento === 'lembrete_dia') && !config.autoSendReminders) return false;

    let cleanPhone = agendamento.telefone.replace(/\D/g, "");
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = "55" + cleanPhone;
    }

    // Busca o número cadastrado da Orientadora designada para direcionar retornos
    const orientadorasList = sigeDB.getOrientadoras();
    const orientadoraObj = orientadorasList.find(o => 
        (agendamento.orientadora && agendamento.orientadora.toLowerCase().includes("carmen") && o.nome.toLowerCase().includes("carmen")) ||
        (agendamento.orientadora && agendamento.orientadora.toLowerCase().includes("luciana") && o.nome.toLowerCase().includes("luciana"))
    ) || orientadorasList[0];

    let orientadoraCleanPhone = orientadoraObj ? orientadoraObj.telefone.replace(/\D/g, "") : "";
    if (orientadoraCleanPhone.length === 10 || orientadoraCleanPhone.length === 11) {
        orientadoraCleanPhone = "55" + orientadoraCleanPhone;
    }

    let defaultText = "";
    let tipoTitulo = "Notificação WhatsApp";
    const orientadoraNome = agendamento.orientadora || (orientadoraObj ? orientadoraObj.nome : 'OP');

    const linkRetornoOrientadora = orientadoraCleanPhone ? `\n\n💬 Retorno / Dúvidas diretamente para o WhatsApp da ${orientadoraNome}: https://wa.me/${orientadoraCleanPhone}` : "";

    if (tipoEvento === "agendamento_criado") {
        tipoTitulo = "Confirmação de Agendamento";
        defaultText = `Olá ${agendamento.responsavel || 'Responsável'}! Confirmamos o agendamento da Orientação Pedagógica no Centro Educacional Pedro Rizzi para ${agendamento.aluno} (${agendamento.turma}) no dia ${formatDateBR(agendamento.data)} às ${agendamento.horario}. Orientadora: ${orientadoraNome}.${linkRetornoOrientadora}`;
    } else if (tipoEvento === "aluno_chegou") {
        tipoTitulo = "Aviso de Recepção / Chegada";
        defaultText = `Olá ${agendamento.responsavel || 'Responsável'}! Registramos a sua chegada na recepção do Centro Educacional Pedro Rizzi. A orientadora ${orientadoraNome} já foi notificada e chamará em instantes.`;
    } else if (tipoEvento === "lembrete_24h") {
        tipoTitulo = "Lembrete de 24h";
        defaultText = `Olá ${agendamento.responsavel || 'Responsável'}! Lembramos da reunião da Orientação Pedagógica no Centro Educacional Pedro Rizzi AMANHÃ (${formatDateBR(agendamento.data)}) às ${agendamento.horario}. Orientadora: ${orientadoraNome}.${linkRetornoOrientadora}`;
    } else if (tipoEvento === "lembrete_dia") {
        tipoTitulo = "Lembrete do Dia";
        defaultText = `Olá ${agendamento.responsavel || 'Responsável'}! Lembramos da sua reunião HOJE (${formatDateBR(agendamento.data)}) às ${agendamento.horario} no Centro Educacional Pedro Rizzi. Orientadora: ${orientadoraNome}.${linkRetornoOrientadora}`;
    }

    const textToSend = customMsg || defaultText;
    let success = false;

    if (config.provider !== "simulated" && config.apiUrl) {
        try {
            const resp = await fetch(config.apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": config.apiToken ? `Bearer ${config.apiToken}` : ""
                },
                body: JSON.stringify({
                    phone: cleanPhone,
                    message: textToSend
                })
            });
            success = resp.ok;
        } catch (e) {
            console.warn("Falha no envio do gateway externo de WhatsApp:", e);
            success = false;
        }
    } else {
        // Modo Integrado/Simulado de Background: 100% Automático
        success = true;
    }

    // Gravar Log para o Responsável
    sigeDB.logWhatsappDispatch(agendamento.id, {
        tipo: tipoTitulo,
        mensagem: textToSend,
        modo: "automático",
        status: success ? "sucesso" : "falha",
        destinatario: cleanPhone
    });

    // Se for o aviso de chegada, também dispara para a caixa de entrada da Orientadora!
    if (tipoEvento === "aluno_chegou" && orientadoraCleanPhone) {
        const msgToOrientadora = `🔔 AVISO DE RECEPÇÃO OP: O responsável pelo aluno(a) ${agendamento.aluno} (${agendamento.turma}) acabou de chegar na recepção e aguarda atendimento (${agendamento.horario}).`;
        if (config.provider !== "simulated" && config.apiUrl) {
            try {
                fetch(config.apiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": config.apiToken ? `Bearer ${config.apiToken}` : "" },
                    body: JSON.stringify({ phone: orientadoraCleanPhone, message: msgToOrientadora })
                });
            } catch(e) {}
        }
        sigeDB.logWhatsappDispatch(agendamento.id, {
            tipo: `Aviso na Caixa da ${orientadoraNome}`,
            mensagem: msgToOrientadora,
            modo: "automático",
            status: "sucesso",
            destinatario: orientadoraCleanPhone
        });
    }

    if (success) {
        showToast(`🤖 WhatsApp automático enviado para ${agendamento.responsavel || agendamento.aluno}!`);
    }

    return success;
}

function openModalOrientadoras() {
    const list = sigeDB.getOrientadoras();
    const o1 = list.find(o => o.nome.includes("Clarinda") || o.nome.includes("1")) || list[0];
    const o2 = list.find(o => o.nome.includes("Daiane") || o.nome.includes("2")) || list[1];

    if (o1 && document.getElementById("orientadora1Phone")) document.getElementById("orientadora1Phone").value = o1.telefone || "";
    if (o1 && document.getElementById("orientadora1Email")) document.getElementById("orientadora1Email").value = o1.email || "";

    if (o2 && document.getElementById("orientadora2Phone")) document.getElementById("orientadora2Phone").value = o2.telefone || "";
    if (o2 && document.getElementById("orientadora2Email")) document.getElementById("orientadora2Email").value = o2.email || "";

    const modal = document.getElementById("modalCadastroOrientadoras");
    if (modal) modal.style.display = "flex";
}

function closeModalOrientadoras() {
    const modal = document.getElementById("modalCadastroOrientadoras");
    if (modal) modal.style.display = "none";
}

function salvarTelefonesOrientadoras(e) {
    e.preventDefault();
    const p1 = document.getElementById("orientadora1Phone").value;
    const e1 = document.getElementById("orientadora1Email").value;
    const p2 = document.getElementById("orientadora2Phone").value;
    const e2 = document.getElementById("orientadora2Email").value;

    sigeDB.saveOrientadora("orient-1", "Clarinda Rosa Pereira", p1, e1);
    sigeDB.saveOrientadora("orient-2", "Daiane Caetano Costa de Aquino", p2, e2);

    closeModalOrientadoras();
    showToast("💾 Telefones de WhatsApp das Orientadoras salvos com sucesso!");
}

function renderWhatsappDispatchHistory(ag) {
    const container = document.getElementById("detalhesHistoricoWhatsappList");
    if (!container) return;

    const logs = ag.historicoWhatsapp || [];
    if (logs.length === 0) {
        container.innerHTML = `<div style="font-size:0.78rem; color:#94a3b8; font-style:italic; padding:6px 0;">Nenhum disparo de WhatsApp registrado para este atendimento.</div>`;
        return;
    }

    container.innerHTML = logs.map(l => `
        <div class="wa-log-card">
            <div class="wa-log-header">
                <span class="${l.modo === 'automático' ? 'wa-badge-auto' : 'wa-badge-manual'}">
                    <i class="${l.modo === 'automático' ? 'fa-solid fa-robot' : 'fa-brands fa-whatsapp'}"></i> ${l.modo === 'automático' ? 'Disparo Automático' : 'Manual'}
                </span>
                <span style="font-size:0.72rem; color:#64748b;">${formatDateBR(l.enviadoEm.split("T")[0])} às ${l.enviadoEm.split("T")[1]?.substring(0,5) || ''}</span>
            </div>
            <div style="font-weight:800; color:#0f172a; margin-top:2px;">${l.tipo || 'Mensagem WhatsApp'}</div>
            <div style="font-size:0.76rem; color:#475569; margin-top:2px; font-style:italic;">"${l.mensagem || 'Mensagem enviada no WhatsApp'}"</div>
            <div class="${l.status === 'sucesso' ? 'wa-status-success' : 'wa-status-fail'}" style="font-size:0.7rem; margin-top:4px;">
                ${l.status === 'sucesso' ? '✅ Entregue sem intervenção humana (200 OK)' : '❌ Falha de Envio (API Externa)'}
            </div>
        </div>
    `).join("");
}

function openDemandaAdminModal() {
    const modal = document.getElementById("modalDemandaAdmin");
    if (modal) modal.style.display = "flex";
}

function closeDemandaAdminModal() {
    const modal = document.getElementById("modalDemandaAdmin");
    if (modal) modal.style.display = "none";
}

function submitDemandaAdmin(e) {
    e.preventDefault();
    const titulo = document.getElementById("admInputTitulo").value;
    const setor = document.getElementById("admInputSetor").value;
    const prioridade = document.getElementById("admInputPrioridade").value;
    const descricao = document.getElementById("admInputDescricao").value;
    const responsavel = document.getElementById("admInputResponsavel").value;
    const prazo = document.getElementById("admInputPrazo").value;

    sigeDB.addDemandaAdmin({
        titulo, setor, prioridade, descricao, responsavel, prazo,
        status: "pendente"
    });

    closeDemandaAdminModal();
    renderModuleAdministracao();
    updateBadgesCounts();
    renderNotifications();
    showToast("Solicitação administrativa enviada!");
}

// ==========================================
// MÓDULO 5: DIREÇÃO & EMISSÃO DE AVISOS
// ==========================================
function renderModuleDirecao() {
    const totalOpElem = document.getElementById("dirStatTotalOP");
    const okSecElem = document.getElementById("dirStatOkSec");
    const supPendElem = document.getElementById("dirStatSupPend");
    const admPendElem = document.getElementById("dirStatAdmPend");

    const allOp = sigeDB.getAgendamentosOP();
    const realizedOp = allOp.filter(a => a.statusSecretaria === "realizado").length;
    const pctOk = allOp.length > 0 ? Math.round((realizedOp / allOp.length) * 100) : 100;

    const openSup = sigeDB.getDemandasSupervisao().filter(d => d.status !== "concluido").length;
    const openAdm = sigeDB.getDemandasAdmin().filter(d => d.status !== "concluido").length;

    if (totalOpElem) totalOpElem.innerText = allOp.length;
    if (okSecElem) okSecElem.innerText = `${pctOk}%`;
    if (supPendElem) supPendElem.innerText = openSup;
    if (admPendElem) admPendElem.innerText = openAdm;
}

function openAvisoModal() {
    const modal = document.getElementById("modalNovoAviso");
    if (modal) modal.style.display = "flex";
}

function closeAvisoModal() {
    const modal = document.getElementById("modalNovoAviso");
    if (modal) modal.style.display = "none";
}

function submitNovoAviso(e) {
    e.preventDefault();
    const titulo = document.getElementById("avisoInputTitulo").value;
    const target = document.getElementById("avisoInputTarget").value;
    const urgente = document.getElementById("avisoInputUrgente").checked;
    const conteudo = document.getElementById("avisoInputConteudo").value;

    sigeDB.addAviso({
        titulo, target, urgente, conteudo,
        autor: getRoleLabel(sigeDB.getRole())
    });

    closeAvisoModal();
    renderModuleMuralECalendario();
    renderNotifications();
    showToast("📢 Comunicado da Direção publicado com sucesso!");
}

function openNovaTarefaModal() {
    const modal = document.getElementById("modalNovaTarefa");
    if (modal) modal.style.display = "flex";
}

function closeNovaTarefaModal() {
    const modal = document.getElementById("modalNovaTarefa");
    if (modal) modal.style.display = "none";
}

function submitNovaTarefa(e) {
    e.preventDefault();
    const tarefa = document.getElementById("tarInputDesc").value;
    const responsavel = document.getElementById("tarInputResponsavel").value;
    const destinatario = document.getElementById("tarInputDestinatario").value;
    const quando = document.getElementById("tarInputQuando").value;

    sigeDB.addTarefaCalendario({
        tarefa, responsavel, destinatario, quando,
        status: "pendente"
    });

    closeNovaTarefaModal();
    renderModuleMuralECalendario();
    renderNotifications();
    showToast("📅 Tarefa adicionada ao calendário escolar!");
}

// ==========================================
// UTILITÁRIOS E FEEDBACK
// ==========================================
function formatDateBR(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
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

// ==========================================
// MÓDULO DE ADMINISTRAÇÃO AVANÇADA DO SISTEMA
// ==========================================

let currentSetorFilter = "todos";

function filtrarEquipeEscolar(setor) {
    currentSetorFilter = setor;
    
    const setores = ["todos", "docentes", "orientacao", "supervisao", "direcao", "secretaria", "apoio"];
    setores.forEach(s => {
        const btn = document.getElementById(`btnFilterSetor_${s}`);
        if (btn) {
            if (s === setor) {
                btn.style.background = "#1e293b";
                btn.style.color = "white";
                btn.style.fontWeight = "700";
            } else {
                btn.style.background = "#f1f5f9";
                btn.style.color = "#334155";
                btn.style.fontWeight = "normal";
            }
        }
    });

    renderEquipeEscolarTable(setor);
}

function renderEquipeEscolarTable(setorFiltro = "todos") {
    const tbody = document.getElementById("admEquipeTableBody");
    if (!tbody) return;

    const equipe = sigeDB.getEquipeEscolar();
    let lista = equipe;
    if (setorFiltro !== "todos") {
        lista = equipe.filter(p => p.setor === setorFiltro);
    }

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="padding:1.5rem; text-align:center; color:#64748b;">
                    <i class="fa-solid fa-folder-open" style="font-size:1.5rem; margin-bottom:8px; display:block;"></i>
                    Nenhum colaborador encontrado para o setor selecionado. Clique em "+ Novo Profissional" para cadastrar.
                </td>
            </tr>
        `;
        return;
    }

    const badgeSetor = (setor) => {
        switch (setor) {
            case "docentes": return `<span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">👨‍🏫 Docente</span>`;
            case "orientacao": return `<span style="background:#f3e8ff; color:#6b21a8; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">🧭 Orientação (OP)</span>`;
            case "supervisao": return `<span style="background:#fef3c7; color:#92400e; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">📋 Supervisão</span>`;
            case "direcao": return `<span style="background:#dcfce7; color:#166534; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">👑 Direção</span>`;
            case "secretaria": return `<span style="background:#cff4fc; color:#055160; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">📑 Secretaria</span>`;
            case "apoio": return `<span style="background:#f1f5f9; color:#475569; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">🔧 Apoio / TI</span>`;
            default: return `<span style="background:#f1f5f9; color:#334155; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">Geral</span>`;
        }
    };

    tbody.innerHTML = lista.map(p => {
        const cleanPhone = p.telefone ? p.telefone.replace(/\D/g, "") : "";
        const waPhone = cleanPhone.length >= 10 && !cleanPhone.startsWith("55") ? "55" + cleanPhone : cleanPhone;
        const waLink = waPhone ? `https://api.whatsapp.com/send?phone=${waPhone}` : "#";

        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 14px; font-weight:800; color:#0f172a;">
                    <i class="fa-solid fa-user" style="color:#2563eb; margin-right:6px;"></i> ${escapeHtml(p.nome)}
                </td>
                <td style="padding:12px 14px;">
                    <div>${badgeSetor(p.setor)}</div>
                    <div style="font-size:0.78rem; color:#64748b; margin-top:2px;">${escapeHtml(p.cargoFuncao || p.setor)}</div>
                </td>
                <td style="padding:12px 14px; color:#334155; font-weight:600; font-size:0.83rem;">
                    ${escapeHtml(p.disciplina || "Geral")}
                </td>
                <td style="padding:12px 14px;">
                    ${p.telefone ? `
                        <a href="${waLink}" target="_blank" style="color:#16a34a; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px; background:#dcfce7; padding:4px 8px; border-radius:6px; font-size:0.82rem;">
                            <i class="fa-brands fa-whatsapp" style="font-size:1rem;"></i> ${escapeHtml(p.telefone)}
                        </a>
                    ` : '<span style="color:#94a3b8; font-size:0.82rem;">Sem telefone</span>'}
                </td>
                <td style="padding:12px 14px; color:#64748b; font-size:0.83rem;">
                    <div><strong>Turno:</strong> ${escapeHtml(p.turnos || "Integral")}</div>
                    <div><strong>Turmas/Salas:</strong> ${escapeHtml(p.turmasOuSalas || "Geral")}</div>
                </td>
                <td style="padding:12px 14px; text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:6px;">
                        <button onclick="openDisparoAvisoProfessorModal('${p.id}')" class="btn-sec" style="background:#16a34a; color:white; font-size:0.75rem; padding:4px 8px;" title="Disparar Aviso WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i> Aviso
                        </button>
                        <button onclick="editarProfissional('${p.id}')" class="btn-sec" style="background:#f1f5f9; color:#334155; font-size:0.75rem; padding:4px 8px;" title="Editar Colaborador">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="excluirProfissional('${p.id}')" class="btn-sec" style="background:#fee2e2; color:#dc2626; font-size:0.75rem; padding:4px 8px;" title="Excluir Colaborador">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function updateAllDynamicSelects() {
    const orientadoras = sigeDB.getOrientadoras();
    
    // Selects de Orientação Pedagógica
    const selectOpFilter = document.getElementById("opFilterOrientadora");
    const selectOpModal = document.getElementById("opInputOrientadora");
    const selectOpEditModal = document.getElementById("editInputOrientadora");
    const selectOpRelatorio = document.getElementById("relatorioFilterOrientadora");
    const selectProjOpOri = document.getElementById("projOpInputOrientadora");

    if (selectOpFilter) {
        const curVal = selectOpFilter.value;
        let html = `<option value="todas">👥 Todas as Orientadoras (Geral)</option>`;
        orientadoras.forEach(o => {
            html += `<option value="${escapeHtml(o.nome)}">💛 ${escapeHtml(o.nome)} (${escapeHtml(o.telefone || 'Sem WhatsApp')})</option>`;
        });
        selectOpFilter.innerHTML = html;
        if (curVal) selectOpFilter.value = curVal;
    }

    if (selectOpModal) {
        const curVal = selectOpModal.value;
        let html = ``;
        orientadoras.forEach(o => {
            html += `<option value="${escapeHtml(o.nome)}">💛 ${escapeHtml(o.nome)} (${escapeHtml(o.telefone || 'Sem WhatsApp')})</option>`;
        });
        selectOpModal.innerHTML = html;
        if (curVal && Array.from(selectOpModal.options).some(opt => opt.value === curVal)) {
            selectOpModal.value = curVal;
        }
    }

    if (selectOpEditModal) {
        const curVal = selectOpEditModal.value;
        let html = ``;
        orientadoras.forEach(o => {
            html += `<option value="${escapeHtml(o.nome)}">💛 ${escapeHtml(o.nome)}</option>`;
        });
        selectOpEditModal.innerHTML = html;
        if (curVal && Array.from(selectOpEditModal.options).some(opt => opt.value === curVal)) {
            selectOpEditModal.value = curVal;
        }
    }

    if (selectOpRelatorio) {
        const curVal = selectOpRelatorio.value;
        let html = `<option value="todas">Todas as Orientadoras</option>`;
        orientadoras.forEach(o => {
            html += `<option value="${escapeHtml(o.nome)}">${escapeHtml(o.nome)}</option>`;
        });
        selectOpRelatorio.innerHTML = html;
        if (curVal) selectOpRelatorio.value = curVal;
    }

    if (selectProjOpOri) {
        const curVal = selectProjOpOri.value;
        let html = ``;
        orientadoras.forEach(o => {
            html += `<option value="${escapeHtml(o.nome)}">${escapeHtml(o.nome)}</option>`;
        });
        selectProjOpOri.innerHTML = html;
        if (curVal && Array.from(selectProjOpOri.options).some(opt => opt.value === curVal)) {
            selectProjOpOri.value = curVal;
        }
    }

    // Supervisoras Dropdowns
    const supervisoras = sigeDB.getSupervisoras();
    const selectSupFilter = document.getElementById("supFilterSupervisora");
    const selectSupResp = document.getElementById("supInputResponsavel");
    const selectProjLider = document.getElementById("projInputLider");

    if (selectSupFilter) {
        const curVal = selectSupFilter.value;
        let html = `<option value="todas">📋 Toda a Equipe de Supervisão</option>`;
        supervisoras.forEach(s => {
            html += `<option value="${escapeHtml(s.nome)}">📋 ${escapeHtml(s.nome)}</option>`;
        });
        selectSupFilter.innerHTML = html;
        if (curVal) selectSupFilter.value = curVal;
    }

    if (selectSupResp) {
        const curVal = selectSupResp.value;
        let html = ``;
        supervisoras.forEach(s => {
            html += `<option value="${escapeHtml(s.nome)}">📋 ${escapeHtml(s.nome)}</option>`;
        });
        selectSupResp.innerHTML = html;
        if (curVal && Array.from(selectSupResp.options).some(opt => opt.value === curVal)) {
            selectSupResp.value = curVal;
        }
    }

    if (selectProjLider) {
        const curVal = selectProjLider.value;
        let html = ``;
        supervisoras.forEach(s => {
            html += `<option value="${escapeHtml(s.nome)}">📋 ${escapeHtml(s.nome)}</option>`;
        });
        selectProjLider.innerHTML = html;
        if (curVal && Array.from(selectProjLider.options).some(opt => opt.value === curVal)) {
            selectProjLider.value = curVal;
        }
    }

    // Equipe Escolar (Comunicação WhatsApp)
    const equipe = sigeDB.getEquipeEscolar();
    const selectAviso = document.getElementById("avisoSelectDestinatario");
    if (selectAviso) {
        const curVal = selectAviso.value;
        let html = `<option value="todos">📢 Toda a Equipe Escolar (${equipe.length} colaboradores)</option>`;
        equipe.forEach(p => {
            const setorLabel = p.setor ? p.setor.toUpperCase() : "DOCENTE";
            html += `<option value="${p.id}">👤 ${escapeHtml(p.nome)} - [${setorLabel}] ${escapeHtml(p.cargoFuncao || p.disciplina || '')} (${escapeHtml(p.telefone || '')})</option>`;
        });
        selectAviso.innerHTML = html;
        if (curVal && Array.from(selectAviso.options).some(opt => opt.value === curVal)) {
            selectAviso.value = curVal;
        }
    }
}

function openCadastroProfissionalModal(id = null) {
    if (id && typeof id !== "string") id = null;
    const modal = document.getElementById("modalCadastroProfissional");
    const title = document.getElementById("modalCadastroProfissionalTitulo");
    const inputId = document.getElementById("proInputId");
    const inputNome = document.getElementById("proInputNome");
    const inputSetor = document.getElementById("proInputSetor");
    const inputCargo = document.getElementById("proInputCargo");
    const inputDisc = document.getElementById("proInputDisciplina");
    const inputTel = document.getElementById("proInputTelefone");
    const inputEmail = document.getElementById("proInputEmail");
    const inputTurno = document.getElementById("proInputTurno");
    const inputTurmas = document.getElementById("proInputTurmas");

    if (!modal) return;

    if (id && typeof id === "string") {
        const equipe = sigeDB.getEquipeEscolar();
        const prof = equipe.find(p => p.id === id);
        if (prof) {
            if (title) title.innerHTML = `<i class="fa-solid fa-user-pen" style="color:#1e3a8a;"></i> Editar Cadastro do Colaborador`;
            if (inputId) inputId.value = prof.id;
            if (inputNome) inputNome.value = prof.nome || "";
            if (inputSetor) inputSetor.value = prof.setor || "docentes";
            if (inputCargo) inputCargo.value = prof.cargoFuncao || "";
            if (inputDisc) inputDisc.value = prof.disciplina || "";
            if (inputTel) inputTel.value = prof.telefone || "";
            if (inputEmail) inputEmail.value = prof.email || "";
            if (inputTurno) inputTurno.value = prof.turnos || "matutino";
            if (inputTurmas) inputTurmas.value = prof.turmasOuSalas || "";
        }
    } else {
        if (title) title.innerHTML = `<i class="fa-solid fa-user-gear" style="color:#1e3a8a;"></i> Cadastrar Profissional da Escola`;
        if (inputId) inputId.value = "";
        if (inputNome) inputNome.value = "";
        if (inputSetor) inputSetor.value = "docentes";
        if (inputCargo) inputCargo.value = "";
        if (inputDisc) inputDisc.value = "";
        if (inputTel) inputTel.value = "";
        if (inputEmail) inputEmail.value = "";
        if (inputTurno) inputTurno.value = "matutino";
        if (inputTurmas) inputTurmas.value = "";
    }

    modal.style.setProperty("display", "flex", "important");
}

function closeCadastroProfissionalModal() {
    const modal = document.getElementById("modalCadastroProfissional");
    if (modal) modal.style.setProperty("display", "none", "important");
}

function submitCadastroProfissional(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById("proInputId")?.value;
    const nome = document.getElementById("proInputNome")?.value.trim();
    const setor = document.getElementById("proInputSetor")?.value;
    const cargoFuncao = document.getElementById("proInputCargo")?.value.trim();
    const disciplina = document.getElementById("proInputDisciplina")?.value.trim();
    const telefone = document.getElementById("proInputTelefone")?.value.trim();
    const email = document.getElementById("proInputEmail")?.value.trim();
    const turnos = document.getElementById("proInputTurno")?.value;
    const turmasOuSalas = document.getElementById("proInputTurmas")?.value.trim();

    if (!nome || !setor) {
        showToast("⚠️ Preencha pelo menos o Nome e Setor do colaborador!");
        return false;
    }

    sigeDB.saveProfissional({
        id: id || null,
        nome,
        setor,
        cargoFuncao,
        disciplina,
        telefone: telefone || "",
        email: email || "",
        turnos,
        turmasOuSalas
    });

    closeCadastroProfissionalModal();
    updateAllDynamicSelects();
    renderAllModules();
    showToast(id ? "✅ Cadastro de colaborador atualizado!" : "✅ Novo profissional registrado na equipe!");
    return false;
}

function editarProfissional(id) {
    openCadastroProfissionalModal(id);
}

function excluirProfissional(id) {
    const equipe = sigeDB.getEquipeEscolar();
    const prof = equipe.find(p => p.id === id);
    if (!prof) return;

    if (confirm(`Tem certeza que deseja remover o cadastro de ${prof.nome} (${prof.cargoFuncao || prof.setor})?`)) {
        sigeDB.deleteProfissional(id);
        updateAllDynamicSelects();
        renderAllModules();
        showToast("🗑️ Colaborador removido com sucesso.");
    }
}

function openCadastroProfessorModal(profId = null) {
    openCadastroProfissionalModal(profId);
}
function closeCadastroProfessorModal() {
    closeCadastroProfissionalModal();
}
function editarProfessor(profId) {
    editarProfissional(profId);
}
function excluirProfessor(profId) {
    excluirProfissional(profId);
}

// GESTÃO DE TURMAS & TURNOS
function renderTurmasAdminTable() {
    const tbody = document.getElementById("admTurmasTableBody");
    if (!tbody) return;

    const turmas = sigeDB.getTurmasEscola();
    if (!turmas || turmas.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="padding:1.5rem; text-align:center; color:#64748b;">
                    <i class="fa-solid fa-graduation-cap" style="font-size:1.5rem; margin-bottom:8px; display:block;"></i>
                    Nenhuma turma cadastrada no momento. Clique em "+ Nova Turma" para cadastrar.
                </td>
            </tr>
        `;
        return;
    }

    const badgeTurno = (t) => {
        switch (t) {
            case "matutino": return `<span style="background:#fef3c7; color:#b45309; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">🌅 Matutino</span>`;
            case "vespertino": return `<span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">☀️ Vespertino</span>`;
            case "integral": return `<span style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">🕒 Integral</span>`;
            case "noturno": return `<span style="background:#f1f5f9; color:#334155; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">🌙 Noturno</span>`;
            default: return `<span style="background:#f1f5f9; color:#334155; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:800;">Geral</span>`;
        }
    };

    tbody.innerHTML = turmas.map(t => {
        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 14px; font-weight:800; color:#0f172a;">
                    <i class="fa-solid fa-graduation-cap" style="color:#0284c7; margin-right:6px;"></i> ${escapeHtml(t.nome)}
                    <span style="font-size:0.75rem; color:#64748b; font-weight:normal; margin-left:4px;">(${escapeHtml(t.anoLetivo || '2026')})</span>
                </td>
                <td style="padding:12px 14px;">${badgeTurno(t.turno)}</td>
                <td style="padding:12px 14px; color:#334155; font-size:0.83rem;">${escapeHtml(t.nivel || "Ensino Fundamental")}</td>
                <td style="padding:12px 14px; color:#0f172a; font-weight:700; font-size:0.83rem;">
                    <i class="fa-solid fa-door-open" style="color:#64748b;"></i> ${escapeHtml(t.sala || "Sem sala")}
                </td>
                <td style="padding:12px 14px; color:#334155; font-weight:600; font-size:0.83rem;">
                    ${escapeHtml(t.regente || "Não definido")}
                </td>
                <td style="padding:12px 14px; text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:6px;">
                        <button onclick="editarTurma('${t.id}')" class="btn-sec" style="background:#f1f5f9; color:#334155; font-size:0.75rem; padding:4px 8px;" title="Editar Turma">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="excluirTurma('${t.id}')" class="btn-sec" style="background:#fee2e2; color:#dc2626; font-size:0.75rem; padding:4px 8px;" title="Excluir Turma">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function openCadastroTurmaModal(id = null) {
    if (id && typeof id !== "string") id = null;
    const modal = document.getElementById("modalCadastroTurma");
    const title = document.getElementById("modalCadastroTurmaTitulo");
    const inputId = document.getElementById("turmaInputId");
    const inputNome = document.getElementById("turmaInputNome");
    const inputAno = document.getElementById("turmaInputAno");
    const inputTurno = document.getElementById("turmaInputTurno");
    const inputNivel = document.getElementById("turmaInputNivel");
    const inputSala = document.getElementById("turmaInputSala");
    const inputCap = document.getElementById("turmaInputCapacidade");
    const inputReg = document.getElementById("turmaInputRegente");

    if (!modal) return;

    if (id && typeof id === "string") {
        const turmas = sigeDB.getTurmasEscola();
        const turma = turmas.find(t => t.id === id);
        if (turma) {
            if (title) title.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color:#0284c7;"></i> Editar Cadastro da Turma`;
            if (inputId) inputId.value = turma.id;
            if (inputNome) inputNome.value = turma.nome || "";
            if (inputAno) inputAno.value = turma.anoLetivo || "2026";
            if (inputTurno) inputTurno.value = turma.turno || "matutino";
            if (inputNivel) inputNivel.value = turma.nivel || "Ensino Fundamental II";
            if (inputSala) inputSala.value = turma.sala || "";
            if (inputCap) inputCap.value = turma.capacidade || 35;
            if (inputReg) inputReg.value = turma.regente || "";
        }
    } else {
        if (title) title.innerHTML = `<i class="fa-solid fa-graduation-cap" style="color:#0284c7;"></i> Cadastrar Nova Turma`;
        if (inputId) inputId.value = "";
        if (inputNome) inputNome.value = "";
        if (inputAno) inputAno.value = "2026";
        if (inputTurno) inputTurno.value = "matutino";
        if (inputNivel) inputNivel.value = "Ensino Fundamental II";
        if (inputSala) inputSala.value = "";
        if (inputCap) inputCap.value = 35;
        if (inputReg) inputReg.value = "";
    }

    modal.style.setProperty("display", "flex", "important");
}

function closeCadastroTurmaModal() {
    const modal = document.getElementById("modalCadastroTurma");
    if (modal) modal.style.setProperty("display", "none", "important");
}

function submitCadastroTurma(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById("turmaInputId")?.value;
    const nome = document.getElementById("turmaInputNome")?.value.trim();
    const anoLetivo = document.getElementById("turmaInputAno")?.value.trim();
    const turno = document.getElementById("turmaInputTurno")?.value;
    const nivel = document.getElementById("turmaInputNivel")?.value;
    const sala = document.getElementById("turmaInputSala")?.value.trim();
    const capacidade = parseInt(document.getElementById("turmaInputCapacidade")?.value || "35", 10);
    const regente = document.getElementById("turmaInputRegente")?.value.trim();

    if (!nome) {
        showToast("⚠️ Preencha o Nome da Turma!");
        return false;
    }

    sigeDB.saveTurma({
        id: id || null,
        nome,
        anoLetivo: anoLetivo || "2026",
        turno,
        nivel,
        sala: sala || "Sala Geral",
        capacidade,
        regente: regente || ""
    });

    closeCadastroTurmaModal();
    updateAllDynamicSelects();
    renderAllModules();
    showToast(id ? "✅ Dados da turma atualizados!" : "✅ Nova turma cadastrada com sucesso!");
    return false;
}

function editarTurma(id) {
    openCadastroTurmaModal(id);
}

function excluirTurma(id) {
    const turmas = sigeDB.getTurmasEscola();
    const turma = turmas.find(t => t.id === id);
    if (!turma) return;

    if (confirm(`Tem certeza que deseja excluir a turma ${turma.nome}?`)) {
        sigeDB.deleteTurma(id);
        updateAllDynamicSelects();
        renderAllModules();
        showToast("🗑️ Turma removida da estrutura escolar.");
    }
}

// CONFIGURAÇÕES DA UNIDADE & BACKUP & LOGS
function renderConfigEscolaForm() {
    const config = sigeDB.getConfigEscola();
    const inputNome = document.getElementById("cfgNomeEscola");
    const inputCid = document.getElementById("cfgCidadeUf");
    const inputAno = document.getElementById("cfgAnoLetivo");
    const inputPer = document.getElementById("cfgPeriodoAtual");
    const inputTel = document.getElementById("cfgTelefoneContato");

    if (inputNome) inputNome.value = config.nomeEscola || "Centro Educacional Pedro Rizzi";
    if (inputCid) inputCid.value = config.cidadeUf || "Itajaí / SC";
    if (inputAno) inputAno.value = config.anoLetivo || "2026";
    if (inputPer) inputPer.value = config.periodoAtual || "3º Trimestre";
    if (inputTel) inputTel.value = config.telefoneContato || "(47) 3348-0000";
}

function salvarConfiguracoesEscola(e) {
    e.preventDefault();
    const nomeEscola = document.getElementById("cfgNomeEscola")?.value.trim();
    const cidadeUf = document.getElementById("cfgCidadeUf")?.value.trim();
    const anoLetivo = document.getElementById("cfgAnoLetivo")?.value.trim();
    const periodoAtual = document.getElementById("cfgPeriodoAtual")?.value.trim();
    const telefoneContato = document.getElementById("cfgTelefoneContato")?.value.trim();

    sigeDB.saveConfigEscola({
        nomeEscola,
        cidadeUf,
        anoLetivo,
        periodoAtual,
        telefoneContato
    });

    showToast("⚙️ Parâmetros institucionais salvos com sucesso!");
}

function renderAuditLogsTable() {
    const tbody = document.getElementById("admAuditLogsTableBody");
    if (!tbody) return;

    const logs = sigeDB.getAuditLogs();
    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td style="padding:8px; color:#94a3b8;">Nenhum registro de auditoria.</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.slice(0, 15).map(l => {
        const dateFmt = new Date(l.data).toLocaleDateString("pt-BR") + " " + new Date(l.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:4px 6px; color:#64748b; white-space:nowrap;">${dateFmt}</td>
                <td style="padding:4px 6px; font-weight:700; color:#1e293b;">[${escapeHtml(l.setor || 'Geral')}]</td>
                <td style="padding:4px 6px; color:#334155;">${escapeHtml(l.acao)}</td>
            </tr>
        `;
    }).join('');
}

function downloadBackupSige() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sigeDB.data, null, 2));
    const downloadAnchor = document.createElement("a");
    const dateToday = new Date().toISOString().split("T")[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SIGE_Backup_PedroRizzi_${dateToday}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    sigeDB.logAuditEvent("Backup", "Download de arquivo de backup JSON realizado", "Administração");
    renderAuditLogsTable();
    showToast("💾 Arquivo de Backup JSON baixado com sucesso!");
}

function importarBackupFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            if (parsed && typeof parsed === "object") {
                if (confirm("⚠️ ATENÇÃO: Restaurar o backup substituirá os dados atuais pelo arquivo selecionado. Deseja continuar?")) {
                    sigeDB.saveData(parsed);
                    sigeDB.logAuditEvent("Backup", "Restauração de banco de dados via arquivo JSON", "Administração");
                    alert("✅ Banco de dados restaurado com sucesso!");
                    window.location.reload();
                }
            } else {
                alert("❌ Formato de arquivo JSON inválido.");
            }
        } catch (err) {
            alert("❌ Erro ao ler arquivo de backup: " + err.message);
        }
    };
    reader.readAsText(file);
}

function openDisparoAvisoProfessorModal(profId = "todos") {
    const modal = document.getElementById("modalDisparoAvisoProfessor");
    const selectDest = document.getElementById("avisoSelectDestinatario");
    const inputAssunto = document.getElementById("avisoInputAssunto");
    const inputMsg = document.getElementById("avisoInputMensagem");

    if (!modal) return;

    const equipe = sigeDB.getEquipeEscolar();

    if (selectDest) {
        let opts = `<option value="todos">📢 Toda a Equipe Escolar (${equipe.length} colaboradores)</option>`;
        equipe.forEach(p => {
            const setorLabel = p.setor ? p.setor.toUpperCase() : "DOCENTE";
            opts += `<option value="${p.id}" ${p.id === profId ? 'selected' : ''}>👤 ${escapeHtml(p.nome)} - [${setorLabel}] ${escapeHtml(p.cargoFuncao || p.disciplina)} (${p.telefone})</option>`;
        });
        selectDest.innerHTML = opts;
    }

    if (profId === "todos") {
        if (selectDest) selectDest.value = "todos";
        if (inputAssunto) inputAssunto.value = "Comunicado Oficial da Direção Escolar";
        if (inputMsg) inputMsg.value = "Prezados Colaboradores,\n\nSolicitamos a atenção de todos para os alinhamentos e diretrizes da unidade nesta semana.\n\nAtenciosamente,\nEquipe Gestora - C.E. Pedro Rizzi";
    } else {
        const p = equipe.find(item => item.id === profId);
        if (p) {
            if (inputAssunto) inputAssunto.value = `Comunicado para ${p.nome}`;
            if (inputMsg) inputMsg.value = `Olá, ${p.nome}!\n\nEntramos em contato referente às demandas do setor ${p.setor.toUpperCase()}.\n\nAtenciosamente,\nEquipe Gestora - C.E. Pedro Rizzi`;
        }
    }

    modal.style.display = "flex";
}

function closeDisparoAvisoProfessorModal() {
    const modal = document.getElementById("modalDisparoAvisoProfessor");
    if (modal) modal.style.display = "none";
}

function submitDisparoAvisoProfessor(e) {
    e.preventDefault();
    const destId = document.getElementById("avisoSelectDestinatario")?.value;
    const assunto = document.getElementById("avisoInputAssunto")?.value.trim();
    const mensagem = document.getElementById("avisoInputMensagem")?.value.trim();

    if (!assunto || !mensagem) {
        showToast("⚠️ Preencha o assunto e a mensagem do comunicado!");
        return;
    }

    const equipe = sigeDB.getEquipeEscolar();

    if (destId === "todos") {
        let disparosCount = 0;
        equipe.forEach(p => {
            if (p.telefone) {
                const cleanPhone = p.telefone.replace(/\D/g, "");
                const waPhone = cleanPhone.length >= 10 && !cleanPhone.startsWith("55") ? "55" + cleanPhone : cleanPhone;
                const fullMsg = `*${assunto}*\n\n${mensagem}`;
                
                sigeDB.logWhatsappDispatch("aviso-geral-equipe", {
                    tipo: "Aviso Geral Equipe",
                    mensagem: fullMsg,
                    destinatario: p.nome,
                    telefone: p.telefone,
                    modo: "manual",
                    status: "sucesso"
                });
                disparosCount++;
            }
        });

        const fullMsg = `*${assunto}*\n\n${mensagem}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullMsg)}`, "_blank");
        showToast(`📲 Comunicado registrado para ${disparosCount} colaboradores! Janela do WhatsApp aberta.`);
    } else {
        const p = equipe.find(item => item.id === destId);
        if (p) {
            const cleanPhone = p.telefone ? p.telefone.replace(/\D/g, "") : "";
            const waPhone = cleanPhone.length >= 10 && !cleanPhone.startsWith("55") ? "55" + cleanPhone : cleanPhone;
            const fullMsg = `*${assunto}*\n\n${mensagem}`;
            
            sigeDB.logWhatsappDispatch("aviso-individual-equipe", {
                tipo: "Aviso Individual Colaborador",
                mensagem: fullMsg,
                destinatario: p.nome,
                telefone: p.telefone,
                modo: "manual",
                status: "sucesso"
            });

            const phoneParam = waPhone ? `phone=${waPhone}&` : "";
            window.open(`https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(fullMsg)}`, "_blank");
            showToast(`📲 Comunicado direcionado para ${p.nome} enviado via WhatsApp!`);
        }
    }

    closeDisparoAvisoProfessorModal();
}

// ==========================================
// CONFIGURAÇÃO E PAINEL DO FIREBASE CLOUD
// ==========================================
function renderFirebaseConfigPanel() {
    const config = sigeDB.getFirebaseConfig();
    const apiKey = document.getElementById("fbApiKey");
    const projectId = document.getElementById("fbProjectId");
    const authDomain = document.getElementById("fbAuthDomain");
    const appId = document.getElementById("fbAppId");
    const statusBadge = document.getElementById("firebaseStatusBadge");

    if (apiKey) apiKey.value = config.apiKey || "";
    if (projectId) projectId.value = config.projectId || "";
    if (authDomain) authDomain.value = config.authDomain || "";
    if (appId) appId.value = config.appId || "";

    if (statusBadge) {
        if (sigeDB.isFirebaseConnected()) {
            statusBadge.style.background = "#dcfce7";
            statusBadge.style.color = "#166534";
            statusBadge.innerHTML = `<i class="fa-solid fa-cloud-check"></i> 🔥 Sincronização Cloud Ativa (Firebase Conectado)`;
        } else if (config.projectId) {
            statusBadge.style.background = "#fef3c7";
            statusBadge.style.color = "#92400e";
            statusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Conectando ao Firebase...`;
        } else {
            statusBadge.style.background = "#f1f5f9";
            statusBadge.style.color = "#475569";
            statusBadge.innerHTML = `<i class="fa-solid fa-hard-drive"></i> Modo Local (Insira credenciais do Firebase para nuvem)`;
        }
    }
}

function salvarConfiguracoesFirebase(e) {
    e.preventDefault();
    const apiKey = document.getElementById("fbApiKey")?.value.trim();
    const projectId = document.getElementById("fbProjectId")?.value.trim();
    const authDomain = document.getElementById("fbAuthDomain")?.value.trim();
    const appId = document.getElementById("fbAppId")?.value.trim();

    if (!projectId || !apiKey) {
        showToast("⚠️ Preencha pelo menos o API Key e Project ID do Firebase!");
        return;
    }

    sigeDB.saveFirebaseConfig({
        enabled: true,
        apiKey,
        projectId,
        authDomain: authDomain || `${projectId}.firebaseapp.com`,
        storageBucket: `${projectId}.appspot.com`,
        messagingSenderId: "",
        appId
    });

    renderFirebaseConfigPanel();
    sigeDB.logAuditEvent("Firebase", "Credenciais do Firebase salvas e sincronização ativada", "Administração");
    showToast("🔥 Credenciais do Firebase salvas! Conexão iniciada.");
}


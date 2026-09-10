/**
 * gestao-app.js - Lógica Principal da Aplicação SIGE
 * Centro Educacional Pedro Rizzi
 */

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    setupRoleSelector();
    setupTabNavigation();
    setupNotificationBell();
    renderAllModules();
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
        renderNotifications();
        renderAllModules();
        showToast(`Perfil alterado para: ${getRoleLabel(newRole)}`);
    });
}

function updateRoleBadgePill(role, badgeElem) {
    if (!badgeElem) return;
    badgeElem.className = `role-badge-pill role-pill-${role}`;
    badgeElem.innerHTML = `<i class="${getRoleIcon(role)}"></i> ${getRoleLabel(role)}`;
}

function getRoleLabel(role) {
    const labels = {
        admin: "Administrador do Sistema",
        direcao: "Gestor / Direção Escolar",
        orientacao: "Orientador Pedagógico (OP)",
        supervisao: "Supervisor Pedagógico",
        secretaria: "Secretaria Escolar",
        comunidade: "Professor / Aluno / Comunidade"
    };
    return labels[role] || role;
}

function getRoleIcon(role) {
    const icons = {
        admin: "fa-solid fa-user-shield",
        direcao: "fa-solid fa-crown",
        orientacao: "fa-solid fa-heart-pulse",
        supervisao: "fa-solid fa-clipboard-check",
        secretaria: "fa-solid fa-id-card",
        comunidade: "fa-solid fa-users"
    };
    return icons[role] || "fa-solid fa-user";
}

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

            // Recarregar especificidades do módulo
            renderAllModules();
        });
    });
}

function switchTab(tabId) {
    const btn = document.querySelector(`.sige-tab-btn[data-tab="${tabId}"]`);
    if (btn) btn.click();
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
let opViewMode = "semanal"; // "semanal" ou "cards"
let currentWeekRefDate = new Date();

function setOpViewMode(mode) {
    opViewMode = mode;
    document.querySelectorAll(".view-toggle-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === mode);
    });
    const semanalView = document.getElementById("opWeeklyViewContainer");
    const listaView = document.getElementById("opListViewContainer");
    if (semanalView && listaView) {
        if (mode === "semanal") {
            semanalView.style.display = "block";
            listaView.style.display = "none";
        } else {
            semanalView.style.display = "none";
            listaView.style.display = "block";
        }
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
    const textMsg = encodeURIComponent(`Olá ${responsavel || 'Responsável'}! Entramos em contato do Centro Educacional Pedro Rizzi referente ao aluno(a) ${aluno || ''} sobre o atendimento da Orientação Pedagógica${data ? ' em ' + formatDateBR(data) : ''}${horario ? ' às ' + horario : ''}.`);
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
    const todosAtendimentos = sigeDB.getAgendamentosOP();
    const weekDays = getWeekDays(currentWeekRefDate);

    // Atualiza contadores para o dia de hoje
    const hojeStr = new Date().toISOString().split("T")[0];
    const atendimentosHoje = todosAtendimentos.filter(a => a.data === hojeStr);
    updateTurnoCounters(atendimentosHoje);

    // 1. Renderiza Visão Semanal (Inspirada no modelo)
    renderWeeklyAgenda(weekDays, todosAtendimentos);

    // 2. Renderiza Visão Cards (Filtro por Data)
    renderCardsView(todosAtendimentos);
}

function renderWeeklyAgenda(weekDays, todosAtendimentos) {
    const rangeText = document.getElementById("opWeekRangeText");
    if (rangeText && weekDays.length === 5) {
        rangeText.innerText = `${weekDays[0].dayMonth} - ${weekDays[4].dayMonth}`;
    }

    const headerRow = document.getElementById("weeklyTableHeaderRow");
    const bodyTable = document.getElementById("weeklyTableBody");
    if (!headerRow || !bodyTable) return;

    // Header da Tabela
    headerRow.innerHTML = `
        <th class="col-periodo">PERÍODO / VAGA</th>
        ${weekDays.map(d => `
            <th class="${d.isToday ? 'col-today' : ''}">
                ${d.dayName}<br>
                <span style="font-size:0.8rem; opacity:0.9;">${d.dayMonth}</span>
                ${d.isToday ? '<span class="today-pill">HOJE</span>' : ''}
            </th>
        `).join("")}
    `;

    // Linhas dos Turnos
    const slotsConfig = [
        { header: "MATUTINO (MANHÃ)", turno: "matutino" },
        { label: "1ª Vaga", turno: "matutino", tipo: "agendado", slotIndex: 0 },
        { label: "2ª Vaga", turno: "matutino", tipo: "agendado", slotIndex: 1 },
        { label: "3ª Vaga", turno: "matutino", tipo: "agendado", slotIndex: 2 },
        { label: "🚨 Emergencial", turno: "matutino", tipo: "emergencial", slotIndex: 0, isEmergencial: true },
        
        { header: "VESPERTINO (TARDE)", turno: "vespertino" },
        { label: "1ª Vaga", turno: "vespertino", tipo: "agendado", slotIndex: 0 },
        { label: "2ª Vaga", turno: "vespertino", tipo: "agendado", slotIndex: 1 },
        { label: "3ª Vaga", turno: "vespertino", tipo: "agendado", slotIndex: 2 },
        { label: "🚨 Emergencial", turno: "vespertino", tipo: "emergencial", slotIndex: 0, isEmergencial: true }
    ];

    bodyTable.innerHTML = slotsConfig.map(s => {
        if (s.header) {
            return `
                <tr>
                    <td colspan="6" class="turno-section-header">
                        <i class="${s.turno === 'matutino' ? 'fa-solid fa-sun' : 'fa-solid fa-cloud-sun'}"></i> ${s.header}
                    </td>
                </tr>
            `;
        }

        return `
            <tr>
                <td class="slot-time-cell ${s.isEmergencial ? 'emergencial-slot' : ''}">
                    <span class="vaga-num">${s.label}</span>
                    <span style="font-size:0.7rem; opacity:0.8;">${s.turno.toUpperCase()}</span>
                </td>
                ${weekDays.map(d => {
                    const dateAppointments = todosAtendimentos.filter(a => 
                        a.data === d.dateIso && 
                        a.turno === s.turno && 
                        a.tipo === s.tipo && 
                        a.statusSecretaria !== 'cancelado'
                    );

                    const item = dateAppointments[s.slotIndex];

                    if (item) {
                        const waUrl = getWhatsAppUrl(item.telefone, item.aluno, item.responsavel, item.data, item.horario);
                        return `
                            <td class="${d.isToday ? 'today-column-cell' : ''}">
                                <div class="weekly-slot-card ${item.tipo}">
                                    <div class="weekly-slot-header">
                                        <span class="weekly-student-name">${item.aluno}</span>
                                        <span class="weekly-class-badge">${item.turma}</span>
                                    </div>
                                    <div style="font-size:0.75rem; color:#64748b;">
                                        <i class="fa-regular fa-user"></i> ${item.responsavel}
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

                                    <!-- Botão WhatsApp Direto no Card -->
                                    <a href="${waUrl}" target="_blank" class="btn-wa-compact">
                                        <i class="fa-brands fa-whatsapp"></i> Chamar WhatsApp
                                    </a>
                                </div>
                            </td>
                        `;
                    } else {
                        return `
                            <td class="${d.isToday ? 'today-column-cell' : ''}">
                                <button onclick="openAgendamentoModal('${d.dateIso}', '${s.turno}', '${s.tipo}')" class="weekly-slot-empty-btn" title="Adicionar Agendamento">
                                    <i class="fa-solid fa-plus"></i>
                                </button>
                            </td>
                        `;
                    }
                }).join("")}
            </tr>
        `;
    }).join("");
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
                    <i class="fa-solid fa-plus"></i> Criar Agendamento na OP
                </button>
            </div>
        `;
        return;
    }

    const role = sigeDB.getRole();
    const canSecretariaValidate = ["secretaria", "admin", "direcao", "orientacao"].includes(role);

    container.innerHTML = filtrados.map(a => {
        const waUrl = getWhatsAppUrl(a.telefone, a.aluno, a.responsavel, a.data, a.horario);

        return `
            <div class="op-card">
                <div>
                    <div class="op-card-header">
                        <div>
                            <div class="op-patient-name">${a.aluno}</div>
                            <div class="op-meta-sub"><i class="fa-solid fa-graduation-cap"></i> ${a.turma} • <i class="fa-regular fa-user"></i> ${a.responsavel}</div>
                        </div>
                        <span class="op-type-tag ${a.tipo}">${a.tipo === 'emergencial' ? '🚨 Emergencial' : '📅 Agendado'}</span>
                    </div>

                    <div class="op-body">
                        <p style="margin-bottom: 8px;"><strong>Motivo / Assunto:</strong> ${a.motivo}</p>
                        <div style="font-size: 0.8rem; color: #64748b;">
                            <i class="fa-regular fa-clock"></i> <strong>Data/Horário:</strong> ${formatDateBR(a.data)} às ${a.horario} (${a.turno.toUpperCase()})
                        </div>
                        
                        ${a.telefone ? `
                            <a href="${waUrl}" target="_blank" class="btn-whatsapp-direct">
                                <i class="fa-brands fa-whatsapp"></i> 💬 Abrir WhatsApp do Responsável (${a.telefone})
                            </a>
                        ` : ''}
                    </div>
                </div>

                <!-- Painel da Secretaria para confirmação -->
                <div class="op-secretaria-box">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.75rem; font-weight:700; color:#475569;"><i class="fa-solid fa-user-check"></i> Controle Secretaria:</span>
                        <span class="secretaria-status-badge status-${a.statusSecretaria}">
                            ${getSecretariaBadgeText(a.statusSecretaria)}
                        </span>
                    </div>
                    
                    ${a.obsSecretaria ? `
                        <div style="font-size:0.75rem; color:#64748b; margin-top:4px; font-style:italic;">
                            "${a.obsSecretaria}"
                        </div>
                    ` : ''}

                    ${canSecretariaValidate ? `
                        <div class="secretaria-action-btns">
                            <button onclick="updateSecretariaOK('${a.id}', 'realizado')" class="btn-sec btn-sec-ok">
                                <i class="fa-solid fa-check"></i> OK Realizado
                            </button>
                            <button onclick="updateSecretariaOK('${a.id}', 'ausente')" class="btn-sec btn-sec-fail">
                                <i class="fa-solid fa-xmark"></i> Não Veio
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join("");
}

function updateTurnoCounters(atendimentosDia) {
    const matutinoAg = atendimentosDia.filter(a => a.turno === 'matutino' && a.tipo === 'agendado' && a.statusSecretaria !== 'cancelado').length;
    const matutinoEm = atendimentosDia.filter(a => a.turno === 'matutino' && a.tipo === 'emergencial' && a.statusSecretaria !== 'cancelado').length;

    const vespertinoAg = atendimentosDia.filter(a => a.turno === 'vespertino' && a.tipo === 'agendado' && a.statusSecretaria !== 'cancelado').length;
    const vespertinoEm = atendimentosDia.filter(a => a.turno === 'vespertino' && a.tipo === 'emergencial' && a.statusSecretaria !== 'cancelado').length;

    const elMatAg = document.getElementById("countMatutinoAgendado");
    const elMatEm = document.getElementById("countMatutinoEmergencial");
    const elVespAg = document.getElementById("countVespertinoAgendado");
    const elVespEm = document.getElementById("countVespertinoEmergencial");

    if (elMatAg) elMatAg.innerText = `${matutinoAg} / 3 Ocupados`;
    if (elMatEm) elMatEm.innerText = `${matutinoEm} / 1 Ocupado`;
    if (elVespAg) elVespAg.innerText = `${vespertinoAg} / 3 Ocupados`;
    if (elVespEm) elVespEm.innerText = `${vespertinoEm} / 1 Ocupado`;
}

function getSecretariaBadgeText(status) {
    const map = {
        pendente: "⏳ Aguardando OK",
        realizado: "✅ Atendido / Realizado",
        ausente: "❌ Ausente / Não Veio",
        cancelado: "🚫 Cancelado"
    };
    return map[status] || status;
}

function updateSecretariaOK(id, status) {
    const obsPrompt = prompt("Anotação opcional da Secretaria para este atendimento:", "");
    sigeDB.updateSecretariaStatusOP(id, status, obsPrompt || "");
    renderModuleOrientacaoPedagogica();
    updateBadgesCounts();
    renderNotifications();
    showToast("Status de atendimento atualizado pela Secretaria!");
}

// MODAL AGENDAMENTO OP
function openAgendamentoModal(dateIso = "", turno = "", tipo = "") {
    const modal = document.getElementById("modalAgendamentoOP");
    if (!modal) return;
    document.getElementById("formAgendamentoOP").reset();
    
    document.getElementById("opInputData").value = dateIso || new Date().toISOString().split("T")[0];
    if (turno) document.getElementById("opInputTurno").value = turno;
    if (tipo) document.getElementById("opInputTipo").value = tipo;

    updateModalWhatsAppPreview();
    modal.style.display = "flex";
}

function closeAgendamentoModal() {
    const modal = document.getElementById("modalAgendamentoOP");
    if (modal) modal.style.display = "none";
}

function submitAgendamentoOP(e) {
    e.preventDefault();
    const aluno = document.getElementById("opInputAluno").value;
    const turma = document.getElementById("opInputTurma").value;
    const responsavel = document.getElementById("opInputResponsavel").value;
    const telefone = document.getElementById("opInputTelefone").value;
    const data = document.getElementById("opInputData").value;
    const horario = document.getElementById("opInputHorario").value;
    const turno = document.getElementById("opInputTurno").value;
    const tipo = document.getElementById("opInputTipo").value;
    const motivo = document.getElementById("opInputMotivo").value;

    try {
        sigeDB.addAgendamentoOP({
            aluno, turma, responsavel, telefone, data, horario, turno, tipo, motivo,
            statusSecretaria: "pendente",
            obsSecretaria: "",
            registradoPor: getRoleLabel(sigeDB.getRole())
        });

        closeAgendamentoModal();
        renderModuleOrientacaoPedagogica();
        updateBadgesCounts();
        renderNotifications();
        showToast("✅ Agendamento registrado com sucesso no sistema!");
    } catch (err) {
        alert(err.message);
    }
}

// ==========================================
// MÓDULO 3: SUPERVISÃO PEDAGÓGICA
// ==========================================
function renderModuleSupervisao() {
    const colPendente = document.getElementById("supColPendente");
    const colAnalise = document.getElementById("supColAnalise");
    const colConcluido = document.getElementById("supColConcluido");

    if (!colPendente || !colAnalise || !colConcluido) return;

    const demandas = sigeDB.getDemandasSupervisao();

    const pendentes = demandas.filter(d => d.status === "pendente");
    const analise = demandas.filter(d => d.status === "em_atendimento");
    const concluidas = demandas.filter(d => d.status === "concluido");

    colPendente.innerHTML = renderDemandaCardsList(pendentes, "supervisao");
    colAnalise.innerHTML = renderDemandaCardsList(analise, "supervisao");
    colConcluido.innerHTML = renderDemandaCardsList(concluidas, "supervisao");
}

function renderDemandaCardsList(items, moduleType) {
    if (items.length === 0) {
        return `<div style="font-size: 0.8rem; color: #94a3b8; text-align: center; padding: 1rem;">Nenhum item nesta coluna.</div>`;
    }

    return items.map(d => `
        <div class="demanda-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <span class="priority-tag prio-${d.prioridade}">${d.prioridade.toUpperCase()}</span>
                <span style="font-size:0.75rem; color:#94a3b8;"><i class="fa-regular fa-clock"></i> ${formatDateBR(d.prazo)}</span>
            </div>
            <div class="demanda-title" style="margin-top:6px;">${d.titulo}</div>
            <p style="font-size:0.82rem; color:#475569; margin-top:4px;">${d.descricao}</p>
            <div style="font-size:0.75rem; color:#64748b; margin-top:8px;">
                <i class="fa-solid fa-user-tag"></i> ${d.turmaOuProfessor || d.setor || ''}
            </div>
            <div class="demanda-meta">
                <span>Resp: <strong>${d.responsavel}</strong></span>
                <div style="display:flex; gap:4px;">
                    ${d.status !== 'pendente' ? `<button onclick="updateDemandaStatus('${moduleType}', '${d.id}', 'pendente')" class="btn-sec" title="Mover para Pendente">⏮</button>` : ''}
                    ${d.status !== 'em_atendimento' ? `<button onclick="updateDemandaStatus('${moduleType}', '${d.id}', 'em_atendimento')" class="btn-sec" title="Em Atendimento">▶</button>` : ''}
                    ${d.status !== 'concluido' ? `<button onclick="updateDemandaStatus('${moduleType}', '${d.id}', 'concluido')" class="btn-sec btn-sec-ok" title="Concluir">✓</button>` : ''}
                </div>
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

function openDemandaSupervisaoModal() {
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
    const categoria = document.getElementById("supInputCategoria").value;
    const prioridade = document.getElementById("supInputPrioridade").value;
    const descricao = document.getElementById("supInputDescricao").value;
    const responsavel = document.getElementById("supInputResponsavel").value;
    const prazo = document.getElementById("supInputPrazo").value;

    sigeDB.addDemandaSupervisao({
        titulo, turmaOuProfessor, categoria, prioridade, descricao, responsavel, prazo,
        status: "pendente"
    });

    closeDemandaSupervisaoModal();
    renderModuleSupervisao();
    updateBadgesCounts();
    renderNotifications();
    showToast("Demanda pedagógica criada com sucesso!");
}

// ==========================================
// MÓDULO 4: ADMINISTRAÇÃO
// ==========================================
function renderModuleAdministracao() {
    const colPendente = document.getElementById("admColPendente");
    const colAnalise = document.getElementById("admColAnalise");
    const colConcluido = document.getElementById("admColConcluido");

    if (!colPendente || !colAnalise || !colConcluido) return;

    const demandas = sigeDB.getDemandasAdmin();

    const pendentes = demandas.filter(d => d.status === "pendente");
    const analise = demandas.filter(d => d.status === "em_atendimento");
    const concluidas = demandas.filter(d => d.status === "concluido");

    colPendente.innerHTML = renderDemandaCardsList(pendentes, "admin");
    colAnalise.innerHTML = renderDemandaCardsList(analise, "admin");
    colConcluido.innerHTML = renderDemandaCardsList(concluidas, "admin");
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

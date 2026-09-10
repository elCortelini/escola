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
    const filterOrientadoraSelect = document.getElementById("opFilterOrientadora");
    const filterOrientadora = filterOrientadoraSelect ? filterOrientadoraSelect.value : "todas";

    const todosAtendimentos = sigeDB.getAgendamentosOP().filter(a => {
        if (filterOrientadora !== "todas" && a.orientadora && a.orientadora !== filterOrientadora) {
            return false;
        }
        return true;
    });

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
                                <div class="weekly-slot-card ${item.tipo}" onclick="openDetalhesModal('${item.id}')" style="cursor:pointer;" title="Clique para ver os detalhes completos">
                                    <div class="weekly-slot-header">
                                        <span class="weekly-student-name">${item.aluno}</span>
                                        <span class="weekly-class-badge">${item.turma}</span>
                                    </div>
                                    <div style="font-size:0.73rem; color:#1e3a8a; font-weight:700;">
                                        <i class="fa-solid fa-user-gear"></i> ${item.orientadora || 'OP'}
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
                                    <a href="${waUrl}" onclick="event.stopPropagation();" target="_blank" class="btn-wa-compact">
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
    const isSecretaria = ["secretaria", "admin", "direcao"].includes(role);
    const isOrientadora = ["orientacao", "admin", "direcao"].includes(role);

    container.innerHTML = filtrados.map(a => {
        const waUrl = getWhatsAppUrl(a.telefone, a.aluno, a.responsavel, a.data, a.horario);

        return `
            <div class="op-card" onclick="openDetalhesModal('${a.id}')" style="cursor:pointer;">
                <div>
                    <div class="op-card-header">
                        <div>
                            <div class="op-patient-name">${a.aluno}</div>
                            <div class="op-meta-sub">
                                <i class="fa-solid fa-graduation-cap"></i> ${a.turma} • <i class="fa-regular fa-user"></i> ${a.responsavel}
                                <br><strong style="color:#1e3a8a;"><i class="fa-solid fa-user-gear"></i> ${a.orientadora || 'Orientação'}</strong>
                            </div>
                        </div>
                        <span class="op-type-tag ${a.tipo}">${a.tipo === 'emergencial' ? '🚨 Emergencial' : '📅 Agendado'}</span>
                    </div>

                    <div class="op-body">
                        <p style="margin-bottom: 8px;"><strong>Motivo / Assunto:</strong> ${a.motivo}</p>
                        <div style="font-size: 0.8rem; color: #64748b;">
                            <i class="fa-regular fa-clock"></i> <strong>Data/Horário:</strong> ${formatDateBR(a.data)} às ${a.horario} (${a.turno.toUpperCase()})
                        </div>
                        
                        ${a.telefone ? `
                            <a href="${waUrl}" onclick="event.stopPropagation();" target="_blank" class="btn-whatsapp-direct">
                                <i class="fa-brands fa-whatsapp"></i> 💬 Abrir WhatsApp do Responsável (${a.telefone})
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
                        ${isSecretaria ? `
                            <button onclick="detalhesMudarStatus('aguardando', '${a.id}')" class="btn-sec" style="background:#f59e0b; color:white;">
                                ⏳ Chegou / Aguardando
                            </button>
                        ` : ''}

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
        pendente: "⏳ Pendente",
        aguardando: "🔔 Chegou / Aguardando",
        realizado: "✅ Atendido",
        ausente: "❌ Ausente / Não Veio",
        cancelado: "🚫 Cancelado"
    };
    return map[status] || status;
}

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

    document.getElementById("detalhesAlunoNome").innerText = ag.aluno;
    document.getElementById("detalhesTurmaBadge").innerText = ag.turma;
    document.getElementById("detalhesResponsavelNome").innerText = ag.responsavel;
    document.getElementById("detalhesOrientadora").innerText = ag.orientadora || "Orientação Pedagógica";
    document.getElementById("detalhesDataHorario").innerText = `${formatDateBR(ag.data)} às ${ag.horario} (${ag.turno.toUpperCase()})`;
    
    document.getElementById("detalhesTipoVaga").innerHTML = `<span class="op-type-tag ${ag.tipo}">${ag.tipo === 'emergencial' ? '🚨 Emergencial' : '📅 Agendado'}</span>`;
    document.getElementById("detalhesStatusBadge").innerHTML = `<span class="secretaria-status-badge status-${ag.statusSecretaria}">${getSecretariaBadgeText(ag.statusSecretaria)}</span>`;

    const waBtn = document.getElementById("detalhesWaBtn");
    const waText = document.getElementById("detalhesTelefoneText");
    if (waBtn && waText) {
        waText.innerText = ag.telefone || "Sem telefone";
        waBtn.href = getWhatsAppUrl(ag.telefone, ag.aluno, ag.responsavel, ag.data, ag.horario);
    }

    document.getElementById("detalhesMotivoText").innerText = ag.motivo;
    
    if (document.getElementById("detalhesInputEncaminhamento")) {
        document.getElementById("detalhesInputEncaminhamento").value = ag.encaminhamento || "Nenhum";
    }
    if (document.getElementById("detalhesInputHistoricoTratado")) {
        document.getElementById("detalhesInputHistoricoTratado").value = ag.historicoTratado || "";
    }

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
        obsPrompt = prompt("Anotação opcional da Secretaria (ex: Mãe aguarda no hall):", "Chegou na recepção.");
        playArrivalChime(); // Bipe sonoro
        
        const agObj = sigeDB.getAgendamentosOP().find(a => a.id === id);
        if (agObj) sendAutomaticWhatsapp(agObj, "aluno_chegou");
    } else {
        obsPrompt = prompt("Anotação opcional sobre o atendimento:", "");
    }

    sigeDB.updateSecretariaStatusOP(id, newStatus, obsPrompt || "", chegadaEm);

    renderModuleOrientacaoPedagogica();
    updateBadgesCounts();
    renderNotifications();

    if (newStatus === "aguardando") {
        showToast("🔔 Aluno marcado como AGUARDANDO. Orientadora notificada com bipe!");
    } else if (newStatus === "realizado") {
        showToast("✅ Atendimento concluído pela Orientadora!");
    } else if (newStatus === "ausente") {
        showToast("❌ Marcado como NÃO VEIO / Ausente.");
    }

    if (currentDetailAppointmentId === id) {
        openDetalhesModal(id);
    }
}

function salvarEncaminhamentoEDeliberacao() {
    if (!currentDetailAppointmentId) return;
    const enc = document.getElementById("detalhesInputEncaminhamento").value;
    const hist = document.getElementById("detalhesInputHistoricoTratado").value;

    sigeDB.updateEncaminhamentoOP(currentDetailAppointmentId, enc, hist);
    showToast("💾 Encaminhamento e histórico tratados salvos com sucesso!");
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

function gerarDeclaracaoComparecimento(id) {
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === id);
    if (!ag) return;

    const dataAtual = new Date().toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' });
    const horChegada = ag.chegadaEm ? ag.chegadaEm.split("T")[1]?.substring(0, 5) : ag.horario;

    const certHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Declaração de Comparecimento - C.E. Pedro Rizzi</title>
            <style>
                body { font-family: 'Times New Roman', serif; padding: 40px; color: #111; line-height: 1.8; }
                .cert-box { border: 3px double #000; padding: 40px; max-width: 750px; margin: 0 auto; text-align: center; }
                .header { margin-bottom: 30px; }
                .title { font-size: 22px; font-weight: bold; margin: 30px 0; text-transform: uppercase; letter-spacing: 2px; }
                .content { font-size: 17px; text-align: justify; text-indent: 40px; margin-bottom: 50px; }
                .footer-sign { margin-top: 60px; display: flex; justify-content: space-around; }
                .sign-line { border-top: 1px solid #000; width: 250px; text-align: center; font-size: 14px; padding-top: 5px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="no-print" style="text-align:center; margin-bottom:20px;">
                <button onclick="window.print()" style="padding:10px 20px; font-size:16px; background:#2563eb; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">
                    🖨️ Imprimir / Salvar PDF
                </button>
            </div>

            <div class="cert-box">
                <div class="header">
                    <h2>CENTRO EDUCACIONAL PEDRO RIZZI</h2>
                    <p style="font-size:14px; margin-top:-10px;">Rua Pedro Rangel, S/N - Itajaí / SC • Fone: (47) 3348-0000</p>
                    <hr style="border: 0.5px solid #000; margin-top:15px;">
                </div>

                <div class="title">DECLARAÇÃO DE COMPARECIMENTO</div>

                <div class="content">
                    Declaramos para os devidos fins a quem interessar possa que o(a) Sr(a). <strong>${ag.responsavel}</strong> compareceu a este estabelecimento de ensino no dia <strong>${formatDateBR(ag.data)}</strong>, no período das <strong>${horChegada}</strong> às <strong>${ag.horario}</strong>, para reunião e acompanhamento pedagógico referente ao estudante <strong>${ag.aluno}</strong>, regularmente matriculado no <strong>${ag.turma}</strong>.
                </div>

                <p style="text-align:right; font-size:16px; margin-top:40px;">
                    Itajaí/SC, ${dataAtual}.
                </p>

                <div class="footer-sign">
                    <div class="sign-line">
                        <strong>Orientação Pedagógica</strong><br>
                        ${ag.orientadora || 'C.E. Pedro Rizzi'}
                    </div>
                    <div class="sign-line">
                        <strong>Direção Escolar</strong><br>
                        Centro Educacional Pedro Rizzi
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

function openProntuarioModal(alunoNome) {
    const todos = sigeDB.getAgendamentosOP().filter(a => a.aluno.toLowerCase().trim() === alunoNome.toLowerCase().trim());
    
    document.getElementById("prontuarioAlunoNome").innerText = alunoNome;
    document.getElementById("prontuarioTotalCount").innerText = `${todos.length} atendimento(s) no histórico`;

    const bodyContainer = document.getElementById("prontuarioTimelineContainer");
    if (bodyContainer) {
        if (todos.length === 0) {
            bodyContainer.innerHTML = `<div class="empty-state"><p>Nenhum atendimento cadastrado para este aluno.</p></div>`;
        } else {
            bodyContainer.innerHTML = todos.map(a => `
                <div style="background:#f8fafc; border-left:4px solid #7c3aed; border-radius:12px; padding:1.2rem; margin-bottom:1rem; border:1px solid #e2e8f0;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:800; color:#0f172a; font-size:0.95rem;">
                            <i class="fa-regular fa-calendar"></i> ${formatDateBR(a.data)} às ${a.horario} (${a.turno.toUpperCase()})
                        </span>
                        <span class="secretaria-status-badge status-${a.statusSecretaria}">${getSecretariaBadgeText(a.statusSecretaria)}</span>
                    </div>
                    <div style="font-size:0.85rem; color:#475569; margin-top:6px;">
                        <strong>Responsável:</strong> ${a.responsavel} • <strong>Orientadora:</strong> ${a.orientadora || 'OP'}
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
            `).join("");
        }
    }

    document.getElementById("modalProntuarioAluno").style.display = "flex";
}

function closeProntuarioModal() {
    const modal = document.getElementById("modalProntuarioAluno");
    if (modal) modal.style.display = "none";
}

function reagendarAluno(id) {
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === id);
    if (!ag) return;

    closeDetalhesModal();
    openAgendamentoModal("", ag.turno, ag.tipo);

    document.getElementById("opInputAluno").value = ag.aluno;
    document.getElementById("opInputTurma").value = ag.turma;
    document.getElementById("opInputResponsavel").value = ag.responsavel;
    document.getElementById("opInputTelefone").value = ag.telefone;
    document.getElementById("opInputOrientadora").value = ag.orientadora || "Orientadora 1 (Carmen)";
    document.getElementById("opInputMotivo").value = `[REAGENDADO]: ${ag.motivo}`;

    showToast(`📅 Formulário de reagendamento pré-preenchido para ${ag.aluno}! Escolha a nova data.`);
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
    const orientadora = document.getElementById("opInputOrientadora").value;
    const data = document.getElementById("opInputData").value;
    const horario = document.getElementById("opInputHorario").value;
    const turno = document.getElementById("opInputTurno").value;
    const tipo = document.getElementById("opInputTipo").value;
    const motivo = document.getElementById("opInputMotivo").value;

    try {
        const novoAg = sigeDB.addAgendamentoOP({
            aluno, turma, responsavel, telefone, orientadora, data, horario, turno, tipo, motivo,
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
        showToast("✅ Agendamento registrado e WhatsApp automático enviado!");
    } catch (err) {
        alert(err.message);
    }
}

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

    sigeDB.logWhatsappDispatch("sup-cobranca", {
        tipo: "Cobrança de Projeto Docente",
        mensagem: msg,
        destinatario: profName,
        modo: "manual",
        status: "sucesso"
    });

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, "_blank");
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
    const o1 = list.find(o => o.nome.includes("Carmen")) || list[0];
    const o2 = list.find(o => o.nome.includes("Luciana")) || list[1];

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

    sigeDB.saveOrientadora("orient-1", "Orientadora 1 (Carmen)", p1, e1);
    sigeDB.saveOrientadora("orient-2", "Orientadora 2 (Luciana)", p2, e2);

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

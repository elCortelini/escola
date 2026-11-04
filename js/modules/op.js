/**
 * op.js - Módulo 2: Orientação Pedagógica (OP)
 * Centro Educacional Pedro Rizzi
 */

// MÓDULO 2: ORIENTAÇÃO PEDAGÓGICA (OP)
// ==========================================
let opViewMode = "semanal"; // "semanal", "cards", "projetos"
let currentWeekRefDate = new Date();

function setOpViewMode(mode) {
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
        projetosView.style.display = mode === "projetos" ? "block" : "none";
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
        const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const dayNames = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];
        const today = new Date();
        const todayIso = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
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
    syncRoleFilters();
    const filterOrientadoraSelect = document.getElementById("opFilterOrientadora");
    const filterOrientadora = filterOrientadoraSelect ? filterOrientadoraSelect.value : "todas";

    const todosAtendimentos = sigeDB.getAgendamentosOP().filter(a => {
        return matchOrientadora(a, filterOrientadora);
    });


    const weekDays = getWeekDays(currentWeekRefDate);

    // Atualiza contadores de atendimento por orientadora (Semanal & Mês)
    updateOrientadorasCounters(weekDays);

    // 1. Renderiza Visão Semanal (Inspirada no modelo)
    renderWeeklyAgenda(weekDays, todosAtendimentos);

    // 2. Renderiza Visão Cards (Filtro por Data)
    renderCardsView(todosAtendimentos);

    // 3. Renderiza Visão Projetos OP
    renderOpProjetosList();

    // 4. Controle estrito de visibilidade do botão 'Zerar Atendimentos' (Exclusivo Desenvolvedor)
    const btnZerar = document.getElementById("btnZerarAtendimentosOP");
    if (btnZerar) {
        btnZerar.style.display = (typeof sigeDB !== 'undefined' && typeof sigeDB.isDev === 'function' && sigeDB.isDev()) ? "inline-flex" : "none";
    }
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
                        const theme = getOrientadoraColorTheme(item.orientadora);

                        html += `
                            <div class="timeline-item-card ${item.tipo}" onclick="openDetalhesModal('${item.id}')" style="cursor:pointer; background:${theme.bg} !important; border:1px solid ${theme.border} !important; border-left:5px solid ${theme.borderLeft} !important;" title="Clique para ver os detalhes">
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
                                        <div style="font-size:0.73rem; color:${theme.text}; font-weight:800; margin-top:3px;">
                                            <i class="fa-solid fa-user-gear"></i> ${item.orientadora || 'Orientação Educacional'}
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
                                                <button onclick="event.stopPropagation(); marcarAguardandoSecretaria('${item.id}')" style="background:#d97706; color:white; border:none; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:800; cursor:pointer;" title="Notificar novamente">🔔 Reenviar</button>
                                            </div>
                                        ` : `
                                            <button onclick="event.stopPropagation(); marcarAguardandoSecretaria('${item.id}')" style="width:100%; background:linear-gradient(135deg, #f59e0b, #d97706); color:white; font-weight:900; font-size:0.78rem; padding:6px 10px; border-radius:8px; border:none; cursor:pointer; box-shadow:0 2px 6px rgba(245,158,11,0.35); display:flex; align-items:center; justify-content:center; gap:6px;" title="Clique aqui para registrar que a pessoa chegou e está aguardando na recepção">
                                                <i class="fa-solid fa-bell" style="font-size:0.85rem;"></i> 🔔 Marcar: Chegou / Esperando
                                            </button>
                                        `}
                                    </div>
                                </div>

                                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:6px; border-top:1px dashed #e2e8f0;">
                                    <button onclick="event.stopPropagation(); excluirAgendamentoDirect('${item.id}');" class="btn-delete-card" title="Excluir Agendamento">
                                        <i class="fa-solid fa-trash-can"></i> Excluir
                                    </button>
                                    <a href="${waUrl}" onclick="event.stopPropagation();" target="_blank" rel="noopener noreferrer" class="btn-wa-compact">
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
                        const theme = getOrientadoraColorTheme(item.orientadora);

                        html += `
                            <div class="timeline-item-card ultra-compact-past-card" onclick="openDetalhesModal('${item.id}')" style="cursor:pointer; background:${theme.bg} !important; border:1px solid ${theme.border} !important; border-left:5px solid ${theme.borderLeft} !important;" title="Clique para ver os detalhes completos de ${item.aluno}">
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
        // MODO 2: GRADE DE VAGAS DINÂMICA
        const orientadorasList = (typeof sigeDB !== 'undefined' && sigeDB.getOrientadoras) ? sigeDB.getOrientadoras() : [];
        const slotsConfig = [];

        ['matutino', 'vespertino'].forEach(turno => {
            slotsConfig.push({
                isHeader: true,
                header: turno === 'matutino' ? "☀️ TURNO MATUTINO (MANHÃ)" : "⛅ TURNO VESPERTINO (TARDE)",
                turno: turno
            });

            const targets = orientadorasList.length > 0 ? orientadorasList : [
                { id: "geral", nome: "Orientação Educacional", cargoFuncao: "Geral" }
            ];

            [0, 1, 2].forEach(slotIdx => {
                const bg = slotIdx % 2 === 1 ? "#f1f5f9" : "#ffffff";
                targets.forEach(ori => {
                    slotsConfig.push({
                        label: `${slotIdx + 1}ª Vaga`,
                        turno: turno,
                        tipo: "agendado",
                        slotIndex: slotIdx,
                        orientadoraId: ori.id,
                        orientadoraNome: ori.nome,
                        orientadoraTag: ori.turmasOuSalas || ori.cargoFuncao || "Orientadora",
                        bgColor: bg
                    });
                });
            });

            targets.forEach(ori => {
                slotsConfig.push({
                    label: "🚨 Emergencial",
                    turno: turno,
                    tipo: "emergencial",
                    slotIndex: 0,
                    isEmergencial: true,
                    orientadoraId: ori.id,
                    orientadoraNome: ori.nome,
                    orientadoraTag: ori.turmasOuSalas || ori.cargoFuncao || "Orientadora",
                    bgColor: "#fef2f2"
                });
            });
        });

        let activeSlots = slotsConfig.filter(s => {
            if (s.isHeader) return true;
            if (!filterOrientadora || filterOrientadora === "todas") return true;
            return matchOrientadora({ orientadora: s.orientadoraNome }, filterOrientadora);
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
            const theme = getOrientadoraColorTheme(s.orientadoraNome);

            return `
                <tr style="background-color: ${rowBg};">
                    <td class="slot-time-cell ${s.isEmergencial ? 'emergencial-slot' : ''}" style="background-color: ${rowBg}; padding:6px 6px; width:110px;">
                        <span class="vaga-num" style="font-weight:800; font-size:0.78rem;">${s.label}</span>
                        <span style="font-size:0.72rem; color:${theme.text}; font-weight:800; display:block; margin-top:1px;">
                            <i class="fa-solid fa-user-gear"></i> ${s.orientadoraNome.split(" ")[0]}
                        </span>
                        <span style="font-size:0.65rem; color:#64748b; font-weight:700; display:block; white-space:nowrap;">
                            ${s.orientadoraTag}
                        </span>
                    </td>
                    ${weekDays.map(d => {
                        const dateAppointments = todosAtendimentos.filter(a => 
                            a.data === d.dateIso && 
                            a.turno === s.turno &&
                            a.tipo === s.tipo && 
                            a.statusSecretaria !== 'cancelado' &&
                            (s.orientadoraId === 'geral' || matchOrientadora(a, s.orientadoraNome))
                        );

                        const item = dateAppointments[s.slotIndex];

                        if (item) {
                            const waUrl = getWhatsAppUrl(item.telefone, item.aluno, item.responsavel, item.data, item.horario);
                            const isProf = item.publico === "professor";
                            const itemTheme = getOrientadoraColorTheme(item.orientadora || s.orientadoraNome);
                            return `
                                <td class="${d.isToday ? 'today-column-cell' : ''}" style="background-color: ${d.isToday ? '#fffbeb' : rowBg};">
                                    <div class="weekly-slot-card ${item.tipo}" onclick="openDetalhesModal('${item.id}')" style="cursor:pointer; background:${itemTheme.bg} !important; border:1px solid ${itemTheme.border} !important; border-left:5px solid ${itemTheme.borderLeft} !important;" title="Clique para ver os detalhes completos">
                                        <div class="weekly-slot-header">
                                            <span class="weekly-student-name">${isProf ? '👨‍🏫 ' + item.aluno : item.aluno}</span>
                                            <span class="weekly-class-badge" style="${isProf ? 'background:#f3e8ff; color:#6b21a8; border:1px solid #d8b4fe;' : ''}">${item.turma}</span>
                                        </div>
                                        <div style="font-size:0.73rem; color:${itemTheme.text}; font-weight:700;">
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
                                                <button onclick="event.stopPropagation(); marcarAguardandoSecretaria('${item.id}')" style="background:#f59e0b; color:white; font-weight:900; font-size:0.7rem; padding:4px 6px; border-radius:6px; border:none; cursor:pointer; width:100%; text-align:center; box-shadow:0 2px 4px rgba(245,158,11,0.25);" title="Clique para registrar que a pessoa chegou">
                                                    <i class="fa-solid fa-bell"></i> 🔔 Chegou / Esperando
                                                </button>
                                            `}
                                        </div>

                                        <!-- Botão WhatsApp Direto no Card -->
                                        <a href="${waUrl}" onclick="event.stopPropagation();" target="_blank" rel="noopener noreferrer" class="btn-wa-compact" style="margin-top:4px;">
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
                            <a href="${waUrl}" onclick="event.stopPropagation();" target="_blank" rel="noopener noreferrer" class="btn-whatsapp-direct">
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

                    <div class="secretaria-action-btns" style="flex-wrap:wrap; margin-top:8px;" onclick="event.stopPropagation();">
                        <button onclick="event.stopPropagation(); marcarAguardandoSecretaria('${a.id}')" class="btn-sec" style="background:linear-gradient(135deg, #f59e0b, #d97706); color:white; font-weight:900; width:100%; border:none; box-shadow:0 2px 4px rgba(245,158,11,0.3);">
                            🔔 Marcar que Chegou / Está Esperando
                        </button>

                        ${isOrientadora ? `
                            <button onclick="event.stopPropagation(); detalhesMudarStatus('realizado', '${a.id}')" class="btn-sec btn-sec-ok">
                                ✅ Atendido
                            </button>
                            <button onclick="event.stopPropagation(); detalhesMudarStatus('ausente', '${a.id}')" class="btn-sec btn-sec-fail">
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
    const container = document.getElementById("orientadorasCardsContainer");
    if (!container) return;

    const orientadoras = sigeDB.getOrientadoras();
    const todosAgendamentos = sigeDB.getAgendamentosOP() || [];
    
    const filterOrientadoraSelect = document.getElementById("opFilterOrientadora");
    const filterOrientadora = filterOrientadoraSelect ? filterOrientadoraSelect.value : "todas";

    if (!weekDays || weekDays.length < 5) return;

    const weekStart = weekDays[0].dateIso;
    const weekEnd = weekDays[4].dateIso;
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);

    function calcMetrics(list) {
        const total = list.length;
        const agendados = list.filter(a => a.statusSecretaria === 'agendado' || a.statusSecretaria === 'pendente' || a.statusSecretaria === 'aguardando' || !a.statusSecretaria).length;
        const atendidos = list.filter(a => a.statusSecretaria === 'realizado').length;
        const ausentes = list.filter(a => a.statusSecretaria === 'faltou' || a.statusSecretaria === 'ausente').length;
        const cancelados = list.filter(a => a.statusSecretaria === 'cancelado').length;
        return { total, agendados, atendidos, ausentes, cancelados };
    }

    // Filtra orientadoras exibidas no resumo com base no filtro ativo
    const orientadorasParaExibir = orientadoras.filter(o => {
        if (filterOrientadora === "todas") return true;
        return matchOrientadora({ orientadora: o.nome }, filterOrientadora);
    });

    if (orientadorasParaExibir.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 14px 18px; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; text-align: center; color: #64748b; font-size: 0.88rem; width: 100%;">
                <i class="fa-solid fa-user-slash" style="margin-right: 6px; color: #94a3b8;"></i> Nenhuma orientadora cadastrada ou encontrada para o filtro selecionado.
            </div>
        `;
        return;
    }

    const colors = [
        { border: "#2563eb", bgIcon: "#eff6ff", textIcon: "#2563eb", title: "#1e3a8a" },
        { border: "#d97706", bgIcon: "#fff7ed", textIcon: "#d97706", title: "#9a3412" },
        { border: "#10b981", bgIcon: "#f0fdf4", textIcon: "#10b981", title: "#065f46" },
        { border: "#7c3aed", bgIcon: "#f5f3ff", textIcon: "#7c3aed", title: "#5b21b6" },
        { border: "#0d9488", bgIcon: "#f0fdfa", textIcon: "#0d9488", title: "#115e59" },
        { border: "#e11d48", bgIcon: "#fff1f2", textIcon: "#e11d48", title: "#9f1239" }
    ];

    container.innerHTML = orientadorasParaExibir.map((o, idx) => {
        const c = colors[idx % colors.length];
        const isThisOri = (a) => matchOrientadora(a, o.nome);

        const semList = todosAgendamentos.filter(a => isThisOri(a) && a.data >= weekStart && a.data <= weekEnd);
        const mesList = todosAgendamentos.filter(a => isThisOri(a) && a.data && a.data.startsWith(currentMonthPrefix));

        const sem = calcMetrics(semList);
        const mes = calcMetrics(mesList);

        const subInfo = o.turmasOuSalas || o.cargoFuncao || "Orientadora Educacional";

        return `
            <div class="turno-card" style="border-left: 4px solid ${c.border}; background:#ffffff; border-radius:12px; padding:0.6rem 1rem;">
                <div class="turno-info">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:32px; height:32px; border-radius:50%; background:${c.bgIcon}; color:${c.textIcon}; display:flex; align-items:center; justify-content:center; font-size:0.9rem; border:1px solid #cbd5e1; flex-shrink:0;">
                            <i class="fa-solid fa-user-check"></i>
                        </div>
                        <div>
                            <h4 style="color:${c.title}; font-weight:800; font-size:0.95rem; margin:0; line-height:1.2;">${escapeHtml(o.nome)}</h4>
                            <p style="font-size:0.75rem; color:#64748b; font-weight:600; margin:2px 0 0 0;">${escapeHtml(subInfo)}</p>
                        </div>
                    </div>
                </div>
                <div class="slots-pills">
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
                </div>
            </div>
        `;
    }).join("");
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

function isStatusFalta(st) {
    if (!st) return false;
    const s = String(st).toLowerCase().trim();
    return s === 'falta' || s === 'ausente' || s === 'nao_veio' || s === 'faltou';
}

function isStatusRealizado(st) {
    if (!st) return false;
    const s = String(st).toLowerCase().trim();
    return s === 'realizado' || s === 'atendido' || s === 'concluido' || s === 'presente';
}

function isStatusConfirmado(st) {
    if (!st) return false;
    const s = String(st).toLowerCase().trim();
    return s === 'confirmado' || s === 'confirmado_whatsapp';
}

function isStatusCancelado(st) {
    if (!st) return false;
    const s = String(st).toLowerCase().trim();
    return s === 'cancelado';
}

function getSecretariaBadgeText(status) {
    const s = String(status || '').toLowerCase().trim();
    if (isStatusRealizado(s)) return "✅ Atendido / Compareceu";
    if (isStatusFalta(s)) return "❌ Ausente / Não Veio";
    if (isStatusConfirmado(s)) return "🟢 Presença Confirmada (WhatsApp)";
    if (isStatusCancelado(s)) return "🚫 Cancelado";
    if (s === "aguardando") return "🔔 Chegou / Aguardando";
    if (s === "agendado" || s === "pendente") return "⏳ Agendado / Pendente";
    return status || "Pendente";
}

window.isStatusFalta = isStatusFalta;
window.isStatusRealizado = isStatusRealizado;
window.isStatusConfirmado = isStatusConfirmado;
window.isStatusCancelado = isStatusCancelado;
window.getSecretariaBadgeText = getSecretariaBadgeText;

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
        projetos = projetos.filter(p => {
            if (!p.orientadoraLider || p.orientadoraLider.toLowerCase().includes("equipe")) return true;
            return matchOrientadora({ orientadora: p.orientadoraLider }, filterOrientadora);
        });
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
            if (elOri && elOri.options.length > 0) elOri.value = elOri.options[0].value;
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
        const orientadoraLider = elOri ? elOri.value : ((sigeDB.getOrientadoras()[0] || {}).nome || "Orientação Educacional");
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
window.currentDetailAppointmentId = null;

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
    window.currentDetailAppointmentId = id;

    const isProf = ag.publico === "professor";
    document.getElementById("detalhesAlunoNome").innerText = isProf ? `👨‍🏫 ${ag.aluno}` : ag.aluno;
    document.getElementById("detalhesTurmaBadge").innerText = isProf ? `Docente: ${ag.turma}` : ag.turma;
    document.getElementById("detalhesResponsavelNome").innerText = ag.responsavel || (isProf ? 'Contato Direto' : '-');
    document.getElementById("detalhesOrientadora").innerText = ag.orientadora || "Orientação Educacional (OE)";
    
    const elReg = document.getElementById("detalhesRegistradoPor");
    if (elReg) {
        elReg.innerText = ag.registradoPor || "Secretaria Escolar";
    }

    document.getElementById("detalhesDataHorario").innerText = `${formatDateBR(ag.data)} às ${ag.horario} (${ag.turno ? ag.turno.toUpperCase() : 'MATUTINO'})`;
    
    const elTipo = document.getElementById("detalhesTipoVaga");
    if (elTipo) {
        elTipo.innerHTML = `<span class="op-type-tag ${ag.tipo}">${ag.tipo === 'emergencial' ? '🚨 Emergencial' : '📅 Agendado'}</span>`;
    }

    const statusBadgeElem = document.getElementById("detalhesStatusBadge");
    if (statusBadgeElem) {
        statusBadgeElem.innerHTML = `<span class="secretaria-status-badge status-${ag.statusSecretaria}">${getSecretariaBadgeText(ag.statusSecretaria)}</span>`;
    }

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

    // Visibilidade dos botões e painéis conforme o perfil de atuação no módulo OP
    const opPerfil = (typeof sigeDB !== 'undefined' && sigeDB.getCurrentOpPerfil) ? sigeDB.getCurrentOpPerfil() : 'none';
    const isRecepcao = (opPerfil === "recepcao");

    const btnConfirmadoWa = document.getElementById("btnAcaoConfirmadoWa");
    const btnAguardando = document.getElementById("btnAcaoAguardando");
    const btnAtendido = document.getElementById("btnAcaoAtendido");
    const btnNaoVeio = document.getElementById("btnAcaoNaoVeio");

    if (btnConfirmadoWa) btnConfirmadoWa.style.display = "inline-flex";
    if (btnAguardando) btnAguardando.style.display = "inline-flex";
    // Secretaria / Recepção NÃO conclui nem atesta atendimento pedagógico
    if (btnAtendido) btnAtendido.style.display = isRecepcao ? "none" : "inline-flex";
    if (btnNaoVeio) btnNaoVeio.style.display = "inline-flex";

    // Configuração do Registro Pedagógico & Deliberações
    const editorArea = document.getElementById("detalhesPedagogicoEditorArea");
    const readOnlyArea = document.getElementById("detalhesPedagogicoReadOnlyArea");
    const readOnlyText = document.getElementById("detalhesPedagogicoReadOnlyText");
    const encElem = document.getElementById("detalhesInputEncaminhamento");
    const histElem = document.getElementById("detalhesInputHistoricoTratado");

    if (encElem) encElem.value = ag.encaminhamento || "Nenhum";
    if (histElem) histElem.value = ag.historicoTratado || "";

    if (isRecepcao) {
        if (editorArea) editorArea.style.display = "none";
        if (readOnlyArea) {
            readOnlyArea.style.display = "block";
            if (ag.historicoTratado || (ag.encaminhamento && ag.encaminhamento !== "Nenhum")) {
                readOnlyText.innerHTML = `
                    <div style="margin-bottom:6px;"><strong>Encaminhamento:</strong> ${escapeHtml(ag.encaminhamento || 'Nenhum')}</div>
                    <div><strong>Deliberações / Combinados:</strong> ${escapeHtml(ag.historicoTratado || '-')}</div>
                `;
            } else {
                readOnlyText.innerHTML = `<span style="color:#64748b; font-style:italic;"><i class="fa-solid fa-lock" style="color:#94a3b8; margin-right:4px;"></i> Registro de combinados pedagógicos privativo da Orientadora Educacional após o atendimento.</span>`;
            }
        }
    } else {
        if (editorArea) editorArea.style.display = "block";
        if (readOnlyArea) readOnlyArea.style.display = "none";
    }

    // Renderizar histórico de disparos de WhatsApp
    renderWhatsappDispatchHistory(ag);

    const modal = document.getElementById("modalDetalhesOP");
    if (modal) {
        modal.style.display = "flex";
        modal.onclick = (e) => {
            if (e.target === modal) closeDetalhesModal();
        };
    }
}

function closeDetalhesModal() {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
    }
    const modal = document.getElementById("modalDetalhesOP");
    if (modal) modal.style.display = "none";
    currentDetailAppointmentId = null;
    window.currentDetailAppointmentId = null;
}

window.openDetalhesModal = openDetalhesModal;
window.closeDetalhesModal = closeDetalhesModal;

function detalhesMudarStatus(newStatus, customId = null) {
    const id = customId || window.currentDetailAppointmentId || currentDetailAppointmentId;
    if (!id) return;

    const opPerfil = (typeof sigeDB !== 'undefined' && sigeDB.getCurrentOpPerfil) ? sigeDB.getCurrentOpPerfil() : 'none';
    if (opPerfil === "recepcao" && (newStatus === "realizado" || newStatus === "atendido")) {
        alert("⚠️ Ação restrita: A conclusão do atendimento e seus desfechos são de competência privativa da Orientadora Educacional.");
        return;
    }

    if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
    }

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

    if (newStatus === "aguardando") {
        showToast("🔔 Marcado como AGUARDANDO na recepção.");
    } else if (newStatus === "confirmado" || newStatus === "confirmado_whatsapp") {
        showToast("🟢 Presença confirmada via WhatsApp!");
    } else if (newStatus === "realizado" || newStatus === "atendido") {
        showToast("✅ Atendimento marcado como CONCLUÍDO!");
    } else if (newStatus === "ausente" || newStatus === "nao_veio") {
        showToast("❌ Marcado como NÃO VEIO / Ausente.");
    }

    setTimeout(() => {
        renderModuleOrientacaoPedagogica();
        updateBadgesCounts();
        renderNotifications();

        const isModalOpen = document.getElementById("modalDetalhesOP") && document.getElementById("modalDetalhesOP").style.display === "flex";
        if (isModalOpen && (window.currentDetailAppointmentId === id || currentDetailAppointmentId === id)) {
            openDetalhesModal(id);
        }
    }, 50);
}

function salvarEncaminhamentoEDeliberacao() {
    const targetId = window.currentDetailAppointmentId || currentDetailAppointmentId;
    if (!targetId) return;

    const opPerfil = (typeof sigeDB !== 'undefined' && sigeDB.getCurrentOpPerfil) ? sigeDB.getCurrentOpPerfil() : 'none';
    if (opPerfil === "recepcao") {
        alert("⚠️ Ação restrita: Usuários da recepção/secretaria não possuem permissão para registrar conclusões pedagógicas.");
        return;
    }

    const encElem = document.getElementById("detalhesInputEncaminhamento");
    const enc = encElem ? encElem.value : "Nenhum";
    const histElem = document.getElementById("detalhesInputHistoricoTratado");
    const hist = histElem ? histElem.value : "";

    sigeDB.updateEncaminhamentoOP(targetId, enc, hist);
    showToast("💾 Relato da conversa e combinados salvos com sucesso!");
    renderModuleOrientacaoPedagogica();
}

function dispararLembrete24h() {
    const targetId = window.currentDetailAppointmentId || currentDetailAppointmentId;
    if (!targetId) return;
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === targetId);
    if (!ag || !ag.telefone) return alert("Sem telefone cadastrado!");

    sendAutomaticWhatsapp(ag, "lembrete_24h");
    renderWhatsappDispatchHistory(ag);
}

function dispararLembreteHoje() {
    const targetId = window.currentDetailAppointmentId || currentDetailAppointmentId;
    if (!targetId) return;
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === targetId);
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
    const targetId = id || window.currentDetailAppointmentId || currentDetailAppointmentId;
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === targetId);
    if (!ag) return;

    const dataAtual = new Date().toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' });
    const horInicio = ag.horario || "08:00";
    const horFim = addOneHour(horInicio);

    const oriInfo = getOrientadoraInfoForRecord(ag);
    const orientadoraNome = oriInfo.nome;
    const orientadoraCargo = oriInfo.cargo;

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
                        <img src="${sigeDB.getLogoEscola()}" alt="Logo Escola" style="max-height:65px; display:block; margin:0 auto 10px auto; object-fit:contain;">
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
                            <strong>${escapeHtml(orientadoraNome)}</strong><br>
                            ${escapeHtml(orientadoraCargo)}
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
    const orientadorasList = (typeof sigeDB !== 'undefined' && sigeDB.getOrientadoras) ? sigeDB.getOrientadoras() : [];
    let found = null;
    if (ag && ag.orientadora) {
        found = orientadorasList.find(o => matchOrientadora(ag, o.nome) || matchOrientadora(ag, o.id));
    }
    if (!found && orientadorasList.length > 0) {
        found = orientadorasList[0];
    }
    const nome = found ? found.nome : (ag?.orientadora || "Orientação Educacional");
    const cargo = found ? (found.turmasOuSalas || found.cargoFuncao || "Orientadora Educacional") : "Orientadora Educacional";
    return {
        nome: nome,
        cargo: cargo,
        short: `${nome} (${cargo})`
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
window.openProntuarioModal = openProntuarioModal;
window.closeProntuarioModal = closeProntuarioModal;

let currentReagendarId = null;

function reagendarAluno(id) {
    const targetId = id || window.currentDetailAppointmentId || currentDetailAppointmentId;
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === targetId);
    if (!ag) return;

    currentReagendarId = targetId;
    
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

    if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
    }
    sigeDB.saveAgendamentosOP(ags);

    showToast(`📅 Agendamento de "${ag.aluno}" reagendado para ${formatDateBR(novaData)} às ${novoHorario}!`, "success");
    closeReagendarModal();
    setTimeout(() => {
        renderModuleOrientacaoPedagogica();
    }, 50);
}

function aplicarTemplateMensagem(tipo) {
    const targetId = window.currentDetailAppointmentId || currentDetailAppointmentId;
    if (!targetId) return;
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === targetId);
    if (!ag) return;

    const textarea = document.getElementById("detalhesMensagemEditavel");
    if (!textarea) return;

    const dataFmt = formatDateBR(ag.data);
    const alunoNome = ag.aluno;
    const respNome = ag.responsavel || "Família";
    const oriNome = ag.orientadora || "Orientação Educacional";
    const hor = ag.horario || "";
    let linkConfirm = `https://elcortelini.github.io/escola/confirmar-presenca.html?id=${ag.id}`;

    let text = "";
    if (tipo === "lembrete_dia") {
        text = `Olá ${respNome}! Lembramos do agendamento do estudante ${alunoNome} (${ag.turma}) com a Orientadora Educacional ${oriNome} HOJE, às ${hor}. Aguardamos vocês no Centro Educacional Pedro Rizzi.\n\n👇 *Por favor, confirme sua presença clicando no link abaixo:*\n${linkConfirm}`;
    } else if (tipo === "lembrete_24h") {
        text = `Olá ${respNome}! Lembramos do agendamento do estudante ${alunoNome} (${ag.turma}) com a Orientadora Educacional ${oriNome} amanhã, dia ${dataFmt} às ${hor}. Centro Educacional Pedro Rizzi.\n\n👇 *Por favor, confirme sua presença clicando no link abaixo:*\n${linkConfirm}`;
    } else if (tipo === "reagendado") {
        text = `Olá ${respNome}! Confirmamos o REAGENDAMENTO do atendimento do estudante ${alunoNome} (${ag.turma}) para o dia ${dataFmt} às ${hor} com a Orientação Educacional do Centro Educacional Pedro Rizzi.\n\n👇 *Por favor, confirme sua presença clicando no link abaixo:*\n${linkConfirm}`;
    } else if (tipo === "falta") {
        text = `Olá ${respNome}! Registramos a ausência no atendimento agendado do estudante ${alunoNome} (${ag.turma}) no dia ${dataFmt} às ${hor}. Por favor, entre em contato conosco para reagendarmos.`;
    }

    textarea.value = text;

    // Gera token seguro e atualiza o link na caixa de texto
    if (tipo !== "falta" && typeof sigeDB !== 'undefined' && sigeDB.criarTokenConfirmacao) {
        sigeDB.criarTokenConfirmacao(ag.id).then(token => {
            if (token && textarea && textarea.value.includes(linkConfirm)) {
                const linkComToken = `https://elcortelini.github.io/escola/confirmar-presenca.html?token=${token}`;
                textarea.value = textarea.value.replace(linkConfirm, linkComToken);
            }
        }).catch(err => console.warn("Aviso ao gerar token seguro:", err));
    }

    showToast(`Mensagem carregada (${tipo.toUpperCase()}). Você pode editar antes de enviar!`);
}

function enviarMensagemPersonalizadaWhatsApp(e) {
    const targetId = window.currentDetailAppointmentId || currentDetailAppointmentId;
    if (!targetId) return;
    const ag = sigeDB.getAgendamentosOP().find(a => a.id === targetId);
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
    const filterSelect = document.getElementById("opFilterOrientadora");
    const filterVal = filterSelect ? filterSelect.value : "todas";
    let filterText = "Visão Consolidada (Todas as Orientadoras)";
    if (filterSelect && filterSelect.options && filterSelect.selectedIndex >= 0) {
        filterText = filterSelect.options[filterSelect.selectedIndex].text;
    }

    const todosAtendimentos = sigeDB.getAgendamentosOP() || [];
    const hojeIso = new Date().toISOString().split("T")[0];
    
    const atendimentosHoje = todosAtendimentos.filter(a => 
        a.data === hojeIso && 
        a.statusSecretaria !== "cancelado" && 
        matchOrientadora(a, filterVal)
    );

    if (atendimentosHoje.length === 0) {
        if (filterVal !== "todas") {
            const shortName = filterVal.split(" ")[0];
            showToast(`Nenhum agendamento ativo cadastrado para HOJE para a orientadora ${shortName}.`, "info");
        } else {
            showToast("Nenhum agendamento cadastrado para hoje para disparar lembretes.", "info");
        }
        return;
    }

    renderListLembretesHoje(atendimentosHoje, filterVal, filterText);

    const modal = document.getElementById("modalDispararLembretesHoje");
    if (modal) modal.style.display = "flex";
    if (typeof atualizarStatusWhatsAppUnificado === 'function') {
        atualizarStatusWhatsAppUnificado();
    }
}

function renderListLembretesHoje(atendimentosHoje, filterVal = "todas", filterText = "") {
    const container = document.getElementById("listaLembretesHojeContainer");
    if (!container) return;

    const subTitleEl = document.getElementById("modalDispararLembretesSubTitle");
    if (subTitleEl) {
        if (filterVal !== "todas" && filterText) {
            subTitleEl.innerHTML = `Filtro de Orientadora: <strong style="color:#166534;">${escapeHtml(filterText)}</strong> — Selecione os atendimentos e telefones para envio.`;
        } else {
            subTitleEl.innerText = "Selecione quais atendimentos devem receber o lembrete e escolha o telefone preferencial de cada aluno.";
        }
    }

    const alunosImportados = sigeDB.getAlunosImportados() || [];
    const chkSelectAll = document.getElementById("chkLembreteSelectAll");
    if (chkSelectAll) chkSelectAll.checked = true;

    let html = "";
    atendimentosHoje.forEach(ag => {
        const dataFmt = formatDateBR(ag.data);
        const alunoNome = ag.aluno || "Aluno";
        const cleanNome = alunoNome.trim().toLowerCase();
        
        let alunoData = alunosImportados.find(a => (a.nome || "").toLowerCase() === cleanNome);
        if (!alunoData) {
            alunoData = alunosImportados.find(a => (a.nome || "").toLowerCase().startsWith(cleanNome));
        }

        let listaTelefones = [];
        if (ag.telefone && ag.telefone.trim()) {
            listaTelefones.push(ag.telefone.trim());
        }
        if (alunoData && alunoData.telefones && Array.isArray(alunoData.telefones)) {
            alunoData.telefones.forEach(tel => {
                if (!listaTelefones.includes(tel.trim())) {
                    listaTelefones.push(tel.trim());
                }
            });
        }

        let phoneSelectHtml = "";
        if (listaTelefones.length > 1) {
            phoneSelectHtml = `
                <div style="margin-top:6px; display:flex; align-items:center; gap:6px;">
                    <span style="font-size:0.75rem; font-weight:800; color:#166534;"><i class="fa-solid fa-phone"></i> Destinatário:</span>
                    <select id="selectPhone_${ag.id}" style="font-size:0.78rem; font-weight:800; padding:4px 8px; border-radius:6px; border:1px solid #86efac; background:#f0fdf4; color:#14532d; cursor:pointer;">
            `;
            listaTelefones.forEach((p, idx) => {
                const isSelected = p === ag.telefone;
                phoneSelectHtml += `<option value="${escapeHtml(p)}" ${isSelected ? 'selected' : ''}>${escapeHtml(p)}${idx === 0 && p === ag.telefone ? ' (Preferencial Agendado)' : ''}</option>`;
            });
            phoneSelectHtml += `</select></div>`;
        } else {
            const singleTel = listaTelefones[0] || ag.telefone || 'Não informado';
            phoneSelectHtml = `
                <input type="hidden" id="selectPhone_${ag.id}" value="${escapeHtml(singleTel)}">
                <div style="font-size:0.78rem; font-weight:800; color:#334155; margin-top:4px;">
                    <i class="fa-solid fa-phone" style="color:#166534;"></i> Destinatário: <span style="font-family:monospace; color:#0f172a;">${escapeHtml(singleTel)}</span>
                </div>
            `;
        }

        const linkConfirm = `https://elcortelini.github.io/escola/confirmar-presenca.html?id=${ag.id}`;
        const msgPreview = `🤖 [Lembrete Automático HOJE] Olá ${ag.responsavel || 'Família'}! Lembramos do atendimento do estudante ${ag.aluno} (${ag.turma || ''}) agendado para HOJE, ${dataFmt} às ${ag.horario} com a Orientação Educacional (CE Pedro Rizzi).\n\n👇 *Por favor, confirme sua presença clicando no link abaixo:*\n${linkConfirm}`;

        html += `
            <div id="cardLembrete_${ag.id}" style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:12px; padding:12px 14px; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; gap:12px; align-items:flex-start;">
                <div style="padding-top:4px;">
                    <input type="checkbox" class="chk-lembrete-hoje" data-id="${ag.id}" checked onchange="updateLembretesHojeCounter()" style="width:20px; height:20px; accent-color:#166534; cursor:pointer;">
                </div>
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                        <div style="font-weight:900; font-size:0.95rem; color:#0f172a; display:flex; align-items:center; gap:8px;">
                            <span>🎓 ${escapeHtml(ag.aluno)}</span>
                            <span style="font-size:0.75rem; background:#e2e8f0; color:#334155; padding:2px 8px; border-radius:10px; font-weight:800;">Turma ${escapeHtml(ag.turma || '-')}</span>
                        </div>
                        <div style="font-weight:800; font-size:0.8rem; color:#1e293b; background:#f1f5f9; padding:4px 10px; border-radius:8px; display:inline-flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-clock" style="color:#4f46e5;"></i> ${escapeHtml(ag.horario)} | ${escapeHtml(ag.orientadora || 'Orientadora')}
                        </div>
                    </div>

                    <div style="font-size:0.8rem; color:#475569; margin-top:4px;">
                        <strong>Responsável:</strong> ${escapeHtml(ag.responsavel || 'Não informado')}
                    </div>

                    ${phoneSelectHtml}

                    <div style="margin-top:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; font-size:0.75rem; color:#334155;">
                        <div style="font-weight:800; color:#15803d; margin-bottom:2px;"><i class="fa-solid fa-comment-dots"></i> Prévia da mensagem:</div>
                        <div id="previewText_${ag.id}" style="font-style:italic; line-height:1.3;">${escapeHtml(msgPreview)}</div>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; justify-content:center; align-self:center; gap:6px;">
                    <button type="button" onclick="enviarLembreteIndividualHoje('${ag.id}')" class="btn" style="background:#dcfce7; color:#166534; border:1px solid #86efac; font-weight:800; font-size:0.75rem; padding:6px 10px; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; gap:4px; white-space:nowrap;" title="Abrir e enviar no WhatsApp individualmente">
                        <i class="fa-brands fa-whatsapp" style="font-size:0.95rem; color:#22c55e;"></i> Abrir WhatsApp
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    updateLembretesHojeCounter();
}

function updateLembretesHojeCounter() {
    const checkboxes = document.querySelectorAll(".chk-lembrete-hoje");
    const checkedCount = Array.from(checkboxes).filter(c => c.checked).length;
    const counterEl = document.getElementById("lembretesHojeCounter");
    if (counterEl) {
        counterEl.innerText = `${checkedCount} de ${checkboxes.length} lembrete(s) selecionado(s)`;
    }
}

function toggleSelectAllLembretesHoje(isChecked) {
    const checkboxes = document.querySelectorAll(".chk-lembrete-hoje");
    checkboxes.forEach(c => c.checked = isChecked);
    updateLembretesHojeCounter();
}

function closeDispararLembretesHojeModal() {
    if (document.activeElement) document.activeElement.blur();
    const modal = document.getElementById("modalDispararLembretesHoje");
    if (modal) modal.style.display = "none";
}

async function enviarLembreteIndividualHoje(agId) {
    const todos = sigeDB.getAgendamentosOP() || [];
    const ag = todos.find(a => a.id === agId);
    if (!ag) return;

    const selectPhone = document.getElementById(`selectPhone_${agId}`);
    const phoneNum = selectPhone ? selectPhone.value : (ag.telefone || "");
    const cleanPhone = phoneNum.replace(/[^\d]/g, '');

    if (!cleanPhone || cleanPhone.length < 8) {
        showToast("Número de telefone inválido para o aluno.", "error");
        return;
    }

    const dataFmt = formatDateBR(ag.data);
    let linkConfirm = `https://elcortelini.github.io/escola/confirmar-presenca.html?id=${ag.id}`;
    if (typeof sigeDB !== 'undefined' && sigeDB.criarTokenConfirmacao) {
        try {
            const token = await sigeDB.criarTokenConfirmacao(ag.id);
            if (token) {
                linkConfirm = `https://elcortelini.github.io/escola/confirmar-presenca.html?token=${token}`;
            }
        } catch (e) {
            console.warn("Aviso ao criar token individual:", e);
        }
    }
    const customText = `🤖 [Lembrete Automático HOJE] Olá ${ag.responsavel || 'Família'}! Lembramos do atendimento do estudante ${ag.aluno} (${ag.turma || ''}) agendado para HOJE, ${dataFmt} às ${ag.horario} com a Orientação Educacional (CE Pedro Rizzi).\n\n👇 *Por favor, confirme sua presença clicando no link abaixo:*\n${linkConfirm}`;

    const remetenteInst = (typeof sigeDB !== 'undefined' && sigeDB.getActiveWhatsappInstance()) || "sige_orientacao";

    // 1. Se a Evolution API estiver configurada, envia silenciosamente em 1 clique
    if (typeof evolutionClient !== 'undefined' && evolutionClient.isConfigured()) {
        const check = await evolutionClient.checkConnectionState(remetenteInst);
        if (!check.connected) {
            openModalQrCodeWhatsApp(remetenteInst);
            showToast(`📱 Conecte o WhatsApp da escola antes de disparar.`, "warning");
            return;
        }

        showToast(`⏳ Enviando mensagem direta para ${ag.aluno}...`, "info");
        const sendRes = await evolutionClient.sendText(cleanPhone, customText, { instanceName: remetenteInst });

        if (sendRes.success) {
            sigeDB.logWhatsappDispatch(ag.id, {
                tipo: "🤖 Lembrete Automático do Dia",
                mensagem: customText,
                modo: "individual_silencioso",
                status: "sucesso",
                destinatario: phoneNum,
                instancia: remetenteInst
            });
            showToast(`✅ MENSAGEM ENVIADA para ${ag.aluno}!`, "success");
            return;
        } else {
            showToast(`⚠️ Falha no envio via Evolution API: ${sendRes.error}`, "error");
            if (confirm(`Não foi possível enviar via Evolution API (${sendRes.error}). Deseja abrir a aba do WhatsApp Web tradicional como alternativa?`)) {
                const waNum = cleanPhone.startsWith('55') ? cleanPhone : ('55' + cleanPhone);
                window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(customText)}`, "_blank");
            }
            return;
        }
    }

    // Fallback: Se não tiver Evolution API configurada, usa link web tradicional
    sigeDB.logWhatsappDispatch(ag.id, {
        tipo: "🤖 Lembrete Automático do Dia",
        mensagem: customText,
        modo: "individual_modal",
        status: "sucesso",
        destinatario: phoneNum
    });

    const waNum = cleanPhone.startsWith('55') ? cleanPhone : ('55' + cleanPhone);
    const waUrl = `https://wa.me/${waNum}?text=${encodeURIComponent(customText)}`;
    window.open(waUrl, "_blank");
    showToast(`📲 Lembrete registrado e WhatsApp aberto para ${ag.aluno}!`, "success");
}

async function confirmarEnviarLembretesHoje() {
    const todosAtendimentos = sigeDB.getAgendamentosOP() || [];
    const checkboxes = document.querySelectorAll(".chk-lembrete-hoje:checked");

    if (checkboxes.length === 0) {
        showToast("Nenhum atendimento selecionado para disparo.", "warning");
        return;
    }

    const remetenteInst = (typeof sigeDB !== 'undefined' && sigeDB.getActiveWhatsappInstance()) || "sige_orientacao";

    // Se estiver usando Evolution API, valida a conexão antes de iniciar
    const usandoEvolution = typeof evolutionClient !== 'undefined' && evolutionClient.isConfigured();
    if (usandoEvolution) {
        const check = await evolutionClient.checkConnectionState(remetenteInst);
        if (!check.connected) {
            openModalQrCodeWhatsApp(remetenteInst);
            showToast(`📱 Conecte o WhatsApp da escola antes de iniciar a fila.`, "warning");
            return;
        }
    }

    const itemsParaEnviar = [];
    for (const chk of Array.from(checkboxes)) {
        const agId = chk.getAttribute("data-id");
        const ag = todosAtendimentos.find(a => String(a.id) === String(agId) || (a.agendamentoId && String(a.agendamentoId) === String(agId)));
        if (ag) {
            const selectPhone = document.getElementById(`selectPhone_${agId}`);
            const phoneNum = selectPhone ? selectPhone.value : (ag.telefone || "");
            const cleanPhone = phoneNum.replace(/[^\d]/g, '');
            const dataFmt = formatDateBR(ag.data);
            let linkConfirm = `https://elcortelini.github.io/escola/confirmar-presenca.html?id=${ag.id}`;
            if (typeof sigeDB !== 'undefined' && sigeDB.criarTokenConfirmacao) {
                try {
                    const token = await sigeDB.criarTokenConfirmacao(ag.id);
                    if (token) {
                        linkConfirm = `https://elcortelini.github.io/escola/confirmar-presenca.html?token=${token}`;
                    }
                } catch (e) {
                    console.warn(`[Lembrete Auto] Aviso ao gerar token para agendamento ${ag.id}:`, e);
                }
            }
            const textAuto = `🤖 [Lembrete Automático HOJE] Olá ${ag.responsavel || 'Família'}! Lembramos do atendimento do estudante ${ag.aluno} (${ag.turma || ''}) agendado para HOJE, ${dataFmt} às ${ag.horario} com a Orientação Educacional (CE Pedro Rizzi).\n\n👇 *Por favor, confirme sua presença clicando no link abaixo:*\n${linkConfirm}`;

            itemsParaEnviar.push({
                agId: ag.id,
                aluno: ag.aluno,
                responsavel: ag.responsavel,
                telefone: phoneNum,
                cleanPhone: cleanPhone,
                texto: textAuto
            });
        }
    }

    if (itemsParaEnviar.length === 0) {
        showToast("⚠️ Nenhum telefone válido encontrado nos atendimentos selecionados.", "warning");
        return;
    }

    // Modo 1: Disparo Silencioso em Fila Automática com Anti-Ban (Evolution API)
    if (usandoEvolution) {
        const btnEnviar = document.getElementById("btnDispararLembretesHoje");
        if (btnEnviar) {
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando Fila...`;
        }

        const sucessos = [];
        const falhas = [];

        for (let i = 0; i < itemsParaEnviar.length; i++) {
            const item = itemsParaEnviar[i];
            const progTxt = `Enviando ${i + 1} de ${itemsParaEnviar.length} (${item.aluno})...`;
            showToast(`⏳ ${progTxt}`, "info");

            if (btnEnviar) {
                btnEnviar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${i + 1}/${itemsParaEnviar.length}`;
            }

            if (!item.cleanPhone || item.cleanPhone.length < 8) {
                falhas.push({
                    nome: item.aluno,
                    telefone: item.telefone || 'Sem número',
                    motivo: 'Telefone inválido ou incompleto'
                });
                continue;
            }

            const sendRes = await evolutionClient.sendText(item.cleanPhone, item.texto, { instanceName: remetenteInst });

            if (sendRes.success) {
                sigeDB.logWhatsappDispatch(item.agId, {
                    tipo: "🤖 Lembrete Automático do Dia",
                    mensagem: item.texto,
                    modo: "lote_automatico_evolution",
                    status: "sucesso",
                    destinatario: item.cleanPhone,
                    instancia: remetenteInst
                });
                sucessos.push({ nome: item.aluno, telefone: item.cleanPhone });
            } else {
                falhas.push({
                    nome: item.aluno,
                    telefone: item.cleanPhone,
                    motivo: sendRes.error || 'Erro no envio'
                });
            }

            // Intervalo de segurança anti-ban entre mensagens se houver próximo item
            if (i < itemsParaEnviar.length - 1) {
                const delayMs = evolutionClient.getRandomAntiBanDelayMs();
                await new Promise(r => setTimeout(r, delayMs));
            }
        }

        if (btnEnviar) {
            btnEnviar.disabled = false;
            btnEnviar.innerHTML = `<i class="fa-brands fa-whatsapp"></i> Enviar Lembretes`;
        }

        closeDispararLembretesHojeModal();
        exibirRelatorioDisparoWhatsApp(sucessos, falhas);

        setTimeout(() => {
            renderModuleOrientacaoPedagogica();
        }, 100);
        return;
    }

    // Modo 2: Fallback Tradicional abrindo abas wa.me
    closeDispararLembretesHojeModal();
    window.open(`https://wa.me/${itemsParaEnviar[0].cleanPhone}?text=${encodeURIComponent(itemsParaEnviar[0].texto)}`, "_blank");

    if (itemsParaEnviar.length === 1) {
        showToast(`📲 Lembrete registrado e WhatsApp aberto para ${itemsParaEnviar[0].aluno}!`, "success");
    } else {
        showToast(`📲 Abrindo conversas no WhatsApp para os ${itemsParaEnviar.length} selecionados...`, "info");
        itemsParaEnviar.slice(1).forEach((item, index) => {
            setTimeout(() => {
                window.open(`https://wa.me/${item.cleanPhone}?text=${encodeURIComponent(item.texto)}`, "_blank");
            }, (index + 1) * 800);
        });
        showToast(`✅ ${itemsParaEnviar.length} lembretes registrados e disparados no WhatsApp!`, "success");
    }

    setTimeout(() => {
        renderModuleOrientacaoPedagogica();
    }, 100);
}

window.reagendarAluno = reagendarAluno;
window.closeReagendarModal = closeReagendarModal;
window.autoSelectTurnoReagendamento = autoSelectTurnoReagendamento;
window.submitReagendamentoOP = submitReagendamentoOP;
window.aplicarTemplateMensagem = aplicarTemplateMensagem;
window.enviarMensagemPersonalizadaWhatsApp = enviarMensagemPersonalizadaWhatsApp;
window.dispararLembretesDoDiaAutomated = dispararLembretesDoDiaAutomated;
window.renderListLembretesHoje = renderListLembretesHoje;
window.updateLembretesHojeCounter = updateLembretesHojeCounter;
window.toggleSelectAllLembretesHoje = toggleSelectAllLembretesHoje;
window.closeDispararLembretesHojeModal = closeDispararLembretesHojeModal;
window.enviarLembreteIndividualHoje = enviarLembreteIndividualHoje;
window.confirmarEnviarLembretesHoje = confirmarEnviarLembretesHoje;

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
    const targetId = id || window.currentDetailAppointmentId || currentDetailAppointmentId;
    if (!targetId) {
        console.warn("⚠️ [excluirAgendamentoDirect]: Nenhum ID de agendamento fornecido.");
        return;
    }

    if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
    }

    const ags = (sigeDB.data && Array.isArray(sigeDB.data.agendamentosOP))
        ? sigeDB.data.agendamentosOP
        : (sigeDB.getAgendamentosOP() || []);
    const item = ags.find(a => String(a.id) === String(targetId));
    const nomeAluno = item ? item.aluno : 'este agendamento';

    // Verificação de isolamento por função/orientadora com suporte defensivo
    const logged = (typeof sigeDB !== 'undefined' && sigeDB.getLoggedUser) ? sigeDB.getLoggedUser() : null;
    const isMaster = (typeof sigeDB !== 'undefined' && typeof sigeDB.isDev === 'function' && sigeDB.isDev()) ||
                     (typeof sigeDB !== 'undefined' && typeof sigeDB.isDiretor === 'function' && sigeDB.isDiretor()) ||
                     (logged && (logged.isAdmin || logged.isSuperAdmin || logged.role === 'desenvolvedor' || logged.role === 'direcao' || logged.role === 'admin'));

    if (logged && !isMaster) {
        if (logged.role && (logged.role.startsWith("orientadora_") || logged.setor === "orientacao")) {
            if (item && !matchOrientadora(item, logged.nome) && !matchOrientadora(item, logged.id)) {
                alert("⚠️ Acesso restrito: Você só tem permissão para excluir os agendamentos da sua própria pauta.");
                return;
            }
        }
    }

    if (confirm(`Tem certeza que deseja EXCLUIR permanentemente o agendamento de "${nomeAluno}"?`)) {
        const deleted = sigeDB.deleteAgendamentoOP(targetId);
        if (deleted) {
            if (typeof closeVisaoDetalhadaDiaModal === "function") closeVisaoDetalhadaDiaModal();
            if (typeof closeDetalhesModal === "function") closeDetalhesModal();
            showToast(`Agendamento de "${nomeAluno}" excluído com sucesso!`, "success");

            setTimeout(() => {
                if (typeof renderAllModules === "function") {
                    renderAllModules();
                } else if (typeof renderModuleOrientacaoPedagogica === "function") {
                    renderModuleOrientacaoPedagogica();
                }
            }, 50);
        } else {
            alert("Erro ao excluir agendamento.");
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

    const todosAtendimentos = sigeDB.getAgendamentosOP() || [];
    let dateAppointments = todosAtendimentos.filter(a => 
        a.data === dateIso && a.statusSecretaria !== 'cancelado'
    );

    const orientadorasList = (typeof sigeDB !== 'undefined' && sigeDB.getOrientadoras) ? sigeDB.getOrientadoras() : [];
    let subTitleText = "Orientação Educacional (OE) — Relatório Diário de Atendimentos";
    let signaturesHtml = "";

    if (filterVal !== "todas") {
        dateAppointments = dateAppointments.filter(a => matchOrientadora(a, filterVal));
        const matchingOri = orientadorasList.find(o => matchOrientadora({ orientadora: o.nome }, filterVal));
        const displayOriName = matchingOri ? matchingOri.nome : filterVal;
        const displayOriCargo = (matchingOri && (matchingOri.turmasOuSalas || matchingOri.cargoFuncao)) ? (matchingOri.turmasOuSalas || matchingOri.cargoFuncao) : "Orientadora Educacional";
        subTitleText = `Orientação Educacional (OE) — Relatório Diário (${displayOriName})`;
        signaturesHtml = `
            <div class="sig-box" style="margin:0 auto; max-width:350px;">
                ${escapeHtml(displayOriName)}<br>${escapeHtml(displayOriCargo)}
            </div>
        `;
    } else {
        if (orientadorasList.length > 0) {
            signaturesHtml = orientadorasList.map(o => `
                <div class="sig-box">
                    ${escapeHtml(o.nome)}<br>${escapeHtml(o.turmasOuSalas || o.cargoFuncao || "Orientadora Educacional")}
                </div>
            `).join("");
        } else {
            signaturesHtml = `
                <div class="sig-box" style="margin:0 auto; max-width:350px;">
                    Orientação Educacional<br>Equipe Pedagógica
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
                    <img src="${sigeDB.getLogoEscola()}" alt="Logo Escola" style="max-height:55px; margin-right:12px; object-fit:contain;">
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
                            const oriNome = item.orientadora || 'Orientação Educacional';
                            const theme = getOrientadoraColorTheme(item.orientadora);
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
                                    <td class="orientadora-tag" style="color: ${theme.text}; font-weight: 800;">
                                        ${escapeHtml(oriNome)}
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

    const todosAtendimentos = sigeDB.getAgendamentosOP() || [];
    let dateAppointments = todosAtendimentos.filter(a => 
        a.data === dateIso && 
        a.statusSecretaria !== 'cancelado'
    );

    const filterOrientadoraSelect = document.getElementById("opFilterOrientadora");
    const filterVal = filterOrientadoraSelect ? filterOrientadoraSelect.value : "todas";

    if (filterVal !== "todas") {
        dateAppointments = dateAppointments.filter(a => matchOrientadora(a, filterVal));
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
            const theme = getOrientadoraColorTheme(item.orientadora);
            const oriNome = item.orientadora || 'Orientação Educacional';

            html += `
                <div style="background:white; border:2px solid ${theme.borderLeft}; border-radius:14px; padding:16px; box-shadow:0 4px 12px rgba(0,0,0,0.05); position:relative;">
                    
                    <!-- Header do Card Individual -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; border-bottom:1px solid #f1f5f9; padding-bottom:10px;">
                        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                            <span style="background:${theme.bg}; color:${theme.text}; border:1px solid ${theme.border}; font-weight:900; font-size:0.95rem; padding:4px 10px; border-radius:8px;">
                                <i class="fa-regular fa-clock"></i> ${item.horario || 'Horário a definir'} (${item.turno ? item.turno.toUpperCase() : 'MANHÃ'})
                            </span>
                            <span style="font-size:0.8rem; font-weight:800; color:${theme.text}; background:#f8fafc; padding:3px 8px; border-radius:6px; border:1px solid #e2e8f0;">
                                <i class="fa-solid fa-user-gear"></i> ${escapeHtml(oriNome)}
                            </span>
                        </div>
                        <div>
                            <select onchange="updateAgendamentoStatusDirect('${item.id}', this.value)" class="search-input" style="font-size:0.8rem; font-weight:800; padding:4px 8px; border-radius:8px; cursor:pointer;">
                                <option value="agendado" ${(!item.statusSecretaria || item.statusSecretaria === 'agendado') ? 'selected' : ''}>🔵 Agendado</option>
                                <option value="aguardando" ${item.statusSecretaria === 'aguardando' ? 'selected' : ''}>⏳ Aguardando na Recepção</option>
                                <option value="atendido" ${(item.statusSecretaria === 'atendido' || item.statusSecretaria === 'realizado') ? 'selected' : ''}>🟢 Atendido</option>
                                <option value="nao_veio" ${(item.statusSecretaria === 'nao_veio' || item.statusSecretaria === 'faltou') ? 'selected' : ''}>🔴 Não Veio</option>
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
                        <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp-direct" style="padding:6px 12px; font-size:0.8rem; text-decoration:none;">
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

// getSecretariaBadgeText unificada e declarada globalmente acima

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

// AUTOCOMPLETAR DE ALUNOS IMPORTADOS DO PDF
function updateAlunosDatalist() {
    const datalist = document.getElementById("datalistAlunosImportados");
    if (!datalist) return;
    const alunos = sigeDB.getAlunosImportados() || [];
    let html = "";
    alunos.forEach(a => {
        html += `<option value="${escapeHtml(a.nome)}">${escapeHtml(a.nome)} - Turma ${escapeHtml(a.turma)} (${escapeHtml(a.turno || 'Matutino')})</option>`;
    });
    datalist.innerHTML = html;
}

function renderAlunoPhoneBadges(telefones, currentPhone, nomeAluno, turmaAluno) {
    const phoneContainer = document.getElementById("alunoPhoneBadgesContainer");
    if (!phoneContainer) return;

    if (!telefones || telefones.length === 0) {
        phoneContainer.innerHTML = "";
        return;
    }

    const currentClean = (currentPhone || "").replace(/[^\d]/g, '');

    let badgeHtml = `
        <div style="font-size:0.78rem; font-weight:800; color:#166534; margin-top:6px; margin-bottom:4px; display:flex; align-items:center; gap:5px;">
            <i class="fa-brands fa-whatsapp" style="color:#22c55e; font-size:0.95rem;"></i> Telefones de Contato do Aluno (Clique para definir o Preferencial):
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
    `;

    telefones.forEach((p) => {
        const cleanDigits = p.replace(/[^\d]/g, '');
        const isSelected = currentClean && (cleanDigits === currentClean || currentClean.endsWith(cleanDigits) || cleanDigits.endsWith(currentClean));
        const waNum = cleanDigits.startsWith('55') ? cleanDigits : ('55' + cleanDigits);
        const defaultMsg = encodeURIComponent(`Olá! Entramos em contato a respeito do agendamento escolar do(a) aluno(a) ${nomeAluno || 'estudante'} (Turma ${turmaAluno || ''}).`);
        const waUrl = `https://wa.me/${waNum}?text=${defaultMsg}`;

        const bgStyle = isSelected 
            ? "background: #f0fdf4; border: 2px solid #22c55e; box-shadow: 0 2px 6px rgba(34,197,94,0.2);" 
            : "background: #f8fafc; border: 1px solid #cbd5e1;";

        const badgeIcon = isSelected 
            ? `<span style="background:#22c55e; color:white; padding:3px 8px; border-radius:12px; font-size:0.72rem; font-weight:800; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-circle-check"></i> Preferencial Selecionado</span>`
            : `<button type="button" onclick="selectModalPhone('${escapeHtml(p)}')" style="background:#e2e8f0; color:#334155; border:none; padding:3px 8px; border-radius:8px; font-size:0.72rem; font-weight:700; cursor:pointer;" title="Definir este número como preferencial para este agendamento">⚪ Definir como Preferencial</button>`;

        badgeHtml += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-radius:10px; ${bgStyle}">
                <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0; flex-wrap:wrap;">
                    <i class="fa-solid fa-phone" style="color:${isSelected ? '#166534' : '#64748b'}; font-size:0.9rem;"></i>
                    <span style="font-size:0.83rem; font-weight:800; color:${isSelected ? '#14532d' : '#334155'}; font-family:monospace;">${escapeHtml(p)}</span>
                    ${badgeIcon}
                </div>
                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; padding:4px 10px; border-radius:8px; font-size:0.75rem; font-weight:800; text-decoration:none; display:inline-flex; align-items:center; gap:5px; box-shadow:0 1px 4px rgba(16,185,129,0.3); margin-left:8px;" title="Testar / Abrir conversa no WhatsApp">
                    <i class="fa-brands fa-whatsapp"></i> WhatsApp
                </a>
            </div>
        `;
    });

    badgeHtml += `</div>`;
    phoneContainer.innerHTML = badgeHtml;
}

function autoCompleteAlunoData(nomeVal) {
    if (!nomeVal || !nomeVal.trim()) {
        const phoneContainer = document.getElementById("alunoPhoneBadgesContainer");
        if (phoneContainer) phoneContainer.innerHTML = "";
        return;
    }
    const cleanNome = nomeVal.trim().toLowerCase();
    const alunos = sigeDB.getAlunosImportados() || [];
    
    let found = alunos.find(a => (a.nome || "").toLowerCase() === cleanNome);
    if (!found) {
        found = alunos.find(a => (a.nome || "").toLowerCase().startsWith(cleanNome));
    }
    if (!found && cleanNome.length >= 3) {
        found = alunos.find(a => (a.nome || "").toLowerCase().includes(cleanNome));
    }

    if (found) {
        const inputTurma = document.getElementById("opInputTurma");
        const inputTurno = document.getElementById("opInputTurno");
        const inputTelefone = document.getElementById("opInputTelefone");

        if (inputTurma && found.turma) {
            inputTurma.value = found.turma;
        }

        if (inputTurno && found.turno) {
            inputTurno.value = found.turno.toLowerCase();
        }

        if (found.telefones && found.telefones.length > 0) {
            if (inputTelefone && (!inputTelefone.value || inputTelefone.value.trim() === "")) {
                inputTelefone.value = found.telefones[0];
                if (typeof updateModalWhatsAppPreview === "function") updateModalWhatsAppPreview();
            }

            renderAlunoPhoneBadges(found.telefones, inputTelefone ? inputTelefone.value : "", found.nome, found.turma);
        } else {
            const phoneContainer = document.getElementById("alunoPhoneBadgesContainer");
            if (phoneContainer) phoneContainer.innerHTML = "";
        }
    }
}

function selectModalPhone(phoneStr) {
    const inputTelefone = document.getElementById("opInputTelefone");
    if (inputTelefone) {
        inputTelefone.value = phoneStr;
        if (typeof updateModalWhatsAppPreview === "function") updateModalWhatsAppPreview();
    }
    const inputAluno = document.getElementById("opInputAluno");
    if (inputAluno && inputAluno.value) {
        autoCompleteAlunoData(inputAluno.value);
    }
}

function onTelefoneInputChange() {
    if (typeof updateModalWhatsAppPreview === "function") updateModalWhatsAppPreview();
    const inputAluno = document.getElementById("opInputAluno");
    if (inputAluno && inputAluno.value) {
        autoCompleteAlunoData(inputAluno.value);
    }
}

function openDirectCustomWhatsApp() {
    const inputTelefone = document.getElementById("opInputTelefone");
    const alunoInput = document.getElementById("opInputAluno");
    const turmaInput = document.getElementById("opInputTurma");

    if (!inputTelefone || !inputTelefone.value.trim()) {
        alert("Por favor, digite um número de telefone no campo de contato.");
        return;
    }

    const rawPhone = inputTelefone.value.trim();
    const cleanDigits = rawPhone.replace(/[^\d]/g, '');
    if (cleanDigits.length < 8) {
        alert("Por favor, digite um número de telefone válido com DDD.");
        return;
    }

    const waNum = cleanDigits.startsWith('55') ? cleanDigits : ('55' + cleanDigits);
    const alunoNome = alunoInput ? alunoInput.value.trim() : "aluno";
    const turmaNome = turmaInput ? turmaInput.value.trim() : "";
    const msgText = encodeURIComponent(`Olá! Entramos em contato a respeito do agendamento escolar do(a) aluno(a) ${alunoNome} ${turmaNome ? '(Turma ' + turmaNome + ')' : ''}.`);
    
    window.open(`https://wa.me/${waNum}?text=${msgText}`, '_blank');
}

function confirmarLimparAlunosImportados() {
    if (confirm("⚠️ Tem certeza que deseja EXCLUIR TODOS OS ALUNOS da base de dados?\n\nOs alunos passarão a ser digitados manualmente em cada agendamento.")) {
        sigeDB.clearAlunosImportados();
        updateAlunosDatalist();
        showToast("🗑️ Todos os alunos cadastrados na base foram excluídos com sucesso!", "success");
        setTimeout(() => {
            renderModuleOrientacaoPedagogica();
            if (typeof renderModuleAdministracao === "function") renderModuleAdministracao();
        }, 50);
    }
}

window.imprimirAtendimentosDoDia = imprimirAtendimentosDoDia;
window.abrirVisaoDetalhadaDoDia = abrirVisaoDetalhadaDoDia;
window.closeVisaoDetalhadaDiaModal = closeVisaoDetalhadaDiaModal;
window.updateAgendamentoStatusDirect = updateAgendamentoStatusDirect;
window.getSecretariaBadgeText = getSecretariaBadgeText;
window.openDirectCustomWhatsApp = openDirectCustomWhatsApp;
window.updateAlunosDatalist = updateAlunosDatalist;
window.autoCompleteAlunoData = autoCompleteAlunoData;
window.selectModalPhone = selectModalPhone;
window.onTelefoneInputChange = onTelefoneInputChange;
window.confirmarLimparAlunosImportados = confirmarLimparAlunosImportados;

// MODAL AGENDAMENTO OE
function openAgendamentoModal(dateIso = "", turno = "", tipo = "", orientadoraNome = "") {
    const modal = document.getElementById("modalAgendamentoOP");
    if (!modal) return;
    document.getElementById("formAgendamentoOP").reset();
    updateAlunosDatalist();

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
    if (!targetOri) {
        const activeOri = (typeof getOrientadoraByRole === 'function') ? getOrientadoraByRole(sigeDB.getRole()) : null;
        if (activeOri && activeOri.nome) {
            targetOri = activeOri.nome;
        }
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
    const rawAluno = document.getElementById("opInputAluno").value;
    const aluno = typeof cleanStudentName === 'function' ? cleanStudentName(rawAluno) : rawAluno.trim();
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

        if (document.activeElement && typeof document.activeElement.blur === "function") {
            document.activeElement.blur();
        }
        closeAgendamentoModal();
        showToast("✅ Agendamento de Orientação Educacional registrado com sucesso!");
        setTimeout(() => {
            renderModuleOrientacaoPedagogica();
            updateBadgesCounts();
            renderNotifications();
        }, 50);
    } catch (err) {
        alert(err.message);
    }
}

// ==========================================
// EDIÇÃO DE AGENDAMENTO OE
// ==========================================
let currentEditingAppointmentId = null;

function openEditarModal(id) {
    const targetId = id || window.currentDetailAppointmentId || currentDetailAppointmentId;
    if (!targetId) return;
    const ags = sigeDB.getAgendamentosOP() || [];
    const item = ags.find(a => String(a.id) === String(targetId) || (a.agendamentoId && String(a.agendamentoId) === String(targetId)));
    if (!item) return;

    currentEditingAppointmentId = item.id;

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
        if (elOri.options.length === 0) {
            const orientadoras = (typeof sigeDB !== 'undefined' && sigeDB.getOrientadoras) ? sigeDB.getOrientadoras() : [];
            let html = ``;
            orientadoras.forEach(o => {
                html += `<option value="${escapeHtml(o.nome)}">💛 ${escapeHtml(o.nome)}</option>`;
            });
            elOri.innerHTML = html;
        }
        let matchedVal = "";
        for (let i = 0; i < elOri.options.length; i++) {
            const optVal = elOri.options[i].value;
            if (optVal && item.orientadora && (optVal.toLowerCase().includes(item.orientadora.toLowerCase()) || item.orientadora.toLowerCase().includes(optVal.toLowerCase()))) {
                matchedVal = optVal;
                break;
            }
        }
        elOri.value = matchedVal || item.orientadora || (elOri.options[0] ? elOri.options[0].value : "");
    }

    const opPerfil = (typeof sigeDB !== 'undefined' && sigeDB.getCurrentOpPerfil) ? sigeDB.getCurrentOpPerfil() : 'none';
    if (elSts) {
        const optRealizado = elSts.querySelector('option[value="realizado"]');
        if (optRealizado) {
            optRealizado.disabled = (opPerfil === "recepcao");
            optRealizado.title = (opPerfil === "recepcao") ? "Conclusão privativa da Orientadora Educacional" : "";
        }
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
    if (!currentEditingAppointmentId) {
        showToast("⚠️ Agendamento de referência não localizado para salvar.", "warning");
        return false;
    }

    const ags = sigeDB.getAgendamentosOP() || [];
    const itemIndex = ags.findIndex(a => String(a.id) === String(currentEditingAppointmentId) || (a.agendamentoId && String(a.agendamentoId) === String(currentEditingAppointmentId)));
    if (itemIndex === -1) {
        showToast("⚠️ Agendamento não encontrado na lista atual.", "error");
        return false;
    }

    // Verificação de isolamento por função/orientadora
    const logged = (typeof sigeDB !== 'undefined' && sigeDB.getLoggedUser) ? sigeDB.getLoggedUser() : null;
    const existing = ags[itemIndex];
    const isMaster = (typeof sigeDB !== 'undefined' && typeof sigeDB.isDev === 'function' && sigeDB.isDev()) ||
                     (typeof sigeDB !== 'undefined' && typeof sigeDB.isDiretor === 'function' && sigeDB.isDiretor()) ||
                     (logged && (logged.isAdmin || logged.isSuperAdmin || logged.role === 'desenvolvedor' || logged.role === 'direcao' || logged.role === 'admin'));

    if (logged && !isMaster) {
        if (logged.role && (logged.role.startsWith("orientadora_") || logged.setor === "orientacao")) {
            if (existing && !matchOrientadora(existing, logged.nome) && !matchOrientadora(existing, logged.id)) {
                alert("⚠️ Acesso restrito: Você só tem permissão para editar os agendamentos da sua própria pauta.");
                return false;
            }
        }
    }

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

    if (!elAluno || !elAluno.value.trim()) {
        showToast("⚠️ Por favor, informe o nome do aluno/atendido.", "warning");
        return false;
    }
    if (!elData || !elData.value) {
        showToast("⚠️ Por favor, informe a data do atendimento.", "warning");
        return false;
    }

    const opPerfil = (typeof sigeDB !== 'undefined' && sigeDB.getCurrentOpPerfil) ? sigeDB.getCurrentOpPerfil() : 'none';
    if (opPerfil === "recepcao" && elSts && elSts.value === "realizado") {
        alert("⚠️ Ação restrita: Apenas a Orientadora Educacional pode concluir e registrar o atendimento como realizado.");
        return false;
    }

    let turno = ags[itemIndex].turno || "matutino";
    if (elHora && elHora.value) {
        const h = parseInt(elHora.value.split(":")[0], 10);
        turno = h < 12 ? "matutino" : "vespertino";
    }

    const agoraIso = new Date().toISOString();
    ags[itemIndex] = {
        ...ags[itemIndex],
        publico: elPub ? elPub.value : (ags[itemIndex].publico || "aluno"),
        aluno: elAluno ? (typeof cleanStudentName === 'function' ? cleanStudentName(elAluno.value) : elAluno.value.trim()) : ags[itemIndex].aluno,
        turma: elTurma ? elTurma.value.trim() : (ags[itemIndex].turma || ""),
        responsavel: elResp ? elResp.value.trim() : (ags[itemIndex].responsavel || ""),
        telefone: elTel ? elTel.value.trim() : (ags[itemIndex].telefone || ""),
        data: elData ? elData.value : ags[itemIndex].data,
        horario: elHora ? elHora.value : ags[itemIndex].horario,
        orientadora: elOri ? elOri.value : ags[itemIndex].orientadora,
        statusSecretaria: elSts ? elSts.value : ags[itemIndex].statusSecretaria,
        motivo: elMot ? elMot.value.trim() : (ags[itemIndex].motivo || ""),
        turno,
        atualizadoEm: agoraIso
    };

    if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
    }
    sigeDB.saveAgendamentosOP(ags);

    // Persistência direta em tempo real no Firestore mod_op
    if (sigeDB.firestore) {
        try {
            sigeDB.firestore.collection('sige_pedro_rizzi').doc('mod_op').set(
                { agendamentosOP: ags, lastSyncAt: agoraIso }, { merge: true }
            ).catch(err => console.warn("Aviso Firebase mod_op edit:", err));
        } catch(err) {
            console.warn("Aviso ao sincronizar edição no Firebase:", err);
        }
    }

    closeEditarModal();
    closeDetalhesModal();
    showToast("✅ Dados do agendamento editados e salvos com sucesso!", "success");
    setTimeout(() => {
        renderModuleOrientacaoPedagogica();
    }, 50);
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

    if (oriFiltro && oriFiltro !== "todas") {
        ags = ags.filter(a => matchOrientadora(a, oriFiltro));
    }

    ags.sort((a, b) => (a.data + (a.horario || "")).localeCompare(b.data + (b.horario || "")));
    return { ags, dataIni, dataFim, oriFiltro };
}

function gerarVisualizacaoRelatorioOP() {
    const container = document.getElementById("relatorioResultBody");
    if (!container) return;

    const { ags, dataIni, dataFim, oriFiltro } = getFiltradosRelatorio();

    const orientadorasList = (typeof sigeDB !== 'undefined' && sigeDB.getOrientadoras) ? sigeDB.getOrientadoras() : [];
    const total = ags.length;

    const countRealizados = ags.filter(a => a.statusSecretaria === 'realizado').length;
    const countAgendados = ags.filter(a => a.statusSecretaria === 'agendado').length;
    const countFaltas = ags.filter(a => a.statusSecretaria === 'faltou' || a.statusSecretaria === 'ausente').length;
    const countPendentes = ags.filter(a => a.statusSecretaria === 'pendente').length;

    const oriCardsHtml = orientadorasList.map((o, idx) => {
        const count = ags.filter(a => matchOrientadora(a, o.nome)).length;
        const theme = ORIENTADORA_PALETTE[idx % ORIENTADORA_PALETTE.length];
        const shortName = o.nome.split(" ")[0];
        return `
            <div style="background:${theme.bg}; border:1px solid ${theme.border}; padding:12px; border-radius:12px; text-align:center;">
                <div style="font-size:0.75rem; font-weight:800; color:${theme.text}; text-transform:uppercase;">${escapeHtml(shortName)}</div>
                <div style="font-size:1.8rem; font-weight:900; color:${theme.borderLeft}; margin-top:2px;">${count}</div>
            </div>
        `;
    }).join("");

    let html = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:16px;">
            <div style="background:#f0f9ff; border:1px solid #bae6fd; padding:12px; border-radius:12px; text-align:center;">
                <div style="font-size:0.75rem; font-weight:800; color:#0369a1; text-transform:uppercase;">TOTAL</div>
                <div style="font-size:1.8rem; font-weight:900; color:#0284c7; margin-top:2px;">${total}</div>
            </div>
            ${oriCardsHtml}
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
                        const oriNome = a.orientadora || 'Orientação Educacional';
                        const theme = getOrientadoraColorTheme(a.orientadora);
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
                                <td style="padding:8px; border:1px solid #e2e8f0; font-weight:700; color:${theme.text};">
                                    ${escapeHtml(oriNome)}
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

    const orientadorasList = (typeof sigeDB !== 'undefined' && sigeDB.getOrientadoras) ? sigeDB.getOrientadoras() : [];
    const total = ags.length;
    const countRealizados = ags.filter(a => a.statusSecretaria === 'realizado').length;
    const countAgendados = ags.filter(a => a.statusSecretaria === 'agendado').length;
    const countFaltas = ags.filter(a => a.statusSecretaria === 'faltou' || a.statusSecretaria === 'ausente').length;
    const countPendentes = ags.filter(a => a.statusSecretaria === 'pendente').length;

    const dataIniFormat = dataIni ? formatDateBR(dataIni) : 'Início';
    const dataFimFormat = dataFim ? formatDateBR(dataFim) : 'Atual';

    const oriStatsBoxes = orientadorasList.map((o, idx) => {
        const count = ags.filter(a => matchOrientadora(a, o.nome)).length;
        const theme = ORIENTADORA_PALETTE[idx % ORIENTADORA_PALETTE.length];
        const shortName = o.nome.split(" ")[0];
        return `
            <div class="stat-box">
                <div class="stat-num" style="color:${theme.text};">${count}</div>
                <div class="stat-label">${escapeHtml(shortName)}</div>
            </div>
        `;
    }).join("");

    let signaturesHtml = "";
    if (orientadorasList.length > 0) {
        signaturesHtml = orientadorasList.map(o => `
            <div class="sig-box">${escapeHtml(o.nome)}<br>${escapeHtml(o.turmasOuSalas || o.cargoFuncao || "Orientadora Educacional")}</div>
        `).join("");
    } else {
        signaturesHtml = `<div class="sig-box">Orientação Educacional<br>Equipe Pedagógica</div>`;
    }

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
                    <img src="${sigeDB.getLogoEscola()}" class="logo-img" alt="Logo Escola" style="object-fit:contain;">
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
                ${oriStatsBoxes}
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
                        const oriNome = a.orientadora || 'Orientação Educacional';
                        const theme = getOrientadoraColorTheme(a.orientadora);
                        return `
                            <tr>
                                <td><strong>${formatDateBR(a.data)}</strong><br>${a.horario || '-'}</td>
                                <td><strong>${a.aluno}</strong><br><span style="color:#64748b; font-size:9.5px;">Turma: ${a.turma || '-'}</span></td>
                                <td>${a.responsavel || '-'}<br><span style="color:#64748b; font-size:9.5px;">📞 ${a.telefone || '-'}</span></td>
                                <td style="font-weight:700; color:${theme.text};">${escapeHtml(oriNome)}</td>
                                <td style="font-style:italic;">"${a.motivo || '-'}"</td>
                                <td><span class="badge-status status-${a.statusSecretaria}">${getSecretariaBadgeText(a.statusSecretaria)}</span></td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>

            <div class="footer-signatures">
                ${signaturesHtml}
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
                    <img src="${sigeDB.getLogoEscola()}" class="logo-img" alt="Logo Escola" style="object-fit:contain;">
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
window.setOpViewMode = setOpViewMode;

// ==========================================
/**
 * supervisao.js - Módulo 3: Supervisão Pedagógica
 * Centro Educacional Pedro Rizzi
 */

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

window.setSupViewMode = setSupViewMode;

// ==========================================
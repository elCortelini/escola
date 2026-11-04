/**
 * direcao.js - Módulo 5: Direção & Gestão Executiva
 * Centro Educacional Pedro Rizzi
 */

// MÓDULO 5: DIREÇÃO & GESTÃO EXECUTIVA
// ==========================================

let currentDirSubTab = 'whatsapp';
let dirWhatsAppFiltroTag = 'todos';
let dirAlunoDossieAtual = null;
let dirAtaSelecionadaParaPrint = null;
let dirRelatorioCache = null;
let dirAtendViewMode = 'lista';

function setDirAtendViewMode(mode) {
    dirAtendViewMode = mode;
    const btnLista = document.getElementById("btnDirAtendViewLista");
    const btnRel = document.getElementById("btnDirAtendViewRelatorios");
    const contLista = document.getElementById("dirAtendListaViewContainer");
    const contRel = document.getElementById("dirAtendRelatoriosViewContainer");

    if (btnLista && btnRel) {
        if (mode === 'relatorios') {
            btnLista.classList.remove("active");
            btnRel.classList.add("active");
        } else {
            btnLista.classList.add("active");
            btnRel.classList.remove("active");
        }
    }

    if (contLista && contRel) {
        if (mode === 'relatorios') {
            contLista.style.display = "none";
            contRel.style.display = "block";
            renderDirRelatorios();
        } else {
            contLista.style.display = "block";
            contRel.style.display = "none";
            renderDirAtendimentos();
        }
    }
}

function switchDirSubTab(subTabId) {
    if (subTabId === 'avaliacao') {
        const win = window.open('dashboard.html', '_blank');
        if (win) win.focus();
        return;
    }
    if (subTabId === 'relatorios' || subTabId === 'atendimentos') {
        switchTab('op');
        return;
    }
    if (!subTabId || subTabId === 'dossie') {
        subTabId = 'whatsapp';
    }
    currentDirSubTab = subTabId;

    const btns = document.querySelectorAll(".dir-subtab-btn");
    const contents = document.querySelectorAll(".dir-subtab-content");

    btns.forEach(b => {
        if (b.dataset.dirsub === subTabId) {
            b.classList.add("active");
        } else {
            b.classList.remove("active");
        }
    });

    contents.forEach(c => {
        if (c.id === `dirSubTab_${subTabId}`) {
            c.classList.add("active");
        } else {
            c.classList.remove("active");
        }
    });

    // Sincroniza a aba ativa no menu principal superior
    const topTabBtns = document.querySelectorAll(".sige-tab-btn[data-dirsub]");
    if (topTabBtns.length > 0) {
        topTabBtns.forEach(b => {
            if (b.dataset.dirsub === subTabId) {
                b.classList.add("active");
            } else {
                b.classList.remove("active");
            }
        });
    }

    if (subTabId === 'whatsapp') renderDirWhatsApp();
    else if (subTabId === 'atas') renderDirLivroAta();
    else if (subTabId === 'calendario') renderDirCalendarioEscolar();
}

function renderModuleDirecao() {
    popularTurmasSelectsDirecao();
    popularDatalistAlunosDirecao();

    // Sincronia / Indicador Cloud
    const syncBadge = document.getElementById("dirSyncBadgeStatus");
    if (syncBadge) {
        if (sigeDB.isFirebaseConnected()) {
            syncBadge.innerHTML = `<i class="fa-solid fa-cloud-check"></i> Base em Tempo Real (Firebase)`;
            syncBadge.style.background = "#dcfce7";
            syncBadge.style.color = "#166534";
        } else {
            syncBadge.innerHTML = `<i class="fa-solid fa-database"></i> Modo Local (Cache)`;
            syncBadge.style.background = "#fef3c7";
            syncBadge.style.color = "#92400e";
        }
    }

    switchDirSubTab(currentDirSubTab || 'whatsapp');
}

function popularTurmasSelectsDirecao() {
    try {
        const turmas = (typeof sigeDB.getTurmasEscola === 'function') 
            ? sigeDB.getTurmasEscola() 
            : (typeof sigeDB.getTurmas === 'function' ? sigeDB.getTurmas() : []);
        const selects = [
            document.getElementById("dirAtendFilterTurma"),
            document.getElementById("dirRelTurmaSelect")
        ];

        selects.forEach(sel => {
            if (!sel || (sel.children && sel.children.length > 1) || (sel.options && sel.options.length > 1)) return;
            turmas.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t.nome;
                opt.textContent = `${t.nome} (${t.turno === 'matutino' ? 'Manhã' : 'Tarde'})`;
                sel.appendChild(opt);
            });
        });
    } catch (err) {
        console.warn("Aviso ao popular turmas da Direção:", err);
    }
}

function popularDatalistAlunosDirecao() {
    try {
        const datalist = document.getElementById("dirDossieAlunosDatalist");
        if (!datalist) return;
        datalist.innerHTML = "";

        const alunos = (typeof sigeDB.getAlunosImportados === 'function') ? sigeDB.getAlunosImportados() : [];
        const ops = (typeof sigeDB.getAgendamentosOP === 'function') ? sigeDB.getAgendamentosOP() : [];
        const nomesSet = new Set();

        alunos.forEach(a => { if (a && a.nome) nomesSet.add(a.nome); });
        ops.forEach(o => { if (o && o.aluno) nomesSet.add(o.aluno); });

        Array.from(nomesSet).sort().forEach(nome => {
            const opt = document.createElement("option");
            opt.value = nome;
            datalist.appendChild(opt);
        });
    } catch (err) {
        console.warn("Aviso ao popular datalist de alunos da Direção:", err);
    }
}

// ----------------------------------------------------
// SUB-ABA 1: ATENDIMENTOS DA ORIENTAÇÃO PEDAGÓGICA (OE)
// ----------------------------------------------------
function renderDirAtendimentos() {
    const totalOpElem = document.getElementById("dirStatTotalOP");
    const okSecElem = document.getElementById("dirStatOkSec");
    const okSecCountElem = document.getElementById("dirStatOkSecCount");
    const pendentesElem = document.getElementById("dirStatPendentesOP");
    const faltasElem = document.getElementById("dirStatFaltasOP");
    const tbody = document.getElementById("dirTableAtendimentosOEBody");
    const countInfo = document.getElementById("dirAtendCountInfo");

    if (!tbody) return;

    const allOp = sigeDB.getAgendamentosOP() || [];
    const realizedOp = allOp.filter(a => isStatusRealizado(a.statusSecretaria)).length;
    const faltasOp = allOp.filter(a => isStatusFalta(a.statusSecretaria)).length;
    const pendentesOp = allOp.filter(a => !isStatusRealizado(a.statusSecretaria) && !isStatusFalta(a.statusSecretaria) && !isStatusCancelado(a.statusSecretaria)).length;
    const pctOk = allOp.length > 0 ? Math.round((realizedOp / allOp.length) * 100) : 100;

    if (totalOpElem) totalOpElem.innerText = allOp.length;
    if (okSecElem) okSecElem.innerText = `${pctOk}%`;
    if (okSecCountElem) okSecCountElem.innerText = `${realizedOp} comparecimentos confirmados`;
    if (pendentesElem) pendentesElem.innerText = pendentesOp;
    if (faltasElem) faltasElem.innerText = faltasOp;

    // Filtros
    const busca = (document.getElementById("dirAtendFilterBusca")?.value || '').toLowerCase().trim();
    const turma = document.getElementById("dirAtendFilterTurma")?.value || '';
    const orientadora = document.getElementById("dirAtendFilterOrientadora")?.value || '';
    const status = document.getElementById("dirAtendFilterStatus")?.value || '';

    const filtrados = allOp.filter(a => {
        if (busca) {
            const matchAluno = (a.aluno || '').toLowerCase().includes(busca);
            const matchResp = (a.responsavel || '').toLowerCase().includes(busca);
            const matchMotivo = (a.motivo || '').toLowerCase().includes(busca);
            if (!matchAluno && !matchResp && !matchMotivo) return false;
        }
        if (turma && a.turma !== turma) return false;
        if (orientadora && !matchOrientadora(a, orientadora)) return false;
        if (status) {
            if (status === 'realizado' && !isStatusRealizado(a.statusSecretaria)) return false;
            if (status === 'falta' && !isStatusFalta(a.statusSecretaria)) return false;
            if (status === 'aguardando' && (isStatusRealizado(a.statusSecretaria) || isStatusFalta(a.statusSecretaria) || isStatusCancelado(a.statusSecretaria))) return false;
        }
        return true;
    });

    if (countInfo) {
        countInfo.innerText = `Mostrando ${filtrados.length} de ${allOp.length} atendimentos da OE`;
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding:2rem; text-align:center; color:#64748b;">
                    <i class="fa-solid fa-folder-open" style="font-size:1.8rem; color:#cbd5e1; margin-bottom:8px; display:block;"></i>
                    Nenhum atendimento encontrado com os filtros selecionados.
                </td>
            </tr>
        `;
        return;
    }

    // Ordena mais recentes primeiro
    const ordenados = [...filtrados].sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    tbody.innerHTML = ordenados.map(a => {
        const dataFmt = formatDateBR(a.data);
        let statusBadge = '';
        if (isStatusRealizado(a.statusSecretaria)) {
            statusBadge = `<span style="background:#dcfce7; color:#166534; padding:3px 8px; border-radius:12px; font-weight:800; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-check"></i> Compareceu</span>`;
        } else if (isStatusFalta(a.statusSecretaria)) {
            statusBadge = `<span style="background:#fee2e2; color:#991b1b; padding:3px 8px; border-radius:12px; font-weight:800; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-xmark"></i> Ausente / Não Veio</span>`;
        } else if (isStatusConfirmado(a.statusSecretaria)) {
            statusBadge = `<span style="background:#dbeafe; color:#1e40af; padding:3px 8px; border-radius:12px; font-weight:800; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-circle-check"></i> Confirmado (WhatsApp)</span>`;
        } else if (isStatusCancelado(a.statusSecretaria)) {
            statusBadge = `<span style="background:#f1f5f9; color:#64748b; padding:3px 8px; border-radius:12px; font-weight:800; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-ban"></i> Cancelado</span>`;
        } else {
            statusBadge = `<span style="background:#fef3c7; color:#92400e; padding:3px 8px; border-radius:12px; font-weight:800; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-clock"></i> Aguardando</span>`;
        }

        const safeAluno = (a.aluno || 'Estudante').replace(/'/g, "\\'");
        const safeFone = (a.telefone || '').replace(/\D/g, '');

        return `
            <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding:12px 16px; font-weight:600; color:#1e293b; cursor:pointer;" onclick="openDetalhesModal('${a.id}')" title="Clique para abrir os dados deste atendimento">
                    <div>${dataFmt}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${a.horario || ''} (${a.turno || ''})</div>
                </td>
                <td style="padding:12px 16px;">
                    <strong style="color:#0f172a; cursor:pointer; text-decoration:underline; text-decoration-color:#cbd5e1;" onclick="openDetalhesModal('${a.id}')" title="Clique para abrir os dados e deliberações deste atendimento">${a.aluno}</strong>
                    ${a.responsavel ? `<div style="font-size:0.75rem; color:#64748b;">Resp: ${a.responsavel}</div>` : ''}
                </td>
                <td style="padding:12px 16px;">
                    <span style="background:#f1f5f9; color:#334155; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:700;">${a.turma || '-'}</span>
                </td>
                <td style="padding:12px 16px; font-size:0.82rem; color:#475569;">
                    ${a.orientadora || 'Orientação'}
                </td>
                <td style="padding:12px 16px; font-size:0.82rem; color:#334155; max-width:200px; cursor:pointer;" onclick="openDetalhesModal('${a.id}')" title="Clique para abrir os dados deste atendimento">
                    <div style="font-weight:700; color:#0f172a;">${a.motivo || 'Atendimento Geral'}</div>
                    ${a.observacoes ? `<div style="font-size:0.75rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.observacoes}</div>` : ''}
                </td>
                <td style="padding:12px 16px;">
                    ${statusBadge}
                </td>
                <td style="padding:12px 16px; text-align:center;">
                    <div style="display:inline-flex; gap:6px; flex-wrap:wrap; justify-content:center;">
                        <button type="button" onclick="openDetalhesModal('${a.id}')" class="btn" style="background:#eff6ff; color:#1d4ed8; padding:5px 10px; font-size:0.75rem; font-weight:700; border-radius:6px; border:1px solid #bfdbfe; display:inline-flex; align-items:center; gap:5px; cursor:pointer;" title="Abrir Dados, Parecer e Deliberações deste Atendimento">
                            <i class="fa-solid fa-file-lines"></i> Ver Atendimento
                        </button>
                        <button type="button" onclick="openProntuarioModal('${safeAluno}')" class="btn" style="background:#f5f3ff; color:#6d28d9; padding:5px 9px; font-size:0.75rem; font-weight:700; border-radius:6px; border:1px solid #ddd6fe; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="Ver Prontuário e Histórico de Todos os Atendimentos deste Aluno">
                            <i class="fa-solid fa-folder-open"></i> Histórico
                        </button>
                        ${safeFone ? `
                            <button type="button" onclick="prepararDisparoWhatsAppFamiliar('${safeAluno}', '${safeFone}')" class="btn" style="background:#f0fdf4; color:#166534; padding:5px 9px; font-size:0.75rem; font-weight:700; border-radius:6px; border:1px solid #bbf7d0; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="Enviar WhatsApp Oficial para o Responsável">
                                <i class="fa-brands fa-whatsapp"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function resetDirAtendFiltros() {
    if (document.getElementById("dirAtendFilterBusca")) document.getElementById("dirAtendFilterBusca").value = "";
    if (document.getElementById("dirAtendFilterTurma")) document.getElementById("dirAtendFilterTurma").value = "";
    if (document.getElementById("dirAtendFilterOrientadora")) document.getElementById("dirAtendFilterOrientadora").value = "";
    if (document.getElementById("dirAtendFilterStatus")) document.getElementById("dirAtendFilterStatus").value = "";
    renderDirAtendimentos();
}

function selecionarAlunoParaDossie(nomeAluno) {
    if (typeof openProntuarioModal === 'function') {
        openProntuarioModal(nomeAluno);
    }
}
window.selecionarAlunoParaDossie = selecionarAlunoParaDossie;

// ----------------------------------------------------
// SUB-ABA 2: DOSSIÊ DO ALUNO (RAIO-X 360º)
// ----------------------------------------------------
function renderDirDossie() {
    if (dirAlunoDossieAtual) {
        renderDirDossieAluno(dirAlunoDossieAtual);
    }
}

function carregarDossieAlunoSelecionado() {
    const input = document.getElementById("dirDossieAlunoInput");
    const nome = input ? input.value.trim() : "";
    if (!nome) {
        showToast("Digite ou selecione o nome de um aluno para carregar o Dossiê.", "warning");
        return;
    }
    dirAlunoDossieAtual = nome;
    renderDirDossieAluno(nome);
}

function renderDirDossieAluno(nomeAluno) {
    const container = document.getElementById("dirDossieResultContainer");
    if (!container) return;

    const input = document.getElementById("dirDossieAlunoInput");
    if (input) input.value = nomeAluno;

    const alunos = sigeDB.getAlunosImportados() || [];
    const allOp = sigeDB.getAgendamentosOP() || [];
    const allUni = sigeDB.getPedidosUniformes ? sigeDB.getPedidosUniformes() : [];

    // Localiza registro cadastral do aluno
    const alunoCad = alunos.find(a => (a.nome || '').toLowerCase() === nomeAluno.toLowerCase()) || {
        nome: nomeAluno,
        turma: 'Turma sob verificação',
        matricula: 'N/D',
        telefones: []
    };

    // Filtra histórico de atendimentos e uniformes do estudante
    const atendimentosAluno = allOp.filter(a => (a.aluno || '').toLowerCase() === nomeAluno.toLowerCase());
    const uniformesAluno = allUni.filter(u => (u.aluno || '').toLowerCase() === nomeAluno.toLowerCase());

    const totalAtend = atendimentosAluno.length;
    const comparecidos = atendimentosAluno.filter(a => isStatusRealizado(a.statusSecretaria)).length;
    const faltas = atendimentosAluno.filter(a => isStatusFalta(a.statusSecretaria)).length;
    const pctPresenca = totalAtend > 0 ? Math.round((comparecidos / totalAtend) * 100) : 100;

    let html = `
        <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; box-shadow:var(--shadow-sm); overflow:hidden; margin-bottom:1.5rem;">
            <!-- Header do Estudante -->
            <div style="background:linear-gradient(135deg, #1e3a8a, #2563eb); color:white; padding:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:14px;">
                    <div style="width:54px; height:54px; background:rgba(255,255,255,0.2); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.8rem;">
                        🎓
                    </div>
                    <div>
                        <h3 style="font-size:1.35rem; font-weight:900; margin:0; letter-spacing:-0.3px;">${alunoCad.nome}</h3>
                        <div style="font-size:0.85rem; opacity:0.9; margin-top:2px; display:flex; gap:12px; flex-wrap:wrap;">
                            <span><i class="fa-solid fa-graduation-cap"></i> Turma: <strong>${alunoCad.turma || 'Não enturmado'}</strong></span>
                            ${alunoCad.matricula ? `<span><i class="fa-solid fa-id-badge"></i> Matrícula: <strong>${alunoCad.matricula}</strong></span>` : ''}
                        </div>
                    </div>
                </div>

                <div style="display:flex; gap:8px;">
                    <button type="button" onclick="openPrintDossieModal('${nomeAluno.replace(/'/g, "\\'")}')" class="btn" style="background:#ffffff; color:#1e3a8a; font-weight:800; font-size:0.85rem; padding:8px 16px; border-radius:10px; border:none; box-shadow:0 4px 10px rgba(0,0,0,0.15);">
                        <i class="fa-solid fa-print"></i> Imprimir Ficha 360º (PDF)
                    </button>
                </div>
            </div>

            <!-- Mini KPIs do Estudante -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; padding:1.2rem; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                <div style="background:white; padding:1rem; border-radius:12px; border:1px solid #cbd5e1; text-align:center;">
                    <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Chamadas pela OE</div>
                    <div style="font-size:1.8rem; font-weight:900; color:#2563eb; margin-top:2px;">${totalAtend}</div>
                    <div style="font-size:0.75rem; color:#94a3b8;">atendimentos registrados</div>
                </div>

                <div style="background:white; padding:1rem; border-radius:12px; border:1px solid #cbd5e1; text-align:center;">
                    <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Presença da Família</div>
                    <div style="font-size:1.8rem; font-weight:900; color:${pctPresenca >= 75 ? '#10b981' : '#ef4444'}; margin-top:2px;">${pctPresenca}%</div>
                    <div style="font-size:0.75rem; color:#94a3b8;">${comparecidos} presença(s) / ${faltas} falta(s)</div>
                </div>

                <div style="background:white; padding:1rem; border-radius:12px; border:1px solid #cbd5e1; text-align:center;">
                    <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Pedidos de Uniforme</div>
                    <div style="font-size:1.8rem; font-weight:900; color:#0284c7; margin-top:2px;">${uniformesAluno.length}</div>
                    <div style="font-size:0.75rem; color:#94a3b8;">solicitações pela secretaria</div>
                </div>
            </div>

            <!-- Corpo com Histórico de Atendimentos -->
            <div style="padding:1.5rem;">
                <h4 style="font-size:1.05rem; font-weight:800; color:#0f172a; margin-bottom:1rem; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-clock-rotate-left" style="color:#2563eb;"></i> Histórico de Convocatórias e Pareceres da Orientação
                </h4>

                ${atendimentosAluno.length === 0 ? `
                    <div style="padding:1.5rem; background:#f8fafc; border-radius:10px; text-align:center; color:#64748b; font-size:0.88rem;">
                        Nenhuma convocatória ou atendimento pedagógico registrado para este estudante.
                    </div>
                ` : `
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        ${atendimentosAluno.map(a => `
                            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid ${isStatusRealizado(a.statusSecretaria) ? '#10b981' : (isStatusFalta(a.statusSecretaria) ? '#ef4444' : (isStatusConfirmado(a.statusSecretaria) ? '#2563eb' : '#f59e0b'))}; border-radius:10px; padding:1rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px;">
                                    <div style="font-weight:800; color:#0f172a; font-size:0.95rem;">
                                        ${formatDateBR(a.data)} às ${a.horario || 'Horário agendado'} — ${a.orientadora || 'Orientadora'}
                                    </div>
                                    <span style="font-size:0.75rem; font-weight:800; padding:3px 8px; border-radius:10px; background:${isStatusRealizado(a.statusSecretaria) ? '#dcfce7' : (isStatusFalta(a.statusSecretaria) ? '#fee2e2' : (isStatusConfirmado(a.statusSecretaria) ? '#dbeafe' : '#fef3c7'))}; color:${isStatusRealizado(a.statusSecretaria) ? '#166534' : (isStatusFalta(a.statusSecretaria) ? '#991b1b' : (isStatusConfirmado(a.statusSecretaria) ? '#1e40af' : '#92400e'))};">
                                        ${isStatusRealizado(a.statusSecretaria) ? '✅ Compareceu' : (isStatusFalta(a.statusSecretaria) ? '❌ Falta Registrada' : (isStatusConfirmado(a.statusSecretaria) ? '🟢 Confirmado' : '⏳ Aguardando'))}
                                    </span>
                                </div>
                                <div style="font-size:0.85rem; color:#334155; margin-bottom:4px;">
                                    <strong>Motivo:</strong> ${a.motivo || 'Atendimento Geral'}
                                </div>
                                ${a.responsavel ? `<div style="font-size:0.8rem; color:#64748b;"><strong>Responsável Notificado:</strong> ${a.responsavel}</div>` : ''}
                                ${a.observacoes ? `<div style="font-size:0.82rem; color:#475569; background:white; padding:8px 10px; border-radius:6px; border:1px solid #cbd5e1; margin-top:6px;"><strong>Parecer da OE:</strong> ${a.observacoes}</div>` : ''}
                            </div>
                        `).join("")}
                    </div>
                `}

                <!-- Histórico de Uniformes do Estudante -->
                ${uniformesAluno.length > 0 ? `
                    <h4 style="font-size:1.05rem; font-weight:800; color:#0f172a; margin-top:1.5rem; margin-bottom:0.8rem; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-shirt" style="color:#0284c7;"></i> Histórico de Uniformes Escolares
                    </h4>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                            <thead style="background:#f1f5f9; text-align:left; color:#475569;">
                                <tr>
                                    <th style="padding:8px 12px;">Data Solicitação</th>
                                    <th style="padding:8px 12px;">Tipo / Estação</th>
                                    <th style="padding:8px 12px;">Tamanho</th>
                                    <th style="padding:8px 12px;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${uniformesAluno.map(u => `
                                    <tr style="border-bottom:1px solid #e2e8f0;">
                                        <td style="padding:8px 12px;">${formatDateBR(u.dataSolicitacao)}</td>
                                        <td style="padding:8px 12px;">${u.tipoItem === 'kit_completo' ? 'Kit Completo' : 'Peças Avulsas'} (${u.estacao || 'Verão'})</td>
                                        <td style="padding:8px 12px; font-weight:700;">Tam ${u.tamanho}</td>
                                        <td style="padding:8px 12px;">
                                            <span style="font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:10px; background:#f1f5f9;">${u.status || 'Registrado'}</span>
                                        </td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function openPrintDossieModal(alunoNome) {
    const modal = document.getElementById("modalPrintDossieAluno");
    const printArea = document.getElementById("printAreaDossieContent");
    if (!modal || !printArea) return;

    const alunos = sigeDB.getAlunosImportados() || [];
    const allOp = sigeDB.getAgendamentosOP() || [];
    const alunoCad = alunos.find(a => (a.nome || '').toLowerCase() === alunoNome.toLowerCase()) || { nome: alunoNome, turma: 'N/D' };
    const atendimentos = allOp.filter(a => (a.aluno || '').toLowerCase() === alunoNome.toLowerCase());

    printArea.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:16px;">
            <img src="${sigeDB.getLogoEscola()}" alt="Logo Escola" style="max-height:60px; object-fit:contain; margin-bottom:8px;">
            <h2 style="margin:0; font-size:1.3rem; text-transform:uppercase;">Centro Educacional Pedro Rizzi</h2>
            <div style="font-size:0.85rem; color:#475569;">Gabinete da Direção & Orientação Educacional — Itajaí / SC</div>
            <h3 style="margin:8px 0 0 0; font-size:1.1rem; color:#1e3a8a;">Prontuário Individual de Acompanhamento do Estudante</h3>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.88rem; background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #cbd5e1; margin-bottom:16px;">
            <div><strong>Nome do Aluno:</strong> ${alunoCad.nome}</div>
            <div><strong>Turma:</strong> ${alunoCad.turma || '-'}</div>
            <div><strong>Matrícula:</strong> ${alunoCad.matricula || '-'}</div>
            <div><strong>Data de Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>

        <h4 style="font-size:0.95rem; margin-bottom:8px; text-transform:uppercase;">Histórico de Atendimentos & Convocatórias da OE</h4>
        ${atendimentos.length === 0 ? `<p style="font-size:0.85rem; color:#64748b;">Nenhuma ocorrência registrada no sistema.</p>` : `
            <table style="width:100%; border-collapse:collapse; font-size:0.8rem; margin-bottom:24px;">
                <thead>
                    <tr style="background:#f1f5f9; text-align:left; border-bottom:1px solid #000;">
                        <th style="padding:6px;">Data</th>
                        <th style="padding:6px;">Orientadora</th>
                        <th style="padding:6px;">Motivo</th>
                        <th style="padding:6px;">Presença Família</th>
                        <th style="padding:6px;">Parecer da OE</th>
                    </tr>
                </thead>
                <tbody>
                    ${atendimentos.map(a => `
                        <tr style="border-bottom:1px solid #cbd5e1;">
                            <td style="padding:6px;">${formatDateBR(a.data)} ${a.horario || ''}</td>
                            <td style="padding:6px;">${a.orientadora || '-'}</td>
                            <td style="padding:6px;">${a.motivo || '-'}</td>
                            <td style="padding:6px;">${isStatusRealizado(a.statusSecretaria) ? 'Presente' : (isStatusFalta(a.statusSecretaria) ? 'Ausente' : (isStatusConfirmado(a.statusSecretaria) ? 'Confirmado' : 'Aguardando'))}</td>
                            <td style="padding:6px;">${a.observacoes || '-'}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `}

        <div style="margin-top:40px; display:flex; justify-content:space-between; text-align:center; font-size:0.82rem;">
            <div style="width:40%; border-top:1px solid #000; padding-top:6px;">
                Direção Escolar<br>Centro Educacional Pedro Rizzi
            </div>
            <div style="width:40%; border-top:1px solid #000; padding-top:6px;">
                Responsável pelo Estudante<br>Grau de Parentesco: _______________
            </div>
        </div>
    `;

    modal.style.display = "flex";
}

function closePrintDossieModal() {
    const modal = document.getElementById("modalPrintDossieAluno");
    if (modal) modal.style.display = "none";
}

// ----------------------------------------------------
// SUB-ABA 3: CENTRAL WHATSAPP DA DIREÇÃO & MENSAGERIA
// ----------------------------------------------------
let dirWpModoEnvio = 'multi'; // 'multi' ou 'individual'
let selectedWpTags = new Set(); // Conjunto de tags selecionadas para filtrar
let selectedWpContactIds = new Set(); // Conjunto de contatos selecionados para disparo
let dirWpFilaEnvio = []; // Array da fila guiada atual
let dirWpFilaIndexAtual = 0; // Posição atual na fila
let parsedCsvContactsPreview = []; // Contatos em espera de importação

function setDirWpModoEnvio(modo) {
    dirWpModoEnvio = modo;
    const btnMulti = document.getElementById("btnDirWpModoMulti");
    const btnInd = document.getElementById("btnDirWpModoIndividual");
    const indContainer = document.getElementById("dirWpCamposIndividualContainer");
    const btnDisparoText = document.getElementById("btnDirWpDisparoText");

    if (modo === 'individual') {
        if (btnMulti) btnMulti.classList.remove("active");
        if (btnInd) btnInd.classList.add("active");
        if (indContainer) indContainer.style.display = "block";
        if (btnDisparoText) btnDisparoText.textContent = "Abrir WhatsApp Web para Contato Avulso";
    } else {
        if (btnMulti) btnMulti.classList.add("active");
        if (btnInd) btnInd.classList.remove("active");
        if (indContainer) indContainer.style.display = "none";
        atualizarContadoresSelecaoWp();
    }
}

function renderDirWhatsApp() {
    renderDirWpTagsFilter();
    renderDirWhatsAppContatos();
    renderDirWhatsAppLogs();
    popularSelectTagsHistoricoWp();

    const textarea = document.getElementById("dirWpInputMensagem");
    if (textarea && !textarea.value.trim()) {
        aplicarTemplateWhatsAppDirecao();
    } else {
        atualizarPreviewMensagemWhatsApp();
    }
}

// Renderiza as tags dinâmicas como botões horizontais compactos (lado a lado e cores suaves)
function renderDirWpTagsFilter() {
    const container = document.getElementById("dirWpTagsBadgesContainer");
    if (!container) return;

    const allTags = sigeDB.getAllTagsContatos();
    const contatos = sigeDB.getContatosWhatsApp() || [];

    // Calcula contagem de contatos por tag
    const countsByTag = {};
    allTags.forEach(t => {
        countsByTag[t] = contatos.filter(c => {
            const cTags = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : []);
            return cTags.includes(t);
        }).length;
    });

    const isAllActive = selectedWpTags.size === 0;
    let html = `
        <button type="button" onclick="onDirWpTagToggle('__TODAS__')" class="dir-tag-chip ${isAllActive ? 'active' : ''}" title="Exibir todos os contatos">
            <span>🏷️ Todas</span> <span style="font-size:0.7rem; opacity:0.85;">(${contatos.length})</span>
        </button>
    `;

    allTags.forEach(tag => {
        const isSelected = selectedWpTags.has(tag);
        const count = countsByTag[tag] || 0;
        html += `
            <button type="button" onclick="onDirWpTagToggle('${tag.replace(/'/g, "\\'")}')" class="dir-tag-chip ${isSelected ? 'active' : ''}" title="Filtrar por ${tag}">
                <span>${tag}</span> <span style="font-size:0.7rem; opacity:0.85;">(${count})</span>
            </button>
        `;
    });

    container.innerHTML = html;
}

function onDirWpTagToggle(tag) {
    if (tag === '__TODAS__') {
        selectedWpTags.clear();
    } else {
        if (selectedWpTags.has(tag)) {
            selectedWpTags.delete(tag);
        } else {
            selectedWpTags.add(tag);
        }
    }
    renderDirWpTagsFilter();
    renderDirWhatsAppContatos();
}

function filtrarContatosListaPorTexto() {
    renderDirWhatsAppContatos();
}

// Renderiza a lista de contatos em linhas limpas e agradáveis
function formatTelefoneDisplay(tel) {
    if (!tel) return 'Não informado';
    const digits = String(tel).replace(/\D/g, '');
    if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return tel;
}
window.formatTelefoneDisplay = formatTelefoneDisplay;

function abrirConversaWhatsApp(telefone, nome = "") {
    const raw = (telefone || '').replace(/\D/g, '');
    if (raw.length < 10) {
        showToast("⚠️ Telefone incompleto ou não informado.", "warning");
        return;
    }
    const waPhone = raw.startsWith("55") ? raw : "55" + raw;
    const url = `https://api.whatsapp.com/send?phone=${waPhone}`;
    window.open(url, "_blank", "noopener,noreferrer");
}
window.abrirConversaWhatsApp = abrirConversaWhatsApp;

function renderDirWhatsAppContatos() {
    const container = document.getElementById("dirWpContatosListContainer");
    const visibleCountElem = document.getElementById("dirWpVisibleCount");
    const selectAllCheckbox = document.getElementById("dirWpCheckboxSelecionarTodos");

    if (!container) return;

    const contatos = sigeDB.getContatosWhatsApp() || [];
    const textoBusca = (document.getElementById("dirWpSearchContatosInput")?.value || '').toLowerCase().trim();

    // Filtra por tags selecionadas
    let filtrados = contatos.filter(c => {
        const cTags = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : []);
        if (selectedWpTags.size > 0) {
            const hasTag = Array.from(selectedWpTags).some(t => cTags.includes(t));
            if (!hasTag) return false;
        }
        if (textoBusca) {
            const matchNome = (c.nome || '').toLowerCase().includes(textoBusca);
            const matchFone = (c.telefone || '').includes(textoBusca);
            const matchCargo = (c.cargo || c.notas || '').toLowerCase().includes(textoBusca);
            const matchTags = cTags.some(t => t.toLowerCase().includes(textoBusca));
            if (!matchNome && !matchFone && !matchCargo && !matchTags) return false;
        }
        return true;
    });

    if (visibleCountElem) visibleCountElem.innerText = filtrados.length;

    // Atualiza estado do checkbox selecionar todos
    if (selectAllCheckbox) {
        const allVisibleSelected = filtrados.length > 0 && filtrados.every(c => selectedWpContactIds.has(c.id));
        selectAllCheckbox.checked = allVisibleSelected;
    }

    if (filtrados.length === 0) {
        container.innerHTML = `
            <div style="padding:2.5rem 1rem; text-align:center; color:#64748b; font-size:0.875rem; background:#f8fafc; border-radius:12px; border:1.5px dashed #cbd5e1;">
                <i class="fa-solid fa-filter" style="font-size:2rem; color:#94a3b8; margin-bottom:10px; display:block;"></i>
                Nenhum contato encontrado com as tags ou filtros selecionados.
            </div>
        `;
        atualizarContadoresSelecaoWp();
        return;
    }

    container.innerHTML = filtrados.map(c => {
        const isChecked = selectedWpContactIds.has(c.id);
        const tags = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : ['Geral']);
        const tagsHtml = tags.map(t => `<span style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:10px; display:inline-flex; align-items:center; gap:4px; white-space:nowrap;">🏷️ ${escapeHtml(t)}</span>`).join(" ");
        const tooltipInfo = tags.join(', ') + (c.notas ? ' — ' + c.notas : '') + (c.cargo ? ' (' + c.cargo + ')' : '');
        const telefoneRaw = (c.telefone || '').replace(/\D/g, "");
        const temTelefone = telefoneRaw.length >= 10;
        const telefoneFormatado = formatTelefoneDisplay(c.telefone);

        return `
            <div class="contact-row-card ${isChecked ? 'selected' : ''}">
                <div style="display:flex; align-items:center; justify-content:center;">
                    <input type="checkbox" onchange="toggleSelectContatoWp('${c.id}', this.checked)" ${isChecked ? 'checked' : ''} class="contact-checkbox-custom" aria-label="Selecionar ${escapeHtml(c.nome)}">
                </div>
                <div style="font-weight:700; font-size:0.875rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(c.nome)}">
                    ${escapeHtml(c.nome)}
                    ${c.cargo ? `<div style="font-size:0.75rem; color:#64748b; font-weight:500;">${escapeHtml(c.cargo)}</div>` : ''}
                </div>
                <div style="font-weight:700; font-size:0.85rem; color:${temTelefone ? '#334155' : '#94a3b8'}; white-space:nowrap; letter-spacing:0.3px; font-variant-numeric:tabular-nums;">
                    <i class="fa-solid fa-phone" style="font-size:0.75rem; color:#64748b; margin-right:4px;"></i>${escapeHtml(telefoneFormatado)}
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center; overflow:hidden;" title="${escapeHtml(tooltipInfo)}">
                    ${tagsHtml}
                </div>
                <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end;">
                    <button type="button" onclick="openDisparoAvisoProfessorModal('${c.id}')" class="dir-btn-icon" style="background:#dcfce7; color:#16a34a; border:1px solid #86efac; width:34px; height:34px;" title="Enviar Recado Rápido via WhatsApp">
                        <i class="fa-brands fa-whatsapp" style="font-size:1.1rem;"></i>
                    </button>
                    <button type="button" onclick="openEditarContatoWhatsAppModal('${c.id}')" class="dir-btn-icon edit" style="width:34px; height:34px;" title="Editar dados de ${escapeHtml(c.nome)}">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button type="button" onclick="excluirContatoWhatsApp('${c.id}')" class="dir-btn-icon danger" style="width:34px; height:34px;" title="Excluir contato ${escapeHtml(c.nome)}">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>
        `;
    }).join("");

    atualizarContadoresSelecaoWp();
}

function toggleSelectContatoWp(id, checked) {
    if (checked) {
        selectedWpContactIds.add(id);
    } else {
        selectedWpContactIds.delete(id);
    }
    atualizarContadoresSelecaoWp();
    renderDirWhatsAppContatos();
}

function toggleSelecionarTodosContatosWp(checked) {
    const contatos = sigeDB.getContatosWhatsApp() || [];
    const textoBusca = (document.getElementById("dirWpSearchContatosInput")?.value || '').toLowerCase().trim();

    const filtrados = contatos.filter(c => {
        const cTags = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : []);
        if (selectedWpTags.size > 0) {
            const hasTag = Array.from(selectedWpTags).some(t => cTags.includes(t));
            if (!hasTag) return false;
        }
        if (textoBusca) {
            const matchNome = (c.nome || '').toLowerCase().includes(textoBusca);
            const matchFone = (c.telefone || '').includes(textoBusca);
            const matchTags = cTags.some(t => t.toLowerCase().includes(textoBusca));
            if (!matchNome && !matchFone && !matchTags) return false;
        }
        return true;
    });

    if (checked) {
        filtrados.forEach(c => selectedWpContactIds.add(c.id));
    } else {
        filtrados.forEach(c => selectedWpContactIds.delete(c.id));
    }

    atualizarContadoresSelecaoWp();
    renderDirWhatsAppContatos();
}

function limparSelecaoContatosWp() {
    selectedWpContactIds.clear();
    atualizarContadoresSelecaoWp();
    renderDirWhatsAppContatos();
}

function atualizarContadoresSelecaoWp() {
    const count = selectedWpContactIds.size;
    const contadorElem = document.getElementById("dirWpSelecionadosContador");
    const btnTextElem = document.getElementById("btnDirWpDisparoText");

    if (contadorElem) contadorElem.innerText = count;
    if (btnTextElem && dirWpModoEnvio === 'multi') {
        btnTextElem.innerText = `🚀 Iniciar Fila de Disparo (${count} contato${count === 1 ? '' : 's'} selecionado${count === 1 ? '' : 's'})`;
    }
}

// Inserção de variáveis {nome} e {escola} no textarea
function inserirVariavelMensagemWp(variavel) {
    const textarea = document.getElementById("dirWpInputMensagem");
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;

    textarea.value = text.substring(0, startPos) + variavel + text.substring(endPos, text.length);
    textarea.focus();
    textarea.selectionStart = startPos + variavel.length;
    textarea.selectionEnd = startPos + variavel.length;

    atualizarPreviewMensagemWhatsApp();
}

// Prévia dinâmica com contagem de caracteres e substituição de tags
function atualizarPreviewMensagemWhatsApp() {
    const textarea = document.getElementById("dirWpInputMensagem");
    const previewContainer = document.getElementById("dirWpPreviewContainer");
    const charCountElem = document.getElementById("dirWpCharCount");

    if (!textarea || !previewContainer) return;

    const text = textarea.value || '';
    if (charCountElem) charCountElem.innerText = `${text.length} caracteres`;

    if (!text.trim()) {
        previewContainer.innerHTML = `<span style="color:#94a3b8; font-style:italic;">A prévia da mensagem aparecerá aqui após preencher o texto.</span>`;
        return;
    }

    // Pega o nome do primeiro contato selecionado ou um exemplo
    let sampleNome = 'Senhor(a) Responsável';
    if (selectedWpContactIds.size > 0) {
        const firstId = Array.from(selectedWpContactIds)[0];
        const c = sigeDB.getContatosWhatsApp().find(item => item.id === firstId);
        if (c) sampleNome = c.nome;
    } else if (document.getElementById("dirWpInputNome")?.value.trim()) {
        sampleNome = document.getElementById("dirWpInputNome").value.trim();
    }

    let previewText = text
        .replace(/{nome}/gi, `<strong>[${sampleNome}]</strong>`)
        .replace(/{escola}/gi, `<strong>Centro Educacional Pedro Rizzi</strong>`);

    previewContainer.innerHTML = previewText;
}

function aplicarTemplateWhatsAppDirecao() {
    const template = document.getElementById("dirWpTemplateSelect")?.value;
    const textarea = document.getElementById("dirWpInputMensagem");
    if (!textarea) return;

    const templatesMap = {
        convocacao_gabinete: `Olá, {nome}! Aqui é da Direção do Centro Educacional Pedro Rizzi.\nSolicitamos seu comparecimento à escola nesta semana para tratarmos do acompanhamento pedagógico e frequência escolar do(a) estudante.\nPor favor, confirme o recebimento desta mensagem e nos informe seu melhor dia e horário. Atenciosamente,\nDireção Escolar — {escola}`,
        lembrete_orientacao: `Prezado(a) {nome},\nLembramos que há um agendamento com a Orientação Educacional do {escola} programado para os próximos dias.\nSua presença é fundamental para o sucesso escolar do estudante. Contamos com você!\nAtenciosamente, Direção & Orientação.`,
        alerta_infrequencia: `Prezado(a) {nome},\nIdentificamos ausências reiteradas do estudante nos últimos dias letivos no {escola}. Lembramos que a frequência escolar é obrigatória por lei e essencial para a aprendizagem.\nSolicitamos justificativa ou contato urgente com a Direção Escolar pelo telefone (47) 3348-0000.`,
        comunicado_geral: `Comunicado Oficial da Direção — {escola}\nPrezado(a) {nome},\nInformamos à comunidade escolar que as atividades pedagógicas seguem conforme o cronograma oficial.\nQualquer dúvida estamos à disposição na secretaria da escola.\nAtenciosamente, Direção Escolar.`,
        personalizado: ""
    };

    if (templatesMap[template] !== undefined) {
        textarea.value = templatesMap[template];
        atualizarPreviewMensagemWhatsApp();
    }
}

// ==========================================
// GERADOR INTELIGENTE DE COMUNICADOS COM IA
// ==========================================
let iaTargetTextareaId = "dirWpInputMensagem";

function abrirModalGeradorIA(targetId = "dirWpInputMensagem") {
    iaTargetTextareaId = targetId || "dirWpInputMensagem";
    const modal = document.getElementById("modalGeradorIA");
    const inputPrompt = document.getElementById("iaInputPrompt");
    const targetEl = document.getElementById(iaTargetTextareaId) || document.getElementById("dirWpInputMensagem");
    const geminiInput = document.getElementById("iaGeminiApiKeyInput");

    if (geminiInput) {
        geminiInput.value = localStorage.getItem("sige_gemini_api_key") || "";
        geminiInput.onchange = (e) => {
            const val = e.target.value.trim();
            if (val) localStorage.setItem("sige_gemini_api_key", val);
            else localStorage.removeItem("sige_gemini_api_key");
        };
    }

    if (inputPrompt && targetEl) {
        inputPrompt.value = targetEl.value.trim();
    }

    if (modal) modal.style.display = "flex";
}
window.abrirModalGeradorIA = abrirModalGeradorIA;

function fecharModalGeradorIA() {
    const modal = document.getElementById("modalGeradorIA");
    if (modal) modal.style.display = "none";
}
window.fecharModalGeradorIA = fecharModalGeradorIA;

async function executarGeradorIA() {
    const promptInput = document.getElementById("iaInputPrompt");
    const tomSelect = document.getElementById("iaTomSelect");
    const statusMsg = document.getElementById("iaStatusMsg");
    const btnExecutar = document.getElementById("btnExecutarGeradorIA");
    const targetEl = document.getElementById(iaTargetTextareaId) || document.getElementById("dirWpInputMensagem");

    let draftText = promptInput ? promptInput.value.trim() : "";
    if (!draftText && targetEl) {
        draftText = targetEl.value.trim();
    }

    if (!draftText) {
        showToast("⚠️ Digite alguns tópicos ou uma ideia de mensagem antes de gerar com IA!");
        return;
    }

    const tom = tomSelect ? tomSelect.value : "formal";
    let tomInstrucao = "em tom oficial, claro e profissional";
    if (tom === "urgente") tomInstrucao = "em tom de convocação urgente, destacando data, hora e prazos improrrogáveis";
    else if (tom === "acolhedor") tomInstrucao = "em tom afetuoso, acolhedor e empático com pais e responsáveis";
    else if (tom === "direto") tomInstrucao = "de forma muito curta, objetiva e direta ao ponto, sem enrolação";
    else if (tom === "reuniao") tomInstrucao = "como convite oficial para reunião de pais/responsáveis na escola";

    const systemPrompt = `Você é o redator oficial de comunicações do Centro Educacional Pedro Rizzi. 
Sua tarefa é transformar o rascunho a seguir em uma mensagem de WhatsApp institucional impecável, ${tomInstrucao}.
Regras fundamentais:
1. Mantenha ou utilize as variáveis {nome} (para o nome do contato) e {escola} (para Centro Educacional Pedro Rizzi).
2. Use formatação do WhatsApp com moderação: negrito (*palavra*) para datas/locais importantes.
3. Responda APENAS com o texto final da mensagem pronto para envio. Não adicione saudações de IA como 'Aqui está sua mensagem:', nem aspas no início/fim, nem comentários extras.`;

    const userContent = `Rascunho/Dados: ${draftText}`;

    if (btnExecutar) {
        btnExecutar.disabled = true;
        btnExecutar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Gerando com IA...`;
    }
    if (statusMsg) {
        statusMsg.style.display = "block";
        statusMsg.style.background = "#eff6ff";
        statusMsg.style.color = "#1d4ed8";
        statusMsg.style.border = "1px solid #bfdbfe";
        statusMsg.innerText = "⏳ Conectando à IA e redigindo seu comunicado...";
    }

    try {
        let generatedText = "";
        const geminiKey = (document.getElementById("iaGeminiApiKeyInput")?.value.trim()) || localStorage.getItem("sige_gemini_api_key");

        if (geminiKey) {
            // Google Gemini 1.5 Flash (se houver chave configurada)
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${systemPrompt}\n\n${userContent}` }]
                    }]
                })
            });
            const data = await resp.json();
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                generatedText = data.candidates[0].content.parts[0].text.trim();
            } else {
                throw new Error("Resposta inválida da API Gemini");
            }
        } else {
            // Provedor de IA Gratuita Pública via Pollinations AI (sem chave necessária)
            const resp = await fetch("https://text.pollinations.ai/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userContent }
                    ],
                    model: "openai",
                    seed: Math.floor(Math.random() * 10000)
                })
            });
            if (!resp.ok) throw new Error(`Status ${resp.status}`);
            generatedText = (await resp.text()).trim();
        }

        if (generatedText.startsWith('"') && generatedText.endsWith('"')) {
            generatedText = generatedText.slice(1, -1).trim();
        }

        if (targetEl) {
            targetEl.value = generatedText;
            if (targetEl.id === "dirWpInputMensagem" && typeof atualizarPreviewMensagemWhatsApp === "function") {
                atualizarPreviewMensagemWhatsApp();
            }
        }

        showToast("✨ Comunicado gerado com sucesso pela IA!");
        fecharModalGeradorIA();
    } catch (err) {
        console.warn("Falha no provedor de IA remoto, aplicando estrutura inteligente local:", err);
        // Fallback inteligente offline
        let fallbackText = `Olá, {nome}!\n\n` +
            `Entramos em contato pelo Centro Educacional Pedro Rizzi para o seguinte comunicado:\n\n` +
            draftText.split('\n').map(l => l.trim() ? `• ${l.trim()}` : '').filter(Boolean).join('\n') +
            `\n\nContamos com a atenção e colaboração de todos.\nAtenciosamente,\nDireção Escolar — {escola}`;
        
        if (targetEl) {
            targetEl.value = fallbackText;
            if (targetEl.id === "dirWpInputMensagem" && typeof atualizarPreviewMensagemWhatsApp === "function") {
                atualizarPreviewMensagemWhatsApp();
            }
        }
        showToast("✨ Mensagem estruturada com sucesso!");
        fecharModalGeradorIA();
    } finally {
        if (btnExecutar) {
            btnExecutar.disabled = false;
            btnExecutar.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Gerar Mensagem com IA`;
        }
        if (statusMsg) statusMsg.style.display = "none";
    }
}
window.executarGeradorIA = executarGeradorIA;

// Disparo: Alterna entre Envio Individual e Fila Guiada
function executarAcaoDisparoWhatsApp() {
    const msg = document.getElementById("dirWpInputMensagem")?.value.trim();
    if (!msg) {
        showToast("Escreva o texto da mensagem antes de enviar.", "warning");
        return;
    }

    const remetenteInst = (typeof sigeDB !== 'undefined' && sigeDB.getActiveWhatsappInstance()) || "sige_orientacao";

    if (dirWpModoEnvio === 'individual') {
        const nome = document.getElementById("dirWpInputNome")?.value.trim();
        let fone = document.getElementById("dirWpInputTelefone")?.value.replace(/\D/g, '');

        if (!nome || !fone) {
            showToast("Informe o Nome e o WhatsApp do contato avulso.", "warning");
            return;
        }

        if (fone.length === 10 || fone.length === 11) fone = '55' + fone;

        const msgFinal = msg
            .replace(/{nome}/gi, nome)
            .replace(/{escola}/gi, "Centro Educacional Pedro Rizzi");

        // 1. Envio Silencioso via Evolution API (1 Clique)
        if (typeof evolutionClient !== 'undefined' && evolutionClient.isConfigured()) {
            (async () => {
                const check = await evolutionClient.checkConnectionState(remetenteInst);
                if (!check.connected) {
                    openModalQrCodeWhatsApp(remetenteInst);
                    showToast(`📱 Conecte o WhatsApp da escola antes de enviar.`, "warning");
                    return;
                }

                showToast(`⏳ Enviando mensagem direta para ${nome}...`, "info");
                const res = await evolutionClient.sendText(fone, msgFinal, { instanceName: remetenteInst });

                if (res.success) {
                    sigeDB.addMensagemWhatsAppLog({
                        contatoNome: nome,
                        telefone: fone,
                        tag: 'Avulso',
                        mensagem: msgFinal,
                        status: 'enviado',
                        instancia: remetenteInst
                    });
                    renderDirWhatsAppLogs();
                    showToast(`✅ MENSAGEM ENVIADA para ${nome}!`, "success");
                } else {
                    showToast(`⚠️ Falha no envio: ${res.error}`, "error");
                    if (confirm(`Não foi possível enviar via Evolution API (${res.error}). Deseja abrir a aba do WhatsApp Web tradicional?`)) {
                        window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msgFinal)}`, '_blank');
                    }
                }
            })();
            return;
        }

        // Fallback: Abre no WhatsApp Web
        window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msgFinal)}`, '_blank');

        sigeDB.addMensagemWhatsAppLog({
            contatoNome: nome,
            telefone: fone,
            tag: 'Avulso',
            mensagem: msgFinal,
            status: 'enviado'
        });

        renderDirWhatsAppLogs();
        showToast(`WhatsApp aberto para ${nome}! Registro de envio salvo.`);
    } else {
        // Envio em Lote (Multi-Contatos via Fila Guiada)
        if (selectedWpContactIds.size === 0) {
            showToast("Nenhum contato selecionado. Marque pelo menos um contato na lista.", "warning");
            return;
        }

        const allContatos = sigeDB.getContatosWhatsApp() || [];
        dirWpFilaEnvio = allContatos.filter(c => selectedWpContactIds.has(c.id));
        dirWpFilaIndexAtual = 0;

        iniciarFilaEnvioWhatsApp();
    }
}

// Disparo 100% Automático da Fila da Central de Contatos
let filaAutomatedCancelled = false;

async function iniciarDisparoFilaAutomatico() {
    if (!dirWpFilaEnvio || dirWpFilaEnvio.length === 0) {
        showToast("Nenhum contato na fila para disparo.", "warning");
        return;
    }

    const remetenteInst = (typeof sigeDB !== 'undefined' && sigeDB.getActiveWhatsappInstance()) || "sige_orientacao";

    if (typeof evolutionClient === 'undefined' || !evolutionClient.isConfigured()) {
        showToast("⚠️ Configure a Evolution API antes de usar o disparo automático.", "warning");
        return;
    }

    const check = await evolutionClient.checkConnectionState(remetenteInst);
    if (!check.connected) {
        openModalQrCodeWhatsApp(remetenteInst);
        showToast(`📱 Conecte o WhatsApp da escola antes de iniciar a fila.`, "warning");
        return;
    }

    const msgTemplate = document.getElementById("dirWpInputMensagem")?.value || '';
    if (!msgTemplate.trim()) {
        showToast("Digite a mensagem antes de disparar.", "warning");
        return;
    }

    const btnAutomated = document.getElementById("btnIniciarDisparoAutomatedFila");
    const statusBox = document.getElementById("statusFilaAutomatedBox");
    const statusTxt = document.getElementById("statusFilaAutomatedText");

    if (btnAutomated) btnAutomated.style.display = "none";
    if (statusBox) statusBox.style.display = "block";

    filaAutomatedCancelled = false;
    const sucessos = [];
    const falhas = [];
    const total = dirWpFilaEnvio.length;

    for (let i = dirWpFilaIndexAtual; i < total; i++) {
        if (filaAutomatedCancelled) {
            showToast("⏹️ Fila de envio interrompida pelo usuário.", "info");
            break;
        }

        dirWpFilaIndexAtual = i;
        renderFilaEnvioItemAtual();

        const c = dirWpFilaEnvio[i];
        let fone = (c.telefone || '').replace(/\D/g, '');
        if (fone.length === 10 || fone.length === 11) fone = '55' + fone;

        const msgFinal = msgTemplate
            .replace(/{nome}/gi, c.nome)
            .replace(/{escola}/gi, "Centro Educacional Pedro Rizzi");

        const tags = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : ['Geral']);

        if (statusTxt) {
            statusTxt.innerText = `Enviando ${i + 1} de ${total} para ${c.nome}...`;
        }

        if (!fone || fone.length < 10) {
            falhas.push({
                nome: c.nome,
                telefone: c.telefone || 'Sem número',
                motivo: 'Número de telefone inválido'
            });
            continue;
        }

        const res = await evolutionClient.sendText(fone, msgFinal, { instanceName: remetenteInst });

        if (res.success) {
            sigeDB.addMensagemWhatsAppLog({
                contatoNome: c.nome,
                telefone: fone,
                tag: tags[0] || 'Geral',
                mensagem: msgFinal,
                status: 'enviado',
                instancia: remetenteInst
            });
            sucessos.push({ nome: c.nome, telefone: fone });
        } else {
            falhas.push({
                nome: c.nome,
                telefone: fone,
                motivo: res.error || 'Erro de entrega'
            });
        }

        // Delay anti-ban seguro entre envios (se houver próximo)
        if (i < total - 1 && !filaAutomatedCancelled) {
            const delayMs = evolutionClient.getRandomAntiBanDelayMs();
            const delaySec = Math.round(delayMs / 1000);
            if (statusTxt) {
                statusTxt.innerText = `Aguardando ${delaySec}s (intervalo anti-bloqueio seguro)...`;
            }
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    if (btnAutomated) btnAutomated.style.display = "block";
    if (statusBox) statusBox.style.display = "none";

    fecharFilaEnvioWhatsApp();
    renderDirWhatsAppLogs();
    selectedWpContactIds.clear();
    atualizarContadoresSelecaoWp();
    renderDirWhatsAppContatos();

    exibirRelatorioDisparoWhatsApp(sucessos, falhas);
}

// ----------------------------------------------------
// FILA DE ENVIO GUIADA (ANTI-BLOQUEIO)
// ----------------------------------------------------
function iniciarFilaEnvioWhatsApp() {
    const modal = document.getElementById("modalFilaEnvioWhatsApp");
    if (!modal) return;

    modal.style.display = "flex";
    renderFilaEnvioItemAtual();
}

function fecharFilaEnvioWhatsApp() {
    const modal = document.getElementById("modalFilaEnvioWhatsApp");
    if (modal) modal.style.display = "none";
    renderDirWhatsAppLogs();
}

function renderFilaEnvioItemAtual() {
    if (dirWpFilaIndexAtual >= dirWpFilaEnvio.length) {
        fecharFilaEnvioWhatsApp();
        showToast(`🎉 Fila de envio concluída com sucesso! Todos os ${dirWpFilaEnvio.length} contatos foram processados.`, "success");
        selectedWpContactIds.clear();
        atualizarContadoresSelecaoWp();
        renderDirWhatsAppContatos();
        return;
    }

    const c = dirWpFilaEnvio[dirWpFilaIndexAtual];
    const total = dirWpFilaEnvio.length;
    const atualNum = dirWpFilaIndexAtual + 1;
    const pct = Math.round((atualNum / total) * 100);

    const progressoLabel = document.getElementById("dirWpFilaProgressoLabel");
    const restantesLabel = document.getElementById("dirWpFilaRestantesLabel");
    const progressBar = document.getElementById("dirWpFilaProgressBar");
    const nomeAtualElem = document.getElementById("dirWpFilaNomeAtual");
    const foneAtualElem = document.getElementById("dirWpFilaTelefoneAtual");
    const tagsAtualElem = document.getElementById("dirWpFilaTagsAtual");
    const previewFinalElem = document.getElementById("dirWpFilaMensagemFinalPreview");

    if (progressoLabel) progressoLabel.innerText = `Contato ${atualNum} de ${total} (${pct}%)`;
    if (restantesLabel) restantesLabel.innerText = `${total - atualNum} restantes`;
    if (progressBar) progressBar.style.width = `${pct}%`;

    if (nomeAtualElem) nomeAtualElem.innerText = c.nome;
    if (foneAtualElem) foneAtualElem.innerText = c.telefone;

    const tags = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : ['Geral']);
    if (tagsAtualElem) {
        tagsAtualElem.innerHTML = tags.map(t => `<span style="background:#dcfce7; color:#166534; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:8px;">🏷️ ${t}</span>`).join("");
    }

    const msgTemplate = document.getElementById("dirWpInputMensagem")?.value || '';
    const msgFinal = msgTemplate
        .replace(/{nome}/gi, c.nome)
        .replace(/{escola}/gi, "Centro Educacional Pedro Rizzi");

    if (previewFinalElem) previewFinalElem.innerText = msgFinal;
}

function dispararContatoAtualFilaWhatsApp() {
    if (dirWpFilaIndexAtual >= dirWpFilaEnvio.length) return;

    const c = dirWpFilaEnvio[dirWpFilaIndexAtual];
    let fone = (c.telefone || '').replace(/\D/g, '');
    if (fone.length === 10 || fone.length === 11) fone = '55' + fone;

    const msgTemplate = document.getElementById("dirWpInputMensagem")?.value || '';
    const msgFinal = msgTemplate
        .replace(/{nome}/gi, c.nome)
        .replace(/{escola}/gi, "Centro Educacional Pedro Rizzi");

    const tags = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : ['Geral']);

    // Abre o WhatsApp Web em nova aba
    window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msgFinal)}`, '_blank');

    // Registra no histórico
    sigeDB.addMensagemWhatsAppLog({
        contatoNome: c.nome,
        telefone: fone,
        tag: tags[0] || 'Geral',
        mensagem: msgFinal,
        status: 'enviado'
    });

    // Avança para o próximo
    dirWpFilaIndexAtual++;
    renderFilaEnvioItemAtual();
}

function pularContatoAtualFilaWhatsApp() {
    dirWpFilaIndexAtual++;
    renderFilaEnvioItemAtual();
}

// ----------------------------------------------------
// TABELA-MODELO & IMPORTAÇÃO / EXPORTAÇÃO CSV
// ----------------------------------------------------
function downloadModeloCSVContatos() {
    // CSV com delimitador ponto-e-vírgula e codificação UTF-8 BOM
    const cabecalho = "Nome;Telefone;Tags;Observacoes\r\n";
    const linhasExemplo = [
        "Mariana dos Santos;47999881122;Pais / Responsáveis, 3º Ano A;Mãe do aluno Lucas Santos",
        "Prof. Ricardo Alencar;47997665544;Equipe Docente, Matemática;Representante dos professores",
        "Carlos Roberto Silveira;47991223344;Conselho Escolar / APMF;Presidente da APMF",
        "Conselho Tutelar Central;47988332211;Conselho Tutelar / SME;Plantão de Atendimento Escolar",
        "Juliana Ribeiro;47994445566;Pais / Responsáveis, 5º Ano B;Responsável Financeira e Transporte"
    ].join("\r\n");

    const csvContent = "\uFEFF" + cabecalho + linhasExemplo;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tabela_modelo_contatos_escola.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Planilha modelo (.CSV) baixada com sucesso!", "success");
}

function exportarContatosParaCSV() {
    const contatos = sigeDB.getContatosWhatsApp() || [];
    if (contatos.length === 0) {
        showToast("Nenhum contato cadastrado para exportar.", "warning");
        return;
    }

    const cabecalho = "Nome;Telefone;Tags;Observacoes\r\n";
    const linhas = contatos.map(c => {
        const tags = Array.isArray(c.tags) ? c.tags.join(", ") : (c.tag || '');
        const safeNome = (c.nome || '').replace(/;/g, ',');
        const safeFone = (c.telefone || '').replace(/;/g, '');
        const safeTags = tags.replace(/;/g, '-');
        const safeNotas = (c.notas || '').replace(/;/g, ',');
        return `${safeNome};${safeFone};${safeTags};${safeNotas}`;
    }).join("\r\n");

    const csvContent = "\uFEFF" + cabecalho + linhas;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `contatos_direcao_pedro_rizzi_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Base com ${contatos.length} contatos exportada para CSV!`, "success");
}

function openImportarContatosCSVModal() {
    const modal = document.getElementById("modalImportarContatosCSV");
    if (!modal) return;
    parsedCsvContactsPreview = [];
    if (document.getElementById("dirWpImportCsvFileInput")) document.getElementById("dirWpImportCsvFileInput").value = "";
    if (document.getElementById("dirWpImportCsvTextarea")) document.getElementById("dirWpImportCsvTextarea").value = "";
    processarPreviaTextoCsv();
    modal.style.display = "flex";
}

function closeImportarContatosCSVModal() {
    const modal = document.getElementById("modalImportarContatosCSV");
    if (modal) modal.style.display = "none";
}

function handleCsvFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const texto = e.target.result;
        const textarea = document.getElementById("dirWpImportCsvTextarea");
        if (textarea) textarea.value = texto;
        processarPreviaTextoCsv();
    };
    reader.readAsText(file, "UTF-8");
}

async function carregarContatosGoogleSheet() {
    const input = document.getElementById("dirWpGoogleSheetUrlInput");
    if (!input) return;
    const url = input.value.trim();
    if (!url) {
        showToast("Cole o link da sua planilha do Google antes de carregar.", "warning");
        return;
    }

    // Extrai o ID da planilha
    const matchId = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!matchId || !matchId[1]) {
        alert("Link do Google Planilhas inválido. O link deve conter '/spreadsheets/d/ID_DA_PLANILHA/'");
        return;
    }
    const sheetId = matchId[1];

    // Extrai o gid (se houver)
    let gid = '0';
    const matchGid = url.match(/[#&?]gid=([0-9]+)/);
    if (matchGid && matchGid[1]) {
        gid = matchGid[1];
    }

    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const btn = document.getElementById("btnCarregarGoogleSheet");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Carregando...`;
    }

    try {
        const response = await fetch(csvExportUrl);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("A planilha está com acesso restrito no Google Drive.\n\nPara importar direto pelo link:\n1. Abra sua planilha no Google Sheets.\n2. Clique no botão azul 'Compartilhar' (canto superior direito).\n3. Em 'Acesso geral', mude de 'Restrito' para 'Qualquer pessoa com o link' (como Leitor).\n4. Clique em Concluído e tente novamente.");
            }
            throw new Error(`Erro HTTP ${response.status} ao acessar a planilha.`);
        }
        const text = await response.text();
        if (text.includes("<!DOCTYPE html") || text.includes("<html") || text.includes("accounts.google.com")) {
            throw new Error("A planilha requer login na sua Conta do Google.\n\nPara importar direto pelo link, altere o compartilhamento para 'Qualquer pessoa com o link' (Leitor) no Google Sheets.");
        }

        const textarea = document.getElementById("dirWpImportCsvTextarea");
        if (textarea) {
            textarea.value = text;
            processarPreviaTextoCsv();
        }
        showToast("Dados da planilha carregados com sucesso! Verifique a prévia abaixo.", "success");
    } catch (err) {
        alert(`Não foi possível carregar a planilha automaticamente:\n\n${err.message}\n\n💡 DICA RÁPIDA: Você também pode abrir a sua planilha no Google Sheets, selecionar as linhas de contatos, copiar (Ctrl+C) e colar diretamente na caixa de texto logo abaixo!`);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> Carregar Dados da Planilha`;
        }
    }
}

function processarPreviaTextoCsv() {
    const textarea = document.getElementById("dirWpImportCsvTextarea");
    const container = document.getElementById("dirWpCsvPreviewContainer");
    const countBadge = document.getElementById("dirWpCsvPreviewCount");
    const btnConfirmar = document.getElementById("btnConfirmarImportCsv");

    if (!textarea || !container) return;

    const raw = textarea.value.trim();
    if (!raw) {
        container.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:1.5rem;">Nenhum arquivo selecionado ou texto colado.</div>`;
        if (countBadge) countBadge.innerText = "0 contatos detectados";
        if (btnConfirmar) btnConfirmar.disabled = true;
        parsedCsvContactsPreview = [];
        return;
    }

    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
        parsedCsvContactsPreview = [];
        return;
    }

    // Detecta delimitador: tabulação (\t), ponto-e-vírgula (;) ou vírgula (,)
    const firstLine = lines[0];
    let delimitador = ';';
    if (firstLine.includes('\t')) delimitador = '\t';
    else if (firstLine.includes(';')) delimitador = ';';
    else if (firstLine.includes(',')) delimitador = ',';

    const parsedRows = lines.map(l => {
        let inQuotes = false;
        let token = '';
        const tokens = [];
        for (let i = 0; i < l.length; i++) {
            const char = l[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimitador && !inQuotes) {
                tokens.push(token.trim().replace(/^"|"$/g, ''));
                token = '';
            } else {
                token += char;
            }
        }
        tokens.push(token.trim().replace(/^"|"$/g, ''));
        return tokens;
    });

    let headerIdx = -1;
    let colNome = 0, colFone = 1, colTag = 2, colNotas = 3;

    // Detecta se a primeira linha é cabeçalho
    const firstRowLower = parsedRows[0].map(c => c.toLowerCase());
    const hasHeader = firstRowLower.some(c => 
        c.includes('nome') || c.includes('aluno') || c.includes('contato') || 
        c.includes('tel') || c.includes('whats') || c.includes('celular') || c.includes('fone')
    );

    if (hasHeader) {
        headerIdx = 0;
        firstRowLower.forEach((col, idx) => {
            if (col.includes('tel') || col.includes('whats') || col.includes('cel') || col.includes('fone')) {
                colFone = idx;
            } else if (col.includes('nome') || col.includes('aluno') || col.includes('responsáv') || col.includes('responsav') || col.includes('estudante') || col.includes('contato')) {
                colNome = idx;
            } else if (col.includes('tag') || col.includes('turma') || col.includes('ano') || col.includes('setor') || col.includes('grau')) {
                colTag = idx;
            } else if (col.includes('obs') || col.includes('nota') || col.includes('desc') || col.includes('recado')) {
                colNotas = idx;
            }
        });
    }

    const parsed = [];
    const startRow = headerIdx >= 0 ? headerIdx + 1 : 0;

    for (let i = startRow; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        const nome = row[colNome] || '';
        const rawFone = row[colFone] || '';
        const fone = rawFone.replace(/\D/g, '');
        const rawTag = (colTag >= 0 && row[colTag]) ? row[colTag] : 'Geral';
        const notas = (colNotas >= 0 && row[colNotas]) ? row[colNotas] : '';

        if (nome && fone && fone.length >= 8) {
            const tags = rawTag.split(/[,/]/).map(t => t.trim()).filter(Boolean);
            parsed.push({
                nome: nome,
                telefone: fone,
                tags: tags.length > 0 ? tags : ['Geral'],
                notas: notas
            });
        }
    }

    parsedCsvContactsPreview = parsed;

    if (countBadge) countBadge.innerText = `${parsed.length} contato${parsed.length === 1 ? '' : 's'} detectado${parsed.length === 1 ? '' : 's'}`;
    if (btnConfirmar) btnConfirmar.disabled = parsed.length === 0;

    if (parsed.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#ef4444; padding:1rem;">Nenhum contato válido encontrado. Certifique-se de que cada linha tenha Nome e Telefone.</div>`;
        return;
    }

    container.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.75rem;">
            <thead>
                <tr style="background:#e2e8f0; text-align:left; color:#1e293b;">
                    <th style="padding:6px;">#</th>
                    <th style="padding:6px;">Nome</th>
                    <th style="padding:6px;">Telefone</th>
                    <th style="padding:6px;">Tags</th>
                    <th style="padding:6px;">Observações</th>
                </tr>
            </thead>
            <tbody>
                ${parsed.map((c, i) => `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                        <td style="padding:4px 6px; color:#64748b;">${i + 1}</td>
                        <td style="padding:4px 6px; font-weight:700;">${c.nome}</td>
                        <td style="padding:4px 6px; color:#15803d;">${c.telefone}</td>
                        <td style="padding:4px 6px;">${c.tags.map(t => `<span style="background:#e0f2fe; color:#0369a1; padding:1px 4px; border-radius:4px; font-size:0.68rem; margin-right:3px;">${t}</span>`).join("")}</td>
                        <td style="padding:4px 6px; color:#64748b;">${c.notas || '-'}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function confirmarImportacaoCsvContatos() {
    if (parsedCsvContactsPreview.length === 0) return;

    const adicionados = sigeDB.addContatosEmLote(parsedCsvContactsPreview);
    closeImportarContatosCSVModal();
    renderDirWpTagsFilter();
    renderDirWhatsAppContatos();
    popularSelectTagsHistoricoWp();
    showToast(`Sucesso! ${adicionados} novos contatos foram importados para o sistema.`, "success");
}

// ----------------------------------------------------
// HISTÓRICO DE MENSAGENS COM FILTROS & RASTREAMENTO
// ----------------------------------------------------
function popularSelectTagsHistoricoWp() {
    const select = document.getElementById("dirWpHistFilterTag");
    if (!select) return;

    const valAtual = select.value;
    const tags = sigeDB.getAllTagsContatos();

    select.innerHTML = `<option value="">Todas as Tags</option>` + tags.map(t => `
        <option value="${t}">${t}</option>
    `).join("");

    select.value = valAtual;
}

function renderDirWhatsAppLogs() {
    const container = document.getElementById("dirWpLogListContainer");
    const badgeTotal = document.getElementById("dirWpTotalLogsBadge");
    if (!container) return;

    const logs = sigeDB.getMensagensWhatsAppLog() || [];

    // Filtros
    const dtInicio = document.getElementById("dirWpHistDataInicio")?.value;
    const dtFim = document.getElementById("dirWpHistDataFim")?.value;
    const tagFiltro = document.getElementById("dirWpHistFilterTag")?.value;
    const statusFiltro = document.getElementById("dirWpHistFilterStatus")?.value;
    const busca = (document.getElementById("dirWpHistFilterBusca")?.value || '').toLowerCase().trim();

    const filtrados = logs.filter(l => {
        if (dtInicio && l.enviadoEm) {
            const lData = l.enviadoEm.slice(0, 10);
            if (lData < dtInicio) return false;
        }
        if (dtFim && l.enviadoEm) {
            const lData = l.enviadoEm.slice(0, 10);
            if (lData > dtFim) return false;
        }
        if (tagFiltro && l.tag !== tagFiltro) return false;
        if (statusFiltro && (l.status || 'enviado') !== statusFiltro) return false;
        if (busca) {
            const matchNome = (l.contatoNome || '').toLowerCase().includes(busca);
            const matchFone = (l.telefone || '').includes(busca);
            const matchMsg = (l.mensagem || '').toLowerCase().includes(busca);
            if (!matchNome && !matchFone && !matchMsg) return false;
        }
        return true;
    });

    if (badgeTotal) badgeTotal.innerText = `${filtrados.length} de ${logs.length} registros`;

    if (filtrados.length === 0) {
        container.innerHTML = `
            <div style="padding:2.5rem 1rem; text-align:center; color:#64748b; font-size:0.85rem; background:#f8fafc; border-radius:10px; border:1px dashed #cbd5e1;">
                <i class="fa-solid fa-clock-rotate-left" style="font-size:1.8rem; color:#cbd5e1; margin-bottom:8px; display:block;"></i>
                Nenhum registro de mensagem enviado encontrado para os filtros selecionados.
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.83rem;">
            <thead>
                <tr style="background:#f1f5f9; text-align:left; color:#475569; border-bottom:1px solid #cbd5e1;">
                    <th style="padding:10px 12px;">Data / Hora</th>
                    <th style="padding:10px 12px;">Destinatário</th>
                    <th style="padding:10px 12px;">Tag</th>
                    <th style="padding:10px 12px;">Mensagem Enviada</th>
                    <th style="padding:10px 12px;">Status / Retorno</th>
                    <th style="padding:10px 12px; text-align:center;">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${filtrados.map(l => {
                    const status = l.status || 'enviado';
                    const dataFmt = formatDateBR(l.enviadoEm);
                    const horaFmt = l.enviadoEm ? new Date(l.enviadoEm).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '';
                    const safeFone = (l.telefone || '').replace(/\D/g, '');
                    const safeMsg = (l.mensagem || '').replace(/'/g, "\\'");

                    return `
                        <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                            <td style="padding:10px 12px; white-space:nowrap; color:#334155;">
                                <div style="font-weight:700;">${dataFmt}</div>
                                <div style="font-size:0.75rem; color:#64748b;">${horaFmt}</div>
                            </td>
                            <td style="padding:10px 12px;">
                                <strong style="color:#0f172a; display:block;">${l.contatoNome}</strong>
                                <span style="font-size:0.75rem; color:#15803d; font-weight:600;"><i class="fa-brands fa-whatsapp"></i> ${l.telefone}</span>
                            </td>
                            <td style="padding:10px 12px;">
                                <span style="background:#f1f5f9; color:#475569; font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:10px; border:1px solid #e2e8f0;">
                                    ${l.tag || 'Geral'}
                                </span>
                            </td>
                            <td style="padding:10px 12px; max-width:240px;">
                                <div style="color:#334155; font-size:0.78rem; line-height:1.35; max-height:48px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
                                    ${l.mensagem}
                                </div>
                            </td>
                            <td style="padding:10px 12px;">
                                <select onchange="alterarStatusLogWhatsApp('${l.id}', this.value)" style="font-size:0.75rem; font-weight:800; padding:3px 6px; border-radius:8px; border:1px solid #cbd5e1; cursor:pointer; background:${status === 'lido' ? '#dcfce7' : (status === 'nao_respondeu' ? '#fef3c7' : (status === 'falha' ? '#fee2e2' : '#eff6ff'))}; color:${status === 'lido' ? '#166534' : (status === 'nao_respondeu' ? '#92400e' : (status === 'falha' ? '#991b1b' : '#1e40af'))};">
                                    <option value="enviado" ${status === 'enviado' ? 'selected' : ''}>📤 Enviado</option>
                                    <option value="lido" ${status === 'lido' ? 'selected' : ''}>👁️ Lido / Confirmado</option>
                                    <option value="nao_respondeu" ${status === 'nao_respondeu' ? 'selected' : ''}>⏳ Não Respondeu</option>
                                    <option value="falha" ${status === 'falha' ? 'selected' : ''}>❌ Falha</option>
                                </select>
                            </td>
                            <td style="padding:10px 12px; text-align:center; white-space:nowrap;">
                                <div style="display:inline-flex; gap:6px;">
                                    <button type="button" onclick="reenviarMensagemLogWhatsApp('${safeFone}', '${safeMsg}')" class="btn" style="background:#dcfce7; color:#166534; font-size:0.75rem; padding:4px 8px; border-radius:6px; font-weight:700;" title="Abrir novamente no WhatsApp Web">
                                        <i class="fa-brands fa-whatsapp"></i> Reenviar
                                    </button>
                                    <button type="button" onclick="excluirMensagemLogWhatsApp('${l.id}')" class="btn" style="background:#fee2e2; color:#991b1b; font-size:0.75rem; padding:4px 8px; border-radius:6px;" title="Remover do Histórico">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>
    `;
}

function alterarStatusLogWhatsApp(id, novoStatus) {
    sigeDB.atualizarStatusMensagemLog(id, novoStatus);
    showToast("Status da mensagem atualizado com sucesso!");
    renderDirWhatsAppLogs();
}

function reenviarMensagemLogWhatsApp(fone, msg) {
    if (!fone) return;
    if (fone.length === 10 || fone.length === 11) fone = '55' + fone;
    window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function excluirMensagemLogWhatsApp(id) {
    if (confirm("Deseja remover este registro do histórico de mensagens?")) {
        sigeDB.deleteMensagemWhatsAppLog(id);
        renderDirWhatsAppLogs();
        showToast("Registro removido com sucesso.");
    }
}

function limparFiltrosHistoricoWhatsApp() {
    if (document.getElementById("dirWpHistDataInicio")) document.getElementById("dirWpHistDataInicio").value = "";
    if (document.getElementById("dirWpHistDataFim")) document.getElementById("dirWpHistDataFim").value = "";
    if (document.getElementById("dirWpHistFilterTag")) document.getElementById("dirWpHistFilterTag").value = "";
    if (document.getElementById("dirWpHistFilterStatus")) document.getElementById("dirWpHistFilterStatus").value = "";
    if (document.getElementById("dirWpHistFilterBusca")) document.getElementById("dirWpHistFilterBusca").value = "";
    renderDirWhatsAppLogs();
}

// ----------------------------------------------------
// CADASTRO & EDIÇÃO DE CONTATOS (COM SUPORTE MULTI-TAGS)
// ----------------------------------------------------
function openNovoContatoWhatsAppModal() {
    const modal = document.getElementById("modalNovoContatoWhatsApp");
    if (!modal) return;
    if (document.getElementById("wContInputId")) document.getElementById("wContInputId").value = "";
    if (document.getElementById("wContInputNome")) document.getElementById("wContInputNome").value = "";
    if (document.getElementById("wContInputTelefone")) document.getElementById("wContInputTelefone").value = "";
    if (document.getElementById("wContInputTags")) document.getElementById("wContInputTags").value = "";
    if (document.getElementById("wContInputNotas")) document.getElementById("wContInputNotas").value = "";
    if (document.getElementById("modalNovoContatoTitle")) document.getElementById("modalNovoContatoTitle").innerText = "Cadastrar Contato Oficial";
    if (document.getElementById("btnSalvarContatoText")) document.getElementById("btnSalvarContatoText").innerText = "Salvar Contato";
    modal.style.display = "flex";
}

function openEditarContatoWhatsAppModal(id) {
    const contatos = sigeDB.getContatosWhatsApp() || [];
    const c = contatos.find(item => item.id === id);
    if (!c) return;

    const modal = document.getElementById("modalNovoContatoWhatsApp");
    if (!modal) return;

    if (document.getElementById("wContInputId")) document.getElementById("wContInputId").value = c.id;
    if (document.getElementById("wContInputNome")) document.getElementById("wContInputNome").value = c.nome || '';
    if (document.getElementById("wContInputTelefone")) document.getElementById("wContInputTelefone").value = c.telefone || '';
    const tags = Array.isArray(c.tags) ? c.tags.join(", ") : (c.tag || '');
    if (document.getElementById("wContInputTags")) document.getElementById("wContInputTags").value = tags;
    if (document.getElementById("wContInputNotas")) document.getElementById("wContInputNotas").value = c.cargo || c.notas || '';
    if (document.getElementById("modalNovoContatoTitle")) document.getElementById("modalNovoContatoTitle").innerText = "Editar Contato";
    if (document.getElementById("btnSalvarContatoText")) document.getElementById("btnSalvarContatoText").innerText = "Atualizar Contato";
    modal.style.display = "flex";
}

function closeNovoContatoWhatsAppModal() {
    const modal = document.getElementById("modalNovoContatoWhatsApp");
    if (modal) modal.style.display = "none";
}

// ----------------------------------------------------
// GERENCIADOR DE TAGS DE CONTATOS (POP-UP MODAL)
// ----------------------------------------------------
function openGerenciarTagsModal() {
    const modal = document.getElementById("modalGerenciarTagsContatos");
    if (!modal) return;
    renderGerenciarTagsList();
    modal.style.display = "flex";
}

function closeGerenciarTagsModal() {
    const modal = document.getElementById("modalGerenciarTagsContatos");
    if (modal) modal.style.display = "none";
    renderDirWpTagsFilter();
    renderDirWhatsAppContatos();
    popularSelectTagsHistoricoWp();
}

function renderGerenciarTagsList() {
    const container = document.getElementById("listaGerenciarTagsContainer");
    if (!container) return;

    const allTags = sigeDB.getAllTagsContatos() || [];
    const contatos = sigeDB.getContatosWhatsApp() || [];

    if (allTags.length === 0) {
        container.innerHTML = `
            <div style="padding:1.5rem; text-align:center; color:#94a3b8; font-size:0.83rem;">
                Nenhuma tag cadastrada no momento. Adicione uma nova tag acima.
            </div>
        `;
        return;
    }

    container.innerHTML = allTags.map(tag => {
        const count = contatos.filter(c => {
            const cTags = Array.isArray(c.tags) ? c.tags : (c.tag ? [c.tag] : []);
            return cTags.includes(tag);
        }).length;

        return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="background:#e0f2fe; color:#0369a1; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:800;">
                        🏷️ ${escapeHtml(tag)}
                    </span>
                    <span style="font-size:0.75rem; color:#64748b;">
                        ${count} contato(s)
                    </span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button type="button" onclick="renomearTagContato('${tag.replace(/'/g, "\\'")}')" class="dir-btn-icon" style="min-width:28px; width:28px; height:28px; padding:0; font-size:0.75rem; border-radius:6px; background:#f1f5f9; color:#0284c7; border:none; cursor:pointer;" title="Renomear tag">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" onclick="excluirTagContato('${tag.replace(/'/g, "\\'")}')" class="dir-btn-icon" style="min-width:28px; width:28px; height:28px; padding:0; font-size:0.75rem; border-radius:6px; background:#fee2e2; color:#dc2626; border:none; cursor:pointer;" title="Excluir tag dos contatos">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function adicionarNovaTagContato(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById("inputNovaTagNome");
    const val = input ? input.value.trim() : "";
    if (!val) return;

    if (sigeDB.adicionarTagWp(val)) {
        showToast(`Tag "${val}" adicionada com sucesso!`);
        if (input) input.value = "";
        renderGerenciarTagsList();
        renderDirWpTagsFilter();
    } else {
        showToast(`A tag "${val}" já existe.`, "warning");
    }
}

function renomearTagContato(oldTag) {
    const novoNome = prompt(`Digite o novo nome para a tag "${oldTag}":`, oldTag);
    if (!novoNome || !novoNome.trim() || novoNome.trim() === oldTag) return;

    sigeDB.renomearTagWp(oldTag, novoNome.trim());
    showToast(`Tag alterada para "${novoNome.trim()}".`);
    renderGerenciarTagsList();
    renderDirWpTagsFilter();
    renderDirWhatsAppContatos();
}

function excluirTagContato(tagName) {
    if (!confirm(`Deseja realmente remover a tag "${tagName}" de todos os contatos?`)) return;

    sigeDB.excluirTagWp(tagName);
    if (selectedWpTags.has(tagName)) selectedWpTags.delete(tagName);
    showToast(`Tag "${tagName}" removida com sucesso.`);
    renderGerenciarTagsList();
    renderDirWpTagsFilter();
    renderDirWhatsAppContatos();
}

function adicionarSugestaoTagContato(tag) {
    const input = document.getElementById("wContInputTags");
    if (!input) return;
    const current = input.value.trim();
    if (!current) {
        input.value = tag;
    } else {
        const parts = current.split(",").map(p => p.trim());
        if (!parts.includes(tag)) {
            parts.push(tag);
            input.value = parts.join(", ");
        }
    }
}

function salvarNovoContatoWhatsApp(e) {
    if (e && e.preventDefault) e.preventDefault();
    const id = document.getElementById("wContInputId")?.value;
    const nome = document.getElementById("wContInputNome")?.value.trim();
    const telefone = document.getElementById("wContInputTelefone")?.value.trim();
    const rawTags = document.getElementById("wContInputTags")?.value.trim();
    const notas = document.getElementById("wContInputNotas")?.value.trim();

    if (!nome || !telefone) return;

    const tags = rawTags ? rawTags.split(",").map(t => t.trim()).filter(Boolean) : ['Geral'];

    if (id) {
        sigeDB.updateContatoWhatsApp(id, { nome, telefone, tags, notas, cargo: notas });
        showToast(`Contato "${nome}" atualizado com sucesso!`);
    } else {
        sigeDB.addContatoWhatsApp({ nome, telefone, tags, notas, cargo: notas });
        showToast(`Contato "${nome}" cadastrado com sucesso!`);
    }

    closeNovoContatoWhatsAppModal();
    renderDirWpTagsFilter();
    renderDirWhatsAppContatos();
    popularSelectTagsHistoricoWp();
}

function usarContatoNoAssistenteWhatsApp(nome, fone, tag) {
    setDirWpModoEnvio('individual');
    if (document.getElementById("dirWpInputNome")) document.getElementById("dirWpInputNome").value = nome;
    if (document.getElementById("dirWpInputTelefone")) document.getElementById("dirWpInputTelefone").value = fone;
    atualizarPreviewMensagemWhatsApp();
    showToast(`Contato "${nome}" selecionado no envio avulso.`);
}

function prepararDisparoWhatsAppFamiliar(alunoNome, fone) {
    switchDirSubTab('whatsapp');
    setDirWpModoEnvio('individual');
    if (document.getElementById("dirWpInputNome")) document.getElementById("dirWpInputNome").value = `Responsáveis por ${alunoNome}`;
    if (document.getElementById("dirWpInputTelefone")) document.getElementById("dirWpInputTelefone").value = fone;
    if (document.getElementById("dirWpTemplateSelect")) {
        document.getElementById("dirWpTemplateSelect").value = "convocacao_gabinete";
        aplicarTemplateWhatsAppDirecao();
    }
}

function excluirContatoWhatsApp(id) {
    if (confirm("Tem certeza que deseja remover este contato da Direção?")) {
        sigeDB.deleteContatoWhatsApp(id);
        selectedWpContactIds.delete(id);
        renderDirWpTagsFilter();
        renderDirWhatsAppContatos();
        popularSelectTagsHistoricoWp();
        showToast("Contato removido com sucesso.");
    }
}

// ----------------------------------------------------
// SUB-ABA 4: LIVRO-ATA DE GABINETE
// ----------------------------------------------------
function renderDirLivroAta() {
    const container = document.getElementById("dirAtasListContainer");
    if (!container) return;

    const atas = sigeDB.getAtasGabinete() || [];
    if (atas.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; padding:3rem 1.5rem; text-align:center; background:white; border-radius:14px; border:1px dashed #cbd5e1; color:#64748b;">
                <i class="fa-solid fa-book" style="font-size:2.8rem; color:#cbd5e1; margin-bottom:12px;"></i>
                <h4 style="color:#334155; margin-bottom:4px;">Nenhuma Ata Registrada</h4>
                <p style="font-size:0.85rem;">Clique no botão "+ Nova Ata de Reunião" acima para registrar atendimentos formais realizados no gabinete.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = atas.map(a => {
        const dataFmt = formatDateBR(a.data);
        const horaFmt = a.data ? new Date(a.data).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '';
        const safeTitulo = (a.titulo || '').replace(/'/g, "\\'");

        return `
            <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; padding:1.4rem; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; justify-content:space-between; position:relative;">
                <div>
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                        <span style="font-size:0.75rem; font-weight:800; background:#f3e8ff; color:#7e22ce; padding:3px 8px; border-radius:10px;">
                            ${a.tipoDesc || 'Atendimento Oficial'}
                        </span>
                        <span style="font-size:0.78rem; color:#64748b; font-weight:600;">
                            <i class="fa-regular fa-calendar"></i> ${dataFmt} ${horaFmt ? `às ${horaFmt}` : ''}
                        </span>
                    </div>

                    <h4 style="font-size:1.05rem; font-weight:800; color:#0f172a; margin-bottom:6px;">${a.titulo}</h4>

                    <div style="font-size:0.8rem; color:#475569; margin-bottom:8px;">
                        <strong>Presentes:</strong> ${a.participantes || 'Não especificados'}
                    </div>

                    ${a.alunoRelacionado ? `
                        <div style="font-size:0.8rem; color:#1e3a8a; background:#eff6ff; padding:4px 8px; border-radius:6px; margin-bottom:8px; display:inline-block;">
                            <i class="fa-solid fa-user-graduate"></i> Estudante: <strong>${a.alunoRelacionado}</strong> ${a.turmaRelacionada ? `(${a.turmaRelacionada})` : ''}
                        </div>
                    ` : ''}

                    <div style="font-size:0.82rem; color:#334155; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:8px;">
                        <div style="font-weight:700; color:#0f172a; margin-bottom:2px;">Pauta Tratada:</div>
                        <div style="line-height:1.4;">${a.pauta}</div>
                    </div>

                    <div style="font-size:0.82rem; color:#166534; background:#f0fdf4; padding:10px; border-radius:8px; border:1px solid #bbf7d0; margin-bottom:10px;">
                        <div style="font-weight:700; color:#14532d; margin-bottom:2px;">Combinados Firmados:</div>
                        <div style="line-height:1.4;">${a.combinados}</div>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:10px; margin-top:8px;">
                    <span style="font-size:0.75rem; color:#94a3b8;">Registrado por ${a.autor || 'Direção'}</span>
                    <div style="display:flex; gap:6px;">
                        <button type="button" onclick="openPrintTermoAtaModal('${a.id}')" class="btn btn-primary" style="background:#9333ea; border-color:#9333ea; font-size:0.75rem; padding:5px 10px;" title="Imprimir Termo Oficial para Assinaturas">
                            <i class="fa-solid fa-print"></i> Termo Timbrado
                        </button>
                        <button type="button" onclick="excluirAtaGabinete('${a.id}')" class="btn-sec btn-sec-fail" style="font-size:0.75rem; padding:5px 8px;" title="Excluir Ata">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function openNovaAtaGabineteModal() {
    const modal = document.getElementById("modalNovaAtaGabinete");
    if (!modal) return;
    const dataInput = document.getElementById("ataInputData");
    if (dataInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dataInput.value = now.toISOString().slice(0, 16);
    }
    modal.style.display = "flex";
}

function closeNovaAtaGabineteModal() {
    const modal = document.getElementById("modalNovaAtaGabinete");
    if (modal) modal.style.display = "none";
}

function salvarNovaAtaGabinete(e) {
    if (e && e.preventDefault) e.preventDefault();
    const titulo = document.getElementById("ataInputTitulo")?.value.trim();
    const data = document.getElementById("ataInputData")?.value;
    const tipo = document.getElementById("ataInputTipo")?.value;
    const tipoDesc = document.getElementById("ataInputTipo")?.selectedOptions[0]?.text;
    const alunoRelacionado = document.getElementById("ataInputAluno")?.value.trim();
    const turmaRelacionada = document.getElementById("ataInputTurma")?.value.trim();
    const participantes = document.getElementById("ataInputParticipantes")?.value.trim();
    const pauta = document.getElementById("ataInputPauta")?.value.trim();
    const combinados = document.getElementById("ataInputCombinados")?.value.trim();

    if (!titulo || !data || !participantes || !pauta || !combinados) {
        showToast("Preencha todos os campos obrigatórios da ata.", "warning");
        return;
    }

    sigeDB.addAtaGabinete({
        titulo, data, tipo, tipoDesc,
        alunoRelacionado, turmaRelacionada,
        participantes, pauta, combinados
    });

    closeNovaAtaGabineteModal();
    renderDirLivroAta();
    showToast("Ata de Reunião de Gabinete registrada com sucesso!");
}

function excluirAtaGabinete(id) {
    if (confirm("Deseja realmente excluir este registro de ata de gabinete?")) {
        sigeDB.deleteAtaGabinete(id);
        renderDirLivroAta();
        showToast("Registro de ata excluído.");
    }
}

function openPrintTermoAtaModal(ataId) {
    const modal = document.getElementById("modalPrintTermoAta");
    const printArea = document.getElementById("printAreaTermoAtaContent");
    if (!modal || !printArea) return;

    const atas = sigeDB.getAtasGabinete() || [];
    const ata = atas.find(a => a.id === ataId);
    if (!ata) return;

    const dataObj = new Date(ata.data);
    const dataExtenso = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const horaExtenso = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    printArea.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:14px; margin-bottom:20px;">
            <img src="${sigeDB.getLogoEscola()}" alt="Logo Escola" style="max-height:60px; object-fit:contain; margin-bottom:8px;">
            <h2 style="margin:0; font-size:1.35rem; font-family:'Times New Roman', serif; text-transform:uppercase;">Centro Educacional Pedro Rizzi</h2>
            <div style="font-size:0.9rem; color:#334155; margin-top:2px;">Secretaria Municipal de Educação de Itajaí / SC</div>
            <div style="font-size:0.9rem; font-weight:bold; margin-top:4px;">Gabinete da Direção Escolar</div>
            <h3 style="margin:12px 0 0 0; font-size:1.15rem; text-decoration:underline;">TERMO DE REUNIÃO E ALINHAMENTO DE GABINETE</h3>
        </div>

        <div style="margin-bottom:16px; font-size:0.95rem; line-height:1.7;">
            Aos <strong>${dataExtenso}</strong>, às <strong>${horaExtenso}</strong>, nas dependências do Gabinete da Direção do Centro Educacional Pedro Rizzi, realizou-se a reunião sob a pauta: <strong>"${ata.titulo}"</strong>.
        </div>

        <div style="margin-bottom:14px; font-size:0.92rem;">
            <strong>Participantes Presentes:</strong> ${ata.participantes}.
            ${ata.alunoRelacionado ? `<br><strong>Estudante Referenciado:</strong> ${ata.alunoRelacionado} ${ata.turmaRelacionada ? `(${ata.turmaRelacionada})` : ''}` : ''}
        </div>

        <div style="margin-bottom:16px; font-size:0.92rem;">
            <strong>Pauta Tratada & Relato dos Fatos:</strong>
            <div style="background:#f8fafc; padding:10px; border-left:3px solid #64748b; margin-top:4px; font-style:italic;">
                ${ata.pauta}
            </div>
        </div>

        <div style="margin-bottom:24px; font-size:0.92rem;">
            <strong>Combinados, Prazos & Compromissos Assumidos:</strong>
            <div style="background:#f8fafc; padding:10px; border-left:3px solid #000; margin-top:4px;">
                ${ata.combinados}
            </div>
        </div>

        <div style="font-size:0.9rem; margin-bottom:40px;">
            Nada mais havendo a constar, lavrou-se o presente termo que, lido e achado conforme, segue devidamente assinado por todos os envolvidos.
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:40px; text-align:center; font-size:0.85rem; margin-top:30px;">
            <div>
                <div style="border-top:1px solid #000; padding-top:6px;">
                    <strong>Direção Escolar</strong><br>
                    Centro Educacional Pedro Rizzi
                </div>
            </div>
            <div>
                <div style="border-top:1px solid #000; padding-top:6px;">
                    <strong>Responsável / Convocado(a)</strong><br>
                    CPF / Documento: __________________
                </div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:40px; text-align:center; font-size:0.85rem; margin-top:40px;">
            <div>
                <div style="border-top:1px solid #000; padding-top:6px;">
                    <strong>Orientação Educacional (OE)</strong><br>
                    Testemunha / Mediadora
                </div>
            </div>
            <div>
                <div style="border-top:1px solid #000; padding-top:6px;">
                    <strong>Outro Participante / Testemunha</strong><br>
                    Assinatura
                </div>
            </div>
        </div>
    `;

    modal.style.display = "flex";
}

function closePrintTermoAtaModal() {
    const modal = document.getElementById("modalPrintTermoAta");
    if (modal) modal.style.display = "none";
}

// ----------------------------------------------------
// SUB-ABA 5: RELATÓRIOS EXECUTIVOS & FECHAMENTOS
// ----------------------------------------------------
function renderDirRelatorios() {
    if (!dirRelatorioCache) {
        setDirRelPeriodo('mes_atual');
        gerarRelatorioExecutivoDirecao();
    }
}

function setDirRelPeriodo(preset) {
    const dIni = document.getElementById("dirRelDataInicio");
    const dFim = document.getElementById("dirRelDataFim");
    if (!dIni || !dFim) return;

    const ano = 2026;
    if (preset === 'mes_atual') {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        dIni.value = `${y}-${m}-01`;
        const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
        dFim.value = `${y}-${m}-${lastDay}`;
    } else if (preset === 'trimestre_1') {
        dIni.value = `${ano}-02-10`;
        dFim.value = `${ano}-05-15`;
    } else if (preset === 'trimestre_2') {
        dIni.value = `${ano}-05-18`;
        dFim.value = `${ano}-08-31`;
    } else if (preset === 'trimestre_3') {
        dIni.value = `${ano}-09-01`;
        dFim.value = `${ano}-12-18`;
    } else if (preset === 'ano_todo') {
        dIni.value = `${ano}-01-01`;
        dFim.value = `${ano}-12-31`;
    }
}

function gerarRelatorioExecutivoDirecao() {
    const container = document.getElementById("dirRelatorioResultadosContainer");
    if (!container) return;

    const dataIni = document.getElementById("dirRelDataInicio")?.value || '2026-01-01';
    const dataFim = document.getElementById("dirRelDataFim")?.value || '2026-12-31';
    const turmaFiltro = document.getElementById("dirRelTurmaSelect")?.value || '';
    const orientadoraFiltro = document.getElementById("dirRelOrientadoraSelect")?.value || '';

    const allOp = sigeDB.getAgendamentosOP() || [];

    const filtrados = allOp.filter(a => {
        const d = a.data ? a.data.slice(0, 10) : '';
        if (d && (d < dataIni || d > dataFim)) return false;
        if (turmaFiltro && a.turma !== turmaFiltro) return false;
        if (orientadoraFiltro && !matchOrientadora(a, orientadoraFiltro)) return false;
        return true;
    });

    const total = filtrados.length;
    const comparecidos = filtrados.filter(a => isStatusRealizado(a.statusSecretaria)).length;
    const faltas = filtrados.filter(a => isStatusFalta(a.statusSecretaria)).length;
    const aguardando = filtrados.filter(a => !isStatusRealizado(a.statusSecretaria) && !isStatusFalta(a.statusSecretaria) && !isStatusCancelado(a.statusSecretaria)).length;
    const pctComparecimento = total > 0 ? Math.round((comparecidos / total) * 100) : 100;

    // Agrupamento por motivos
    const motivosMap = {};
    filtrados.forEach(a => {
        const m = a.motivo || 'Outros';
        motivosMap[m] = (motivosMap[m] || 0) + 1;
    });

    // Agrupamento por turma
    const turmasMap = {};
    filtrados.forEach(a => {
        const t = a.turma || 'Sem Turma';
        turmasMap[t] = (turmasMap[t] || 0) + 1;
    });

    dirRelatorioCache = {
        dataIni, dataFim, turmaFiltro, orientadoraFiltro,
        total, comparecidos, faltas, aguardando, pctComparecimento,
        filtrados, motivosMap, turmasMap
    };

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:1.5rem; border-bottom:1px solid #e2e8f0; padding-bottom:12px;">
            <div>
                <h3 style="font-size:1.25rem; font-weight:900; color:#0f172a; margin:0;">
                    Relatório Consolidado de Atendimentos da Orientação
                </h3>
                <div style="font-size:0.83rem; color:#64748b; margin-top:2px;">
                    Período: <strong>${formatDateBR(dataIni)}</strong> até <strong>${formatDateBR(dataFim)}</strong> 
                    ${turmaFiltro ? `| Turma: <strong>${turmaFiltro}</strong>` : ''}
                </div>
            </div>

            <div style="display:flex; gap:10px;">
                <button type="button" onclick="openPrintRelatorioModal()" class="btn btn-primary" style="background:#0284c7; border-color:#0284c7; width:auto; font-size:0.85rem;">
                    <i class="fa-solid fa-print"></i> Imprimir Documento Oficial (PDF)
                </button>
                <button type="button" onclick="exportarRelatorioDirecaoCSV()" class="btn btn-secondary" style="width:auto; font-size:0.85rem;">
                    <i class="fa-solid fa-file-excel" style="color:#16a34a;"></i> Exportar CSV
                </button>
            </div>
        </div>

        <!-- Cards Estatísticos do Período -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.2rem; margin-bottom:1.5rem;">
            <div style="background:#f8fafc; padding:1.2rem; border-radius:12px; border:1px solid #cbd5e1; text-align:center;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Atendimentos no Período</div>
                <div style="font-size:2.2rem; font-weight:900; color:#0284c7; margin-top:2px;">${total}</div>
                <div style="font-size:0.75rem; color:#94a3b8;">convocações realizadas</div>
            </div>

            <div style="background:#f8fafc; padding:1.2rem; border-radius:12px; border:1px solid #cbd5e1; text-align:center;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Taxa de Comparecimento</div>
                <div style="font-size:2.2rem; font-weight:900; color:${pctComparecimento >= 75 ? '#10b981' : '#ef4444'}; margin-top:2px;">${pctComparecimento}%</div>
                <div style="font-size:0.75rem; color:#94a3b8;">${comparecidos} presentes / ${faltas} faltas</div>
            </div>

            <div style="background:#f8fafc; padding:1.2rem; border-radius:12px; border:1px solid #cbd5e1; text-align:center;">
                <div style="font-size:0.75rem; font-weight:700; color:#64748b; text-transform:uppercase;">Turmas Atendidas</div>
                <div style="font-size:2.2rem; font-weight:900; color:#7c3aed; margin-top:2px;">${Object.keys(turmasMap).length}</div>
                <div style="font-size:0.75rem; color:#94a3b8;">turmas distintas</div>
            </div>
        </div>

        <!-- Tabela Discriminada -->
        <div style="border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                <thead style="background:#f8fafc; color:#475569; text-align:left; border-bottom:2px solid #e2e8f0;">
                    <tr>
                        <th style="padding:10px 14px;">Data</th>
                        <th style="padding:10px 14px;">Estudante</th>
                        <th style="padding:10px 14px;">Turma</th>
                        <th style="padding:10px 14px;">Orientadora</th>
                        <th style="padding:10px 14px;">Motivo</th>
                        <th style="padding:10px 14px;">Presença Família</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtrados.length === 0 ? `
                        <tr><td colspan="6" style="padding:2rem; text-align:center; color:#64748b;">Nenhum atendimento no período selecionado.</td></tr>
                    ` : filtrados.map(a => `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:10px 14px;">${formatDateBR(a.data)} ${a.horario || ''}</td>
                            <td style="padding:10px 14px; font-weight:700; color:#0f172a;">${a.aluno}</td>
                            <td style="padding:10px 14px;">${a.turma || '-'}</td>
                            <td style="padding:10px 14px;">${a.orientadora || '-'}</td>
                            <td style="padding:10px 14px;">${a.motivo || 'Geral'}</td>
                            <td style="padding:10px 14px;">
                                <span style="font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:10px; background:${isStatusRealizado(a.statusSecretaria) ? '#dcfce7' : (isStatusFalta(a.statusSecretaria) ? '#fee2e2' : (isStatusConfirmado(a.statusSecretaria) ? '#dbeafe' : '#fef3c7'))}; color:${isStatusRealizado(a.statusSecretaria) ? '#166534' : (isStatusFalta(a.statusSecretaria) ? '#991b1b' : (isStatusConfirmado(a.statusSecretaria) ? '#1e40af' : '#92400e'))};">
                                    ${isStatusRealizado(a.statusSecretaria) ? 'Compareceu' : (isStatusFalta(a.statusSecretaria) ? 'Falta' : (isStatusConfirmado(a.statusSecretaria) ? 'Confirmado' : 'Aguardando'))}
                                </span>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function openPrintRelatorioModal() {
    if (!dirRelatorioCache) return;
    const modal = document.getElementById("modalPrintRelatorioExecutivo");
    const printArea = document.getElementById("printAreaRelatorioContent");
    if (!modal || !printArea) return;

    const { dataIni, dataFim, total, comparecidos, faltas, pctComparecimento, filtrados, turmasMap, motivosMap } = dirRelatorioCache;

    printArea.innerHTML = `
        <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:12px; margin-bottom:16px;">
            <img src="${sigeDB.getLogoEscola()}" alt="Logo Escola" style="max-height:60px; object-fit:contain; margin-bottom:8px;">
            <h2 style="margin:0; font-size:1.35rem; text-transform:uppercase;">Centro Educacional Pedro Rizzi</h2>
            <div style="font-size:0.85rem; color:#475569;">Secretaria Municipal de Educação de Itajaí / SC</div>
            <h3 style="margin:8px 0 0 0; font-size:1.15rem; color:#0284c7;">Relatório Executivo Oficial de Atendimentos da Orientação</h3>
            <div style="font-size:0.85rem; margin-top:4px;">Recorte: <strong>${formatDateBR(dataIni)}</strong> até <strong>${formatDateBR(dataFim)}</strong> | Emitido em: ${new Date().toLocaleDateString('pt-BR')}</div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; margin-bottom:20px; text-align:center;">
            <div style="border:1px solid #000; padding:8px;">
                <div style="font-size:0.75rem; text-transform:uppercase;">Total Atendimentos</div>
                <div style="font-size:1.4rem; font-weight:bold;">${total}</div>
            </div>
            <div style="border:1px solid #000; padding:8px;">
                <div style="font-size:0.75rem; text-transform:uppercase;">Comparecimento Pais</div>
                <div style="font-size:1.4rem; font-weight:bold;">${comparecidos} (${pctComparecimento}%)</div>
            </div>
            <div style="border:1px solid #000; padding:8px;">
                <div style="font-size:0.75rem; text-transform:uppercase;">Faltas Registradas</div>
                <div style="font-size:1.4rem; font-weight:bold;">${faltas}</div>
            </div>
            <div style="border:1px solid #000; padding:8px;">
                <div style="font-size:0.75rem; text-transform:uppercase;">Turmas Atingidas</div>
                <div style="font-size:1.4rem; font-weight:bold;">${Object.keys(turmasMap).length}</div>
            </div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:0.8rem; margin-bottom:30px;">
            <thead>
                <tr style="background:#f1f5f9; text-align:left; border-bottom:1px solid #000;">
                    <th style="padding:6px;">Data</th>
                    <th style="padding:6px;">Estudante</th>
                    <th style="padding:6px;">Turma</th>
                    <th style="padding:6px;">Orientadora</th>
                    <th style="padding:6px;">Motivo Principal</th>
                    <th style="padding:6px;">Presença</th>
                </tr>
            </thead>
            <tbody>
                ${filtrados.map(a => `
                    <tr style="border-bottom:1px solid #cbd5e1;">
                        <td style="padding:6px;">${formatDateBR(a.data)}</td>
                        <td style="padding:6px; font-weight:bold;">${a.aluno}</td>
                        <td style="padding:6px;">${a.turma || '-'}</td>
                        <td style="padding:6px;">${a.orientadora || '-'}</td>
                        <td style="padding:6px;">${a.motivo || '-'}</td>
                        <td style="padding:6px;">${isStatusRealizado(a.statusSecretaria) ? 'Compareceu' : (isStatusFalta(a.statusSecretaria) ? 'Falta' : (isStatusConfirmado(a.statusSecretaria) ? 'Confirmado' : 'Aguardando'))}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>

        <div style="margin-top:40px; display:flex; justify-content:space-between; text-align:center; font-size:0.82rem;">
            <div style="width:40%; border-top:1px solid #000; padding-top:6px;">
                Direção Geral<br>C.E. Pedro Rizzi
            </div>
            <div style="width:40%; border-top:1px solid #000; padding-top:6px;">
                Equipe de Orientação Educacional<br>Séries Iniciais & Séries Finais
            </div>
        </div>
    `;

    modal.style.display = "flex";
}

function closePrintRelatorioModal() {
    const modal = document.getElementById("modalPrintRelatorioExecutivo");
    if (modal) modal.style.display = "none";
}

function exportarRelatorioDirecaoCSV() {
    if (!dirRelatorioCache || !dirRelatorioCache.filtrados) return;
    const { filtrados, dataIni, dataFim } = dirRelatorioCache;

    const headers = ["Data", "Horário", "Estudante", "Turma", "Orientadora", "Responsável", "Motivo", "Status Presença", "Parecer"];
    const rows = filtrados.map(a => [
        formatDateBR(a.data),
        a.horario || '',
        `"${(a.aluno || '').replace(/"/g, '""')}"`,
        `"${a.turma || ''}"`,
        `"${a.orientadora || ''}"`,
        `"${(a.responsavel || '').replace(/"/g, '""')}"`,
        `"${(a.motivo || '').replace(/"/g, '""')}"`,
        a.statusSecretaria || 'aguardando',
        `"${(a.observacoes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_direcao_oe_${dataIni}_${dataFim}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Planilha CSV gerada e baixada com sucesso!");
}

// ----------------------------------------------------
// SUB-ABA 6: CALENDÁRIO DO ANO LETIVO & PRAZOS
// ----------------------------------------------------
let dirCalViewMode = 'grid'; // 'grid' (Grade de Meses) ou 'tabela' (Tabela Analítica)

function setDirCalViewMode(mode) {
    dirCalViewMode = mode;
    const btnGrid = document.getElementById("btnDirCalViewGrid");
    const btnTab = document.getElementById("btnDirCalViewTabela");
    const gridContainer = document.getElementById("dirCalViewGridContainer");
    const tabContainer = document.getElementById("dirCalViewTabelaContainer");

    if (btnGrid && btnTab) {
        btnGrid.classList.toggle("active", mode === 'grid');
        btnTab.classList.toggle("active", mode === 'tabela');
    }
    if (gridContainer && tabContainer) {
        gridContainer.style.display = mode === 'grid' ? "block" : "none";
        tabContainer.style.display = mode === 'tabela' ? "block" : "none";
    }
    renderDirCalendarioEscolar();
}

function getCalCategoriaBadge(cat, desc) {
    let bg = '#ffedd5', color = '#c2410c';
    if (cat === 'feriado' || cat === 'feriado_recesso') { bg = '#fee2e2'; color = '#b91c1c'; }
    else if (cat === 'recesso') { bg = '#fef3c7'; color = '#b45309'; }
    else if (cat === 'marco_letivo') { bg = '#eff6ff'; color = '#1d4ed8'; }
    else if (cat === 'formacao') { bg = '#f3e8ff'; color = '#7e22ce'; }
    else if (cat === 'reuniao_gestao' || cat === 'reuniao_pedagogica') { bg = '#e0e7ff'; color = '#4338ca'; }
    else if (cat === 'conselho_classe') { bg = '#dbeafe'; color = '#1e40af'; }
    else if (cat === 'leitura') { bg = '#ecfdf5'; color = '#047857'; }
    else if (cat === 'civica') { bg = '#fef9c3'; color = '#a16207'; }
    return `<span style="background:${bg}; color:${color}; padding:3px 8px; border-radius:6px; font-size:0.75rem; font-weight:800; display:inline-block; white-space:nowrap;">${desc || 'Evento'}</span>`;
}

const NOMES_MESES_CALENDARIO = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function getMesNomeFromData(dataStr) {
    if (!dataStr) return "";
    const parts = String(dataStr).split("-");
    if (parts.length >= 2) {
        const m = parseInt(parts[1], 10);
        if (m >= 1 && m <= 12) return NOMES_MESES_CALENDARIO[m - 1];
    }
    return "";
}

const MESES_CONFIG_2026 = [
    { mes: "Janeiro", trimNome: "Férias Escolares", trimClass: "trimestre-recesso", dias: 0, horas: 0, icone: "fa-umbrella-beach", corBadge: "#64748b" },
    { mes: "Fevereiro", trimNome: "1º Trimestre", trimClass: "trimestre-1", dias: 11, horas: 44, icone: "fa-seedling", corBadge: "#2563eb", sub: "Início letivo: 11/02" },
    { mes: "Março", trimNome: "1º Trimestre", trimClass: "trimestre-1", dias: 22, horas: 88, icone: "fa-book-open", corBadge: "#2563eb" },
    { mes: "Abril", trimNome: "1º Trimestre", trimClass: "trimestre-1", dias: 20, horas: 80, icone: "fa-feather", corBadge: "#2563eb" },
    { mes: "Maio", trimNome: "1º / 2º Trimestre", trimClass: "trimestre-1", dias: 19, horas: 76, icone: "fa-graduation-cap", corBadge: "#059669", sub: "15d (1º Trim) + 4d (2º Trim)" },
    { mes: "Junho", trimNome: "2º Trimestre", trimClass: "trimestre-2", dias: 20, horas: 80, icone: "fa-campground", corBadge: "#059669" },
    { mes: "Julho", trimNome: "2º Trimestre", trimClass: "trimestre-2", dias: 18, horas: 72, icone: "fa-mug-hot", corBadge: "#059669", sub: "Recesso: 20 a 31/07" },
    { mes: "Agosto", trimNome: "2º Trimestre", trimClass: "trimestre-2", dias: 21, horas: 84, icone: "fa-sun", corBadge: "#059669" },
    { mes: "Setembro", trimNome: "2º / 3º Trimestre", trimClass: "trimestre-2", dias: 20, horas: 80, icone: "fa-award", corBadge: "#d97706", sub: "4d (2º Trim) + 16d (3º Trim)" },
    { mes: "Outubro", trimNome: "3º Trimestre", trimClass: "trimestre-3", dias: 19, horas: 76, icone: "fa-palette", corBadge: "#d97706" },
    { mes: "Novembro", trimNome: "3º Trimestre", trimClass: "trimestre-3", dias: 19, horas: 76, icone: "fa-hand-holding-heart", corBadge: "#d97706" },
    { mes: "Dezembro", trimNome: "3º Trimestre", trimClass: "trimestre-3", dias: 11, horas: 44, icone: "fa-trophy", corBadge: "#d97706", sub: "Término letivo: 15/12" }
];

function renderDirCalendarioEscolar() {
    const regua = document.getElementById("dirCalReguaPrazos");
    const gridBody = document.getElementById("dirCalMonthsGridBody");
    const tbody = document.getElementById("dirTableEventosCalendarioBody");
    const paginationInfo = document.getElementById("dirCalPaginationInfo");

    let eventos = sigeDB.getEventosCalendarioEscolar() || [];
    // Auto-popula se estiver vazio e base global disponível
    if (eventos.length === 0 && typeof window !== 'undefined' && Array.isArray(window.CALENDARIO_OFICIAL_CEPR_2026) && window.CALENDARIO_OFICIAL_CEPR_2026.length > 0) {
        eventos = [...window.CALENDARIO_OFICIAL_CEPR_2026];
        sigeDB.data.eventosCalendarioEscolar = eventos;
        sigeDB.saveData(sigeDB.data);
    }

    // Régua de Contagem Regressiva
    if (regua) {
        const hoje = new Date().toISOString().slice(0, 10);
        const futuros = eventos.filter(e => (e.data || '') >= hoje).slice(0, 3);

        if (futuros.length === 0) {
            regua.innerHTML = `
                <div style="grid-column: 1 / -1; background:#f8fafc; padding:1rem; border-radius:12px; border:1px solid #cbd5e1; font-size:0.85rem; color:#64748b; text-align:center;">
                    Nenhum prazo próximo ou marco agendado para os próximos dias a partir de hoje (${formatDateBR(hoje)}).
                </div>
            `;
        } else {
            regua.innerHTML = futuros.map(f => {
                const diffDays = Math.ceil((new Date(f.data) - new Date(hoje)) / (1000 * 60 * 60 * 24));
                const dataDisp = f.dataExibicao || formatDateBR(f.data);
                return `
                    <div style="background:white; padding:1.2rem; border-radius:14px; border:1px solid #e2e8f0; border-left:4px solid #ea580c; box-shadow:var(--shadow-sm);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            ${getCalCategoriaBadge(f.categoria, f.categoriaDesc)}
                            <span style="font-size:0.8rem; font-weight:800; color:#ea580c;">
                                ${diffDays === 0 ? '🚨 É HOJE!' : `Faltam ${diffDays} dia(s)`}
                            </span>
                        </div>
                        <h4 style="font-size:0.95rem; font-weight:800; color:#0f172a; margin:8px 0 4px 0;">${f.titulo}</h4>
                        <div style="font-size:0.78rem; color:#64748b;">
                            <i class="fa-regular fa-calendar"></i> ${dataDisp} ${f.hora ? `às ${f.hora}` : ''} | ${f.local || 'C.E. Pedro Rizzi'}
                        </div>
                    </div>
                `;
            }).join("");
        }
    }

    // Filtros
    const busca = (document.getElementById("dirCalFilterBusca")?.value || "").toLowerCase().trim();
    const mesFilter = document.getElementById("dirCalFilterMes")?.value || "";
    const catFilter = document.getElementById("dirCalFilterCategoria")?.value || "";

    const filtrados = eventos.filter(e => {
        const evMes = e.mes || getMesNomeFromData(e.data);
        if (mesFilter && evMes !== mesFilter) return false;
        if (catFilter) {
            if (catFilter === 'feriado' && e.categoria !== 'feriado' && e.categoria !== 'recesso' && e.categoria !== 'feriado_recesso') return false;
            else if (catFilter !== 'feriado' && e.categoria !== catFilter) return false;
        }
        if (busca) {
            const str = `${e.titulo || ''} ${e.descricao || ''} ${evMes} ${e.dataExibicao || ''} ${e.local || ''}`.toLowerCase();
            if (!str.includes(busca)) return false;
        }
        return true;
    });

    if (paginationInfo) {
        paginationInfo.innerHTML = `<span>Mostrando <strong>${filtrados.length}</strong> de <strong>${eventos.length}</strong> eventos cadastrados no Calendário Escolar 2026.</span>`;
    }

    // 1. RENDERIZAÇÃO DA GRADE DE MESES (VISÃO MODULAR)
    if (gridBody) {
        const mesesParaExibir = mesFilter ? MESES_CONFIG_2026.filter(m => m.mes === mesFilter) : MESES_CONFIG_2026;
        
        gridBody.innerHTML = mesesParaExibir.map(cfg => {
            const eventosDoMes = filtrados.filter(e => (e.mes || getMesNomeFromData(e.data)) === cfg.mes);

            return `
                <div class="cal-month-card ${cfg.trimClass}">
                    <!-- Cabeçalho do Mês -->
                    <div class="cal-month-header">
                        <div>
                            <h4 class="cal-month-title">
                                <i class="fa-solid ${cfg.icone}" style="color:${cfg.corBadge}; font-size:1.1rem;"></i>
                                <span>${cfg.mes}</span>
                                <span style="font-size:0.8rem; font-weight:700; color:var(--dir-text-muted);">2026</span>
                            </h4>
                            <div style="font-size:0.75rem; color:${cfg.corBadge}; font-weight:800; margin-top:2px;">
                                ${cfg.trimNome} ${cfg.sub ? `• <span style="color:#64748b; font-weight:600;">${cfg.sub}</span>` : ''}
                            </div>
                        </div>

                        <div>
                            ${cfg.dias > 0 ? `
                                <span class="cal-month-kpi-badge">
                                    <i class="fa-solid fa-clock" style="color:${cfg.corBadge};"></i>
                                    <strong>${cfg.dias} dias</strong> (${cfg.horas}h)
                                </span>
                            ` : `
                                <span class="cal-month-kpi-badge" style="background:#f1f5f9; color:#64748b;">
                                    <i class="fa-solid fa-umbrella-beach"></i> Férias
                                </span>
                            `}
                        </div>
                    </div>

                    <!-- Lista de Eventos do Mês -->
                    <div class="cal-month-body">
                        ${eventosDoMes.length === 0 ? `
                            <div style="padding: 32px 16px; text-align:center; color:#94a3b8; font-size:0.8125rem;">
                                <i class="fa-regular fa-calendar-check" style="font-size:1.6rem; color:#cbd5e1; margin-bottom:8px; display:block;"></i>
                                <span>${busca || catFilter ? 'Nenhum evento com os filtros ativos.' : (cfg.dias === 0 ? 'Férias escolares / Recesso discente.' : 'Nenhum evento registrado.')}</span>
                            </div>
                        ` : eventosDoMes.map(ev => {
                            const dataDisp = ev.dataExibicao || formatDateBR(ev.data);
                            const descTexto = (ev.descricao && ev.descricao !== ev.titulo) ? ev.descricao : '';
                            const publicoIcon = ev.publicoAlvo === 'professores' ? '👨‍🏫 Docentes' : (ev.publicoAlvo === 'pais' ? '👨‍👩‍👦 Famílias' : (ev.publicoAlvo === 'alunos' ? '🎓 Alunos' : '🌐 Toda Escola'));

                            return `
                                <div class="cal-event-card">
                                    <div class="cal-event-top">
                                        <span class="cal-event-date-chip">
                                            <i class="fa-regular fa-calendar" style="color:var(--dir-accent-primary);"></i>
                                            <strong>${dataDisp}</strong>
                                            ${ev.hora ? `<span>(${ev.hora})</span>` : ''}
                                        </span>
                                        ${getCalCategoriaBadge(ev.categoria, ev.categoriaDesc)}
                                    </div>

                                    <h5 class="cal-event-title">${ev.titulo}</h5>
                                    ${descTexto ? `<p class="cal-event-desc">${descTexto}</p>` : ''}

                                    <div class="cal-event-footer">
                                        <span title="Público-Alvo"><i class="fa-solid fa-users" style="font-size:0.7rem; color:#94a3b8;"></i> ${publicoIcon}</span>
                                        <div style="display:flex; align-items:center; gap:8px;">
                                            <span style="font-size:0.72rem; color:#94a3b8;" title="Local"><i class="fa-solid fa-location-dot" style="font-size:0.7rem;"></i> ${ev.local || 'Escola'}</span>
                                            <button type="button" onclick="openEditarEventoCalendarioModal('${ev.id}')" style="background:none; border:none; color:#0284c7; cursor:pointer; padding:2px 4px; border-radius:4px; font-size:0.75rem;" title="Editar evento">
                                                <i class="fa-solid fa-pen-to-square"></i>
                                            </button>
                                            <button type="button" onclick="excluirEventoCalendario('${ev.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:2px 4px; border-radius:4px; font-size:0.75rem;" title="Remover do calendário">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join("")}
                    </div>

                    <!-- Rodapé do Mês -->
                    <div class="cal-month-footer">
                        <span><strong style="color:var(--dir-text-headings);">${eventosDoMes.length}</strong> evento(s) listado(s)</span>
                        ${cfg.dias > 0 ? `<span>Meta: <strong>${cfg.dias} dias letivos</strong></span>` : `<span>Recesso</span>`}
                    </div>
                </div>
            `;
        }).join("");
    }

    // 2. RENDERIZAÇÃO DA TABELA ANALÍTICA LINEAR
    if (tbody) {
        if (filtrados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="padding:2.5rem; text-align:center; color:#64748b;">
                        <i class="fa-solid fa-calendar-xmark" style="font-size:2rem; color:#cbd5e1; margin-bottom:8px; display:block;"></i>
                        Nenhum evento letivo encontrado para os filtros selecionados.
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = filtrados.map(e => {
                const dataDisp = e.dataExibicao || formatDateBR(e.data);
                const descTexto = (e.descricao && e.descricao !== e.titulo) ? e.descricao : '';

                return `
                    <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                        <td style="padding:12px 16px; font-weight:700; color:#1e293b; white-space:nowrap;">
                            <div style="font-size:0.875rem;">${dataDisp}</div>
                            ${e.mes ? `<span style="font-size:0.75rem; color:#64748b; font-weight:700; text-transform:uppercase;">${e.mes}</span>` : ''}
                            ${e.hora ? `<div style="font-size:0.75rem; color:#64748b;">às ${e.hora}</div>` : ''}
                        </td>
                        <td style="padding:12px 16px;">
                            ${getCalCategoriaBadge(e.categoria, e.categoriaDesc)}
                        </td>
                        <td style="padding:12px 16px;">
                            <strong style="color:#0f172a; display:block; font-size:0.9rem; line-height:1.4;">${e.titulo}</strong>
                            ${descTexto ? `<span style="font-size:0.8rem; color:#475569; display:block; margin-top:3px; line-height:1.4;">${descTexto}</span>` : ''}
                        </td>
                        <td style="padding:12px 16px; font-size:0.82rem; color:#475569; white-space:nowrap;">
                            ${e.publicoAlvo === 'professores' ? '👨‍🏫 Professores' : (e.publicoAlvo === 'pais' ? '👨‍👩‍👦 Famílias' : (e.publicoAlvo === 'alunos' ? '🎓 Alunos' : '🌐 Toda Escola'))}
                        </td>
                        <td style="padding:12px 16px; font-size:0.82rem; color:#64748b;">
                            ${e.local || 'C.E. Pedro Rizzi'}
                        </td>
                        <td style="padding:12px 16px; text-align:center; white-space:nowrap;">
                            <button type="button" onclick="openEditarEventoCalendarioModal('${e.id}')" class="btn-sec" style="font-size:0.75rem; padding:4px 8px; margin-right:4px; background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd;" title="Editar Evento">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button type="button" onclick="excluirEventoCalendario('${e.id}')" class="btn-sec btn-sec-fail" style="font-size:0.75rem; padding:4px 8px;" title="Remover do Calendário">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");
        }
    }
}

function resetDirCalFiltros() {
    const b = document.getElementById("dirCalFilterBusca");
    const m = document.getElementById("dirCalFilterMes");
    const c = document.getElementById("dirCalFilterCategoria");
    if (b) b.value = "";
    if (m) m.value = "";
    if (c) c.value = "";
    renderDirCalendarioEscolar();
}

// ----------------------------------------------------
// GESTÃO DE EVENTOS DO CALENDÁRIO (NOVO, EDITAR, EXCLUIR)
// ----------------------------------------------------
function openNovoEventoCalendarioModal() {
    const modal = document.getElementById("modalNovoEventoCalendario");
    if (!modal) return;

    const idInput = document.getElementById("calInputId");
    const tituloInput = document.getElementById("calInputTitulo");
    const dataInput = document.getElementById("calInputData");
    const horaInput = document.getElementById("calInputHora");
    const catInput = document.getElementById("calInputCategoria");
    const pubInput = document.getElementById("calInputPublico");
    const locInput = document.getElementById("calInputLocal");
    const descInput = document.getElementById("calInputDescricao");

    if (idInput) idInput.value = "";
    if (tituloInput) tituloInput.value = "";
    if (dataInput) dataInput.value = getLocalDateISO();
    if (horaInput) horaInput.value = "08:00";
    if (catInput) catInput.value = "reuniao_pedagogica";
    if (pubInput) pubInput.value = "professores";
    if (locInput) locInput.value = "Auditório da Escola";
    if (descInput) descInput.value = "";

    const titleElem = document.getElementById("modalNovoEventoTitle");
    if (titleElem) titleElem.innerText = "Adicionar Evento ao Calendário Escolar";
    const btnText = document.getElementById("btnSalvarEventoText");
    if (btnText) btnText.innerText = "Salvar no Calendário";

    modal.style.display = "flex";
}

function openEditarEventoCalendarioModal(id) {
    const eventos = sigeDB.getEventosCalendarioEscolar() || [];
    const ev = eventos.find(e => e.id === id);
    if (!ev) {
        showToast("Evento não encontrado.", "warning");
        return;
    }

    const modal = document.getElementById("modalNovoEventoCalendario");
    if (!modal) return;

    const idInput = document.getElementById("calInputId");
    const tituloInput = document.getElementById("calInputTitulo");
    const dataInput = document.getElementById("calInputData");
    const horaInput = document.getElementById("calInputHora");
    const catInput = document.getElementById("calInputCategoria");
    const pubInput = document.getElementById("calInputPublico");
    const locInput = document.getElementById("calInputLocal");
    const descInput = document.getElementById("calInputDescricao");

    if (idInput) idInput.value = ev.id;
    if (tituloInput) tituloInput.value = ev.titulo || "";
    if (dataInput) dataInput.value = ev.data || getLocalDateISO();
    if (horaInput) horaInput.value = ev.hora || "";
    if (catInput) catInput.value = ev.categoria || "reuniao_pedagogica";
    if (pubInput) pubInput.value = ev.publicoAlvo || "escola_toda";
    if (locInput) locInput.value = ev.local || "";
    if (descInput) descInput.value = ev.descricao || "";

    const titleElem = document.getElementById("modalNovoEventoTitle");
    if (titleElem) titleElem.innerText = "Editar Evento do Calendário";
    const btnText = document.getElementById("btnSalvarEventoText");
    if (btnText) btnText.innerText = "Atualizar Evento";

    modal.style.display = "flex";
}

function closeNovoEventoCalendarioModal() {
    const modal = document.getElementById("modalNovoEventoCalendario");
    if (modal) modal.style.display = "none";
}

const calCategoriasMapDesc = {
    reuniao_pedagogica: "Reunião Pedagógica",
    conselho_classe: "Conselho de Classe",
    reuniao_app: "Reunião APP",
    reuniao_gestao: "Reunião Gestão & Equipe",
    civica: "Homenagem Cívica",
    leitura: "Parada para Leitura",
    avaliacao: "Avaliação Trimestral",
    reuniao_pais: "Reunião de Pais / Boletins",
    formacao: "Formação Continuada",
    feriado: "Feriado / Recesso Escolar",
    evento_cultural: "Evento Festivo / Esportivo",
    marco_letivo: "Marco Letivo Oficial"
};

function salvarNovoEventoCalendario(e) {
    if (e && e.preventDefault) e.preventDefault();

    const id = document.getElementById("calInputId")?.value.trim();
    const titulo = document.getElementById("calInputTitulo")?.value.trim();
    const data = document.getElementById("calInputData")?.value;
    const hora = document.getElementById("calInputHora")?.value.trim();
    const categoria = document.getElementById("calInputCategoria")?.value || "reuniao_pedagogica";
    const publicoAlvo = document.getElementById("calInputPublico")?.value || "escola_toda";
    const local = document.getElementById("calInputLocal")?.value.trim() || "C.E. Pedro Rizzi";
    const descricao = document.getElementById("calInputDescricao")?.value.trim() || "";

    if (!titulo || !data) {
        showToast("Preencha o título e a data do evento.", "warning");
        return;
    }

    const categoriaDesc = calCategoriasMapDesc[categoria] || "Evento Escolar";
    const mes = getMesNomeFromData(data);
    const dataExibicao = formatDateBR(data);

    if (id) {
        sigeDB.updateEventoCalendarioEscolar(id, {
            titulo, data, hora, categoria, categoriaDesc, publicoAlvo, local, descricao, mes, dataExibicao
        });
        showToast(`Evento "${titulo}" atualizado com sucesso!`);
    } else {
        sigeDB.addEventoCalendarioEscolar({
            titulo, data, hora, categoria, categoriaDesc, publicoAlvo, local, descricao, mes, dataExibicao
        });
        showToast(`Evento "${titulo}" adicionado ao calendário!`);
    }

    closeNovoEventoCalendarioModal();
    renderDirCalendarioEscolar();
}

function excluirEventoCalendario(id) {
    if (confirm("Tem certeza que deseja remover este evento do calendário escolar?")) {
        sigeDB.deleteEventoCalendarioEscolar(id);
        renderDirCalendarioEscolar();
        showToast("Evento removido do calendário.");
    }
}

function restaurarCalendarioOficialExcel() {
    if (!window.CALENDARIO_OFICIAL_CEPR_2026 || !Array.isArray(window.CALENDARIO_OFICIAL_CEPR_2026) || window.CALENDARIO_OFICIAL_CEPR_2026.length === 0) {
        showToast("Erro: Base oficial não encontrada. Recarregue a página.", "warning");
        return;
    }
    if (confirm(`Deseja restaurar todos os ${window.CALENDARIO_OFICIAL_CEPR_2026.length} eventos oficiais da planilha oficial Calendario_Escolar_2026_Pedro_Rizzi.xlsx?`)) {
        sigeDB.importarEventosCalendarioLote(window.CALENDARIO_OFICIAL_CEPR_2026, true);
        renderDirCalendarioEscolar();
        showToast(`🎉 ${window.CALENDARIO_OFICIAL_CEPR_2026.length} eventos oficiais da planilha foram restaurados!`);
    }
}

// ----------------------------------------------------
// IMPORTAÇÃO DO CALENDÁRIO ESCOLAR OFICIAL 2026 (PDF)
// ----------------------------------------------------
let calPdfEventosExtraidos = [];

function openImportarCalendarioModal() {
    const modal = document.getElementById("modalImportarCalendarioPDF");
    if (modal) modal.style.display = "flex";
}

function closeImportarCalendarioModal() {
    const modal = document.getElementById("modalImportarCalendarioPDF");
    if (modal) modal.style.display = "none";
}

function executarImportacaoCalendarioOficial2026() {
    if (!window.CALENDARIO_OFICIAL_CEPR_2026 || !Array.isArray(window.CALENDARIO_OFICIAL_CEPR_2026) || window.CALENDARIO_OFICIAL_CEPR_2026.length === 0) {
        alert("A base oficial do calendário 2026 não foi carregada no navegador. Recarregue a página.");
        return;
    }
    if (!confirm(`Deseja importar todos os ${window.CALENDARIO_OFICIAL_CEPR_2026.length} eventos e marcos oficiais do Calendário 2026 do CEPR (Documento de Abril)?\n\nIsso atualizará o cronograma letivo oficial da escola.`)) {
        return;
    }
    const total = sigeDB.importarEventosCalendarioLote(window.CALENDARIO_OFICIAL_CEPR_2026, true);
    closeImportarCalendarioModal();
    renderDirCalendarioEscolar();
    showToast(`🎉 Sucesso! ${total} eventos do Calendário Oficial 2026 foram sincronizados.`);
}

async function handleCalendarioPdfFile(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    const previewArea = document.getElementById("calPdfPreviewArea");
    const countBadge = document.getElementById("calPdfPreviewCount");
    const container = document.getElementById("calPdfPreviewContainer");
    const btnConfirm = document.getElementById("btnConfirmarImportPdfCustom");

    if (previewArea) previewArea.style.display = "block";
    if (container) container.innerHTML = `<div style="text-align:center; padding:16px; color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Processando documento PDF...</div>`;
    if (btnConfirm) btnConfirm.disabled = true;

    calPdfEventosExtraidos = [];

    try {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error("Biblioteca PDF.js não carregada no navegador.");
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullPdfText = "";
        for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(" ");
            fullPdfText += "\n" + pageText;
        }

        calPdfEventosExtraidos = parseCalendarioPdfText(fullPdfText);

        // Fallback inteligente caso regex de PDF escaneado falhe
        if (calPdfEventosExtraidos.length === 0 && window.CALENDARIO_OFICIAL_CEPR_2026 && window.CALENDARIO_OFICIAL_CEPR_2026.length > 0) {
            calPdfEventosExtraidos = [...window.CALENDARIO_OFICIAL_CEPR_2026];
        }

        if (calPdfEventosExtraidos.length > 0) {
            if (countBadge) countBadge.textContent = `${calPdfEventosExtraidos.length} eventos detectados`;
            if (btnConfirm) btnConfirm.disabled = false;
            if (container) {
                container.innerHTML = calPdfEventosExtraidos.slice(0, 30).map(e => `
                    <div style="padding:4px 0; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; gap:8px;">
                        <span style="font-weight:700; color:#1e293b; min-width:85px;">${formatDateBR(e.data)}</span>
                        <span style="color:#0f172a; flex:1;">${e.titulo}</span>
                        <span class="dir-badge dir-badge-neutral" style="font-size:0.7rem;">${e.categoriaDesc || 'Evento'}</span>
                    </div>
                `).join("") + (calPdfEventosExtraidos.length > 30 ? `<div style="text-align:center; padding:6px; color:#64748b; font-size:0.75rem;">... e mais ${calPdfEventosExtraidos.length - 30} eventos</div>` : '');
            }
        } else {
            if (countBadge) countBadge.textContent = `0 eventos detectados`;
            if (container) container.innerHTML = `<div style="text-align:center; padding:16px; color:#dc2626;">Não foi possível identificar eventos automaticamente neste arquivo. Recomendamos utilizar a opção oficial de 1-clique acima.</div>`;
        }
    } catch (err) {
        console.error("Erro ao ler PDF:", err);
        if (container) container.innerHTML = `<div style="text-align:center; padding:16px; color:#dc2626;">Erro ao ler arquivo PDF: ${err.message}</div>`;
    }
}

function parseCalendarioPdfText(text) {
    const meses = [
        { nome: 'JANEIRO', num: 1 }, { nome: 'FEVEREIRO', num: 2 }, { nome: 'MARÇO', num: 3 },
        { nome: 'ABRIL', num: 4 }, { nome: 'MAIO', num: 5 }, { nome: 'JUNHO', num: 6 },
        { nome: 'JULHO', num: 7 }, { nome: 'AGOSTO', num: 8 }, { nome: 'SETEMBRO', num: 9 },
        { nome: 'OUTUBRO', num: 10 }, { nome: 'NOVEMBRO', num: 11 }, { nome: 'DEZEMBRO', num: 12 }
    ];

    const eventos = [];
    const norm = text.replace(/–|—|•/g, '-');

    meses.forEach(m => {
        const regexMes = new RegExp(m.nome, 'i');
        const pos = norm.search(regexMes);
        if (pos !== -1) {
            const chunk = norm.slice(pos, pos + 2500);
            const regexEventos = /(\d{1,2}(?:\s*a\s*\d{1,2})?)\s*-\s*([^0-9\n\r]{4,120})/g;
            let match;
            while ((match = regexEventos.exec(chunk)) !== null) {
                const diasStr = match[1].trim();
                const desc = match[2].trim().replace(/\s{2,}/g, ' ');
                if (desc.length > 3 && !desc.toLowerCase().includes('dias letivos')) {
                    const diaNum = parseInt(diasStr.split(/\s*a\s*/)[0], 10);
                    if (diaNum >= 1 && diaNum <= 31) {
                        const iso = `2026-${String(m.num).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`;
                        eventos.push({
                            data: iso,
                            titulo: desc.split('.')[0].trim(),
                            descricao: desc,
                            categoria: 'marco_letivo',
                            categoriaDesc: 'Marco Letivo Oficial',
                            publicoAlvo: 'escola_toda',
                            local: 'C.E. Pedro Rizzi'
                        });
                    }
                }
            }
        }
    });

    return eventos;
}

function confirmarImportacaoCalendarioPdfExtraido() {
    if (!calPdfEventosExtraidos || calPdfEventosExtraidos.length === 0) {
        alert("Nenhum evento para importar.");
        return;
    }
    const total = sigeDB.importarEventosCalendarioLote(calPdfEventosExtraidos, true);
    closeImportarCalendarioModal();
    renderDirCalendarioEscolar();
    showToast(`🎉 Sucesso! ${total} eventos foram importados para o calendário.`);
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

window.openGerenciarTagsModal = openGerenciarTagsModal;
window.closeGerenciarTagsModal = closeGerenciarTagsModal;
window.renderGerenciarTagsList = renderGerenciarTagsList;
window.adicionarNovaTagContato = adicionarNovaTagContato;
window.renomearTagContato = renomearTagContato;
window.excluirTagContato = excluirTagContato;
window.iniciarDisparoFilaAutomatico = iniciarDisparoFilaAutomatico;
window.setDirAtendViewMode = setDirAtendViewMode;

// ==========================================
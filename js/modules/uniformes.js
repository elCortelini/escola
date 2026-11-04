/**
 * uniformes.js - Módulo 6: Controle de Uniformes Escolares
 * Centro Educacional Pedro Rizzi
 */

// MÓDULO 6: CONTROLE DE UNIFORMES ESCOLARES
// ==========================================

let currentEstoqueGeneroFilter = "masculino";

function switchEstoqueGenero(genero) {
    currentEstoqueGeneroFilter = genero;

    const bMasc = document.getElementById("btnEstGenMasc");
    const bFem = document.getElementById("btnEstGenFem");
    const bTodos = document.getElementById("btnEstGenTodos");

    [bMasc, bFem, bTodos].forEach(b => {
        if (b) {
            b.style.background = "transparent";
            b.style.color = "#475569";
            b.classList.remove("active");
        }
    });

    if (genero === "masculino" && bMasc) {
        bMasc.style.background = "#059669";
        bMasc.style.color = "white";
        bMasc.classList.add("active");
    } else if (genero === "feminino" && bFem) {
        bFem.style.background = "#ec4899";
        bFem.style.color = "white";
        bFem.classList.add("active");
    } else if (genero === "todos" && bTodos) {
        bTodos.style.background = "#0284c7";
        bTodos.style.color = "white";
        bTodos.classList.add("active");
    }

    renderPainelEstoqueUniformes();
}

function limparBuscaTextoUniformes() {
    const el = document.getElementById("filterUniSearch");
    if (el) {
        el.value = "";
        el.focus();
    }
    renderTabelaPedidosUniformes();
}

function forcarSincronizacaoUniformes() {
    if (window.sigeDB && typeof window.sigeDB.forceFetchRemoteData === "function") {
        window.sigeDB.forceFetchRemoteData({ silent: false, module: "mod_uniformes" }).then(() => {
            renderModuleUniformes();
        });
    } else {
        if (typeof showToast === "function") showToast("⚠️ Conexão com o banco de dados não configurada.");
    }
}
window.forcarSincronizacaoUniformes = forcarSincronizacaoUniformes;

function renderModuleUniformes() {
    const inputSearch = document.getElementById("filterUniSearch");
    if (inputSearch) {
        const val = inputSearch.value.trim();
        const userLogado = (typeof sigeDB !== 'undefined' && sigeDB.getLoggedUser) ? sigeDB.getLoggedUser() : null;
        const cpfLogadoLimpo = userLogado?.cpf ? String(userLogado.cpf).replace(/\D/g, '') : '';
        const searchValLimpo = val.replace(/\D/g, '');
        if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val) || (searchValLimpo.length === 11 && searchValLimpo === cpfLogadoLimpo)) {
            inputSearch.value = "";
        }
    }
    populaDropdownTurmasUniformes();
    renderTabelaPedidosUniformes();
    renderPainelEstoqueUniformes();
    renderLotesSME();
}

function populaDropdownTurmasUniformes() {
    const turmas = sigeDB.getTurmasEscola() || [];
    const idsTurmas = [
        "filterUniTurma",
        "uniInputTurma",
        "relacaoSelectTurma"
    ];

    idsTurmas.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        const valSalvo = select.value;

        if (id === "filterUniTurma") {
            select.innerHTML = `<option value="todas">Todas as Turmas</option>`;
        } else if (id === "relacaoSelectTurma") {
            select.innerHTML = `<option value="todas">Todas as Turmas (Consolidado)</option>`;
        } else {
            select.innerHTML = `<option value="">-- Selecione a Turma --</option>`;
        }

        turmas.forEach(t => {
            const nomeTurma = typeof t === "string" ? t : (t.nome || t.turma);
            if (nomeTurma) {
                const opt = document.createElement("option");
                opt.value = nomeTurma;
                opt.textContent = nomeTurma;
                select.appendChild(opt);
            }
        });

        if (valSalvo && Array.from(select.options).some(o => o.value === valSalvo)) {
            select.value = valSalvo;
        }
    });
}

function renderTabelaPedidosUniformes() {
    const tbody = document.getElementById("tabelaPedidosUniformesBody");
    if (!tbody) return;

    let pedidos = sigeDB.getPedidosUniformes() || [];
    const lotes = sigeDB.getLotesSME() || [];

    // Atualização dos Cards de Métricas
    const countPendenteSme = pedidos.filter(p => p.status === "pendente_envio").length;
    const countEnviadosSme = pedidos.filter(p => p.status === "enviado_sme").length;
    const countDisponiveis = pedidos.filter(p => p.status === "disponivel_estoque").length;
    const countEntregues = pedidos.filter(p => p.status === "entregue").length;

    const elP = document.getElementById("statUniPendentesSme");
    const elE = document.getElementById("statUniEnviadosSme");
    const elD = document.getElementById("statUniDisponiveisEntrega");
    const elT = document.getElementById("statUniEntregues");

    if (elP) elP.innerText = countPendenteSme;
    if (elE) elE.innerText = countEnviadosSme;
    if (elD) elD.innerText = countDisponiveis;
    if (elT) elT.innerText = countEntregues;

    // Leitura dos Filtros com salvaguarda ativa contra autofill de CPF pelo navegador
    const inputSearch = document.getElementById("filterUniSearch");
    let searchVal = (inputSearch?.value || "").toLowerCase().trim();

    const userLogado = (typeof sigeDB !== 'undefined' && sigeDB.getLoggedUser) ? sigeDB.getLoggedUser() : null;
    const cpfLogadoLimpo = userLogado?.cpf ? String(userLogado.cpf).replace(/\D/g, '') : '';
    const searchValLimpo = searchVal.replace(/\D/g, '');

    // Se o navegador inseriu CPF do usuário ou formato de CPF no campo de busca de alunos
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(searchVal) || (searchValLimpo.length === 11 && searchValLimpo === cpfLogadoLimpo)) {
        if (inputSearch) inputSearch.value = "";
        searchVal = "";
    }
    const turmaVal = document.getElementById("filterUniTurma")?.value || "todas";
    const statusVal = document.getElementById("filterUniStatus")?.value || "todos";
    const motivoVal = document.getElementById("filterUniMotivo")?.value || "todos";
    const dataInicioVal = document.getElementById("filterUniDataInicio")?.value;
    const dataFimVal = document.getElementById("filterUniDataFim")?.value;

    // Aplicação dos Filtros
    pedidos = pedidos.filter(p => {
        if (searchVal) {
            const matchesAluno = (p.aluno || "").toLowerCase().includes(searchVal);
            const matchesTurma = (p.turma || "").toLowerCase().includes(searchVal);
            const matchesObs = (p.observacoes || "").toLowerCase().includes(searchVal);
            if (!matchesAluno && !matchesTurma && !matchesObs) return false;
        }

        if (turmaVal !== "todas" && p.turma !== turmaVal) return false;
        if (statusVal !== "todos" && p.status !== statusVal) return false;
        if (motivoVal !== "todos" && p.motivo !== motivoVal) return false;

        if (dataInicioVal && p.dataSolicitacao < dataInicioVal) return false;
        if (dataFimVal && p.dataSolicitacao > dataFimVal) return false;

        return true;
    });

    if (pedidos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; padding:2rem; color:#64748b;">
                    <i class="fa-solid fa-shirt" style="font-size:2rem; color:#cbd5e1; margin-bottom:8px; display:block;"></i>
                    Nenhuma solicitação de uniforme encontrada para os filtros aplicados.
                </td>
            </tr>
        `;
        return;
    }

    let html = "";
    pedidos.forEach(p => {
        const dataFmt = p.dataSolicitacao ? p.dataSolicitacao.split("-").reverse().join("/") : "-";

        let statusBadge = "";
        if (p.status === "pendente_envio") {
            statusBadge = `<span style="background:#fef3c7; color:#b45309; padding:4px 10px; border-radius:12px; font-weight:800; font-size:0.75rem;"><i class="fa-solid fa-hourglass-half"></i> Pendente Envio SME</span>`;
        } else if (p.status === "enviado_sme") {
            statusBadge = `<span style="background:#f3e8ff; color:#7e22ce; padding:4px 10px; border-radius:12px; font-weight:800; font-size:0.75rem;"><i class="fa-solid fa-truck"></i> Em Remessa SME</span>`;
        } else if (p.status === "disponivel_estoque") {
            statusBadge = `<span style="background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:12px; font-weight:800; font-size:0.75rem;"><i class="fa-solid fa-box-open"></i> Disponível p/ Entrega</span>`;
        } else if (p.status === "pendente_sme_divergente") {
            statusBadge = `<span style="background:#fee2e2; color:#b91c1c; padding:4px 10px; border-radius:12px; font-weight:800; font-size:0.75rem;"><i class="fa-solid fa-triangle-exclamation"></i> Pendente SME (Divergência)</span>`;
        } else if (p.status === "entregue") {
            const dataEntFmt = p.dataEntregaAluno ? p.dataEntregaAluno.split("-").reverse().join("/") : "";
            statusBadge = `<span style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:12px; font-weight:800; font-size:0.75rem;"><i class="fa-solid fa-circle-check"></i> Entregue (${dataEntFmt})</span>`;
        } else if (p.status === "cancelado") {
            statusBadge = `<span style="background:#f1f5f9; color:#64748b; padding:4px 10px; border-radius:12px; font-weight:800; font-size:0.75rem;"><i class="fa-solid fa-ban"></i> Cancelado</span>`;
        }

        let motivoLabel = "";
        if (p.motivo === "aluno_novo") motivoLabel = "🎒 Aluno Novo";
        else if (p.motivo === "troca_tamanho") motivoLabel = "📏 Troca Tamanho";
        else if (p.motivo === "danificado") motivoLabel = "⚠️ Danificado";
        else if (p.motivo === "perda") motivoLabel = "❓ Perda";
        else motivoLabel = `✏️ ${p.motivoDesc || 'Outro'}`;

        let itensDesc = "";
        if (p.tipoItem === "kit_completo") {
            itensDesc = `<strong>🎁 Kit Completo (${p.estacao === 'verao' ? 'Verão' : 'Inverno'})</strong><br><small style="color:#64748b;">${p.estacao === 'verao' ? '2 camisetas, 2 bermudas' : '2 camisetas, 2 calças, 1 casaco'}</small>`;
        } else {
            const pecasStr = (p.pecasAvulsas || []).map(peca => {
                if (peca === 'camiseta') return 'Camiseta';
                if (peca === 'bermuda') return 'Bermuda';
                if (peca === 'calca') return 'Calça';
                if (peca === 'moleton') return 'Moletom';
                if (peca === 'jaqueta') return 'Jaqueta';
                return peca;
            }).join(", ") || "Peças avulsas";
            itensDesc = `<strong>🧩 Avulso:</strong> ${pecasStr}`;
        }

        let loteStr = "<span style='color:#94a3b8;'>Sem lote</span>";
        if (p.loteSmeId) {
            const loteObj = lotes.find(l => l.id === p.loteSmeId);
            const codLote = loteObj ? loteObj.codigoLote : "Lote SME";
            const prevFmt = p.previsaoRecebimentoSme ? p.previsaoRecebimentoSme.split("-").reverse().join("/") : "";
            loteStr = `<strong style="color:#7c3aed;">${codLote}</strong>${prevFmt ? `<br><small style="color:#64748b;">Prev: ${prevFmt}</small>` : ''}`;
        }

        // Trava estrita: apenas pedidos com status pendente_envio e SEM lote atrelado podem ser selecionados para novas remessas!
        const canSelectForLote = (p.status === "pendente_envio" && !p.loteSmeId);

        html += `
            <tr style="border-bottom:1px solid #e2e8f0; hover:background:#f8fafc;">
                <td style="padding:10px;">
                    <input type="checkbox" class="chk-pedido-uni" value="${p.id}" ${canSelectForLote ? '' : 'disabled'} onchange="updateSelectedCountLoteSME()">
                </td>
                <td style="padding:10px; font-weight:700; color:#334155;">${dataFmt}</td>
                <td style="padding:10px;">
                    <div style="font-weight:800; color:#0f172a; font-size:0.9rem;">${p.aluno}</div>
                    <span style="background:#e2e8f0; color:#334155; padding:2px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">${p.turma}</span>
                    <span style="font-size:0.75rem; color:#64748b; margin-left:4px;">(${p.genero || 'Unissex'})</span>
                </td>
                <td style="padding:10px; font-weight:600; font-size:0.8rem; color:#475569;">${motivoLabel}</td>
                <td style="padding:10px;">
                    ${itensDesc}
                    <div style="margin-top:2px;"><span style="background:#0284c7; color:white; padding:2px 8px; border-radius:6px; font-weight:900; font-size:0.78rem;">Tam: ${p.tamanho}</span></div>
                </td>
                <td style="padding:10px; font-size:0.8rem; color:#64748b; text-transform:capitalize;">
                    <i class="fa-solid fa-user-tag"></i> ${p.responsavelPedido || 'Secretaria'}
                </td>
                <td style="padding:10px; font-size:0.8rem;">${loteStr}</td>
                <td style="padding:10px;">${statusBadge}</td>
                <td style="padding:10px; text-align:center;">
                    <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                        ${p.status !== "entregue" && p.status !== "cancelado" ? `
                            <button onclick="openModalConfirmarEntrega('${p.id}')" class="btn btn-primary" style="font-size:0.72rem; padding:4px 8px; background:#16a34a; border-color:#16a34a; font-weight:800;" title="Registrar entrega do uniforme ao aluno">
                                <i class="fa-solid fa-box-open"></i> Entregar
                            </button>
                        ` : ''}

                        <button onclick="imprimirTermoIndividualUniforme('${p.id}')" class="btn btn-secondary" style="font-size:0.72rem; padding:4px 8px; background:#0284c7; color:white; font-weight:800;" title="Imprimir comprovante/termo de recebimento individual">
                            <i class="fa-solid fa-print"></i> Termo
                        </button>

                        ${p.status !== "entregue" && p.status !== "cancelado" ? `
                            <button onclick="cancelarPedidoUniformeAction('${p.id}')" class="btn btn-secondary" style="font-size:0.72rem; padding:4px 8px; background:#fee2e2; color:#991b1b; border:none; font-weight:800;" title="Cancelar este pedido">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    updateSelectedCountLoteSME();
}

function toggleSelectAllPedidosUni(master) {
    const checkboxes = document.querySelectorAll(".chk-pedido-uni:not(:disabled)");
    checkboxes.forEach(c => c.checked = master.checked);
    updateSelectedCountLoteSME();
}

function updateSelectedCountLoteSME() {
    const selected = document.querySelectorAll(".chk-pedido-uni:checked");
    const countInfo = document.getElementById("lotePedidosCountInfo");
    if (countInfo) {
        countInfo.innerHTML = `<i class="fa-solid fa-list-check"></i> ${selected.length} Pedido(s) Selecionado(s) para esta Remessa`;
    }
}

function renderPainelEstoqueUniformes() {
    const container = document.getElementById("painelEstoqueUniformesContainer");
    if (!container) return;

    const estoque = sigeDB.getEstoqueUniformes();
    const tamanhos = ["8", "10", "12", "14", "16", "P", "M", "G", "GG", "G1", "G2"];
    const pecas = [
        { key: "camiseta", label: "👕 Camiseta / Blusa" },
        { key: "bermuda", label: "🩳 Bermuda" },
        { key: "calca", label: "👖 Calça" },
        { key: "moleton", label: "🧥 Moletom / Casaco" },
        { key: "jaqueta", label: "🧥 Jaqueta" }
    ];

    const genFilter = currentEstoqueGeneroFilter || "masculino";
    let genLabel = "👨 Uniformes Masculinos";
    if (genFilter === "feminino") genLabel = "👩 Uniformes Femininos";
    else if (genFilter === "todos") genLabel = "🌐 Consolidado (Masc + Fem)";

    let html = `
        <div style="font-size:0.8rem; font-weight:800; color:#334155; margin-bottom:6px;">
            Exibindo: <span style="color:#059669;">${genLabel}</span>
        </div>
        <table class="sige-table" style="width:100%; border-collapse:collapse; text-align:center; font-size:0.8rem;">
            <thead>
                <tr style="background:#f1f5f9; color:#334155;">
                    <th style="padding:8px; border-bottom:2px solid #cbd5e1; text-align:left;">Peça / Item</th>
                    ${tamanhos.map(t => `<th style="padding:8px; border-bottom:2px solid #cbd5e1; font-weight:900;">${t}</th>`).join('')}
                    <th style="padding:8px; border-bottom:2px solid #cbd5e1; font-weight:900; background:#e2e8f0;">Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    pecas.forEach(p => {
        let totalPeca = 0;
        const celulas = tamanhos.map(t => {
            let qtd = 0;
            if (genFilter === "todos") {
                const qMasc = (estoque.masculino && estoque.masculino[p.key] && estoque.masculino[p.key][t]) ? estoque.masculino[p.key][t] : 0;
                const qFem = (estoque.feminino && estoque.feminino[p.key] && estoque.feminino[p.key][t]) ? estoque.feminino[p.key][t] : 0;
                qtd = qMasc + qFem;
            } else {
                const subEst = estoque[genFilter] || {};
                qtd = (subEst[p.key] && subEst[p.key][t]) ? subEst[p.key][t] : 0;
            }

            totalPeca += qtd;
            let badgeStyle = "background:#f1f5f9; color:#94a3b8;";
            if (qtd > 0) badgeStyle = "background:#dcfce7; color:#166534; font-weight:800;";

            return `<td style="padding:8px;"><span style="display:inline-block; min-width:24px; padding:2px 6px; border-radius:6px; font-size:0.78rem; ${badgeStyle}">${qtd}</span></td>`;
        }).join('');

        html += `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px; text-align:left; font-weight:700; color:#0f172a;">${p.label}</td>
                ${celulas}
                <td style="padding:8px; font-weight:900; color:#059669; background:#f8fafc;">${totalPeca}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function renderLotesSME() {
    const container = document.getElementById("painelLotesSMEContainer");
    if (!container) return;

    const lotes = sigeDB.getLotesSME() || [];

    if (lotes.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:1.5rem; color:#94a3b8; font-size:0.85rem;">
                <i class="fa-solid fa-truck-ramp-box" style="font-size:2rem; margin-bottom:6px; display:block;"></i>
                Nenhum lote ou remessa enviada para a SME até o momento.
            </div>
        `;
        return;
    }

    let html = "";
    lotes.forEach(l => {
        const dataCorteFmt = l.dataCorte ? l.dataCorte.split("-").reverse().join("/") : "-";
        const prevFmt = l.previsaoRecebimento ? l.previsaoRecebimento.split("-").reverse().join("/") : "-";
        const chegadaFmt = l.dataChegadaReal ? l.dataChegadaReal.split("-").reverse().join("/") : null;

        let statusTag = "";
        if (l.status === "recebido_total") {
            statusTag = `<span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:8px; font-weight:800; font-size:0.75rem;"><i class="fa-solid fa-circle-check"></i> Recebido Total (${chegadaFmt})</span>`;
        } else if (l.status === "recebido_parcial") {
            statusTag = `<span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:8px; font-weight:800; font-size:0.75rem;"><i class="fa-solid fa-triangle-exclamation"></i> Recebido c/ Divergência (${chegadaFmt})</span>`;
        } else {
            statusTag = `<span style="background:#f3e8ff; color:#7e22ce; padding:2px 8px; border-radius:8px; font-weight:800; font-size:0.75rem;"><i class="fa-solid fa-truck-arrow-right"></i> Em Trânsito / SME</span>`;
        }

        const countPedidos = (l.pedidosIds || []).length;

        html += `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div>
                        <strong style="color:#7c3aed; font-size:0.95rem;">${l.codigoLote}</strong>
                        <span style="font-size:0.78rem; color:#64748b; margin-left:8px;">(${countPedidos} pedidos)</span>
                    </div>
                    <div>${statusTag}</div>
                </div>

                <div style="font-size:0.8rem; color:#475569; margin-top:6px; display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                    <div>📅 Data de Corte (Envio): <strong>${dataCorteFmt}</strong></div>
                    <div>⏳ Previsão Chegada: <strong>${prevFmt}</strong></div>
                </div>

                ${l.observacoes ? `<div style="font-size:0.78rem; color:#64748b; margin-top:4px; font-style:italic;">Obs: ${l.observacoes}</div>` : ''}

                <div style="margin-top:10px; display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap;">
                    <button onclick="imprimirRelatorioLoteSME('${l.id}')" class="btn btn-secondary" style="font-size:0.72rem; padding:4px 10px; background:#7c3aed; color:white; font-weight:800;" title="Imprimir relatório/ofício de pedido consolidado para a SME">
                        <i class="fa-solid fa-file-pdf"></i> Ofício SME
                    </button>

                    <button onclick="imprimirListaEntregaLoteSME('${l.id}')" class="btn btn-secondary" style="font-size:0.72rem; padding:4px 10px; background:#d97706; color:white; font-weight:800;" title="Imprimir lista de entrega dos kits deste lote dividida por turma com campo para assinatura">
                        <i class="fa-solid fa-file-signature"></i> Lista de Entrega do Lote
                    </button>

                    ${l.status !== "recebido_total" ? `
                        <button onclick="openModalConferirLoteSME('${l.id}')" class="btn btn-primary" style="font-size:0.72rem; padding:4px 10px; background:#16a34a; border-color:#16a34a; font-weight:800;" title="Conferir recebimento dos itens e registrar pendências">
                            <i class="fa-solid fa-clipboard-check"></i> Conferir Recebimento
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ------------------------------------------
// MODAIS E AÇÕES DO MÓDULO DE UNIFORMES
// ------------------------------------------

function openModalNovoPedidoUniforme() {
    const modal = document.getElementById("modalNovoPedidoUniforme");
    if (!modal) return;

    populaDropdownTurmasUniformes();

    const dtInput = document.getElementById("uniInputDataSolicitacao");
    if (dtInput) dtInput.value = new Date().toISOString().split("T")[0];

    const respSelect = document.getElementById("uniInputResponsavelPedido");
    if (respSelect) {
        const role = sigeDB.getRole();
        if (role === "orientacao" || role.includes("orientadora")) respSelect.value = "orientacao";
        else if (role === "supervisao") respSelect.value = "supervisao";
        else if (role === "direcao") respSelect.value = "direcao";
        else respSelect.value = "secretaria";
    }

    document.getElementById("uniInputAluno").value = "";
    document.getElementById("uniInputGenero").value = "Masculino";
    document.getElementById("uniInputTamanho").value = "10";
    document.getElementById("uniInputEstacao").value = "verao";
    document.getElementById("uniInputMotivo").value = "aluno_novo";
    document.getElementById("uniInputTipoItem").value = "kit_completo";
    document.getElementById("uniInputObservacoes").value = "";

    toggleMotivoOutroInput("aluno_novo");
    togglePecasAvulsasForm("kit_completo");

    modal.style.display = "flex";
}

function closeNovoPedidoUniformeModal() {
    const modal = document.getElementById("modalNovoPedidoUniforme");
    if (modal) modal.style.display = "none";
}

function toggleMotivoOutroInput(val) {
    const container = document.getElementById("uniContainerMotivoOutro");
    if (container) {
        container.style.display = (val === "outro") ? "block" : "none";
    }
}

function togglePecasAvulsasForm(val) {
    const container = document.getElementById("uniContainerPecasAvulsas");
    if (container) {
        container.style.display = (val === "avulso") ? "block" : "none";
    }
}

function salvarNovoPedidoUniforme(e) {
    e.preventDefault();

    const dataSolicitacao = document.getElementById("uniInputDataSolicitacao").value;
    const responsavelPedido = document.getElementById("uniInputResponsavelPedido").value;
    const aluno = document.getElementById("uniInputAluno").value.trim();
    const turma = document.getElementById("uniInputTurma").value;
    const genero = document.getElementById("uniInputGenero").value;
    const tamanho = document.getElementById("uniInputTamanho").value;
    const estacao = document.getElementById("uniInputEstacao").value;
    const motivo = document.getElementById("uniInputMotivo").value;
    const motivoOutro = document.getElementById("uniInputMotivoOutro")?.value.trim();
    const tipoItem = document.getElementById("uniInputTipoItem").value;
    const observacoes = document.getElementById("uniInputObservacoes").value.trim();

    if (!aluno || !turma) {
        showToast("⚠️ Por favor preencha o Nome do Aluno e a Turma!");
        return;
    }

    let pecasAvulsas = [];
    if (tipoItem === "avulso") {
        const checkboxes = document.querySelectorAll("input[name='uniPecaAvulsaCheck']:checked");
        checkboxes.forEach(c => pecasAvulsas.push(c.value));
        if (pecasAvulsas.length === 0) {
            showToast("⚠️ Selecione pelo menos uma peça avulsa para a solicitação!");
            return;
        }
    }

    let motivoDesc = "";
    if (motivo === "aluno_novo") motivoDesc = "Aluno Novo na Escola";
    else if (motivo === "troca_tamanho") motivoDesc = "Troca por Motivo de Tamanho";
    else if (motivo === "danificado") motivoDesc = "Uniforme Danificado";
    else if (motivo === "perda") motivoDesc = "Perda do Uniforme";
    else motivoDesc = motivoOutro || "Outro Motivo";

    const novoPedido = {
        dataSolicitacao,
        responsavelPedido,
        aluno,
        turma,
        genero,
        tamanho,
        estacao,
        motivo,
        motivoDesc,
        tipoItem,
        pecasAvulsas,
        observacoes,
        status: "pendente_envio",
        loteSmeId: null,
        dataEnvioSme: null,
        previsaoRecebimentoSme: null,
        dataChegadaEscola: null,
        dataEntregaAluno: null,
        entreguePor: null
    };

    sigeDB.addPedidoUniforme(novoPedido);
    closeNovoPedidoUniformeModal();
    renderModuleUniformes();
    showToast(`✅ Solicitação de uniforme cadastrada com sucesso para ${aluno}!`);
}

function openModalFecharLoteSME() {
    const selected = document.querySelectorAll(".chk-pedido-uni:checked");
    if (selected.length === 0) {
        showToast("⚠️ Selecione ao menos um pedido pendente na tabela para fechar a remessa!");
        return;
    }

    const modal = document.getElementById("modalFecharLoteSME");
    if (!modal) return;

    document.getElementById("loteInputDataEnvio").value = new Date().toISOString().split("T")[0];
    
    const dPrev = new Date();
    dPrev.setDate(dPrev.getDate() + 15);
    document.getElementById("loteInputPrevisao").value = dPrev.toISOString().split("T")[0];

    document.getElementById("loteInputObservacoes").value = "";
    updateSelectedCountLoteSME();

    modal.style.display = "flex";
}

function closeFecharLoteSMEModal() {
    const modal = document.getElementById("modalFecharLoteSME");
    if (modal) modal.style.display = "none";
}

function salvarFechamentoLoteSME(e) {
    e.preventDefault();

    const selected = document.querySelectorAll(".chk-pedido-uni:checked");
    const pedidosIds = Array.from(selected).map(c => c.value);

    if (pedidosIds.length === 0) {
        showToast("⚠️ Nenhum pedido selecionado!");
        return;
    }

    const dataEnvio = document.getElementById("loteInputDataEnvio").value;
    const previsao = document.getElementById("loteInputPrevisao").value;
    const obs = document.getElementById("loteInputObservacoes").value.trim();

    try {
        const lote = sigeDB.fecharLoteSME(pedidosIds, dataEnvio, previsao, obs);
        closeFecharLoteSMEModal();
        renderModuleUniformes();
        showToast(`🎉 Remessa ${lote.codigoLote} fechada com sucesso (${pedidosIds.length} pedidos)!`);
    } catch (err) {
        showToast(`❌ Erro ao fechar remessa: ${err.message}`);
    }
}

function openModalAjustarEstoque() {
    const modal = document.getElementById("modalAjustarEstoque");
    if (!modal) return;

    document.getElementById("estInputGenero").value = "Masculino";
    document.getElementById("estInputPeca").value = "camiseta";
    document.getElementById("estInputTamanho").value = "10";
    document.getElementById("estInputAcao").value = "somar";
    document.getElementById("estInputQuantidade").value = "1";

    modal.style.display = "flex";
}

function closeAjustarEstoqueModal() {
    const modal = document.getElementById("modalAjustarEstoque");
    if (modal) modal.style.display = "none";
}

function salvarAjusteEstoque(e) {
    e.preventDefault();

    const genero = document.getElementById("estInputGenero").value;
    const peca = document.getElementById("estInputPeca").value;
    const tamanho = document.getElementById("estInputTamanho").value;
    const acao = document.getElementById("estInputAcao").value;
    const quantidade = parseInt(document.getElementById("estInputQuantidade").value) || 0;

    const novoSaldo = sigeDB.ajustarEstoqueUniforme(peca, tamanho, quantidade, acao, genero);
    closeAjustarEstoqueModal();
    renderPainelEstoqueUniformes();
    showToast(`✅ Saldo atualizado (${genero}): ${peca.toUpperCase()} Tam ${tamanho} -> ${novoSaldo} unidades!`);
}

function openModalConfirmarEntrega(pedidoId) {
    const ped = (sigeDB.getPedidosUniformes() || []).find(p => p.id === pedidoId);
    if (!ped) return;

    const modal = document.getElementById("modalConfirmarEntregaUniforme");
    if (!modal) return;

    document.getElementById("entregaPedidoId").value = pedidoId;
    document.getElementById("entregaResponsavelNome").value = sigeDB.getUserName() || sigeDB.getRoleFormatted();

    let pecasText = "";
    if (ped.tipoItem === "kit_completo") {
        pecasText = `Kit Completo (${ped.estacao === 'verao' ? 'Verão: 2 camisetas, 2 bermudas' : 'Inverno: 2 camisetas, 2 calças, 1 moleton'})`;
    } else {
        pecasText = `Peças Avulsas (${(ped.pecasAvulsas || []).join(', ')})`;
    }

    const infoBody = document.getElementById("entregaModalInfoBody");
    if (infoBody) {
        infoBody.innerHTML = `
            <div style="background:#f8fafc; padding:12px; border-radius:10px; border:1px solid #cbd5e1;">
                <div style="font-weight:900; font-size:1rem; color:#0f172a;">${ped.aluno}</div>
                <div style="font-size:0.82rem; color:#475569; margin-top:2px;">
                    <strong>Turma:</strong> ${ped.turma} | <strong>Modelo/Gênero:</strong> ${ped.genero || 'Unissex'} | <strong>Tamanho:</strong> ${ped.tamanho}
                </div>
                <div style="font-size:0.82rem; color:#0284c7; margin-top:4px; font-weight:700;">
                    ${pecasText}
                </div>
            </div>
        `;
    }

    modal.style.display = "flex";
}

function closeConfirmarEntregaModal() {
    const modal = document.getElementById("modalConfirmarEntregaUniforme");
    if (modal) modal.style.display = "none";
}

function salvarEntregaUniforme(e) {
    e.preventDefault();

    const id = document.getElementById("entregaPedidoId").value;
    const responsavel = document.getElementById("entregaResponsavelNome").value.trim();
    const darBaixa = document.getElementById("entregaDarBaixaEstoque").checked;

    try {
        const ped = sigeDB.darBaixaEntregaUniforme(id, responsavel, darBaixa);
        closeConfirmarEntregaModal();
        renderModuleUniformes();
        showToast(`🎉 Entrega confirmada com sucesso para ${ped.aluno}!`);
    } catch (err) {
        showToast(`❌ Erro ao registrar entrega: ${err.message}`);
    }
}

function cancelarPedidoUniformeAction(id) {
    if (!confirm("Deseja realmente cancelar este pedido de uniforme?")) return;
    sigeDB.cancelarPedidoUniforme(id);
    renderModuleUniformes();
    showToast("Pedido de uniforme cancelado.");
}

function limparFiltrosUniformes() {
    if (document.getElementById("filterUniSearch")) document.getElementById("filterUniSearch").value = "";
    if (document.getElementById("filterUniTurma")) document.getElementById("filterUniTurma").value = "todas";
    if (document.getElementById("filterUniStatus")) document.getElementById("filterUniStatus").value = "todos";
    if (document.getElementById("filterUniMotivo")) document.getElementById("filterUniMotivo").value = "todos";
    if (document.getElementById("filterUniDataInicio")) document.getElementById("filterUniDataInicio").value = "";
    if (document.getElementById("filterUniDataFim")) document.getElementById("filterUniDataFim").value = "";
    renderTabelaPedidosUniformes();
}

// ------------------------------------------
// CONFERÊNCIA DE RECEBIMENTO DO LOTE SME
// ------------------------------------------

function openModalConferirLoteSME(loteId) {
    const lote = (sigeDB.getLotesSME() || []).find(l => l.id === loteId);
    if (!lote) return;

    const modal = document.getElementById("modalConferirLoteSME");
    if (!modal) return;

    document.getElementById("confLoteId").value = loteId;
    document.getElementById("confLoteDataChegada").value = new Date().toISOString().split("T")[0];
    document.getElementById("confLoteObs").value = "";

    const subHeader = document.getElementById("confLoteSubHeader");
    if (subHeader) {
        subHeader.innerText = `Lote: ${lote.codigoLote} (${lote.pedidosIds.length} pedidos) | Enfiado em: ${lote.dataEnvioSme ? lote.dataEnvioSme.split("-").reverse().join("/") : '-'}`;
    }

    const container = document.getElementById("confLoteItensBody");
    if (container) {
        const todosPedidos = sigeDB.getPedidosUniformes() || [];
        const pedidosDoLote = todosPedidos.filter(p => lote.pedidosIds.includes(p.id));

        let html = "";
        pedidosDoLote.forEach(p => {
            let descPecas = p.tipoItem === "kit_completo" 
                ? `Kit Completo (${p.estacao === 'verao' ? 'Verão' : 'Inverno'})` 
                : (p.pecasAvulsas || []).join(", ");

            html += `
                <div style="background:white; border:1px solid #cbd5e1; border-radius:8px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color:#0f172a;">${p.aluno}</strong> <span style="font-size:0.75rem; color:#64748b;">(${p.turma})</span><br>
                        <span style="font-size:0.78rem; color:#0284c7; font-weight:700;">Gênero: ${p.genero || 'Unissex'} | Tam: ${p.tamanho} | ${descPecas}</span>
                    </div>
                    <label style="font-size:0.83rem; font-weight:800; color:#166534; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        <input type="checkbox" class="chk-conf-item" data-pedido-id="${p.id}" checked>
                        Item Entregue
                    </label>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    modal.style.display = "flex";
}

function closeConferirLoteSMEModal() {
    const modal = document.getElementById("modalConferirLoteSME");
    if (modal) modal.style.display = "none";
}

function salvarConferenciaLoteSME(e) {
    e.preventDefault();

    const loteId = document.getElementById("confLoteId").value;
    const dataChegada = document.getElementById("confLoteDataChegada").value;
    const obs = document.getElementById("confLoteObs").value.trim();

    const checkboxes = document.querySelectorAll(".chk-conf-item");
    const mapaConferencia = {};

    checkboxes.forEach(chk => {
        const pId = chk.getAttribute("data-pedido-id");
        mapaConferencia[pId] = chk.checked ? "recebido" : "divergente";
    });

    sigeDB.registrarRecebimentoLoteSME(loteId, dataChegada, obs, mapaConferencia);
    closeConferirLoteSMEModal();
    renderModuleUniformes();
    showToast("📦 Conferência salva com sucesso! Uniformes recebidos foram adicionados ao estoque.");
}

// ------------------------------------------
// RELATÓRIO OFICIAL DE REMESSA PARA A SME
// ------------------------------------------

function imprimirRelatorioLoteSME(loteId) {
    const lote = (sigeDB.getLotesSME() || []).find(l => l.id === loteId);
    if (!lote) return;

    const todosPedidos = sigeDB.getPedidosUniformes() || [];
    const pedidosDoLote = todosPedidos.filter(p => lote.pedidosIds.includes(p.id));

    const dataHoje = new Date().toLocaleDateString("pt-BR");
    const dataCorteFmt = lote.dataCorte ? lote.dataCorte.split("-").reverse().join("/") : dataHoje;
    const prevFmt = lote.previsaoRecebimento ? lote.previsaoRecebimento.split("-").reverse().join("/") : "-";

    // Matriz de Resumo Quantitativo por Item, Gênero e Tamanho
    const tamanhos = ["8", "10", "12", "14", "16", "P", "M", "G", "GG", "G1", "G2"];
    const pecas = [
        { key: "kit_verao", label: "Kit Completo Verão (2 camisetas, 2 bermudas)" },
        { key: "kit_inverno", label: "Kit Completo Inverno (2 camisetas, 2 calças, 1 casaco)" },
        { key: "camiseta", label: "Camiseta / Blusa Avulsa" },
        { key: "bermuda", label: "Bermuda Avulsa" },
        { key: "calca", label: "Calça Avulsa" },
        { key: "moleton", label: "Moletom / Casaco Avulso" },
        { key: "jaqueta", label: "Jaqueta Avulsa" }
    ];

    const resumo = {
        masculino: {},
        feminino: {}
    };

    pecas.forEach(p => {
        resumo.masculino[p.key] = {};
        resumo.feminino[p.key] = {};
        tamanhos.forEach(t => {
            resumo.masculino[p.key][t] = 0;
            resumo.feminino[p.key][t] = 0;
        });
    });

    pedidosDoLote.forEach(p => {
        const genKey = (p.genero && p.genero.toLowerCase().includes("fem")) ? "feminino" : "masculino";
        const tam = p.tamanho;

        if (p.tipoItem === "kit_completo") {
            const kitKey = p.estacao === "verao" ? "kit_verao" : "kit_inverno";
            if (resumo[genKey][kitKey] && resumo[genKey][kitKey][tam] !== undefined) {
                resumo[genKey][kitKey][tam] += 1;
            }
        } else if (p.pecasAvulsas && Array.isArray(p.pecasAvulsas)) {
            p.pecasAvulsas.forEach(peca => {
                if (resumo[genKey][peca] && resumo[genKey][peca][tam] !== undefined) {
                    resumo[genKey][peca][tam] += 1;
                }
            });
        }
    });

    // Construção das tabelas de resumo quantitativo
    function buildResumoTableHtml(genKey, genTitle) {
        let rows = "";
        pecas.forEach(p => {
            let total = 0;
            const cells = tamanhos.map(t => {
                const q = resumo[genKey][p.key][t] || 0;
                total += q;
                return `<td style="border:1px solid #cbd5e1; padding:6px; text-align:center; ${q>0 ? 'font-weight:bold; background:#e0f2fe;' : 'color:#cbd5e1;'}">${q > 0 ? q : 0}</td>`;
            }).join("");

            if (total > 0) {
                rows += `
                    <tr>
                        <td style="border:1px solid #cbd5e1; padding:6px; font-weight:bold;">${p.label}</td>
                        ${cells}
                        <td style="border:1px solid #cbd5e1; padding:6px; text-align:center; font-weight:bold; background:#f1f5f9;">${total}</td>
                    </tr>
                `;
            }
        });

        if (!rows) return `<div style="font-size:12px; color:#64748b; font-style:italic;">Nenhum item ${genTitle.toLowerCase()} nesta remessa.</div>`;

        return `
            <h5 style="margin:12px 0 4px 0; color:#0f172a;">${genTitle}</h5>
            <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:12px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="border:1px solid #cbd5e1; padding:6px; text-align:left;">Item / Composição</th>
                        ${tamanhos.map(t => `<th style="border:1px solid #cbd5e1; padding:6px; text-align:center;">${t}</th>`).join('')}
                        <th style="border:1px solid #cbd5e1; padding:6px; text-align:center; background:#e2e8f0;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    const resumoMascHtml = buildResumoTableHtml("masculino", "👨 Resumo de Uniformes Masculinos");
    const resumoFemHtml = buildResumoTableHtml("feminino", "👩 Resumo de Uniformes Femininos");

    // Lista nominal dos estudantes
    let nominalRows = "";
    pedidosDoLote.forEach((p, idx) => {
        let descItem = p.tipoItem === "kit_completo" 
            ? `Kit Completo (${p.estacao === 'verao' ? 'Verão' : 'Inverno'})` 
            : `Avulso: ${(p.pecasAvulsas || []).join(', ')}`;

        nominalRows += `
            <tr>
                <td style="border:1px solid #cbd5e1; padding:6px; text-align:center;">${idx + 1}</td>
                <td style="border:1px solid #cbd5e1; padding:6px; font-weight:bold;">${p.aluno}</td>
                <td style="border:1px solid #cbd5e1; padding:6px;">${p.turma}</td>
                <td style="border:1px solid #cbd5e1; padding:6px;">${p.genero || 'Unissex'}</td>
                <td style="border:1px solid #cbd5e1; padding:6px; text-align:center; font-weight:bold;">${p.tamanho}</td>
                <td style="border:1px solid #cbd5e1; padding:6px;">${descItem}</td>
                <td style="border:1px solid #cbd5e1; padding:6px; font-size:11px;">${p.motivoDesc || p.motivo}</td>
            </tr>
        `;
    });

    const win = window.open("", "_blank", "width=900,height=750");
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relatório de Pedido à SME — ${lote.codigoLote}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #0f172a; line-height: 1.5; }
                .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; }
                .meta-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 15px; margin-bottom: 15px; font-size: 13px; }
                table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 6px; }
                th { background-color: #f1f5f9; }
                @media print { @page { margin: 15mm; size: portrait; } }
            </style>
        </head>
        <body>
            <div class="header" style="display:flex; align-items:center; justify-content:center; gap:16px;">
                <img src="${sigeDB.getLogoEscola()}" alt="Logo Escola" style="max-height:55px; object-fit:contain;">
                <div>
                    <h2 style="margin:0; font-size:18px;">CENTRO EDUCACIONAL PEDRO RIZZI</h2>
                    <h3 style="margin:4px 0 0 0; font-size:15px; color:#475569;">SOLICITAÇÃO OFICIAL DE UNIFORMES À SME — ${lote.codigoLote}</h3>
                    <div style="font-size:11px; color:#64748b;">Secretaria Municipal de Educação — Itajaí / SC</div>
                </div>
            </div>

            <div class="meta-box">
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap;">
                    <div><strong>Código da Remessa:</strong> ${lote.codigoLote}</div>
                    <div><strong>Data de Corte / Envio:</strong> ${dataCorteFmt}</div>
                    <div><strong>Previsão de Entrega:</strong> ${prevFmt}</div>
                    <div><strong>Total de Estudantes:</strong> ${pedidosDoLote.length}</div>
                </div>
                ${lote.observacoes ? `<div style="margin-top:6px; font-style:italic; font-size:12px; color:#475569;">Observações: ${lote.observacoes}</div>` : ''}
            </div>

            <h4 style="margin:15px 0 5px 0; border-bottom:1px solid #94a3b8; padding-bottom:3px;">1. RESUMO QUANTITATIVO CONSOLIDADO (PARA PRODUÇÃO SME)</h4>
            ${resumoMascHtml}
            ${resumoFemHtml}

            <h4 style="margin:20px 0 5px 0; border-bottom:1px solid #94a3b8; padding-bottom:3px;">2. RELAÇÃO NOMINAL DOS ESTUDANTES CONTEMPLADOS</h4>
            <table>
                <thead>
                    <tr>
                        <th style="width:30px; text-align:center;">#</th>
                        <th>Nome Completo do Estudante</th>
                        <th>Turma</th>
                        <th>Gênero</th>
                        <th style="text-align:center;">Tamanho</th>
                        <th>Item / Composição</th>
                        <th>Motivo da Solicitação</th>
                    </tr>
                </thead>
                <tbody>
                    ${nominalRows}
                </tbody>
            </table>

            <div style="margin-top:40px; display:flex; justify-content:space-around; text-align:center; font-size:12px;">
                <div>
                    ___________________________________________________<br>
                    <strong>Secretaria Escolar / Responsável</strong>
                </div>
                <div>
                    ___________________________________________________<br>
                    <strong>Direção / Gestão Escolar</strong>
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); window.close(); };
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
}

// ------------------------------------------
// RELAÇÃO E IMPRESSÃO DE ENTREGAS POR TURMA
// ------------------------------------------

function openModalRelacaoEntregaTurma() {
    populaDropdownTurmasUniformes();
    const modal = document.getElementById("modalRelacaoEntregaTurma");
    if (!modal) return;

    renderPreviewRelacaoEntregaTurma();
    modal.style.display = "flex";
}

function closeRelacaoEntregaTurmaModal() {
    const modal = document.getElementById("modalRelacaoEntregaTurma");
    if (modal) modal.style.display = "none";
}

function renderPreviewRelacaoEntregaTurma() {
    const area = document.getElementById("areaPrintRelacaoEntregaTurma");
    if (!area) return;

    const turmaFiltro = document.getElementById("relacaoSelectTurma")?.value || "todas";
    const statusFiltro = document.getElementById("relacaoSelectStatus")?.value || "todos";

    let pedidos = sigeDB.getPedidosUniformes() || [];

    if (turmaFiltro !== "todas") {
        pedidos = pedidos.filter(p => p.turma === turmaFiltro);
    }

    if (statusFiltro !== "todos") {
        pedidos = pedidos.filter(p => p.status === statusFiltro);
    } else {
        pedidos = pedidos.filter(p => p.status === "disponivel_estoque" || p.status === "entregue" || p.status === "enviado_sme");
    }

    pedidos.sort((a, b) => (a.aluno || "").localeCompare(b.aluno || ""));

    const dataHoje = new Date().toLocaleDateString("pt-BR");
    const tituloTurma = turmaFiltro === "todas" ? "Consolidado de Turmas" : `Turma ${turmaFiltro}`;

    let rowsHtml = "";
    if (pedidos.length === 0) {
        rowsHtml = `
            <tr>
                <td colspan="6" style="text-align:center; padding:1.5rem; color:#94a3b8;">
                    Nenhum pedido de uniforme localizado para os critérios da turma selecionada.
                </td>
            </tr>
        `;
    } else {
        pedidos.forEach((p, idx) => {
            let descPecas = "";
            if (p.tipoItem === "kit_completo") {
                descPecas = `Kit Completo (${p.estacao === 'verao' ? 'Verão' : 'Inverno'})`;
            } else {
                descPecas = (p.pecasAvulsas || []).join(", ");
            }

            const dataEnt = p.dataEntregaAluno ? p.dataEntregaAluno.split("-").reverse().join("/") : "";
            const assinaCol = p.status === "entregue" 
                ? `<span style="color:#15803d; font-weight:800; font-size:0.75rem;">✅ Entregue em ${dataEnt}</span>` 
                : `<div style="border-bottom:1px solid #475569; width:100%; height:24px;"></div>`;

            rowsHtml += `
                <tr style="border-bottom:1px solid #cbd5e1;">
                    <td style="padding:8px; text-align:center; font-weight:700;">${idx + 1}</td>
                    <td style="padding:8px; font-weight:800; color:#0f172a;">${p.aluno}</td>
                    <td style="padding:8px; font-weight:700; color:#334155;">${p.turma}</td>
                    <td style="padding:8px; text-align:center; font-weight:900; color:#0284c7;">Tam ${p.tamanho} (${p.genero || 'Unissex'})</td>
                    <td style="padding:8px; font-size:0.8rem; color:#475569;">${descPecas}</td>
                    <td style="padding:8px; min-width:220px; text-align:center;">${assinaCol}</td>
                </tr>
            `;
        });
    }

    area.innerHTML = `
        <div style="text-align:center; margin-bottom:1.2rem; border-bottom:2px solid #0f172a; padding-bottom:10px;">
            <img src="${sigeDB.getLogoEscola()}" alt="Logo Escola" style="max-height:55px; object-fit:contain; margin-bottom:6px;">
            <h2 style="margin:0; font-size:1.3rem; color:#0f172a; font-weight:900;">CENTRO EDUCACIONAL PEDRO RIZZI</h2>
            <h4 style="margin:4px 0 0 0; font-size:1rem; color:#475569; font-weight:800;">RELAÇÃO DE ENTREGA DE UNIFORME ESCOLAR — ${tituloTurma.toUpperCase()}</h4>
            <div style="font-size:0.78rem; color:#64748b; margin-top:4px;">Emissão em: ${dataHoje} | Via Oficial de Distribuição & Assinatura de Recebimento</div>
        </div>

        <table style="width:100%; border-collapse:collapse; font-size:0.85rem; text-align:left;">
            <thead>
                <tr style="background:#f1f5f9; color:#0f172a;">
                    <th style="padding:8px; border-bottom:2px solid #0f172a; text-align:center; width:40px;">#</th>
                    <th style="padding:8px; border-bottom:2px solid #0f172a;">Nome Completo do Aluno</th>
                    <th style="padding:8px; border-bottom:2px solid #0f172a;">Turma</th>
                    <th style="padding:8px; border-bottom:2px solid #0f172a; text-align:center;">Tamanho & Gênero</th>
                    <th style="padding:8px; border-bottom:2px solid #0f172a;">Itens / Composição</th>
                    <th style="padding:8px; border-bottom:2px solid #0f172a; text-align:center;">Assinatura do Aluno / Responsável</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <div style="margin-top:2.5rem; display:flex; justify-content:space-around; text-align:center; font-size:0.78rem; color:#475569;">
            <div>
                ___________________________________________________<br>
                <strong>Responsável pela Entrega / Servidor</strong>
            </div>
            <div>
                ___________________________________________________<br>
                <strong>Visto da Secretaria Escolar / Direção</strong>
            </div>
        </div>
    `;
}

function imprimirFolhaRelacaoEntrega() {
    const content = document.getElementById("areaPrintRelacaoEntregaTurma")?.innerHTML;
    if (!content) return;

    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relação de Entrega de Uniforme Escolar — C.E. Pedro Rizzi</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 13px; }
                th { background-color: #f1f5f9; }
                @media print {
                    @page { margin: 15mm; size: portrait; }
                }
            </style>
        </head>
        <body>
            ${content}
            <script>
                window.onload = function() { window.print(); window.close(); };
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
}

function imprimirTermoIndividualUniforme(pedidoId) {
    const ped = (sigeDB.getPedidosUniformes() || []).find(p => p.id === pedidoId);
    if (!ped) return;

    const dataHoje = new Date().toLocaleDateString("pt-BR");
    const dataSolFmt = ped.dataSolicitacao ? ped.dataSolicitacao.split("-").reverse().join("/") : dataHoje;

    let descItens = "";
    if (ped.tipoItem === "kit_completo") {
        descItens = `01 Kit Completo de Uniforme Escolar (${ped.estacao === 'verao' ? 'Verão' : 'Inverno'}) — Tamanho ${ped.tamanho}`;
    } else {
        const pecas = (ped.pecasAvulsas || []).join(", ");
        descItens = `Peça(s) Avulsa(s): ${pecas} — Tamanho ${ped.tamanho}`;
    }

    const win = window.open("", "_blank", "width=800,height=650");
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Termo de Recebimento de Uniforme — ${ped.aluno}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #0f172a; line-height: 1.6; }
                .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
                .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 20px; background: #f8fafc; }
                .sign-line { margin-top: 60px; text-align: center; font-size: 13px; }
                @media print { @page { margin: 20mm; } }
            </style>
        </head>
        <body>
            <div class="header" style="display:flex; align-items:center; justify-content:center; gap:16px;">
                <img src="${sigeDB.getLogoEscola()}" alt="Logo Escola" style="max-height:55px; object-fit:contain;">
                <div>
                    <h2 style="margin:0; font-size:18px;">CENTRO EDUCACIONAL PEDRO RIZZI</h2>
                    <h4 style="margin:5px 0 0 0; font-size:15px; color:#334155;">TERMO DE RECEBIMENTO DE UNIFORME ESCOLAR</h4>
                    <div style="font-size:12px; color:#64748b;">Itajaí / SC — Secretaria Escolar</div>
                </div>
            </div>

            <p>Declaramos que o(a) estudante abaixo discriminado(a) recebeu da escola os itens de uniforme escolar especificados:</p>

            <div class="box">
                <p style="margin:4px 0;"><strong>Nome do Aluno:</strong> ${ped.aluno}</p>
                <p style="margin:4px 0;"><strong>Turma:</strong> ${ped.turma} | <strong>Gênero/Modelo:</strong> ${ped.genero || 'Unissex'}</p>
                <p style="margin:4px 0;"><strong>Data da Solicitação:</strong> ${dataSolFmt}</p>
                <p style="margin:4px 0;"><strong>Motivo:</strong> ${ped.motivoDesc || ped.motivo}</p>
                <p style="margin:4px 0; font-size:15px; color:#0284c7;"><strong>Itens Entregues:</strong> ${descItens}</p>
            </div>

            <p style="font-size:13px; color:#475569;">
                O responsável se compromete a zelar pela conservação e uso adequado do uniforme durante as atividades escolares do estudante.
            </p>

            <div style="margin-top: 40px; font-size:13px; text-align:right;">
                Itajaí (SC), ${dataHoje}.
            </div>

            <div class="sign-line">
                _________________________________________________________<br>
                <strong>Assinatura do Aluno ou Responsável Legal</strong>
            </div>

            <script>
                window.onload = function() { window.print(); window.close(); };
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
}

// ------------------------------------------
// LISTA DE ENTREGA DO LOTE POR TURMA
// ------------------------------------------

function imprimirListaEntregaLoteSME(loteId) {
    const lote = (sigeDB.getLotesSME() || []).find(l => l.id === loteId);
    if (!lote) return;

    const todosPedidos = sigeDB.getPedidosUniformes() || [];
    const pedidosDoLote = todosPedidos.filter(p => lote.pedidosIds.includes(p.id));

    if (pedidosDoLote.length === 0) {
        showToast("⚠️ Nenhum pedido localizado para este lote.");
        return;
    }

    const dataHoje = new Date().toLocaleDateString("pt-BR");
    const dataCorteFmt = lote.dataCorte ? lote.dataCorte.split("-").reverse().join("/") : dataHoje;

    // Agrupar estudantes por turma
    const porTurma = {};
    pedidosDoLote.forEach(p => {
        const t = p.turma || "Sem Turma";
        if (!porTurma[t]) porTurma[t] = [];
        porTurma[t].push(p);
    });

    const turmasOrdenadas = Object.keys(porTurma).sort();

    let turmasSectionsHtml = "";

    turmasOrdenadas.forEach(turmaName => {
        const lista = porTurma[turmaName];
        lista.sort((a, b) => (a.aluno || "").localeCompare(b.aluno || ""));

        let rowsHtml = "";
        lista.forEach((p, idx) => {
            let descPecas = p.tipoItem === "kit_completo" 
                ? `Kit Completo (${p.estacao === 'verao' ? 'Verão' : 'Inverno'})` 
                : (p.pecasAvulsas || []).join(", ");

            const statusDesc = p.status === "entregue" ? `✅ Entregue (${p.dataEntregaAluno ? p.dataEntregaAluno.split('-').reverse().join('/') : ''})` : "";

            rowsHtml += `
                <tr style="border-bottom:1px solid #cbd5e1;">
                    <td style="padding:6px; text-align:center; font-weight:700;">${idx + 1}</td>
                    <td style="padding:6px; font-weight:800; color:#0f172a;">${p.aluno}</td>
                    <td style="padding:6px; text-align:center; font-weight:700; color:#0284c7;">Tam ${p.tamanho} (${p.genero || 'Unissex'})</td>
                    <td style="padding:6px; font-size:0.78rem; color:#334155;">${descPecas}</td>
                    <td style="padding:6px; text-align:center; width:110px;">
                        ${p.dataEntregaAluno ? p.dataEntregaAluno.split('-').reverse().join('/') : '___/___/2026'}
                    </td>
                    <td style="padding:6px; min-width:210px; text-align:center;">
                        ${statusDesc ? `<span style="color:#15803d; font-weight:800; font-size:0.75rem;">${statusDesc}</span>` : `<div style="border-bottom:1px solid #475569; width:100%; height:22px; margin-top:4px;"></div>`}
                    </td>
                </tr>
            `;
        });

        turmasSectionsHtml += `
            <div style="margin-top:1.5rem; page-break-inside:avoid;">
                <div style="background:#f1f5f9; padding:6px 12px; border-left:5px solid #7c3aed; border-radius:4px; font-weight:900; font-size:0.95rem; color:#0f172a; margin-bottom:6px;">
                    🏫 TURMA: ${turmaName.toUpperCase()} <span style="font-size:0.78rem; font-weight:600; color:#64748b;">(${lista.length} kit(s) no lote)</span>
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:0.8rem; text-align:left;">
                    <thead>
                        <tr style="background:#e2e8f0; color:#0f172a;">
                            <th style="padding:6px; border:1px solid #cbd5e1; text-align:center; width:30px;">#</th>
                            <th style="padding:6px; border:1px solid #cbd5e1;">Nome Completo do Aluno</th>
                            <th style="padding:6px; border:1px solid #cbd5e1; text-align:center;">Tamanho / Gênero</th>
                            <th style="padding:6px; border:1px solid #cbd5e1;">Itens do Kit</th>
                            <th style="padding:6px; border:1px solid #cbd5e1; text-align:center; width:110px;">Data Recebimento</th>
                            <th style="padding:6px; border:1px solid #cbd5e1; text-align:center;">Assinatura do Aluno / Responsável</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    });

    const win = window.open("", "_blank", "width=920,height=750");
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Lista de Entrega do Lote SME — ${lote.codigoLote}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; }
                table { width: 100%; border-collapse: collapse; margin-top: 6px; }
                th, td { border: 1px solid #cbd5e1; padding: 6px; font-size: 12px; }
                th { background-color: #f1f5f9; }
                @media print { @page { margin: 12mm; size: portrait; } }
            </style>
        </head>
        <body>
            <div style="text-align:center; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:15px;">
                <img src="${sigeDB.getLogoEscola()}" alt="Logo Escola" style="max-height:55px; object-fit:contain; margin-bottom:6px;">
                <h2 style="margin:0; font-size:17px; color:#0f172a; font-weight:900;">CENTRO EDUCACIONAL PEDRO RIZZI</h2>
                <h3 style="margin:4px 0 0 0; font-size:14px; color:#475569; font-weight:800;">LISTA DE ENTREGA DE KITS DE UNIFORME POR TURMA — REMESSA ${lote.codigoLote}</h3>
                <div style="font-size:11px; color:#64748b; margin-top:4px;">Data de Envio/Corte: ${dataCorteFmt} | Emissão em: ${dataHoje} | Total de Estudantes: ${pedidosDoLote.length}</div>
            </div>

            ${turmasSectionsHtml}

            <div style="margin-top:2.5rem; display:flex; justify-content:space-around; text-align:center; font-size:11px; color:#475569;">
                <div>
                    ___________________________________________________<br>
                    <strong>Servidor Responsável pelas Entregas</strong>
                </div>
                <div>
                    ___________________________________________________<br>
                    <strong>Visto da Secretaria Escolar / Direção</strong>
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); window.close(); };
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
}

// ------------------------------------------
// RELATÓRIO OFICIAL DE ENTREGAS REALIZADAS
// ------------------------------------------

function imprimirRelatorioEntregasConcluidas() {
    let pedidos = sigeDB.getPedidosUniformes() || [];
    pedidos = pedidos.filter(p => p.status === "entregue");

    if (pedidos.length === 0) {
        showToast("ℹ️ Nenhum pedido com entrega concluída localizado no momento.");
        return;
    }

    pedidos.sort((a, b) => {
        const da = a.dataEntregaAluno || "";
        const db = b.dataEntregaAluno || "";
        return db.localeCompare(da);
    });

    const dataHoje = new Date().toLocaleDateString("pt-BR");

    let rowsHtml = "";
    pedidos.forEach((p, idx) => {
        let descPecas = p.tipoItem === "kit_completo" 
            ? `Kit Completo (${p.estacao === 'verao' ? 'Verão' : 'Inverno'})` 
            : (p.pecasAvulsas || []).join(", ");

        const dataEntFmt = p.dataEntregaAluno ? p.dataEntregaAluno.split("-").reverse().join("/") : "-";

        rowsHtml += `
            <tr style="border-bottom:1px solid #cbd5e1;">
                <td style="padding:6px; text-align:center; font-weight:700;">${idx + 1}</td>
                <td style="padding:6px; text-align:center; font-weight:800; color:#15803d;">${dataEntFmt}</td>
                <td style="padding:6px; font-weight:800; color:#0f172a;">${p.aluno}</td>
                <td style="padding:6px; font-weight:700; color:#334155;">${p.turma}</td>
                <td style="padding:6px; text-align:center; font-weight:800; color:#0284c7;">Tam ${p.tamanho} (${p.genero || 'Unissex'})</td>
                <td style="padding:6px; font-size:0.78rem; color:#475569;">${descPecas}</td>
                <td style="padding:6px; font-size:0.78rem; color:#475569;">${p.recebidoPor || p.responsavelEntrega || 'Secretaria'}</td>
            </tr>
        `;
    });

    const win = window.open("", "_blank", "width=920,height=750");
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Relatório de Uniformes Entregues — C.E. Pedro Rizzi</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #0f172a; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #cbd5e1; padding: 6px; font-size: 12px; }
                th { background-color: #f1f5f9; }
                @media print { @page { margin: 15mm; size: portrait; } }
            </style>
        </head>
        <body>
            <div style="text-align:center; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:15px;">
                <img src="${sigeDB.getLogoEscola()}" alt="Logo Escola" style="max-height:55px; object-fit:contain; margin-bottom:6px;">
                <h2 style="margin:0; font-size:18px; color:#0f172a; font-weight:900;">CENTRO EDUCACIONAL PEDRO RIZZI</h2>
                <h3 style="margin:4px 0 0 0; font-size:15px; color:#166534; font-weight:800;">RELATÓRIO OFICIAL DE UNIFORMES ENTREGUES AOS ESTUDANTES</h3>
                <div style="font-size:11px; color:#64748b; margin-top:4px;">Emissão em: ${dataHoje} | Total de Entregas Concluídas: ${pedidos.length}</div>
            </div>

            <table>
                <thead>
                    <tr style="background:#e2e8f0; color:#0f172a;">
                        <th style="padding:6px; width:30px; text-align:center;">#</th>
                        <th style="padding:6px; text-align:center;">Data Entrega</th>
                        <th style="padding:6px;">Nome Completo do Estudante</th>
                        <th style="padding:6px;">Turma</th>
                        <th style="padding:6px; text-align:center;">Tamanho / Gênero</th>
                        <th style="padding:6px;">Itens / Composição Entregue</th>
                        <th style="padding:6px;">Entregue por / Servidor</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div style="margin-top:3rem; display:flex; justify-content:space-around; text-align:center; font-size:11px; color:#475569;">
                <div>
                    ___________________________________________________<br>
                    <strong>Responsável pelo Controle de Uniformes</strong>
                </div>
                <div>
                    ___________________________________________________<br>
                    <strong>Direção / Gestão Escolar</strong>
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); window.close(); };
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
}

// -------------------------------------------------------------
// Salvaguarda Contínua contra Autofill Indevido do Campo de Busca de Uniformes
// -------------------------------------------------------------
function setupSafeguardAutofillUniformes() {
    const input = document.getElementById("filterUniSearch");
    if (!input) return;

    const checkAndClear = () => {
        const val = input.value.trim();
        if (!val) return;
        const loggedUser = (typeof sigeDB !== 'undefined' && sigeDB.getLoggedUser) ? sigeDB.getLoggedUser() : null;
        const cleanUserCpf = loggedUser?.cpf ? String(loggedUser.cpf).replace(/\D/g, '') : '';
        const cleanVal = val.replace(/\D/g, '');
        if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(val) || (cleanVal.length === 11 && cleanVal === cleanUserCpf)) {
            input.value = "";
            if (typeof renderTabelaPedidosUniformes === "function") {
                renderTabelaPedidosUniformes();
            }
        }
    };

    input.addEventListener("input", checkAndClear);
    input.addEventListener("change", checkAndClear);
    input.addEventListener("focus", checkAndClear);
    input.addEventListener("blur", checkAndClear);

    setTimeout(checkAndClear, 400);
    setTimeout(checkAndClear, 1200);
    setTimeout(checkAndClear, 3000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupSafeguardAutofillUniformes);
} else {
    setupSafeguardAutofillUniformes();
}

// Funções Principais do Módulo de Uniformes
window.switchEstoqueGenero = switchEstoqueGenero;
window.renderTabelaPedidosUniformes = renderTabelaPedidosUniformes;
window.openModalNovoPedidoUniforme = openModalNovoPedidoUniforme;
window.closeNovoPedidoUniformeModal = closeNovoPedidoUniformeModal;
window.salvarNovoPedidoUniforme = salvarNovoPedidoUniforme;
window.cancelarPedidoUniformeAction = cancelarPedidoUniformeAction;
window.salvarEntregaUniforme = salvarEntregaUniforme;
window.salvarAjusteEstoque = salvarAjusteEstoque;
window.salvarFechamentoLoteSME = salvarFechamentoLoteSME;
window.salvarConferenciaLoteSME = salvarConferenciaLoteSME;



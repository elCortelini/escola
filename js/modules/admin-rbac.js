/**
 * admin-rbac.js - Módulo 4 & Administração Avançada & RBAC
 * Centro Educacional Pedro Rizzi
 */

// MÓDULO 4: ADMINISTRAÇÃO ESCOLAR & LOGÍSTICA
// ==========================================
let currentAdminSubTab = 'assinaturas_docs';

function switchAdminSubTab(subTab) {
    if (!subTab) subTab = 'equipe';
    if (subTab === 'telefones') subTab = 'equipe';
    currentAdminSubTab = subTab;

    const contents = document.querySelectorAll(".admin-subtab-content");
    const btns = document.querySelectorAll(".admin-subtab-btn");

    contents.forEach(c => {
        c.style.display = "none";
        c.classList.remove("active");
    });
    btns.forEach(b => b.classList.remove("active"));
    btns.forEach(b => b.style.display = "flex");

    const targetContent = document.getElementById(`adminSubTab_${subTab}`);
    const targetBtn = document.querySelector(`.admin-subtab-btn[data-adminsub="${subTab}"]`);

    if (targetContent) {
        targetContent.style.display = "block";
        targetContent.classList.add("active");
    }
    if (targetBtn) {
        targetBtn.classList.add("active");
    }

    // Ações específicas ao abrir cada sub-aba da Administração
    if (subTab === 'equipe') {
        if (typeof renderEquipeEscolarTable === "function") renderEquipeEscolarTable();
    } else if (subTab === 'uniformes') {
        if (typeof renderModuleUniformes === "function") renderModuleUniformes();
        if (window.sigeDB && typeof window.sigeDB.forceFetchRemoteData === "function") {
            window.sigeDB.forceFetchRemoteData({ silent: true, module: "mod_uniformes" });
        }
    } else if (subTab === 'turnos') {
        if (typeof renderTurmasAdminTable === "function") renderTurmasAdminTable();
    } else if (subTab === 'alunos_pdf') {
        if (typeof updateAdminPdfImportMetaInfoDisplay === "function") updateAdminPdfImportMetaInfoDisplay();
    } else if (subTab === 'parametros') {
        if (typeof renderConfigEscolaForm === "function") renderConfigEscolaForm();
    } else if (subTab === 'assinaturas_docs') {
        if (typeof renderModuleAssinaturasDocs === "function") renderModuleAssinaturasDocs();
    }
}
window.switchAdminSubTab = switchAdminSubTab;

function switchExtSubTab(subTab) {
    switchTab('externos');
}
window.switchExtSubTab = switchExtSubTab;

function renderModuleAdministracao() {
    try {
        if (typeof renderModuleUniformes === "function") renderModuleUniformes();
    } catch (e) {
        console.error("Erro ao renderizar uniformes na administração:", e);
    }
    try {
        renderTurmasAdminTable();
    } catch (e) {
        console.error("Erro ao renderizar turmas:", e);
    }
    try {
        if (typeof renderModuleAssinaturasDocs === "function") renderModuleAssinaturasDocs();
    } catch (e) {
        console.error("Erro ao renderizar assinaturas na administração:", e);
    }
    try {
        renderConfigEscolaForm();
    } catch (e) {
        console.error("Erro ao renderizar parâmetros da escola:", e);
    }
    try {
        if (typeof updateAdminPdfImportMetaInfoDisplay === "function") updateAdminPdfImportMetaInfoDisplay();
    } catch (e) {
        console.error("Erro ao atualizar status PDF:", e);
    }
}

function renderAdminTelefonesTable() {
    const tbody = document.getElementById("adminTelefonesTableBody");
    if (!tbody) return;

    const equipe = sigeDB.getEquipeEscolar() || [];
    const buscaInput = document.getElementById("adminTelefonesBuscaInput");
    const buscaTexto = buscaInput ? buscaInput.value.toLowerCase().trim() : "";
    const setorSelect = document.getElementById("adminTelefonesSetorFilter");
    const setorFiltro = setorSelect ? setorSelect.value : "todos";

    let lista = equipe;
    if (setorFiltro && setorFiltro !== "todos") {
        lista = lista.filter(p => p.setor === setorFiltro);
    }

    if (buscaTexto) {
        lista = lista.filter(p => {
            const nome = (p.nome || '').toLowerCase();
            const email = (p.email || '').toLowerCase();
            const cargo = (p.cargoFuncao || '').toLowerCase();
            const tel = (p.telefone || '').replace(/\D/g, "");
            const turmas = (p.turmasOuSalas || '').toLowerCase();
            return nome.includes(buscaTexto) || email.includes(buscaTexto) || cargo.includes(buscaTexto) || tel.includes(buscaTexto) || turmas.includes(buscaTexto);
        });
    }

    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding:2.5rem 1rem; text-align:center; color:#64748b;">
                    <i class="fa-solid fa-users-slash" style="font-size:2rem; margin-bottom:8px; opacity:0.5; display:block;"></i>
                    Nenhum colaborador encontrado com os filtros selecionados.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = lista.map(p => {
        const telefoneRaw = (p.telefone || '').replace(/\D/g, "");
        const temTelefone = telefoneRaw.length >= 10;
        const telefoneFormatado = p.telefone || 'Não informado';
        const waLink = temTelefone ? `https://wa.me/55${telefoneRaw}` : null;

        const setorBadgeMap = {
            docentes: '<span style="background:#eff6ff; color:#1d4ed8; font-weight:700; padding:2px 8px; border-radius:12px; font-size:0.75rem;">👨‍🏫 Docente</span>',
            orientacao: '<span style="background:#fef3c7; color:#b45309; font-weight:700; padding:2px 8px; border-radius:12px; font-size:0.75rem;">🧭 Orientação</span>',
            supervisao: '<span style="background:#f3e8ff; color:#7e22ce; font-weight:700; padding:2px 8px; border-radius:12px; font-size:0.75rem;">📋 Supervisão</span>',
            direcao: '<span style="background:#fdf2f8; color:#be185d; font-weight:700; padding:2px 8px; border-radius:12px; font-size:0.75rem;">👑 Direção</span>',
            secretaria: '<span style="background:#ecfdf5; color:#047857; font-weight:700; padding:2px 8px; border-radius:12px; font-size:0.75rem;">📑 Secretaria</span>',
            apoio: '<span style="background:#f1f5f9; color:#475569; font-weight:700; padding:2px 8px; border-radius:12px; font-size:0.75rem;">🔧 Apoio & TI</span>'
        };
        const badgeSetor = setorBadgeMap[p.setor] || `<span style="background:#f1f5f9; color:#475569; font-weight:700; padding:2px 8px; border-radius:12px; font-size:0.75rem;">${p.setor || 'Geral'}</span>`;

        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:10px; font-weight:800; color:#0f172a;">
                    ${p.nome || 'Sem Nome'}
                    ${p.email ? `<div style="font-size:0.75rem; color:#64748b; font-weight:400;">${p.email}</div>` : ''}
                </td>
                <td style="padding:10px;">
                    <div>${p.cargoFuncao || 'Colaborador'}</div>
                    <div style="margin-top:2px;">${badgeSetor}</div>
                </td>
                <td style="padding:10px;">
                    <div style="font-weight:700; color:${temTelefone ? '#0f172a' : '#94a3b8'};">
                        <i class="fa-solid fa-phone" style="font-size:0.75rem; color:#64748b;"></i> ${telefoneFormatado}
                    </div>
                </td>
                <td style="padding:10px; color:#475569; font-size:0.8rem;">
                    ${p.turmasOuSalas || '-'}
                </td>
                <td style="padding:10px; text-align:center;">
                    <div style="display:flex; gap:6px; justify-content:center; align-items:center;">
                        <button type="button" onclick="openDisparoAvisoProfessorModal('${p.id}')" class="btn" style="width:auto; background:#dcfce7; color:#16a34a; border:1px solid #86efac; padding:5px 9px; font-size:0.85rem; border-radius:6px; cursor:pointer;" title="Enviar Recado Rápido via WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i>
                        </button>
                        <button type="button" onclick="openCadastroProfissionalModal('${p.id}')" class="btn" style="width:auto; background:#f8fafc; color:#475569; border:1px solid #cbd5e1; padding:5px 9px; font-size:0.78rem; border-radius:6px; cursor:pointer;" title="Editar Dados e Telefone">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function abrirSistemaContabil() {
    const savedUrls = JSON.parse(localStorage.getItem('pedro_rizzi_urls') || '{}');
    const url = savedUrls['contabil'];
    if (url && url.trim().length > 0) {
        window.open(url, '_blank');
    } else {
        showToast("⚠️ Link do Sistema Contábil (APMF) ainda não configurado pelo Desenvolvedor.", "warning");
    }
}

function abrirSistemaPatrimonio() {
    const savedUrls = JSON.parse(localStorage.getItem('pedro_rizzi_urls') || '{}');
    const url = savedUrls['patrimonio'];
    if (url && url.trim().length > 0) {
        window.open(url, '_blank');
    } else {
        showToast("⚠️ Link do Sistema de Patrimônio ainda não configurado pelo Desenvolvedor.", "warning");
    }
}

// ==========================================
// MÓDULO 7: DESENVOLVEDOR & TI (EXCLUSIVO DEV)
// ==========================================
let currentDevSubTab = 'rbac';

function switchDevSubTab(subTab) {
    currentDevSubTab = subTab;
    const contents = document.querySelectorAll(".dev-subtab-content");
    const btns = document.querySelectorAll(".dev-subtab-btn");

    contents.forEach(c => {
        c.style.display = "none";
        c.classList.remove("active");
    });
    btns.forEach(b => b.classList.remove("active"));

    const targetContent = document.getElementById(`devSubTab_${subTab}`);
    const targetBtn = document.querySelector(`.dev-subtab-btn[data-devsub="${subTab}"]`);

    if (targetContent) {
        targetContent.style.display = "block";
        targetContent.classList.add("active");
    }
    if (targetBtn) {
        targetBtn.classList.add("active");
    }

    // Ações específicas ao abrir cada sub-aba do DEV
    if (subTab === 'rbac') {
        if (typeof renderAdminPendingUsers === "function") renderAdminPendingUsers();
        if (typeof renderEquipeEscolarTable === "function") renderEquipeEscolarTable();
        if (typeof renderAdminPermissoesUsuarios === "function") renderAdminPermissoesUsuarios();
    } else if (subTab === 'banco') {
        if (typeof renderFirebaseConfigPanel === "function") renderFirebaseConfigPanel();
    } else if (subTab === 'backup') {
        if (typeof renderAuditLogsTable === "function") renderAuditLogsTable();
    } else if (subTab === 'whatsapp_auto') {
        if (typeof renderWhatsappConfigPanel === "function") renderWhatsappConfigPanel();
    }
}

function renderModuleDev() {
    try { renderAdminPendingUsers(); } catch (e) { console.error("Erro ao renderizar pendentes:", e); }
    try { renderEquipeEscolarTable(typeof currentSetorFilter !== "undefined" ? currentSetorFilter : "todos"); } catch (e) { console.error("Erro ao renderizar equipe:", e); }
    try { renderAdminPermissoesUsuarios(); } catch (e) { console.error("Erro ao renderizar permissões:", e); }
    try { renderFirebaseConfigPanel(); } catch (e) { console.error("Erro ao renderizar Firebase:", e); }
    try { renderAuditLogsTable(); } catch (e) { console.error("Erro ao renderizar logs:", e); }
    try { renderWhatsappConfigPanel(); } catch (e) { console.error("Erro ao renderizar WhatsApp API:", e); }
}

// Funções dos modais de configuração de links e sistemas customizados para a tela do DEV
function openConfigModal() {
    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;
    if (!loggedUser || loggedUser.role !== 'desenvolvedor') {
        alert("🔒 Acesso Restrito: Apenas o Desenvolvedor do sistema pode alterar as configurações de links dos sistemas padrão.");
        return;
    }

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

function salvarLinksConfig() {
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
    showToast("✅ Links e configurações salvas com sucesso!");
}

function openAddCustomSystemModal() {
    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;
    if (!loggedUser || loggedUser.role !== 'desenvolvedor') {
        alert("🔒 Acesso Restrito: Apenas o Desenvolvedor do sistema pode cadastrar novos sistemas.");
        return;
    }

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

    const loggedUser = window.sigeDB ? window.sigeDB.getLoggedUser() : null;
    if (!loggedUser || loggedUser.role !== 'desenvolvedor') {
        alert("🔒 Acesso Restrito: Apenas o Desenvolvedor pode cadastrar novos sistemas.");
        return;
    }

    const title = document.getElementById('customSysTitle')?.value.trim();
    const tag = document.getElementById('customSysTag')?.value.trim().toUpperCase();
    const iconClass = document.getElementById('customSysIcon')?.value;
    const url = document.getElementById('customSysUrl')?.value.trim();
    const description = document.getElementById('customSysDesc')?.value.trim();

    if (!title || !tag || !url || !description) return;

    const customSystems = JSON.parse(localStorage.getItem('pedro_rizzi_custom_systems') || '[]');
    const newId = "custom-" + Date.now();
    const newSys = {
        id: newId,
        moduloKey: newId,
        title,
        iconClass,
        bgClass: "theme-emerald",
        tag,
        description,
        url,
        status: "online",
        badge: "NOVO LINK",
        isLive: true,
        isCustom: true
    };

    customSystems.push(newSys);
    localStorage.setItem('pedro_rizzi_custom_systems', JSON.stringify(customSystems));
    if (window.sigeDB && typeof window.sigeDB.syncToFirebase === 'function') {
        window.sigeDB.syncToFirebase();
    }

    closeAddCustomSystemModal();
    showToast(`✅ Sistema "${title}" cadastrado com sucesso!`);

    if (document.getElementById('customSysTitle')) document.getElementById('customSysTitle').value = "";
    if (document.getElementById('customSysTag')) document.getElementById('customSysTag').value = "";
    if (document.getElementById('customSysUrl')) document.getElementById('customSysUrl').value = "";
    if (document.getElementById('customSysDesc')) document.getElementById('customSysDesc').value = "";
}

window.switchAdminSubTab = switchAdminSubTab;
window.switchDevSubTab = switchDevSubTab;
window.renderAdminTelefonesTable = renderAdminTelefonesTable;
window.abrirSistemaContabil = abrirSistemaContabil;
window.abrirSistemaPatrimonio = abrirSistemaPatrimonio;
window.openConfigModal = openConfigModal;
window.closeConfigModal = closeConfigModal;
window.salvarLinksConfig = salvarLinksConfig;
window.openAddCustomSystemModal = openAddCustomSystemModal;
window.closeAddCustomSystemModal = closeAddCustomSystemModal;
window.submitAddCustomSystem = submitAddCustomSystem;

function renderWhatsappConfigPanel() {
    const config = sigeDB.getWhatsappConfig();
    const selProv = document.getElementById("waConfigProvider");
    const inputUrl = document.getElementById("waConfigApiUrl");
    const inputToken = document.getElementById("waConfigApiToken");
    const selInst = document.getElementById("waConfigActiveInstance");
    const inputDelayMin = document.getElementById("waConfigDelayMin");
    const inputDelayMax = document.getElementById("waConfigDelayMax");
    const chkCreate = document.getElementById("waConfigAutoCreate");
    const chkArrival = document.getElementById("waConfigAutoArrival");
    const chkRemind = document.getElementById("waConfigAutoReminders");

    if (selProv) selProv.value = config.provider || "evolution_api";
    if (inputUrl) inputUrl.value = config.evolutionApiUrl || config.apiUrl || "";
    if (inputToken) inputToken.value = config.evolutionApiKey || config.apiToken || "";
    if (selInst) selInst.value = config.activeInstance || "sige_orientacao";
    if (inputDelayMin) inputDelayMin.value = config.antiBanDelayMin || 5;
    if (inputDelayMax) inputDelayMax.value = config.antiBanDelayMax || 12;
    if (chkCreate) chkCreate.checked = config.autoSendOnCreate !== false;
    if (chkArrival) chkArrival.checked = config.autoSendOnArrival !== false;
    if (chkRemind) chkRemind.checked = config.autoSendReminders !== false;
}

function salvarConfiguracoesWhatsapp() {
    const provider = document.getElementById("waConfigProvider")?.value || "evolution_api";
    const existing = (typeof sigeDB !== 'undefined' && sigeDB.getWhatsappConfig()) || {};

    const inputUrl = document.getElementById("waConfigApiUrl");
    const inputToken = document.getElementById("waConfigApiToken");

    // Só atualiza com o valor digitado se o campo existir e não estiver vazio
    const apiUrl = (inputUrl && inputUrl.value.trim()) ? inputUrl.value.trim().replace(/\/+$/, '') : (existing.evolutionApiUrl || existing.apiUrl || "https://pc28.taild665db.ts.net:8443");
    const apiToken = (inputToken && inputToken.value.trim()) ? inputToken.value.trim() : (existing.evolutionApiKey || existing.apiToken || "B6D711FCDE4D4FD5936544120E713976");
    const activeInstance = "sige_orientacao";
    const antiBanDelayMin = parseInt(document.getElementById("waConfigDelayMin")?.value, 10) || existing.antiBanDelayMin || 5;
    const antiBanDelayMax = parseInt(document.getElementById("waConfigDelayMax")?.value, 10) || existing.antiBanDelayMax || 12;
    const autoSendOnCreate = document.getElementById("waConfigAutoCreate") ? document.getElementById("waConfigAutoCreate").checked : (existing.autoSendOnCreate !== false);
    const autoSendOnArrival = document.getElementById("waConfigAutoArrival") ? document.getElementById("waConfigAutoArrival").checked : (existing.autoSendOnArrival !== false);
    const autoSendReminders = document.getElementById("waConfigAutoReminders") ? document.getElementById("waConfigAutoReminders").checked : (existing.autoSendReminders !== false);

    sigeDB.saveWhatsappConfig({
        enabled: true,
        provider,
        apiUrl,
        apiToken,
        evolutionApiUrl: apiUrl,
        evolutionApiKey: apiToken,
        activeInstance,
        antiBanDelayMin,
        antiBanDelayMax,
        autoSendOnCreate,
        autoSendOnArrival,
        autoSendReminders
    });

    showToast("💾 Configurações do WhatsApp salvas com sucesso!");
    if (typeof atualizarStatusWhatsAppUnificado === 'function') {
        atualizarStatusWhatsAppUnificado();
    }
}

async function testarConexaoWhatsapp() {
    salvarConfiguracoesWhatsapp();
    if (typeof evolutionClient === 'undefined' || !evolutionClient.isConfigured()) {
        showToast("⚠️ Preencha a URL da Evolution API e a Chave de API antes de testar.", "warning");
        return;
    }

    const inst = "sige_orientacao";
    showToast(`🔍 Testando conexão com o WhatsApp da escola...`, "info");

    const res = await evolutionClient.checkConnectionState(inst);
    if (res.connected) {
        showToast(`🟢 WhatsApp CONECTADO e pronto para envios!`, "success");
    } else if (res.state === 'not_found') {
        showToast(`ℹ️ WhatsApp ainda não inicializado. Clique em 'Conectar / Ver QR Code'.`, "info");
    } else {
        showToast(`🔴 WhatsApp desconectado. Clique em 'Conectar / Ver QR Code'.`, "warning");
    }
    if (typeof atualizarStatusWhatsAppUnificado === 'function') {
        atualizarStatusWhatsAppUnificado();
    }
}

// ==========================================
// MODAL DE CONEXÃO WHATSAPP / QR CODE (UNIFICADO)
// ==========================================
let qrCodePollingInterval = null;
let currentQrInstanceName = "sige_orientacao";

async function openModalQrCodeWhatsApp(instanceName) {
    currentQrInstanceName = instanceName || (typeof sigeDB !== 'undefined' && sigeDB.getActiveWhatsappInstance()) || "sige_orientacao";

    const modal = document.getElementById("modalQrCodeWhatsApp");
    const instLabel = document.getElementById("modalQrCodeInstanceLabel");
    const statusBadge = document.getElementById("modalQrCodeStatusBadge");
    const loadingBox = document.getElementById("modalQrCodeLoading");
    const qrImg = document.getElementById("modalQrCodeImg");
    const successBox = document.getElementById("modalQrCodeSuccessBox");
    const instructionsBox = document.getElementById("modalQrCodeInstructions");
    const btnRefreshQr = document.getElementById("btnRefreshQrCodeModal");
    const btnResetQr = document.getElementById("btnResetQrCodeModal");

    if (instLabel) instLabel.innerText = "WhatsApp da Escola";
    if (modal) modal.style.display = "flex";
    if (loadingBox) {
        loadingBox.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin" style="font-size:2.5rem; color:#3b82f6;"></i>
            <span style="font-size:0.85rem; font-weight:700; color:#475569;">Verificando conexão com o WhatsApp...</span>
        `;
        loadingBox.style.display = "flex";
    }
    if (qrImg) qrImg.style.display = "none";
    if (successBox) successBox.style.display = "none";
    if (statusBadge) {
        statusBadge.innerText = "🔍 Verificando...";
        statusBadge.style.background = "#e0f2fe";
        statusBadge.style.color = "#0369a1";
    }

    // 1. Verifica se já está conectado no servidor de fato
    const check = await evolutionClient.checkConnectionState(currentQrInstanceName);
    if (check.connected && !check.viaCloudCache) {
        if (loadingBox) loadingBox.style.display = "none";
        if (qrImg) qrImg.style.display = "none";
        if (instructionsBox) instructionsBox.style.display = "none";
        if (successBox) successBox.style.display = "flex";
        if (statusBadge) {
            statusBadge.innerText = "🟢 Conectado";
            statusBadge.style.background = "#dcfce7";
            statusBadge.style.color = "#15803d";
        }
        if (btnRefreshQr) btnRefreshQr.style.display = "none";
        if (btnResetQr) btnResetQr.style.display = "none";

        atualizarStatusWhatsAppUnificado();
        return;
    }

    // 2. Se desconectado, exibe instruções e busca o QR Code
    if (instructionsBox) instructionsBox.style.display = "block";
    if (btnRefreshQr) btnRefreshQr.style.display = "inline-flex";
    if (btnResetQr) btnResetQr.style.display = "inline-flex";

    await refreshQrCodeModal();

    // 3. Inicia polling de conexão
    iniciarPollingConexaoQrCode(currentQrInstanceName);
}

async function refreshQrCodeModal() {
    const loadingBox = document.getElementById("modalQrCodeLoading");
    const qrImg = document.getElementById("modalQrCodeImg");
    const successBox = document.getElementById("modalQrCodeSuccessBox");
    const statusBadge = document.getElementById("modalQrCodeStatusBadge");
    const instructionsBox = document.getElementById("modalQrCodeInstructions");
    const btnRefreshQr = document.getElementById("btnRefreshQrCodeModal");
    const btnResetQr = document.getElementById("btnResetQrCodeModal");

    if (loadingBox) {
        loadingBox.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin" style="font-size:2.5rem; color:#3b82f6;"></i>
            <span style="font-size:0.85rem; font-weight:700; color:#475569;">Carregando QR Code...</span>
        `;
        loadingBox.style.display = "flex";
    }
    if (qrImg) qrImg.style.display = "none";
    if (successBox) successBox.style.display = "none";

    const qrData = await evolutionClient.getQrCode(currentQrInstanceName);

    // Se já estava conectado
    if (qrData.alreadyConnected || qrData.state === "open") {
        if (loadingBox) loadingBox.style.display = "none";
        if (qrImg) qrImg.style.display = "none";
        if (instructionsBox) instructionsBox.style.display = "none";
        if (successBox) successBox.style.display = "flex";
        if (statusBadge) {
            statusBadge.innerText = "🟢 Conectado";
            statusBadge.style.background = "#dcfce7";
            statusBadge.style.color = "#15803d";
        }
        if (btnRefreshQr) btnRefreshQr.style.display = "none";
        if (btnResetQr) btnResetQr.style.display = "none";
        atualizarStatusWhatsAppUnificado();
        return;
    }

    if (qrData.success && qrData.base64) {
        const src = qrData.base64.startsWith("data:") ? qrData.base64 : `data:image/png;base64,${qrData.base64}`;
        if (qrImg) {
            qrImg.src = src;
            qrImg.style.display = "block";
        }
        if (loadingBox) loadingBox.style.display = "none";
        if (instructionsBox) instructionsBox.style.display = "block";
        if (statusBadge) {
            statusBadge.innerText = "📱 Aguardando Leitura";
            statusBadge.style.background = "#fef3c7";
            statusBadge.style.color = "#b45309";
        }
    } else {
        if (loadingBox) {
            loadingBox.innerHTML = `
                <div style="color:#b91c1c; font-weight:800; text-align:center;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; margin-bottom:8px;"></i>
                    <p style="margin:0;">Não foi possível obter o QR Code.</p>
                    <p style="font-size:0.75rem; font-weight:500; color:#64748b; margin-top:4px;">${qrData.error || 'Clique em "Gerar Novo QR" para reiniciar.'}</p>
                </div>
            `;
        }
    }
}

function iniciarPollingConexaoQrCode(instanceName) {
    if (qrCodePollingInterval) clearInterval(qrCodePollingInterval);

    qrCodePollingInterval = setInterval(async () => {
        const check = await evolutionClient.checkConnectionState(instanceName);
        if (check.connected && !check.viaCloudCache) {
            clearInterval(qrCodePollingInterval);
            qrCodePollingInterval = null;

            const qrImg = document.getElementById("modalQrCodeImg");
            const loadingBox = document.getElementById("modalQrCodeLoading");
            const successBox = document.getElementById("modalQrCodeSuccessBox");
            const statusBadge = document.getElementById("modalQrCodeStatusBadge");
            const instructionsBox = document.getElementById("modalQrCodeInstructions");
            const btnRefreshQr = document.getElementById("btnRefreshQrCodeModal");
            const btnResetQr = document.getElementById("btnResetQrCodeModal");

            if (qrImg) qrImg.style.display = "none";
            if (loadingBox) loadingBox.style.display = "none";
            if (instructionsBox) instructionsBox.style.display = "none";
            if (successBox) successBox.style.display = "flex";

            if (btnRefreshQr) btnRefreshQr.style.display = "none";
            if (btnResetQr) btnResetQr.style.display = "none";

            if (statusBadge) {
                statusBadge.innerText = "🟢 Conectado";
                statusBadge.style.background = "#dcfce7";
                statusBadge.style.color = "#15803d";
            }

            atualizarStatusWhatsAppUnificado();
            showToast(`🎉 WhatsApp conectado com sucesso!`, "success");
        }
    }, 2500);
}

function closeModalQrCodeWhatsApp() {
    if (qrCodePollingInterval) {
        clearInterval(qrCodePollingInterval);
        qrCodePollingInterval = null;
    }
    const modal = document.getElementById("modalQrCodeWhatsApp");
    if (modal) modal.style.display = "none";
    atualizarStatusWhatsAppUnificado();
}

async function desconectarWhatsAppInstanciaModal() {
    if (!confirm(`Deseja realmente desconectar a sessão do WhatsApp da escola?\nVocê poderá reconectar com qualquer número escaneando um novo QR Code.`)) {
        return;
    }

    // 1. Para imediatamente o polling ativo
    if (qrCodePollingInterval) {
        clearInterval(qrCodePollingInterval);
        qrCodePollingInterval = null;
    }

    // 2. Prepara UI para o processo de desconexão
    const loadingBox = document.getElementById("modalQrCodeLoading");
    const qrImg = document.getElementById("modalQrCodeImg");
    const successBox = document.getElementById("modalQrCodeSuccessBox");
    const statusBadge = document.getElementById("modalQrCodeStatusBadge");
    const instructionsBox = document.getElementById("modalQrCodeInstructions");
    const btnRefreshQr = document.getElementById("btnRefreshQrCodeModal");
    const btnResetQr = document.getElementById("btnResetQrCodeModal");

    if (qrImg) qrImg.style.display = "none";
    if (successBox) successBox.style.display = "none";
    if (instructionsBox) instructionsBox.style.display = "none";
    if (btnRefreshQr) btnRefreshQr.style.display = "none";
    if (btnResetQr) btnResetQr.style.display = "none";

    if (loadingBox) {
        loadingBox.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin" style="font-size:2.5rem; color:#dc2626;"></i>
            <span style="font-size:0.85rem; font-weight:700; color:#475569;">Desconectando sessão e gerando novo QR Code...</span>
        `;
        loadingBox.style.display = "flex";
    }
    if (statusBadge) {
        statusBadge.innerText = "🔄 Desconectando...";
        statusBadge.style.background = "#fee2e2";
        statusBadge.style.color = "#991b1b";
    }

    showToast(`Desconectando WhatsApp...`, "info");

    // 3. Invalida cache de estado
    if (typeof evolutionClient !== "undefined" && typeof evolutionClient._saveCloudInstanceState === "function") {
        evolutionClient._saveCloudInstanceState(currentQrInstanceName, "close", false);
    }

    // 4. Executa reset limpo na Evolution API (logout + reconectar com novo QR Code)
    const qrData = await evolutionClient.resetInstance(currentQrInstanceName);

    if (qrData.alreadyConnected || qrData.state === "open") {
        if (loadingBox) loadingBox.style.display = "none";
        if (qrImg) qrImg.style.display = "none";
        if (instructionsBox) instructionsBox.style.display = "none";
        if (successBox) successBox.style.display = "flex";
        if (statusBadge) {
            statusBadge.innerText = "🟢 Conectado";
            statusBadge.style.background = "#dcfce7";
            statusBadge.style.color = "#15803d";
        }
        atualizarStatusWhatsAppUnificado();
        return;
    }

    if (qrData.success && qrData.base64) {
        const src = qrData.base64.startsWith("data:") ? qrData.base64 : `data:image/png;base64,${qrData.base64}`;
        if (qrImg) {
            qrImg.src = src;
            qrImg.style.display = "block";
        }
        if (loadingBox) loadingBox.style.display = "none";
        if (instructionsBox) instructionsBox.style.display = "block";
        if (btnRefreshQr) btnRefreshQr.style.display = "inline-flex";
        if (btnResetQr) btnResetQr.style.display = "inline-flex";
        if (statusBadge) {
            statusBadge.innerText = "📱 Aguardando Leitura";
            statusBadge.style.background = "#fef3c7";
            statusBadge.style.color = "#b45309";
        }
        showToast("Sessão desconectada! Aponte a câmera com o novo número.", "success");
        iniciarPollingConexaoQrCode(currentQrInstanceName);
    } else {
        if (loadingBox) {
            loadingBox.innerHTML = `
                <div style="color:#b91c1c; font-weight:800; text-align:center;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; margin-bottom:8px;"></i>
                    <p style="margin:0;">Sessão desconectada com sucesso.</p>
                    <p style="font-size:0.75rem; font-weight:500; color:#64748b; margin-top:4px;">${qrData.error || 'Aguarde alguns segundos e clique no botão abaixo para carregar o novo QR Code.'}</p>
                    <button type="button" onclick="reiniciarConexaoQrCodeModal()" class="dir-btn" style="margin-top:10px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:0.8rem; padding:6px 12px; font-weight:700;">
                        <i class="fa-solid fa-rotate"></i> Gerar Novo QR Code
                    </button>
                </div>
            `;
        }
        if (statusBadge) {
            statusBadge.innerText = "🔴 Desconectado";
            statusBadge.style.background = "#fee2e2";
            statusBadge.style.color = "#991b1b";
        }
    }
    atualizarStatusWhatsAppUnificado();
}

async function reiniciarConexaoQrCodeModal() {
    if (qrCodePollingInterval) {
        clearInterval(qrCodePollingInterval);
        qrCodePollingInterval = null;
    }

    const loadingBox = document.getElementById("modalQrCodeLoading");
    const qrImg = document.getElementById("modalQrCodeImg");
    const successBox = document.getElementById("modalQrCodeSuccessBox");
    const statusBadge = document.getElementById("modalQrCodeStatusBadge");
    const instructionsBox = document.getElementById("modalQrCodeInstructions");
    const btnRefreshQr = document.getElementById("btnRefreshQrCodeModal");
    const btnResetQr = document.getElementById("btnResetQrCodeModal");

    if (loadingBox) {
        loadingBox.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin" style="font-size:2.5rem; color:#3b82f6;"></i>
            <span style="font-size:0.85rem; font-weight:700; color:#475569;">Reiniciando sessão e gerando novo QR Code limpo...</span>
        `;
        loadingBox.style.display = "flex";
    }
    if (qrImg) qrImg.style.display = "none";
    if (successBox) successBox.style.display = "none";
    if (instructionsBox) instructionsBox.style.display = "none";
    if (statusBadge) {
        statusBadge.innerText = "🔄 Reiniciando...";
        statusBadge.style.background = "#e0f2fe";
        statusBadge.style.color = "#0369a1";
    }

    const qrData = await evolutionClient.resetInstance(currentQrInstanceName);

    if (qrData.alreadyConnected || qrData.state === "open") {
        if (loadingBox) loadingBox.style.display = "none";
        if (qrImg) qrImg.style.display = "none";
        if (instructionsBox) instructionsBox.style.display = "none";
        if (successBox) successBox.style.display = "flex";
        if (statusBadge) {
            statusBadge.innerText = "🟢 Conectado";
            statusBadge.style.background = "#dcfce7";
            statusBadge.style.color = "#15803d";
        }
        if (btnRefreshQr) btnRefreshQr.style.display = "none";
        if (btnResetQr) btnResetQr.style.display = "none";
        atualizarStatusWhatsAppUnificado();
        return;
    }

    if (qrData.success && qrData.base64) {
        const src = qrData.base64.startsWith("data:") ? qrData.base64 : `data:image/png;base64,${qrData.base64}`;
        if (qrImg) {
            qrImg.src = src;
            qrImg.style.display = "block";
        }
        if (loadingBox) loadingBox.style.display = "none";
        if (instructionsBox) instructionsBox.style.display = "block";
        if (btnRefreshQr) btnRefreshQr.style.display = "inline-flex";
        if (btnResetQr) btnResetQr.style.display = "inline-flex";
        if (statusBadge) {
            statusBadge.innerText = "📱 Aguardando Leitura";
            statusBadge.style.background = "#fef3c7";
            statusBadge.style.color = "#b45309";
        }
        showToast("Novo QR Code gerado!", "success");
        iniciarPollingConexaoQrCode(currentQrInstanceName);
    } else {
        if (loadingBox) {
            loadingBox.innerHTML = `
                <div style="color:#b91c1c; font-weight:800; text-align:center;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; margin-bottom:8px;"></i>
                    <p style="margin:0;">Não foi possível obter o QR Code.</p>
                    <p style="font-size:0.75rem; font-weight:500; color:#64748b; margin-top:4px;">${qrData.error || 'Aguarde alguns segundos e tente novamente.'}</p>
                    <button type="button" onclick="reiniciarConexaoQrCodeModal()" class="dir-btn" style="margin-top:10px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; font-size:0.8rem; padding:6px 12px; font-weight:700;">
                        <i class="fa-solid fa-rotate"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
        if (statusBadge) {
            statusBadge.innerText = "🔴 Desconectado";
            statusBadge.style.background = "#fee2e2";
            statusBadge.style.color = "#991b1b";
        }
    }
}

// Atualiza o status do WhatsApp em todos os crachás/botões do sistema de forma unificada
async function atualizarStatusWhatsAppUnificado() {
    const badgeOp = document.getElementById("opLembreteStatusBadge");
    const badgeDir = document.getElementById("dirWpStatusBadge");
    const badgeModal = document.getElementById("modalQrCodeStatusBadge");

    const badges = [badgeOp, badgeDir, badgeModal].filter(Boolean);
    if (badges.length === 0 || typeof evolutionClient === 'undefined') return;

    const inst = (typeof sigeDB !== 'undefined' && sigeDB.getActiveWhatsappInstance()) || "sige_orientacao";

    const check = await evolutionClient.checkConnectionState(inst);

    badges.forEach(badge => {
        if (check.connected) {
            badge.innerText = "🟢 Conectado";
            badge.style.background = "#dcfce7";
            badge.style.color = "#15803d";
            badge.title = "WhatsApp da escola está conectado e pronto para envios!";
        } else {
            badge.innerText = "🔴 Desconectado";
            badge.style.background = "#fee2e2";
            badge.style.color = "#991b1b";
            badge.title = "WhatsApp desconectado. Clique em 'Conectar / QR Code' para parear.";
        }
    });

    const btnLembrete = document.getElementById("btnOpLembreteQrCode");
    if (btnLembrete) {
        if (check.connected) {
            btnLembrete.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#16a34a;"></i> Conectado`;
            btnLembrete.title = "WhatsApp já conectado e pronto para envios. Clique para ver detalhes ou trocar.";
        } else {
            btnLembrete.innerHTML = `<i class="fa-solid fa-qrcode"></i> Conectar / QR Code`;
            btnLembrete.title = "Clique para escanear o QR Code no seu celular.";
        }
    }

    const btnDir = document.getElementById("btnDirWpQrCode");
    if (btnDir) {
        if (check.connected) {
            btnDir.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#16a34a;"></i> Conectado`;
            btnDir.title = "WhatsApp já conectado e pronto para envios. Clique para ver detalhes ou trocar.";
        } else {
            btnDir.innerHTML = `<i class="fa-solid fa-qrcode"></i> Conectar / QR Code`;
            btnDir.title = "Clique para escanear o QR Code no seu celular.";
        }
    }

    return check;
}

// Aliases para compatibilidade
async function atualizarStatusRemetenteDirecao() {
    return await atualizarStatusWhatsAppUnificado();
}

async function atualizarStatusRemetenteLembrete() {
    return await atualizarStatusWhatsAppUnificado();
}

// ==========================================
// MODAL DE RELATÓRIO FINAL DE DISPARO
// ==========================================
function exibirRelatorioDisparoWhatsApp(sucessos = [], falhas = []) {
    const modal = document.getElementById("modalRelatorioDisparoWhatsApp");
    const sucCountEl = document.getElementById("relatorioWpSucessoCount");
    const falhaCountEl = document.getElementById("relatorioWpFalhaCount");
    const falhasSection = document.getElementById("relatorioWpFalhasSection");
    const listaFalhasCont = document.getElementById("relatorioWpListaFalhasContainer");

    if (sucCountEl) sucCountEl.innerText = sucessos.length;
    if (falhaCountEl) falhaCountEl.innerText = falhas.length;

    if (falhas.length > 0) {
        if (falhasSection) falhasSection.style.display = "block";
        if (listaFalhasCont) {
            listaFalhasCont.innerHTML = falhas.map(f => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 8px; background:white; border-radius:6px; border-left:4px solid #ef4444;">
                    <div>
                        <strong style="color:#0f172a;">${escapeHtml(f.nome || 'Contato')}</strong>
                        <span style="color:#64748b; font-size:0.75rem; margin-left:6px;">(${escapeHtml(f.telefone || 'Sem fone')})</span>
                    </div>
                    <span style="color:#b91c1c; font-size:0.75rem; font-weight:700;">${escapeHtml(f.motivo || 'Erro de entrega')}</span>
                </div>
            `).join("");
        }
    } else {
        if (falhasSection) falhasSection.style.display = "none";
    }

    if (modal) modal.style.display = "flex";
}

function closeModalRelatorioDisparoWhatsApp() {
    const modal = document.getElementById("modalRelatorioDisparoWhatsApp");
    if (modal) modal.style.display = "none";
}

// ==========================================
// MOTOR DE DISPARO AUTOMÁTICO DE WHATSAPP (SILENCIOSO VIA EVOLUTION API)
// ==========================================
async function sendAutomaticWhatsapp(agendamento, tipoEvento, customMsg = "") {
    if (!agendamento || !agendamento.telefone) return false;

    const config = sigeDB.getWhatsappConfig();
    if (!config.enabled) return false;

    if (tipoEvento === 'agendamento_criado' && !config.autoSendOnCreate) return false;
    if (tipoEvento === 'aluno_chegou' && !config.autoSendOnArrival) return false;
    if ((tipoEvento === 'lembrete_24h' || tipoEvento === 'lembrete_dia') && !config.autoSendReminders) return false;

    let cleanPhone = (agendamento.telefone || "").replace(/\D/g, "");
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = "55" + cleanPhone;
    }

    // Busca o número cadastrado da Orientadora designada para direcionar retornos
    const orientadorasList = sigeDB.getOrientadoras();
    const orientadoraObj = orientadorasList.find(o =>
        agendamento.orientadora && o.nome && 
        agendamento.orientadora.toLowerCase().split(' ').some(w => w.length > 3 && o.nome.toLowerCase().includes(w))
    ) || orientadorasList[0];

    let orientadoraCleanPhone = orientadoraObj ? orientadoraObj.telefone.replace(/\D/g, "") : "";
    if (orientadoraCleanPhone.length === 10 || orientadoraCleanPhone.length === 11) {
        orientadoraCleanPhone = "55" + orientadoraCleanPhone;
    }

    let defaultText = "";
    let tipoTitulo = "Notificação WhatsApp";
    const orientadoraNome = agendamento.orientadora || (orientadoraObj ? orientadoraObj.nome : 'OP');

    const linkRetornoOrientadora = orientadoraCleanPhone ? `\n\n💬 Retorno / Dúvidas diretamente para o WhatsApp da ${orientadoraNome}: https://wa.me/${orientadoraCleanPhone}` : "";

    // Evento de Chegada na Recepção: Notifica APENAS a Orientadora
    if (tipoEvento === "aluno_chegou") {
        const msgToOrientadora = `🔔 AVISO DE RECEPÇÃO OP: O responsável pelo aluno(a) ${agendamento.aluno} (${agendamento.turma}) acabou de chegar na recepção e aguarda atendimento (${agendamento.horario}).`;
        let oriSuccess = false;

        if (typeof evolutionClient !== 'undefined' && evolutionClient.isConfigured() && orientadoraCleanPhone) {
            const sendRes = await evolutionClient.sendText(orientadoraCleanPhone, msgToOrientadora, { instanceName: "sige_orientacao" });
            oriSuccess = sendRes.success;
        } else {
            oriSuccess = true;
        }

        sigeDB.logWhatsappDispatch(agendamento.id, {
            tipo: `Aviso na Caixa da ${orientadoraNome}`,
            mensagem: msgToOrientadora,
            modo: "automático",
            status: oriSuccess ? "sucesso" : "falha",
            destinatario: orientadoraCleanPhone || orientadoraNome
        });

        showToast(`🔔 Orientadora ${orientadoraNome} notificada da chegada na recepção!`);
        return true;
    }

    if (tipoEvento === "agendamento_criado") {
        tipoTitulo = "Confirmação de Agendamento";
        defaultText = `Olá ${agendamento.responsavel || 'Responsável'}! Confirmamos o agendamento da Orientação Pedagógica no Centro Educacional Pedro Rizzi para ${agendamento.aluno} (${agendamento.turma}) no dia ${formatDateBR(agendamento.data)} às ${agendamento.horario}. Orientadora: ${orientadoraNome}.${linkRetornoOrientadora}`;
    } else if (tipoEvento === "lembrete_24h") {
        tipoTitulo = "Lembrete de 24h";
        defaultText = `Olá ${agendamento.responsavel || 'Responsável'}! Lembramos da reunião da Orientação Pedagógica no Centro Educacional Pedro Rizzi AMANHÃ (${formatDateBR(agendamento.data)}) às ${agendamento.horario}. Orientadora: ${orientadoraNome}.${linkRetornoOrientadora}`;
    } else if (tipoEvento === "lembrete_dia") {
        tipoTitulo = "Lembrete do Dia";
        defaultText = `Olá ${agendamento.responsavel || 'Responsável'}! Lembramos da sua reunião HOJE (${formatDateBR(agendamento.data)}) às ${agendamento.horario} no Centro Educacional Pedro Rizzi. Orientadora: ${orientadoraNome}.${linkRetornoOrientadora}`;
    }

    const textToSend = customMsg || defaultText;
    let success = false;

    if (typeof evolutionClient !== 'undefined' && evolutionClient.isConfigured()) {
        const sendRes = await evolutionClient.sendText(cleanPhone, textToSend, { instanceName: "sige_orientacao" });
        success = sendRes.success;
    } else {
        success = true;
    }

    sigeDB.logWhatsappDispatch(agendamento.id, {
        tipo: tipoTitulo,
        mensagem: textToSend,
        modo: "automático",
        status: success ? "sucesso" : "falha",
        destinatario: cleanPhone
    });

    if (success) {
        showToast(`🤖 WhatsApp automático enviado para ${agendamento.responsavel || agendamento.aluno}!`);
    }

    return success;
}

function zerarTodosAtendimentosOPConfirm() {
    if (!sigeDB || !sigeDB.isDev()) {
        showToast("⚠️ Acesso Restrito: Apenas o Desenvolvedor do Sistema tem permissão para zerar atendimentos da Orientação Educacional.", "warning");
        return;
    }
    const total = (typeof sigeDB !== 'undefined' && sigeDB.getAgendamentosOP) ? sigeDB.getAgendamentosOP().length : 0;
    const confirmMsg = `ATENÇÃO: Deseja realmente zerar e excluir TODOS os atendimentos da Orientação Educacional?\n\n` +
        `• Quantidade de atendimentos atuais: ${total}\n` +
        `• A ação é irreversível e limpará tanto a nuvem (Firebase) quanto os navegadores conectados.\n` +
        `• Os profissionais cadastrados (orientadoras e equipe) permanecerão preservados.\n\n` +
        `Digite 'ZERAR' para confirmar:`;

    const resposta = prompt(confirmMsg);
    if (resposta !== 'ZERAR') {
        if (resposta !== null) {
            alert('Ação cancelada: confirmação não digitada corretamente.');
        }
        return;
    }

    try {
        if (typeof sigeDB !== 'undefined' && sigeDB.zerarAtendimentosOP) {
            sigeDB.zerarAtendimentosOP();
            if (typeof renderModuleOrientacaoPedagogica === 'function') {
                renderModuleOrientacaoPedagogica();
            }
            if (typeof renderWeeklyCalendar === 'function') {
                renderWeeklyCalendar();
            }
            if (typeof renderResumoOrientadorasCards === 'function') {
                renderResumoOrientadorasCards();
            }
            if (typeof renderDashboardOPStats === 'function') {
                renderDashboardOPStats();
            }
            if (typeof showToast === 'function') {
                showToast("Todos os atendimentos da Orientação foram zerados com sucesso!", "success");
            } else {
                alert("Todos os atendimentos da Orientação foram zerados com sucesso!");
            }
        }
    } catch (err) {
        console.error("Erro ao zerar atendimentos:", err);
        alert("Ocorreu um erro ao zerar os atendimentos: " + err.message);
    }
}
window.zerarTodosAtendimentosOPConfirm = zerarTodosAtendimentosOPConfirm;

function openModalOrientadoras() {
    const list = (typeof sigeDB !== 'undefined' && sigeDB.getOrientadoras) ? sigeDB.getOrientadoras() : [];
    const container = document.getElementById("modalOrientadorasListContainer");

    if (container) {
        if (list.length === 0) {
            container.innerHTML = `
                <div style="padding: 1.5rem; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; text-align: center; color: #64748b;">
                    <i class="fa-solid fa-user-xmark" style="font-size: 2rem; color: #94a3b8; margin-bottom: 8px;"></i>
                    <p style="margin: 0; font-weight: 700;">Nenhuma orientadora cadastrada na Equipe Escolar.</p>
                    <p style="margin: 4px 0 0 0; font-size: 0.8rem;">Cadastre orientadoras no módulo Equipe Escolar primeiro para configurar seus contatos de WhatsApp.</p>
                </div>
            `;
        } else {
            container.innerHTML = list.map((o, idx) => {
                const theme = ORIENTADORA_PALETTE[idx % ORIENTADORA_PALETTE.length];
                return `
                    <div style="background: ${theme.bg}; border: 1px solid ${theme.border}; border-left: 5px solid ${theme.borderLeft}; padding: 1rem; border-radius: 12px;">
                        <div style="font-weight: 900; color: ${theme.text}; font-size: 0.95rem; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                            <span><i class="fa-solid fa-user-gear"></i> ${escapeHtml(o.nome)}</span>
                            <span style="font-size: 0.75rem; background: white; padding: 2px 8px; border-radius: 6px; border: 1px solid ${theme.border}; font-weight: 800;">${escapeHtml(o.turmasOuSalas || o.cargoFuncao || "Orientadora")}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
                            <div>
                                <label style="font-size: 0.75rem; font-weight: 800; color: #475569; display: block; margin-bottom: 4px;">WhatsApp (com DDD):</label>
                                <input type="text" data-ori-id="${escapeHtml(o.id)}" data-ori-nome="${escapeHtml(o.nome)}" class="search-input dynamic-ori-phone" value="${escapeHtml(o.telefone || '')}" placeholder="(47) 99999-9999" style="width: 100%; font-size: 0.85rem;" oninput="mascaraTelefoneInput(this)">
                            </div>
                            <div>
                                <label style="font-size: 0.75rem; font-weight: 800; color: #475569; display: block; margin-bottom: 4px;">E-mail Institucional:</label>
                                <input type="email" data-ori-id="${escapeHtml(o.id)}" class="search-input dynamic-ori-email" value="${escapeHtml(o.email || '')}" placeholder="orientadora@escola.gov.br" style="width: 100%; font-size: 0.85rem;">
                            </div>
                        </div>
                    </div>
                `;
            }).join("");
        }
    }

    const modal = document.getElementById("modalCadastroOrientadoras");
    if (modal) modal.style.display = "flex";
}

function closeModalOrientadoras() {
    const modal = document.getElementById("modalCadastroOrientadoras");
    if (modal) modal.style.display = "none";
}

function salvarTelefonesOrientadoras(e) {
    if (e && e.preventDefault) e.preventDefault();
    const phoneInputs = document.querySelectorAll(".dynamic-ori-phone");

    phoneInputs.forEach(input => {
        const id = input.getAttribute("data-ori-id");
        const nome = input.getAttribute("data-ori-nome");
        const tel = input.value.trim();
        const emailInput = document.querySelector(`.dynamic-ori-email[data-ori-id="${id}"]`);
        const email = emailInput ? emailInput.value.trim() : "";
        sigeDB.saveOrientadora(id, nome, tel, email);
    });

    closeModalOrientadoras();
    showToast("💾 Telefones e dados das Orientadoras salvos com sucesso!", "success");
    if (typeof updateAllDynamicSelects === "function") updateAllDynamicSelects();
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

// MÓDULO DE ADMINISTRAÇÃO AVANÇADA DO SISTEMA
// ==========================================

let currentSetorFilter = "todos";
let equipeBuscaTexto = "";

function filtrarEquipeEscolar(setor) {
    currentSetorFilter = setor || "todos";
    
    const setores = ["todos", "docentes", "orientacao", "supervisao", "direcao", "secretaria", "apoio"];
    setores.forEach(s => {
        ['btnFilterSetor_', 'btnFilterSetorAdmin_'].forEach(prefix => {
            const btn = document.getElementById(`${prefix}${s}`);
            if (btn) {
                if (s === currentSetorFilter) {
                    btn.classList.add("active");
                    btn.style.background = "#1e293b";
                    btn.style.color = "#ffffff";
                    btn.style.fontWeight = "700";
                } else {
                    btn.classList.remove("active");
                    btn.style.background = "#f1f5f9";
                    btn.style.color = "#334155";
                    btn.style.fontWeight = "normal";
                }
            }
        });
    });

    renderEquipeEscolarTable(currentSetorFilter, equipeBuscaTexto);
}

function filtrarEquipeEscolarTexto() {
    const input = document.getElementById("equipeSearchInput");
    equipeBuscaTexto = input ? input.value.trim().toLowerCase() : "";
    renderEquipeEscolarTable(currentSetorFilter, equipeBuscaTexto);
}

function renderAdminPendingUsers() {
    const card = document.getElementById("adminPendingUsersCard");
    const tbody = document.getElementById("adminPendingUsersTableBody");
    const badgeCount = document.getElementById("badgePendingUsersCount");
    if (!card || !tbody) return;

    const logged = sigeDB.getLoggedUser();
    const isDev = logged && (logged.role === 'desenvolvedor' || (logged.email && logged.email.toLowerCase().trim() === 'elcortelini@gmail.com') || (logged.cpf && cleanCpf(logged.cpf) === '80603742068'));
    if (!isDev) {
        card.style.display = 'none';
        return;
    }

    const pendentes = sigeDB.getUsuariosPendentes();
    if (badgeCount) {
        badgeCount.innerText = `${pendentes.length} Pendente(s)`;
    }

    const btnTopAlert = document.getElementById("btnTopBarPendingAlert");
    const topPendingCount = document.getElementById("topBarPendingCountText");
    if (btnTopAlert) {
        if (pendentes.length > 0) {
            btnTopAlert.style.display = "inline-flex";
            if (topPendingCount) topPendingCount.innerText = `${pendentes.length} Pendente(s)`;
        } else {
            btnTopAlert.style.display = "none";
        }
    }

    if (pendentes.length === 0) {
        card.style.display = 'none';
        tbody.innerHTML = '';
        return;
    }

    card.style.display = 'block';

    const modulosInternos = [
        { key: 'op', label: 'OE', fullLabel: 'Orientação Educacional', color: '#fef3c7', textColor: '#92400e' },
        { key: 'mural', label: 'Mural', fullLabel: 'Mural & Prazos', color: '#f1f5f9', textColor: '#334155' },
        { key: 'supervisao', label: 'Supervisão', fullLabel: 'Supervisão Pedagógica', color: '#f5f3ff', textColor: '#6b21a8' },
        { key: 'admin', label: 'ADM', fullLabel: 'Administração Integrada', color: '#eff6ff', textColor: '#1e40af' },
        { key: 'direcao', label: '👑 Direção', fullLabel: 'Direção Executiva', color: '#ecfdf5', textColor: '#065f46' },
        { key: 'uniformes', label: 'Uniformes', fullLabel: 'Controle de Uniformes', color: '#e0f2fe', textColor: '#0369a1' }
    ];

    const sistemasExternos = [
        { key: 'ext_recursos', label: '💻 Lab', fullLabel: 'Agendamento Lab & Recursos', color: '#ffedd5', textColor: '#c2410c' },
        { key: 'ext_dashboard', label: '📊 Dash', fullLabel: 'Dashboard de Avaliação', color: '#dcfce7', textColor: '#15803d' },
        { key: 'ext_contabil', label: '💰 Contábil', fullLabel: 'Sistema Contábil (APMF)', color: '#dbeafe', textColor: '#1d4ed8' },
        { key: 'ext_biblioteca', label: '📚 Biblio', fullLabel: 'Sistema da Biblioteca', color: '#fce7f3', textColor: '#be185d' },
        { key: 'ext_patrimonio', label: '📦 Patrimônio', fullLabel: 'Sistema de Patrimônio', color: '#fef9c3', textColor: '#a16207' }
    ];

    tbody.innerHTML = pendentes.map((u, idx) => {
        const dataFormatada = u.solicitadoEm || (u.dataSolicitacao ? new Date(u.dataSolicitacao).toLocaleDateString('pt-BR') : 'Recente');
        const userRole = u.role || 'docentes';
        const defaults = sigeDB.getDefaultPermissoesByRole(userRole);
        const perms = u.permissoes || defaults;
        const idToAct = u.cpf || u.email || u.id;

        return `
            <tr style="border-bottom: 1px solid #fed7aa;">
                <td style="padding:10px 12px;">
                    <strong style="color:#0f172a; display:block; font-size:0.92rem;">${escapeHtml(u.nome)}</strong>
                    ${u.cpf ? `<span style="color:#1e3a8a; font-size:0.82rem; font-weight:800; display:block;"><i class="fa-solid fa-address-card"></i> CPF: ${escapeHtml(u.cpf)}</span>` : ''}
                    ${u.dataNascimento ? `<span style="color:#059669; font-size:0.78rem; font-weight:700; display:block;"><i class="fa-solid fa-cake-candles"></i> Nasc (Senha): ${escapeHtml(u.dataNascimento)}</span>` : ''}
                    ${u.cargo ? `<span style="color:#64748b; font-size:0.76rem; display:block;"><i class="fa-solid fa-briefcase"></i> ${escapeHtml(u.cargo)} (${escapeHtml(u.turno || 'Matutino')})</span>` : ''}
                    ${u.email ? `<span style="color:#64748b; font-size:0.75rem;"><i class="fa-regular fa-envelope"></i> ${escapeHtml(u.email)}</span>` : ''}
                    ${(u.whatsapp || u.telefone) ? `<span style="color:#0284c7; font-size:0.75rem; display:block;"><i class="fa-brands fa-whatsapp"></i> ${escapeHtml(u.whatsapp || u.telefone)}</span>` : ''}
                </td>
                <td style="padding:10px 12px; color:#64748b; font-size:0.8rem;">
                    <i class="fa-regular fa-clock"></i> ${escapeHtml(dataFormatada)}
                </td>
                <td style="padding:10px 12px;">
                    <select id="pending_role_${idx}" onchange="ajustarModulosDefaultPendente(${idx})" style="padding:6px 10px; border-radius:8px; border:1px solid #cbd5e1; font-size:0.82rem; font-weight:700; width:100%; background:white;">
                        <option value="docentes" ${userRole === 'docentes' ? 'selected' : ''}>👨‍🏫 Docente</option>
                        <option value="orientacao" ${userRole.startsWith('orient') ? 'selected' : ''}>🧭 Orientação Educacional</option>
                        <option value="supervisao" ${userRole === 'supervisao' ? 'selected' : ''}>📋 Supervisão Pedagógica</option>
                        <option value="secretaria" ${userRole === 'secretaria' ? 'selected' : ''}>📑 Secretaria Escolar</option>
                        <option value="direcao" ${userRole === 'direcao' ? 'selected' : ''}>👑 Direção Escolar</option>
                        <option value="apoio" ${userRole === 'apoio' ? 'selected' : ''}>🔧 Apoio / TI</option>
                    </select>
                </td>
                <td style="padding:10px 12px;">
                    <div style="font-size:0.7rem; font-weight:800; color:#64748b; margin-bottom:4px; text-transform:uppercase;">Módulos SIGE:</div>
                    <div style="display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;">
                        ${modulosInternos.map(m => `
                            <label style="display:inline-flex; align-items:center; gap:3px; background:${m.color}; color:${m.textColor}; border:1px solid rgba(0,0,0,0.08); padding:2px 6px; border-radius:6px; font-size:0.73rem; cursor:pointer; font-weight:800;" title="${m.fullLabel}">
                                <input type="checkbox" id="pending_mod_${idx}_${m.key}" ${perms[m.key] ? 'checked' : ''}> ${m.label}
                            </label>
                        `).join('')}
                    </div>
                    <div style="font-size:0.7rem; font-weight:800; color:#ea580c; margin-bottom:4px; text-transform:uppercase;">Sistemas Externos:</div>
                    <div style="display:flex; flex-wrap:wrap; gap:4px;">
                        ${sistemasExternos.map(m => `
                            <label style="display:inline-flex; align-items:center; gap:3px; background:${m.color}; color:${m.textColor}; border:1px solid rgba(0,0,0,0.08); padding:2px 6px; border-radius:6px; font-size:0.73rem; cursor:pointer; font-weight:800;" title="${m.fullLabel}">
                                <input type="checkbox" id="pending_mod_${idx}_${m.key}" ${perms[m.key] ? 'checked' : ''}> ${m.label}
                            </label>
                        `).join('')}
                    </div>
                </td>
                <td style="padding:10px 12px; text-align:right;">
                    <div style="display:inline-flex; gap:6px;">
                        <button type="button" onclick="execAprovarPendente('${escapeHtml(idToAct)}', ${idx})" class="btn" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:8px; font-size:0.78rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 6px rgba(22,163,74,0.3);">
                            <i class="fa-solid fa-check"></i> Aprovar
                        </button>
                        <button type="button" onclick="execRecusarPendente('${escapeHtml(idToAct)}')" class="btn" style="background:#fee2e2; color:#ef4444; border:1px solid #fecaca; padding:6px 8px; border-radius:8px; font-size:0.78rem; cursor:pointer;" title="Recusar solicitação">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function ajustarModulosDefaultPendente(idx) {
    const roleSelect = document.getElementById(`pending_role_${idx}`);
    if (!roleSelect) return;
    const role = roleSelect.value;
    const defaults = sigeDB.getDefaultPermissoesByRole(role);
    ['op', 'mural', 'supervisao', 'admin', 'direcao', 'uniformes', 'ext_recursos', 'ext_dashboard', 'ext_contabil', 'ext_biblioteca', 'ext_patrimonio'].forEach(k => {
        const chk = document.getElementById(`pending_mod_${idx}_${k}`);
        if (chk) chk.checked = !!defaults[k];
    });
}

function execAprovarPendente(identifier, idx) {
    const roleSelect = document.getElementById(`pending_role_${idx}`);
    const role = roleSelect ? roleSelect.value : 'docentes';
    const perms = {
        op: !!document.getElementById(`pending_mod_${idx}_op`)?.checked,
        mural: !!document.getElementById(`pending_mod_${idx}_mural`)?.checked,
        supervisao: !!document.getElementById(`pending_mod_${idx}_supervisao`)?.checked,
        admin: !!document.getElementById(`pending_mod_${idx}_admin`)?.checked,
        direcao: !!document.getElementById(`pending_mod_${idx}_direcao`)?.checked,
        uniformes: !!document.getElementById(`pending_mod_${idx}_uniformes`)?.checked,
        ext_recursos: !!document.getElementById(`pending_mod_${idx}_ext_recursos`)?.checked,
        ext_dashboard: !!document.getElementById(`pending_mod_${idx}_ext_dashboard`)?.checked,
        ext_contabil: !!document.getElementById(`pending_mod_${idx}_ext_contabil`)?.checked,
        ext_biblioteca: !!document.getElementById(`pending_mod_${idx}_ext_biblioteca`)?.checked,
        ext_patrimonio: !!document.getElementById(`pending_mod_${idx}_ext_patrimonio`)?.checked
    };

    const user = sigeDB.aprovarUsuarioPendente(identifier, role, perms);
    if (user) {
        showToast(`✅ Acesso de ${user.nome} autorizado com sucesso!`);
        renderAdminPendingUsers();
        renderEquipeEscolarTable();
        renderAdminPermissoesUsuarios();
    }
}

function execRecusarPendente(identifier) {
    if (!confirm(`Deseja realmente recusar e remover esta solicitação de acesso?`)) return;
    if (sigeDB.recusarUsuarioPendente(identifier)) {
        showToast(`Solicitação removida com sucesso.`);
        renderAdminPendingUsers();
        renderEquipeEscolarTable();
        renderAdminPermissoesUsuarios();
    }
}

function scrollToPendingRequests() {
    if (typeof switchTab === 'function') {
        switchTab('dev', 'rbac');
    }
    setTimeout(() => {
        const card = document.getElementById('adminPendingUsersCard');
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 150);
}

function renderEquipeEscolarTable(setorFiltro = currentSetorFilter, buscaTexto = equipeBuscaTexto) {
    renderAdminPendingUsers();
    const tbody = document.getElementById("admEquipeTableBody");
    const tbodyAdmin = document.getElementById("admEquipeTableBodyAdmin");
    if (!tbody && !tbodyAdmin) return;

    const equipe = sigeDB.getEquipeEscolar();
    if (!equipe || !Array.isArray(equipe)) return;

    // Atualiza KPIs Globais do Card Unificado
    const kpiTotal = document.getElementById("equipeKpiTotal");
    const kpiAcesso = document.getElementById("equipeKpiAcessoLiberado");
    const kpiDocentes = document.getElementById("equipeKpiDocentes");
    const kpiGestao = document.getElementById("equipeKpiGestao");

    let countAcesso = 0;
    let countDocentes = 0;
    let countGestao = 0;

    equipe.forEach(p => {
        const isMasterDev = (p.email && p.email.toLowerCase().trim() === "elcortelini@gmail.com");
        const perms = p.permissoes || {};
        const modulosAtivos = ['op', 'mural', 'supervisao', 'admin', 'direcao', 'uniformes'].filter(k => !!perms[k]);
        if (isMasterDev || modulosAtivos.length > 0) {
            countAcesso++;
        }
        if (p.setor === "docentes") {
            countDocentes++;
        } else {
            countGestao++;
        }
    });

    ['equipeKpiTotal', 'equipeKpiTotalAdmin'].forEach(id => { const el = document.getElementById(id); if (el) el.innerText = equipe.length; });
    ['equipeKpiAcessoLiberado', 'equipeKpiAcessoLiberadoAdmin'].forEach(id => { const el = document.getElementById(id); if (el) el.innerText = countAcesso; });
    ['equipeKpiDocentes', 'equipeKpiDocentesAdmin'].forEach(id => { const el = document.getElementById(id); if (el) el.innerText = countDocentes; });
    ['equipeKpiGestao', 'equipeKpiGestaoAdmin'].forEach(id => { const el = document.getElementById(id); if (el) el.innerText = countGestao; });

    // Aplica Filtro de Setor
    let lista = equipe;
    if (setorFiltro && setorFiltro !== "todos") {
        lista = lista.filter(p => p.setor === setorFiltro);
    }

    // Aplica Filtro de Busca Textual
    if (buscaTexto) {
        const termo = buscaTexto.toLowerCase();
        lista = lista.filter(p => {
            const nome = (p.nome || '').toLowerCase();
            const email = (p.email || '').toLowerCase();
            const cargo = (p.cargoFuncao || '').toLowerCase();
            const disc = (p.disciplina || '').toLowerCase();
            const tel = (p.telefone || '').replace(/\D/g, "");
            const turmas = (p.turmasOuSalas || '').toLowerCase();
            return nome.includes(termo) || email.includes(termo) || cargo.includes(termo) || disc.includes(termo) || tel.includes(termo) || turmas.includes(termo);
        });
    }

    if (lista.length === 0) {
        const emptyHtml = `
            <tr>
                <td colspan="5" style="padding:2.5rem 1rem; text-align:center; color:#64748b;">
                    <i class="fa-solid fa-user-slash" style="font-size:2rem; margin-bottom:10px; display:block; color:#cbd5e1;"></i>
                    <strong style="display:block; font-size:1rem; color:#1e293b;">Nenhum colaborador encontrado</strong>
                    <span style="font-size:0.83rem; color:#64748b;">Verifique os critérios do filtro ou clique no botão "+ Cadastrar Colaborador & Acesso".</span>
                </td>
            </tr>
        `;
        if (tbody) tbody.innerHTML = emptyHtml;
        if (tbodyAdmin) tbodyAdmin.innerHTML = emptyHtml;
        return;
    }

    const badgeSetor = (setor) => {
        switch (setor) {
            case "docentes": return `<span style="background:#e0f2fe; color:#0369a1; padding:2px 7px; border-radius:6px; font-size:0.76rem; font-weight:800;">👨‍🏫 Docente</span>`;
            case "orientacao": return `<span style="background:#fef3c7; color:#92400e; padding:2px 7px; border-radius:6px; font-size:0.76rem; font-weight:800;">🧭 Orientação (OE)</span>`;
            case "supervisao": return `<span style="background:#f5f3ff; color:#6b21a8; padding:2px 7px; border-radius:6px; font-size:0.76rem; font-weight:800;">📋 Supervisão</span>`;
            case "direcao": return `<span style="background:#ecfdf5; color:#065f46; padding:2px 7px; border-radius:6px; font-size:0.76rem; font-weight:800;">👑 Direção</span>`;
            case "secretaria": return `<span style="background:#cff4fc; color:#055160; padding:2px 7px; border-radius:6px; font-size:0.76rem; font-weight:800;">📑 Secretaria</span>`;
            case "apoio": return `<span style="background:#f1f5f9; color:#475569; padding:2px 7px; border-radius:6px; font-size:0.76rem; font-weight:800;">🔧 Apoio / TI</span>`;
            default: return `<span style="background:#f1f5f9; color:#334155; padding:2px 7px; border-radius:6px; font-size:0.76rem; font-weight:800;">Geral</span>`;
        }
    };

    const modulosConfig = [
        { key: 'op', label: 'OE', fullLabel: 'Orientação Educacional', icon: 'fa-heart-pulse', colorClass: 'mod-op' },
        { key: 'mural', label: 'Mural', fullLabel: 'Mural & Prazos', icon: 'fa-chalkboard-user', colorClass: 'mod-mural' },
        { key: 'supervisao', label: 'Supervisão', fullLabel: 'Supervisão Pedagógica', icon: 'fa-clipboard-check', colorClass: 'mod-supervisao' },
        { key: 'admin', label: 'ADM', fullLabel: 'Administração Integrada', icon: 'fa-gears', colorClass: 'mod-admin' },
        { key: 'direcao', label: 'Dir', fullLabel: 'Direção Executiva', icon: 'fa-crown', colorClass: 'mod-direcao' },
        { key: 'uniformes', label: 'Uniformes', fullLabel: 'Controle de Uniformes', icon: 'fa-shirt', colorClass: 'mod-uniformes' },
        { key: 'ext_recursos', label: 'Lab', fullLabel: 'Agendamento Lab & Recursos', icon: 'fa-calendar-check', colorClass: 'mod-ext-recursos' },
        { key: 'ext_dashboard', label: 'Dash', fullLabel: 'Dashboard de Avaliação', icon: 'fa-chart-line', colorClass: 'mod-ext-dash' },
        { key: 'ext_contabil', label: 'Contábil', fullLabel: 'Sistema Contábil (APMF)', icon: 'fa-calculator', colorClass: 'mod-ext-contabil' },
        { key: 'ext_biblioteca', label: 'Biblio', fullLabel: 'Sistema da Biblioteca', icon: 'fa-book-bookmark', colorClass: 'mod-ext-biblio' },
        { key: 'ext_patrimonio', label: 'Patrimônio', fullLabel: 'Sistema de Patrimônio', icon: 'fa-boxes-stacked', colorClass: 'mod-ext-patrimonio' }
    ];

    const rowsHtml = lista.map(p => {
        const isMasterDev = (p.email && p.email.toLowerCase().trim() === "elcortelini@gmail.com");
        const cleanPhone = p.telefone ? p.telefone.replace(/\D/g, "") : "";
        const waPhone = cleanPhone.length >= 10 && !cleanPhone.startsWith("55") ? "55" + cleanPhone : cleanPhone;
        const waLink = waPhone ? `https://api.whatsapp.com/send?phone=${waPhone}` : null;
        const iniciais = p.nome ? p.nome.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'P';
        const perms = p.permissoes || {};

        // Chips dos 6 Módulos Interativos (com 1 clique ativa / desativa)
        const chipsHtml = modulosConfig.map(m => {
            const isActive = isMasterDev ? true : !!perms[m.key];
            const activeClass = isActive ? `active ${m.colorClass}` : 'inactive';
            const iconStatus = isActive ? 'fa-check' : 'fa-xmark';

            let chipLabel = m.label;
            if (m.key === 'op' && isActive) {
                const pPerfil = (typeof sigeDB !== 'undefined' && sigeDB.getOpPerfil) ? sigeDB.getOpPerfil(p) : 'none';
                const perfilMap = { executora: 'Titular', recepcao: 'Recepção', gerencial: 'Gestão' };
                if (perfilMap[pPerfil]) {
                    chipLabel = `${m.label} <small style="font-size:0.55rem; opacity:0.85;">(${perfilMap[pPerfil]})</small>`;
                }
            }

            const titleTooltip = isMasterDev 
                ? `${m.fullLabel}: Acesso Master Obrigatório` 
                : `${m.fullLabel}: Clique para ${isActive ? 'Revogar' : 'Liberar'} acesso`;

            if (isMasterDev) {
                return `
                    <span class="rbac-mod-chip active ${m.colorClass} disabled" title="${escapeHtml(titleTooltip)}">
                        <i class="fa-solid ${m.icon}"></i>
                        <span>${chipLabel}</span>
                        <i class="fa-solid fa-lock" style="font-size:0.62rem; opacity:0.75;"></i>
                    </span>
                `;
            }

            return `
                <button type="button" 
                    onclick="toggleProfissionalModuloChip('${escapeHtml(p.id)}', '${m.key}')" 
                    class="rbac-mod-chip ${activeClass}" 
                    title="${escapeHtml(titleTooltip)}"
                    aria-label="${m.fullLabel} para ${escapeHtml(p.nome)}">
                    <i class="fa-solid ${m.icon}"></i>
                    <span>${chipLabel}</span>
                    <i class="fa-solid ${iconStatus}" style="font-size:0.65rem;"></i>
                </button>
            `;
        }).join('');

        // Célula do WhatsApp com Link
        let waCell = `<span style="color:#94a3b8; font-size:0.76rem;">Sem contato</span>`;
        if (waLink) {
            waCell = `
                <a href="${waLink}" target="_blank" rel="noopener noreferrer" style="color:#15803d; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:4px; background:#dcfce7; padding:3px 7px; border-radius:6px; font-size:0.76rem; white-space:nowrap;">
                    <i class="fa-brands fa-whatsapp" style="font-size:0.88rem; color:#16a34a;"></i> ${escapeHtml(p.telefone)}
                </a>
            `;
        } else if (p.telefone) {
            waCell = `<span style="color:#475569; font-size:0.76rem; font-weight:600;"><i class="fa-solid fa-phone" style="font-size:0.7rem;"></i> ${escapeHtml(p.telefone)}</span>`;
        }

        return `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 10px;">
                    <div class="rbac-user-cell">
                        <div class="rbac-user-avatar" style="${isMasterDev ? 'background:#7c3aed; color:white;' : ''}">${escapeHtml(iniciais)}</div>
                        <div class="rbac-user-details">
                            <span class="rbac-user-name" style="display:flex; align-items:center; gap:5px;">
                                ${escapeHtml(p.nome)}
                                ${isMasterDev ? '<span style="font-size:0.65rem; background:#ede9fe; color:#6d28d9; padding:1px 5px; border-radius:4px; font-weight:800;"><i class="fa-solid fa-crown"></i> DEV</span>' : ''}
                            </span>
                            <span class="rbac-user-email">
                                ${p.email ? `<i class="fa-regular fa-envelope"></i> ${escapeHtml(p.email)}` : '<span style="color:#94a3b8; font-style:italic;">Sem e-mail</span>'}
                            </span>
                        </div>
                    </div>
                </td>
                <td style="padding:8px 10px;">
                    <div>${badgeSetor(p.setor)}</div>
                    <div style="font-size:0.76rem; font-weight:700; color:#334155; margin-top:2px;">${escapeHtml(p.cargoFuncao || p.setor)}</div>
                    ${p.disciplina ? `<div style="font-size:0.72rem; color:#64748b;">${escapeHtml(p.disciplina)}</div>` : ''}
                </td>
                <td style="padding:8px 10px;">
                    ${waCell}
                </td>
                <td style="padding:8px 10px;">
                    <div class="rbac-modules-grid">
                        ${chipsHtml}
                    </div>
                </td>
                <td style="padding:8px 10px; text-align:right;">
                    <div style="display:flex; justify-content:flex-end; gap:5px; align-items:center;">
                        <button type="button" onclick="openDisparoAvisoProfessorModal('${escapeHtml(p.id)}')" class="btn-sec" style="background:#16a34a; color:white; font-size:0.72rem; padding:4px 7px; border-radius:6px; border:none; cursor:pointer;" title="Disparar Aviso WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i>
                        </button>
                        <button type="button" onclick="openCadastroProfissionalModal('${escapeHtml(p.id)}')" class="btn-sec" style="background:#f1f5f9; color:#334155; font-size:0.72rem; padding:4px 7px; border-radius:6px; border:1px solid #cbd5e1; cursor:pointer;" title="Editar Cadastro & Permissões">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        ${isMasterDev ? '' : `
                            <button type="button" onclick="excluirProfissional('${escapeHtml(p.id)}')" class="btn-sec" style="background:#fee2e2; color:#dc2626; font-size:0.72rem; padding:4px 7px; border-radius:6px; border:none; cursor:pointer;" title="Excluir Colaborador">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (tbody) tbody.innerHTML = rowsHtml;
    if (tbodyAdmin) tbodyAdmin.innerHTML = rowsHtml;
}

function toggleProfissionalModuloChip(id, moduloKey) {
    if (!id || !moduloKey) return;
    const equipe = sigeDB.getEquipeEscolar();
    const prof = equipe.find(p => p.id === id);
    if (!prof) return;

    if (prof.email && prof.email.toLowerCase().trim() === "elcortelini@gmail.com") {
        showToast("👑 O Desenvolvedor Master possui acesso irrestrito a todos os módulos!");
        return;
    }

    if (!prof.permissoes) {
        prof.permissoes = sigeDB.getDefaultPermissoesByRole(prof.setor);
    }

    const currentState = !!prof.permissoes[moduloKey];
    prof.permissoes[moduloKey] = !currentState;

    if (moduloKey === 'op') {
        if (prof.permissoes.op) {
            if (!prof.permissoes.op_perfil || prof.permissoes.op_perfil === 'none') {
                prof.permissoes.op_perfil = sigeDB.getDefaultPermissoesByRole(prof.setor).op_perfil || 'recepcao';
            }
        } else {
            prof.permissoes.op_perfil = 'none';
        }
    }

    sigeDB.salvarPermissoesUsuario(prof.id, prof.permissoes);
    if (prof.email) {
        sigeDB.salvarPermissoesUsuario(prof.email, prof.permissoes);
    }
    updateAllDynamicSelects();

    const moduloNome = {
        op: "Orientação Educacional (OE)",
        mural: "Mural & Prazos",
        supervisao: "Supervisão Pedagógica",
        admin: "Administração Integrada",
        direcao: "Direção Executiva",
        uniformes: "Controle de Uniformes",
        ext_recursos: "Laboratório & Recursos",
        ext_dashboard: "Dashboard de Avaliação",
        ext_contabil: "Sistema Contábil (APMF)",
        ext_biblioteca: "Sistema da Biblioteca",
        ext_patrimonio: "Sistema de Patrimônio"
    }[moduloKey] || moduloKey.toUpperCase();

    const acao = prof.permissoes[moduloKey] ? "LIBERADO" : "REVOGADO";
    showToast(`${acao}: Acesso ao módulo ${moduloNome} para ${prof.nome}!`);

    renderEquipeEscolarTable(currentSetorFilter, equipeBuscaTexto);
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
        let html = `<option value="todas">👥 Todos(as) os(as) Orientadores(as) (Geral)</option>`;
        orientadoras.forEach(o => {
            const prefix = (typeof getOrientadorPrefix === 'function') ? getOrientadorPrefix(o.nome, o.cargoFuncao) : 'Orientador(a)';
            const icon = prefix === 'Orientador' ? '🧭' : '💛';
            html += `<option value="${escapeHtml(o.nome)}">${icon} ${escapeHtml(o.nome)} (${escapeHtml(o.telefone || 'Sem WhatsApp')})</option>`;
        });
        selectOpFilter.innerHTML = html;
        if (curVal) selectOpFilter.value = curVal;
        syncRoleFilters();
    }

    if (selectOpModal) {
        const curVal = selectOpModal.value;
        let html = ``;
        orientadoras.forEach(o => {
            const prefix = (typeof getOrientadorPrefix === 'function') ? getOrientadorPrefix(o.nome, o.cargoFuncao) : 'Orientador(a)';
            const icon = prefix === 'Orientador' ? '🧭' : '💛';
            html += `<option value="${escapeHtml(o.nome)}">${icon} ${escapeHtml(o.nome)} (${escapeHtml(o.telefone || 'Sem WhatsApp')})</option>`;
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
            const prefix = (typeof getOrientadorPrefix === 'function') ? getOrientadorPrefix(o.nome, o.cargoFuncao) : 'Orientador(a)';
            const icon = prefix === 'Orientador' ? '🧭' : '💛';
            html += `<option value="${escapeHtml(o.nome)}">${icon} ${escapeHtml(o.nome)}</option>`;
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

    // Selects de Orientadoras no Módulo da Direção
    const selectDirAtendOri = document.getElementById("dirAtendFilterOrientadora");
    const selectDirRelOri = document.getElementById("dirRelOrientadoraSelect");

    if (selectDirAtendOri) {
        const curVal = selectDirAtendOri.value;
        let html = `<option value="todas">👥 Todas as Orientadoras (Geral)</option>`;
        orientadoras.forEach(o => {
            html += `<option value="${escapeHtml(o.nome)}">💛 ${escapeHtml(o.nome)}</option>`;
        });
        selectDirAtendOri.innerHTML = html;
        if (curVal) selectDirAtendOri.value = curVal;
    }

    if (selectDirRelOri) {
        const curVal = selectDirRelOri.value;
        let html = `<option value="todas">Todas as Orientadoras</option>`;
        orientadoras.forEach(o => {
            html += `<option value="${escapeHtml(o.nome)}">${escapeHtml(o.nome)}</option>`;
        });
        selectDirRelOri.innerHTML = html;
        if (curVal) selectDirRelOri.value = curVal;
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
}

function setAllProfissionalModulos(checked = true) {
    const keys = ["op", "mural", "supervisao", "admin", "direcao", "uniformes", "ext_recursos", "ext_dashboard", "ext_contabil", "ext_biblioteca", "ext_patrimonio"];
    keys.forEach(k => {
        const chk = document.getElementById(`proChk_${k}`);
        if (chk) chk.checked = !!checked;
    });
    const wrapperOpPerfil = document.getElementById("proOpPerfilWrapper");
    if (wrapperOpPerfil) wrapperOpPerfil.style.display = checked ? "block" : "none";
}

function autoSuggestModulosPorSetor(setor) {
    const defaults = sigeDB.getDefaultPermissoesByRole(setor);
    const keys = ["op", "mural", "supervisao", "admin", "direcao", "uniformes", "ext_recursos", "ext_dashboard", "ext_contabil", "ext_biblioteca", "ext_patrimonio"];
    keys.forEach(k => {
        const chk = document.getElementById(`proChk_${k}`);
        if (chk) chk.checked = !!defaults[k];
    });
    const selOpPerfil = document.getElementById("proSelect_op_perfil");
    const wrapperOpPerfil = document.getElementById("proOpPerfilWrapper");
    if (selOpPerfil) {
        selOpPerfil.value = defaults.op_perfil || (defaults.op ? "recepcao" : "executora");
    }
    if (wrapperOpPerfil) {
        wrapperOpPerfil.style.display = defaults.op ? "block" : "none";
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
    const inputCpf = document.getElementById("proInputCpf");
    const inputDataNasc = document.getElementById("proInputDataNasc");

    const allKeys = ["op", "mural", "supervisao", "admin", "direcao", "uniformes", "ext_recursos", "ext_dashboard", "ext_contabil", "ext_biblioteca", "ext_patrimonio"];

    if (!modal) return;

    if (id && typeof id === "string") {
        const cleanId = id.trim();
        const cleanIdCpf = (typeof cleanCpf === "function") ? cleanCpf(cleanId) : cleanId.replace(/\D/g, "");
        const cleanIdMail = cleanId.toLowerCase();
        const equipe = sigeDB.getEquipeEscolar();
        const users = sigeDB.getUsuarios();

        const prof = equipe.find(p => 
            (p.id && p.id === cleanId) ||
            (cleanIdCpf && cleanCpf(p.cpf || "") === cleanIdCpf) ||
            (cleanIdMail && p.email && p.email.toLowerCase().trim() === cleanIdMail)
        );

        const u = users.find(user => 
            (user.id && user.id === cleanId) ||
            (cleanIdCpf && cleanCpf(user.cpf || "") === cleanIdCpf) ||
            (cleanIdMail && user.email && user.email.toLowerCase().trim() === cleanIdMail)
        );

        const record = prof || u;
        if (record) {
            const resolvedId = (prof && prof.id) || (u && u.id) || cleanId;
            const nome = (prof && prof.nome) || (u && u.nome) || "";
            const setor = (prof && prof.setor) || (u && u.role && u.role !== "desenvolvedor" ? u.role : "docentes");
            const cargo = (prof && prof.cargoFuncao) || (u && u.cargo) || "";
            const disc = (prof && prof.disciplina) || "";
            const tel = (prof && prof.telefone) || (u && (u.whatsapp || u.telefone)) || "";
            const email = (prof && prof.email) || (u && u.email) || "";
            const turno = (prof && prof.turnos) || (u && u.turno) || "matutino";
            const turmas = (prof && prof.turmasOuSalas) || "";
            const cpf = (prof && prof.cpf) || (u && u.cpf) || "";
            const dataNasc = (prof && prof.dataNascimento) || (u && u.dataNascimento) || "";

            if (title) title.innerHTML = `<i class="fa-solid fa-user-pen" style="color:#1e3a8a;"></i> Editar Cadastro & Permissões: ${typeof escapeHtml === "function" ? escapeHtml(nome) : nome}`;
            if (inputId) inputId.value = resolvedId;
            if (inputNome) inputNome.value = nome;
            if (inputSetor) inputSetor.value = setor;
            if (inputCargo) inputCargo.value = cargo;
            if (inputDisc) inputDisc.value = disc;
            if (inputTel) inputTel.value = tel;
            if (inputEmail) inputEmail.value = email;
            if (inputTurno) inputTurno.value = turno;
            if (inputTurmas) inputTurmas.value = turmas;
            if (inputCpf) inputCpf.value = cpf;
            if (inputDataNasc) inputDataNasc.value = dataNasc;

            const perms = (prof && prof.permissoes) || (u && u.permissoes) || sigeDB.getDefaultPermissoesByRole(setor);
            allKeys.forEach(k => {
                const chk = document.getElementById(`proChk_${k}`);
                if (chk) chk.checked = !!perms[k];
            });

            const selOpPerfil = document.getElementById("proSelect_op_perfil");
            const wrapperOpPerfil = document.getElementById("proOpPerfilWrapper");
            if (selOpPerfil) {
                selOpPerfil.value = perms.op_perfil || sigeDB.getOpPerfil(record);
            }
            if (wrapperOpPerfil) {
                wrapperOpPerfil.style.display = perms.op ? "block" : "none";
            }
        }
    } else {
        if (title) title.innerHTML = `<i class="fa-solid fa-user-gear" style="color:#1e3a8a;"></i> Cadastrar Colaborador & Acesso ao Sistema`;
        if (inputId) inputId.value = "";
        if (inputNome) inputNome.value = "";
        if (inputSetor) inputSetor.value = "docentes";
        if (inputCargo) inputCargo.value = "";
        if (inputDisc) inputDisc.value = "";
        if (inputTel) inputTel.value = "";
        if (inputEmail) inputEmail.value = "";
        if (inputTurno) inputTurno.value = "matutino";
        if (inputTurmas) inputTurmas.value = "";
        if (inputCpf) inputCpf.value = "";
        if (inputDataNasc) inputDataNasc.value = "";

        autoSuggestModulosPorSetor("docentes");
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
    const cpf = document.getElementById("proInputCpf")?.value.trim() || "";
    const dataNascimento = document.getElementById("proInputDataNasc")?.value.trim() || "";

    if (!nome || !setor) {
        showToast("⚠️ Preencha pelo menos o Nome e Setor do colaborador!");
        return false;
    }

    const isOpChecked = !!document.getElementById("proChk_op")?.checked;
    const opPerfilVal = document.getElementById("proSelect_op_perfil")?.value || "executora";

    const permissoes = {
        op: isOpChecked,
        op_perfil: isOpChecked ? opPerfilVal : "none",
        mural: !!document.getElementById("proChk_mural")?.checked,
        supervisao: !!document.getElementById("proChk_supervisao")?.checked,
        admin: !!document.getElementById("proChk_admin")?.checked,
        direcao: !!document.getElementById("proChk_direcao")?.checked,
        uniformes: !!document.getElementById("proChk_uniformes")?.checked,
        ext_recursos: !!document.getElementById("proChk_ext_recursos")?.checked,
        ext_dashboard: !!document.getElementById("proChk_ext_dashboard")?.checked,
        ext_contabil: !!document.getElementById("proChk_ext_contabil")?.checked,
        ext_biblioteca: !!document.getElementById("proChk_ext_biblioteca")?.checked,
        ext_patrimonio: !!document.getElementById("proChk_ext_patrimonio")?.checked
    };

    try {
        sigeDB.saveProfissional({
            id: id || null,
            nome,
            setor,
            cargoFuncao,
            disciplina,
            telefone: telefone || "",
            email: email || "",
            turnos,
            turmasOuSalas,
            cpf,
            dataNascimento,
            permissoes
        });

        closeCadastroProfissionalModal();
        updateAllDynamicSelects();
        if (typeof populateActiveRoleSelectOptions === "function") {
            populateActiveRoleSelectOptions(document.getElementById("activeRoleSelect"));
        }
        if (typeof renderAllModules === "function") {
            renderAllModules();
        } else if (typeof renderModuleOrientacaoPedagogica === "function") {
            renderModuleOrientacaoPedagogica();
        }
        if (typeof renderEquipeEscolarTable === "function") {
            if (currentSetorFilter !== "todos" && currentSetorFilter !== setor) {
                if (typeof filtrarEquipeEscolar === "function") {
                    filtrarEquipeEscolar("todos");
                } else {
                    currentSetorFilter = "todos";
                    renderEquipeEscolarTable("todos", equipeBuscaTexto);
                }
            } else {
                renderEquipeEscolarTable(currentSetorFilter, equipeBuscaTexto);
            }
        }
        if (typeof renderAdminPermissoesUsuarios === "function") {
            renderAdminPermissoesUsuarios();
        }
        if (typeof renderDevUsersList === "function") {
            renderDevUsersList();
        }
        showToast(id ? "✅ Cadastro e permissões do colaborador atualizados!" : "✅ Novo colaborador e credenciais registrados com sucesso!");
    } catch (err) {
        console.error("Erro ao salvar colaborador:", err);
        showToast("❌ Erro ao salvar colaborador: " + err.message);
    }
    return false;
}

function editarProfissional(id) {
    openCadastroProfissionalModal(id);
}

function excluirProfissional(id) {
    const equipe = sigeDB.getEquipeEscolar();
    const prof = equipe.find(p => p.id === id);
    if (!prof) return;

    if (prof.email && prof.email.toLowerCase().trim() === "elcortelini@gmail.com") {
        alert("⚠️ O perfil do Desenvolvedor Principal (Master) é protegido pelo sistema e não pode ser excluído.");
        return;
    }

    if (confirm(`Tem certeza que deseja remover o cadastro de ${prof.nome} (${prof.cargoFuncao || prof.setor}) e revogar seus acessos ao sistema?`)) {
        sigeDB.deleteProfissional(id);
        updateAllDynamicSelects();
        if (typeof populateActiveRoleSelectOptions === "function") {
            populateActiveRoleSelectOptions(document.getElementById("activeRoleSelect"));
        }
        if (typeof renderAllModules === "function") {
            renderAllModules();
        } else if (typeof renderModuleOrientacaoPedagogica === "function") {
            renderModuleOrientacaoPedagogica();
        }
        if (typeof renderEquipeEscolarTable === "function") {
            if (currentSetorFilter !== "todos" && currentSetorFilter !== setor) {
                if (typeof filtrarEquipeEscolar === "function") {
                    filtrarEquipeEscolar("todos");
                } else {
                    currentSetorFilter = "todos";
                    renderEquipeEscolarTable("todos", equipeBuscaTexto);
                }
            } else {
                renderEquipeEscolarTable(currentSetorFilter, equipeBuscaTexto);
            }
        }
        if (typeof renderAdminPermissoesUsuarios === "function") {
            renderAdminPermissoesUsuarios();
        }
        if (typeof renderDevUsersList === "function") {
            renderDevUsersList();
        }
        showToast("🗑️ Colaborador e acessos removidos com sucesso.");
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

// GESTÃO DE TURMAS & TURNOS (FORMATO COMPACTO EM ÍCONES AGRUPADOS)
function renderTurmasAdminTable() {
    const container = document.getElementById("admTurmasIconesContainer") || document.getElementById("admTurmasTableBody");
    if (!container) return;

    const turmas = sigeDB.getTurmasEscola() || [];
    if (turmas.length === 0) {
        container.innerHTML = `
            <div style="padding:2rem; text-align:center; color:#64748b; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1;">
                <i class="fa-solid fa-graduation-cap" style="font-size:2rem; color:#94a3b8; margin-bottom:8px; display:block;"></i>
                Nenhuma turma cadastrada no momento. Clique em "+ Nova Turma" para cadastrar.
            </div>
        `;
        return;
    }

    const turnosConfig = [
        { key: "matutino", nome: "Turno Matutino", icone: "fa-sun", corBadge: "#b45309", bg: "#fef3c7", border: "#fde68a" },
        { key: "vespertino", nome: "Turno Vespertino", icone: "fa-cloud-sun", corBadge: "#0369a1", bg: "#e0f2fe", border: "#bae6fd" },
        { key: "integral", nome: "Turno Integral", icone: "fa-clock", corBadge: "#15803d", bg: "#dcfce7", border: "#bbf7d0" },
        { key: "noturno", nome: "Turno Noturno", icone: "fa-moon", corBadge: "#4338ca", bg: "#e0e7ff", border: "#c7d2fe" }
    ];

    let html = '';

    turnosConfig.forEach(cfg => {
        const turmasDoTurno = turmas.filter(t => (t.turno || '').toLowerCase() === cfg.key);
        if (turmasDoTurno.length === 0) return;

        html += `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:12px 16px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                    <span style="background:${cfg.bg}; color:${cfg.corBadge}; border:1px solid ${cfg.border}; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:5px;">
                        <i class="fa-solid ${cfg.icone}"></i> ${cfg.nome}
                    </span>
                    <span style="font-size:0.75rem; color:#64748b; font-weight:700;">(${turmasDoTurno.length} turma(s))</span>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                    ${turmasDoTurno.map(t => {
                        const tooltip = `Turma ${t.nome} (${t.anoLetivo || '2026'})\n• Nível: ${t.nivel || 'Ensino Fundamental'}\n• Sala: ${t.sala || 'Geral'}\n• Regente: ${t.regente || 'Não definido'}`;
                        return `
                            <div style="display:inline-flex; align-items:center; gap:6px; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:4px 8px; box-shadow:0 1px 2px rgba(0,0,0,0.03); transition:all 0.2s;" title="${escapeHtml(tooltip)}">
                                <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:6px; background:${cfg.bg}; color:${cfg.corBadge}; font-size:0.72rem;">
                                    <i class="fa-solid fa-graduation-cap"></i>
                                </span>
                                <span style="font-weight:800; font-size:0.83rem; color:#0f172a; cursor:pointer;" onclick="editarTurma('${t.id}')">
                                    ${escapeHtml(t.nome)}
                                </span>
                                <button type="button" onclick="editarTurma('${t.id}')" style="background:none; border:none; color:#0284c7; cursor:pointer; padding:2px; font-size:0.72rem; line-height:1;" title="Editar Turma">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button type="button" onclick="excluirTurma('${t.id}')" style="background:none; border:none; color:#dc2626; cursor:pointer; padding:2px; font-size:0.72rem; line-height:1;" title="Excluir Turma">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    // Outros turnos se houver
    const chavesConhecidas = turnosConfig.map(c => c.key);
    const outrasTurmas = turmas.filter(t => !chavesConhecidas.includes((t.turno || '').toLowerCase()));
    if (outrasTurmas.length > 0) {
        html += `
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:12px 16px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                    <span style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px;">
                        📌 Geral / Outros
                    </span>
                    <span style="font-size:0.75rem; color:#64748b; font-weight:700;">(${outrasTurmas.length} turma(s))</span>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                    ${outrasTurmas.map(t => {
                        const tooltip = `Turma ${t.nome} (${t.anoLetivo || '2026'})\n• Nível: ${t.nivel || 'Ensino Fundamental'}\n• Sala: ${t.sala || 'Geral'}\n• Regente: ${t.regente || 'Não definido'}`;
                        return `
                            <div style="display:inline-flex; align-items:center; gap:6px; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:4px 8px; box-shadow:0 1px 2px rgba(0,0,0,0.03);" title="${escapeHtml(tooltip)}">
                                <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:6px; background:#f1f5f9; color:#475569; font-size:0.72rem;">
                                    <i class="fa-solid fa-graduation-cap"></i>
                                </span>
                                <span style="font-weight:800; font-size:0.83rem; color:#0f172a; cursor:pointer;" onclick="editarTurma('${t.id}')">
                                    ${escapeHtml(t.nome)}
                                </span>
                                <button type="button" onclick="editarTurma('${t.id}')" style="background:none; border:none; color:#0284c7; cursor:pointer; padding:2px; font-size:0.72rem; line-height:1;" title="Editar Turma">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button type="button" onclick="excluirTurma('${t.id}')" style="background:none; border:none; color:#dc2626; cursor:pointer; padding:2px; font-size:0.72rem; line-height:1;" title="Excluir Turma">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
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

    updateAllSchoolLogoDisplays();
}

function updateAllSchoolLogoDisplays(src) {
    const logoSrc = src || ((window.sigeDB && typeof window.sigeDB.getLogoEscola === 'function') ? window.sigeDB.getLogoEscola() : "img/logo-pedro-rizzi.png");
    const imgs = document.querySelectorAll(".cfg-logo-preview-img, .global-school-logo-img");
    imgs.forEach(img => {
        if (img) img.src = logoSrc;
    });
}

function handleLogoUpload(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast("Por favor, selecione um arquivo de imagem válido (PNG, JPG, SVG, WebP).", "warning");
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showToast("A imagem do logotipo deve ter no máximo 2MB.", "warning");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        sigeDB.saveLogoEscola(base64);
        updateAllSchoolLogoDisplays(base64);
        showToast("Logotipo oficial da escola atualizado e salvo!");
    };
    reader.readAsDataURL(file);
}

function resetarLogoEscolaPadrao() {
    if (confirm("Deseja restaurar o logotipo oficial padrão do Centro Educacional Pedro Rizzi?")) {
        sigeDB.resetLogoEscola();
        updateAllSchoolLogoDisplays("img/logo-pedro-rizzi.png");
        showToast("Logotipo padrão restaurado com sucesso!");
    }
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

function getListaDestinatariosUnificada() {
    const equipe = (typeof sigeDB !== 'undefined' && sigeDB.getEquipeEscolar) ? sigeDB.getEquipeEscolar() : [];
    const contatos = (typeof sigeDB !== 'undefined' && sigeDB.getContatosWhatsApp) ? sigeDB.getContatosWhatsApp() : [];

    const map = new Map();
    equipe.forEach(p => {
        map.set(p.id, {
            id: p.id,
            nome: p.nome,
            telefone: p.telefone || p.whatsapp || '',
            setorLabel: p.setor ? p.setor.toUpperCase() : "DOCENTE",
            cargoFuncao: p.cargoFuncao || p.disciplina || 'Colaborador'
        });
    });

    contatos.forEach(c => {
        if (!map.has(c.id)) {
            const cNomeNorm = (c.nome || '').toLowerCase().trim();
            const existe = Array.from(map.values()).find(item => (item.nome || '').toLowerCase().trim() === cNomeNorm);
            if (!existe) {
                map.set(c.id, {
                    id: c.id,
                    nome: c.nome,
                    telefone: c.telefone || '',
                    setorLabel: (c.tags && c.tags[0]) ? c.tags[0].toUpperCase() : "CONTATO",
                    cargoFuncao: c.cargo || (c.tags ? c.tags.join(', ') : 'Contato Escolar')
                });
            } else if (!existe.telefone && c.telefone) {
                existe.telefone = c.telefone;
            }
        }
    });

    return Array.from(map.values());
}
window.getListaDestinatariosUnificada = getListaDestinatariosUnificada;

function openDisparoAvisoProfessorModal(profId = "todos") {
    const modal = document.getElementById("modalDisparoAvisoProfessor");
    if (!modal) return;

    const cardDest = document.getElementById("avisoDestinatarioCard");
    const geralWrapper = document.getElementById("avisoDestinatarioGeralWrapper");
    const elNome = document.getElementById("avisoDestinatarioNome");
    const elInfo = document.getElementById("avisoDestinatarioInfo");
    const elTelefone = document.getElementById("avisoDestinatarioTelefone");
    const geralTexto = document.getElementById("avisoDestinatarioGeralTexto");
    const inputAssunto = document.getElementById("avisoInputAssunto");
    const inputMsg = document.getElementById("avisoInputMensagem");
    const hiddenId = document.getElementById("avisoSelectedDestId");
    const hiddenPhone = document.getElementById("avisoSelectedDestPhone");
    const hiddenNome = document.getElementById("avisoSelectedDestNome");
    const selectRemetente = document.getElementById("avisoSelectRemetente");

    if (selectRemetente) {
        selectRemetente.value = "sistema_auto";
    }

    if (profId && profId !== "todos") {
        const contatos = (typeof sigeDB !== 'undefined' && sigeDB.getContatosWhatsApp) ? sigeDB.getContatosWhatsApp() : [];
        const equipe = (typeof sigeDB !== 'undefined' && sigeDB.getEquipeEscolar) ? sigeDB.getEquipeEscolar() : [];

        let c = contatos.find(item => item && item.id === profId);
        let tagOrCargo = "";
        if (c) {
            tagOrCargo = c.cargo || (Array.isArray(c.tags) ? c.tags.join(', ') : (c.tag || 'Contato da Escola'));
        } else {
            const p = equipe.find(item => item && item.id === profId);
            if (p) {
                c = {
                    id: p.id,
                    nome: p.nome,
                    telefone: p.telefone || p.whatsapp || '',
                    cargo: p.cargoFuncao || p.disciplina || p.setor || 'Colaborador Escolar'
                };
                tagOrCargo = c.cargo;
            }
        }

        if (!c) {
            const cleanProfId = String(profId).replace(/\D/g, '');
            if (cleanProfId.length >= 8) {
                c = contatos.find(item => item.telefone && item.telefone.replace(/\D/g, '').includes(cleanProfId)) ||
                    equipe.find(item => item.telefone && item.telefone.replace(/\D/g, '').includes(cleanProfId));
            }
        }

        if (cardDest) cardDest.style.display = "flex";
        if (geralWrapper) geralWrapper.style.display = "none";

        if (c) {
            const foneFormatado = formatTelefoneDisplay(c.telefone);
            const hasPhone = c.telefone && c.telefone.replace(/\D/g, '').length >= 10;

            if (elNome) elNome.innerText = c.nome || "Contato";
            if (elInfo) elInfo.innerText = tagOrCargo || "Equipe / Contato";
            if (elTelefone) {
                elTelefone.innerHTML = hasPhone
                    ? `<i class="fa-solid fa-phone" style="font-size:0.8rem; margin-right:3px;"></i>${escapeHtml(foneFormatado)}`
                    : `<span style="color:#ef4444; font-size:0.8rem;"><i class="fa-solid fa-triangle-exclamation"></i> Sem telefone</span>`;
            }

            if (hiddenId) hiddenId.value = c.id || profId;
            if (hiddenPhone) hiddenPhone.value = c.telefone || '';
            if (hiddenNome) hiddenNome.value = c.nome || '';

            const primeiroNome = (c.nome || "Colaborador").trim().split(" ")[0];
            if (inputAssunto) inputAssunto.value = `Recado Oficial para ${primeiroNome}`;
            if (inputMsg) inputMsg.value = `Olá, ${primeiroNome}!\n\nEntramos em contato referente aos comunicados do Centro Educacional Pedro Rizzi.\n\nAtenciosamente,\nEquipe Gestora - C.E. Pedro Rizzi`;
        } else {
            if (elNome) elNome.innerText = "Contato";
            if (elInfo) elInfo.innerText = "ID: " + profId;
            if (elTelefone) elTelefone.innerText = formatTelefoneDisplay(profId);
            if (hiddenId) hiddenId.value = profId;
            if (hiddenPhone) hiddenPhone.value = profId;
            if (hiddenNome) hiddenNome.value = "Contato";
            if (inputAssunto) inputAssunto.value = "Comunicado Oficial";
            if (inputMsg) inputMsg.value = "Olá!\n\nEntramos em contato pelo Centro Educacional Pedro Rizzi.\n\nAtenciosamente,\nEquipe Gestora";
        }
    } else {
        if (cardDest) cardDest.style.display = "none";
        if (geralWrapper) geralWrapper.style.display = "block";
        if (hiddenId) hiddenId.value = "todos";
        if (hiddenPhone) hiddenPhone.value = "";
        if (hiddenNome) hiddenNome.value = "Todos";

        const selCount = (typeof selectedWpContactIds !== 'undefined' && selectedWpContactIds.size > 0) ? selectedWpContactIds.size : 0;
        if (selCount > 0) {
            if (geralTexto) geralTexto.innerText = `Disparo Direto para os ${selCount} contato(s) selecionado(s) na tabela`;
            if (inputAssunto) inputAssunto.value = "Comunicado aos Colaboradores Selecionados";
        } else {
            const lista = (typeof getListaDestinatariosUnificada === 'function') ? getListaDestinatariosUnificada() : [];
            if (geralTexto) geralTexto.innerText = `Disparo Geral para toda a equipe escolar e contatos (${lista.length} destinatários)`;
            if (inputAssunto) inputAssunto.value = "Comunicado Geral da Direção Escolar";
        }

        if (inputMsg) inputMsg.value = "Prezados Colaboradores,\n\nSolicitamos a atenção de todos para os alinhamentos e diretrizes da unidade escolar nesta semana.\n\nAtenciosamente,\nEquipe Gestora - C.E. Pedro Rizzi";
    }

    modal.style.display = "flex";
}
window.openDisparoAvisoProfessorModal = openDisparoAvisoProfessorModal;

function closeDisparoAvisoProfessorModal() {
    const modal = document.getElementById("modalDisparoAvisoProfessor");
    if (modal) modal.style.display = "none";
}
window.closeDisparoAvisoProfessorModal = closeDisparoAvisoProfessorModal;

async function submitDisparoAvisoProfessor(e) {
    if (e && e.preventDefault) e.preventDefault();

    const destId = document.getElementById("avisoSelectedDestId")?.value || "todos";
    const destPhone = document.getElementById("avisoSelectedDestPhone")?.value || "";
    const destNome = document.getElementById("avisoSelectedDestNome")?.value || "Contato";
    const remetenteOpt = document.getElementById("avisoSelectRemetente")?.value || "sistema_auto";
    const assunto = document.getElementById("avisoInputAssunto")?.value.trim();
    const mensagem = document.getElementById("avisoInputMensagem")?.value.trim();

    if (!mensagem) {
        showToast("⚠️ Escreva a mensagem do comunicado antes de disparar!", "warning");
        return;
    }

    const fullMsg = assunto ? `*${assunto}*\n\n${mensagem}` : mensagem;

    if (remetenteOpt === "whatsapp_web") {
        enviarAvisoViaWhatsAppWebManual();
        return;
    }

    let instanceName = remetenteOpt;
    if (instanceName === "sistema_auto") {
        instanceName = (typeof sigeDB !== 'undefined' && sigeDB.getActiveWhatsappInstance)
            ? (sigeDB.getActiveWhatsappInstance() || "sige_orientacao")
            : "sige_orientacao";
    }

    const btnSubmit = document.getElementById("btnSubmitDisparoAviso");

    // ENVIO INDIVIDUAL
    if (destId !== "todos") {
        let cleanPhone = (destPhone || '').replace(/\D/g, "");
        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
            cleanPhone = "55" + cleanPhone;
        }

        if (cleanPhone.length < 10) {
            showToast("⚠️ Este contato não possui um número de WhatsApp válido cadastrado.", "error");
            if (confirm("Deseja abrir o WhatsApp Web para selecionar o contato manualmente no navegador?")) {
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullMsg)}`, "_blank");
                closeDisparoAvisoProfessorModal();
            }
            return;
        }

        if (typeof evolutionClient !== 'undefined' && evolutionClient.isConfigured()) {
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Enviando...`;
            }

            try {
                showToast(`⏳ Enviando mensagem direta para ${destNome}...`, "info");
                const check = await evolutionClient.checkConnectionState(instanceName);
                if (!check.connected) {
                    if (typeof openModalQrCodeWhatsApp === 'function') openModalQrCodeWhatsApp(instanceName);
                    showToast(`📱 Conecte o WhatsApp da escola (${instanceName}) escaneando o QR Code.`, "warning");
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Disparar Comunicado`;
                    }
                    return;
                }

                const res = await evolutionClient.sendText(cleanPhone, fullMsg, { instanceName });
                if (res.success) {
                    if (typeof sigeDB !== 'undefined' && sigeDB.addMensagemWhatsAppLog) {
                        sigeDB.addMensagemWhatsAppLog({
                            contatoNome: destNome,
                            telefone: cleanPhone,
                            tag: 'Recado Rápido',
                            mensagem: fullMsg,
                            status: 'enviado',
                            instancia: instanceName
                        });
                    }
                    if (typeof renderDirWhatsAppLogs === 'function') renderDirWhatsAppLogs();
                    showToast(`✅ Recado enviado com sucesso para ${destNome}!`, "success");
                    closeDisparoAvisoProfessorModal();
                } else {
                    showToast(`⚠️ Falha no envio automático: ${res.error}`, "error");
                    if (confirm(`Não foi possível enviar diretamente pelo sistema (${res.error}). Deseja abrir a conversa no WhatsApp Web?`)) {
                        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(fullMsg)}`, "_blank");
                        closeDisparoAvisoProfessorModal();
                    }
                }
            } catch (err) {
                console.error("Erro no envio:", err);
                showToast(`Erro ao enviar mensagem: ${err.message}`, "error");
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Disparar Comunicado`;
                }
            }
        } else {
            window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(fullMsg)}`, "_blank");
            showToast(`📲 Abrindo conversa do WhatsApp com ${destNome}...`);
            closeDisparoAvisoProfessorModal();
        }
    } else {
        // ENVIO EM LOTE (TODOS OU SELECIONADOS NA TABELA)
        const listaUnificada = (typeof getListaDestinatariosUnificada === 'function') ? getListaDestinatariosUnificada() : [];
        let targets = [];
        if (typeof selectedWpContactIds !== 'undefined' && selectedWpContactIds.size > 0) {
            targets = listaUnificada.filter(p => selectedWpContactIds.has(p.id));
        } else {
            targets = listaUnificada;
        }

        const validTargets = targets.filter(p => p.telefone && p.telefone.replace(/\D/g, '').length >= 10);
        if (validTargets.length === 0) {
            showToast("⚠️ Nenhum dos contatos selecionados possui número de WhatsApp válido.", "warning");
            return;
        }

        if (typeof evolutionClient !== 'undefined' && evolutionClient.isConfigured()) {
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Disparando...`;
            }

            try {
                const check = await evolutionClient.checkConnectionState(instanceName);
                if (!check.connected) {
                    if (typeof openModalQrCodeWhatsApp === 'function') openModalQrCodeWhatsApp(instanceName);
                    showToast(`📱 Conecte o WhatsApp da escola (${instanceName}) escaneando o QR Code.`, "warning");
                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Disparar Comunicado`;
                    }
                    return;
                }

                showToast(`🚀 Iniciando envio automático para ${validTargets.length} contatos...`, "info");
                let enviados = 0;
                for (const t of validTargets) {
                    let fone = t.telefone.replace(/\D/g, '');
                    if (fone.length === 10 || fone.length === 11) fone = "55" + fone;
                    const msgIndividual = fullMsg.replace(/{nome}/gi, (t.nome || '').split(' ')[0]);

                    try {
                        const r = await evolutionClient.sendText(fone, msgIndividual, { instanceName });
                        if (r.success) {
                            enviados++;
                            if (typeof sigeDB !== 'undefined' && sigeDB.addMensagemWhatsAppLog) {
                                sigeDB.addMensagemWhatsAppLog({
                                    contatoNome: t.nome,
                                    telefone: fone,
                                    tag: 'Aviso Geral',
                                    mensagem: msgIndividual,
                                    status: 'enviado',
                                    instancia: instanceName
                                });
                            }
                        }
                    } catch(e) {
                        console.warn(`Erro no envio para ${t.nome}:`, e);
                    }
                }

                if (typeof renderDirWhatsAppLogs === 'function') renderDirWhatsAppLogs();
                showToast(`✅ Disparo concluído com sucesso! ${enviados} de ${validTargets.length} mensagens enviadas!`, "success");
                closeDisparoAvisoProfessorModal();
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Disparar Comunicado`;
                }
            }
        } else {
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(fullMsg)}`, "_blank");
            showToast(`📲 Janela do WhatsApp Web aberta com a mensagem para ${validTargets.length} contatos.`);
            closeDisparoAvisoProfessorModal();
        }
    }
}
window.submitDisparoAvisoProfessor = submitDisparoAvisoProfessor;

function enviarAvisoViaWhatsAppWebManual() {
    const destPhone = document.getElementById("avisoSelectedDestPhone")?.value || "";
    const destNome = document.getElementById("avisoSelectedDestNome")?.value || "";
    const assunto = document.getElementById("avisoInputAssunto")?.value.trim();
    const mensagem = document.getElementById("avisoInputMensagem")?.value.trim();

    if (!mensagem) {
        showToast("⚠️ Digite a mensagem antes de abrir o WhatsApp!", "warning");
        return;
    }

    const fullMsg = assunto ? `*${assunto}*\n\n${mensagem}` : mensagem;
    let cleanPhone = (destPhone || '').replace(/\D/g, "");
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = "55" + cleanPhone;
    }

    const phoneParam = cleanPhone.length >= 10 ? `phone=${cleanPhone}&` : "";
    window.open(`https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(fullMsg)}`, "_blank");
    showToast(`📲 Abrindo conversa no WhatsApp Web com ${destNome || 'destinatário'}...`);
    closeDisparoAvisoProfessorModal();
}
window.enviarAvisoViaWhatsAppWebManual = enviarAvisoViaWhatsAppWebManual;

function gerarMensagemParaAvisoModalIA() {
    if (typeof abrirModalGeradorIA === 'function') {
        abrirModalGeradorIA('avisoInputMensagem');
    }
}
window.gerarMensagemParaAvisoModalIA = gerarMensagemParaAvisoModalIA;

// ==========================================
// CONFIGURAÇÃO E PAINEL DO FIREBASE CLOUD
// ==========================================
// MODAL DE DIAGNÓSTICO & SINCRONIZAÇÃO EM NUVEM (FIREBASE MULTI-DISPOSITIVOS)
// ==========================================
const FIRESTORE_OFFICIAL_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // BANCO PRINCIPAL SIGE - Acesso central da escola
    match /sige_pedro_rizzi/{document=**} {
      allow read, write: if true;
    }

    // TOKENS DE CONFIRMACAO - acesso publico controlado via WhatsApp
    match /confirmacoes_op/{tokenId} {
      allow read: if true;
      allow create: if true;
      allow update: if request.resource.data.status in ['confirmado_whatsapp', 'cancelado'];
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

function openCloudSyncModal() {
    let modal = document.getElementById("modalCloudSync");
    if (!modal) return;
    renderCloudSyncModalContent();
    modal.style.display = "flex";
}

function closeCloudSyncModal() {
    let modal = document.getElementById("modalCloudSync");
    if (modal) modal.style.display = "none";
}

function renderCloudSyncModalContent() {
    const statusContainer = document.getElementById("cloudSyncModalStatus");
    const rulesContainer = document.getElementById("cloudSyncRulesContainer");
    if (!statusContainer) return;

    const status = sigeDB ? sigeDB.cloudStatus : 'offline';

    if (status === 'connected') {
        statusContainer.innerHTML = `
            <div style="background:#dcfce7; border:1px solid #86efac; border-radius:12px; padding:1rem; display:flex; align-items:center; gap:12px;">
                <i class="fa-solid fa-cloud-check" style="font-size:2rem; color:#16a34a;"></i>
                <div>
                    <strong style="color:#166534; font-size:1rem; display:block;">Nuvem Conectada e Sincronizada!</strong>
                    <span style="color:#15803d; font-size:0.83rem;">Todos os computadores da escola estão recebendo e enviando dados em tempo real.</span>
                </div>
            </div>
        `;
        if (rulesContainer) rulesContainer.style.display = "none";
    } else if (status === 'permission_denied') {
        statusContainer.innerHTML = `
            <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:12px; padding:1rem; display:flex; align-items:center; gap:12px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:2rem; color:#dc2626;"></i>
                <div>
                    <strong style="color:#991b1b; font-size:1rem; display:block;">Acesso Bloqueado pelo Firebase (Permissão Negada)</strong>
                    <span style="color:#b91c1c; font-size:0.83rem;">O console do Firebase (projeto sas-cepr) está recusando a sincronização. Publique a regra abaixo no Console do Google para conectar imediatamente.</span>
                </div>
            </div>
        `;
        if (rulesContainer) rulesContainer.style.display = "block";
    } else if (status === 'connecting') {
        statusContainer.innerHTML = `
            <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:12px; padding:1rem; display:flex; align-items:center; gap:12px;">
                <i class="fa-solid fa-circle-notch fa-spin" style="font-size:2rem; color:#d97706;"></i>
                <div>
                    <strong style="color:#92400e; font-size:1rem; display:block;">Conectando ao Firebase...</strong>
                    <span style="color:#b45309; font-size:0.83rem;">Verificando conexão com a nuvem central.</span>
                </div>
            </div>
        `;
        if (rulesContainer) rulesContainer.style.display = "none";
    } else {
        statusContainer.innerHTML = `
            <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:12px; padding:1rem; display:flex; align-items:center; gap:12px;">
                <i class="fa-solid fa-cloud-slash" style="font-size:2rem; color:#64748b;"></i>
                <div>
                    <strong style="color:#334155; font-size:1rem; display:block;">Modo Off-line / Desconectado</strong>
                    <span style="color:#64748b; font-size:0.83rem;">Os dados estão salvos localmente neste computador. Clique em Testar Conexão para tentar conectar à Nuvem.</span>
                </div>
            </div>
        `;
        if (rulesContainer) rulesContainer.style.display = "block";
    }
}

async function testFirebaseConnectionAction() {
    const btn = document.getElementById("btnTestCloudConn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Testando conexão...`;
    }

    const res = await sigeDB.testAndConnectFirebase();

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-rotate"></i> Testar & Sincronizar Agora`;
    }

    renderCloudSyncModalContent();

    if (res.success) {
        showToast("🎉 " + res.message);
        setTimeout(() => closeCloudSyncModal(), 1800);
    } else {
        showToast("❌ " + res.message);
    }
}

function copyFirestoreRulesAction() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(FIRESTORE_OFFICIAL_RULES).then(() => {
            showToast("📋 Regras copiadas para a área de transferência! Cole na aba Regras do Console do Firebase.");
        }).catch(() => {
            prompt("Copie as regras abaixo:", FIRESTORE_OFFICIAL_RULES);
        });
    } else {
        prompt("Copie as regras abaixo:", FIRESTORE_OFFICIAL_RULES);
    }
}

function exportDatabaseAction() {
    sigeDB.exportCompleteDatabase();
    showToast("💾 Base completa exportada com sucesso em arquivo JSON!");
}

function importDatabaseAction(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm("Deseja importar e mesclar esta base de dados com as informações deste computador? Nenhum dado mais recente será perdido.")) {
        event.target.value = "";
        return;
    }

    sigeDB.importCompleteDatabase(file, (success, msg) => {
        event.target.value = "";
        if (success) {
            showToast("🎉 " + msg);
            closeCloudSyncModal();
            renderAllModules();
        } else {
            showToast("❌ " + msg);
        }
    });
}

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
        if (sigeDB.cloudStatus === 'connected') {
            statusBadge.style.background = "#dcfce7";
            statusBadge.style.color = "#166534";
            statusBadge.innerHTML = `<i class="fa-solid fa-cloud-check"></i> 🔥 Sincronização Cloud Ativa (Firebase Conectado)`;
        } else if (sigeDB.cloudStatus === 'permission_denied') {
            statusBadge.style.background = "#fee2e2";
            statusBadge.style.color = "#991b1b";
            statusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ⚠️ Regras Bloqueadas no Console (Clique no botão da nuvem acima)`;
        } else if (config.projectId) {
            statusBadge.style.background = "#fef3c7";
            statusBadge.style.color = "#92400e";
            statusBadge.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Conectando ao Firebase...`;
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


// ==========================================

function filtrarEquipeEscolarTextoAdmin() {
    const input = document.getElementById("equipeSearchInputAdmin");
    equipeBuscaTexto = input ? input.value.trim() : "";
    renderEquipeEscolarTable(currentSetorFilter, equipeBuscaTexto);
}
window.filtrarEquipeEscolarTextoAdmin = filtrarEquipeEscolarTextoAdmin;

// Funções de Aprovação de Usuários Pendentes
window.renderAdminPendingUsers = renderAdminPendingUsers;
window.ajustarModulosDefaultPendente = ajustarModulosDefaultPendente;
window.execAprovarPendente = execAprovarPendente;
window.execRecusarPendente = execRecusarPendente;
window.scrollToPendingRequests = scrollToPendingRequests;

// Funções Unificadas: Equipe Escolar & Gestão de Acessos RBAC
window.renderEquipeEscolarTable = renderEquipeEscolarTable;
window.filtrarEquipeEscolar = filtrarEquipeEscolar;
window.filtrarEquipeEscolarTexto = filtrarEquipeEscolarTexto;
window.toggleProfissionalModuloChip = toggleProfissionalModuloChip;
window.openCadastroProfissionalModal = openCadastroProfissionalModal;
window.closeCadastroProfissionalModal = closeCadastroProfissionalModal;
window.submitCadastroProfissional = submitCadastroProfissional;
window.editarProfissional = editarProfissional;
window.excluirProfissional = excluirProfissional;
window.setAllProfissionalModulos = setAllProfissionalModulos;
window.autoSuggestModulosPorSetor = autoSuggestModulosPorSetor;
window.getCurrentSetorFilter = () => currentSetorFilter;
window.getEquipeBuscaTexto = () => equipeBuscaTexto;

// Funções de Conexão e QR Code do WhatsApp (Painel Admin)
window.openModalQrCodeWhatsApp = openModalQrCodeWhatsApp;
window.closeModalQrCodeWhatsApp = closeModalQrCodeWhatsApp;
window.refreshQrCodeModal = refreshQrCodeModal;
window.desconectarWhatsAppInstanciaModal = desconectarWhatsAppInstanciaModal;
window.atualizarStatusRemetenteDirecao = atualizarStatusRemetenteDirecao;
window.atualizarStatusRemetenteLembrete = atualizarStatusRemetenteLembrete;
window.exibirRelatorioDisparoWhatsApp = exibirRelatorioDisparoWhatsApp;
window.closeModalRelatorioDisparoWhatsApp = closeModalRelatorioDisparoWhatsApp;
window.testarConexaoWhatsapp = testarConexaoWhatsapp;
window.salvarConfiguracoesWhatsapp = salvarConfiguracoesWhatsapp;
window.renderWhatsappConfigPanel = renderWhatsappConfigPanel;

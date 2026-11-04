/**
 * auth.js - Módulo de Autenticação, Primeiro Acesso e Sessão (RBAC)
 * Centro Educacional Pedro Rizzi
 */

// AUTENTICAÇÃO E PERMISSÕES (RBAC)
// ==========================================
function checkSigeAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    const actionParam = urlParams.get('action') || urlParams.get('aba');

    const user = sigeDB.getLoggedUser();
    const loginModal = document.getElementById("modalSigeLogin");
    const roleWrapper = document.getElementById("roleSelectorContainerWrapper");
    const btnDev = document.getElementById("btnDevManageUsers");
    const btnTopAlert = document.getElementById("btnTopBarPendingAlert");
    const topPendingCount = document.getElementById("topBarPendingCountText");
    const userText = document.getElementById("loggedUserEmailText");
    const opFilter = document.getElementById("opFilterOrientadora");

    if (!user) {
        if (loginModal) loginModal.style.display = "flex";
        if (btnTopAlert) btnTopAlert.style.display = "none";
        return false;
    }

    if (loginModal) loginModal.style.display = "none";

    // Se o usuário logado ainda não concluiu o cadastro obrigatório (WhatsApp + consentimento)
    if (!user.cadastroCompleto) {
        setTimeout(() => {
            abrirModalOnboardingCadastro(user);
        }, 100);
    }

    if (userText) {
        const cleanNome = (user.nome || "Elevi Cortelini").replace(/\s*\([^)]*\)\s*$/g, "").trim();
        const funcaoDesc = (user.role === "desenvolvedor" || (user.email && user.email.toLowerCase().includes("cortelini")))
            ? "Desenvolvedor"
            : (user.cargo || (typeof sigeDB.getRoleFormatted === "function" ? sigeDB.getRoleFormatted() : (user.role || "Colaborador")));
        userText.innerHTML = `<i class="fa-solid fa-user-circle" style="color:#fbbf24; font-size:0.95rem; margin-right:4px;"></i><strong>${escapeHtml(cleanNome || "Elevi Cortelini")}</strong> (${escapeHtml(funcaoDesc)})`;
    }

    // O Seletor de Perfis e o botão de Gestão de Usuários são EXCLUSIVOS do Desenvolvedor Oficial
    const isDev = user.role === "desenvolvedor" || (
        (user.email && user.email.toLowerCase().trim() === "elcortelini@gmail.com") || 
        (user.cpf && cleanCpf(user.cpf) === '80603742068')
    );

    // Define papel no BD local preservando simulação ativa do desenvolvedor na aba atual
    const simulatedRole = (typeof sessionStorage !== "undefined") ? sessionStorage.getItem("sige_dev_simulated_role") : null;
    if (!isDev || !simulatedRole) {
        sigeDB.setRole(user.role);
    }

    if (roleWrapper) roleWrapper.style.display = isDev ? "inline-flex" : "none";
    if (btnDev) btnDev.style.display = "none";

    // Alerta de solicitações pendentes na barra do topo (Exclusivo Desenvolvedor)
    if (btnTopAlert) {
        if (isDev) {
            const pendentes = sigeDB.getUsuariosPendentes();
            if (pendentes.length > 0) {
                btnTopAlert.style.display = "inline-flex";
                if (topPendingCount) topPendingCount.innerText = `${pendentes.length} Pendente(s)`;
            } else {
                btnTopAlert.style.display = "none";
            }
        } else {
            btnTopAlert.style.display = "none";
        }
    }

    // Trava de Orientadoras: Orientadora logada acessa estritamente seu próprio painel e agenda
    if (opFilter) {
        const isMaster = isDev || user.role === "direcao" || (user.permissoes && user.permissoes.direcao);
        const activeOri = (typeof getOrientadoraByRole === 'function') ? getOrientadoraByRole(user.role) : null;
        if (activeOri && !isMaster) {
            opFilter.value = activeOri.nome;
            opFilter.disabled = true;
        } else {
            opFilter.disabled = false;
        }
    }

    if (typeof atualizarAbasNavegacaoVisibilidade === "function") {
        atualizarAbasNavegacaoVisibilidade();
    }

    return true;
}

function closeModalSigeLogin() {
    const loginModal = document.getElementById("modalSigeLogin");
    if (loginModal) loginModal.style.display = "none";
}
window.closeModalSigeLogin = closeModalSigeLogin;

function closeModal(modalId) {
    if (!modalId) return;
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = "none";
}
window.closeModal = closeModal;

async function submitSigeLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const cpfInput = document.getElementById("loginCpfInput");
    const senhaInput = document.getElementById("loginSenhaInput");
    if (!cpfInput || !senhaInput) return;
    const cpf = cpfInput.value.trim();
    const senha = senhaInput.value.trim();
    if (!cpf || !senha) {
        alert("Por favor, informe seu CPF e sua Data de Nascimento (senha).");
        return;
    }

    const res = await sigeDB.loginWithCpf(cpf, senha);

    if (!res.success) {
        if (res.code === 'NOT_FOUND') {
            if (confirm(res.message + "\n\nDeseja preencher seu Primeiro Acesso / Criar Cadastro agora?")) {
                abrirModalPrimeiroAcesso();
                const pCpf = document.getElementById("primeiroAcessoCpf");
                const pData = document.getElementById("primeiroAcessoDataNascimento");
                if (pCpf) pCpf.value = formatCpf(cpf);
                if (pData) pData.value = formatDataNascimento(senha);
            }
            return;
        }
        alert(res.message);
        return;
    }

    const loginModal = document.getElementById("modalSigeLogin");
    if (loginModal) loginModal.style.display = "none";
    showToast(`Bem-vindo(a), ${res.user.nome}!`);
    checkSigeAuth();
    setupRoleSelector();
    if (typeof atualizarAbasNavegacaoVisibilidade === "function") {
        atualizarAbasNavegacaoVisibilidade();
    }
    const activeRole = sigeDB.getRole();
    let targetTab = 'direcao';
    if (activeRole === 'desenvolvedor' || res.user.role === 'desenvolvedor') targetTab = 'dev';
    else if (activeRole === 'direcao' || sigeDB.temPermissaoModulo('direcao')) targetTab = 'direcao';
    else if (activeRole === 'admin' || activeRole === 'secretaria' || sigeDB.temPermissaoModulo('admin') || sigeDB.temPermissaoModulo('uniformes')) targetTab = 'admin';
    else if (activeRole.startsWith('supervisora') || activeRole === 'supervisao' || sigeDB.temPermissaoModulo('supervisao')) targetTab = 'supervisao';
    else if (activeRole.includes('orientadora') || activeRole === 'op' || sigeDB.temPermissaoModulo('op')) targetTab = 'op';
    else targetTab = 'externos';
    if (typeof switchTab === "function") {
        switchTab(targetTab);
    }
    renderAllModules(null, true);
}

function abrirModalOnboardingCadastro(user) {
    const modal = document.getElementById("modalOnboardingCadastro");
    if (!modal) return;
    document.getElementById("onboardingEmail").value = user.email || "";
    document.getElementById("onboardingNome").value = user.nome || "";
    document.getElementById("onboardingCargo").value = (user.cargo && !user.cargo.includes('Aguardando')) ? user.cargo : "";
    document.getElementById("onboardingTurno").value = user.turno || "Matutino";
    const phoneInput = document.getElementById("onboardingWhatsapp");
    if (user.whatsapp || user.telefone) {
        phoneInput.value = user.whatsapp || user.telefone;
        mascaraTelefoneInput(phoneInput);
    } else {
        phoneInput.value = "";
    }
    document.getElementById("onboardingAutorizacaoWhatsApp").checked = false;
    modal.style.display = "flex";
}

function submitOnboardingCadastro() {
    const email = document.getElementById("onboardingEmail").value.trim();
    const nome = document.getElementById("onboardingNome").value.trim();
    const cargo = document.getElementById("onboardingCargo").value.trim();
    const turno = document.getElementById("onboardingTurno").value;
    const whatsapp = document.getElementById("onboardingWhatsapp").value.trim();
    const autorizou = document.getElementById("onboardingAutorizacaoWhatsApp").checked;

    if (!nome) {
        alert("Por favor, preencha seu nome completo.");
        return;
    }
    if (!cargo) {
        alert("Por favor, informe seu cargo ou função.");
        return;
    }
    const cleanPhone = whatsapp.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
        alert("Por favor, informe um telefone de WhatsApp válido com DDD (mínimo 10 dígitos).");
        return;
    }
    if (!autorizou) {
        alert("É obrigatório marcar a caixa autorizando o recebimento de mensagens oficiais no seu WhatsApp.");
        return;
    }

    if (window.sigeDB) {
        const user = window.sigeDB.concluirCadastroUsuario(email, {
            nome,
            cargo,
            turno,
            whatsapp: cleanPhone,
            autorizaMensagensWhatsApp: true
        });

        if (user) {
            const modal = document.getElementById("modalOnboardingCadastro");
            if (modal) modal.style.display = "none";
            showToast("🎉 Cadastro concluído com sucesso! Bem-vindo(a) ao IntegraRizzi.");
            checkSigeAuth();
            renderAllModules();
        }
    }
}

function cancelarOnboardingCadastro() {
    const modal = document.getElementById("modalOnboardingCadastro");
    if (modal) modal.style.display = "none";
    if (window.sigeDB) window.sigeDB.logout();
    checkSigeAuth();
    renderAllModules();
}

function abrirModalPrimeiroAcesso() {
    const modal = document.getElementById("modalPrimeiroAcesso");
    if (!modal) return;
    const form = document.getElementById("formPrimeiroAcesso");
    if (form) form.reset();
    modal.style.display = "flex";
}

function fecharModalPrimeiroAcesso() {
    const modal = document.getElementById("modalPrimeiroAcesso");
    if (modal) modal.style.display = "none";
}

async function submitPrimeiroAcesso(e) {
    if (e && e.preventDefault) e.preventDefault();
    const cpf = document.getElementById("primeiroAcessoCpf")?.value.trim() || "";
    const dataNascimento = document.getElementById("primeiroAcessoDataNascimento")?.value.trim() || "";
    const nome = document.getElementById("primeiroAcessoNome")?.value.trim() || "";
    const cargo = document.getElementById("primeiroAcessoCargo")?.value.trim() || "";
    const turno = document.getElementById("primeiroAcessoTurno")?.value || "Matutino";
    const whatsapp = document.getElementById("primeiroAcessoWhatsapp")?.value.trim() || "";
    const email = document.getElementById("primeiroAcessoEmail")?.value.trim() || "";
    const autorizaWhatsApp = document.getElementById("primeiroAcessoAutorizacaoWhatsApp")?.checked || false;

    if (!window.sigeDB) return;

    const res = await window.sigeDB.cadastrarPrimeiroAcesso({
        cpf,
        dataNascimento,
        nome,
        cargo,
        turno,
        whatsapp,
        email,
        autorizaWhatsApp
    });

    if (!res.success) {
        if (res.code === 'NOT_FOUND') {
            if (confirm(res.message + "\n\nDeseja preencher seu Primeiro Acesso / Criar Cadastro agora?")) {
                abrirModalPrimeiroAcesso();
                const pCpf = document.getElementById("primeiroAcessoCpf");
                const pData = document.getElementById("primeiroAcessoDataNascimento");
                if (pCpf) pCpf.value = formatCpf(cpf);
                if (pData) pData.value = formatDataNascimento(senha);
            }
            return;
        }
        alert(res.message);
        return;
    }

    alert(res.message);
    fecharModalPrimeiroAcesso();

    const sigeCpf = document.getElementById("loginCpfInput") || document.getElementById("sigeLoginCpf");
    const sigeNasc = document.getElementById("loginSenhaInput") || document.getElementById("sigeLoginDataNasc");
    if (sigeCpf) sigeCpf.value = formatCpf(cpf);
    if (sigeNasc) sigeNasc.value = formatDataNascimento(dataNascimento);

    // Auto-login imediato no SIGE
    const loginModal = document.getElementById("modalSigeLogin");
    if (loginModal) loginModal.style.display = "none";

    if (typeof submitSigeLogin === "function") {
        submitSigeLogin();
    } else if (window.sigeDB && typeof window.sigeDB.loginWithCpf === "function") {
        await window.sigeDB.loginWithCpf(cpf, dataNascimento);
        if (typeof checkSigeAuth === "function") checkSigeAuth();
        if (typeof setupRoleSelector === "function") setupRoleSelector();
        if (typeof renderAllModules === "function") renderAllModules(null, true);
    }
}

function handleSigeLogout() {
    sigeDB.logout();
    showToast("Sessão encerrada.");
    checkSigeAuth();
    renderAllModules(null, true);
}

function openDevUserModal() {
    const user = sigeDB.getLoggedUser();
    const isDev = user && user.role === "desenvolvedor" && (
        (user.email && user.email.toLowerCase().trim() === "elcortelini@gmail.com") || 
        (user.cpf && cleanCpf(user.cpf) === '80603742068')
    );
    if (!isDev) {
        showToast("⚠️ Acesso restrito exclusivo ao Desenvolvedor Master.", "warning");
        return;
    }
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
                    <th style="padding:8px;">Perfil</th>
                    <th style="padding:8px;">Cargo</th>
                    <th style="padding:8px; text-align:center;">Módulos Liberados (RBAC)</th>
                    <th style="padding:8px; text-align:center;">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(u => {
        const isDevDefault = (u.email && u.email.toLowerCase().trim() === "elcortelini@gmail.com") || (u.cpf && cleanCpf(u.cpf) === "80603742068") || u.role === "desenvolvedor";
        const perms = u.permissoes || { op: true, mural: true, supervisao: false, admin: false, direcao: false, uniformes: false };
        const userKey = u.id || u.cpf || u.email || u.nome;
        const subInfo = u.email ? u.email : (u.cpf ? `CPF: ${u.cpf}` : 'Sem e-mail');
        html += `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;">
                    <strong style="color:#0f172a; display:block;">${escapeHtml(u.nome)}</strong>
                    <span style="color:#64748b; font-size:0.78rem;">${escapeHtml(subInfo)}</span>
                </td>
                <td style="padding:8px;">
                    <span class="role-badge-pill role-pill-${u.role}" style="font-size:0.75rem;">${getRoleLabel(u.role)}</span>
                </td>
                <td style="padding:8px; color:#334155;">${escapeHtml(u.cargo || '-')}</td>
                <td style="padding:8px;">
                    <div style="display:flex; flex-wrap:wrap; gap:6px; font-size:0.75rem; justify-content:center;">
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#eff6ff; padding:2px 6px; border-radius:6px; cursor:pointer;" title="Orientação Educacional">
                            <input type="checkbox" ${perms.op ? 'checked' : ''} onchange="toggleUserModuloPermissao('${escapeHtml(userKey)}', 'op', this.checked)"> OE
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#f8fafc; padding:2px 6px; border-radius:6px; cursor:pointer;" title="Mural e Prazos">
                            <input type="checkbox" ${perms.mural ? 'checked' : ''} onchange="toggleUserModuloPermissao('${escapeHtml(userKey)}', 'mural', this.checked)"> Mural
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#fdf4ff; padding:2px 6px; border-radius:6px; cursor:pointer;" title="Supervisão Pedagógica">
                            <input type="checkbox" ${perms.supervisao ? 'checked' : ''} onchange="toggleUserModuloPermissao('${escapeHtml(userKey)}', 'supervisao', this.checked)"> Sup
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#f1f5f9; padding:2px 6px; border-radius:6px; cursor:pointer;" title="Administração">
                            <input type="checkbox" ${perms.admin ? 'checked' : ''} onchange="toggleUserModuloPermissao('${escapeHtml(userKey)}', 'admin', this.checked)"> ADM
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#fef3c7; color:#92400e; padding:2px 6px; border-radius:6px; font-weight:800; cursor:pointer;" title="Direção e Gestão Escolar">
                            <input type="checkbox" ${perms.direcao ? 'checked' : ''} onchange="toggleUserModuloPermissao('${escapeHtml(userKey)}', 'direcao', this.checked)"> 👑 Direção
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#f0fdf4; padding:2px 6px; border-radius:6px; cursor:pointer;" title="Controle de Uniformes">
                            <input type="checkbox" ${perms.uniformes ? 'checked' : ''} onchange="toggleUserModuloPermissao('${escapeHtml(userKey)}', 'uniformes', this.checked)"> Uniformes
                        </label>
                    </div>
                </td>
                <td style="padding:8px; text-align:center;">
                    ${isDevDefault ? `
                        <span style="color:#94a3b8; font-size:0.75rem; font-style:italic;">(Padrão Dev)</span>
                    ` : `
                        <button onclick="deleteDevUser('${escapeHtml(userKey)}')" class="btn-sec btn-sec-fail" style="padding:3px 8px; font-size:0.72rem;">
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

let rbacFiltroPerfil = 'todos';
let rbacBuscaTexto = '';

function setRbacFilterPerfil(perfil) {
    rbacFiltroPerfil = perfil || 'todos';
    document.querySelectorAll('.rbac-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`btnRbacFilter_${rbacFiltroPerfil}`);
    if (activeBtn) activeBtn.classList.add('active');
    renderAdminPermissoesUsuarios();
}

function filtrarUsuariosRBAC() {
    const input = document.getElementById('rbacSearchInput');
    rbacBuscaTexto = input ? input.value.trim().toLowerCase() : '';
    renderAdminPermissoesUsuarios();
}

function renderAdminPermissoesUsuarios() {
    const tbody = document.getElementById("adminUsersPermissionsTableBody");
    if (!tbody) return;

    const allUsers = sigeDB.getUsuarios();
    if (!allUsers || !Array.isArray(allUsers)) return;

    // Atualiza KPIs Globais
    const kpiTotal = document.getElementById("rbacKpiTotalUsuarios");
    const kpiTotalAcesso = document.getElementById("rbacKpiAcessoTotal");
    const kpiParcial = document.getElementById("rbacKpiAcessoParcial");

    let countTotalAcesso = 0;
    let countParcial = 0;

    allUsers.forEach(u => {
        const perms = u.permissoes || {};
        const modulosAtivos = ['op', 'mural', 'supervisao', 'admin', 'direcao', 'uniformes'].filter(k => !!perms[k]);
        if (modulosAtivos.length === 6 || u.role === 'desenvolvedor') {
            countTotalAcesso++;
        } else if (modulosAtivos.length > 0) {
            countParcial++;
        }
    });

    if (kpiTotal) kpiTotal.innerText = allUsers.length;
    if (kpiTotalAcesso) kpiTotalAcesso.innerText = countTotalAcesso;
    if (kpiParcial) kpiParcial.innerText = countParcial;

    // Aplica Filtros
    let filtered = allUsers;
    if (rbacFiltroPerfil !== 'todos') {
        filtered = filtered.filter(u => {
            if (rbacFiltroPerfil === 'orientacao') return u.role.startsWith('orientadora') || u.role === 'orientacao';
            if (rbacFiltroPerfil === 'supervisao') return u.role.startsWith('supervisora') || u.role === 'supervisao';
            return u.role === rbacFiltroPerfil;
        });
    }

    if (rbacBuscaTexto) {
        filtered = filtered.filter(u => {
            const nome = (u.nome || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            const cpf = (u.cpf || '').toLowerCase();
            const cargo = (u.cargo || '').toLowerCase();
            return nome.includes(rbacBuscaTexto) || email.includes(rbacBuscaTexto) || cpf.includes(rbacBuscaTexto) || cargo.includes(rbacBuscaTexto);
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding:2rem; text-align:center; color:#64748b;">
                    <i class="fa-solid fa-user-slash" style="font-size:1.8rem; color:#cbd5e1; margin-bottom:8px; display:block;"></i>
                    Nenhum usuário encontrado para os critérios selecionados.
                </td>
            </tr>
        `;
        return;
    }

    const modulosConfig = [
        { key: 'op', label: 'OE', fullLabel: 'Orientação Educacional', icon: 'fa-heart-pulse', colorClass: 'mod-op' },
        { key: 'mural', label: 'Mural', fullLabel: 'Mural & Prazos', icon: 'fa-chalkboard-user', colorClass: 'mod-mural' },
        { key: 'supervisao', label: 'Supervisão', fullLabel: 'Supervisão Pedagógica', icon: 'fa-clipboard-check', colorClass: 'mod-supervisao' },
        { key: 'admin', label: 'Administração', fullLabel: 'Administração Integrada', icon: 'fa-gears', colorClass: 'mod-admin' },
        { key: 'direcao', label: 'Direção', fullLabel: 'Direção Executiva', icon: 'fa-crown', colorClass: 'mod-direcao' },
        { key: 'uniformes', label: 'Uniformes', fullLabel: 'Controle de Uniformes', icon: 'fa-shirt', colorClass: 'mod-uniformes' },
        { key: 'ext_recursos', label: 'Lab', fullLabel: 'Agendamento Lab & Recursos', icon: 'fa-calendar-check', colorClass: 'mod-ext-recursos' },
        { key: 'ext_dashboard', label: 'Dash', fullLabel: 'Dashboard de Avaliação', icon: 'fa-chart-line', colorClass: 'mod-ext-dash' },
        { key: 'ext_contabil', label: 'Contábil', fullLabel: 'Sistema Contábil (APMF)', icon: 'fa-calculator', colorClass: 'mod-ext-contabil' },
        { key: 'ext_biblioteca', label: 'Biblio', fullLabel: 'Sistema da Biblioteca', icon: 'fa-book-bookmark', colorClass: 'mod-ext-biblio' },
        { key: 'ext_patrimonio', label: 'Patrimônio', fullLabel: 'Sistema de Patrimônio', icon: 'fa-boxes-stacked', colorClass: 'mod-ext-patrimonio' }
    ];

    tbody.innerHTML = filtered.map(u => {
        const isMasterDev = (u.email && u.email.toLowerCase().trim() === "elcortelini@gmail.com") || (u.cpf && cleanCpf(u.cpf) === "80603742068") || u.role === "desenvolvedor";
        const perms = u.permissoes || { op: true, mural: true, supervisao: false, admin: false, direcao: false, uniformes: false };
        const iniciais = u.nome ? u.nome.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'U';
        const userKey = u.id || u.cpf || u.email || u.nome;
        const emailOrCpfDisplay = u.email
            ? `<i class="fa-regular fa-envelope"></i> ${escapeHtml(u.email)}`
            : (u.cpf ? `<i class="fa-solid fa-id-card"></i> CPF: ${escapeHtml(u.cpf)}` : `<i class="fa-regular fa-user"></i> Sem e-mail cadastrado`);

        // Chips dos Módulos & Sistemas
        const chipsHtml = modulosConfig.map(m => {
            const isActive = isMasterDev ? true : !!perms[m.key];
            const activeClass = isActive ? `active ${m.colorClass}` : 'inactive';
            const iconStatus = isActive ? 'fa-check' : 'fa-xmark';
            const titleTooltip = isMasterDev 
                ? `${m.fullLabel}: Acesso Master Obrigatório` 
                : `${m.fullLabel}: Clique para ${isActive ? 'Revogar' : 'Liberar'} acesso`;

            if (isMasterDev) {
                return `
                    <span class="rbac-mod-chip active ${m.colorClass} disabled" title="${escapeHtml(titleTooltip)}">
                        <i class="fa-solid ${m.icon}"></i>
                        <span>${m.label}</span>
                        <i class="fa-solid fa-lock" style="font-size:0.65rem; opacity:0.75;"></i>
                    </span>
                `;
            }

            return `
                <button type="button" 
                    onclick="toggleUserModuloPermissaoCard('${escapeHtml(userKey)}', '${m.key}')" 
                    class="rbac-mod-chip ${activeClass}" 
                    title="${escapeHtml(titleTooltip)}"
                    aria-label="${m.fullLabel} para ${escapeHtml(u.nome)}">
                    <i class="fa-solid ${m.icon}"></i>
                    <span>${m.label}</span>
                    <i class="fa-solid ${iconStatus}" style="font-size:0.7rem;"></i>
                </button>
            `;
        }).join('');

        // Contagem de Módulos
        const totalModulos = modulosConfig.length;
        const qtdAtivos = isMasterDev ? totalModulos : modulosConfig.filter(m => !!perms[m.key]).length;
        let badgeStatus = '';
        if (qtdAtivos === totalModulos) {
            badgeStatus = `<span class="rbac-status-badge rbac-status-total"><i class="fa-solid fa-circle-check"></i> ${qtdAtivos}/${totalModulos} Total</span>`;
        } else if (qtdAtivos === 0) {
            badgeStatus = `<span class="rbac-status-badge rbac-status-bloqueado"><i class="fa-solid fa-ban"></i> 0/${totalModulos} Bloqueado</span>`;
        } else {
            badgeStatus = `<span class="rbac-status-badge rbac-status-parcial"><i class="fa-solid fa-shield-halved"></i> ${qtdAtivos}/${totalModulos} Parcial</span>`;
        }

        // Ações Rápidas por Usuário
        let acoesHtml = '';
        if (isMasterDev) {
            acoesHtml = `
                <span style="font-size:0.75rem; color:#6d28d9; font-weight:800; display:inline-flex; align-items:center; gap:4px; background:#ede9fe; padding:4px 8px; border-radius:6px;">
                    <i class="fa-solid fa-crown"></i> Master Dev
                </span>
            `;
        } else {
            acoesHtml = `
                <div style="display:flex; justify-content:flex-end; align-items:center; gap:4px; flex-wrap:wrap;">
                    <button type="button" onclick="aplicarPresetPermissoesUsuario('${escapeHtml(userKey)}', 'total')" class="rbac-preset-btn" title="Liberar todos os módulos">
                        <i class="fa-solid fa-bolt" style="color:#10b981;"></i> Tudo
                    </button>
                    <button type="button" onclick="aplicarPresetPermissoesUsuario('${escapeHtml(userKey)}', 'pedagogico')" class="rbac-preset-btn" title="Liberar módulos pedagógicos (OE, Mural, Supervisão)">
                        <i class="fa-solid fa-graduation-cap" style="color:#0284c7;"></i> Pedag.
                    </button>
                    <button type="button" onclick="openModalNovoUsuarioRBAC('${escapeHtml(userKey)}')" class="rbac-preset-btn" title="Editar dados e permissões">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button type="button" onclick="deleteDevUser('${escapeHtml(userKey)}')" class="rbac-preset-btn" style="color:#ef4444;" title="Excluir usuário do sistema">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        }

        return `
            <tr>
                <td>
                    <div class="rbac-user-cell">
                        <div class="rbac-user-avatar">${escapeHtml(iniciais)}</div>
                        <div class="rbac-user-details">
                            <span class="rbac-user-name">${escapeHtml(u.nome)}</span>
                            <span class="rbac-user-email">${emailOrCpfDisplay}</span>
                            <span class="rbac-user-cargo">${escapeHtml(u.cargo || 'Colaborador Escolar')}</span>
                        </div>
                    </div>
                </td>
                <td style="padding:12px 14px;">
                    <span class="role-badge-pill role-pill-${u.role}">${escapeHtml(getRoleLabel(u.role))}</span>
                </td>
                <td style="padding:12px 14px;">
                    <div class="rbac-modules-grid">
                        ${chipsHtml}
                    </div>
                </td>
                <td style="padding:12px 14px; text-align:center;">
                    ${badgeStatus}
                </td>
                <td style="padding:12px 14px; text-align:right;">
                    ${acoesHtml}
                </td>
            </tr>
        `;
    }).join('');
}

function findUserByIdentifier(users, identifier) {
    if (!identifier || !Array.isArray(users)) return null;
    const norm = String(identifier).toLowerCase().trim();
    const normCpf = typeof cleanCpf === 'function' ? cleanCpf(norm) : norm.replace(/\D/g, '');
    return users.find(user =>
        (user.id && String(user.id).toLowerCase().trim() === norm) ||
        (user.email && String(user.email).toLowerCase().trim() === norm) ||
        (normCpf && user.cpf && (typeof cleanCpf === 'function' ? cleanCpf(user.cpf) : String(user.cpf).replace(/\D/g, '')) === normCpf) ||
        (user.nome && String(user.nome).toLowerCase().trim() === norm)
    );
}

function toggleUserModuloPermissaoCard(userIdentifier, moduloKey) {
    const users = sigeDB.getUsuarios();
    const u = findUserByIdentifier(users, userIdentifier);
    if (u) {
        if (!u.permissoes) {
            u.permissoes = sigeDB.getDefaultPermissoesByRole(u.role);
        }
        const currentState = !!u.permissoes[moduloKey];
        u.permissoes[moduloKey] = !currentState;
        const targetKey = u.id || u.cpf || u.email || userIdentifier;
        sigeDB.salvarPermissoesUsuario(targetKey, u.permissoes);

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

        const acao = u.permissoes[moduloKey] ? "LIBERADO" : "REVOGADO";
        showToast(`${acao}: Acesso ao módulo ${moduloNome} para ${u.nome}!`);

        renderAdminPermissoesUsuarios();
        if (typeof renderDevUsersList === "function") renderDevUsersList();
    }
}

function aplicarPresetPermissoesUsuario(userIdentifier, preset) {
    if (!userIdentifier) return;
    if (sigeDB.aplicarPresetPermissoes(userIdentifier, preset)) {
        const labels = {
            total: "Acesso Total (Todos os módulos)",
            pedagogico: "Perfil Pedagógico (OE, Mural, Supervisão)",
            administrativo: "Perfil Administrativo (Mural, ADM, Direção, Uniformes)",
            bloqueado: "Acesso Bloqueado (Sem módulos)"
        };
        showToast(`Preset "${labels[preset] || preset}" aplicado com sucesso!`);
        renderAdminPermissoesUsuarios();
        if (typeof renderDevUsersList === "function") renderDevUsersList();
    }
}

let currentEditingRbacUserKey = null;

function openModalNovoUsuarioRBAC(identificadorParaEditar) {
    const modal = document.getElementById("modalAdminNovoUsuario");
    if (!modal) return;

    const titleElem = document.getElementById("modalAdminNovoUsuarioTitle");
    const inputEmail = document.getElementById("rbacInputEmail");
    const inputNome = document.getElementById("rbacInputNome");
    const inputCpf = document.getElementById("rbacInputCpf");
    const inputDataNasc = document.getElementById("rbacInputDataNasc");
    const selectRole = document.getElementById("rbacInputRole");
    const inputCargo = document.getElementById("rbacInputCargo");

    currentEditingRbacUserKey = null;

    if (identificadorParaEditar) {
        const users = sigeDB.getUsuarios();
        const u = findUserByIdentifier(users, identificadorParaEditar);
        if (u) {
            currentEditingRbacUserKey = u.id || u.cpf || u.email;
            if (titleElem) titleElem.innerHTML = `<i class="fa-solid fa-user-pen" style="color:#7c3aed;"></i> Editar Usuário: ${escapeHtml(u.nome)}`;
            if (inputEmail) {
                inputEmail.value = u.email || '';
                inputEmail.disabled = (u.email && u.email.toLowerCase().trim() === "elcortelini@gmail.com");
            }
            if (inputNome) inputNome.value = u.nome || '';
            if (inputCpf) inputCpf.value = u.cpf || '';
            if (inputDataNasc) inputDataNasc.value = u.dataNascimento || '';
            if (selectRole) selectRole.value = u.role || 'orientacao';
            if (inputCargo) inputCargo.value = u.cargo || '';

            const perms = u.permissoes || sigeDB.getDefaultPermissoesByRole(u.role);
            ['op', 'mural', 'supervisao', 'admin', 'direcao', 'uniformes', 'ext_recursos', 'ext_dashboard', 'ext_contabil', 'ext_biblioteca', 'ext_patrimonio'].forEach(k => {
                const chk = document.getElementById(`rbacChk_${k}`);
                if (chk) chk.checked = !!perms[k];
            });
        }
    } else {
        if (titleElem) titleElem.innerHTML = `<i class="fa-solid fa-user-plus" style="color:#7c3aed;"></i> Cadastrar Novo Usuário de Acesso`;
        if (inputEmail) {
            inputEmail.value = '';
            inputEmail.disabled = false;
        }
        if (inputNome) inputNome.value = '';
        if (inputCpf) inputCpf.value = '';
        if (inputDataNasc) inputDataNasc.value = '';
        if (selectRole) selectRole.value = 'orientacao';
        if (inputCargo) inputCargo.value = 'Orientadora Educacional';
        autoSelectRbacRoleDefaults('orientacao');
    }

    modal.style.display = "flex";
}

function closeModalNovoUsuarioRBAC() {
    const modal = document.getElementById("modalAdminNovoUsuario");
    if (modal) modal.style.display = "none";
}

function autoSelectRbacRoleDefaults(role) {
    const defaults = sigeDB.getDefaultPermissoesByRole(role);
    ['op', 'mural', 'supervisao', 'admin', 'direcao', 'uniformes', 'ext_recursos', 'ext_dashboard', 'ext_contabil', 'ext_biblioteca', 'ext_patrimonio'].forEach(k => {
        const chk = document.getElementById(`rbacChk_${k}`);
        if (chk) chk.checked = !!defaults[k];
    });

    const cargoInput = document.getElementById("rbacInputCargo");
    if (cargoInput && !cargoInput.value) {
        if (role.startsWith("orientadora")) cargoInput.value = "Orientadora Educacional";
        else if (role === "supervisao") cargoInput.value = "Supervisora Pedagógica";
        else if (role === "direcao") cargoInput.value = "Direção Escolar";
        else if (role === "secretaria") cargoInput.value = "Secretaria & Recepção";
        else if (role === "docentes") cargoInput.value = "Professor(a) Regente";
    }
}

function setAllModalRbacCheckboxes(checked) {
    ['op', 'mural', 'supervisao', 'admin', 'direcao', 'uniformes', 'ext_recursos', 'ext_dashboard', 'ext_contabil', 'ext_biblioteca', 'ext_patrimonio'].forEach(k => {
        const chk = document.getElementById(`rbacChk_${k}`);
        if (chk) chk.checked = !!checked;
    });
}

function submitNovoUsuarioRBAC(e) {
    if (e && e.preventDefault) e.preventDefault();
    const email = (document.getElementById("rbacInputEmail")?.value || '').trim();
    const nome = (document.getElementById("rbacInputNome")?.value || '').trim();
    const cpf = (document.getElementById("rbacInputCpf")?.value || '').trim();
    const dataNascimento = (document.getElementById("rbacInputDataNasc")?.value || '').trim();
    const role = document.getElementById("rbacInputRole")?.value;
    const cargo = (document.getElementById("rbacInputCargo")?.value || '').trim();

    if (!nome || !role || !cargo) {
        alert("Preencha todos os campos obrigatórios (Nome, Perfil e Cargo).");
        return;
    }

    if (!currentEditingRbacUserKey && !email && !cpf) {
        alert("Por favor, informe pelo menos o CPF ou E-mail para permitir o login do usuário.");
        return;
    }

    const cleanCpfNum = cleanCpf(cpf);
    if (cpf && cleanCpfNum.length !== 11) {
        alert("O número de CPF informado deve conter 11 dígitos.");
        return;
    }

    let effectiveDt = dataNascimento;
    if (!effectiveDt && !currentEditingRbacUserKey) {
        effectiveDt = "01/01/2000";
    }
    const cleanDt = cleanDataNascimento(effectiveDt);
    if (dataNascimento && cleanDt.length !== 8) {
        alert("A Data de Nascimento deve estar no formato DD/MM/AAAA (8 dígitos).");
        return;
    }

    const permissoes = {
        op: !!document.getElementById("rbacChk_op")?.checked,
        mural: !!document.getElementById("rbacChk_mural")?.checked,
        supervisao: !!document.getElementById("rbacChk_supervisao")?.checked,
        admin: !!document.getElementById("rbacChk_admin")?.checked,
        direcao: !!document.getElementById("rbacChk_direcao")?.checked,
        uniformes: !!document.getElementById("rbacChk_uniformes")?.checked,
        ext_recursos: !!document.getElementById("rbacChk_ext_recursos")?.checked,
        ext_dashboard: !!document.getElementById("rbacChk_ext_dashboard")?.checked,
        ext_contabil: !!document.getElementById("rbacChk_contabil")?.checked || !!document.getElementById("rbacChk_ext_contabil")?.checked,
        ext_biblioteca: !!document.getElementById("rbacChk_ext_biblioteca")?.checked,
        ext_patrimonio: !!document.getElementById("rbacChk_ext_patrimonio")?.checked
    };

    const existingUser = currentEditingRbacUserKey ? findUserByIdentifier(sigeDB.getUsuarios(), currentEditingRbacUserKey) : null;
    const sHash = cleanDt ? hashSecretSync(cleanDt) : (existingUser?.senhaHash || '');

    sigeDB.addUsuario({
        id: existingUser?.id,
        cpf: cpf ? formatCpf(cpf) : (existingUser?.cpf || ''),
        dataNascimento: dataNascimento ? formatDataNascimento(dataNascimento) : (existingUser?.dataNascimento || ''),
        senhaHash: sHash,
        email: email || existingUser?.email || '',
        nome,
        role,
        cargo,
        status: 'aprovado',
        cadastroCompleto: true,
        permissoes
    });
    showToast(`✅ Usuário ${nome} salvo com sucesso! Já pode realizar login.`);
    closeModalNovoUsuarioRBAC();
    renderAdminPermissoesUsuarios();
    if (typeof renderDevUsersList === "function") renderDevUsersList();
    if (typeof renderEquipeEscolarTable === "function") renderEquipeEscolarTable();
}

function sincronizarUsuariosComEquipeUI() {
    const adicionados = sigeDB.sincronizarUsuariosComEquipe();
    if (adicionados > 0) {
        showToast(`🎉 Sincronização concluída: ${adicionados} novo(s) colaborador(es) importado(s) com sucesso!`);
    } else {
        showToast("ℹ️ Todos os colaboradores já constavam na base de acessos.");
    }
    renderAdminPermissoesUsuarios();
    if (typeof renderDevUsersList === "function") renderDevUsersList();
}

function toggleUserModuloPermissao(userIdentifier, moduloKey, isChecked) {
    const users = sigeDB.getUsuarios();
    const u = findUserByIdentifier(users, userIdentifier);
    if (u) {
        if (!u.permissoes) {
            u.permissoes = sigeDB.getDefaultPermissoesByRole(u.role);
        }
        u.permissoes[moduloKey] = isChecked;
        const targetKey = u.id || u.cpf || u.email || userIdentifier;
        sigeDB.salvarPermissoesUsuario(targetKey, u.permissoes);
        showToast(`Permissão "${moduloKey.toUpperCase()}" atualizada para ${u.nome}!`);
        renderAdminPermissoesUsuarios();
    }
}

function submitAddDevUser(e) {
    if (e && e.preventDefault) e.preventDefault();
    const email = document.getElementById("devUserEmail")?.value.trim() || "";
    const nome = document.getElementById("devUserName")?.value.trim() || "";
    const role = document.getElementById("devUserRole")?.value;
    const cargo = document.getElementById("devUserCargo")?.value.trim() || "";
    const cpf = document.getElementById("devUserCpf")?.value.trim() || "";
    const dataNascimento = document.getElementById("devUserDataNasc")?.value.trim() || "";

    if (!nome || !role || !cargo || (!email && !cpf)) {
        alert("Preencha Nome, Perfil, Cargo e pelo menos E-mail ou CPF.");
        return;
    }

    let effectiveDt = dataNascimento || "01/01/2000";
    const cleanDt = cleanDataNascimento(effectiveDt);
    const senhaHash = cleanDt ? hashSecretSync(cleanDt) : "";

    sigeDB.addUsuario({
        email: email || "",
        nome,
        role,
        cargo,
        cpf: cpf ? formatCpf(cpf) : "",
        dataNascimento: formatDataNascimento(effectiveDt),
        senhaHash: senhaHash,
        status: "aprovado",
        cadastroCompleto: true
    });
    showToast(`Usuário ${nome} salvo com sucesso! Já pode realizar login.`);
    
    if (document.getElementById("devUserEmail")) document.getElementById("devUserEmail").value = "";
    if (document.getElementById("devUserName")) document.getElementById("devUserName").value = "";
    if (document.getElementById("devUserCargo")) document.getElementById("devUserCargo").value = "";
    if (document.getElementById("devUserCpf")) document.getElementById("devUserCpf").value = "";
    if (document.getElementById("devUserDataNasc")) document.getElementById("devUserDataNasc").value = "";

    renderDevUsersList();
    renderAdminPermissoesUsuarios();
    if (typeof renderEquipeEscolarTable === "function") renderEquipeEscolarTable();
}

function deleteDevUser(userIdentifier) {
    if (confirm(`Tem certeza que deseja remover as permissões deste usuário (${userIdentifier})?`)) {
        if (sigeDB.removeUsuario(userIdentifier)) {
            showToast("Usuário removido com sucesso!");
            renderDevUsersList();
            renderAdminPermissoesUsuarios();
            renderEquipeEscolarTable(currentSetorFilter, equipeBuscaTexto);
        } else {
            alert("Não é possível remover o desenvolvedor principal.");
        }
    }
}

function marcarAguardandoSecretaria(id) {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
    }
    const agora = new Date().toISOString();
    sigeDB.updateSecretariaStatusOP(id, "aguardando", "Aluno/Responsável aguardando na recepção.", agora);
    showToast("🔔 Aluno marcado como AGUARDANDO na recepção! Notificação enviada à Orientadora.");

    setTimeout(() => {
        renderNotifications();
        renderModuleOrientacaoPedagogica();
    }, 50);
}

function marcarPresencaConfirmadaWhatsApp(id) {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
    }
    const agora = new Date().toISOString();
    sigeDB.updateSecretariaStatusOP(id, "confirmado", "Presença confirmada pelo responsável via WhatsApp.", agora);
    showToast("🟢 Presença confirmada via WhatsApp com sucesso!");

    setTimeout(() => {
        renderNotifications();
        renderModuleOrientacaoPedagogica();
    }, 50);
}
window.marcarPresencaConfirmadaWhatsApp = marcarPresencaConfirmadaWhatsApp;

const ORIENTADORA_PALETTE = [
    { bg: "#fef2f2", border: "#fecaca", borderLeft: "#dc2626", text: "#b91c1c", badgeBg: "#fee2e2" },
    { bg: "#f0f9ff", border: "#bae6fd", borderLeft: "#0284c7", text: "#0369a1", badgeBg: "#e0f2fe" },
    { bg: "#ecfdf5", border: "#a7f3d0", borderLeft: "#059669", text: "#047857", badgeBg: "#d1fae5" },
    { bg: "#fffbeb", border: "#fde68a", borderLeft: "#d97706", text: "#b45309", badgeBg: "#fef3c7" },
    { bg: "#faf5ff", border: "#e9d5ff", borderLeft: "#9333ea", text: "#7e22ce", badgeBg: "#f3e8ff" },
    { bg: "#f0fdfa", border: "#99f6e4", borderLeft: "#0d9488", text: "#0f766e", badgeBg: "#ccfbf1" }
];
window.ORIENTADORA_PALETTE = ORIENTADORA_PALETTE;

function getOrientadoraColorTheme(orientadoraNameOrId) {
    const orientadoras = (typeof sigeDB !== 'undefined' && sigeDB.getOrientadoras) ? sigeDB.getOrientadoras() : [];
    if (!orientadoras || orientadoras.length === 0) {
        return ORIENTADORA_PALETTE[0];
    }
    if (!orientadoraNameOrId) return ORIENTADORA_PALETTE[0];
    const target = orientadoraNameOrId.toLowerCase().trim();
    const idx = orientadoras.findIndex(o => 
        (o.nome && o.nome.toLowerCase().includes(target)) ||
        (o.nome && target.includes(o.nome.toLowerCase())) ||
        (o.id && o.id.toLowerCase() === target)
    );
    if (idx >= 0) {
        return ORIENTADORA_PALETTE[idx % ORIENTADORA_PALETTE.length];
    }
    return ORIENTADORA_PALETTE[0];
}
window.getOrientadoraColorTheme = getOrientadoraColorTheme;

function matchOrientadora(a, filterVal) {
    if (!filterVal || filterVal === "todas" || filterVal === "") return true;
    if (!a) return false;
    const itemOri = (typeof a === 'string') ? a : (a.orientadora || "");
    const oriLower = itemOri.toLowerCase().trim();
    const filterLower = filterVal.toLowerCase().trim();

    if (!oriLower) return true;
    if (oriLower === filterLower || oriLower.includes(filterLower) || filterLower.includes(oriLower)) {
        return true;
    }

    if (filterLower.startsWith("orientadora_")) {
        const idOrName = filterLower.replace("orientadora_", "");
        const orientadoras = (typeof sigeDB !== 'undefined' && sigeDB.getOrientadoras) ? sigeDB.getOrientadoras() : [];
        const o = orientadoras.find(item => item.id.toLowerCase() === idOrName || item.nome.toLowerCase().includes(idOrName));
        if (o) {
            const oNameLower = o.nome.toLowerCase().trim();
            return oriLower.includes(oNameLower) || oNameLower.includes(oriLower);
        }
    }
    return false;
}
window.matchOrientadora = matchOrientadora;

// ==========================================
// PERFIL E NÍVEIS DE ACESSO (RBAC)
// ==========================================
function getOrientadoraByRole(role) {
    if (!role) return null;
    const orientadoras = (typeof sigeDB !== 'undefined' && sigeDB.getOrientadoras) ? sigeDB.getOrientadoras() : [];
    
    // 1. Busca prioritária por ID ou nome da role ativa selecionada (ex: orientadora_clarinda, orientadora_daiane, orientadora_prof-edevaldo)
    if (role.startsWith("orientadora_")) {
        const idOrName = role.replace("orientadora_", "").toLowerCase();
        const found = orientadoras.find(o => (o.id && o.id.toLowerCase() === idOrName) || (o.nome && o.nome.toLowerCase().includes(idOrName)));
        if (found) return found;
    }

    // 2. Se estiver logado e for estritamente do perfil executora de atendimento
    const logged = (typeof sigeDB !== 'undefined' && sigeDB.getLoggedUser) ? sigeDB.getLoggedUser() : null;
    if (logged && (!role || role === logged.role || !role.startsWith("orientadora_"))) {
        const perfil = (typeof sigeDB !== 'undefined' && sigeDB.getOpPerfil) ? sigeDB.getOpPerfil(logged) : 'none';
        if (perfil === 'executora') {
            const found = orientadoras.find(o => o.id === logged.id || (o.nome && logged.nome && o.nome.toLowerCase().trim() === logged.nome.toLowerCase().trim()));
            if (found) return found;
            if (logged.nome) return { id: logged.id || "logged-ori", nome: logged.nome, cargoFuncao: logged.cargo || "Orientador(a) Educacional" };
        }
    }

    if (role === "orientacao" && orientadoras.length > 0) {
        return orientadoras[0];
    }
    return null;
}
window.getOrientadoraByRole = getOrientadoraByRole;

function getSupervisoraByRole(role) {
    const supervisoras = (typeof sigeDB !== 'undefined' && sigeDB.getSupervisoras) ? sigeDB.getSupervisoras() : [];
    if (!role) return null;
    if (role.startsWith("supervisora_")) {
        const idOrName = role.replace("supervisora_", "").toLowerCase();
        return supervisoras.find(s => s.id.toLowerCase() === idOrName || s.nome.toLowerCase().includes(idOrName)) || null;
    }
    if (role === "supervisao" && supervisoras.length > 0) {
        return supervisoras[0];
    }
    return null;
}
window.getSupervisoraByRole = getSupervisoraByRole;

function populateActiveRoleSelectOptions(roleSelect) {
    if (!roleSelect) return;

    const orientadoras = sigeDB.getOrientadoras();
    const supervisoras = sigeDB.getSupervisoras();

    let html = `
        <option value="desenvolvedor">🛠️ Desenvolvedor do Sistema</option>
        <option value="admin">🏫 Administrador(a) Escolar</option>
        <option value="direcao">👑 Gestor / Direção Escolar</option>
    `;

    orientadoras.forEach(o => {
        const valueKey = "orientadora_" + o.id;
        const sub = o.turmasOuSalas || o.cargoFuncao || "OE";
        const prefix = (typeof getOrientadorPrefix === 'function') ? getOrientadorPrefix(o.nome, o.cargoFuncao) : 'Orientador(a)';
        const iconPrefix = prefix === "Orientador" ? "🧭 Orientador" : "💛 Orientadora";
        html += `<option value="${escapeHtml(valueKey)}">${iconPrefix} ${escapeHtml(o.nome)} (${escapeHtml(sub)})</option>`;
    });

    supervisoras.forEach(s => {
        const valueKey = "supervisora_" + s.id;
        html += `<option value="${escapeHtml(valueKey)}">📋 Supervisora ${escapeHtml(s.nome)}</option>`;
    });

    html += `
        <option value="secretaria">📝 Secretaria Escolar</option>
        <option value="supervisao">📋 Supervisor Pedagógico Geral</option>
        <option value="docentes">👨‍🏫 Corpo Docente / Professores</option>
        <option value="comunidade">👥 Professor / Aluno / Comunidade</option>
    `;

    roleSelect.innerHTML = html;
}

function syncRoleFilters() {
    const role = sigeDB.getRole();
    const logged = (typeof sigeDB !== 'undefined' && sigeDB.getLoggedUser) ? sigeDB.getLoggedUser() : null;
    const opFilter = document.getElementById("opFilterOrientadora");
    const isMaster = (logged && (logged.role === 'desenvolvedor' || logged.role === 'direcao' || (logged.permissoes && logged.permissoes.direcao))) || role === 'desenvolvedor' || role === 'direcao';
    const activeOri = (typeof getOrientadoraByRole === 'function') ? getOrientadoraByRole(role) : null;

    if (opFilter) {
        if (activeOri && role.startsWith("orientadora_")) {
            opFilter.value = activeOri.nome;
            opFilter.disabled = true;
        } else if (activeOri && !isMaster) {
            opFilter.value = activeOri.nome;
            opFilter.disabled = true;
        } else {
            opFilter.disabled = false;
        }
    }
}

function setupRoleSelector() {
    const roleSelect = document.getElementById("activeRoleSelect");
    const roleBadge = document.getElementById("activeRoleBadge");
    if (!roleSelect) return;

    populateActiveRoleSelectOptions(roleSelect);

    const currentRole = sigeDB.getRole();
    if (Array.from(roleSelect.options).some(opt => opt.value === currentRole)) {
        roleSelect.value = currentRole;
    } else {
        roleSelect.value = "desenvolvedor";
        sigeDB.setRole("desenvolvedor");
    }

    updateRoleBadgePill(sigeDB.getRole(), roleBadge);
    syncRoleFilters();

    roleSelect.onchange = (e) => {
        const newRole = e.target.value;
        sigeDB.setRole(newRole);
        updateRoleBadgePill(newRole, roleBadge);
        syncRoleFilters();

        // Atualiza abas visíveis conforme o papel ativo
        atualizarAbasNavegacaoVisibilidade();

        renderNotifications();
        renderAllModules();
        showToast(`Perfil de visualização alterado para: ${getRoleLabel(newRole)}`);
    };
}

function updateRoleBadgePill(role, badgeElem) {
    if (!badgeElem) return;
    badgeElem.style.display = "none";
}

window.checkSigeAuth = checkSigeAuth;
window.submitSigeLogin = submitSigeLogin;
window.abrirModalPrimeiroAcesso = abrirModalPrimeiroAcesso;
window.fecharModalPrimeiroAcesso = fecharModalPrimeiroAcesso;
window.submitPrimeiroAcesso = submitPrimeiroAcesso;
window.handleSigeLogout = handleSigeLogout;
window.logoutSige = handleSigeLogout;
window.marcarAguardandoSecretaria = marcarAguardandoSecretaria;
window.abrirModalOnboardingCadastro = abrirModalOnboardingCadastro;
window.submitOnboardingCadastro = submitOnboardingCadastro;
window.cancelarOnboardingCadastro = cancelarOnboardingCadastro;
window.mascaraTelefoneInput = mascaraTelefoneInput;

window.openDevUserModal = openDevUserModal;
window.closeDevUserModal = closeDevUserModal;
window.submitAddDevUser = submitAddDevUser;
window.deleteDevUser = deleteDevUser;
window.renderDevUsersList = renderDevUsersList;
window.setRbacFilterPerfil = setRbacFilterPerfil;
window.filtrarUsuariosRBAC = filtrarUsuariosRBAC;
window.renderAdminPermissoesUsuarios = renderAdminPermissoesUsuarios;
window.toggleUserModuloPermissaoCard = toggleUserModuloPermissaoCard;
window.aplicarPresetPermissoesUsuario = aplicarPresetPermissoesUsuario;
window.openModalNovoUsuarioRBAC = openModalNovoUsuarioRBAC;
window.closeModalNovoUsuarioRBAC = closeModalNovoUsuarioRBAC;
window.autoSelectRbacRoleDefaults = autoSelectRbacRoleDefaults;
window.setAllModalRbacCheckboxes = setAllModalRbacCheckboxes;
window.submitNovoUsuarioRBAC = submitNovoUsuarioRBAC;
window.sincronizarUsuariosComEquipeUI = sincronizarUsuariosComEquipeUI;
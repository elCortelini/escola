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
    initGoogleAuth();
    updateAllSchoolLogoDisplays();
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
        userText.innerHTML = `<i class="fa-solid fa-user-circle"></i> <strong>${user.nome}</strong> (${user.email})`;
    }

    // Define papel no BD local
    sigeDB.setRole(user.role);

    // O Seletor de Perfis e o botão de Gestão de Usuários são EXCLUSIVOS do Desenvolvedor
    const isDev = user.role === "desenvolvedor";
    if (roleWrapper) roleWrapper.style.display = isDev ? "inline-flex" : "none";
    if (btnDev) btnDev.style.display = isDev ? "inline-flex" : "none";

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

    return true;
}

function submitSigeLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    const emailInput = document.getElementById("loginEmailInput");
    if (!emailInput) return;
    const email = emailInput.value.trim();
    if (!email) return;

    const res = sigeDB.loginWithEmail(email);

    if (res.code === 'INVALID_DOMAIN') {
        alert(`🔒 Acesso Negado\n\n${res.message}\n\nE-mails pessoais (como @gmail.com ou @hotmail.com) não são aceitos.`);
        return;
    }

    if (res.code === 'FIRST_ACCESS_PENDING') {
        alert(`📝 Solicitação Registrada!\n\n${res.message}`);
        emailInput.value = '';
        return;
    }

    if (res.code === 'PENDING_APPROVAL') {
        alert(`⏳ Acesso em Análise\n\n${res.message}`);
        emailInput.value = '';
        return;
    }

    if (res.code === 'BLOCKED') {
        alert(`🚫 Acesso Bloqueado\n\n${res.message}`);
        return;
    }

    if (res.code === 'NEEDS_ONBOARDING') {
        const loginModal = document.getElementById("modalSigeLogin");
        if (loginModal) loginModal.style.display = "none";
        abrirModalOnboardingCadastro(res.user);
        return;
    }

    if (res.success && res.user) {
        showToast(`Bem-vindo(a), ${res.user.nome}!`);
        checkSigeAuth();
        renderAllModules();
    }
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

function mascaraTelefoneInput(input) {
    if (!input) return;
    let v = input.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10) {
        input.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
    } else if (v.length > 6) {
        input.value = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
    } else if (v.length > 2) {
        input.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    } else if (v.length > 0) {
        input.value = `(${v}`;
    }
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

function fillLoginEmail(email) {
    const emailInput = document.getElementById("loginEmailInput");
    if (emailInput) {
        emailInput.value = email;
    }
    processGoogleLogin(email);
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
                    <th style="padding:8px;">Perfil</th>
                    <th style="padding:8px;">Cargo</th>
                    <th style="padding:8px; text-align:center;">Módulos Liberados (RBAC)</th>
                    <th style="padding:8px; text-align:center;">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    users.forEach(u => {
        const isDevDefault = u.email.toLowerCase().trim() === "elcortelini@gmail.com";
        const perms = u.permissoes || { op: true, mural: true, supervisao: false, admin: false, direcao: false, uniformes: false };
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
                <td style="padding:8px;">
                    <div style="display:flex; flex-wrap:wrap; gap:6px; font-size:0.75rem; justify-content:center;">
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#eff6ff; padding:2px 6px; border-radius:6px; cursor:pointer;" title="Orientação Educacional">
                            <input type="checkbox" ${perms.op ? 'checked' : ''} onchange="toggleUserModuloPermissao('${u.email}', 'op', this.checked)"> OE
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#f8fafc; padding:2px 6px; border-radius:6px; cursor:pointer;" title="Mural e Prazos">
                            <input type="checkbox" ${perms.mural ? 'checked' : ''} onchange="toggleUserModuloPermissao('${u.email}', 'mural', this.checked)"> Mural
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#fdf4ff; padding:2px 6px; border-radius:6px; cursor:pointer;" title="Supervisão Pedagógica">
                            <input type="checkbox" ${perms.supervisao ? 'checked' : ''} onchange="toggleUserModuloPermissao('${u.email}', 'supervisao', this.checked)"> Sup
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#f1f5f9; padding:2px 6px; border-radius:6px; cursor:pointer;" title="Administração">
                            <input type="checkbox" ${perms.admin ? 'checked' : ''} onchange="toggleUserModuloPermissao('${u.email}', 'admin', this.checked)"> ADM
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#fef3c7; color:#92400e; padding:2px 6px; border-radius:6px; font-weight:800; cursor:pointer;" title="Direção e Gestão Escolar">
                            <input type="checkbox" ${perms.direcao ? 'checked' : ''} onchange="toggleUserModuloPermissao('${u.email}', 'direcao', this.checked)"> 👑 Direção
                        </label>
                        <label style="display:inline-flex; align-items:center; gap:3px; background:#f0fdf4; padding:2px 6px; border-radius:6px; cursor:pointer;" title="Controle de Uniformes">
                            <input type="checkbox" ${perms.uniformes ? 'checked' : ''} onchange="toggleUserModuloPermissao('${u.email}', 'uniformes', this.checked)"> Uniformes
                        </label>
                    </div>
                </td>
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
            const cargo = (u.cargo || '').toLowerCase();
            return nome.includes(rbacBuscaTexto) || email.includes(rbacBuscaTexto) || cargo.includes(rbacBuscaTexto);
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
        const isMasterDev = u.email.toLowerCase().trim() === "elcortelini@gmail.com";
        const perms = u.permissoes || { op: true, mural: true, supervisao: false, admin: false, direcao: false, uniformes: false };
        const iniciais = u.nome ? u.nome.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : 'U';

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
                    onclick="toggleUserModuloPermissaoCard('${escapeHtml(u.email)}', '${m.key}')" 
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
                    <button type="button" onclick="aplicarPresetPermissoesUsuario('${escapeHtml(u.email)}', 'total')" class="rbac-preset-btn" title="Liberar todos os 6 módulos">
                        <i class="fa-solid fa-bolt" style="color:#10b981;"></i> Tudo
                    </button>
                    <button type="button" onclick="aplicarPresetPermissoesUsuario('${escapeHtml(u.email)}', 'pedagogico')" class="rbac-preset-btn" title="Liberar módulos pedagógicos (OE, Mural, Supervisão)">
                        <i class="fa-solid fa-graduation-cap" style="color:#0284c7;"></i> Pedag.
                    </button>
                    <button type="button" onclick="openModalNovoUsuarioRBAC('${escapeHtml(u.email)}')" class="rbac-preset-btn" title="Editar dados e permissões">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button type="button" onclick="deleteDevUser('${escapeHtml(u.email)}')" class="rbac-preset-btn" style="color:#ef4444;" title="Excluir usuário do sistema">
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
                            <span class="rbac-user-email"><i class="fa-regular fa-envelope"></i> ${escapeHtml(u.email)}</span>
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

function toggleUserModuloPermissaoCard(email, moduloKey) {
    const users = sigeDB.getUsuarios();
    const u = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (u) {
        if (!u.permissoes) {
            u.permissoes = sigeDB.getDefaultPermissoesByRole(u.role);
        }
        const currentState = !!u.permissoes[moduloKey];
        u.permissoes[moduloKey] = !currentState;
        sigeDB.salvarPermissoesUsuario(email, u.permissoes);

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

function aplicarPresetPermissoesUsuario(email, preset) {
    if (!email) return;
    if (sigeDB.aplicarPresetPermissoes(email, preset)) {
        const labels = {
            total: "Acesso Total (6 módulos)",
            pedagogico: "Perfil Pedagógico (OE, Mural, Supervisão)",
            administrativo: "Perfil Administrativo (Mural, ADM, Direção, Uniformes)",
            bloqueado: "Acesso Bloqueado (Sem módulos)"
        };
        showToast(`Preset "${labels[preset] || preset}" aplicado com sucesso!`);
        renderAdminPermissoesUsuarios();
        if (typeof renderDevUsersList === "function") renderDevUsersList();
    }
}

function openModalNovoUsuarioRBAC(emailParaEditar) {
    const modal = document.getElementById("modalAdminNovoUsuario");
    if (!modal) return;

    const titleElem = document.getElementById("modalAdminNovoUsuarioTitle");
    const inputEmail = document.getElementById("rbacInputEmail");
    const inputNome = document.getElementById("rbacInputNome");
    const selectRole = document.getElementById("rbacInputRole");
    const inputCargo = document.getElementById("rbacInputCargo");

    if (emailParaEditar) {
        const users = sigeDB.getUsuarios();
        const u = users.find(user => user.email.toLowerCase() === emailParaEditar.toLowerCase());
        if (u) {
            if (titleElem) titleElem.innerHTML = `<i class="fa-solid fa-user-pen" style="color:#7c3aed;"></i> Editar Usuário: ${escapeHtml(u.nome)}`;
            if (inputEmail) {
                inputEmail.value = u.email;
                inputEmail.disabled = (u.email.toLowerCase().trim() === "elcortelini@gmail.com");
            }
            if (inputNome) inputNome.value = u.nome;
            if (selectRole) selectRole.value = u.role || 'orientadora_clarinda';
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
        if (selectRole) selectRole.value = 'orientadora_clarinda';
        if (inputCargo) inputCargo.value = 'Orientadora Educacional';
        autoSelectRbacRoleDefaults('orientadora_clarinda');
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
    const email = document.getElementById("rbacInputEmail")?.value.trim();
    const nome = document.getElementById("rbacInputNome")?.value.trim();
    const role = document.getElementById("rbacInputRole")?.value;
    const cargo = document.getElementById("rbacInputCargo")?.value.trim();

    if (!email || !nome || !role || !cargo) {
        alert("Preencha todos os campos obrigatórios.");
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
        ext_contabil: !!document.getElementById("rbacChk_ext_contabil")?.checked,
        ext_biblioteca: !!document.getElementById("rbacChk_ext_biblioteca")?.checked,
        ext_patrimonio: !!document.getElementById("rbacChk_ext_patrimonio")?.checked
    };

    sigeDB.addUsuario({ email, nome, role, cargo, permissoes });
    showToast(`✅ Usuário ${nome} (${email}) salvo com permissões personalizadas!`);
    closeModalNovoUsuarioRBAC();
    renderAdminPermissoesUsuarios();
    if (typeof renderDevUsersList === "function") renderDevUsersList();
}

function sincronizarUsuariosComEquipeUI() {
    const adicionados = sigeDB.sincronizarUsuariosComEquipe();
    if (adicionados > 0) {
        showToast(`🎉 Sincronização concluída: ${adicionados} novo(s) colaborador(es) importado(s) com sucesso!`);
    } else {
        showToast("ℹ️ Todos os colaboradores com e-mail já constavam na base de acessos.");
    }
    renderAdminPermissoesUsuarios();
    if (typeof renderDevUsersList === "function") renderDevUsersList();
}

function toggleUserModuloPermissao(email, moduloKey, isChecked) {
    const users = sigeDB.getUsuarios();
    const u = users.find(user => user.email.toLowerCase() === email.toLowerCase());
    if (u) {
        if (!u.permissoes) {
            u.permissoes = sigeDB.getDefaultPermissoesByRole(u.role);
        }
        u.permissoes[moduloKey] = isChecked;
        sigeDB.salvarPermissoesUsuario(email, u.permissoes);
        showToast(`Permissão "${moduloKey.toUpperCase()}" atualizada para ${u.nome}!`);
        renderAdminPermissoesUsuarios();
    }
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
    renderAdminPermissoesUsuarios();
}

function deleteDevUser(email) {
    if (confirm(`Tem certeza que deseja remover as permissões do e-mail ${email}?`)) {
        if (sigeDB.removeUsuario(email)) {
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

function isClarinda(a) {
    if (!a) return false;
    if (!a.orientadora) return true;
    const ori = a.orientadora.toLowerCase();
    return ori.includes("clarinda") || ori.includes("1") || ori.includes("carmen") || ori.includes("iniciais");
}

function isDaiane(a) {
    if (!a || !a.orientadora) return false;
    const ori = a.orientadora.toLowerCase();
    return ori.includes("daiane") || ori.includes("2") || ori.includes("luciana") || ori.includes("finais");
}

function matchOrientadora(a, filterVal) {
    if (!filterVal || filterVal === "todas") return true;
    if (filterVal === "orientadora_clarinda" || filterVal.toLowerCase().includes("clarinda")) {
        return isClarinda(a);
    }
    if (filterVal === "orientadora_daiane" || filterVal.toLowerCase().includes("daiane")) {
        return isDaiane(a);
    }
    if (!a.orientadora) return true;
    return a.orientadora === filterVal || a.orientadora.includes(filterVal);
}

// ==========================================
// PERFIL E NÍVEIS DE ACESSO (RBAC)
// ==========================================
function getOrientadoraByRole(role) {
    const orientadoras = sigeDB.getOrientadoras();
    if (!role) return null;
    if (role === "orientadora_clarinda") {
        return orientadoras.find(o => o.nome.toLowerCase().includes("clarinda") || o.id === "orient-1") || orientadoras[0] || null;
    }
    if (role === "orientadora_daiane") {
        return orientadoras.find(o => o.nome.toLowerCase().includes("daiane") || o.id === "orient-2") || orientadoras[1] || null;
    }
    if (role.startsWith("orientadora_")) {
        const idOrName = role.replace("orientadora_", "");
        return orientadoras.find(o => o.id === idOrName || o.nome === idOrName) || null;
    }
    return null;
}

function getSupervisoraByRole(role) {
    const supervisoras = sigeDB.getSupervisoras();
    if (!role) return null;
    if (role.startsWith("supervisora_")) {
        const idOrName = role.replace("supervisora_", "");
        return supervisoras.find(s => s.id === idOrName || s.nome === idOrName) || null;
    }
    return null;
}

function populateActiveRoleSelectOptions(roleSelect) {
    if (!roleSelect) return;

    const orientadoras = sigeDB.getOrientadoras();
    const supervisoras = sigeDB.getSupervisoras();

    let html = `
        <option value="desenvolvedor">🛠️ Desenvolvedor do Sistema</option>
    `;

    orientadoras.forEach(o => {
        let valueKey = "orientadora_" + o.id;
        if (o.nome.toLowerCase().includes("clarinda") || o.id === "orient-1") valueKey = "orientadora_clarinda";
        if (o.nome.toLowerCase().includes("daiane") || o.id === "orient-2") valueKey = "orientadora_daiane";
        
        const sub = o.turmasOuSalas || o.cargoFuncao || "OE";
        html += `<option value="${escapeHtml(valueKey)}">💛 Orientadora ${escapeHtml(o.nome)} (${escapeHtml(sub)})</option>`;
    });

    supervisoras.forEach(s => {
        const valueKey = "supervisora_" + s.id;
        html += `<option value="${escapeHtml(valueKey)}">📋 Supervisora ${escapeHtml(s.nome)}</option>`;
    });

    html += `
        <option value="secretaria">📝 Secretaria Escolar</option>
        <option value="direcao">👑 Gestor / Direção Escolar</option>
        <option value="supervisao">📋 Supervisor Pedagógico Geral</option>
        <option value="admin">⚙️ Administrador do Sistema</option>
        <option value="comunidade">👨‍🏫 Professor / Aluno / Comunidade</option>
    `;

    roleSelect.innerHTML = html;
}

function syncRoleFilters() {
    const role = sigeDB.getRole();
    const opFilter = document.getElementById("opFilterOrientadora");
    const activeOri = getOrientadoraByRole(role);

    if (opFilter) {
        if (activeOri) {
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

        renderNotifications();
        renderAllModules();
        showToast(`Perfil de visualização alterado para: ${getRoleLabel(newRole)}`);
    };
}

function updateRoleBadgePill(role, badgeElem) {
    if (!badgeElem) return;
    badgeElem.className = `role-badge-pill role-pill-${role}`;
    badgeElem.innerHTML = `<i class="${getRoleIcon(role)}"></i> ${getRoleLabel(role)}`;
}

function getRoleLabel(role) {
    if (role.startsWith("orientadora_")) {
        const ori = getOrientadoraByRole(role);
        if (ori) return `Orientadora ${ori.nome}`;
    }
    if (role.startsWith("supervisora_")) {
        const sup = getSupervisoraByRole(role);
        if (sup) return `Supervisora ${sup.nome}`;
    }
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
    if (role.startsWith("orientadora_")) return "fa-solid fa-heart-pulse";
    if (role.startsWith("supervisora_")) return "fa-solid fa-clipboard-check";
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

// ==========================================
// GOOGLE IDENTITY SERVICES (GIS) & AUTENTICAÇÃO
// ==========================================
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Erro ao decodificar JWT do Google:", e);
        return null;
    }
}

async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) return;
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const credential = firebase.auth.GoogleAuthProvider.credential(response.credential);
            const result = await firebase.auth().signInWithCredential(credential);
            const email = (result.user && result.user.email) ? result.user.email.toLowerCase().trim() : '';
            const nome = (result.user && result.user.displayName) ? result.user.displayName : '';
            processGoogleLogin(email, nome);
        } else {
            const payload = parseJwt(response.credential);
            if (!payload || !payload.email) {
                alert("Não foi possível validar as credenciais da conta do Google.");
                return;
            }
            const email = payload.email.toLowerCase().trim();
            processGoogleLogin(email, payload.name);
        }
    } catch (err) {
        console.error("Erro no Google Sign-In:", err);
        // Se der erro no Firebase Auth (ex: dominios nao autorizados ou offline), faz fallback seguro
        const payload = parseJwt(response.credential);
        if (payload && payload.email) {
            processGoogleLogin(payload.email.toLowerCase().trim(), payload.name);
        } else {
            alert("Erro ao autenticar com o Google. Tente novamente.");
        }
    }
}

function processGoogleLogin(email, nomeOpcional) {
    const res = sigeDB.loginWithEmail(email);

    if (res.code === 'INVALID_DOMAIN') {
        alert(`🔒 Acesso Não Permitido\n\n${res.message}\n\nPor favor, utilize sua conta Google Institucional (@edu.itajai.sc.gov.br ou @itajai.sc.gov.br).`);
        return;
    }

    if (res.code === 'FIRST_ACCESS_PENDING') {
        alert(`📝 Solicitação de Primeiro Acesso Registrada!\n\n${res.message}`);
        return;
    }

    if (res.code === 'PENDING_APPROVAL') {
        alert(`⏳ Acesso em Análise\n\n${res.message}`);
        return;
    }

    if (res.code === 'BLOCKED') {
        alert(`🚫 Acesso Bloqueado\n\n${res.message}`);
        return;
    }

    if (res.code === 'NEEDS_ONBOARDING') {
        const loginModal = document.getElementById("modalSigeLogin");
        if (loginModal) loginModal.style.display = "none";
        abrirModalOnboardingCadastro(res.user);
        return;
    }

    if (res.success && res.user) {
        showToast(`Google Auth: Bem-vindo(a), ${res.user.nome}!`);
        checkSigeAuth();
        renderAllModules();
    }
}

function loginWithGooglePrompt() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
            window.google.accounts.id.prompt((notification) => {
                if (notification && (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment())) {
                    console.log("GIS prompt not displayed:", notification.getNotDisplayedReason ? notification.getNotDisplayedReason() : notification);
                }
            });
        } catch (e) {
            console.log("GIS prompt error:", e);
        }
    }
}

function initGoogleAuth() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
            window.google.accounts.id.initialize({
                client_id: "873519405621-escola-integrarizzi.apps.googleusercontent.com",
                callback: handleGoogleCredentialResponse,
                auto_select: false
            });
            const container = document.getElementById("g_id_signin_container");
            if (container) {
                window.google.accounts.id.renderButton(container, {
                    theme: "outline",
                    size: "large",
                    width: 380,
                    text: "continue_with"
                });
            }
        } catch (err) {
            console.log("Inicialização do Google GIS:", err);
        }
    }
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
window.handleGoogleCredentialResponse = handleGoogleCredentialResponse;
window.loginWithGooglePrompt = loginWithGooglePrompt;
window.processGoogleLogin = processGoogleLogin;
window.abrirModalOnboardingCadastro = abrirModalOnboardingCadastro;
window.submitOnboardingCadastro = submitOnboardingCadastro;
window.cancelarOnboardingCadastro = cancelarOnboardingCadastro;
window.mascaraTelefoneInput = mascaraTelefoneInput;
window.renderAdminPendingUsers = renderAdminPendingUsers;
window.ajustarModulosDefaultPendente = ajustarModulosDefaultPendente;
window.execAprovarPendente = execAprovarPendente;
window.execRecusarPendente = execRecusarPendente;
window.scrollToPendingRequests = scrollToPendingRequests;
window.openGerenciarTagsModal = openGerenciarTagsModal;
window.closeGerenciarTagsModal = closeGerenciarTagsModal;
window.renderGerenciarTagsList = renderGerenciarTagsList;
window.adicionarNovaTagContato = adicionarNovaTagContato;
window.renomearTagContato = renomearTagContato;
window.excluirTagContato = excluirTagContato;

// Funções do Painel RBAC (Controle de Acessos & Módulos)
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
    const modulosLabels = {
        op: "Orientação Educacional (OE)",
        mural: "Mural & Prazos",
        supervisao: "Supervisão Pedagógica",
        admin: "Administração Integrada",
        direcao: "Direção Executiva",
        uniformes: "Controle de Uniformes"
    };

    if (!sigeDB.temPermissaoModulo(tabId)) {
        const moduloNome = modulosLabels[tabId] || tabId;
        showToast(`⚠️ Acesso Restrito: Seu perfil de usuário não possui permissão para acessar o módulo "${moduloNome}".`, "warning");
        const modulosOrdem = ['op', 'mural', 'supervisao', 'admin', 'direcao', 'uniformes'];
        const primeiroPermitido = modulosOrdem.find(m => sigeDB.temPermissaoModulo(m)) || 'op';
        tabId = primeiroPermitido;
    }

    const btn = document.querySelector(`.sige-tab-btn[data-tab="${tabId}"]`);
    const sections = document.querySelectorAll(".tab-content-section");

    sections.forEach(s => s.classList.remove("active"));
    const targetSection = document.getElementById(`tab-${tabId}`) || document.getElementById("tab-op");
    if (targetSection) targetSection.classList.add("active");
    if (btn) btn.classList.add("active");

    renderAllModules();

    if (tabId === 'direcao') {
        switchDirSubTab(currentDirSubTab || 'whatsapp');
    }
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
    try { renderModuleMuralECalendario(); } catch (e) { console.error("Erro em renderModuleMuralECalendario:", e); }
    try { renderModuleOrientacaoPedagogica(); } catch (e) { console.error("Erro em renderModuleOrientacaoPedagogica:", e); }
    try { renderModuleSupervisao(); } catch (e) { console.error("Erro em renderModuleSupervisao:", e); }
    try { renderModuleAdministracao(); } catch (e) { console.error("Erro em renderModuleAdministracao:", e); }
    try { renderModuleDirecao(); } catch (e) { console.error("Erro em renderModuleDirecao:", e); }
    try { renderModuleUniformes(); } catch (e) { console.error("Erro em renderModuleUniformes:", e); }
    try { updateBadgesCounts(); } catch (e) { console.error("Erro em updateBadgesCounts:", e); }
}

function updateBadgesCounts() {
    const role = sigeDB.getRole();
    const filterSelect = document.getElementById("opFilterOrientadora");
    const filterVal = filterSelect ? filterSelect.value : "todas";

    const countOp = sigeDB.getAgendamentosOP().filter(a => a.statusSecretaria === "pendente" && matchOrientadora(a, filterVal)).length;
    const countSup = sigeDB.getDemandasSupervisao().filter(d => d.status === "pendente").length;
    const countAdm = sigeDB.getDemandasAdmin().filter(d => d.status === "pendente").length;

    const countUni = (typeof sigeDB.getPedidosUniformes === "function") 
        ? sigeDB.getPedidosUniformes().filter(p => p.status === "pendente_envio" || p.status === "disponivel_estoque").length 
        : 0;

    const bOp = document.getElementById("badgeTabOP");
    const bSup = document.getElementById("badgeTabSup");
    const bAdm = document.getElementById("badgeTabAdm");
    const bUni = document.getElementById("badgeTabUniformes");

    if (bOp) bOp.innerText = countOp;
    if (bSup) bSup.innerText = countSup;
    if (bAdm) bAdm.innerText = countAdm;
    if (bUni) {
        bUni.innerText = countUni;
        bUni.style.display = countUni > 0 ? "inline-block" : "none";
    }
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

function matchOrientadora(a, filterVal) {
    if (!filterVal || filterVal === "todas") return true;
    if (!a) return false;
    
    if (!a.orientadora) {
        const t = (a.turma || "").toLowerCase();
        if (t.includes("1º") || t.includes("2º") || t.includes("3º") || t.includes("4º") || t.includes("5º") || t.includes("matutino")) {
            return filterVal.toLowerCase().includes("clarinda") || filterVal.toLowerCase().includes("carmen") || filterVal.includes("1");
        }
        if (t.includes("6º") || t.includes("7º") || t.includes("8º") || t.includes("9º") || t.includes("vespertino")) {
            return filterVal.toLowerCase().includes("daiane") || filterVal.toLowerCase().includes("luciana") || filterVal.includes("2");
        }
        return filterVal.toLowerCase().includes("clarinda");
    }
    
    const oriLower = a.orientadora.toLowerCase();
    const filterLower = filterVal.toLowerCase();
    
    if (filterLower.includes("clarinda")) {
        return oriLower.includes("clarinda") || oriLower.includes("carmen") || oriLower.includes("1");
    }
    if (filterLower.includes("daiane")) {
        return oriLower.includes("daiane") || oriLower.includes("luciana") || oriLower.includes("2");
    }
    return oriLower.includes(filterLower) || filterLower.includes(oriLower);
}
window.matchOrientadora = matchOrientadora;

function renderModuleOrientacaoPedagogica() {
    syncRoleFilters();
    const filterOrientadoraSelect = document.getElementById("opFilterOrientadora");
    const filterOrientadora = filterOrientadoraSelect ? filterOrientadoraSelect.value : "todas";

    const todosAtendimentos = sigeDB.getAgendamentosOP().filter(a => {
        return matchOrientadora(a, filterOrientadora);
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
            { label: "1ª Vaga", turno: "vespertino", tipo: "agendado", slotIndex: 0, orientadoraKey: "daiane", orientadoraNome: "Daiane Caetano Costa de Aquino", orientadoraTag: "Séries Finais", bgColor: "#ffffff" },

            { label: "2ª Vaga", turno: "vespertino", tipo: "agendado", slotIndex: 1, orientadoraKey: "clarinda", orientadoraNome: "Clarinda Rosa Pereira", orientadoraTag: "Séries Iniciais", bgColor: "#f1f5f9" },
            { label: "2ª Vaga", turno: "vespertino", tipo: "agendado", slotIndex: 1, orientadoraKey: "daiane", orientadoraNome: "Daiane Caetano Costa de Aquino", orientadoraTag: "Séries Finais", bgColor: "#f1f5f9" },

            { label: "3ª Vaga", turno: "vespertino", tipo: "agendado", slotIndex: 2, orientadoraKey: "clarinda", orientadoraNome: "Clarinda Rosa Pereira", orientadoraTag: "Séries Iniciais", bgColor: "#ffffff" },
            { label: "3ª Vaga", turno: "vespertino", tipo: "agendado", slotIndex: 2, orientadoraKey: "daiane", orientadoraNome: "Daiane Caetano Costa de Aquino", orientadoraTag: "Séries Finais", bgColor: "#ffffff" },

            { label: "🚨 Emergencial", turno: "vespertino", tipo: "emergencial", slotIndex: 0, isEmergencial: true, orientadoraKey: "clarinda", orientadoraNome: "Clarinda Rosa Pereira", orientadoraTag: "Séries Iniciais", bgColor: "#fef2f2" },
            { label: "🚨 Emergencial", turno: "vespertino", tipo: "emergencial", slotIndex: 0, isEmergencial: true, orientadoraKey: "daiane", orientadoraNome: "Daiane Caetano Costa de Aquino", orientadoraTag: "Séries Finais", bgColor: "#fef2f2" }
        ];

        let activeSlots = slotsConfig.filter(s => {
            if (filterOrientadora === "todas") return true;
            if (filterOrientadora.includes("Clarinda")) {
                return s.isHeader || s.orientadoraKey === "clarinda";
            }
            if (filterOrientadora.includes("Daiane")) {
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
        return filterOrientadora.toLowerCase().includes(o.nome.toLowerCase()) || o.nome.toLowerCase().includes(filterOrientadora.toLowerCase());
    });

    const colors = [
        { border: "#2563eb", bgIcon: "#eff6ff", textIcon: "#2563eb", title: "#1e3a8a" },
        { border: "#d97706", bgIcon: "#fff7ed", textIcon: "#d97706", title: "#9a3412" },
        { border: "#10b981", bgIcon: "#f0fdf4", textIcon: "#10b981", title: "#065f46" },
        { border: "#7c3aed", bgIcon: "#f5f3ff", textIcon: "#7c3aed", title: "#5b21b6" }
    ];

    container.innerHTML = orientadorasParaExibir.map((o, idx) => {
        const c = colors[idx % colors.length];
        const isThisOri = (a) => a.orientadora && (
            a.orientadora.toLowerCase().includes(o.nome.toLowerCase()) || 
            (o.nome.toLowerCase().includes("clarinda") && (a.orientadora.includes("1") || a.orientadora.includes("Carmen"))) || 
            (o.nome.toLowerCase().includes("daiane") && (a.orientadora.includes("2") || a.orientadora.includes("Luciana")))
        );

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

function getSecretariaBadgeText(status) {
    const map = {
        pendente: "⏳ Pendente",
        aguardando: "🔔 Chegou / Aguardando",
        confirmado: "🟢 Presença Confirmada (WhatsApp)",
        confirmado_whatsapp: "🟢 Presença Confirmada (WhatsApp)",
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
        projetos = projetos.filter(p => {
            if (!p.orientadoraLider || p.orientadoraLider.toLowerCase().includes("equipe")) return true;
            if (filterOrientadora.includes("Clarinda")) {
                return p.orientadoraLider.includes("Clarinda") || p.orientadoraLider.includes("1") || p.orientadoraLider.includes("Carmen");
            }
            if (filterOrientadora.includes("Daiane")) {
                return p.orientadoraLider.includes("Daiane") || p.orientadoraLider.includes("2") || p.orientadoraLider.includes("Luciana");
            }
            return p.orientadoraLider.includes(filterOrientadora);
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
        const orientadoraLider = elOri ? elOri.value : "Clarinda Rosa Pereira";
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

    // Visibilidade dos botões conforme o perfil (Orientadoras, Secretaria, Gestores, Admin e Dev)
    const role = sigeDB.getRole();
    const canChangeStatus = role.startsWith("orientadora_") || ["orientacao", "secretaria", "admin", "direcao", "desenvolvedor", "supervisao"].includes(role) || role.startsWith("supervisora_");

    const btnConfirmadoWa = document.getElementById("btnAcaoConfirmadoWa");
    const btnAguardando = document.getElementById("btnAcaoAguardando");
    const btnAtendido = document.getElementById("btnAcaoAtendido");
    const btnNaoVeio = document.getElementById("btnAcaoNaoVeio");

    if (btnConfirmadoWa) btnConfirmadoWa.style.display = canChangeStatus ? "inline-flex" : "none";
    if (btnAguardando) btnAguardando.style.display = canChangeStatus ? "inline-flex" : "none";
    if (btnAtendido) btnAtendido.style.display = canChangeStatus ? "inline-flex" : "none";
    if (btnNaoVeio) btnNaoVeio.style.display = canChangeStatus ? "inline-flex" : "none";

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

    let count = 0;
    for (const chk of Array.from(checkboxes)) {
        const agId = chk.getAttribute("data-id");
        const ag = todosAtendimentos.find(a => a.id === agId);
        if (ag) {
            const selectPhone = document.getElementById(`selectPhone_${agId}`);
            const phoneNum = selectPhone ? selectPhone.value : (ag.telefone || "");
            const dataFmt = formatDateBR(ag.data);
            let linkConfirm = `https://elcortelini.github.io/escola/confirmar-presenca.html?id=${ag.id}`;
            if (typeof sigeDB !== 'undefined' && sigeDB.criarTokenConfirmacao) {
                try {
                    const token = await sigeDB.criarTokenConfirmacao(ag.id);
                    if (token) {
                        linkConfirm = `https://elcortelini.github.io/escola/confirmar-presenca.html?token=${token}`;
                    }
                } catch (e) {}
            }
            const textAuto = `🤖 [Lembrete Automático HOJE] Olá ${ag.responsavel || 'Família'}! Lembramos do atendimento do estudante ${ag.aluno} (${ag.turma || ''}) agendado para HOJE, ${dataFmt} às ${ag.horario} com a Orientação Educacional (CE Pedro Rizzi).\n\n👇 *Por favor, confirme sua presença clicando no link abaixo:*\n${linkConfirm}`;
            
            sigeDB.logWhatsappDispatch(ag.id, {
                tipo: "🤖 Lembrete Automático do Dia",
                mensagem: textAuto,
                modo: "em_lote_confirmado",
                status: "sucesso",
                destinatario: phoneNum
            });
            count++;
        }
    }

    closeDispararLembretesHojeModal();
    showToast(`🤖 ${count} lembrete(s) automático(s) auditado(s) e registrados com sucesso!`, "success");
    
    setTimeout(() => {
        renderModuleOrientacaoPedagogica();
    }, 50);
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
    if (!targetId) return;

    if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
    }

    const ags = sigeDB.getAgendamentosOP() || [];
    const item = ags.find(a => a.id === targetId);
    const nomeAluno = item ? item.aluno : 'este agendamento';

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
        dateAppointments = dateAppointments.filter(a => matchOrientadora(a, filterVal));
        if (filterVal.includes("Clarinda")) {
            subTitleText = "Orientação Educacional (OE) — Relatório Diário (Clarinda - Séries Iniciais)";
            signaturesHtml = `
                <div class="sig-box" style="margin:0 auto; max-width:350px;">
                    Clarinda Rosa Pereira<br>Orientadora Educacional — Séries Iniciais
                </div>
            `;
        } else if (filterVal.includes("Daiane")) {
            subTitleText = "Orientação Educacional (OE) — Relatório Diário (Daiane - Séries Finais)";
            signaturesHtml = `
                <div class="sig-box" style="margin:0 auto; max-width:350px;">
                    Daiane Caetano Costa de Aquino<br>Orientadora Educacional — Séries Finais
                </div>
            `;
        } else {
            subTitleText = `Orientação Educacional (OE) — Relatório Diário (${filterVal})`;
            signaturesHtml = `
                <div class="sig-box" style="margin:0 auto; max-width:350px;">
                    ${filterVal}<br>Orientadora Educacional
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

function getSecretariaBadgeText(status) {
    const labels = {
        agendado: "Agendado",
        aguardando: "Aguardando na Recepção",
        confirmado: "Presença Confirmada (WhatsApp)",
        confirmado_whatsapp: "Presença Confirmada (WhatsApp)",
        atendido: "Atendido",
        realizado: "Atendido",
        nao_veio: "Não Veio",
        faltou: "Não Veio",
        cancelado: "Cancelado"
    };
    return labels[status] || status;
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
    const item = ags.find(a => a.id === targetId);
    if (!item) return;

    currentEditingAppointmentId = targetId;

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
        aluno: elAluno ? (typeof cleanStudentName === 'function' ? cleanStudentName(elAluno.value) : elAluno.value.trim()) : ags[itemIndex].aluno,
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

    if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
    }
    sigeDB.saveAgendamentosOP(ags);
    closeEditarModal();
    closeDetalhesModal();
    showToast("✅ Dados do agendamento editados e salvos!");
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

    const isClarinda = (a) => !a.orientadora || a.orientadora.includes("Clarinda") || a.orientadora.includes("1") || a.orientadora.includes("Carmen") || a.orientadora.toLowerCase().includes("iniciais");
    const isDaiane = (a) => a.orientadora && (a.orientadora.includes("Daiane") || a.orientadora.includes("2") || a.orientadora.includes("Luciana") || a.orientadora.toLowerCase().includes("finais"));

    if (oriFiltro && oriFiltro !== "todas") {
        const lowerFiltro = oriFiltro.toLowerCase();
        if (lowerFiltro.includes("clarinda") || lowerFiltro.includes("iniciais")) {
            ags = ags.filter(isClarinda);
        } else if (lowerFiltro.includes("daiane") || lowerFiltro.includes("finais")) {
            ags = ags.filter(isDaiane);
        } else {
            ags = ags.filter(a => (a.orientadora || "").toLowerCase().includes(lowerFiltro));
        }
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

    renderAdminPermissoesUsuarios();
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
        orientadora: "Clarinda Rosa Pereira",
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

    // Evento de Chegada na Recepção: Notifica APENAS a Orientadora (o pai já está fisicamente na escola)
    if (tipoEvento === "aluno_chegou") {
        const msgToOrientadora = `🔔 AVISO DE RECEPÇÃO OP: O responsável pelo aluno(a) ${agendamento.aluno} (${agendamento.turma}) acabou de chegar na recepção e aguarda atendimento (${agendamento.horario}).`;
        let oriSuccess = false;

        if (config.provider !== "simulated" && config.apiUrl && orientadoraCleanPhone) {
            try {
                const resp = await fetch(config.apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": config.apiToken ? `Bearer ${config.apiToken}` : ""
                    },
                    body: JSON.stringify({
                        phone: orientadoraCleanPhone,
                        message: msgToOrientadora
                    })
                });
                oriSuccess = resp.ok;
            } catch (e) {
                console.warn("Falha no envio do gateway de WhatsApp à Orientadora:", e);
                oriSuccess = false;
            }
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
    if (subTabId === 'relatorios') {
        // Redireciona diretamente para a visão de Relatórios dentro da sub-aba Orientação
        currentDirSubTab = 'atendimentos';
        subTabId = 'atendimentos';
        setDirAtendViewMode('relatorios');
    } else if (subTabId === 'atendimentos') {
        currentDirSubTab = 'atendimentos';
        if (dirAtendViewMode !== 'relatorios') {
            setDirAtendViewMode('lista');
        }
    } else {
        currentDirSubTab = subTabId;
    }

    const btns = document.querySelectorAll(".dir-subtab-btn");
    const contents = document.querySelectorAll(".dir-subtab-content");

    btns.forEach(b => {
        if (b.dataset.dirsub === subTabId || (subTabId === 'atendimentos' && dirAtendViewMode === 'relatorios' && b.dataset.dirsub === 'relatorios')) {
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

    if (subTabId === 'atendimentos') {
        setDirAtendViewMode(dirAtendViewMode || 'lista');
    }
    else if (subTabId === 'whatsapp') renderDirWhatsApp();
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
            if (!sel || sel.children.length > 1) return;
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
    const realizedOp = allOp.filter(a => a.statusSecretaria === "realizado").length;
    const faltasOp = allOp.filter(a => a.statusSecretaria === "falta").length;
    const pendentesOp = allOp.filter(a => a.statusSecretaria !== "realizado" && a.statusSecretaria !== "falta").length;
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
            if (status === 'realizado' && a.statusSecretaria !== 'realizado') return false;
            if (status === 'falta' && a.statusSecretaria !== 'falta') return false;
            if (status === 'aguardando' && (a.statusSecretaria === 'realizado' || a.statusSecretaria === 'falta')) return false;
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
        if (a.statusSecretaria === 'realizado') {
            statusBadge = `<span style="background:#dcfce7; color:#166534; padding:3px 8px; border-radius:12px; font-weight:800; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-check"></i> Compareceu</span>`;
        } else if (a.statusSecretaria === 'falta') {
            statusBadge = `<span style="background:#fee2e2; color:#991b1b; padding:3px 8px; border-radius:12px; font-weight:800; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-xmark"></i> Falta</span>`;
        } else {
            statusBadge = `<span style="background:#fef3c7; color:#92400e; padding:3px 8px; border-radius:12px; font-weight:800; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-clock"></i> Aguardando</span>`;
        }

        const safeAluno = (a.aluno || 'Estudante').replace(/'/g, "\\'");
        const safeFone = (a.telefone || '').replace(/\D/g, '');

        return `
            <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding:12px 16px; font-weight:600; color:#1e293b;">
                    <div>${dataFmt}</div>
                    <div style="font-size:0.75rem; color:#64748b;">${a.horario || ''} (${a.turno || ''})</div>
                </td>
                <td style="padding:12px 16px;">
                    <strong style="color:#0f172a; cursor:pointer;" onclick="selecionarAlunoParaDossie('${safeAluno}')" title="Clique para abrir o Dossiê do Aluno">${a.aluno}</strong>
                    ${a.responsavel ? `<div style="font-size:0.75rem; color:#64748b;">Resp: ${a.responsavel}</div>` : ''}
                </td>
                <td style="padding:12px 16px;">
                    <span style="background:#f1f5f9; color:#334155; padding:3px 8px; border-radius:6px; font-size:0.78rem; font-weight:700;">${a.turma || '-'}</span>
                </td>
                <td style="padding:12px 16px; font-size:0.82rem; color:#475569;">
                    ${a.orientadora || 'Orientação'}
                </td>
                <td style="padding:12px 16px; font-size:0.82rem; color:#334155; max-width:200px;">
                    <div style="font-weight:700; color:#0f172a;">${a.motivo || 'Atendimento Geral'}</div>
                    ${a.observacoes ? `<div style="font-size:0.75rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${a.observacoes}</div>` : ''}
                </td>
                <td style="padding:12px 16px;">
                    ${statusBadge}
                </td>
                <td style="padding:12px 16px; text-align:center;">
                    <div style="display:inline-flex; gap:6px;">
                        <button type="button" onclick="selecionarAlunoParaDossie('${safeAluno}')" class="btn" style="background:#eff6ff; color:#1d4ed8; padding:5px 10px; font-size:0.75rem; font-weight:700; border-radius:6px; border:1px solid #bfdbfe;" title="Ver Dossiê 360º do Estudante">
                            <i class="fa-solid fa-id-card"></i> Dossiê
                        </button>
                        ${safeFone ? `
                            <button type="button" onclick="prepararDisparoWhatsAppFamiliar('${safeAluno}', '${safeFone}')" class="btn" style="background:#f0fdf4; color:#166534; padding:5px 10px; font-size:0.75rem; font-weight:700; border-radius:6px; border:1px solid #bbf7d0;" title="Enviar WhatsApp Oficial">
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
    dirAlunoDossieAtual = nomeAluno;
    switchDirSubTab('dossie');
    renderDirDossieAluno(nomeAluno);
}

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
    const comparecidos = atendimentosAluno.filter(a => a.statusSecretaria === 'realizado').length;
    const faltas = atendimentosAluno.filter(a => a.statusSecretaria === 'falta').length;
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
                            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid ${a.statusSecretaria === 'realizado' ? '#10b981' : (a.statusSecretaria === 'falta' ? '#ef4444' : '#f59e0b')}; border-radius:10px; padding:1rem;">
                                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px;">
                                    <div style="font-weight:800; color:#0f172a; font-size:0.95rem;">
                                        ${formatDateBR(a.data)} às ${a.horario || 'Horário agendado'} — ${a.orientadora || 'Orientadora'}
                                    </div>
                                    <span style="font-size:0.75rem; font-weight:800; padding:3px 8px; border-radius:10px; background:${a.statusSecretaria === 'realizado' ? '#dcfce7' : (a.statusSecretaria === 'falta' ? '#fee2e2' : '#fef3c7')}; color:${a.statusSecretaria === 'realizado' ? '#166534' : (a.statusSecretaria === 'falta' ? '#991b1b' : '#92400e')};">
                                        ${a.statusSecretaria === 'realizado' ? '✅ Compareceu' : (a.statusSecretaria === 'falta' ? '❌ Falta Registrada' : '⏳ Aguardando')}
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
                            <td style="padding:6px;">${a.statusSecretaria === 'realizado' ? 'Presente' : (a.statusSecretaria === 'falta' ? 'Ausente' : 'Aguardando')}</td>
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

        return `
            <div class="contact-row-card ${isChecked ? 'selected' : ''}">
                <div style="display:flex; align-items:center; justify-content:center;">
                    <input type="checkbox" onchange="toggleSelectContatoWp('${c.id}', this.checked)" ${isChecked ? 'checked' : ''} class="contact-checkbox-custom" aria-label="Selecionar ${escapeHtml(c.nome)}">
                </div>
                <div style="font-weight:700; font-size:0.875rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(c.nome)}">
                    ${escapeHtml(c.nome)}
                </div>
                <div style="font-weight:700; font-size:0.85rem; color:#334155; white-space:nowrap; letter-spacing:0.3px; font-variant-numeric:tabular-nums;">
                    ${escapeHtml(c.telefone)}
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:4px; align-items:center; overflow:hidden;" title="${escapeHtml(tooltipInfo)}">
                    ${tagsHtml}
                </div>
                <div style="display:flex; justify-content:center;">
                    <button type="button" onclick="openEditarContatoWhatsAppModal('${c.id}')" class="dir-btn-icon edit" title="Editar dados de ${escapeHtml(c.nome)}">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                </div>
                <div style="display:flex; justify-content:center;">
                    <button type="button" onclick="excluirContatoWhatsApp('${c.id}')" class="dir-btn-icon danger" title="Excluir contato ${escapeHtml(c.nome)}">
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

// Disparo: Alterna entre Envio Individual e Fila Guiada
function executarAcaoDisparoWhatsApp() {
    const msg = document.getElementById("dirWpInputMensagem")?.value.trim();
    if (!msg) {
        showToast("Escreva o texto da mensagem antes de enviar.", "warning");
        return;
    }

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
    const comparecidos = filtrados.filter(a => a.statusSecretaria === 'realizado').length;
    const faltas = filtrados.filter(a => a.statusSecretaria === 'falta').length;
    const aguardando = filtrados.filter(a => a.statusSecretaria !== 'realizado' && a.statusSecretaria !== 'falta').length;
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
                                <span style="font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:10px; background:${a.statusSecretaria === 'realizado' ? '#dcfce7' : (a.statusSecretaria === 'falta' ? '#fee2e2' : '#fef3c7')}; color:${a.statusSecretaria === 'realizado' ? '#166534' : (a.statusSecretaria === 'falta' ? '#991b1b' : '#92400e')};">
                                    ${a.statusSecretaria === 'realizado' ? 'Presente' : (a.statusSecretaria === 'falta' ? 'Falta' : 'Pendente')}
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
                        <td style="padding:6px;">${a.statusSecretaria === 'realizado' ? 'Compareceu' : (a.statusSecretaria === 'falta' ? 'Falta' : 'Aguardando')}</td>
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

// ==========================================
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

// ==========================================
// MÓDULO DE ADMINISTRAÇÃO AVANÇADA DO SISTEMA
// ==========================================

let currentSetorFilter = "todos";
let equipeBuscaTexto = "";

function filtrarEquipeEscolar(setor) {
    currentSetorFilter = setor || "todos";
    
    const setores = ["todos", "docentes", "orientacao", "supervisao", "direcao", "secretaria", "apoio"];
    setores.forEach(s => {
        const btn = document.getElementById(`btnFilterSetor_${s}`);
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
    const isDev = logged && (logged.role === 'desenvolvedor' || logged.email.toLowerCase().trim() === 'elcortelini@gmail.com');
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

        return `
            <tr style="border-bottom: 1px solid #fed7aa;">
                <td style="padding:10px 12px;">
                    <strong style="color:#0f172a; display:block; font-size:0.9rem;">${escapeHtml(u.nome)}</strong>
                    <span style="color:#64748b; font-size:0.78rem;"><i class="fa-regular fa-envelope"></i> ${escapeHtml(u.email)}</span>
                    ${u.telefone ? `<span style="color:#0284c7; font-size:0.75rem; display:block;"><i class="fa-brands fa-whatsapp"></i> ${escapeHtml(u.telefone)}</span>` : ''}
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
                        <button type="button" onclick="execAprovarPendente('${escapeHtml(u.email)}', ${idx})" class="btn" style="background:#16a34a; color:white; border:none; padding:6px 12px; border-radius:8px; font-size:0.78rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 6px rgba(22,163,74,0.3);">
                            <i class="fa-solid fa-check"></i> Aprovar
                        </button>
                        <button type="button" onclick="execRecusarPendente('${escapeHtml(u.email)}')" class="btn" style="background:#fee2e2; color:#ef4444; border:1px solid #fecaca; padding:6px 8px; border-radius:8px; font-size:0.78rem; cursor:pointer;" title="Recusar solicitação">
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

function execAprovarPendente(email, idx) {
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

    const user = sigeDB.aprovarUsuarioPendente(email, role, perms);
    if (user) {
        showToast(`✅ Acesso de ${user.nome} autorizado com sucesso!`);
        renderAdminPendingUsers();
        renderEquipeEscolarTable();
        renderAdminPermissoesUsuarios();
    }
}

function execRecusarPendente(email) {
    if (!confirm(`Deseja realmente recusar e remover a solicitação de acesso para ${email}?`)) return;
    if (sigeDB.recusarUsuarioPendente(email)) {
        showToast(`Solicitação de ${email} removida.`);
        renderAdminPendingUsers();
        renderEquipeEscolarTable();
        renderAdminPermissoesUsuarios();
    }
}

function scrollToPendingRequests() {
    if (typeof switchSigeTab === 'function') {
        switchSigeTab('admin');
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
    if (!tbody) return;

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

    if (kpiTotal) kpiTotal.innerText = equipe.length;
    if (kpiAcesso) kpiAcesso.innerText = countAcesso;
    if (kpiDocentes) kpiDocentes.innerText = countDocentes;
    if (kpiGestao) kpiGestao.innerText = countGestao;

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
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding:2.5rem 1rem; text-align:center; color:#64748b;">
                    <i class="fa-solid fa-user-slash" style="font-size:2rem; margin-bottom:10px; display:block; color:#cbd5e1;"></i>
                    <strong style="display:block; font-size:1rem; color:#1e293b;">Nenhum colaborador encontrado</strong>
                    <span style="font-size:0.83rem; color:#64748b;">Verifique os critérios do filtro ou clique no botão "+ Cadastrar Colaborador & Acesso".</span>
                </td>
            </tr>
        `;
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

    tbody.innerHTML = lista.map(p => {
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
            const titleTooltip = isMasterDev 
                ? `${m.fullLabel}: Acesso Master Obrigatório` 
                : `${m.fullLabel}: Clique para ${isActive ? 'Revogar' : 'Liberar'} acesso`;

            if (isMasterDev) {
                return `
                    <span class="rbac-mod-chip active ${m.colorClass} disabled" title="${escapeHtml(titleTooltip)}">
                        <i class="fa-solid ${m.icon}"></i>
                        <span>${m.label}</span>
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
                    <span>${m.label}</span>
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

    sigeDB.salvarPermissoesUsuario(prof.id, prof.permissoes);
    if (prof.email) {
        sigeDB.salvarPermissoesUsuario(prof.email, prof.permissoes);
    }

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
        let html = `<option value="todas">👥 Todas as Orientadoras (Geral)</option>`;
        orientadoras.forEach(o => {
            html += `<option value="${escapeHtml(o.nome)}">💛 ${escapeHtml(o.nome)} (${escapeHtml(o.telefone || 'Sem WhatsApp')})</option>`;
        });
        selectOpFilter.innerHTML = html;
        if (curVal) selectOpFilter.value = curVal;
        syncRoleFilters();
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

function setAllProfissionalModulos(checked = true) {
    const keys = ["op", "mural", "supervisao", "admin", "direcao", "uniformes", "ext_recursos", "ext_dashboard", "ext_contabil", "ext_biblioteca", "ext_patrimonio"];
    keys.forEach(k => {
        const chk = document.getElementById(`proChk_${k}`);
        if (chk) chk.checked = !!checked;
    });
}

function autoSuggestModulosPorSetor(setor) {
    const defaults = sigeDB.getDefaultPermissoesByRole(setor);
    const keys = ["op", "mural", "supervisao", "admin", "direcao", "uniformes", "ext_recursos", "ext_dashboard", "ext_contabil", "ext_biblioteca", "ext_patrimonio"];
    keys.forEach(k => {
        const chk = document.getElementById(`proChk_${k}`);
        if (chk) chk.checked = !!defaults[k];
    });
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

    const allKeys = ["op", "mural", "supervisao", "admin", "direcao", "uniformes", "ext_recursos", "ext_dashboard", "ext_contabil", "ext_biblioteca", "ext_patrimonio"];

    if (!modal) return;

    if (id && typeof id === "string") {
        const equipe = sigeDB.getEquipeEscolar();
        const prof = equipe.find(p => p.id === id);
        if (prof) {
            if (title) title.innerHTML = `<i class="fa-solid fa-user-pen" style="color:#1e3a8a;"></i> Editar Cadastro & Permissões do Colaborador`;
            if (inputId) inputId.value = prof.id;
            if (inputNome) inputNome.value = prof.nome || "";
            if (inputSetor) inputSetor.value = prof.setor || "docentes";
            if (inputCargo) inputCargo.value = prof.cargoFuncao || "";
            if (inputDisc) inputDisc.value = prof.disciplina || "";
            if (inputTel) inputTel.value = prof.telefone || "";
            if (inputEmail) inputEmail.value = prof.email || "";
            if (inputTurno) inputTurno.value = prof.turnos || "matutino";
            if (inputTurmas) inputTurmas.value = prof.turmasOuSalas || "";

            const perms = prof.permissoes || sigeDB.getDefaultPermissoesByRole(prof.setor);
            allKeys.forEach(k => {
                const chk = document.getElementById(`proChk_${k}`);
                if (chk) chk.checked = !!perms[k];
            });
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

    if (!nome || !setor) {
        showToast("⚠️ Preencha pelo menos o Nome e Setor do colaborador!");
        return false;
    }

    const permissoes = {
        op: !!document.getElementById("proChk_op")?.checked,
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
            permissoes
        });

        closeCadastroProfissionalModal();
        updateAllDynamicSelects();
        renderEquipeEscolarTable(currentSetorFilter, equipeBuscaTexto);
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
        renderEquipeEscolarTable(currentSetorFilter, equipeBuscaTexto);
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


// ==========================================
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

function renderModuleUniformes() {
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

    // Leitura dos Filtros
    const searchVal = (document.getElementById("filterUniSearch")?.value || "").toLowerCase().trim();
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



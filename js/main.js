document.addEventListener('DOMContentLoaded', () => {
    loadSystems();
});

const defaultSystems = [
    {
        id: "orientacao",
        title: "Orientação Educacional (OE)",
        iconClass: "fa-solid fa-heart-pulse",
        bgClass: "icon-rose",
        tag: "AGENDA & PRONTUÁRIOS",
        description: "Controle estrito de agendamentos por orientadora (4 por turno), prontuário único do aluno, declarações e acompanhamento de famílias.",
        url: "sistema-gestao.html?aba=op",
        status: "online",
        badge: "MÓDULO PRINCIPAL / ATIVO",
        isLive: true
    },
    {
        id: "desenvolvedor",
        title: "Desenvolvedor do Sistema",
        iconClass: "fa-solid fa-user-gear",
        bgClass: "icon-purple",
        tag: "CONTROLE TOTAL & GESTÃO DE ACESSOS",
        description: "Painel exclusivo do desenvolvedor para cadastro de e-mails autorizados, controle de permissões (RBAC) e alternador de perfil de testes.",
        url: "sistema-gestao.html?aba=admin&action=dev",
        status: "online",
        badge: "PAINEL DEV / ATIVO",
        isLive: true
    },
    {
        id: "direcao",
        title: "Direção & Supervisão",
        iconClass: "fa-solid fa-crown",
        bgClass: "icon-amber",
        tag: "GESTÃO INSTITUCIONAL",
        description: "Acompanhamento pedagógico das turmas, demandas institucionais e relatórios gerenciais.",
        url: "sistema-gestao.html?aba=direcao",
        status: "online",
        badge: "MÓDULO ATIVO",
        isLive: true
    },
    {
        id: "dashboard",
        title: "Dashboard de Avaliação",
        iconClass: "fa-solid fa-chart-line",
        bgClass: "icon-blue",
        tag: "PESQUISA & DIAGNÓSTICO",
        description: "Análise gráfica e estatística em tempo real da pesquisa de avaliação dos estudantes (6º ao 8º Ano).",
        url: "dashboard.html",
        status: "online",
        badge: "TEMPO REAL",
        isLive: true
    },
    {
        id: "contabil",
        title: "Sistema Contábil (APMF)",
        iconClass: "fa-solid fa-calculator",
        bgClass: "icon-blue",
        tag: "GESTÃO FINANCEIRA",
        description: "Controle de receitas, despesas, fluxo de caixa e prestação de contas da APMF da escola.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    },
    {
        id: "recursos",
        title: "Agendamento de Recursos",
        iconClass: "fa-solid fa-calendar-check",
        bgClass: "icon-amber",
        tag: "RECURSOS & ESPAÇOS",
        description: "Reserva de laboratórios de informática, projetores, quadra de esportes e auditório.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    },
    {
        id: "biblioteca",
        title: "Sistema da Biblioteca",
        iconClass: "fa-solid fa-book-bookmark",
        bgClass: "icon-purple",
        tag: "ACERVO DIGITAL",
        description: "Gestão do acervo escolar, controle de empréstimos, devoluções e pesquisas acadêmicas.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    },
    {
        id: "patrimonio",
        title: "Sistema de Patrimônio",
        iconClass: "fa-solid fa-boxes-stacked",
        bgClass: "icon-rose",
        tag: "CONTROLE PATRIMONIAL",
        description: "Inventário de bens, móveis, equipamentos tecnológicos, tombamento e gestão de ativos.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    }
];

function getCustomSystems() {
    try {
        return JSON.parse(localStorage.getItem('pedro_rizzi_custom_systems') || '[]');
    } catch (e) {
        return [];
    }
}

function loadSystems() {
    const grid = document.getElementById('systemsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const savedUrls = JSON.parse(localStorage.getItem('pedro_rizzi_urls') || '{}');
    const customSystems = getCustomSystems();

    const allSystems = [...defaultSystems, ...customSystems];

    allSystems.forEach(sys => {
        const finalUrl = sys.isCustom ? sys.url : (savedUrls[sys.id] || sys.url);
        const isConfigured = finalUrl && finalUrl !== '#';

        const card = document.createElement('div');
        card.className = `system-card ${sys.isLive ? 'featured' : (sys.isCustom ? 'custom-system-card' : '')}`;
        
        card.innerHTML = `
            <div>
                <div class="card-top">
                    <div class="card-icon-wrapper ${sys.bgClass || 'icon-emerald'}">
                        <i class="${sys.iconClass || 'fa-solid fa-globe'}"></i>
                    </div>
                    ${sys.isCustom ? `
                        <span class="badge-tag-card b-live" style="background:#f3e8ff; color:#6b21a8; border-color:#d8b4fe;">
                            <span class="b-live-dot" style="background:#9333ea;"></span>CUSTOMIZADO
                        </span>
                    ` : (sys.isLive ? 
                        `<span class="badge-tag-card b-live"><span class="b-live-dot"></span>${sys.badge}</span>` : 
                        (isConfigured ? `<span class="badge-tag-card b-live"><span class="b-live-dot"></span>ATIVO</span>` : `<span class="badge-tag-card b-config">${sys.badge}</span>`)
                    )}
                </div>
                <div style="font-size: 0.75rem; font-weight:700; color: var(--text-muted); margin-bottom: 4px; letter-spacing: 0.5px;">${sys.tag}</div>
                <h4 class="card-title">${sys.title}</h4>
                <p class="card-desc">${sys.description}</p>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
                <a href="${finalUrl}" ${isConfigured && !sys.isLive ? 'target="_blank"' : ''} class="btn ${sys.isLive ? 'btn-live' : (isConfigured ? 'btn-primary' : 'btn-secondary')}">
                    ${sys.isLive ? 'Acessar Módulo <i class="fa-solid fa-arrow-right"></i>' : (isConfigured ? 'Acessar Sistema <i class="fa-solid fa-arrow-up-right-from-square"></i>' : 'Em Breve (Configurar Link)')}
                </a>
                ${sys.isCustom ? `
                    <button onclick="deleteCustomSystem('${sys.id}')" style="background:none; border:none; color:#ef4444; font-size:0.75rem; font-weight:700; cursor:pointer; text-align:center; padding:4px;"><i class="fa-solid fa-trash"></i> Remover Sistema</button>
                ` : ''}
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function openConfigModal() {
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

function openAddCustomSystemModal() {
    const modal = document.getElementById('modalAddCustomSystem');
    if (modal) modal.style.display = 'flex';
}

function closeAddCustomSystemModal() {
    const modal = document.getElementById('modalAddCustomSystem');
    if (modal) modal.style.display = 'none';
}

function submitAddCustomSystem(e) {
    if (e && e.preventDefault) e.preventDefault();

    const title = document.getElementById('customSysTitle')?.value.trim();
    const tag = document.getElementById('customSysTag')?.value.trim().toUpperCase();
    const iconClass = document.getElementById('customSysIcon')?.value;
    const url = document.getElementById('customSysUrl')?.value.trim();
    const description = document.getElementById('customSysDesc')?.value.trim();

    if (!title || !tag || !url || !description) return;

    const customSystems = getCustomSystems();
    const newSys = {
        id: "custom-" + Date.now(),
        title,
        iconClass,
        bgClass: "icon-emerald",
        tag,
        description,
        url,
        status: "online",
        badge: "CUSTOMIZADO",
        isLive: false,
        isCustom: true
    };

    customSystems.push(newSys);
    localStorage.setItem('pedro_rizzi_custom_systems', JSON.stringify(customSystems));

    closeAddCustomSystemModal();
    loadSystems();
    alert(`Sistema "${title}" cadastrado com sucesso!`);

    // Reset inputs
    if (document.getElementById('customSysTitle')) document.getElementById('customSysTitle').value = "";
    if (document.getElementById('customSysTag')) document.getElementById('customSysTag').value = "";
    if (document.getElementById('customSysUrl')) document.getElementById('customSysUrl').value = "";
    if (document.getElementById('customSysDesc')) document.getElementById('customSysDesc').value = "";
}

function deleteCustomSystem(id) {
    if (confirm("Deseja realmente remover este sistema cadastrado?")) {
        let customSystems = getCustomSystems();
        customSystems = customSystems.filter(s => s.id !== id);
        localStorage.setItem('pedro_rizzi_custom_systems', JSON.stringify(customSystems));
        loadSystems();
    }
}

function openAgendamentoLabDirect(e) {
    if (e && e.preventDefault) e.preventDefault();
    const savedUrls = JSON.parse(localStorage.getItem('pedro_rizzi_urls') || '{}');
    const labUrl = savedUrls['recursos'];
    
    if (labUrl && labUrl !== '#') {
        window.open(labUrl, '_blank');
    } else {
        openConfigModal();
        alert("O link do Agendamento do Laboratório / Recursos ainda não foi configurado. Insira a URL oficial no campo 'Agendamento de Recursos' no painel que abriu na tela.");
    }
}

window.openConfigModal = openConfigModal;
window.closeConfigModal = closeConfigModal;
window.openAddCustomSystemModal = openAddCustomSystemModal;
window.closeAddCustomSystemModal = closeAddCustomSystemModal;
window.submitAddCustomSystem = submitAddCustomSystem;
window.deleteCustomSystem = deleteCustomSystem;
window.openAgendamentoLabDirect = openAgendamentoLabDirect;

const configForm = document.getElementById('configForm');
if (configForm) {
    configForm.addEventListener('submit', (e) => {
        e.preventDefault();
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
        loadSystems();
        alert('Configurações e links atualizados com sucesso!');
    });
}

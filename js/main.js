document.addEventListener('DOMContentLoaded', () => {
    loadSystems();
});

const defaultSystems = [
    {
        id: "desenvolvedor",
        title: "Desenvolvedor do Sistema",
        iconClass: "fa-solid fa-laptop-code",
        bgClass: "theme-purple",
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
        bgClass: "theme-amber",
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
        bgClass: "theme-emerald",
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
        bgClass: "theme-blue",
        tag: "GESTÃO FINANCEIRA",
        description: "Controle de receitas, despesas, fluxo de caixa e prestação de contas da APMF da escola.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    },
    {
        id: "biblioteca",
        title: "Sistema da Biblioteca",
        iconClass: "fa-solid fa-book-bookmark",
        bgClass: "theme-rose",
        tag: "ACERVO DIGITAL",
        description: "Gestão do acervo escolar, controle de empréstimos, devoluções e pesquisas acadêmicas.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    },
    {
        id: "uniformes",
        title: "Controle de Uniformes",
        iconClass: "fa-solid fa-shirt",
        bgClass: "theme-cyan",
        tag: "LOGÍSTICA & ENTREGAS",
        description: "Gestão de pedidos de uniformes, remessas para a SME, estoque local e emissão de listas de entrega por turma com assinatura.",
        url: "sistema-gestao.html?aba=uniformes",
        status: "online",
        badge: "NOVO MÓDULO",
        isLive: true
    },
    {
        id: "patrimonio",
        title: "Sistema de Patrimônio",
        iconClass: "fa-solid fa-boxes-stacked",
        bgClass: "theme-orange",
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
        let finalUrl = sys.isCustom ? sys.url : (savedUrls[sys.id] || sys.url);
        
        // Se for recursos e tiver valor legado interno antigo, substituir pelo link oficial externo
        if (sys.id === 'recursos' && (finalUrl === 'sistema-gestao.html?aba=op' || !finalUrl || finalUrl === '#')) {
            finalUrl = "https://elcortelini.github.io/agendamento-cepr/";
        }
        if (sys.id === 'direcao') {
            finalUrl = "sistema-gestao.html?aba=direcao";
        }

        const isConfigured = finalUrl && finalUrl !== '#';
        const isExternal = finalUrl && (finalUrl.startsWith("http://") || finalUrl.startsWith("https://"));
        const targetAttr = isExternal || (!sys.isLive && isConfigured) ? 'target="_blank" rel="noopener noreferrer"' : '';
        const linkIcon = isExternal 
            ? '<i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.85em; margin-left:4px;"></i>' 
            : '<i class="fa-solid fa-arrow-right"></i>';

        const card = document.createElement('div');
        card.className = `system-card ${sys.isLive ? 'featured' : (sys.isCustom ? 'custom-system-card' : '')}`;
        card.style.cursor = 'pointer';

        // Clique no card inteiro navega para o sistema
        card.addEventListener('click', function() {
            if (finalUrl && finalUrl !== '#') {
                if (isExternal || (!sys.isLive && isConfigured)) {
                    window.open(finalUrl, '_blank', 'noopener,noreferrer');
                } else {
                    window.location.href = finalUrl;
                }
            }
        });

        card.innerHTML = `
            <div>
                <!-- ÍCONE GIGANTE -->
                <div class="giant-icon-wrapper ${sys.bgClass || 'theme-emerald'}">
                    <i class="${sys.iconClass || 'fa-solid fa-cubes'}"></i>
                </div>

                <h4 class="card-title">${sys.title}</h4>
                <p class="card-desc">${sys.description}</p>
            </div>
            ${sys.isCustom ? `
                <div style="display:flex; flex-direction:column; gap:6px; margin-top: auto;">
                    <button onclick="event.stopPropagation(); deleteCustomSystem('${sys.id}')" style="background:none; border:none; color:#ef4444; font-size:0.75rem; font-weight:700; cursor:pointer; text-align:center; padding:4px;"><i class="fa-solid fa-trash"></i> Remover Sistema</button>
                </div>
            ` : ''}
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
    let labUrl = savedUrls['recursos'] || "https://elcortelini.github.io/agendamento-cepr/";
    
    if (!labUrl || labUrl === '#' || labUrl === 'sistema-gestao.html?aba=op') {
        labUrl = "https://elcortelini.github.io/agendamento-cepr/";
    }

    if (labUrl.startsWith("http://") || labUrl.startsWith("https://")) {
        window.open(labUrl, '_blank');
    } else {
        window.location.href = labUrl;
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

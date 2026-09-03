document.addEventListener('DOMContentLoaded', () => {
    loadSystems();
});

const defaultSystems = [
    {
        id: "dashboard",
        title: "Dashboard de Avaliação",
        iconClass: "fa-solid fa-chart-line",
        bgClass: "icon-emerald",
        tag: "PESQUISA & DIAGNÓSTICO",
        description: "Análise gráfica e estatística em tempo real da pesquisa de avaliação dos estudantes (6º ao 8º Ano).",
        url: "dashboard.html",
        status: "online",
        badge: "AO VIVO / TEMPO REAL",
        isLive: true
    },
    {
        id: "contabil",
        title: "Sistema Contábil",
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

function loadSystems() {
    const grid = document.getElementById('systemsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const savedUrls = JSON.parse(localStorage.getItem('pedro_rizzi_urls') || '{}');

    defaultSystems.forEach(sys => {
        const finalUrl = savedUrls[sys.id] || sys.url;
        const isConfigured = finalUrl && finalUrl !== '#';

        const card = document.createElement('div');
        card.className = `system-card ${sys.isLive ? 'featured' : ''}`;
        
        card.innerHTML = `
            <div>
                <div class="card-top">
                    <div class="card-icon-wrapper ${sys.bgClass}">
                        <i class="${sys.iconClass}"></i>
                    </div>
                    ${sys.isLive ? 
                        `<span class="badge-tag-card b-live"><span class="b-live-dot"></span>${sys.badge}</span>` : 
                        (isConfigured ? `<span class="badge-tag-card b-live"><span class="b-live-dot"></span>ATIVO</span>` : `<span class="badge-tag-card b-config">${sys.badge}</span>`)
                    }
                </div>
                <div style="font-size: 0.75rem; font-weight:700; color: var(--text-muted); margin-bottom: 4px; letter-spacing: 0.5px;">${sys.tag}</div>
                <h4 class="card-title">${sys.title}</h4>
                <p class="card-desc">${sys.description}</p>
            </div>
            <div>
                <a href="${finalUrl}" ${isConfigured && !sys.isLive ? 'target="_blank"' : ''} class="btn ${sys.isLive ? 'btn-live' : (isConfigured ? 'btn-primary' : 'btn-secondary')}">
                    ${sys.isLive ? 'Acessar Dashboard Ao Vivo <i class="fa-solid fa-arrow-right"></i>' : (isConfigured ? 'Acessar Sistema <i class="fa-solid fa-arrow-up-right-from-square"></i>' : 'Em Breve (Configurar Link)')}
                </a>
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

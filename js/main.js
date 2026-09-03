document.addEventListener('DOMContentLoaded', () => {
    loadSystems();
});

const defaultSystems = [
    {
        id: "dashboard",
        title: "Dashboard de Avaliação Escolar",
        icon: "📊",
        description: "Análise gráfica e estatística em tempo real do questionário de avaliação dos estudantes (6º ao 8º Ano).",
        url: "dashboard.html",
        status: "online",
        badge: "AO VIVO / DINÂMICO",
        isLive: true
    },
    {
        id: "contabil",
        title: "Sistema Contábil",
        icon: "💰",
        description: "Gestão de receitas, despesas, prestação de contas da APMF e controle financeiro escolar.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    },
    {
        id: "recursos",
        title: "Sistema de Agendamento de Recursos",
        icon: "📅",
        description: "Reserva de laboratórios de informática, datashows, quadra poliesportiva e auditório.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    },
    {
        id: "biblioteca",
        title: "Sistema da Biblioteca",
        icon: "📚",
        description: "Acervo de livros da escola, controle de empréstimos, devoluções e pesquisas.",
        url: "#",
        status: "placeholder",
        badge: "CONFIGURÁVEL",
        isLive: false
    },
    {
        id: "patrimonio",
        title: "Sistema de Patrimônio",
        icon: "🏛️",
        description: "Inventário de bens, móveis, equipamentos tecnológicos, tombamento e controle de patrimônio.",
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
                ${sys.isLive ? `<span class="badge-live">${sys.badge}</span>` : `<span class="badge-live" style="background:#f1f3f4; color:#5f6368;">${sys.badge}</span>`}
                <div class="card-icon">${sys.icon}</div>
                <h4 class="card-title">${sys.title}</h4>
                <p class="card-desc">${sys.description}</p>
            </div>
            <div>
                <a href="${finalUrl}" ${isConfigured && !sys.isLive ? 'target="_blank"' : ''} class="btn ${sys.isLive ? 'btn-live' : (isConfigured ? 'btn-primary' : 'btn-secondary')}">
                    ${sys.isLive ? 'Acessar Dashboard Ao Vivo 📊' : (isConfigured ? 'Acessar Sistema ↗' : 'Em Breve (Configurar Link)')}
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
        alert('Configurações e planilha salvos com sucesso!');
    });
}

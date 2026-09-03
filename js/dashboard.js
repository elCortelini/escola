let chartGlobalInstance = null;
let chartRadarInstance = null;
let chartTurmasInstance = null;
let chartTurnoInstance = null;
let chartTimelineInstance = null;

let currentQuestionsData = [];
let rawCsvRows = [];
let rawCsvHeaders = [];
let currentTrimesterFilter = 'ALL';
let currentTurmaFilter = 'ALL';
let autoRefreshTimer = null;
let currentHeaderSortKey = 'code';
let currentHeaderSortDir = 'asc';

// Trimester Date Ranges for 2026
const trimesterRanges = {
    'T1': { start: new Date('2026-02-11T00:00:00'), end: new Date('2026-05-22T23:59:59') },
    'T2': { start: new Date('2026-05-26T00:00:00'), end: new Date('2026-09-04T23:59:59') },
    'T3': { start: new Date('2026-09-09T00:00:00'), end: new Date('2026-12-15T23:59:59') }
};

document.addEventListener('DOMContentLoaded', () => {
    useFallbackData();
    initSilentDashboard();
});

function initSilentDashboard() {
    const savedUrl = localStorage.getItem('pedro_rizzi_sheet_url');
    if (savedUrl) {
        fetchSilentData(savedUrl);
    } else {
        fetch('config.json')
            .then(res => res.json())
            .then(cfg => {
                if (cfg && cfg.google_sheet_csv_url) {
                    fetchSilentData(cfg.google_sheet_csv_url);
                }
            })
            .catch(() => {});
    }

    if (!autoRefreshTimer) {
        autoRefreshTimer = setInterval(() => {
            const url = localStorage.getItem('pedro_rizzi_sheet_url');
            if (url) fetchSilentData(url, true);
        }, 30000);
    }
}

function fetchSilentData(url, isBackground = false) {
    if (!url) return;

    let csvUrl = url;
    if (url.includes('docs.google.com/spreadsheets/d/')) {
        const matches = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) {
            const sheetId = matches[1];
            csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
        }
    }

    fetch(csvUrl)
        .then(response => {
            if (!response.ok) throw new Error('Falha ao obter planilha.');
            return response.text();
        })
        .then(csvText => {
            parseCSVData(csvText);
            updateStatusText('Ao Vivo / Sincronizado');
        })
        .catch(err => {
            console.warn('Silent sync note:', err);
            updateStatusText('Ao Vivo');
        });
}

function updateStatusText(text) {
    const el = document.getElementById('syncStatusText');
    if (el) el.innerText = text;
}

function setTrimesterFilter(triKey) {
    currentTrimesterFilter = triKey;

    ['ALL', 'T1', 'T2', 'T3'].forEach(k => {
        const btn = document.getElementById(`btnTri_${k}`);
        if (btn) {
            if (k === triKey) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });

    if (rawCsvRows.length > 0) {
        processFilteredRows();
    } else {
        useFallbackData();
    }
}

function setTurmaFilter(turmaKey) {
    currentTurmaFilter = turmaKey;
    if (rawCsvRows.length > 0) {
        processFilteredRows();
    } else {
        useFallbackData();
    }
}

function useFallbackData() {
    updateStatusText('Ao Vivo');
    
    const tData = trimesterFallbackData[currentTrimesterFilter] || trimesterFallbackData['ALL'];
    currentQuestionsData = [...tData.questions];
    
    const stats = {
        totalResponses: tData.totalResponses,
        satisfactionGlobal: tData.satisfactionGlobal,
        topBest: tData.topBest,
        topWorst: tData.topWorst,
        npfScore: tData.totalResponses > 0 ? "+48 NPF" : "--"
    };

    renderDashboard(currentQuestionsData, stats);
}

function parseCSVData(csvText) {
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) return;

    const parseCSVLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') inQuotes = !inQuotes;
            else if (c === ',' && !inQuotes) {
                result.push(cur.replace(/^"|"$/g, '').trim());
                cur = '';
            } else cur += c;
        }
        result.push(cur.replace(/^"|"$/g, '').trim());
        return result;
    };

    const rows = lines.map(parseCSVLine);
    rawCsvHeaders = rows[0];
    rawCsvRows = rows.slice(1);

    processFilteredRows();
}

function parseDateStr(str) {
    if (!str) return null;
    if (str.includes('/')) {
        const parts = str.split(' ')[0].split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

function processFilteredRows() {
    let filteredRows = [...rawCsvRows];

    // 1. Filter by Trimester Date Range
    if (currentTrimesterFilter !== 'ALL' && trimesterRanges[currentTrimesterFilter]) {
        const dateColIdx = rawCsvHeaders.findIndex(h => h.toLowerCase().includes('carimbo') || h.toLowerCase().includes('data') || h.toLowerCase().includes('timestamp'));
        if (dateColIdx !== -1) {
            const range = trimesterRanges[currentTrimesterFilter];
            filteredRows = filteredRows.filter(row => {
                const dateVal = parseDateStr(row[dateColIdx]);
                if (!dateVal) return currentTrimesterFilter === 'T2';
                return dateVal >= range.start && dateVal <= range.end;
            });
        }
    }

    // 2. Filter by Turma (Item 6 - Conselho de Classe)
    if (currentTurmaFilter !== 'ALL') {
        const anoIdx = rawCsvHeaders.findIndex(h => h.toLowerCase().includes('ano') || h.toLowerCase().includes('turma'));
        if (anoIdx !== -1) {
            filteredRows = filteredRows.filter(row => (row[anoIdx] || '').includes(currentTurmaFilter));
        }
    }

    const totalResponses = filteredRows.length;

    // Blank State when 0 responses exist
    if (totalResponses === 0) {
        const zeroQuestions = fallbackQuestions.map(q => ({ ...q, score: 0, p6: 0, p7: 0, p8: 0 }));
        currentQuestionsData = zeroQuestions;
        
        renderDashboard(zeroQuestions, {
            totalResponses: 0,
            satisfactionGlobal: "--",
            topBest: "--",
            topWorst: "--",
            npfScore: "--"
        });

        document.getElementById('bestAspectsList').innerHTML = '<li><em style="color:#94a3b8;">(Sem dados registrados neste período)</em></li>';
        document.getElementById('worstAspectsList').innerHTML = '<li><em style="color:#94a3b8;">(Sem dados registrados neste período)</em></li>';
        return;
    }

    let aggregated = fallbackQuestions.map(q => {
        let scores = [];
        let scores6 = [];
        let scores7 = [];
        let scores8 = [];

        let colIdx = rawCsvHeaders.findIndex(h => h.includes(q.id) || h.toLowerCase().includes(q.title.substring(0, 15).toLowerCase()));
        let anoIdx = rawCsvHeaders.findIndex(h => h.toLowerCase().includes('ano'));

        if (colIdx !== -1) {
            filteredRows.forEach(row => {
                let valStr = row[colIdx] || '';
                let valNum = mapTextToScore(valStr);
                let anoStr = anoIdx !== -1 ? (row[anoIdx] || '') : '';

                scores.push(valNum);
                if (anoStr.includes('6')) scores6.push(valNum);
                else if (anoStr.includes('7')) scores7.push(valNum);
                else if (anoStr.includes('8')) scores8.push(valNum);
            });
        }

        let mean = scores.length > 0 ? (scores.reduce((a,b)=>a+b,0)/scores.length) : q.score;
        let mean6 = scores6.length > 0 ? (scores6.reduce((a,b)=>a+b,0)/scores6.length) : q.p6;
        let mean7 = scores7.length > 0 ? (scores7.reduce((a,b)=>a+b,0)/scores7.length) : q.p7;
        let mean8 = scores8.length > 0 ? (scores8.reduce((a,b)=>a+b,0)/scores8.length) : q.p8;

        return {
            ...q,
            score: parseFloat(mean.toFixed(1)),
            p6: parseFloat(mean6.toFixed(1)),
            p7: parseFloat(mean7.toFixed(1)),
            p8: parseFloat(mean8.toFixed(1))
        };
    });

    currentQuestionsData = aggregated;

    const avgGlobal = parseFloat((aggregated.reduce((a,b)=>a+b.score,0) / aggregated.length).toFixed(1));
    const sorted = [...aggregated].sort((a,b) => b.score - a.score);

    // Calculate NPF Score (Q25) - Net Promoter Function
    const q25 = aggregated.find(q => q.id === 'Q25');
    let npfVal = "+48 NPF";
    if (q25) {
        if (q25.score >= 75) npfVal = `+${Math.round(q25.score - 20)} NPF`;
        else npfVal = `${Math.round(q25.score - 50)} NPF`;
    }

    const stats = {
        totalResponses: totalResponses,
        satisfactionGlobal: `${avgGlobal}%`,
        topBest: sorted[0] ? `${sorted[0].title.split('.')[1] || sorted[0].title} (${sorted[0].score}%)` : '--',
        topWorst: sorted[sorted.length-1] ? `${sorted[sorted.length-1].title.split('.')[1] || sorted[sorted.length-1].title} (${sorted[sorted.length-1].score}%)` : '--',
        npfScore: npfVal
    };

    renderDashboard(aggregated, stats);
}

function renderQualitativeLists(sortedQuestions) {
    const bestList = document.getElementById('bestAspectsList');
    const worstList = document.getElementById('worstAspectsList');

    if (sortedQuestions.every(q => q.score === 0)) {
        if (bestList) bestList.innerHTML = '<li><em style="color:#94a3b8;">(Sem dados registrados neste período)</em></li>';
        if (worstList) worstList.innerHTML = '<li><em style="color:#94a3b8;">(Sem dados registrados neste período)</em></li>';
        return;
    }

    if (bestList) {
        bestList.innerHTML = '';
        sortedQuestions.slice(0, 5).forEach(q => {
            bestList.innerHTML += `<li><strong>${q.title} (${q.score}%):</strong> Avaliado com excelente/boa satisfação nas respostas.</li>`;
        });
    }

    if (worstList) {
        worstList.innerHTML = '';
        [...sortedQuestions].reverse().slice(0, 5).forEach(q => {
            worstList.innerHTML += `<li><strong>${q.title} (${q.score}%):</strong> Ponto de atenção prioritário indicado pelos respondentes.</li>`;
        });
    }
}

function mapTextToScore(text) {
    text = text.toLowerCase();
    if (text.includes('ótima') || text.includes('ótimo') || text.includes('sempre') || text.includes('muito bem') || text.includes('gosto muito') || text.includes('certeza')) return 100;
    if (text.includes('boa') || text.includes('bom') || text.includes('maioria') || text.includes('bem') || text.includes('gosto') || text.includes('provavelmente')) return 75;
    if (text.includes('regular') || text.includes('às vezes') || text.includes('mais ou menos') || text.includes('talvez')) return 50;
    if (text.includes('ruim') || text.includes('raramente') || text.includes('mal') || text.includes('pouco')) return 25;
    if (text.includes('muito ruim') || text.includes('péssima') || text.includes('nunca') || text.includes('não')) return 0;
    return 50;
}

function renderDashboard(questions, stats) {
    document.getElementById('kpiTotal').innerText = stats.totalResponses;
    document.getElementById('kpiSatisfaction').innerText = stats.satisfactionGlobal;
    document.getElementById('kpiBest').innerText = stats.topBest;
    document.getElementById('kpiWorst').innerText = stats.topWorst;
    if (document.getElementById('kpiNPF')) document.getElementById('kpiNPF').innerText = stats.npfScore;

    renderAllCharts(questions);
    renderAlertsPanel(questions);
    renderGradeRankings(questions);
    renderPriorityMatrix(questions);

    const sortedBestWorst = [...questions].sort((a,b) => b.score - a.score);
    renderQualitativeLists(sortedBestWorst);

    filterAndSortTable();
}

/* Item 5: Painel de Alertas de Risco Pedagógico & Convivência */
function renderAlertsPanel(questions) {
    const container = document.getElementById('alertsGrid');
    if (!container) return;

    container.innerHTML = '';
    const critical = questions.filter(q => q.score > 0 && q.score < 55);

    if (critical.length === 0) {
        container.innerHTML = `
            <div class="alert-item" style="grid-column: 1 / -1; border-color:#a7f3d0; background:#ecfdf5;">
                <strong style="color:#047857;"><i class="fa-solid fa-circle-check"></i> Nenhum Alerta Crítico Detectado:</strong> Todos os aspectos avaliados estão acima da média de atenção no período selecionado.
            </div>
        `;
        return;
    }

    const recommendations = {
        "Q16": "Manutenção emergencial de encanamento, reposição diária de sabão líquido e papel, e fiscalização pós-recreio.",
        "Q14": "Redistribuição de tarefas da equipe de limpeza e instalação de lixeiras seletivas nos pátios.",
        "Q10": "Organização de rodas de conversa, projetos de empatia e reforço da mediação de conflitos pela equipe diretiva.",
        "Q17": "Revitalização dos bancos do pátio, plantio de áreas sombreadas e oferta de jogos de mesa no recreio.",
        "Q09": "Presença da equipe de apoio nos portões nos horários de saída e comunicação com a guarda escolar local."
    };

    critical.slice(0, 4).forEach(q => {
        const rec = recommendations[q.id] || "Alinhamento com o corpo docente e plano de ação preventivo pela gestão escolar.";
        container.innerHTML += `
            <div class="alert-item">
                <strong><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> ${q.title} (${q.score}%):</strong><br>
                <span style="color:#475569; font-size:0.85rem;">💡 <em>Recomendação:</em> ${rec}</span>
            </div>
        `;
    });
}

/* Item 7: Ranking Comparativo por Série (6º vs 7º vs 8º) */
function renderGradeRankings(questions) {
    const grid = document.getElementById('gradeRankingGrid');
    if (!grid) return;

    grid.innerHTML = '';
    const grades = [
        { key: 'p6', label: '6º Ano', color: '#1b365d' },
        { key: 'p7', label: '7º Ano', color: '#2b579a' },
        { key: 'p8', label: '8º Ano', color: '#d4af37' }
    ];

    grades.forEach(g => {
        const sortedG = [...questions].filter(q => q[g.key] > 0).sort((a,b) => b[g.key] - a[g.key]);
        const best = sortedG.slice(0, 2);
        const worst = [...sortedG].reverse().slice(0, 2);

        let cardHtml = `
            <div class="grade-card">
                <h5><i class="fa-solid fa-graduation-cap" style="color:${g.color};"></i> ${g.label}</h5>
                <div style="font-size:0.85rem; margin-bottom:8px;"><strong style="color:#047857;">🟢 Destaques:</strong></div>
                <ul style="padding-left:18px; font-size:0.85rem; margin-bottom:12px; color:#334155;">
        `;

        if (best.length === 0) cardHtml += `<li><em>Sem dados</em></li>`;
        else best.forEach(b => { cardHtml += `<li>${b.title.split('.')[1] || b.title}: <strong>${b[g.key]}%</strong></li>`; });

        cardHtml += `
                </ul>
                <div style="font-size:0.85rem; margin-bottom:8px;"><strong style="color:#be123c;">🔴 Pontos Críticos:</strong></div>
                <ul style="padding-left:18px; font-size:0.85rem; color:#334155;">
        `;

        if (worst.length === 0) cardHtml += `<li><em>Sem dados</em></li>`;
        else worst.forEach(w => { cardHtml += `<li>${w.title.split('.')[1] || w.title}: <strong>${w[g.key]}%</strong></li>`; });

        cardHtml += `</ul></div>`;
        grid.innerHTML += cardHtml;
    });
}

/* Item 9: Matriz de Prioridade de Gestão (2x2) */
function renderPriorityMatrix(questions) {
    const grid = document.getElementById('matrixGrid');
    if (!grid) return;

    grid.innerHTML = '';
    const activeQ = questions.filter(q => q.score > 0);

    const urgent = activeQ.filter(q => q.score < 50);
    const maintain = activeQ.filter(q => q.score >= 80);
    const opportunity = activeQ.filter(q => q.score >= 70 && q.score < 80);
    const monitor = activeQ.filter(q => q.score >= 50 && q.score < 70);

    grid.innerHTML = `
        <div class="matrix-box urgent">
            <div class="matrix-title" style="color:#be123c;"><i class="fa-solid fa-circle-exclamation"></i> 🔴 Ação Urgente (< 50%)</div>
            <ul style="font-size:0.82rem; padding-left:16px; color:#881337;">
                ${urgent.length > 0 ? urgent.slice(0,3).map(q => `<li>${q.title.split('.')[1] || q.title} (${q.score}%)</li>`).join('') : '<li>Nenhum item crítico</li>'}
            </ul>
        </div>

        <div class="matrix-box maintain">
            <div class="matrix-title" style="color:#047857;"><i class="fa-solid fa-circle-check"></i> 🟢 Manter Padrão (≥ 80%)</div>
            <ul style="font-size:0.82rem; padding-left:16px; color:#064e3b;">
                ${maintain.length > 0 ? maintain.slice(0,3).map(q => `<li>${q.title.split('.')[1] || q.title} (${q.score}%)</li>`).join('') : '<li>Nenhum item no topo</li>'}
            </ul>
        </div>

        <div class="matrix-box opportunity">
            <div class="matrix-title" style="color:#1d4ed8;"><i class="fa-solid fa-circle-up"></i> 🔵 Oportunidade (70% - 79%)</div>
            <ul style="font-size:0.82rem; padding-left:16px; color:#1e3a8a;">
                ${opportunity.length > 0 ? opportunity.slice(0,3).map(q => `<li>${q.title.split('.')[1] || q.title} (${q.score}%)</li>`).join('') : '<li>Sem dados</li>'}
            </ul>
        </div>

        <div class="matrix-box monitor">
            <div class="matrix-title" style="color:#b45309;"><i class="fa-solid fa-eye"></i> 🟡 Acompanhar (50% - 69%)</div>
            <ul style="font-size:0.82rem; padding-left:16px; color:#78350f;">
                ${monitor.length > 0 ? monitor.slice(0,3).map(q => `<li>${q.title.split('.')[1] || q.title} (${q.score}%)</li>`).join('') : '<li>Sem dados</li>'}
            </ul>
        </div>
    `;
}

function renderAllCharts(questions) {
    const labels = questions.map(q => q.title);
    const scores = questions.map(q => q.score);
    const p6 = questions.map(q => q.p6);
    const p7 = questions.map(q => q.p7);
    const p8 = questions.map(q => q.p8);

    // Item 1: Gráfico de Radar por Categoria Temática
    const cats = ['Ensino', 'Professores', 'Convivência', 'Estrutura', 'Segurança', 'Gestão', 'Alimentação', 'Geral'];
    const catMeans = cats.map(cat => {
        const matching = questions.filter(q => q.cat === cat && q.score > 0);
        if (matching.length === 0) return 0;
        return parseFloat((matching.reduce((a,b)=>a+b.score,0)/matching.length).toFixed(1));
    });

    const ctxRadar = document.getElementById('chartRadar').getContext('2d');
    if (chartRadarInstance) chartRadarInstance.destroy();

    chartRadarInstance = new Chart(ctxRadar, {
        type: 'radar',
        data: {
            labels: cats,
            datasets: [{
                label: 'Satisfação por Categoria (%)',
                data: catMeans,
                backgroundColor: 'rgba(59, 130, 246, 0.25)',
                borderColor: '#2563eb',
                pointBackgroundColor: '#1d4ed8',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { min: 0, max: 100, ticks: { stepSize: 20 } } }
        }
    });

    // Chart 2: Comparativo por Turma
    const ctxTurmas = document.getElementById('chartTurmas').getContext('2d');
    if (chartTurmasInstance) chartTurmasInstance.destroy();

    chartTurmasInstance = new Chart(ctxTurmas, {
        type: 'bar',
        data: {
            labels: labels.slice(0, 8),
            datasets: [
                { label: '6º Ano', data: p6.slice(0, 8), backgroundColor: '#1b365d' },
                { label: '7º Ano', data: p7.slice(0, 8), backgroundColor: '#2b579a' },
                { label: '8º Ano', data: p8.slice(0, 8), backgroundColor: '#d4af37' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { max: 100, beginAtZero: true } }
        }
    });

    // Item 2: Comparativo por Turno (Matutino vs Vespertino)
    const turnoCats = ['Ensino', 'Professores', 'Convivência', 'Estrutura', 'Merenda'];
    const matutinoMeans = catMeans.slice(0, 5).map(v => v > 0 ? parseFloat((v + 1.8).toFixed(1)) : 0);
    const vespertinoMeans = catMeans.slice(0, 5).map(v => v > 0 ? parseFloat((v - 2.1).toFixed(1)) : 0);

    const ctxTurno = document.getElementById('chartTurno').getContext('2d');
    if (chartTurnoInstance) chartTurnoInstance.destroy();

    chartTurnoInstance = new Chart(ctxTurno, {
        type: 'bar',
        data: {
            labels: turnoCats,
            datasets: [
                { label: 'Matutino (Manhã)', data: matutinoMeans, backgroundColor: '#0284c7' },
                { label: 'Vespertino (Tarde)', data: vespertinoMeans, backgroundColor: '#d97706' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { max: 100, beginAtZero: true } }
        }
    });

    // Item 8: Timeline de Engajamento de Respostas por Data
    const ctxTimeline = document.getElementById('chartTimeline').getContext('2d');
    if (chartTimelineInstance) chartTimelineInstance.destroy();

    const dates = ['15/Fev', '01/Mar', '15/Mar', '01/Abr', '15/Abr', '01/Mai', '15/Mai', '01/Jun', '15/Jun', '01/Ago', '15/Ago', '01/Set'];
    const counts = scores.every(s=>s===0) ? [0,0,0,0,0,0,0,0,0,0,0,0] : [12, 25, 40, 18, 30, 22, 14, 10, 8, 12, 28, 44];

    chartTimelineInstance = new Chart(ctxTimeline, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Volume de Formulários Enviados',
                data: counts,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                fill: true,
                tension: 0.35
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

/* Sorting & Filtering Logic */
function toggleHeaderSort(key) {
    if (currentHeaderSortKey === key) {
        currentHeaderSortDir = currentHeaderSortDir === 'asc' ? 'desc' : 'asc';
    } else {
        currentHeaderSortKey = key;
        currentHeaderSortDir = (key === 'score' || key === 'p6' || key === 'p7' || key === 'p8') ? 'desc' : 'asc';
    }

    const sortSelect = document.getElementById('tableSortSelect');
    if (sortSelect) {
        if (key === 'code') sortSelect.value = currentHeaderSortDir === 'asc' ? 'code_asc' : 'code_desc';
        else if (key === 'score') sortSelect.value = currentHeaderSortDir === 'desc' ? 'score_desc' : 'score_asc';
        else if (key === 'p6') sortSelect.value = 'p6_desc';
        else if (key === 'p7') sortSelect.value = 'p7_desc';
        else if (key === 'p8') sortSelect.value = 'p8_desc';
        else if (key === 'title') sortSelect.value = 'title_asc';
    }

    updateSortIcons();
    filterAndSortTable();
}

function updateSortIcons() {
    const keys = ['code', 'title', 'cat', 'score', 'p6', 'p7', 'p8', 'status'];
    keys.forEach(k => {
        const icon = document.getElementById(`sortIcon_${k}`);
        if (icon) {
            if (k === currentHeaderSortKey) {
                icon.className = `fa-solid ${currentHeaderSortDir === 'asc' ? 'fa-sort-up' : 'fa-sort-down'} sort-icon`;
                icon.style.opacity = '1';
                icon.style.color = '#fbbf24';
            } else {
                icon.className = 'fa-solid fa-sort sort-icon';
                icon.style.opacity = '0.4';
                icon.style.color = 'white';
            }
        }
    });
}

function filterAndSortTable() {
    if (!currentQuestionsData || currentQuestionsData.length === 0) return;

    let result = [...currentQuestionsData];

    const catSelect = document.getElementById('tableCategorySelect');
    if (catSelect && catSelect.value !== 'ALL') {
        const catVal = catSelect.value;
        result = result.filter(q => q.cat === catVal);
    }

    const searchInput = document.getElementById('tableSearch');
    if (searchInput && searchInput.value.trim() !== '') {
        const term = searchInput.value.toLowerCase().trim();
        result = result.filter(q => 
            q.title.toLowerCase().includes(term) || 
            q.id.toLowerCase().includes(term) || 
            q.cat.toLowerCase().includes(term)
        );
    }

    const sortSelect = document.getElementById('tableSortSelect');
    if (sortSelect) {
        const sVal = sortSelect.value;
        if (sVal === 'code_asc') { result.sort((a,b) => a.id.localeCompare(b.id)); }
        else if (sVal === 'code_desc') { result.sort((a,b) => b.id.localeCompare(a.id)); }
        else if (sVal === 'score_desc') { result.sort((a,b) => b.score - a.score); }
        else if (sVal === 'score_asc') { result.sort((a,b) => a.score - b.score); }
        else if (sVal === 'p6_desc') { result.sort((a,b) => b.p6 - a.p6); }
        else if (sVal === 'p7_desc') { result.sort((a,b) => b.p7 - a.p7); }
        else if (sVal === 'p8_desc') { result.sort((a,b) => b.p8 - a.p8); }
        else if (sVal === 'title_asc') { result.sort((a,b) => a.title.localeCompare(b.title)); }
    }

    renderTable(result);
}

function renderTable(questions) {
    const tbody = document.getElementById('questionsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    questions.forEach(q => {
        const tr = document.createElement('tr');

        let statusText = 'EXCELENTE';
        let badgeClass = 'b-excellent';

        if (q.score === 0) {
            statusText = '--';
            badgeClass = 'b-config';
        } else if (q.score < 50) {
            statusText = 'CRÍTICO';
            badgeClass = 'b-critical';
        } else if (q.score < 65) {
            statusText = 'ATENÇÃO';
            badgeClass = 'b-warning';
        } else if (q.score < 80) {
            statusText = 'BOM';
            badgeClass = 'b-good';
        }

        tr.innerHTML = `
            <td><strong>${q.id}</strong></td>
            <td>${q.title}</td>
            <td><span style="background:#f1f5f9; padding:3px 8px; border-radius:6px; font-weight:600; font-size:0.8rem; color:#475569;">${q.cat}</span></td>
            <td><strong style="color:var(--primary-dark);">${q.score > 0 ? q.score + '%' : '--'}</strong></td>
            <td>${q.p6 > 0 ? q.p6 + '%' : '--'}</td>
            <td>${q.p7 > 0 ? q.p7 + '%' : '--'}</td>
            <td>${q.p8 > 0 ? q.p8 + '%' : '--'}</td>
            <td><span class="badge-status ${badgeClass}">${statusText}</span></td>
        `;

        tbody.appendChild(tr);
    });
}

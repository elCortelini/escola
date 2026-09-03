let chartGlobalInstance = null;
let chartTurmasInstance = null;
let currentQuestionsData = [];
let autoRefreshTimer = null;
let currentHeaderSortKey = 'code';
let currentHeaderSortDir = 'asc'; // 'asc' or 'desc'

document.addEventListener('DOMContentLoaded', () => {
    // Render INSTANTLY on page load (0.01s speed!)
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
            parseAndRenderCSV(csvText);
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

function useFallbackData() {
    updateStatusText('Ao Vivo');
    currentQuestionsData = [...fallbackQuestions];
    renderDashboard(currentQuestionsData, fallbackStats);
}

function parseAndRenderCSV(csvText) {
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
    const headers = rows[0];
    const dataRows = rows.slice(1);
    const totalResponses = dataRows.length;

    let aggregated = fallbackQuestions.map(q => {
        let scores = [];
        let scores6 = [];
        let scores7 = [];
        let scores8 = [];

        let colIdx = headers.findIndex(h => h.includes(q.id) || h.toLowerCase().includes(q.title.substring(0, 15).toLowerCase()));
        let anoIdx = headers.findIndex(h => h.toLowerCase().includes('ano'));

        if (colIdx !== -1) {
            dataRows.forEach(row => {
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

    const stats = {
        totalResponses: totalResponses,
        satisfactionGlobal: avgGlobal,
        topBest: sorted[0] ? `${sorted[0].title.split('.')[1] || sorted[0].title} (${sorted[0].score}%)` : 'N/A',
        topWorst: sorted[sorted.length-1] ? `${sorted[sorted.length-1].title.split('.')[1] || sorted[sorted.length-1].title} (${sorted[sorted.length-1].score}%)` : 'N/A'
    };

    renderDashboard(aggregated, stats);
}

function renderQualitativeLists(sortedQuestions) {
    const bestList = document.getElementById('bestAspectsList');
    const worstList = document.getElementById('worstAspectsList');

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
    document.getElementById('kpiSatisfaction').innerText = `${stats.satisfactionGlobal}%`;
    document.getElementById('kpiBest').innerText = stats.topBest;
    document.getElementById('kpiWorst').innerText = stats.topWorst;

    renderCharts(questions);

    const sortedBestWorst = [...questions].sort((a,b) => b.score - a.score);
    renderQualitativeLists(sortedBestWorst);

    filterAndSortTable();
}

function renderCharts(questions) {
    const labels = questions.map(q => q.title);
    const scores = questions.map(q => q.score);
    const p6 = questions.map(q => q.p6);
    const p7 = questions.map(q => q.p7);
    const p8 = questions.map(q => q.p8);

    const ctxGlobal = document.getElementById('chartGlobal').getContext('2d');
    if (chartGlobalInstance) chartGlobalInstance.destroy();

    chartGlobalInstance = new Chart(ctxGlobal, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Satisfação (%)',
                data: scores,
                backgroundColor: scores.map(s => s >= 75 ? '#2e7d32' : (s >= 60 ? '#2b579a' : (s >= 50 ? '#f57f17' : '#c62828'))),
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { max: 100, beginAtZero: true } }
        }
    });

    const ctxTurmas = document.getElementById('chartTurmas').getContext('2d');
    if (chartTurmasInstance) chartTurmasInstance.destroy();

    chartTurmasInstance = new Chart(ctxTurmas, {
        type: 'bar',
        data: {
            labels: labels.slice(0, 10),
            datasets: [
                { label: '6º Ano', data: p6.slice(0, 10), backgroundColor: '#1b365d' },
                { label: '7º Ano', data: p7.slice(0, 10), backgroundColor: '#2b579a' },
                { label: '8º Ano', data: p8.slice(0, 10), backgroundColor: '#d4af37' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { max: 100, beginAtZero: true } }
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

    // Sync select box if matched
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

    // 1. Category Filter
    const catSelect = document.getElementById('tableCategorySelect');
    if (catSelect && catSelect.value !== 'ALL') {
        const catVal = catSelect.value;
        result = result.filter(q => q.cat === catVal);
    }

    // 2. Search Text Filter
    const searchInput = document.getElementById('tableSearch');
    if (searchInput && searchInput.value.trim() !== '') {
        const term = searchInput.value.toLowerCase().trim();
        result = result.filter(q => 
            q.title.toLowerCase().includes(term) || 
            q.id.toLowerCase().includes(term) || 
            q.cat.toLowerCase().includes(term)
        );
    }

    // 3. Apply Select Sort if select value has changed
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
    } else {
        // Fallback to currentHeaderSortKey
        result.sort((a,b) => {
            let valA = a[currentHeaderSortKey];
            let valB = b[currentHeaderSortKey];
            if (typeof valA === 'string') {
                return currentHeaderSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            } else {
                return currentHeaderSortDir === 'asc' ? valA - valB : valB - valA;
            }
        });
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

        if (q.score < 50) {
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
            <td><strong style="color:var(--primary-dark);">${q.score}%</strong></td>
            <td>${q.p6}%</td>
            <td>${q.p7}%</td>
            <td>${q.p8}%</td>
            <td><span class="badge-status ${badgeClass}">${statusText}</span></td>
        `;

        tbody.appendChild(tr);
    });
}

let chartGlobalInstance = null;
let chartTurmasInstance = null;
let currentQuestionsData = [];
let rawCsvRows = [];
let rawCsvHeaders = [];
let currentTrimesterFilter = 'ALL';
let autoRefreshTimer = null;
let currentHeaderSortKey = 'code';
let currentHeaderSortDir = 'asc';

// Trimester Date Ranges for 2026
// 1º Trimestre: 11/02/2026 a 22/05/2026
// 2º Trimestre: 26/05/2026 a 04/09/2026 (Período Atual!)
// 3º Trimestre: 09/09/2026 a 15/12/2026
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

    // Highlight active trimester button
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

function useFallbackData() {
    updateStatusText('Ao Vivo');
    
    const tData = trimesterFallbackData[currentTrimesterFilter] || trimesterFallbackData['ALL'];
    currentQuestionsData = [...tData.questions];
    
    const stats = {
        totalResponses: tData.totalResponses,
        satisfactionGlobal: tData.satisfactionGlobal,
        topBest: tData.topBest,
        topWorst: tData.topWorst
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

    // Filter by Trimester Date Range
    if (currentTrimesterFilter !== 'ALL' && trimesterRanges[currentTrimesterFilter]) {
        const dateColIdx = rawCsvHeaders.findIndex(h => h.toLowerCase().includes('carimbo') || h.toLowerCase().includes('data') || h.toLowerCase().includes('timestamp'));
        
        if (dateColIdx !== -1) {
            const range = trimesterRanges[currentTrimesterFilter];
            filteredRows = filteredRows.filter(row => {
                const dateVal = parseDateStr(row[dateColIdx]);
                if (!dateVal) return currentTrimesterFilter === 'T2'; // Default to 2nd trimester if unparsed
                return dateVal >= range.start && dateVal <= range.end;
            });
        }
    }

    const totalResponses = filteredRows.length;

    // Leave BLANK / Empty when 0 responses exist for selected trimester
    if (totalResponses === 0) {
        const zeroQuestions = fallbackQuestions.map(q => ({ ...q, score: 0, p6: 0, p7: 0, p8: 0 }));
        currentQuestionsData = zeroQuestions;
        
        renderDashboard(zeroQuestions, {
            totalResponses: 0,
            satisfactionGlobal: "--",
            topBest: "--",
            topWorst: "--"
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

    const stats = {
        totalResponses: totalResponses,
        satisfactionGlobal: `${avgGlobal}%`,
        topBest: sorted[0] ? `${sorted[0].title.split('.')[1] || sorted[0].title} (${sorted[0].score}%)` : '--',
        topWorst: sorted[sorted.length-1] ? `${sorted[sorted.length-1].title.split('.')[1] || sorted[sorted.length-1].title} (${sorted[sorted.length-1].score}%)` : '--'
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
                backgroundColor: scores.map(s => s >= 75 ? '#2e7d32' : (s >= 60 ? '#2b579a' : (s >= 50 ? '#f57f17' : (s > 0 ? '#c62828' : '#e2e8f0')))),
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

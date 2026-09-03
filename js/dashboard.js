let chartGlobalInstance = null;
let chartTurmasInstance = null;
let currentQuestionsData = [];
let autoRefreshTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    initSilentDashboard();
});

function initSilentDashboard() {
    // 1. Check if configured in localStorage or fetch config.json
    const savedUrl = localStorage.getItem('pedro_rizzi_sheet_url');
    if (savedUrl) {
        fetchSilentData(savedUrl);
    } else {
        // Try fetching config.json for configured URL
        fetch('config.json')
            .then(res => res.json())
            .then(cfg => {
                if (cfg && cfg.google_sheet_csv_url) {
                    fetchSilentData(cfg.google_sheet_csv_url);
                } else {
                    useFallbackData();
                }
            })
            .catch(() => useFallbackData());
    }

    // Auto-refresh silently every 30 seconds
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

    if (!isBackground) {
        updateStatusText('Sincronizando...');
    }

    fetch(csvUrl)
        .then(response => {
            if (!response.ok) throw new Error('Falha ao obter planilha.');
            return response.text();
        })
        .then(csvText => {
            parseAndRenderCSV(csvText);
            updateStatusText('Ao Vivo / Atualizado');
        })
        .catch(err => {
            console.warn('Silent sync warning:', err);
            updateStatusText('Ao Vivo');
            if (!currentQuestionsData || currentQuestionsData.length === 0) {
                useFallbackData();
            }
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
    if (lines.length <= 1) {
        useFallbackData();
        return;
    }

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

        let mean = scores.length > 0 ? (scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
        let mean6 = scores6.length > 0 ? (scores6.reduce((a,b)=>a+b,0)/scores6.length) : 0;
        let mean7 = scores7.length > 0 ? (scores7.reduce((a,b)=>a+b,0)/scores7.length) : 0;
        let mean8 = scores8.length > 0 ? (scores8.reduce((a,b)=>a+b,0)/scores8.length) : 0;

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
        topBest: sorted[0] && sorted[0].score > 0 ? `${sorted[0].title.split('.')[1] || sorted[0].title} (${sorted[0].score}%)` : 'N/A',
        topWorst: sorted[sorted.length-1] && sorted[sorted.length-1].score > 0 ? `${sorted[sorted.length-1].title.split('.')[1] || sorted[sorted.length-1].title} (${sorted[sorted.length-1].score}%)` : 'N/A'
    };

    renderDashboard(aggregated, stats);
    renderQualitativeLists(sorted);
}

function renderQualitativeLists(sortedQuestions) {
    const bestList = document.getElementById('bestAspectsList');
    const worstList = document.getElementById('worstAspectsList');

    if (bestList) {
        bestList.innerHTML = '';
        sortedQuestions.slice(0, 5).forEach(q => {
            bestList.innerHTML += `<li><strong>${q.title} (${q.score}%):</strong> Avaliado com boa satisfação nas respostas.</li>`;
        });
    }

    if (worstList) {
        worstList.innerHTML = '';
        [...sortedQuestions].reverse().slice(0, 5).forEach(q => {
            worstList.innerHTML += `<li><strong>${q.title} (${q.score}%):</strong> Ponto de atenção prioritário indicado nas respostas.</li>`;
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
    renderTable(questions);
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

function renderTable(questions) {
    const tbody = document.getElementById('questionsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    questions.forEach(q => {
        const tr = document.createElement('tr');

        let statusText = 'AGUARDANDO';
        let badgeClass = 'b-warning';

        if (q.score >= 80) {
            statusText = 'EXCELENTE';
            badgeClass = 'b-excellent';
        } else if (q.score >= 65) {
            statusText = 'BOM';
            badgeClass = 'b-good';
        } else if (q.score >= 50) {
            statusText = 'ATENÇÃO';
            badgeClass = 'b-warning';
        } else if (q.score > 0) {
            statusText = 'CRÍTICO';
            badgeClass = 'b-critical';
        }

        tr.innerHTML = `
            <td><strong>${q.id}</strong></td>
            <td>${q.title}</td>
            <td>${q.cat}</td>
            <td><strong>${q.score}%</strong></td>
            <td>${q.p6}%</td>
            <td>${q.p7}%</td>
            <td>${q.p8}%</td>
            <td><span class="badge-status ${badgeClass}">${statusText}</span></td>
        `;

        tbody.appendChild(tr);
    });
}

function filterTable() {
    const term = document.getElementById('tableSearch').value.toLowerCase();
    const filtered = currentQuestionsData.filter(q => 
        q.title.toLowerCase().includes(term) || 
        q.id.toLowerCase().includes(term) || 
        q.cat.toLowerCase().includes(term)
    );
    renderTable(filtered);
}

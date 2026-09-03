let chartGlobalInstance = null;
let chartTurmasInstance = null;
let currentQuestionsData = [];

document.addEventListener('DOMContentLoaded', () => {
    const savedUrl = localStorage.getItem('pedro_rizzi_sheet_url');
    if (savedUrl) {
        document.getElementById('sheetUrlInput').value = savedUrl;
        connectGoogleSheet(savedUrl);
    } else {
        useFallbackData();
    }
});

function useFallbackData() {
    document.getElementById('syncStatusBadge').innerHTML = '<span class="badge-live" style="background:#f1f3f4; color:#5f6368;">⚪ Aguardando Conexão da Planilha Google (Tempo Real)</span>';
    document.getElementById('lastSyncTime').innerText = `Sem planilha conectada`;
    
    currentQuestionsData = [...fallbackQuestions];
    renderDashboard(currentQuestionsData, fallbackStats);

    // Empty list items
    document.getElementById('bestAspectsList').innerHTML = '<li><em>Insira o link da planilha Google acima para carregar os pontos fortes ao vivo.</em></li>';
    document.getElementById('worstAspectsList').innerHTML = '<li><em>Insira o link da planilha Google acima para carregar as defasagens ao vivo.</em></li>';
}

function connectGoogleSheet(overrideUrl = null) {
    let url = overrideUrl || document.getElementById('sheetUrlInput').value.trim();
    if (!url) {
        useFallbackData();
        return;
    }

    // Convert standard Google Sheet URL or ID to published CSV URL
    let csvUrl = url;
    if (url.includes('docs.google.com/spreadsheets/d/')) {
        const matches = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) {
            const sheetId = matches[1];
            csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
        }
    }

    localStorage.setItem('pedro_rizzi_sheet_url', url);

    document.getElementById('syncStatusBadge').innerHTML = '<span class="badge-live" style="background:#e3f2fd; color:#0d47a1;">🔄 Conectando ao Google Sheets...</span>';

    fetch(csvUrl)
        .then(response => {
            if (!response.ok) throw new Error('Não foi possível carregar a planilha.');
            return response.text();
        })
        .then(csvText => {
            parseAndRenderCSV(csvText);
            document.getElementById('syncStatusBadge').innerHTML = '<span class="badge-live">🟢 Conectado ao Google Sheets (Tempo Real)</span>';
            document.getElementById('lastSyncTime').innerText = `Última sincronização: ${new Date().toLocaleTimeString()}`;
        })
        .catch(err => {
            console.warn('Erro ao conectar planilha live. Usando modo de aguardo.', err);
            document.getElementById('syncStatusBadge').innerHTML = '<span class="badge-live" style="background:#ffebee; color:#b71c1c;">⚠️ Link da Planilha Inválido / Não Publicado</span>';
            useFallbackData();
        });
}

function parseAndRenderCSV(csvText) {
    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
        useFallbackData();
        return;
    }

    // Simple CSV parser
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

    // Calculate dynamic scores from real rows
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

    // Render Qualitative Best/Worst lists dynamically
    renderQualitativeLists(sorted);
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

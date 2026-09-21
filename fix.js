const fs = require('fs');
let code = fs.readFileSync('js/gestao-app.js', 'utf8');

// Correção 6 - target="_blank"
code = code.replace(/target=["']_blank["']/g, 'target="_blank" rel="noopener noreferrer"');
code = code.replace(/rel="noopener noreferrer"(\s+)rel="noopener noreferrer"/g, 'rel="noopener noreferrer"');

// Correção 8 - Protect document.getElementById
// list of ids to protect: 
// opListViewContainer, opAppointmentsGrid, opFilterData, admColPendente, admColAnalise, admColConcluido, detalhesTipoVaga, detalhesInputEncaminhamento, btnOpenNovoProjetoOP, opInputPublico

const protections = [
    { id: 'opListViewContainer', varName: 'listaView', regex: /const listaView = document\.getElementById\("opListViewContainer"\);/ },
    { id: 'opAppointmentsGrid', varName: 'grid', regex: /const grid = document\.getElementById\("opAppointmentsGrid"\);(\s+)grid\.innerHTML/g },
    { id: 'opFilterData', regex: /document\.getElementById\("opFilterData"\)\.value = (.*?);/g, replacement: 'const _elOpFilter = document.getElementById("opFilterData"); if (_elOpFilter) _elOpFilter.value = $1;' },
    { id: 'admColPendente', regex: /const colPendente = document\.getElementById\("admColPendente"\);(\s+)colPendente\.innerHTML/g },
    { id: 'admColAnalise', regex: /const colAnalise = document\.getElementById\("admColAnalise"\);(\s+)colAnalise\.innerHTML/g },
    { id: 'admColConcluido', regex: /const colConcluido = document\.getElementById\("admColConcluido"\);(\s+)colConcluido\.innerHTML/g },
    { id: 'detalhesTipoVaga', regex: /const elTipo = document\.getElementById\("detalhesTipoVaga"\);(\s+)elTipo\.innerHTML/g },
    { id: 'detalhesInputEncaminhamento', regex: /const elEnc = document\.getElementById\("detalhesInputEncaminhamento"\);(\s+)elEnc\.value = (.*?);/g },
    { id: 'btnOpenNovoProjetoOP', regex: /const btnOp = document\.getElementById\("btnOpenNovoProjetoOP"\);(\s+)if\s*\(!btnOp\)/g }, // this seems already protected! Wait, let's see how it's used.
    { id: 'opInputPublico', regex: /document\.getElementById\("opInputPublico"\)\.value/g, replacement: '(document.getElementById("opInputPublico") ? document.getElementById("opInputPublico").value : "")' }
];

// Let's do a more robust approach for Corrections 8 and 9
fs.writeFileSync('fix.js', 'ok');

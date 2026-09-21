const fs = require('fs');
let code = fs.readFileSync('js/gestao-app.js', 'utf8');
code = code.replace(/target=["']_blank["']/g, 'target="_blank" rel="noopener noreferrer"');
code = code.replace(/rel="noopener noreferrer"(\s+)rel="noopener noreferrer"/g, 'rel="noopener noreferrer"');
fs.writeFileSync('js/gestao-app.js', code, 'utf8');

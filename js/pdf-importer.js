/**
 * pdf-importer.js - Motor de Importação e Parsing de PDF para o SIGE
 * Centro Educacional Pedro Rizzi
 */

if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

let parsedPdfResult = null;

function parseTurmaETurno(rawTurmaStr) {
    if (!rawTurmaStr) return { turma: "101", turno: "Matutino" };

    let turno = "Matutino";
    const upper = rawTurmaStr.toUpperCase();
    if (upper.includes("VESP") || upper.includes("VESPERTINO")) {
        turno = "Vespertino";
    } else if (upper.includes("NOT") || upper.includes("NOTURNO")) {
        turno = "Noturno";
    } else if (upper.includes("MAT") || upper.includes("MATUTINO")) {
        turno = "Matutino";
    }

    // Extrair o número da turma (ex: 101, 102, 203, 504, 601, etc.)
    const matchNumber = rawTurmaStr.match(/\b(\d{3})\b/);
    let turma = "";
    if (matchNumber) {
        turma = matchNumber[1];
    } else {
        // Fallback: limpa prefixos e mantém o código conciso
        turma = rawTurmaStr
            .replace(/^Turma:\s*/i, "")
            .replace(/^\d+º\s+Ano\s*-\s*/i, "")
            .replace(/Total de alunos.*$/i, "")
            .trim();
    }

    return { turma, turno };
}

async function parseAlunosPdfFile(file) {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error("A biblioteca PDF.js não foi carregada no navegador.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let metaImpressoEm = "";
    let currentTurmaCode = "";
    let currentTurno = "";
    const alunos = [];
    const turmasSet = new Set();

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (typeof updatePdfProgress === 'function') {
            updatePdfProgress(`Processando página ${pageNum} de ${pdf.numPages}...`);
        }

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const items = textContent.items;
        if (!items || items.length === 0) continue;

        // Ordenar itens por coordenada Y (linha) e X (coluna)
        items.sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > 3) return yDiff;
            return a.transform[4] - b.transform[4];
        });

        // Agrupar itens por linha
        const lines = [];
        let currentLine = [];
        let currentY = null;

        for (const item of items) {
            const str = item.str ? item.str.trim() : "";
            if (!str) continue;

            const y = item.transform[5];
            if (currentY === null || Math.abs(currentY - y) < 4) {
                currentLine.push(str);
                currentY = y;
            } else {
                lines.push(currentLine.join(" "));
                currentLine = [str];
                currentY = y;
            }
        }
        if (currentLine.length > 0) {
            lines.push(currentLine.join(" "));
        }

        const fullPageText = lines.join("\n");

        // Capturar "Impresso em: DD/MM/YYYY HH:mm"
        const impressoMatch = fullPageText.match(/Impresso em:\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/i);
        if (impressoMatch && !metaImpressoEm) {
            metaImpressoEm = impressoMatch[1];
        }

        // Processar linhas
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Capturar Turma & Turno
            const turmaMatch = line.match(/Turma:\s*([^\n\r]+?)(?:\s+Total|$)/i);
            if (turmaMatch) {
                const parsed = parseTurmaETurno(turmaMatch[1]);
                currentTurmaCode = parsed.turma;
                currentTurno = parsed.turno;
                turmasSet.add(currentTurmaCode);
            }

            // Identificar linha de aluno (Matrícula de 9 a 12 dígitos)
            const rowMatch = line.match(/^(?:\d+\s+)?(\d{9,12})\s+(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+([^\s]+@edu\.itajai\.sc\.gov\.br|\S+@\S+)?(.*)$/i);

            if (rowMatch) {
                const matricula = rowMatch[1];
                const nome = rowMatch[2].trim();
                const dataNasc = rowMatch[3];
                const email = rowMatch[4] || "";
                let restoLinha = rowMatch[5] || "";

                const telefones = [];

                function extractPhonesFromStr(str) {
                    const matches = str.match(/(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/g);
                    if (matches) {
                        matches.forEach(p => {
                            const cleanP = p.replace(/[^\d]/g, "");
                            if (cleanP.length >= 8 && cleanP.length <= 13 && !cleanP.startsWith("2026") && !cleanP.startsWith("2025") && !cleanP.startsWith("2024")) {
                                const formattedPhone = p.trim();
                                if (!telefones.includes(formattedPhone)) {
                                    telefones.push(formattedPhone);
                                }
                            }
                        });
                    }
                }

                extractPhonesFromStr(restoLinha);

                // Olhar linhas subsequentes para telefones empilhados
                let j = i + 1;
                while (j < lines.length) {
                    const subLine = lines[j];
                    if (subLine.match(/^(?:\d+\s+)?\d{9,12}\s+/) || subLine.includes("Turma:") || subLine.includes("Matrícula")) {
                        break;
                    }

                    if (subLine.match(/(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/)) {
                        extractPhonesFromStr(subLine);
                        j++;
                    } else {
                        break;
                    }
                }

                alunos.push({
                    matricula,
                    nome,
                    dataNasc,
                    email,
                    telefones,
                    turma: currentTurmaCode || "101",
                    turno: currentTurno || "Matutino"
                });
            }
        }
    }

    return {
        impressoEm: metaImpressoEm || new Date().toLocaleString("pt-BR"),
        importadoEm: new Date().toLocaleString("pt-BR"),
        totalAlunos: alunos.length,
        turmas: Array.from(turmasSet),
        alunos: alunos
    };
}

function setupPdfDropZoneEvents() {
    ['pdfDropZone', 'inlinePdfDropZone'].forEach(id => {
        const dropZone = document.getElementById(id);
        if (!dropZone || dropZone.dataset.eventsInit) return;
        dropZone.dataset.eventsInit = "true";

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = '#2563eb';
                dropZone.style.background = '#eff6ff';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = '#94a3b8';
                dropZone.style.background = '#f8fafc';
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt ? dt.files : null;
            if (files && files.length > 0) {
                openImportPDFAlunosModal();
                handlePdfFileSelect({ target: { files: files } });
            }
        }, false);
    });
}

function openImportPDFAlunosModal() {
    const modal = document.getElementById("modalImportPDFAlunos");
    if (modal) {
        modal.style.display = "flex";
        resetPdfImporterUI();
        setupPdfDropZoneEvents();
    }
}

function closeImportPDFAlunosModal() {
    const modal = document.getElementById("modalImportPDFAlunos");
    if (modal) {
        modal.style.display = "none";
    }
}

function resetPdfImporterUI() {
    parsedPdfResult = null;
    const progressElem = document.getElementById("pdfParsingProgress");
    const previewElem = document.getElementById("pdfPreviewSection");
    const dropZone = document.getElementById("pdfDropZone");
    const fileInput = document.getElementById("pdfFileInput");

    if (progressElem) progressElem.style.display = "none";
    if (previewElem) previewElem.style.display = "none";
    if (dropZone) dropZone.style.display = "block";
    if (fileInput) fileInput.value = "";
}

function updatePdfProgress(text) {
    const progressElem = document.getElementById("pdfParsingProgress");
    const progressText = document.getElementById("pdfProgressText");
    if (progressElem) progressElem.style.display = "block";
    if (progressText) progressText.innerText = text;
}

async function handlePdfFileSelect(e) {
    const files = e.target.files || (e.dataTransfer && e.dataTransfer.files);
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
        alert("Por favor, selecione um arquivo válido no formato PDF.");
        return;
    }

    const dropZone = document.getElementById("pdfDropZone");
    if (dropZone) dropZone.style.display = "none";

    try {
        updatePdfProgress("Lendo arquivo PDF e identificando páginas...");
        parsedPdfResult = await parseAlunosPdfFile(file);

        const progressElem = document.getElementById("pdfParsingProgress");
        if (progressElem) progressElem.style.display = "none";

        renderPdfPreview(parsedPdfResult);
    } catch (err) {
        console.error("Erro no processamento do PDF:", err);
        alert("Falha ao ler o arquivo PDF: " + err.message);
        resetPdfImporterUI();
    }
}

function renderPdfPreview(result) {
    const previewElem = document.getElementById("pdfPreviewSection");
    const metaDetails = document.getElementById("pdfMetaDetails");
    const tbody = document.getElementById("pdfPreviewTableBody");

    if (!previewElem || !tbody) return;

    if (metaDetails) {
        metaDetails.innerHTML = `
            <strong>Data da Impressão do PDF:</strong> ${result.impressoEm} &nbsp;|&nbsp; 
            <strong>Total de Turmas:</strong> ${result.turmas.length} (${result.turmas.slice(0, 8).join(", ")}) &nbsp;|&nbsp; 
            <strong>Total de Alunos:</strong> ${result.totalAlunos}
        `;
    }

    let html = "";
    const sampleAlunos = result.alunos;

    sampleAlunos.forEach(aluno => {
        const phonesBadge = aluno.telefones.length > 0 
            ? aluno.telefones.map(p => `<span style="background:#eff6ff; color:#1d4ed8; padding:2px 6px; border-radius:4px; margin-right:4px; font-weight:700;">📞 ${p}</span>`).join(" ")
            : `<span style="color:#94a3b8;">Nenhum telefone</span>`;

        html += `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:6px 12px; font-weight:700; color:#475569;">${aluno.matricula}</td>
                <td style="padding:6px 12px; font-weight:800; color:#0f172a;">${aluno.nome}</td>
                <td style="padding:6px 12px; font-weight:900; color:#6366f1;">${aluno.turma}</td>
                <td style="padding:6px 12px; font-weight:800; color:#059669;">${aluno.turno}</td>
                <td style="padding:6px 12px;">${phonesBadge}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    previewElem.style.display = "block";
}

function updateAdminPdfImportMetaInfoDisplay() {
    const metaDiv = document.getElementById("adminPdfImportMetaInfo");
    if (!metaDiv || !window.sigeDB) return;
    const meta = window.sigeDB.getLastPdfImportMeta();
    const alunos = window.sigeDB.getAlunosImportados();

    if (meta && alunos && alunos.length > 0) {
        const turmasMap = {};
        alunos.forEach(a => {
            const t = a.turma || "Sem Turma";
            turmasMap[t] = (turmasMap[t] || 0) + 1;
        });

        const sortedTurmas = Object.keys(turmasMap).sort();
        const turmasBadges = sortedTurmas.map(t => 
            `<span style="background:#e0e7ff; color:#3730a3; padding:3px 8px; border-radius:6px; font-weight:800; font-size:0.78rem; border:1px solid #c7d2fe;">Turma ${t}: ${turmasMap[t]} alunos</span>`
        ).join(" ");

        metaDiv.innerHTML = `
            <div style="width:100%;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                    <span style="font-weight:800; color:#1e3a8a; font-size:0.92rem;">
                        <i class="fa-solid fa-circle-check" style="color:#10b981;"></i> Base de Alunos Ativa: <strong>${alunos.length} Alunos</strong> cadastrados em <strong>${sortedTurmas.length} Turmas</strong>
                    </span>
                    <span style="font-size:0.78rem; color:#64748b; font-weight:600;">
                        <i class="fa-solid fa-clock-rotate-left"></i> Última importação: ${meta.importadoEm || 'Hoje'} (PDF impresso em: <strong>${meta.impressoEm || 'N/A'}</strong>)
                    </span>
                </div>
                <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-top:6px; border-top:1px dashed #cbd5e1; padding-top:8px;">
                    <span style="font-size:0.78rem; font-weight:800; color:#475569;"><i class="fa-solid fa-graduation-cap"></i> Turmas Extraídas:</span>
                    ${turmasBadges}
                </div>
            </div>
        `;
    } else {
        metaDiv.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; width:100%;">
                <i class="fa-solid fa-circle-info" style="color:#0284c7; font-size:1.1rem;"></i>
                <span style="font-weight:700; color:#475569;">Nenhuma base de alunos importada ainda. Clique no botão acima para carregar o arquivo PDF oficial de Alunos Enturmados.</span>
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(updateAdminPdfImportMetaInfoDisplay, 400);
});

function confirmImportPdfData() {
    if (!parsedPdfResult || !parsedPdfResult.alunos || parsedPdfResult.alunos.length === 0) {
        alert("Nenhum aluno válido para importar.");
        return;
    }

    if (window.sigeDB && typeof window.sigeDB.saveAlunosImportados === 'function') {
        window.sigeDB.saveAlunosImportados(parsedPdfResult.alunos, {
            impressoEm: parsedPdfResult.impressoEm,
            importadoEm: parsedPdfResult.importadoEm,
            totalAlunos: parsedPdfResult.totalAlunos,
            totalTurmas: parsedPdfResult.turmas.length
        });
        
        updateAdminPdfImportMetaInfoDisplay();
        alert(`✅ Importação Concluída com Sucesso!\n\nForam cadastrados/atualizados ${parsedPdfResult.totalAlunos} alunos e suas respectivas turmas/turnos/telefones.`);
        closeImportPDFAlunosModal();
    } else {
        alert("Erro: O banco de dados do sistema não está disponível.");
    }
}

window.openImportPDFAlunosModal = openImportPDFAlunosModal;
window.closeImportPDFAlunosModal = closeImportPDFAlunosModal;
window.handlePdfFileSelect = handlePdfFileSelect;
window.confirmImportPdfData = confirmImportPdfData;
window.updateAdminPdfImportMetaInfoDisplay = updateAdminPdfImportMetaInfoDisplay;

/**
 * ASSINATURA & EXPEDIÇÃO DE DOCUMENTOS (SIGE)
 * Centro Educacional Pedro Rizzi - Secretaria & Operacional
 * Permite cadastrar chancelas/carimbos da direção/secretaria,
 * posicionar interativamente em PDFs (upload ou gerados pelo sistema),
 * mesclar via PDF-Lib e expedir via WhatsApp (Evolution API), E-mail e Download.
 */

(function (window) {
    'use strict';

    // Estado local do módulo
    const AssinaturaModule = {
        currentPdfBytes: null,
        currentPdfFile: null,
        currentPdfDoc: null,
        currentPageNum: 1,
        totalPdfPages: 1,
        pdfScale: 1.25,
        currentFileName: 'documento.pdf',
        
        // Estado da assinatura/chancela ativa
        selectedChancelaId: null,
        stampWidth: 220, // pixels no canvas
        stampHeight: 140, // calculado pela proporção e conteúdo completo da chancela
        overlayPos: { x: 50, y: 50 }, // pixels relativos ao canvas
        isDragging: false,
        dragOffset: { x: 0, y: 0 },
        isResizing: false,
        resizeStartX: 0,
        resizeStartWidth: 220,

        // PDF assinado resultante
        signedPdfBytes: null,
        signedPdfBlob: null,
        signedPdfBase64: null,
        signedFileName: '',

        // Filtro do histórico
        historyFilterCanal: 'todos',
        historySearch: ''
    };

    // =========================================================================
    // 1. INICIALIZAÇÃO E RENDERIZAÇÃO PRINCIPAL DO MÓDULO
    // =========================================================================
    function renderModuleAssinaturasDocs() {
        const container = document.getElementById('adminSubTab_assinaturas_docs');
        if (!container) return;

        // Renderiza sub-painéis
        renderChancelasCards();
        renderHistorialExpedicoes();
        atualizarContadoresAssinatura();

        // Se já tiver uma chancela selecionada ou existir alguma no banco, inicializa
        const chancelas = sigeDB.getChancelasAssinaturas().filter(c => c.ativo !== false);
        if (!AssinaturaModule.selectedChancelaId && chancelas.length > 0) {
            selecionarChancelaParaUso(chancelas[0].id);
        }
    }
    window.renderModuleAssinaturasDocs = renderModuleAssinaturasDocs;

    function atualizarContadoresAssinatura() {
        const docs = sigeDB.getDocumentosExpedidos();
        const chancelas = sigeDB.getChancelasAssinaturas().filter(c => c.ativo !== false);

        const elTotal = document.getElementById('statTotalDocsExpedidos');
        if (elTotal) elTotal.textContent = docs.length;

        const elWp = document.getElementById('statDocsEnviadosWhatsapp');
        if (elWp) elWp.textContent = docs.filter(d => d.canal === 'whatsapp').length;

        const elEmail = document.getElementById('statDocsEnviadosEmail');
        if (elEmail) elEmail.textContent = docs.filter(d => d.canal === 'email').length;

        const elChancelas = document.getElementById('statChancelasAtivas');
        if (elChancelas) elChancelas.textContent = chancelas.length;
    }

    // =========================================================================
    // 2. GESTOR DE CHANCELAS E CARIMBOS DA ESCOLA
    // =========================================================================
    function renderChancelasCards() {
        const grid = document.getElementById('chancelasCardsGrid');
        const selectDoc = document.getElementById('selectChancelaMesa');
        if (!grid) return;

        const chancelas = sigeDB.getChancelasAssinaturas();
        const user = sigeDB.getLoggedUser();
        const currentRole = sigeDB.getRole();

        if (chancelas.length === 0) {
            AssinaturaModule.selectedChancelaId = null;
            const overlay = document.getElementById('signatureOverlayBox');
            if (overlay) overlay.style.display = 'none';
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:30px; background:#f8fafc; border:2px dashed #cbd5e1; border-radius:12px; color:#64748b;">
                    <i class="fa-solid fa-stamp" style="font-size:2rem; color:#94a3b8; margin-bottom:8px;"></i>
                    <p style="margin:0; font-weight:700;">Nenhuma chancela ou carimbo cadastrado ainda.</p>
                    <p style="margin:4px 0 12px 0; font-size:0.83rem;">Cadastre a imagem da assinatura com carimbo da Direção ou Secretaria.</p>
                    <button type="button" onclick="openModalNovaChancela()" class="btn btn-primary" style="font-size:0.85rem; width:auto; margin:0 auto;">
                        <i class="fa-solid fa-plus-circle"></i> Cadastrar Primeira Chancela
                    </button>
                </div>
            `;
            if (selectDoc) selectDoc.innerHTML = `<option value="">Nenhuma chancela disponível</option>`;
            return;
        }

        // Se a chancela selecionada for inexistente ou mock excluído, seleciona a primeira chancela válida
        const chancelaSelecionadaValida = chancelas.some(c => c.id === AssinaturaModule.selectedChancelaId);
        if (!chancelaSelecionadaValida) {
            AssinaturaModule.selectedChancelaId = chancelas[0].id;
            const overlay = document.getElementById('signatureOverlayBox');
            const img = document.getElementById('overlayChancelaImg');
            const badge = document.getElementById('overlaySignatarioBadge');
            if (overlay && img && chancelas[0]) {
                img.src = chancelas[0].imagemBase64;
                if (badge) badge.textContent = `${chancelas[0].nome} • ${chancelas[0].cargo}`;
            }
        }

        let gridHtml = '';
        let optionsHtml = '';

        chancelas.forEach(c => {
            const podeUsar = sigeDB.canUserUseChancela(c);
            const isSelected = AssinaturaModule.selectedChancelaId === c.id;
            const borderStyle = isSelected ? 'border: 2px solid #4f46e5; background: #f5f3ff;' : 'border: 1px solid #e2e8f0; background: white;';
            const setorIcon = c.setor === 'direcao' ? '👑 Direção' : (c.setor === 'secretaria' ? '📑 Secretaria' : (c.setor === 'orientacao' ? '💛 OE' : '🟣 Supervisão'));
            const setorBadgeBg = c.setor === 'direcao' ? '#fef3c7; color:#b45309;' : '#ecfdf5; color:#047857;';

            gridHtml += `
                <div class="chancela-card" style="${borderStyle} padding:10px 12px; border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.03); display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                        <span style="background:${setorBadgeBg}; font-size:0.72rem; font-weight:800; padding:2px 6px; border-radius:4px;">${setorIcon}</span>
                        <div style="display:flex; align-items:center; gap:8px;">
                            ${podeUsar ? `<span title="Autorizado" style="color:#10b981; font-size:0.75rem;"><i class="fa-solid fa-circle-check"></i></span>` : `<span title="Restrito" style="color:#ef4444; font-size:0.75rem;"><i class="fa-solid fa-lock"></i></span>`}
                            <button type="button" onclick="openModalEditarChancela('${c.id}')" title="Editar Informações / Imagem" style="background:transparent; border:none; color:#475569; cursor:pointer; font-size:0.82rem; padding:2px;" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='#475569'"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button type="button" onclick="excluirChancela('${c.id}')" title="Excluir Chancela" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:0.82rem; padding:2px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="background:#f8fafc; border-radius:6px; border:1px dashed #cbd5e1; width:110px; height:46px; flex-shrink:0; display:flex; align-items:center; justify-content:center; padding:2px;">
                            <img src="${c.imagemBase64}" alt="${c.nome}" style="max-height:42px; max-width:100%; object-fit:contain;" />
                        </div>
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:800; font-size:0.85rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.nome}</div>
                            <div style="font-size:0.75rem; color:#64748b; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.cargo}</div>
                            ${c.portaria ? `<div style="font-size:0.7rem; color:#94a3b8; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"><i class="fa-solid fa-certificate"></i> ${c.portaria}</div>` : ''}
                        </div>
                    </div>

                    <button type="button" onclick="selecionarChancelaParaUso('${c.id}')" class="btn" style="width:100%; font-size:0.76rem; font-weight:700; padding:5px 8px; ${isSelected ? 'background:#4f46e5; color:white; border:none;' : 'background:#f1f5f9; color:#334155; border:1px solid #cbd5e1;'} cursor:pointer;">
                        ${isSelected ? '<i class="fa-solid fa-check"></i> Em Uso na Mesa' : '<i class="fa-regular fa-hand-pointer"></i> Selecionar na Mesa'}
                    </button>
                </div>
            `;

            optionsHtml += `
                <option value="${c.id}" ${isSelected ? 'selected' : ''}>${c.nome} (${c.cargo})</option>
            `;
        });

        grid.innerHTML = gridHtml;
        if (selectDoc) selectDoc.innerHTML = optionsHtml;
    }
    window.renderChancelasCards = renderChancelasCards;

    // Helper: Formata documento da chancela (CPF, Portaria ou Matrícula)
    function formatarDocumentoChancela(val) {
        if (!val) return '';
        const clean = String(val).trim();
        // Se for 11 dígitos numéricos puros (CPF)
        if (/^\d{11}$/.test(clean)) {
            return `CPF: ${clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`;
        }
        // Se for CPF já pontuado mas sem o prefixo CPF:
        if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(clean)) {
            return `CPF: ${clean}`;
        }
        return clean;
    }
    window.formatarDocumentoChancela = formatarDocumentoChancela;

    function selecionarChancelaParaUso(id) {
        AssinaturaModule.selectedChancelaId = id;
        const chancelas = sigeDB.getChancelasAssinaturas();
        const c = chancelas.find(item => item.id === id);

        renderChancelasCards();

        const overlay = document.getElementById('signatureOverlayBox');
        const img = document.getElementById('overlayChancelaImg');
        const badge = document.getElementById('overlaySignatarioBadge');
        const elNome = document.getElementById('overlayNomeDisplay');
        const elCargo = document.getElementById('overlayCargoDisplay');
        const elPortaria = document.getElementById('overlayPortariaDisplay');
        const elAuth = document.getElementById('overlayAuthDisplay');
        const checkAuth = document.getElementById('checkIncluirAutenticidade');

        if (c && overlay && img) {
            img.src = c.imagemBase64;
            if (badge) badge.textContent = `${c.cargo}`;
            if (elNome) elNome.textContent = (c.nome || '').toUpperCase();
            if (elCargo) elCargo.textContent = c.cargo || '';
            if (elPortaria) {
                const docFmt = formatarDocumentoChancela(c.portaria);
                if (docFmt) {
                    elPortaria.textContent = docFmt;
                    elPortaria.style.display = 'block';
                } else {
                    elPortaria.style.display = 'none';
                }
            }
            if (elAuth && checkAuth) {
                elAuth.style.display = checkAuth.checked ? 'block' : 'none';
            }
            if (AssinaturaModule.currentPdfDoc) {
                overlay.style.display = 'block';
                ajustarPosicaoOverlayNaTela();
            }
        }
    }
    window.selecionarChancelaParaUso = selecionarChancelaParaUso;

    function toggleOverlayAutenticidade(checked) {
        const elAuth = document.getElementById('overlayAuthDisplay');
        if (elAuth) elAuth.style.display = checked ? 'block' : 'none';
        ajustarPosicaoOverlayNaTela();
    }
    window.toggleOverlayAutenticidade = toggleOverlayAutenticidade;

    function openModalNovaChancela() {
        const modal = document.getElementById('modalNovaChancela');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('formNovaChancela')?.reset();
            const editId = document.getElementById('chancelaInputEditId');
            if (editId) editId.value = '';
            const title = document.getElementById('chancelaModalTitleText');
            if (title) title.innerHTML = '<i class="fa-solid fa-stamp" style="color:#059669;"></i> Cadastrar Chancela / Carimbo Oficial';
            const btn = document.getElementById('btnSubmitChancela');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-check"></i> Cadastrar Chancela';
            const hint = document.getElementById('chancelaImageHint');
            if (hint) hint.textContent = 'Formatos recomendados: PNG transparente ou foto nítida em papel branco.';
            const preview = document.getElementById('previewNovaChancelaImg');
            if (preview) {
                preview.src = '';
                preview.style.display = 'none';
            }
        }
    }
    window.openModalNovaChancela = openModalNovaChancela;

    function openModalEditarChancela(id) {
        const c = sigeDB.getChancelasAssinaturas().find(item => item.id === id);
        if (!c) return;

        const modal = document.getElementById('modalNovaChancela');
        if (!modal) return;

        modal.style.display = 'flex';
        document.getElementById('formNovaChancela')?.reset();

        const editId = document.getElementById('chancelaInputEditId');
        if (editId) editId.value = c.id;

        const inpNome = document.getElementById('chancelaInputNome');
        if (inpNome) inpNome.value = c.nome || '';

        const inpCargo = document.getElementById('chancelaInputCargo');
        if (inpCargo) inpCargo.value = c.cargo || '';

        const inpSetor = document.getElementById('chancelaInputSetor');
        if (inpSetor) inpSetor.value = c.setor || 'direcao';

        const inpPortaria = document.getElementById('chancelaInputPortaria');
        if (inpPortaria) inpPortaria.value = c.portaria || '';

        const title = document.getElementById('chancelaModalTitleText');
        if (title) title.innerHTML = '<i class="fa-solid fa-pen-to-square" style="color:#2563eb;"></i> Editar Chancela / Carimbo Oficial';

        const btn = document.getElementById('btnSubmitChancela');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações';

        const hint = document.getElementById('chancelaImageHint');
        if (hint) hint.textContent = 'Carimbo atual carregado. Deixe o campo de arquivo em branco se não quiser alterar a imagem.';

        const preview = document.getElementById('previewNovaChancelaImg');
        if (preview && c.imagemBase64) {
            preview.src = c.imagemBase64;
            preview.style.display = 'block';
        }
    }
    window.openModalEditarChancela = openModalEditarChancela;

    function closeModalNovaChancela() {
        const modal = document.getElementById('modalNovaChancela');
        if (modal) modal.style.display = 'none';
    }
    window.closeModalNovaChancela = closeModalNovaChancela;

    // Converte arquivo de imagem (PNG/JPG) com opção de remover fundo branco para transparência limpa
    async function processarImagemChancela(file, removerFundoBranco = true) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Limita as dimensões máximas para otimizar tamanho do armazenamento (máx 640x300)
                    const maxW = 640;
                    const maxH = 300;
                    let targetW = img.width;
                    let targetH = img.height;

                    if (targetW > maxW || targetH > maxH) {
                        const ratio = Math.min(maxW / targetW, maxH / targetH);
                        targetW = Math.max(1, Math.round(targetW * ratio));
                        targetH = Math.max(1, Math.round(targetH * ratio));
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = targetW;
                    canvas.height = targetH;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, targetW, targetH);

                    if (removerFundoBranco) {
                        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const d = imgData.data;
                        // Converte pixels claros (fundo de papel escaneado) em transparentes
                        for (let i = 0; i < d.length; i += 4) {
                            const r = d[i];
                            const g = d[i + 1];
                            const b = d[i + 2];
                            // Se for quase branco ou cinza muito claro
                            if (r > 220 && g > 220 && b > 220) {
                                d[i + 3] = 0; // alfa zero
                            } else if (r > 195 && g > 195 && b > 195) {
                                // Suavização de borda (antialiasing)
                                const alphaFactor = (255 - Math.max(r, g, b)) / 60;
                                d[i + 3] = Math.min(255, Math.floor(d[i + 3] * Math.max(0, alphaFactor)));
                            }
                        }
                        ctx.putImageData(imgData, 0, 0);
                    }

                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = () => reject(new Error('Imagem inválida'));
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async function salvarNovaChancela(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const editId = document.getElementById('chancelaInputEditId')?.value || '';
        const nome = document.getElementById('chancelaInputNome').value.trim();
        const cargo = document.getElementById('chancelaInputCargo').value.trim();
        const setor = document.getElementById('chancelaInputSetor').value;
        const portaria = document.getElementById('chancelaInputPortaria').value.trim();
        const fileInput = document.getElementById('chancelaInputFile');
        const removerFundo = document.getElementById('chancelaCheckRemoverFundo')?.checked ?? true;

        if (!nome || !cargo) {
            showToast('Preencha os campos obrigatórios do signatário.');
            return;
        }

        const temNovoArquivo = Boolean(fileInput.files && fileInput.files[0]);

        if (!editId && !temNovoArquivo) {
            showToast('Por favor, anexe uma imagem com a assinatura e o carimbo.');
            return;
        }

        try {
            let base64Png = '';
            if (temNovoArquivo) {
                showToast('Processando e otimizando carimbo...');
                base64Png = await processarImagemChancela(fileInput.files[0], removerFundo);
            }

            const nowIso = new Date().toISOString();

            if (editId) {
                const chancelas = sigeDB.getChancelasAssinaturas();
                const existente = chancelas.find(c => c.id === editId);
                if (!existente) {
                    showToast('Chancela não encontrada.');
                    return;
                }
                existente.nome = nome;
                existente.cargo = cargo;
                existente.setor = setor;
                existente.portaria = portaria;
                existente.atualizadoEm = nowIso;
                if (base64Png) {
                    existente.imagemBase64 = base64Png;
                }
                sigeDB.saveChancelaAssinatura(existente);
                showToast(`Chancela de ${nome} atualizada com sucesso!`);
                if (AssinaturaModule.selectedChancelaId === editId) {
                    selecionarChancelaParaUso(editId);
                }
            } else {
                const novaChancela = {
                    nome,
                    cargo,
                    setor,
                    portaria,
                    imagemBase64: base64Png,
                    permissoesUso: ['direcao', 'secretaria', 'admin', 'desenvolvedor'],
                    ativo: true,
                    criadoEm: nowIso,
                    atualizadoEm: nowIso
                };

                const salva = sigeDB.saveChancelaAssinatura(novaChancela);
                showToast(`Chancela de ${nome} cadastrada com sucesso!`);
                selecionarChancelaParaUso(salva.id);
            }

            closeModalNovaChancela();
            renderChancelasCards();
            renderModuleAssinaturasDocs();
        } catch (err) {
            console.error('Erro ao salvar chancela:', err);
            showToast('Falha ao processar a chancela: ' + err.message);
        }
    }
    window.salvarNovaChancela = salvarNovaChancela;

    function excluirChancela(id) {
        const c = sigeDB.getChancelasAssinaturas().find(item => item.id === id);
        if (!c) {
            showToast('Chancela não encontrada ou já excluída.');
            return;
        }
        if (!confirm(`Deseja realmente excluir a chancela de "${c.nome}"?`)) return;

        sigeDB.deleteChancelaAssinatura(id);
        if (AssinaturaModule.selectedChancelaId === id) {
            AssinaturaModule.selectedChancelaId = null;
            const overlay = document.getElementById('signatureOverlayBox');
            if (overlay) overlay.style.display = 'none';
        }
        showToast(`Chancela de "${c.nome}" removida.`);
        renderChancelasCards();
        renderModuleAssinaturasDocs();
    }
    window.excluirChancela = excluirChancela;

    // =========================================================================
    // 3. CARREGAMENTO E GERENCIAMENTO DO ARQUIVO PDF (UPLOAD OU SISTEMA)
    // =========================================================================
    async function carregarPdfFile(file) {
        if (!file) return;
        if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
            showToast('O arquivo selecionado deve ser um documento PDF (.pdf).');
            return;
        }

        try {
            showToast(`Carregando documento "${file.name}"...`);
            AssinaturaModule.currentPdfFile = file;
            const arrayBuffer = await file.arrayBuffer();
            AssinaturaModule.currentPdfBytes = new Uint8Array(arrayBuffer);
            AssinaturaModule.currentFileName = file.name;
            AssinaturaModule.currentPageNum = 1;
            AssinaturaModule.signedPdfBytes = null; // limpa anterior

            await inicializarVisualizadorPdf();
        } catch (err) {
            console.error('Erro ao carregar PDF:', err);
            showToast('Erro ao carregar o PDF: ' + err.message);
        }
    }
    window.carregarPdfFile = carregarPdfFile;

    // Helper: Garante que os bytes do PDF comecem com o cabeçalho mágico %PDF- (0x25 0x50 0x44 0x46 0x2D)
    function sanitizePdfBytes(bytes) {
        if (!bytes || bytes.length === 0) return bytes;
        const maxSearch = Math.min(bytes.length, 2048);
        for (let i = 0; i < maxSearch - 4; i++) {
            if (
                bytes[i] === 0x25 && // %
                bytes[i + 1] === 0x50 && // P
                bytes[i + 2] === 0x44 && // D
                bytes[i + 3] === 0x46 && // F
                bytes[i + 4] === 0x2D    // -
            ) {
                if (i === 0) return bytes;
                console.warn(`[AssinaturaModule] Removendo ${i} bytes de cabeçalho extra antes de %PDF-`);
                return bytes.slice(i);
            }
        }
        return bytes;
    }

    async function inicializarVisualizadorPdf() {
        // Se buffer foi desanexado ou está vazio, tenta reler do arquivo original
        if ((!AssinaturaModule.currentPdfBytes || AssinaturaModule.currentPdfBytes.byteLength === 0) && AssinaturaModule.currentPdfFile) {
            try {
                const arrayBuffer = await AssinaturaModule.currentPdfFile.arrayBuffer();
                AssinaturaModule.currentPdfBytes = new Uint8Array(arrayBuffer);
            } catch (err) {
                console.warn('Não foi possível reler o arquivo PDF original:', err);
            }
        }

        if (!AssinaturaModule.currentPdfBytes || AssinaturaModule.currentPdfBytes.byteLength === 0) return;

        if (typeof pdfjsLib === 'undefined') {
            showToast('Biblioteca PDF.js não encontrada.');
            return;
        }

        // Sanitiza cabeçalho
        AssinaturaModule.currentPdfBytes = sanitizePdfBytes(AssinaturaModule.currentPdfBytes);

        // CLONA O Uint8Array antes de passar ao PDF.js para impedir que o Web Worker desanexe (detach) o buffer!
        const pdfDataClone = AssinaturaModule.currentPdfBytes.slice();
        const loadingTask = pdfjsLib.getDocument({ data: pdfDataClone });
        AssinaturaModule.currentPdfDoc = await loadingTask.promise;
        AssinaturaModule.totalPdfPages = AssinaturaModule.currentPdfDoc.numPages;

        document.getElementById('pdfMetaFileName').textContent = AssinaturaModule.currentFileName;
        document.getElementById('pdfMesaTrabalhoContainer').style.display = 'block';
        document.getElementById('pdfEmptyPlaceholder').style.display = 'none';
        document.getElementById('pdfSignedSuccessAlert').style.display = 'none';

        await renderizarPaginaPdf(AssinaturaModule.currentPageNum);
        setupInteracaoMesaOverlay();
    }

    async function renderizarPaginaPdf(numPagina) {
        if (!AssinaturaModule.currentPdfDoc) return;

        AssinaturaModule.currentPageNum = Math.max(1, Math.min(numPagina, AssinaturaModule.totalPdfPages));
        const page = await AssinaturaModule.currentPdfDoc.getPage(AssinaturaModule.currentPageNum);

        const canvas = document.getElementById('pdfViewerCanvas');
        const ctx = canvas.getContext('2d');

        // Calcula escala adequada para visualização nítida na tela
        const viewport = page.getViewport({ scale: AssinaturaModule.pdfScale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        await page.render(renderContext).promise;

        // Atualiza indicadores de página
        const elNum = document.getElementById('pdfCurrentPageNum');
        const elTotal = document.getElementById('pdfTotalPages');
        if (elNum) elNum.textContent = AssinaturaModule.currentPageNum;
        if (elTotal) elTotal.textContent = AssinaturaModule.totalPdfPages;

        // Se houver chancela selecionada, exibe o overlay na tela
        const overlay = document.getElementById('signatureOverlayBox');
        if (overlay && AssinaturaModule.selectedChancelaId) {
            overlay.style.display = 'block';
            ajustarPosicaoOverlayNaTela();
        }
    }
    window.renderizarPaginaPdf = renderizarPaginaPdf;

    function navegarPaginaPdf(delta) {
        if (!AssinaturaModule.currentPdfDoc) return;
        const nova = AssinaturaModule.currentPageNum + delta;
        if (nova >= 1 && nova <= AssinaturaModule.totalPdfPages) {
            renderizarPaginaPdf(nova);
        }
    }
    window.navegarPaginaPdf = navegarPaginaPdf;

    function limparPdfMesa() {
        AssinaturaModule.currentPdfBytes = null;
        AssinaturaModule.currentPdfFile = null;
        AssinaturaModule.currentPdfDoc = null;
        AssinaturaModule.currentFileName = '';
        AssinaturaModule.currentPageNum = 1;
        AssinaturaModule.totalPdfPages = 1;
        AssinaturaModule.signedPdfBytes = null;
        AssinaturaModule.signedPdfBlob = null;
        AssinaturaModule.signedPdfBase64 = null;
        AssinaturaModule.signedFileName = '';

        const container = document.getElementById('pdfMesaTrabalhoContainer');
        if (container) container.style.display = 'none';

        const placeholder = document.getElementById('pdfEmptyPlaceholder');
        if (placeholder) placeholder.style.display = 'block';

        const successAlert = document.getElementById('pdfSignedSuccessAlert');
        if (successAlert) successAlert.style.display = 'none';

        const canvas = document.getElementById('pdfViewerCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;
        }

        const overlay = document.getElementById('signatureOverlayBox');
        if (overlay) overlay.style.display = 'none';

        const fileInput = document.getElementById('pdfExternalFileInput');
        if (fileInput) fileInput.value = '';

        showToast('Documento PDF removido da mesa de trabalho.');
    }
    window.limparPdfMesa = limparPdfMesa;

    // =========================================================================
    // 4. MESA DE POSICIONAMENTO INTERATIVO DA ASSINATURA (OPÇÃO 1-A)
    // =========================================================================
    function setupInteracaoMesaOverlay() {
        const canvas = document.getElementById('pdfViewerCanvas');
        const overlay = document.getElementById('signatureOverlayBox');
        const resizeHandle = document.getElementById('overlayResizeHandle');
        const wrapper = document.getElementById('pdfCanvasWrapper');

        if (!canvas || !overlay) return;

        // 1. Clique no Canvas posiciona a assinatura centralizada no clique
        canvas.onclick = (e) => {
            if (AssinaturaModule.isDragging || AssinaturaModule.isResizing) return;
            const rect = canvas.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;

            AssinaturaModule.overlayPos.x = Math.max(0, Math.min(rect.width - AssinaturaModule.stampWidth, clickX - (AssinaturaModule.stampWidth / 2)));
            AssinaturaModule.overlayPos.y = Math.max(0, Math.min(rect.height - AssinaturaModule.stampHeight, clickY - (AssinaturaModule.stampHeight / 2)));

            ajustarPosicaoOverlayNaTela();
        };

        // 2. Drag and drop do overlay
        overlay.onmousedown = (e) => {
            if (e.target === resizeHandle) return;
            AssinaturaModule.isDragging = true;
            AssinaturaModule.dragOffset.x = e.clientX - overlay.offsetLeft;
            AssinaturaModule.dragOffset.y = e.clientY - overlay.offsetTop;
            overlay.style.cursor = 'grabbing';
            e.preventDefault();
        };

        // 3. Redimensionamento pelo canto
        if (resizeHandle) {
            resizeHandle.onmousedown = (e) => {
                AssinaturaModule.isResizing = true;
                AssinaturaModule.resizeStartX = e.clientX;
                AssinaturaModule.resizeStartWidth = AssinaturaModule.stampWidth;
                e.stopPropagation();
                e.preventDefault();
            };
        }

        window.onmousemove = (e) => {
            if (AssinaturaModule.isDragging) {
                const wrapperRect = wrapper.getBoundingClientRect();
                const newX = e.clientX - wrapperRect.left - AssinaturaModule.dragOffset.x;
                const newY = e.clientY - wrapperRect.top - AssinaturaModule.dragOffset.y;
                const maxW = canvas.clientWidth || wrapperRect.width;
                const maxH = canvas.clientHeight || wrapperRect.height;

                AssinaturaModule.overlayPos.x = Math.max(0, Math.min(maxW - AssinaturaModule.stampWidth, newX));
                AssinaturaModule.overlayPos.y = Math.max(0, Math.min(maxH - AssinaturaModule.stampHeight, newY));

                ajustarPosicaoOverlayNaTela();
            } else if (AssinaturaModule.isResizing) {
                const delta = e.clientX - AssinaturaModule.resizeStartX;
                const newW = Math.max(140, Math.min(420, AssinaturaModule.resizeStartWidth + delta));
                setTamanhoAssinatura(newW);
            }
        };

        window.onmouseup = () => {
            if (AssinaturaModule.isDragging) {
                AssinaturaModule.isDragging = false;
                overlay.style.cursor = 'move';
            }
            if (AssinaturaModule.isResizing) {
                AssinaturaModule.isResizing = false;
            }
        };

        // Suporte para Dispositivos Touch / Tablets
        overlay.ontouchstart = (e) => {
            if (e.touches && e.touches[0]) {
                const touch = e.touches[0];
                AssinaturaModule.isDragging = true;
                AssinaturaModule.dragOffset.x = touch.clientX - overlay.offsetLeft;
                AssinaturaModule.dragOffset.y = touch.clientY - overlay.offsetTop;
            }
        };

        window.ontouchmove = (e) => {
            if (AssinaturaModule.isDragging && e.touches && e.touches[0]) {
                const touch = e.touches[0];
                const wrapperRect = wrapper.getBoundingClientRect();
                const newX = touch.clientX - wrapperRect.left - AssinaturaModule.dragOffset.x;
                const newY = touch.clientY - wrapperRect.top - AssinaturaModule.dragOffset.y;
                const maxW = canvas.clientWidth || wrapperRect.width;
                const maxH = canvas.clientHeight || wrapperRect.height;

                AssinaturaModule.overlayPos.x = Math.max(0, Math.min(maxW - AssinaturaModule.stampWidth, newX));
                AssinaturaModule.overlayPos.y = Math.max(0, Math.min(maxH - AssinaturaModule.stampHeight, newY));

                ajustarPosicaoOverlayNaTela();
                e.preventDefault();
            }
        };

        window.ontouchend = () => {
            AssinaturaModule.isDragging = false;
        };

        // Posição padrão inicial: Canto inferior direito da página
        posicionarAssinaturaPreset('rodape_direita');
    }

    function ajustarPosicaoOverlayNaTela() {
        const overlay = document.getElementById('signatureOverlayBox');
        const canvas = document.getElementById('pdfViewerCanvas');
        if (!overlay) return;

        const maxW = canvas ? (canvas.clientWidth || canvas.offsetWidth) : 800;
        const maxH = canvas ? (canvas.clientHeight || canvas.offsetHeight) : 1000;

        overlay.style.width = `${AssinaturaModule.stampWidth}px`;
        overlay.style.height = 'auto';

        const actualH = overlay.offsetHeight || AssinaturaModule.stampHeight;
        AssinaturaModule.stampHeight = actualH;

        AssinaturaModule.overlayPos.x = Math.max(0, Math.min(maxW - AssinaturaModule.stampWidth, AssinaturaModule.overlayPos.x));
        AssinaturaModule.overlayPos.y = Math.max(0, Math.min(maxH - actualH, AssinaturaModule.overlayPos.y));

        overlay.style.left = `${AssinaturaModule.overlayPos.x}px`;
        overlay.style.top = `${AssinaturaModule.overlayPos.y}px`;

        const coordDisplay = document.getElementById('stampCoordIndicator');
        if (coordDisplay) {
            coordDisplay.textContent = `X: ${Math.round(AssinaturaModule.overlayPos.x)}px | Y: ${Math.round(AssinaturaModule.overlayPos.y)}px (Pág. ${AssinaturaModule.currentPageNum})`;
        }
    }

    function setTamanhoAssinatura(larguraPx) {
        AssinaturaModule.stampWidth = Number(larguraPx);

        const slider = document.getElementById('sliderStampSize');
        if (slider && Number(slider.value) !== Number(larguraPx)) {
            slider.value = larguraPx;
        }
        const label = document.getElementById('stampSizeLabel');
        if (label) label.textContent = `${larguraPx}px`;

        ajustarPosicaoOverlayNaTela();
    }
    window.setTamanhoAssinatura = setTamanhoAssinatura;

    function posicionarAssinaturaPreset(preset) {
        const canvas = document.getElementById('pdfViewerCanvas');
        if (!canvas) return;

        const cw = canvas.clientWidth || canvas.getBoundingClientRect().width || 600;
        const ch = canvas.clientHeight || canvas.getBoundingClientRect().height || 850;
        const sw = AssinaturaModule.stampWidth;
        const sh = AssinaturaModule.stampHeight;

        if (preset === 'rodape_direita') {
            AssinaturaModule.overlayPos.x = Math.max(0, cw - sw - 30);
            AssinaturaModule.overlayPos.y = Math.max(0, ch - sh - 35);
        } else if (preset === 'rodape_centro') {
            AssinaturaModule.overlayPos.x = Math.max(0, (cw - sw) / 2);
            AssinaturaModule.overlayPos.y = Math.max(0, ch - sh - 35);
        } else if (preset === 'rodape_esquerda') {
            AssinaturaModule.overlayPos.x = 30;
            AssinaturaModule.overlayPos.y = Math.max(0, ch - sh - 35);
        }

        ajustarPosicaoOverlayNaTela();
    }
    window.posicionarAssinaturaPreset = posicionarAssinaturaPreset;

    // =========================================================================
    // 5. PROCESSAMENTO E MESCLAGEM VIA PDF-LIB
    // =========================================================================

    /**
     * Gera o carimbo oficial unificado em alta resolução (Retina / 300 DPI):
     * Contém: Imagem da Rubrica + Linha divisória + Nome + Cargo + Portaria + Autenticação (2 linhas)
     */
    async function gerarChancelaCompletaCanvas(chancela, incluirAuth, authCode, dataHoraStr) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    // Largura base em alta resolução para renderização cristalina na impressão
                    const targetW = 600;

                    // Mede a proporção da rubrica
                    const origW = img.naturalWidth || img.width || 320;
                    const origH = img.naturalHeight || img.height || 120;
                    const aspect = origH / origW;

                    // Ajusta tamanho da rubrica proporcionalmente
                    let rubricaW = Math.min(380, targetW * 0.65);
                    let rubricaH = Math.round(rubricaW * aspect);
                    if (rubricaH > 130) {
                        rubricaH = 130;
                        rubricaW = Math.round(rubricaH / aspect);
                    }

                    const docFormatado = formatarDocumentoChancela(chancela.portaria);

                    // Cálculo da altura dinâmica do carimbo
                    let totalH = rubricaH + 2; // Imagem imediatamente acima da linha!
                    totalH += 6; // Linha divisória
                    totalH += 26; // Nome
                    totalH += 22; // Cargo
                    if (docFormatado) {
                        totalH += 20; // CPF / Portaria / Matrícula
                    }
                    if (incluirAuth) {
                        totalH += 46; // Autenticação dividida em 2 linhas compactas
                    }
                    totalH += 8; // margem inferior

                    const canvas = document.createElement('canvas');
                    canvas.width = targetW;
                    canvas.height = totalH;
                    const ctx = canvas.getContext('2d');

                    // Fundo transparente
                    ctx.clearRect(0, 0, targetW, totalH);

                    let y = 0;

                    // 1. Imagem da rubrica centralizada
                    const rubricaX = Math.round((targetW - rubricaW) / 2);
                    ctx.drawImage(img, rubricaX, y, rubricaW, rubricaH);
                    y += rubricaH; // Linha bem próxima da imagem manuscrita!

                    // 2. Linha divisória horizontal (bem próxima da assinatura)
                    ctx.strokeStyle = '#334155';
                    ctx.lineWidth = 1.8;
                    ctx.beginPath();
                    const lineMargin = Math.round(targetW * 0.08);
                    ctx.moveTo(lineMargin, y);
                    ctx.lineTo(targetW - lineMargin, y);
                    ctx.stroke();
                    y += 20;

                    // 3. Nome do signatário (negrito, caixa alta)
                    ctx.fillStyle = '#0f172a';
                    ctx.font = 'bold 21px "Segoe UI", Arial, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'alphabetic';
                    ctx.fillText((chancela.nome || '').toUpperCase(), targetW / 2, y);
                    y += 22;

                    // 4. Cargo Oficial
                    ctx.fillStyle = '#1e293b';
                    ctx.font = '600 17px "Segoe UI", Arial, sans-serif';
                    ctx.fillText(chancela.cargo || '', targetW / 2, y);
                    y += 20;

                    // 5. CPF / Portaria / Matrícula (se houver)
                    if (docFormatado) {
                        ctx.fillStyle = '#475569';
                        ctx.font = '600 14px "Segoe UI", Arial, sans-serif';
                        ctx.fillText(docFormatado, targetW / 2, y);
                        y += 18;
                    }

                    // 6. Autenticação Eletrônica IntegraRizzi (2 linhas)
                    if (incluirAuth) {
                        y += 4;
                        ctx.strokeStyle = '#cbd5e1';
                        ctx.lineWidth = 1;
                        ctx.setLineDash([4, 4]);
                        ctx.beginPath();
                        ctx.moveTo(targetW * 0.15, y);
                        ctx.lineTo(targetW * 0.85, y);
                        ctx.stroke();
                        ctx.setLineDash([]);
                        y += 16;

                        ctx.fillStyle = '#475569';
                        ctx.font = 'normal 12px "Segoe UI", Arial, sans-serif';
                        ctx.fillText('Autenticado digitalmente pelo IntegraRizzi • C.E. Pedro Rizzi', targetW / 2, y);
                        y += 15;

                        ctx.fillStyle = '#64748b';
                        ctx.font = 'normal 11px "Segoe UI", Arial, sans-serif';
                        ctx.fillText(`${dataHoraStr} • Cód: ${authCode}`, targetW / 2, y);
                    }

                    canvas.toBlob(blob => {
                        if (!blob) {
                            reject(new Error('Falha ao gerar blob do selo'));
                            return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => resolve({
                            bytes: new Uint8Array(reader.result),
                            aspectRatio: totalH / targetW
                        });
                        reader.onerror = reject;
                        reader.readAsArrayBuffer(blob);
                    }, 'image/png');
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = () => reject(new Error('Falha ao renderizar carimbo da chancela'));
            img.src = chancela.imagemBase64;
        });
    }

    async function aplicarAssinaturaNoPdf() {
        // Se o buffer estiver vazio ou foi desanexado, tenta reler do arquivo original
        if ((!AssinaturaModule.currentPdfBytes || AssinaturaModule.currentPdfBytes.byteLength === 0) && AssinaturaModule.currentPdfFile) {
            try {
                const buf = await AssinaturaModule.currentPdfFile.arrayBuffer();
                AssinaturaModule.currentPdfBytes = new Uint8Array(buf);
            } catch (e) {
                console.warn('Erro ao reler arquivo original na mesclagem:', e);
            }
        }

        if (!AssinaturaModule.currentPdfBytes || AssinaturaModule.currentPdfBytes.byteLength === 0) {
            showToast('Nenhum documento PDF aberto na mesa de trabalho.');
            return;
        }

        const chancela = sigeDB.getChancelasAssinaturas().find(c => c.id === AssinaturaModule.selectedChancelaId);
        if (!chancela) {
            showToast('Por favor, selecione uma chancela oficial para aplicar.');
            return;
        }

        // Validação de Permissão RBAC
        if (!sigeDB.canUserUseChancela(chancela)) {
            showToast(`⚠️ Permissão negada: o perfil ativo não tem autorização para assinar com a chancela da ${chancela.cargo}.`);
            return;
        }

        if (typeof PDFLib === 'undefined') {
            showToast('Biblioteca PDF-Lib não carregada.');
            return;
        }

        try {
            showToast('Mesclando assinatura e gerando documento autenticado...');

            // Sanitiza os bytes do PDF (garante %PDF- no início e faz cópia segura)
            const cleanBytes = sanitizePdfBytes(AssinaturaModule.currentPdfBytes);
            const bytesParaCarregar = cleanBytes.slice();

            // 1. Carrega documento no PDF-Lib
            const pdfDoc = await PDFLib.PDFDocument.load(bytesParaCarregar, { ignoreEncryption: true });
            const pages = pdfDoc.getPages();
            const targetPageIndex = AssinaturaModule.currentPageNum - 1;
            const targetPage = pages[targetPageIndex] || pages[0];

            // 2. Prepara dados de autenticidade (em 2 linhas compactas com código IntegraRizzi)
            const checkAuth = document.getElementById('checkIncluirAutenticidade')?.checked ?? true;
            const now = new Date();
            const authCode = 'IR-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const dataHoraStr = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;

            // 3. Converte a chancela completa (rubrica + nome + cargo + CPF/portaria + autenticação) em PNG nítido
            const seloResult = await gerarChancelaCompletaCanvas(chancela, checkAuth, authCode, dataHoraStr);
            const embeddedSeal = await pdfDoc.embedPng(seloResult.bytes);

            // 4. Mapeamento preciso de coordenadas e rotação nativa do PDF
            const canvas = document.getElementById('pdfViewerCanvas');
            const dispW = canvas.clientWidth || canvas.getBoundingClientRect().width || 600;
            const dispH = canvas.clientHeight || canvas.getBoundingClientRect().height || 850;

            const pdfJsPage = await AssinaturaModule.currentPdfDoc.getPage(AssinaturaModule.currentPageNum);
            const pdfJsViewport = pdfJsPage.getViewport({ scale: AssinaturaModule.pdfScale });

            // Proporção entre pixels CSS na tela e o Viewport do PDF.js
            const scaleRatioX = pdfJsViewport.width / dispW;
            const scaleRatioY = pdfJsViewport.height / dispH;

            const vpLeft = AssinaturaModule.overlayPos.x * scaleRatioX;
            const vpTop = AssinaturaModule.overlayPos.y * scaleRatioY;
            const vpWidth = AssinaturaModule.stampWidth * scaleRatioX;
            const vpHeight = AssinaturaModule.stampHeight * scaleRatioY;

            // Ponto inferior-esquerdo visual mapeado diretamente pelo PDF.js (lida perfeitamente com rotação 0, 90, 180, 270)
            const [pdfX, pdfY] = pdfJsViewport.convertToPdfPoint(vpLeft, vpTop + vpHeight);
            const pdfW = vpWidth / AssinaturaModule.pdfScale;
            const pdfH = vpHeight / AssinaturaModule.pdfScale;

            const pageRot = (targetPage.getRotation()?.angle || 0) % 360;

            // 5. Desenha o selo completo no PDF
            targetPage.drawImage(embeddedSeal, {
                x: pdfX,
                y: pdfY,
                width: pdfW,
                height: pdfH,
                rotate: PDFLib.degrees(pageRot)
            });

            // 6. Salva o PDF final
            const signedBytes = await pdfDoc.save();
            AssinaturaModule.signedPdfBytes = signedBytes;
            AssinaturaModule.signedPdfBlob = new Blob([signedBytes], { type: 'application/pdf' });

            // Gera Base64 limpa
            const reader = new FileReader();
            reader.readAsDataURL(AssinaturaModule.signedPdfBlob);
            reader.onloadend = () => {
                AssinaturaModule.signedPdfBase64 = reader.result;
            };

            const baseName = AssinaturaModule.currentFileName.replace(/\.pdf$/i, '');
            AssinaturaModule.signedFileName = `${baseName}_assinado.pdf`;

            // 7. Registra imediatamente no livro de auditoria e autenticidade do IntegraRizzi
            const logged = sigeDB.getLoggedUser();
            const authRecord = {
                id: typeof generateSecureId === 'function' ? generateSecureId('docexp') : ('doc_' + Date.now()),
                codigoAutenticidade: authCode,
                titulo: AssinaturaModule.signedFileName,
                nomeArquivo: AssinaturaModule.signedFileName,
                signatarioId: chancela.id,
                signatarioNome: chancela.nome,
                signatarioCargo: chancela.cargo,
                signatarioDoc: formatarDocumentoChancela(chancela.portaria),
                operador: logged ? (logged.nome || logged.email) : 'Operador Escolar',
                operadorPerfil: sigeDB.getRole() || 'Secretaria',
                dataHora: now.toISOString(),
                dataHoraFormatada: dataHoraStr,
                canal: 'assinado',
                status: 'valido',
                tamanhoBytes: signedBytes.length
            };
            sigeDB.addDocumentoExpedido(authRecord);
            AssinaturaModule.currentAuthRecordId = authRecord.id;

            // Exibe mensagem de sucesso e botões de expedição
            document.getElementById('pdfSignedSuccessAlert').style.display = 'flex';
            document.getElementById('pdfSignedFileNameDisplay').textContent = `${AssinaturaModule.signedFileName} (Cód: ${authCode})`;

            showToast(`✅ Documento assinado com sucesso! Código gerado: ${authCode}`);

            // Oculta o overlay interativo para exibir o resultado final limpo
            const overlay = document.getElementById('signatureOverlayBox');
            if (overlay) overlay.style.display = 'none';
            AssinaturaModule.selectedChancelaId = null;
            renderChancelasCards();
            renderHistorialExpedicoes();
            atualizarContadoresAssinatura();

            // Atualiza a visualização no canvas com o PDF assinado (Uint8Array clonado)
            AssinaturaModule.currentPdfBytes = new Uint8Array(signedBytes);
            await inicializarVisualizadorPdf();

        } catch (err) {
            console.error('Erro ao mesclar PDF:', err);
            showToast('Falha ao assinar documento: ' + err.message);
        }
    }
    window.aplicarAssinaturaNoPdf = aplicarAssinaturaNoPdf;

    // =========================================================================
    // 6. EXPEDIÇÃO: DOWNLOAD, WHATSAPP E E-MAIL
    // =========================================================================
    
    // 6.1 Download direto do PDF
    function baixarDocumentoAssinado() {
        if (!AssinaturaModule.signedPdfBlob) {
            showToast('Nenhum documento assinado para download. Clique em "Carimbar e Assinar" primeiro.');
            return;
        }

        const url = URL.createObjectURL(AssinaturaModule.signedPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = AssinaturaModule.signedFileName || 'documento_assinado.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Registra ou atualiza no histórico de auditoria
        if (AssinaturaModule.currentAuthRecordId) {
            sigeDB.updateDocumentoExpedido(AssinaturaModule.currentAuthRecordId, {
                canal: 'download',
                destinatario: 'Download Local (Secretaria)',
                status: 'concluido'
            });
        } else {
            const chancela = sigeDB.getChancelasAssinaturas().find(c => c.id === AssinaturaModule.selectedChancelaId);
            sigeDB.addDocumentoExpedido({
                titulo: AssinaturaModule.signedFileName,
                nomeArquivo: AssinaturaModule.signedFileName,
                signatarioId: chancela?.id || '',
                signatarioNome: chancela?.nome || 'Direção/Secretaria',
                signatarioCargo: chancela?.cargo || '',
                canal: 'download',
                destinatario: 'Download Local (Secretaria)',
                status: 'concluido',
                tamanhoBytes: AssinaturaModule.signedPdfBlob.size
            });
        }

        renderHistorialExpedicoes();
        atualizarContadoresAssinatura();
        showToast('Download do documento assinado concluído!');
    }
    window.baixarDocumentoAssinado = baixarDocumentoAssinado;

    // 6.2 Envio via WhatsApp
    function openModalEnviarWhatsApp() {
        if (!AssinaturaModule.signedPdfBytes && !AssinaturaModule.currentPdfBytes) {
            showToast('Abra e assine um documento antes de enviar.');
            return;
        }

        const modal = document.getElementById('modalEnviarWhatsAppDoc');
        if (!modal) return;

        // Pré-preenche instâncias ativas
        const selectInst = document.getElementById('sendWpInstanciaSelect');
        if (selectInst && window.evolutionClient) {
            selectInst.innerHTML = window.evolutionClient.defaultInstances.map(inst => `
                <option value="${inst.instanceName}">${inst.label}</option>
            `).join('');
            selectInst.value = 'sige_secretaria';
        }

        // Pré-carrega mensagem padrão
        const msgInput = document.getElementById('sendWpMensagemCaption');
        if (msgInput) {
            msgInput.value = `Olá! Segue em anexo o documento oficial emitido pelo Centro Educacional Pedro Rizzi devidamente assinado pela Direção/Secretaria.\n\nQualquer dúvida, estamos à disposição.`;
        }

        document.getElementById('sendWpNomeArquivoDoc').textContent = AssinaturaModule.signedFileName || AssinaturaModule.currentFileName;
        modal.style.display = 'flex';
    }
    window.openModalEnviarWhatsApp = openModalEnviarWhatsApp;

    function closeModalEnviarWhatsApp() {
        const modal = document.getElementById('modalEnviarWhatsAppDoc');
        if (modal) modal.style.display = 'none';
    }
    window.closeModalEnviarWhatsApp = closeModalEnviarWhatsApp;

    async function dispararEnvioWhatsAppDoc() {
        const phone = document.getElementById('sendWpTelefoneInput').value.trim();
        const instanceName = document.getElementById('sendWpInstanciaSelect')?.value || 'sige_secretaria';
        const caption = document.getElementById('sendWpMensagemCaption')?.value.trim();
        const destinatarioNome = document.getElementById('sendWpDestinatarioNome')?.value.trim() || 'Destinatário';

        if (!phone || phone.replace(/\D/g, '').length < 10) {
            showToast('Por favor, informe um número de telefone com DDD válido.');
            return;
        }

        // Se ainda não tiver gerado a base64 do assinado, gera agora
        const bytesParaEnvio = AssinaturaModule.signedPdfBytes || AssinaturaModule.currentPdfBytes;
        if (!bytesParaEnvio) {
            showToast('Nenhum documento disponível para envio.');
            return;
        }

        try {
            showToast('Enviando documento via WhatsApp em segundo plano...');
            
            // Converte Uint8Array para base64
            let binary = '';
            const len = bytesParaEnvio.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytesParaEnvio[i]);
            }
            const base64Str = window.btoa(binary);

            const chancela = sigeDB.getChancelasAssinaturas().find(c => c.id === AssinaturaModule.selectedChancelaId);

            // Chamada ao Evolution Client
            const result = await window.evolutionClient.sendDocument(
                phone,
                base64Str,
                AssinaturaModule.signedFileName || 'documento_assinado.pdf',
                caption,
                { instanceName: instanceName }
            );

            if (result.success) {
                showToast(`✅ Documento enviado com sucesso para ${result.cleanPhone}!`);
                closeModalEnviarWhatsApp();

                // Registra ou atualiza auditoria
                if (AssinaturaModule.currentAuthRecordId) {
                    sigeDB.updateDocumentoExpedido(AssinaturaModule.currentAuthRecordId, {
                        canal: 'whatsapp',
                        destinatario: `${destinatarioNome} (${phone})`,
                        status: 'enviado'
                    });
                } else {
                    sigeDB.addDocumentoExpedido({
                        titulo: AssinaturaModule.signedFileName || AssinaturaModule.currentFileName,
                        nomeArquivo: AssinaturaModule.signedFileName || 'documento.pdf',
                        signatarioId: chancela?.id || '',
                        signatarioNome: chancela?.nome || 'Direção/Secretaria',
                        signatarioCargo: chancela?.cargo || '',
                        canal: 'whatsapp',
                        destinatario: `${destinatarioNome} (${phone})`,
                        status: 'enviado',
                        tamanhoBytes: bytesParaEnvio.byteLength
                    });
                }

                renderHistorialExpedicoes();
                atualizarContadoresAssinatura();
            } else {
                console.warn('Falha no envio via Evolution API:', result);
                // Fallback amigável: oferece abrir o WhatsApp Web diretamente
                if (confirm(`A API de WhatsApp retornou: "${result.error}". Deseja abrir o WhatsApp Web para enviar manualmente?`)) {
                    baixarDocumentoAssinado();
                    const clean = phone.replace(/\D/g, '');
                    const url = `https://wa.me/55${clean}?text=${encodeURIComponent(caption + "\n\n*(Em anexo o documento oficial baixado)*")}`;
                    window.open(url, '_blank');
                }
            }
        } catch (err) {
            console.error('Erro no envio via WhatsApp:', err);
            showToast('Erro ao disparar mensagem: ' + err.message);
        }
    }
    window.dispararEnvioWhatsAppDoc = dispararEnvioWhatsAppDoc;

    // 6.3 Envio via E-mail
    function openModalEnviarEmail() {
        if (!AssinaturaModule.signedPdfBytes && !AssinaturaModule.currentPdfBytes) {
            showToast('Abra e assine um documento antes de enviar.');
            return;
        }

        const modal = document.getElementById('modalEnviarEmailDoc');
        if (!modal) return;

        const assuntoInput = document.getElementById('sendEmailAssuntoInput');
        if (assuntoInput) {
            assuntoInput.value = `Documento Oficial Assinado - C.E. Pedro Rizzi [${AssinaturaModule.signedFileName || 'Documento'}]`;
        }

        const corpoInput = document.getElementById('sendEmailCorpoInput');
        if (corpoInput) {
            corpoInput.value = `Prezados,\n\nSegue em anexo o documento oficial emitido pela Secretaria e Gabinete da Direção do Centro Educacional Pedro Rizzi, devidamente autenticado e assinado digitalmente.\n\nAtenciosamente,\nSecretaria Escolar / Direção\nCentro Educacional Pedro Rizzi\nTelefone: (47) 3508-0264`;
        }

        modal.style.display = 'flex';
    }
    window.openModalEnviarEmail = openModalEnviarEmail;

    function closeModalEnviarEmail() {
        const modal = document.getElementById('modalEnviarEmailDoc');
        if (modal) modal.style.display = 'none';
    }
    window.closeModalEnviarEmail = closeModalEnviarEmail;

    function dispararEnvioEmailDoc() {
        const email = document.getElementById('sendEmailDestinatarioInput').value.trim();
        const assunto = document.getElementById('sendEmailAssuntoInput').value.trim();
        const corpo = document.getElementById('sendEmailCorpoInput').value.trim();

        if (!email || !email.includes('@')) {
            showToast('Informe um endereço de e-mail válido.');
            return;
        }

        // 1. Baixa uma via local para anexar facilmente
        baixarDocumentoAssinado();

        // 2. Abre o cliente de e-mail padrão do operador (mailto) com tudo preenchido
        const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
        window.location.href = mailtoUrl;

        // 3. Registra ou atualiza expedição no livro
        if (AssinaturaModule.currentAuthRecordId) {
            sigeDB.updateDocumentoExpedido(AssinaturaModule.currentAuthRecordId, {
                canal: 'email',
                destinatario: email,
                status: 'expedido'
            });
        } else {
            const chancela = sigeDB.getChancelasAssinaturas().find(c => c.id === AssinaturaModule.selectedChancelaId);
            sigeDB.addDocumentoExpedido({
                titulo: AssinaturaModule.signedFileName || AssinaturaModule.currentFileName,
                nomeArquivo: AssinaturaModule.signedFileName || 'documento.pdf',
                signatarioId: chancela?.id || '',
                signatarioNome: chancela?.nome || 'Direção/Secretaria',
                signatarioCargo: chancela?.cargo || '',
                canal: 'email',
                destinatario: email,
                status: 'expedido',
                tamanhoBytes: AssinaturaModule.signedPdfBytes?.byteLength || 0
            });
        }

        closeModalEnviarEmail();
        renderHistorialExpedicoes();
        atualizarContadoresAssinatura();
        showToast(`E-mail aberto no cliente local! O documento assinado foi baixado para anexar.`);
    }
    window.dispararEnvioEmailDoc = dispararEnvioEmailDoc;

    // =========================================================================
    // 7. GERADOR DE DOCUMENTOS OFICIAIS DO PRÓPRIO SISTEMA (REQUISITO 4)
    // =========================================================================
    function openModalGeradorDocumentosSige() {
        const modal = document.getElementById('modalGeradorDocsSIGE');
        if (modal) {
            modal.style.display = 'flex';
            popularSelectAlunosSige();
        }
    }
    window.openModalGeradorDocumentosSige = openModalGeradorDocumentosSige;

    function closeModalGeradorDocumentosSige() {
        const modal = document.getElementById('modalGeradorDocsSIGE');
        if (modal) modal.style.display = 'none';
    }
    window.closeModalGeradorDocumentosSige = closeModalGeradorDocumentosSige;

    function popularSelectAlunosSige() {
        const select = document.getElementById('sigeDocSelectAluno');
        if (!select) return;

        let options = '<option value="">-- Selecionar Aluno da Base Escolar (Opcional) --</option>';
        if (sigeDB.data && Array.isArray(sigeDB.data.alunosImportados)) {
            // Ordena alunos por nome
            const alunos = [...sigeDB.data.alunosImportados].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
            alunos.slice(0, 300).forEach(a => {
                options += `<option value="${a.id || a.matricula}" data-nome="${a.nome}" data-turma="${a.turma || ''}" data-turno="${a.turno || ''}">${a.nome} (${a.turma || 'Sem turma'})</option>`;
            });
        }
        select.innerHTML = options;

        select.onchange = () => {
            const opt = select.options[select.selectedIndex];
            if (opt && opt.dataset.nome) {
                document.getElementById('sigeDocInputNomeAluno').value = opt.dataset.nome;
                document.getElementById('sigeDocInputTurma').value = opt.dataset.turma || '';
                document.getElementById('sigeDocInputTurno').value = opt.dataset.turno || 'Matutino';
            }
        };
    }

    async function gerarDocumentoOficialSige(tipo) {
        if (typeof PDFLib === 'undefined') {
            showToast('PDF-Lib não carregada.');
            return;
        }

        const tipoDoc = tipo || document.getElementById('sigeDocSelectTipo').value;
        const nomeAluno = document.getElementById('sigeDocInputNomeAluno').value.trim() || 'NOME DO ESTUDANTE';
        const turma = document.getElementById('sigeDocInputTurma').value.trim() || '101';
        const turno = document.getElementById('sigeDocInputTurno').value.trim() || 'Matutino';
        const textoExtra = document.getElementById('sigeDocInputObservacoes')?.value.trim() || '';

        try {
            showToast('Gerando documento oficial timbrado...');

            // Cria novo PDF A4
            const pdfDoc = await PDFLib.PDFDocument.create();
            // A4 em pontos: 595.28 x 841.89
            const page = pdfDoc.addPage([595.28, 841.89]);
            const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
            const fontRegular = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

            const pw = page.getWidth();
            const ph = page.getHeight();
            let y = ph - 60;

            // Borda decorativa institucional
            page.drawRectangle({
                x: 35,
                y: 35,
                width: pw - 70,
                height: ph - 70,
                borderColor: PDFLib.rgb(0.8, 0.85, 0.9),
                borderWidth: 1
            });

            // Cabeçalho da Escola
            page.drawText('ESTADO DE SANTA CATARINA', { x: pw / 2 - 100, y, size: 10, font: fontBold, color: PDFLib.rgb(0.2, 0.25, 0.3) });
            y -= 14;
            page.drawText('MUNICÍPIO DE ITAJAÍ • SECRETARIA MUNICIPAL DE EDUCAÇÃO', { x: pw / 2 - 160, y, size: 9, font: fontRegular, color: PDFLib.rgb(0.3, 0.35, 0.4) });
            y -= 16;
            page.drawText('CENTRO EDUCACIONAL PEDRO RIZZI', { x: pw / 2 - 120, y, size: 13, font: fontBold, color: PDFLib.rgb(0.1, 0.2, 0.4) });
            y -= 14;
            page.drawText('Rua Agílio Cunha, 812 - Cidade Nova - Itajaí - SC • Fone: (47) 3508-0264', { x: pw / 2 - 150, y, size: 8.5, font: fontRegular, color: PDFLib.rgb(0.4, 0.45, 0.5) });
            y -= 18;

            // Linha divisória
            page.drawLine({
                start: { x: 50, y },
                end: { x: pw - 50, y },
                thickness: 1.5,
                color: PDFLib.rgb(0.1, 0.2, 0.4)
            });
            y -= 50;

            // Título do Documento
            let titulo = 'DECLARAÇÃO DE MATRÍCULA E FREQUÊNCIA';
            let nomeArq = `declaracao_matricula_${nomeAluno.replace(/\s+/g, '_')}.pdf`;

            if (tipoDoc === 'frequencia') {
                titulo = 'DECLARAÇÃO DE FREQUÊNCIA ESCOLAR';
                nomeArq = `declaracao_frequencia_${nomeAluno.replace(/\s+/g, '_')}.pdf`;
            } else if (tipoDoc === 'comparecimento') {
                titulo = 'DECLARAÇÃO DE COMPARECIMENTO';
                nomeArq = `declaracao_comparecimento.pdf`;
            } else if (tipoDoc === 'transferencia') {
                titulo = 'DECLARAÇÃO DE TRANSFERÊNCIA ESCOLAR';
                nomeArq = `declaracao_transferencia_${nomeAluno.replace(/\s+/g, '_')}.pdf`;
            } else if (tipoDoc === 'oficio') {
                titulo = 'COMUNICADO / OFÍCIO OFICIAL DE GABINETE';
                nomeArq = `oficio_gabinete_escola.pdf`;
            }

            const titleWidth = fontBold.widthOfTextAtSize(titulo, 14);
            page.drawText(titulo, {
                x: (pw - titleWidth) / 2,
                y,
                size: 14,
                font: fontBold,
                color: PDFLib.rgb(0.1, 0.15, 0.25)
            });
            y -= 60;

            // Corpo do Texto
            const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            let corpo = '';

            if (tipoDoc === 'matricula') {
                corpo = `Declaramos, para os devidos fins a quem interessar possa, que o(a) estudante ${nomeAluno.toUpperCase()}, encontra-se regularmente matriculado(a) e com frequência ativa nesta unidade escolar no presente Ano Letivo de 2026, cursando a Turma ${turma}, no Turno ${turno}.\n\nPor ser a expressão da verdade, firmamos o presente documento com chancela oficial do Gabinete da Direção e Secretaria Escolar.`;
            } else if (tipoDoc === 'frequencia') {
                corpo = `Declaramos para os devidos fins que o(a) estudante ${nomeAluno.toUpperCase()} está regularmente frequente às atividades pedagógicas da Turma ${turma} (Turno ${turno}), cumprindo assiduamente a carga horária curricular estabelecida pelo calendário escolar vigente.`;
            } else if (tipoDoc === 'comparecimento') {
                corpo = `Declaramos para os devidos fins que o(a) responsável pelo estudante ${nomeAluno.toUpperCase()} compareceu a esta instituição de ensino na presente data para reunião, alinhamento pedagógico e tratativas de interesse educacional perante a Gestão Escolar.`;
            } else if (tipoDoc === 'transferencia') {
                corpo = `Declaramos que o(a) estudante ${nomeAluno.toUpperCase()}, matriculado(a) na Turma ${turma}, solicitou transferência desta instituição de ensino, estando com sua documentação escolar em fase de expedição de histórico definitivo conforme os ditames da Lei de Diretrizes e Bases da Educação Nacional.`;
            } else {
                corpo = `O Centro Educacional Pedro Rizzi, por intermédio de sua Equipe Diretiva e Administrativa, expede a presente comunicação oficial em referência aos assuntos de gestão pedagógica e operacional da comunidade escolar.\n\n${textoExtra}`;
            }

            // Renderiza linhas de texto com quebra automática
            const margemEsq = 65;
            const larguraUtil = pw - 130;
            const linhas = quebrarTextoEmLinhas(corpo, fontRegular, 11.5, larguraUtil);

            linhas.forEach(linha => {
                page.drawText(linha, {
                    x: margemEsq,
                    y,
                    size: 11.5,
                    font: fontRegular,
                    color: PDFLib.rgb(0.15, 0.15, 0.15),
                    lineHeight: 18
                });
                y -= 22;
            });

            // Data e Cidade
            y -= 40;
            const dataTexto = `Itajaí (SC), ${dataAtual}.`;
            page.drawText(dataTexto, {
                x: pw - fontRegular.widthOfTextAtSize(dataTexto, 11) - 65,
                y,
                size: 11,
                font: fontRegular,
                color: PDFLib.rgb(0.2, 0.2, 0.2)
            });

            // Linha e espaço de carimbo pré-reservado no rodapé
            y = 170;
            page.drawLine({
                start: { x: pw - 280, y },
                end: { x: pw - 65, y },
                thickness: 0.8,
                color: PDFLib.rgb(0.5, 0.5, 0.5)
            });
            y -= 14;
            page.drawText('Gabinete da Direção / Secretaria Escolar', {
                x: pw - 245,
                y,
                size: 9,
                font: fontRegular,
                color: PDFLib.rgb(0.4, 0.4, 0.4)
            });

            // Salva PDF em memória e joga direto na mesa de trabalho!
            const pdfBytes = await pdfDoc.save();
            AssinaturaModule.currentPdfFile = null;
            AssinaturaModule.currentPdfBytes = new Uint8Array(pdfBytes);
            AssinaturaModule.currentFileName = nomeArq;
            AssinaturaModule.currentPageNum = 1;
            AssinaturaModule.signedPdfBytes = null;

            closeModalGeradorDocumentosSige();
            await inicializarVisualizadorPdf();
            showToast('Documento oficial gerado! Posicione a assinatura e clique em Carimbar.');

        } catch (err) {
            console.error('Erro ao gerar documento do SIGE:', err);
            showToast('Erro ao gerar documento: ' + err.message);
        }
    }
    window.gerarDocumentoOficialSige = gerarDocumentoOficialSige;

    function quebrarTextoEmLinhas(texto, font, fontSize, maxWidth) {
        const paragrafos = texto.split('\n');
        const resultado = [];

        paragrafos.forEach(par => {
            if (!par.trim()) {
                resultado.push('');
                return;
            }
            const palavras = par.split(' ');
            let linhaAtual = '';

            palavras.forEach(p => {
                const teste = linhaAtual ? `${linhaAtual} ${p}` : p;
                const w = font.widthOfTextAtSize(teste, fontSize);
                if (w < maxWidth) {
                    linhaAtual = teste;
                } else {
                    resultado.push(linhaAtual);
                    linhaAtual = p;
                }
            });
            if (linhaAtual) resultado.push(linhaAtual);
        });

        return resultado;
    }

    // =========================================================================
    // 8. HISTÓRICO E LIVRO DE REGISTROS DE EXPEDIÇÕES
    // =========================================================================
    function renderHistorialExpedicoes() {
        const tbody = document.getElementById('tabelaHistoricoExpedicoesBody');
        if (!tbody) return;

        let docs = sigeDB.getDocumentosExpedidos();

        // Filtro por canal
        if (AssinaturaModule.historyFilterCanal !== 'todos') {
            docs = docs.filter(d => d.canal === AssinaturaModule.historyFilterCanal);
        }

        // Filtro por busca
        if (AssinaturaModule.historySearch) {
            const q = AssinaturaModule.historySearch.toLowerCase();
            docs = docs.filter(d => 
                (d.titulo && d.titulo.toLowerCase().includes(q)) ||
                (d.destinatario && d.destinatario.toLowerCase().includes(q)) ||
                (d.signatarioNome && d.signatarioNome.toLowerCase().includes(q))
            );
        }

        if (docs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:24px; color:#94a3b8; font-size:0.88rem;">
                        <i class="fa-regular fa-folder-open" style="font-size:1.6rem; display:block; margin-bottom:6px; color:#cbd5e1;"></i>
                        Nenhum documento expedido encontrado no histórico.
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        docs.forEach(d => {
            const dataHora = d.dataHora ? new Date(d.dataHora).toLocaleString('pt-BR') : '-';
            let canalBadge = '';
            if (d.canal === 'whatsapp') {
                canalBadge = `<span style="background:#dcfce7; color:#15803d; font-size:0.75rem; font-weight:800; padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</span>`;
            } else if (d.canal === 'email') {
                canalBadge = `<span style="background:#e0e7ff; color:#4338ca; font-size:0.75rem; font-weight:800; padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-envelope"></i> E-mail</span>`;
            } else {
                canalBadge = `<span style="background:#f1f5f9; color:#475569; font-size:0.75rem; font-weight:800; padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;"><i class="fa-solid fa-download"></i> Download</span>`;
            }

            html += `
                <tr style="border-bottom:1px solid #f1f5f9; font-size:0.83rem;">
                    <td style="padding:10px 12px; font-weight:600; color:#475569;">${dataHora}</td>
                    <td style="padding:10px 12px;">
                        <div style="font-weight:700; color:#0f172a;">${d.titulo || d.nomeArquivo}</div>
                        <div style="display:flex; align-items:center; gap:6px; margin-top:2px; flex-wrap:wrap;">
                            ${d.codigoAutenticidade ? `
                                <span onclick="consultarCodigoEspecifico('${d.codigoAutenticidade}')" title="Clique para validar autenticidade deste documento" style="cursor:pointer; background:#f0fdf4; border:1px solid #86efac; color:#15803d; font-family:monospace; font-weight:800; font-size:0.73rem; padding:1px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:4px;">
                                    <i class="fa-solid fa-shield-halved" style="color:#10b981;"></i> ${d.codigoAutenticidade}
                                </span>
                            ` : ''}
                            <span style="font-size:0.75rem; color:#94a3b8;">${d.nomeArquivo}</span>
                        </div>
                    </td>
                    <td style="padding:10px 12px;">
                        <span style="font-weight:700; color:#1e293b;">${d.signatarioNome}</span>
                        <div style="font-size:0.75rem; color:#64748b;">${d.signatarioCargo || ''}</div>
                    </td>
                    <td style="padding:10px 12px;">${canalBadge}</td>
                    <td style="padding:10px 12px; font-weight:600; color:#334155;">${d.destinatario || '-'}</td>
                    <td style="padding:10px 12px; font-size:0.78rem; color:#64748b;">${d.operador || 'Secretaria'}</td>
                    <td style="padding:10px 12px; text-align:right;">
                        ${d.codigoAutenticidade ? `
                            <button type="button" onclick="consultarCodigoEspecifico('${d.codigoAutenticidade}')" title="Verificar Autenticidade no Validador" style="background:transparent; border:none; color:#10b981; cursor:pointer; padding:4px; margin-right:4px;" onmouseover="this.style.color='#059669'" onmouseout="this.style.color='#10b981'"><i class="fa-solid fa-shield-halved"></i></button>
                        ` : ''}
                        <button type="button" onclick="excluirItemHistoricoExpedicao('${d.id}')" title="Excluir Registro" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; padding:4px;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }
    window.renderHistorialExpedicoes = renderHistorialExpedicoes;

    function filtrarHistoricoCanal(canal) {
        AssinaturaModule.historyFilterCanal = canal;
        const btns = document.querySelectorAll('.filtro-canal-btn');
        btns.forEach(b => {
            if (b.dataset.canal === canal) {
                b.classList.add('active');
                b.style.background = '#4f46e5';
                b.style.color = 'white';
            } else {
                b.classList.remove('active');
                b.style.background = '#f1f5f9';
                b.style.color = '#475569';
            }
        });
        renderHistorialExpedicoes();
    }
    window.filtrarHistoricoCanal = filtrarHistoricoCanal;

    function filtrarHistoricoBusca(termo) {
        AssinaturaModule.historySearch = termo;
        renderHistorialExpedicoes();
    }
    window.filtrarHistoricoBusca = filtrarHistoricoBusca;

    function excluirItemHistoricoExpedicao(id) {
        if (!confirm('Deseja remover este registro de expedição do histórico?')) return;
        sigeDB.deleteDocumentoExpedido(id);
        renderHistorialExpedicoes();
        atualizarContadoresAssinatura();
        showToast('Registro excluído.');
    }
    window.excluirItemHistoricoExpedicao = excluirItemHistoricoExpedicao;

    // =========================================================================
    // 9. VALIDADOR DE AUTENTICIDADE INTEGRA-RIZZI
    // =========================================================================
    function openModalConsultarAutenticidade(codigoPre = '') {
        const modal = document.getElementById('modalValidarAutenticidade');
        if (!modal) return;
        modal.style.display = 'flex';
        const input = document.getElementById('inputCodigoValidacao');
        const container = document.getElementById('resultadoValidacaoContainer');
        if (input) {
            input.value = codigoPre || '';
            input.focus();
        }
        if (codigoPre && container) {
            executarConsultaAutenticidade();
        } else if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    }
    window.openModalConsultarAutenticidade = openModalConsultarAutenticidade;

    function closeModalConsultarAutenticidade() {
        const modal = document.getElementById('modalValidarAutenticidade');
        if (modal) modal.style.display = 'none';
    }
    window.closeModalConsultarAutenticidade = closeModalConsultarAutenticidade;

    function consultarCodigoEspecifico(codigo) {
        openModalConsultarAutenticidade(codigo);
    }
    window.consultarCodigoEspecifico = consultarCodigoEspecifico;

    function executarConsultaAutenticidade(e) {
        if (e && e.preventDefault) e.preventDefault();
        const input = document.getElementById('inputCodigoValidacao');
        const container = document.getElementById('resultadoValidacaoContainer');
        if (!input || !container) return;

        const cod = input.value.trim();
        if (!cod) {
            showToast('Informe o código de autenticidade.');
            return;
        }

        const doc = sigeDB.validarCodigoAutenticidade(cod);
        container.style.display = 'block';

        if (doc) {
            const dataHora = doc.dataHoraFormatada || (doc.dataHora ? new Date(doc.dataHora).toLocaleString('pt-BR') : '-');
            const canalNome = doc.canal === 'whatsapp' ? 'WhatsApp' : (doc.canal === 'email' ? 'E-mail' : (doc.canal === 'assinado' ? 'Carimbo & Registro' : 'Download Local'));
            
            container.innerHTML = `
                <div style="background:#f0fdf4; border:2px solid #86efac; border-radius:14px; padding:18px; margin-top:10px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:14px;">
                        <div style="width:40px; height:40px; border-radius:50%; background:#22c55e; color:white; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0;">
                            <i class="fa-solid fa-circle-check"></i>
                        </div>
                        <div>
                            <div style="font-size:1.05rem; font-weight:800; color:#15803d;">Documento Oficial Autêntico & Válido</div>
                            <div style="font-size:0.78rem; color:#166534;">Registro localizado com sucesso na base oficial do IntegraRizzi</div>
                        </div>
                    </div>

                    <div style="background:white; border-radius:10px; padding:14px; border:1px solid #bbf7d0; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; font-size:0.83rem;">
                        <div>
                            <span style="font-size:0.72rem; text-transform:uppercase; font-weight:700; color:#64748b; display:block;">Código de Autenticidade:</span>
                            <span style="font-family:monospace; font-size:1rem; font-weight:800; color:#0f172a; background:#f1f5f9; padding:2px 6px; border-radius:4px; border:1px solid #cbd5e1; display:inline-block; margin-top:2px;">
                                ${doc.codigoAutenticidade || cod.toUpperCase()}
                            </span>
                        </div>

                        <div>
                            <span style="font-size:0.72rem; text-transform:uppercase; font-weight:700; color:#64748b; display:block;">Data e Hora da Emissão:</span>
                            <strong style="color:#0f172a;">${dataHora}</strong>
                        </div>

                        <div style="grid-column: 1 / -1;">
                            <span style="font-size:0.72rem; text-transform:uppercase; font-weight:700; color:#64748b; display:block;">Nome do Documento:</span>
                            <strong style="color:#0f172a; font-size:0.9rem;">${doc.titulo || doc.nomeArquivo}</strong>
                        </div>

                        <div>
                            <span style="font-size:0.72rem; text-transform:uppercase; font-weight:700; color:#64748b; display:block;">Signatário Oficial:</span>
                            <strong style="color:#0f172a;">${doc.signatarioNome}</strong>
                            <div style="font-size:0.75rem; color:#64748b;">${doc.signatarioCargo || 'Gabinete / Secretaria'} ${doc.signatarioDoc ? `• ${doc.signatarioDoc}` : ''}</div>
                        </div>

                        <div>
                            <span style="font-size:0.72rem; text-transform:uppercase; font-weight:700; color:#64748b; display:block;">Operador Emissor (IntegraRizzi):</span>
                            <strong style="color:#0f172a;">${doc.operador || 'Operador Autorizado'}</strong>
                            <div style="font-size:0.75rem; color:#64748b;">Perfil: ${doc.operadorPerfil || 'Secretaria Escolar'}</div>
                        </div>

                        <div>
                            <span style="font-size:0.72rem; text-transform:uppercase; font-weight:700; color:#64748b; display:block;">Canal de Expedição:</span>
                            <span style="font-weight:700; color:#0f172a;">${canalNome}</span>
                            <div style="font-size:0.75rem; color:#64748b;">${doc.destinatario || 'Via Local'}</div>
                        </div>

                        <div>
                            <span style="font-size:0.72rem; text-transform:uppercase; font-weight:700; color:#64748b; display:block;">Instituição Certificadora:</span>
                            <strong style="color:#0f172a;">C.E. Pedro Rizzi</strong>
                            <div style="font-size:0.75rem; color:#10b981; font-weight:700;"><i class="fa-solid fa-lock"></i> Integridade Verificada</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="background:#fef2f2; border:2px solid #fca5a5; border-radius:14px; padding:18px; margin-top:10px;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                        <div style="width:40px; height:40px; border-radius:50%; background:#ef4444; color:white; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0;">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <div>
                            <div style="font-size:1.05rem; font-weight:800; color:#b91c1c;">Código Não Localizado ou Inválido</div>
                            <div style="font-size:0.78rem; color:#991b1b;">Nenhum documento com o código <strong>"${cod.toUpperCase()}"</strong> foi encontrado nos registros do IntegraRizzi.</div>
                        </div>
                    </div>
                    <p style="font-size:0.8rem; color:#7f1d1d; margin:8px 0 0 0; line-height:1.4;">
                        Verifique se digitou todos os caracteres corretamente. Se o documento foi emitido antes da ativação do módulo digital ou se o carimbo foi adulterado, este documento não poderá ser validado eletronicamente.
                    </p>
                </div>
            `;
        }
    }
    window.executarConsultaAutenticidade = executarConsultaAutenticidade;

    // Exporta objeto principal
    AssinaturaModule.openModalConsultarAutenticidade = openModalConsultarAutenticidade;
    AssinaturaModule.closeModalConsultarAutenticidade = closeModalConsultarAutenticidade;
    AssinaturaModule.consultarCodigoEspecifico = consultarCodigoEspecifico;
    AssinaturaModule.executarConsultaAutenticidade = executarConsultaAutenticidade;
    window.AssinaturaModule = AssinaturaModule;

})(typeof window !== 'undefined' ? window : this);

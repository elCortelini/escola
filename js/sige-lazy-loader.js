/**
 * sige-lazy-loader.js — Carregamento sob demanda de scripts pesados e futuros modulos
 * Evita baixar PDF.js (~300KB), pdf-importer.js e assinatura-docs.js (108KB) no boot inicial.
 */
(function (window) {
    'use strict';

    const PDFJS_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    const PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const PDF_IMPORTER_SRC = 'js/pdf-importer.js?v=20261127_v67';
    const ASSINATURA_DOCS_SRC = 'js/assinatura-docs.js?v=20261127_v67';

    const _loadedPromises = new Map();

    function loadScript(src) {
        if (_loadedPromises.has(src)) {
            return _loadedPromises.get(src);
        }
        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => {
                _loadedPromises.delete(src);
                reject(new Error('Falha ao carregar script sob demanda: ' + src));
            };
            document.head.appendChild(script);
        });
        _loadedPromises.set(src, promise);
        return promise;
    }

    async function ensurePdfJs() {
        if (typeof window.pdfjsLib !== 'undefined') return window.pdfjsLib;
        await loadScript(PDFJS_CDN_URL);
        if (typeof window.pdfjsLib !== 'undefined' && window.pdfjsLib.GlobalWorkerOptions) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        }
        return window.pdfjsLib;
    }

    async function ensurePdfImporter() {
        await ensurePdfJs();
        await loadScript(PDF_IMPORTER_SRC);
        return true;
    }

    async function ensureAssinaturaDocs() {
        await ensurePdfJs();
        await loadScript(ASSINATURA_DOCS_SRC);
        return true;
    }

    async function ensureModule(name, src) {
        const key = src || name;
        return loadScript(key);
    }

    function installProxy(fnName, loaderFn) {
        if (typeof window[fnName] === 'function') return;
        const stub = async function (...args) {
            await loaderFn();
            const realFn = window[fnName];
            if (typeof realFn === 'function' && realFn !== stub) {
                return realFn.apply(this, args);
            }
            return undefined;
        };
        stub.__isSigeLazyStub = true;
        window[fnName] = stub;
    }

    // Stubs transparentes para pdf-importer.js
    [
        'openImportPDFAlunosModal',
        'closeImportPDFAlunosModal',
        'handlePdfFileSelect',
        'confirmImportPdfData'
    ].forEach(fnName => installProxy(fnName, ensurePdfImporter));

    if (typeof window.updateAdminPdfImportMetaInfoDisplay !== 'function') {
        window.updateAdminPdfImportMetaInfoDisplay = function () {
            // Passivo ate que o importador seja carregado sob demanda
        };
    }

    // Stubs transparentes para assinatura-docs.js (exceto renders passivos de background)
    [
        'openModalGeradorDocumentosSige',
        'openModalConsultarAutenticidade',
        'openModalNovaChancela',
        'openModalEditarChancela',
        'openModalEnviarWhatsApp',
        'openModalEnviarEmail',
        'consultarCodigoEspecifico',
        'executarConsultaAutenticidade',
        'ensurePdfLibLoaded'
    ].forEach(fnName => installProxy(fnName, ensureAssinaturaDocs));

    function installVisibleSubTabStub(fnName) {
        if (typeof window[fnName] === 'function') return;
        const stub = async function (...args) {
            const container = document.getElementById('adminSubTab_assinaturas_docs');
            const isVisible = !!(container && container.offsetParent !== null);
            if (!isVisible) return;
            await ensureAssinaturaDocs();
            const realFn = window[fnName];
            if (typeof realFn === 'function' && realFn !== stub) {
                return realFn.apply(this, args);
            }
        };
        stub.__isSigeLazyStub = true;
        window[fnName] = stub;
    }

    installVisibleSubTabStub('renderModuleAssinaturasDocs');
    installVisibleSubTabStub('renderChancelasCards');

    window.SigeLazyLoader = {
        loadScript,
        ensurePdfJs,
        ensurePdfImporter,
        ensureAssinaturaDocs,
        ensureModule
    };
})(window);

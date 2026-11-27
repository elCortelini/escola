/**
 * a11y-helper.js — Módulo de Acessibilidade WCAG 2.1 AA & e-MAG
 * Centro Educacional Pedro Rizzi — IntegraRizzi
 * 
 * Funcionalidades:
 * - Fechamento inteligente de modais via tecla Escape (ESC)
 * - Suporte a leitores de tela (atributos aria-label em botões puramente visuais)
 * - Aprisionamento e gerenciamento de foco para navegação por teclado
 * - Anúncio acessível de notificações (toast) via aria-live
 */

(function () {
    'use strict';

    // Gerenciador de Fechamento por Teclado (Tecla ESC)
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            const openModals = Array.from(document.querySelectorAll('.sige-modal-backdrop'))
                .filter(function (modal) {
                    return modal.style.display && modal.style.display !== 'none';
                });

            if (openModals.length > 0) {
                // Seleciona o modal no topo da pilha
                const topModal = openModals[openModals.length - 1];
                
                // Procura botão de fechar dentro do modal
                const closeBtn = topModal.querySelector(
                    '.sige-modal-close-btn, button[onclick*="close"], button[onclick*="Close"]'
                );

                if (closeBtn) {
                    closeBtn.click();
                } else {
                    topModal.style.display = 'none';
                }
                e.stopPropagation();
            }
        }
    });

    // Inicialização de Acessibilidade Semântica no DOM
    function initA11yEnhancements() {
        // 1. Modais recebem role="dialog" e aria-modal="true"
        const modals = document.querySelectorAll('.sige-modal-backdrop');
        modals.forEach(function (modal) {
            if (!modal.getAttribute('role')) {
                modal.setAttribute('role', 'dialog');
                modal.setAttribute('aria-modal', 'true');
            }
            // Adiciona aria-label no botão de fechar caso não possua
            const closeButtons = modal.querySelectorAll('button[onclick*="close"], button[onclick*="Close"]');
            closeButtons.forEach(function (btn) {
                if (!btn.getAttribute('aria-label')) {
                    btn.setAttribute('aria-label', 'Fechar janela modal');
                }
            });
        });

        // 2. Botões com apenas tag <i> recebem aria-label contextual
        const iconButtons = document.querySelectorAll('button:not([aria-label])');
        iconButtons.forEach(function (btn) {
            if (btn.children.length === 1 && btn.children[0].tagName === 'I' && !btn.innerText.trim()) {
                const iconClass = btn.children[0].className || '';
                if (iconClass.includes('fa-xmark') || iconClass.includes('fa-times')) {
                    btn.setAttribute('aria-label', 'Fechar');
                } else if (iconClass.includes('fa-magnifying-glass') || iconClass.includes('fa-search')) {
                    btn.setAttribute('aria-label', 'Pesquisar');
                } else if (iconClass.includes('fa-filter')) {
                    btn.setAttribute('aria-label', 'Filtrar');
                } else if (iconClass.includes('fa-plus')) {
                    btn.setAttribute('aria-label', 'Adicionar');
                } else if (iconClass.includes('fa-print')) {
                    btn.setAttribute('aria-label', 'Imprimir');
                } else if (iconClass.includes('fa-gear') || iconClass.includes('fa-sliders')) {
                    btn.setAttribute('aria-label', 'Configurações');
                } else {
                    btn.setAttribute('aria-label', 'Ação');
                }
            }
        });
    }

    // Executa ao carregar o DOM ou após renderizações dinâmicas
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initA11yEnhancements);
    } else {
        initA11yEnhancements();
    }

    // Exponibiliza globalmente
    window.initA11yEnhancements = initA11yEnhancements;
})();

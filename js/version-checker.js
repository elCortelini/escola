/**
 * IntegraRizzi — Sistema de Atualização Automática e Cache-Buster
 * Elimina a necessidade de Ctrl+F5 ao sincronizar automaticamente a versão do código.
 */
(function() {
    const CURRENT_VERSION = "20261020_v58";
    window.SIGE_APP_VERSION = CURRENT_VERSION;

    const VERSION_STORAGE_KEY = "sige_client_version";
    const RELOAD_FLAG_KEY = "sige_reloaded_for_" + CURRENT_VERSION;

    // Desregistra Service Workers legados que possam interceptar requisições em navegadores de usuários
    function unregisterServiceWorkers() {
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for (let reg of registrations) {
                    try { reg.unregister(); } catch (_) {}
                }
            }).catch(function() {});
        }
    }

    // Limpa todas as instâncias de CacheStorage do navegador
    function clearBrowserCaches() {
        if (typeof window !== 'undefined' && 'caches' in window) {
            caches.keys().then(function(names) {
                names.forEach(function(name) {
                    try { caches.delete(name); } catch (_) {}
                });
            }).catch(function() {});
        }
        unregisterServiceWorkers();
    }

    // Execução imediata de higienização de cache
    unregisterServiceWorkers();

    // 1. Verifica se a versão salva no navegador é defasada
    try {
        const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
        if (storedVersion && storedVersion !== CURRENT_VERSION) {
            localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_VERSION);
            clearBrowserCaches();
            if (!sessionStorage.getItem(RELOAD_FLAG_KEY)) {
                sessionStorage.setItem(RELOAD_FLAG_KEY, "true");
                console.log(`[VersionChecker] Atualizando aplicação para versão ${CURRENT_VERSION}...`);
                const url = new URL(window.location.href);
                url.searchParams.set("v", CURRENT_VERSION);
                url.searchParams.set("_t", Date.now().toString());
                window.location.replace(url.toString());
                return;
            }
        } else {
            localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_VERSION);
        }
    } catch (e) {
        console.warn("[VersionChecker] Erro ao ler localStorage:", e);
    }

    // 2. Função de checagem remota sem cache (fetch direto com timestamp e no-store)
    let isChecking = false;
    async function checkForAppUpdates(force = false) {
        if (isChecking && !force) return;
        isChecking = true;
        try {
            const timestamp = Date.now();
            const res = await fetch(`version.json?_t=${timestamp}`, {
                cache: "no-store",
                headers: {
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.version && data.version !== CURRENT_VERSION) {
                console.log(`[VersionChecker] Nova versão detectada na nuvem (${data.version}). Forçando atualização imediata...`);
                localStorage.setItem(VERSION_STORAGE_KEY, data.version);
                clearBrowserCaches();
                const url = new URL(window.location.href);
                url.searchParams.set("v", data.version);
                url.searchParams.set("_t", Date.now().toString());
                window.location.replace(url.toString());
            }
        } catch (_) {
            // Silencioso se estiver offline
        } finally {
            isChecking = false;
        }
    }

    window.checkForAppUpdates = checkForAppUpdates;

    // Forçar recarga limpa manualmente (com purga de caches)
    window.forceHardReload = function() {
        clearBrowserCaches();
        const url = new URL(window.location.href);
        url.searchParams.set("_t", Date.now().toString());
        window.location.replace(url.toString());
    };

    // 3. Gatilhos automáticos de verificação
    // A) Imediatamente no carregamento do script
    checkForAppUpdates();

    // B) Ao carregar o DOM completo
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            setTimeout(checkForAppUpdates, 300);
        });
    } else {
        setTimeout(checkForAppUpdates, 300);
    }

    // C) Ao focar a janela ou voltar à aba do navegador
    window.addEventListener("focus", () => {
        setTimeout(checkForAppUpdates, 500);
    });

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            setTimeout(checkForAppUpdates, 500);
        }
    });

    // D) Verificação periódica a cada 60 segundos
    setInterval(checkForAppUpdates, 60000);
})();

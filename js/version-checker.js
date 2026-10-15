/**
 * IntegraRizzi — Sistema de Atualização Automática e Cache-Buster
 * Elimina a necessidade de Ctrl+F5 ao sincronizar automaticamente a versão do código.
 */
(function() {
    const CURRENT_VERSION = "20261015_v46";
    window.SIGE_APP_VERSION = CURRENT_VERSION;

    const VERSION_STORAGE_KEY = "sige_client_version";
    const RELOAD_FLAG_KEY = "sige_reloaded_for_" + CURRENT_VERSION;

    function clearBrowserCaches() {
        if ('caches' in window) {
            caches.keys().then(function(names) {
                names.forEach(function(name) {
                    try { caches.delete(name); } catch (_) {}
                });
            });
        }
    }

    // 1. Verifica se a versão salva no navegador é defasada
    try {
        const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
        if (storedVersion && storedVersion !== CURRENT_VERSION) {
            localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_VERSION);
            clearBrowserCaches();
            if (!sessionStorage.getItem(RELOAD_FLAG_KEY)) {
                sessionStorage.setItem(RELOAD_FLAG_KEY, "true");
                console.log(`[VersionChecker] Atualizando aplicação para versão ${CURRENT_VERSION}...`);
                window.location.reload(true);
                return;
            }
        } else {
            localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_VERSION);
        }
    } catch (e) {
        console.warn("[VersionChecker] Erro ao ler localStorage:", e);
    }

    // 2. Função de checagem remota sem cache (fetch direto com timestamp)
    let isChecking = false;
    async function checkForAppUpdates() {
        if (isChecking) return;
        isChecking = true;
        try {
            const res = await fetch(`version.json?_t=${Date.now()}`, {
                cache: "no-store",
                headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.version && data.version !== CURRENT_VERSION) {
                console.log(`[VersionChecker] Nova versão detectada na nuvem (${data.version}). Recarregando sistema...`);
                localStorage.setItem(VERSION_STORAGE_KEY, data.version);
                clearBrowserCaches();
                window.location.reload(true);
            }
        } catch (_) {
            // Silencioso se estiver offline
        } finally {
            isChecking = false;
        }
    }

    window.checkForAppUpdates = checkForAppUpdates;

    // 3. Gatilhos automáticos de verificação
    // Ao focar a janela ou voltar à aba do navegador
    window.addEventListener("focus", () => {
        setTimeout(checkForAppUpdates, 500);
    });

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            setTimeout(checkForAppUpdates, 500);
        }
    });

    // Verificação periódica a cada 4 minutos
    setInterval(checkForAppUpdates, 240000);
})();

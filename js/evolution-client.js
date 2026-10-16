/**
 * EVOLUTION CLIENT - CLIENTE OFICIAL DE INTEGRAÇÃO WHATSAPP (EVOLUTION API V2)
 * SIGE Centro Educacional Pedro Rizzi
 * Permite envios diretos em segundo plano, gestão de multi-instâncias e leitura de QR Code na tela.
 */

(function (window) {
    'use strict';

    class EvolutionClient {
        constructor() {
            this.defaultInstances = [
                { id: 'orientacao', label: '💛 Orientação Educacional', instanceName: 'sige_orientacao' },
                { id: 'direcao', label: '🏛️ Gabinete da Direção', instanceName: 'sige_direcao' },
                { id: 'secretaria', label: '📋 Secretaria Escolar', instanceName: 'sige_secretaria' },
                { id: 'avulso', label: '📱 Outro Número / Celular Avulso', instanceName: 'sige_avulso' }
            ];
            this._pollingTimer = null;
        }

        // Obtém a configuração global ativa da API
        getConfig() {
            let cfg = {};
            if (typeof window.sigeDB !== 'undefined' && window.sigeDB.getWhatsappConfig) {
                cfg = window.sigeDB.getWhatsappConfig() || {};
            }
            return {
                apiUrl: (cfg.evolutionApiUrl || cfg.apiUrl || 'https://pc28.taild665db.ts.net:8443').trim().replace(/\/+$/, ''),
                apiKey: (cfg.evolutionApiKey || cfg.apiToken || 'B6D711FCDE4D4FD5936544120E713976').trim(),
                provider: cfg.provider || 'evolution_api',
                activeInstance: cfg.activeInstance || 'sige_orientacao',
                antiBanDelayMin: cfg.antiBanDelayMin || 5, // segundos
                antiBanDelayMax: cfg.antiBanDelayMax || 12, // segundos
                cloudInstanceStates: cfg.cloudInstanceStates || {}
            };
        }

        // Salva estado conhecido da instância no cache sincronizado do banco
        _saveCloudInstanceState(inst, state, connected) {
            try {
                if (typeof window.sigeDB !== 'undefined' && window.sigeDB.data) {
                    if (!window.sigeDB.data.whatsappConfig) window.sigeDB.data.whatsappConfig = {};
                    if (!window.sigeDB.data.whatsappConfig.cloudInstanceStates) {
                        window.sigeDB.data.whatsappConfig.cloudInstanceStates = {};
                    }
                    const prev = window.sigeDB.data.whatsappConfig.cloudInstanceStates[inst];
                    const changed = !prev || prev.state !== state || prev.connected !== Boolean(connected);
                    window.sigeDB.data.whatsappConfig.cloudInstanceStates[inst] = {
                        state: state,
                        connected: Boolean(connected),
                        updatedAt: new Date().toISOString()
                    };
                    if (changed) {
                        if (typeof window.sigeDB.saveData === 'function') {
                            window.sigeDB.saveData(window.sigeDB.data);
                        } else if (typeof window.sigeDB.saveLocal === 'function') {
                            window.sigeDB.saveLocal();
                        }
                        if (typeof window.sigeDB.syncToFirebase === 'function') {
                            window.sigeDB.syncToFirebase();
                        }
                    }
                }
            } catch (_) {}
        }

        // Verifica se a API está configurada com URL e chave
        isConfigured() {
            const cfg = this.getConfig();
            return Boolean(cfg.apiUrl && cfg.apiKey);
        }

        // Headers padrão para comunicação com a Evolution API
        _getHeaders(withBody = false) {
            const cfg = this.getConfig();
            const headers = {
                'apikey': cfg.apiKey
            };
            if (withBody) {
                headers['Content-Type'] = 'application/json';
            }
            return headers;
        }

        // Fetch com timeout para evitar travamentos em redes restritas
        async _fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
            try {
                const res = await fetch(url, {
                    ...options,
                    signal: controller ? controller.signal : undefined
                });
                if (timer) clearTimeout(timer);
                return res;
            } catch (err) {
                if (timer) clearTimeout(timer);
                throw err;
            }
        }

        // Normaliza número de telefone para o padrão WhatsApp internacional (Brasil 55 + DDD + Número)
        normalizePhone(phone) {
            if (!phone) return '';
            let clean = String(phone).replace(/\D/g, '');
            if (!clean) return '';
            // Se já tem 55 e tem 12 ou 13 dígitos
            if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
                return clean;
            }
            // Se tem 10 ou 11 dígitos (DDD + 8 ou 9 dígitos)
            if (clean.length === 10 || clean.length === 11) {
                return '55' + clean;
            }
            return clean;
        }

        // Verifica o estado atual de conexão da instância ('open', 'connecting', 'close', etc.)
        async checkConnectionState(instanceName) {
            if (!this.isConfigured()) {
                return { state: 'unconfigured', connected: false, error: 'Evolution API não configurada' };
            }
            const cfg = this.getConfig();
            const inst = instanceName || cfg.activeInstance;

            try {
                const response = await this._fetchWithTimeout(`${cfg.apiUrl}/instance/connectionState/${inst}`, {
                    method: 'GET',
                    headers: this._getHeaders(false)
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        this._saveCloudInstanceState(inst, 'not_found', false);
                        return { state: 'not_found', connected: false, error: 'Instância não criada' };
                    }
                    return { state: 'error', connected: false, error: `HTTP ${response.status}` };
                }

                const data = await response.json();
                const state = data?.instance?.state || data?.state || 'close';
                const isConnected = state === 'open';
                this._saveCloudInstanceState(inst, state, isConnected);
                return {
                    state: state,
                    connected: isConnected,
                    raw: data
                };
            } catch (err) {
                console.warn(`[EvolutionClient] Aviso ao verificar conexão direta de '${inst}':`, err);
                const cached = cfg.cloudInstanceStates && cfg.cloudInstanceStates[inst];
                if (cached && cached.connected === true && cached.state === 'open') {
                    return {
                        state: 'open',
                        connected: true,
                        viaCloudCache: true,
                        cachedAt: cached.updatedAt
                    };
                }
                return { state: 'offline', connected: false, error: err.message };
            }
        }

        // Cria a instância caso ela não exista
        async createInstance(instanceName) {
            if (!this.isConfigured()) return { success: false, error: 'API não configurada' };
            const cfg = this.getConfig();
            const inst = instanceName || cfg.activeInstance;

            try {
                const response = await this._fetchWithTimeout(`${cfg.apiUrl}/instance/create`, {
                    method: 'POST',
                    headers: this._getHeaders(true),
                    body: JSON.stringify({
                        instanceName: inst,
                        token: cfg.apiKey,
                        qrcode: true,
                        integration: 'WHATSAPP-BAILEYS'
                    })
                });

                const data = await response.json();
                return {
                    success: response.ok,
                    data: data
                };
            } catch (err) {
                console.error(`[EvolutionClient] Erro ao criar instância '${inst}':`, err);
                return { success: false, error: err.message };
            }
        }

        // Obtém o QR Code em Base64 para exibir na tela do computador
        async getQrCode(instanceName) {
            if (!this.isConfigured()) return { success: false, error: 'API não configurada' };
            const cfg = this.getConfig();
            const inst = instanceName || cfg.activeInstance;

            // 1. Se já está conectado de verdade no servidor (ignora fallback offline)
            try {
                const check = await this.checkConnectionState(inst);
                if (check.connected && !check.viaCloudCache) {
                    return {
                        success: true,
                        alreadyConnected: true,
                        base64: null,
                        state: 'open'
                    };
                }
            } catch (_) {}

            // 2. Tenta obter o QR code diretamente
            try {
                let response = await this._fetchWithTimeout(`${cfg.apiUrl}/instance/connect/${inst}`, {
                    method: 'GET',
                    headers: this._getHeaders(false)
                });

                // Se a instância não existe ainda, tenta criar automaticamente
                if (response.status === 404) {
                    await this.createInstance(inst);
                    await new Promise(r => setTimeout(r, 1000));
                    response = await this._fetchWithTimeout(`${cfg.apiUrl}/instance/connect/${inst}`, {
                        method: 'GET',
                        headers: this._getHeaders(false)
                    });
                }

                if (!response.ok) {
                    return { success: false, error: `Falha ao obter QR Code (HTTP ${response.status})` };
                }

                let data = await response.json();

                // Se a API informou que a instância já está aberta/conectada
                if (data?.instance?.state === 'open' || data?.state === 'open') {
                    this._saveCloudInstanceState(inst, 'open', true);
                    return {
                        success: true,
                        alreadyConnected: true,
                        base64: null,
                        state: 'open'
                    };
                }

                let base64 = data?.base64 || data?.qrcode?.base64 || data?.code;

                // Se na primeira chamada não veio base64, aguarda 1.2s e tenta retry
                if (!base64 && (data?.error || !data?.count || data?.count <= 1)) {
                    await new Promise(r => setTimeout(r, 1200));
                    const retryRes = await this._fetchWithTimeout(`${cfg.apiUrl}/instance/connect/${inst}`, {
                        method: 'GET',
                        headers: this._getHeaders(false)
                    });
                    if (retryRes.ok) {
                        data = await retryRes.json();
                        base64 = data?.base64 || data?.qrcode?.base64 || data?.code;
                    }
                }

                // Se o count atingiu o limite de tentativas (30) e não está conectado, reinicia a sessão limpa
                if (!base64 && data?.count && data.count >= 30) {
                    console.warn(`[EvolutionClient] QR Code expirado ou limite atingido para '${inst}'. Reiniciando sessão...`);
                    return await this.resetInstance(inst);
                }

                return {
                    success: Boolean(base64),
                    alreadyConnected: false,
                    base64: base64,
                    pairingCode: data?.pairingCode || null,
                    count: data?.count || 0
                };
            } catch (err) {
                console.error(`[EvolutionClient] Erro ao buscar QR Code de '${inst}':`, err);
                const friendlyError = (err && /failed to fetch|networkerror|abort/i.test(String(err.message || err)))
                    ? 'A rede deste computador bloqueou o acesso direto à porta 8443 do servidor de WhatsApp (Firewall/Rede Local). Verifique a conexão Tailscale ou utilize o envio via WhatsApp Web.'
                    : (err.message || 'Erro de comunicação com o servidor WhatsApp.');
                return { success: false, error: friendlyError };
            }
        }

        // Desconecta / Desloga a sessão do WhatsApp no servidor
        async logoutInstance(instanceName) {
            if (!this.isConfigured()) return { success: false, error: 'API não configurada' };
            const cfg = this.getConfig();
            const inst = instanceName || cfg.activeInstance;

            this._saveCloudInstanceState(inst, 'close', false);

            try {
                const response = await this._fetchWithTimeout(`${cfg.apiUrl}/instance/logout/${inst}`, {
                    method: 'DELETE',
                    headers: this._getHeaders(false)
                });

                if (response.ok || response.status === 404) {
                    this._saveCloudInstanceState(inst, 'close', false);
                }

                return {
                    success: response.ok || response.status === 404,
                    status: response.status
                };
            } catch (err) {
                console.error(`[EvolutionClient] Erro ao deslogar instância '${inst}':`, err);
                return { success: false, error: err.message };
            }
        }

        // Deleta a instância e limpa sessões residuais no banco/redis
        async deleteInstance(instanceName) {
            if (!this.isConfigured()) return { success: false, error: 'API não configurada' };
            const cfg = this.getConfig();
            const inst = instanceName || cfg.activeInstance;

            try {
                const response = await this._fetchWithTimeout(`${cfg.apiUrl}/instance/delete/${inst}`, {
                    method: 'DELETE',
                    headers: this._getHeaders(false)
                });

                if (response.ok || response.status === 404) {
                    this._saveCloudInstanceState(inst, 'close', false);
                }

                return {
                    success: response.ok || response.status === 404,
                    status: response.status
                };
            } catch (err) {
                console.error(`[EvolutionClient] Erro ao deletar instância '${inst}':`, err);
                return { success: false, error: err.message };
            }
        }

        // Reinicia a instância (faz logout limpo e busca novo QR Code sem deletar a instância)
        async resetInstance(instanceName) {
            if (!this.isConfigured()) return { success: false, error: 'API não configurada' };
            const cfg = this.getConfig();
            const inst = instanceName || cfg.activeInstance;

            // 1. Marca como desconectado imediatamente
            this._saveCloudInstanceState(inst, 'connecting', false);

            // 2. Executa logout limpo da sessão anterior
            try {
                await this.logoutInstance(inst);
            } catch (err) {
                console.warn(`[EvolutionClient] Aviso no logout de '${inst}':`, err);
            }

            // 3. Aguarda 1.2s para teardown dos sockets do Baileys
            await new Promise(r => setTimeout(r, 1200));

            // 4. Solicita a conexão (gera novo QR Code)
            try {
                let res = await this._fetchWithTimeout(`${cfg.apiUrl}/instance/connect/${inst}`, {
                    method: 'GET',
                    headers: this._getHeaders(false)
                });

                // Se a instância não existe ainda no servidor (404), cria e conecta
                if (res.status === 404) {
                    await this.createInstance(inst);
                    await new Promise(r => setTimeout(r, 1000));
                    res = await this._fetchWithTimeout(`${cfg.apiUrl}/instance/connect/${inst}`, {
                        method: 'GET',
                        headers: this._getHeaders(false)
                    });
                }

                if (!res.ok) {
                    return { success: false, error: `Falha na API (HTTP ${res.status})` };
                }

                let data = await res.json();

                if (data?.instance?.state === 'open' || data?.state === 'open') {
                    this._saveCloudInstanceState(inst, 'open', true);
                    return {
                        success: true,
                        alreadyConnected: true,
                        base64: null,
                        state: 'open'
                    };
                }

                let base64 = data?.base64 || data?.qrcode?.base64 || data?.code;

                // Se não retornou base64 na primeira chamada, aguarda 1.2s e tenta uma vez mais
                if (!base64 && (data?.error || !data?.count || data?.count <= 1)) {
                    await new Promise(r => setTimeout(r, 1200));
                    const retryRes = await this._fetchWithTimeout(`${cfg.apiUrl}/instance/connect/${inst}`, {
                        method: 'GET',
                        headers: this._getHeaders(false)
                    });
                    if (retryRes.ok) {
                        data = await retryRes.json();
                        base64 = data?.base64 || data?.qrcode?.base64 || data?.code;
                    }
                }

                return {
                    success: Boolean(base64),
                    base64: base64,
                    pairingCode: data?.pairingCode || null,
                    count: data?.count || 1
                };
            } catch (err) {
                console.error(`[EvolutionClient] Erro ao resetar sessão de '${inst}':`, err);
                const friendlyError = (err && /failed to fetch|networkerror|abort/i.test(String(err.message || err)))
                    ? 'A rede deste computador bloqueou o acesso direto à porta 8443 do servidor de WhatsApp. Verifique se o Tailscale está ativo ou se a rede permite conexões na porta 8443.'
                    : (err.message || 'Erro ao reiniciar sessão.');
                return { success: false, error: friendlyError };
            }
        }

        // Envia mensagem de texto simples silenciosamente (1 clique)
        async sendText(phone, message, options = {}) {
            if (!this.isConfigured()) {
                return { success: false, error: 'Evolution API não configurada no sistema', isConfigError: true };
            }

            const cleanPhone = this.normalizePhone(phone);
            if (!cleanPhone || cleanPhone.length < 10) {
                return { success: false, error: 'Número de telefone inválido ou incompleto' };
            }

            const cfg = this.getConfig();
            const inst = options.instanceName || cfg.activeInstance;
            const delay = options.delay || 1200; // delay padrão para digitação humana

            try {
                const response = await this._fetchWithTimeout(`${cfg.apiUrl}/message/sendText/${inst}`, {
                    method: 'POST',
                    headers: this._getHeaders(true),
                    body: JSON.stringify({
                        number: cleanPhone,
                        text: message,
                        delay: delay
                    })
                }, 15000);

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = errData?.message || errData?.error || `HTTP ${response.status}`;
                    return { success: false, error: errMsg, status: response.status };
                }

                const data = await response.json();
                return {
                    success: true,
                    data: data,
                    cleanPhone: cleanPhone
                };
            } catch (err) {
                console.error(`[EvolutionClient] Erro ao enviar mensagem para ${cleanPhone}:`, err);
                return { success: false, error: err.message };
            }
        }

        // Envia documento em anexo (ex: PDF assinado) via Evolution API v2
        async sendDocument(phone, base64Pdf, fileName = 'documento.pdf', caption = '', options = {}) {
            if (!this.isConfigured()) {
                return { success: false, error: 'Evolution API não configurada no sistema', isConfigError: true };
            }

            const cleanPhone = this.normalizePhone(phone);
            if (!cleanPhone || cleanPhone.length < 10) {
                return { success: false, error: 'Número de telefone inválido ou incompleto' };
            }

            const cfg = this.getConfig();
            const inst = options.instanceName || cfg.activeInstance;
            const delay = options.delay || 1500;

            let mediaData = base64Pdf || '';
            if (mediaData.startsWith('data:')) {
                // mantém data-uri
            } else {
                mediaData = `data:application/pdf;base64,${mediaData}`;
            }

            try {
                const response = await this._fetchWithTimeout(`${cfg.apiUrl}/message/sendMedia/${inst}`, {
                    method: 'POST',
                    headers: this._getHeaders(true),
                    body: JSON.stringify({
                        number: cleanPhone,
                        mediatype: 'document',
                        mimetype: 'application/pdf',
                        caption: caption || '',
                        media: mediaData,
                        fileName: fileName || 'documento_assinado.pdf',
                        delay: delay
                    })
                }, 20000);

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    const errMsg = errData?.message || errData?.error || `HTTP ${response.status}`;
                    return { success: false, error: errMsg, status: response.status };
                }

                const data = await response.json();
                return {
                    success: true,
                    data: data,
                    cleanPhone: cleanPhone,
                    fileName: fileName
                };
            } catch (err) {
                console.error(`[EvolutionClient] Erro ao enviar documento para ${cleanPhone}:`, err);
                return { success: false, error: err.message };
            }
        }

        // Delay aleatório humano seguro para fila anti-ban (ex: 5 a 12 segundos)
        getRandomAntiBanDelayMs() {
            const cfg = this.getConfig();
            const min = cfg.antiBanDelayMin || 5;
            const max = cfg.antiBanDelayMax || 12;
            const seconds = Math.floor(Math.random() * (max - min + 1)) + min;
            return seconds * 1000;
        }
    }

    // Instância global única
    window.evolutionClient = new EvolutionClient();

})(typeof window !== 'undefined' ? window : this);

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
                antiBanDelayMax: cfg.antiBanDelayMax || 12  // segundos
            };
        }

        // Verifica se a API está configurada com URL e chave
        isConfigured() {
            const cfg = this.getConfig();
            return Boolean(cfg.apiUrl && cfg.apiKey);
        }

        // Headers padrão para comunicação com a Evolution API
        _getHeaders() {
            const cfg = this.getConfig();
            return {
                'Content-Type': 'application/json',
                'apikey': cfg.apiKey
            };
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
                const response = await fetch(`${cfg.apiUrl}/instance/connectionState/${inst}`, {
                    method: 'GET',
                    headers: this._getHeaders()
                });

                if (!response.ok) {
                    if (response.status === 404) {
                        return { state: 'not_found', connected: false, error: 'Instância não criada' };
                    }
                    return { state: 'error', connected: false, error: `HTTP ${response.status}` };
                }

                const data = await response.json();
                const state = data?.instance?.state || data?.state || 'close';
                return {
                    state: state,
                    connected: state === 'open',
                    raw: data
                };
            } catch (err) {
                console.warn(`[EvolutionClient] Erro ao verificar conexão de '${inst}':`, err);
                return { state: 'offline', connected: false, error: err.message };
            }
        }

        // Cria a instância caso ela não exista
        async createInstance(instanceName) {
            if (!this.isConfigured()) return { success: false, error: 'API não configurada' };
            const cfg = this.getConfig();
            const inst = instanceName || cfg.activeInstance;

            try {
                const response = await fetch(`${cfg.apiUrl}/instance/create`, {
                    method: 'POST',
                    headers: this._getHeaders(),
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

            // 1. Se já está conectado, retorna de imediato sem recriar ou gerar erro
            try {
                const check = await this.checkConnectionState(inst);
                if (check.connected) {
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
                let response = await fetch(`${cfg.apiUrl}/instance/connect/${inst}`, {
                    method: 'GET',
                    headers: this._getHeaders()
                });

                // Se a instância não existe ainda, tenta criar automaticamente
                if (response.status === 404) {
                    await this.createInstance(inst);
                    await new Promise(r => setTimeout(r, 800));
                    response = await fetch(`${cfg.apiUrl}/instance/connect/${inst}`, {
                        method: 'GET',
                        headers: this._getHeaders()
                    });
                }

                if (!response.ok) {
                    return { success: false, error: `Falha ao obter QR Code (HTTP ${response.status})` };
                }

                const data = await response.json();

                // Se a API informou que a instância já está aberta/conectada
                if (data?.instance?.state === 'open' || data?.state === 'open') {
                    return {
                        success: true,
                        alreadyConnected: true,
                        base64: null,
                        state: 'open'
                    };
                }

                const base64 = data?.base64 || data?.qrcode?.base64 || data?.code;

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
                return { success: false, error: err.message };
            }
        }

        // Desconecta / Desloga a sessão do WhatsApp no servidor
        async logoutInstance(instanceName) {
            if (!this.isConfigured()) return { success: false, error: 'API não configurada' };
            const cfg = this.getConfig();
            const inst = instanceName || cfg.activeInstance;

            try {
                const response = await fetch(`${cfg.apiUrl}/instance/logout/${inst}`, {
                    method: 'DELETE',
                    headers: this._getHeaders()
                });

                return {
                    success: response.ok,
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
                const response = await fetch(`${cfg.apiUrl}/instance/delete/${inst}`, {
                    method: 'DELETE',
                    headers: this._getHeaders()
                });

                return {
                    success: response.ok,
                    status: response.status
                };
            } catch (err) {
                console.error(`[EvolutionClient] Erro ao deletar instância '${inst}':`, err);
                return { success: false, error: err.message };
            }
        }

        // Reinicia a instância do zero (apaga conexão residual e recria instância limpa com QR novo)
        async resetInstance(instanceName) {
            if (!this.isConfigured()) return { success: false, error: 'API não configurada' };
            const inst = instanceName || this.getConfig().activeInstance;

            try {
                await this.logoutInstance(inst).catch(() => {});
            } catch (_) {}

            try {
                await this.deleteInstance(inst).catch(() => {});
            } catch (_) {}

            // Aguarda 500ms para limpeza dos sockets
            await new Promise(r => setTimeout(r, 500));
            await this.createInstance(inst);
            await new Promise(r => setTimeout(r, 800));

            // Busca novo QR Code limpo
            const cfg = this.getConfig();
            try {
                const res = await fetch(`${cfg.apiUrl}/instance/connect/${inst}`, {
                    method: 'GET',
                    headers: this._getHeaders()
                });
                const data = await res.json();
                const base64 = data?.base64 || data?.qrcode?.base64 || data?.code;
                return {
                    success: Boolean(base64),
                    base64: base64,
                    pairingCode: data?.pairingCode || null,
                    count: data?.count || 1
                };
            } catch (err) {
                return { success: false, error: err.message };
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
                const response = await fetch(`${cfg.apiUrl}/message/sendText/${inst}`, {
                    method: 'POST',
                    headers: this._getHeaders(),
                    body: JSON.stringify({
                        number: cleanPhone,
                        text: message,
                        delay: delay
                    })
                });

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

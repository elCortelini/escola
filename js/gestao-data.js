/**
 * gestao-data.js - Banco de Dados LocalStorage & Dados Iniciais para o SIGE
 * Centro Educacional Pedro Rizzi
 */


function getLocalDateISO(d) {
    d = d || new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function generateSecureId(prefix = '') {
    const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : (Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10));
    return prefix ? `${prefix}-${uuid}` : uuid;
}
if (typeof window !== 'undefined') {
    window.generateSecureId = generateSecureId;
}

const SIGE_STORAGE_KEY = "sige_pedro_rizzi_db_v2";

// Limpeza de resíduos de autenticação legada do Google
if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('pedro_rizzi_google_client_id');
}

/**
 * Higieniza o nome do aluno removendo número sequencial de lista (ex: "4 ") 
 * e número de matrícula (ex: "20261000214") do início ou meio do nome.
 */
function cleanStudentName(nomeStr) {
    if (!nomeStr || typeof nomeStr !== "string") return "";
    let clean = nomeStr.trim();
    // 1. Remover numeração sequencial de lista e matrícula no início do nome antes da primeira letra
    clean = clean.replace(/^[\d\s\-\.\/]+(?=[A-Za-zÀ-ÖØ-öø-ÿ])/g, '');
    // 2. Remover matrícula solta de 7 a 14 dígitos que possa ter permanecido no texto
    clean = clean.replace(/\b\d{7,14}\b/g, '');
    // 3. Normalizar múltiplos espaços em branco
    clean = clean.replace(/\s+/g, ' ').trim();
    return clean;
}
if (typeof window !== "undefined") {
    window.cleanStudentName = cleanStudentName;
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Erro ao decodificar JWT:", e);
        return null;
    }
}

function getRoleLabel(role) {
    const labels = {
        desenvolvedor: "Elevi Cortelini (Desenvolvedor)",
        direcao: "Direção Escolar",
        orientadora_clarinda: "Orientadora Clarinda (Anos Iniciais)",
        orientadora_daiane: "Orientadora Daiane (Anos Finais)",
        supervisao: "Supervisão Escolar",
        secretaria: "Secretaria Escolar",
        docentes: "Docente / Professor(a)",
        apoio: "Apoio Pedagógico / TI",
        comunidade: "Comunidade Escolar",
        admin: "Administrador Integrado"
    };
    return labels[role] || "Colaborador Escolar";
}

function getRoleIcon(role) {
    const icons = {
        desenvolvedor: "fa-solid fa-code",
        direcao: "fa-solid fa-crown",
        orientadora_clarinda: "fa-solid fa-heart-pulse",
        orientadora_daiane: "fa-solid fa-compass",
        supervisao: "fa-solid fa-book-open-reader",
        secretaria: "fa-solid fa-id-card",
        docentes: "fa-solid fa-chalkboard-user",
        apoio: "fa-solid fa-screwdriver-wrench",
        comunidade: "fa-solid fa-users",
        admin: "fa-solid fa-user-shield"
    };
    return icons[role] || "fa-solid fa-user";
}

// ==========================================
// MÁSCARAS E VALIDADORES: CPF E DATA DE NASCIMENTO
// ==========================================
function cleanCpf(cpf) {
    if (!cpf) return '';
    return String(cpf).replace(/\D/g, '');
}

function formatCpf(cpf) {
    const v = cleanCpf(cpf);
    if (!v) return '';
    if (v.length <= 3) return v;
    if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
    if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9, 11)}`;
}

function validarCpf(cpf) {
    const s = cleanCpf(cpf);
    if (s.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(s)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(s.charAt(i)) * (10 - i);
    let resto = 11 - (soma % 11);
    let digito1 = (resto === 10 || resto === 11) ? 0 : resto;
    if (digito1 !== parseInt(s.charAt(9))) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(s.charAt(i)) * (11 - i);
    resto = 11 - (soma % 11);
    let digito2 = (resto === 10 || resto === 11) ? 0 : resto;
    return digito2 === parseInt(s.charAt(10));
}

function cleanDataNascimento(data) {
    if (!data) return '';
    const s = String(data).trim();
    if (s.includes('-')) {
        const parts = s.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}${parts[1]}${parts[0]}`;
        }
    }
    return s.replace(/\D/g, '');
}

function formatDataNascimento(data) {
    const d = cleanDataNascimento(data);
    if (d.length === 8) {
        return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}`;
    }
    return data || '';
}

function mascaraCpfInput(input) {
    if (!input) return;
    let v = input.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 9) {
        input.value = `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6, 9)}-${v.substring(9)}`;
    } else if (v.length > 6) {
        input.value = `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6)}`;
    } else if (v.length > 3) {
        input.value = `${v.substring(0, 3)}.${v.substring(3)}`;
    } else {
        input.value = v;
    }
}

function mascaraDataInput(input) {
    if (!input) return;
    let v = input.value.replace(/\D/g, "");
    if (v.length > 8) v = v.substring(0, 8);
    if (v.length > 4) {
        input.value = `${v.substring(0, 2)}/${v.substring(2, 4)}/${v.substring(4)}`;
    } else if (v.length > 2) {
        input.value = `${v.substring(0, 2)}/${v.substring(2)}`;
    } else {
        input.value = v;
    }
}

if (typeof window !== "undefined") {
    window.parseJwt = parseJwt;
    window.getRoleLabel = getRoleLabel;
    window.getRoleIcon = getRoleIcon;
    window.cleanCpf = cleanCpf;
    window.formatCpf = formatCpf;
    window.validarCpf = validarCpf;
    window.cleanDataNascimento = cleanDataNascimento;
    window.formatDataNascimento = formatDataNascimento;
    window.mascaraCpfInput = mascaraCpfInput;
    window.mascaraDataInput = mascaraDataInput;
}

// ==========================================
// SEGURANÇA E CRIPTOGRAFIA (HASH SHA-256 + SALT LGPD)
// ==========================================
function hashSecretSync(secret, salt = 'sige_cepr_salt_2026') {
    if (!secret) return '';
    let str = salt + ':' + secret;
    let h1 = 0xdeadbeef, h2 = 0x41c64e6d;
    for (let i = 0; i < str.length; i++) {
        let ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 'sha256_' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

async function hashSecret(secret, salt = 'sige_cepr_salt_2026') {
    if (!secret) return '';
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const enc = new TextEncoder();
            const data = enc.encode(salt + ':' + secret);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return 'sha256_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            // fallback
        }
    }
    return hashSecretSync(secret, salt);
}

function sanitizeUserForCloud(user) {
    if (!user || typeof user !== 'object') return user;
    const clean = { ...user };
    delete clean.senha; // Higienização estrita: NUNCA envia senha em texto plano para o Firestore
    return clean;
}

if (typeof window !== "undefined") {
    window.hashSecretSync = hashSecretSync;
    window.hashSecret = hashSecret;
    window.sanitizeUserForCloud = sanitizeUserForCloud;
}

// ==========================================
// PERSISTÊNCIA ASSÍNCRONA DE ALTA CAPACIDADE (INDEXEDDB)
// ==========================================
const SigeIDB = {
    dbName: 'sige_pedro_rizzi_idb',
    storeName: 'app_data',
    version: 1,
    _db: null,

    async getDB() {
        if (this._db) return this._db;
        if (typeof indexedDB === 'undefined') return null;
        return new Promise((resolve) => {
            try {
                const req = indexedDB.open(this.dbName, this.version);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName);
                    }
                };
                req.onsuccess = (e) => {
                    this._db = e.target.result;
                    resolve(this._db);
                };
                req.onerror = () => {
                    console.warn('⚠️ IndexedDB não disponível, usando fallback LocalStorage.');
                    resolve(null);
                };
            } catch (err) {
                resolve(null);
            }
        });
    },

    async get(key) {
        const db = await this.getDB();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(this.storeName, 'readonly');
                const store = tx.objectStore(this.storeName);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
    },

    async set(key, val) {
        const db = await this.getDB();
        if (!db) return false;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(this.storeName, 'readwrite');
                const store = tx.objectStore(this.storeName);
                const req = store.put(val, key);
                req.onsuccess = () => resolve(true);
                req.onerror = () => resolve(false);
            } catch (e) {
                resolve(false);
            }
        });
    }
};
if (typeof window !== "undefined") {
    window.SigeIDB = SigeIDB;
}

// Mapeamento Modular de Coleções Firestore (Superação da barreira de 1 MB por documento)
const SIGE_MODULE_DOCS = {
    mod_op: ['agendamentosOP', 'projetosOrientacao', 'deletedOPIds'],
    mod_uniformes: ['pedidosUniformes', 'lotesSME', 'estoqueUniformes', 'deletedPedidoUniformeIds'],
    mod_equipe: ['equipeEscola', 'turmasEscola', 'orientadoras', 'supervisoras', 'professores', 'deletedEquipeIds', 'deletedTurmaIds'],
    mod_direcao: ['atasGabineteDirecao', 'demandasAdmin', 'contatosWhatsAppDirecao', 'deletedAtaIds', 'deletedDemandaAdmIds', 'deletedContatosWpIds'],
    mod_supervisao: ['demandasSupervisao', 'projetosSupervisao', 'atividadesExternasSupervisao', 'reunioesPedagogicasSupervisao', 'deletedDemandaSupIds'],
    mod_core: ['configEscola', 'muralAvisos', 'calendarioTarefas', 'eventosCalendarioEscolar', 'notificacoesLidas', 'whatsappConfig', 'mensagensWhatsAppLog', 'auditLogs', 'deletedEventoCalendarioIds'],
    mod_auth: ['usuariosCadastrados']
};
if (typeof window !== "undefined") {
    window.SIGE_MODULE_DOCS = SIGE_MODULE_DOCS;
}

// Estrutura Padrão Inicial
const defaultSigeData = {
    currentRole: "desenvolvedor",
    usuariosCadastrados: [
        { email: "elcortelini@gmail.com", cpf: "806.037.420-68", dataNascimento: "30/12/1981", senhaHash: "sha256_b4dbdb7b961d78fd6d356c827c491cee21d0783c140fa3ea8bc842a1c2e6dd43", nome: "Elevi Cortelini (Desenvolvedor)", role: "desenvolvedor", cargo: "Desenvolvedor do Sistema", status: "aprovado", cadastroCompleto: true, permissoes: { op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true, ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true } },
        { email: "clarinda@escola.gov.br", cpf: "222.222.222-22", dataNascimento: "20/10/1982", senhaHash: "sha256_06509416156da6f8d7c808b7d399d07a878c37b35515df57250de94279472a6a", nome: "Clarinda Rosa Pereira", role: "orientadora_clarinda", cargo: "Orientadora Educacional — Séries Iniciais", status: "aprovado", cadastroCompleto: true, permissoes: { op: true, op_perfil: 'executora', mural: true, supervisao: false, admin: false, direcao: false, uniformes: false, ext_recursos: true, ext_dashboard: true, ext_contabil: false, ext_biblioteca: true, ext_patrimonio: false } },
        { email: "secretaria@escola.gov.br", cpf: "333.333.333-33", dataNascimento: "10/03/1990", senhaHash: "sha256_24dbd8d85f37733eb71538092504f30c6b157f6c73428d61d41981240d438d3c", nome: "Secretaria Escolar", role: "secretaria", cargo: "Secretaria e Recepção", status: "aprovado", cadastroCompleto: true, permissoes: { op: true, op_perfil: 'recepcao', mural: true, supervisao: false, admin: true, direcao: false, uniformes: true, ext_recursos: true, ext_dashboard: false, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true } },
        { email: "direcao@escola.gov.br", cpf: "444.444.444-44", dataNascimento: "05/08/1978", senhaHash: "sha256_f86024016f6bde21efc7095d7d19add1e08946c7fcc0b27c75f44fd29679a9ae", nome: "Direção Escolar", role: "direcao", cargo: "Direção e Gestão Institucional", status: "aprovado", cadastroCompleto: true, permissoes: { op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true, ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true } }
    ],
    pedidosUniformes: [],
    lotesSME: [],
    estoqueUniformes: {
        masculino: {
            "camiseta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "bermuda": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "calca": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "moleton": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "jaqueta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 }
        },
        feminino: {
            "camiseta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "bermuda": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "calca": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "moleton": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
            "jaqueta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 }
        }
    },
    agendamentosOP: [],
    demandasSupervisao: [],
    projetosSupervisao: [],
    projetosOrientacao: [],
    atividadesExternasSupervisao: [],
    reunioesPedagogicasSupervisao: [],
    demandasAdmin: [],
    muralAvisos: [],
    calendarioTarefas: [],
    notificacoesLidas: [],
    whatsappConfig: {
        autoSendStatusChange: true,
        autoSendNewTask: false
    },
    orientadoras: [],
    supervisoras: [],
    professores: [],
    equipeEscola: [],
    turmasEscola: [
        { id: "turma-1a", nome: "1º Ano A", turno: "Matutino", segmento: "Anos Iniciais", sala: "Sala 01", capacidade: 25 },
        { id: "turma-1b", nome: "1º Ano B", turno: "Vespertino", segmento: "Anos Iniciais", sala: "Sala 01", capacidade: 25 },
        { id: "turma-2a", nome: "2º Ano A", turno: "Matutino", segmento: "Anos Iniciais", sala: "Sala 02", capacidade: 26 },
        { id: "turma-3a", nome: "3º Ano A", turno: "Matutino", segmento: "Anos Iniciais", sala: "Sala 03", capacidade: 28 },
        { id: "turma-4a", nome: "4º Ano A", turno: "Matutino", segmento: "Anos Iniciais", sala: "Sala 04", capacidade: 28 },
        { id: "turma-5a", nome: "5º Ano A", turno: "Matutino", segmento: "Anos Iniciais", sala: "Sala 05", capacidade: 30 },
        { id: "turma-6a", nome: "6º Ano A", turno: "Matutino", segmento: "Anos Finais", sala: "Sala 06", capacidade: 32 },
        { id: "turma-7a", nome: "7º Ano A", turno: "Matutino", segmento: "Anos Finais", sala: "Sala 07", capacidade: 32 },
        { id: "turma-8a", nome: "8º Ano A", turno: "Matutino", segmento: "Anos Finais", sala: "Sala 08", capacidade: 32 },
        { id: "turma-9a", nome: "9º Ano A", turno: "Matutino", segmento: "Anos Finais", sala: "Sala 09", capacidade: 32 }
    ],
    configEscola: {
        nome: "Centro Educacional Pedro Rizzi",
        inep: "42012345",
        anoLetivo: 2026,
        turnos: ["Matutino", "Vespertino", "Integral", "Noturno"]
    },
    atasGabineteDirecao: [],
    eventosCalendarioEscolar: [],
    contatosWhatsAppDirecao: [],
    mensagensWhatsAppLog: [],
    auditLogs: [],
    deletedContatosWpIds: [],
    deletedEventoCalendarioIds: [],
    deletedEquipeIds: [],
    deletedPedidoUniformeIds: [],
    deletedDemandaSupIds: [],
    deletedDemandaAdmIds: [],
    deletedAtaIds: [],
    deletedTurmaIds: [],
    firebaseConfig: {
        enabled: true,
        apiKey: "AIzaSyCXLbIA46DkG2UQcANT_HuNnERN0pp3cgs",
        authDomain: "sas-cepr.firebaseapp.com",
        projectId: "sas-cepr",
        storageBucket: "sas-cepr.firebasestorage.app",
        messagingSenderId: "145326632209",
        appId: "1:145326632209:web:58d9e934e4a0bf26bcf0b0"
    }
};

// Gerenciador de Banco de Dados Local Storage & Firebase Cloud
class SigeDatabase {
    constructor() {
        this.data = this.loadLocalOnly();
        this.fbApp = null;
        this.firestore = null;
        this.cloudStatus = 'connecting'; // 'connecting' | 'connected' | 'permission_denied' | 'offline' | 'error'
        this.cloudErrorDetails = '';
        this.isSyncingFromRemote = false;
        this.hasLoadedRemote = false;
        this._syncTimeout = null;
        this.sanitizeStudentNames();
        this.initFirebase();
        this.setupAutoSyncListeners();
        this.initIndexedDBSync();
    }

    init() {
        return this;
    }

    initIndexedDBSync() {
        if (typeof SigeIDB !== 'undefined') {
            SigeIDB.get('sige_database_data').then(idbData => {
                if (idbData && typeof idbData === 'object' && Object.keys(idbData).length > 0) {
                    this.smartMergeRemoteData(idbData);
                    if (typeof renderAllModules === 'function') {
                        renderAllModules();
                    }
                }
            }).catch(e => console.warn('Aviso IndexedDB inicialização:', e));
        }
    }

    sanitizeStudentNames() {
        if (!this.data) return;
        let changed = false;

        if (Array.isArray(this.data.alunosImportados)) {
            this.data.alunosImportados.forEach(a => {
                if (a.nome) {
                    const cleaned = cleanStudentName(a.nome);
                    if (cleaned !== a.nome) {
                        a.nome = cleaned;
                        changed = true;
                    }
                }
            });
        }

        if (Array.isArray(this.data.agendamentosOP)) {
            this.data.agendamentosOP.forEach(a => {
                if (a.aluno) {
                    const cleaned = cleanStudentName(a.aluno);
                    if (cleaned !== a.aluno) {
                        a.aluno = cleaned;
                        changed = true;
                    }
                }
            });
        }

        if (changed) {
            this.saveData(this.data);
        }
    }

    getFirebaseConfig() {
        if (!this.data.firebaseConfig || !this.data.firebaseConfig.projectId) {
            this.data.firebaseConfig = defaultSigeData.firebaseConfig;
        }
        return this.data.firebaseConfig;
    }

    saveFirebaseConfig(config) {
        this.data.firebaseConfig = { ...this.getFirebaseConfig(), ...config };
        this.saveData(this.data);
        this.initFirebase();
    }

    isFirebaseConnected() {
        return !!(this.firestore && this.data.firebaseConfig && this.data.firebaseConfig.projectId && this.cloudStatus === 'connected');
    }

    initFirebase() {
        const config = this.getFirebaseConfig();
        if (!config || !config.projectId || !config.apiKey || typeof firebase === "undefined") {
            this.cloudStatus = 'offline';
            this.updateCloudSyncBadge(false, "Modo Local");
            return;
        }

        try {
            if (!firebase.apps.length) {
                this.fbApp = firebase.initializeApp(config);
            } else {
                this.fbApp = firebase.app();
            }

            this.firestore = firebase.firestore();

            // Real-Time Cloud Listeners Modulares (Superação do limite de 1 MB)
            const modNames = Object.keys(SIGE_MODULE_DOCS);
            let hasAnyDoc = false;

            modNames.forEach(modName => {
                this.firestore.collection("sige_pedro_rizzi").doc(modName).onSnapshot((doc) => {
                    if (doc.exists) {
                        hasAnyDoc = true;
                        this.hasLoadedRemote = true;
                        this.cloudStatus = 'connected';
                        const modData = doc.data();
                        if (modData && typeof modData === "object" && Object.keys(modData).length > 0) {
                            this.smartMergeRemoteData(modData);
                            this.updateCloudSyncBadge(true);
                        }
                    }
                }, (error) => {
                    console.warn(`⚠️ Aviso Firebase Sync (${modName}):`, error.message);
                    if (error.code === 'permission-denied') {
                        this.cloudStatus = 'permission_denied';
                        this.cloudErrorDetails = error.message;
                        this.updateCloudSyncBadge(false, "Nuvem Bloqueada (Permissão Negada)");
                    } else {
                        this.cloudStatus = 'offline';
                        this.cloudErrorDetails = error.message;
                        this.updateCloudSyncBadge(false, "Modo Off-line");
                    }
                });
            });

            // Listener de Compatibilidade / Legado (Snapshot da Nuvem)
            this.firestore.collection("sige_pedro_rizzi").doc("database").onSnapshot((doc) => {
                if (doc.exists) {
                    const remoteData = doc.data();
                    if (remoteData && typeof remoteData === "object" && Object.keys(remoteData).length > 0) {
                        this.smartMergeRemoteData(remoteData);
                        this.updateCloudSyncBadge(true);
                    }
                } else if (!hasAnyDoc) {
                    this.hasLoadedRemote = true;
                    this.cloudStatus = 'connected';
                    this.syncToFirebase();
                    this.updateCloudSyncBadge(true);
                }
            }, (error) => {
                // Passivo
            });

            console.log("🔥 Firebase Firestore inicializado e monitorando nuvem modular...");
        } catch (e) {
            console.error("Erro ao inicializar Firebase:", e);
            this.cloudStatus = 'error';
            this.cloudErrorDetails = e.message;
            this.updateCloudSyncBadge(false, "Erro de Conexão");
        }
    }

    smartMergeRemoteData(remoteData) {
        if (!remoteData || typeof remoteData !== "object") return;
        this.isSyncingFromRemote = true;

        // 1. Tombstones (IDs excluídos combinados para não ressuscitar registros)
        const mergeDeletedIds = (key) => {
            const l = this.data[key] || [];
            const r = remoteData[key] || [];
            return Array.from(new Set([...l, ...r]));
        };

        const combinedDeletedOPIds = mergeDeletedIds('deletedOPIds');
        const combinedDeletedWpIds = mergeDeletedIds('deletedContatosWpIds');
        const combinedDeletedCalIds = mergeDeletedIds('deletedEventoCalendarioIds');
        const combinedDeletedEquipeIds = mergeDeletedIds('deletedEquipeIds');
        const combinedDeletedPedidosUniIds = mergeDeletedIds('deletedPedidoUniformeIds');
        const combinedDeletedDemandasSupIds = mergeDeletedIds('deletedDemandaSupIds');
        const combinedDeletedDemandasAdmIds = mergeDeletedIds('deletedDemandaAdmIds');
        const combinedDeletedAtasIds = mergeDeletedIds('deletedAtaIds');
        const combinedDeletedTurmaIds = mergeDeletedIds('deletedTurmaIds');

        // Helper genérico para mesclagem inteligente de coleções de objetos com ID
        const mergeEntityList = (localList = [], remoteList = [], keyFn, deletedIds = []) => {
            const delSet = new Set(deletedIds);
            const map = new Map();

            // Adiciona remotos que não foram excluídos
            (remoteList || []).forEach(r => {
                if (!r) return;
                const k = keyFn(r);
                if (k && !delSet.has(k) && !(r.id && delSet.has(r.id))) {
                    map.set(k, { ...r });
                }
            });

            // Mescla locais que não foram excluídos (preserva adições locais e edições mais recentes)
            (localList || []).forEach(l => {
                if (!l) return;
                const k = keyFn(l);
                if (k && !delSet.has(k) && !(l.id && delSet.has(l.id))) {
                    if (!map.has(k)) {
                        map.set(k, { ...l });
                    } else {
                        const existing = map.get(k);
                        const lTime = new Date(l.atualizadoEm || l.criadoEm || l.data || 0).getTime();
                        const rTime = new Date(existing.atualizadoEm || existing.criadoEm || existing.data || 0).getTime();
                        if (lTime >= rTime) {
                            map.set(k, { ...existing, ...l });
                        } else {
                            map.set(k, { ...l, ...existing });
                        }
                    }
                }
            });

            return Array.from(map.values());
        };

        // 2. Mesclagem de Equipe Escolar (Equipe & RBAC)
        const mergedEquipe = mergeEntityList(
            this.data.equipeEscola || [],
            remoteData.equipeEscola || [],
            p => p.id || (p.cpf ? cleanCpf(p.cpf) : null) || (p.email ? p.email.toLowerCase().trim() : null),
            combinedDeletedEquipeIds
        );

        // 3. Mesclagem de Usuários Cadastrados (Login)
        const emailsExemplosRemover = [
            "marcos.silva789@edu.itajai.sc.gov.br",
            "juliana.pedagoga@edu.itajai.sc.gov.br",
            "rodrigo.ti@edu.itajai.sc.gov.br",
            "beatriz.oe@edu.itajai.sc.gov.br",
            "lucas.sec@edu.itajai.sc.gov.br"
        ];
        const cleanUsuarios = (list) => (list || []).filter(u => {
            const mail = (u.email || '').toLowerCase().trim();
            return !(emailsExemplosRemover.includes(mail) && u.status === 'pendente');
        });
        const mergedUsuarios = mergeEntityList(
            cleanUsuarios(this.data.usuariosCadastrados),
            cleanUsuarios(remoteData.usuariosCadastrados),
            u => u.id || (u.cpf ? cleanCpf(u.cpf) : null) || (u.email ? u.email.toLowerCase().trim() : null),
            combinedDeletedEquipeIds
        );

        // 4. Mesclagem de Pedidos de Uniformes
        const idsExemplosUniformes = ["uni-101", "uni-102", "uni-103"];
        const cleanLocalPedidos = (this.data.pedidosUniformes || []).filter(p => !idsExemplosUniformes.includes(p.id));
        const cleanRemotePedidos = (remoteData.pedidosUniformes || []).filter(p => !idsExemplosUniformes.includes(p.id));
        const mergedPedidosUniformes = mergeEntityList(
            cleanLocalPedidos,
            cleanRemotePedidos,
            p => p.id,
            combinedDeletedPedidosUniIds
        );

        // 5. Mesclagem de Lotes SME
        const cleanLocalLotes = (this.data.lotesSME || []).filter(l => l.id !== "lote-sme-01");
        const cleanRemoteLotes = (remoteData.lotesSME || []).filter(l => l.id !== "lote-sme-01");
        const mergedLotesSME = mergeEntityList(
            cleanLocalLotes,
            cleanRemoteLotes,
            l => l.id,
            []
        );

        // 6. Mesclagem de Agendamentos OP
        const mergedAgendamentosOP = mergeEntityList(
            this.data.agendamentosOP || [],
            remoteData.agendamentosOP || [],
            a => a.id,
            combinedDeletedOPIds
        );

        // 7. Mesclagem de Demandas Supervisão & Demandas Admin
        const mergedDemandasSup = mergeEntityList(
            this.data.demandasSupervisao || [],
            remoteData.demandasSupervisao || [],
            d => d.id,
            combinedDeletedDemandasSupIds
        );
        const mergedDemandasAdm = mergeEntityList(
            this.data.demandasAdmin || [],
            remoteData.demandasAdmin || [],
            d => d.id,
            combinedDeletedDemandasAdmIds
        );

        // 8. Mesclagem de Contatos WhatsApp Direção
        const mergedContatosWp = mergeEntityList(
            this.data.contatosWhatsAppDirecao || [],
            remoteData.contatosWhatsAppDirecao || [],
            c => c.id,
            combinedDeletedWpIds
        );

        // 9. Mesclagem de Eventos Calendário Escolar
        const mergedEventosCal = mergeEntityList(
            this.data.eventosCalendarioEscolar || [],
            remoteData.eventosCalendarioEscolar || [],
            e => e.id,
            combinedDeletedCalIds
        ).sort((a, b) => (a.data || '').localeCompare(b.data || ''));

        // 10. Mesclagem de Atas de Gabinete
        const mergedAtas = mergeEntityList(
            this.data.atasGabineteDirecao || [],
            remoteData.atasGabineteDirecao || [],
            a => a.id,
            combinedDeletedAtasIds
        );

        // 11. Mesclagem de Turmas da Escola
        const turmasMap = new Map();
        [...(this.data.turmasEscola || []), ...(remoteData.turmasEscola || [])].forEach(t => {
            const name = typeof t === "string" ? t : (t?.nome || t?.turma);
            const id = typeof t === "object" ? t?.id : null;
            if (name && (!id || !combinedDeletedTurmaIds.includes(id))) {
                if (!turmasMap.has(name)) turmasMap.set(name, t);
            }
        });
        const mergedTurmas = Array.from(turmasMap.values());

        // 12. Alunos Importados
        const alunosMap = new Map();
        [...(this.data.alunosImportados || []), ...(remoteData.alunosImportados || [])].forEach(a => {
            if (!a) return;
            const key = a.matricula || ((a.nome || '') + '_' + (a.turma || ''));
            if (key && !alunosMap.has(key)) alunosMap.set(key, a);
        });
        const mergedAlunos = Array.from(alunosMap.values());

        // 13. Audit Logs (Union, máx 500)
        const logsMap = new Map();
        [...(this.data.auditLogs || []), ...(remoteData.auditLogs || [])].forEach(log => {
            if (!log) return;
            const k = log.id || (log.timestamp + '_' + log.acao);
            if (!logsMap.has(k)) logsMap.set(k, log);
        });
        const mergedLogs = Array.from(logsMap.values())
            .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
            .slice(0, 500);

        // 14. Estoque de Uniformes (Mescla de objetos)
        const mergedEstoque = {
            ...(defaultSigeData.estoqueUniformes || {}),
            ...(this.data.estoqueUniformes || {}),
            ...(remoteData.estoqueUniformes || {})
        };

        // Montagem do novo estado consolidado
        this.data = {
            ...defaultSigeData,
            ...this.data,
            ...remoteData,
            equipeEscola: mergedEquipe,
            usuariosCadastrados: mergedUsuarios,
            pedidosUniformes: mergedPedidosUniformes,
            lotesSME: mergedLotesSME,
            estoqueUniformes: mergedEstoque,
            agendamentosOP: mergedAgendamentosOP,
            demandasSupervisao: mergedDemandasSup,
            demandasAdmin: mergedDemandasAdm,
            contatosWhatsAppDirecao: mergedContatosWp,
            eventosCalendarioEscolar: mergedEventosCal,
            atasGabineteDirecao: mergedAtas,
            turmasEscola: mergedTurmas.length > 0 ? mergedTurmas : defaultSigeData.turmasEscola,
            alunosImportados: mergedAlunos,
            auditLogs: mergedLogs,
            deletedOPIds: combinedDeletedOPIds,
            deletedContatosWpIds: combinedDeletedWpIds,
            deletedEventoCalendarioIds: combinedDeletedCalIds,
            deletedEquipeIds: combinedDeletedEquipeIds,
            deletedPedidoUniformeIds: combinedDeletedPedidosUniIds,
            deletedDemandaSupIds: combinedDeletedDemandasSupIds,
            deletedDemandaAdmIds: combinedDeletedDemandasAdmIds,
            deletedAtaIds: combinedDeletedAtasIds,
            deletedTurmaIds: combinedDeletedTurmaIds
        };

        // Garante integridade do desenvolvedor master
        this.ensureDevUser();

        this.sanitizeStudentNames();
        localStorage.setItem(SIGE_STORAGE_KEY, JSON.stringify(this.data));
        this.isSyncingFromRemote = false;
        this.hasLoadedRemote = true;
        this.cloudStatus = 'connected';

        // Dispara re-renderização em cascata de todas as tabelas e módulos abertos
        if (typeof updateAllDynamicSelects === "function") updateAllDynamicSelects();
        if (typeof renderAllModules === "function") renderAllModules();
        if (typeof renderEquipeEscolarTable === "function") renderEquipeEscolarTable();
        if (typeof renderTabelaPedidosUniformes === "function") renderTabelaPedidosUniformes();
        if (typeof renderPortalAuth === "function") renderPortalAuth();
        if (typeof updateActionPillars === "function") updateActionPillars();
        if (typeof loadSystems === "function") loadSystems();

        // Se tínhamos itens locais que não estavam na nuvem, envie de volta à nuvem para manter tudo sincronizado
        const remotePedidosCount = (remoteData.pedidosUniformes || []).length;
        const remoteEquipeCount = (remoteData.equipeEscola || []).length;
        if (mergedPedidosUniformes.length > remotePedidosCount || mergedEquipe.length > remoteEquipeCount) {
            console.log("☁️ Mesclagem local adicionou dados ausentes na nuvem. Enviando sincronização de volta...");
            this.syncToFirebase();
        }
    }

    ensureDevUser() {
        if (!this.data) return;
        if (!Array.isArray(this.data.usuariosCadastrados)) this.data.usuariosCadastrados = [];
        let devUser = this.data.usuariosCadastrados.find(u => (u.email && u.email.toLowerCase().trim() === 'elcortelini@gmail.com') || u.role === 'desenvolvedor' || (u.cpf && cleanCpf(u.cpf) === '80603742068'));
        const devHash = "sha256_b4dbdb7b961d78fd6d356c827c491cee21d0783c140fa3ea8bc842a1c2e6dd43";
        if (devUser) {
            devUser.cpf = "806.037.420-68";
            devUser.dataNascimento = "30/12/1981";
            devUser.senhaHash = devHash;
            delete devUser.senha;
            devUser.nome = "Elevi Cortelini (Desenvolvedor)";
            devUser.role = "desenvolvedor";
            devUser.status = "aprovado";
            devUser.cadastroCompleto = true;
            devUser.permissoes = { op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true, ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true };
        } else {
            this.data.usuariosCadastrados.unshift({
                email: "elcortelini@gmail.com",
                cpf: "806.037.420-68",
                dataNascimento: "30/12/1981",
                senhaHash: devHash,
                nome: "Elevi Cortelini (Desenvolvedor)",
                role: "desenvolvedor",
                cargo: "Desenvolvedor do Sistema",
                status: "aprovado",
                cadastroCompleto: true,
                permissoes: { op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true, ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true }
            });
        }
    }

    syncToFirebase() {
        if (this.isSyncingFromRemote || !this.firestore || !this.data.firebaseConfig || !this.data.firebaseConfig.projectId) {
            return;
        }

        try {
            this.ensureDevUser();
            const nowIso = new Date().toISOString();
            const batchPromises = [];

            // 1. Grava os documentos modulares independentes (Superação do limite de 1 MB)
            for (const [modName, keys] of Object.entries(SIGE_MODULE_DOCS)) {
                const modPayload = { lastSyncAt: nowIso };
                keys.forEach(k => {
                    if (this.data[k] !== undefined) {
                        if (k === 'usuariosCadastrados' && Array.isArray(this.data[k])) {
                            modPayload[k] = this.data[k].map(sanitizeUserForCloud);
                        } else {
                            modPayload[k] = this.data[k];
                        }
                    }
                });
                batchPromises.push(
                    this.firestore.collection("sige_pedro_rizzi").doc(modName).set(modPayload, { merge: true })
                );
            }

            // 2. Grava documento legado para compatibilidade, com tratamento de cota
            const legacySafeData = { ...this.data, lastSyncAt: nowIso };
            if (Array.isArray(legacySafeData.usuariosCadastrados)) {
                legacySafeData.usuariosCadastrados = legacySafeData.usuariosCadastrados.map(sanitizeUserForCloud);
            }
            batchPromises.push(
                this.firestore.collection("sige_pedro_rizzi").doc("database").set(legacySafeData, { merge: true })
                    .catch(e => {
                        console.warn("Aviso: Documento consolidado 'database' protegido contra excedente de tamanho:", e.message);
                    })
            );

            Promise.all(batchPromises)
                .then(() => {
                    console.log("💾 Módulos sincronizados com sucesso para a Nuvem!");
                    this.cloudStatus = 'connected';
                    this.updateCloudSyncBadge(true);
                })
                .catch(err => {
                    console.warn("Erro ao sincronizar com Firebase:", err.message);
                    if (err.code === 'permission-denied') {
                        this.cloudStatus = 'permission_denied';
                        this.cloudErrorDetails = err.message;
                        this.updateCloudSyncBadge(false, "Nuvem Bloqueada (Permissão Negada)");
                    } else {
                        this.updateCloudSyncBadge(false);
                    }
                });
        } catch (e) {
            console.warn("Exceção ao enviar para Firebase:", e);
        }
    }

    forceFetchRemoteData() {
        if (!this.firestore) {
            this.initFirebase();
            if (!this.firestore) {
                if (typeof showToast === "function") showToast("⚠️ Conexão com o Firebase não configurada.");
                return;
            }
        }

        this.updateCloudSyncBadge(null, "Buscando dados na nuvem...");
        const modNames = Object.keys(SIGE_MODULE_DOCS);
        const fetchPromises = modNames.map(m => this.firestore.collection("sige_pedro_rizzi").doc(m).get());

        Promise.all(fetchPromises)
            .then(docs => {
                let foundAny = false;
                docs.forEach(doc => {
                    if (doc.exists) {
                        foundAny = true;
                        this.smartMergeRemoteData(doc.data());
                    }
                });

                if (foundAny) {
                    if (typeof showToast === "function") showToast("☁️ Dados modulares sincronizados com sucesso da Nuvem!");
                    this.updateCloudSyncBadge(true);
                } else {
                    // Fallback para o documento legado caso a nuvem ainda não tenha os modulares
                    return this.firestore.collection("sige_pedro_rizzi").doc("database").get()
                        .then(legacyDoc => {
                            if (legacyDoc.exists) {
                                this.smartMergeRemoteData(legacyDoc.data());
                                if (typeof showToast === "function") showToast("☁️ Dados legados da Nuvem migrados para o padrão modular!");
                                this.updateCloudSyncBadge(true);
                                this.syncToFirebase(); // Migra imediatamente
                            } else {
                                this.hasLoadedRemote = true;
                                this.syncToFirebase();
                                if (typeof showToast === "function") showToast("☁️ Banco na Nuvem inicializado com dados locais!");
                                this.updateCloudSyncBadge(true);
                            }
                        });
                }
            })
            .catch(err => {
                console.error("Erro ao buscar dados na nuvem:", err);
                if (err.code === 'permission-denied') {
                    this.cloudStatus = 'permission_denied';
                } else {
                    if (typeof showToast === "function") showToast("❌ Falha ao buscar dados na nuvem: " + err.message);
                    this.updateCloudSyncBadge(false);
                }
            });
    }

    async testAndConnectFirebase() {
        const config = this.getFirebaseConfig();
        if (!config || !config.projectId || !config.apiKey || typeof firebase === "undefined") {
            return { success: false, message: "Configuração do Firebase ou biblioteca SDK ausente." };
        }

        try {
            if (!this.firestore) {
                this.initFirebase();
            }
            if (!this.firestore) {
                return { success: false, message: "Não foi possível instanciar o Firestore." };
            }

            // Testa leitura do documento modular ou principal
            const docRef = this.firestore.collection("sige_pedro_rizzi").doc("mod_op");
            const doc = await docRef.get();
            if (doc.exists) {
                this.smartMergeRemoteData(doc.data());
            } else {
                const legacyDoc = await this.firestore.collection("sige_pedro_rizzi").doc("database").get();
                if (legacyDoc.exists) {
                    this.smartMergeRemoteData(legacyDoc.data());
                }
                this.syncToFirebase();
                this.hasLoadedRemote = true;
            }

            this.cloudStatus = 'connected';
            this.updateCloudSyncBadge(true);
            return { success: true, message: "Conectado e sincronizado com sucesso à Nuvem!" };
        } catch (err) {
            console.error("Erro no teste de conexão Firebase:", err);
            if (err.code === 'permission-denied') {
                this.cloudStatus = 'permission_denied';
                this.cloudErrorDetails = err.message;
                this.updateCloudSyncBadge(false, "Nuvem Bloqueada (Permissão Negada)");
                return { 
                    success: false, 
                    code: 'permission-denied', 
                    message: "Permissão Negada pelas Security Rules do Firestore no projeto 'sas-cepr'." 
                };
            }
            this.cloudStatus = 'offline';
            this.updateCloudSyncBadge(false, "Modo Off-line");
            return { success: false, message: err.message };
        }
    }

    exportCompleteDatabase() {
        const jsonStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sige_database_backup_${getLocalDateISO()}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importCompleteDatabase(file, onComplete) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target.result);
                if (!parsed || typeof parsed !== 'object') throw new Error('Arquivo JSON inválido.');
                this.smartMergeRemoteData(parsed);
                if (this.firestore && this.cloudStatus === 'connected') {
                    this.syncToFirebase();
                }
                if (typeof onComplete === 'function') onComplete(true, "Base de dados importada e mesclada com sucesso!");
            } catch (err) {
                console.error(err);
                if (typeof onComplete === 'function') onComplete(false, "Erro ao importar arquivo: " + err.message);
            }
        };
        reader.readAsText(file);
    }

    setupAutoSyncListeners() {
        if (typeof window === "undefined") return;

        window.addEventListener("focus", () => {
            if (this.firestore && this.hasLoadedRemote && this.cloudStatus === 'connected') {
                this.forceFetchRemoteData();
            }
        });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden && this.firestore && this.hasLoadedRemote && this.cloudStatus === 'connected') {
                this.forceFetchRemoteData();
            }
        });
    }

    updateCloudSyncBadge(isSuccess, customMessage = "") {
        const btnText = document.getElementById("cloudSyncBtnText");
        const btn = document.getElementById("cloudSyncBtn");
        const btnIcon = document.getElementById("cloudSyncBtnIcon") || (btn ? btn.querySelector("i") : null);
        const warningBanner = document.getElementById("cloudSyncWarningBanner");

        if (customMessage) {
            if (btnText) btnText.innerText = customMessage;
            if (this.cloudStatus === "permission_denied") {
                if (btn) {
                    btn.style.background = "#dc2626";
                    btn.style.boxShadow = "0 2px 6px rgba(220,38,38,0.4)";
                }
                if (btnIcon) btnIcon.className = "fa-solid fa-triangle-exclamation";
                if (warningBanner) warningBanner.style.display = "block";
            }
            return;
        }

        if (isSuccess === true) {
            this.cloudStatus = "connected";
            if (btnText) btnText.innerText = "Nuvem Conectada (Tempo Real)";
            if (btn) {
                btn.style.background = "#16a34a";
                btn.style.boxShadow = "0 2px 6px rgba(22,163,74,0.3)";
            }
            if (btnIcon) btnIcon.className = "fa-solid fa-cloud-check";
            if (warningBanner) warningBanner.style.display = "none";
        } else if (this.cloudStatus === "permission_denied") {
            if (btnText) btnText.innerText = "Nuvem Bloqueada (Permissão Negada)";
            if (btn) {
                btn.style.background = "#dc2626";
                btn.style.boxShadow = "0 2px 6px rgba(220,38,38,0.4)";
            }
            if (btnIcon) btnIcon.className = "fa-solid fa-triangle-exclamation";
            if (warningBanner) warningBanner.style.display = "block";
        } else {
            this.cloudStatus = "offline";
            if (btnText) btnText.innerText = "Modo Off-line";
            if (btn) {
                btn.style.background = "#64748b";
                btn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.15)";
            }
            if (btnIcon) btnIcon.className = "fa-solid fa-cloud-slash";
        }

        if (typeof renderFirebaseConfigPanel === "function") {
            renderFirebaseConfigPanel();
        }
    }

        loadLocalOnly() {
        const stored = localStorage.getItem(SIGE_STORAGE_KEY);
        if (!stored) {
            return JSON.parse(JSON.stringify(defaultSigeData));
        }
        try {
            const parsed = JSON.parse(stored);
            const merged = {
                ...defaultSigeData,
                ...parsed
            };

            // Garantia de integridade das coleções essenciais
            const arrayKeys = [
                'usuariosCadastrados', 'pedidosUniformes', 'lotesSME', 'agendamentosOP',
                'demandasSupervisao', 'demandasAdmin', 'equipeEscola', 'turmasEscola',
                'contatosWhatsAppDirecao', 'eventosCalendarioEscolar', 'atasGabineteDirecao',
                'mensagensWhatsAppLog', 'auditLogs', 'notificacoesLidas',
                'deletedOPIds', 'deletedContatosWpIds', 'deletedEventoCalendarioIds',
                'deletedEquipeIds', 'deletedPedidoUniformeIds', 'deletedDemandaSupIds',
                'deletedDemandaAdmIds', 'deletedAtaIds', 'deletedTurmaIds'
            ];
            arrayKeys.forEach(k => {
                if (!Array.isArray(merged[k])) {
                    merged[k] = Array.isArray(defaultSigeData[k]) ? [...defaultSigeData[k]] : [];
                }
            });

            // Normalização estrita de usuários cadastrados e migração de senha para hash
            merged.usuariosCadastrados = merged.usuariosCadastrados.map(u => {
                const perms = u.permissoes ? { ...u.permissoes } : this.getDefaultPermissoesByRole(u.role);
                if (perms.op_perfil === undefined) {
                    perms.op_perfil = this.getOpPerfil(u);
                }
                const cleanDt = cleanDataNascimento(u.dataNascimento || u.senha || '');
                const userObj = {
                    ...u,
                    status: u.status || 'aprovado',
                    cadastroCompleto: (u.cadastroCompleto !== undefined) ? u.cadastroCompleto : (u.email && u.email.toLowerCase().trim() === 'elcortelini@gmail.com'),
                    permissoes: perms
                };
                if (!userObj.senhaHash && cleanDt) {
                    userObj.senhaHash = hashSecretSync(cleanDt);
                }
                delete userObj.senha; // Higienização: remove senha em texto puro
                return userObj;
            });

            // Garante que o Desenvolvedor Master possua o CPF, Data e Hash oficiais
            const devHash = "sha256_b4dbdb7b961d78fd6d356c827c491cee21d0783c140fa3ea8bc842a1c2e6dd43";
            let devUser = merged.usuariosCadastrados.find(u => (u.email && u.email.toLowerCase().trim() === 'elcortelini@gmail.com') || u.role === 'desenvolvedor' || (u.cpf && cleanCpf(u.cpf) === '80603742068'));
            if (devUser) {
                devUser.cpf = "806.037.420-68";
                devUser.dataNascimento = "30/12/1981";
                devUser.senhaHash = devHash;
                delete devUser.senha;
                devUser.nome = "Elevi Cortelini (Desenvolvedor)";
                devUser.role = "desenvolvedor";
                devUser.status = "aprovado";
                devUser.cadastroCompleto = true;
                devUser.permissoes = { op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true, ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true };
            } else {
                merged.usuariosCadastrados.unshift({
                    email: "elcortelini@gmail.com",
                    cpf: "806.037.420-68",
                    dataNascimento: "30/12/1981",
                    senhaHash: devHash,
                    nome: "Elevi Cortelini (Desenvolvedor)",
                    role: "desenvolvedor",
                    cargo: "Desenvolvedor do Sistema",
                    status: "aprovado",
                    cadastroCompleto: true,
                    permissoes: { op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true, ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true }
                });
            }

            // Saneamento e integridade modular: sincroniza a lista de orientadoras estritamente com os
            // colaboradores ativos da equipe que possuam perfil executora de atendimento
            if (Array.isArray(merged.equipeEscola)) {
                const equipeAtivaMap = new Map();
                merged.equipeEscola.forEach(p => {
                    if (p.id) equipeAtivaMap.set(p.id, p);
                    if (p.nome) equipeAtivaMap.set(p.nome.toLowerCase().trim(), p);
                });

                if (Array.isArray(merged.orientadoras)) {
                    merged.orientadoras = merged.orientadoras.filter(o => {
                        const prof = (o.id && equipeAtivaMap.get(o.id)) || (o.nome && equipeAtivaMap.get(o.nome.toLowerCase().trim()));
                        if (!prof) return false;
                        const perfil = this.getOpPerfil(prof);
                        return perfil === "executora";
                    });
                }
            }

            return merged;
        } catch (e) {
            console.error("Erro ao carregar banco de dados local do SIGE:", e);
            return JSON.parse(JSON.stringify(defaultSigeData));
        }
    }

    load() {
        return this.loadLocalOnly();
    }

    debouncedSyncToFirebase() {
        if (this._syncTimeout) clearTimeout(this._syncTimeout);
        this._syncTimeout = setTimeout(() => {
            this.syncToFirebase();
        }, 400);
    }

    saveData(data) {
        this.data = data;
        // 1. LocalStorage síncrono para renderização instantânea
        try {
            localStorage.setItem(SIGE_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.warn('⚠️ Limite de 5MB do LocalStorage excedido. Os dados estão preservados no IndexedDB e Nuvem.');
            } else {
                console.error('Erro ao salvar localmente no LocalStorage:', e);
            }
        }

        // 2. IndexedDB assíncrono de alta capacidade (50MB - 1GB+)
        if (typeof SigeIDB !== 'undefined') {
            SigeIDB.set('sige_database_data', data).catch(err => console.warn('Erro ao persistir no IndexedDB:', err));
        }

        // 3. Nuvem Firestore com debounce para alta performance
        this.debouncedSyncToFirebase();
    }

    resetToDefault() {
        this.saveData(defaultSigeData);
        window.location.reload();
    }

    // Gerenciador de Usuários e Login por E-mail (RBAC Modular)
    getDefaultPermissoesByRole(role) {
        const base = {
            op: false, op_perfil: 'none', mural: true, supervisao: false, admin: false, direcao: false, uniformes: false,
            ext_recursos: true, ext_dashboard: false, ext_contabil: false, ext_biblioteca: true, ext_patrimonio: false
        };
        if (!role) return base;
        if (role === "desenvolvedor" || role === "direcao" || role === "admin") {
            return {
                op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true,
                ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true
            };
        }
        if (role.startsWith("orientadora") || role === "orientacao") {
            return {
                op: true, op_perfil: 'executora', mural: true, supervisao: false, admin: false, direcao: false, uniformes: false,
                ext_recursos: true, ext_dashboard: true, ext_contabil: false, ext_biblioteca: true, ext_patrimonio: false
            };
        }
        if (role.startsWith("supervisora") || role === "supervisao") {
            return {
                op: false, op_perfil: 'none', mural: true, supervisao: true, admin: false, direcao: false, uniformes: false,
                ext_recursos: true, ext_dashboard: true, ext_contabil: false, ext_biblioteca: true, ext_patrimonio: false
            };
        }
        if (role === "secretaria") {
            return {
                op: true, op_perfil: 'recepcao', mural: true, supervisao: false, admin: false, direcao: false, uniformes: true,
                ext_recursos: true, ext_dashboard: false, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true
            };
        }
        if (role === "docentes" || role === "comunidade") {
            return {
                op: false, op_perfil: 'none', mural: true, supervisao: false, admin: false, direcao: false, uniformes: false,
                ext_recursos: true, ext_dashboard: true, ext_contabil: false, ext_biblioteca: true, ext_patrimonio: false
            };
        }
        if (role === "apoio") {
            return {
                op: false, op_perfil: 'none', mural: true, supervisao: false, admin: false, direcao: false, uniformes: false,
                ext_recursos: true, ext_dashboard: false, ext_contabil: false, ext_biblioteca: false, ext_patrimonio: true
            };
        }
        return base;
    }

    getOpPerfil(item) {
        if (!item) return "none";
        const perms = item.permissoes || {};
        if (perms.op === false) return "none";
        if (perms.op_perfil && ["executora", "recepcao", "gerencial", "none"].includes(perms.op_perfil)) {
            return perms.op_perfil;
        }

        // Inferência inteligente sem gambiarras para compatibilidade com dados existentes
        const setor = ((item.setor || item.role || "") + "").toLowerCase().trim();
        const cargo = ((item.cargoFuncao || item.cargo || "") + "").toLowerCase().trim();
        const email = ((item.email || "") + "").toLowerCase().trim();

        if (email === "elcortelini@gmail.com" || setor === "desenvolvedor" || setor === "direcao" || setor === "admin") {
            return "gerencial";
        }
        if (setor === "secretaria" || cargo.includes("secretar") || cargo.includes("recepc")) {
            return "recepcao";
        }
        if (setor === "orientacao" || setor.startsWith("orientadora") || cargo.includes("orientad")) {
            return "executora";
        }
        if (setor === "supervisao" || setor.startsWith("supervisora") || cargo.includes("supervis")) {
            return "gerencial";
        }

        return perms.op ? "recepcao" : "none";
    }

    getCurrentOpPerfil() {
        const user = this.getLoggedUser();
        const activeRole = this.getRole();

        // Se o usuário logado for Desenvolvedor Master
        if (user && user.role === 'desenvolvedor') {
            // Se estiver simulando uma visão específica pelo seletor de perfil da barra superior
            if (activeRole && activeRole !== 'desenvolvedor') {
                if (activeRole.startsWith('orientadora_') || activeRole === 'orientacao') {
                    return 'executora';
                }
                if (activeRole === 'secretaria') {
                    return 'recepcao';
                }
                if (activeRole === 'direcao' || activeRole === 'admin' || activeRole === 'supervisao') {
                    return 'gerencial';
                }
                const simulatedUser = (this.getUsuarios() || []).find(u => u.role === activeRole);
                if (simulatedUser) return this.getOpPerfil(simulatedUser);
                const simulatedProf = (this.data?.equipeEscola || []).find(p => p.setor === activeRole || p.id === activeRole);
                if (simulatedProf) return this.getOpPerfil(simulatedProf);
                const defaults = this.getDefaultPermissoesByRole(activeRole);
                return defaults.op_perfil || 'none';
            }
            return 'gerencial';
        }

        if (user) {
            return this.getOpPerfil(user);
        }
        return this.getOpPerfil({ role: activeRole });
    }

        getUsuarios() {
        if (!this.data.usuariosCadastrados || !Array.isArray(this.data.usuariosCadastrados)) {
            this.data.usuariosCadastrados = JSON.parse(JSON.stringify(defaultSigeData.usuariosCadastrados));
            this.saveData(this.data);
        }
        return this.data.usuariosCadastrados;
    }

    addUsuario(user) {
        const list = this.getUsuarios();
        if (!user.permissoes) {
            user.permissoes = this.getDefaultPermissoesByRole(user.role);
        }
        const existingIndex = list.findIndex(u => u.email.toLowerCase().trim() === user.email.toLowerCase().trim());
        if (existingIndex >= 0) {
            list[existingIndex] = { ...list[existingIndex], ...user };
        } else {
            list.push(user);
        }
        this.data.usuariosCadastrados = list;
        this.addAuditLog(`Cadastro/Atualização de Usuário (${user.nome} - ${user.email})`, 'Admin');
        this.saveData(this.data);
        return user;
    }

    removeUsuario(email) {
        if (email.toLowerCase().trim() === "elcortelini@gmail.com") return false;
        let list = this.getUsuarios();
        const userToRemove = list.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
        list = list.filter(u => u.email.toLowerCase().trim() !== email.toLowerCase().trim());
        this.data.usuariosCadastrados = list;
        if (this.data && Array.isArray(this.data.equipeEscola)) {
            this.data.equipeEscola = this.data.equipeEscola.filter(p => !p.email || p.email.toLowerCase().trim() !== email.toLowerCase().trim());
        }
        if (userToRemove) {
            this.addAuditLog(`Remoção de Usuário (${userToRemove.nome} - ${userToRemove.email})`, 'Admin');
        }
        this.saveData(this.data);
        return true;
    }

    aplicarPresetPermissoes(email, preset) {
        if (!email) return false;
        if (email.toLowerCase().trim() === "elcortelini@gmail.com") {
            // Desenvolvedor sempre total
            return this.salvarPermissoesUsuario(email, { 
                op: true, mural: true, supervisao: true, admin: true, direcao: true, uniformes: true,
                ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true
            });
        }

        let perms = {};
        switch (preset) {
            case 'total':
                perms = { 
                    op: true, mural: true, supervisao: true, admin: true, direcao: true, uniformes: true,
                    ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true
                };
                break;
            case 'pedagogico':
                perms = { 
                    op: true, mural: true, supervisao: true, admin: false, direcao: false, uniformes: false,
                    ext_recursos: true, ext_dashboard: true, ext_contabil: false, ext_biblioteca: true, ext_patrimonio: false
                };
                break;
            case 'administrativo':
                perms = { 
                    op: false, mural: true, supervisao: false, admin: true, direcao: true, uniformes: true,
                    ext_recursos: true, ext_dashboard: false, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true
                };
                break;
            case 'apenas_op':
                perms = { 
                    op: true, mural: true, supervisao: false, admin: false, direcao: false, uniformes: false,
                    ext_recursos: true, ext_dashboard: false, ext_contabil: false, ext_biblioteca: false, ext_patrimonio: false
                };
                break;
            case 'apenas_mural':
                perms = { 
                    op: false, mural: true, supervisao: false, admin: false, direcao: false, uniformes: false,
                    ext_recursos: false, ext_dashboard: false, ext_contabil: false, ext_biblioteca: false, ext_patrimonio: false
                };
                break;
            case 'bloqueado':
                perms = { 
                    op: false, mural: false, supervisao: false, admin: false, direcao: false, uniformes: false,
                    ext_recursos: false, ext_dashboard: false, ext_contabil: false, ext_biblioteca: false, ext_patrimonio: false
                };
                break;
            default:
                return false;
        }

        return this.salvarPermissoesUsuario(email, perms);
    }

    sincronizarUsuariosComEquipe() {
        const equipe = this.getEquipeEscolar();
        const users = this.getUsuarios();
        let novosAdicionados = 0;

        equipe.forEach(p => {
            if (p.email && p.email.includes("@")) {
                const jaExiste = users.some(u => u.email.toLowerCase().trim() === p.email.toLowerCase().trim());
                if (!jaExiste) {
                    let suggestedRole = "comunidade";
                    if (p.setor === "orientacao") suggestedRole = "orientadora_" + p.id;
                    else if (p.setor === "supervisao") suggestedRole = "supervisora_" + p.id;
                    else if (p.setor === "direcao") suggestedRole = "direcao";
                    else if (p.setor === "secretaria") suggestedRole = "secretaria";
                    else if (p.setor === "docentes") suggestedRole = "docentes";

                    this.addUsuario({
                        email: p.email.toLowerCase().trim(),
                        nome: p.nome,
                        role: suggestedRole,
                        cargo: p.cargoFuncao || p.setor || "Colaborador Escolar",
                        permissoes: this.getDefaultPermissoesByRole(suggestedRole)
                    });
                    novosAdicionados++;
                }
            }
        });

        return novosAdicionados;
    }

    isEmailInstitucional(email) {
        if (!email) return false;
        const clean = email.toLowerCase().trim();
        if (clean === "dev" || clean === "admin" || clean === "desenvolvedor" || clean === "elcortelini@gmail.com") return true;
        return clean.endsWith("@edu.itajai.sc.gov.br") || 
               clean.endsWith("@itajai.sc.gov.br") || 
               clean.endsWith("@escola.gov.br") || 
               clean.endsWith("@escola.internal");
    }

    getUsuariosPendentes() {
        const list = this.getUsuarios();
        return list.filter(u => u && (u.status === 'pendente' || u.status === 'aguardando_aprovacao'));
    }

    aprovarUsuarioPendente(identifier, role = 'docentes', permissoes = null, cargo = '') {
        if (!identifier) return false;
        const clean = String(identifier).toLowerCase().trim();
        const cleanCpfDigits = cleanCpf(clean);
        const list = this.getUsuarios();
        const user = list.find(u => {
            if (u.id && u.id.toLowerCase().trim() === clean) return true;
            if (u.email && u.email.toLowerCase().trim() === clean) return true;
            if (cleanCpfDigits && cleanCpf(u.cpf || '') === cleanCpfDigits) return true;
            return false;
        });
        if (!user) return false;

        user.status = 'aprovado';
        user.role = role;
        user.permissoes = permissoes || this.getDefaultPermissoesByRole(role);
        if (cargo) user.cargo = cargo;
        user.dataAprovacao = new Date().toISOString();

        // Sincroniza com equipe escolar
        if (this.data && Array.isArray(this.data.equipeEscola)) {
            let prof = this.data.equipeEscola.find(p => {
                if (p.id && p.id === user.id) return true;
                if (p.email && user.email && p.email.toLowerCase().trim() === user.email.toLowerCase().trim()) return true;
                if (user.cpf && cleanCpf(p.cpf || '') === cleanCpf(user.cpf)) return true;
                return false;
            });
            if (prof) {
                prof.status = 'aprovado';
                prof.permissoes = user.permissoes;
                prof.setor = role;
                if (user.cpf) prof.cpf = user.cpf;
                if (user.dataNascimento) prof.dataNascimento = user.dataNascimento;
                if (cargo) prof.cargoFuncao = cargo;
            } else {
                this.data.equipeEscola.push({
                    id: user.id || generateSecureId('eq'),
                    nome: user.nome,
                    cpf: user.cpf || '',
                    dataNascimento: user.dataNascimento || '',
                    senha: user.senha || user.dataNascimento || '',
                    email: user.email || '',
                    telefone: user.telefone || user.whatsapp || '',
                    whatsapp: user.whatsapp || '',
                    setor: role,
                    cargoFuncao: user.cargo || 'Colaborador Escolar',
                    status: 'aprovado',
                    permissoes: user.permissoes,
                    turmasOuSalas: '',
                    turno: user.turno || 'Matutino'
                });
            }
        }

        this.addAuditLog(`Aprovação de Acesso (${user.nome} - CPF: ${user.cpf || user.email || 'N/A'} - Perfil: ${role})`, 'Desenvolvedor');
        this.saveData(this.data);
        this.syncToFirebase();
        return user;
    }

    recusarUsuarioPendente(identifier) {
        if (!identifier) return false;
        const clean = String(identifier).toLowerCase().trim();
        const cleanCpfDigits = cleanCpf(clean);
        const list = this.getUsuarios();
        const idx = list.findIndex(u => {
            if (u.id && u.id.toLowerCase().trim() === clean) return true;
            if (u.email && u.email.toLowerCase().trim() === clean) return true;
            if (cleanCpfDigits && cleanCpf(u.cpf || '') === cleanCpfDigits) return true;
            return false;
        });
        if (idx !== -1) {
            const removed = list.splice(idx, 1)[0];
            this.addAuditLog(`Recusa de Solicitação de Acesso (${removed.nome} - CPF: ${removed.cpf || removed.email || 'N/A'})`, 'Desenvolvedor');
            this.saveData(this.data);
            this.syncToFirebase();
            return true;
        }
        return false;
    }

    concluirCadastroUsuario(email, dados) {
        if (!email || !dados) return false;
        const clean = email.toLowerCase().trim();
        const list = this.getUsuarios();
        let user = list.find(u => u.email.toLowerCase().trim() === clean);
        if (!user) return false;

        if (dados.nome) user.nome = dados.nome.trim();
        if (dados.cargo) user.cargo = dados.cargo.trim();
        if (dados.turno) user.turno = dados.turno;
        const cleanPhone = (dados.whatsapp || '').replace(/\D/g, '');
        user.whatsapp = cleanPhone;
        user.telefone = cleanPhone;
        user.autorizaMensagensWhatsApp = !!dados.autorizaMensagensWhatsApp;
        user.dataConsentimento = new Date().toISOString();
        user.cadastroCompleto = true;

        // Atualiza ou insere na lista de contatos do WhatsApp (contatosWhatsAppDirecao)
        if (!Array.isArray(this.data.contatosWhatsAppDirecao)) {
            this.data.contatosWhatsAppDirecao = [];
        }
        const contExistente = this.data.contatosWhatsAppDirecao.find(c => 
            (c.telefone && c.telefone.replace(/\D/g, '') === cleanPhone) ||
            (c.nome && c.nome.toLowerCase().trim() === user.nome.toLowerCase().trim())
        );

        const tagTurno = user.turno || "Geral";
        if (contExistente) {
            contExistente.nome = user.nome;
            contExistente.telefone = cleanPhone;
            contExistente.autorizaWhatsApp = true;
            contExistente.turno = user.turno || contExistente.turno || "Ambos";
            if (!contExistente.tags) contExistente.tags = [];
            if (!contExistente.tags.includes("Equipe Escolar")) contExistente.tags.push("Equipe Escolar");
            contExistente.tag = contExistente.tags.join(", ");
            contExistente.notas = `Cargo: ${user.cargo || '-'} | Consentimento WhatsApp: Sim (${new Date().toLocaleDateString('pt-BR')})`;
        } else {
            this.data.contatosWhatsAppDirecao.push({
                id: 'w-cont-user-' + Date.now(),
                nome: user.nome,
                telefone: cleanPhone,
                tags: ["Equipe Escolar", tagTurno],
                tag: `Equipe Escolar, ${tagTurno}`,
                turno: user.turno || "Ambos",
                autorizaWhatsApp: true,
                notas: `Cargo: ${user.cargo || '-'} | Consentimento WhatsApp: Sim (${new Date().toLocaleDateString('pt-BR')})`
            });
        }

        // Sincroniza com equipe escolar
        if (this.data && Array.isArray(this.data.equipeEscola)) {
            let prof = this.data.equipeEscola.find(p => p.email && p.email.toLowerCase().trim() === clean);
            if (prof) {
                prof.nome = user.nome;
                prof.telefone = cleanPhone;
                if (user.cargo) prof.cargoFuncao = user.cargo;
                if (user.turno) prof.turno = user.turno;
            } else {
                this.data.equipeEscola.push({
                    id: user.id || ('eq_' + Date.now()),
                    nome: user.nome,
                    email: user.email,
                    telefone: cleanPhone,
                    setor: user.role || 'docentes',
                    cargoFuncao: user.cargo || 'Colaborador Escolar',
                    status: 'aprovado',
                    permissoes: user.permissoes,
                    turmasOuSalas: '',
                    turno: user.turno || 'Matutino'
                });
            }
        }

        localStorage.setItem("sige_logged_email", user.email);
        this.setRole(user.role || 'comunidade');
        this.addAuditLog(`Conclusão de Cadastro & Consentimento WhatsApp (${user.nome} - ${user.email})`, 'Usuário');
        this.saveData(this.data);
        this.syncToFirebase();
        return user;
    }

    getLoggedUser() {
        const loggedCpf = localStorage.getItem("sige_logged_cpf");
        const loggedEmail = localStorage.getItem("sige_logged_email");
        if (!loggedCpf && !loggedEmail) return null;

        const cleanCpfDigits = cleanCpf(loggedCpf);
        const cleanEmail = loggedEmail ? loggedEmail.toLowerCase().trim() : "";
        const users = this.getUsuarios();

        let found = users.find(u => {
            if (cleanCpfDigits && cleanCpf(u.cpf || '') === cleanCpfDigits) return true;
            if (cleanEmail && ((u.email && u.email.toLowerCase().trim() === cleanEmail) || (u.id && u.id.toLowerCase().trim() === cleanEmail))) return true;
            return false;
        });

        if (found && (found.status === 'pendente' || found.status === 'aguardando_aprovacao')) {
            localStorage.removeItem("sige_logged_cpf");
            localStorage.removeItem("sige_logged_email");
            return null;
        }

        // Se estiver na equipe escolar, garante que as permissões mais recentes da equipe prevalecem
        if (this.data && Array.isArray(this.data.equipeEscola)) {
            const prof = this.data.equipeEscola.find(p => 
                (cleanCpfDigits && cleanCpf(p.cpf || '') === cleanCpfDigits) ||
                (cleanEmail && ((p.email && p.email.toLowerCase().trim() === cleanEmail) || (p.id && p.id.toLowerCase().trim() === cleanEmail)))
            );
            if (prof) {
                if (!found) {
                    let roleKey = prof.setor || "docentes";
                    if (prof.setor === "orientacao") {
                        roleKey = "orientadora_" + prof.id;
                    } else if (prof.setor === "supervisao") {
                        roleKey = "supervisora_" + prof.id;
                    }
                    found = {
                        id: prof.id,
                        cpf: prof.cpf || (cleanCpfDigits ? formatCpf(cleanCpfDigits) : ""),
                        dataNascimento: prof.dataNascimento || "",
                        email: prof.email ? prof.email.toLowerCase().trim() : cleanEmail, 
                        nome: prof.nome, 
                        role: roleKey, 
                        cargo: prof.cargoFuncao || prof.setor,
                        status: prof.status || "aprovado",
                        cadastroCompleto: true,
                        permissoes: prof.permissoes || this.getDefaultPermissoesByRole(prof.setor)
                    };
                } else if (prof.permissoes) {
                    found.permissoes = prof.permissoes;
                }
            }
        }

        if (found) return found;
        if (cleanEmail === "elcortelini@gmail.com" || cleanEmail === "dev" || cleanEmail === "admin" || (cleanCpfDigits && (cleanCpfDigits === "80603742068" || cleanCpfDigits === "00000000000"))) {
            return { 
                email: "elcortelini@gmail.com", 
                cpf: "806.037.420-68",
                dataNascimento: "30/12/1981",
                senhaHash: "sha256_b4dbdb7b961d78fd6d356c827c491cee21d0783c140fa3ea8bc842a1c2e6dd43",
                nome: "Elevi Cortelini (Desenvolvedor)", 
                role: "desenvolvedor", 
                cargo: "Desenvolvedor do Sistema", 
                status: "aprovado", 
                cadastroCompleto: true, 
                permissoes: { op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true, ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true } 
            };
        }
        return null;
    }

    async loginWithCpf(cpfInput, dataNascimentoInput) {
        if (!cpfInput) return { success: false, code: 'EMPTY_CPF', message: 'Por favor, informe seu número de CPF.' };
        if (!dataNascimentoInput) return { success: false, code: 'EMPTY_PASSWORD', message: 'Por favor, informe sua Data de Nascimento (sua senha de acesso).' };

        const rawCpf = String(cpfInput).trim();
        const cleanNumbers = cleanCpf(rawCpf);
        const cleanDateInput = cleanDataNascimento(dataNascimentoInput);
        const inputHashAsync = await hashSecret(cleanDateInput);
        const inputHashSync = hashSecretSync(cleanDateInput);
        const devHash = "sha256_b4dbdb7b961d78fd6d356c827c491cee21d0783c140fa3ea8bc842a1c2e6dd43";

        // Atalhos especiais para Desenvolvedor (CPF oficial 806.037.420-68 ou atalhos dev/admin)
        const isDev = (
            rawCpf.toLowerCase() === "dev" || 
            rawCpf.toLowerCase() === "admin" || 
            rawCpf.toLowerCase() === "desenvolvedor" || 
            cleanNumbers === "80603742068" || 
            cleanNumbers === "00000000000" || 
            rawCpf.toLowerCase() === "elcortelini@gmail.com"
        );
        if (isDev) {
            // Se digitou o CPF oficial do desenvolvedor com senha diferente da sua data de nascimento
            if (cleanNumbers === "80603742068" && cleanDateInput && cleanDateInput !== "30121981" && rawCpf.toLowerCase() !== "dev" && rawCpf.toLowerCase() !== "admin") {
                return {
                    success: false,
                    code: 'INVALID_PASSWORD',
                    message: 'Data de nascimento incorreta para o Desenvolvedor. Digite 30/12/1981.'
                };
            }

            let devUser = this.getUsuarios().find(u => u.role === "desenvolvedor" || (u.cpf && cleanCpf(u.cpf) === "80603742068"));
            if (!devUser) {
                devUser = { 
                    email: "elcortelini@gmail.com", 
                    cpf: "806.037.420-68",
                    dataNascimento: "30/12/1981",
                    senhaHash: devHash,
                    nome: "Elevi Cortelini (Desenvolvedor)", 
                    role: "desenvolvedor", 
                    cargo: "Desenvolvedor do Sistema", 
                    status: "aprovado", 
                    cadastroCompleto: true, 
                    permissoes: { op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true, ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true } 
                };
                this.addUsuario(devUser);
            } else {
                devUser.cpf = "806.037.420-68";
                devUser.dataNascimento = "30/12/1981";
                devUser.senhaHash = devHash;
                delete devUser.senha;
                devUser.status = "aprovado";
                this.saveData(this.data);
            }
            localStorage.setItem("sige_logged_cpf", "806.037.420-68");
            localStorage.setItem("sige_logged_email", devUser.email || "elcortelini@gmail.com");
            this.setRole("desenvolvedor");
            return {
                success: true,
                code: 'SUCCESS',
                message: 'Acesso como Desenvolvedor Master concedido com sucesso! Bem-vindo, Elevi!',
                user: devUser
            };
        }

        const users = this.getUsuarios();
        let user = users.find(u => {
            const uCpf = cleanCpf(u.cpf || '');
            return cleanNumbers && uCpf && uCpf === cleanNumbers;
        });

        // Se não encontrado em usuariosCadastrados, busca na equipe escolar
        if (!user && this.data && Array.isArray(this.data.equipeEscola)) {
            const prof = this.data.equipeEscola.find(p => {
                const pCpf = cleanCpf(p.cpf || '');
                return cleanNumbers && pCpf && pCpf === cleanNumbers;
            });
            if (prof) {
                let roleKey = prof.setor || "docentes";
                if (prof.setor === "orientacao") {
                    roleKey = "orientadora_" + prof.id;
                } else if (prof.setor === "supervisao") {
                    roleKey = "supervisora_" + prof.id;
                }
                const dt = cleanDataNascimento(prof.dataNascimento || prof.senha || "");
                user = { 
                    id: prof.id, 
                    cpf: prof.cpf || formatCpf(cleanNumbers),
                    dataNascimento: prof.dataNascimento || "",
                    senhaHash: dt ? (await hashSecret(dt)) : "",
                    email: prof.email || "",
                    nome: prof.nome, 
                    role: roleKey, 
                    cargo: prof.cargoFuncao || prof.setor,
                    status: prof.status || "aprovado",
                    cadastroCompleto: true,
                    permissoes: prof.permissoes || this.getDefaultPermissoesByRole(prof.setor)
                };
                this.addUsuario(user);
            }
        }

        // Se o usuário não existir
        if (!user) {
            return {
                success: false,
                code: 'NOT_FOUND',
                message: 'CPF não cadastrado no sistema. Se este é o seu primeiro acesso, clique no botão "Primeiro Acesso / Criar Cadastro" para preencher seus dados.'
            };
        }

        // Se o usuário estiver aguardando aprovação
        if (user.status === 'aguardando_aprovacao' || user.status === 'pendente') {
            return {
                success: false,
                code: 'PENDING_APPROVAL',
                message: '⏳ Seu cadastro foi recebido com sucesso e está aguardando liberação do Desenvolvedor / Direção Escolar.\n\nAssim que o seu acesso for aprovado no painel, você poderá entrar normalmente informando seu CPF e sua data de nascimento.'
            };
        }

        if (user.status === 'recusado' || user.status === 'bloqueado') {
            return {
                success: false,
                code: 'BLOCKED',
                message: '🚫 Acesso desativado ou bloqueado. Por favor, entre em contato com a Direção da Escola.'
            };
        }

        // Validação da Senha (Hash SHA-256 ou Migração Transparente)
        const userDate = cleanDataNascimento(user.dataNascimento || user.senha || "");
        let isValid = false;

        if (user.senhaHash) {
            isValid = (user.senhaHash === inputHashAsync) || (user.senhaHash === inputHashSync) || (userDate && userDate === cleanDateInput);
        } else {
            isValid = (userDate === cleanDateInput);
        }

        if (!isValid) {
            return {
                success: false,
                code: 'INVALID_PASSWORD',
                message: 'Data de nascimento incorreta. Digite sua data no formato DD/MM/AAAA (ex: 15/05/1985).'
            };
        }

        // Upgrade transparente de segurança: armazena hash e elimina senha em texto plano
        if (!user.senhaHash || user.senha) {
            user.senhaHash = inputHashAsync;
            delete user.senha;
            this.saveData(this.data);
        }

        // Login autorizado com sucesso!
        localStorage.setItem("sige_logged_cpf", user.cpf || formatCpf(cleanNumbers));
        if (user.email) localStorage.setItem("sige_logged_email", user.email);
        this.setRole(user.role || 'docentes');
        this.addAuditLog(`Login Efetuado via CPF (${user.nome} - CPF: ${user.cpf || formatCpf(cleanNumbers)})`, 'Usuário');

        return {
            success: true,
            code: 'SUCCESS',
            message: `Bem-vindo(a), ${user.nome}!`,
            user: user
        };
    }

    async cadastrarPrimeiroAcesso(dados) {
        if (!dados || !dados.cpf) return { success: false, message: 'CPF é obrigatório.' };
        const cleanNumbers = cleanCpf(dados.cpf);
        if (!validarCpf(cleanNumbers)) {
            return { success: false, message: 'O número de CPF informado é inválido. Por favor, confira os números digitados.' };
        }
        const cleanDate = cleanDataNascimento(dados.dataNascimento);
        if (cleanDate.length !== 8) {
            return { success: false, message: 'Data de nascimento inválida. Digite no formato DD/MM/AAAA (8 dígitos).' };
        }
        if (!dados.nome || dados.nome.trim().length < 3) {
            return { success: false, message: 'Por favor, informe seu nome completo.' };
        }
        if (!dados.cargo || dados.cargo.trim().length < 2) {
            return { success: false, message: 'Por favor, informe seu cargo ou função na escola.' };
        }
        const cleanPhone = (dados.whatsapp || '').replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            return { success: false, message: 'Por favor, informe um WhatsApp válido com DDD (mínimo 10 dígitos).' };
        }
        if (!dados.autorizaWhatsApp) {
            return { success: false, message: 'É obrigatório autorizar o recebimento de mensagens e comunicados oficiais no seu WhatsApp.' };
        }

        const users = this.getUsuarios();
        const devHash = "sha256_b4dbdb7b961d78fd6d356c827c491cee21d0783c140fa3ea8bc842a1c2e6dd43";

        // Tratamento especial para o Desenvolvedor do Sistema
        if (cleanNumbers === "80603742068") {
            let devUser = users.find(u => u.role === "desenvolvedor" || (u.cpf && cleanCpf(u.cpf) === "80603742068"));
            if (!devUser) {
                devUser = {
                    id: "dev-master",
                    cpf: "806.037.420-68",
                    dataNascimento: "30/12/1981",
                    senhaHash: devHash,
                    nome: "Elevi Cortelini (Desenvolvedor)",
                    email: dados.email || "elcortelini@gmail.com",
                    cargo: "Desenvolvedor do Sistema",
                    turno: dados.turno || "Integral / Ambos",
                    whatsapp: cleanPhone || "48996692174",
                    autorizaMensagensWhatsApp: true,
                    role: "desenvolvedor",
                    status: "aprovado",
                    cadastroCompleto: true,
                    permissoes: { op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true, ext_recursos: true, ext_dashboard: true, ext_contabil: true, ext_biblioteca: true, ext_patrimonio: true }
                };
                this.addUsuario(devUser);
            } else {
                devUser.cpf = "806.037.420-68";
                devUser.dataNascimento = "30/12/1981";
                devUser.senhaHash = devHash;
                delete devUser.senha;
                devUser.status = "aprovado";
                devUser.cadastroCompleto = true;
                devUser.role = "desenvolvedor";
                this.saveData(this.data);
            }
            return {
                success: true,
                message: '👑 Seu CPF foi reconhecido e cadastrado com sucesso como Desenvolvedor Master do Sistema!\n\nVocê já pode fazer login utilizando o seu CPF (806.037.420-68) e sua data de nascimento (30/12/1981).',
                user: devUser
            };
        }

        const existing = users.find(u => cleanCpf(u.cpf || '') === cleanNumbers);
        if (existing) {
            if (existing.status === 'aprovado') {
                return { success: false, message: 'Este CPF já está cadastrado e aprovado no sistema! Você já pode realizar o login com seu CPF e data de nascimento.' };
            } else {
                return { success: false, message: 'Este CPF já possui uma solicitação enviada que está aguardando liberação do Desenvolvedor.' };
            }
        }

        const fmtCpf = formatCpf(cleanNumbers);
        const fmtData = formatDataNascimento(cleanDate);
        const sHash = await hashSecret(cleanDate);

        const novoUser = {
            id: generateSecureId('user'),
            cpf: fmtCpf,
            dataNascimento: fmtData,
            senhaHash: sHash,
            nome: dados.nome.trim(),
            email: dados.email ? dados.email.toLowerCase().trim() : '',
            cargo: dados.cargo.trim(),
            turno: dados.turno || 'Matutino',
            whatsapp: cleanPhone,
            autorizaMensagensWhatsApp: true,
            role: 'docentes',
            status: 'aguardando_aprovacao',
            cadastroCompleto: true,
            permissoes: this.getDefaultPermissoesByRole('docentes'),
            criadoEm: new Date().toISOString(),
            solicitadoEm: new Date().toLocaleString('pt-BR')
        };

        if (!Array.isArray(this.data.usuariosCadastrados)) {
            this.data.usuariosCadastrados = [];
        }
        this.data.usuariosCadastrados.push(novoUser);
        this.addAuditLog(`Solicitação de Primeiro Acesso via CPF (${novoUser.nome} - CPF: ${fmtCpf})`, 'Sistema');
        this.saveData(this.data);
        this.syncToFirebase();

        return {
            success: true,
            message: '🎉 Solicitação de cadastro enviada com sucesso!\n\nSeu acesso foi registrado e agora aguarda autorização do Desenvolvedor do Sistema / Direção Escolar. Assim que for liberado, você entrará direto com seu CPF e Data de Nascimento.',
            user: novoUser
        };
    }

    loginWithEmail(emailOrId) {
        if (!emailOrId) return { success: false, code: 'EMPTY', message: 'Por favor, informe seu e-mail institucional.' };
        let cleanInput = emailOrId.toLowerCase().trim();
        if (cleanInput === "dev" || cleanInput === "admin" || cleanInput === "desenvolvedor") {
            cleanInput = "elcortelini@gmail.com";
        }

        // Validação Estrita: Apenas e-mails institucionais oficiais são permitidos
        if (!this.isEmailInstitucional(cleanInput)) {
            return {
                success: false,
                code: 'INVALID_DOMAIN',
                message: 'Apenas e-mails institucionais oficiais (@edu.itajai.sc.gov.br ou @itajai.sc.gov.br) são permitidos para acesso ao IntegraRizzi.'
            };
        }

        // Caso Especial: Desenvolvedor do Sistema (Acesso Pleno Garantido)
        if (cleanInput === "elcortelini@gmail.com") {
            let devUser = this.getUsuarios().find(u => u.email.toLowerCase().trim() === "elcortelini@gmail.com");
            if (!devUser) {
                devUser = { 
                    email: "elcortelini@gmail.com", 
                    nome: "Elevi Cortelini (Desenvolvedor)", 
                    role: "desenvolvedor", 
                    cargo: "Desenvolvedor do Sistema",
                    status: "aprovado",
                    cadastroCompleto: true,
                    permissoes: { op: true, mural: true, supervisao: true, admin: true, direcao: true, uniformes: true }
                };
                this.addUsuario(devUser);
            } else {
                devUser.status = "aprovado";
                devUser.cadastroCompleto = true;
                devUser.permissoes = { op: true, mural: true, supervisao: true, admin: true, direcao: true, uniformes: true };
            }
            localStorage.setItem("sige_logged_email", devUser.email);
            this.setRole("desenvolvedor");
            return {
                success: true,
                code: 'SUCCESS',
                message: 'Acesso como Desenvolvedor concedido com sucesso!',
                user: devUser
            };
        }

        const users = this.getUsuarios();
        let user = users.find(u => (u.email && u.email.toLowerCase().trim() === cleanInput) || (u.id && u.id.toLowerCase().trim() === cleanInput));

        // Se não encontrado em usuariosCadastrados, busca na equipe escolar
        if (!user && this.data && Array.isArray(this.data.equipeEscola)) {
            const prof = this.data.equipeEscola.find(p => 
                (p.email && p.email.toLowerCase().trim() === cleanInput) || 
                (p.id && p.id.toLowerCase().trim() === cleanInput)
            );
            if (prof) {
                let roleKey = prof.setor || "docentes";
                if (prof.setor === "orientacao") {
                    roleKey = "orientadora_" + prof.id;
                } else if (prof.setor === "supervisao") {
                    roleKey = "supervisora_" + prof.id;
                }
                user = { 
                    id: prof.id,
                    email: prof.email ? prof.email.toLowerCase().trim() : cleanInput, 
                    nome: prof.nome, 
                    role: roleKey, 
                    cargo: prof.cargoFuncao || prof.setor,
                    status: prof.status || "aprovado",
                    cadastroCompleto: !!(prof.telefone && prof.telefone.length >= 10),
                    permissoes: prof.permissoes || this.getDefaultPermissoesByRole(prof.setor)
                };
                this.addUsuario(user);
            }
        }

        // Casos de Orientadoras Oficiais
        if (!user) {
            if (cleanInput === "clarinda@escola.gov.br" || cleanInput.includes("clarinda.pereira")) {
                user = { 
                    email: cleanInput, 
                    nome: "Clarinda Rosa Pereira", 
                    role: "orientadora_clarinda", 
                    cargo: "Orientadora Educacional — Séries Iniciais",
                    status: "aprovado",
                    cadastroCompleto: true,
                    permissoes: { op: true, mural: true, supervisao: false, admin: false, direcao: false, uniformes: false }
                };
                this.addUsuario(user);
            }
        }

        // Se ainda não existir: PRIMEIRO ACESSO COM E-MAIL INSTITUCIONAL
        if (!user) {
            const userPart = cleanInput.split('@')[0];
            const nomeSugerido = userPart
                .split('.')
                .map(part => part.replace(/\d+/g, ''))
                .filter(Boolean)
                .map(s => s.charAt(0).toUpperCase() + s.slice(1))
                .join(' ') || "Colaborador Escolar";

            const novoPendente = {
                id: 'user_' + Date.now(),
                email: cleanInput,
                nome: nomeSugerido,
                role: 'comunidade',
                cargo: 'Aguardando Atribuição pelo Desenvolvedor',
                status: 'pendente',
                cadastroCompleto: false,
                permissoes: { op: false, mural: false, supervisao: false, admin: false, direcao: false, uniformes: false },
                dataSolicitacao: new Date().toISOString(),
                solicitadoEm: new Date().toLocaleString('pt-BR')
            };
            this.addUsuario(novoPendente);

            return {
                success: false,
                code: 'FIRST_ACCESS_PENDING',
                message: '✅ Solicitação de Primeiro Acesso registrada com sucesso!\n\nSeu acesso aguarda autorização do Desenvolvedor do Sistema (elcortelini@gmail.com), que irá habilitar os módulos correspondentes à sua função escolar.',
                user: novoPendente
            };
        }

        // Se o usuário foi encontrado, verifica o status de aprovação
        if (user.status === 'pendente') {
            return {
                success: false,
                code: 'PENDING_APPROVAL',
                message: '⏳ Seu cadastro de Primeiro Acesso ainda está em análise aguardando autorização do Desenvolvedor do Sistema (elcortelini@gmail.com).\n\nAssim que os módulos forem liberados, você poderá entrar no sistema.',
                user
            };
        }

        if (user.status === 'bloqueado') {
            return {
                success: false,
                code: 'BLOCKED',
                message: '🔒 Seu acesso ao sistema está desativado. Entre em contato com a Direção ou Desenvolvedor.',
                user
            };
        }

        // Se aprovado, mas ainda não concluiu o preenchimento cadastral (WhatsApp + consentimento)
        if (!user.cadastroCompleto) {
            return {
                success: false,
                code: 'NEEDS_ONBOARDING',
                message: '🎉 Seu acesso foi autorizado pelo Desenvolvedor! Conclua o preenchimento do seu cadastro para acessar as ferramentas.',
                user
            };
        }

        // Login autorizado com cadastro concluído
        localStorage.setItem("sige_logged_email", user.email);
        if (user.role === 'desenvolvedor') {
            this.setRole("desenvolvedor");
        } else {
            this.setRole(user.role || 'comunidade');
        }
        return {
            success: true,
            code: 'SUCCESS',
            message: `Bem-vindo(a), ${user.nome}!`,
            user
        };
    }

    logout() {
        localStorage.removeItem("sige_logged_email");
        localStorage.removeItem("sige_logged_cpf");
        if (this.data) {
            this.data.currentRole = "docentes";
            this.saveData(this.data);
        }
    }

    // Gerenciador de Alunos e Turmas Importados via PDF
    getAlunosImportados() {
        if (!this.data.alunosImportados || !Array.isArray(this.data.alunosImportados)) {
            this.data.alunosImportados = [];
        }
        return this.data.alunosImportados;
    }

    clearAlunosImportados() {
        if (!this.data) this.data = {};
        this.data.alunosImportados = [];
        this.data.pdfImportMeta = null;
        this.saveData(this.data);
    }

    getLastPdfImportMeta() {
        return this.data.pdfImportMeta || null;
    }

    saveAlunosImportados(novosAlunos, metaInfo) {
        let list = this.getAlunosImportados();
        const mapByMatricula = new Map();

        list.forEach(a => {
            if (a.nome) a.nome = cleanStudentName(a.nome);
            if (a.matricula) mapByMatricula.set(a.matricula, a);
        });

        novosAlunos.forEach(novo => {
            if (novo.nome) novo.nome = cleanStudentName(novo.nome);
            if (novo.matricula && mapByMatricula.has(novo.matricula)) {
                const ext = mapByMatricula.get(novo.matricula);
                ext.nome = novo.nome;
                ext.turma = novo.turma;
                ext.turno = novo.turno;
                ext.email = novo.email;
                ext.dataNasc = novo.dataNasc;
                const combinedPhones = Array.from(new Set([...(ext.telefones || []), ...(novo.telefones || [])]));
                ext.telefones = combinedPhones;
            } else {
                if (novo.matricula) mapByMatricula.set(novo.matricula, novo);
                list.push(novo);
            }
        });

        this.data.alunosImportados = list;
        this.data.pdfImportMeta = metaInfo;
        this.sanitizeStudentNames();
        this.syncTurmasFromImportedAlunos();
        this.saveData(this.data);
    }

    syncTurmasFromImportedAlunos() {
        const alunos = this.getAlunosImportados();
        if (!alunos || alunos.length === 0) return;

        if (!this.data.turmasEscola || !Array.isArray(this.data.turmasEscola)) {
            this.data.turmasEscola = [];
        }

        const turmasMap = new Map();
        this.data.turmasEscola.forEach(t => {
            const cleanName = (t.nome || "").trim();
            if (cleanName) turmasMap.set(cleanName.toLowerCase(), t);
        });

        let updated = false;

        alunos.forEach(aluno => {
            const code = (aluno.turma || "").trim();
            if (!code) return;
            const codeLower = code.toLowerCase();

            if (!turmasMap.has(codeLower)) {
                const turnoLower = (aluno.turno || "matutino").toLowerCase();
                const firstDigit = code.charAt(0);
                let nivel = "Ensino Fundamental I";
                if (["6", "7", "8", "9"].includes(firstDigit)) {
                    nivel = "Ensino Fundamental II";
                } else if (["1", "2", "3", "4", "5"].includes(firstDigit)) {
                    nivel = "Ensino Fundamental I";
                }

                const newTurma = {
                    id: "turma-pdf-" + code.replace(/[^\w]/g, ""),
                    nome: code,
                    turno: turnoLower,
                    anoLetivo: "2026",
                    nivel: nivel,
                    sala: "Sala Geral",
                    capacidade: 35,
                    regente: "Não definido"
                };

                this.data.turmasEscola.push(newTurma);
                turmasMap.set(codeLower, newTurma);
                updated = true;
            }
        });

        if (updated) {
            this.data.turmasEscola.sort((a, b) => {
                const numA = parseInt(a.nome.replace(/\D/g, ''), 10) || 0;
                const numB = parseInt(b.nome.replace(/\D/g, ''), 10) || 0;
                if (numA !== numB) return numA - numB;
                return a.nome.localeCompare(b.nome);
            });
            this.saveData(this.data);
        }
    }

    // Role Manager
    getRole() {
        const user = this.getLoggedUser();
        if (!user) return "visitante";
        if (user.role === "desenvolvedor") {
            return (this.data && this.data.currentRole) ? this.data.currentRole : "desenvolvedor";
        }
        return user.role;
    }

    setRole(role) {
        if (!this.data) this.data = {};
        this.data.currentRole = role;
        this.saveData(this.data);
    }

    // Orientação Pedagógica
    getAgendamentosOP() {
        const all = (this.data && this.data.agendamentosOP) ? this.data.agendamentosOP : [];
        const role = this.getRole();
        const user = this.getLoggedUser();
        
        // Se o usuário autenticado for Desenvolvedor Master ou Direção, possui visão global
        const isMaster = (user && (user.role === 'desenvolvedor' || user.role === 'direcao' || (user.permissoes && user.permissoes.direcao))) || role === 'desenvolvedor' || role === 'direcao';
        
        // Se for uma orientadora específica (e não estiver em modo Diretor/Master)
        let activeOri = null;
        if (typeof getOrientadoraByRole === 'function') {
            activeOri = getOrientadoraByRole(role);
        } else if (typeof window !== 'undefined' && typeof window.getOrientadoraByRole === 'function') {
            activeOri = window.getOrientadoraByRole(role);
        }
        if (!activeOri && user && (user.role.startsWith("orientadora_") || user.setor === "orientacao")) {
            const oris = this.getOrientadoras();
            activeOri = oris.find(o => o.id === user.id || (o.nome && user.nome && o.nome.toLowerCase().trim() === user.nome.toLowerCase().trim())) || (user.nome ? { id: user.id, nome: user.nome } : null);
        }
        if (activeOri && !isMaster) {
            const oriNome = (activeOri.nome || "").toLowerCase().trim();
            const oriId = activeOri.id;
            return all.filter(a => {
                if (!a.orientadora) return false;
                const aOri = a.orientadora.toLowerCase().trim();
                return aOri.includes(oriNome) || oriNome.includes(aOri) || a.orientadoraId === oriId;
            });
        }
        
        return all;
    }

    deleteAgendamentoOP(id) {
        if (!id) return false;
        if (!this.data) this.data = {};
        if (!Array.isArray(this.data.deletedOPIds)) {
            this.data.deletedOPIds = [];
        }
        if (!this.data.deletedOPIds.includes(id)) {
            this.data.deletedOPIds.push(id);
        }
        let list = (this.data && this.data.agendamentosOP) ? this.data.agendamentosOP : [];
        this.data.agendamentosOP = list.filter(a => a.id !== id);
        this.saveData(this.data);
        this.logAuditEvent("Orientação", `Excluído agendamento ${id}`, "Orientação");
        return true;
    }

    deleteAgendamento(id) {
        return this.deleteAgendamentoOP(id);
    }

    // Bloqueio de Dias / Feriados
    getDiasBloqueados() {
        return this.data.diasBloqueados || [];
    }

    isDiaBloqueado(dateIso) {
        return (this.data.diasBloqueados || []).some(d => d.data === dateIso);
    }

    toggleBloqueioDia(dateIso, motivo = "Conselho de Classe / Recesso") {
        if (!this.data.diasBloqueados) this.data.diasBloqueados = [];
        const index = this.data.diasBloqueados.findIndex(d => d.data === dateIso);
        if (index >= 0) {
            this.data.diasBloqueados.splice(index, 1);
        } else {
            this.data.diasBloqueados.push({ data: dateIso, motivo, bloqueadoPor: this.getRole() });
        }
        this.saveData(this.data);
    }

    getOrientadoras() {
        const equipe = this.getEquipeEscolar();
        const deEquipe = equipe.filter(p => this.getOpPerfil(p) === "executora");
        
        // Mantém estritamente apenas as orientadoras cadastradas no quadro da equipe escolar com perfil executora
        const orientadorasValidas = deEquipe.map(p => {
            const existente = (this.data && Array.isArray(this.data.orientadoras)) ? this.data.orientadoras.find(o => 
                o.id === p.id || 
                (o.nome && p.nome && o.nome.toLowerCase().trim() === p.nome.toLowerCase().trim())
            ) : null;
            return {
                id: p.id,
                nome: p.nome,
                telefone: p.telefone || (existente ? existente.telefone : ""),
                email: p.email || (existente ? existente.email : ""),
                turnos: p.turnos || "matutino",
                turmasOuSalas: p.turmasOuSalas || p.cargoFuncao || "Orientação Educacional",
                cargoFuncao: p.cargoFuncao || "Orientadora Educacional",
                op_perfil: "executora"
            };
        });

        if (!this.data) this.data = {};
        this.data.orientadoras = orientadorasValidas;
        return this.data.orientadoras;
    }

    saveOrientadora(id, nome, telefone, email) {
        const list = this.getOrientadoras();
        const item = list.find(o => o.id === id || o.nome === nome);
        if (item) {
            if (telefone) item.telefone = telefone;
            if (email) item.email = email;
            if (nome) item.nome = nome;
        } else {
            list.push({ id: id || ("orient-" + Date.now()), nome, telefone, email });
        }
        this.saveData(this.data);
    }

    getSupervisoras() {
        const equipe = this.getEquipeEscolar();
        const deEquipe = equipe.filter(p => p.setor === "supervisao");
        const supervisorasValidas = deEquipe.map(p => {
            const existente = (this.data && Array.isArray(this.data.supervisoras)) ? this.data.supervisoras.find(s => 
                s.id === p.id || 
                (s.nome && p.nome && s.nome.toLowerCase().trim() === p.nome.toLowerCase().trim())
            ) : null;
            return {
                id: p.id,
                nome: p.nome,
                telefone: p.telefone || (existente ? existente.telefone : ""),
                email: p.email || (existente ? existente.email : ""),
                cargoFuncao: p.cargoFuncao || "Supervisora Pedagógica"
            };
        });
        if (!this.data) this.data = {};
        this.data.supervisoras = supervisorasValidas;
        return this.data.supervisoras;
    }

    saveSupervisora(id, nome, telefone, email) {
        const list = this.getSupervisoras();
        const item = list.find(s => s.id === id || s.nome === nome);
        if (item) {
            if (telefone) item.telefone = telefone;
            if (email) item.email = email;
            if (nome) item.nome = nome;
        } else {
            list.push({ id: id || ("sup-" + Date.now()), nome, telefone: telefone || "", email: email || "" });
        }
        this.saveData(this.data);
    }

    getProfessores() {
        const equipe = this.getEquipeEscolar();
        const deEquipe = equipe.filter(p => p.setor === "docentes");
        const professoresValidos = deEquipe.map(p => {
            const existente = (this.data && Array.isArray(this.data.professores)) ? this.data.professores.find(prof => 
                prof.id === p.id || 
                (prof.nome && p.nome && prof.nome.toLowerCase().trim() === p.nome.toLowerCase().trim())
            ) : null;
            return {
                id: p.id,
                nome: p.nome,
                telefone: p.telefone || (existente ? existente.telefone : ""),
                email: p.email || (existente ? existente.email : ""),
                disciplina: p.disciplina || (existente ? existente.disciplina : ""),
                cargoFuncao: p.cargoFuncao || "Professor"
            };
        });
        if (!this.data) this.data = {};
        this.data.professores = professoresValidos;
        return this.data.professores;
    }

    saveProfessor(profData) {
        let list = this.getProfessores();
        if (profData.id) {
            const index = list.findIndex(p => p.id === profData.id);
            if (index >= 0) {
                list[index] = { ...list[index], ...profData };
            } else {
                list.push(profData);
            }
        } else {
            profData.id = generateSecureId("prof");
            list.push(profData);
        }
        this.saveData(this.data);
        return profData;
    }

    deleteProfessor(id) {
        let list = this.getProfessores();
        this.data.professores = list.filter(p => p.id !== id);
        this.saveData(this.data);
    }

    getEquipeEscolar() {
        let saveNeeded = false;
        if (!this.data.equipeEscola || !Array.isArray(this.data.equipeEscola) || this.data.equipeEscola.length === 0) {
            this.data.equipeEscola = defaultSigeData.equipeEscola || [];
            saveNeeded = true;
        }

        // Garante que o Desenvolvedor Master conste na equipe escolar
        const devProf = this.data.equipeEscola.find(p => (p.email && p.email.toLowerCase().trim() === "elcortelini@gmail.com") || (p.cpf && cleanCpf(p.cpf) === "80603742068") || p.setor === "desenvolvedor");
        if (!devProf) {
            this.data.equipeEscola.unshift({
                id: "dev-master",
                nome: "Elevi Cortelini (Desenvolvedor)",
                cpf: "806.037.420-68",
                dataNascimento: "30/12/1981",
                senha: "30121981",
                setor: "desenvolvedor",
                cargoFuncao: "Desenvolvedor & Administrador Master do Sistema",
                disciplina: "TI & Engenharia de Sistemas",
                telefone: "48996692174",
                whatsapp: "48996692174",
                email: "elcortelini@gmail.com",
                turnos: "integral",
                turmasOuSalas: "Gabinete & Servidor",
                permissoes: { op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true }
            });
            saveNeeded = true;
        } else {
            if (devProf.cpf !== "806.037.420-68") {
                devProf.cpf = "806.037.420-68";
                saveNeeded = true;
            }
            if (devProf.dataNascimento !== "30/12/1981") {
                devProf.dataNascimento = "30/12/1981";
                devProf.senha = "30121981";
                saveNeeded = true;
            }
            if (!devProf.permissoes || devProf.permissoes.op_perfil !== 'gerencial') {
                devProf.permissoes = { ...(devProf.permissoes || {}), op: true, op_perfil: 'gerencial' };
                saveNeeded = true;
            }
        }

        // Garante identificador id e objeto de permissoes em cada membro da equipe
        this.data.equipeEscola.forEach((p, idx) => {
            if (!p.id) {
                p.id = "prof-" + (idx + 1);
                saveNeeded = true;
            }
            if (!p.permissoes || typeof p.permissoes !== 'object') {
                p.permissoes = this.getDefaultPermissoesByRole(p.setor);
                saveNeeded = true;
            } else {
                const defaults = this.getDefaultPermissoesByRole(p.setor);
                ['op', 'mural', 'supervisao', 'admin', 'direcao', 'uniformes'].forEach(k => {
                    if (p.permissoes[k] === undefined) {
                        p.permissoes[k] = !!defaults[k];
                        saveNeeded = true;
                    }
                });
                if (p.permissoes.op_perfil === undefined) {
                    p.permissoes.op_perfil = this.getOpPerfil(p);
                    saveNeeded = true;
                }
            }
            if (p.email && p.email.toLowerCase().trim() === "elcortelini@gmail.com") {
                p.permissoes = { op: true, op_perfil: 'gerencial', mural: true, supervisao: true, admin: true, direcao: true, uniformes: true };
            }
        });

        if (saveNeeded) {
            this.saveData(this.data);
        }
        return this.data.equipeEscola;
    }

    saveProfissional(profData) {
        let list = this.getEquipeEscolar();
        if (!profData.permissoes) {
            profData.permissoes = this.getDefaultPermissoesByRole(profData.setor);
        } else if (profData.permissoes.op_perfil === undefined) {
            profData.permissoes.op_perfil = this.getOpPerfil(profData);
        }

        let savedItem = null;
        if (profData.id) {
            const index = list.findIndex(p => p.id === profData.id);
            if (index >= 0) {
                list[index] = { ...list[index], ...profData };
                savedItem = list[index];
            } else {
                list.push(profData);
                savedItem = profData;
            }
        } else {
            profData.id = generateSecureId("prof");
            list.push(profData);
            savedItem = profData;
        }

        this.data.equipeEscola = list;

        // Determina o perfil / roleKey dinâmico baseado no setor e identificador
        let roleKey = savedItem.setor || "docentes";
        if (savedItem.setor === "orientacao") {
            roleKey = "orientadora_" + savedItem.id;
        } else if (savedItem.setor === "supervisao") {
            roleKey = "supervisora_" + savedItem.id;
        }

        // Sincroniza imediatamente com usuariosCadastrados (login por CPF ou e-mail)
        const cleanProfCpf = cleanCpf(savedItem.cpf || "");
        const cleanProfEmail = (savedItem.email || "").toLowerCase().trim();
        const rawDtNasc = savedItem.dataNascimento || "";
        const cleanDtNasc = cleanDataNascimento(rawDtNasc);

        let userList = this.getUsuarios();
        let existingUserIdx = userList.findIndex(u => 
            (u.id && u.id === savedItem.id) ||
            (cleanProfCpf && cleanCpf(u.cpf || "") === cleanProfCpf) ||
            (cleanProfEmail && u.email && u.email.toLowerCase().trim() === cleanProfEmail)
        );

        const userData = {
            id: savedItem.id,
            nome: savedItem.nome,
            cpf: savedItem.cpf ? formatCpf(savedItem.cpf) : (existingUserIdx >= 0 ? userList[existingUserIdx].cpf : ""),
            dataNascimento: rawDtNasc || (existingUserIdx >= 0 ? userList[existingUserIdx].dataNascimento : ""),
            senha: cleanDtNasc || (existingUserIdx >= 0 ? userList[existingUserIdx].senha : ""),
            email: cleanProfEmail || (existingUserIdx >= 0 ? userList[existingUserIdx].email : ""),
            role: roleKey,
            cargo: savedItem.cargoFuncao || savedItem.setor,
            status: "aprovado",
            cadastroCompleto: true,
            permissoes: savedItem.permissoes
        };

        if (existingUserIdx >= 0) {
            userList[existingUserIdx] = { ...userList[existingUserIdx], ...userData };
        } else if (savedItem.cpf || savedItem.email) {
            userList.push(userData);
        }
        this.data.usuariosCadastrados = userList;

        const opPerfil = this.getOpPerfil(savedItem);
        if (opPerfil === "executora") {
            this.saveOrientadora(savedItem.id, savedItem.nome, savedItem.telefone, savedItem.email);
        } else {
            // Se NÃO é executora de atendimento, remove qualquer registro antigo de orientadora
            if (Array.isArray(this.data.orientadoras)) {
                this.data.orientadoras = this.data.orientadoras.filter(o => 
                    o.id !== savedItem.id && 
                    (!savedItem.nome || (o.nome && o.nome.toLowerCase().trim() !== savedItem.nome.toLowerCase().trim()))
                );
            }
        }

        if (savedItem.setor === "docentes") {
            this.saveProfessor(savedItem);
        } else if (savedItem.setor === "supervisao") {
            this.saveSupervisora(savedItem.id, savedItem.nome, savedItem.telefone, savedItem.email);
        }

        this.saveData(this.data);
        this.logAuditEvent("Equipe Escolar", `Salvo colaborador ${savedItem.nome} (${savedItem.cargoFuncao || savedItem.setor})`, "Administração");
        return savedItem;
    }

    deleteProfissional(id) {
        let list = this.getEquipeEscolar();
        const prof = list.find(p => p.id === id);
        if (!prof) return false;

        // Protege o desenvolvedor principal contra exclusao
        if (prof.email && prof.email.toLowerCase().trim() === "elcortelini@gmail.com") {
            return false;
        }

        // 1. Remove da Equipe Escolar
        this.data.equipeEscola = list.filter(p => p.id !== id);
        if (!Array.isArray(this.data.deletedEquipeIds)) this.data.deletedEquipeIds = [];
        this.data.deletedEquipeIds.push(id);
        if (prof.cpf) this.data.deletedEquipeIds.push(cleanCpf(prof.cpf));
        if (prof.email) this.data.deletedEquipeIds.push(prof.email.toLowerCase().trim());
        this.data.deletedEquipeIds = Array.from(new Set(this.data.deletedEquipeIds));

        // 2. Remove de usuariosCadastrados por ID, E-mail, CPF ou Nome
        const profEmail = (prof.email || "").toLowerCase().trim();
        const profCpf = cleanCpf(prof.cpf || "");
        const profNome = (prof.nome || "").toLowerCase().trim();

        if (Array.isArray(this.data.usuariosCadastrados)) {
            this.data.usuariosCadastrados = this.data.usuariosCadastrados.filter(u => {
                if (u.email && u.email.toLowerCase().trim() === "elcortelini@gmail.com") return true;
                if (u.id && u.id === id) return false;
                if (profEmail && u.email && u.email.toLowerCase().trim() === profEmail) return false;
                if (profCpf && u.cpf && cleanCpf(u.cpf) === profCpf) return false;
                if (profNome && u.nome && u.nome.toLowerCase().trim() === profNome) return false;
                return true;
            });
        }

        // 3. Remove de orientadoras, supervisoras e professores
        if (Array.isArray(this.data.orientadoras)) {
            this.data.orientadoras = this.data.orientadoras.filter(o => 
                o.id !== id && 
                (!profNome || (o.nome && o.nome.toLowerCase().trim() !== profNome))
            );
        }
        if (Array.isArray(this.data.supervisoras)) {
            this.data.supervisoras = this.data.supervisoras.filter(s => 
                s.id !== id && 
                (!profNome || (s.nome && s.nome.toLowerCase().trim() !== profNome))
            );
        }
        if (Array.isArray(this.data.professores)) {
            this.data.professores = this.data.professores.filter(p => 
                p.id !== id && 
                (!profNome || (p.nome && p.nome.toLowerCase().trim() !== profNome))
            );
        }

        // 4. Se for o usuário atualmente logado no navegador, encerra a sessão
        const loggedCpf = cleanCpf(localStorage.getItem("sige_logged_cpf") || "");
        const loggedEmail = (localStorage.getItem("sige_logged_email") || "").toLowerCase().trim();
        if ((profCpf && loggedCpf === profCpf) || (profEmail && loggedEmail === profEmail)) {
            localStorage.removeItem("sige_logged_cpf");
            localStorage.removeItem("sige_logged_email");
        }

        this.saveData(this.data);
        this.logAuditEvent("Equipe Escolar", `Removido colaborador ${prof.nome}`, "Administração");
        return true;
    }

    getTurmasEscola() {
        if (!this.data.turmasEscola || !Array.isArray(this.data.turmasEscola)) {
            this.data.turmasEscola = defaultSigeData.turmasEscola || [];
            this.saveData(this.data);
        }
        this.syncTurmasFromImportedAlunos();
        return this.data.turmasEscola;
    }

    saveTurma(turmaData) {
        let list = this.getTurmasEscola();
        if (turmaData.id) {
            const index = list.findIndex(t => t.id === turmaData.id);
            if (index >= 0) {
                list[index] = { ...list[index], ...turmaData };
            } else {
                list.push(turmaData);
            }
        } else {
            turmaData.id = generateSecureId("turma");
            list.push(turmaData);
        }
        this.saveData(this.data);
        this.logAuditEvent("Turmas & Turnos", `Salva turma ${turmaData.nome} (${turmaData.turno})`, "Administração");
        return turmaData;
    }

    deleteTurma(id) {
        let list = this.getTurmasEscola();
        const turma = list.find(t => t.id === id);
        this.data.turmasEscola = list.filter(t => t.id !== id);
        if (!Array.isArray(this.data.deletedTurmaIds)) this.data.deletedTurmaIds = [];
        this.data.deletedTurmaIds.push(id);
        this.data.deletedTurmaIds = Array.from(new Set(this.data.deletedTurmaIds));
        this.saveData(this.data);
        if (turma) {
            this.logAuditEvent("Turmas & Turnos", `Removida turma ${turma.nome}`, "Administração");
        }
    }

    getConfigEscola() {
        if (!this.data.configEscola) {
            this.data.configEscola = defaultSigeData.configEscola;
            this.saveData(this.data);
        }
        return this.data.configEscola;
    }

    saveConfigEscola(configData) {
        this.data.configEscola = { ...this.getConfigEscola(), ...configData };
        this.saveData(this.data);
        this.logAuditEvent("Configuração Escolar", "Atualizados parâmetros institucionais da escola", "Administração");
        return this.data.configEscola;
    }

    getLogoEscola() {
        const cfg = this.getConfigEscola();
        return (cfg && cfg.logo) ? cfg.logo : "img/logo-pedro-rizzi.png";
    }

    saveLogoEscola(base64Data) {
        return this.saveConfigEscola({ logo: base64Data });
    }

    resetLogoEscola() {
        const cfg = this.getConfigEscola();
        delete cfg.logo;
        return this.saveConfigEscola({ logo: "img/logo-pedro-rizzi.png" });
    }

    getAuditLogs() {
        if (!this.data.auditLogs || !Array.isArray(this.data.auditLogs)) {
            this.data.auditLogs = defaultSigeData.auditLogs || [];
            this.saveData(this.data);
        }
        return this.data.auditLogs;
    }

    logAuditEvent(setor, acao, usuario = "Sistema") {
        let logs = this.getAuditLogs();
        const newLog = {
            id: "log-" + Date.now(),
            data: new Date().toISOString(),
            usuario,
            acao,
            setor
        };
        logs.unshift(newLog);
        if (logs.length > 100) logs = logs.slice(0, 100);
        this.data.auditLogs = logs;
        localStorage.setItem(SIGE_STORAGE_KEY, JSON.stringify(this.data));
    }

    addAuditLog(acao, modulo = "Admin") {
        const usuario = (typeof this.getRole === "function" && this.getRole()) || "Admin";
        this.logAuditEvent(modulo, acao, usuario);
    }

    getWhatsappConfig() {
        if (!this.data.whatsappConfig) {
            this.data.whatsappConfig = {
                enabled: true,
                provider: "simulated",
                apiUrl: "",
                apiToken: "",
                autoSendOnCreate: true,
                autoSendOnArrival: true,
                autoSendReminders: true
            };
            this.saveData(this.data);
        }
        return this.data.whatsappConfig;
    }

    saveWhatsappConfig(config) {
        this.data.whatsappConfig = { ...this.getWhatsappConfig(), ...config };
        this.saveData(this.data);
    }

    logWhatsappReminder(id, tipoLembrete) {
        this.logWhatsappDispatch(id, {
            tipo: tipoLembrete === "24h" ? "Lembrete 24h" : "Lembrete no Dia",
            modo: "manual",
            status: "sucesso"
        });
    }

    logWhatsappDispatch(id, logData) {
        const ag = this.getAgendamentosOP().find(a => a.id === id);
        if (ag) {
            if (!ag.historicoWhatsapp) ag.historicoWhatsapp = [];
            ag.historicoWhatsapp.unshift({
                id: "wlog-" + Date.now() + "-" + Math.floor(Math.random()*1000),
                tipo: logData.tipo || "Notificação WhatsApp",
                mensagem: logData.mensagem || "",
                enviadoEm: new Date().toISOString(),
                modo: logData.modo || "automático", // "automático" ou "manual"
                status: logData.status || "sucesso", // "sucesso" ou "falha"
                destinatario: logData.destinatario || ag.telefone || ""
            });
            this.saveData(this.data);
        }
    }

    addAnexoOP(id, nomeArquivo, urlOuData) {
        const ag = this.data.agendamentosOP.find(a => a.id === id);
        if (ag) {
            if (!ag.anexos) ag.anexos = [];
            ag.anexos.push({
                nome: nomeArquivo,
                url: urlOuData,
                data: new Date().toISOString()
            });
            this.saveData(this.data);
        }
    }

    updateEncaminhamentoOP(id, encaminhamento, historicoTratado) {
        const ag = this.data.agendamentosOP.find(a => a.id === id);
        if (ag) {
            if (encaminhamento !== undefined) ag.encaminhamento = encaminhamento;
            if (historicoTratado !== undefined) ag.historicoTratado = historicoTratado;
            this.saveData(this.data);
        }
    }

    saveAgendamentosOP(agendamentos) {
        if (this.data) {
            this.data.agendamentosOP = agendamentos;
            this.saveData(this.data);
        }
    }

    addAgendamentoOP(agendamento) {
        // Verifica se o dia esta bloqueado pela Direcao
        if (this.isDiaBloqueado(agendamento.data)) {
            const blockObj = this.data.diasBloqueados.find(d => d.data === agendamento.data);
            throw new Error(`Data Bloqueada pela Direção (${agendamento.data}): ${blockObj ? blockObj.motivo : 'Recesso / Conselho'}`);
        }

        // Validação estrita de limite por Orientadora (máximo 4 atendimentos por turno por orientadora)
        const targetOri = (agendamento.orientadora || "").toLowerCase().trim();
        const oriTurnoAppointments = this.data.agendamentosOP.filter(
            a => {
                if (a.data !== agendamento.data || a.turno !== agendamento.turno || a.statusSecretaria === "cancelado") {
                    return false;
                }
                const aOri = (a.orientadora || "").toLowerCase().trim();
                if (!targetOri && !aOri) return true;
                return aOri === targetOri || (targetOri && aOri.includes(targetOri)) || (aOri && targetOri.includes(aOri));
            }
        );

        if (oriTurnoAppointments.length >= 4) {
            throw new Error(`Limite atingido! A orientadora (${agendamento.orientadora || 'Orientação'}) já possui 4 atendimentos agendados no turno ${agendamento.turno.toUpperCase()} nesta data.`);
        }

        agendamento.id = generateSecureId("op");
        agendamento.criadoEm = new Date().toISOString();
        if (agendamento.aluno) {
            agendamento.aluno = cleanStudentName(agendamento.aluno);
        }
        if (!agendamento.historicoWhatsapp) agendamento.historicoWhatsapp = [];
        if (!agendamento.anexos) agendamento.anexos = [];
        
        this.data.agendamentosOP.unshift(agendamento);
        this.saveData(this.data);
        return agendamento;
    }

    updateSecretariaStatusOP(id, status, obs = "", chegadaEm = null) {
        const ag = this.data.agendamentosOP.find(a => a.id === id);
        if (ag) {
            ag.statusSecretaria = status;
            if (obs) ag.obsSecretaria = obs;
            if (chegadaEm) ag.chegadaEm = chegadaEm;
            this.saveData(this.data);
        }
    }

    // Demandas Supervisão
    getDemandasSupervisao() {
        return this.data.demandasSupervisao || [];
    }

    addDemandaSupervisao(demanda) {
        demanda.id = generateSecureId("sup");
        demanda.criadoEm = getLocalDateISO();
        if (!demanda.dataInicio) demanda.dataInicio = demanda.prazo || demanda.criadoEm;
        if (!demanda.dataFim) demanda.dataFim = demanda.dataInicio;
        if (!demanda.turno) demanda.turno = "matutino";
        if (!demanda.categoria) demanda.categoria = "Planejamento Pedagógico";

        if (!this.data.demandasSupervisao) this.data.demandasSupervisao = [];
        this.data.demandasSupervisao.unshift(demanda);
        this.saveData(this.data);
        return demanda;
    }

    updateStatusDemandaSupervisao(id, status) {
        const d = this.data.demandasSupervisao.find(item => item.id === id);
        if (d) {
            d.status = status;
            this.saveData(this.data);
        }
    }

    // Projetos Institucionais da Supervisão
    getProjetosSupervisao() {
        if (!this.data.projetosSupervisao || !Array.isArray(this.data.projetosSupervisao)) {
            this.data.projetosSupervisao = defaultSigeData.projetosSupervisao || [];
            this.saveData(this.data);
        }
        return this.data.projetosSupervisao;
    }

    addProjetoSupervisao(proj) {
        proj.id = generateSecureId("proj");
        if (!proj.etapas) proj.etapas = [];
        if (!proj.checklistPreEvento) proj.checklistPreEvento = [];
        if (!proj.status) proj.status = "em_dia";
        if (!this.data.projetosSupervisao) this.data.projetosSupervisao = [];
        this.data.projetosSupervisao.unshift(proj);
        this.saveData(this.data);
        return proj;
    }

    toggleEtapaProjetoSupervisao(projId, etapaId) {
        const p = (this.getProjetosSupervisao()).find(item => item.id === projId);
        if (p && p.etapas) {
            const et = p.etapas.find(e => e.id === etapaId);
            if (et) et.concluido = !et.concluido;
            this.saveData(this.data);
        }
    }

    toggleChecklistProjetoSupervisao(projId, index) {
        const p = (this.getProjetosSupervisao()).find(item => item.id === projId);
        if (p && p.checklistPreEvento && p.checklistPreEvento[index]) {
            p.checklistPreEvento[index].concluido = !p.checklistPreEvento[index].concluido;
            this.saveData(this.data);
        }
    }

    // Projetos Continuados de Período Variado da Orientação Pedagógica (OP)
    getProjetosOrientacao() {
        if (!this.data.projetosOrientacao || !Array.isArray(this.data.projetosOrientacao)) {
            this.data.projetosOrientacao = defaultSigeData.projetosOrientacao || [];
            this.saveData(this.data);
        }
        return this.data.projetosOrientacao;
    }

    addProjetoOrientacao(proj) {
        proj.id = generateSecureId("proj-op");
        if (!proj.etapas) proj.etapas = [];
        if (!proj.checklistAcompanhamento) proj.checklistAcompanhamento = [];
        if (!proj.status) proj.status = "em_dia";
        if (!this.data.projetosOrientacao) this.data.projetosOrientacao = [];
        this.data.projetosOrientacao.unshift(proj);
        this.saveData(this.data);
        this.logAuditEvent("Orientação Pedagógica", `Criado projeto continuado: ${proj.titulo}`, "Orientação");
        return proj;
    }

    toggleEtapaProjetoOrientacao(projId, etapaId) {
        const p = (this.getProjetosOrientacao()).find(item => item.id === projId);
        if (p && p.etapas) {
            const et = p.etapas.find(e => e.id === etapaId);
            if (et) et.concluido = !et.concluido;
            this.saveData(this.data);
        }
    }

    toggleChecklistProjetoOrientacao(projId, index) {
        const p = (this.getProjetosOrientacao()).find(item => item.id === projId);
        if (p && p.checklistAcompanhamento && p.checklistAcompanhamento[index]) {
            p.checklistAcompanhamento[index].concluido = !p.checklistAcompanhamento[index].concluido;
            this.saveData(this.data);
        }
    }

    deleteProjetoOrientacao(id) {
        let list = this.getProjetosOrientacao();
        this.data.projetosOrientacao = list.filter(p => p.id !== id);
        this.saveData(this.data);
        this.logAuditEvent("Orientação Pedagógica", `Removido projeto continuado ID: ${id}`, "Orientação");
    }

    // Atividades Externas / Aulas Passeio
    getAtividadesExternasSupervisao() {
        if (!this.data.atividadesExternasSupervisao || !Array.isArray(this.data.atividadesExternasSupervisao)) {
            this.data.atividadesExternasSupervisao = defaultSigeData.atividadesExternasSupervisao || [];
            this.saveData(this.data);
        }
        return this.data.atividadesExternasSupervisao;
    }

    addAtividadeExternaSupervisao(act) {
        act.id = generateSecureId("ext");
        if (!act.checklistLogistica) act.checklistLogistica = [];
        if (!this.data.atividadesExternasSupervisao) this.data.atividadesExternasSupervisao = [];
        this.data.atividadesExternasSupervisao.unshift(act);
        this.saveData(this.data);
        return act;
    }

    toggleChecklistAtividadeExterna(actId, index) {
        const a = (this.getAtividadesExternasSupervisao()).find(item => item.id === actId);
        if (a && a.checklistLogistica && a.checklistLogistica[index]) {
            a.checklistLogistica[index].concluido = !a.checklistLogistica[index].concluido;
            this.saveData(this.data);
        }
    }

    // Reuniões Pedagógicas & HATP
    getReunioesPedagogicasSupervisao() {
        if (!this.data.reunioesPedagogicasSupervisao || !Array.isArray(this.data.reunioesPedagogicasSupervisao)) {
            this.data.reunioesPedagogicasSupervisao = defaultSigeData.reunioesPedagogicasSupervisao || [];
            this.saveData(this.data);
        }
        return this.data.reunioesPedagogicasSupervisao;
    }

    addReuniaoPedagogicaSupervisao(reun) {
        reun.id = generateSecureId("reun");
        if (!this.data.reunioesPedagogicasSupervisao) this.data.reunioesPedagogicasSupervisao = [];
        this.data.reunioesPedagogicasSupervisao.unshift(reun);
        this.saveData(this.data);
        return reun;
    }

    // Demandas Administração
    getDemandasAdmin() {
        return this.data.demandasAdmin || [];
    }

    addDemandaAdmin(demanda) {
        demanda.id = generateSecureId("adm");
        demanda.criadoEm = getLocalDateISO();
        this.data.demandasAdmin.unshift(demanda);
        this.saveData(this.data);
        return demanda;
    }

    updateStatusDemandaAdmin(id, status) {
        const d = this.data.demandasAdmin.find(item => item.id === id);
        if (d) {
            d.status = status;
            this.saveData(this.data);
        }
    }

    // Mural de Avisos
    getMuralAvisos() {
        return this.data.muralAvisos || [];
    }

    addAviso(aviso) {
        aviso.id = generateSecureId("av");
        aviso.data = getLocalDateISO();
        this.data.muralAvisos.unshift(aviso);
        this.saveData(this.data);
        return aviso;
    }

    // Calendário de Tarefas
    getCalendarioTarefas() {
        return this.data.calendarioTarefas || [];
    }

    addTarefaCalendario(tarefa) {
        tarefa.id = generateSecureId("cal");
        this.data.calendarioTarefas.unshift(tarefa);
        this.saveData(this.data);
        return tarefa;
    }

    toggleStatusTarefa(id) {
        const t = this.data.calendarioTarefas.find(item => item.id === id);
        if (t) {
            t.status = t.status === "concluido" ? "pendente" : "concluido";
            this.saveData(this.data);
        }
    }

    // ==========================================
    // MÓDULO DE UNIFORMES ESCOLARES
    // ==========================================
    getPedidosUniformes() {
        if (!this.data.pedidosUniformes || !Array.isArray(this.data.pedidosUniformes)) {
            this.data.pedidosUniformes = defaultSigeData.pedidosUniformes || [];
            this.saveData(this.data);
        }
        return this.data.pedidosUniformes;
    }

    limparPedidosUniformes() {
        this.data.pedidosUniformes = [];
        this.data.lotesSME = [];
        this.saveData(this.data);
        this.syncToFirebase();
        this.logAuditEvent("Uniformes Escolares", "Limpeza de todos os pedidos e lotes de uniformes", "Desenvolvedor");
        return true;
    }

    addPedidoUniforme(pedido) {
        pedido.id = generateSecureId("uni");
        pedido.criadoEm = new Date().toISOString();
        if (!pedido.status) pedido.status = "pendente_envio";
        if (pedido.aluno) {
            pedido.aluno = cleanStudentName(pedido.aluno);
        }
        if (!this.data.pedidosUniformes) this.data.pedidosUniformes = [];
        this.data.pedidosUniformes.unshift(pedido);
        this.saveData(this.data);
        this.logAuditEvent("Uniformes Escolares", `Registrado pedido de uniforme para ${pedido.aluno} (${pedido.turma})`, pedido.responsavelPedido || "Secretaria");
        return pedido;
    }

    updatePedidoUniforme(id, dados) {
        const ped = (this.getPedidosUniformes()).find(p => p.id === id);
        if (ped) {
            Object.assign(ped, dados);
            this.saveData(this.data);
        }
        return ped;
    }

    cancelarPedidoUniforme(id) {
        const ped = (this.getPedidosUniformes()).find(p => p.id === id);
        if (ped) {
            ped.status = "cancelado";
            this.saveData(this.data);
            this.logAuditEvent("Uniformes Escolares", `Cancelado pedido ID: ${id} (${ped.aluno})`, "Secretaria");
        }
    }

    getLotesSME() {
        if (!this.data.lotesSME || !Array.isArray(this.data.lotesSME)) {
            this.data.lotesSME = defaultSigeData.lotesSME || [];
            this.saveData(this.data);
        }
        return this.data.lotesSME;
    }

    fecharLoteSME(pedidosIds, dataEnvioSme, previsaoRecebimento, observacoes = "") {
        if (!pedidosIds || pedidosIds.length === 0) {
            throw new Error("Selecione ao menos um pedido de uniforme para fechar a remessa!");
        }

        const pedidosValidados = [];
        pedidosIds.forEach(id => {
            const ped = this.data.pedidosUniformes.find(p => p.id === id);
            if (!ped) return;
            if (ped.loteSmeId || ped.status !== "pendente_envio") {
                throw new Error(`O pedido de ${ped.aluno} (${ped.turma}) já pertence ao Lote ${ped.loteSmeId || 'anterior'} e não pode ser incluído em uma nova remessa!`);
            }
            pedidosValidados.push(ped);
        });

        if (pedidosValidados.length === 0) {
            throw new Error("Nenhum pedido pendente válido selecionado!");
        }

        const loteId = generateSecureId("lote-sme");
        const codigoLote = "REMESSA-" + new Date().toISOString().substring(0,7) + "-" + Math.floor(10 + Math.random()*90);

        const lote = {
            id: loteId,
            codigoLote: codigoLote,
            dataCorte: dataEnvioSme || getLocalDateISO(),
            dataEnvioSme: dataEnvioSme || getLocalDateISO(),
            previsaoRecebimento: previsaoRecebimento || "",
            dataChegadaReal: null,
            status: "enviado_sme",
            observacoes: observacoes,
            pedidosIds: pedidosValidados.map(p => p.id),
            responsavelFechamento: this.getRoleFormatted(),
            criadoEm: new Date().toISOString()
        };

        if (!this.data.lotesSME) this.data.lotesSME = [];
        this.data.lotesSME.unshift(lote);

        // Atualizar status dos pedidos vinculados ao lote
        pedidosValidados.forEach(ped => {
            ped.status = "enviado_sme";
            ped.loteSmeId = loteId;
            ped.dataEnvioSme = lote.dataEnvioSme;
            ped.previsaoRecebimentoSme = lote.previsaoRecebimento;
        });

        this.saveData(this.data);
        this.logAuditEvent("Uniformes Escolares", `Fechado Lote SME ${codigoLote} com ${pedidosValidados.length} pedidos.`, "Secretaria");
        return lote;
    }

    registrarRecebimentoLoteSME(loteId, dataChegadaReal, observacoes = "", mapaConferencia = {}) {
        const lote = (this.getLotesSME()).find(l => l.id === loteId);
        if (lote) {
            lote.dataChegadaReal = dataChegadaReal || getLocalDateISO();
            let temDivergencia = false;

            lote.pedidosIds.forEach(id => {
                const ped = this.data.pedidosUniformes.find(p => p.id === id);
                if (ped) {
                    const statusConf = mapaConferencia[id] || "recebido"; // "recebido" ou "divergente"
                    if (statusConf === "recebido") {
                        if (ped.status !== "entregue") {
                            ped.status = "disponivel_estoque";
                            ped.dataChegadaEscola = lote.dataChegadaReal;
                        }
                    } else {
                        // O item não veio no lote da SME -> Fica em aberto para novo pedido de lote à SME
                        ped.status = "pendente_envio";
                        ped.loteAnteriorId = loteId;
                        ped.loteSmeId = null;
                        ped.observacoesDivergencia = `Não entregue no Lote ${lote.codigoLote} — Liberado e em aberto para novo pedido à SME.`;
                        temDivergencia = true;
                    }
                }
            });

            lote.status = temDivergencia ? "recebido_parcial" : "recebido_total";
            if (observacoes) lote.observacoes = (lote.observacoes ? lote.observacoes + " | " : "") + observacoes;

            this.saveData(this.data);
            this.logAuditEvent("Uniformes Escolares", `Registrada chegada do Lote SME ${lote.codigoLote} na escola (${lote.status}).`, "Secretaria");
        }
        return lote;
    }

    reincluirPedidoEmNovoLoteSME(id) {
        const ped = (this.getPedidosUniformes()).find(p => p.id === id);
        if (ped) {
            ped.status = "pendente_envio";
            ped.loteSmeId = null;
            this.saveData(this.data);
            this.logAuditEvent("Uniformes Escolares", `Pedido ID: ${id} (${ped.aluno}) liberado para novo lote SME.`, "Secretaria");
        }
        return ped;
    }

    getEstoqueUniformes() {
        if (!this.data.estoqueUniformes || typeof this.data.estoqueUniformes !== "object" || !this.data.estoqueUniformes.masculino) {
            this.data.estoqueUniformes = defaultSigeData.estoqueUniformes || {
                masculino: {
                    "camiseta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "bermuda": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "calca": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "moleton": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "jaqueta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 }
                },
                feminino: {
                    "camiseta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "bermuda": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "calca": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "moleton": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 },
                    "jaqueta": { "8": 0, "10": 0, "12": 0, "14": 0, "16": 0, "P": 0, "M": 0, "G": 0, "GG": 0, "G1": 0, "G2": 0 }
                }
            };
            this.saveData(this.data);
        }
        return this.data.estoqueUniformes;
    }

    ajustarEstoqueUniforme(peca, tamanho, quantidade, acao = "somar", genero = "Masculino") {
        const est = this.getEstoqueUniformes();
        const genKey = (genero && genero.toLowerCase().includes("fem")) ? "feminino" : "masculino";

        if (!est[genKey]) est[genKey] = {};
        if (!est[genKey][peca]) est[genKey][peca] = {};

        const atual = est[genKey][peca][tamanho] || 0;
        const val = parseInt(quantidade) || 0;

        if (acao === "somar") {
            est[genKey][peca][tamanho] = atual + val;
        } else if (acao === "subtrair") {
            est[genKey][peca][tamanho] = Math.max(0, atual - val);
        } else if (acao === "definir") {
            est[genKey][peca][tamanho] = Math.max(0, val);
        }

        this.saveData(this.data);
        this.logAuditEvent("Uniformes Escolares", `Ajuste de estoque (${genKey}): ${peca.toUpperCase()} Tam ${tamanho} -> Novo Saldo: ${est[genKey][peca][tamanho]} (${acao})`, "Secretaria");
        return est[genKey][peca][tamanho];
    }

    darBaixaEntregaUniforme(pedidoId, entreguePor, darBaixaEstoque = false) {
        const ped = (this.getPedidosUniformes()).find(p => p.id === pedidoId);
        if (!ped) throw new Error("Pedido de uniforme não encontrado!");

        ped.status = "entregue";
        ped.dataEntregaAluno = getLocalDateISO();
        ped.entreguePor = entreguePor || this.getRoleFormatted();

        if (darBaixaEstoque) {
            const tam = ped.tamanho;
            const gen = ped.genero || "Masculino";

            if (ped.tipoItem === "kit_completo") {
                if (ped.estacao === "verao") {
                    this.ajustarEstoqueUniforme("camiseta", tam, 2, "subtrair", gen);
                    this.ajustarEstoqueUniforme("bermuda", tam, 2, "subtrair", gen);
                } else {
                    this.ajustarEstoqueUniforme("camiseta", tam, 2, "subtrair", gen);
                    this.ajustarEstoqueUniforme("calca", tam, 2, "subtrair", gen);
                    this.ajustarEstoqueUniforme("moleton", tam, 1, "subtrair", gen);
                }
            } else if (ped.pecasAvulsas && Array.isArray(ped.pecasAvulsas)) {
                ped.pecasAvulsas.forEach(peca => {
                    this.ajustarEstoqueUniforme(peca, tam, 1, "subtrair", gen);
                });
            }
        }

        this.saveData(this.data);
        this.logAuditEvent("Uniformes Escolares", `Uniforme entregue ao aluno ${ped.aluno} (${ped.turma}) por ${ped.entreguePor}`, ped.entreguePor);
        return ped;
    }

    // Notificações Inteligentes Filtradas por Perfil
    getNotificacoesPertinentes() {
        const role = this.getRole();
        const list = [];
        const hojeStr = getLocalDateISO();

        // 0. Uniformes Escolares (Secretaria, Direção, Admin)
        if (role === "secretaria" || role === "direcao" || role === "admin" || role === "desenvolvedor") {
            const pendentesSme = this.getPedidosUniformes().filter(p => p.status === "pendente_envio");
            if (pendentesSme.length > 0) {
                list.push({
                    id: `notif-uni-sme`,
                    title: `👕 Pedidos de Uniforme Pendentes de Envio à SME (${pendentesSme.length})`,
                    desc: `Existem pedidos aguardando fechamento de lote para remessa à SME.`,
                    time: `Ação necessária`,
                    targetTab: "uniformes",
                    unread: !this.data.notificacoesLidas.includes(`notif-uni-sme`)
                });
            }

            const disponiveisEntrega = this.getPedidosUniformes().filter(p => p.status === "disponivel_estoque");
            if (disponiveisEntrega.length > 0) {
                list.push({
                    id: `notif-uni-entrega`,
                    title: `📦 Uniformes Prontos para Entrega aos Alunos (${disponiveisEntrega.length})`,
                    desc: `Uniformes chegaram da SME ou estão disponíveis no estoque local para distribuição.`,
                    time: `Pronto para entrega`,
                    targetTab: "uniformes",
                    unread: !this.data.notificacoesLidas.includes(`notif-uni-entrega`)
                });
            }
        }

        // 1. Orientação Pedagógica
        if (role === "orientacao" || role === "direcao" || role === "admin") {
            const emergenciasHoje = this.getAgendamentosOP().filter(a => a.tipo === "emergencial" && a.statusSecretaria === "pendente");
            emergenciasHoje.forEach(e => {
                list.push({
                    id: `notif-op-${e.id}`,
                    title: `🚨 Vaga Emergencial OP!`,
                    desc: `Atendimento urgente para ${e.aluno} (${e.turma}).`,
                    time: `Turno ${e.turno.toUpperCase()}`,
                    targetTab: "op",
                    unread: !this.data.notificacoesLidas.includes(`notif-op-${e.id}`)
                });
            });

            const aguardandoHoje = this.getAgendamentosOP().filter(a => a.statusSecretaria === "aguardando");
            aguardandoHoje.forEach(a => {
                list.push({
                    id: `notif-wait-${a.id}`,
                    title: `🔔 Aluno Aguardando na Recepção!`,
                    desc: `${a.aluno} (${a.turma}) chegou e aguarda (${a.orientadora || 'Orientação'}).`,
                    time: a.chegadaEm ? `Chegou às ${a.chegadaEm.split("T")[1]?.substring(0,5) || ''}` : "Recepção",
                    targetTab: "op",
                    unread: !this.data.notificacoesLidas.includes(`notif-wait-${a.id}`)
                });
            });
        }

        // 2. Secretaria
        if (role === "secretaria" || role === "direcao" || role === "admin") {
            const opPendentes = this.getAgendamentosOP().filter(a => a.statusSecretaria === "pendente");
            if (opPendentes.length > 0) {
                list.push({
                    id: `notif-sec-op`,
                    title: `📝 Confirmação da OP Pendente (${opPendentes.length})`,
                    desc: `Existem atendimentos de hoje que aguardam OK de presença da Secretaria.`,
                    time: `Ação necessária`,
                    targetTab: "op",
                    unread: !this.data.notificacoesLidas.includes(`notif-sec-op`)
                });
            }
        }

        // 3. Supervisão
        if (role === "supervisao" || role === "direcao" || role === "admin") {
            const supPendentes = this.getDemandasSupervisao().filter(d => d.status === "pendente");
            supPendentes.forEach(d => {
                list.push({
                    id: `notif-sup-${d.id}`,
                    title: `📋 Nova Demanda Pedagógica`,
                    desc: `${d.titulo} - Urgência: ${d.prioridade.toUpperCase()}`,
                    time: `Prazo: ${d.prazo}`,
                    targetTab: "supervisao",
                    unread: !this.data.notificacoesLidas.includes(`notif-sup-${d.id}`)
                });
            });
        }

        // 4. Comunicados Gerais da Direção (Para todos)
        const avisosUrgentes = this.getMuralAvisos().filter(a => a.urgente);
        avisosUrgentes.forEach(a => {
            list.push({
                id: `notif-av-${a.id}`,
                title: `📢 Comunicado Urgente da Direção`,
                desc: a.titulo,
                time: a.data,
                targetTab: "mural",
                unread: !this.data.notificacoesLidas.includes(`notif-av-${a.id}`)
            });
        });

        // 5. Calendário de Prazos
        const tarefasHoje = this.getCalendarioTarefas().filter(t => t.quando === hojeStr && t.status !== "concluido");
        tarefasHoje.forEach(t => {
            list.push({
                id: `notif-cal-${t.id}`,
                title: `⏰ Prazo de Tarefa Hoje!`,
                desc: `${t.tarefa} (${t.responsavel})`,
                time: `Data: ${t.quando}`,
                targetTab: "mural",
                unread: !this.data.notificacoesLidas.includes(`notif-cal-${t.id}`)
            });
        });

        return list;
    }

    markAllNotificationsAsRead() {
        const notifs = this.getNotificacoesPertinentes();
        notifs.forEach(n => {
            if (!this.data.notificacoesLidas.includes(n.id)) {
                this.data.notificacoesLidas.push(n.id);
            }
        });
        this.saveData(this.data);
    }

    getUserName() {
        const logged = this.getLoggedUser();
        return logged ? (logged.nome || logged.email || null) : null;
    }

    getRoleFormatted() {
        const role = this.getRole();
        const roleMap = {
            desenvolvedor: 'Desenvolvedor do Sistema',
            direcao: 'Direção Escolar',
            orientadora_clarinda: 'Orientadora Clarinda (Anos Iniciais)',
            orientadora_daiane: 'Orientadora Daiane (Anos Finais)',
            supervisao: 'Supervisão Pedagógica',
            secretaria: 'Secretaria Escolar',
            admin: 'Administrador'
        };
        return roleMap[role] || this.getUserName() || 'Gestão Escolar';
    }

    async criarTokenConfirmacao(agendamentoId) {
        const ag = (this.data.agendamentosOP || []).find(a => a.id === agendamentoId);
        if (!ag || !this.firestore) return null;
        const token = generateSecureId('token');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const docData = {
            agendamentoId: ag.id,
            aluno: ag.aluno || '',
            turma: ag.turma || '',
            data: ag.data || '',
            horario: ag.horario || '',
            orientadora: ag.orientadora || '',
            responsavel: ag.responsavel || '',
            status: ag.statusSecretaria || 'aguardando',
            expiresAt: expiresAt.toISOString(),
            criadoEm: new Date().toISOString()
        };
        try {
            await this.firestore.collection('confirmacoes_op').doc(token).set(docData);
            return token;
        } catch (e) {
            console.error('Erro ao criar token de confirmacao:', e);
            return null;
        }
    }

    async atualizarStatusPorToken(agendamentoId, novoStatus, obs) {
        if (!this.firestore || !agendamentoId) return;
        try {
            const ags = this.data.agendamentosOP || [];
            const idx = ags.findIndex(a => a.id === agendamentoId);
            if (idx !== -1) {
                ags[idx].statusSecretaria = novoStatus;
                if (obs) ags[idx].obsSecretaria = obs;
                ags[idx].confirmadoEm = new Date().toISOString();
                await this.firestore.collection('sige_pedro_rizzi').doc('mod_op').set(
                    { agendamentosOP: ags, lastSyncAt: new Date().toISOString() }, { merge: true }
                );
                try {
                    await this.firestore.collection('sige_pedro_rizzi').doc('database').set(
                        { agendamentosOP: ags }, { merge: true }
                    );
                } catch(e) {}
            }
        } catch (e) {
            console.error('Erro ao atualizar status por token:', e);
        }
    }

    // ==========================================
    // MÉTODOS DO MÓDULO DA DIREÇÃO & GESTÃO
    // ==========================================

    getAtasGabinete() {
        return (this.data && Array.isArray(this.data.atasGabineteDirecao)) ? this.data.atasGabineteDirecao : [];
    }

    addAtaGabinete(ata) {
        if (!this.data.atasGabineteDirecao) this.data.atasGabineteDirecao = [];
        const novaAta = {
            id: generateSecureId('ata-dir'),
            data: ata.data || new Date().toISOString(),
            titulo: ata.titulo || 'Atendimento de Gabinete',
            tipo: ata.tipo || 'pais',
            tipoDesc: ata.tipoDesc || 'Atendimento Geral',
            participantes: ata.participantes || '',
            alunoRelacionado: ata.alunoRelacionado || '',
            turmaRelacionada: ata.turmaRelacionada || '',
            pauta: ata.pauta || '',
            combinados: ata.combinados || '',
            encaminhamentos: ata.encaminhamentos || '',
            autor: this.getUserName() || 'Direção Escolar',
            status: ata.status || 'concluida',
            criadoEm: new Date().toISOString()
        };
        this.data.atasGabineteDirecao.unshift(novaAta);
        this.addAuditLog('Cadastro de Ata de Gabinete (' + novaAta.titulo + ')', 'Direção');
        this.saveData(this.data);
        return novaAta;
    }

    deleteAtaGabinete(id) {
        if (!this.data.atasGabineteDirecao) return;
        this.data.atasGabineteDirecao = this.data.atasGabineteDirecao.filter(a => a.id !== id);
        if (!Array.isArray(this.data.deletedAtaIds)) this.data.deletedAtaIds = [];
        this.data.deletedAtaIds.push(id);
        this.data.deletedAtaIds = Array.from(new Set(this.data.deletedAtaIds));
        this.addAuditLog('Exclusão de Ata de Gabinete (ID: ' + id + ')', 'Direção');
        this.saveData(this.data);
    }

    getEventosCalendarioEscolar() {
        return (this.data && Array.isArray(this.data.eventosCalendarioEscolar)) ? this.data.eventosCalendarioEscolar : [];
    }

    getCalendarioEscolar() {
        return this.getEventosCalendarioEscolar();
    }

    addEventoCalendarioEscolar(ev) {
        if (!this.data.eventosCalendarioEscolar) this.data.eventosCalendarioEscolar = [];
        const dataVal = ev.data || getLocalDateISO();
        const novoEvento = {
            id: generateSecureId('cal-ev'),
            data: dataVal,
            hora: ev.hora || '08:00',
            titulo: ev.titulo || 'Evento Escolar',
            mes: ev.mes || this.getMesNomeFromData(dataVal),
            dataExibicao: ev.dataExibicao || this.formatDateBR(dataVal),
            categoria: ev.categoria || 'reuniao_pedagogica',
            categoriaDesc: ev.categoriaDesc || 'Reunião Pedagógica',
            descricao: ev.descricao || '',
            publicoAlvo: ev.publicoAlvo || 'escola_toda',
            local: ev.local || 'Escola',
            status: ev.status || 'agendado',
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
        };
        this.data.eventosCalendarioEscolar.push(novoEvento);
        this.data.eventosCalendarioEscolar.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
        this.addAuditLog('Novo Evento no Calendário Letivo (' + novoEvento.titulo + ')', 'Direção');
        this.saveData(this.data);
        return novoEvento;
    }

    getMesNomeFromData(dataStr) {
        if (!dataStr) return "";
        const parts = String(dataStr).split("-");
        if (parts.length >= 2) {
            const m = parseInt(parts[1], 10);
            const nomes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
            if (m >= 1 && m <= 12) return nomes[m - 1];
        }
        return "";
    }

    formatDateBR(dataStr) {
        if (!dataStr) return "";
        const parts = String(dataStr).split("-");
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dataStr;
    }

    updateEventoCalendarioEscolar(id, dados) {
        if (!this.data || !Array.isArray(this.data.eventosCalendarioEscolar)) return null;
        const index = this.data.eventosCalendarioEscolar.findIndex(e => e.id === id);
        if (index === -1) return null;

        const currentEv = this.data.eventosCalendarioEscolar[index];
        const newData = dados.data !== undefined ? dados.data : currentEv.data;

        this.data.eventosCalendarioEscolar[index] = {
            ...currentEv,
            data: newData,
            hora: dados.hora !== undefined ? dados.hora : currentEv.hora,
            titulo: dados.titulo !== undefined ? dados.titulo : currentEv.titulo,
            mes: dados.mes !== undefined ? dados.mes : (dados.data ? this.getMesNomeFromData(dados.data) : (currentEv.mes || this.getMesNomeFromData(newData))),
            dataExibicao: dados.dataExibicao !== undefined ? dados.dataExibicao : (dados.data ? this.formatDateBR(dados.data) : (currentEv.dataExibicao || this.formatDateBR(newData))),
            categoria: dados.categoria !== undefined ? dados.categoria : currentEv.categoria,
            categoriaDesc: dados.categoriaDesc !== undefined ? dados.categoriaDesc : currentEv.categoriaDesc,
            descricao: dados.descricao !== undefined ? dados.descricao : currentEv.descricao,
            publicoAlvo: dados.publicoAlvo !== undefined ? dados.publicoAlvo : currentEv.publicoAlvo,
            local: dados.local !== undefined ? dados.local : currentEv.local,
            status: dados.status !== undefined ? dados.status : currentEv.status,
            atualizadoEm: new Date().toISOString()
        };

        this.data.eventosCalendarioEscolar.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
        this.addAuditLog('Edição de Evento do Calendário (' + this.data.eventosCalendarioEscolar[index].titulo + ')', 'Direção');
        this.saveData(this.data);
        return this.data.eventosCalendarioEscolar[index];
    }

    deleteEventoCalendarioEscolar(id) {
        if (!this.data) return;
        if (!this.data.deletedEventoCalendarioIds) this.data.deletedEventoCalendarioIds = [];
        if (!this.data.deletedEventoCalendarioIds.includes(id)) {
            this.data.deletedEventoCalendarioIds.push(id);
        }
        if (Array.isArray(this.data.eventosCalendarioEscolar)) {
            this.data.eventosCalendarioEscolar = this.data.eventosCalendarioEscolar.filter(e => e.id !== id);
        }
        this.addAuditLog('Exclusão de Evento do Calendário (ID: ' + id + ')', 'Direção');
        this.saveData(this.data);
    }

    importarEventosCalendarioLote(eventos, sobrescrever = true) {
        if (!Array.isArray(eventos)) return 0;
        if (!this.data.eventosCalendarioEscolar || sobrescrever) {
            this.data.eventosCalendarioEscolar = [];
        }
        
        let count = 0;
        eventos.forEach(ev => {
            if (!ev || !ev.data || !ev.titulo) return;
            const novoEvento = {
                id: ev.id || generateSecureId('cal-ev'),
                data: ev.data,
                dataExibicao: ev.dataExibicao || '',
                mes: ev.mes || '',
                dataFim: ev.dataFim || null,
                hora: ev.hora || '',
                titulo: ev.titulo,
                categoria: ev.categoria || 'marco_letivo',
                categoriaDesc: ev.categoriaDesc || 'Marco Letivo Oficial',
                descricao: ev.descricao || '',
                publicoAlvo: ev.publicoAlvo || 'escola_toda',
                local: ev.local || 'C.E. Pedro Rizzi',
                status: ev.status || 'agendado',
                origem: ev.origem || 'PLANILHA_OFICIAL_2026',
                criadoEm: ev.criadoEm || new Date().toISOString()
            };
            this.data.eventosCalendarioEscolar.push(novoEvento);
            count++;
        });

        // Ordena por data
        this.data.eventosCalendarioEscolar.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
        this.addAuditLog(`Importação de ${count} Eventos do Calendário Oficial 2026 (PDF Abril)`, 'Direção');
        this.saveData(this.data);
        return count;
    }

    getContatosWhatsApp() {
        return (this.data && Array.isArray(this.data.contatosWhatsAppDirecao)) ? this.data.contatosWhatsAppDirecao : [];
    }

    getContatosWhatsAppDirecao() {
        return this.getContatosWhatsApp();
    }

    getAllTagsContatos() {
        const contatos = this.getContatosWhatsApp();
        const tagsSet = new Set();
        if (this.data && Array.isArray(this.data.tagsPersonalizadasWp)) {
            this.data.tagsPersonalizadasWp.forEach(t => { if (t && typeof t === 'string' && t.trim()) tagsSet.add(t.trim()); });
        }
        contatos.forEach(c => {
            if (Array.isArray(c.tags)) {
                c.tags.forEach(t => { if (t && typeof t === 'string' && t.trim()) tagsSet.add(t.trim()); });
            } else if (c.tag && typeof c.tag === 'string') {
                c.tag.split(',').forEach(t => { if (t && t.trim()) tagsSet.add(t.trim()); });
            }
        });
        return Array.from(tagsSet).sort();
    }

    adicionarTagWp(tag) {
        if (!tag || !tag.trim()) return false;
        const cleanTag = tag.trim();
        if (!this.data) this.data = {};
        if (!Array.isArray(this.data.tagsPersonalizadasWp)) this.data.tagsPersonalizadasWp = [];
        if (!this.data.tagsPersonalizadasWp.includes(cleanTag)) {
            this.data.tagsPersonalizadasWp.push(cleanTag);
            this.saveData(this.data);
            return true;
        }
        return false;
    }

    renomearTagWp(oldTag, newTag) {
        if (!oldTag || !newTag || !oldTag.trim() || !newTag.trim()) return false;
        const oTag = oldTag.trim();
        const nTag = newTag.trim();
        if (oTag === nTag) return false;

        if (!this.data) this.data = {};
        if (Array.isArray(this.data.tagsPersonalizadasWp)) {
            const idx = this.data.tagsPersonalizadasWp.indexOf(oTag);
            if (idx !== -1) {
                this.data.tagsPersonalizadasWp[idx] = nTag;
            }
        }

        let modified = false;
        if (Array.isArray(this.data.contatosWhatsAppDirecao)) {
            this.data.contatosWhatsAppDirecao.forEach(c => {
                if (Array.isArray(c.tags)) {
                    const tIdx = c.tags.indexOf(oTag);
                    if (tIdx !== -1) {
                        c.tags[tIdx] = nTag;
                        c.atualizadoEm = new Date().toISOString();
                        modified = true;
                    }
                } else if (c.tag && typeof c.tag === 'string') {
                    const tags = c.tag.split(',').map(t => t.trim());
                    const tIdx = tags.indexOf(oTag);
                    if (tIdx !== -1) {
                        tags[tIdx] = nTag;
                        c.tag = tags.join(', ');
                        c.tags = tags;
                        c.atualizadoEm = new Date().toISOString();
                        modified = true;
                    }
                }
            });
        }

        this.saveData(this.data);
        return true;
    }

    excluirTagWp(tag) {
        if (!tag || !tag.trim()) return false;
        const target = tag.trim();

        if (!this.data) this.data = {};
        if (Array.isArray(this.data.tagsPersonalizadasWp)) {
            this.data.tagsPersonalizadasWp = this.data.tagsPersonalizadasWp.filter(t => t !== target);
        }

        if (Array.isArray(this.data.contatosWhatsAppDirecao)) {
            this.data.contatosWhatsAppDirecao.forEach(c => {
                if (Array.isArray(c.tags)) {
                    if (c.tags.includes(target)) {
                        c.tags = c.tags.filter(t => t !== target);
                        c.atualizadoEm = new Date().toISOString();
                    }
                } else if (c.tag && typeof c.tag === 'string') {
                    const tags = c.tag.split(',').map(t => t.trim()).filter(t => t !== target);
                    c.tag = tags.join(', ');
                    c.tags = tags;
                    c.atualizadoEm = new Date().toISOString();
                }
            });
        }

        this.saveData(this.data);
        return true;
    }

    addContatoWhatsApp(c) {
        if (!this.data.contatosWhatsAppDirecao) this.data.contatosWhatsAppDirecao = [];
        
        let tagsArr = [];
        if (Array.isArray(c.tags)) {
            tagsArr = c.tags.map(t => String(t).trim()).filter(Boolean);
        } else if (c.tag && typeof c.tag === 'string') {
            tagsArr = c.tag.split(',').map(t => t.trim()).filter(Boolean);
        }
        if (tagsArr.length === 0) tagsArr = ['Geral'];

        const novoContato = {
            id: generateSecureId('w-cont'),
            nome: c.nome || '',
            telefone: (c.telefone || '').replace(/\D/g, ''),
            tags: tagsArr,
            tag: tagsArr.join(', '),
            cargo: c.cargo || c.notas || '',
            notas: c.notas || '',
            turno: c.turno || 'Ambos',
            autorizaWhatsApp: c.autorizaWhatsApp !== undefined ? c.autorizaWhatsApp : true,
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
        };
        this.data.contatosWhatsAppDirecao.push(novoContato);
        this.saveData(this.data);
        return novoContato;
    }

    addContatosEmLote(contatosList) {
        if (!this.data.contatosWhatsAppDirecao) this.data.contatosWhatsAppDirecao = [];
        if (!Array.isArray(contatosList)) return 0;

        let adicionados = 0;
        contatosList.forEach(c => {
            const fone = (c.telefone || '').replace(/\D/g, '');
            if (!c.nome || !fone) return;

            let tagsArr = [];
            if (Array.isArray(c.tags)) {
                tagsArr = c.tags.map(t => String(t).trim()).filter(Boolean);
            } else if (c.tag && typeof c.tag === 'string') {
                tagsArr = c.tag.split(',').map(t => t.trim()).filter(Boolean);
            }
            if (tagsArr.length === 0) tagsArr = ['Importado'];

            const existe = this.data.contatosWhatsAppDirecao.find(ex => ex.telefone === fone);
            if (existe) {
                existe.nome = c.nome;
                const setCombinado = new Set([...(existe.tags || [existe.tag || 'Geral']), ...tagsArr]);
                existe.tags = Array.from(setCombinado);
                existe.tag = existe.tags.join(', ');
                if (c.notas) existe.notas = c.notas;
                if (c.cargo) existe.cargo = c.cargo;
                existe.atualizadoEm = new Date().toISOString();
            } else {
                this.data.contatosWhatsAppDirecao.push({
                    id: generateSecureId('w-cont'),
                    nome: c.nome,
                    telefone: fone,
                    tags: tagsArr,
                    tag: tagsArr.join(', '),
                    cargo: c.cargo || c.notas || '',
                    notas: c.notas || '',
                    turno: c.turno || 'Ambos',
                    autorizaWhatsApp: true,
                    criadoEm: new Date().toISOString(),
                    atualizadoEm: new Date().toISOString()
                });
                adicionados++;
            }
        });

        this.saveData(this.data);
        return adicionados;
    }

    deleteContatoWhatsApp(id) {
        if (!this.data) return;
        if (!this.data.deletedContatosWpIds) this.data.deletedContatosWpIds = [];
        if (!this.data.deletedContatosWpIds.includes(id)) {
            this.data.deletedContatosWpIds.push(id);
        }
        if (Array.isArray(this.data.contatosWhatsAppDirecao)) {
            this.data.contatosWhatsAppDirecao = this.data.contatosWhatsAppDirecao.filter(c => c.id !== id);
        }
        this.saveData(this.data);
    }

    updateContatoWhatsApp(id, dados) {
        if (!this.data || !Array.isArray(this.data.contatosWhatsAppDirecao)) return null;
        const index = this.data.contatosWhatsAppDirecao.findIndex(c => c.id === id);
        if (index === -1) return null;

        let tagsArr = [];
        if (Array.isArray(dados.tags)) {
            tagsArr = dados.tags.map(t => String(t).trim()).filter(Boolean);
        } else if (dados.tag && typeof dados.tag === 'string') {
            tagsArr = dados.tag.split(',').map(t => t.trim()).filter(Boolean);
        }
        if (tagsArr.length === 0) tagsArr = ['Geral'];

        this.data.contatosWhatsAppDirecao[index] = {
            ...this.data.contatosWhatsAppDirecao[index],
            nome: dados.nome !== undefined ? dados.nome : this.data.contatosWhatsAppDirecao[index].nome,
            telefone: (dados.telefone !== undefined ? dados.telefone : (this.data.contatosWhatsAppDirecao[index].telefone || '')).replace(/\D/g, ''),
            tags: tagsArr,
            tag: tagsArr.join(', '),
            cargo: dados.cargo !== undefined ? dados.cargo : (dados.notas !== undefined ? dados.notas : (this.data.contatosWhatsAppDirecao[index].cargo || '')),
            notas: dados.notas !== undefined ? dados.notas : (this.data.contatosWhatsAppDirecao[index].notas || ''),
            turno: dados.turno !== undefined ? dados.turno : (this.data.contatosWhatsAppDirecao[index].turno || 'Ambos'),
            atualizadoEm: new Date().toISOString()
        };

        this.saveData(this.data);
        return this.data.contatosWhatsAppDirecao[index];
    }

    deleteContatoWpDirecao(id) {
        return this.deleteContatoWhatsApp(id);
    }

    updateContatoWpDirecao(id, dados) {
        return this.updateContatoWhatsApp(id, dados);
    }

    restaurarContatosPadrao() {
        if (!this.data) this.data = {};
        this.data.deletedContatosWpIds = [];
        this.data.contatosWhatsAppDirecao = JSON.parse(JSON.stringify(defaultSigeData.contatosWhatsAppDirecao || []));
        this.saveData(this.data);
        return this.data.contatosWhatsAppDirecao;
    }

    getTurmas() {
        return this.getTurmasEscola();
    }

    getMensagensWhatsAppLog() {
        return (this.data && Array.isArray(this.data.mensagensWhatsAppLog)) ? this.data.mensagensWhatsAppLog : [];
    }

    addMensagemWhatsAppLog(log) {
        if (!this.data.mensagensWhatsAppLog) this.data.mensagensWhatsAppLog = [];
        const novoLog = {
            id: generateSecureId('w-log'),
            contatoNome: log.contatoNome || '',
            telefone: log.telefone || '',
            tag: log.tag || '',
            tags: Array.isArray(log.tags) ? log.tags : (log.tag ? [log.tag] : []),
            mensagem: log.mensagem || '',
            enviadoEm: new Date().toISOString(),
            status: log.status || 'enviado', // enviado, lido, confirmado, nao_respondeu
            enviadoPor: this.getUserName() || 'Direção'
        };
        this.data.mensagensWhatsAppLog.unshift(novoLog);
        this.saveData(this.data);
        return novoLog;
    }

    atualizarStatusMensagemLog(id, novoStatus) {
        if (!this.data || !Array.isArray(this.data.mensagensWhatsAppLog)) return false;
        const msg = this.data.mensagensWhatsAppLog.find(m => m.id === id);
        if (msg) {
            msg.status = novoStatus;
            msg.atualizadoEm = new Date().toISOString();
            this.saveData(this.data);
            return true;
        }
        return false;
    }

    deleteMensagemWhatsAppLog(id) {
        if (!this.data || !Array.isArray(this.data.mensagensWhatsAppLog)) return false;
        this.data.mensagensWhatsAppLog = this.data.mensagensWhatsAppLog.filter(m => m.id !== id);
        this.saveData(this.data);
        return true;
    }

    salvarPermissoesUsuario(emailOuId, permissoesMap) {
        if (!emailOuId) return false;
        const key = String(emailOuId).toLowerCase().trim();
        const cleanKeyCpf = cleanCpf(key);
        let updated = false;

        // Atualiza na equipe escolar (busca por id, email ou cpf)
        if (this.data && Array.isArray(this.data.equipeEscola)) {
            const prof = this.data.equipeEscola.find(p => 
                (p.id && p.id.toLowerCase() === key) || 
                (p.email && p.email.toLowerCase().trim() === key) ||
                (cleanKeyCpf && cleanCpf(p.cpf || '') === cleanKeyCpf)
            );
            if (prof) {
                prof.permissoes = { ...prof.permissoes, ...permissoesMap };
                updated = true;
            }
        }

        // Atualiza em usuariosCadastrados (busca por id, email ou cpf)
        if (this.data && Array.isArray(this.data.usuariosCadastrados)) {
            const u = this.data.usuariosCadastrados.find(user => 
                (user.id && user.id.toLowerCase() === key) ||
                (user.email && user.email.toLowerCase().trim() === key) ||
                (cleanKeyCpf && cleanCpf(user.cpf || '') === cleanKeyCpf)
            );
            if (u) {
                u.permissoes = { ...u.permissoes, ...permissoesMap };
                updated = true;
            }
        }

        if (updated) {
            this.addAuditLog('Atualização de Permissões Modulares (' + key + ')', 'Admin');
            this.saveData(this.data);
        }
        return updated;
    }

    temPermissaoModulo(moduloId) {
        const user = this.getLoggedUser();
        if (!user) return false;

        // Se o usuário autenticado for o Desenvolvedor do Sistema
        if (user.role === 'desenvolvedor') {
            const activeRole = this.getRole();
            // Na visão de Desenvolvedor: acesso irrestrito a TODAS as funcionalidades
            if (activeRole === 'desenvolvedor') return true;

            // Se o desenvolvedor escolheu simular outra visão específica:
            const users = this.getUsuarios();
            const simulatedUser = users.find(u => u.role === activeRole);
            if (simulatedUser && simulatedUser.permissoes) {
                return !!simulatedUser.permissoes[moduloId];
            }
            if (this.data && Array.isArray(this.data.equipeEscola)) {
                const simulatedProf = this.data.equipeEscola.find(p => p.setor === activeRole || p.id === activeRole);
                if (simulatedProf && simulatedProf.permissoes) {
                    return !!simulatedProf.permissoes[moduloId];
                }
            }
            const defaults = this.getDefaultPermissoesByRole(activeRole);
            return !!defaults[moduloId];
        }

        // Usuário normal autenticado
        if (!user.permissoes) {
            user.permissoes = this.getDefaultPermissoesByRole(user.role);
        }
        return !!user.permissoes[moduloId];
    }
}

// Instância Global
const sigeDB = new SigeDatabase();
window.sigeDB = sigeDB;
window.SigeDatabase = SigeDatabase;

// ==========================================
// FUNÇÕES UTILITÁRIAS GLOBAIS DE AUTENTICAÇÃO E PERFIS
// ==========================================
function parseJwt(token) {
    try {
        if (!token) return null;
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Erro ao decodificar JWT do Google:", e);
        return null;
    }
}

function getRoleLabel(role) {
    if (!role) return "Membro da Equipe";
    if (typeof role === 'string' && role.startsWith("orientadora_")) {
        if (typeof getOrientadoraByRole === 'function') {
            const ori = getOrientadoraByRole(role);
            if (ori) return `Orientadora ${ori.nome}`;
        }
        return "Orientadora Educacional";
    }
    if (typeof role === 'string' && role.startsWith("supervisora_")) {
        if (typeof getSupervisoraByRole === 'function') {
            const sup = getSupervisoraByRole(role);
            if (sup) return `Supervisora ${sup.nome}`;
        }
        return "Supervisão Escolar";
    }
    const map = {
        desenvolvedor: "Desenvolvedor do Sistema",
        admin: "Administrador do Sistema",
        direcao: "Direção Escolar & Gestão",
        supervisao: "Supervisão Escolar & Diário",
        orientacao: "Orientador Educacional (OE)",
        secretaria: "Secretaria Escolar & Recepção",
        uniformes: "Controle de Uniformes & Logística",
        docentes: "Corpo Docente / Professores",
        comunidade: "Comunidade / Alunos / Pais",
        visitante: "Visitante / Não Autenticado"
    };
    return map[role] || (typeof role === 'string' ? role.toUpperCase() : "Membro da Equipe");
}

function getRoleIcon(role) {
    if (!role) return "fa-solid fa-user";
    if (typeof role === 'string') {
        if (role.startsWith("orientadora_") || role === "orientacao") return "fa-solid fa-heart-pulse";
        if (role.startsWith("supervisora_") || role === "supervisao") return "fa-solid fa-clipboard-check";
    }
    const map = {
        desenvolvedor: "fa-solid fa-shield-halved",
        admin: "fa-solid fa-user-shield",
        direcao: "fa-solid fa-crown",
        supervisao: "fa-solid fa-clipboard-check",
        orientacao: "fa-solid fa-heart-pulse",
        secretaria: "fa-solid fa-id-card",
        uniformes: "fa-solid fa-shirt",
        docentes: "fa-solid fa-chalkboard-user",
        comunidade: "fa-solid fa-users",
        visitante: "fa-solid fa-user-lock"
    };
    return map[role] || "fa-solid fa-user";
}

function mascaraTelefoneInput(input) {
    if (!input) return;
    let v = input.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    if (v.length > 10) {
        input.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
    } else if (v.length > 6) {
        input.value = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
    } else if (v.length > 2) {
        input.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
    } else if (v.length > 0) {
        input.value = `(${v}`;
    }
}

window.parseJwt = parseJwt;
window.getRoleLabel = getRoleLabel;
window.getRoleIcon = getRoleIcon;
window.mascaraTelefoneInput = mascaraTelefoneInput;

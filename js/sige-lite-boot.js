/**
 * sige-lite-boot.js — Inicializador ultraleve para paginas mobile e portais externos (PAIE Professor / Familia)
 * Evita carregar o portal completo (sistema-gestao.html / gestao-data.js) em celulares.
 */
(function (window) {
    'use strict';

    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyCXLbIA46DkG2UQcANT_HuNnERN0pp3cgs",
        authDomain: "sas-cepr.firebaseapp.com",
        projectId: "sas-cepr",
        storageBucket: "sas-cepr.firebasestorage.app",
        messagingSenderId: "145326632209",
        appId: "1:145326632209:web:58d9e934e4a0bf26bcf0b0"
    };

    const TURMAS_CACHE_KEY = 'sige_lite_turmas_alunos_v1';
    const TURMAS_CACHE_TTL_MS = 30 * 60 * 1000;
    const SESSION_USER_KEY = 'sige_lite_session_user';
    let _liteAuthPromise = null;
    let _liteAuthDisabledAt = 0;

    function initFirebase(customConfig = null) {
        if (typeof window.firebase === 'undefined') {
            throw new Error('Firebase SDK nao carregado.');
        }
        const cfg = customConfig || FIREBASE_CONFIG;
        const app = window.firebase.apps && window.firebase.apps.length > 0
            ? window.firebase.app()
            : window.firebase.initializeApp(cfg);
        return { app, db: window.firebase.firestore() };
    }

    async function ensureFirebaseAuth(customConfig = null) {
        if (window.sigeDB && typeof window.sigeDB.ensureFirebaseAuth === 'function') {
            return window.sigeDB.ensureFirebaseAuth();
        }
        if (typeof window.firebase === 'undefined') {
            return { ok: false, reason: 'sdk_unavailable', user: null };
        }
        initFirebase(customConfig);
        if (typeof window.firebase.auth !== 'function') {
            return { ok: false, reason: 'auth_sdk_unavailable', user: null };
        }

        const auth = window.firebase.auth();
        if (auth.currentUser) {
            return { ok: true, user: auth.currentUser };
        }
        if (_liteAuthDisabledAt && (Date.now() - _liteAuthDisabledAt) < 30000) {
            return { ok: false, reason: 'provider_disabled', user: null };
        }
        if (_liteAuthPromise) {
            return _liteAuthPromise;
        }

        _liteAuthPromise = (async () => {
            try {
                const persistedUser = await new Promise((resolve) => {
                    let settled = false;
                    let unsub = null;
                    const timer = setTimeout(() => {
                        if (settled) return;
                        settled = true;
                        if (typeof unsub === 'function') {
                            try { unsub(); } catch (_) {}
                        }
                        resolve(auth.currentUser || null);
                    }, 2500);
                    try {
                        unsub = auth.onAuthStateChanged((user) => {
                            if (settled) return;
                            settled = true;
                            clearTimeout(timer);
                            if (typeof unsub === 'function') {
                                try { unsub(); } catch (_) {}
                            }
                            resolve(user || null);
                        }, () => {
                            if (settled) return;
                            settled = true;
                            clearTimeout(timer);
                            if (typeof unsub === 'function') {
                                try { unsub(); } catch (_) {}
                            }
                            resolve(null);
                        });
                    } catch (_) {
                        clearTimeout(timer);
                        resolve(auth.currentUser || null);
                    }
                });

                if (persistedUser) {
                    return { ok: true, user: persistedUser };
                }

                try {
                    const localPersistence = window.firebase.auth && window.firebase.auth.Auth && window.firebase.auth.Auth.Persistence && window.firebase.auth.Auth.Persistence.LOCAL;
                    if (localPersistence && typeof auth.setPersistence === 'function') {
                        await auth.setPersistence(localPersistence).catch(() => {});
                    }
                } catch (_) {}

                const cred = await Promise.race([
                    auth.signInAnonymously(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('auth_timeout')), 6000))
                ]);
                return cred && cred.user
                    ? { ok: true, user: cred.user }
                    : { ok: false, reason: 'empty_user', user: null };
            } catch (err) {
                const code = (err && err.code) ? String(err.code) : 'unknown';
                if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed') {
                    _liteAuthDisabledAt = Date.now();
                    console.warn('[SigeLiteBoot] Firebase Auth anonimo ainda nao habilitado no Console (sas-cepr).');
                    return { ok: false, reason: 'provider_disabled', code, user: null };
                }
                console.warn('[SigeLiteBoot] Aviso Firebase Auth silencioso:', (err && err.message) || err);
                return { ok: false, reason: 'auth_error', code, user: null };
            } finally {
                _liteAuthPromise = null;
            }
        })();

        return _liteAuthPromise;
    }

    function cleanCpf(cpf) {
        return cpf ? String(cpf).replace(/\D/g, '') : '';
    }

    function cleanDateDigits(val) {
        if (!val) return '';
        const s = String(val).trim();
        if (s.includes('/') || s.includes('-') || s.includes('.')) {
            const sep = s.includes('/') ? '/' : (s.includes('-') ? '-' : '.');
            const parts = s.split(sep).map(p => p.trim());
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    return `${parts[2].padStart(2, '0')}${parts[1].padStart(2, '0')}${parts[0]}`;
                }
                let y = parts[2];
                if (y.length === 2) y = (parseInt(y, 10) > 30 ? '19' : '20') + y;
                return `${parts[0].padStart(2, '0')}${parts[1].padStart(2, '0')}${y}`;
            }
        }
        return s.replace(/\D/g, '');
    }

    const SIGE_SALT = 'sige_cepr_salt_2026';

    async function sha256Hex(str) {
        if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
            const buf = new TextEncoder().encode(String(str));
            const digest = await crypto.subtle.digest('SHA-256', buf);
            return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        return null;
    }

    function hashSecretSync(secret, salt = SIGE_SALT) {
        if (!secret) return '';
        const str = salt + ':' + secret;
        let h1 = 0xdeadbeef, h2 = 0x41c64e6d;
        for (let i = 0; i < str.length; i++) {
            const ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return 'sha256_' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
    }

    async function hashSecret(secret, salt = SIGE_SALT) {
        if (!secret) return '';
        try {
            const hex = await sha256Hex(salt + ':' + secret);
            if (hex) return 'sha256_' + hex;
        } catch (_) {}
        return hashSecretSync(secret, salt);
    }

    function getSessionUser() {
        const keys = [SESSION_USER_KEY, 'sige_active_user', 'sige_logged_user'];
        for (const store of [typeof sessionStorage !== 'undefined' ? sessionStorage : null, typeof localStorage !== 'undefined' ? localStorage : null]) {
            if (!store) continue;
            for (const k of keys) {
                try {
                    const raw = store.getItem(k);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object') return parsed;
                    }
                } catch (_) {}
            }
        }
        return null;
    }

    async function loginWithCpfLite(cpf, senha) {
        const cpfClean = cleanCpf(cpf);
        if (!cpfClean || cpfClean.length !== 11) {
            return { ok: false, error: 'Informe um CPF valido com 11 digitos.' };
        }
        if (!senha || !String(senha).trim()) {
            return { ok: false, error: 'Informe a senha de acesso.' };
        }

        const { db } = initFirebase();
        await ensureFirebaseAuth();
        const authDoc = await db.collection('sige_pedro_rizzi').doc('mod_auth').get();
        const authData = authDoc.exists ? (authDoc.data() || {}) : {};
        const users = Array.isArray(authData.usuariosCadastrados) ? authData.usuariosCadastrados : [];

        const user = users.find(u => u && cleanCpf(u.cpf) === cpfClean);
        if (!user) {
            return { ok: false, error: 'Usuario nao encontrado na base escolar.' };
        }
        if (user.status && user.status !== 'aprovado') {
            return { ok: false, error: 'Cadastro aguardando aprovacao da gestao.' };
        }

        const rawPass = String(senha).trim();
        const datePass = cleanDateDigits(rawPass);
        const candidates = new Set([rawPass]);
        if (datePass) candidates.add(datePass);

        let authenticated = false;
        if (user.senhaHash && String(user.senhaHash).startsWith('sha256_')) {
            for (const cand of candidates) {
                const saltedAsync = await hashSecret(cand);
                const saltedSync = hashSecretSync(cand);
                if (saltedAsync === user.senhaHash || saltedSync === user.senhaHash) {
                    authenticated = true;
                    break;
                }
                const unsaltedHex = await sha256Hex(cand);
                if (unsaltedHex && ('sha256_' + unsaltedHex) === user.senhaHash) {
                    authenticated = true;
                    break;
                }
            }
        } else if (user.dataNascimento) {
            authenticated = datePass && datePass === cleanDateDigits(user.dataNascimento);
        }

        if (!authenticated) {
            return { ok: false, error: 'Senha incorreta.' };
        }

        const safeUser = {
            id: user.id || cpfClean,
            nome: user.nome || 'Docente',
            email: user.email || '',
            cpf: user.cpf || cpfClean,
            role: user.role || 'docentes',
            cargo: user.cargo || '',
            permissoes: user.permissoes || {}
        };
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(SESSION_USER_KEY, JSON.stringify(safeUser));
                localStorage.setItem('sige_logged_cpf', safeUser.cpf);
                if (safeUser.email) localStorage.setItem('sige_logged_email', safeUser.email);
            }
        } catch (_) {}
        return { ok: true, user: safeUser };
    }

    async function loadTurmasEAlunosLite(options = {}) {
        if (!options.forceRefresh && typeof localStorage !== 'undefined') {
            try {
                const raw = localStorage.getItem(TURMAS_CACHE_KEY);
                if (raw) {
                    const cached = JSON.parse(raw);
                    if (cached && cached.savedAt && (Date.now() - cached.savedAt) < TURMAS_CACHE_TTL_MS) {
                        return { turmas: cached.turmas || [], alunos: cached.alunos || [], fromCache: true };
                    }
                }
            } catch (_) {}
        }

        const { db } = initFirebase();
        await ensureFirebaseAuth();
        const equipeDoc = await db.collection('sige_pedro_rizzi').doc('mod_equipe').get();
        const eqData = equipeDoc.exists ? (equipeDoc.data() || {}) : {};
        const turmas = Array.isArray(eqData.turmasEscola) ? eqData.turmasEscola : [];
        const alunos = Array.isArray(eqData.alunosImportados) ? eqData.alunosImportados : [];

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(TURMAS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), turmas, alunos }));
            }
        } catch (_) {}
        return { turmas, alunos, fromCache: false };
    }

    async function loadPublicToken(tokenCollection, tokenId) {
        if (!tokenCollection || !tokenId) {
            return { ok: false, reason: 'invalid_params' };
        }
        const { db } = initFirebase();
        const snap = await db.collection(tokenCollection).doc(tokenId).get();
        if (!snap.exists) {
            return { ok: false, reason: 'not_found' };
        }
        const data = snap.data() || {};
        if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
            return { ok: false, reason: 'expired' };
        }
        return { ok: true, id: snap.id, data };
    }

    window.SigeLiteBoot = {
        FIREBASE_CONFIG,
        initFirebase,
        ensureFirebaseAuth,
        cleanCpf,
        sha256Hex,
        hashSecret,
        hashSecretSync,
        getSessionUser,
        loginWithCpfLite,
        loadTurmasEAlunosLite,
        loadPublicToken
    };
})(window);

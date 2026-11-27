/**
 * sige-collections.js — Camada escalavel "1 documento = 1 registro" para novos modulos (PAIE, etc.)
 * Suporta gravacao individual sem sobrescrita simultanea, consultas filtradas/paginadas,
 * reserva atomica por transacao e fila offline resiliente em IndexedDB.
 */
(function (window) {
    'use strict';

    const IDB_NAME = 'sige_offline_queue_v1';
    const IDB_STORE = 'pending_ops';
    let _memoryQueue = [];
    let _isFlushing = false;

    function getFirestore() {
        if (window.sigeDB && window.sigeDB.firestore) return window.sigeDB.firestore;
        if (typeof window.firebase !== 'undefined' && window.firebase.apps && window.firebase.apps.length > 0) {
            return window.firebase.firestore();
        }
        return null;
    }

    async function ensureAuth() {
        try {
            if (window.sigeDB && typeof window.sigeDB.ensureFirebaseAuth === 'function') {
                return await window.sigeDB.ensureFirebaseAuth();
            }
            if (window.SigeLiteBoot && typeof window.SigeLiteBoot.ensureFirebaseAuth === 'function') {
                return await window.SigeLiteBoot.ensureFirebaseAuth();
            }
        } catch (_) {}
        return { ok: false, user: null };
    }

    function makeId(prefix = 'rec') {
        if (typeof window.generateSecureId === 'function') return window.generateSecureId(prefix);
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function isTransientNetworkError(err) {
        if (!err) return false;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
        const code = String(err.code || '').toLowerCase();
        const msg = String(err.message || '').toLowerCase();
        return code === 'unavailable' || code === 'failed-precondition' || msg.includes('network') || msg.includes('offline');
    }

    function openQueueDB() {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                reject(new Error('IndexedDB unavailable'));
                return;
            }
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    db.createObjectStore(IDB_STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => resolve(e.target.result);
            req.onerror = (e) => reject(e.target.error || new Error('IDB open error'));
        });
    }

    const offlineQueue = {
        async enqueue(op) {
            const entry = {
                id: op.id || makeId('qop'),
                type: op.type,
                collectionName: op.collectionName,
                docId: op.docId,
                data: op.data,
                createdAt: op.createdAt || new Date().toISOString()
            };
            try {
                const db = await openQueueDB();
                await new Promise((resolve, reject) => {
                    const tx = db.transaction([IDB_STORE], 'readwrite');
                    tx.objectStore(IDB_STORE).put(entry);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = (e) => reject(e.target.error);
                });
            } catch (_) {
                const idx = _memoryQueue.findIndex(item => item.id === entry.id);
                if (idx >= 0) _memoryQueue[idx] = entry;
                else _memoryQueue.push(entry);
            }
            return entry;
        },

        async list() {
            try {
                const db = await openQueueDB();
                const items = await new Promise((resolve, reject) => {
                    const tx = db.transaction([IDB_STORE], 'readonly');
                    const req = tx.objectStore(IDB_STORE).getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = (e) => reject(e.target.error);
                });
                return items.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
            } catch (_) {
                return [..._memoryQueue].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
            }
        },

        async remove(id) {
            try {
                const db = await openQueueDB();
                await new Promise((resolve, reject) => {
                    const tx = db.transaction([IDB_STORE], 'readwrite');
                    tx.objectStore(IDB_STORE).delete(id);
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = (e) => reject(e.target.error);
                });
            } catch (_) {
                _memoryQueue = _memoryQueue.filter(item => item.id !== id);
            }
        },

        async pendingCount() {
            const items = await this.list();
            return items.length;
        },

        async flush() {
            if (_isFlushing) return { flushed: 0, remaining: await this.pendingCount() };
            const db = getFirestore();
            if (!db || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
                return { flushed: 0, remaining: await this.pendingCount() };
            }
            _isFlushing = true;
            let flushed = 0;
            try {
                await ensureAuth();
                const items = await this.list();
                for (const item of items) {
                    try {
                        const ref = db.collection(item.collectionName).doc(item.docId);
                        if (item.type === 'update') {
                            await ref.set(item.data, { merge: true });
                        } else {
                            await ref.set(item.data);
                        }
                        await this.remove(item.id);
                        flushed++;
                    } catch (err) {
                        if (isTransientNetworkError(err)) break;
                        console.warn('[SigeCollections] Falha ao reenviar operacao da fila:', err);
                        break;
                    }
                }
            } finally {
                _isFlushing = false;
            }
            return { flushed, remaining: await this.pendingCount() };
        }
    };

    function buildQuery(db, collectionName, options = {}) {
        let q = db.collection(collectionName);
        if (Array.isArray(options.where)) {
            options.where.forEach(clause => {
                if (Array.isArray(clause) && clause.length === 3) {
                    q = q.where(clause[0], clause[1], clause[2]);
                }
            });
        }
        if (Array.isArray(options.orderBy) && options.orderBy[0]) {
            q = q.orderBy(options.orderBy[0], options.orderBy[1] || 'asc');
        }
        if (options.startAfter) {
            q = q.startAfter(options.startAfter);
        }
        const limitVal = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 50;
        q = q.limit(limitVal);
        return q;
    }

    async function addRecord(collectionName, data, customId = null) {
        const nowIso = new Date().toISOString();
        const docId = customId || makeId('rec');
        const payload = { ...(data || {}), id: docId, criadoEm: data?.criadoEm || nowIso, atualizadoEm: nowIso };
        const db = getFirestore();

        if (!db || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
            await offlineQueue.enqueue({ type: 'add', collectionName, docId, data: payload });
            return { ok: true, queued: true, id: docId, data: payload };
        }

        try {
            await ensureAuth();
            await db.collection(collectionName).doc(docId).set(payload);
            return { ok: true, queued: false, id: docId, data: payload };
        } catch (err) {
            if (isTransientNetworkError(err)) {
                await offlineQueue.enqueue({ type: 'add', collectionName, docId, data: payload });
                return { ok: true, queued: true, id: docId, data: payload };
            }
            return { ok: false, error: err.message || String(err) };
        }
    }

    async function updateRecord(collectionName, docId, patch) {
        const nowIso = new Date().toISOString();
        const payload = { ...(patch || {}), atualizadoEm: nowIso };
        const db = getFirestore();

        if (!db || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
            await offlineQueue.enqueue({ type: 'update', collectionName, docId, data: payload });
            return { ok: true, queued: true, id: docId, data: payload };
        }

        try {
            await ensureAuth();
            await db.collection(collectionName).doc(docId).set(payload, { merge: true });
            return { ok: true, queued: false, id: docId, data: payload };
        } catch (err) {
            if (isTransientNetworkError(err)) {
                await offlineQueue.enqueue({ type: 'update', collectionName, docId, data: payload });
                return { ok: true, queued: true, id: docId, data: payload };
            }
            return { ok: false, error: err.message || String(err) };
        }
    }

    async function queryRecords(collectionName, options = {}) {
        const db = getFirestore();
        if (!db) return { items: [], lastDoc: null };
        await ensureAuth();
        const snap = await buildQuery(db, collectionName, options).get();
        const docs = snap.docs || [];
        return {
            items: docs.map(d => ({ id: d.id, ...(d.data() || {}) })),
            lastDoc: docs.length > 0 ? docs[docs.length - 1] : null
        };
    }

    function watchRecords(collectionName, options = {}, onUpdate, onError) {
        const db = getFirestore();
        if (!db) return function () {};
        const attach = () => buildQuery(db, collectionName, options).onSnapshot(
            (snap) => {
                const docs = snap.docs || [];
                const items = docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
                if (typeof onUpdate === 'function') onUpdate(items);
            },
            (err) => {
                if (typeof onError === 'function') onError(err);
            }
        );

        const hasAuthUser = typeof window.firebase !== 'undefined' && typeof window.firebase.auth === 'function' && !!window.firebase.auth().currentUser;
        const hasAuthHelper = (window.sigeDB && typeof window.sigeDB.ensureFirebaseAuth === 'function') ||
                              (window.SigeLiteBoot && typeof window.SigeLiteBoot.ensureFirebaseAuth === 'function');
        if (hasAuthUser || !hasAuthHelper) {
            return attach();
        }

        let cancelled = false;
        let innerUnsub = null;
        ensureAuth().then(() => {
            if (cancelled) return;
            innerUnsub = attach();
        }).catch(() => {
            if (!cancelled) innerUnsub = attach();
        });
        return function () {
            cancelled = true;
            if (typeof innerUnsub === 'function') innerUnsub();
        };
    }

    async function claimAtomicSlot(slotCollection, slotId, payload) {
        const db = getFirestore();
        if (!db) return { ok: false, reason: 'no_firestore' };
        await ensureAuth();
        const nowIso = new Date().toISOString();
        return db.runTransaction(async (tx) => {
            const ref = db.collection(slotCollection).doc(slotId);
            const snap = await tx.get(ref);
            const existing = snap.exists ? (snap.data() || {}) : null;
            if (snap.exists && existing && existing.status === 'reservado') {
                return { ok: false, reason: 'slot_taken' };
            }
            const record = { ...(payload || {}), id: slotId, status: 'reservado', reservadoEm: nowIso };
            tx.set(ref, record);
            return { ok: true, id: slotId, data: record };
        });
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('online', () => {
            offlineQueue.flush().catch(() => {});
        });
    }

    window.SigeCollections = {
        getFirestore,
        addRecord,
        updateRecord,
        queryRecords,
        watchRecords,
        claimAtomicSlot,
        offlineQueue
    };
})(window);

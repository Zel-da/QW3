/**
 * IndexedDB 기반 TBM draft 무거운 데이터(서명/사진/녹음/STT) 저장소.
 *
 * 왜 IndexedDB인가:
 *  - localStorage는 5~10MB 한도라 서명(PNG base64, 각 50~300KB)이 누적되면
 *    QuotaExceededError로 저장 자체가 실패함.
 *  - IndexedDB는 수십~수백 MB 한도라 서명/사진/녹음을 압축 없이 원본 보존.
 *  - 압축하지 않으므로 월별보고서/Excel/결재 화면 등 모든 다운스트림 화질 영향 없음.
 *
 * 가벼운 데이터(formState/remarks/absentUsers 등)는 기존 useAutoSave(localStorage)에
 * 그대로 두고, 무거운 데이터만 이 모듈로 분리합니다.
 */

const DB_NAME = 'tbm-drafts';
const STORE_NAME = 'heavy';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

export interface HeavyDraftPayload {
  signatures?: Record<string, string>; // base64 PNG
  remarksImages?: any[];               // 비고 첨부 이미지
  audioRecording?: any;                // 음성 녹음 메타/URL
  transcription?: string;              // STT 변환 텍스트
  savedAt?: string;                    // ISO timestamp
}

export async function saveHeavyDraft(key: string, value: HeavyDraftPayload): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ ...value, savedAt: new Date().toISOString() }, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadHeavyDraft(key: string): Promise<HeavyDraftPayload | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as HeavyDraftPayload) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteHeavyDraft(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (e) {
    // 삭제는 실패해도 무시 (다음 저장에서 덮어씌워짐)
    console.warn('deleteHeavyDraft failed (ignored):', e);
  }
}

/**
 * 오프라인 저장소 유틸리티 (IndexedDB)
 * - TBM 임시저장 데이터 관리
 * - 오프라인 동기화 지원
 */

const DB_NAME = 'safety-platform-offline';
const DB_VERSION = 1;

// 스토어 이름들
const STORES = {
  TBM_DRAFTS: 'tbm-drafts',
  SYNC_QUEUE: 'sync-queue',
  CACHED_DATA: 'cached-data',
} as const;

// TBM 임시저장 데이터 타입
export interface TbmDraft {
  key: string; // `${teamId}-${date}` 형식
  teamId: number;
  date: string;
  formState: Record<string, any>;
  signatures: Record<string, string>;
  absentUsers: Record<string, boolean>;
  remarks: string;
  remarksImages: string[];
  savedAt: Date;
  synced: boolean;
}

// 동기화 대기 항목 타입
export interface SyncQueueItem {
  id: string;
  type: 'TBM_CREATE' | 'TBM_UPDATE';
  data: any;
  createdAt: Date;
  retries: number;
}

let dbInstance: IDBDatabase | null = null;

/**
 * IndexedDB 초기화
 */
export function initOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('[OfflineDB] Database opened successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // TBM 임시저장 스토어
      if (!db.objectStoreNames.contains(STORES.TBM_DRAFTS)) {
        const tbmStore = db.createObjectStore(STORES.TBM_DRAFTS, { keyPath: 'key' });
        tbmStore.createIndex('teamId', 'teamId', { unique: false });
        tbmStore.createIndex('date', 'date', { unique: false });
        tbmStore.createIndex('synced', 'synced', { unique: false });
      }

      // 동기화 대기열 스토어
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 캐시 데이터 스토어 (팀 목록, 체크리스트 템플릿 등)
      if (!db.objectStoreNames.contains(STORES.CACHED_DATA)) {
        db.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
      }

      console.log('[OfflineDB] Database upgraded to version', DB_VERSION);
    };
  });
}

/**
 * DB 연결 확인 및 재시도
 */
async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) {
    return initOfflineDB();
  }
  return dbInstance;
}

// ==================== TBM 임시저장 함수들 ====================

/**
 * TBM 임시저장 저장
 */
export async function saveTbmDraft(
  teamId: number,
  date: string,
  data: Omit<TbmDraft, 'key' | 'teamId' | 'date' | 'savedAt' | 'synced'>
): Promise<void> {
  const db = await getDB();
  const key = `${teamId}-${date}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TBM_DRAFTS, 'readwrite');
    const store = transaction.objectStore(STORES.TBM_DRAFTS);

    const draft: TbmDraft = {
      key,
      teamId,
      date,
      ...data,
      savedAt: new Date(),
      synced: false,
    };

    const request = store.put(draft);

    request.onsuccess = () => {
      console.log('[OfflineDB] TBM draft saved:', key);
      resolve();
    };

    request.onerror = () => {
      console.error('[OfflineDB] Failed to save TBM draft:', request.error);
      reject(request.error);
    };
  });
}

/**
 * TBM 임시저장 조회
 */
export async function getTbmDraft(teamId: number, date: string): Promise<TbmDraft | null> {
  const db = await getDB();
  const key = `${teamId}-${date}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TBM_DRAFTS, 'readonly');
    const store = transaction.objectStore(STORES.TBM_DRAFTS);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      console.error('[OfflineDB] Failed to get TBM draft:', request.error);
      reject(request.error);
    };
  });
}

/**
 * TBM 임시저장 삭제
 */
export async function deleteTbmDraft(teamId: number, date: string): Promise<void> {
  const db = await getDB();
  const key = `${teamId}-${date}`;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TBM_DRAFTS, 'readwrite');
    const store = transaction.objectStore(STORES.TBM_DRAFTS);
    const request = store.delete(key);

    request.onsuccess = () => {
      console.log('[OfflineDB] TBM draft deleted:', key);
      resolve();
    };

    request.onerror = () => {
      console.error('[OfflineDB] Failed to delete TBM draft:', request.error);
      reject(request.error);
    };
  });
}

/**
 * 동기화되지 않은 모든 TBM 임시저장 조회
 */
export async function getUnsyncedTbmDrafts(): Promise<TbmDraft[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TBM_DRAFTS, 'readonly');
    const store = transaction.objectStore(STORES.TBM_DRAFTS);
    const index = store.index('synced');
    const request = index.getAll(false);

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      console.error('[OfflineDB] Failed to get unsynced drafts:', request.error);
      reject(request.error);
    };
  });
}

/**
 * TBM 임시저장 동기화 완료 표시
 */
export async function markTbmDraftSynced(teamId: number, date: string): Promise<void> {
  const draft = await getTbmDraft(teamId, date);
  if (draft) {
    draft.synced = true;
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TBM_DRAFTS, 'readwrite');
      const store = transaction.objectStore(STORES.TBM_DRAFTS);
      const request = store.put(draft);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// ==================== 동기화 대기열 함수들 ====================

/**
 * 동기화 대기열에 추가
 */
export async function addToSyncQueue(
  type: SyncQueueItem['type'],
  data: any
): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    const item: SyncQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      createdAt: new Date(),
      retries: 0,
    };

    const request = store.add(item);

    request.onsuccess = () => {
      console.log('[OfflineDB] Added to sync queue:', type);
      resolve();
    };

    request.onerror = () => {
      console.error('[OfflineDB] Failed to add to sync queue:', request.error);
      reject(request.error);
    };
  });
}

/**
 * 동기화 대기열 조회
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * 동기화 대기열에서 항목 제거
 */
export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ==================== 캐시 데이터 함수들 ====================

/**
 * 캐시 데이터 저장
 */
export async function setCachedData(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CACHED_DATA, 'readwrite');
    const store = transaction.objectStore(STORES.CACHED_DATA);

    const cacheItem = {
      key,
      data,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
      cachedAt: new Date(),
    };

    const request = store.put(cacheItem);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * 캐시 데이터 조회
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CACHED_DATA, 'readonly');
    const store = transaction.objectStore(STORES.CACHED_DATA);
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result;
      if (!result) {
        resolve(null);
        return;
      }

      // TTL 확인
      if (new Date(result.expiresAt) < new Date()) {
        // 만료된 데이터 삭제
        getCachedData(key).then(() => {
          resolve(null);
        });
        return;
      }

      resolve(result.data as T);
    };

    request.onerror = () => reject(request.error);
  });
}

// ==================== 동기화 유틸리티 ====================

/**
 * 오프라인 데이터 동기화 시도
 */
export async function syncPendingData(): Promise<{ success: number; failed: number }> {
  const results = { success: 0, failed: 0 };

  // 동기화되지 않은 TBM 임시저장 동기화
  const unsyncedDrafts = await getUnsyncedTbmDrafts();
  for (const draft of unsyncedDrafts) {
    try {
      // 실제 동기화 로직은 API 호출 필요
      // 현재는 동기화 완료로 표시만 함
      await markTbmDraftSynced(draft.teamId, draft.date);
      results.success++;
    } catch (error) {
      console.error('[OfflineDB] Sync failed for draft:', draft.key, error);
      results.failed++;
    }
  }

  // 동기화 대기열 처리
  const syncQueue = await getSyncQueue();
  for (const item of syncQueue) {
    try {
      // 실제 동기화 로직 (API 호출)
      // 성공 시 대기열에서 제거
      await removeFromSyncQueue(item.id);
      results.success++;
    } catch (error) {
      console.error('[OfflineDB] Sync queue item failed:', item.id, error);
      results.failed++;
    }
  }

  return results;
}

/**
 * 모든 오프라인 데이터 삭제
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB();

  const clearStore = (storeName: string) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  await Promise.all([
    clearStore(STORES.TBM_DRAFTS),
    clearStore(STORES.SYNC_QUEUE),
    clearStore(STORES.CACHED_DATA),
  ]);

  console.log('[OfflineDB] All offline data cleared');
}

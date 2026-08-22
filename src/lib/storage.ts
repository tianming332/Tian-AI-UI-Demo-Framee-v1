import type { Project } from '../types';

const DB_NAME = 'mockup-player';
const DB_VERSION = 1;
const META = 'meta';
const BLOBS = 'blobs';
const PROJECT_KEY = 'project';

export type Persisted = {
  project: Project;
  assets: Array<{ screenId: string; blob: Blob }>;
};

let cached: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (cached) return cached;
  cached = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB 不可用'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('打开本地存储失败'));
    request.onblocked = () => reject(new Error('本地存储被其他标签页占用'));
  });
  cached = cached.catch((error) => {
    cached = null;
    throw error;
  });
  return cached;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('写入本地存储失败'));
    tx.onabort = () => reject(tx.error ?? new Error('本地存储写入被中断'));
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('读取本地存储失败'));
  });
}

export async function savePersisted(project: Project, blobs: Map<string, Blob>): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([META, BLOBS], 'readwrite');
  tx.objectStore(META).put(project, PROJECT_KEY);
  const store = tx.objectStore(BLOBS);
  const existing = await request(store.getAllKeys());
  const keep = new Set(project.screens.map((s) => s.id));
  for (const key of existing) {
    if (!keep.has(String(key))) store.delete(key);
  }
  for (const screen of project.screens) {
    const blob = blobs.get(screen.id);
    if (blob) store.put(blob, screen.id);
  }
  await done(tx);
}

export async function loadPersisted(): Promise<Persisted | null> {
  const db = await openDb();
  const tx = db.transaction([META, BLOBS], 'readonly');
  const project = await request<Project | undefined>(tx.objectStore(META).get(PROJECT_KEY));
  if (!project || !project.screens?.length) return null;
  const store = tx.objectStore(BLOBS);
  const assets: Array<{ screenId: string; blob: Blob }> = [];
  for (const screen of project.screens) {
    const blob = await request<Blob | undefined>(store.get(screen.id));
    if (blob) assets.push({ screenId: screen.id, blob });
  }
  if (!assets.length) return null;
  return { project, assets };
}

export async function clearPersisted(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction([META, BLOBS], 'readwrite');
  tx.objectStore(META).clear();
  tx.objectStore(BLOBS).clear();
  await done(tx);
}

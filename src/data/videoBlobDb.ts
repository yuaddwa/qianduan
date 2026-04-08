const DB_NAME = 'donk666-video-blobs'
const STORE = 'blobs'
const DB_VER = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER)
    req.onerror = () => reject(req.error ?? new Error('idb open'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
  })
}

export async function putUserVideoBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb tx'))
    tx.objectStore(STORE).put(blob, id)
  })
}

export async function getUserVideoBlob(id: string): Promise<Blob | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    tx.onerror = () => reject(tx.error ?? new Error('idb read'))
    const r = tx.objectStore(STORE).get(id)
    r.onsuccess = () => resolve((r.result as Blob | undefined) ?? null)
  })
}

export async function deleteUserVideoBlob(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb del'))
    tx.objectStore(STORE).delete(id)
  })
}

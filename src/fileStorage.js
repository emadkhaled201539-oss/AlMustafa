import { openDB } from 'idb';

const DB_NAME = 'mustafa-vault';
const STORE_NAME = 'files';

async function getDatabase() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveFile(file, folder = null) {
  const db = await getDatabase();

  const record = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    folder,
    createdAt: new Date().toISOString(),
    data: file,
  };

  await db.put(STORE_NAME, record);
  return record;
}

export async function getFiles() {
  const db = await getDatabase();
  return db.getAll(STORE_NAME);
}

export async function deleteFile(id) {
  const db = await getDatabase();
  await db.delete(STORE_NAME, id);
}

export async function exportBackupFiles() {
  const files = await getFiles();
  const result = [];

  for (const file of files) {
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    }

    result.push({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.size,
      folder: file.folder,
      createdAt: file.createdAt,
      data: btoa(binary)
    });
  }

  return result;
}

export async function restoreBackupFiles(files) {
  if (!Array.isArray(files)) throw new Error("ملفات النسخة غير صالحة");

  const ids = new Set();
  const records = files.map(file => {
    if (!file || typeof file.id !== "string" || !file.id || typeof file.name !== "string" || typeof file.data !== "string" || ids.has(file.id)) {
      throw new Error("يوجد ملف غير صالح أو مكرر داخل النسخة");
    }
    ids.add(file.id);
    const binary = atob(file.data);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    const blob = new Blob([bytes], { type: file.type || "" });
    return {
      id: file.id,
      name: file.name,
      type: file.type || "",
      size: blob.size,
      folder: file.folder ?? null,
      createdAt: file.createdAt || new Date().toISOString(),
      data: blob
    };
  });

  const db = await getDatabase();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.clear();
  for (const record of records) await store.put(record);
  await tx.done;
}

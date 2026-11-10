export async function readCache(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('RpxTranslations');
    open.onerror = () => reject(new Error('Failed to open translation cache', { cause: open.error }));
    open.onsuccess = () => {
      const db = open.result;
      try {
        const store = db.transaction('translations').objectStore('translations');
        const read = store.getAll();
        read.onerror = () => { db.close(); reject(new Error('Failed to read translation cache', { cause: read.error })); };
        read.onsuccess = () => {
          const snapshot = { version: db.version, keyPath: store.keyPath, indexes: Array.from(store.indexNames), rows: read.result };
          db.close();
          resolve(snapshot);
        };
      } catch (error) {
        db.close();
        reject(new Error('Failed to read translation cache', { cause: error }));
      }
    };
  }));
}

export async function expireCachedTranslation(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('RpxTranslations');
    open.onerror = () => reject(new Error('Failed to open translation cache', { cause: open.error }));
    open.onsuccess = () => {
      const db = open.result;
      try {
        const transaction = db.transaction('translations', 'readwrite');
        const store = transaction.objectStore('translations');
        const read = store.getAll();
        read.onsuccess = () => {
          const row = read.result.find((item) => item.phrase === 'Hello world' && item.lang === 'cy');
          if (!row) { transaction.abort(); return; }
          row.validity = '2000-01-01T00:00:00.000Z';
          store.put(row);
        };
        transaction.oncomplete = () => { db.close(); resolve(undefined); };
        transaction.onabort = transaction.onerror = () => { db.close(); reject(new Error('Failed to expire translation cache row', { cause: transaction.error })); };
      } catch (error) {
        db.close();
        reject(new Error('Failed to expire translation cache row', { cause: error }));
      }
    };
  }));
}

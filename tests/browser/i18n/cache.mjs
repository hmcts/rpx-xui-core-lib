export async function cachedTranslations(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('RpxTranslations');
    request.onerror = () => reject(new Error(`Failed to open translation cache: ${request.error?.message ?? 'Unknown IndexedDB error'}`, { cause: request.error }));
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('translations')) {
        database.close();
        resolve([]);
        return;
      }
      const read = database.transaction('translations').objectStore('translations').getAll();
      read.onerror = () => { database.close(); reject(new Error(`Failed to read translation cache: ${read.error?.message ?? 'Unknown IndexedDB error'}`, { cause: read.error })); };
      read.onsuccess = () => { database.close(); resolve(read.result); };
    };
  }));
}

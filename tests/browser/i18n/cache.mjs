export async function cachedTranslations(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('RpxTranslations');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const read = database.transaction('translations').objectStore('translations').getAll();
      read.onerror = () => { database.close(); reject(read.error); };
      read.onsuccess = () => { database.close(); resolve(read.result); };
    };
  }));
}

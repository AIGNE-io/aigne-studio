import { joinURL } from 'ufo';

const VERSION = 1;
const CACHE_STORE = 'CACHE_STORE';
const DATABASE_NAME = joinURL(window.location.origin, 'indexedStorage');

const stores = [CACHE_STORE];

const db = new Promise<IDBDatabase>((resolve, reject) => {
  const request = (window.indexedDB || (window as any).mozIndexedDB || (window as any).webkitIndexedDB).open(
    DATABASE_NAME,
    VERSION
  );

  request.onsuccess = () => {
    resolve(request.result);
  };
  request.onerror = (e) => {
    reject(e);
  };
  request.onupgradeneeded = () => {
    const db = request.result;

    stores.forEach((store) => {
      if (!db.objectStoreNames.contains(store)) {
        db.createObjectStore(store);
      }
    });
  };

  request.onblocked = (e) => {
    reject(e);
  };
});

const indexedDBStorage = (name: string) => {
  const get = <T>(key: string) =>
    db.then(
      (database) =>
        new Promise<T>((resolve, reject) => {
          const transaction = database.transaction([name], 'readonly');
          transaction.onabort = (e) => {
            console.error('transaction aborted', e);
            throw new Error('transaction aborted');
          };
          const store = transaction.objectStore(name);
          const request = store.get(key);
          request.onsuccess = () => {
            resolve(request.result);
          };
          request.onerror = reject;
        })
    );

  const keys = () =>
    db.then(
      (database) =>
        new Promise((resolve, reject) => {
          const transaction = database.transaction([name], 'readonly');
          transaction.onabort = (e) => {
            console.error('transaction aborted', e);
            throw new Error('transaction aborted');
          };
          const store = transaction.objectStore(name);
          const request = store.getAllKeys();
          request.onsuccess = () => {
            resolve(request.result);
          };
          request.onerror = reject;
        })
    );

  const set = (key: string, value: any) =>
    db.then(
      (database) =>
        new Promise<void>((resolve, reject) => {
          const transaction = database.transaction([name], 'readwrite');
          transaction.onabort = (e) => {
            console.error('transaction aborted', e);
            throw new Error('transaction aborted');
          };
          const store = transaction.objectStore(name);
          const request = store.put(value, key);
          request.onsuccess = () => {
            resolve();
          };
          request.onerror = reject;
        })
    );

  const indexedDbDelete = (key: string) =>
    db.then(
      (database) =>
        new Promise((resolve, reject) => {
          const transaction = database.transaction([name], 'readwrite');
          transaction.onabort = (e) => {
            console.error('transaction aborted', e);
            throw new Error('transaction aborted');
          };
          const store = transaction.objectStore(name);
          const request = store.delete(key);
          request.onsuccess = resolve;
          request.onerror = reject;
        })
    );

  const purgeDatabase = () =>
    db.then(
      (database) =>
        new Promise((resolve, reject) => {
          const transaction = database.transaction([name], 'readwrite');
          transaction.onabort = (e) => {
            console.error('transaction aborted', e);
            throw new Error('transaction aborted');
          };
          const store = transaction.objectStore(name);
          const request = store.clear();
          request.onsuccess = resolve;
          request.onerror = reject;
        })
    );

  const deleteDatabase = () => {
    window.indexedDB.deleteDatabase(window.location.origin);
  };

  return {
    get,
    set,
    delete: indexedDbDelete,
    purgeDatabase,
    deleteDatabase,
    keys,
  };
};

const indexedStorage = indexedDBStorage(CACHE_STORE);

export default indexedStorage;

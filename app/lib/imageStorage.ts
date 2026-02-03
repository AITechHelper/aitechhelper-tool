// IndexedDB helper for storing generated images
// This allows us to store large base64 images without hitting localStorage limits

const DB_NAME = "ath_images_db";
const DB_VERSION = 1;
const STORE_NAME = "images";

interface StoredImage {
  id: string;
  imageBase64: string;
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveImage(id: string, imageBase64: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const imageData: StoredImage = {
      id,
      imageBase64,
      createdAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(imageData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save image to IndexedDB:", error);
    throw error;
  }
}

export async function getImage(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result as StoredImage | undefined;
        resolve(result?.imageBase64 || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get image from IndexedDB:", error);
    return null;
  }
}

export async function deleteImage(id: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to delete image from IndexedDB:", error);
  }
}

export async function getAllImageIds(): Promise<string[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get image IDs from IndexedDB:", error);
    return [];
  }
}

// Clean up old images that are no longer in the gallery
export async function cleanupOrphanedImages(galleryPostIds: string[]): Promise<void> {
  try {
    const storedIds = await getAllImageIds();
    const galleryIdSet = new Set(galleryPostIds);

    for (const storedId of storedIds) {
      if (!galleryIdSet.has(storedId)) {
        await deleteImage(storedId);
      }
    }
  } catch (error) {
    console.error("Failed to cleanup orphaned images:", error);
  }
}

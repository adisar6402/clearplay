import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'clearplay-db';
const DB_VERSION = 2;

export interface UserPreferences {
  autoSkipSponsor: boolean;
  autoSkipIntro: boolean;
  autoSkipOutro: boolean;
  focusMode: boolean;
  autoplay: boolean;
  theme: 'dark' | 'light';
  skipMode: 'auto' | 'ask';
}

export interface ClearPlayDB {
  history: {
    key: string;
    value: {
      url: string;
      videoId?: string;
      platform?: string;
      title: string;
      thumbnail?: string;
      duration?: number;
      position?: number;
      timestamp: number;
    };
  };
  watchLater: {
    key: string;
    value: {
      url: string;
      videoId?: string;
      platform?: string;
      title: string;
      thumbnail?: string;
      addedAt: number;
    };
  };
  continueWatching: {
    key: string;
    value: {
      url: string;
      videoId?: string;
      platform?: string;
      title: string;
      thumbnail?: string;
      position: number;
      duration: number;
      updatedAt: number;
    };
  };
  preferences: {
    key: string;
    value: UserPreferences[keyof UserPreferences] | UserPreferences;
  };
}

let dbPromise: Promise<IDBPDatabase<ClearPlayDB>>;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ClearPlayDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('history')) {
          db.createObjectStore('history', { keyPath: 'url' });
        }
        if (!db.objectStoreNames.contains('watchLater')) {
          db.createObjectStore('watchLater', { keyPath: 'url' });
        }
        if (!db.objectStoreNames.contains('continueWatching')) {
          db.createObjectStore('continueWatching', { keyPath: 'url' });
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences');
        }
      },
    });
  }
  return dbPromise;
};

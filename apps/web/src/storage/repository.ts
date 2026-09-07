import { getDB, type ClearPlayDB, type UserPreferences } from './db';

export const defaultPreferences: UserPreferences = {
  autoSkipSponsor: true,
  autoSkipIntro: true,
  autoSkipOutro: true,
  focusMode: false,
  autoplay: false,
  theme: 'dark',
  skipMode: 'auto'
};

export const historyRepository = {
  async add(entry: ClearPlayDB['history']['value']) {
    const db = await getDB();
    return db.put('history', entry);
  },
  async getAll() {
    const db = await getDB();
    return db.getAll('history');
  },
  async clear() {
    const db = await getDB();
    return db.clear('history');
  }
};

export const watchLaterRepository = {
  async add(entry: ClearPlayDB['watchLater']['value']) {
    const db = await getDB();
    return db.put('watchLater', entry);
  },
  async remove(url: string) {
    const db = await getDB();
    return db.delete('watchLater', url);
  },
  async getAll() {
    const db = await getDB();
    return db.getAll('watchLater');
  },
  async exists(url: string) {
    const db = await getDB();
    const entry = await db.get('watchLater', url);
    return !!entry;
  }
};

export const continueWatchingRepository = {
  async update(entry: ClearPlayDB['continueWatching']['value']) {
    const db = await getDB();
    return db.put('continueWatching', entry);
  },
  async get(url: string) {
    const db = await getDB();
    return db.get('continueWatching', url);
  },
  async remove(url: string) {
    const db = await getDB();
    return db.delete('continueWatching', url);
  },
  async getAll() {
    const db = await getDB();
    return db.getAll('continueWatching');
  }
};

export const preferencesRepository = {
  async set(key: string, value: unknown) {
    const db = await getDB();
    return db.put('preferences', value, key);
  },
  async get(key: string) {
    const db = await getDB();
    return db.get('preferences', key);
  },
  async getAll(): Promise<UserPreferences> {
    const db = await getDB();
    const values = await Promise.all(Object.keys(defaultPreferences).map(async (key) => [key, await db.get('preferences', key)] as const));
    return values.reduce((preferences, [key, value]) => {
      if (value !== undefined) preferences[key as keyof UserPreferences] = value as never;
      return preferences;
    }, { ...defaultPreferences });
  }
};

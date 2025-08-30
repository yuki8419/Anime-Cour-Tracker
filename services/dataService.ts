// データ管理サービス - 管理者が編集した情報を保存・取得
export interface SavedAnimeData {
  id: number;
  title: string;
  description: string;
  genres: string[];
  streamingServices: string[];
  isVisible: boolean;
  customImageUrl?: string;
  lastModified: number;
  isPublished: boolean; // 公開状態を管理
}

export interface AdminCacheData {
  timestamp: number;
  data: SavedAnimeData[];
  season: string;
}

const SAVED_DATA_KEY = 'admin_saved_anime_data';
const ADMIN_CACHE_KEY = 'admin_cache_data';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24時間

export const getSavedAnimeData = (): Record<number, SavedAnimeData> => {
  try {
    const saved = localStorage.getItem(SAVED_DATA_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Error reading saved anime data:', error);
    return {};
  }
};

export const saveAnimeData = (animeData: SavedAnimeData): void => {
  try {
    const allSavedData = getSavedAnimeData();
    allSavedData[animeData.id] = {
      ...animeData,
      lastModified: Date.now()
    };
    localStorage.setItem(SAVED_DATA_KEY, JSON.stringify(allSavedData));
  } catch (error) {
    console.error('Error saving anime data:', error);
    throw new Error('データの保存に失敗しました');
  }
};

export const publishAnimeData = (animeId: number): void => {
  try {
    const allSavedData = getSavedAnimeData();
    if (allSavedData[animeId]) {
      allSavedData[animeId].isPublished = true;
      allSavedData[animeId].lastModified = Date.now();
      localStorage.setItem(SAVED_DATA_KEY, JSON.stringify(allSavedData));
    }
  } catch (error) {
    console.error('Error publishing anime data:', error);
    throw new Error('公開に失敗しました');
  }
};

export const unpublishAnimeData = (animeId: number): void => {
  try {
    const allSavedData = getSavedAnimeData();
    if (allSavedData[animeId]) {
      allSavedData[animeId].isPublished = false;
      allSavedData[animeId].lastModified = Date.now();
      localStorage.setItem(SAVED_DATA_KEY, JSON.stringify(allSavedData));
    }
  } catch (error) {
    console.error('Error unpublishing anime data:', error);
    throw new Error('非公開に失敗しました');
  }
};

export const deleteAnimeData = (animeId: number): void => {
  try {
    const allSavedData = getSavedAnimeData();
    delete allSavedData[animeId];
    localStorage.setItem(SAVED_DATA_KEY, JSON.stringify(allSavedData));
  } catch (error) {
    console.error('Error deleting anime data:', error);
    throw new Error('データの削除に失敗しました');
  }
};

// 管理者用キャッシュ管理
export const getAdminCacheData = (season: string): AdminCacheData | null => {
  try {
    const cached = localStorage.getItem(`${ADMIN_CACHE_KEY}_${season}`);
    if (cached) {
      const data = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_DURATION_MS) {
        return data;
      } else {
        localStorage.removeItem(`${ADMIN_CACHE_KEY}_${season}`);
      }
    }
  } catch (error) {
    console.error('Error reading admin cache:', error);
  }
  return null;
};

export const setAdminCacheData = (season: string, data: SavedAnimeData[]): void => {
  try {
    const cacheData: AdminCacheData = {
      timestamp: Date.now(),
      data,
      season
    };
    localStorage.setItem(`${ADMIN_CACHE_KEY}_${season}`, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error setting admin cache:', error);
  }
};

export const clearAdminCache = (season?: string): void => {
  try {
    if (season) {
      localStorage.removeItem(`${ADMIN_CACHE_KEY}_${season}`);
    } else {
      // 全てのキャッシュをクリア
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(ADMIN_CACHE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error('Error clearing admin cache:', error);
  }
};
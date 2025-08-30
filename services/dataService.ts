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
}

const SAVED_DATA_KEY = 'admin_saved_anime_data';

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
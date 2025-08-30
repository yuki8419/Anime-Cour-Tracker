import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Anime } from '../../types';
import { getAllAnimeForAdmin } from '../../services/animeService';
import { getSavedAnimeData, deleteAnimeData } from '../../services/dataService';
import { CURRENT_YEAR } from '../../constants';
import AnimeCard from '../../components/AnimeCard';
import AnimeEditModal from '../../components/AnimeEditModal';
import LoadingSpinner from '../../components/LoadingSpinner';

const seasonNames: { [key: string]: string } = {
  winter: '冬',
  spring: '春',
  summer: '夏',
  autumn: '秋',
};

const getCurrentSeason = (): string => {
  const month = new Date().getMonth();
  if (month < 3) return 'winter';
  if (month < 6) return 'spring';
  if (month < 9) return 'summer';
  return 'autumn';
};

const AdminDashboard: React.FC = () => {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [selectedSeason, setSelectedSeason] = useState<string>(getCurrentSeason());
  const [editingAnime, setEditingAnime] = useState<Anime | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const fetchAnimeForAdmin = useCallback(async () => {
    setIsLoading(true);
    try {
      const seasonIdentifier = `${selectedYear}-${selectedSeason}`;
      const data = await getAllAnimeForAdmin(seasonIdentifier);
      setAnimeList(data);
    } catch (error) {
      console.error("Failed to fetch anime for admin:", error);
      setAnimeList([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedSeason]);
  
  useEffect(() => {
    fetchAnimeForAdmin();
  }, [fetchAnimeForAdmin]);

  const handleForceRefresh = useCallback(() => {
    const seasonIdentifier = `${selectedYear}-${selectedSeason}`;
    const cacheKey = `anime_data_${seasonIdentifier}`;
    localStorage.removeItem(cacheKey);
    fetchAnimeForAdmin();
  }, [selectedYear, selectedSeason, fetchAnimeForAdmin]);

  const handleEditSave = () => {
    fetchAnimeForAdmin(); // データを再取得して表示を更新
  };

  const handleDelete = (animeId: number) => {
    if (confirm('このアニメの管理者設定を削除しますか？')) {
      try {
        deleteAnimeData(animeId);
        fetchAnimeForAdmin();
      } catch (error) {
        alert('削除に失敗しました');
      }
    }
  };

  const savedData = getSavedAnimeData();
  const visibleAnime = animeList.filter(anime => savedData[anime.id]?.isVisible !== false);
  const hiddenAnime = animeList.filter(anime => savedData[anime.id]?.isVisible === false);

  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text-primary">管理ダッシュボード</h1>
      
      <div className="bg-surface border border-gray-200 p-4 rounded-lg shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-text-primary focus:ring-primary focus:border-primary"
            >
                {years.map(year => <option key={year} value={year}>{year}年</option>)}
            </select>
            <select
                value={selectedSeason}
                onChange={e => setSelectedSeason(e.target.value)}
                className="bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-text-primary capitalize focus:ring-primary focus:border-primary"
            >
                {seasons.map(season => <option key={season} value={season}>{seasonNames[season]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
              className="bg-gray-100 hover:bg-gray-200 text-text-secondary font-medium px-3 py-2 rounded-md transition-colors duration-200"
            >
              {viewMode === 'grid' ? 'テーブル表示' : 'グリッド表示'}
            </button>
            <button
                onClick={handleForceRefresh}
                className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md transition-colors duration-200 flex items-center gap-1.5"
                title="このシーズンのキャッシュを削除して、全ての情報を再取得します"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>データ再取得</span>
            </button>
          </div>
        </div>
        
        <div className="text-sm text-text-secondary">
          表示中: {visibleAnime.length}件 | 非表示: {hiddenAnime.length}件 | 合計: {animeList.length}件
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {/* 表示中のアニメ */}
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-4">表示中のアニメ ({visibleAnime.length}件)</h2>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {visibleAnime.map(anime => (
                  <div key={anime.id} className="relative group">
                    <AnimeCard anime={anime} />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                      <button
                        onClick={() => setEditingAnime(anime)}
                        className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-full shadow-lg transition-colors"
                        title="編集"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">タイトル</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">ジャンル</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">配信サービス</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">操作</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visibleAnime.map(anime => (
                      <tr key={anime.id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <img className="h-12 w-8 object-cover rounded mr-3" src={anime.imageUrl} alt={anime.title} />
                            <div className="text-sm font-medium text-text-primary">{anime.title}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-secondary">{anime.genres.join(', ') || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-text-secondary">{anime.streamingServices.join(', ') || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm font-medium space-x-2">
                          <button
                            onClick={() => setEditingAnime(anime)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            編集
                          </button>
                          <Link to={`/anime/${anime.id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">プレビュー</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 非表示のアニメ */}
          {hiddenAnime.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-4">非表示のアニメ ({hiddenAnime.length}件)</h2>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {hiddenAnime.map(anime => (
                    <div key={anime.id} className="relative group opacity-60">
                      <AnimeCard anime={anime} />
                      <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingAnime(anime)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(anime.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">非表示</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto opacity-60">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">タイトル</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">ジャンル</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">配信サービス</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">操作</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {hiddenAnime.map(anime => (
                        <tr key={anime.id} className="bg-red-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <img className="h-12 w-8 object-cover rounded mr-3" src={anime.imageUrl} alt={anime.title} />
                              <div className="text-sm font-medium text-text-primary">{anime.title}</div>
                              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded">非表示</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-text-secondary">{anime.genres.join(', ') || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm text-text-secondary">{anime.streamingServices.join(', ') || 'N/A'}</td>
                          <td className="px-6 py-4 text-sm font-medium space-x-2">
                            <button
                              onClick={() => setEditingAnime(anime)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(anime.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {editingAnime && (
        <AnimeEditModal
          anime={editingAnime}
          isOpen={true}
          onClose={() => setEditingAnime(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
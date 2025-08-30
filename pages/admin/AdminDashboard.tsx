
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Anime } from '../../types';
import { getAnimeBySeason } from '../../services/animeService';
import { CURRENT_YEAR } from '../../constants';
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

  const fetchAnimeForAdmin = useCallback(async () => {
    setIsLoading(true);
    try {
      const seasonIdentifier = `${selectedYear}-${selectedSeason}`;
      const data = await getAnimeBySeason(seasonIdentifier);
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

  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text-primary">管理ダッシュボード</h1>
      
      <div className="bg-surface border border-gray-200 p-4 rounded-lg shadow-sm flex flex-col md:flex-row gap-4 items-center">
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
        <button
            onClick={handleForceRefresh}
            className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md transition-colors duration-200 flex items-center gap-1.5"
            title="このシーズンのキャッシュを削除して、全ての情報を再取得します"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>キャッシュを強制クリア</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">タイトル</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">AI分類ジャンル</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">固定配信データ</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {animeList.map(anime => (
                <tr key={anime.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-text-primary">{anime.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{anime.genres.join(', ') || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{anime.streamingServices.join(', ') || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link to={`/anime/${anime.id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">プレビュー</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

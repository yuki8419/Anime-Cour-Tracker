
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Anime } from '../types';
import { getAnimeBySeason } from '../services/animeService';
import { getSavedAnimeData } from '../services/dataService';
import { STREAMING_SERVICES, CURRENT_YEAR } from '../constants';
import AnimeCard from '../components/AnimeCard';
import LoadingSpinner from '../components/LoadingSpinner';

const getCurrentSeason = (): string => {
  const month = new Date().getMonth();
  if (month < 3) return 'winter'; // Jan-Mar
  if (month < 6) return 'spring'; // Apr-Jun
  if (month < 9) return 'summer'; // Jul-Sep
  return 'autumn'; // Oct-Dec
};

const seasonNames: { [key: string]: string } = {
  winter: '冬',
  spring: '春',
  summer: '夏',
  autumn: '秋',
};

const HomePage: React.FC = () => {
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [selectedSeason, setSelectedSeason] = useState<string>(getCurrentSeason());
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  const fetchAnime = useCallback(async () => {
    setIsLoading(true);
    try {
      const seasonIdentifier = `${selectedYear}-${selectedSeason}`;
      const data = await getAnimeBySeason(seasonIdentifier);
      setAnimeList(data);
    } catch (error) {
      console.error("Failed to fetch anime:", error);
      setAnimeList([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedSeason]);

  useEffect(() => {
    fetchAnime();
  }, [fetchAnime]);
  
  const handleForceRefresh = useCallback(() => {
      const seasonIdentifier = `${selectedYear}-${selectedSeason}`;
      const cacheKey = `anime_data_${seasonIdentifier}`;
      console.log(`Force refresh: Clearing cache for key: ${cacheKey}`);
      localStorage.removeItem(cacheKey);
      fetchAnime();
  }, [selectedYear, selectedSeason, fetchAnime]);


  const handleFilterToggle = (serviceId: string) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(serviceId)) {
        newFilters.delete(serviceId);
      } else {
        newFilters.add(serviceId);
      }
      return newFilters;
    });
  };

  const filteredAnime = useMemo(() => {
    if (activeFilters.size === 0) {
      return animeList;
    }
    return animeList.filter(anime =>
      Array.from(activeFilters).every(filter => anime.streamingServices.includes(filter))
    );
  }, [animeList, activeFilters]);
  
  const savedData = getSavedAnimeData();
  const hasCustomData = Object.keys(savedData).length > 0;
  
  const seasons = ['spring', 'summer', 'autumn', 'winter'];
  const years = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

  return (
    <div className="space-y-6">
      {hasCustomData && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blue-800">管理者によってカスタマイズされた情報が表示されています</span>
          </div>
        </div>
      )}
      
      <div className="bg-surface border border-gray-200 p-4 rounded-lg shadow-sm flex flex-col md:flex-row gap-x-4 gap-y-2 items-center flex-wrap">
          <div className="flex-1 flex items-center gap-2 flex-wrap">
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
             <button
                onClick={handleForceRefresh}
                className="bg-gray-100 hover:bg-gray-200 text-text-secondary font-medium px-3 py-2 rounded-md transition-colors duration-200 flex items-center gap-1.5 text-sm"
                title="最新の情報を再取得します"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.994 0h-4.992" />
                </svg>
                <span>データ更新</span>
              </button>
          </div>
          <div className="flex-shrink-0">
            <h2 className="text-lg font-semibold text-text-secondary">配信サービスで絞り込み:</h2>
          </div>
      </div>
       <div className="flex flex-wrap gap-2 justify-center bg-surface border border-gray-200 p-4 rounded-lg">
          {STREAMING_SERVICES.map(service => (
              <button
              key={service.id}
              onClick={() => handleFilterToggle(service.id)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
                  activeFilters.has(service.id)
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-text-secondary hover:bg-gray-300'
              }`}
              >
              {service.name}
              </button>
          ))}
      </div>


      {isLoading ? (
        <LoadingSpinner />
      ) : filteredAnime.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredAnime.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-text-secondary">選択した条件のアニメが見つかりませんでした。</p>
        </div>
      )}
    </div>
  );
};

export default HomePage;

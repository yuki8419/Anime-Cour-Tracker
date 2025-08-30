import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Anime } from '../../types';
import { getAllAnimeForAdmin } from '../../services/animeService';
import { getSavedAnimeData, deleteAnimeData, publishAnimeData, unpublishAnimeData, clearAdminCache } from '../../services/dataService';
import { getGeminiRecommendation } from '../../services/geminiService';
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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressInfo, setProgressInfo] = useState<{
    current: number;
    total: number;
    currentItem: string;
    stage: string;
  } | null>(null);

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
    // 通常のキャッシュと管理者用キャッシュの両方をクリア
    localStorage.removeItem(`anime_data_${seasonIdentifier}`);
    clearAdminCache(seasonIdentifier);
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

  const handlePublish = (animeId: number) => {
    try {
      publishAnimeData(animeId);
      fetchAnimeForAdmin();
    } catch (error) {
      alert('公開に失敗しました');
    }
  };

  const handleUnpublish = (animeId: number) => {
    try {
      unpublishAnimeData(animeId);
      fetchAnimeForAdmin();
    } catch (error) {
      alert('非公開に失敗しました');
    }
  };

  const handleBulkSave = async () => {
    if (confirm('全ての下書きアニメを一括保存しますか？')) {
      setIsProcessing(true);
      try {
        const savedData = getSavedAnimeData();
        for (const anime of draftAnime) {
          const existingData = savedData[anime.id];
          const dataToSave: SavedAnimeData = {
            id: anime.id,
            title: existingData?.title || anime.title,
            description: existingData?.description || anime.description,
            genres: existingData?.genres || anime.genres,
            streamingServices: existingData?.streamingServices || anime.streamingServices,
            isVisible: existingData?.isVisible ?? true,
            customImageUrl: existingData?.customImageUrl || '',
            isPublished: false,
            lastModified: Date.now()
          };
          saveAnimeData(dataToSave);
        }
        fetchAnimeForAdmin();
      } catch (error) {
        alert('一括保存に失敗しました');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBulkPublish = async () => {
    if (confirm('全ての下書きアニメを一括公開しますか？')) {
      setIsProcessing(true);
      try {
        const savedData = getSavedAnimeData();
        for (const anime of draftAnime) {
          const existingData = savedData[anime.id];
          const dataToSave: SavedAnimeData = {
            id: anime.id,
            title: existingData?.title || anime.title,
            description: existingData?.description || anime.description,
            genres: existingData?.genres || anime.genres,
            streamingServices: existingData?.streamingServices || anime.streamingServices,
            isVisible: existingData?.isVisible ?? true,
            customImageUrl: existingData?.customImageUrl || '',
            isPublished: true,
            lastModified: Date.now()
          };
          saveAnimeData(dataToSave);
          publishAnimeData(anime.id);
        }
        fetchAnimeForAdmin();
      } catch (error) {
        alert('一括公開に失敗しました');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBulkDataFetch = async () => {
    if (confirm('全アニメのデータを一括取得しますか？（Annict→Jikan→Wikipedia の順で処理します。時間がかかる場合があります）')) {
      setIsProcessing(true);
      setProgressInfo({ current: 0, total: animeList.length * 2, currentItem: '', stage: '準備中' });
      try {
        let processedCount = 0;
        
        // ステップ1: Annictから基本データは既に取得済み（animeListに含まれる）
        console.log('ステップ1: Annictデータ取得済み');
        
        // ステップ2: JikanAPIで評価を全取得
        console.log('ステップ2: Jikan評価データ取得開始');
        setProgressInfo({ current: 0, total: animeList.length * 2, currentItem: '', stage: 'Jikan評価・ジャンル取得中' });
        const savedData = getSavedAnimeData();
        const jikanDataMap = new Map();
        for (let i = 0; i < animeList.length; i++) {
          const anime = animeList[i];
          setProgressInfo({ 
            current: i + 1, 
            total: animeList.length * 2, 
            currentItem: anime.title, 
            stage: 'Jikan評価・ジャンル取得中' 
          });
          try {
            await new Promise(resolve => setTimeout(resolve, 350)); // レート制限対応
            const jikanResponse = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(anime.title)}&limit=1`);
            if (jikanResponse.ok) {
              const jikanData = await jikanResponse.json();
              const animeData = jikanData.data[0];
              if (animeData) {
                jikanDataMap.set(anime.id, {
                  score: animeData.score || null,
                  genres: animeData.genres ? animeData.genres.map((g: any) => g.name) : anime.genres
                });
              }
            }
          } catch (error) {
            console.error(`Jikan取得失敗: ${anime.title}`, error);
          }
        }
        
        // ステップ3: Wikipediaからあらすじを全取得
        console.log('ステップ3: Wikipedia情報取得開始');
        setProgressInfo({ current: animeList.length, total: animeList.length * 2, currentItem: '', stage: 'Wikipedia情報取得中' });
        for (let i = 0; i < animeList.length; i++) {
          const anime = animeList[i];
          setProgressInfo({ 
            current: animeList.length + i + 1, 
            total: animeList.length * 2, 
            currentItem: anime.title, 
            stage: 'Wikipedia情報取得中' 
          });
          if (anime.description === 'この作品のあらすじは、現在準備中です。' || 
              anime.description === 'あらすじはありません。') {
            try {
              await new Promise(resolve => setTimeout(resolve, 500)); // レート制限対応
              const searchResponse = await fetch(
                `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(anime.title)}`
              );
              
              if (searchResponse.ok) {
                const wikiData = await searchResponse.json();
                const wikiDescription = wikiData.extract && wikiData.extract.length > 50 ? wikiData.extract : anime.description;
                
                // 既存データと統合
                const existingData = savedData[anime.id];
                const jikanData = jikanDataMap.get(anime.id);
                const recommendationScore = jikanData?.score ? calculateRecommendationScore(jikanData.score) : (existingData?.recommendationScore || 0);
                
                const dataToSave = {
                  id: anime.id,
                  title: existingData?.title || anime.title,
                  description: wikiDescription,
                  genres: existingData?.genres || jikanData?.genres || anime.genres,
                  streamingServices: existingData?.streamingServices || anime.streamingServices,
                  isVisible: existingData?.isVisible ?? true,
                  customImageUrl: existingData?.customImageUrl || '',
                  isPublished: existingData?.isPublished ?? false,
                  lastModified: Date.now(),
                  recommendationScore: recommendationScore,
                };
                saveAnimeData(dataToSave);
                processedCount++;
              }
            } catch (error) {
              console.error(`Wikipedia取得失敗: ${anime.title}`, error);
            }
          } else {
            // あらすじがある場合でも、Jikanの評価スコアは更新
            const existingData = savedData[anime.id];
            const jikanData = jikanDataMap.get(anime.id);
            if (jikanData && (!existingData?.recommendationScore || !existingData?.genres?.length)) {
              const recommendationScore = jikanData.score ? calculateRecommendationScore(jikanData.score) : (existingData?.recommendationScore || 0);
              const dataToSave = {
                id: anime.id,
                title: existingData?.title || anime.title,
                description: existingData?.description || anime.description,
                genres: existingData?.genres || jikanData.genres || anime.genres,
                streamingServices: existingData?.streamingServices || anime.streamingServices,
                isVisible: existingData?.isVisible ?? true,
                customImageUrl: existingData?.customImageUrl || '',
                isPublished: existingData?.isPublished ?? false,
                lastModified: Date.now(),
                recommendationScore: recommendationScore,
              };
              saveAnimeData(dataToSave);
              processedCount++;
            }
          }
        }
        
        alert(`一括データ取得完了！\n処理件数: ${processedCount}件\n- Jikan評価・ジャンルデータ: ${jikanDataMap.size}件取得\n- Wikipedia情報: 更新済み`);
        fetchAnimeForAdmin();
      } catch (error) {
        console.error('一括データ取得エラー:', error);
        alert('一括データ取得に失敗しました');
      } finally {
        setIsProcessing(false);
        setProgressInfo(null);
      }
    }
  };
  const handleEnrichWithWiki = async () => {
    if (confirm('Wikipediaからあらすじ情報を取得しますか？（時間がかかる場合があります）')) {
      setIsProcessing(true);
      try {
        const savedData = getSavedAnimeData();
        let updatedCount = 0;
        
        for (const anime of animeList) {
          if (anime.description === 'この作品のあらすじは、現在準備中です。' || 
              anime.description === 'あらすじはありません。') {
            try {
              // Wikipedia検索APIを使用してあらすじを取得
              const searchResponse = await fetch(
                `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(anime.title)}`
              );
              
              if (searchResponse.ok) {
                const wikiData = await searchResponse.json();
                if (wikiData.extract && wikiData.extract.length > 50) {
                  const existingData = savedData[anime.id];
                  const dataToSave: SavedAnimeData = {
                    id: anime.id,
                    title: existingData?.title || anime.title,
                    description: wikiData.extract,
                    genres: existingData?.genres || anime.genres,
                    streamingServices: existingData?.streamingServices || anime.streamingServices,
                    isVisible: existingData?.isVisible ?? true,
                    customImageUrl: existingData?.customImageUrl || '',
                    isPublished: existingData?.isPublished ?? false,
                    lastModified: Date.now()
                  };
                  saveAnimeData(dataToSave);
                  updatedCount++;
                }
              }
              // レート制限を避けるため少し待機
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
              console.error(`Failed to fetch wiki data for ${anime.title}:`, error);
            }
          }
        }
        
        alert(`${updatedCount}件のあらすじを更新しました`);
        fetchAnimeForAdmin();
      } catch (error) {
        alert('Wikipedia情報の取得に失敗しました');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBulkDataFetchAllSeasons = async () => {
    if (confirm('2022-2025年の全シーズンのアニメデータを一括取得しますか？（非常に時間がかかります）')) {
      setIsProcessing(true);
      const years = [2022, 2023, 2024, 2025];
      const seasons = ['spring', 'summer', 'autumn', 'winter'];
      const totalSeasons = years.length * seasons.length;
      setProgressInfo({ current: 0, total: totalSeasons, currentItem: '', stage: '全シーズン処理準備中' });
      
      try {
        let totalProcessed = 0;
        let totalJikanData = 0;
        let seasonCount = 0;
        
        for (const year of years) {
          for (const season of seasons) {
            seasonCount++;
            setProgressInfo({ 
              current: seasonCount, 
              total: totalSeasons, 
              currentItem: `${year}年${seasonNames[season]}`, 
              stage: 'シーズンデータ取得中' 
            });
            try {
              console.log(`処理中: ${year}年${seasonNames[season]}`);
              const seasonIdentifier = `${year}-${season}`;
              const seasonAnimeList = await getAllAnimeForAdmin(seasonIdentifier);
              
              // JikanAPIで評価とジャンルを取得
              const jikanDataMap = new Map();
              for (const anime of seasonAnimeList) {
                try {
                  await new Promise(resolve => setTimeout(resolve, 350)); // レート制限対応
                  const jikanResponse = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(anime.title)}&limit=1`);
                  if (jikanResponse.ok) {
                    const jikanData = await jikanResponse.json();
                    const animeData = jikanData.data[0];
                    if (animeData) {
                      jikanDataMap.set(anime.id, {
                        score: animeData.score || null,
                        genres: animeData.genres ? animeData.genres.map((g: any) => g.name) : []
                      });
                      totalJikanData++;
                    }
                  }
                } catch (error) {
                  console.error(`Jikan取得失敗: ${anime.title}`, error);
                }
              }
              
              // Wikipediaからあらすじを取得
              const savedData = getSavedAnimeData();
              for (const anime of seasonAnimeList) {
                if (anime.description === 'この作品のあらすじは、現在準備中です。' || 
                    anime.description === 'あらすじはありません。') {
                  try {
                    await new Promise(resolve => setTimeout(resolve, 500)); // レート制限対応
                    const searchResponse = await fetch(
                      `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(anime.title)}`
                    );
                    
                    if (searchResponse.ok) {
                      const wikiData = await searchResponse.json();
                      const wikiDescription = wikiData.extract && wikiData.extract.length > 50 ? wikiData.extract : anime.description;
                      
                      // 既存データと統合
                      const existingData = savedData[anime.id];
                      const jikanData = jikanDataMap.get(anime.id);
                      const recommendationScore = jikanData?.score ? calculateRecommendationScore(jikanData.score) : (existingData?.recommendationScore || 0);
                      
                      const dataToSave = {
                        id: anime.id,
                        title: existingData?.title || anime.title,
                        description: wikiDescription,
                        genres: existingData?.genres || jikanData?.genres || anime.genres,
                        streamingServices: existingData?.streamingServices || anime.streamingServices,
                        isVisible: existingData?.isVisible ?? true,
                        customImageUrl: existingData?.customImageUrl || '',
                        isPublished: existingData?.isPublished ?? false,
                        lastModified: Date.now(),
                        recommendationScore: recommendationScore,
                      };
                      saveAnimeData(dataToSave);
                      totalProcessed++;
                    }
                  } catch (error) {
                    console.error(`Wikipedia取得失敗: ${anime.title}`, error);
                  }
                } else {
                  // あらすじがある場合でも、Jikanの評価スコアは更新
                  const existingData = savedData[anime.id];
                  const jikanData = jikanDataMap.get(anime.id);
                  if (jikanData && (!existingData?.recommendationScore || !existingData?.genres?.length)) {
                    const recommendationScore = jikanData.score ? calculateRecommendationScore(jikanData.score) : (existingData?.recommendationScore || 0);
                    const dataToSave = {
                      id: anime.id,
                      title: existingData?.title || anime.title,
                      description: existingData?.description || anime.description,
                      genres: existingData?.genres || jikanData.genres || anime.genres,
                      streamingServices: existingData?.streamingServices || anime.streamingServices,
                      isVisible: existingData?.isVisible ?? true,
                      customImageUrl: existingData?.customImageUrl || '',
                      isPublished: existingData?.isPublished ?? false,
                      lastModified: Date.now(),
                      recommendationScore: recommendationScore,
                    };
                    saveAnimeData(dataToSave);
                    totalProcessed++;
                  }
                }
              }
            } catch (error) {
              console.error(`${year}年${seasonNames[season]}の処理でエラー:`, error);
            }
          }
        }
        
        alert(`全シーズン一括データ取得完了！\n処理件数: ${totalProcessed}件\n- Jikan評価・ジャンルデータ: ${totalJikanData}件取得\n- 全16シーズン処理完了`);
        fetchAnimeForAdmin();
      } catch (error) {
        console.error('全シーズン一括データ取得エラー:', error);
        alert('全シーズン一括データ取得に失敗しました');
      } finally {
        setIsProcessing(false);
        setProgressInfo(null);
      }
    }
  };

  const savedData = getSavedAnimeData();
  const publishedAnime = animeList.filter(anime => {
    const saved = savedData[anime.id];
    return saved?.isVisible !== false && saved?.isPublished === true;
  });
  const draftAnime = animeList.filter(anime => {
    const saved = savedData[anime.id];
    return saved?.isVisible !== false && saved?.isPublished !== true;
  });
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
              className="bg-gray-100 hover:bg-gray-200 text-text-secondary font-medium px-3 py-2 rounded-md transition-colors disabled:opacity-50"
              disabled={isProcessing}
            >
              {viewMode === 'grid' ? 'テーブル表示' : 'グリッド表示'}
            </button>
            <button
              onClick={handleEnrichWithWiki}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              disabled={isProcessing}
              title="Wikipediaからあらすじ情報を自動取得します"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Wiki情報取得</span>
            </button>
            <button
              onClick={handleBulkDataFetch}
              className="bg-purple-500 hover:bg-purple-600 text-white font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              disabled={isProcessing}
              title="Annict→Jikan→Wikipediaの順で全データを一括取得します"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>一括データ取得</span>
            </button>
            <button
              onClick={handleBulkDataFetchAllSeasons}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              disabled={isProcessing}
              title="2022-2025年の全シーズンのアニメデータを一括取得します（非常に時間がかかります）"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span>全シーズン一括取得</span>
            </button>
            {draftAnime.length > 0 && (
              <>
                <button
                  onClick={handleBulkSave}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  disabled={isProcessing}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>一括保存 ({draftAnime.length}件)</span>
                </button>
                <button
                  onClick={handleBulkPublish}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  disabled={isProcessing}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>一括公開 ({draftAnime.length}件)</span>
                </button>
              </>
            )}
            <button
                onClick={handleForceRefresh}
                className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md transition-colors duration-200 flex items-center gap-1.5 disabled:opacity-50"
                disabled={isProcessing}
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
          公開中: {publishedAnime.length}件 | 下書き: {draftAnime.length}件 | 非表示: {hiddenAnime.length}件 | 合計: {animeList.length}件
          {isProcessing && progressInfo && (
            <div className="ml-4 text-blue-600">
              <span className="font-medium">{progressInfo.stage}</span>
              <span className="ml-2">({progressInfo.current}/{progressInfo.total})</span>
              {progressInfo.currentItem && <span className="ml-2 text-gray-600">- {progressInfo.currentItem}</span>}
            </div>
          )}
        </div>
        
        {/* 進捗バー */}
        {isProcessing && progressInfo && (
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${(progressInfo.current / progressInfo.total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-6">
          {/* 公開中のアニメ */}
          <div>
            <h2 className="text-xl font-bold text-text-primary mb-4">公開中のアニメ ({publishedAnime.length}件)</h2>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {publishedAnime.map(anime => (
                  <div key={anime.id} className="relative group">
                    <AnimeCard anime={anime} />
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">公開中</div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1">
                      <button
                        onClick={() => setEditingAnime(anime)}
                        className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-full shadow-lg transition-colors"
                        title="編集"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleUnpublish(anime.id)}
                        className="bg-orange-500 hover:bg-orange-600 text-white p-1.5 rounded-full shadow-lg transition-colors"
                        title="非公開"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
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
                    {publishedAnime.map(anime => (
                      <tr key={anime.id} className="bg-green-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <img className="h-12 w-8 object-cover rounded mr-3" src={anime.imageUrl} alt={anime.title} />
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-text-primary">{anime.title}</div>
                              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">公開中</span>
                            </div>
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
                            onClick={() => handleUnpublish(anime.id)}
                            className="text-orange-600 hover:text-orange-800 transition-colors"
                          >
                            非公開
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

          {/* 下書きのアニメ */}
          {draftAnime.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-text-primary mb-4">下書きのアニメ ({draftAnime.length}件)</h2>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {draftAnime.map(anime => (
                    <div key={anime.id} className="relative group">
                      <AnimeCard anime={anime} />
                      <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">下書き</div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1">
                        <button
                          onClick={() => setEditingAnime(anime)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-full shadow-lg transition-colors"
                          title="編集"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handlePublish(anime.id)}
                          className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded-full shadow-lg transition-colors"
                          title="公開"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                      {draftAnime.map(anime => (
                        <tr key={anime.id} className="bg-yellow-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <img className="h-12 w-8 object-cover rounded mr-3" src={anime.imageUrl} alt={anime.title} />
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium text-text-primary">{anime.title}</div>
                                <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded">下書き</span>
                              </div>
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
                              onClick={() => handlePublish(anime.id)}
                              className="text-green-600 hover:text-green-800 transition-colors"
                            >
                              公開
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
          )}

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
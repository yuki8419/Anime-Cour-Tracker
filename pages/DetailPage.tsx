
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { AnimeDetail } from '../types';
import { getAnimeDetails } from '../services/animeService';
import LoadingSpinner from '../components/LoadingSpinner';
import Tabs from '../components/Tabs';
import Pill from '../components/Pill';
import StreamingIcon from '../components/StreamingIcon';

const seasonMap: { [key: string]: string } = {
  winter: '冬',
  spring: '春',
  summer: '夏',
  autumn: '秋',
};

const useWatchedEpisodes = (animeId: number | undefined) => {
    const [watched, setWatched] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (typeof animeId === 'undefined') {
            setWatched(new Set());
            return;
        }
        try {
            const item = window.localStorage.getItem(`watched_episodes_${animeId}`);
            if (item) {
                setWatched(new Set(JSON.parse(item)));
            } else {
                setWatched(new Set());
            }
        } catch (error) {
            console.error("Error reading from localStorage", error);
            setWatched(new Set());
        }
    }, [animeId]);

    useEffect(() => {
        if (typeof animeId === 'undefined') return;
        try {
            window.localStorage.setItem(`watched_episodes_${animeId}`, JSON.stringify(Array.from(watched)));
        } catch (error) {
            console.error("Error writing to localStorage", error);
        }
    }, [watched, animeId]);

    const toggleWatched = useCallback((episodeId: number) => {
        setWatched(currentWatched => {
            const newWatched = new Set(currentWatched);
            if (newWatched.has(episodeId)) {
                newWatched.delete(episodeId);
            } else {
                newWatched.add(episodeId);
            }
            return newWatched;
        });
    }, []);

    return { watched, toggleWatched };
};

const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const numericId = id ? parseInt(id, 10) : undefined;
  const { watched, toggleWatched } = useWatchedEpisodes(numericId);

  const fetchDetails = useCallback(async () => {
    if (!numericId) return;
    setIsLoading(true);
    setAnime(null);
    try {
      const data = await getAnimeDetails(numericId);
      setAnime(data);
    } catch (error) {
      console.error("Failed to fetch anime details:", error);
      setAnime(null);
    } finally {
      setIsLoading(false);
    }
  }, [numericId]);

  useEffect(() => {
    setIsModalOpen(false);
    fetchDetails();
  }, [fetchDetails]);


  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);
  
  if (isLoading) return <LoadingSpinner />;
  if (!anime) return <div className="text-center py-10 text-text-secondary">アニメが見つかりませんでした。 <Link to="/" className="text-primary hover:underline">ホームに戻る</Link></div>;

  const [year, seasonKey] = anime.season.split('-');
  const seasonText = `${year} ${seasonMap[seasonKey as keyof typeof seasonMap] || seasonKey}`;

  const tabs = [
    {
      label: '作品情報',
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold mb-2 text-text-primary">あらすじ</h3>
            <p className="text-text-secondary whitespace-pre-line">{anime.description}</p>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 text-text-primary">配信情報</h3>
            <div className="flex flex-wrap gap-4">
            {anime.streamingServices.length > 0 ?
                anime.streamingServices.map(serviceId => <StreamingIcon key={serviceId} serviceId={serviceId} />) :
                <p className="text-text-secondary">配信情報はまだありません。</p>
            }
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 text-text-primary">公式サイト・SNS</h3>
            <div className="flex items-center gap-4">
              {anime.officialSiteUrl && <a href={anime.officialSiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">公式サイト</a>}
              {anime.twitterUrl && <a href={anime.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">公式X (旧Twitter)</a>}
              {!anime.officialSiteUrl && !anime.twitterUrl && <p className="text-text-secondary">関連リンクはありません。</p>}
            </div>
          </div>
        </div>
      )
    },
    {
      label: 'エピソード',
      content: (
        <div className="space-y-2">
          {anime.episodes.length > 0 ? (
              anime.episodes.map(episode => (
              <div key={episode.id} className="bg-gray-100 p-3 rounded-md flex items-center justify-between">
                  <span className="text-text-secondary">{`${episode.number}${episode.title ? `: ${episode.title}` : ''}`}</span>
                  <input 
                  type="checkbox"
                  checked={watched.has(episode.id)}
                  onChange={() => toggleWatched(episode.id)}
                  className="form-checkbox h-5 w-5 text-primary bg-gray-200 border-gray-300 rounded focus:ring-primary focus:ring-offset-0"
                  />
              </div>
              ))
          ) : (
              <p className="text-text-secondary">エピソード情報はまだありません。</p>
          )}
        </div>
      )
    },
    {
      label: 'キャスト／スタッフ',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 text-text-primary">キャスト</h3>
            <div className="space-y-3">
              {anime.cast.length > 0 ? (
              anime.cast.map(c => (
                <div key={c.id} className="text-text-secondary">
                  <span className="font-semibold text-text-primary">{c.character}:</span> {c.voiceActor}
                </div>
              ))
              ) : (
              <p className="text-text-secondary">キャスト情報はまだありません。</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4 text-text-primary">スタッフ</h3>
            <div className="space-y-3">
              {anime.staff.length > 0 ? (
              anime.staff.map(s => (
                <div key={s.id} className="text-text-secondary">
                  <span className="font-semibold text-text-primary">{s.role}:</span> {s.name}
                </div>
              ))
              ) : (
              <p className="text-text-secondary">スタッフ情報はまだありません。</p>
              )}
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
        <div className="mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                一覧へ戻る
            </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <img 
                  src={anime.imageUrl} 
                  alt={anime.title} 
                  className="w-full h-auto object-cover rounded-lg shadow-xl cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setIsModalOpen(true)}
                />
            </div>
            <div className="md:col-span-2 space-y-4">
                <div className="flex justify-between items-start">
                    <div>
                        <Pill text={seasonText} className="capitalize mb-2" />
                        <h1 className="text-4xl font-extrabold text-text-primary">{anime.title}</h1>
                        {anime.prequel && (
                          <Link 
                              to={`/anime/${anime.prequel.id}`}
                              className="inline-flex items-center gap-1 text-sm text-secondary hover:underline mt-2"
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                              </svg>
                              {`${anime.prequel.title} (前のシーズン)`}
                          </Link>
                        )}
                    </div>
                    <button onClick={() => setIsFavorite(!isFavorite)} className="p-2 rounded-full bg-surface hover:bg-gray-200 transition-colors duration-200 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 transition-colors duration-200 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
                
                <Tabs tabs={tabs} />
            </div>
        </div>
        {isModalOpen && (
          <div 
              className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 animate-fade-in"
              onClick={() => setIsModalOpen(false)}
          >
              <style>{`
                @keyframes fade-in {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                .animate-fade-in {
                  animation: fade-in 0.2s ease-out;
                }
              `}</style>
              <img 
                  src={anime.imageUrl} 
                  alt={`Enlarged view of ${anime.title}`} 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
              />
          </div>
        )}
    </div>
  );
};

export default DetailPage;

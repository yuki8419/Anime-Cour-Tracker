import type { Anime, AnimeDetail, CastMember, StaffMember, Prequel } from '../types';
import { ANIME_STREAMING_MAP } from '../data/streamingData';
import { ANIME_ENRICHMENT_DATA } from '../data/animeEnrichmentData';
import { getSavedAnimeData, getAdminCacheData, setAdminCacheData, clearAdminCache } from './dataService';
import type { SavedAnimeData } from './dataService';

const ANNICT_API_URL = 'https://api.annict.com/graphql';
// As per user request, using the provided Annict API token.
// In a production environment, this should be stored securely in an environment variable.
const ANNICT_TOKEN = 'O8jqixlG9ms81q2hNplwXNq_TgLiYcxVUCx57mbcku4';

const ANIME_PER_PAGE = 30;
const CACHE_PREFIX = 'anime_data_';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const getStreamingServices = (animeId: number): string[] => {
    if (ANIME_STREAMING_MAP[animeId]) {
        return ANIME_STREAMING_MAP[animeId];
    }
    return [];
};

async function fetchAnnict(query: string, variables: Record<string, any>) {
  const response = await fetch(ANNICT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANNICT_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Network error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors) {
    console.error('GraphQL Errors:', json.errors);
    throw new Error(`GraphQL error: ${json.errors.map((e: any) => e.message).join(', ')}`);
  }

  return json.data;
}

const listQuery = `
  query getAnimeListBySeason($season: String!, $first: Int) {
    searchWorks(seasons: [$season], orderBy: { field: WATCHERS_COUNT, direction: DESC }, first: $first) {
      nodes {
        annictId
        title
        media
        seasonYear
        seasonName
        image {
          recommendedImageUrl
          facebookOgImageUrl
        }
      }
    }
  }
`;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getAnimeBySeason = async (season: string): Promise<Anime[]> => {
  const cacheKey = `${CACHE_PREFIX}${season}`;
  const savedData = getSavedAnimeData();
  
  try {
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
      const { timestamp, data } = JSON.parse(cachedItem);
      if (Date.now() - timestamp < CACHE_DURATION_MS) {
        console.log(`Cache hit for season: ${season}. Serving from localStorage.`);
        // 保存されたデータでキャッシュを更新
        const updatedData = (data as Anime[]).map(anime => {
          const saved = savedData[anime.id];
          if (saved && saved.isPublished) {
            return {
              ...anime,
              title: saved.title,
              description: saved.description,
              genres: saved.genres,
              streamingServices: saved.streamingServices,
              imageUrl: saved.customImageUrl || anime.imageUrl,
            };
          }
          return anime;
        }).filter(anime => {
          const saved = savedData[anime.id];
          return saved?.isVisible !== false;
        });
        return updatedData;
      } else {
        console.log(`Cache expired for season: ${season}. Removing item.`);
        localStorage.removeItem(cacheKey);
      }
    }
  } catch (error) {
    console.error("Error reading from cache. Clearing item and fetching fresh data.", error);
    localStorage.removeItem(cacheKey);
  }

  console.log(`Fetching fresh anime data for season: ${season}`);
  const annictData = await fetchAnnict(listQuery, { season, first: ANIME_PER_PAGE });

  const works = (annictData?.searchWorks?.nodes || []).filter((work: any) => work.media === 'TV');

  // Fetch supplementary data (like score) from Jikan
  const jikanFetchPromises = works.map(async (work: any) => {
    try {
      await sleep(350); // Rate limiting for Jikan API
      const jikanResponse = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(work.title)}&limit=1`);
      if (!jikanResponse.ok) return { annictId: work.annictId, score: null };
      const jikanData = await jikanResponse.json();
      const animeData = jikanData.data[0];
      return { annictId: work.annictId, score: animeData?.score || null };
    } catch (e) {
      console.error(`Failed to fetch Jikan data for ${work.title}`, e);
      return { annictId: work.annictId, score: null };
    }
  });

  const jikanDataList = await Promise.all(jikanFetchPromises);
  const jikanDataMap = new Map(jikanDataList.map(d => [d.annictId, d]));
  
  const animeList = works.map((work: any): Anime => {
    const jikanData = jikanDataMap.get(work.annictId);
    const staticData = ANIME_ENRICHMENT_DATA[work.annictId];
    const saved = savedData[work.annictId];
    
    // JikanAPIのスコア（1-10）を5段階のおすすめ度に変換
    const calculateRecommendationScore = (jikanScore: number | null): number => {
      if (!jikanScore || jikanScore === 0) return 0;
      if (jikanScore >= 9.0) return 5; // 9.0以上 = 5つ星（傑作）
      if (jikanScore >= 8.0) return 4; // 8.0-8.9 = 4つ星（優秀）
      if (jikanScore >= 7.0) return 3; // 7.0-7.9 = 3つ星（良作）
      if (jikanScore >= 6.0) return 2; // 6.0-6.9 = 2つ星（普通）
      return 1; // 6.0未満 = 1つ星（微妙）
    };

    return {
      id: work.annictId,
      title: (saved?.isPublished ? saved.title : null) || work.title,
      imageUrl: (saved?.isPublished && saved.customImageUrl) || work.image?.recommendedImageUrl || work.image?.facebookOgImageUrl || 'https://picsum.photos/400/600',
      season: `${work.seasonYear}-${work.seasonName?.toLowerCase()}`,
      streamingServices: (saved?.isPublished ? saved.streamingServices : null) || getStreamingServices(work.annictId),
      score: jikanData?.score || null,
      genres: (saved?.isPublished ? saved.genres : null) || staticData?.genres || [],
      description: (saved?.isPublished ? saved.description : null) || staticData?.description || 'この作品のあらすじは、現在準備中です。',
      prequel: staticData?.prequel || null,
      recommendationScore: saved?.recommendationScore || calculateRecommendationScore(jikanData?.score),
    };
  }).filter(anime => {
    const saved = savedData[anime.id];
    return saved?.isVisible !== false; // デフォルトで表示、明示的にfalseの場合のみ非表示
  });

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: animeList }));
  } catch (error) { console.error("Error writing to localStorage.", error); }

  return animeList;
};

const detailQuery = `
  query getAnimeDetailsById($id: [Int!]) {
    searchWorks(annictIds: $id, first: 1) {
      nodes {
        annictId
        title
        media
        seasonYear
        seasonName
        image {
          recommendedImageUrl
          facebookOgImageUrl
        }
        officialSiteUrl
        twitterUsername
        episodes(orderBy: { field: SORT_NUMBER, direction: ASC }) {
          nodes {
            annictId
            numberText
            title
          }
        }
        casts(orderBy: { field: SORT_NUMBER, direction: ASC }, first: 10) {
          nodes {
            character {
              name
              annictId
            }
            person {
              name
            }
          }
        }
        staffs(orderBy: { field: SORT_NUMBER, direction: ASC }, first: 10) {
          nodes {
            resource {
              ... on Person { name }
              ... on Organization { name }
            }
            roleText
            annictId
          }
        }
      }
    }
  }
`;

const searchByTitleQuery = `
  query searchWorkByTitle($title: String!) {
    searchWorks(titles: [$title], first: 1) {
      nodes {
        annictId
        title
      }
    }
  }
`;

export const getAnimeDetails = async (id: number): Promise<AnimeDetail | null> => {
  console.log(`Fetching details for anime ID: ${id}`);
  const data = await fetchAnnict(detailQuery, { id: [id] });
  
  const work = data?.searchWorks?.nodes?.[0];
  if (!work) return null;

  const seasonIdentifier = `${work.seasonYear}-${work.seasonName?.toLowerCase()}`;
  const cacheKey = `${CACHE_PREFIX}${seasonIdentifier}`;
  let cachedAnimeData: Anime | null = null;
  const savedData = getSavedAnimeData();
  const saved = savedData[id];
  
  try {
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
      const { data: cachedAnimeList } = JSON.parse(cachedItem) as { data: Anime[] };
      cachedAnimeData = cachedAnimeList.find(a => a.id === id) || null;
    }
  } catch (error) { console.error("Could not read from cache for detail page", error); }

  return {
    id: work.annictId,
    title: (saved?.isPublished ? saved.title : null) || work.title,
    imageUrl: (saved?.isPublished && saved.customImageUrl) || work.image?.recommendedImageUrl || work.image?.facebookOgImageUrl || 'https://picsum.photos/400/600',
    season: `${work.seasonYear}-${work.seasonName?.toLowerCase()}`,
    description: (saved?.isPublished ? saved.description : null) || cachedAnimeData?.description || 'あらすじは一覧ページで取得されます。',
    genres: (saved?.isPublished ? saved.genres : null) || cachedAnimeData?.genres || [],
    score: cachedAnimeData?.score || null,
    streamingServices: (saved?.isPublished ? saved.streamingServices : null) || cachedAnimeData?.streamingServices || [],
    prequel: cachedAnimeData?.prequel || null,
    recommendationScore: saved?.recommendationScore || 0,
    officialSiteUrl: work.officialSiteUrl,
    twitterUrl: work.twitterUsername ? `https://twitter.com/${work.twitterUsername}` : null,
    episodes: (work.episodes?.nodes || []).map((ep: any) => ({
      id: ep.annictId,
      number: ep.numberText,
      title: ep.title,
    })),
    cast: (work.casts?.nodes || [])
      .map((c: any) => ({
        id: c?.character?.annictId,
        character: c?.character?.name,
        voiceActor: c?.person?.name,
      }))
      .filter((c): c is CastMember => !!(c.id && c.character && c.voiceActor)),
    staff: (work.staffs?.nodes || [])
      .map((s: any) => ({
        id: s?.annictId,
        role: s?.roleText || '不明',
        name: s?.resource?.name,
      }))
      .filter((s): s is StaffMember => !!(s.id && s.name)),
  };
};

// 管理者用：全てのアニメを取得（非表示も含む）
export const getAllAnimeForAdmin = async (season: string): Promise<Anime[]> => {
  console.log(`Fetching all anime for admin (including hidden) for season: ${season}`);
  
  // 管理者用キャッシュをチェック
  const cachedData = getAdminCacheData(season);
  if (cachedData) {
    console.log(`Admin cache hit for season: ${season}`);
    return cachedData.data.map(saved => ({
      id: saved.id,
      title: saved.title,
      imageUrl: saved.customImageUrl || 'https://picsum.photos/400/600',
      season: season,
      streamingServices: saved.streamingServices,
      score: null, // キャッシュからは評価情報は取得しない
      genres: saved.genres,
      description: saved.description,
      prequel: null, // キャッシュからは前作情報は取得しない
    }));
  }
  
  const annictData = await fetchAnnict(listQuery, { season, first: ANIME_PER_PAGE });

  const works = (annictData?.searchWorks?.nodes || []).filter((work: any) => work.media === 'TV');

  const jikanFetchPromises = works.map(async (work: any) => {
    try {
      await sleep(350);
      const jikanResponse = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(work.title)}&limit=1`);
      if (!jikanResponse.ok) return { annictId: work.annictId, score: null };
      const jikanData = await jikanResponse.json();
      const animeData = jikanData.data[0];
      return { annictId: work.annictId, score: animeData?.score || null };
    } catch (e) {
      console.error(`Failed to fetch Jikan data for ${work.title}`, e);
      return { annictId: work.annictId, score: null };
    }
  });

  const jikanDataList = await Promise.all(jikanFetchPromises);
  const jikanDataMap = new Map(jikanDataList.map(d => [d.annictId, d]));
  
  const savedData = getSavedAnimeData();
  
  const animeList = works.map((work: any): Anime => {
    const jikanData = jikanDataMap.get(work.annictId);
    const staticData = ANIME_ENRICHMENT_DATA[work.annictId];
    const saved = savedData[work.annictId];

    return {
      id: work.annictId,
      title: saved?.title || work.title,
      imageUrl: saved?.customImageUrl || work.image?.recommendedImageUrl || work.image?.facebookOgImageUrl || 'https://picsum.photos/400/600',
      season: `${work.seasonYear}-${work.seasonName?.toLowerCase()}`,
      streamingServices: saved?.streamingServices || getStreamingServices(work.annictId),
      score: jikanData?.score || null,
      genres: saved?.genres || staticData?.genres || [],
      description: saved?.description || staticData?.description || 'この作品のあらすじは、現在準備中です。',
      prequel: staticData?.prequel || null,
      recommendationScore: saved?.recommendationScore || 0,
    };
  });

  // 管理者用キャッシュに保存
  const adminCacheData: SavedAnimeData[] = animeList.map(anime => {
    const saved = savedData[anime.id];
    return {
      id: anime.id,
      title: anime.title,
      description: anime.description,
      genres: anime.genres,
      streamingServices: anime.streamingServices,
      isVisible: saved?.isVisible ?? true,
      customImageUrl: saved?.customImageUrl || '',
      isPublished: saved?.isPublished ?? false,
      lastModified: saved?.lastModified || Date.now()
    };
  });
  
  setAdminCacheData(season, adminCacheData);

  return animeList;
};

// Deprecated functions - no longer called from DetailPage
export const fetchPrequelInfo = async (currentAnimeTitle: string): Promise<Prequel | null> => {
    console.warn("fetchPrequelInfo is deprecated and should not be called directly.");
    return null;
}
export const fetchStreamingServices = async (title: string): Promise<string[]> => {
    console.warn("fetchStreamingServices is deprecated and should not be called directly.");
    return [];
}
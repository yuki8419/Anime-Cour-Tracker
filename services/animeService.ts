
import type { Anime, AnimeDetail, CastMember, StaffMember, Prequel } from '../types';
import { ANIME_GENRES } from '../constants';
import { ANIME_STREAMING_MAP } from '../data/streamingData';
import { findPrequelTitle, findStreamingServices as geminiFindStreamingServices, classifyGenresBatch, translateSynopsesBatch } from './geminiService';

const ANNICT_API_URL = 'https://api.annict.com/graphql';
// As per user request, using the provided Annict API token.
// In a production environment, this should be stored securely in an environment variable.
const ANNICT_TOKEN = 'O8jqixlG9ms81q2hNplwXNq_TgLiYcxVUCx57mbcku4';

const ANIME_PER_PAGE = 30;
const CACHE_PREFIX = 'anime_data_';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// This function now only provides true data from our curated list.
// It no longer falls back to random assignment to avoid showing false information.
const getStreamingServices = (animeId: number): string[] => {
    // Check our curated list for accurate data for popular shows.
    if (ANIME_STREAMING_MAP[animeId]) {
        return ANIME_STREAMING_MAP[animeId];
    }
    // If not in our list, return empty to avoid showing false information.
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

// Helper to add delay between API calls to avoid rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getAnimeBySeason = async (season: string): Promise<Anime[]> => {
  const cacheKey = `${CACHE_PREFIX}${season}`;
  try {
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
      const { timestamp, data } = JSON.parse(cachedItem);
      if (Date.now() - timestamp < CACHE_DURATION_MS) {
        console.log(`Cache hit for season: ${season}. Serving from localStorage.`);
        return data as Anime[];
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

  // Enrich with Jikan data (score, synopsis)
  const jikanFetchPromises = works.map(async (work: any) => {
    try {
      // Jikan API has a rate limit (e.g., 3 requests per second)
      await sleep(350);
      const jikanResponse = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(work.title)}&limit=1`);
      if (!jikanResponse.ok) return { annictId: work.annictId, score: null, synopsis: null, title: work.title };
      const jikanData = await jikanResponse.json();
      const animeData = jikanData.data[0];
      return {
        annictId: work.annictId,
        score: animeData?.score || null,
        synopsis: animeData?.synopsis || null,
        title: work.title,
      };
    } catch (e) {
      console.error(`Failed to fetch Jikan data for ${work.title}`, e);
      return { annictId: work.annictId, score: null, synopsis: null, title: work.title };
    }
  });

  const enrichedDataList = await Promise.all(jikanFetchPromises);
  const enrichedDataMap = new Map(enrichedDataList.map(d => [d.annictId, d]));
  
  // Batch translate synopses with Gemini
  const animeForTranslation = enrichedDataList.map(d => ({ title: d.title, synopsis: d.synopsis }));
  let translatedSynopsesMap: Record<string, string> = {};
  try {
    translatedSynopsesMap = await translateSynopsesBatch(animeForTranslation);
  } catch(e) {
    console.error('Failed to translate synopses with Gemini', e);
  }

  // Batch classify genres with Gemini
  const animeForGenreClassification = enrichedDataList.map(d => ({ title: d.title, synopsis: d.synopsis }));
  let genresMap: Record<string, string[]> = {};
  try {
    genresMap = await classifyGenresBatch(animeForGenreClassification, ANIME_GENRES);
  } catch (e) {
    console.error('Failed to classify genres with Gemini', e);
  }

  const animeList = works.map((work: any): Anime => {
    const enriched = enrichedDataMap.get(work.annictId);
    const translatedSynopsis = translatedSynopsesMap[work.title];
    return {
      id: work.annictId,
      title: work.title,
      imageUrl: work.image?.recommendedImageUrl || work.image?.facebookOgImageUrl || 'https://picsum.photos/400/600',
      season: `${work.seasonYear}-${work.seasonName?.toLowerCase()}`,
      streamingServices: getStreamingServices(work.annictId),
      score: enriched?.score || null,
      genres: genresMap[work.title] || [],
      description: translatedSynopsis || 'この作品のあらすじは、現在外部データベースで利用できません。',
    };
  });

  try {
    const cachePayload = {
      timestamp: Date.now(),
      data: animeList,
    };
    localStorage.setItem(cacheKey, JSON.stringify(cachePayload));
    console.log(`Saved fresh data to cache for season: ${season}.`);
  } catch (error) {
    console.error("Error writing data to localStorage.", error);
  }

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
              ... on Person {
                name
              }
              ... on Organization {
                name
              }
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

export const fetchPrequelInfo = async (currentAnimeTitle: string): Promise<Prequel | null> => {
  console.log(`Searching for prequel for: "${currentAnimeTitle}" using Gemini.`);
  
  // Step 1: Use Gemini with Google Search to find the prequel's title.
  const prequelTitle = await findPrequelTitle(currentAnimeTitle);

  if (!prequelTitle) {
    console.log("Gemini did not find a prequel title.");
    return null;
  }
  
  console.log(`Gemini found potential prequel title: "${prequelTitle}". Searching Annict.`);

  // Step 2: Use the found title to search Annict for the anime ID.
  try {
    const data = await fetchAnnict(searchByTitleQuery, { title: prequelTitle });
    const prequelWork = data?.searchWorks?.nodes?.[0];

    if (prequelWork?.annictId && prequelWork?.title) {
       // Avoid linking to the same anime
      if (prequelWork.title === currentAnimeTitle) {
        console.log("Prequel search returned the same anime. Ignoring.");
        return null;
      }
      console.log(`Found Annict ID ${prequelWork.annictId} for prequel "${prequelWork.title}".`);
      return {
        id: prequelWork.annictId,
        title: prequelWork.title,
      };
    } else {
      console.warn(`Could not find an exact Annict match for title: "${prequelTitle}"`);
      return null;
    }
  } catch (error) {
    console.error(`Failed to search Annict for title "${prequelTitle}":`, error);
    return null;
  }
};

export const fetchStreamingServices = async (title: string): Promise<string[]> => {
  console.log(`Searching for streaming services for: "${title}" using Gemini.`);
  try {
    const services = await geminiFindStreamingServices(title);
    return services;
  } catch (error) {
    console.error(`Failed to fetch streaming services for "${title}":`, error);
    return [];
  }
};

export const getAnimeDetails = async (id: number): Promise<AnimeDetail | null> => {
  console.log(`Fetching details for anime ID: ${id}`);
  const data = await fetchAnnict(detailQuery, { id: [id] });
  
  const work = data?.searchWorks?.nodes?.[0];

  if (!work) {
    return null;
  }

  const seasonIdentifier = `${work.seasonYear}-${work.seasonName?.toLowerCase()}`;
  const cacheKey = `${CACHE_PREFIX}${seasonIdentifier}`;
  let descriptionFromCache = 'あらすじを読み込み中です...';

  try {
    const cachedItem = localStorage.getItem(cacheKey);
    if (cachedItem) {
      const { data: cachedAnimeList } = JSON.parse(cachedItem) as { data: Anime[] };
      const cachedAnime = cachedAnimeList.find(a => a.id === id);
      if (cachedAnime && cachedAnime.description) {
        descriptionFromCache = cachedAnime.description;
      } else {
        descriptionFromCache = 'この作品のあらすじは、一覧ページで取得されます。一覧に戻ってから再度お試しください。';
      }
    } else {
        descriptionFromCache = 'この作品のあらすじは、一覧ページで取得されます。一覧に戻ってから再度お試しください。';
    }
  } catch (error) {
    console.error("Could not read description from cache for detail page", error);
    descriptionFromCache = 'あらすじの読み込みに失敗しました。';
  }
  
  const jikanResponse = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(work.title)}&limit=1`);
  let score = null;
  if (jikanResponse.ok) {
      const jikanData = await jikanResponse.json();
      score = jikanData?.data?.[0]?.score || null;
  }

  return {
    id: work.annictId,
    title: work.title,
    imageUrl: work.image?.recommendedImageUrl || work.image?.facebookOgImageUrl || 'https://picsum.photos/400/600',
    season: `${work.seasonYear}-${work.seasonName?.toLowerCase()}`,
    streamingServices: getStreamingServices(work.annictId),
    description: descriptionFromCache,
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
    genres: [], // Genres are fetched on the home page, not detail
    score: score,
  };
};
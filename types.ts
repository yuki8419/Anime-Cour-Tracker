
export interface Anime {
  id: number;
  title: string;
  imageUrl: string;
  season: string; // e.g., "2025-winter"
  streamingServices: string[];
  genres: string[];
  score: number | null;
  description: string;
  prequel: Prequel | null;
}

export interface Episode {
  id: number;
  number: string; // Annict provides numberText e.g., "第1話"
  title: string | null;
}

export interface CastMember {
  id: number; // character annictId
  character: string;
  voiceActor: string;
}

export interface StaffMember {
  id: number; // staff annictId
  role: string;
  name: string;
}

export interface Prequel {
  id: number;
  title: string;
}

export interface AnimeDetail extends Anime {
  officialSiteUrl: string | null;
  twitterUrl: string | null;
  episodes: Episode[];
  cast: CastMember[];
  staff: StaffMember[];
}

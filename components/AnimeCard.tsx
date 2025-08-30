
import React from 'react';
import { Link } from 'react-router-dom';
import type { Anime } from '../types';
import Pill from './Pill';

interface AnimeCardProps {
  anime: Anime;
}

const StarRating: React.FC<{ score: number | null }> = ({ score }) => {
  if (score === null || score === 0) {
    return null;
  }
  
  const fullStars = Math.floor(score);
  const halfStar = score % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  return (
    <div className="flex items-center" aria-label={`評価: ${score.toFixed(1)}点`}>
      {[...Array(fullStars)].map((_, i) => <span key={`full-${i}`} className="text-yellow-400">★</span>)}
      {halfStar > 0 && <span className="text-yellow-400">★</span>} 
      {[...Array(emptyStars)].map((_, i) => <span key={`empty-${i}`} className="text-gray-300">★</span>)}
      <span className="text-sm text-text-secondary ml-1.5 font-medium">{score.toFixed(1)}</span>
    </div>
  );
};

const RecommendationRating: React.FC<{ score: number | null }> = ({ score }) => {
  if (score === null || score === 0) {
    return null;
  }
  
  const fullStars = Math.floor(score);
  const emptyStars = 5 - fullStars;

  return (
    <div className="flex items-center" aria-label={`おすすめ度: ${score}点`}>
      {[...Array(fullStars)].map((_, i) => <span key={`rec-full-${i}`} className="text-blue-500">☆</span>)}
      {[...Array(emptyStars)].map((_, i) => <span key={`rec-empty-${i}`} className="text-gray-300">☆</span>)}
      <span className="text-xs text-text-secondary ml-1">おすすめ度</span>
    </div>
  );
};

const AnimeCard: React.FC<AnimeCardProps> = ({ anime }) => {
  return (
    <Link 
      to={`/anime/${anime.id}`} 
      className="group flex flex-col bg-surface rounded-lg overflow-hidden shadow-lg hover:shadow-primary/50 transition-all duration-300 transform hover:-translate-y-1 h-full"
    >
      <div className="aspect-video overflow-hidden">
        <img
          src={anime.imageUrl}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-base font-bold text-text-primary group-hover:text-primary transition-colors duration-200 line-clamp-2 h-12 mb-2">{anime.title}</h3>
        
        <div className="mt-auto space-y-2">
          <StarRating score={anime.score ? anime.score / 2 : null} />
          <RecommendationRating score={anime.recommendationScore || null} />
          <div className="flex flex-wrap gap-1.5">
            {anime.genres.slice(0, 2).map(genre => (
              <Pill key={genre} text={genre} />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default AnimeCard;
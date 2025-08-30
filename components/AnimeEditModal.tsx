import React, { useState, useEffect } from 'react';
import type { Anime } from '../types';
import type { SavedAnimeData } from '../services/dataService';
import { saveAnimeData, getSavedAnimeData } from '../services/dataService';
import { STREAMING_SERVICES, ANIME_GENRES } from '../constants';

interface AnimeEditModalProps {
  anime: Anime;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const AnimeEditModal: React.FC<AnimeEditModalProps> = ({ anime, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<SavedAnimeData>({
    id: anime.id,
    title: anime.title,
    description: anime.description,
    genres: anime.genres,
    streamingServices: anime.streamingServices,
    isVisible: true,
    customImageUrl: '',
    lastModified: Date.now()
  });

  useEffect(() => {
    if (isOpen) {
      const savedData = getSavedAnimeData();
      const existingData = savedData[anime.id];
      
      setFormData({
        id: anime.id,
        title: existingData?.title || anime.title,
        description: existingData?.description || anime.description,
        genres: existingData?.genres || anime.genres,
        streamingServices: existingData?.streamingServices || anime.streamingServices,
        isVisible: existingData?.isVisible ?? true,
        customImageUrl: existingData?.customImageUrl || '',
        lastModified: Date.now()
      });
    }
  }, [anime, isOpen]);

  const handleSave = () => {
    try {
      saveAnimeData(formData);
      onSave();
      onClose();
    } catch (error) {
      alert('保存に失敗しました');
    }
  };

  const handleGenreToggle = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const handleStreamingToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      streamingServices: prev.streamingServices.includes(serviceId)
        ? prev.streamingServices.filter(s => s !== serviceId)
        : [...prev.streamingServices, serviceId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-text-primary">アニメ情報編集</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">タイトル</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">あらすじ</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">カスタム画像URL（オプション）</label>
              <input
                type="url"
                value={formData.customImageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, customImageUrl: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">ジャンル</label>
              <div className="flex flex-wrap gap-2">
                {ANIME_GENRES.map(genre => (
                  <button
                    key={genre}
                    onClick={() => handleGenreToggle(genre)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      formData.genres.includes(genre)
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-text-secondary hover:bg-gray-300'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">配信サービス</label>
              <div className="flex flex-wrap gap-2">
                {STREAMING_SERVICES.map(service => (
                  <button
                    key={service.id}
                    onClick={() => handleStreamingToggle(service.id)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      formData.streamingServices.includes(service.id)
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-text-secondary hover:bg-gray-300'
                    }`}
                  >
                    {service.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isVisible"
                checked={formData.isVisible}
                onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="isVisible" className="ml-2 text-sm text-text-secondary">
                ユーザーに表示する
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-secondary bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeEditModal;
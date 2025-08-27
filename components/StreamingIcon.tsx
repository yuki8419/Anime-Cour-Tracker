import React from 'react';
import { STREAMING_SERVICES } from '../constants';
// FIX: Import the Pill component to resolve the "Cannot find name 'Pill'" error.
import Pill from './Pill';

interface StreamingIconProps {
  serviceId: string;
}

const StreamingIcon: React.FC<StreamingIconProps> = ({ serviceId }) => {
  const service = STREAMING_SERVICES.find(s => s.id === serviceId);

  const getIcon = (id: string): React.ReactNode => {
    switch (id) {
      case 'netflix':
        return <span className="text-2xl font-bold tracking-widest text-[#E50914]">NETFLIX</span>;
      case 'amazon_prime_video':
        return <span className="text-lg font-bold text-[#00A8E1]">prime video</span>;
      case 'hulu':
        return <span className="text-2xl font-black text-[#1CE783]">hulu</span>;
      case 'crunchyroll':
        return <span className="text-xl font-bold text-[#F47521]">Crunchyroll</span>;
      case 'disney_plus':
        return <span className="text-xl font-bold text-[#01153b]">Disney+</span>;
      default:
        return <span>{service?.name || serviceId}</span>;
    }
  };

  if (!service) {
    return <Pill text={serviceId} />;
  }

  return (
    <div className="bg-gray-100 border border-gray-200 rounded-md p-3 flex items-center justify-center h-12 w-40" title={service.name}>
      {getIcon(service.id)}
    </div>
  );
};

export default StreamingIcon;
import React from 'react';

interface PillProps {
  text: string;
  className?: string;
}

const Pill: React.FC<PillProps> = ({ text, className = '' }) => {
  return (
    <span className={`inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full ${className}`}>
      {text}
    </span>
  );
};

export default Pill;
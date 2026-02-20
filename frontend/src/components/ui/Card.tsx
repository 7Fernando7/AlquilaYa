/**
 * Elegant Card component with modern styling
 */

import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  elevated?: boolean;
}

export function Card({ children, className = '', onClick, elevated = false }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-2xl border border-gray-100 p-6
        transition-all duration-300
        ${elevated ? 'shadow-elevated hover:shadow-xl' : 'shadow-md hover:shadow-lg'}
        ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

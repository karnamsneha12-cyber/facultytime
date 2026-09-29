import React from 'react';
import { Faculty } from '../types';

interface FacultyAvatarProps {
  faculty: Faculty;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const FacultyAvatar: React.FC<FacultyAvatarProps> = ({ 
  faculty, 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-14 h-14 text-base'
  };

  const bgGradient = faculty.colorBg || 'from-blue-600 to-indigo-600';

  return (
    <div 
      className={`rounded-2xl bg-gradient-to-tr ${bgGradient} flex items-center justify-center font-extrabold text-white shadow-md select-none shrink-0 tracking-wider ${sizeClasses[size]} ${className}`}
      title={faculty.name}
    >
      <span>{faculty.initials}</span>
    </div>
  );
};

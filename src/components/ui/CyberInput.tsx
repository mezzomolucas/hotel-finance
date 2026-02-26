import React, { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface CyberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const CyberInput: React.FC<CyberInputProps> = ({ 
  className, 
  label, 
  ...props 
}) => {
  return (
    <div className="w-full group">
      {label && (
        <label className="block text-xs font-sans font-medium text-gray-400 mb-2 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={cn(
            "w-full bg-white/5 border border-white/10 rounded-lg text-white font-sans px-4 py-3 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-200 placeholder-gray-600",
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
};

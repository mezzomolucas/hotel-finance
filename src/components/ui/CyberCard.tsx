import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface CyberCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  // Removed glowColor prop as we are going minimalist
}

export const CyberCard: React.FC<CyberCardProps> = ({ 
  children, 
  className, 
  title
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass-panel rounded-xl p-6 relative overflow-hidden transition-colors duration-300",
        className
      )}
    >
      {title && (
        <h3 className="font-sans text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">
          {title}
        </h3>
      )}
      
      <div className="relative z-10 w-full">
        {children}
      </div>
    </motion.div>
  );
};

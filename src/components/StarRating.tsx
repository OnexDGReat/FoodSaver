import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface StarRatingProps {
  maxRating?: number;
  initialRating?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: number;
  className?: string;
}

export function StarRating({
  maxRating = 5,
  initialRating = 0,
  onRate,
  readonly = false,
  size = 24,
  className
}: StarRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  const handleRate = (value: number) => {
    if (readonly) return;
    setRating(value);
    if (onRate) onRate(value);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[...Array(maxRating)].map((_, i) => {
        const starValue = i + 1;
        const isActive = (hover || rating) >= starValue;
        
        return (
          <motion.button
            key={i}
            type="button"
            whileHover={!readonly ? { scale: 1.2 } : {}}
            whileTap={!readonly ? { scale: 0.9 } : {}}
            onMouseEnter={() => !readonly && setHover(starValue)}
            onMouseLeave={() => !readonly && setHover(0)}
            onClick={() => handleRate(starValue)}
            className={cn(
              "transition-colors",
              readonly ? "cursor-default" : "cursor-pointer",
              isActive ? "text-yellow-400" : "text-gray-200"
            )}
          >
            <Star 
              size={size} 
              fill={isActive ? "currentColor" : "none"} 
              strokeWidth={isActive ? 0 : 2}
            />
          </motion.button>
        );
      })}
    </div>
  );
}

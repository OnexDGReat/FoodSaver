import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutGrid, 
  Utensils, 
  Croissant, 
  Coffee, 
  ShoppingBag, 
  Fish, 
  IceCream, 
  Leaf 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CATEGORIES } from '../constants';
import { motion } from 'motion/react';

interface CategorySelectorProps {
  selectedCategory: string;
  onSelect: (category: string) => void;
  className?: string;
  showIcons?: boolean;
}

const ICON_MAP: Record<string, any> = {
  'All': LayoutGrid,
  'Meals': Utensils,
  'Bakery': Croissant,
  'Drinks': Coffee,
  'Groceries': ShoppingBag,
  'Sushi': Fish,
  'Desserts': IceCream,
  'Salads': Leaf
};

export function CategorySelector({ 
  selectedCategory, 
  onSelect, 
  className,
  showIcons = true 
}: CategorySelectorProps) {
  const navigate = useNavigate();

  return (
    <section className={cn("overflow-x-auto no-scrollbar py-4 -mx-6 mb-2", className)}>
      <div className="flex gap-4 px-6 min-w-max">
        {CATEGORIES.map((cat, index) => {
          const Icon = ICON_MAP[cat] || LayoutGrid;
          const isActive = selectedCategory === cat;
          
          return (
            <motion.button
              key={cat}
              initial={false}
              animate={{ 
                scale: isActive ? 1.05 : 1,
                y: isActive ? -2 : 0
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                onSelect(cat);
                // If we are not on explore, maybe we want to navigate (optional behavior)
                // But usually selector is local state. 
                // Let's keep it flexible.
              }}
              className={cn(
                'relative flex items-center gap-2.5 px-5 py-3 rounded-[20px] whitespace-nowrap font-bold text-sm transition-all duration-300 shrink-0',
                isActive 
                  ? 'bg-primary text-white shadow-xl shadow-primary/25 z-10' 
                  : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-100/80'
              )}
            >
              {showIcons && (
                <Icon 
                  size={18} 
                  className={cn(
                    "transition-transform duration-300",
                    isActive ? "scale-110" : "opacity-70"
                  )} 
                />
              )}
              <span>{cat}</span>
              
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-primary rounded-[20px] -z-10"
                  transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

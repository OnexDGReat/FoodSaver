import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { formatCurrency } from '../lib/utils';
import { Listing } from '../types';

interface ProductDetailModalProps {
  listing: Listing | null;
  onClose: () => void;
  onAddToCart: (quantity: number, extras: any[]) => void;
}

const EXTRA_GROUPS: Record<string, { title: string, choices: { id: string, name: string, price: number }[] }> = {
  Bakery: {
    title: 'Selection',
    choices: [
      { id: 'bakery_1', name: 'Hot Fudge Drizzle', price: 15 },
      { id: 'bakery_2', name: 'Cream Cheese', price: 35 },
      { id: 'bakery_3', name: 'Sprinkles', price: 10 },
    ]
  },
  Drinks: {
    title: 'Customization',
    choices: [
      { id: 'drink_1', name: 'Extra Ice', price: 0 },
      { id: 'drink_2', name: 'Coffee Jelly', price: 25 },
      { id: 'drink_3', name: 'Less Sugar', price: 0 },
    ]
  },
  Meals: {
    title: 'Combo Add-ons',
    choices: [
      { id: 'meal_1', name: 'Extra Rice', price: 48 },
      { id: 'meal_2', name: 'Extra Gravy', price: 12 },
      { id: 'meal_3', name: 'Large Fries', price: 35 },
    ]
  },
  'Street Food': {
    title: 'Dips & Sauces',
    choices: [
      { id: 'street_1', name: 'Spicy Vinegar', price: 0 },
      { id: 'street_2', name: 'Sweet Sauce', price: 0 },
    ]
  },
  Default: {
    title: 'Extras',
    choices: [
      { id: 'def_1', name: 'Utensils', price: 0 },
      { id: 'def_2', name: 'Extra Cheese', price: 35 },
      { id: 'def_3', name: 'Hot Sauce', price: 0 },
    ]
  }
};

export function ProductDetailModal({ listing, onClose, onAddToCart }: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  if (!listing) return null;

  const getExtraGroup = () => {
    if (listing.category === 'Bakery') return EXTRA_GROUPS.Bakery;
    if (listing.category === 'Drinks') return EXTRA_GROUPS.Drinks;
    if (listing.category === 'Meals') return EXTRA_GROUPS.Meals;
    if (listing.category === 'Street Food') return EXTRA_GROUPS['Street Food'];
    return EXTRA_GROUPS.Default;
  };

  const currentGroup = getExtraGroup();
  const extras = currentGroup.choices;

  const handleToggleExtra = (id: string) => {
    setSelectedExtras(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const totalPrice = (listing.rescuePrice + extras
    .filter(e => selectedExtras.includes(e.id))
    .reduce((acc, curr) => acc + curr.price, 0)) * quantity;

  return (
    <AnimatePresence>
      {listing && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 top-0 md:top-20 bg-white z-[70] rounded-t-[32px] overflow-hidden flex flex-col max-w-lg mx-auto"
          >
            {/* Header / Image Area */}
            <div className="relative h-72 shrink-0">
              <img src={listing.photo} className="w-full h-full object-cover" alt={listing.name} />
              <button 
                onClick={onClose}
                className="absolute top-6 left-6 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <X size={20} className="text-gray-900" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                  {listing.name}
                </h2>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-400">from {formatCurrency(listing.rescuePrice)}</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed pt-2">
                  {listing.description}
                </p>
              </div>

              {/* Sections for Extras */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-gray-900">{currentGroup.title}</span>
                      <span className="text-xs text-gray-400 font-bold">Select as many as you like</span>
                    </div>
                    <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">Optional</span>
                  </div>
                  
                  <div className="space-y-3">
                    {extras.map(extra => (
                      <div 
                        key={extra.id}
                        onClick={() => handleToggleExtra(extra.id)}
                        className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <span className="font-bold text-gray-800">{extra.name}</span>
                        <div className="flex items-center gap-4">
                          <span className={`${extra.price === 0 ? 'text-emerald-500' : 'text-gray-400'} text-sm font-black`}>
                            {extra.price === 0 ? 'FREE' : `+ ${formatCurrency(extra.price)}`}
                          </span>
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            selectedExtras.includes(extra.id) 
                              ? 'bg-[#E11299] border-[#E11299] text-white shadow-lg shadow-[#E11299]/20' 
                              : 'border-gray-100'
                          }`}>
                            {selectedExtras.includes(extra.id) && <Check size={14} strokeWidth={4} />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 flex items-center gap-4">
              <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-2 border border-gray-100">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-[#E11299] shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <Minus size={20} />
                </button>
                <span className="w-8 text-center font-black text-lg text-gray-900">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-[#E11299] shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>

              <Button 
                onClick={() => {
                  onAddToCart(quantity, extras.filter(e => selectedExtras.includes(e.id)));
                  onClose();
                }}
                className="flex-1 h-14 bg-[#E11299] hover:bg-[#C90085] text-white rounded-2xl text-lg font-black shadow-lg shadow-[#E11299]/20"
              >
                <span>Add to cart</span>
                <span className="ml-auto">{formatCurrency(totalPrice)}</span>
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

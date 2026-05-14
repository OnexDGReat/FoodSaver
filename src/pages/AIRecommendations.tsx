import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Utensils, Info, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MOCK_LISTINGS, MOCK_USER } from '../services/mockData';
import { getAIRecommendations, AIRecommendationResponse } from '../services/geminiService';
import { Listing } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { useCart } from '../context/CartContext';

export function AIRecommendations() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendationResponse | null>(null);
  const [recommendedListings, setRecommendedListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use actual user if available, fallback to mock
      const currentUser = user || MOCK_USER;
      const result = await getAIRecommendations(currentUser, MOCK_LISTINGS);
      
      const filtered = MOCK_LISTINGS.filter(l => 
        result.recommendedListingIds.includes(l.id)
      );
      
      setRecommendations(result);
      setRecommendedListings(filtered);
    } catch (err: any) {
      setError(err.message || 'Failed to get AI recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDFB] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 p-6 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Sparkles size={20} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-gray-900">AI Meal Picks</h1>
        </div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-10">Smart Rescue Assistant</p>
      </header>

      <div className="flex-1 px-6 pt-6 space-y-8">
        {/* Intro Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary rounded-[24px] p-6 text-white overflow-hidden relative shadow-2xl shadow-primary/20"
        >
          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl font-black leading-tight italic">
              "Hey {user?.name || 'there'}! I've analyzed today's surplus for you."
            </h2>
            <p className="text-primary-foreground/90 font-medium text-sm leading-relaxed max-w-[80%]">
              Based on your preferences, I found these meals that shouldn't go to waste.
            </p>
          </div>
          
          <Sparkles 
            size={120} 
            className="absolute -right-8 -bottom-8 text-white/10 rotate-12" 
          />
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-primary"
            >
              <RefreshCw size={40} />
            </motion.div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Consulting the menu...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 rounded-2xl border border-red-100 text-center space-y-4">
            <Info className="mx-auto text-red-500" size={32} />
            <p className="text-red-600 font-bold text-sm italic leading-relaxed">{error}</p>
            <button 
              onClick={fetchRecommendations}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-sm"
            >
              Try Again
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {recommendations?.reason && (
                <div className="flex gap-3 items-start bg-white p-4 rounded-2xl border border-gray-100 shadow-sm shadow-black/5">
                  <div className="w-6 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Utensils size={14} />
                  </div>
                  <p className="text-gray-600 text-sm font-medium leading-relaxed italic">
                    "{recommendations.reason}"
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 pb-8">
                {recommendedListings.map((listing, idx) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card
                      onClick={() => setSelectedListing(listing)}
                      className="group overflow-hidden bg-white hover:border-primary/20 transition-all duration-300"
                    >
                      <div className="relative h-48">
                        <img 
                          src={listing.photo} 
                          alt={listing.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                          <div className="space-y-1">
                            <Badge variant="accent" className="backdrop-blur-md bg-white/20 text-white border-white/30">
                              {listing.restaurantName}
                            </Badge>
                            <h3 className="text-white font-black text-lg truncate leading-tight">
                              {listing.name}
                            </h3>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-white font-black text-lg">{formatCurrency(listing.rescuePrice)}</span>
                            <span className="text-white/60 line-through text-xs font-bold">{formatCurrency(listing.originalPrice)}</span>
                          </div>
                        </div>
                        <div className="absolute top-4 right-4">
                           <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-primary transform scale-0 group-hover:scale-100 transition-transform duration-300">
                             <Sparkles size={20} />
                           </div>
                        </div>
                      </div>
                      
                      <div className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{listing.quantity} remaining</span>
                         </div>
                         <button className="text-primary font-black text-sm flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                           Rescue This <ArrowRight size={14} />
                         </button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center pt-4">
                <button 
                  onClick={fetchRecommendations}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-[20px] font-black italic shadow-xl active:scale-95 transition-all"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  <span>REFRESH PICKS</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {selectedListing && (
        <ProductDetailModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onAddToCart={(quantity, extras) => {
            const unitPrice = selectedListing.rescuePrice + extras.reduce((sum, e) => sum + e.price, 0);
            addItem({
              listingId: selectedListing.id,
              name: selectedListing.name,
              price: unitPrice,
              quantity,
              extras,
              restaurantId: selectedListing.restaurantId,
              restaurantName: selectedListing.restaurantName,
              photo: selectedListing.photo
            });
            setSelectedListing(null);
          }}
        />
      )}
    </div>
  );
}

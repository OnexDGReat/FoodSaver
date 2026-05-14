import { useParams, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Star, Clock, MapPin, Plus, Minus, Info } from 'lucide-react';
import { MOCK_RESTAURANTS, MOCK_LISTINGS } from '../services/mockData';
import { Restaurant, Listing } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../lib/utils';
import { useCart } from '../context/CartContext';
import { ProductDetailModal } from '../components/ProductDetailModal';

export function RestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, items, removeItem } = useCart();
  const [selectedProduct, setSelectedProduct] = useState<Listing | null>(null);
  
  const restaurant = MOCK_RESTAURANTS.find(r => r.id === id);
  const listings = MOCK_LISTINGS.filter(l => l.restaurantId === id);

  if (!restaurant) return <div>Restaurant not found</div>;

  return (
    <div className="flex flex-col bg-white min-h-full relative font-sans">
      <ProductDetailModal 
        listing={selectedProduct} 
        onClose={() => setSelectedProduct(null)}
        onAddToCart={(quantity, extras) => {
          if (selectedProduct) {
            const unitPrice = selectedProduct.rescuePrice + extras.reduce((sum, e) => sum + e.price, 0);
            addItem({
              listingId: selectedProduct.id,
              name: selectedProduct.name,
              price: unitPrice,
              quantity: quantity,
              extras,
              restaurantId: selectedProduct.restaurantId,
              restaurantName: selectedProduct.restaurantName,
              photo: selectedProduct.photo
            });
            setSelectedProduct(null);
          }
        }}
      />
      
      {/* Cover Image */}
      <div className="relative h-64">
        <img src={restaurant.cover} className="w-full h-full object-cover" />
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 -mt-12 relative z-10 pb-12">
        <Card className="p-6 mb-8 shadow-xl border-none">
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-gray-900 leading-tight">{restaurant.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1 text-accent font-black">
                  <Star size={16} fill="currentColor" />
                  <span>{restaurant.rating}</span>
                </div>
                <span className="text-gray-400 font-medium tracking-tight">({restaurant.reviewsCount} reviews)</span>
              </div>
            </div>
            <img src={restaurant.logo} className="w-16 h-16 rounded-2xl border-4 border-white shadow-md object-cover" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-xl text-primary">
                <Clock size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pickup Window</span>
                <span className="text-xs font-bold">{restaurant.pickupWindow.start} - {restaurant.pickupWindow.end}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 rounded-xl text-accent">
                <MapPin size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Distance</span>
                <span className="text-xs font-bold">{restaurant.distance} km</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Listings */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-gray-900 border-l-4 border-primary pl-4">Available Rescues</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {listings.map(listing => (
              <Card 
                key={listing.id} 
                className="p-4 flex gap-4 cursor-pointer hover:bg-gray-50 border-transparent hover:border-gray-100 transition-all active:scale-[0.98]"
                onClick={() => setSelectedProduct(listing)}
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                  <img src={listing.photo} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 line-clamp-1">{listing.name}</h4>
                    <p className="text-gray-500 text-xs line-clamp-1 mt-0.5">{listing.description}</p>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="flex flex-col">
                      <span className="text-primary font-black text-lg">{formatCurrency(listing.rescuePrice)}</span>
                      <span className="text-gray-400 text-[10px] line-through font-bold">{formatCurrency(listing.originalPrice)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(listing);
                        }}
                        className="h-9 px-4 rounded-xl shadow-sm bg-[#E11299] hover:bg-[#C90085] text-white text-[10px] font-black italic uppercase tracking-widest"
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 font-sans">
            <div className="bg-gray-50 rounded-2xl p-4 flex items-start gap-3">
              <Info size={20} className="text-gray-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-sm text-gray-900">Why are prices so low?</span>
                <p className="text-xs text-gray-500 leading-relaxed">
                  These items are surplus from today's production. By rescuing them, you help reduce food waste and save money!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


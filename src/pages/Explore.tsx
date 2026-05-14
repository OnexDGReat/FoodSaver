import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, MapPin, Star, Timer } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { MOCK_RESTAURANTS } from '../services/mockData';
import { CategorySelector } from '../components/CategorySelector';
import { cn } from '../lib/utils';
import { useNavigate, useLocation } from 'react-router-dom';

export function Explore() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialCategory = location.state?.category || 'All';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (location.state?.category) {
      setSelectedCategory(location.state.category);
    }
  }, [location.state?.category]);

  const filteredRestaurants = MOCK_RESTAURANTS.filter(rest => {
    const matchesCategory = selectedCategory === 'All' || rest.categories.includes(selectedCategory);
    const matchesSearch = rest.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          rest.categories.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-white">
      <header className="px-6 py-6 space-y-6">
        <h1 className="text-3xl font-black text-gray-900">Explore Deals</h1>
        
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search food or restaurant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 bg-gray-100 rounded-2xl pl-12 pr-4 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button className="h-12 w-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-600">
            <SlidersHorizontal size={20} />
          </button>
        </div>

        {/* Quick Categories Bar */}
        <CategorySelector 
          selectedCategory={selectedCategory} 
          onSelect={setSelectedCategory}
          className="py-1"
        />
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Showing {filteredRestaurants.length} Results
          </span>
          <div className="flex items-center gap-1 text-primary">
            <MapPin size={14} />
            <span className="text-xs font-bold">Within 5km</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {filteredRestaurants.map(rest => (
            <Card 
              key={rest.id} 
              onClick={() => navigate(`/restaurant/${rest.id}`)}
              className="group border-none shadow-none"
            >
              <div className="relative h-48 rounded-3xl overflow-hidden mb-3">
                <img src={rest.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge variant="accent" className="shadow-lg">Save up to 60%</Badge>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-sm border border-white/50">
                    <Timer size={14} className="text-accent" />
                    <span className="text-xs font-black text-gray-900">Rescue by {rest.pickupWindow.end}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-lg text-gray-900">{rest.name}</h4>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{rest.categories.join(', ')}</p>
                </div>
                <div className="flex items-center gap-1 bg-primary/5 text-primary px-2 py-1 rounded-lg font-black text-sm">
                  <Star size={14} fill="currentColor" />
                  <span>{rest.rating}</span>
                </div>
              </div>
            </Card>
          ))}
          
          {filteredRestaurants.length === 0 && (
            <div className="py-20 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                <Search size={32} />
              </div>
              <p className="text-gray-400 font-bold">No deals found matching your search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

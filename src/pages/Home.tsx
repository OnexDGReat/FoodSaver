import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Bell, ShoppingCart, Timer, TrendingDown, Leaf, X, Plus, CheckCircle2, Sparkles, ArrowRight as ArrowRightIcon } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { MOCK_RESTAURANTS, MOCK_LISTINGS } from '../services/mockData';
import { CategorySelector } from '../components/CategorySelector';
import { formatCurrency, cn } from '../lib/utils';
import { differenceInMinutes, parseISO } from 'date-fns';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useAddresses } from '../hooks/useAddresses';

export function Home() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [time, setTime] = useState(new Date());
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [modalView, setModalView] = useState<'list' | 'add'>('list');
  const [newAddrType, setNewAddrType] = useState('Address');
  const [newAddrDetails, setNewAddrDetails] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const navigate = useNavigate();
  const { count } = useCart();
  const { profile, selectedAddressIndex, setSelectedAddressIndex } = useAuth();
  const { addresses, addAddress } = useAddresses();

  const currentAddress = addresses[selectedAddressIndex] || { label: 'Davao City', fullAddress: 'Tap to set address' };

  const handleQuickAdd = async () => {
    if (!newAddrDetails) return;
    setIsAdding(true);
    try {
      await addAddress({ 
        label: newAddrType, 
        fullAddress: newAddrDetails,
        isDefault: addresses.length === 0
      });
      setNewAddrDetails('');
      setModalView('list');
      setShowAddressModal(false);
    } catch (error) {
      console.error(error);
      alert("Failed to add address.");
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-6 pt-4">
      {/* Header */}
      <header className="px-6 flex items-center justify-between pt-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.1em]">Delivering to</span>
          <button 
            onClick={() => setShowAddressModal(true)}
            className="flex items-center gap-1 text-gray-900 group cursor-pointer text-left outline-none"
          >
            <span className="font-black text-lg text-gray-900 italic tracking-tight truncate max-w-[150px]">
              {currentAddress.label === 'Davao City' ? 'Davao City' : (currentAddress.label || currentAddress.fullAddress.split(',')[0])}
            </span>
            <MapPin size={14} className="text-primary group-hover:scale-110 transition-transform shrink-0" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-gray-600 hover:bg-gray-100 transition-colors">
            <Search size={20} />
          </button>
          <button 
            onClick={() => navigate('/cart')}
            className="p-3 bg-primary text-white border border-primary/20 rounded-2xl relative shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
          >
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-black">
                {count}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="px-6">
        <Card 
          className="bg-primary p-6 relative overflow-hidden border-none shadow-xl shadow-primary/10 cursor-pointer"
          onClick={() => navigate('/explore')}
        >
          <div className="relative z-10">
            <Badge variant="accent" className="mb-3 bg-white/20 text-white border-none">Flash Deals</Badge>
            <h2 className="text-white text-2xl font-black leading-tight mb-4">
              Rescue Today's Deals <br />Up to 70% Off
            </h2>
            <Button size="sm" variant="outline" className="bg-white border-none text-primary hover:bg-white/90">
              Explore Now
            </Button>
          </div>
          <motion.div 
            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -right-6 -bottom-6 opacity-30 text-white"
          >
             <Leaf size={140} fill="currentColor" />
          </motion.div>
        </Card>
      </section>

      {/* Categories */}
      <CategorySelector 
        selectedCategory={selectedCategory} 
        onSelect={(cat) => {
          setSelectedCategory(cat);
          navigate('/explore', { state: { category: cat } });
        }} 
      />

      {/* AI Recommendation Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate('/ai-picks')}
        className="relative overflow-hidden p-6 rounded-[32px] bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-2xl shadow-gray-900/20 cursor-pointer group"
      >
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">New Feature</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black italic">Meal Matching AI</h3>
            <p className="text-gray-400 text-sm font-medium leading-relaxed">
              Find your perfect rescue meal with Gemini AI.
            </p>
          </div>
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest pt-2">
            <span>Try it now</span>
            <ArrowRightIcon size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
        
        <Sparkles 
          size={120} 
          className="absolute -right-8 -bottom-8 text-white/5 rotate-12 group-hover:scale-110 transition-transform duration-500" 
        />
      </motion.div>

      {/* Ending Soon */}
      <section className="flex flex-col gap-4">
        <div className="px-6 flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-900">Ending Soon</h3>
          <button 
            onClick={() => navigate('/explore')}
            className="text-primary font-bold text-sm hover:underline"
          >
            See All
          </button>
        </div>
        <div className="flex overflow-x-auto px-6 gap-4 no-scrollbar snap-x snap-mandatory">
          {MOCK_LISTINGS.map(listing => {
            const minutesLeft = differenceInMinutes(parseISO(listing.expiryTime), time);
            return (
              <Card 
                key={listing.id} 
                onClick={() => navigate(`/restaurant/${listing.restaurantId}`)}
                className="min-w-[280px] w-[280px] relative group h-full snap-center"
              >
                <div className="relative h-40 overflow-hidden">
                  <img 
                    src={listing.photo} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1.5 shadow-sm border border-white/50">
                    <Timer size={14} className="text-accent" />
                    <span className={cn(
                      "text-xs font-black",
                      minutesLeft < 60 ? "text-red-500 animate-pulse" : "text-gray-900"
                    )}>
                      {minutesLeft}m left
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-primary text-white px-2 py-1 rounded-lg font-black text-xs shadow-lg">
                    Save {Math.round((1 - listing.rescuePrice/listing.originalPrice) * 100)}%
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">{listing.restaurantName}</span>
                  <h4 className="font-bold text-gray-900 line-clamp-1">{listing.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-primary font-black text-lg">{formatCurrency(listing.rescuePrice)}</span>
                    <span className="text-gray-400 text-sm line-through font-medium">{formatCurrency(listing.originalPrice)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Near You */}
      <section className="flex flex-col gap-4 px-6 pb-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-900">Near You</h3>
          <button 
            onClick={() => navigate('/explore')}
            className="text-primary font-bold text-sm hover:underline"
          >
            See All
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {MOCK_RESTAURANTS.map(rest => (
            <Card 
              key={rest.id} 
              onClick={() => navigate(`/restaurant/${rest.id}`)}
              className="flex h-32 group"
            >
              <div className="w-32 overflow-hidden shrink-0">
                <img 
                  src={rest.logo} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
              </div>
              <div className="flex-1 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="font-bold text-gray-900 line-clamp-1">{rest.name}</h4>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-gray-900">★ {rest.rating}</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs font-medium line-clamp-1">{rest.categories.join(', ')}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    <span>{rest.distance}km</span>
                    <span>•</span>
                    <span>{rest.pickupWindow.start}-{rest.pickupWindow.end}</span>
                  </div>
                  <Badge variant="success" className="text-[8px] px-1.5 py-0">Open</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Address Selection Modal */}
      <AnimatePresence>
        {showAddressModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddressModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 relative z-10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900">
                  {modalView === 'list' ? 'Choose Address' : 'Add Address'}
                </h2>
                <button 
                  onClick={() => {
                    if (modalView === 'add') setModalView('list');
                    else setShowAddressModal(false);
                  }} 
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                {modalView === 'list' ? (
                  <>
                    <div className="space-y-3">
                      {addresses.length > 0 ? (
                        addresses.map((addr: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedAddressIndex(idx);
                              setShowAddressModal(false);
                            }}
                            className={cn(
                              "w-full p-4 rounded-2xl border-2 flex items-start gap-4 text-left transition-all",
                              selectedAddressIndex === idx ? "border-primary bg-primary/5" : "border-gray-100 bg-white"
                            )}
                          >
                            <div className={cn(
                              "p-2 rounded-lg shrink-0",
                              selectedAddressIndex === idx ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                            )}>
                              <MapPin size={20} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-gray-900 italic">{addr.label}</span>
                                {selectedAddressIndex === idx && <CheckCircle2 size={16} className="text-primary" />}
                              </div>
                              <p className="text-sm text-gray-500 font-medium leading-relaxed mt-1">{addr.fullAddress}</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="py-12 flex flex-col items-center opacity-30 text-center">
                          <MapPin size={48} className="mb-4" />
                          <p className="font-bold">No saved addresses</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button 
                        onClick={() => setModalView('add')}
                        className="p-4 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center gap-2 text-gray-400 font-black text-sm uppercase tracking-widest hover:border-primary/20 hover:text-primary transition-all"
                      >
                        <Plus size={18} />
                        <span>Quick Add</span>
                      </button>
                      <button 
                        onClick={() => navigate('/profile')}
                        className="p-4 bg-gray-50 rounded-2xl flex items-center justify-center gap-2 text-gray-400 font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all"
                      >
                        <span>Profile</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="flex gap-2">
                      {['Address', 'Work', 'Other'].map(type => (
                        <button
                          key={type}
                          onClick={() => setNewAddrType(type)}
                          className={cn(
                            "flex-1 py-3 rounded-xl font-bold transition-all",
                            newAddrType === type 
                              ? "bg-primary text-white shadow-lg shadow-primary/20" 
                              : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Address details</label>
                      <textarea 
                        rows={4}
                        value={newAddrDetails}
                        onChange={(e) => setNewAddrDetails(e.target.value)}
                        placeholder="Street, building, unit..."
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-300 resize-none"
                      />
                    </div>

                    <Button 
                      onClick={handleQuickAdd} 
                      className="w-full h-14 rounded-2xl bg-primary text-white"
                      disabled={isAdding}
                    >
                      {isAdding ? 'ADDING...' : 'ADD ADDRESS'}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronLeft, Trash2, ShoppingBag, Leaf, Wallet, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { formatCurrency } from '../lib/utils';

export function Cart() {
  const navigate = useNavigate();
  const { items, total, count, removeItem, clearCart } = useCart();

  if (count === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-6">
          <ShoppingBag size={48} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8">Rescue some delicious food and make an impact today!</p>
        <Button onClick={() => navigate('/')} className="px-8">Start Rescuing</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="px-6 py-4 bg-white flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-gray-900">Your Cart</h1>
        <button 
          onClick={clearCart}
          className="ml-auto text-red-500 font-bold text-sm px-2 py-1"
        >
          Clear
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Items */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Rescue Inventory</h3>
          {items.map(item => (
            <Card key={item.listingId} className="p-4 flex gap-4 bg-white border border-gray-100 shadow-warm">
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{item.name}</h4>
                {item.extras && item.extras.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 mt-0.5">
                    {item.extras.map(extra => (
                      <span key={extra.id} className="text-[10px] font-bold text-gray-400">
                        + {extra.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-primary font-black">{formatCurrency(item.price)}</span>
                  <span className="text-gray-400 text-sm font-medium">x {item.quantity}</span>
                </div>
              </div>
              <button 
                onClick={() => removeItem(item.listingId)}
                className="text-gray-300 hover:text-red-500 transition-colors p-2"
              >
                <Trash2 size={20} />
              </button>
            </Card>
          ))}
        </section>

        {/* Impact Prediction */}
        <section>
          <Card className="bg-primary p-6 border-none text-white relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-black mb-4">Your Impact Today</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Leaf size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black">0.8kg</span>
                    <span className="text-[10px] font-bold uppercase opacity-80">CO2 Saved</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Wallet size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black">{formatCurrency(total * 2)}</span>
                    <span className="text-[10px] font-bold uppercase opacity-80">Money Saved</span>
                  </div>
                </div>
              </div>
            </div>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="absolute -right-12 -bottom-12 opacity-10"
            >
              <Leaf size={200} />
            </motion.div>
          </Card>
        </section>

        {/* Summary */}
        <section className="bg-white rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-500 font-medium">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-gray-500 font-medium">
              <span>Platform Fee</span>
              <span>{formatCurrency(19)}</span>
            </div>
            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
              <span className="text-lg font-black text-gray-900">Total</span>
              <span className="text-2xl font-black text-primary">{formatCurrency(total + 19)}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="p-6 bg-white border-t border-gray-100 safe-area-bottom">
        <Button 
          onClick={() => navigate('/checkout')}
          className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 group shadow-xl shadow-primary/20"
        >
          <span>Go to Checkout</span>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </Button>
      </footer>
    </div>
  );
}

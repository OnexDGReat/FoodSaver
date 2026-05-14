import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Package, 
  Leaf,
  ChevronLeft,
  Timer
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, writeBatch, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatCurrency, cn } from '../lib/utils';
import { format, addMinutes } from 'date-fns';

import { StarRating } from '../components/StarRating';

import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';

export interface OrderItem {
  listingId: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId?: string;
  restaurantName?: string;
  photo?: string;
  extras?: { id: string, name: string, price: number }[];
}

export interface Order {
  id: string;
  docId: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'preparing' | 'delivering' | 'completed' | 'cancelled';
  deliveryType: 'pickup' | 'delivery';
  address?: {
    label: string;
    fullAddress: string;
  };
  createdAt: any;
  completedAt?: any;
  cancelledAt?: any;
  riderRating?: number;
}

export function Orders() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      })) as Order[];
      
      // Sort on client side to avoid index requirement
      ordersList.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      setOrders(ordersList);
      setLoading(false);
    }, (error) => {
      console.error("Orders sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);

  const handleCompleteOrder = async (docId: string) => {
    setIsProcessing(docId);
    try {
      const orderRef = doc(db, 'orders', docId);
      await updateDoc(orderRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error("Error completing order:", error);
      alert("Failed to complete order: " + (error.message || "Permissions check failed"));
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel || !user) return;
    setIsProcessing(orderToCancel);
    try {
      const orderRef = doc(db, 'orders', orderToCancel);
      const orderObj = orders.find(o => o.docId === orderToCancel);

      if (orderObj) {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.uid);
        
        // Calculate item count to decrement
        const itemCount = orderObj.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        // Reverse stats
        batch.set(userRef, {
          mealsSaved: increment(-itemCount),
          savedCO2: increment(-(itemCount * 2.5))
        }, { merge: true });

        // Update Order
        batch.update(orderRef, {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        await batch.commit();
        if (refreshProfile) await refreshProfile();
      } else {
        // Fallback
        await updateDoc(orderRef, {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      setCancelDialogOpen(false);
      setOrderToCancel(null);
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      alert("Failed to cancel order: " + (error.message || "Check if order is already out for delivery"));
    } finally {
      setIsProcessing(null);
    }
  };

  const openCancelDialog = (docId: string) => {
    setOrderToCancel(docId);
    setCancelDialogOpen(true);
  };

  const toggleExpand = (docId: string) => {
    setExpandedOrderId(expandedOrderId === docId ? null : docId);
  };

  const handleRateOrder = async (docId: string, rating: number) => {
    try {
      const orderRef = doc(db, 'orders', docId);
      await updateDoc(orderRef, {
        riderRating: rating,
        updatedAt: serverTimestamp()
      });
    } catch (error: any) {
      console.error("Error rating order:", error);
    }
  };

  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const pastOrders = orders.filter(o => o.status === 'completed' || o.status === 'cancelled');

  const getETA = (order: Order) => {
    if (!order.createdAt) return null;
    const date = order.createdAt?.toDate?.() || new Date(order.createdAt);
    
    if (order.status === 'preparing') {
      return {
        text: 'Preparing your order...',
        subtext: '~15-20 mins remaining',
        time: format(addMinutes(date, 30), 'h:mm a')
      };
    }
    
    if (order.status === 'delivering') {
      return {
        text: 'Estimated Arrival',
        subtext: 'Your rider is on the way',
        time: format(addMinutes(date, 45), 'h:mm a')
      };
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="p-6 pt-12 space-y-6">
        <h1 className="text-3xl font-black text-gray-900">Your Rescues</h1>
        {[1, 2].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col pt-12 gap-8 bg-gray-50 overflow-y-auto pb-24">
      <h1 className="text-3xl font-black text-gray-900">Your Rescues</h1>
      
      {/* Active Orders */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Active Orders</h3>
        {activeOrders.length > 0 ? (
          <AnimatePresence>
            {activeOrders.map((order) => (
              <motion.div
                key={order.docId}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="p-5 space-y-5 bg-white border-none shadow-sm relative overflow-hidden group">
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <Package size={24} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-gray-900 italic">#{order.id}</span>
                        {getETA(order) ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-primary uppercase tracking-wider italic">
                              {getETA(order)?.text}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Timer size={10} className="text-emerald-500" />
                              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                Arriving by {getETA(order)?.time}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-wider">
                              {order.status === 'preparing' ? 'Preparing your food...' : 'Out for delivery'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => toggleExpand(order.docId)}
                      className={cn(
                        "p-2 bg-gray-50 rounded-full hover:bg-primary hover:text-white transition-all",
                        expandedOrderId === order.docId && "bg-primary text-white rotate-90"
                      )}
                    >
                      <ChevronRight size={20} />
                    </button>
                    <button 
                      onClick={() => navigate('/tracking', { state: { order } })}
                      className="p-2 bg-gray-50 rounded-full hover:bg-primary hover:text-white transition-colors"
                    >
                      <Package size={20} />
                    </button>
                  </div>

                  <AnimatePresence>
                    {expandedOrderId === order.docId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-4 border-t border-dashed border-gray-100">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Details</p>
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-black">{item.quantity}x</span>
                                    <span className="font-bold text-gray-800 italic">{item.name}</span>
                                  </div>
                                  <span className="font-bold text-gray-900">{formatCurrency(item.price)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              {order.deliveryType === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
                            </p>
                            <div className="flex items-start gap-2 mt-1">
                              <div className="text-gray-400 mt-0.5">
                                <Leaf size={14} className="rotate-90" />
                              </div>
                              <p className="text-xs font-medium text-gray-600 leading-relaxed">
                                {typeof order.address === 'object' ? order.address.fullAddress : (order.address || (order.deliveryType === 'pickup' ? 'Restaurant Address' : 'No address provided'))}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'preparing' && (
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => openCancelDialog(order.docId)}
                          disabled={isProcessing === order.docId}
                          loading={isProcessing === order.docId}
                          className="h-10 px-4 rounded-xl text-[10px] font-black italic border-red-100 text-red-500 hover:bg-red-50"
                        >
                          CANCEL
                        </Button>
                      )}
                      <Button 
                        size="sm"
                        onClick={() => handleCompleteOrder(order.docId)}
                        disabled={isProcessing === order.docId}
                        loading={isProcessing === order.docId}
                        className={cn(
                          "h-10 px-4 rounded-xl text-[10px] font-black italic shadow-lg transition-all",
                          order.status === 'preparing' 
                            ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                            : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 text-white"
                        )}
                      >
                        {order.status === 'preparing' ? 'I RECEIVED IT EARLY' : 'MARK AS RECEIVED'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="py-8 text-center text-gray-400 bg-white/50 rounded-3xl border-2 border-dashed border-gray-100 italic font-medium">
            No active rescue missions
          </div>
        )}
      </div>

      {/* Past Orders */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Past Rescues</h3>
        {pastOrders.length > 0 ? (
          <div className="space-y-4">
            {pastOrders.map((order) => (
              <Card key={order.docId} className="p-0 border-none bg-white shadow-sm overflow-hidden group">
                <div className="p-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/30">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      order.status === 'completed' ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-400"
                    )}>
                      {order.status === 'completed' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900 italic">#{order.id}</span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {order.items.length} items • {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleExpand(order.docId)}
                      className={cn(
                        "p-2 bg-white rounded-full hover:bg-primary hover:text-white shadow-sm border border-gray-100 transition-all",
                        expandedOrderId === order.docId && "bg-primary text-white rotate-90 border-primary"
                      )}
                    >
                      <ChevronRight size={16} />
                    </button>
                    <div className="text-right hidden sm:block">
                      {order.status === 'completed' ? (
                        <div className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1">
                          <Leaf size={10} />
                          Saved Food
                        </div>
                      ) : (
                        <div className="text-[10px] font-black text-red-400 uppercase">
                          Cancelled
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedOrderId === order.docId && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-gray-50"
                    >
                      <div className="p-4 space-y-4 bg-gray-50/20">
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Details</p>
                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-black">{item.quantity}x</span>
                                  <span className="font-bold text-gray-800 italic">{item.name}</span>
                                </div>
                                <span className="font-bold text-gray-900">{formatCurrency(item.price)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {order.deliveryType === 'delivery' ? 'Delivery Address' : 'Pickup Location'}
                          </p>
                          <p className="text-xs font-medium text-gray-600 mt-1">
                            {typeof order.address === 'object' ? order.address.fullAddress : (order.address || (order.deliveryType === 'pickup' ? 'Restaurant Address' : 'No address provided'))}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {order.status === 'completed' && (
                  <div className="p-4 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img src="https://i.pravatar.cc/150?u=rider_1" className="w-8 h-8 rounded-full border border-gray-100" alt="Rider" />
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Rider Rating</p>
                        <p className="text-xs font-bold text-gray-900 mt-1">Mark Anthoney</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {order.riderRating ? (
                        <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-100">
                          <StarRating readonly initialRating={order.riderRating} size={14} />
                          <span className="text-xs font-black text-yellow-700 italic">{order.riderRating}.0</span>
                        </div>
                      ) : (
                        <StarRating 
                          size={24} 
                          onRate={(r) => handleRateOrder(order.docId, r)} 
                        />
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="pt-8 flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
              <ShoppingBag size={32} />
            </div>
            <h3 className="text-lg font-black text-gray-900">No past orders yet</h3>
            <p className="text-gray-400 text-xs mt-2 max-w-[200px] leading-relaxed">Completed orders will appear here. Start your next rescue mission!</p>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelOrder}
        isLoading={isProcessing === orderToCancel}
        title="Stop Rescue?"
        description="Cancelling this order means this food might go to waste. If the restaurant has already started preparing, you may not be able to cancel later."
        confirmText="STOP RESCUE"
        cancelText="KEEP SAVING"
        variant="danger"
      />
    </div>
  );
}

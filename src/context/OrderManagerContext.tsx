import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface Order {
  docId: string;
  id: string;
  status: 'preparing' | 'delivering' | 'completed' | 'cancelled';
  createdAt: any;
  items: any[];
}

interface OrderManagerContextType {
  activeOrders: Order[];
  arrivalOrder: Order | null;
  closeArrivalPopup: () => void;
}

const OrderManagerContext = createContext<OrderManagerContextType | undefined>(undefined);

// Simulation Durations (in seconds)
const PREPARING_DURATION = 20;
const DELIVERING_DURATION = 40; // Total time to arrival is PREPARING + DELIVERING = 60s

export function OrderManagerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [arrivalOrder, setArrivalOrder] = useState<Order | null>(null);
  const [notifiedOrders, setNotifiedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setActiveOrders([]);
      return;
    }

    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      where('status', 'in', ['preparing', 'delivering'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        ...doc.data(),
        docId: doc.id
      })) as Order[];
      setActiveOrders(orders);
    });

    return () => unsubscribe();
  }, [user]);

  // Status Simulation Effect
  useEffect(() => {
    if (activeOrders.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      
      activeOrders.forEach(async (order) => {
        if (!order.createdAt) return;
        
        const createdTime = order.createdAt?.toDate?.()?.getTime() || 
                           (order.createdAt?.seconds ? order.createdAt.seconds * 1000 : now);
        const elapsedSec = (now - createdTime) / 1000;

        if (order.status === 'preparing' && elapsedSec > PREPARING_DURATION) {
          // Transition to Delivering
          try {
            await updateDoc(doc(db, 'orders', order.docId), {
              status: 'delivering',
              updatedAt: serverTimestamp()
            });
          } catch (e) {
            console.error("Simulation update failed:", e);
          }
        } else if (order.status === 'delivering' && elapsedSec > (PREPARING_DURATION + DELIVERING_DURATION)) {
          // Arrival detection
          if (!notifiedOrders.has(order.docId)) {
            setArrivalOrder(order);
            setNotifiedOrders(prev => new Set(prev).add(order.docId));
          }
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [activeOrders, notifiedOrders]);

  const closeArrivalPopup = () => setArrivalOrder(null);

  return (
    <OrderManagerContext.Provider value={{ activeOrders, arrivalOrder, closeArrivalPopup }}>
      {children}
      
      <AnimatePresence>
        {arrivalOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-emerald-500" />
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500 relative">
                 <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                 <CheckCircle2 size={48} className="relative z-10" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 italic mb-2">Order is here!</h2>
              <p className="text-gray-500 font-medium mb-8">
                Your order from {arrivalOrder.items[0]?.restaurantName || 'the restaurant'} has arrived.
              </p>
              <Button 
                onClick={closeArrivalPopup}
                className="w-full h-14 rounded-2xl bg-primary text-white font-black italic shadow-xl shadow-primary/20"
              >
                GOT IT!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </OrderManagerContext.Provider>
  );
}

export function useOrderManager() {
  const context = useContext(OrderManagerContext);
  if (!context) {
    throw new Error('useOrderManager must be used within an OrderManagerProvider');
  }
  return context;
}

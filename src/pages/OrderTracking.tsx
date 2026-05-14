import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, MapPin, Phone, MessageSquare, Package, Truck, CheckCircle2, Clock, Check, Timer } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from '../components/ui/Button';
import { useOrderManager } from '../context/OrderManagerContext';
import { format, addMinutes } from 'date-fns';

import { StarRating } from '../components/StarRating';
import { useToast } from '../context/ToastContext';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const STATUS_STEPS = [
  { id: 'preparing', label: 'Preparing', icon: Package, description: 'The restaurant is packing your rescue bag.' },
  { id: 'out_for_delivery', label: 'On the Way', icon: Truck, description: 'Your rider is heading to your location.' },
  { id: 'delivered', label: 'Delivered', icon: CheckCircle2, description: 'Enjoy your meal and thank you for saving food!' }
];

// Helper component for pulsing effect
const pulseStyle = `
  @keyframes leaf-pulse {
    0% { transform: scale(0.1); opacity: 0.8; }
    70% { transform: scale(1); opacity: 0; }
    100% { transform: scale(1.2); opacity: 0; }
  }
  .rider-pulse {
    width: 40px;
    height: 40px;
    background: #E11299;
    border-radius: 50%;
    position: absolute;
    top: -20px;
    left: -20px;
    animation: leaf-pulse 2s infinite;
  }
`;

// Simulation Durations (in seconds for logic)
const PREPARING_DURATION = 300; // 5 minutes
const DELIVERING_DURATION = 600; // 10 minutes
const SIMULATION_SPEED = 20; // 1 real second = 20 simulation seconds

// Helper component to move rider and pulse
function RiderMarker({ position }: { position: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.panTo(position, { animate: true });
  }, [position, map]);

  const riderIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1717/1717646.png', // Motorcycle icon
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });

  const pulseIcon = L.divIcon({
    className: 'custom-pulse-icon',
    html: `<div class="rider-pulse"></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

  return (
    <>
      <style>{pulseStyle}</style>
      <Marker position={position} icon={pulseIcon} zIndexOffset={900} />
      <Marker position={position} icon={riderIcon} zIndexOffset={1000}>
        <Popup className="font-sans font-bold">Your Rider is here!</Popup>
      </Marker>
    </>
  );
}

export function OrderTracking() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = location.state?.order; 
  const { activeOrders } = useOrderManager();
  
  const liveOrder = useMemo(() => 
    activeOrders.find(o => o.docId === orderData?.docId) || orderData
  , [activeOrders, orderData]);

  const [isCompleting, setIsCompleting] = useState(false);
  const [riderRating, setRiderRating] = useState(0);
  const { showToast } = useToast();
  const [showNearbyPopup, setShowNearbyPopup] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const DEFAULT_DEST: [number, number] = [7.0877, 125.6178];
  const startPos: [number, number] = [7.0712, 125.6089];

  const destPos = useMemo<[number, number]>(() => {
    if (typeof liveOrder?.address === 'object' && liveOrder.address.lat && liveOrder.address.lng) {
      return [liveOrder.address.lat, liveOrder.address.lng];
    }
    return DEFAULT_DEST;
  }, [liveOrder?.address]);

  const { currentStatusIndex, riderPos, timeRemainingSec, totalDurationSec, prepRemainingSec, travelRemainingSec } = useMemo(() => {
    const totalSimDuration = PREPARING_DURATION + DELIVERING_DURATION;
    if (!liveOrder?.createdAt) return { 
      currentStatusIndex: 0, 
      riderPos: startPos, 
      timeRemainingSec: totalSimDuration, 
      totalDurationSec: totalSimDuration,
      prepRemainingSec: PREPARING_DURATION,
      travelRemainingSec: DELIVERING_DURATION
    };
    
    const createdTime = liveOrder.createdAt?.toDate?.()?.getTime() || 
                        (liveOrder.createdAt?.seconds ? liveOrder.createdAt.seconds * 1000 : now);
    const elapsedSec = ((now - createdTime) / 1000) * SIMULATION_SPEED;
 
    let statusIndex = 0;
    let pos: [number, number] = startPos;
    let remaining = Math.max(totalSimDuration - elapsedSec, 0);
    let pRem = Math.max(PREPARING_DURATION - elapsedSec, 0);
    let tRem = DELIVERING_DURATION;

    if (elapsedSec > PREPARING_DURATION + DELIVERING_DURATION) {
      statusIndex = 2; // Delivered
      pos = destPos;
      remaining = 0;
      pRem = 0;
      tRem = 0;
    } else if (elapsedSec > PREPARING_DURATION) {
      statusIndex = 1; // Delivering
      const travelElapsed = elapsedSec - PREPARING_DURATION;
      const progress = Math.min(travelElapsed / DELIVERING_DURATION, 1);
      pos = [
        startPos[0] + (destPos[0] - startPos[0]) * progress,
        startPos[1] + (destPos[1] - startPos[1]) * progress
      ];
      remaining = Math.max(totalSimDuration - elapsedSec, 0);
      tRem = Math.max(DELIVERING_DURATION - travelElapsed, 0);
      pRem = 0;
    }

    return { 
      currentStatusIndex: statusIndex, 
      riderPos: pos, 
      timeRemainingSec: Math.round(remaining),
      prepRemainingSec: Math.round(pRem),
      travelRemainingSec: Math.round(tRem),
      timeRemainingMin: Math.ceil(remaining / 60),
      totalDurationSec: totalSimDuration
    };
  }, [liveOrder, now]);

  useEffect(() => {
    if (currentStatusIndex === 1) {
      const latDiff = Math.abs(riderPos[0] - destPos[0]);
      const lngDiff = Math.abs(riderPos[1] - destPos[1]);
      
      if (latDiff < 0.002 && lngDiff < 0.002 && !showNearbyPopup) {
        setShowNearbyPopup(true);
        setTimeout(() => setShowNearbyPopup(false), 8000);
      }
    }
  }, [riderPos, currentStatusIndex, destPos]);

  const handleCompleteOrder = async () => {
    if (!liveOrder?.docId) { navigate('/orders'); return; }
    setIsCompleting(true);
    try {
      const orderRef = doc(db, 'orders', liveOrder.docId);
      await updateDoc(orderRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        riderRating: riderRating > 0 ? riderRating : null
      });
      if (riderRating > 0) {
        showToast(`Thank you! You rated the rider ${riderRating} stars.`, 'success');
      }
      navigate('/orders');
    } catch (error) {
      console.error("Error completing order tracking:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  const currentStatus = STATUS_STEPS[currentStatusIndex];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <header className="px-6 py-4 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm font-sans">
        <AnimatePresence>
          {showNearbyPopup && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="absolute top-20 left-6 right-6 z-50 pointer-events-none"
            >
              <div className="bg-primary text-white p-4 rounded-2xl shadow-2xl shadow-primary/30 flex items-center gap-4 border-2 border-white/20 backdrop-blur-md">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-bounce">
                  <Truck size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-80">Rider is nearby</div>
                  <div className="font-bold italic">Almost there! Getting ready...</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-gray-900 leading-tight">Order #{liveOrder?.id || 'FS-8821'}</h1>
            <span className="text-[10px] font-black text-[#E11299] uppercase tracking-widest leading-none">
              {liveOrder?.items[0]?.restaurantName || "McDonald's Philippines"}
            </span>
          </div>
        </div>
        <Badge variant="primary" className="h-6 bg-[#E11299] hover:bg-[#C90085]">Active</Badge>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Real Map Container */}
        <div className="h-96 relative overflow-hidden z-0 shadow-inner">
          <MapContainer 
            center={destPos} 
            zoom={15} 
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Delivery Route */}
            <Polyline 
              positions={[startPos, destPos]} 
              pathOptions={{ color: '#E11299', weight: 4, opacity: 0.3, dashArray: '10, 10' }} 
            />

            <Marker position={destPos}>
              <Popup className="font-sans font-bold">Your House 🏠</Popup>
            </Marker>

            <Marker position={startPos}>
              <Popup className="font-sans font-bold">The Restaurant 🍔</Popup>
            </Marker>

            {currentStatusIndex >= 1 && (
              <RiderMarker position={riderPos} />
            )}
          </MapContainer>
          
          <div className="absolute top-4 right-4 bg-white p-4 rounded-[2rem] shadow-xl flex items-center gap-4 z-[400] border-2 border-primary/10 min-w-[140px]">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Timer size={20} className="text-[#E11299] animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#E11299] leading-none mb-1">
                {currentStatusIndex === 2 ? 'Completed' : currentStatusIndex === 0 ? 'Delivery Starts In' : 'Estimated Arrival'}
              </span>
              <span className="font-black italic text-base text-gray-900">
                {currentStatusIndex === 2 ? 'Arrived' : currentStatusIndex === 0 ? (
                  <>
                    {Math.ceil(prepRemainingSec / 60)} <span className="text-[10px] not-italic ml-1 opacity-50 tracking-normal uppercase">mins</span>
                  </>
                ) : liveOrder?.createdAt ? (
                  <>
                    {format(addMinutes(liveOrder.createdAt?.toDate?.() || new Date(liveOrder.createdAt), Math.ceil(totalDurationSec / 60)), 'h:mm a')}
                    <span className="text-[10px] not-italic ml-1 opacity-50">({Math.ceil(travelRemainingSec / 60)}m away)</span>
                  </>
                ) : 'Calculating...'}
              </span>
            </div>
          </div>

          {/* Floating Progress Bar for Preparation */}
          {currentStatusIndex === 0 && (
            <div className="absolute bottom-6 left-6 right-6 z-[400]">
              <Card className="p-4 bg-white/95 backdrop-blur-sm border-none shadow-2xl rounded-[2rem] flex items-center gap-4 overflow-hidden">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                   <Package size={24} className="animate-pulse" />
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-end mb-1.5">
                      <h4 className="font-black italic text-gray-900 text-sm">Restaurant is preparing...</h4>
                      <span className="text-[10px] font-black text-primary">{Math.ceil(prepRemainingSec / 60)} mins left</span>
                   </div>
                   <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(1 - (prepRemainingSec / PREPARING_DURATION)) * 100}%` }}
                        className="h-full bg-primary"
                      />
                   </div>
                </div>
              </Card>
            </div>
          )}

          {/* Floating Progress Bar for Delivery */}
          {currentStatusIndex === 1 && (
            <div className="absolute bottom-6 left-6 right-6 z-[400]">
              <Card className="p-4 bg-white/95 backdrop-blur-sm border-none shadow-2xl rounded-[2rem] flex items-center gap-4 overflow-hidden">
                <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shrink-0">
                   <Truck size={24} className="animate-bounce" />
                </div>
                <div className="flex-1">
                   <div className="flex justify-between items-end mb-1.5">
                      <h4 className="font-black italic text-gray-900 text-sm">Rider is on the way</h4>
                      <span className="text-[10px] font-black text-primary">{Math.ceil(travelRemainingSec / 60)} mins</span>
                   </div>
                   <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(1 - (travelRemainingSec / DELIVERING_DURATION)) * 100}%` }}
                        className="h-full bg-primary"
                      />
                   </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="px-6 -mt-6 relative z-10 pb-8 space-y-4">
          {/* Status Tracker */}
          <Card className="p-6 border-none shadow-xl overflow-hidden relative">
             {/* Progress Bar Background */}
             <div className="absolute left-10 top-12 bottom-12 w-0.5 bg-gray-100 rounded-full" />
             
             {/* Animated Progress Fill */}
             <motion.div 
               className="absolute left-10 top-12 w-0.5 bg-primary rounded-full origin-top"
               initial={{ scaleY: 0 }}
               animate={{ 
                 scaleY: currentStatusIndex / (STATUS_STEPS.length - 1) 
               }}
               transition={{ duration: 1, ease: "circOut" }}
               style={{ 
                 height: "calc(100% - 6rem)", // Adjust based on padding/gap
               }}
             />

             <div className="flex flex-col gap-10 relative">
               {STATUS_STEPS.map((step, index) => {
                 const isActive = index === currentStatusIndex;
                 const isCompleted = index < currentStatusIndex;
                 
                 return (
                   <div key={step.id} className="flex gap-6 relative">
                     <div className="relative z-10">
                       <motion.div 
                         animate={{ 
                           scale: isActive ? [1, 1.1, 1] : 1,
                           backgroundColor: isActive ? "#E11299" : isCompleted ? "#E11299" : "#F9FAFB",
                           color: isActive || isCompleted ? "#FFFFFF" : "#D1D5DB"
                         }}
                         transition={isActive ? { repeat: Infinity, duration: 2 } : { duration: 0.5 }}
                         className={cn(
                           "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0 shadow-lg",
                           isActive ? "shadow-primary/40 ring-4 ring-primary/20" : 
                           isCompleted ? "shadow-primary/10" : "shadow-none"
                         )}
                       >
                         {isCompleted ? <Check size={20} className="stroke-[3]" /> : <step.icon size={20} />}
                       </motion.div>

                       {isActive && (
                         <motion.div 
                           className="absolute -inset-1 rounded-2xl border-2 border-primary/30"
                           animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                           transition={{ repeat: Infinity, duration: 2 }}
                         />
                       )}
                     </div>
                     
                     <div className="flex flex-col justify-center">
                       <h4 className={cn(
                         "font-black text-sm uppercase tracking-wider transition-colors duration-500",
                         isActive ? "text-gray-900" : isCompleted ? "text-primary" : "text-gray-300"
                       )}>
                         {step.label}
                       </h4>
                       <AnimatePresence mode="wait">
                         {isActive && (
                           <motion.p 
                             initial={{ opacity: 0, height: 0, marginTop: 0 }}
                             animate={{ opacity: 1, height: "auto", marginTop: 4 }}
                             exit={{ opacity: 0, height: 0, marginTop: 0 }}
                             className="text-gray-500 text-xs font-bold leading-relaxed overflow-hidden"
                           >
                             {step.description}
                           </motion.p>
                         )}
                       </AnimatePresence>
                     </div>
                   </div>
                 );
               })}
             </div>
          </Card>

          {/* Rider Card */}
          <Card className="p-4 border-none shadow-lg flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl overflow-hidden shrink-0">
               <img src={liveOrder?.riderPhoto || "https://i.pravatar.cc/150?u=rider_default"} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
               <h4 className="font-bold text-gray-900 leading-none">{liveOrder?.riderName || "Mark Anthoney"}</h4>
               <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs font-black text-gray-900">★ {liveOrder?.riderRating || 4.9}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">• Your Rider</span>
               </div>
            </div>
            <div className="flex gap-2">
               <button className="p-3 bg-gray-50 rounded-xl text-primary hover:bg-primary/10 transition-colors">
                  <Phone size={20} />
               </button>
               <button className="p-3 bg-gray-50 rounded-xl text-primary hover:bg-primary/10 transition-colors">
                  <MessageSquare size={20} />
               </button>
            </div>
          </Card>

          <AnimatePresence>
            {currentStatusIndex === 2 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-4 space-y-4"
              >
                <Card className="p-6 border-none shadow-xl bg-primary/5 border border-primary/10">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-1">
                      <StarRating size={20} readonly initialRating={1} maxRating={1} className="text-primary" />
                    </div>
                    <h3 className="text-gray-900 font-black italic text-lg leading-tight">Rate your Rider</h3>
                    <p className="text-gray-500 text-xs font-medium">How was Mark Anthoney's delivery service today?</p>
                    <StarRating 
                      size={32} 
                      onRate={setRiderRating} 
                      className="mt-2"
                    />
                  </div>
                </Card>

                <Button 
                  onClick={handleCompleteOrder}
                  loading={isCompleting}
                  className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 font-black italic flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  CONFIRM DELIVERY
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// No more cn import here

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, CreditCard, Wallet, Truck, ShoppingBag, CheckCircle2, Leaf, MapPin, X, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useAddresses } from '../hooks/useAddresses';
import { usePayments } from '../hooks/usePayments';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { writeBatch, doc, increment, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { formatCurrency, cn } from '../lib/utils';
import { RIDERS } from '../constants/riders';
import { MapPicker } from '../components/MapPicker';

type PaymentMethod = 'gcash' | 'maya' | 'card' | 'cod';

export function Checkout() {
  const navigate = useNavigate();
  const { profile, selectedAddressIndex, setSelectedAddressIndex, refreshProfile, user } = useAuth();
  const { addresses } = useAddresses();
  const { payments, addPaymentMethod } = usePayments();
  const { total, count, items, clearCart } = useCart();
  const { showToast } = useToast();

  // Auto-select default address on mount
  useEffect(() => {
    if (addresses.length > 0) {
      const defaultIndex = addresses.findIndex(a => a.isDefault);
      if (defaultIndex !== -1 && defaultIndex !== selectedAddressIndex) {
        setSelectedAddressIndex(defaultIndex);
      }
    }
  }, [addresses.length]);
  
  const [paymentMethod, setPaymentMethod] = useState<string>('gcash');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('delivery');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Address form states
  const [addressType, setAddressType] = useState('Address');
  const [addressDetails, setAddressDetails] = useState('');
  const [pinnedLat, setPinnedLat] = useState<number | undefined>(undefined);
  const [pinnedLng, setPinnedLng] = useState<number | undefined>(undefined);
  
  // Payment form states
  const [paymentLabel, setPaymentLabel] = useState('');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [paymentCardNumber, setPaymentCardNumber] = useState('');
  const [paymentExpiry, setPaymentExpiry] = useState('');
  const [paymentCVV, setPaymentCVV] = useState('');

  // Auto-select first real payment method if available
  useEffect(() => {
    if (payments.length > 0 && paymentMethod === 'gcash' && !payments.find(p => p.id === 'gcash')) {
      const defaultPayment = payments.find(p => p.isDefault) || payments[0];
      setPaymentMethod(defaultPayment.id);
    }
  }, [payments]);

  const { addAddress } = useAddresses();
  
  const onAddAddress = async () => {
    if (!addressDetails.trim()) {
      showToast("Please enter address details", "error");
      return;
    }
    try {
      await addAddress({
        label: addressType,
        fullAddress: addressDetails,
        lat: pinnedLat,
        lng: pinnedLng,
        isDefault: addresses.length === 0
      });
      setShowAddAddressModal(false);
      setAddressDetails('');
      showToast("Address added!", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to save address", "error");
    }
  };

  const onAddPayment = async () => {
    if (!paymentLabel.trim()) {
      showToast("Please provide a name/label for this account", "error");
      return;
    }

    if (paymentMethod === 'card' && (!paymentCardNumber || !paymentExpiry)) {
      showToast("Please provide card number and expiry date", "error");
      return;
    }

    try {
      const paymentData: any = {
        type: paymentMethod as any,
        label: paymentLabel,
        isDefault: payments.length === 0
      };

      if (paymentMethod === 'card') {
        paymentData.lastFour = paymentCardNumber.slice(-4);
        paymentData.expiry = paymentExpiry;
        paymentData.brand = paymentCardNumber.startsWith('4') ? 'Visa' : 'Mastercard';
      } else {
        paymentData.accountNumber = paymentAccountNumber || undefined;
      }

      const newP = await addPaymentMethod(paymentData);
      
      if (newP) {
        setPaymentMethod(newP.id);
      }
      
      setPaymentLabel('');
      setPaymentAccountNumber('');
      setPaymentCardNumber('');
      setPaymentExpiry('');
      setPaymentCVV('');
      setShowAddPaymentModal(false);
      showToast("Payment method added!", "success");
    } catch (error: any) {
      showToast(error.message || "Failed to add payment method", "error");
    }
  };

  const selectedAddress = addresses[selectedAddressIndex] || 
    (deliveryType === 'delivery' 
      ? { label: 'No Address', fullAddress: 'Please add a delivery address' } 
      : { label: 'Pickup Ready', fullAddress: 'Pick up your order at the restaurant' }
    );

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Enforce Address for Delivery
    if (deliveryType === 'delivery' && addresses.length === 0) {
      showToast("Please provide a delivery address", "error");
      setShowAddAddressModal(true);
      return;
    }

    // Enforce Payment Details for Electronic Payments (if not already saved)
    if (paymentMethod !== 'cod') {
      const isSavedMethod = payments.some(p => p.id === paymentMethod);
      if (!isSavedMethod) {
        showToast(`Please provide details for ${paymentMethod.toUpperCase()}`, "error");
        setShowAddPaymentModal(true);
        return;
      }
    }

    setIsPlacing(true);
    
    try {
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      const orderId = `FS-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderRef = doc(collection(db, 'orders'));
      
      // Update stats atomically
      batch.set(userRef, {
        mealsSaved: increment(count),
        savedCO2: increment(count * 2.5)
      }, { merge: true });

      // Save Order
      const randomRider = RIDERS[Math.floor(Math.random() * RIDERS.length)];
      
      batch.set(orderRef, {
        id: orderId,
        userId: user.uid,
        items: items.map(item => ({
          listingId: item.listingId,
          name: item.name || 'Unknown Item',
          price: item.price || 0,
          quantity: item.quantity || 1,
          restaurantId: item.restaurantId || 'unknown',
          restaurantName: item.restaurantName || 'Unknown Restaurant',
          photo: item.photo || '',
          extras: item.extras || []
        })),
        total: total + (deliveryType === 'delivery' ? 49 : 19),
        status: 'preparing',
        deliveryType: deliveryType || 'delivery',
        address: {
          label: selectedAddress.label || 'Default',
          fullAddress: selectedAddress.fullAddress || '',
          lat: (selectedAddress as any).lat || null,
          lng: (selectedAddress as any).lng || null
        },
        paymentMethod: paymentMethod || 'cod',
        riderId: deliveryType === 'delivery' ? randomRider.id : null,
        riderName: deliveryType === 'delivery' ? randomRider.name : null,
        riderPhoto: deliveryType === 'delivery' ? randomRider.photo : null,
        riderRating: deliveryType === 'delivery' ? randomRider.rating : null,
        createdAt: serverTimestamp()
      });
      
      await batch.commit();
      
      // Refresh local profile to show updated stats immediately
      await refreshProfile();
      
      setIsPlacing(false);
      setIsSuccess(true);
      clearCart();
    } catch (error: any) {
      console.error("Order placement failed:", error);
      setIsPlacing(false);
      
      // Detailed error for debugging if permission denied
      if (error.code === 'permission-denied') {
        const errInfo = {
          error: error.message,
          operationType: 'write',
          path: 'orders or users',
          authInfo: {
            userId: user?.uid,
            email: user?.email,
          }
        };
        console.error('Firestore Error Details:', JSON.stringify(errInfo));
        alert("Permission denied. Check Firestore security rules for 'orders' and 'users' collections.");
      } else {
        alert(error.message || "Failed to place order. Please try again.");
      }
    }
  };

  if (isSuccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-6"
        >
          <CheckCircle2 size={64} />
        </motion.div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">Order Confirmed!</h2>
        <p className="text-gray-500 mb-2">Your rescue mission is in progress.</p>
        <div className="bg-green-50 px-4 py-2 rounded-full text-primary text-xs font-black uppercase tracking-wider mb-8 flex items-center gap-2">
          <Leaf size={14} />
          <span>You saved {(count * 2.5).toFixed(1)}kg of CO2!</span>
        </div>
        <div className="flex flex-col w-full gap-3 px-4">
          <Button onClick={() => navigate('/tracking')} className="w-full h-14 rounded-2xl">Track My Order</Button>
          <Button variant="ghost" onClick={() => navigate('/')} className="w-full font-bold">Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
       <header className="px-6 py-4 bg-white flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-gray-900">Checkout</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Toggle Pickup/Delivery */}
        <section className="bg-white p-1.5 rounded-2xl flex gap-1">
          <button 
            onClick={() => setDeliveryType('delivery')}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2",
              deliveryType === 'delivery' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-gray-400"
            )}
          >
            <Truck size={18} />
            <span>Delivery</span>
          </button>
          <button 
             onClick={() => setDeliveryType('pickup')}
             className={cn(
               "flex-1 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2",
               deliveryType === 'pickup' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-gray-400"
             )}
          >
            <ShoppingBag size={18} />
            <span>Pickup</span>
          </button>
        </section>

        {/* Address */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-1">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              {deliveryType === 'delivery' ? 'Delivery Address' : 'Pickup From'}
             </h3>
             {deliveryType === 'delivery' && addresses.length > 0 && (
               <button 
                 onClick={() => setShowAddressModal(true)}
                 className="text-[10px] font-black text-primary uppercase tracking-wider hover:underline"
               >
                 View All ({addresses.length})
               </button>
             )}
           </div>

           {deliveryType === 'delivery' ? (
             <div className="space-y-3">
               {addresses.length > 0 ? (
                 <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-6 px-6">
                   {/* Quick Switch Addresses */}
                   {addresses.slice(0, 3).map((addr, idx) => (
                     <motion.button
                       key={addr.id}
                       whileTap={{ scale: 0.98 }}
                       onClick={() => setSelectedAddressIndex(idx)}
                       className={cn(
                         "min-w-[240px] p-5 rounded-[2rem] border-2 transition-all text-left flex flex-col gap-3 relative overflow-hidden shrink-0",
                         selectedAddressIndex === idx 
                          ? "border-primary bg-white shadow-xl shadow-primary/10" 
                          : "border-transparent bg-white/50 hover:bg-white"
                       )}
                     >
                       {selectedAddressIndex === idx && (
                         <div className="absolute top-0 right-0">
                           <div className="bg-primary text-white p-2 rounded-bl-2xl">
                             <CheckCircle2 size={16} className="stroke-[3]" />
                           </div>
                         </div>
                       )}
                       
                       <div className="flex items-center gap-3">
                         <div className={cn(
                           "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
                           selectedAddressIndex === idx ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                         )}>
                           <MapPin size={20} />
                         </div>
                         <span className={cn(
                           "font-black text-sm italic uppercase tracking-tighter",
                           selectedAddressIndex === idx ? "text-gray-900" : "text-gray-400"
                         )}>
                           {addr.label}
                         </span>
                       </div>
                       
                       <p className={cn(
                         "text-xs font-bold leading-relaxed line-clamp-2",
                         selectedAddressIndex === idx ? "text-gray-600" : "text-gray-400"
                       )}>
                         {addr.fullAddress}
                       </p>
                     </motion.button>
                   ))}
                   
                   {/* Add New Quick Card */}
                   <button 
                     onClick={() => setShowAddAddressModal(true)}
                     className="min-w-[120px] rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 group hover:border-primary/30 hover:bg-white transition-all text-gray-300 hover:text-primary"
                   >
                     <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                       <Plus size={20} />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest">New</span>
                   </button>
                 </div>
               ) : (
                 <Card 
                   onClick={() => setShowAddAddressModal(true)}
                   className="p-8 border-2 border-dashed border-gray-200 bg-white/50 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-primary/30 hover:bg-white transition-all group"
                 >
                   <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-[2rem] flex items-center justify-center group-hover:bg-primary/5 group-hover:text-primary transition-all">
                     <MapPin size={32} />
                   </div>
                   <div className="text-center">
                     <h4 className="font-black text-gray-900 italic">No Delivery Address</h4>
                     <p className="text-xs font-bold text-gray-400 mt-1">Tap here to add your location</p>
                   </div>
                   <Button variant="ghost" className="text-primary font-black text-xs uppercase tracking-widest">
                     Add Address
                   </Button>
                 </Card>
               )}
             </div>
           ) : (
             <Card className="p-5 bg-white border-none shadow-sm flex items-center gap-4 rounded-[2rem]">
               <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                 <ShoppingBag size={24} />
               </div>
               <div>
                 <h4 className="font-black italic text-gray-900 leading-none">RESTAURANT PICKUP</h4>
                 <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-tight">Ready in 15-20 mins</p>
               </div>
             </Card>
           )}
        </section>

        {/* Payment Methods */}
        <section className="space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Payment Method</h3>
             <button onClick={() => navigate('/profile')} className="text-[10px] font-black text-primary uppercase hover:underline">Manage</button>
           </div>
            <div className="grid grid-cols-1 gap-3">
              {/* Cash on Delivery - Always shown */}
              <label className={cn(
                "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white",
                paymentMethod === 'cod' ? "border-primary bg-primary/5" : "border-transparent"
              )}>
                <input 
                 type="radio" 
                 name="payment" 
                 className="w-5 h-5 accent-primary"
                 checked={paymentMethod === 'cod'}
                 onChange={() => setPaymentMethod('cod')}
               />
                <ShoppingBag className="text-gray-400" size={20} />
                <span className="font-bold text-gray-900 italic">Cash on Delivery</span>
              </label>

              {/* Digital Wallets */}
              {[
                { id: 'gcash', name: 'GCash', icon: Wallet, color: 'text-blue-600' },
                { id: 'maya', name: 'Maya', icon: Wallet, color: 'text-green-500' }
              ].map(method => {
                const savedMethod = payments.find(p => p.type === method.id);
                return (
                  <label key={method.id} className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white relative overflow-hidden",
                    paymentMethod === method.id ? "border-primary bg-primary/5" : "border-transparent"
                  )}>
                    {!savedMethod && (
                      <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[8px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest">Setup Needed</div>
                    )}
                    <input 
                      type="radio" 
                      name="payment" 
                      className="w-5 h-5 accent-primary"
                      checked={paymentMethod === method.id || (savedMethod && paymentMethod === savedMethod.id)}
                      onChange={() => setPaymentMethod(savedMethod ? savedMethod.id : method.id)}
                    />
                    <method.icon className={method.color} size={20} />
                    <div className="flex-1">
                      <div className={cn(
                        "font-bold transition-colors",
                        (paymentMethod === method.id || (savedMethod && paymentMethod === savedMethod.id)) && !savedMethod ? "text-primary" : "text-gray-900"
                      )}>
                        {savedMethod ? savedMethod.label : method.name}
                      </div>
                      {savedMethod && (
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                          {savedMethod.accountNumber ? `• ${savedMethod.accountNumber}` : 'Verified'}
                        </div>
                      )}
                    </div>
                    {!savedMethod && paymentMethod === method.id && (
                      <button 
                        onClick={(e) => { e.preventDefault(); setShowAddPaymentModal(true); }}
                        className="text-xs font-black text-primary bg-primary/10 px-3 py-1.5 rounded-lg"
                      >
                        SET UP
                      </button>
                    )}
                  </label>
                );
              })}

              {/* Saved Cards */}
              {payments.filter(p => p.type === 'card').map(card => (
                <label key={card.id} className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white",
                  paymentMethod === card.id ? "border-primary bg-primary/5" : "border-transparent"
                )}>
                  <input 
                   type="radio" 
                   name="payment" 
                   className="w-5 h-5 accent-primary"
                   checked={paymentMethod === card.id}
                   onChange={() => setPaymentMethod(card.id)}
                 />
                  <CreditCard className="text-primary" size={20} />
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{card.label}</div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                      {card.brand} • {card.lastFour}
                    </div>
                  </div>
                </label>
              ))}
            </div>
        </section>

        {/* Summary */}
        <section className="bg-white rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Final Total</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-500 font-medium">
              <span>Items ({count})</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-gray-500 font-medium">
              <span>Fee</span>
              <span>{formatCurrency(deliveryType === 'delivery' ? 49 : 19)}</span>
            </div>
            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
              <span className="text-lg font-black text-gray-900">Amount Due</span>
              <span className="text-2xl font-black text-primary">
                {formatCurrency(total + (deliveryType === 'delivery' ? 49 : 19))}
              </span>
            </div>
          </div>
        </section>
      </div>

      <footer className="p-6 bg-white border-t border-gray-100 safe-area-bottom">
        <Button 
          onClick={handlePlaceOrder}
          loading={isPlacing}
          className="w-full h-14 rounded-2xl shadow-xl shadow-primary/20"
        >
          Place Order
        </Button>
      </footer>

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
                <h2 className="text-2xl font-black text-gray-900 italic leading-none">Choose Address</h2>
                <button onClick={() => setShowAddressModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                {addresses.length > 0 ? (
                  <div className="space-y-3 pb-4">
                    {addresses.map((addr, idx) => (
                      <motion.button
                        key={addr.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => {
                          setSelectedAddressIndex(idx);
                          setShowAddressModal(false);
                        }}
                        className={cn(
                          "w-full p-5 rounded-[2rem] border-2 flex items-start gap-4 text-left transition-all relative overflow-hidden group",
                          selectedAddressIndex === idx 
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" 
                            : "border-gray-100 bg-white hover:border-gray-300"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center transition-all",
                          selectedAddressIndex === idx ? "bg-primary text-white" : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                        )}>
                          <MapPin size={24} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "font-black text-sm italic uppercase tracking-tight",
                              selectedAddressIndex === idx ? "text-gray-900" : "text-gray-600"
                            )}>
                              {addr.label}
                              {addr.isDefault && (
                                <span className="ml-2 text-[8px] bg-gray-900 text-white px-2 py-0.5 rounded-full not-italic">DEFAULT</span>
                              )}
                            </span>
                            {selectedAddressIndex === idx && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <CheckCircle2 size={20} className="text-primary" />
                              </motion.div>
                            )}
                          </div>
                          <p className={cn(
                            "text-xs font-bold leading-relaxed mt-1.5",
                            selectedAddressIndex === idx ? "text-gray-600" : "text-gray-400"
                          )}>
                            {addr.fullAddress}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 flex flex-col items-center opacity-30 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <MapPin size={40} />
                    </div>
                    <p className="font-black uppercase tracking-widest text-[10px]">No saved addresses yet</p>
                  </div>
                )}

                <button 
                  onClick={() => {
                    setShowAddressModal(false);
                    setShowAddAddressModal(true);
                  }}
                  className="w-full p-5 bg-gray-900 rounded-[2rem] flex items-center justify-center gap-3 text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200"
                >
                  <Plus size={20} />
                  <span>Add New Address</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Address Modal */}
      <AnimatePresence>
        {showAddAddressModal && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddAddressModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-8 relative z-10 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900 italic">Add Delivery Address</h2>
                <button onClick={() => setShowAddAddressModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto max-h-[70vh] pb-10">
                <div className="h-64 w-full">
                  <MapPicker 
                    onLocationSelect={(lat, lng, addr) => {
                      setPinnedLat(lat);
                      setPinnedLng(lng);
                      if (!addressDetails) setAddressDetails(addr);
                    }}
                    className="h-full"
                  />
                </div>

                <div className="flex gap-2">
                  {['Address', 'Work', 'Other'].map(type => (
                    <button
                      key={type}
                      onClick={() => setAddressType(type)}
                      className={cn(
                        "flex-1 py-3 rounded-2xl font-bold transition-all text-xs uppercase tracking-widest",
                        addressType === type 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Street & House Number</label>
                  <textarea 
                    rows={3}
                    value={addressDetails}
                    onChange={(e) => setAddressDetails(e.target.value)}
                    placeholder="e.g. 123 Emerald St, Unit 4B"
                    className="w-full bg-gray-50 border-none rounded-3xl p-5 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-300 resize-none text-sm"
                  />
                </div>

                <Button 
                  onClick={onAddAddress} 
                  className="w-full h-14 rounded-2xl bg-primary text-white font-black italic shadow-xl shadow-primary/20"
                >
                  SAVE & CONTINUE
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Payment Modal */}
      <AnimatePresence>
        {showAddPaymentModal && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddPaymentModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-8 relative z-10 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900 italic">Payment Details</h2>
                <button onClick={() => setShowAddPaymentModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <h4 className="font-black italic text-gray-900 uppercase leading-none">{paymentMethod}</h4>
                    <p className="text-xs font-medium text-gray-500 mt-1">Please enter your {paymentMethod} details</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Account Name</label>
                  <input 
                    type="text"
                    value={paymentLabel}
                    onChange={(e) => setPaymentLabel(e.target.value)}
                    placeholder="e.g. My Personal Wallet"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-200"
                  />
                </div>

                {paymentMethod === 'card' ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Card Number</label>
                      <input 
                        type="text"
                        value={paymentCardNumber}
                        onChange={(e) => setPaymentCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        placeholder="XXXX XXXX XXXX XXXX"
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-200"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">MM/YY</label>
                        <input 
                          type="text"
                          value={paymentExpiry}
                          onChange={(e) => setPaymentExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-200"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">CVV</label>
                        <input 
                          type="password"
                          value={paymentCVV}
                          onChange={(e) => setPaymentCVV(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          placeholder="•••"
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-200"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Phone Number</label>
                    <input 
                      type="text"
                      value={paymentAccountNumber}
                      onChange={(e) => setPaymentAccountNumber(e.target.value)}
                      placeholder="09xx xxx xxxx"
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-200"
                    />
                  </div>
                )}

                <Button 
                  onClick={onAddPayment} 
                  className="w-full h-14 rounded-2xl bg-primary text-white font-black italic shadow-xl shadow-primary/20"
                >
                  CONTINUE TO ORDER
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

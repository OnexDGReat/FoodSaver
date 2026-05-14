import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, MapPin, CreditCard, BarChart3, Settings as SettingsIcon, 
  ChevronLeft, ChevronRight, Check, Plus, LogOut, Camera, Trash2, X, Loader2, Pencil, CheckCircle2, Mail 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAddresses } from '../hooks/useAddresses';
import { usePayments } from '../hooks/usePayments';
import { Button } from '../components/ui/Button';
import { SavedAddress } from '../types/user';
import { storage } from '../lib/firebase';
import { AvatarUpload } from '../components/AvatarUpload';
import { SkeletonProfile } from '../components/SkeletonProfile';
import { useToast } from '../context/ToastContext';
import { MapPicker } from '../components/MapPicker';

type ViewState = 'main' | 'addresses' | 'payments' | 'sustainability' | 'settings' | 'edit-profile' | 'add-address' | 'add-payment' | 'edit-address';

export function Profile() {
  const { profile, user, logout, updateProfileData, updateSettings, updateEmailAddress, updateUserPassword, profileLoading, refreshProfile } = useAuth();
  const { addresses, addAddress, deleteAddress, updateAddress, setDefault, loading: addressLoading } = useAddresses();
  const { payments, addPaymentMethod, deletePaymentMethod, loading: paymentLoading } = usePayments();
  const { showToast } = useToast();
  
  const [view, setView] = useState<ViewState>('main');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Profile edit states
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editingField, setEditingField] = useState<'name' | 'email' | 'password' | null>(null);

  // Update edit states when profile changes
  useEffect(() => {
    if (profile) {
      setEditName(profile.displayName || '');
      setEditEmail(profile.email || '');
    }
  }, [profile]);

  // Address form states
  const [addressType, setAddressType] = useState('Address');
  const [addressDetails, setAddressDetails] = useState('');
  const [pinnedLat, setPinnedLat] = useState<number | undefined>(undefined);
  const [pinnedLng, setPinnedLng] = useState<number | undefined>(undefined);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [isQuickAdding, setIsQuickAdding] = useState(false);
  const [quickAddressDetails, setQuickAddressDetails] = useState('');

  // Payment form states
  const [paymentType, setPaymentType] = useState<'gcash' | 'card' | 'maya'>('gcash');
  const [paymentLabel, setPaymentLabel] = useState('');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [paymentCardNumber, setPaymentCardNumber] = useState('');
  const [paymentExpiry, setPaymentExpiry] = useState('');
  const [paymentCVV, setPaymentCVV] = useState(''); 

  const initials = useMemo(() => {
    return profile?.displayName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '??';
  }, [profile?.displayName]);

  if (!user) return null;

  // Show skeleton only if we have NO data and we are loading
  if (profileLoading && !profile) {
    return <SkeletonProfile />;
  }

  const handleUpdateField = async (field: 'name' | 'email' | 'password') => {
    setIsUpdating(true);
    try {
      if (field === 'name') {
        if (!editName.trim()) throw new Error("Name cannot be empty");
        await updateProfileData({ displayName: editName });
        showToast("Name updated!", "success");
      } else if (field === 'email') {
        await updateEmailAddress(editEmail);
        showToast("Email updated!", "success");
      } else if (field === 'password') {
        if (editPassword.length < 6) throw new Error("Password must be at least 6 characters");
        await updateUserPassword(editPassword);
        setEditPassword('');
        showToast("Password updated!", "success");
      }
      setEditingField(null);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        showToast("Please log out and back in to change sensitive info.", "error");
      } else {
        showToast(error.message || "Update failed.", "error");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const menuItems = [
    { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
    { id: 'payments', label: 'Payment Methods', icon: CreditCard },
    { id: 'sustainability', label: 'Sustainability Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleEditAddress = async () => {
    if (!editingAddress || !addressDetails) return;
    setIsUpdating(true);
    try {
      await updateAddress(editingAddress.id, {
        label: addressType,
        fullAddress: addressDetails,
        lat: pinnedLat,
        lng: pinnedLng
      });
      showToast("Address updated!", "success");
      setEditingAddress(null);
      setAddressDetails('');
      setView('addresses');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to update address.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddAddress = async () => {
    if (!addressDetails) return;
    try {
      await addAddress({ 
        label: addressType, 
        fullAddress: addressDetails, 
        lat: pinnedLat,
        lng: pinnedLng,
        isDefault: addresses.length === 0 
      });
      setAddressDetails('');
      setView('addresses');
      showToast("Address added!", "success");
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to add address.", "error");
    }
  };

  const handleQuickAdd = async () => {
    if (!quickAddressDetails.trim()) return;
    setIsUpdating(true);
    try {
      await addAddress({ 
        label: 'Address', 
        fullAddress: quickAddressDetails, 
        isDefault: addresses.length === 0 
      });
      setQuickAddressDetails('');
      setIsQuickAdding(false);
      showToast("Address added!", "success");
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to add address.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentLabel) {
      showToast("Please provide a name/label for this account", "error");
      return;
    }

    if (paymentType === 'card' && (!paymentCardNumber || !paymentExpiry)) {
      showToast("Please provide card number and expiry date", "error");
      return;
    }

    try {
      const paymentData: any = {
        type: paymentType,
        label: paymentLabel,
        isDefault: payments.length === 0
      };

      if (paymentType === 'card') {
        paymentData.lastFour = paymentCardNumber.slice(-4);
        paymentData.expiry = paymentExpiry;
        paymentData.brand = paymentCardNumber.startsWith('4') ? 'Visa' : 'Mastercard';
      } else {
        paymentData.accountNumber = paymentAccountNumber || undefined;
      }

      await addPaymentMethod(paymentData);
      
      // Reset form
      setPaymentLabel('');
      setPaymentAccountNumber('');
      setPaymentCardNumber('');
      setPaymentExpiry('');
      setPaymentCVV('');
      setView('payments');
      showToast("Payment method added!", "success");
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to add payment method.", "error");
    }
  };

  const renderView = () => {
    switch (view) {
      case 'edit-profile':
        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="space-y-6 w-full"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('main')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-black text-gray-900">Account Settings</h2>
            </div>

            <div className="flex flex-col items-center gap-10">
              <AvatarUpload 
                currentPhotoURL={profile?.photoURL || null} 
                uid={user.uid}
                onUploadSuccess={(url) => {
                  updateProfileData({ photoURL: url });
                  showToast("Photo updated!", "success");
                }}
              />

              <div className="w-full space-y-8 px-2">
                {/* Name Field */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                    {editingField !== 'name' && (
                      <button 
                        onClick={() => setEditingField('name')}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Edit name"
                      >
                        <Pencil size={14} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                  
                  {editingField === 'name' ? (
                    <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateField('name')}
                        className="flex-1 p-0 text-xl font-black text-gray-900 bg-transparent border-b-2 border-primary outline-none pb-2"
                      />
                      <button 
                        disabled={isUpdating}
                        onClick={() => handleUpdateField('name')}
                        className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-all"
                        aria-label="Save name"
                      >
                        {isUpdating ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                      </button>
                      <button 
                        onClick={() => { setEditingField(null); setEditName(profile?.displayName || ''); }}
                        className="p-2 text-gray-300 hover:bg-gray-50 rounded-xl transition-all"
                        aria-label="Cancel editing"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-xl font-black text-gray-900 pb-2 border-b-2 border-transparent">
                      {profile?.displayName || 'Rescue Hero'}
                    </div>
                  )}
                </div>

                {/* Email Field */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                    {editingField !== 'email' && (
                      <button 
                        onClick={() => setEditingField('email')}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Edit email"
                      >
                        <Pencil size={14} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                  
                  {editingField === 'email' ? (
                    <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        type="email" 
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="flex-1 p-0 text-xl font-black text-gray-900 bg-transparent border-b-2 border-primary outline-none pb-2"
                      />
                      <button 
                        disabled={isUpdating}
                        onClick={() => handleUpdateField('email')}
                        className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-all"
                      >
                        {isUpdating ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                      </button>
                      <button 
                        onClick={() => { setEditingField(null); setEditEmail(profile?.email || ''); }}
                        className="p-2 text-gray-300 hover:bg-gray-50 rounded-xl transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-xl font-black text-gray-900 pb-2 border-b-2 border-transparent">
                      {profile?.email}
                    </div>
                  )}
                </div>

                {/* Password Field */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Password</label>
                    {editingField !== 'password' && (
                      <button 
                        onClick={() => setEditingField('password')}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Edit password"
                      >
                        <Pencil size={14} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                  
                  {editingField === 'password' ? (
                    <div className="flex items-center gap-2">
                      <input 
                        autoFocus
                        type="password" 
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="New password"
                        className="flex-1 p-0 text-xl font-black text-gray-900 bg-transparent border-b-2 border-primary outline-none pb-2 placeholder:text-gray-200"
                      />
                      <button 
                        disabled={isUpdating}
                        onClick={() => handleUpdateField('password')}
                        className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-all"
                      >
                        {isUpdating ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                      </button>
                      <button 
                        onClick={() => { setEditingField(null); setEditPassword(''); }}
                        className="p-2 text-gray-300 hover:bg-gray-50 rounded-xl transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="text-xl font-black text-gray-900 pb-2 border-b-2 border-transparent tracking-widest">
                      ••••••••
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full pt-4">
                <Button 
                  onClick={() => setView('main')} 
                  className="w-full h-14 rounded-2xl bg-gray-900 text-white font-black italic shadow-xl shadow-gray-200 transition-transform hocus:scale-[0.98]"
                >
                  DONE
                </Button>
              </div>
            </div>
          </motion.div>
        );

      case 'edit-address':
        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="space-y-6 w-full"
          >
            <div className="flex items-center gap-4 mb-8 px-2">
              <button 
                onClick={() => {
                  setView('addresses');
                  setEditingAddress(null);
                  setAddressDetails('');
                }} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-black text-gray-900">Edit Address</h2>
            </div>

              <div className="space-y-6 px-2 pb-10">
                <div className="h-64 sm:h-80 w-full">
                  <MapPicker 
                    initialLat={editingAddress?.lat}
                    initialLng={editingAddress?.lng}
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
                      "flex-1 py-3 rounded-xl font-bold transition-all",
                      addressType === type 
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
                  value={addressDetails}
                  onChange={(e) => setAddressDetails(e.target.value)}
                  placeholder="Street name, building, unit number..."
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-300 resize-none"
                />
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <Button 
                  onClick={handleEditAddress} 
                  className="w-full h-14 rounded-2xl bg-primary text-white font-black italic shadow-xl shadow-primary/20 hocus:scale-95 transition-transform"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'SAVING...' : 'SAVE CHANGES'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setView('addresses');
                    setEditingAddress(null);
                    setAddressDetails('');
                  }} 
                  className="w-full h-14 rounded-2xl border-none text-gray-400 font-black italic uppercase tracking-widest hover:bg-gray-50"
                  disabled={isUpdating}
                >
                  CANCEL
                </Button>
              </div>
            </div>
          </motion.div>
        );

      case 'add-address':
        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="space-y-6 w-full"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('addresses')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-black text-gray-900">Add Address</h2>
            </div>

            <div className="space-y-6 pb-12">
              <div className="h-64 sm:h-80 w-full px-2">
                <MapPicker 
                  onLocationSelect={(lat, lng, addr) => {
                    setPinnedLat(lat);
                    setPinnedLng(lng);
                    if (!addressDetails) setAddressDetails(addr);
                  }}
                  className="h-full"
                />
              </div>

              <div className="flex gap-2 px-2">
                {['Address', 'Work', 'Other'].map(type => (
                  <button
                    key={type}
                    onClick={() => setAddressType(type)}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold transition-all",
                      addressType === type 
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
                  value={addressDetails}
                  onChange={(e) => setAddressDetails(e.target.value)}
                  placeholder="Street name, building, unit number..."
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-300 resize-none"
                />
              </div>

              <Button 
                onClick={handleAddAddress} 
                className="w-full h-14 rounded-2xl bg-primary text-white font-black italic shadow-xl shadow-primary/20 mt-4 hocus:scale-95 transition-transform"
                disabled={isUpdating}
              >
                {isUpdating ? 'ADDING...' : 'ADD ADDRESS'}
              </Button>
            </div>
          </motion.div>
        );

      case 'addresses':
        return (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6 w-full"
          >
            <div className="flex items-center gap-4 mb-8 px-2">
              <button onClick={() => setView('main')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-black text-gray-900">Saved Addresses</h2>
            </div>
            
            <div className="space-y-4 px-2">
              {addresses.length > 0 ? (
                addresses.map((addr: SavedAddress) => (
                  <div key={addr.id} className={cn(
                    "p-5 bg-white border rounded-3xl flex flex-col gap-4 group transition-all",
                    addr.isDefault ? "border-primary/20 bg-primary/5" : "border-gray-100 hover:border-gray-200"
                  )}>
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        addr.isDefault ? "bg-primary text-white" : "bg-gray-100 text-gray-400"
                      )}>
                        <MapPin size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 italic leading-none">{addr.label}</span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-full uppercase tracking-widest">Default</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setEditingAddress(addr);
                                setAddressType(addr.label);
                                setAddressDetails(addr.fullAddress);
                                setPinnedLat(addr.lat);
                                setPinnedLng(addr.lng);
                                setView('edit-address');
                              }}
                              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                              title="Edit Address"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => deleteAddress(addr.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Address"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2">
                          {addr.fullAddress}
                        </p>
                      </div>
                    </div>
                    
                    {!addr.isDefault && (
                      <button
                        // @ts-ignore
                        onClick={() => setDefault(addr.id)}
                        className="w-full py-2.5 rounded-xl border border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:border-primary/20 hover:text-primary hover:bg-white transition-all flex items-center justify-center gap-2"
                      >
                        <Check size={14} />
                        <span>Set as Default</span>
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center text-center opacity-40">
                  <MapPin size={48} className="text-gray-200 mb-4" />
                  <p className="font-bold text-gray-400">No addresses saved yet</p>
                </div>
              )}

              {isQuickAdding ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-gray-50 border-2 border-primary/20 rounded-3xl space-y-3"
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Quick Add</span>
                    <button 
                      onClick={() => {
                        setIsQuickAdding(false);
                        setQuickAddressDetails('');
                      }} 
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      autoFocus
                      type="text"
                      value={quickAddressDetails}
                      onChange={(e) => setQuickAddressDetails(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAdd();
                        if (e.key === 'Escape') setIsQuickAdding(false);
                      }}
                      placeholder="e.g. 123 Sky Way, Davao City"
                      className="w-full bg-white border-2 border-transparent focus:border-primary/10 rounded-2xl p-4 pr-12 text-sm font-bold text-gray-900 outline-none transition-all placeholder:text-gray-200"
                    />
                    <button 
                      onClick={handleQuickAdd}
                      disabled={!quickAddressDetails.trim() || isUpdating}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-xl disabled:opacity-30 disabled:grayscale transition-all"
                    >
                      {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    </button>
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 px-2 italic">Press Enter to add quickly</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setIsQuickAdding(true)}
                    className="flex items-center justify-center gap-2 p-4 bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl text-primary font-black text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-all"
                  >
                    <Plus size={16} />
                    <span>Quick Add</span>
                  </button>
                  <button 
                    onClick={() => setView('add-address')}
                    className="flex items-center justify-center gap-2 p-4 bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-black text-[10px] uppercase tracking-widest hover:border-gray-200 transition-all"
                  >
                    <MapPin size={16} />
                    <span>Full Form</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 'add-payment':
        return (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="space-y-6 w-full"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('payments')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-black text-gray-900">Add Payment</h2>
            </div>

            <div className="space-y-6">
              <div className="flex gap-2">
                {[
                  { id: 'gcash', label: 'GCash' },
                  { id: 'maya', label: 'Maya' },
                  { id: 'card', label: 'Card' }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentType(method.id as any)}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-bold transition-all",
                      paymentType === method.id 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                  >
                    {method.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Account Name / Label</label>
                <input 
                  type="text"
                  value={paymentLabel}
                  onChange={(e) => setPaymentLabel(e.target.value)}
                  placeholder={paymentType === 'card' ? "Personal Visa" : "My GCash"}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-300"
                />
              </div>

              {paymentType === 'card' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Card Number</label>
                    <input 
                      type="text"
                      value={paymentCardNumber}
                      onChange={(e) => setPaymentCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                      placeholder="XXXX XXXX XXXX XXXX"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-300"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Expiry (MM/YY)</label>
                      <input 
                        type="text"
                        value={paymentExpiry}
                        onChange={(e) => setPaymentExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-300"
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">CVV</label>
                      <input 
                        type="password"
                        value={paymentCVV}
                        onChange={(e) => setPaymentCVV(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        placeholder="•••"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Phone Number / Account #</label>
                  <input 
                    type="text"
                    value={paymentAccountNumber}
                    onChange={(e) => setPaymentAccountNumber(e.target.value)}
                    placeholder="09xx xxx xxxx"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-primary/20 rounded-2xl p-4 font-bold text-gray-900 outline-none transition-all placeholder:text-gray-300"
                  />
                </div>
              )}

              <Button 
                onClick={handleAddPayment} 
                className="w-full h-14 rounded-2xl bg-primary text-white font-black italic shadow-xl shadow-primary/20 mt-4 hocus:scale-95 transition-transform"
                disabled={paymentLoading}
              >
                {paymentLoading ? 'ADDING...' : 'SAVE PAYMENT METHOD'}
              </Button>
            </div>
          </motion.div>
        );

      case 'payments':
        return (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6 w-full"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('main')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-black text-gray-900">Payment Methods</h2>
            </div>
            
            <div className="space-y-4">
              {payments.length > 0 ? (
                payments.map((p) => (
                  <div key={p.id} className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl text-white space-y-8 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/40 transition-colors" />
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center gap-3">
                        <CreditCard size={32} className="opacity-50" />
                        <span className="font-black italic text-lg text-primary uppercase">{p.type}</span>
                      </div>
                      <button 
                        onClick={() => deletePaymentMethod(p.id)}
                        className="p-2 text-white/50 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="flex justify-between items-end relative z-10">
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Account Label</div>
                        <div className="text-xl font-bold">{p.label}</div>
                      </div>
                      {p.type === 'card' ? (
                        <div className="text-right">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{p.brand || 'Card'} Info</div>
                          <div className="text-sm font-mono opacity-80">•••• {p.lastFour}</div>
                          <div className="text-[10px] font-black opacity-40">{p.expiry}</div>
                        </div>
                      ) : p.accountNumber && (
                        <div className="text-right">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Account Info</div>
                          <div className="text-sm font-mono opacity-80">{p.accountNumber}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center text-center opacity-40">
                  <CreditCard size={48} className="text-gray-200 mb-4" />
                  <p className="font-bold text-gray-400">No payment methods saved</p>
                </div>
              )}

              <button 
                onClick={() => setView('add-payment')}
                className="w-full p-4 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-center gap-2 text-gray-400 font-black text-sm uppercase tracking-widest hover:border-primary/20 hover:text-primary transition-all"
              >
                <Plus size={18} />
                <span>Add Payment Method</span>
              </button>
            </div>
          </motion.div>
        );

      case 'settings':
        return (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6 w-full"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('main')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-black text-gray-900">Settings</h2>
            </div>
            
            <div className="space-y-3 px-2">
              {[
                { id: 'pushNotifications', label: 'Push Notifications' },
                { id: 'emailUpdates', label: 'Email Updates' },
                { id: 'darkMode', label: 'Dark Mode' }
              ].map(setting => {
                const isActive = profile?.settings?.[setting.id as keyof typeof profile.settings] ?? (setting.id === 'pushNotifications');
                return (
                  <div key={setting.id} className="flex items-center justify-between p-5 bg-gray-50 border border-transparent rounded-3xl hover:bg-gray-100/50 transition-colors">
                    <span className="font-bold text-gray-900">{setting.label}</span>
                    <button 
                      onClick={() => updateSettings?.({ [setting.id]: !isActive })}
                      className={cn(
                        "w-12 h-6 rounded-full cursor-pointer relative transition-colors duration-300",
                        isActive ? "bg-primary" : "bg-gray-200"
                      )}
                    >
                      <motion.div 
                        animate={{ x: isActive ? 24 : 2 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>
                );
              })}

              <div className="pt-4 space-y-3">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-1">Legal</div>
                {['Privacy Policy', 'Terms of Service'].map(page => (
                  <button 
                    key={page} 
                    onClick={() => showToast(`Opening ${page}...`, "info")}
                    className="w-full h-16 flex items-center justify-between p-5 bg-white border border-gray-100 rounded-3xl hover:border-gray-300 transition-all group"
                  >
                    <span className="font-bold text-gray-700">{page}</span>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case 'sustainability':
        return (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="space-y-6 w-full"
          >
            <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setView('main')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-black text-gray-900">Impact Report</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                <div className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-1">CO2 Footprint Reduced</div>
                <div className="text-4xl font-black text-primary">{(profile?.savedCO2 || 0).toFixed(1)}kg</div>
                <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed">
                  By rescuing meals, you've prevented carbon emissions equivalent to planting 
                  <span className="text-primary font-black mx-1 italic">
                    {((profile?.savedCO2 || 0) / 21).toFixed(1)}
                  </span> 
                  trees' yearly absorption!
                </p>
              </div>

              <div className="bg-accent/5 p-6 rounded-3xl border border-accent/10">
                <div className="font-black text-gray-400 text-[10px] uppercase tracking-widest mb-1">Water Saved</div>
                <div className="text-4xl font-black text-accent">{(profile?.mealsSaved || 0) * 800}L</div>
                <p className="text-sm text-gray-500 font-medium mt-2 leading-relaxed">Rescuing food also saves the water used in production. Way to go!</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-3xl">
                <h4 className="font-black text-gray-900 mb-4">Milestones</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">🏆</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-900">First Rescuer</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase">Completed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return (
          <motion.div 
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center w-full"
          >
            <div className="mb-6">
              <AvatarUpload 
                currentPhotoURL={profile?.photoURL || null} 
                uid={user.uid}
                onUploadSuccess={(url) => {
                  updateProfileData({ photoURL: url });
                  showToast("Photo updated!", "success");
                }}
              />
            </div>
            
            <button 
              onClick={() => setView('edit-profile')}
              className="flex flex-col items-center gap-1.5 mb-8 group"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-gray-900">{profile?.displayName || 'Rescue Hero'}</h2>
                <Pencil size={18} className="text-gray-300 group-hover:text-primary transition-colors" />
              </div>
              <p className="text-gray-400 font-medium text-sm">Saving food since {profile?.createdAt?.seconds ? new Date(profile.createdAt.seconds * 1000).toLocaleDateString() : 'joining'}</p>
            </button>
            
            <div className="grid grid-cols-2 gap-4 w-full px-4 mb-4">
              <div className="bg-gray-50 p-6 rounded-3xl flex flex-col gap-2 shadow-sm border border-gray-100/50">
                <div className="w-10 h-10 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <span className="text-2xl font-black text-gray-900 block">{profile?.mealsSaved || 0}</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meals Rescued</span>
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl flex flex-col gap-2 shadow-sm border border-gray-100/50">
                <div className="w-10 h-10 bg-accent text-white rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <span className="text-2xl font-black text-gray-900 block">{(profile?.savedCO2 || 0).toFixed(1)}kg</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CO2 Saved</span>
                </div>
              </div>
            </div>

            <div className="w-full px-4 mt-8 space-y-4">
              {menuItems.map(item => (
                <button 
                  key={item.id} 
                  onClick={() => setView(item.id as ViewState)}
                  className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={18} className="text-gray-400 group-hover:text-primary transition-colors" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              ))}
              <button 
                onClick={logout}
                className="w-full p-4 text-red-500 font-black text-sm uppercase tracking-widest pt-8 flex items-center justify-center gap-2 hover:bg-red-50 rounded-2xl transition-all"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="p-6 min-h-full bg-white flex flex-col items-center pt-8 overflow-y-auto font-sans pb-32 relative">
      <AnimatePresence mode="wait">
        <motion.div 
          key={view}
          className="w-full max-w-md flex flex-col items-center"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const AlertCircle = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');

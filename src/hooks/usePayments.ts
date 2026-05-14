import { useState } from 'react';
import { doc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { PaymentMethod } from '../types/user';

export function usePayments() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const addPaymentMethod = async (payment: Omit<PaymentMethod, 'id'>) => {
    if (!user) throw new Error('User must be logged in to add payment method');
    setLoading(true);
    
    const newPayment: PaymentMethod = {
      ...payment,
      id: crypto.randomUUID()
    };

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        paymentMethods: arrayUnion(newPayment)
      }, { merge: true });
      await refreshProfile();
      return newPayment;
    } catch (error) {
      console.error("Error adding payment method:", error);
      throw new Error("Failed to save payment method.");
    } finally {
      setLoading(false);
    }
  };

  const deletePaymentMethod = async (id: string) => {
    if (!user || !profile || !profile.paymentMethods) return;
    setLoading(true);

    try {
      const paymentToDelete = profile.paymentMethods.find(p => p.id === id);
      if (!paymentToDelete) return;

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        paymentMethods: arrayRemove(paymentToDelete)
      }, { merge: true });
      await refreshProfile();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      throw new Error("Failed to delete payment method.");
    } finally {
      setLoading(false);
    }
  };

  const setDefault = async (id: string) => {
    if (!user || !profile || !profile.paymentMethods) return;
    setLoading(true);

    try {
      const updatedMethods = profile.paymentMethods.map(p => ({
        ...p,
        isDefault: p.id === id
      }));

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        paymentMethods: updatedMethods
      }, { merge: true });
      await refreshProfile();
    } catch (error) {
      console.error("Error setting default payment:", error);
      throw new Error("Failed to set default payment method.");
    } finally {
      setLoading(false);
    }
  };

  return {
    payments: profile?.paymentMethods || [],
    addPaymentMethod,
    deletePaymentMethod,
    setDefault,
    loading
  };
}

/**
 * useAddresses.ts - Hook for managing user addresses in Firestore
 * Created to satisfy Fix 1 of the FoodSaver platform requirements
 */

import { useState } from 'react';
import { doc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { SavedAddress } from '../types/user';

export function useAddresses() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const addAddress = async (address: Omit<SavedAddress, 'id'>) => {
    if (!user) throw new Error('User must be logged in to add address');
    setLoading(true);
    
    const newAddress: SavedAddress = {
      ...address,
      id: crypto.randomUUID()
    };

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        savedAddresses: arrayUnion(newAddress)
      }, { merge: true });
      await refreshProfile();
    } catch (error) {
      console.error("Error adding address:", error);
      throw new Error("Failed to save address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateAddress = async (id: string, updates: Partial<SavedAddress>) => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      const addressToUpdate = profile.savedAddresses.find(a => a.id === id);
      if (!addressToUpdate) throw new Error("Address not found");

      const updatedAddress = { ...addressToUpdate, ...updates };
      const userRef = doc(db, 'users', user.uid);

      // To update an item in an array, we unfortunately have to replace the whole array 
      // or do a remove/add if we want to be atomic. 
      // Overwriting the array is easier if we have the full list.
      const newAddresses = profile.savedAddresses.map(a => a.id === id ? updatedAddress : a);
      
      await setDoc(userRef, {
        savedAddresses: newAddresses
      }, { merge: true });
      await refreshProfile();
    } catch (error) {
      console.error("Error updating address:", error);
      throw new Error("Failed to update address.");
    } finally {
      setLoading(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      const addressToDelete = profile.savedAddresses.find(a => a.id === id);
      if (!addressToDelete) return;

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        savedAddresses: arrayRemove(addressToDelete)
      }, { merge: true });
      await refreshProfile();
    } catch (error) {
      console.error("Error deleting address:", error);
      throw new Error("Failed to delete address.");
    } finally {
      setLoading(false);
    }
  };

  const setDefault = async (id: string) => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      const updatedAddresses = profile.savedAddresses.map(a => ({
        ...a,
        isDefault: a.id === id
      }));

      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        savedAddresses: updatedAddresses
      }, { merge: true });
      await refreshProfile();
    } catch (error) {
      console.error("Error setting default address:", error);
      throw new Error("Failed to set default address.");
    } finally {
      setLoading(false);
    }
  };

  return {
    addresses: profile?.savedAddresses || [],
    addAddress,
    updateAddress,
    deleteAddress,
    setDefault,
    loading
  };
}

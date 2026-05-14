/**
 * TypeScript interfaces for user-related data
 * Created as per FoodSaver platform requirements
 */

export interface SavedAddress {
  id: string;
  label: string; // e.g., "Home", "Work"
  fullAddress: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'gcash' | 'card' | 'maya';
  label: string;
  accountNumber?: string; // For GCash/Maya mask
  lastFour?: string; // For cards
  expiry?: string; // e.g. "12/28"
  brand?: string; // e.g. "Visa", "Mastercard"
  isDefault: boolean;
}

export interface UserSettings {
  pushNotifications: boolean;
  emailUpdates: boolean;
  darkMode: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  savedCO2: number; // in kg
  mealsSaved: number;
  savedAddresses: SavedAddress[];
  paymentMethods?: PaymentMethod[];
  createdAt: any; // Firestore timestamp or string
  lastFetched?: number; // Timestamp for cache tracking
  settings?: UserSettings;
}

export interface ProfileEditState {
  isEditingName: boolean;
  isUploadingPhoto: boolean;
  uploadProgress: number;
  nameError: string | null;
  photoError: string | null;
}

export interface OrderSummary {
  orderId: string;
  timestamp: string;
  itemCount: number;
  totalPrice: number;
  co2Saved: number;
}

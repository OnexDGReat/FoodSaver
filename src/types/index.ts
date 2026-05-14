/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'customer' | 'restaurant' | 'rider' | 'admin';

export interface ImpactStats {
  mealsRescued: number;
  co2Saved: number; // in kg
  moneySaved: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  address?: string;
  preferences?: {
    dietary: string[]; // vegan, halal, vegetarian, etc.
  };
  impactStats: ImpactStats;
  photoUrl?: string;
}

export interface PickupWindow {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface Restaurant {
  id: string;
  name: string;
  logo: string;
  cover: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewsCount: number;
  pickupWindow: PickupWindow;
  categories: string[];
  distance?: number; // Calculated field
}

export interface Listing {
  id: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  photo: string;
  description: string;
  originalPrice: number;
  rescuePrice: number;
  quantity: number;
  expiryTime: string; // ISO string
  category: string;
  allergens: string[];
  status: 'available' | 'sold_out' | 'expired';
}

export type OrderStatus = 'pending' | 'preparing' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled';

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
  userId: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  deliveryType: 'pickup' | 'delivery';
  address?: string | { label: string; fullAddress: string; lat?: number; lng?: number };
  riderId?: string;
  riderName?: string;
  riderPhoto?: string;
  riderRating?: number;
  restaurantRating?: number;
  createdAt: string; // ISO string
}

export interface Rider {
  id: string;
  name: string;
  photo: string;
  rating: number;
  status: 'online' | 'offline' | 'busy';
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

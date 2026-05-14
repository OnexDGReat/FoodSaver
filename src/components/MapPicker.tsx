import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Loader2, Navigation } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

// Fix for Leaflet marker icons
import 'leaflet/dist/leaflet.css';
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number, address: string) => void;
  className?: string;
}

// Default center (Davao City as used in OrderTracking)
const DEFAULT_CENTER: [number, number] = [7.0712, 125.6089];

function MapEvents({ onMoveEnd }: { onMoveEnd: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const { lat, lng } = map.getCenter();
      onMoveEnd(lat, lng);
    },
  });
  return null;
}

function CenterButton() {
  const map = useMap();
  const [loading, setLoading] = useState(false);

  const handleGetCurrentLocation = () => {
    setLoading(true);
    map.locate().on('locationfound', (e) => {
      map.flyTo(e.latlng, map.getZoom());
      setLoading(false);
    }).on('locationerror', () => {
      setLoading(false);
      alert("Could not get your location. Please check your browser permissions.");
    });
  };

  return (
    <button 
      onClick={handleGetCurrentLocation}
      className="absolute bottom-6 right-6 z-[1000] p-3 bg-white text-primary rounded-2xl shadow-xl border border-gray-100 hover:bg-gray-50 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-2"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
      <span>My Location</span>
    </button>
  );
}

export function MapPicker({ initialLat, initialLng, onLocationSelect, className }: MapPickerProps) {
  const [center, setCenter] = useState<[number, number]>(
    initialLat && initialLng ? [initialLat, initialLng] : DEFAULT_CENTER
  );
  const [address, setAddress] = useState<string>('');
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const addr = data.display_name || `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setAddress(addr);
      onLocationSelect(lat, lng, addr);
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      const fallback = `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setAddress(fallback);
      onLocationSelect(lat, lng, fallback);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Initial geocode
  useEffect(() => {
    reverseGeocode(center[0], center[1]);
  }, []);

  const handleMoveEnd = (lat: number, lng: number) => {
    setCenter([lat, lng]);
    reverseGeocode(lat, lng);
  };

  return (
    <div className={cn("relative rounded-[2rem] overflow-hidden border-2 border-primary/10 shadow-inner group", className)}>
      <MapContainer 
        center={center} 
        zoom={16} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMoveEnd={handleMoveEnd} />
        <CenterButton />
      </MapContainer>
      
      {/* Fixed Pin Overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
        <motion.div 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative flex flex-col items-center"
        >
          <div className="bg-primary p-3 rounded-full shadow-2xl ring-8 ring-primary/20 text-white">
            <MapPin size={32} />
          </div>
          <div className="w-1.5 h-1.5 bg-gray-900/20 rounded-full mt-1 blur-[1px]" />
        </motion.div>
      </div>

      {/* Address Bar */}
      <div className="absolute top-6 left-6 right-6 z-[1000]">
        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-primary/10 flex items-start gap-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isReverseGeocoding ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"
          )}>
            {isReverseGeocoding ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Pinned Location</div>
            <p className="text-xs font-bold text-gray-700 truncate">
              {isReverseGeocoding ? "Identifying location..." : address || "Pin your location"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

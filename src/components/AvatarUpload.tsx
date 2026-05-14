import React, { useState, useRef } from 'react';
import { Camera, AlertCircle } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { auth, storage } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';

interface AvatarUploadProps {
  currentPhotoURL: string | null;
  onUploadSuccess: (url: string) => void;
  uid: string;
}

export function AvatarUpload({ currentPhotoURL, onUploadSuccess, uid }: AvatarUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload an image file (JPEG, PNG, WEBP, or GIF).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB.');
      return;
    }

    setError(null);
    
    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewURL(objectUrl);
    setIsLoaded(true); // Treat local preview as loaded

    // Upload logic
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Compress image before upload to address "pictures load too long" feedback
      const options = {
        maxSizeMB: 0.5, // Aim for 500KB
        maxWidthOrHeight: 800, // Reasonable for avatars
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      const timestamp = Date.now();
      const fileName = `${timestamp}-${compressedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `profile-photos/${uid}/${fileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed", error);
          if (error.code === 'storage/unauthorized') {
            setError('Permission denied. Please check your Storage rules in Firebase Console.');
          } else if (error.code === 'storage/canceled') {
            setError('Upload canceled.');
          } else {
            setError(`Upload failed: ${error.message}`);
          }
          setIsUploading(false);
          setPreviewURL(null);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Update Firebase Auth Profile
            if (auth.currentUser) {
              await updateProfile(auth.currentUser, { photoURL: downloadURL });
            }
            
            // Clear local preview now that we have the URL
            setPreviewURL(null);
            onUploadSuccess(downloadURL);
            setIsUploading(false);
            setUploadProgress(0);
          } catch (err: any) {
            setError(`Failed to finalize upload: ${err.message}`);
            setIsUploading(false);
          }
        }
      );
    } catch (err: any) {
      console.error("Compression failed", err);
      setError(`Image processing failed: ${err.message}`);
      setIsUploading(false);
    }
  };

  const initials = auth.currentUser?.displayName
    ? auth.currentUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        
        <div 
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className="w-28 h-28 bg-gray-50 rounded-full flex items-center justify-center border-4 border-white shadow-xl overflow-hidden cursor-pointer relative"
          aria-label="Change profile photo"
        >
          {/* Main Image */}
          {(previewURL || currentPhotoURL) ? (
            <img 
              src={previewURL || currentPhotoURL || ''} 
              alt="Profile" 
              className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setIsLoaded(true)}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="text-primary text-4xl font-black">{initials}</span>
          )}

          {/* Fallback while loading image */}
          {(!isLoaded && (previewURL || currentPhotoURL)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <span className="text-primary text-4xl font-black">{initials}</span>
            </div>
          )}

          {/* Upload Progress Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-white/20"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={126}
                    strokeDashoffset={126 - (126 * uploadProgress) / 100}
                    className="text-primary transition-all duration-300"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold">{Math.round(uploadProgress)}%</span>
              </div>
            </div>
          )}

          {/* Hover Overlay */}
          {!isUploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={24} className="text-white" />
            </div>
          )}
        </div>

        {/* Camera Icon Overlay (Static) */}
        {!isUploading && (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-1 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center border-4 border-white shadow-lg hocus:scale-110 transition-transform"
            aria-label="Change profile photo"
          >
            <Camera size={14} />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 px-3 py-1.5 rounded-full border border-red-100">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 w-full max-w-[340px] px-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`
                pointer-events-auto
                flex items-center gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-xl border
                ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-100 text-emerald-800' : ''}
                ${toast.type === 'error' ? 'bg-red-50/90 border-red-100 text-red-800' : ''}
                ${toast.type === 'info' ? 'bg-blue-50/90 border-blue-100 text-blue-800' : ''}
              `}
            >
              <div className="flex-shrink-0">
                {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-500" />}
                {toast.type === 'error' && <XCircle size={20} className="text-red-500" />}
                {toast.type === 'info' && <Info size={20} className="text-blue-500" />}
              </div>
              <p className="flex-1 text-sm font-black italic leading-tight">{toast.message}</p>
              <button 
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

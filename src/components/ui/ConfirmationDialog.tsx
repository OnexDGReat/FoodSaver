import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110]"
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[120] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden pointer-events-auto"
            >
              <div className="p-6 pt-8 text-center flex flex-col items-center">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mb-6",
                  variant === 'danger' ? "bg-red-50 text-red-500" : 
                  variant === 'warning' ? "bg-amber-50 text-amber-500" :
                  "bg-blue-50 text-blue-500"
                )}>
                  <AlertCircle size={32} />
                </div>
                
                <h2 className="text-2xl font-black text-gray-900 italic mb-3 leading-tight">
                  {title}
                </h2>
                
                <p className="text-gray-500 text-sm font-medium leading-relaxed px-2">
                  {description}
                </p>
              </div>

              <div className="p-6 bg-gray-50/50 flex flex-col gap-3">
                <Button
                  onClick={onConfirm}
                  loading={isLoading}
                  className={cn(
                    "w-full h-12 rounded-2xl text-xs font-black italic tracking-widest transition-all",
                    variant === 'danger' ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20" :
                    variant === 'warning' ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20" :
                    "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  )}
                >
                  {confirmText}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-full h-12 rounded-2xl text-xs font-black italic tracking-widest border-none bg-white text-gray-500 hover:bg-gray-100"
                >
                  {cancelText}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

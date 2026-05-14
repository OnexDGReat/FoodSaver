import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, Chrome, ArrowLeft, Send } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in Firebase. Please enable it in the console (Build -> Authentication -> Sign-in method).');
      } else {
        setError(err.message || 'Failed to sign in');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    
    setResetLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setSuccess('Password reset email sent! Please check your inbox.');
      setResetEmail('');
      setTimeout(() => setShowForgot(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  if (showForgot) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex flex-col p-8 justify-center">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-sm mx-auto w-full space-y-8"
        >
          <button 
            onClick={() => {
              setShowForgot(false);
              setError(null);
              setSuccess(null);
            }}
            className="flex items-center gap-2 text-gray-400 font-bold hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Back to Login</span>
          </button>

          <div className="space-y-4">
            <h1 className="text-3xl font-black text-gray-900 leading-tight">Forgot Password?</h1>
            <p className="text-gray-500 font-medium leading-relaxed">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {(error || success) && (
            <div className={cn(
              "p-4 rounded-2xl text-xs font-bold border italic leading-relaxed",
              error ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
            )}>
              {error || success}
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full h-14 bg-white border border-gray-100 rounded-[16px] pl-12 pr-4 font-bold text-gray-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                  placeholder="hello@example.com"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-14 flex items-center justify-center gap-2" disabled={resetLoading}>
              {resetLoading ? <Loader2 className="animate-spin" /> : (
                <>
                  <span>Send Reset Link</span>
                  <Send size={18} />
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col p-8 justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm mx-auto w-full space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-md mb-6 overflow-hidden">
            <img 
              src="https://i.ibb.co/Y4mY5sGW/Food-Saver-removebg-preview-Picsart-Ai-Image-Enhancer.png" 
              alt="FoodSaver Logo" 
              className="w-full h-full object-contain scale-110"
            />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Welcome Back</h1>
          <p className="text-gray-500 font-medium">Continue your food rescue mission.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 italic leading-relaxed">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-white border border-gray-100 rounded-[16px] pl-12 pr-4 font-bold text-gray-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                  placeholder="hello@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-white border border-gray-100 rounded-[16px] pl-12 pr-4 font-bold text-gray-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex justify-end pt-1">
                <button 
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-[11px] font-black text-gray-400 hover:text-primary transition-colors uppercase tracking-widest"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-14" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
            </Button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 font-medium">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-black hover:underline">
              Create One
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

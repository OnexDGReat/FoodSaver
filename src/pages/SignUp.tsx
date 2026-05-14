import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, User, Loader2, Chrome } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password registration is not enabled in Firebase. Please enable it in the console (Build -> Authentication -> Sign-in method).');
      } else {
        setError(err.message || 'Failed to create account');
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
          <h1 className="text-3xl font-black text-gray-900">New Here?</h1>
          <p className="text-gray-500 font-medium">Join the community saving food.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 italic leading-relaxed">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-14 bg-white border border-gray-100 rounded-[16px] pl-12 pr-4 font-bold text-gray-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

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
                  placeholder="at least 6 characters"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="secondary" className="w-full h-14" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Create Account"}
            </Button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500 font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-black hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

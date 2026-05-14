import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, ShoppingBag, User, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

import { useAuth } from '../context/AuthContext';

interface NavItemProps {
  to: string;
  icon: typeof Home;
  label: string;
  active?: boolean;
  onHover?: () => void;
}

function NavItem({ to, icon: Icon, label, active, onHover }: NavItemProps) {
  return (
    <Link 
      to={to} 
      onMouseEnter={onHover}
      className={cn(
        'flex flex-col items-center justify-center gap-1 transition-all duration-300 flex-1 py-1 relative',
        active ? 'text-primary scale-110' : 'text-gray-400'
      )}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[9px] font-black uppercase tracking-[0.05em]">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-dot"
          className="w-1.5 h-1.5 bg-primary rounded-full absolute -bottom-1" 
        />
      )}
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { refreshProfile } = useAuth();
  const hideNav = ['/login', '/signup', '/onboarding', '/checkout', '/tracking'].includes(location.pathname);

  return (
    <div className="mobile-container overflow-hidden flex flex-col font-sans">
      <main className={cn(
        "flex-1 overflow-y-auto no-scrollbar pb-24",
        hideNav && "pb-0"
      )}>
        {children}
      </main>
      
      {!hideNav && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] bg-white/95 border-t border-gray-100 flex items-center justify-around h-20 px-4 backdrop-blur-md safe-area-bottom z-50">
          <NavItem to="/" icon={Home} label="Home" active={location.pathname === '/'} />
          <NavItem to="/explore" icon={Compass} label="Explore" active={location.pathname === '/explore'} />
          <NavItem to="/ai-picks" icon={Sparkles} label="AI Picks" active={location.pathname === '/ai-picks'} />
          <NavItem to="/orders" icon={ShoppingBag} label="Orders" active={location.pathname === '/orders'} />
          <NavItem to="/profile" icon={User} label="Profile" active={location.pathname === '/profile'} onHover={refreshProfile} />
        </nav>
      )}
    </div>
  );
}

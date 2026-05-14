import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Leaf, Wallet, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';

const STEPS = [
  {
    id: 1,
    title: 'Rescue Delicious Food',
    description: 'Save perfectly good meals from going to waste while enjoying huge discounts.',
    icon: Leaf,
    color: 'bg-green-100 text-green-600'
  },
  {
    id: 2,
    title: 'Huge Savings',
    description: 'Get up to 70% off on your favorite meals from top local restaurants.',
    icon: Wallet,
    color: 'bg-orange-100 text-orange-600'
  },
  {
    id: 3,
    title: 'Real-time Tracking',
    description: 'Pick up your food or get it delivered. Track every step of the journey.',
    icon: Clock,
    color: 'bg-blue-100 text-blue-600'
  }
];

export function Onboarding({ onComplete }: { onComplete?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      localStorage.setItem('foodsaver_onboarded', 'true');
      if (onComplete) onComplete();
      navigate('/');
    }
  };

  const step = STEPS[currentStep];

  return (
    <div className="h-full flex flex-col p-8 bg-white relative overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            <div className={cn(step.color, "p-8 rounded-[32px] mb-10 shadow-lg shadow-black/5")}>
              <step.icon size={56} strokeWidth={1.5} />
            </div>
            
            <h1 className="text-4xl font-extrabold mb-6 tracking-tight text-[#1A1A1A]">
              {step.title.split(' ').map((word, i) => i === 0 ? word + ' ' : <span key={i} className="text-primary">{word} </span>)}
            </h1>
            
            <p className="text-gray-500 text-lg px-4 leading-relaxed">
              {step.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="space-y-6">
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div 
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-8 bg-primary' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <Button 
          onClick={handleNext}
          className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 group"
        >
          <span>{currentStep === STEPS.length - 1 ? "Let's Go!" : "Continue"}</span>
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}

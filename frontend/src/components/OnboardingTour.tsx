import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
}

const STEPS: Step[] = [
  {
    icon: '⚖️',
    title: 'Welcome to Equilibrium',
    subtitle: 'Your AI Workload Balancer & Scheduler',
    description: 'Equilibrium uses machine learning to balance your academic workload, prevent burnout, and build optimal daily study routines.',
    badge: 'Step 1 of 5',
  },
  {
    icon: '📋',
    title: 'Smart Task Management',
    subtitle: 'AI Duration Prediction',
    description: 'Create tasks with estimated durations. Equilibrium analyzes your past study habits to predict your actual study time with high accuracy.',
    badge: 'Step 2 of 5',
  },
  {
    icon: '⚡',
    title: 'AI Schedule Engine',
    subtitle: 'Automatic Conflict-Free Scheduling',
    description: 'Click "Generate Schedule" to automatically construct a balanced timeline that respects your sleep schedule, class times, and break intervals.',
    badge: 'Step 3 of 5',
  },
  {
    icon: '✋',
    title: 'Drag & Drop & Weekly View',
    subtitle: 'Total Schedule Flexibility',
    description: 'Easily drag and drop schedule blocks to rearrange your day, or switch to the Google Calendar style 7-Day Weekly Grid view.',
    badge: 'Step 4 of 5',
  },
  {
    icon: '🔔',
    title: 'Calendar Sync & Reminders',
    subtitle: 'Never Miss a Deadline',
    description: 'Export your schedule to Google Calendar (.ics) and enable push notifications for upcoming study blocks and deadline alerts.',
    badge: 'Step 5 of 5',
  },
];

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const OnboardingTour = ({ forceOpen = false, onClose }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setStepIndex(0);
      return;
    }

    const completed = localStorage.getItem('equilibrium_onboarding_completed');
    if (!completed) {
      // Small delay so user sees dashboard first
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  const handleFinish = () => {
    localStorage.setItem('equilibrium_onboarding_completed', 'true');
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  };

  if (!isOpen) return null;

  const currentStep = STEPS[stepIndex];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md glass-card-elevated p-6 border border-brand-primary/40 shadow-2xl bg-bg-secondary/95 rounded-3xl relative overflow-hidden"
        >
          {/* Background glow decoration */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-secondary/20 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
              {currentStep.badge}
            </span>
            <button
              onClick={handleFinish}
              className="text-xs text-text-muted hover:text-text-primary px-2 py-1 transition-colors"
            >
              Skip Tour ✕
            </button>
          </div>

          {/* Animated Card Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-3xl shadow-glow">
                {currentStep.icon}
              </div>

              <h2 className="text-xl font-bold text-text-primary mb-1">
                {currentStep.title}
              </h2>
              <p className="text-xs font-medium text-brand-accent mb-3">
                {currentStep.subtitle}
              </p>
              <p className="text-text-muted text-sm leading-relaxed px-2">
                {currentStep.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress Indicators */}
          <div className="flex items-center justify-center gap-1.5 my-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex
                    ? 'w-6 bg-brand-primary'
                    : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            {stepIndex > 0 ? (
              <button
                onClick={handleBack}
                className="btn-secondary py-2.5 px-4 text-xs font-semibold"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={handleNext}
              className="btn-primary flex-1 py-2.5 px-4 text-xs font-semibold shadow-md"
            >
              {stepIndex === STEPS.length - 1 ? '🚀 Let\'s Get Started!' : 'Continue →'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

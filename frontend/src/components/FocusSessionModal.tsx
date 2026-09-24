import { useState, useEffect } from 'react';
import { IonModal, IonContent } from '@ionic/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Task, ScheduleBlock } from '../types';

interface Props {
  isOpen: boolean;
  block?: ScheduleBlock;
  task?: Task;
  onClose: () => void;
}

export const FocusSessionModal = ({ isOpen, block, task, onClose }: Props) => {
  const qc = useQueryClient();
  const currentTask = task || (block?.taskId as Task | undefined);

  const [initialMinutes, setInitialMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setSecondsLeft(initialMinutes * 60);
    setIsActive(false);
  }, [initialMinutes, isOpen]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      // Auto complete when timer finishes
      if (currentTask?._id) {
        completeMutation.mutate(initialMinutes);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsLeft, currentTask, initialMinutes]);

  const completeMutation = useMutation({
    mutationFn: (actualMins: number) =>
      api.post(`/tasks/${currentTask?._id}/complete`, { actualDurationMinutes: actualMins }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedule'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['analytics-summary'] });
      onClose();
    },
  });

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setSecondsLeft(initialMinutes * 60);
  };

  const minutesDisplay = Math.floor(secondsLeft / 60);
  const secondsDisplay = secondsLeft % 60;
  const progressPercent = ((initialMinutes * 60 - secondsLeft) / (initialMinutes * 60)) * 100;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonContent>
        <div className="bg-bg-primary min-h-full flex flex-col justify-between p-6 max-w-md mx-auto text-center">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="badge bg-brand-primary/20 text-brand-primary text-xs border border-brand-primary/30">
              🔥 Focus Mode
            </span>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg">
              ✕
            </button>
          </div>

          {/* Task Info */}
          <div className="my-4">
            <h2 className="text-xl font-bold text-text-primary">
              {currentTask?.title || 'Deep Work Focus Session'}
            </h2>
            <p className="text-text-muted text-xs mt-1">
              Category: <span className="text-brand-accent capitalize">{currentTask?.category || 'Study'}</span>
            </p>
          </div>

          {/* Timer Circle */}
          <div className="relative w-64 h-64 mx-auto my-6 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                className="text-white/5 stroke-current"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                className="text-brand-primary stroke-current transition-all duration-1000"
                strokeWidth="6"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-extrabold font-mono text-text-primary tracking-wider">
                {minutesDisplay.toString().padStart(2, '0')}:{secondsDisplay.toString().padStart(2, '0')}
              </span>
              <span className="text-xs text-text-muted mt-1 uppercase tracking-widest">
                {isActive ? 'Concentrating...' : 'Paused'}
              </span>
            </div>
          </div>

          {/* Presets Selector */}
          <div className="flex justify-center gap-2 mb-6">
            {[15, 25, 50].map((mins) => (
              <button
                key={mins}
                onClick={() => setInitialMinutes(mins)}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  initialMinutes === mins
                    ? 'bg-brand-primary text-white shadow-glow'
                    : 'btn-secondary text-text-muted'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <button onClick={resetTimer} className="btn-secondary flex-1 py-3 text-sm">
                🔄 Reset
              </button>
              <button
                onClick={toggleTimer}
                className="btn-primary flex-1 py-3 text-sm font-bold shadow-glow"
              >
                {isActive ? '⏸️ Pause' : '▶️ Start Focus'}
              </button>
            </div>

            {currentTask?._id && (
              <button
                onClick={() => {
                  const actualMins = Math.max(1, Math.round((initialMinutes * 60 - secondsLeft) / 60));
                  completeMutation.mutate(actualMins || initialMinutes);
                }}
                disabled={completeMutation.isPending}
                className="btn-secondary w-full py-2.5 text-xs text-status-success border-status-success/30 hover:bg-status-success/10 font-semibold"
              >
                ✓ Mark Task Complete Now
              </button>
            )}
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

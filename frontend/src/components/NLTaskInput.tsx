import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export const NLTaskInput = () => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const qc = useQueryClient();

  const parseMutation = useMutation({
    mutationFn: (text: string) => api.post('/tasks/parse-nl', { input: text }),
    onSuccess: () => {
      setInput('');
      setError('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['schedule'] });
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to parse natural language task');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    parseMutation.mutate(input);
  };

  return (
    <div className="mb-5">
      <div className="glass-card border border-brand-primary/20 rounded-2xl overflow-hidden">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 pl-3.5">
          <span className="text-base shrink-0 select-none">✨</span>
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            placeholder='e.g. "Physics exam prep, 3 hrs, due Friday"'
            className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted py-2 min-w-0"
            disabled={parseMutation.isPending}
          />
          <button
            type="submit"
            disabled={!input.trim() || parseMutation.isPending}
            className="btn-primary !text-xs !py-2 !px-3.5 !min-h-0 shrink-0"
          >
            {parseMutation.isPending ? (
              <span className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
            ) : success ? '✓ Added!' : 'Add'}
          </button>
        </form>
        {error && (
          <div className="px-3.5 pb-3 text-xs text-status-error flex items-center gap-1">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>
      <p className="text-[11px] text-text-muted mt-1.5 px-1">
        Type naturally — AI will extract title, duration & deadline.
      </p>
    </div>
  );
};

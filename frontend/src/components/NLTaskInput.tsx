import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export const NLTaskInput = () => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const parseMutation = useMutation({
    mutationFn: (text: string) => api.post('/tasks/parse-nl', { input: text }),
    onSuccess: () => {
      setInput('');
      setError('');
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
    <div className="glass-card-elevated p-3.5 mb-6 border border-brand-primary/30 rounded-2xl shadow-lg bg-bg-secondary/90">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="text-xl pl-1 shrink-0">✨</div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Try: "Add: Physics exam prep, 3 hours, due Friday"'
          className="input-field py-2 text-xs md:text-sm border-none bg-transparent focus:ring-0"
        />
        <button
          type="submit"
          disabled={!input.trim() || parseMutation.isPending}
          className="btn-primary text-xs py-2 px-3 shrink-0 rounded-xl font-semibold shadow-glow"
        >
          {parseMutation.isPending ? (
            <span className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
          ) : (
            '✨ Auto-Create'
          )}
        </button>
      </form>
      {error && <p className="text-status-error text-xs mt-1.5 pl-2">{error}</p>}
    </div>
  );
};

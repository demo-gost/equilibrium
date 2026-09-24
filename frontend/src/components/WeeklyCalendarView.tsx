import { useState } from 'react';
import { format, startOfWeek, addDays, parseISO, isSameDay } from 'date-fns';
import type { ScheduleBlock, Task } from '../types';

interface Props {
  selectedDate: Date;
  blocks: ScheduleBlock[];
  onBlockTimesUpdated: (blockId: string, newStart: Date, newEnd: Date) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00

const BLOCK_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  TASK:     { bg: 'bg-brand-primary/25 text-brand-primary',   border: 'border-brand-primary/40',  icon: '📚' },
  BREAK:    { bg: 'bg-status-success/20 text-status-success', border: 'border-status-success/30', icon: '☕' },
  BUFFER:   { bg: 'bg-white/10 text-text-muted',              border: 'border-white/15',          icon: '🔄' },
  SLEEP:    { bg: 'bg-blue-900/30 text-blue-400',             border: 'border-blue-500/30',       icon: '🌙' },
  COLLEGE:  { bg: 'bg-orange-500/20 text-orange-400',         border: 'border-orange-500/30',     icon: '🎓' },
  PERSONAL: { bg: 'bg-purple-500/20 text-purple-400',         border: 'border-purple-500/30',     icon: '🏠' },
};

export const WeeklyCalendarView = ({ selectedDate, blocks, onBlockTimesUpdated }: Props) => {
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    e.dataTransfer.setData('text/plain', blockId);
    setDraggedBlockId(blockId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const blockId = e.dataTransfer.getData('text/plain') || draggedBlockId;
    if (!blockId) return;

    const block = blocks.find((b) => b._id === blockId);
    if (!block) return;

    const durationMins = block.scheduledDurationMinutes || 60;
    const newStart = new Date(day);
    newStart.setHours(hour, 0, 0, 0);

    const newEnd = new Date(newStart.getTime() + durationMins * 60000);

    onBlockTimesUpdated(blockId, newStart, newEnd);
    setDraggedBlockId(null);
  };

  return (
    <div className="glass-card-elevated p-4 overflow-x-auto">
      <div className="min-w-[650px]">
        {/* Days Header */}
        <div className="grid grid-cols-8 border-b border-white/10 pb-2 mb-2 text-center">
          <div className="text-xs font-semibold text-text-muted self-end pb-1">Time</div>
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className="flex flex-col items-center">
                <span className="text-xs text-text-muted font-medium">{format(day, 'EEE')}</span>
                <span
                  className={`text-sm font-bold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-brand-primary text-white shadow-glow' : 'text-text-primary'}`}
                >
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>

        {/* 24h Time Grid */}
        <div className="space-y-1">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-1 min-h-[44px]">
              {/* Hour Label */}
              <div className="text-xs font-mono text-text-muted pr-2 pt-1 text-right select-none">
                {hour.toString().padStart(2, '0')}:00
              </div>

              {/* 7 Day Slots */}
              {weekDays.map((day) => {
                // Find blocks starting during this hour on this day
                const dayBlocks = blocks.filter((b) => {
                  const start = parseISO(b.startTime);
                  return isSameDay(start, day) && start.getHours() === hour;
                });

                return (
                  <div
                    key={day.toISOString() + hour}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day, hour)}
                    className="border border-white/5 rounded-lg p-1 bg-white/[0.02] hover:bg-white/[0.06] transition-colors relative min-h-[44px]"
                  >
                    {dayBlocks.map((block) => {
                      const cfg = BLOCK_STYLES[block.type] || BLOCK_STYLES.TASK;
                      const task = block.taskId as Task | undefined;
                      const title = block.type === 'TASK' ? task?.title || 'Task' : block.reason || cfg.icon + ' ' + block.type;

                      return (
                        <div
                          key={block._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, block._id)}
                          className={`p-1.5 rounded-md border ${cfg.bg} ${cfg.border} cursor-grab active:cursor-grabbing text-xs shadow-sm hover:scale-[1.02] transition-transform select-none mb-1`}
                          title={`Drag to reschedule: ${title} (${block.scheduledDurationMinutes} mins)`}
                        >
                          <div className="font-semibold truncate flex items-center gap-1">
                            <span>{cfg.icon}</span>
                            <span className="truncate">{title}</span>
                          </div>
                          <div className="text-[10px] opacity-80 mt-0.5">
                            {format(parseISO(block.startTime), 'HH:mm')} ({block.scheduledDurationMinutes}m)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

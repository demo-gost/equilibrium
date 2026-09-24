import { useState } from 'react';
import { format, startOfWeek, addDays, parseISO, isSameDay } from 'date-fns';
import type { ScheduleBlock, Task } from '../types';

interface Props {
  selectedDate: Date;
  blocks: ScheduleBlock[];
  onBlockTimesUpdated: (blockId: string, newStart: Date, newEnd: Date) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 to 22:00

const BLOCK_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  TASK:     { bg: 'bg-brand-primary/15 hover:bg-brand-primary/25', border: 'border-brand-primary/30', text: 'text-brand-primary',   icon: '📚' },
  BREAK:    { bg: 'bg-status-success/15 hover:bg-status-success/25', border: 'border-status-success/30', text: 'text-status-success', icon: '☕' },
  BUFFER:   { bg: 'bg-white/5 hover:bg-white/10',             border: 'border-white/10',          text: 'text-text-muted',      icon: '🔄' },
  SLEEP:    { bg: 'bg-blue-900/20 hover:bg-blue-900/30',       border: 'border-blue-500/30',       text: 'text-blue-400',       icon: '🌙' },
  COLLEGE:  { bg: 'bg-orange-500/15 hover:bg-orange-500/25',   border: 'border-orange-500/30',     text: 'text-orange-400',     icon: '🎓' },
  PERSONAL: { bg: 'bg-purple-500/15 hover:bg-purple-500/25',   border: 'border-purple-500/30',     text: 'text-purple-400',     icon: '🏠' },
};

export const WeeklyCalendarView = ({ selectedDate, blocks, onBlockTimesUpdated }: Props) => {
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dropTargetSlot, setDropTargetSlot] = useState<{ dayStr: string; hour: number } | null>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    e.dataTransfer.setData('text/plain', blockId);
    setDraggedBlockId(blockId);
  };

  const handleDragOver = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetSlot({ dayStr: day.toISOString(), hour });
  };

  const handleDragLeave = () => {
    setDropTargetSlot(null);
  };

  const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    setDropTargetSlot(null);
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
    <div className="glass-card-elevated p-4 overflow-x-auto border border-brand-primary/20 shadow-2xl rounded-2xl">
      <div className="min-w-[700px]">
        {/* Days Sticky Header */}
        <div className="grid grid-cols-8 border-b border-white/10 pb-3 mb-3 text-center sticky top-0 bg-bg-secondary/90 backdrop-blur-md z-20 pt-1">
          <div className="text-xs font-bold text-text-muted self-end pb-1 uppercase tracking-wider">
            Time
          </div>
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);

            return (
              <div
                key={day.toISOString()}
                className={`flex flex-col items-center p-1.5 rounded-xl transition-all
                  ${isSelected ? 'bg-brand-primary/10 border border-brand-primary/30' : ''}`}
              >
                <span className="text-[11px] font-semibold uppercase text-text-muted">
                  {format(day, 'EEE')}
                </span>
                <span
                  className={`text-sm font-extrabold mt-1 w-8 h-8 flex items-center justify-center rounded-xl transition-all
                    ${
                      isToday
                        ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-glow'
                        : isSelected
                        ? 'bg-white/10 text-brand-primary font-bold'
                        : 'text-text-primary'
                    }`}
                >
                  {format(day, 'd')}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hourly Grid Rows */}
        <div className="space-y-1">
          {HOURS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-1.5 min-h-[52px]">
              {/* Hour Label */}
              <div className="text-[11px] font-mono font-medium text-text-muted pr-3 pt-2 text-right select-none">
                {hour.toString().padStart(2, '0')}:00
              </div>

              {/* 7 Day Column Slots */}
              {weekDays.map((day) => {
                const dayBlocks = blocks.filter((b) => {
                  const start = parseISO(b.startTime);
                  return isSameDay(start, day) && start.getHours() === hour;
                });

                const isDropTarget =
                  dropTargetSlot?.dayStr === day.toISOString() && dropTargetSlot?.hour === hour;

                return (
                  <div
                    key={day.toISOString() + hour}
                    onDragOver={(e) => handleDragOver(e, day, hour)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day, hour)}
                    className={`border border-white/5 rounded-xl p-1 transition-all relative min-h-[52px] flex flex-col justify-start gap-1
                      ${
                        isDropTarget
                          ? 'bg-brand-primary/20 border-brand-primary/50 ring-2 ring-brand-primary/40 scale-[1.01]'
                          : 'bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                  >
                    {dayBlocks.map((block) => {
                      const cfg = BLOCK_STYLES[block.type] || BLOCK_STYLES.TASK;
                      const task = block.taskId as Task | undefined;
                      const title =
                        block.type === 'TASK' ? task?.title || 'Task' : block.reason || cfg.icon + ' ' + block.type;

                      return (
                        <div
                          key={block._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, block._id)}
                          className={`p-2 rounded-lg border ${cfg.bg} ${cfg.border} cursor-grab active:cursor-grabbing text-xs shadow-sm hover:shadow-md transition-all select-none group border-l-4`}
                          title={`Drag to reschedule: ${title} (${block.scheduledDurationMinutes}m)`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="font-bold truncate flex items-center gap-1.5 min-w-0">
                              <span className="text-sm shrink-0">{cfg.icon}</span>
                              <span className={`truncate text-xs font-semibold ${cfg.text}`}>
                                {title}
                              </span>
                            </div>
                            <span className="text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                              ⠿
                            </span>
                          </div>

                          <div className="flex items-center justify-between mt-1 text-[10px] text-text-muted font-mono">
                            <span>{format(parseISO(block.startTime), 'HH:mm')}</span>
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px]">
                              {block.scheduledDurationMinutes}m
                            </span>
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

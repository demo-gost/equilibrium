import type { ScheduleBlock, Task } from '../types';

/**
 * Format date for ICS format (YYYYMMDDTHHMMSSZ)
 */
const formatICSDate = (dateStr: string | Date): string => {
  const d = new Date(dateStr);
  return d.toISOString().replace(/-|:|\.\d+/g, '');
};

/**
 * Generates an .ics file string from an array of Schedule Blocks or Tasks
 */
export const generateICSFile = (blocks: ScheduleBlock[]): string => {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Equilibrium AI//Workload Balancer//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Equilibrium Study Schedule',
  ].join('\r\n') + '\r\n';

  blocks.forEach((block) => {
    const taskTitle = typeof block.taskId === 'object' ? (block.taskId as Task).title : block.type;
    const summary = `[Equilibrium] ${taskTitle || block.type}`;
    const description = `Scheduled ${block.type} block (${block.scheduledDurationMinutes} mins). Status: ${block.status}`;
    const start = formatICSDate(block.startTime);
    const end = formatICSDate(block.endTime);
    const now = formatICSDate(new Date());

    icsContent += [
      'BEGIN:VEVENT',
      `UID:equilibrium-block-${block._id}@equilibrium.app`,
      `DTSTAMP:${now}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT',
    ].join('\r\n') + '\r\n';
  });

  icsContent += 'END:VCALENDAR';
  return icsContent;
};

/**
 * Trigger file download for an .ics file in browser
 */
export const downloadICSFile = (blocks: ScheduleBlock[], filename = 'equilibrium-schedule.ics') => {
  const icsData = generateICSFile(blocks);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export interface ParsedICSEvent {
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
}

/**
 * Simple parser for imported .ics calendar files
 */
export const parseICSFile = (icsText: string): ParsedICSEvent[] => {
  const events: ParsedICSEvent[] = [];
  const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match: RegExpExecArray | null;

  while ((match = eventRegex.exec(icsText)) !== null) {
    const block = match[1];
    const summaryMatch = block.match(/SUMMARY:(.*)/);
    const dtstartMatch = block.match(/DTSTART:(.*)/);
    const dtendMatch = block.match(/DTEND:(.*)/);
    const descMatch = block.match(/DESCRIPTION:(.*)/);

    if (summaryMatch && dtstartMatch) {
      const parseICSDateString = (str: string): string => {
        const clean = str.trim();
        if (clean.length >= 15) {
          const y = clean.slice(0, 4);
          const m = clean.slice(4, 6);
          const d = clean.slice(6, 8);
          const h = clean.slice(9, 11);
          const min = clean.slice(11, 13);
          const s = clean.slice(13, 15);
          return new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`).toISOString();
        }
        return new Date(clean).toISOString();
      };

      try {
        const title = summaryMatch[1].trim();
        const startTime = parseICSDateString(dtstartMatch[1]);
        const endTime = dtendMatch ? parseICSDateString(dtendMatch[1]) : startTime;
        const description = descMatch ? descMatch[1].trim() : undefined;

        events.push({ title, startTime, endTime, description });
      } catch (err) {
        console.warn('Failed to parse event in ICS:', err);
      }
    }
  }

  return events;
};

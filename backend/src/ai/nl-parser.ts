import { TaskCategory } from '../models/Task';

export interface ParsedNLTask {
  title: string;
  category: TaskCategory;
  estimatedDurationMinutes: number;
  priority: number;
  difficulty: number;
  deadline: Date;
  description?: string;
  tags: string[];
}

export const parseNaturalLanguageTask = (input: string): ParsedNLTask => {
  let cleaned = input.replace(/^add:\s*/i, '').trim();

  // 1. Duration extraction (e.g. "3 hours", "45 mins", "1.5h", "90m")
  let estimatedDurationMinutes = 60; // default
  const durationHourMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:hours|hour|hrs|hr|h)\b/i);
  const durationMinMatch = cleaned.match(/(\d+)\s*(?:minutes|minute|mins|min|m)\b/i);

  if (durationHourMatch) {
    estimatedDurationMinutes = Math.round(parseFloat(durationHourMatch[1]) * 60);
    cleaned = cleaned.replace(durationHourMatch[0], '').trim();
  } else if (durationMinMatch) {
    estimatedDurationMinutes = parseInt(durationMinMatch[1], 10);
    cleaned = cleaned.replace(durationMinMatch[0], '').trim();
  }

  // 2. Deadline extraction (e.g. "due Friday", "due tomorrow", "due next week", "due in 3 days")
  let deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // default tomorrow
  deadline.setHours(23, 59, 0, 0);

  const dueMatch = cleaned.match(/due\s+([a-z0-9\s]+?)(?:,|$)/i);
  if (dueMatch) {
    const dueStr = dueMatch[1].toLowerCase().trim();
    cleaned = cleaned.replace(dueMatch[0], '').trim();

    const now = new Date();
    if (dueStr.includes('today')) {
      deadline = new Date(now);
      deadline.setHours(23, 59, 0, 0);
    } else if (dueStr.includes('tomorrow')) {
      deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      deadline.setHours(23, 59, 0, 0);
    } else if (dueStr.match(/in\s+(\d+)\s+days?/)) {
      const days = parseInt(dueStr.match(/in\s+(\d+)\s+days?/)![1], 10);
      deadline = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      deadline.setHours(23, 59, 0, 0);
    } else {
      // Days of week (e.g. Friday, Monday)
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayIndex = daysOfWeek.findIndex((d) => dueStr.includes(d));

      if (targetDayIndex !== -1) {
        const currentDayIndex = now.getDay();
        let daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7;
        if (daysToAdd === 0) daysToAdd = 7; // Next week's day
        deadline = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
        deadline.setHours(23, 59, 0, 0);
      }
    }
  }

  // 3. Category & Priority Detection
  let category: TaskCategory = 'other';
  const lower = input.toLowerCase();

  if (lower.includes('code') || lower.includes('program') || lower.includes('bug') || lower.includes('dev')) category = 'coding';
  else if (lower.includes('exam') || lower.includes('test') || lower.includes('midterm') || lower.includes('final')) category = 'exam_prep';
  else if (lower.includes('math') || lower.includes('calculus') || lower.includes('algebra')) category = 'math';
  else if (lower.includes('write') || lower.includes('essay') || lower.includes('paper') || lower.includes('report')) category = 'writing';
  else if (lower.includes('read') || lower.includes('chapter') || lower.includes('book')) category = 'reading';
  else if (lower.includes('research') || lower.includes('paper') || lower.includes('find')) category = 'research';
  else if (lower.includes('lab') || lower.includes('experiment')) category = 'lab';
  else if (lower.includes('project') || lower.includes('build')) category = 'project';
  else if (lower.includes('assignment') || lower.includes('hw') || lower.includes('homework')) category = 'assignment';

  let priority = 3;
  let difficulty = 3;

  if (lower.includes('urgent') || lower.includes('critical') || lower.includes('important') || lower.includes('asap')) {
    priority = 5;
    difficulty = 4;
  } else if (lower.includes('easy') || lower.includes('quick')) {
    priority = 2;
    difficulty = 1;
  } else if (lower.includes('hard') || lower.includes('complex')) {
    difficulty = 5;
  }

  // Clean trailing commas/punctuation from title
  const title = cleaned.replace(/^,\s*|\s*,$/g, '').trim() || input.trim();

  return {
    title,
    category,
    estimatedDurationMinutes,
    priority,
    difficulty,
    deadline,
    tags: [category],
  };
};

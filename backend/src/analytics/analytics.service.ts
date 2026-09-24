import { TaskHistory } from '../models/TaskHistory';
import { Task } from '../models/Task';
import { Feedback } from '../models/Feedback';
import { ScheduleBlock } from '../models/ScheduleBlock';
import logger from '../utils/logger';

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  avgEstimationErrorPercent: number;
  avgActualDurationMinutes: number;
  scheduleAdherenceRate: number;
  extensionRate: number;
  rescheduleRate: number;
  deadlineMissRate: number;
  sustainableOnTimeRate: number;
  latestVibeScore?: number;
}

export interface WeeklyTrend {
  week: string;
  completedTasks: number;
  totalHoursStudied: number;
  avgVibeScore: number;
  avgEstimationError: number;
}

export class AnalyticsService {
  async getSummary(userId: string): Promise<AnalyticsSummary> {
    const [history, tasks, feedback] = await Promise.all([
      TaskHistory.find({ userId }),
      Task.find({ userId }),
      Feedback.find({ userId, type: 'VIBE_CHECK' }).sort({ createdAt: -1 }).limit(1),
    ]);

    const completed = tasks.filter((t) => t.status === 'completed');
    const totalTasks = tasks.length;
    const completedTasks = completed.length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const avgEstimationErrorPercent =
      history.length > 0
        ? Math.abs(history.reduce((s, h) => s + h.estimationErrorPercent, 0) / history.length)
        : 0;

    const avgActualDurationMinutes =
      history.length > 0
        ? history.reduce((s, h) => s + h.actualDurationMinutes, 0) / history.length
        : 0;

    const onTime = history.filter((h) => h.completionStatus === 'on_time').length;
    const sustainableOnTimeRate = history.length > 0 ? (onTime / history.length) * 100 : 0;

    const withExtensions = history.filter((h) => h.extensionCount > 0).length;
    const extensionRate = history.length > 0 ? (withExtensions / history.length) * 100 : 0;

    const withReschedule = history.filter((h) => h.rescheduleCount > 0).length;
    const rescheduleRate = history.length > 0 ? (withReschedule / history.length) * 100 : 0;

    const overdue = tasks.filter((t) => t.status === 'overdue' || (t.deadline < new Date() && t.status !== 'completed')).length;
    const deadlineMissRate = totalTasks > 0 ? (overdue / totalTasks) * 100 : 0;

    // Schedule adherence: completed within scheduled time window
    const scheduleAdherenceRate = sustainableOnTimeRate;

    const latestVibeScore = feedback[0]?.vibeScore;

    return {
      totalTasks,
      completedTasks,
      completionRate: Math.round(completionRate * 10) / 10,
      avgEstimationErrorPercent: Math.round(avgEstimationErrorPercent * 10) / 10,
      avgActualDurationMinutes: Math.round(avgActualDurationMinutes),
      scheduleAdherenceRate: Math.round(scheduleAdherenceRate * 10) / 10,
      extensionRate: Math.round(extensionRate * 10) / 10,
      rescheduleRate: Math.round(rescheduleRate * 10) / 10,
      deadlineMissRate: Math.round(deadlineMissRate * 10) / 10,
      sustainableOnTimeRate: Math.round(sustainableOnTimeRate * 10) / 10,
      latestVibeScore,
    };
  }

  async getWeeklyTrends(userId: string, weeksBack = 8): Promise<WeeklyTrend[]> {
    const from = new Date();
    from.setDate(from.getDate() - weeksBack * 7);

    const history = await TaskHistory.find({
      userId,
      createdAt: { $gte: from },
    }).sort({ createdAt: 1 });

    const vibe = await Feedback.find({
      userId,
      type: 'VIBE_CHECK',
      createdAt: { $gte: from },
    });

    // Group by week
    const weekMap: Map<string, WeeklyTrend> = new Map();

    for (const h of history) {
      const weekKey = this.getWeekKey(h.createdAt);
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          week: weekKey,
          completedTasks: 0,
          totalHoursStudied: 0,
          avgVibeScore: 0,
          avgEstimationError: 0,
        });
      }
      const w = weekMap.get(weekKey)!;
      w.completedTasks += 1;
      w.totalHoursStudied += h.actualDurationMinutes / 60;
      w.avgEstimationError =
        (w.avgEstimationError * (w.completedTasks - 1) + h.estimationErrorPercent) / w.completedTasks;
    }

    for (const v of vibe) {
      const weekKey = this.getWeekKey(v.createdAt);
      if (weekMap.has(weekKey) && v.vibeScore) {
        weekMap.get(weekKey)!.avgVibeScore = v.vibeScore;
      }
    }

    return Array.from(weekMap.values());
  }

  async getInsights(userId: string): Promise<string[]> {
    const history = await TaskHistory.find({ userId }).sort({ createdAt: -1 }).limit(50);
    const insights: string[] = [];

    if (history.length === 0) {
      insights.push('Complete your first tasks to start seeing personalized insights!');
      return insights;
    }

    // Category-level insights
    const categoryStats: Map<string, { count: number; totalError: number }> = new Map();
    for (const h of history) {
      if (!categoryStats.has(h.category)) {
        categoryStats.set(h.category, { count: 0, totalError: 0 });
      }
      const s = categoryStats.get(h.category)!;
      s.count++;
      s.totalError += h.estimationErrorPercent;
    }

    for (const [category, stats] of categoryStats) {
      if (stats.count >= 3) {
        const avgError = stats.totalError / stats.count;
        if (avgError > 20) {
          insights.push(
            `You typically take ${Math.round(avgError)}% longer than estimated on ${category} tasks. Future predictions have been adjusted.`
          );
        } else if (avgError < -15) {
          insights.push(
            `You finish ${category} tasks ${Math.abs(Math.round(avgError))}% faster than you estimate — great efficiency!`
          );
        }
      }
    }

    // Extension insight
    const extensionCount = history.filter((h) => h.extensionCount > 0).length;
    if (extensionCount / history.length > 0.4) {
      insights.push('You extend tasks frequently. Consider adding 20% buffer to your initial estimates.');
    }

    // Deadline miss insight
    const missedCount = history.filter((h) => h.completionStatus === 'delayed').length;
    if (missedCount / history.length > 0.3) {
      insights.push('Several tasks have been completed late. The system will prioritize high-deadline tasks more aggressively.');
    }

    if (insights.length === 0) {
      insights.push('Your schedule adherence is looking great! Keep it up.');
    }

    return insights;
  }

  private getWeekKey(date: Date): string {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
    return d.toISOString().split('T')[0];
  }
}

export const analyticsService = new AnalyticsService();

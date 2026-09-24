import cron from 'node-cron';
import { Task } from '../models/Task';
import { User } from '../models/User';
import { ScheduleBlock } from '../models/ScheduleBlock';
import { TaskHistory } from '../models/TaskHistory';
import { rescheduleService } from './reschedule';
import { sseManager } from '../utils/sse';
import { mlClient } from '../ai/ml-client';
import logger from '../utils/logger';

/**
 * Autonomous Equilibrium Engine
 *
 * Runs on a 15-minute cron cycle. For each user with active sessions:
 * 1. Detect schedule deviation (tasks not started on time, running over)
 * 2. Detect workload overload (upcoming > sustainable threshold)
 * 3. Trigger ML retraining when enough new data has accumulated
 * 4. Emit SSE alerts for overload conditions
 * 5. Auto-reschedule if deviation exceeds threshold
 */
export class EquilibriumEngine {
  private static readonly OVERLOAD_MULTIPLIER = 1.3; // 130% of daily limit
  private static readonly DEVIATION_THRESHOLD_MINUTES = 30; // tolerate up to 30min slip
  private static readonly ML_RETRAIN_THRESHOLD = 10; // retrain every 10 new completions
  private lastRetrainCount: Map<string, number> = new Map();

  start(): void {
    // Main equilibrium loop — every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      logger.info('[EquilibriumEngine] Running equilibrium cycle...');
      await this.runCycle();
    });

    // Midnight schedule pre-generation — runs at 23:45 every day
    cron.schedule('45 23 * * *', async () => {
      logger.info('[EquilibriumEngine] Midnight pre-schedule generation...');
      await this.midnightPreGeneration();
    });

    logger.info('[EquilibriumEngine] Started. Cron: every 15min + midnight.');
  }

  private async runCycle(): Promise<void> {
    try {
      // Only process users who have connected SSE clients (active sessions)
      const activeUserIds = sseManager.getActiveUserIds();
      if (activeUserIds.length === 0) return;

      for (const userId of activeUserIds) {
        await this.processUser(userId);
      }
    } catch (error) {
      logger.error('[EquilibriumEngine] Cycle error:', error);
    }
  }

  private async processUser(userId: string): Promise<void> {
    const now = new Date();

    const [user, tasks, blocks] = await Promise.all([
      User.findById(userId),
      Task.find({ userId, status: { $in: ['pending', 'in_progress'] } }),
      ScheduleBlock.find({
        userId,
        startTime: { $lte: now },
        endTime: { $gte: new Date(now.getTime() - 60 * 60000) }, // last hour
        type: 'TASK',
        status: 'scheduled',
      }),
    ]);

    if (!user) return;

    // ── 1. Detect missed/overrunning blocks ─────────────────────────────
    const overdueBlocks = blocks.filter(
      (b) => b.startTime <= now && b.status === 'scheduled'
    );

    if (overdueBlocks.length > 0) {
      const slipMinutes =
        (now.getTime() - overdueBlocks[0].startTime.getTime()) / 60000;

      if (slipMinutes > EquilibriumEngine.DEVIATION_THRESHOLD_MINUTES) {
        logger.info(
          `[EquilibriumEngine] Deviation detected for ${userId}: ${Math.round(slipMinutes)}min slip. Auto-rescheduling.`
        );
        await rescheduleService.reschedule(userId, 'manual');
        sseManager.sendToUser(userId, {
          type: 'SCHEDULE_DEVIATION',
          payload: {
            message: `Your schedule has been automatically adjusted (${Math.round(slipMinutes)}min slip detected).`,
            slipMinutes: Math.round(slipMinutes),
          },
        });
        return; // reschedule already handles SSE
      }
    }

    // ── 2. Detect upcoming workload overload ────────────────────────────
    const next48hBlocks = await ScheduleBlock.find({
      userId,
      startTime: { $gte: now, $lte: new Date(now.getTime() + 48 * 3600000) },
      type: 'TASK',
      status: 'scheduled',
    });

    const planned48hMinutes = next48hBlocks.reduce(
      (s, b) => s + b.scheduledDurationMinutes, 0
    );
    const dailyLimitMinutes = user.dailyStudyLimitHours * 60;
    const sustainableLimit = dailyLimitMinutes * 2 * EquilibriumEngine.OVERLOAD_MULTIPLIER;

    if (planned48hMinutes > sustainableLimit) {
      const overloadHours = Math.round((planned48hMinutes - sustainableLimit) / 60 * 10) / 10;
      logger.warn(
        `[EquilibriumEngine] Overload detected for ${userId}: ${planned48hMinutes}min planned vs ${sustainableLimit}min limit`
      );
      sseManager.sendToUser(userId, {
        type: 'WORKLOAD_OVERLOAD',
        payload: {
          message: `⚠️ Your next 48h workload exceeds sustainable limits by ${overloadHours}h. Consider moving some tasks.`,
          plannedHours: Math.round(planned48hMinutes / 60 * 10) / 10,
          limitHours: Math.round(sustainableLimit / 60 * 10) / 10,
        },
      });
    }

    // ── 3. ML Retraining check ─────────────────────────────────────────
    await this.checkAndRetrain(userId);
  }

  private async checkAndRetrain(userId: string): Promise<void> {
    try {
      const historyCount = await TaskHistory.countDocuments({ userId });
      const lastCount = this.lastRetrainCount.get(userId) || 0;
      const newSamples = historyCount - lastCount;

      if (newSamples >= EquilibriumEngine.ML_RETRAIN_THRESHOLD && historyCount >= 10) {
        logger.info(`[EquilibriumEngine] Triggering ML retrain for ${userId}: ${historyCount} samples`);

        const history = await TaskHistory.find({ userId }).sort({ createdAt: -1 }).limit(200);

        const trainingData = history.map((h) => ({
          category: h.category,
          difficulty: h.difficulty,
          estimated_duration: h.estimatedDurationMinutes,
          priority: h.priority,
          actual_duration: h.actualDurationMinutes,
          time_of_day: new Date(h.createdAt).getHours(),
          day_of_week: new Date(h.createdAt).getDay(),
          recent_workload_hours: 0,
          historical_estimation_error: h.estimationErrorPercent,
        }));

        const result = await mlClient.trainModel(userId, trainingData);

        if (result?.success) {
          this.lastRetrainCount.set(userId, historyCount);
          logger.info(
            `[EquilibriumEngine] ML retrain success for ${userId}: score=${result.model_score}`
          );
        }
      }
    } catch (error) {
      logger.warn(`[EquilibriumEngine] ML retrain failed for ${userId}:`, error);
    }
  }

  private async midnightPreGeneration(): Promise<void> {
    try {
      // Find all users who have had activity in the last 7 days
      const recentUsers = await TaskHistory.distinct('userId', {
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 3600000) },
      });

      for (const userId of recentUsers) {
        try {
          await rescheduleService.reschedule(userId as unknown as string, 'manual');
          logger.info(`[EquilibriumEngine] Pre-generated schedule for ${userId}`);
        } catch (err) {
          logger.warn(`[EquilibriumEngine] Pre-generation failed for ${userId}:`, err);
        }
      }
    } catch (error) {
      logger.error('[EquilibriumEngine] Midnight generation error:', error);
    }
  }
}

export const equilibriumEngine = new EquilibriumEngine();

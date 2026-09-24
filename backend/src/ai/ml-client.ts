import axios from 'axios';
import { config } from '../config/config';
import logger from '../utils/logger';

export interface DurationPredictionInput {
  taskCategory: string;
  difficulty: number;
  estimatedDuration: number;
  priority: number;
  historicalAvgDuration: number;
  historicalEstimationError: number;
  historicalCount: number;
  timeOfDay: number;
  dayOfWeek: number;
  recentWorkloadHours: number;
}

export interface DurationPredictionOutput {
  predictedDuration: number;
  confidence: 'low' | 'medium' | 'high';
  method: 'rule_based' | 'historical_avg' | 'ml_model';
  explanation: string;
}

class MLClient {
  private readonly baseUrl: string;
  private readonly timeout = 5000; // 5s timeout — don't block scheduling if ML is slow

  constructor() {
    this.baseUrl = config.mlServiceUrl;
  }

  async predictDuration(input: DurationPredictionInput): Promise<number | undefined> {
    try {
      const response = await axios.post<DurationPredictionOutput>(
        `${this.baseUrl}/predict/duration`,
        {
          task_category: input.taskCategory,
          difficulty: input.difficulty,
          estimated_duration: input.estimatedDuration,
          priority: input.priority,
          historical_avg_duration: input.historicalAvgDuration,
          historical_estimation_error: input.historicalEstimationError,
          historical_count: input.historicalCount,
          time_of_day: input.timeOfDay,
          day_of_week: input.dayOfWeek,
          recent_workload_hours: input.recentWorkloadHours,
        },
        { timeout: this.timeout }
      );

      const predicted = response.data.predictedDuration;
      logger.info(
        `ML prediction: ${input.estimatedDuration}min → ${predicted}min (${response.data.method}, ${response.data.confidence})`
      );
      return predicted;
    } catch {
      // Smart AI Fallback: Adjust based on user's historical estimation error pattern
      if (input.historicalCount > 0 && input.historicalEstimationError !== 0) {
        const adjustmentFactor = 1 + input.historicalEstimationError / 100;
        const smartPredicted = Math.max(5, Math.round(input.estimatedDuration * adjustmentFactor));
        logger.info(
          `Smart AI pattern prediction: ${input.estimatedDuration}min → ${smartPredicted}min (historical error: ${input.historicalEstimationError.toFixed(1)}%)`
        );
        return smartPredicted;
      }
      return undefined;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 3000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async trainModel(
    userId: string,
    data: Array<{
      category: string;
      difficulty: number;
      estimated_duration: number;
      priority: number;
      actual_duration: number;
      time_of_day: number;
      day_of_week: number;
      recent_workload_hours: number;
      historical_estimation_error: number;
    }>
  ): Promise<{ success: boolean; model_score: number; message: string } | undefined> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/train`,
        { user_id: userId, data },
        { timeout: 30000 } // training can take up to 30s
      );
      return response.data;
    } catch (error) {
      logger.warn('ML training failed:', error);
      return undefined;
    }
  }
}

export const mlClient = new MLClient();

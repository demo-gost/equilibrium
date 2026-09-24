"""
Incremental Duration Predictor
Implements cold-start → historical average → ML model progression.

Cold start (< 10 tasks): Rule-based multipliers by category + difficulty
Warm (10–30 tasks): Historical average for the category
Hot (> 30 tasks): Trained GradientBoostingRegressor
"""

import os
import numpy as np
import joblib
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

ARTIFACTS_DIR = Path(__file__).parent.parent / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "duration_model.joblib"

# Category-based estimation bias multipliers (rule-based baseline)
# Based on common student task research: coding and projects tend to overrun
CATEGORY_MULTIPLIERS = {
    "coding": 1.35,
    "math": 1.20,
    "writing": 1.25,
    "reading": 1.10,
    "research": 1.30,
    "project": 1.40,
    "exam_prep": 1.20,
    "assignment": 1.25,
    "lab": 1.30,
    "other": 1.15,
}

# Difficulty scaling factor
DIFFICULTY_SCALE = {1: 0.90, 2: 0.95, 3: 1.0, 4: 1.10, 5: 1.20}

COLD_START_THRESHOLD = 10
WARM_THRESHOLD = 30


class DurationPredictor:
    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        """Load trained model if it exists."""
        if MODEL_PATH.exists():
            try:
                self.model = joblib.load(MODEL_PATH)
                logger.info(f"ML model loaded from {MODEL_PATH}")
            except Exception as e:
                logger.warning(f"Failed to load model: {e}")
                self.model = None
        else:
            logger.info("No trained model found — using rule-based/historical fallback")

    def predict(
        self,
        task_category: str,
        difficulty: int,
        estimated_duration: float,
        priority: int,
        historical_avg_duration: float,
        historical_estimation_error: float,
        historical_count: int,
        time_of_day: int,
        day_of_week: int,
        recent_workload_hours: float,
    ) -> dict:
        """
        Main prediction entry point.
        Returns predicted_duration, confidence, method, explanation.
        """
        category = task_category.lower()

        # ─── Cold Start ───────────────────────────────────────────────────────
        if historical_count < COLD_START_THRESHOLD:
            multiplier = CATEGORY_MULTIPLIERS.get(category, 1.15)
            diff_scale = DIFFICULTY_SCALE.get(difficulty, 1.0)
            predicted = estimated_duration * multiplier * diff_scale
            return {
                "predicted_duration": round(predicted, 1),
                "confidence": "low",
                "method": "rule_based",
                "explanation": (
                    f"Prediction based on typical patterns for {category} tasks. "
                    f"Complete more tasks to get personalized predictions."
                ),
            }

        # ─── Warm Start (historical average) ──────────────────────────────────
        if historical_count < WARM_THRESHOLD or self.model is None:
            # Blend user estimate with historical average
            blend_weight = min(historical_count / WARM_THRESHOLD, 0.8)
            predicted = (1 - blend_weight) * estimated_duration + blend_weight * historical_avg_duration
            error_sign = "longer" if historical_estimation_error > 0 else "faster"
            pct = abs(round(historical_estimation_error, 1))
            return {
                "predicted_duration": round(predicted, 1),
                "confidence": "medium",
                "method": "historical_avg",
                "explanation": (
                    f"Based on your history, you typically finish {category} tasks "
                    f"{pct}% {error_sign} than estimated."
                ),
            }

        # ─── Hot Path (ML model) ──────────────────────────────────────────────
        features = self._build_features(
            category, difficulty, estimated_duration, priority,
            historical_avg_duration, historical_estimation_error,
            historical_count, time_of_day, day_of_week, recent_workload_hours
        )

        try:
            predicted = float(self.model.predict([features])[0])
            predicted = max(predicted, estimated_duration * 0.5)  # sanity floor
            error_sign = "longer" if historical_estimation_error > 0 else "faster"
            pct = abs(round(historical_estimation_error, 1))
            return {
                "predicted_duration": round(predicted, 1),
                "confidence": "high",
                "method": "ml_model",
                "explanation": (
                    f"Personalized prediction: you usually take {pct}% {error_sign} "
                    f"on {category} tasks. ML model adjusted based on {historical_count} historical tasks."
                ),
            }
        except Exception as e:
            logger.error(f"ML prediction failed: {e}")
            # Fallback to historical
            return {
                "predicted_duration": round(historical_avg_duration, 1),
                "confidence": "medium",
                "method": "historical_avg",
                "explanation": f"Prediction based on your historical average for {category} tasks.",
            }

    def _build_features(
        self, category, difficulty, estimated_duration, priority,
        historical_avg, historical_error, historical_count,
        time_of_day, day_of_week, recent_workload
    ):
        """
        Feature vector for ML model:
        [category_encoded, difficulty, estimated_duration, priority,
         historical_avg, historical_error, log_count,
         time_sin, time_cos, day_sin, day_cos, recent_workload]
        """
        categories = list(CATEGORY_MULTIPLIERS.keys())
        cat_idx = categories.index(category) if category in categories else len(categories) - 1

        # Cyclical encoding for time and day
        time_sin = np.sin(2 * np.pi * time_of_day / 24)
        time_cos = np.cos(2 * np.pi * time_of_day / 24)
        day_sin = np.sin(2 * np.pi * day_of_week / 7)
        day_cos = np.cos(2 * np.pi * day_of_week / 7)

        return [
            cat_idx,
            difficulty,
            estimated_duration,
            priority,
            historical_avg,
            historical_error,
            np.log1p(historical_count),
            time_sin,
            time_cos,
            day_sin,
            day_cos,
            recent_workload,
        ]

    def save_model(self, model):
        """Save a newly trained model."""
        ARTIFACTS_DIR.mkdir(exist_ok=True)
        joblib.dump(model, MODEL_PATH)
        self.model = model
        logger.info(f"Model saved to {MODEL_PATH}")


predictor = DurationPredictor()

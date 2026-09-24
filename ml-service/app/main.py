from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import DurationPredictionRequest, DurationPredictionResponse, HealthResponse
from app.train_schemas import TrainRequest, TrainResponse
from app.predictor import predictor
import numpy as np
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Equilibrium ML Service",
    description="Personalized task duration prediction for student workload balancing",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="ok",
        model_loaded=predictor.model is not None,
        version="1.0.0",
    )


@app.post("/predict/duration", response_model=DurationPredictionResponse)
def predict_duration(request: DurationPredictionRequest):
    """
    Predict realistic task duration based on user history and ML model.
    Implements cold-start (rule-based) → warm (historical avg) → hot (ML) progression.
    """
    try:
        result = predictor.predict(
            task_category=request.task_category,
            difficulty=request.difficulty,
            estimated_duration=request.estimated_duration,
            priority=request.priority,
            historical_avg_duration=request.historical_avg_duration,
            historical_estimation_error=request.historical_estimation_error,
            historical_count=request.historical_count,
            time_of_day=request.time_of_day,
            day_of_week=request.day_of_week,
            recent_workload_hours=request.recent_workload_hours,
        )
        return DurationPredictionResponse(**result)
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/train", response_model=TrainResponse)
def train_model(request: TrainRequest):
    """
    Train or retrain the ML model from user task history.
    Requires at least 30 data points to proceed.
    Called automatically by the backend after sufficient task completions.
    """
    try:
        if len(request.data) < 10:
            return TrainResponse(
                success=False,
                message=f"Not enough data to train. Need at least 10 samples, got {len(request.data)}.",
                samples_used=0,
                model_score=0.0,
            )

        from sklearn.ensemble import GradientBoostingRegressor
        from sklearn.model_selection import cross_val_score
        from app.predictor import CATEGORY_MULTIPLIERS

        categories = list(CATEGORY_MULTIPLIERS.keys())

        X, y = [], []
        for dp in request.data:
            cat_idx = categories.index(dp.category) if dp.category in categories else len(categories) - 1
            time_sin = np.sin(2 * np.pi * dp.time_of_day / 24)
            time_cos = np.cos(2 * np.pi * dp.time_of_day / 24)
            day_sin = np.sin(2 * np.pi * dp.day_of_week / 7)
            day_cos = np.cos(2 * np.pi * dp.day_of_week / 7)
            X.append([
                cat_idx, dp.difficulty, dp.estimated_duration, dp.priority,
                dp.actual_duration,  # historical avg proxy
                dp.historical_estimation_error,
                np.log1p(len(request.data)),
                time_sin, time_cos, day_sin, day_cos,
                dp.recent_workload_hours,
            ])
            y.append(dp.actual_duration)

        model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=4,
            random_state=42,
        )
        model.fit(X, y)

        score = 0.0
        if len(request.data) >= 20:
            scores = cross_val_score(model, X, y, cv=min(5, len(X)), scoring="r2")
            score = float(np.mean(scores))

        predictor.save_model(model)

        return TrainResponse(
            success=True,
            message=f"Model trained successfully on {len(request.data)} samples.",
            samples_used=len(request.data),
            model_score=round(score, 4),
        )
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def root():
    return {"message": "Equilibrium ML Service", "docs": "/docs"}

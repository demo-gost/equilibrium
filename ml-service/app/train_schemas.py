"""
Training endpoint for the ML model.
Called from the backend after a user has enough task history data.
"""
from pydantic import BaseModel
from typing import List


class TrainingDataPoint(BaseModel):
    category: str
    difficulty: int
    estimated_duration: float
    priority: int
    actual_duration: float
    time_of_day: int
    day_of_week: int
    recent_workload_hours: float
    historical_estimation_error: float


class TrainRequest(BaseModel):
    user_id: str
    data: List[TrainingDataPoint]


class TrainResponse(BaseModel):
    success: bool
    message: str
    samples_used: int
    model_score: float

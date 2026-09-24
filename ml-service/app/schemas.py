from pydantic import BaseModel, Field
from typing import Optional


class DurationPredictionRequest(BaseModel):
    task_category: str = Field(..., description="Task category (coding, math, writing, etc.)")
    difficulty: int = Field(..., ge=1, le=5, description="Difficulty level 1-5")
    estimated_duration: float = Field(..., gt=0, description="User's estimated duration in minutes")
    priority: int = Field(..., ge=1, le=5, description="Priority level 1-5")
    historical_avg_duration: float = Field(0.0, description="Historical average duration for this category")
    historical_estimation_error: float = Field(0.0, description="Historical avg estimation error %")
    historical_count: int = Field(0, ge=0, description="Number of historical tasks in this category")
    time_of_day: int = Field(12, ge=0, le=23, description="Hour of day 0-23")
    day_of_week: int = Field(0, ge=0, le=6, description="Day of week 0=Sunday")
    recent_workload_hours: float = Field(0.0, description="Total study hours in past 7 days")


class DurationPredictionResponse(BaseModel):
    predicted_duration: float
    confidence: str  # "low" | "medium" | "high"
    method: str      # "rule_based" | "historical_avg" | "ml_model"
    explanation: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str

from fastapi import APIRouter, Depends, Body
from typing import Optional
from app.api import deps
from app.services.ai_service import AIService
from app.models.user import User

router = APIRouter()

@router.post("/generate-goals")
async def generate_goals(
    role: str = Body(..., embed=True),
    context: str = Body(..., embed=True),
    # Optional auth: works with a real JWT or in DEBUG mode without one
    current_user: Optional[User] = Depends(deps.get_current_user_or_none)
):
    """Generate AI-powered SMART goals."""
    service = AIService()
    return await service.generate_goals(role, context)

@router.post("/analyze-goal")
async def analyze_goal(
    goal_data: dict = Body(...),
    # Optional auth: works with a real JWT or in DEBUG mode without one
    current_user: Optional[User] = Depends(deps.get_current_user_or_none)
):
    """Analyze a goal's quality using AI."""
    service = AIService()
    return await service.analyze_goal_quality(goal_data)

@router.post("/predict-risk")
async def predict_risk(
    goal_data: dict = Body(...),
    history: list = Body([]),
    current_user: User = Depends(deps.get_current_user)
):
    """Predict failure risk for a goal."""
    service = AIService()
    return await service.predict_goal_risk(goal_data, history)

@router.post("/performance-summary")
async def get_summary(
    goals: list = Body(...),
    current_user: User = Depends(deps.get_current_user)
):
    """Summarize quarterly performance."""
    service = AIService()
    return await service.summarize_performance(goals)

@router.post("/review-assistant")
async def get_review_draft(
    self_summary: str = Body(..., embed=True),
    performance_data: dict = Body(...),
    current_user: User = Depends(deps.get_current_user)
):
    """Draft a professional performance review."""
    service = AIService()
    return await service.review_assistant(self_summary, performance_data)

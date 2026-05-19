import asyncio
import os
import sys

# Add app to path
sys.path.insert(0, os.path.abspath('.'))

from app.services.ai_service import AIService

async def test_ai():
    service = AIService()
    goal_data = {
        "title": "Increase sales",
        "description": "Increase sales by 20% in Q3",
        "thrust_area": "Revenue Growth",
        "quarter": "2024-Q3"
    }
    result = await service.analyze_goal_quality(goal_data)
    print("Result:", result)

if __name__ == "__main__":
    asyncio.run(test_ai())

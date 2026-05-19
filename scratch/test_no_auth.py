import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Get goals without token
        res = await client.get("http://localhost:8000/api/v1/goals/?quarter=2024-Q3")
        print(f"Status Code: {res.status_code}")
        goals = res.json()
        print(f"Goals count: {len(goals)}")
        if isinstance(goals, list):
            for g in goals:
                print(f"- {g['title']}")
        else:
            print(goals)

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import httpx

async def main():
    async with httpx.AsyncClient() as client:
        # Login as employee
        login_data = {
            "username": "dk@gmail.com",
            "password": "password123"
        }
        res = await client.post("http://localhost:8000/api/v1/auth/login", data=login_data)
        token = res.json()["access_token"]
        print(f"Logged in as dk@gmail.com. Token: {token[:20]}...")
        
        # Get users/me to verify token works
        res = await client.get("http://localhost:8000/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        print(f"Me endpoint: {res.json()['email']}")
        
        # Get goals
        res = await client.get("http://localhost:8000/api/v1/goals/?quarter=2024-Q3", headers={"Authorization": f"Bearer {token}"})
        goals = res.json()
        print(f"Goals count: {len(goals)}")
        if isinstance(goals, list):
            for g in goals:
                print(f"- {g['title']}")
        else:
            print(goals)

if __name__ == "__main__":
    asyncio.run(main())

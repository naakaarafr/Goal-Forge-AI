import asyncio
import os
import sys
sys.path.append(os.getcwd())

import httpx
from app.main import app

async def test_impersonate_flow():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Dev Admin login
        login_res = await client.post("/api/v1/auth/dev-login")
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Impersonate employee@goalforge.ai
        imp_res = await client.post(
            "/api/v1/auth/impersonate",
            json={"email": "employee@goalforge.ai"},
            headers=headers
        )
        assert imp_res.status_code == 200, f"Impersonation failed: {imp_res.text}"
        
        imp_data = imp_res.json()
        assert "access_token" in imp_data
        
        # 3. Retrieve me using the impersonated token
        imp_headers = {"Authorization": f"Bearer {imp_data['access_token']}"}
        me_res = await client.get("/api/v1/auth/me", headers=imp_headers)
        assert me_res.status_code == 200
        
        me_data = me_res.json()
        assert me_data["email"] == "employee@goalforge.ai"
        assert me_data["role"] == "employee"
        print("\n[SUCCESS] Async Impersonation flow verified successfully!")
        print(f"Logged in email: {me_data['email']}, role: {me_data['role']}")
        print("-------------------------------------------\n")

if __name__ == "__main__":
    asyncio.run(test_impersonate_flow())

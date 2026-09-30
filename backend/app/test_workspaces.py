import pytest

@pytest.fixture
def auth_headers(client):
    client.post(
        "/api/auth/register",
        json={"email": "workspace@example.com", "password": "password123"}
    )
    res = client.post(
        "/api/auth/login",
        data={"username": "workspace@example.com", "password": "password123"}
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_user2(client):
    client.post(
        "/api/auth/register",
        json={"email": "user2@example.com", "password": "password123"}
    )
    res = client.post(
        "/api/auth/login",
        data={"username": "user2@example.com", "password": "password123"}
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_create_workspace(client, auth_headers):
    res = client.post(
        "/api/workspaces",
        headers=auth_headers,
        json={"name": "New Test Workspace"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "New Test Workspace"
    assert "id" in data

def test_get_workspaces(client, auth_headers):
    # Registering auto-creates a workspace, let's verify
    res = client.get("/api/workspaces", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1

def test_workspace_ownership(client, auth_headers, auth_headers_user2):
    # User 1 creates workspace
    res = client.post(
        "/api/workspaces",
        headers=auth_headers,
        json={"name": "User1 Workspace"}
    )
    ws_id = res.json()["id"]
    
    # User 2 tries to access User 1's workspace
    res2 = client.get(
        f"/api/workspaces/{ws_id}",
        headers=auth_headers_user2
    )
    assert res2.status_code == 404 # Not found / forbidden

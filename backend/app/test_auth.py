def test_register_user_success(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "id" in data

def test_register_user_duplicate(client):
    client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "password": "password123"}
    )
    response = client.post(
        "/api/auth/register",
        json={"email": "dup@example.com", "password": "password123"}
    )
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_login_invalid_credentials(client):
    response = client.post(
        "/api/auth/login",
        data={"username": "wrong@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 400

def test_login_success(client):
    client.post(
        "/api/auth/register",
        json={"email": "login@example.com", "password": "password123"}
    )
    response = client.post(
        "/api/auth/login",
        data={"username": "login@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_protected_endpoint_without_token(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_protected_endpoint_with_token(client):
    client.post(
        "/api/auth/register",
        json={"email": "protected@example.com", "password": "password123"}
    )
    login_res = client.post(
        "/api/auth/login",
        data={"username": "protected@example.com", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "protected@example.com"

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(client, email="test_wf_plan@example.com"):
    client.post("/api/auth/register", json={"email": email, "password": "password123"})
    res = client.post("/api/auth/login", data={"username": email, "password": "password123"})
    return res.json().get("access_token")

def create_test_source(client, token, name, allowed=True):
    return client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={
        "name": name,
        "type": "web",
        "supported_fields": ["company"],
        "allowed": allowed
    }).json()

def test_create_workflow_plan_enabled_source():
    """TEST 1 - ENABLED SOURCE: Source A (allowed=True, compatible=True) -> may be selected"""
    token = get_auth_token(client, "test1@example.com")
    src = create_test_source(client, token, "Source A", allowed=True)
    
    payload = {
        "requirement_analysis": {"intent": "job_search", "entity": "internship"},
        "dataset_schema": [{"name": "company"}],
        "available_sources": [{"id": src["id"], "name": src["name"], "supported_fields": ["company"]}]
    }
    res = client.post("/api/workflows/plan", headers={"Authorization": f"Bearer {token}"}, json=payload)
    assert res.status_code == 200
    steps = res.json()["steps"]
    assert steps[0]["source_id"] == src["id"]

def test_create_workflow_plan_disabled_source():
    """TEST 2 & 6 - DISABLED SOURCE / NO ENABLED COMPATIBLE SOURCES"""
    token = get_auth_token(client, "test2@example.com")
    src = create_test_source(client, token, "Source A", allowed=False)
    
    payload = {
        "requirement_analysis": {"intent": "job_search", "entity": "internship"},
        "dataset_schema": [{"name": "company"}],
        "available_sources": [{"id": src["id"], "name": src["name"], "supported_fields": ["company"]}]
    }
    res = client.post("/api/workflows/plan", headers={"Authorization": f"Bearer {token}"}, json=payload)
    assert res.status_code == 400
    assert "No enabled compatible sources" in res.json()["detail"]

def test_create_workflow_plan_mixed_sources():
    """TEST 3 - DISABLED + ENABLED SOURCE: Only enabled is available"""
    token = get_auth_token(client, "test3@example.com")
    src_disabled = create_test_source(client, token, "Source A (Disabled)", allowed=False)
    src_enabled = create_test_source(client, token, "Source B (Enabled)", allowed=True)
    
    payload = {
        "requirement_analysis": {"intent": "job_search", "entity": "internship"},
        "dataset_schema": [{"name": "company"}],
        "available_sources": [
            {"id": src_disabled["id"], "name": src_disabled["name"], "supported_fields": ["company"]},
            {"id": src_enabled["id"], "name": src_enabled["name"], "supported_fields": ["company"]}
        ]
    }
    res = client.post("/api/workflows/plan", headers={"Authorization": f"Bearer {token}"}, json=payload)
    assert res.status_code == 200
    steps = res.json()["steps"]
    # Fallback mode should automatically pick the ONLY valid source, which is src_enabled
    assert steps[0]["source_id"] == src_enabled["id"]

def test_create_workflow_plan_fake_source_id():
    """TEST 4 - FAKE SOURCE ID: If AI returns fake source, workflow is rejected.
       We test this by passing a fake source in available_sources that doesn't exist in the DB."""
    token = get_auth_token(client, "test4@example.com")
    # Note: no source is actually created in the DB!
    payload = {
        "requirement_analysis": {"intent": "job_search", "entity": "internship"},
        "dataset_schema": [{"name": "company"}],
        "available_sources": [{"id": 999999, "name": "Fake Source", "supported_fields": ["company"]}]
    }
    res = client.post("/api/workflows/plan", headers={"Authorization": f"Bearer {token}"}, json=payload)
    assert res.status_code == 400
    assert "No enabled compatible sources" in res.json()["detail"]

def test_create_workflow_plan_other_workspace():
    """TEST 5 - OTHER WORKSPACE SOURCE"""
    token1 = get_auth_token(client, "test5_w1@example.com")
    token2 = get_auth_token(client, "test5_w2@example.com")
    
    # User 1 creates a source
    src = create_test_source(client, token1, "Workspace 1 Source", allowed=True)
    
    # User 2 tries to use User 1's source
    payload = {
        "requirement_analysis": {"intent": "job_search", "entity": "internship"},
        "dataset_schema": [{"name": "company"}],
        "available_sources": [{"id": src["id"], "name": src["name"], "supported_fields": ["company"]}]
    }
    res = client.post("/api/workflows/plan", headers={"Authorization": f"Bearer {token2}"}, json=payload)
    assert res.status_code == 400
    assert "No enabled compatible sources" in res.json()["detail"]


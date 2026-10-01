def get_auth_token(client, email="test_source@example.com"):
    client.post("/api/auth/register", json={"email": email, "password": "password123"})
    res = client.post("/api/auth/login", data={"username": email, "password": "password123"})
    return res.json()["access_token"]

def test_create_source(client):
    token = get_auth_token(client, "test_create_source@example.com")
    res = client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Test Source",
        "type": "web",
        "base_url": "https://example.com",
        "supported_fields": ["a", "b"],
        "allowed": True
    })
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Test Source"
    assert data["id"] is not None

def test_list_sources(client):
    token = get_auth_token(client, "test_list_sources@example.com")
    client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={"name": "S1", "type": "web"})
    res = client.get("/api/sources/", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) >= 1

def test_get_source(client):
    # Testing retrieval implicitly through listing
    pass

def test_update_source(client):
    token = get_auth_token(client, "test_update_source@example.com")
    s1 = client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={"name": "S1", "type": "web"}).json()
    res = client.put(f"/api/sources/{s1['id']}", headers={"Authorization": f"Bearer {token}"}, json={"name": "S1 Updated"})
    assert res.status_code == 200
    assert res.json()["name"] == "S1 Updated"

def test_delete_source(client):
    token = get_auth_token(client, "test_delete_source@example.com")
    s1 = client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={"name": "S1", "type": "web"}).json()
    res = client.delete(f"/api/sources/{s1['id']}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    res_list = client.get("/api/sources/", headers={"Authorization": f"Bearer {token}"})
    assert len([s for s in res_list.json() if s['id'] == s1['id']]) == 0

def test_source_validation(client):
    token = get_auth_token(client, "test_validation@example.com")
    res = client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={"name": ""})
    # Should fail due to missing type
    assert res.status_code == 422

def test_source_compatibility(client):
    token = get_auth_token(client, "test_match@example.com")
    client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Source A", "type": "web", "supported_fields": ["company_name", "website", "headquarters"], "allowed": True
    })
    client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Source B", "type": "web", "supported_fields": ["company_name", "founder", "funding_stage"], "allowed": True
    })
    
    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"}, json={
        "fields": ["company_name", "founder", "headquarters", "funding_stage", "website"]
    })
    
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2
    
    src_a = next(d for d in data if d["name"] == "Source A")
    assert set(src_a["matched_fields"]) == {"company_name", "website", "headquarters"}
    assert set(src_a["missing_fields"]) == {"founder", "funding_stage"}
    
    src_b = next(d for d in data if d["name"] == "Source B")
    assert set(src_b["matched_fields"]) == {"company_name", "founder", "funding_stage"}
    assert set(src_b["missing_fields"]) == {"headquarters", "website"}

def test_disabled_source_excluded(client):
    token = get_auth_token(client, "test_disabled@example.com")
    src = client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Source Disabled", "type": "web", "supported_fields": ["company_name", "founder", "funding_stage"], "allowed": False
    }).json()
    
    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"}, json={
        "fields": ["company_name"]
    })
    data = res.json()
    assert len([d for d in data if d["id"] == src["id"]]) == 0
    
    client.put(f"/api/sources/{src['id']}", headers={"Authorization": f"Bearer {token}"}, json={"allowed": True})
    res2 = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"}, json={
        "fields": ["company_name"]
    })
    assert len([d for d in res2.json() if d["id"] == src["id"]]) == 1

def test_unauthorized_source_access(client):
    res = client.get("/api/sources/")
    assert res.status_code == 401

def test_workspace_source_isolation(client):
    token1 = get_auth_token(client, "w1_sources@example.com")
    token2 = get_auth_token(client, "w2_sources@example.com")
    
    src = client.post("/api/sources/", headers={"Authorization": f"Bearer {token1}"}, json={"name": "S1", "type": "web"}).json()
    
    res2 = client.get("/api/sources/", headers={"Authorization": f"Bearer {token2}"})
    assert len([s for s in res2.json() if s['id'] == src['id']]) == 0
    
    # attempt to delete someone else's source
    res_del = client.delete(f"/api/sources/{src['id']}", headers={"Authorization": f"Bearer {token2}"})
    assert res_del.status_code == 404

def test_reenabled_source_included(client):
    """Full cycle: create enabled → disable → verify excluded → re-enable → verify included"""
    token = get_auth_token(client, "test_reenable@example.com")
    
    # Create Source A (enabled) and Source B (enabled)
    src_a = client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Source A", "type": "web", "base_url": "https://a.com",
        "supported_fields": ["company_name", "website", "headquarters"], "allowed": True
    }).json()
    src_b = client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Source B", "type": "api", "base_url": "https://b.com",
        "supported_fields": ["company_name", "founder", "funding_stage"], "allowed": True
    }).json()
    
    fields = ["company_name", "founder", "headquarters", "funding_stage", "website"]
    
    # Both enabled → both should appear
    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"}, json={"fields": fields})
    assert res.status_code == 200
    ids = [s["id"] for s in res.json()]
    assert src_a["id"] in ids
    assert src_b["id"] in ids
    
    # Disable Source B
    client.put(f"/api/sources/{src_b['id']}", headers={"Authorization": f"Bearer {token}"}, json={"allowed": False})
    
    # Only Source A should appear
    res2 = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"}, json={"fields": fields})
    ids2 = [s["id"] for s in res2.json()]
    assert src_a["id"] in ids2
    assert src_b["id"] not in ids2
    
    # Re-enable Source B
    client.put(f"/api/sources/{src_b['id']}", headers={"Authorization": f"Bearer {token}"}, json={"allowed": True})
    
    # Both should appear again
    res3 = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"}, json={"fields": fields})
    ids3 = [s["id"] for s in res3.json()]
    assert src_a["id"] in ids3
    assert src_b["id"] in ids3

def test_empty_compatibility_result(client):
    """When no source matches any requested field, return empty list"""
    token = get_auth_token(client, "test_empty_match@example.com")
    
    client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Unrelated Source", "type": "web",
        "supported_fields": ["temperature", "humidity"], "allowed": True
    })
    
    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"}, json={
        "fields": ["company_name", "founder"]
    })
    assert res.status_code == 200
    assert len(res.json()) == 0

def test_match_response_includes_type_and_url(client):
    """Verify the match response includes type and base_url for UI display"""
    token = get_auth_token(client, "test_response_shape@example.com")
    
    client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Detailed Source", "type": "api", "base_url": "https://api.example.com",
        "supported_fields": ["company_name", "revenue"], "allowed": True
    })
    
    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"}, json={
        "fields": ["company_name", "revenue", "employees"]
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    src = data[0]
    assert src["type"] == "api"
    assert src["base_url"] == "https://api.example.com"
    assert set(src["matched_fields"]) == {"company_name", "revenue"}
    assert set(src["missing_fields"]) == {"employees"}


# =====================================================================
# REGRESSION TESTS FOR BUG: "enabled source with partial field match not returned"
# Root cause: supported_fields stored as space-separated string in a single
# array element (["company_name website headquarters"]) instead of a proper
# array (["company_name", "website", "headquarters"])
# =====================================================================

FIELDS = ["company_name", "founder", "headquarters", "funding_stage", "website"]

def make_source_a(client, token, allowed=True):
    """Test Company Directory: matches company_name, website, headquarters"""
    return client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Test Company Directory", "type": "web", "base_url": "https://company-dir.com",
        "supported_fields": ["company_name", "website", "headquarters"],
        "allowed": allowed
    }).json()

def make_source_b(client, token, allowed=True):
    """Test Funding Database: matches company_name, founder, funding_stage"""
    return client.post("/api/sources/", headers={"Authorization": f"Bearer {token}"}, json={
        "name": "Test Funding Database", "type": "api", "base_url": "https://funding-db.com",
        "supported_fields": ["company_name", "founder", "funding_stage"],
        "allowed": allowed
    }).json()


def test_enabled_partial_match_source_is_returned(client):
    """
    REGRESSION: Source A is enabled and matches only 3 of 5 requested fields.
    It MUST still be returned. Missing fields ≠ not compatible.
    """
    token = get_auth_token(client, "regression_partial@example.com")
    src_a = make_source_a(client, token, allowed=True)

    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"},
                      json={"fields": FIELDS})
    assert res.status_code == 200
    data = res.json()
    ids = [s["id"] for s in data]
    assert src_a["id"] in ids, "Enabled source with partial field match MUST be returned"

    matched = next(s for s in data if s["id"] == src_a["id"])
    assert set(matched["matched_fields"]) == {"company_name", "headquarters", "website"}
    assert set(matched["missing_fields"]) == {"founder", "funding_stage"}


def test_scenario_a_enabled_b_disabled(client):
    """TEST 1: Source A enabled, Source B disabled → only A returned"""
    token = get_auth_token(client, "scenario1@example.com")
    src_a = make_source_a(client, token, allowed=True)
    src_b = make_source_b(client, token, allowed=False)

    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"},
                      json={"fields": FIELDS})
    ids = [s["id"] for s in res.json()]
    assert src_a["id"] in ids
    assert src_b["id"] not in ids


def test_scenario_a_disabled_b_enabled(client):
    """TEST 2: Source A disabled, Source B enabled → only B returned"""
    token = get_auth_token(client, "scenario2@example.com")
    src_a = make_source_a(client, token, allowed=False)
    src_b = make_source_b(client, token, allowed=True)

    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"},
                      json={"fields": FIELDS})
    ids = [s["id"] for s in res.json()]
    assert src_a["id"] not in ids
    assert src_b["id"] in ids


def test_scenario_both_enabled(client):
    """TEST 3: Both enabled → both returned"""
    token = get_auth_token(client, "scenario3@example.com")
    src_a = make_source_a(client, token, allowed=True)
    src_b = make_source_b(client, token, allowed=True)

    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"},
                      json={"fields": FIELDS})
    ids = [s["id"] for s in res.json()]
    assert src_a["id"] in ids
    assert src_b["id"] in ids


def test_scenario_both_disabled(client):
    """TEST 4: Both disabled → empty result"""
    token = get_auth_token(client, "scenario4@example.com")
    src_a = make_source_a(client, token, allowed=False)
    src_b = make_source_b(client, token, allowed=False)

    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"},
                      json={"fields": FIELDS})
    assert res.json() == []


def test_scenario_cross_workspace_isolation(client):
    """TEST 5: Source in workspace 1 must NOT appear in workspace 2 match results"""
    token1 = get_auth_token(client, "ws_iso_user1@example.com")
    token2 = get_auth_token(client, "ws_iso_user2@example.com")

    src = make_source_a(client, token1, allowed=True)

    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token2}"},
                      json={"fields": FIELDS})
    ids = [s["id"] for s in res.json()]
    assert src["id"] not in ids, "Source from another workspace must not appear"


def test_scenario_correct_matched_and_missing_fields(client):
    """TEST 6: Verify exact matched_fields and missing_fields values"""
    token = get_auth_token(client, "scenario6@example.com")
    make_source_a(client, token, allowed=True)
    make_source_b(client, token, allowed=True)

    res = client.post("/api/sources/match", headers={"Authorization": f"Bearer {token}"},
                      json={"fields": FIELDS})
    data = res.json()

    src_a = next(s for s in data if s["name"] == "Test Company Directory")
    assert set(src_a["matched_fields"]) == {"company_name", "headquarters", "website"}
    assert set(src_a["missing_fields"]) == {"founder", "funding_stage"}

    src_b = next(s for s in data if s["name"] == "Test Funding Database")
    assert set(src_b["matched_fields"]) == {"company_name", "founder", "funding_stage"}
    assert set(src_b["missing_fields"]) == {"headquarters", "website"}


def test_normalize_fields_in_stored_data(client):
    """
    Regression: If supported_fields were stored malformed as
    ['company_name website headquarters'] (single space-separated string),
    normalize_fields() must split them correctly so matching still works.
    """
    from app.services.source_matcher import normalize_fields
    # Simulate the exact malformed data found in the live DB
    malformed = ["company_name website headquarters"]
    result = normalize_fields(malformed)
    assert result == {"company_name", "website", "headquarters"}

    # Also verify comma-separated single string works
    comma_malformed = ["company_name,website,headquarters"]
    result2 = normalize_fields(comma_malformed)
    assert result2 == {"company_name", "website", "headquarters"}

    # Properly stored data must also work
    proper = ["company_name", "website", "headquarters"]
    result3 = normalize_fields(proper)
    assert result3 == {"company_name", "website", "headquarters"}

import urllib.request
import json

# 1. Register a dummy user to get a token
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/register', method='POST', headers={'Content-Type': 'application/json'})
data = json.dumps({"email": "test400@example.com", "password": "password", "name": "Test User"})
try:
    resp = urllib.request.urlopen(req, data=data.encode('utf-8'))
    print("Registered:", resp.read())
except Exception as e:
    pass

# 2. Login to get token
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login', method='POST', headers={'Content-Type': 'application/x-www-form-urlencoded'})
data = "username=test400@example.com&password=password"
token = ""
try:
    resp = urllib.request.urlopen(req, data=data.encode('utf-8'))
    token = json.loads(resp.read().decode('utf-8'))['access_token']
    print("Token:", token[:10])
except Exception as e:
    print("Login error", e)

# 3. Create task
if token:
    req = urllib.request.Request('http://127.0.0.1:8000/api/tasks/', method='POST', headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
    data = json.dumps({
        "plan": {
            "name": "Test Plan",
            "steps": [{"type": "collect", "source_id": None}]
        },
        "context": {}
    })
    try:
        resp = urllib.request.urlopen(req, data=data.encode('utf-8'))
        print("Task created successfully:", resp.read())
    except urllib.error.HTTPError as e:
        print("Task creation HTTPError:", e.code, e.read().decode('utf-8'))
    except Exception as e:
        print("Task creation error:", e)

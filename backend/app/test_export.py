import pytest
from app.api.routes.exports import _export_csv, _export_json, _export_xlsx
from fastapi.responses import StreamingResponse
from app.models import DatasetRecord
import json
import io
import asyncio

class MockDatasetRecord:
    def __init__(self, values, status, dup_status, prov):
        self.values = values
        self.status = status
        self.duplicate_status = dup_status
        self.provenance = prov

@pytest.fixture
def sample_records():
    return [
        MockDatasetRecord(
            values={"company": "Google", "role": "Intern"},
            status="VALID",
            dup_status="UNIQUE",
            prov={"source_url": "http://google.com", "retrieved_at": "2023-10-01"}
        ),
        MockDatasetRecord(
            values={"company": "Microsoft", "role": "SDE"},
            status="NEEDS_REVIEW",
            dup_status="UNIQUE",
            prov={"source_url": "http://microsoft.com", "retrieved_at": "2023-10-02"}
        )
    ]

@pytest.fixture
def empty_records():
    return []

def test_csv_structure(sample_records):
    headers = ["company", "role", "source_url", "retrieved_at", "validation_status", "duplicate_status"]
    response = _export_csv("TestDataset", headers, sample_records)
    
    assert isinstance(response, StreamingResponse)
    
    async def _get_body():
        return "".join([chunk async for chunk in response.body_iterator])
    body_content = asyncio.run(_get_body())
    
    assert "company,role,source_url,retrieved_at,validation_status,duplicate_status" in body_content
    assert "Google,Intern,http://google.com,2023-10-01,VALID,UNIQUE" in body_content
    assert "Microsoft,SDE,http://microsoft.com,2023-10-02,NEEDS_REVIEW,UNIQUE" in body_content

def test_json_structure(sample_records):
    response = _export_json("TestDataset", sample_records)
    assert isinstance(response, StreamingResponse)
    
    async def _get_body():
        return "".join([chunk async for chunk in response.body_iterator])
    body_content = asyncio.run(_get_body())
    data = json.loads(body_content)
    
    assert len(data) == 2
    assert data[0]["company"] == "Google"
    assert data[0]["_metadata"]["source_url"] == "http://google.com"
    assert data[0]["_metadata"]["validation_status"] == "VALID"
    
    assert data[1]["company"] == "Microsoft"
    assert data[1]["_metadata"]["validation_status"] == "NEEDS_REVIEW"

def test_empty_dataset_export(empty_records):
    headers = ["company"]
    response = _export_csv("EmptyDataset", headers, empty_records)
    async def _get_body():
        return "".join([chunk async for chunk in response.body_iterator])
    body_content = asyncio.run(_get_body())
    
    # Only headers should be present
    assert body_content.strip() == "company"

def test_xlsx_generation_error_handling(sample_records, monkeypatch):
    # Test that it gracefully fails if openpyxl is missing
    # or succeeds if present.
    headers = ["company", "role"]
    
    import sys
    # Force ImportError for openpyxl
    monkeypatch.setitem(sys.modules, "openpyxl", None)
    
    with pytest.raises(Exception) as exc:
        _export_xlsx("TestDataset", headers, sample_records)
        
    assert "openpyxl is required" in str(exc.value)

def test_filtered_export_logic():
    # In a real integrated test, we'd query the DB with filters
    # Here we just verify the export functions don't care about what was filtered,
    # they just render the exact array of records passed in.
    filtered = [
        MockDatasetRecord(
            values={"company": "Google", "role": "Intern"},
            status="VALID",
            dup_status="UNIQUE",
            prov={"source_url": "http://google.com", "retrieved_at": "2023-10-01"}
        )
    ]
    response = _export_json("FilteredDataset", filtered)
    async def _get_body():
        return "".join([chunk async for chunk in response.body_iterator])
    body_content = asyncio.run(_get_body())
    data = json.loads(body_content)
    
    assert len(data) == 1
    assert data[0]["company"] == "Google"

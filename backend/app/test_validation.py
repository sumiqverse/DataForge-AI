from app.schemas.extraction import ExtractedRecord
from app.services.validation_service import ValidationEngine

def test_validation_engine_required_fields():
    schema = [
        {"name": "req_field", "type": "text", "required": True},
        {"name": "opt_field", "type": "text", "required": False},
        {"name": "missing_req", "type": "text", "required": True}
    ]
    
    record = ExtractedRecord(
        values={"req_field": "Present", "opt_field": None}, # missing_req is completely missing
        source_url="http://test.com"
    )
    
    result = ValidationEngine.validate_record(record, schema)
    
    assert result.status == "NEEDS_REVIEW"
    assert len(result.errors) == 1
    assert result.errors[0].field == "missing_req"
    assert result.errors[0].code in ["MISSING_FIELD_KEY", "REQUIRED_FIELD_MISSING"]

def test_validation_engine_types():
    schema = [
        {"name": "url_field", "type": "url"},
        {"name": "date_field", "type": "date"},
        {"name": "num_field", "type": "number"}
    ]
    
    record = ExtractedRecord(
        values={
            "url_field": "not_a_url",
            "date_field": "2023-13-45", # invalid date
            "num_field": "abc"
        },
        source_url="http://test.com"
    )
    
    result = ValidationEngine.validate_record(record, schema)
    
    assert result.status == "NEEDS_REVIEW"
    assert len(result.errors) == 3
    error_codes = [e.code for e in result.errors]
    assert "INVALID_URL" in error_codes
    assert "INVALID_DATE" in error_codes
    assert "INVALID_NUMBER" in error_codes

def test_validation_engine_custom_rules():
    schema = [
        {"name": "revenue", "type": "number", "validation_rule": "Must be >= 1000"}
    ]
    
    record_fail = ExtractedRecord(values={"revenue": 500}, source_url="http://test.com")
    res_fail = ValidationEngine.validate_record(record_fail, schema)
    
    assert res_fail.status == "NEEDS_REVIEW"
    assert res_fail.errors[0].code == "FAILED_CUSTOM_RULE"
    
    record_pass = ExtractedRecord(values={"revenue": 1500}, source_url="http://test.com")
    res_pass = ValidationEngine.validate_record(record_pass, schema)
    
    assert res_pass.status == "VALID"
    assert len(res_pass.errors) == 0

def test_validation_engine_all_valid():
    schema = [
        {"name": "name", "type": "text", "required": True},
        {"name": "site", "type": "url"},
        {"name": "founded", "type": "date"}
    ]
    
    record = ExtractedRecord(
        values={
            "name": "DemoCorp",
            "site": "https://democorp.com",
            "founded": "2020-01-01"
        },
        source_url="http://test.com"
    )
    
    result = ValidationEngine.validate_record(record, schema)
    
    assert result.status == "VALID"
    assert len(result.errors) == 0

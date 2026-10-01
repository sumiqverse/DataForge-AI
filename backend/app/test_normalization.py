from app.schemas.extraction import ExtractedRecord
from app.services.normalization_service import NormalizationService

def test_normalization_whitespace_and_nulls():
    record = ExtractedRecord(
        values={"text1": "   Hello \n  World   ", "text2": None, "text3": ""},
        source_url="http://test.com"
    )
    fields = [
        {"name": "text1", "type": "text"},
        {"name": "text2", "type": "text"},
        {"name": "text3", "type": "text"}
    ]
    
    res = NormalizationService.normalize_record(record, fields)
    assert res.values["text1"] == "Hello World"
    assert res.values["text2"] is None
    assert res.values["text3"] == ""
    assert "text1:text" in res.extraction_metadata["normalizations"]

def test_normalization_currency_variants():
    record = ExtractedRecord(
        values={
            "c1": "₹30K",
            "c2": "Rs 30,000",
            "c3": "30000 INR",
            "c4": "1.5Cr",
            "c5": "5 Lakh",
            "c6": "2.5M",
            "c7": "Invalid Currency"
        },
        source_url="http://test.com"
    )
    fields = [{"name": f"c{i}", "type": "currency"} for i in range(1, 8)]
    
    res = NormalizationService.normalize_record(record, fields)
    assert res.values["c1"] == 30000.0
    assert res.values["c2"] == 30000.0
    assert res.values["c3"] == 30000.0
    assert res.values["c4"] == 15000000.0
    assert res.values["c5"] == 500000.0
    assert res.values["c6"] == 2500000.0
    assert res.values["c7"] is None

def test_normalization_date_variants():
    record = ExtractedRecord(
        values={
            "d1": "2023-10-01",
            "d2": "01/10/2023", # DD/MM/YYYY
            "d3": "October 01, 2023",
            "d4": "2023-10-01T15:30:00Z",
            "d5": "Not a date"
        },
        source_url="http://test.com"
    )
    fields = [{"name": f"d{i}", "type": "date"} for i in range(1, 6)]
    
    res = NormalizationService.normalize_record(record, fields)
    assert res.values["d1"] == "2023-10-01"
    assert res.values["d2"] == "2023-10-01"
    assert res.values["d3"] == "2023-10-01"
    assert res.values["d4"] == "2023-10-01"
    assert res.values["d5"] == "Not a date" # Fallback to original

def test_normalization_url_variants():
    record = ExtractedRecord(
        values={
            "u1": "example.com",
            "u2": "https://secure.com",
            "u3": "   http://spaced.com  "
        },
        source_url="http://test.com"
    )
    fields = [{"name": f"u{i}", "type": "url"} for i in range(1, 4)]
    
    res = NormalizationService.normalize_record(record, fields)
    assert res.values["u1"] == "https://example.com"
    assert res.values["u2"] == "https://secure.com"
    assert res.values["u3"] == "http://spaced.com"

def test_normalization_location_and_email():
    record = ExtractedRecord(
        values={
            "loc": "new york city",
            "email": "USER@EXAMPLE.COM"
        },
        source_url="http://test.com"
    )
    fields = [
        {"name": "loc", "type": "text", "normalization_rule": "location"},
        {"name": "email", "type": "text", "normalization_rule": "lowercase email"}
    ]
    
    res = NormalizationService.normalize_record(record, fields)
    assert res.values["loc"] == "New York City"
    assert res.values["email"] == "user@example.com"

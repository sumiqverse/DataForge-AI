import pytest
from datetime import datetime
from app.schemas.collection import RawDocument
from app.services.extractor_service import ExtractorPipeline

def test_extraction_pipeline_deterministic_html():
    schema = [
        {"name": "company_name"},
        {"name": "website"},
        {"name": "headquarters"},
        {"name": "missing_field"} # Should be None
    ]
    
    config = {
        "selectors": {
            "company_name": "h1.title",
            "website": "a.site-link::attr(href)",
            "headquarters": "div.location",
            "undeclared_field": "div.secret" # Should be ignored
        },
        "use_llm_fallback": False
    }
    
    raw_html = """
    <html>
        <body>
            <h1 class="title">DemoCorp</h1>
            <a class="site-link" href="https://democorp.local">Visit us</a>
            <div class="location">San Francisco, CA</div>
            <div class="secret">Hidden data</div>
        </body>
    </html>
    """
    
    doc = RawDocument(
        source_id=1,
        url="https://democorp.local/about",
        retrieved_at=datetime.utcnow(),
        raw_content=raw_html
    )
    
    pipeline = ExtractorPipeline(dataset_schema=schema, config=config)
    record = pipeline.extract(doc)
    
    assert record.source_url == "https://democorp.local/about"
    assert record.confidence == 1.0
    assert "css_selectors" in record.extraction_metadata["methods_used"]
    
    # Values check
    assert record.values["company_name"] == "DemoCorp"
    assert record.values["website"] == "https://democorp.local"
    assert record.values["headquarters"] == "San Francisco, CA"
    assert record.values["missing_field"] is None
    
    # Ensure undeclared fields are not created
    assert "undeclared_field" not in record.values

def test_extraction_pipeline_regex():
    schema = [
        {"name": "founder"},
        {"name": "revenue"}
    ]
    
    config = {
        "regex": {
            "founder": r"Founder:\s*([A-Za-z\s]+)",
            "revenue": r"Revenue:\s*\$(\d+M)"
        },
        "use_llm_fallback": False
    }
    
    raw_text = "Welcome to our page. Founder: John Doe. We are doing great! Revenue: $50M this year."
    
    doc = RawDocument(
        source_id=2,
        url="https://test.local",
        retrieved_at=datetime.utcnow(),
        raw_content=raw_text
    )
    
    pipeline = ExtractorPipeline(dataset_schema=schema, config=config)
    record = pipeline.extract(doc)
    
    assert record.values["founder"].strip() == "John Doe"
    assert record.values["revenue"] == "50M"
    assert "regex" in record.extraction_metadata["methods_used"]

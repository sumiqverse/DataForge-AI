from app.schemas.extraction import ExtractedRecord
from app.services.deduplication_service import DeduplicationEngine

def test_deduplication_exact_match():
    r1 = ExtractedRecord(
        values={"company": "Google", "title": "Intern", "location": "Delhi"},
        source_url="http://site1.com"
    )
    r2 = ExtractedRecord(
        values={"company": "Google", "title": "Intern", "location": "Delhi"},
        source_url="http://site2.com"
    )
    
    clusters = DeduplicationEngine.cluster_records([r1, r2], ["company", "title", "location"])
    
    assert len(clusters) == 1
    assert len(clusters[0].member_records) == 2
    assert "exact_match" in clusters[0].merge_reasons

def test_deduplication_normalized_match():
    r1 = ExtractedRecord(
        values={"company": "Google", "title": "AI Intern", "location": "Delhi "},
        source_url="http://site1.com"
    )
    # Different casing and punctuation, but normalizes to the same
    r2 = ExtractedRecord(
        values={"company": "google!", "title": "ai  intern", "location": "DELHI"},
        source_url="http://site2.com"
    )
    
    clusters = DeduplicationEngine.cluster_records([r1, r2], ["company", "title", "location"])
    
    assert len(clusters) == 1
    assert "normalized_match" in clusters[0].merge_reasons

def test_deduplication_non_duplicates():
    r1 = ExtractedRecord(
        values={"company": "Google", "title": "Intern", "location": "Delhi"},
        source_url="http://site1.com"
    )
    r2 = ExtractedRecord(
        values={"company": "Microsoft", "title": "Intern", "location": "Delhi"},
        source_url="http://site2.com"
    )
    
    clusters = DeduplicationEngine.cluster_records([r1, r2], ["company", "title", "location"])
    
    assert len(clusters) == 2

def test_deduplication_conflicting_records_and_three_record_cluster():
    r1 = ExtractedRecord(
        values={"company": "Google", "title": "AI Intern", "location": "Delhi", "salary": "30k"},
        source_url="http://site1.com"
    )
    r2 = ExtractedRecord(
        values={"company": "Google India", "title": "AI/ML Intern", "location": "New Delhi", "salary": "30k"},
        source_url="http://site2.com"
    )
    r3 = ExtractedRecord(
        values={"company": "Google", "title": "AI Intern", "location": "Delhi", "salary": "40k"}, # Conflicts on salary
        source_url="http://site3.com"
    )
    
    # Configure identifying fields and low threshold for similarity test
    identifying_fields = ["company", "title", "location"]
    config = {"similarity_threshold": 0.3} # Low enough to match 'New Delhi' with 'Delhi'
    
    clusters = DeduplicationEngine.cluster_records([r1, r2, r3], identifying_fields, config)
    
    assert len(clusters) == 1
    cluster = clusters[0]
    assert len(cluster.member_records) == 3
    
    # It should have found similarity matches (and possibly exact match between 1 and 3 on identifiers)
    assert any("exact_match" in r or "similarity_match" in r for r in cluster.merge_reasons)
    
    # Conflict checks
    assert "salary" in cluster.conflicting_values
    assert set(cluster.conflicting_values["salary"]) == {"30k", "40k"}
    
    # Source refs preservation
    assert len(cluster.source_references) == 3
    assert set(cluster.source_references) == {"http://site1.com", "http://site2.com", "http://site3.com"}

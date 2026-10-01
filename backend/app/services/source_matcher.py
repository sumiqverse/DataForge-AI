import re
from typing import List, Dict, Any
from app.models.source import Source


def normalize_fields(raw_fields: List[str]) -> set:
    """
    Normalize a list of field names, splitting any element that contains
    commas or spaces into individual field names.
    This handles malformed stored data like ["company_name website headquarters"]
    and properly stored data like ["company_name", "website", "headquarters"].
    """
    result = set()
    for field in (raw_fields or []):
        # Split on comma or whitespace, filter empty strings, strip each token
        for token in re.split(r'[,\s]+', field.strip()):
            token = token.strip()
            if token:
                result.add(token)
    return result


def match_sources(requested_fields: List[str], sources: List[Source]) -> List[Dict[str, Any]]:
    """
    Finds compatible sources based on supported fields.
    A source is compatible when it provides at least one requested field.
    Disabled sources are strictly excluded.
    """
    results = []
    req_fields_set = set(f.strip() for f in requested_fields if f.strip())

    for source in sources:
        if not source.allowed:
            continue

        source_fields = normalize_fields(source.supported_fields)
        matched = req_fields_set.intersection(source_fields)
        missing = req_fields_set - source_fields

        if len(matched) > 0:
            results.append({
                "id": source.id,
                "name": source.name,
                "type": source.type,
                "base_url": source.base_url,
                "matched_fields": sorted(matched),
                "missing_fields": sorted(missing)
            })

    return results

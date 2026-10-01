import re
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.schemas.extraction import ExtractedRecord
from app.schemas.dataset import DatasetField

class NormalizationService:
    @staticmethod
    def _normalize_whitespace(text: str) -> str:
        if not text:
            return text
        return re.sub(r'\s+', ' ', str(text)).strip()

    @staticmethod
    def _normalize_url(url: str) -> str:
        url = NormalizationService._normalize_whitespace(url)
        if not url:
            return url
        if not url.startswith('http://') and not url.startswith('https://'):
            return f"https://{url}"
        return url

    @staticmethod
    def _normalize_currency(value: str) -> Optional[float]:
        if not value:
            return None
            
        val_str = str(value).upper()
        # Remove currency symbols and commas
        val_str = re.sub(r'[₹,$\s]|RS\.?|INR|USD', '', val_str)
        
        # Extract the numeric part and the multiplier
        match = re.search(r'([\d\.]+)([KMLCR]*)', val_str)
        if not match:
            try:
                return float(val_str)
            except ValueError:
                return None
                
        num_part = match.group(1)
        suffix = match.group(2)
        
        try:
            num = float(num_part)
        except ValueError:
            return None
            
        if 'K' in suffix:
            num *= 1000
        elif 'L' in suffix or 'LAKH' in val_str:
            num *= 100000
        elif 'M' in suffix:
            num *= 1000000
        elif 'CR' in suffix or 'CRORE' in val_str:
            num *= 10000000
            
        return num

    @staticmethod
    def _normalize_date(date_str: str) -> Optional[str]:
        if not date_str:
            return None
        date_str = NormalizationService._normalize_whitespace(str(date_str))
        
        # Try a few common formats
        formats = [
            "%Y-%m-%d", "%Y/%m/%d",
            "%d/%m/%Y", "%m/%d/%Y",
            "%d-%m-%Y", "%m-%d-%Y",
            "%Y%m%d",
            "%B %d, %Y", "%b %d, %Y"
        ]
        
        # If it's already YYYY-MM-DD
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            return date_str
            
        # Try to parse
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
                
        # Basic regex fallback for things like "2023-10-01T00:00:00Z"
        iso_match = re.match(r'^(\d{4}-\d{2}-\d{2})T', date_str)
        if iso_match:
            return iso_match.group(1)
            
        return date_str # Return as is if we can't parse deterministically

    @staticmethod
    def _normalize_number(num_str: str) -> Optional[float]:
        if not num_str:
            return None
        # Remove anything that isn't a digit, minus sign, or period
        clean_str = re.sub(r'[^\d\.-]', '', str(num_str))
        try:
            return float(clean_str)
        except ValueError:
            return None

    @staticmethod
    def normalize_record(record: ExtractedRecord, fields: List[Dict[str, Any]]) -> ExtractedRecord:
        normalized_values = {}
        metadata = record.extraction_metadata.copy()
        normalizations_applied = []
        
        for field in fields:
            name = field.get("name")
            ftype = field.get("type", "text")
            
            if name not in record.values:
                continue
                
            original_value = record.values[name]
            
            if original_value is None:
                normalized_values[name] = None
                continue
                
            new_value = original_value
            
            try:
                if ftype == "text":
                    new_value = NormalizationService._normalize_whitespace(original_value)
                elif ftype == "url":
                    new_value = NormalizationService._normalize_url(original_value)
                elif ftype == "currency":
                    new_value = NormalizationService._normalize_currency(original_value)
                elif ftype == "date":
                    new_value = NormalizationService._normalize_date(original_value)
                elif ftype == "number":
                    new_value = NormalizationService._normalize_number(original_value)
                
                # If there's a specific normalisation rule like 'email' or 'location' 
                # (since they are 'text' type in schema)
                rule = str(field.get("normalization_rule", "")).lower()
                if "lower" in rule or "email" in rule:
                    new_value = str(new_value).lower()
                elif "location" in rule or "title" in rule:
                    new_value = str(new_value).title()
                    
            except Exception as e:
                # If normalization fails, keep original or None? Let's keep original but log it
                metadata.setdefault("normalization_errors", []).append({
                    "field": name,
                    "error": str(e)
                })
                new_value = original_value
                
            normalized_values[name] = new_value
            if new_value != original_value:
                normalizations_applied.append(f"{name}:{ftype}")
                
        metadata["normalizations"] = normalizations_applied
        
        return ExtractedRecord(
            dataset_id=record.dataset_id,
            values=normalized_values,
            source_url=record.source_url,
            extraction_metadata=metadata,
            confidence=record.confidence
        )

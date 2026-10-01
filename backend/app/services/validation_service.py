import re
from typing import Dict, Any, List
from datetime import datetime
from app.schemas.extraction import ExtractedRecord
from app.schemas.validation import ValidationResult, ValidationError

class ValidationEngine:
    @staticmethod
    def _validate_url(val: str) -> bool:
        # Very basic URL validation
        return bool(re.match(r'^https?:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?$', val))
        
    @staticmethod
    def _validate_date(val: str) -> bool:
        # Accept YYYY-MM-DD or standard ISO strings
        try:
            if len(val) == 10 and re.match(r'^\d{4}-\d{2}-\d{2}$', val):
                datetime.strptime(val, "%Y-%m-%d")
                return True
            # Fallback to ISO
            datetime.fromisoformat(val.replace("Z", "+00:00"))
            return True
        except ValueError:
            return False
            
    @staticmethod
    def _evaluate_custom_rule(val: Any, rule: str) -> bool:
        rule = rule.lower()
        # Basic deterministic math rule parsing for >=, <=, >, <
        try:
            num = float(val)
            if ">=" in rule:
                v = float(re.search(r'>=\s*([\d\.-]+)', rule).group(1))
                return num >= v
            elif "<=" in rule:
                v = float(re.search(r'<=\s*([\d\.-]+)', rule).group(1))
                return num <= v
            elif ">" in rule:
                v = float(re.search(r'>\s*([\d\.-]+)', rule).group(1))
                return num > v
            elif "<" in rule:
                v = float(re.search(r'<\s*([\d\.-]+)', rule).group(1))
                return num < v
        except Exception:
            pass
            
        return True # Default to True if rule is non-numeric or can't be parsed securely without eval()

    @staticmethod
    def validate_record(record: ExtractedRecord, schema_fields: List[Dict[str, Any]]) -> ValidationResult:
        errors = []
        
        for field in schema_fields:
            name = field.get("name")
            ftype = field.get("type", "text")
            required = field.get("required", False)
            rule = field.get("validation_rule")
            
            # Missing Field Detection
            if name not in record.values:
                if required:
                    errors.append(ValidationError(field=name, code="MISSING_FIELD_KEY"))
                continue
                
            val = record.values.get(name)
            
            # Required Field Validation (null or empty string)
            if val is None or (isinstance(val, str) and str(val).strip() == ""):
                if required:
                    errors.append(ValidationError(field=name, code="REQUIRED_FIELD_MISSING"))
                continue
                
            # Type Validation
            if ftype == "url":
                if not ValidationEngine._validate_url(str(val)):
                    errors.append(ValidationError(field=name, code="INVALID_URL"))
                    
            elif ftype == "date":
                if not ValidationEngine._validate_date(str(val)):
                    errors.append(ValidationError(field=name, code="INVALID_DATE"))
                    
            elif ftype in ["number", "currency"]:
                try:
                    float(val)
                except (ValueError, TypeError):
                    errors.append(ValidationError(field=name, code="INVALID_NUMBER"))
                    
            elif ftype == "boolean":
                if str(val).lower() not in ["true", "false", "1", "0", "yes", "no"]:
                    errors.append(ValidationError(field=name, code="INVALID_BOOLEAN"))
            
            # Custom Field Validation Rules
            if rule and val is not None:
                if not ValidationEngine._evaluate_custom_rule(val, rule):
                    errors.append(ValidationError(field=name, code="FAILED_CUSTOM_RULE", message=rule))
                    
        status = "NEEDS_REVIEW" if errors else "VALID"
        return ValidationResult(status=status, errors=errors)

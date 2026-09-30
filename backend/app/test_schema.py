import pytest
from app.schemas.dataset import DatasetField, DatasetSchema
from pydantic import ValidationError

def test_valid_schema_generation():
    field = DatasetField(
        name="stipend",
        display_name="Stipend",
        type="currency",
        required=False,
        description="Intern compensation",
        normalization_rule="Normalize to INR",
        validation_rule="Must be >= 0"
    )
    schema = DatasetSchema(fields=[field])
    assert schema.fields[0].name == "stipend"
    assert schema.fields[0].type == "currency"

def test_invalid_field_type():
    with pytest.raises(ValidationError):
        DatasetField(
            name="stipend",
            display_name="Stipend",
            type="invalid_type_here",
            required=False,
            description="Intern compensation"
        )

def test_duplicate_field_names():
    with pytest.raises(ValidationError, match="Duplicate field names"):
        DatasetSchema(fields=[
            DatasetField(name="stipend", display_name="Stipend 1", type="number", description="desc"),
            DatasetField(name="stipend", display_name="Stipend 2", type="currency", description="desc")
        ])

def test_required_field_handling():
    field = DatasetField(
        name="company",
        display_name="Company",
        type="text",
        required=True,
        description="Company name"
    )
    assert field.required is True

def test_malformed_ai_response():
    import json
    from app.schemas.dataset import DatasetSchema
    
    # Missing required 'type' field in the JSON
    bad_json = {
        "fields": [
            {
                "name": "company",
                "display_name": "Company",
                "description": "Company name"
            }
        ]
    }
    with pytest.raises(ValidationError):
        DatasetSchema(**bad_json)

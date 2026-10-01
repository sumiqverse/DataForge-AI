from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, asc, desc, cast, String
from fastapi.responses import StreamingResponse
import io
import csv
import json
from datetime import datetime
from typing import Optional

from app.api import deps
from app.database import get_db
from app.models import Dataset, DatasetRecord, User, Workspace

router = APIRouter()

@router.get("/{dataset_id}/export")
async def export_dataset(
    dataset_id: int,
    format: str = Query("csv", description="Export format: csv, json, xlsx"),
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: str = "asc",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Apply same filters as explorer
    query = db.query(DatasetRecord).filter(DatasetRecord.dataset_id == dataset_id)
    if status_filter:
        query = query.filter(DatasetRecord.status == status_filter)
    if search:
        search_term = f"%{search}%"
        query = query.filter(cast(DatasetRecord.values, String).ilike(search_term))
    if sort_by:
        if sort_order == "desc":
            query = query.order_by(desc(DatasetRecord.values[sort_by].as_string()))
        else:
            query = query.order_by(asc(DatasetRecord.values[sort_by].as_string()))
    else:
        query = query.order_by(desc(DatasetRecord.created_at))

    records = query.all()

    # Determine headers
    columns = list(dataset.schema_definition.keys()) if dataset.schema_definition else []
    
    # We add provenance fields as requested: normalized values (in values), source URL, retrieved timestamp
    headers = columns + ["source_url", "retrieved_at", "validation_status", "duplicate_status"]

    if format.lower() == "csv":
        return _export_csv(dataset.name, headers, records)
    elif format.lower() == "json":
        return _export_json(dataset.name, records)
    elif format.lower() == "xlsx":
        return _export_xlsx(dataset.name, headers, records)
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

def _export_csv(dataset_name: str, headers: list, records: list):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    
    for r in records:
        row = []
        for col in headers:
            if col == "source_url":
                row.append(r.provenance.get("source_url", "") if r.provenance else "")
            elif col == "retrieved_at":
                row.append(r.provenance.get("retrieved_at", "") if r.provenance else "")
            elif col == "validation_status":
                row.append(r.status)
            elif col == "duplicate_status":
                row.append(r.duplicate_status)
            else:
                row.append(r.values.get(col, ""))
        writer.writerow(row)
        
    output.seek(0)
    filename = f"{dataset_name.replace(' ', '_')}_{datetime.utcnow().strftime('%Y%md%H%M')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

def _export_json(dataset_name: str, records: list):
    data = []
    for r in records:
        item = r.values.copy() if r.values else {}
        item["_metadata"] = {
            "source_url": r.provenance.get("source_url") if r.provenance else None,
            "retrieved_at": r.provenance.get("retrieved_at") if r.provenance else None,
            "validation_status": r.status,
            "duplicate_status": r.duplicate_status
        }
        data.append(item)
        
    filename = f"{dataset_name.replace(' ', '_')}_{datetime.utcnow().strftime('%Y%md%H%M')}.json"
    return StreamingResponse(
        iter([json.dumps(data, indent=2)]), 
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

def _export_xlsx(dataset_name: str, headers: list, records: list):
    try:
        import openpyxl
        from openpyxl.utils import get_column_letter
    except ImportError:
        # Fallback if openpyxl is missing - write a simple XML that Excel understands as spreadsheet
        raise HTTPException(status_code=501, detail="openpyxl is required for XLSX export. Please install it.")
        
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = dataset_name[:31] # Excel limits tab names to 31 chars
    
    # Write headers
    ws.append(headers)
    
    # Style headers
    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = openpyxl.styles.Font(bold=True)
    
    for r in records:
        row = []
        for col in headers:
            if col == "source_url":
                row.append(r.provenance.get("source_url", "") if r.provenance else "")
            elif col == "retrieved_at":
                row.append(r.provenance.get("retrieved_at", "") if r.provenance else "")
            elif col == "validation_status":
                row.append(r.status)
            elif col == "duplicate_status":
                row.append(r.duplicate_status)
            else:
                row.append(str(r.values.get(col, "")))
        ws.append(row)
        
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"{dataset_name.replace(' ', '_')}_{datetime.utcnow().strftime('%Y%md%H%M')}.xlsx"
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

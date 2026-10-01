from sqlalchemy import Column, Integer, String, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class DatasetRecord(Base):
    __tablename__ = "dataset_records"

    id = Column(String, primary_key=True, index=True) # use string for UUID or specific ID
    dataset_id = Column(Integer, ForeignKey("datasets.id"), index=True)
    values = Column(JSON)
    status = Column(String, default="VALID")
    duplicate_status = Column(String, default="UNIQUE")
    cluster_id = Column(String, nullable=True)
    provenance = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset = relationship("Dataset", back_populates="records")

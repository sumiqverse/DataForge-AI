from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # web, api, dataset
    base_url = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    allowed = Column(Boolean, default=True)
    supported_fields = Column(JSON, default=list) # List of fields it supports
    configuration = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    workspace = relationship("Workspace", back_populates="sources")

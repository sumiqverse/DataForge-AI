from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # e.g., web, api, public_dataset
    url_or_api = Column(String, nullable=False)
    allowed = Column(Boolean, default=True)
    supported_fields = Column(JSON, default=list) # List of fields it supports
    extraction_method = Column(String, nullable=False) # e.g., web_scraper, rest_api
    
    workspace_id = Column(Integer, ForeignKey("workspaces.id"))
    workspace = relationship("Workspace", back_populates="sources")

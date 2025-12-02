from sqlalchemy import Column, Integer, String, Text, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from database import Base

class SmartEmployee(Base):
    __tablename__ = "smart_employee"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    role = Column(String(100))
    domain = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关联画像表
    persona = relationship("EmployeePersona", back_populates="user", uselist=False)
    subgraphs = relationship("KnowledgeSubgraph", back_populates="user", cascade="all, delete-orphan")

class EmployeePersona(Base):
    __tablename__ = "employee_personas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("smart_employee.id"), unique=True)
    
    # 逻辑测试结果 (存储 JSON)
    logic_test_score = Column(JSON, nullable=True)
    base_logic_type = Column(String(50), nullable=True)
    
    # 文档分析结果
    extracted_positive_logic = Column(Text, nullable=True)
    extracted_tone_style = Column(Text, nullable=True)
    
    name = Column(String(200), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("SmartEmployee", back_populates="persona")

class KnowledgeSubgraph(Base):
    __tablename__ = "knowledge_subgraphs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("smart_employee.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("SmartEmployee", back_populates="subgraphs")
    operations = relationship("KnowledgeGraphOperation", back_populates="subgraph", cascade="all, delete-orphan")

class KnowledgeGraphOperation(Base):
    __tablename__ = "knowledge_graph_operations"
    
    id = Column(Integer, primary_key=True, index=True)
    subgraph_id = Column(Integer, ForeignKey("knowledge_subgraphs.id"), nullable=False)
    operation_type = Column(String(20), nullable=False)  # 'ADD' or 'DELETE'
    nodes_data = Column(Text)  # JSON string
    relationships_data = Column(Text)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    
    subgraph = relationship("KnowledgeSubgraph", back_populates="operations")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String(500), nullable=False)
    options = Column(JSON, nullable=False)  # List of options
    dimension = Column(String(50), nullable=True)  # e.g., "E/I", "S/N"
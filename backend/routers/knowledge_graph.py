from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from database import get_db
from services.neo4j_service import neo4j_service
from services.graphiti_service import parse_document_to_graph
import logging
import io
import json
import models
from pydantic import BaseModel

router = APIRouter(
    prefix="/api/kg",
    tags=["Knowledge Graph"]
)

logger = logging.getLogger("uvicorn")

class SubgraphCreate(BaseModel):
    user_id: int
    name: str
    description: Optional[str] = None

class SubgraphResponse(BaseModel):
    id: int
    user_id: int
    name: str
    description: Optional[str]
    created_at: str

# --- Subgraph Management ---

@router.post("/subgraph", response_model=SubgraphResponse)
def create_subgraph(
    name: str = Body(...),
    user_id: int = Body(...),
    description: Optional[str] = Body(None),
    db: Session = Depends(get_db)
):
    """Create a new knowledge subgraph"""
    subgraph = models.KnowledgeSubgraph(
        user_id=user_id,
        name=name,
        description=description
    )
    db.add(subgraph)
    db.commit()
    db.refresh(subgraph)
    return {
        "id": subgraph.id,
        "user_id": subgraph.user_id,
        "name": subgraph.name,
        "description": subgraph.description,
        "created_at": subgraph.created_at.isoformat()
    }

@router.get("/subgraph/list/{user_id}")
def list_subgraphs(user_id: int, db: Session = Depends(get_db)):
    """List all subgraphs for a user"""
    subgraphs = db.query(models.KnowledgeSubgraph).filter(models.KnowledgeSubgraph.user_id == user_id).all()
    return [
        {
            "id": s.id,
            "user_id": s.user_id,
            "name": s.name,
            "description": s.description,
            "created_at": s.created_at.isoformat()
        }
        for s in subgraphs
    ]

@router.delete("/subgraph/{subgraph_id}")
def delete_subgraph(subgraph_id: int, db: Session = Depends(get_db)):
    """Delete a subgraph and its data"""
    subgraph = db.query(models.KnowledgeSubgraph).filter(models.KnowledgeSubgraph.id == subgraph_id).first()
    if not subgraph:
        raise HTTPException(status_code=404, detail="Subgraph not found")
    
    # Delete from Neo4j
    neo4j_service.delete_subgraph(subgraph.user_id, subgraph_id)
    
    # Delete from MySQL (cascade will handle operations)
    db.delete(subgraph)
    db.commit()
    
    return {"msg": "Subgraph deleted"}

@router.put("/subgraph/{subgraph_id}", response_model=SubgraphResponse)
def update_subgraph(
    subgraph_id: int,
    name: Optional[str] = Body(None),
    description: Optional[str] = Body(None),
    db: Session = Depends(get_db)
):
    """Update a subgraph's name and/or description"""
    subgraph = db.query(models.KnowledgeSubgraph).filter(models.KnowledgeSubgraph.id == subgraph_id).first()
    if not subgraph:
        raise HTTPException(status_code=404, detail="Subgraph not found")
    
    if name is not None:
        subgraph.name = name
    if description is not None:
        subgraph.description = description
    
    db.commit()
    db.refresh(subgraph)
    
    return {
        "id": subgraph.id,
        "user_id": subgraph.user_id,
        "name": subgraph.name,
        "description": subgraph.description,
        "created_at": subgraph.created_at.isoformat()
    }

# --- Knowledge Graph Operations ---

@router.post("/upload/{user_id}")
async def upload_document_to_kg(
    user_id: int,
    subgraph_id: Optional[int] = Form(None),
    files: List[UploadFile] = File(None),
    text_input: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload documents and create knowledge graph incrementally
    """
    logger.info(f"Knowledge graph upload request for user {user_id}, subgraph {subgraph_id}")
    
    # If no subgraph_id provided, get or create default subgraph
    if not subgraph_id:
        # Try to find existing default subgraph
        default_subgraph = db.query(models.KnowledgeSubgraph).filter(
            models.KnowledgeSubgraph.user_id == user_id,
            models.KnowledgeSubgraph.name == "默认知识图谱"
        ).first()
        
        if not default_subgraph:
            # Create default subgraph
            default_subgraph = models.KnowledgeSubgraph(
                user_id=user_id,
                name="默认知识图谱",
                description="自动创建的默认知识图谱"
            )
            db.add(default_subgraph)
            db.commit()
            db.refresh(default_subgraph)
            logger.info(f"Created default subgraph {default_subgraph.id} for user {user_id}")
        
        subgraph_id = default_subgraph.id
    
    # Verify subgraph exists
    subgraph = db.query(models.KnowledgeSubgraph).filter(models.KnowledgeSubgraph.id == subgraph_id).first()
    if not subgraph:
        raise HTTPException(status_code=404, detail="Subgraph not found")

    text_content = ""
    
    # Process files
    if files:
        for file in files:
            try:
                content = await file.read()
                filename = file.filename.lower()
                
                file_text = ""
                if filename.endswith('.pdf'):
                    import PyPDF2
                    pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                    for page in pdf_reader.pages:
                        file_text += page.extract_text() + "\n"
                elif filename.endswith('.docx'):
                    import docx
                    doc = docx.Document(io.BytesIO(content))
                    for para in doc.paragraphs:
                        file_text += para.text + "\n"
                else:
                    try:
                        file_text = content.decode("utf-8")
                    except UnicodeDecodeError:
                        file_text = content.decode("gbk", errors="ignore")
                
                text_content += file_text + "\n"
                logger.info(f"Processed file {filename}, extracted {len(file_text)} chars")
                
            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {e}")
                # Continue with other files or fail? Let's continue but log error
                continue

    # Process direct text input
    if text_input and text_input.strip():
        text_content += "\n" + text_input
    
    if not text_content.strip():
        raise HTTPException(status_code=400, detail="No content provided")
    
    try:
        # Parse document to graph
        graph_data = parse_document_to_graph(text_content)
        
        # Store in Neo4j (Incremental)
        neo4j_service.create_knowledge_graph(
            user_id=user_id,
            subgraph_id=subgraph_id,
            nodes=graph_data["nodes"],
            relationships=graph_data["relationships"],
            incremental=True
        )
        
        # Record operation for Undo
        operation = models.KnowledgeGraphOperation(
            subgraph_id=subgraph_id,
            operation_type="ADD",
            nodes_data=json.dumps(graph_data["nodes"]),
            relationships_data=json.dumps(graph_data["relationships"])
        )
        db.add(operation)
        db.commit()
        
        return {
            "msg": "知识图谱更新成功",
            "nodes_count": len(graph_data["nodes"]),
            "relationships_count": len(graph_data["relationships"])
        }
        
    except Exception as e:
        logger.error(f"Knowledge graph creation error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Knowledge graph creation failed: {str(e)}")

@router.get("/{user_id}")
def get_knowledge_graph(user_id: int, subgraph_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Retrieve knowledge graph for a user. 
    If subgraph_id is provided, return that subgraph.
    If not, return the first available subgraph for the user.
    """
    if not subgraph_id:
        # Try to get the first subgraph for this user
        first_subgraph = db.query(models.KnowledgeSubgraph).filter(
            models.KnowledgeSubgraph.user_id == user_id
        ).first()
        
        if not first_subgraph:
            return {"nodes": [], "relationships": []}
        
        subgraph_id = first_subgraph.id
        
    try:
        graph_data = neo4j_service.get_knowledge_graph(user_id, subgraph_id)
        return graph_data
    except Exception as e:
        logger.error(f"Error retrieving knowledge graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/undo/{subgraph_id}")
def undo_last_operation(subgraph_id: int, db: Session = Depends(get_db)):
    """Undo the last operation for a subgraph"""
    # Get last operation
    operation = db.query(models.KnowledgeGraphOperation)\
        .filter(models.KnowledgeGraphOperation.subgraph_id == subgraph_id)\
        .order_by(models.KnowledgeGraphOperation.created_at.desc())\
        .first()
        
    if not operation:
        raise HTTPException(status_code=400, detail="No operations to undo")
    
    try:
        nodes = json.loads(operation.nodes_data)
        relationships = json.loads(operation.relationships_data)
        
        # Get user_id from subgraph
        subgraph = db.query(models.KnowledgeSubgraph).filter(models.KnowledgeSubgraph.id == subgraph_id).first()
        if not subgraph:
            raise HTTPException(status_code=404, detail="Subgraph not found")
            
        if operation.operation_type == "ADD":
            # Undo ADD means delete these nodes/rels
            neo4j_service.undo_operation(subgraph.user_id, subgraph_id, nodes, relationships)
        
        # Delete operation record
        db.delete(operation)
        db.commit()
        
        return {"msg": "Undo successful"}
        
    except Exception as e:
        logger.error(f"Undo error: {e}")
        raise HTTPException(status_code=500, detail=f"Undo failed: {str(e)}")

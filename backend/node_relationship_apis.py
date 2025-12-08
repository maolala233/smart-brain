@router.post("/node/{user_id}")
def create_node(
    user_id: int,
    subgraph_id: int = Body(...),
    name: str = Body(...),
    label: str = Body(...),
    properties: Optional[Dict[str, Any]] = Body(None),
    db: Session = Depends(get_db)
):
    """Create a new node in the knowledge graph"""
    # Verify subgraph exists
    subgraph = db.query(models.KnowledgeSubgraph).filter(models.KnowledgeSubgraph.id == subgraph_id).first()
    if not subgraph:
        raise HTTPException(status_code=404, detail="Subgraph not found")
    
    try:
        node_data = {
            "id": name,  # Use name as ID for simplicity
            "name": name,
            "label": label
        }
        if properties:
            node_data.update(properties)
        
        neo4j_service.create_knowledge_graph(
            user_id=user_id,
            subgraph_id=subgraph_id,
            nodes=[node_data],
            relationships=[],
            incremental=True
        )
        
        return {"msg": "Node created successfully", "node": node_data}
    except Exception as e:
        logger.error(f"Error creating node: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/node/{user_id}/{node_id}")
def delete_node(
    user_id: int,
    node_id: str,
    subgraph_id: int,
    db: Session = Depends(get_db)
):
    """Delete a node from the knowledge graph"""
    # Verify subgraph exists
    subgraph = db.query(models.KnowledgeSubgraph).filter(models.KnowledgeSubgraph.id == subgraph_id).first()
    if not subgraph:
        raise HTTPException(status_code=404, detail="Subgraph not found")
    
    try:
        neo4j_service.delete_node(user_id, subgraph_id, node_id)
        return {"msg": "Node deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting node: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/relationship/{user_id}")
def create_relationship(
    user_id: int,
    subgraph_id: int = Body(...),
    from_node: str = Body(...),
    to_node: str = Body(...),
    relationship_type: str = Body(...),
    properties: Optional[Dict[str, Any]] = Body(None),
    db: Session = Depends(get_db)
):
    """Create a new relationship in the knowledge graph"""
    # Verify subgraph exists
    subgraph = db.query(models.KnowledgeSubgraph).filter(models.KnowledgeSubgraph.id == subgraph_id).first()
    if not subgraph:
        raise HTTPException(status_code=404, detail="Subgraph not found")
    
    try:
        rel_data = {
            "from": from_node,
            "to": to_node,
            "type": relationship_type
        }
        if properties:
            rel_data.update(properties)
        
        neo4j_service.create_knowledge_graph(
            user_id=user_id,
            subgraph_id=subgraph_id,
            nodes=[],
            relationships=[rel_data],
            incremental=True
        )
        
        return {"msg": "Relationship created successfully", "relationship": rel_data}
    except Exception as e:
        logger.error(f"Error creating relationship: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/relationship/{user_id}")
def delete_relationship(
    user_id: int,
    subgraph_id: int,
    from_node: str,
    to_node: str,
    relationship_type: str,
    db: Session = Depends(get_db)
):
    """Delete a relationship from the knowledge graph"""
    # Verify subgraph exists
    subgraph = db.query(models.KnowledgeSubgraph).filter(models.KnowledgeSubgraph.id == subgraph_id).first()
    if not subgraph:
        raise HTTPException(status_code=404, detail="Subgraph not found")
    
    try:
        neo4j_service.delete_relationship(user_id, subgraph_id, from_node, to_node, relationship_type)
        return {"msg": "Relationship deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting relationship: {e}")
        raise HTTPException(status_code=500, detail=str(e))

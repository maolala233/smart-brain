from typing import Dict, Any, List
import logging
import os
import requests
import json
import hashlib
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("uvicorn")

def generate_entity_id(entity_type: str, entity_name: str) -> str:
    """
    Generate a stable, content-based ID for an entity
    Same entity will always get the same ID, enabling automatic deduplication
    """
    # Normalize the name (lowercase, strip whitespace)
    normalized_name = entity_name.strip().lower()
    # Create hash from type + name
    content = f"{entity_type}:{normalized_name}"
    # Use first 12 chars of hash for readability
    hash_id = hashlib.md5(content.encode('utf-8')).hexdigest()[:12]
    return f"{entity_type}_{hash_id}"

def parse_document_to_graph(text_content: str) -> Dict[str, Any]:
    """
    Parse document content and extract entities and relationships
    This is a simplified version - in production, you would use Graphiti's actual API
    
    Returns:
        {
            "nodes": [{"id": str, "label": str, "properties": dict}, ...],
            "relationships": [{"from": str, "to": str, "type": str, "properties": dict}, ...]
        }
    """
    # Use LLM to extract entities and relationships
    API_KEY = os.getenv("OPENROUTER_API_KEY")
    BASE_URL = os.getenv("OPENROUTER_BASE_URL")
    
    prompt = f"""
    分析以下文档内容，提取关键实体和它们之间的关系。
    
    文档内容：
    {text_content[:2000]}  # 限制长度
    
    请以JSON格式返回，包含：
    1. entities: 实体列表，每个实体包含 id, type, name
    2. relationships: 关系列表，每个关系包含 from_id, to_id, type
    
    示例格式：
    {{
        "entities": [
            {{"id": "e1", "type": "Person", "name": "张三"}},
            {{"id": "e2", "type": "Company", "name": "ABC公司"}}
        ],
        "relationships": [
            {{"from_id": "e1", "to_id": "e2", "type": "WORKS_AT"}}
        ]
    }}
    
    只返回JSON，不要其他说明。
    """
    
    try:
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": "deepseek/deepseek-v3.2-exp",
            "messages": [
                {"role": "system", "content": "你是一个知识图谱构建专家。"},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3
        }
        
        llm_response = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=data)
        llm_response.raise_for_status()
        response = llm_response.json()['choices'][0]['message']['content']
        
        # Parse LLM response
        import json
        # Try to extract JSON from response
        start_idx = response.find('{')
        end_idx = response.rfind('}') + 1
        if start_idx != -1 and end_idx > start_idx:
            json_str = response[start_idx:end_idx]
            data = json.loads(json_str)
        else:
            data = json.loads(response)
        
        # Convert to our format with stable IDs
        nodes = []
        entity_id_map = {}  # Map from original ID to new stable ID
        
        for entity in data.get("entities", []):
            entity_type = entity.get("type", "Entity")
            entity_name = entity.get("name", entity["id"])
            
            # Generate stable ID based on content
            stable_id = generate_entity_id(entity_type, entity_name)
            entity_id_map[entity["id"]] = stable_id
            
            nodes.append({
                "id": stable_id,
                "label": entity_type,
                "properties": {"name": entity_name}
            })
        
        # Update relationships to use stable IDs
        relationships = []
        for rel in data.get("relationships", []):
            from_id = entity_id_map.get(rel["from_id"], rel["from_id"])
            to_id = entity_id_map.get(rel["to_id"], rel["to_id"])
            
            relationships.append({
                "from": from_id,
                "to": to_id,
                "type": rel.get("type", "RELATED_TO"),
                "properties": {}
            })
        
        # Deduplicate nodes by ID (in case LLM generates duplicates in same batch)
        unique_nodes = {}
        for node in nodes:
            node_id = node["id"]
            if node_id not in unique_nodes:
                unique_nodes[node_id] = node
            else:
                # If duplicate, keep the one with more information
                logger.debug(f"Duplicate node detected: {node_id}, merging...")
        
        nodes = list(unique_nodes.values())
        
        logger.info(f"Extracted {len(nodes)} unique entities and {len(relationships)} relationships")
        
        return {
            "nodes": nodes,
            "relationships": relationships
        }
        
    except Exception as e:
        logger.error(f"Error parsing document: {e}")
        # Return empty graph on error
        return {
            "nodes": [],
            "relationships": []
        }

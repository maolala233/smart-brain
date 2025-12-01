from typing import Dict, Any, List
import logging
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("uvicorn")

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
        
        # Convert to our format
        nodes = [
            {
                "id": entity["id"],
                "label": entity.get("type", "Entity"),
                "properties": {"name": entity.get("name", entity["id"])}
            }
            for entity in data.get("entities", [])
        ]
        
        relationships = [
            {
                "from": rel["from_id"],
                "to": rel["to_id"],
                "type": rel.get("type", "RELATED_TO"),
                "properties": {}
            }
            for rel in data.get("relationships", [])
        ]
        
        logger.info(f"Extracted {len(nodes)} entities and {len(relationships)} relationships")
        
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

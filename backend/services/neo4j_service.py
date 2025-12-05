from neo4j import GraphDatabase
import os
from typing import List, Dict, Any
import logging

logger = logging.getLogger("uvicorn")

class Neo4jService:
    def __init__(self):
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")
        
        try:
            self.driver = GraphDatabase.driver(uri, auth=(user, password))
            # Test connection
            with self.driver.session() as session:
                session.run("RETURN 1")
            logger.info(f"✅ Neo4j connected successfully at {uri}")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Neo4j at startup: {e}")
            self.driver = None
    
    def close(self):
        if self.driver:
            self.driver.close()
    
    def create_knowledge_graph(self, user_id: int, subgraph_id: int, nodes: List[Dict[str, Any]], relationships: List[Dict[str, Any]], incremental: bool = True):
        """
        Create or update knowledge graph for a user's subgraph
        nodes: [{"id": "entity1", "label": "Person", "properties": {"name": "John"}}, ...]
        relationships: [{"from": "entity1", "to": "entity2", "type": "KNOWS", "properties": {}}, ...]
        incremental: If True, add to existing graph; if False, replace existing graph
        """
        with self.driver.session() as session:
            # If not incremental, clear existing graph for this subgraph
            if not incremental:
                session.run(
                    "MATCH (n {user_id: $user_id, subgraph_id: $subgraph_id}) DETACH DELETE n",
                    user_id=user_id,
                    subgraph_id=subgraph_id
                )
            
            # Create or update nodes with MERGE
            for node in nodes:
                # Use MERGE to avoid duplicates - if node exists, update it
                query = f"""
                MERGE (n:{node['label']} {{
                    id: $id,
                    user_id: $user_id,
                    subgraph_id: $subgraph_id
                }})
                ON CREATE SET 
                    n.name = $name,
                    n.created_at = timestamp()
                ON MATCH SET 
                    n.name = $name,
                    n.updated_at = timestamp()
                """
                props = node.get('properties', {})
                session.run(
                    query,
                    id=node['id'],
                    user_id=user_id,
                    subgraph_id=subgraph_id,
                    name=props.get('name', node['id'])
                )
            
            # Create or update relationships
            for rel in relationships:
                # MERGE relationships to avoid duplicates
                query = f"""
                MATCH (a {{id: $from_id, user_id: $user_id, subgraph_id: $subgraph_id}})
                MATCH (b {{id: $to_id, user_id: $user_id, subgraph_id: $subgraph_id}})
                MERGE (a)-[r:{rel['type']}]->(b)
                ON CREATE SET r.created_at = timestamp()
                ON MATCH SET r.updated_at = timestamp()
                """
                session.run(
                    query,
                    from_id=rel['from'],
                    to_id=rel['to'],
                    user_id=user_id,
                    subgraph_id=subgraph_id
                )
            
            logger.info(f"{'Added to' if incremental else 'Created'} knowledge graph for user {user_id}, subgraph {subgraph_id}: {len(nodes)} nodes, {len(relationships)} relationships")
    
    def get_knowledge_graph(self, user_id: int, subgraph_id: int) -> Dict[str, Any]:
        """Retrieve knowledge graph for a user's subgraph"""
        with self.driver.session() as session:
            # Get nodes
            nodes_result = session.run(
                """
                MATCH (n {user_id: $user_id, subgraph_id: $subgraph_id})
                RETURN n.id as id, labels(n)[0] as label, n.name as name
                """,
                user_id=user_id,
                subgraph_id=subgraph_id
            )
            nodes = [
                {
                    "id": record["id"],
                    "label": record["label"],
                    "name": record["name"]
                }
                for record in nodes_result
            ]
            
            # Get relationships
            rels_result = session.run(
                """
                MATCH (a {user_id: $user_id, subgraph_id: $subgraph_id})-[r]->(b {user_id: $user_id, subgraph_id: $subgraph_id})
                RETURN a.id as from, type(r) as type, b.id as to
                """,
                user_id=user_id,
                subgraph_id=subgraph_id
            )
            relationships = [
                {
                    "from": record["from"],
                    "to": record["to"],
                    "type": record["type"]
                }
                for record in rels_result
            ]
            
            return {
                "nodes": nodes,
                "relationships": relationships
            }
    
    def delete_subgraph(self, user_id: int, subgraph_id: int):
        """Delete all knowledge graph data for a user's subgraph"""
        with self.driver.session() as session:
            result = session.run(
                "MATCH (n {user_id: $user_id, subgraph_id: $subgraph_id}) DETACH DELETE n RETURN count(n) as deleted",
                user_id=user_id,
                subgraph_id=subgraph_id
            )
            deleted_count = result.single()["deleted"]
            logger.info(f"Deleted {deleted_count} nodes for user {user_id}, subgraph {subgraph_id}")
            return deleted_count
    
    def undo_operation(self, user_id: int, subgraph_id: int, nodes: List[Dict[str, Any]], relationships: List[Dict[str, Any]]):
        """Undo an operation by removing the specified nodes and relationships"""
        with self.driver.session() as session:
            # Delete relationships first
            for rel in relationships:
                session.run(
                    f"""
                    MATCH (a {{id: $from_id, user_id: $user_id, subgraph_id: $subgraph_id}})
                          -[r:{rel['type']}]->
                          (b {{id: $to_id, user_id: $user_id, subgraph_id: $subgraph_id}})
                    DELETE r
                    """,
                    from_id=rel['from'],
                    to_id=rel['to'],
                    user_id=user_id,
                    subgraph_id=subgraph_id
                )
            
            # Delete nodes
            for node in nodes:
                session.run(
                    "MATCH (n {id: $id, user_id: $user_id, subgraph_id: $subgraph_id}) DETACH DELETE n",
                    id=node['id'],
                    user_id=user_id,
                    subgraph_id=subgraph_id
                )
            
            logger.info(f"Undid operation for user {user_id}, subgraph {subgraph_id}: removed {len(nodes)} nodes, {len(relationships)} relationships")
    
    def search_graph(self, user_id: int, subgraph_id: int, query: str) -> Dict[str, Any]:
        """
        Search for nodes and relationships matching the query
        Returns nodes and relationships that match the search term
        """
        with self.driver.session() as session:
            # Search nodes by name or id (case-insensitive)
            nodes_result = session.run(
                """
                MATCH (n {user_id: $user_id, subgraph_id: $subgraph_id})
                WHERE toLower(n.name) CONTAINS toLower($search_term) OR toLower(n.id) CONTAINS toLower($search_term)
                RETURN n.id as id, labels(n)[0] as label, n.name as name
                """,
                user_id=user_id,
                subgraph_id=subgraph_id,
                search_term=query
            )
            nodes = [
                {
                    "id": record["id"],
                    "label": record["label"],
                    "name": record["name"]
                }
                for record in nodes_result
            ]
            
            # Search relationships by type (case-insensitive) - include node names
            rels_result = session.run(
                """
                MATCH (a {user_id: $user_id, subgraph_id: $subgraph_id})-[r]->(b {user_id: $user_id, subgraph_id: $subgraph_id})
                WHERE toLower(type(r)) CONTAINS toLower($search_term)
                RETURN a.id as from_id, a.name as from_name, type(r) as type, b.id as to_id, b.name as to_name
                """,
                user_id=user_id,
                subgraph_id=subgraph_id,
                search_term=query
            )
            relationships = [
                {
                    "from": record["from_id"],
                    "from_name": record["from_name"],
                    "to": record["to_id"],
                    "to_name": record["to_name"],
                    "type": record["type"]
                }
                for record in rels_result
            ]
            
            logger.info(f"Search for '{query}' in user {user_id}, subgraph {subgraph_id}: found {len(nodes)} nodes, {len(relationships)} relationships")
            
            return {
                "nodes": nodes,
                "relationships": relationships
            }

# Global instance
neo4j_service = Neo4jService()

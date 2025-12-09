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
        Search for nodes and relationships matching the query in a single subgraph
        """
        return self.search_graph_multi(user_id, [subgraph_id], query)

    def search_graph_multi(self, user_id: int, subgraph_ids: List[int], query: str) -> Dict[str, Any]:
        """
        Search for nodes and relationships matching the query across multiple subgraphs
        """
        with self.driver.session() as session:
            # Search nodes by name or id (case-insensitive)
            # Use IN clause for subgraph_ids
            nodes_result = session.run(
                """
                MATCH (n)
                WHERE n.user_id = $user_id 
                  AND n.subgraph_id IN $subgraph_ids
                  AND (toLower(n.name) CONTAINS toLower($search_term) OR toLower(n.id) CONTAINS toLower($search_term))
                RETURN n.id as id, labels(n)[0] as label, n.name as name, n.subgraph_id as subgraph_id
                """,
                user_id=user_id,
                subgraph_ids=subgraph_ids,
                search_term=query
            )
            nodes = [
                {
                    "id": record["id"],
                    "label": record["label"],
                    "name": record["name"],
                    "subgraph_id": record["subgraph_id"]
                }
                for record in nodes_result
            ]
            
            # Search relationships by type (case-insensitive) - include node names
            rels_result = session.run(
                """
                MATCH (a)-[r]->(b)
                WHERE a.user_id = $user_id AND b.user_id = $user_id
                  AND a.subgraph_id IN $subgraph_ids AND b.subgraph_id IN $subgraph_ids
                  AND toLower(type(r)) CONTAINS toLower($search_term)
                RETURN a.id as from_id, a.name as from_name, type(r) as type, b.id as to_id, b.name as to_name, a.subgraph_id as subgraph_id
                """,
                user_id=user_id,
                subgraph_ids=subgraph_ids,
                search_term=query
            )
            relationships = [
                {
                    "from": record["from_id"],
                    "from_name": record["from_name"],
                    "to": record["to_id"],
                    "to_name": record["to_name"],
                    "type": record["type"],
                    "subgraph_id": record["subgraph_id"]
                }
                for record in rels_result
            ]
            
            logger.info(f"Search for '{query}' in user {user_id}, subgraphs {subgraph_ids}: found {len(nodes)} nodes, {len(relationships)} relationships")
            
            return {
                "nodes": nodes,
                "relationships": relationships
            }
    
    def search_graph_comprehensive(self, user_id: int, subgraph_ids: List[int], query: str) -> Dict[str, Any]:
        """
        Comprehensive search for nodes and relationships with multiple strategies:
        1. Exact match by name/id
        2. Partial match by name/id
        3. Match by label
        4. Match relationships by type
        5. Find related nodes and relationships
        6. Fuzzy match by name (Levenshtein distance)
        """
        with self.driver.session() as session:
            all_nodes = []
            all_relationships = []
            processed_node_keys = set()  # To avoid duplicate nodes
            processed_rel_keys = set()    # To avoid duplicate relationships
            
            # Strategy 1: Exact match by name or id
            exact_nodes_result = session.run(
                """
                MATCH (n)
                WHERE n.user_id = $user_id 
                  AND n.subgraph_id IN $subgraph_ids
                  AND (toLower(n.name) = toLower($search_term) OR toLower(n.id) = toLower($search_term))
                RETURN n.id as id, labels(n)[0] as label, n.name as name, n.subgraph_id as subgraph_id
                """,
                user_id=user_id,
                subgraph_ids=subgraph_ids,
                search_term=query
            )
            
            exact_node_ids = []
            for record in exact_nodes_result:
                node_key = (record["id"], record["subgraph_id"])
                if node_key not in processed_node_keys:
                    all_nodes.append({
                        "id": record["id"],
                        "label": record["label"],
                        "name": record["name"],
                        "subgraph_id": record["subgraph_id"],
                        "match_type": "exact"
                    })
                    exact_node_ids.append(record["id"])
                    processed_node_keys.add(node_key)
            
            # Strategy 2: Partial match by name or id
            partial_nodes_result = session.run(
                """
                MATCH (n)
                WHERE n.user_id = $user_id 
                  AND n.subgraph_id IN $subgraph_ids
                  AND (toLower(n.name) CONTAINS toLower($search_term) OR toLower(n.id) CONTAINS toLower($search_term))
                  AND NOT (toLower(n.name) = toLower($search_term) OR toLower(n.id) = toLower($search_term))
                RETURN n.id as id, labels(n)[0] as label, n.name as name, n.subgraph_id as subgraph_id
                """,
                user_id=user_id,
                subgraph_ids=subgraph_ids,
                search_term=query
            )
            
            partial_node_ids = []
            for record in partial_nodes_result:
                node_key = (record["id"], record["subgraph_id"])
                if node_key not in processed_node_keys:
                    all_nodes.append({
                        "id": record["id"],
                        "label": record["label"],
                        "name": record["name"],
                        "subgraph_id": record["subgraph_id"],
                        "match_type": "partial"
                    })
                    partial_node_ids.append(record["id"])
                    processed_node_keys.add(node_key)
            
            # Strategy 3: Match by label
            label_nodes_result = session.run(
                """
                MATCH (n)
                WHERE n.user_id = $user_id 
                  AND n.subgraph_id IN $subgraph_ids
                  AND toLower(labels(n)[0]) CONTAINS toLower($search_term)
                RETURN n.id as id, labels(n)[0] as label, n.name as name, n.subgraph_id as subgraph_id
                """,
                user_id=user_id,
                subgraph_ids=subgraph_ids,
                search_term=query
            )
            
            label_node_ids = []
            for record in label_nodes_result:
                node_key = (record["id"], record["subgraph_id"])
                if node_key not in processed_node_keys:
                    all_nodes.append({
                        "id": record["id"],
                        "label": record["label"],
                        "name": record["name"],
                        "subgraph_id": record["subgraph_id"],
                        "match_type": "label"
                    })
                    label_node_ids.append(record["id"])
                    processed_node_keys.add(node_key)
            
            # Strategy 4: Fuzzy match by name (using STARTS WITH and CONTAINS)
            # Since APOC is not available, we'll use a simpler approach
            fuzzy_nodes_result = session.run(
                """
                MATCH (n)
                WHERE n.user_id = $user_id 
                  AND n.subgraph_id IN $subgraph_ids
                  AND (toLower(n.name) STARTS WITH left(toLower($search_term), 3) 
                       OR toLower(n.name) CONTAINS left(toLower($search_term), 3))
                RETURN n.id as id, labels(n)[0] as label, n.name as name, n.subgraph_id as subgraph_id
                LIMIT 10
                """,
                user_id=user_id,
                subgraph_ids=subgraph_ids,
                search_term=query
            )
            
            fuzzy_node_ids = []
            for record in fuzzy_nodes_result:
                node_key = (record["id"], record["subgraph_id"])
                # Check if this is not already matched by other strategies
                if node_key not in processed_node_keys:
                    all_nodes.append({
                        "id": record["id"],
                        "label": record["label"],
                        "name": record["name"],
                        "subgraph_id": record["subgraph_id"],
                        "match_type": "fuzzy"
                    })
                    fuzzy_node_ids.append(record["id"])
                    processed_node_keys.add(node_key)
            
            # Collect all matched node IDs
            all_matched_node_ids = exact_node_ids + partial_node_ids + label_node_ids + fuzzy_node_ids
            
            # Strategy 5: Match relationships by type (exact)
            exact_rels_result = session.run(
                """
                MATCH (a)-[r]->(b)
                WHERE a.user_id = $user_id AND b.user_id = $user_id
                  AND a.subgraph_id IN $subgraph_ids AND b.subgraph_id IN $subgraph_ids
                  AND toLower(type(r)) = toLower($search_term)
                RETURN a.id as from_id, a.name as from_name, type(r) as type, b.id as to_id, b.name as to_name, a.subgraph_id as subgraph_id
                """,
                user_id=user_id,
                subgraph_ids=subgraph_ids,
                search_term=query
            )
            
            for record in exact_rels_result:
                rel_key = (record["from_id"], record["to_id"], record["type"], record["subgraph_id"])
                if rel_key not in processed_rel_keys:
                    all_relationships.append({
                        "from": record["from_id"],
                        "from_name": record["from_name"],
                        "to": record["to_id"],
                        "to_name": record["to_name"],
                        "type": record["type"],
                        "subgraph_id": record["subgraph_id"],
                        "match_type": "exact"
                    })
                    processed_rel_keys.add(rel_key)
            
            # Strategy 6: Match relationships by type (partial)
            partial_rels_result = session.run(
                """
                MATCH (a)-[r]->(b)
                WHERE a.user_id = $user_id AND b.user_id = $user_id
                  AND a.subgraph_id IN $subgraph_ids AND b.subgraph_id IN $subgraph_ids
                  AND toLower(type(r)) CONTAINS toLower($search_term)
                  AND NOT toLower(type(r)) = toLower($search_term)
                RETURN a.id as from_id, a.name as from_name, type(r) as type, b.id as to_id, b.name as to_name, a.subgraph_id as subgraph_id
                """,
                user_id=user_id,
                subgraph_ids=subgraph_ids,
                search_term=query
            )
            
            for record in partial_rels_result:
                rel_key = (record["from_id"], record["to_id"], record["type"], record["subgraph_id"])
                if rel_key not in processed_rel_keys:
                    all_relationships.append({
                        "from": record["from_id"],
                        "from_name": record["from_name"],
                        "to": record["to_id"],
                        "to_name": record["to_name"],
                        "type": record["type"],
                        "subgraph_id": record["subgraph_id"],
                        "match_type": "partial"
                    })
                    processed_rel_keys.add(rel_key)
            
            # Strategy 7: Find related nodes for matched nodes
            if all_matched_node_ids:
                related_nodes_result = session.run(
                    """
                    MATCH (n)-[r]-(related)
                    WHERE n.user_id = $user_id 
                      AND n.id IN $node_ids
                      AND n.subgraph_id IN $subgraph_ids
                      AND related.user_id = $user_id
                      AND related.subgraph_id IN $subgraph_ids
                    RETURN 
                      n.id as source_id, n.name as source_name,
                      related.id as related_id, related.name as related_name,
                      head(labels(related)) as related_label,
                      type(r) as rel_type,
                      related.subgraph_id as subgraph_id
                    """,
                    user_id=user_id,
                    node_ids=all_matched_node_ids,
                    subgraph_ids=subgraph_ids
                )
                
                for record in related_nodes_result:
                    # Add related node
                    node_key = (record["related_id"], record["subgraph_id"])
                    if node_key not in processed_node_keys:
                        all_nodes.append({
                            "id": record["related_id"],
                            "label": record["related_label"],
                            "name": record["related_name"],
                            "subgraph_id": record["subgraph_id"],
                            "match_type": "related"
                        })
                        processed_node_keys.add(node_key)
                    
                    # Add relationship
                    rel_key = (record["source_id"], record["related_id"], record["rel_type"], record["subgraph_id"])
                    if rel_key not in processed_rel_keys:
                        all_relationships.append({
                            "from": record["source_id"],
                            "from_name": record["source_name"],
                            "to": record["related_id"],
                            "to_name": record["related_name"],
                            "type": record["rel_type"],
                            "subgraph_id": record["subgraph_id"],
                            "match_type": "related"
                        })
                        processed_rel_keys.add(rel_key)
            
            logger.info(f"Comprehensive search for '{query}' in user {user_id}, subgraphs {subgraph_ids}: found {len(all_nodes)} nodes, {len(all_relationships)} relationships")
            
            return {
                "nodes": all_nodes,
                "relationships": all_relationships
            }
    
    def delete_node(self, user_id: int, subgraph_id: int, node_id: str):
        """Delete a single node from the knowledge graph"""
        with self.driver.session() as session:
            result = session.run(
                "MATCH (n {id: $id, user_id: $user_id, subgraph_id: $subgraph_id}) DETACH DELETE n RETURN count(n) as deleted",
                id=node_id,
                user_id=user_id,
                subgraph_id=subgraph_id
            )
            deleted_count = result.single()["deleted"]
            logger.info(f"Deleted node {node_id} for user {user_id}, subgraph {subgraph_id}")
            return deleted_count
    
    def delete_relationship(self, user_id: int, subgraph_id: int, from_node: str, to_node: str, relationship_type: str):
        """Delete a specific relationship from the knowledge graph"""
        with self.driver.session() as session:
            result = session.run(
                f"""
                MATCH (a {{id: $from_id, user_id: $user_id, subgraph_id: $subgraph_id}})
                      -[r:{relationship_type}]->
                      (b {{id: $to_id, user_id: $user_id, subgraph_id: $subgraph_id}})
                DELETE r
                RETURN count(r) as deleted
                """,
                from_id=from_node,
                to_id=to_node,
                user_id=user_id,
                subgraph_id=subgraph_id
            )
            deleted_count = result.single()["deleted"]
            logger.info(f"Deleted relationship {from_node}-[{relationship_type}]->{to_node} for user {user_id}, subgraph {subgraph_id}")
            return deleted_count

# Global instance
neo4j_service = Neo4jService()

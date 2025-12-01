from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD", "password")

driver = GraphDatabase.driver(uri, auth=(user, password))

# Test creating a simple node
with driver.session() as session:
    # Clear all data first
    session.run("MATCH (n) DETACH DELETE n")
    print("Cleared all nodes")
    
    # Create a test node
    session.run("""
        CREATE (n:Person {
            id: 'test1',
            user_id: 5,
            name: '测试节点'
        })
    """)
    print("Created test node")
    
    # Query it back
    result = session.run("MATCH (n) RETURN n")
    for record in result:
        print(f"Found node: {record['n']}")
    
    # Try the same query as the service
    result = session.run("""
        MATCH (n {user_id: $user_id})
        RETURN n.id as id, labels(n)[0] as label, n.name as name
    """, user_id=5)
    
    print("\nQuery with user_id filter:")
    for record in result:
        print(f"  id={record['id']}, label={record['label']}, name={record['name']}")

driver.close()

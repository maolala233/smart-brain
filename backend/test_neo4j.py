from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
user = os.getenv("NEO4J_USER", "neo4j")
password = os.getenv("NEO4J_PASSWORD", "password")

driver = GraphDatabase.driver(uri, auth=(user, password))

with driver.session() as session:
    # Count all nodes
    result = session.run("MATCH (n) RETURN count(n) as count")
    count = result.single()["count"]
    print(f"Total nodes in database: {count}")
    
    # Get all nodes
    result = session.run("MATCH (n) RETURN n LIMIT 10")
    print("\nFirst 10 nodes:")
    for record in result:
        print(record["n"])
    
    # Check for user_id property
    result = session.run("MATCH (n) WHERE n.user_id IS NOT NULL RETURN n LIMIT 5")
    print("\nNodes with user_id:")
    for record in result:
        print(record["n"])

driver.close()

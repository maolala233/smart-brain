import sys
import os
sys.path.append(os.getcwd())

from services.graphiti_service import parse_document_to_graph

# Test with a simple document
test_text = """
张三是ABC公司的CEO。
李四在ABC公司工作,担任技术总监。
王五是XYZ公司的创始人。
张三和王五是大学同学。
"""

print("Testing document parsing...")
print(f"Input text: {test_text}\n")

result = parse_document_to_graph(test_text)

print(f"Parsed result:")
print(f"Nodes: {len(result['nodes'])}")
for node in result['nodes']:
    print(f"  - {node}")

print(f"\nRelationships: {len(result['relationships'])}")
for rel in result['relationships']:
    print(f"  - {rel}")

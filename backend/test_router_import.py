import sys
import os

# Add backend directory to sys.path
sys.path.append(os.getcwd())

try:
    from routers import knowledge_graph
    print("Successfully imported knowledge_graph router")
except ImportError as e:
    print(f"Failed to import knowledge_graph router: {e}")
    import traceback
    traceback.print_exc()

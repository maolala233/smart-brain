import sys
sys.path.append('.')
from services.llm_service import analyze_document_content

test_text = """
我认为我们应该采取以下步骤来解决这个问题：
1. 首先分析当前的数据
2. 然后提出三个可行的方案
3. 最后选择最优解并实施
"""

print("Testing LLM service...")
try:
    result = analyze_document_content(test_text)
    print("Success!")
    print(f"Logic: {result['logic']}")
    print(f"Tone: {result['tone']}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

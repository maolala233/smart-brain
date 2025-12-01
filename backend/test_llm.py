import sys
sys.path.append('.')
from services.llm_service import analyze_document_content
import json

test_text = """
我认为我们应该采取以下步骤来解决这个问题：
1. 首先分析当前的数据
2. 然后提出三个可行的方案
3. 最后选择最优解并实施
"""

print("Testing LLM service...")
print(f"Input text: {test_text}")
try:
    result = analyze_document_content(test_text)
    print("Success!")
    print("=" * 50)
    print("Logic Result:")
    print(result['logic'])
    print("=" * 50)
    print("Tone Result:")
    print(result['tone'])
    print("=" * 50)
    print("Full result (JSON format):")
    print(json.dumps(result, ensure_ascii=False, indent=2))
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

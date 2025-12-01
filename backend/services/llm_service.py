import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")
BASE_URL = os.getenv("OPENROUTER_BASE_URL")
MODEL_MAIN = os.getenv("OPENROUTER_MODEL_MAIN", "deepseek/deepseek-v3.2-exp")
MODEL_FALLBACK = os.getenv("OPENROUTER_MODEL_FALLBACK", "x-ai/grok-4.1-fast:free")

def analyze_document_content(text: str) -> dict:
    """
    双通道分析文档：
    通道A - 语气与修辞提取
    通道B - 正向逻辑提取 (含正向逻辑过滤)
    """
    # 1. 正向逻辑过滤与提取 (Channel B)
    logic_prompt = """
    你是一个逻辑思维分析专家。请对以下文本进行"正向逻辑提取"。
    
    任务步骤：
    1. **过滤**：剔除情绪化抱怨、被动推诿、模糊不清及无关的废话。只保留建设性观点、解决问题的路径及核心论点。
    2. **提取**：分析保留内容的逻辑结构。如果是提出解决方案、拆解目标、建设性复盘等，请提取其思维链。
    
    输出格式：
    请直接输出结构化的思维模板字符串，例如：“发现问题 -> 列举数据 -> 提出三套方案 -> 推荐最优解”。
    如果文本中没有明显的正向逻辑，请输出：“未检测到明显的正向解决问题逻辑”。
    """
    
    # 2. 语气与修辞提取 (Channel A)
    tone_prompt = """
    你是一个语言风格分析师。请分析以下文本的"语气与修辞特征"。
    
    分析维度：
    - 常用连接词（如“以此类推”、“综上所述”）
    - 句式长度与结构
    - 专业术语密度
    - 情感色彩（严肃/活泼/激进/保守）
    
    输出格式：
    请生成一段关于该用户语言风格的简短描述（100字以内），并尝试提取3-5个"Few-shot Examples"（少样本示例）格式的特征关键词。
    """
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Helper function to call LLM
    def call_llm(system_prompt, user_text):
        data = {
            "model": MODEL_FALLBACK,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text[:3000]} # Limit length
            ],
            "temperature": 0.3
        }
        try:
            response = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=data)
            response.raise_for_status()
            res_json = response.json()
            return res_json['choices'][0]['message']['content']
        except requests.exceptions.HTTPError as e:
            if response.status_code == 401:
                print(f"Authentication failed: {response.json()}")
                return "API认证失败，请检查API密钥配置"
            elif response.status_code == 429:
                print(f"Rate limit exceeded: {response.json()}")
                return "请求频率超限，请稍后再试"
            else:
                print(f"HTTP Error: {e}")
                print(f"Response content: {response.text}")
                return "服务暂时不可用"
        except Exception as e:
            print(f"LLM Call Error: {e}")
            return "分析失败"

    # Execute both channels
    logic_result = call_llm(logic_prompt, text)
    tone_result = call_llm(tone_prompt, text)
    
    return {
        "logic": logic_result,
        "tone": tone_result
    }

def generate_logic_test_questions():
    """
    Generate 40 logic test questions based on specific psychological and vocational dimensions.
    """
    prompt = """
    请生成40道中文逻辑测试题目，用于评估职业能力倾向。
    
    题库设计标准：
    1. 结合MBTI进阶版与华生-格拉泽批判性思维测试。
    2. 覆盖以下维度（每维度10题）：
       - 分析决策风格（激进 vs 保守）
       - 信息处理方式（直觉 vs 实感）
       - 沟通倾向（直接 vs 委婉）
       - 逻辑闭环能力（高 vs 低）
    
    输出格式要求：
    请直接返回一个JSON数组，不要包含markdown格式或其他文字。
    数组中每个元素包含：
    - "id": 整数序号
    - "text": 题目描述（中文）
    - "dimension": 所属维度
    - "options": 选项列表，每个选项包含 "text" (描述) 和 "score" (分数，1-5分)
    """
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": MODEL_MAIN, 
        "messages": [
            {"role": "system", "content": "你是一个专业的心理测量学家和职业规划专家。"},
            {"role": "user", "content": prompt}
        ]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat/completions",
            headers=headers,
            json=data
        )
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content']
        
        # Clean up code blocks if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0]
        elif "```" in content:
            content = content.split("```")[1].split("```")[0]
            
        return json.loads(content.strip())
        
    except requests.exceptions.HTTPError as e:
        if response.status_code == 401:
            print(f"Authentication failed: {response.json()}")
            return []
        elif response.status_code == 429:
            print(f"Rate limit exceeded: {response.json()}")
            return []
        else:
            print(f"HTTP Error: {e}")
            print(f"Response content: {response.text}")
            return []
    except Exception as e:
        print(f"Error generating questions: {e}")
        return []
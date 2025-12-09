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
    请直接返回一个JSON数组，不要包含代码格式或其他文字。
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

def generate_smart_qa_response(query: str, persona: dict, graph_context: dict, history: list = None) -> str:
    """
    Generate a response to a user query based on persona and graph context.
    
    Args:
        query: The user's question
        persona: Dict containing 'tone' and 'logic'
        graph_context: Dict containing 'nodes' and 'relationships' found in KG
        history: List of previous messages
        
    Returns:
        Generated response string
    """
    
    # Format graph context for prompt
    nodes_text = ""
    for n in graph_context.get('nodes', []):
        strategy_info = f" (通过策略: {n.get('strategy', '未知')})" if 'strategy' in n else ""
        match_type_info = f" [{n.get('match_type', 'unknown')}]"
        nodes_text += f"- {n.get('name')} ({n.get('label')}){match_type_info}{strategy_info}\n"
    
    rels_text = ""
    for r in graph_context.get('relationships', []):
        strategy_info = f" (通过策略: {r.get('strategy', '未知')})" if 'strategy' in r else ""
        match_type_info = f" [{r.get('match_type', 'unknown')}]"
        rels_text += f"- {r.get('from_name')} -[{r.get('type')}]-> {r.get('to_name')}{match_type_info}{strategy_info}\n"
    
    if not nodes_text and not rels_text:
        context_text = "未找到相关的知识图谱数据。"
    else:
        context_text = f"相关节点:\n{nodes_text}\n相关关系:\n{rels_text}"
        
    # Include search strategies if available
    strategies_text = ""
    if "search_strategies" in graph_context:
        strategies_text = "\n使用的检索策略:\n"
        for i, strategy in enumerate(graph_context["search_strategies"], 1):
            strategies_text += f"{i}. {strategy.get('query', '')} - {strategy.get('description', '')}\n"
    
    system_prompt = f"""
    你现在是基于以下用户画像构建的"智慧员工"：
    
    【用户画像】
    - 语言风格/语气: {persona.get('tone', '正常')}
    - 思维逻辑: {persona.get('logic', '正常')}
    
    【知识库上下文】
    以下是检索到的相关知识图谱数据：
    {context_text}
    {strategies_text}
    
    请根据用户的提问，结合你的【思维逻辑】进行思考，并使用你的【语言风格】进行回答。
    
    **关键规则 - 必须严格遵守**：
    1. **如果在【知识库上下文】中没有找到有效信息（即上下文为空或只包含"未找到..."），请直接明确告知用户系统内查询不到相关信息。**
       - 此时请**不要**尝试编造答案，也不要使用通用知识回答。
       - 请用符合你【语言风格】的语气表达歉意，并建议用户："系统知识库中暂无此记录，请尝试更换关键词或确认数据是否已录入。"
    
    2. 只有在【知识库上下文】中有内容时，才进行逻辑推演和个性化回答。
    3. 严格模仿画像的语气和用词习惯。
    4. 如果有多条相关信息，优先使用匹配度更高的（exact > partial > label）。
    """
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add history messages if available
    if history:
        # Normalize history format to match API requirements
        # Limit to last 5 messages to avoid token overflow
        for msg in history[-5:]:
            role = "user" if msg.get("role") == "user" else "assistant"
            messages.append({"role": role, "content": msg.get("content", "")})
            
    # Add current query
    messages.append({"role": "user", "content": query})
    
    data = {
        "model": MODEL_MAIN,
        "messages": messages,
        "temperature": 0.7 # Slight creatinine for persona style
    }
    
    try:
        response = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        return response.json()['choices'][0]['message']['content']
    except Exception as e:
        print(f"Smart QA Error: {e}")
        return "抱歉，我现在无法思考（服务连接失败）。"


def generate_search_queries(query: str, persona: dict) -> list:
    """
    Generate search queries based on user question and persona
    
    Args:
        query: The user's question
        persona: Dict containing 'tone' and 'logic'
        
    Returns:
        List of search queries
    """
    
    system_prompt = f"""
    你是一个智能搜索查询生成器。你的任务是根据用户的提问和用户画像，生成一组最适合在知识图谱中搜索的关键词。
    
    【用户画像】
    - 语言风格/语气: {persona.get('tone', '正常')}
    - 思维逻辑: {persona.get('logic', '正常')}
    
    请分析用户的提问，提取其中的关键实体名称，并考虑用户画像特点，生成1-5个最有可能在知识图谱中找到相关信息的搜索关键词。
    
    回答要求：
    1. 直接返回一个纯JSON数组，不要包含其他文字或格式符号
    2. 数组中每个元素都是一个字符串形式的搜索关键词
    3. 关键词应该简洁明了，通常是名词或专有名称
    4. 按照重要程度排序，最重要的关键词放在前面
    5. 可以包括同义词、相关概念等
    
    示例输出格式：
    ["关键词1", "关键词2", "关键词3"]
    """
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": MODEL_FALLBACK,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请为以下问题生成搜索关键词：{query}"}
        ],
        "temperature": 0.3
    }
    
    try:
        response = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        result = response.json()['choices'][0]['message']['content']
        
        # 清理可能的 Markdown 格式
        if "```json" in result:
            result = result.split("```json")[1].split("```")[0]
        elif "```" in result:
            result = result.split("```")[1].split("```")[0]
            
        return json.loads(result.strip())
    except Exception as e:
        print(f"Search Query Generation Error: {e}")
        # Fallback to simple extraction method
        search_term = query
        if "是什么" in search_term:
            search_term = search_term.split("是什么")[0]
        elif "是什麼" in search_term:
            search_term = search_term.split("是什麼")[0]
        
        # Remove trailing question marks
        search_term = search_term.rstrip("?？")
        return [search_term]


def generate_search_strategies(query: str, persona: dict, history: list = None) -> list:
    """
    Generate multiple search strategies based on user question and persona, considering conversation history.
    
    Args:
        query: The user's question
        persona: Dict containing 'tone' and 'logic'
        history: List of conversation messages [{"role": "user/ai", "content": "..."}]
        
    Returns:
        List of search strategy dictionaries with query and description
    """
    
    # Format history for context
    history_text = ""
    if history:
        history_text = "\n【对话历史】\n"
        for msg in history[-3:]: # Limit to last 3
            role = "用户" if msg.get("role") == "user" else "AI"
            history_text += f"{role}: {msg.get('content')}\n"
    
    system_prompt = f"""
    你是一个知识图谱检索策略专家。你的任务是根据用户的提问和用户画像（特别是其【思维逻辑】），
    推导出最符合该思维逻辑的检索线索（Logical Search Concepts）。
    
    【用户画像】
    - 语言风格/语气: {persona.get('tone', '正常')}
    - 思维逻辑: {persona.get('logic', '正常')}
    
    {history_text}
    
    请严格按照该用户的【思维逻辑】来拆解问题，生成3-6种检索策略。
    
    **关键任务**: 
    1. **指代消解**: 如果用户的问题包含代词（如"它"、"这个人"、"那件事"），请根据【对话历史】将其还原为具体的实体名称。
    2. **逻辑推断**: 根据用户画像的思维逻辑，推断需要查找的底层概念。
    
    例如：
    - 如果历史中在讨论"SpaceX"，当用户问"它的创始人是谁？"，检索词应包含"SpaceX 创始人"而不是"它 创始人"。
    - 如果逻辑是"第一性原理" -> 检索"组成要素"、"物理定义"、"核心假设"。
    
    每种策略应包含：
    1. 一个具体的检索关键词（必须是具体的实体名或概念名，不能包含代词）
    2. 该策略的简要说明（解释该关键词如何服务于该思维逻辑）
    
    回答要求：
    1. 直接返回一个纯JSON数组，不要包含其他文字或格式符号
    2. 数组中每个元素都是一个对象，包含"query"和"description"两个字段
    3. "query"是用于检索的关键词字符串
    4. "description"是该策略的简要说明
    5. 按照有效性排序，最有希望的策略放在前面
    
    示例输出格式：
    [
      {{"query": "核心定义", "description": "基于第一性原理，首先确认核心概念的物理定义"}},
      {{"query": "SpaceX 历史", "description": "结合上文，查找SpaceX的发展脉络"}}
    ]
    """
    
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": MODEL_FALLBACK,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请为以下问题生成检索策略：{query}"}
        ],
        "temperature": 0.5
    }
    
    try:
        response = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=data)
        response.raise_for_status()
        result = response.json()['choices'][0]['message']['content']
        
        # 清理可能的 Markdown 格式
        if "```json" in result:
            result = result.split("```json")[1].split("```")[0]
        elif "```" in result:
            result = result.split("```")[1].split("```")[0]
            
        return json.loads(result.strip())
    except Exception as e:
        print(f"Search Strategy Generation Error: {e}")
        # Fallback to simple extraction method
        search_term = query
        if "是什么" in search_term:
            search_term = search_term.split("是什么")[0]
        elif "是什麼" in search_term:
            search_term = search_term.split("是什麼")[0]
        
        # Remove trailing question marks
        search_term = search_term.rstrip("?？")
        return [
            {"query": search_term, "description": "基于问题主体的直接检索"},
            {"query": search_term.split()[-1] if " " in search_term else search_term, "description": "基于最后一个词的精确检索"}
        ]

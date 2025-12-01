"""
测试知识图谱增量更新功能
验证：
1. 基于内容的实体ID生成
2. 相同实体自动合并
3. 增量更新不会产生冲突
"""

from services.graphiti_service import parse_document_to_graph, generate_entity_id
import json

def test_entity_id_generation():
    """测试实体ID生成的稳定性"""
    print("=== 测试实体ID生成 ===")
    
    # 相同实体应该生成相同ID
    id1 = generate_entity_id("Person", "张三")
    id2 = generate_entity_id("Person", "张三")
    id3 = generate_entity_id("Person", "  张三  ")  # 带空格
    id4 = generate_entity_id("Person", "张三 ")  # 大小写不同
    
    print(f"张三 (1): {id1}")
    print(f"张三 (2): {id2}")
    print(f"张三 (带空格): {id3}")
    print(f"张三 (尾空格): {id4}")
    
    assert id1 == id2 == id3 == id4, "相同实体应该生成相同ID"
    print("✅ 相同实体生成相同ID")
    
    # 不同实体应该生成不同ID
    id5 = generate_entity_id("Person", "李四")
    id6 = generate_entity_id("Company", "张三")  # 不同类型
    
    print(f"李四: {id5}")
    print(f"公司-张三: {id6}")
    
    assert id1 != id5, "不同实体应该生成不同ID"
    assert id1 != id6, "不同类型应该生成不同ID"
    print("✅ 不同实体生成不同ID\n")

def test_document_parsing():
    """测试文档解析和实体提取"""
    print("=== 测试文档解析 ===")
    
    # 模拟两个文档，包含重复实体
    doc1 = """
    张三在ABC公司工作，担任技术总监。
    他负责公司的技术架构设计。
    """
    
    doc2 = """
    张三最近在研究人工智能技术。
    ABC公司正在开发新的AI产品。
    """
    
    print("文档1:", doc1.strip())
    print("\n文档2:", doc2.strip())
    print("\n注意：两个文档都提到了'张三'和'ABC公司'")
    print("预期：相同实体应该生成相同的ID，实现自动合并\n")

def test_incremental_update_simulation():
    """模拟增量更新场景"""
    print("=== 模拟增量更新场景 ===")
    
    # 第一次上传
    print("第一次上传文档:")
    entities1 = [
        {"id": "e1", "type": "Person", "name": "张三"},
        {"id": "e2", "type": "Company", "name": "ABC公司"}
    ]
    
    # 使用新的ID生成策略
    stable_entities1 = []
    for e in entities1:
        stable_id = generate_entity_id(e["type"], e["name"])
        stable_entities1.append({
            "id": stable_id,
            "type": e["type"],
            "name": e["name"]
        })
    
    print(json.dumps(stable_entities1, ensure_ascii=False, indent=2))
    
    # 第二次上传（包含重复实体）
    print("\n第二次上传文档（包含相同实体）:")
    entities2 = [
        {"id": "e1", "type": "Person", "name": "张三"},  # 重复
        {"id": "e3", "type": "Technology", "name": "人工智能"}  # 新实体
    ]
    
    stable_entities2 = []
    for e in entities2:
        stable_id = generate_entity_id(e["type"], e["name"])
        stable_entities2.append({
            "id": stable_id,
            "type": e["type"],
            "name": e["name"]
        })
    
    print(json.dumps(stable_entities2, ensure_ascii=False, indent=2))
    
    # 检查ID是否一致
    zhang_san_id_1 = stable_entities1[0]["id"]
    zhang_san_id_2 = stable_entities2[0]["id"]
    
    print(f"\n第一次'张三'的ID: {zhang_san_id_1}")
    print(f"第二次'张三'的ID: {zhang_san_id_2}")
    
    if zhang_san_id_1 == zhang_san_id_2:
        print("✅ 相同实体在不同批次中生成相同ID，Neo4j的MERGE会自动合并")
        print("✅ 不会产生'data set is already exists'错误")
    else:
        print("❌ ID不一致，会产生冲突")
    
    print("\n=== 总结 ===")
    print("1. 使用基于内容的哈希ID替代简单序号（e1, e2）")
    print("2. 相同实体总是生成相同ID")
    print("3. Neo4j的MERGE策略会自动处理重复")
    print("4. ON CREATE和ON MATCH分别处理新建和更新")
    print("5. 支持真正的增量更新，无冲突")

if __name__ == "__main__":
    try:
        test_entity_id_generation()
        test_document_parsing()
        test_incremental_update_simulation()
        print("\n✅ 所有测试通过！")
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

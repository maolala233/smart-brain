from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import SmartEmployee, EmployeePersona
from schemas import UserResponse, LogicTestSubmit, UserCreate
from services.llm_service import analyze_document_content
import logging

router = APIRouter(
    prefix="/api/users",
    tags=["Users"]
)

logger = logging.getLogger("uvicorn")

# 1. 创建用户
@router.post("/", response_model=UserResponse)
def create_user(
    user: UserCreate, 
    db: Session = Depends(get_db)
):
    # 创建基础用户
    new_user = SmartEmployee(name=user.name, role=user.role, domain=user.domain)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 同时也初始化一个空的画像记录
    new_persona = EmployeePersona(
        user_id=new_user.id,
        name=f"{new_user.name}的画像",
        description="待分析"
    )
    db.add(new_persona)
    db.commit()
    
    return new_user

# 2. 提交逻辑测试
@router.post("/{user_id}/logic")
def submit_logic_test(
    user_id: int, 
    data: LogicTestSubmit, 
    db: Session = Depends(get_db)
):
    persona = db.query(EmployeePersona).filter(EmployeePersona.user_id == user_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # 模拟计分逻辑
    total_score = data.score
    logic_type = "数据驱动型" if total_score > 15 else "直觉经验型"
    
    # 更新数据库
    persona.logic_test_score = data.answers
    persona.base_logic_type = logic_type
    
    db.commit()
    return {"msg": "逻辑测试完成", "logic_type": logic_type}

# 3. 上传文档分析（支持多文件，可选）
@router.post("/{user_id}/upload")
async def upload_document(
    user_id: int,
    files: Optional[List[UploadFile]] = File(None),
    text_input: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    logger.info(f"Upload request for user {user_id}")
    
    persona = db.query(EmployeePersona).filter(EmployeePersona.user_id == user_id).first()
    if not persona:
        logger.error(f"Persona not found for user {user_id}")
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # 收集所有文本内容
    all_texts = []
    
    # 处理文件上传
    if files:
        logger.info(f"Processing {len(files)} files")
        import io
        import PyPDF2
        import docx
        
        for file in files:
            try:
                content = await file.read()
                filename = file.filename.lower()
                text_content = ""
                
                if filename.endswith('.pdf'):
                    try:
                        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                        for page in pdf_reader.pages:
                            text_content += page.extract_text() + "\n"
                        logger.info(f"Extracted {len(text_content)} chars from PDF: {file.filename}")
                    except Exception as e:
                        logger.error(f"Error reading PDF {file.filename}: {e}")
                        text_content = f"[Error reading PDF: {file.filename}]"
                        
                elif filename.endswith('.docx'):
                    try:
                        doc = docx.Document(io.BytesIO(content))
                        for para in doc.paragraphs:
                            text_content += para.text + "\n"
                        logger.info(f"Extracted {len(text_content)} chars from DOCX: {file.filename}")
                    except Exception as e:
                        logger.error(f"Error reading DOCX {file.filename}: {e}")
                        text_content = f"[Error reading DOCX: {file.filename}]"
                        
                else:
                    # Default to text decoding
                    try:
                        text_content = content.decode("utf-8")
                    except UnicodeDecodeError:
                        text_content = content.decode("gbk", errors="ignore")
                    logger.info(f"Processed text file: {file.filename}")

                if text_content.strip():
                    all_texts.append(text_content)
                    
            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {e}")
    
    # 处理直接文本输入
    if text_input and text_input.strip():
        all_texts.append(text_input)
        logger.info("Processed text input")
    
    # 如果有内容则分析，否则跳过（文档上传为可选）
    if all_texts:
        combined_text = "\n\n".join(all_texts)
        logger.info(f"Analyzing combined text ({len(combined_text)} chars)")
        
        try:
            analysis_result = analyze_document_content(combined_text)
            
            # 更新画像
            persona.extracted_tone_style = analysis_result.get("tone")
            persona.extracted_positive_logic = analysis_result.get("logic")
            
            db.commit()
            logger.info("Analysis completed and saved")
            
            return {
                "msg": "文档分析完成",
                "analyzed_files": len(files) if files else 0,
                "final_persona": {
                    "tone": persona.extracted_tone_style,
                    "logic": persona.extracted_positive_logic
                }
            }
        except Exception as e:
            logger.error(f"Analysis error: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    else:
        # 没有上传文档也没有输入文本，直接返回当前画像
        logger.info("No content provided, returning current persona")
        return {
            "msg": "未提供分析内容，使用当前画像",
            "analyzed_files": 0,
            "final_persona": {
                "tone": persona.extracted_tone_style or "待分析",
                "logic": persona.extracted_positive_logic or "待分析"
            }
        }

# 4. 获取用户信息
@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(SmartEmployee).filter(SmartEmployee.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# 5. 获取/生成题目
@router.get("/questions/generate")
def get_questions(db: Session = Depends(get_db)):
    from models import Question
    from services.llm_service import generate_logic_test_questions
    
    # Check if we have questions
    count = db.query(Question).count()
    if count < 40:
        # Generate new questions
        generated_questions = generate_logic_test_questions()
        if generated_questions:
            # Clear existing? Or append? Let's clear for now to ensure we have the latest set
            db.query(Question).delete()
            
            for q_data in generated_questions:
                new_q = Question(
                    id=q_data['id'],
                    text=q_data['text'],
                    options=q_data['options'],
                    dimension=q_data.get('dimension')
                )
                db.merge(new_q) # Use merge to handle ID conflicts if any
            db.commit()
            
    questions = db.query(Question).all()
    return questions

# 6. 获取所有用户列表
@router.get("/list/all", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    users = db.query(SmartEmployee).all()
    return users

# 7. 删除用户
@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(SmartEmployee).filter(SmartEmployee.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cascade delete persona (handled by database usually, but let's be explicit if needed or rely on cascade)
    # Assuming SQLAlchemy cascade is not set up, we delete manually
    persona = db.query(EmployeePersona).filter(EmployeePersona.user_id == user_id).first()
    if persona:
        db.delete(persona)
        
    db.delete(user)
    db.commit()
    return {"msg": "User deleted successfully"}
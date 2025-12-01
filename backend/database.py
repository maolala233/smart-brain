from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine.url import make_url
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 获取配置的 URL
raw_db_url = os.getenv("DATABASE_URL")

if not raw_db_url:
    raise ValueError("DATABASE_URL 未设置，请检查 .env 文件")

# --- 自动创建数据库逻辑开始 ---
def ensure_database_exists(db_url):
    """
    连接到 MySQL Server (不指定具体库)，如果库不存在则创建。
    """
    url_obj = make_url(db_url)
    db_name = url_obj.database
    
    # 创建一个不包含数据库名的连接 URL (连接到 MySQL Server 根目录)
    # SQLAlchemy < 1.4 使用 url_obj.set(database=None)
    # SQLAlchemy >= 1.4 使用 url_obj._replace(database=None)
    server_url = url_obj._replace(database=None)
    
    # 创建临时引擎
    temp_engine = create_engine(server_url, isolation_level="AUTOCOMMIT")
    
    with temp_engine.connect() as conn:
        # 检查数据库是否存在
        result = conn.execute(text(f"SHOW DATABASES LIKE '{db_name}'"))
        if not result.fetchone():
            print(f"检测到数据库 '{db_name}' 不存在，正在创建...")
            conn.execute(text(f"CREATE DATABASE {db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
            print(f"数据库 '{db_name}' 创建成功！")
        else:
            print(f"数据库 '{db_name}' 已存在。")

# 执行检查
ensure_database_exists(raw_db_url)
# --- 自动创建数据库逻辑结束 ---

# 创建正式的引擎 (连接到 smart_employee_db)
engine = create_engine(raw_db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 数据库会话依赖项
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
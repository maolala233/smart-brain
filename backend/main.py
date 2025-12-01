from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import user, knowledge_graph

# 1. 自动建表 (开发阶段方便，生产环境推荐使用 Alembic 迁移)
Base.metadata.create_all(bind=engine)

# 2. 初始化 App
app = FastAPI(title="智慧员工系统 API")

# 3. CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 允许前端开发服务器访问
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. 注册路由
app.include_router(user.router)
app.include_router(knowledge_graph.router)

if __name__ == "__main__":
    import uvicorn
    print("🚀 服务正在启动...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
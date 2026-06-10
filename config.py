"""配置文件"""

import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# DeepSeek API配置（延迟检查，仅在调用AI时报错）
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
DEEPSEEK_MODEL = "deepseek-chat"

# GitHub API Token（可选，匿名也能用，加Token提高频率限额）
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")


def require_api_key() -> str:
    """获取API Key，未配置时抛出明确错误"""
    if not DEEPSEEK_API_KEY:
        raise RuntimeError(
            "请设置 DEEPSEEK_API_KEY 环境变量\n"
            "Windows: set DEEPSEEK_API_KEY=your_key\n"
            "或在 start.bat 同目录创建 .env 文件"
        )
    return DEEPSEEK_API_KEY


# 服务配置
HOST = "127.0.0.1"
PORT = 8888

# 数据存储路径
NOTES_DIR = os.path.join(os.path.dirname(__file__), "data", "notes")

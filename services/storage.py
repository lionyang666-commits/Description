"""通用JSON文件存储层 — 带错误处理"""

import json
import os
import uuid
from datetime import datetime


def gen_id() -> str:
    return uuid.uuid4().hex[:8]


def now_iso() -> str:
    return datetime.now().isoformat()


def ensure_dir(directory: str):
    os.makedirs(directory, exist_ok=True)


def read_json(path: str) -> dict | None:
    """读取JSON文件，失败返回None"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except UnicodeDecodeError:
        try:
            with open(path, "r", encoding="gbk") as f:
                data = json.load(f)
            # 读取成功后转为UTF-8保存
            write_json(path, data)
            return data
        except (FileNotFoundError, json.JSONDecodeError, OSError):
            return None
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None


def write_json(path: str, data: dict) -> bool:
    """写入JSON文件，失败返回False"""
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except OSError:
        return False


def delete_json(path: str) -> bool:
    """删除JSON文件"""
    try:
        os.remove(path)
        return True
    except FileNotFoundError:
        return False


def list_json(directory: str) -> list[dict]:
    """列出目录下所有JSON文件"""
    ensure_dir(directory)
    items = []
    try:
        for name in os.listdir(directory):
            if not name.endswith(".json"):
                continue
            data = read_json(os.path.join(directory, name))
            if data is not None:
                items.append(data)
    except OSError:
        pass
    return items

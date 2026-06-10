"""提示词管理服务"""

import os
from services.storage import gen_id, now_iso, read_json, write_json, delete_json, list_json, ensure_dir

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "prompts")


def _path(pid: str) -> str:
    return os.path.join(PROMPTS_DIR, f"{pid}.json")


def list_prompts(category_id: str | None = None) -> list[dict]:
    items = list_json(PROMPTS_DIR)
    if category_id:
        items = [p for p in items if p.get("category_id") == category_id]
    items.sort(key=lambda x: x.get("updated", ""), reverse=True)
    return items


def create_prompt(title: str, raw_text: str, category_id: str) -> dict:
    ensure_dir(PROMPTS_DIR)
    p = {
        "id": gen_id(),
        "title": title or "未命名提示词",
        "raw_text": raw_text,
        "optimized_text": "",
        "category_id": category_id,
        "created": now_iso(),
        "updated": now_iso(),
    }
    write_json(_path(p["id"]), p)
    return p


def update_prompt(pid: str, **kwargs) -> dict | None:
    path = _path(pid)
    p = read_json(path)
    if not p:
        return None
    for k, v in kwargs.items():
        if v is not None:
            p[k] = v
    p["updated"] = now_iso()
    ok = write_json(path, p)
    return p if ok else None


def get_prompt(pid: str) -> dict | None:
    return read_json(_path(pid))


def delete_prompt(pid: str) -> bool:
    return delete_json(_path(pid))

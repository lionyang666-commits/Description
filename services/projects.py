"""项目管理服务"""

import os
from services.storage import gen_id, now_iso, read_json, write_json, delete_json, list_json, ensure_dir

PROJECTS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "projects")


def _path(pid: str) -> str:
    return os.path.join(PROJECTS_DIR, f"{pid}.json")


def list_projects() -> list[dict]:
    items = list_json(PROJECTS_DIR)
    items.sort(key=lambda x: x.get("updated", ""), reverse=True)
    return items


def create_project(name: str, description: str = "", plan: str = "") -> dict:
    ensure_dir(PROJECTS_DIR)
    p = {
        "id": gen_id(),
        "name": name or "未命名项目",
        "status": "进行中",
        "description": description,
        "plan": plan,
        "created": now_iso(),
        "updated": now_iso(),
    }
    write_json(_path(p["id"]), p)
    return p


def update_project(pid: str, **kwargs) -> dict | None:
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


def get_project(pid: str) -> dict | None:
    return read_json(_path(pid))


def delete_project(pid: str) -> bool:
    return delete_json(_path(pid))

"""类目管理服务"""

import os
from services.storage import gen_id, now_iso, read_json, write_json, delete_json, list_json, ensure_dir

CATEGORIES_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "categories")


def _path(cid: str) -> str:
    return os.path.join(CATEGORIES_DIR, f"{cid}.json")


def list_categories(type_: str) -> list[dict]:
    cats = list_json(CATEGORIES_DIR)
    cats = [c for c in cats if c.get("type") == type_]
    cats.sort(key=lambda x: x.get("sort_order", 0))
    return cats


def create_category(type_: str, name: str) -> dict:
    ensure_dir(CATEGORIES_DIR)
    c = {
        "id": gen_id(),
        "name": name,
        "type": type_,
        "sort_order": len(list_categories(type_)),
        "created": now_iso(),
    }
    write_json(_path(c["id"]), c)
    return c


def rename_category(cid: str, name: str) -> dict | None:
    path = _path(cid)
    c = read_json(path)
    if not c:
        return None
    c["name"] = name
    ok = write_json(path, c)
    return c if ok else None


def delete_category(cid: str) -> bool:
    return delete_json(_path(cid))

"""笔记管理服务"""

import os
from config import NOTES_DIR
from services.storage import gen_id, now_iso, read_json, write_json, delete_json, list_json, ensure_dir


def _path(note_id: str) -> str:
    return os.path.join(NOTES_DIR, f"{note_id}.json")


def create_note(title: str, draft: str, category_id: str = "") -> dict:
    ensure_dir(NOTES_DIR)
    note = {
        "id": gen_id(),
        "title": title or "未命名笔记",
        "draft": draft,
        "polished": "",
        "category_id": category_id,
        "created": now_iso(),
        "updated": now_iso(),
    }
    write_json(_path(note["id"]), note)
    return note


def save_note(note_id: str, title: str, draft: str, polished: str = None, category_id: str = None) -> dict | None:
    existing = get_note(note_id)
    if not existing:
        return None
    note = {
        "id": note_id,
        "title": title,
        "draft": draft,
        "polished": polished if polished is not None else existing.get("polished", ""),
        "category_id": category_id if category_id is not None else existing.get("category_id", ""),
        "created": existing["created"],
        "updated": now_iso(),
    }
    ok = write_json(_path(note_id), note)
    return note if ok else None


def get_note(note_id: str) -> dict | None:
    return read_json(_path(note_id))


def list_notes(category_id: str | None = None) -> list[dict]:
    notes = list_json(NOTES_DIR)
    if category_id:
        notes = [n for n in notes if n.get("category_id") == category_id]
    notes.sort(key=lambda x: x.get("updated", ""), reverse=True)
    return notes


def delete_note(note_id: str) -> bool:
    return delete_json(_path(note_id))

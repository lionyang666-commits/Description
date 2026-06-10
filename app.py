"""个人工作台 — 主应用"""

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import json
import time
from datetime import datetime, timedelta, timezone

import httpx

from sources import ALL_SOURCES
from services import ai, notes, github, prompts, projects, categories

# ── AI 资讯缓存 ──
_ai_news_cache = {"data": None, "ts": 0, "ttl": 3600}  # 1小时缓存

AIHOT_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

app = FastAPI(title="个人工作台")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# ========== 页面 ==========

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# ========== 笔记 API ==========

@app.get("/api/notes")
async def list_notes(cat: str = ""):
    return notes.list_notes(category_id=cat or None)


@app.get("/api/notes/{note_id}")
async def get_note(note_id: str):
    n = notes.get_note(note_id)
    if not n:
        return {"error": "笔记不存在"}
    return n


@app.post("/api/notes")
async def create_note(body: dict):
    return notes.create_note(
        body.get("title", ""),
        body.get("draft", ""),
        body.get("category_id", ""),
    )


@app.put("/api/notes/{note_id}")
async def update_note(note_id: str, body: dict):
    return notes.save_note(
        note_id,
        body.get("title", ""),
        body.get("draft", ""),
        body.get("polished", ""),
        body.get("category_id", ""),
    )


@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    notes.delete_note(note_id)
    return {"ok": True}


@app.post("/api/notes/{note_id}/polish")
async def polish_note(note_id: str, request: Request):
    note = notes.get_note(note_id)
    if not note:
        return {"error": "笔记不存在"}
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass
    draft = body.get("draft", note["draft"])
    polished = await ai.polish_note(draft)
    notes.save_note(note_id, note["title"], draft, polished)
    return {"polished": polished}


# ========== 热点新闻 API ==========

@app.get("/api/news/sources")
async def news_sources():
    return [{"id": k, "name": v.name, "icon": v.icon} for k, v in ALL_SOURCES.items()]


@app.get("/api/news/{source_id}")
async def get_news(source_id: str):
    source = ALL_SOURCES.get(source_id)
    if not source:
        return {"error": "数据源不存在"}
    items = await source.fetch()
    return [{"title": i.title, "url": i.url, "hot": i.hot, "source": i.source} for i in items]


# ========== GitHub 热榜 API ==========

@app.get("/api/github")
async def get_github_trending():
    projects_data = await github.fetch_trending()
    return projects_data


@app.post("/api/github/analyze")
async def analyze_project(body: dict):
    name = body.get("name", "")
    desc = body.get("description", "")
    readme = await github.get_readme(*name.split("/")) if "/" in name else ""
    result = await ai.analyze_github(name, desc, readme)
    return {"analysis": result}


# ========== 类目 API ==========

@app.get("/api/categories/{type_}")
async def list_categories(type_: str):
    return categories.list_categories(type_)


@app.post("/api/categories/{type_}")
async def create_category(type_: str, body: dict):
    return categories.create_category(type_, body.get("name", "未命名"))


@app.put("/api/categories/{cid}")
async def rename_category(cid: str, body: dict):
    return categories.rename_category(cid, body.get("name", ""))


@app.delete("/api/categories/{cid}")
async def delete_category(cid: str):
    categories.delete_category(cid)
    return {"ok": True}


# ========== 提示词 API ==========

@app.get("/api/prompts")
async def list_prompts(cat: str = ""):
    return prompts.list_prompts(category_id=cat or None)


@app.post("/api/prompts")
async def create_prompt(body: dict):
    return prompts.create_prompt(
        body.get("title", ""),
        body.get("raw_text", ""),
        body.get("category_id", ""),
    )


@app.get("/api/prompts/{pid}")
async def get_prompt(pid: str):
    return prompts.get_prompt(pid)


@app.put("/api/prompts/{pid}")
async def update_prompt(pid: str, body: dict):
    return prompts.update_prompt(
        pid,
        title=body.get("title"),
        raw_text=body.get("raw_text"),
        optimized_text=body.get("optimized_text"),
        category_id=body.get("category_id"),
    )


@app.delete("/api/prompts/{pid}")
async def delete_prompt(pid: str):
    prompts.delete_prompt(pid)
    return {"ok": True}


@app.post("/api/prompts/{pid}/optimize")
async def optimize_prompt(pid: str):
    p = prompts.get_prompt(pid)
    if not p:
        return {"error": "提示词不存在"}
    optimized = await ai.optimize_prompt(p["raw_text"])
    prompts.update_prompt(pid, optimized_text=optimized)
    return {"optimized": optimized}


@app.post("/api/prompts/optimize-text")
async def optimize_text(body: dict):
    """直接优化文本，不保存"""
    raw = body.get("raw_text", "")
    if not raw:
        return {"error": "内容为空"}
    result = await ai.optimize_prompt(raw)
    return {"optimized": result}


# ========== 项目 API ==========

@app.get("/api/projects")
async def list_projects():
    return projects.list_projects()


@app.post("/api/projects")
async def create_project(body: dict):
    return projects.create_project(
        body.get("name", ""),
        body.get("description", ""),
        body.get("plan", ""),
    )


@app.put("/api/projects/{pid}")
async def update_project(pid: str, body: dict):
    return projects.update_project(
        pid,
        name=body.get("name"),
        status=body.get("status"),
        description=body.get("description"),
        plan=body.get("plan"),
    )


@app.delete("/api/projects/{pid}")
async def delete_project(pid: str):
    projects.delete_project(pid)
    return {"ok": True}


# ========== AI 资讯 API ==========

def _friendly_time(iso_str: str) -> str:
    """北京时间人话格式"""
    try:
        ts = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        delta = now - ts.astimezone(timezone.utc)
        hours = delta.total_seconds() / 3600
        if hours < 1:
            return "刚刚"
        if hours < 24:
            return f"{int(hours)} 小时前"
        days = int(hours / 24)
        if days == 1:
            return "昨天"
        if days < 7:
            return f"{days} 天前"
        bj = ts.astimezone(timezone(timedelta(hours=8)))
        return bj.strftime("%Y-%m-%d")
    except Exception:
        return ""


async def _fetch_aihot():
    """拉取 AI HOT 日报，自动回退"""
    today = datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d")
    async with httpx.AsyncClient(timeout=15) as client:
        # 尝试当日日报
        for date_str in [today, None]:
            url = f"https://aihot.virxact.com/api/public/daily/{date_str}" if date_str else "https://aihot.virxact.com/api/public/daily"
            try:
                r = await client.get(url, headers={"User-Agent": AIHOT_UA})
                if r.status_code == 200:
                    return r.json()
            except Exception:
                continue
        return None


@app.get("/api/ai-news")
async def get_ai_news():
    global _ai_news_cache
    now = time.time()
    if _ai_news_cache["data"] and (now - _ai_news_cache["ts"]) < _ai_news_cache["ttl"]:
        return _ai_news_cache["data"]

    raw = await _fetch_aihot()
    if not raw:
        return {"error": "数据拉取失败", "sections": []}

    sections = []
    global_idx = 0
    for sec in (raw.get("sections") or []):
        items = []
        for item in sec.get("items", []):
            global_idx += 1
            items.append({
                "idx": global_idx,
                "title": item.get("title", ""),
                "summary": item.get("summary", "")[:120],
                "sourceName": item.get("sourceName", ""),
                "sourceUrl": item.get("sourceUrl", ""),
                "time": "昨天" if raw.get("date") else _friendly_time(item.get("publishedAt", "")),
            })
        sections.append({
            "label": sec.get("label", ""),
            "count": len(items),
            "items": items,
        })

    result = {
        "date": raw.get("date", ""),
        "generatedAt": raw.get("generatedAt", ""),
        "total": global_idx,
        "sections": sections,
    }
    _ai_news_cache = {"data": result, "ts": now, "ttl": 3600}
    return result


# ========== 启动 ==========

if __name__ == "__main__":
    import uvicorn
    from config import HOST, PORT
    print(f"\n  个人工作台已启动: http://{HOST}:{PORT}\n")
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")

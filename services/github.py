"""GitHub热榜服务"""

import httpx
from config import GITHUB_TOKEN


def _headers() -> dict:
    h = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Workspace-App",
    }
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


async def fetch_trending(language: str = "", since: str = "daily") -> list[dict]:
    """获取GitHub Trending项目"""
    url = "https://api.github.com/search/repositories"
    params = {
        "q": f"created:>{_week_ago()} stars:>100",
        "sort": "stars",
        "order": "desc",
        "per_page": 20,
    }
    if language:
        params["q"] += f" language:{language}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, params=params, headers=_headers())
        resp.raise_for_status()
        data = resp.json()

    projects = []
    for item in data.get("items", []):
        projects.append({
            "name": item["full_name"],
            "description": item.get("description", "") or "",
            "url": item["html_url"],
            "stars": item.get("stargazers_count", 0),
            "language": item.get("language", "") or "",
            "forks": item.get("forks_count", 0),
            "topics": item.get("topics", []),
        })
    return projects


async def get_readme(owner: str, repo: str) -> str:
    """获取项目的README内容"""
    url = f"https://api.github.com/repos/{owner}/{repo}/readme"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers={
            "Accept": "application/vnd.github.v3.raw",
            "User-Agent": "Workspace-App",
            **({"Authorization": f"Bearer {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}),
        })
        if resp.status_code == 200:
            return resp.text[:3000]
    return ""


def _week_ago() -> str:
    from datetime import datetime, timedelta
    return (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

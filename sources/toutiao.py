"""今日头条热搜数据源"""

import httpx, json
from .base import BaseSource, HotItem


class ToutiaoSource(BaseSource):
    name = "今日头条"
    icon = "📰"

    async def fetch(self) -> list[HotItem]:
        try:
            url = "https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc"
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "https://www.toutiao.com/",
                })
                data = resp.json()

            items = []
            for i, item in enumerate(data.get("data", [])):
                title = item.get("Title", "")
                if not title:
                    continue

                log_pb = item.get("log_pb", "")
                if log_pb and "title" in str(log_pb):
                    try:
                        pb = json.loads(log_pb) if isinstance(log_pb, str) else log_pb
                        title = pb.get("title", title)
                    except Exception:
                        pass

                raw_url = item.get("Url", "")
                if not raw_url:
                    raw_url = f"https://www.toutiao.com/search/?keyword={title}"

                items.append(HotItem(
                    title=title,
                    url=raw_url,
                    hot=str(item.get("HotValue", "")),
                    source="头条",
                ))
            return items[:30]
        except Exception:
            return []

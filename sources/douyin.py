"""抖音热搜数据源"""

import httpx
from .base import BaseSource, HotItem


class DouyinSource(BaseSource):
    name = "抖音"
    icon = "🎵"

    async def fetch(self) -> list[HotItem]:
        try:
            url = "https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/"
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                })
                data = resp.json()

            items = []
            for i, word in enumerate(data.get("word_list", []), 1):
                items.append(HotItem(
                    title=word.get("word", ""),
                    url=f"https://www.douyin.com/search/{word.get('word', '')}",
                    hot=str(word.get("hot_value", "")),
                    source="抖音",
                ))
            return items[:30]
        except Exception:
            return []

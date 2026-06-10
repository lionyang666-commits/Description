"""数据源基类 — 新增渠道只需继承此类"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class HotItem:
    """单条热点数据"""
    title: str
    url: str
    hot: str = ""       # 热度值
    source: str = ""    # 来源标记


class BaseSource(ABC):
    """数据源基类"""
    name: str = "未知来源"
    icon: str = ""

    @abstractmethod
    async def fetch(self) -> list[HotItem]:
        """抓取热点列表"""
        ...

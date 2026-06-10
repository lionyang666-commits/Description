"""数据源注册 — 新增渠道在这里注册即可"""

from .douyin import DouyinSource
from .toutiao import ToutiaoSource

# 所有已注册的数据源
ALL_SOURCES = {
    "douyin": DouyinSource(),
    "toutiao": ToutiaoSource(),
}

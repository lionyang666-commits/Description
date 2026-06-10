"""DeepSeek AI服务"""

import httpx
from config import require_api_key, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL


async def chat(system: str, user: str) -> str:
    """调用DeepSeek API"""
    api_key = require_api_key()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{DEEPSEEK_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.7,
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def polish_note(draft: str) -> str:
    """AI整理笔记"""
    system = (
        "你是笔记整理助手。对用户粗稿做以下处理：\n"
        "1. 修正错别字和语病\n"
        "2. 提炼核心观点，归纳总结\n"
        "3. 用标题和分点整理逻辑结构\n"
        "4. 保留用户原始想法和语气\n"
        "5. 用Markdown格式输出\n\n"
        "严格禁止：不要添加推荐、建议、补充观点、延伸思考等用户原文没有的内容。只做提炼和归纳，不做发挥。"
    )
    return await chat(system, draft)


async def analyze_github(name: str, description: str, readme: str = "") -> str:
    """AI拆解GitHub项目"""
    system = (
        "你是一个技术分析师。对这个GitHub项目进行详细拆解：\n"
        "1. **项目定位**：解决什么问题\n"
        "2. **技术栈**：用了什么技术\n"
        "3. **亮点**：有什么独特之处\n"
        "4. **适用场景**：谁会用到它\n"
        "5. **总结**：一句话评价\n"
        "用中文回答，结构清晰。"
    )
    user = f"项目名：{name}\n简介：{description}"
    if readme:
        user += f"\nREADME摘要：{readme[:2000]}"
    return await chat(system, user)


async def optimize_prompt(raw_text: str) -> str:
    """AI优化提示词"""
    system = (
        "你是一个提示词工程专家。用户的输入是自然语言，你需要：\n"
        "1. 将其转化为结构化的、专业的AI提示词\n"
        "2. 明确角色、任务、输出格式、约束条件\n"
        "3. 保留用户原始意图\n"
        "4. 用中文输出，直接返回优化后的提示词\n"
        "不要加『优化后』『修改后』等前缀，直接输出结果。"
    )
    return await chat(system, raw_text)

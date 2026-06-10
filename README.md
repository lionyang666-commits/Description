# 个人工作台 (Personal Workspace)

> FastAPI + Jinja2 全栈个人效率工具集 — 笔记、AI 资讯、GitHub 热榜、热点聚合、工具箱，一站式工作流。

🔗 GitHub: [lionyang666-commits/Description](https://github.com/lionyang666-commits/Description)

---

## 功能模块

| 模块 | 说明 |
|------|------|
| 📝 **笔记** | Markdown 编辑器，类目分类，自动保存，AI 一键整理润色 |
| 💬 **提示词** | 自然语言描述 → AI 优化输出专业 Prompt |
| 🔥 **热点** | 抖音 / 头条 / 小红书热榜聚合 |
| 🐙 **GitHub** | 最近 7 天热门项目排行，按语言过滤，AI 深度拆解分析 |
| 📡 **AI 资讯** | AI HOT 日报，5 个版块 30 条资讯，统计卡片 + 子导航 |
| 📂 **项目** | 本地项目管理，状态追踪 |
| 🛠️ **工具箱** | 图片工具箱（压缩/重命名/格式转换）、PDF 工具箱（合并/拆分/水印） |

---

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/lionyang666-commits/Description.git
cd Description
```

### 2. 配置密钥

复制 `.env.example` 为 `.env`，填入 API Key：

```env
DEEPSEEK_API_KEY=sk-xxxxxxxx    # 必填，用于 AI 整理/优化/拆解
GITHUB_TOKEN=                   # 可选，提升 GitHub API 限额 (10→5000 次/时)
```

> GitHub Token 获取: https://github.com/settings/tokens → Classic Token → 勾选 `repo` / `public_repo`

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 启动

```bash
python app.py
```

或双击 `start.bat`（Windows），浏览器自动打开 **http://localhost:8888**

---

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Python 3.10+, FastAPI, httpx, Jinja2 |
| AI | DeepSeek API (deepseek-chat) |
| 数据源 | AI HOT、GitHub Search API、抖音/头条/小红书 |
| 前端 | 原生 JS + CSS，深色科技风 UI，系统字体栈 |
| 存储 | JSON 文件 (data/ 目录，不上传 Git) |
| 工具箱 | PDF.js, pdf-lib, JSZip (纯浏览器本地处理) |

---

## 项目结构

```
.
├── app.py                     # FastAPI 主应用
├── config.py                  # 配置文件（读取 .env）
├── requirements.txt           # Python 依赖
├── start.bat                  # Windows 启动脚本
├── start.vbs                  # Windows 静默启动
│
├── services/                  # 后端 Service 层
│   ├── ai.py                  # DeepSeek AI 调用
│   ├── notes.py               # 笔记 CRUD
│   ├── prompts.py             # 提示词 CRUD
│   ├── github.py              # GitHub 热榜抓取
│   ├── categories.py          # 类目管理
│   ├── projects.py            # 项目管理
│   └── storage.py             # JSON 文件存储抽象
│
├── sources/                   # 热点数据源
│   ├── base.py                # 抽象基类
│   ├── douyin.py              # 抖音热榜
│   ├── toutiao.py             # 头条热榜
│   └── xiaohongshu.py         # 小红书热榜
│
├── templates/
│   └── index.html             # 工作台主页 (Jinja2)
│
├── static/
│   ├── css/style.css          # 全局样式
│   ├── js/app.js              # 前端逻辑
│   └── tools/
│       ├── pdf-tools.html      # PDF 工具箱
│       ├── image-tools.html    # 图片工具箱
│       └── lib/                # 第三方库
│           ├── pdf.min.js
│           ├── pdf.worker.min.js
│           ├── pdf-lib.min.js
│           └── jszip.min.js
│
└── data/                      # 用户数据（不上传 Git）
    ├── notes/
    ├── projects/
    ├── prompts/
    └── categories/
```

---

## API 一览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/notes` | GET | 笔记列表 |
| `/api/notes` | POST | 新建笔记 |
| `/api/notes/{id}` | GET/PUT/DELETE | 笔记操作 |
| `/api/notes/{id}/polish` | POST | AI 整理笔记 |
| `/api/prompts` | GET/POST | 提示词 |
| `/api/prompts/{id}` | GET/PUT/DELETE | 提示词操作 |
| `/api/prompts/{id}/optimize` | POST | AI 优化提示词 |
| `/api/news/sources` | GET | 热点数据源列表 |
| `/api/news/{source}` | GET | 获取热榜 |
| `/api/github` | GET | GitHub Trending |
| `/api/github/analyze` | POST | AI 拆解项目 |
| `/api/ai-news` | GET | AI HOT 日报 |
| `/api/categories/{type}` | GET/POST | 类目管理 |
| `/api/categories/{id}` | PUT/DELETE | 类目操作 |
| `/api/projects` | GET/POST | 项目管理 |
| `/api/projects/{id}` | PUT/DELETE | 项目操作 |

---

## 使用技巧

- **类目改名**: 双击类目名称
- **笔记自动保存**: 输入 2 秒后自动保存
- **AI 资讯刷新**: 数据缓存 1 小时，手动点「刷新」即时更新
- **GitHub 语言过滤**: 点顶部语言标签筛选
- **工具箱**: 所有文件处理在浏览器本地完成，不上传服务器

---

## 安全提醒

- `.env` 文件包含 API Key，已通过 `.gitignore` 排除，不会提交到 Git
- 工作台默认绑定 `127.0.0.1:8888`，仅供本机访问，不会暴露到公网
- 如需部署到公网，建议加 Nginx 反向代理 + 认证层

---

## License

MIT

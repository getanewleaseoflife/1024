# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

「岗位胜任力评估智能体」（AI 面试官）——竞赛项目。用大模型智能体模拟资深 HR/业务专家，对高校毕业生进行多轮情景化面试，自动生成胜任力评估报告（能力雷达图 / 优劣分析 / 岗位匹配度 / 提升建议）。

当前状态：**需求与技术方案已完成，代码尚未开始**。开工前必读下面两份权威文档。

## 权威文档（改动须同步）

- `docs/PRD.md` — 需求规格。含 4 项评审标准（面试逻辑深度 30 / 报告质量 30 / 拟人度 20 / 技术实现 20），所有设计以它倒推。
- `docs/TECH_DESIGN.md` — 技术方案与架构。技术栈 / 架构 / 模块 / 接口 / 数据模型 / 里程碑均在此。

> `docs/ARCHITECTURE.md` 为架构落地视图（派生）；`docs/DESIGN.md` 为 UI/视觉骨架（派生）；`docs/VALIDATION.md` 为验证标准（派生）。三者均**非权威**——架构、设计、验证阈值以上述两份为准。

> 引入新框架 / 新数据库 / 新架构时，必须**同步更新 `PRD.md` + `TECH_DESIGN.md`（权威）**，并**回改派生文档 `ARCHITECTURE.md`（技术栈/数据模型/目录）/ `DESIGN.md`（UI）/ `VALIDATION.md`（阈值/判据）**，不留陈旧描述。

## 技术栈（勿擅自替换）

| 层 | 选型 |
|----|------|
| 前端 | React 18 + Vite + TypeScript + Tailwind + ECharts |
| 后端 | Python 3.10+ / FastAPI |
| 大模型 | DeepSeek（OpenAI 兼容协议，官方 `openai` SDK） |
| RAG 向量库 | Chroma（嵌入式）；嵌入模型 BGE `bge-small-zh-v1.5`（fastembed / ONNX，本地，**无 torch**） |
| 记忆 | 自定义状态机 + SQLite（`tempfile` 临时库） |
| 语音（增强项） | Edge TTS（后端）+ 浏览器 SpeechRecognition |
| 流式 | SSE |

选型原则：零额外付费服务、零额外 key、成熟框架/SDK 优先、长期可维护。依赖用 `requirements.txt` 精确 pin（`openai` / `fastembed` / `chromadb` 尤其要 pin）；国内下模型加 `HF_ENDPOINT=https://hf-mirror.com`。

## 架构大图

```
前端（简历输入/岗位选择/画像/面试对话/报告，i18n 文案资源化 + 会话隔离 + SSE 流式渲染）
   │ REST + SSE
后端 FastAPI（简历解析 / 面试编排器 / 报告生成器 / 语音服务）
   │
核心能力层（追问引擎 · 记忆层 · RAG 服务 · 人格模板 · 评分引擎）
   │
数据层（DeepSeek / SQLite 临时库 / Chroma / BGE 本地嵌入）
```

## 核心设计决策（这些是评审拿分点，勿违背）

1. **追问引擎 = LLM 主导决策 + 状态机硬护栏**。每轮拆两次调用：① 短非流式分类器输出 `{action, reason, evidence{维度/掌握度/原话}, confidence}`（七种 action：澄清/验证/深挖/挑战/迁移/换题/收尾）→ evidence 落到记忆 L3；② 流式生成追问原文。状态机只对硬约束保留否决权（追问上限 / 维度覆盖换题 / 降级结束）。
2. **RAG 三类知识库**：胜任力模型库、岗位知识库、回答证据库。Hybrid RAG = BGE 向量召回 + jieba 中文关键词召回融合。MVP 只手写 **AI 算法岗**一个岗位的种子库（每维度四件套：考核要点 + 典型面试题带参考答案 + 3 档评分锚点 + 关键词/技能标签表，约 60~90 chunk）。Java/产品岗是"换数据"而非"改代码"。
3. **长文本记忆三层，MVP 实现两层**：L1 全量对话不滑窗（20~40 轮，DeepSeek 64k 装得下）；L2 增量摘要**预留不实现**；L3 能力证据累积（随追问分类器同一调用抽取，不新增往返）。面试页侧栏**实时可视化 L3 证据清单**——这是"长文本记忆"的演示证据。
4. **报告评分双轨**：`最终分 = 规则锚点 × 0.6 + LLM 综合 × 0.4`，LLM 单维度调整**封顶 ±1 档**。**证据绑定机械校验**：每个维度分必须绑定候选人原话，`quote` 须与 L3 证据做子串/模糊匹配，LLM 只许引用不许编造；无证据维度不出分、雷达图标「待考察」。
5. **Prompt 注入防护**：候选人回答统一包裹 `<candidate_answer>…</candidate_answer>` 作为数据注入上下文层，系统层规则不可覆盖；证据化评分本身是注入天花板。
6. **数据存储**：简历原文仅进程内存；结构化产物落 `tempfile` 临时 SQLite，会话/演示结束即删。岗位胜任力模型存 JSON/SQLite，**新增岗位零代码**（补数据 + 重嵌入）。

## 框架官方规范（AI 必须遵守）

写码遵守各框架**官方**规范，不引入第三方风格集、不用过时 API；lint/format/type 工具（pre-commit 门禁）拦截偏离。

- **React 18**：只用函数组件 + Hooks；受控组件；列表必配 `key`；不用 class 组件、`UNSAFE_` 生命周期、不直接操作 DOM。
- **TypeScript**：`strict` 开启；禁裸 `any`（用 `unknown` + 类型收窄）；类型导入用 `import type`。
- **FastAPI**：Pydantic **v2**（禁 v1 `@validator`/`Config`）；依赖注入用 `Depends`；错误抛 `HTTPException`；生命周期用 `lifespan`（禁 `@app.on_event`）；响应声明 `response_model`。
- **openai SDK**：只走官方 `client.chat.completions.create(...)`（流式 `stream=True`），**禁止**裸 HTTP 直连 api.deepseek.com。
- **Tailwind**：utility-first，配置走 `tailwind.config`，禁内联 style 堆砌。
- **ECharts**：`setOption` 驱动（或 `echarts-for-react`），禁手动操作 canvas/DOM。
- **Python**：类型标注 + pyright 通过；Ruff 格式/静态检查通过；Pydantic 模型做校验。
- **依赖**：不新增付费/需 key 依赖；新增依赖直接精确 pin 进 `requirements.txt`。

## 常用命令

后端（Windows + Git Bash）：

```bash
cd backend
python -m venv .venv && source .venv/Scripts/activate
pip install -r requirements.txt   # 依赖已精确 pin
uvicorn app.main:app --reload        # http://127.0.0.1:8000

# 代码质量（pre-commit 提交前自动跑，也可手动）
ruff check . && ruff format --check .
pyright app/
```

前端：

```bash
cd frontend
npm install
npm run dev                          # http://127.0.0.1:5173
npm run lint                         # ESLint；npx prettier --check .
```

环境变量 `backend/.env`：

```
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
EMBEDDING_MODEL=BAAI/bge-small-zh-v1.5
HF_ENDPOINT=https://hf-mirror.com
```

## 项目边界

- **P0 核心**：简历解析（粘贴文本）→ 多轮面试（追问引擎 + 3 档人格）→ RAG + 记忆 → 报告（网页）。先 AI 算法岗跑通，再补 Java/产品经理内容。
- **P0 增强**（核心跑通后按剩余时间）：PDF 上传、语音（Edge TTS + ASR）、快速演示模式。
- **后置待定**：视频面试、多语言功能（i18n 已预留）、多用户（会话隔离已预留）。
- **明确不做**：数字人、表情/情感识别、企业端/HR 后台、移动端。

开发里程碑见 `docs/TECH_DESIGN.md` 第 10 节（M1 骨架 → M2 简历解析 → M3 面试核心 → M4 报告 → M5 岗位扩展 → M6 增强项）。

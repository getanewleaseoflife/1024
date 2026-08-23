# 岗位胜任力评估智能体 — 项目架构

> 版本：v0.2（架构稿）
> 日期：2026-08-22
> 配套文档：`docs/PRD.md`（需求）、`docs/TECH_DESIGN.md`（技术方案）
> 维护规范：本文件是对既有设计的**架构落地视图**，不新增决策；任何架构/技术栈/数据模型/边界变更，仍须同步更新 `docs/PRD.md` 与 `docs/TECH_DESIGN.md`。

---

## 1. 文档定位

本文件回答「代码长什么样、怎么组织、数据怎么流」，作为开发时的导航图：

- **读它之前**：先读 `PRD.md`（要做什么）与 `TECH_DESIGN.md`（为什么这么做）。
- **本文增量**：分层职责、建议工程目录结构、模块依赖边界、数据流、AI 引用规则、开发约束、验收标准。
- **冲突时**：以 `PRD.md` + `TECH_DESIGN.md` 为准，并回改本文件。

---

## 2. 架构总览（分层）

```
┌──────────────────────────────────────────────────────────────┐
│                    前端  React 18 + Vite + TS + Tailwind       │
│  简历输入页 · 岗位选择 · 画像展示 · 面试对话页 · 报告页        │
│  i18n 文案资源化 · 会话隔离 · SSE 流式渲染 · 浏览器 ASR        │
└───────────────────────────┬──────────────────────────────────┘
                            │ REST + SSE（/api/*）
┌───────────────────────────▼──────────────────────────────────┐
│                    后端  FastAPI（Python 3.10+）                │
│                                                               │
│   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐       │
│   │ 简历解析 │  │ 面试编排器 │  │ 报告生成器 │  │ 语音服务 │      │
│   └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘       │
│        └────────────┼─────────────┼─────────────┘             │
│  ┌──────────────────▼─────────────▼───────────────────┐       │
│  │               核心能力层（无 HTTP 依赖，纯逻辑）      │       │
│  │  追问引擎 · 记忆层 · RAG服务 · 人格模板 · 评分引擎    │       │
│  └──────┬──────────┬───────────┬──────────┬───────────┘       │
│         │          │           │          │                   │
│  ┌──────▼───┐ ┌────▼─────┐ ┌───▼────┐ ┌───▼───────┐           │
│  │ DeepSeek │ │  SQLite  │ │ Chroma │ │ BGE 嵌入  │           │
│  │  (LLM)   │ │ (记忆/会话)│ │ (向量库)│ │ (本地)    │           │
│  └──────────┘ └──────────┘ └────────┘ └───────────┘           │
└───────────────────────────────────────────────────────────────┘
```

**分层原则（依赖只能向下）**：

| 层 | 职责 | 依赖方向 |
|----|------|---------|
| 前端 | 展示、交互、SSE 渲染 | → 后端 API |
| 后端服务层（api/编排器/报告/语音） | 参数校验、编排、HTTP 边界 | → 核心能力层、服务层 |
| 核心能力层 | 追问决策、记忆、RAG、评分（纯逻辑，可单测） | → 数据层 |
| 数据层 | LLM / SQLite / Chroma / BGE | 无 |

> 核心能力层**不 import FastAPI / HTTP 对象**，保证可用测试与降级 Mock 直接驱动（为「金标测试集」「注入测试集」「预跑缓存回放」留口子）。

---

## 3. 技术栈（简表，详见 TECH_DESIGN §1）

| 层 | 选型 |
|----|------|
| 前端 | React 18 + Vite + TypeScript + Tailwind + ECharts |
| 后端 | Python 3.10+ / FastAPI |
| LLM | DeepSeek（OpenAI 兼容协议，官方 `openai` SDK） |
| RAG | Chroma（嵌入式）+ BGE `bge-small-zh-v1.5`（fastembed / ONNX，本地，无 torch）+ jieba 关键词 |
| 记忆 | 状态机 + SQLite（`tempfile` 临时库） |
| 语音 | Edge TTS + 浏览器 SpeechRecognition |
| 流式 | SSE |

---

## 4. 建议工程目录结构（代码未开始，此为落地约定）

### 4.1 后端 `backend/`

```
backend/
├── app/
│   ├── main.py                # FastAPI 入口：路由注册、CORS、中间件、异常处理
│   ├── config.py              # 配置加载（.env：DeepSeek key/base、嵌入模型、降级开关）
│   ├── api/                   # 路由层（薄，只做参数校验 + 委托编排）
│   │   ├── positions.py       # GET /api/positions
│   │   ├── resume.py          # POST /api/resume/parse
│   │   ├── interview.py       # /api/interview/*（start/answer/stream/end）
│   │   ├── report.py          # /api/report/*
│   │   └── tts.py             # POST /api/tts（增强项）
│   ├── schemas/               # Pydantic 模型：请求/响应 + LLM 结构化输出校验
│   │   ├── resume.py          # 简历画像、能力标签、Gap
│   │   ├── interview.py       # 追问分类器输出 {action, reason, evidence, confidence}
│   │   └── report.py          # 雷达图、评分、建议
│   ├── core/                  # 核心能力层（纯逻辑，不 import HTTP）
│   │   ├── resume_parser.py   # 简历解析：LLM 结构化提取 → 画像 → Gap 规则匹配
│   │   ├── orchestrator.py    # 面试编排器：状态机 + 硬护栏
│   │   ├── followup_engine.py # 追问引擎：两次调用（分类器 + 流式追问）
│   │   ├── memory.py          # 记忆层：L1 全量 + L3 证据累积（SQLite 读写）
│   │   ├── rag.py             # RAG 服务：向量召回 + jieba 关键词融合
│   │   ├── persona.py         # 3 档人格模板
│   │   ├── scoring.py         # 评分引擎：规则锚点 ×0.6 + LLM ×0.4（±1 封顶）
│   │   └── report_generator.py# 报告生成器：评分→雷达图→优劣→建议→STAR
│   ├── services/              # 基础设施/外部服务封装（可被 Mock 替换）
│   │   ├── llm.py             # DeepSeek 客户端：非流式 JSON / 流式（openai SDK）
│   │   ├── embedding.py       # BGE 本地嵌入（fastembed / ONNX）
│   │   ├── vectorstore.py     # Chroma 读写
│   │   ├── db.py              # SQLite（tempfile 临时库）连接与表初始化
│   │   └── tts.py             # Edge TTS
│   └── data/                  # 岗位胜任力模型种子库（数据，非代码）
│       └── positions/
│           └── ai_algorithm/  # AI 算法岗：四件套（考核要点/典型题/评分锚点/关键词表）
├── scripts/                   # 种子库 → 嵌入 → Chroma 的一次性构建脚本
├── tests/                     # 金标测试集（追问分类）、注入测试集、模块单测
├── requirements.txt           # 精确 pin（openai / fastembed / chromadb 尤其要 pin）
├── pyproject.toml             # Ruff 配置
├── pyrightconfig.json         # pyright 配置
├── .pre-commit-config.yaml    # pre-commit 门禁
└── .env                       # 不入库（.gitignore）
```

### 4.2 前端 `frontend/`

```
frontend/
├── src/
│   ├── main.tsx / App.tsx     # 入口 + 路由
│   ├── api/                   # REST + SSE 客户端封装（含流式解析）
│   ├── pages/                 # 简历输入 · 岗位选择 · 画像 · 面试 · 报告
│   ├── components/            # 面试对话流、L3 证据侧栏、雷达图、评分卡、Gap 标签
│   ├── store/                 # 会话状态（按 session_id 隔离）
│   ├── i18n/                  # 文案资源化（预留多语言）
│   └── styles/                # Tailwind + 设计 token
├── package.json
└── vite.config.ts             # dev proxy → http://127.0.0.1:8000
```

---

## 5. 核心模块职责与依赖

| 模块 | 归属层 | 关键职责 | 主要依赖 |
|------|--------|---------|---------|
| 简历解析器 `resume_parser` | 核心 | 粘贴文本 → LLM 结构化提取 → 画像标签 → 与岗位关键词表规则匹配出 Gap | llm、position 数据 |
| 面试编排器 `orchestrator` | 服务 | 状态机推进；对硬约束（追问上限/换题/降级结束）行使否决权 | followup_engine、memory、rag、persona |
| 追问引擎 `followup_engine` | 核心 | 每轮两次调用：① 非流式分类器 `{action,reason,evidence,confidence}` → L3；② 流式追问原文 | llm、memory、rag、schemas |
| 记忆层 `memory` | 核心 | L1 全量对话（不滑窗）+ L3 证据累积；侧栏可视化数据源 | db |
| RAG 服务 `rag` | 核心 | 三类知识库检索；Hybrid = BGE 向量 + jieba 关键词融合 | embedding、vectorstore、position 数据 |
| 人格模板 `persona` | 核心 | 3 档人格（随和/严谨/压力）的系统提示与措辞风格 | 无 |
| 评分引擎 `scoring` | 核心 | 规则锚点 ×0.6 + LLM ×0.4，单维度 ±1 封顶；证据绑定机械校验 | memory、llm |
| 报告生成器 `report_generator` | 服务 | 编排评分→雷达图→优劣→匹配度→建议→STAR 并组装落库 | scoring、memory、rag |
| 语音服务 `tts` | 服务 | Edge TTS 播报（增强项，失败不阻断主链路） | services/tts |

---

## 6. 关键运行时序

### 6.1 简历解析 → 画像 + Gap

```
前端粘贴简历 ──POST /api/resume/parse──▶ 简历解析器
  简历解析器 ──LLM 结构化提取──▶ {教育,技能,项目,经历}（Pydantic 校验）
  简历解析器 ──归纳──▶ 能力标签
  能力标签 ──规则匹配──▶ 岗位「关键词/技能标签表」──▶ Gap{已具备/待考察/缺失}
  Gap 返回前端展示，并作为后续出题顺序上游（待考察 > 缺失 > 已具备）
```

### 6.2 单轮面试追问（SSE 流式，核心链路）

```
前端提交回答 ──POST /api/interview/answer──▶ 面试编排器
  编排器 ──▶ 追问引擎：调用① 非流式分类器
             └─ 输出 {action, reason, evidence{维度/掌握度/原话}, confidence}
             └─ evidence ──▶ 记忆层 L3（ability_evidence 累积）
  编排器 ──状态机硬护栏校验──▶ 允许追问/换题/降级/收尾
  追问引擎：调用② 流式生成追问原文 ──SSE──▶ 前端打字机渲染
  前端侧栏 ──实时刷新 L3 证据清单（维度 + 掌握度 + 原话）
```

> 关键：分类器（调用①）与追问原文（调用②）分离，兼顾「结构化决策可校验」与「流式打字机体验」；`evidence` 随调用①同次抽取，不新增往返。

### 6.3 报告生成（证据化双轨评分）

```
前端 ──POST /api/report/generate──▶ 报告生成器
  报告生成器 ──汇总 L3 ability_evidence（按维度聚合）
  ├─ 规则评分：按「评分锚点」对证据打分 ×0.6
  ├─ LLM 评分：综合判断 ×0.4（单维度调整封顶 ±1）
  └─ 证据绑定机械校验：quote 须与 L3 原话子串/模糊匹配（只许引用，不许编造）
  无证据维度 ──▶ 不出分，雷达图标记「待考察」
  组装：雷达图数据 + 优劣分析 + 匹配度 + 建议 + STAR ──▶ 落库 report ──▶ 返回
```

---

## 7. 数据流（端到端）

### 7.1 数据存放位置（回答「数据放哪、活多久」）

| 数据 | 存储位置 | 生命周期 | 备注 |
|------|---------|---------|------|
| 简历原文 | 进程内存 | 会话内 | 不写持久文件（隐私） |
| 能力画像 + Gap | 进程内存 / 会话上下文 | 会话内 | 出题顺序上游 |
| 岗位胜任力模型 / 锚点 / 关键词表 | JSON / SQLite（只读） | 长期 | 可配置数据，新增岗位补数据 |
| 对话记录 `question_record` | SQLite（tempfile） | 会话内，结束即删 | L1 全量对话 |
| 能力证据 `ability_evidence` | SQLite（tempfile） | 会话内，结束即删 | L3，报告评分依据 |
| 向量块（三类知识库） | Chroma（本地持久） | 长期 | 胜任力/岗位知识为种子库，回答证据动态写入 |
| 报告 `report` | SQLite（tempfile） | 会话内，结束即删 | 演示期间可查询 |

### 7.2 端到端数据流

```
简历文本 ─▶ 解析器 ─▶ 画像/标签 ─▶ Gap ─▶ [画像/会话上下文]
                                              │
岗位模型(JSON) ─▶ RAG 嵌入 ─▶ [Chroma] ◀─ 检索 ─▶ 出题/追问上下文
                                              │
候选人回答 ─▶ 分类器 ─▶ evidence ─▶ [ability_evidence L3] ─▶ 侧栏可视化
      │                                              │
      └─ question ─▶ [question_record L1]            │
                                              │
回答原文 ─▶ Hybrid RAG 检索 ─▶ LLM 追问/降级/换题 ─▶ SSE ─▶ 前端
                                              │
L3 证据 ─▶ 报告生成器 ─▶ 评分(双轨+引用校验) ─▶ [report] ─▶ 报告页
```

> 口诀：**简历与画像在内存、对话与证据在 tempfile 库、知识与向量在 Chroma/JSON、报告落 tempfile 库供展示**。会话结束，内存与 tempfile 一并清空；Chroma 中的胜任力/岗位知识库为静态种子，跨会话保留。

---

## 8. 数据模型（SQLite `tempfile` 临时库，结束即删）

```
position（岗位）: id, name, competency_model(JSON)
competency_dimension（胜任力维度）: id, position_id, name, weight, rubric(评分锚点), keywords(关键词/技能标签)
interview_session（会话）: id, position_id, persona, resume_text, status, created_at
question_record（问答）: id, session_id, seq, dimension_id, question, answer, action, score
ability_evidence（证据）: id, session_id, dimension_id, level, quote, created_at
report（报告）: id, session_id, radar_data(JSON), strengths, weaknesses, match_score, suggestions
```

- **进程内存**：简历原文（不写持久文件）。
- **可配置数据**：胜任力模型 / 评分锚点 / 典型题 / 关键词标签 → JSON/SQLite，**新增岗位零代码**（补数据 + 重嵌入）。
- **表关系**：`position 1─N dimension`；`session 1─N question_record / ability_evidence`；`session 1─1 report`。

---

## 9. 接口契约（REST + SSE）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/positions` | 岗位列表（3 个） |
| POST | `/api/resume/parse` | 简历解析（文本/PDF）→ 画像 + Gap |
| POST | `/api/interview/start` | 创建会话，返回开场白（流式） |
| POST | `/api/interview/answer` | 提交回答，返回追问（SSE 流式） |
| GET  | `/api/interview/stream` | 面试流式输出（SSE） |
| POST | `/api/interview/end` | 结束面试 |
| POST | `/api/report/generate` | 生成报告 |
| GET  | `/api/report/{id}` | 获取报告 |
| POST | `/api/tts` | 文字转语音（增强项） |

SSE 流式格式：

```
data: {"type":"delta","content":"你刚才提到的"}\n\n
data: {"type":"done"}\n\n
```

---

## 10. 状态机

```
IDLE → OPENING(开场) → ASK(提问) → WAIT(等回答)
   → CLASSIFY(回答分类) → FOLLOW_UP(追问) | DIG_DOWN(降级) | NEXT_TOPIC(换题)
   → CLOSING(收尾) → REPORT(生成报告)
```

硬护栏（状态机否决 LLM 决策）：每题追问 ≤3 次 / 维度覆盖换题 / 累计基础题失误达阈值提前结束 / 满足结束三条件（维度覆盖完成、累计失误达阈值、题量上限）之一即收束。

---

## 11. AI 引用规则（证据化评分）

> 这是「报告质量 30 分」与「防注入」的核心，落地于 `scoring` 引擎，**不可绕过**。

1. **评分必绑定原话**：每个维度分必须引用候选人真实回答原文（`quote`）作为依据，客观可审计。
2. **机械校验（不许编造）**：`quote` 须与 L3 `ability_evidence.quote` 做子串/模糊匹配；LLM **只许挑选并原样引用，不许改写、拼接或编造**。
3. **无证据不出分**：某维度无对应证据 → 不出分，雷达图该维度标记「待考察」。
4. **双轨封顶**：`最终分 = 规则锚点 × 0.6 + LLM 综合 × 0.4`，LLM 单维度调整**封顶 ±1 档**（防 LLM 拍脑袋）。
5. **注入防护联动**：候选人回答统一包裹 `<candidate_answer>…</candidate_answer>` 注入「上下文层」，系统层规则不可覆盖；证据化评分（规则 0.6 + LLM ±1 封顶）本身即注入天花板。
6. **失败处理**：引用不存在的原话 → 该维度降级/不出分，并计入注入拦截统计；用注入测试集量化拦截率。

---

## 12. 开发约束

### 12.1 硬约束（勿违背）

- **技术栈不得擅自替换**：前端 React18+Vite+TS+Tailwind+ECharts；后端 FastAPI；DeepSeek（openai SDK）；Chroma+BGE（fastembed / ONNX）；SQLite tempfile；SSE。
- **零额外付费服务、零额外 key**。
- **依赖锁定**：`requirements.txt` 精确 pin（`openai` / `fastembed` / `chromadb` 尤其要 pin）；国内下模型设 `HF_ENDPOINT=https://hf-mirror.com`。
- **框架官方规范**：见 `CLAUDE.md`「框架官方规范」章节（React Hooks / TS strict / Pydantic v2 / openai SDK / Ruff+pyright+ESLint+Prettier 门禁）。
- **Key 隔离**：DeepSeek key 仅后端 `.env`（`.gitignore`），前端零接触。
- **隐私即清**：简历原文仅进程内存；结构化产物落 `tempfile` 临时 SQLite，会话/演示结束即删。
- **新增岗位零代码**：补岗位模型数据 + 重嵌入，不改代码。

### 12.2 环境与边界

- 运行环境 Windows 11，Python 3.10+；P0 本地运行（不强制 Docker）。
- P0 单会话；**预留** i18n 文案资源化、会话隔离（P1 加账号）。
- 明确不做：数字人 / 表情情感识别 / 企业端后台 / 移动端。

### 12.3 文档同步（硬规定）

- 架构 / 技术栈 / 数据模型 / 边界变更 → **同步更新 `PRD.md` + `TECH_DESIGN.md`**（两份文件头部均写明），并回改本文件。

---

## 13. 验收标准

### 13.1 顶层评审标准（所有设计倒推来源）

| 评审项 | 分值 |
|--------|------|
| 面试逻辑深度 | 30 |
| 评估报告质量 | 30 |
| 智能体拟人度 | 20 |
| 技术实现 | 20 |

### 13.2 分模块验收

**简历解析模块**

- [ ] 粘贴文本后正确提取教育 / 技能 / 项目 / 经历四类信息
- [ ] 能力标签准确率人工抽查 ≥ 80%
- [ ] 输出「已具备 / 待考察 / 缺失」Gap 分析

**面试模块**

- [ ] 基于岗位胜任力模型出题（非随机题库）
- [ ] 能执行至少 3 种不同追问动作
- [ ] 答不上时能降级提问
- [ ] 3 档人格语气差异明显
- [ ] 追问能引用候选人原话

**报告模块**

- [ ] 生成岗位专属多维雷达图
- [ ] 评分附候选人原话证据
- [ ] 提升建议具体可执行（非空话）
- [ ] 包含匹配度评分 + 优劣分析

**技术实现**

- [ ] 追问/出题接入 RAG 检索（胜任力模型 + 岗位知识库）
- [ ] 实现长文本记忆（上下文管理 + 能力证据累积）
- [ ] 长对话不丢失关键上下文
- [ ] 金标测试集验证追问分类一致率
- [ ] 注入测试集验证防注入拦截
- [ ] 记忆可视化侧栏展示 L3 证据累积

---

## 14. 安全与降级（要点，详见 TECH_DESIGN §6/§9）

- **Prompt 注入**：见 §11 第 5/6 条（数据包裹 + 证据化评分天花板）。
- **Key/隐私**：Key 仅后端 `.env`（`.gitignore`）；简历原文仅进程内存，结构化产物落 `tempfile` 临时库即清。
- **降级链**（DeepSeek 不可用）：重试（指数退避）→ 预跑缓存回放（真实 LLM 输出）→ 薄 Mock 兜底（模板追问 + 规则报告，仅保「不断流」）；降级开关环境变量化。
- **语音/嵌入异常**：均不影响主链路（语音退回文字；嵌入失败退纯关键词检索）。
- **接口滥用**：基础限流 + 请求体大小限制。

---

*本文件为架构落地视图，随 `PRD.md` / `TECH_DESIGN.md` 演进；落地开发（M1 起）时据此搭建目录与模块边界。*

# SkillForge

> SkillForge 是一个面向 AI Agent Skill 开发的本地优先桌面 IDE。

[English](README.md)

**状态：** MVP 本地桌面工作流已实现

SkillForge 聚焦 Agent Skill 的创建、编辑、验证、运行和打包，面向 Claude Skills、OpenAI Agent Skills、Codex Skills、Cursor Rules、MCP Tool Skills 以及自定义 Agent 框架等生态。

## 项目定位

SkillForge 的目标是成为 AI Agent Skill 的开发工作台：用 IDE 式界面管理 Skill 项目，降低手写 YAML frontmatter、Markdown prompt、脚本和目录结构时的出错成本。

当前项目以本地优先为核心，不依赖云端服务完成 MVP 编辑流程。文件访问、脚本执行、导入导出等能力通过 Tauri/Rust 边界承载；编辑器、资源管理器、预览、验证和运行反馈由 React 前端呈现。

## 当前能力

当前仓库已经包含 MVP 本地桌面工作流：

- Tauri v2 桌面应用骨架
- React + TypeScript 前端
- 组件化 IDE 工作区界面，包括资源管理器、编辑器、元数据、校验、运行时和导入导出面板
- 通过 Tauri commands 驱动的本地 Skill 文件夹工作流
- `pnpm dev` 下的浏览器 demo fallback
- Skill 创建、列表、按文件夹路径打开、读取和当前文件保存
- 脏文件标记，以及在替换工作区、运行脚本、导出旧磁盘内容前的保护
- `SKILL.md` frontmatter 解析与更新
- 确定性的文档与工作区校验，覆盖 frontmatter、元数据、正文长度、受管路径和脚本扩展名
- 标准 Skill 文件读取范围控制
- 安全脚本运行：仅允许 `scripts/` 下 `.js` 和 `.py`，捕获 stdout、stderr、退出状态、耗时、超时，并在 Windows 上清理进程树
- 清除阻塞性校验错误后的 Skill zip 导出
- 主题与多语言相关代码
- Vitest 测试和针对安全 helper 的 Rust 单元测试

## 规划能力

以下能力属于后续路线图，不代表当前已经完整实现：

- Skill Simulator
- AI Generator
- Skill Search
- Marketplace
- Workflow Graph
- Cloud Sync
- SQLite 持久化和迁移体系
- Tantivy 或 MiniSearch 搜索实现
- 桌面端分发、签名和安装包发布流程

## 技术栈

| 层 | 技术 |
| --- | --- |
| 桌面壳 | Tauri v2 |
| 前端 | React + TypeScript |
| 构建工具 | Vite |
| 编辑器 | Monaco Editor |
| 图标 | lucide-react |
| 打包导出 | jszip / Rust zip |
| 后端能力 | Rust + Tauri commands |
| 测试 | Vitest |

PRD 中的目标技术还包括 shadcn/ui、TailwindCSS、Zustand、react-arborist、react-markdown、xterm.js、SQLite、Tantivy 或 MiniSearch。它们应按 MVP 需要逐步接入。

## 快速开始

准备环境：

- Node.js
- pnpm
- Rust toolchain
- Tauri v2 系统依赖

安装依赖：

```bash
pnpm install
```

启动前端开发服务器：

```bash
pnpm dev
```

启动 Tauri 桌面开发环境：

```bash
pnpm tauri:dev
```

构建前端：

```bash
pnpm build
```

构建桌面应用：

```bash
pnpm tauri:build
```

运行测试：

```bash
pnpm test
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动 Vite 开发服务器 |
| `pnpm build` | 执行 TypeScript 检查并构建前端 |
| `pnpm preview` | 预览 Vite 构建产物 |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm tauri` | 调用 Tauri CLI |
| `pnpm tauri:dev` | 启动 Tauri 桌面开发模式 |
| `pnpm tauri:build` | 构建 Tauri 桌面应用 |

## 项目结构

```text
SkillForge/
|-- src/                         # React application
|   |-- App.tsx                   # Main IDE workspace UI
|   |-- main.tsx                  # React entry
|   |-- styles.css                # Application styles
|   |-- types.ts                  # Shared frontend types
|   `-- lib/                      # Skill parsing, validation, i18n, theme, Tauri adapters
|-- src-tauri/                    # Rust/Tauri backend
|   |-- src/lib.rs                # Tauri commands and backend Skill operations
|   |-- src/main.rs               # Tauri entry
|   |-- Cargo.toml
|   `-- tauri.conf.json
|-- docs/superpowers/             # Design specs and implementation plans
|-- PRD.md                        # Product requirements
|-- AGENTS.md                     # Repository instructions for agents
|-- package.json
|-- pnpm-lock.yaml
`-- vite.config.ts
```

## Skill 数据模型

初始 Skill 合约来自 PRD，并需要与 React 类型、Tauri command payload 和未来 SQLite schema 保持同步：

```ts
interface Skill {
  id: string
  name: string
  description: string
  version: string
  compatibility: string[]
  tags: string[]
  path: string
  createdAt: string
  updatedAt: string
}

interface SkillExecution {
  id: string
  skillId: string
  input: string
  stdout: string
  stderr: string
  output: string
  logs: string[]
  duration: number
  status: 'success' | 'failed'
  timedOut?: boolean
}
```

## 验证范围

Skill 验证应优先保持确定性，再逐步加入辅助能力。目标验证范围包括：

- 必需的 `SKILL.md`
- 支持的可选目录：`scripts/`、`references/`、`assets/`、`tests/`
- YAML frontmatter 语法和必填字段
- Markdown prompt 结构
- compatibility 和 tags 约束
- 脚本路径与运行安全检查

当前实现已经覆盖文档级校验、后端工作区校验、受管路径过滤、不支持脚本扩展名检查，以及存在阻塞性校验错误时禁止导出。

## 开发原则

- 构建实际 IDE 工作区，不做营销落地页。
- 本地优先；MVP 编辑路径不耦合云同步和市场能力。
- 文件系统、进程执行、SQLite 和 OS 集成放在 Tauri/Rust 边界。
- React 负责编辑器、资源管理器、预览、验证 UI 和终端 UI。
- Skill 解析和验证优先保持确定性。
- 避免静默降级；验证和运行错误应在 UI 中明确呈现。
- 对 parser、validator、runtime 和 persistence 增加聚焦测试。

## 路线图

| 阶段 | 重点 |
| --- | --- |
| MVP | Skill Explorer、Skill Editor、YAML metadata form、Markdown editor、Skill Validator、Script Runtime、Import/Export |
| Next | Skill Simulator、搜索、SQLite 持久化、更多 Skill 规范兼容 |
| Later | AI Generator、Marketplace、Workflow Graph、Cloud Sync、分发签名 |

## 参与贡献

贡献前建议先阅读：

- `PRD.md`
- `AGENTS.md`
- `src/lib/skill.ts`
- `src-tauri/src/lib.rs`

提交变更时请保持范围聚焦。不要在 MVP 本地编辑路径中引入云同步、市场或 AI 生成依赖，除非任务明确要求。

## 许可证

本项目使用仓库中的 `LICENSE` 文件声明的许可证。

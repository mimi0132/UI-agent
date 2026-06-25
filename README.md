# Vue UI Agent

从 UI 截图一键生成完整前端组件库。支持 Vue 3 / React 双框架，自动适配 Cursor、Claude Code、Codex 等主流 AI 编程工具。

## 特性

- **整张截图 → 整套组件库**：自动推导 Design Token，生成 Button、Input、Card、Badge、Avatar、Tooltip 等高复用组件
- **双框架输出**：Vue 3 (`<script setup lang="ts">`) / React (Function Component + TypeScript)
- **多 AI 自动适配**：只需配置一个环境变量，自动使用 Gemini / GPT / Claude / DeepSeek / 通义千问
- **一键安装**：一条命令，自动适配所有 Agent 环境
- **零业务耦合**：纯视觉还原，不引入任何第三方 UI 库
- **浏览器预览**：生成后自动打开预览页面

## 安装（推荐方式）

### 一键安装（支持 Cursor / Claude Code / Codex）

```bash
npx skills add mimi0132/vue-ui-agent
```

Vercel `skills` CLI 会自动检测你的 Agent 环境（Cursor / Claude Code / Codex），把技能文件安装到对应目录。

支持的 Agent：

| Agent | 安装位置 |
|-------|---------|
| Claude Code | `~/.claude/skills/` |
| Cursor | `~/.agents/skills/` |
| Codex | `~/.agents/skills/` |

### 也支持直接粘贴 URL

不想安装？在聊天框中粘贴这个即可：

```
Read https://github.com/mimi0132/vue-ui-agent/tree/main/skills/vue-ui-agent/SKILL.md
```

Agent 会自动读取 SKILL.md 并按照规范工作。

---

## 使用方式

安装后，直接在 Agent 聊天框中说：

```
根据这张截图帮我生成 Vue 3 组件库
```

或

```
用 React 帮我实现这套 UI 组件
```

Agent 会自动完成：分析截图 → 提取设计 Token → 生成组件 → 写入文件 → 打开预览。

---

## 环境变量配置

设置以下环境变量之一（**三选一**，不需要全配）：

```bash
# Google Gemini（推荐，免费额度高）
export GEMINI_API_KEY="AIza..."

# OpenAI / GPT / DeepSeek / 通义千问
export OPENAI_API_KEY="sk-..."
# 如用 DeepSeek：
export OPENAI_BASE_URL="https://api.deepseek.com/v1"

# Anthropic Claude
export ANTHROPIC_API_KEY="sk-ant-..."
```

**优先级**：`OPENAI_API_KEY` > `ANTHROPIC_API_KEY` > `GEMINI_API_KEY`

---

## 生成示例

```
用户：帮我根据这张图生成 Vue 3 组件库

Agent：
✅ 开始分析截图，提取 Design Token...
📦 正在生成组件库（共 10 个组件）...
   📄 Button.vue
   📄 Input.vue
   📄 Card.vue
   📄 Badge.vue
   📄 Avatar.vue
   📄 Divider.vue
   📄 Tooltip.vue
   📄 Modal.vue
   📄 Select.vue
   📄 Switch.vue
🌐 预览已打开：http://localhost:3456
```

---

## 生成的组件结构

每个组件包含：

- **完整变体**：primary / secondary / ghost / outline / danger
- **多尺寸**：sm / md / lg
- **全状态**：default / hover / active / focus / disabled / loading
- **CSS 变量**：通过 `--ui-color-primary` 等变量统一设计 Token
- **Slots**：icon / prefix / suffix / header / footer
- **无障碍**：aria 属性、role、键盘导航

---

## 项目结构

```
vue-ui-agent/
├── skills/
│   └── vue-ui-agent/
│       ├── SKILL.md                    # 入口文件（Agent 读取这个）
│       └── references/
│           ├── system-prompt.md        # 核心设计规范 + 代码模板
│           ├── claude-code.md          # Claude Code 工具映射
│           └── cursor.md               # Cursor 工具映射
├── src/
│   ├── cli.js                          # 命令行入口（独立使用）
│   ├── core.js                         # AI 调用核心逻辑
│   ├── preview.js                      # 浏览器预览引擎
│   ├── prompt.js                       # 系统提示词
│   └── providers/                      # AI Provider 适配器
│       ├── gemini.js
│       ├── openai.js
│       └── claude.js
├── package.json
└── README.md
```

---

## 命令行独立使用

不需要 Agent 环境时，也可以直接用命令行：

```bash
# 安装 CLI
npm install -g vue-ui-agent

# 执行
vue-ui-agent ./screenshot.png --framework vue --output ./src/components/ui
```

---

## 常见问题

### 1. npx skills 提示找不到命令

```bash
npm install -g @skills/cli
# 或
npx @skills/cli add mimi0132/vue-ui-agent
```

### 2. 提示 "未检测到 AI 服务配置"

```bash
echo $OPENAI_API_KEY   # 确认环境变量已设置
```

### 3. 生成的文件为空

建议换用更强的模型：Claude Opus 4.8 / GPT-4o / Gemini 2.5 Flash

### 4. 如何更新到最新版本？

```bash
npx skills update mimi0132/vue-ui-agent
```

---

## License

ISC

# Vue UI Agent

从 UI 截图一键生成完整前端组件库的工具。支持 Vue 3 / React 双框架，自动兼容 Gemini、GPT、Claude、DeepSeek 等主流 AI 模型。

## 特性

- **整张截图 → 整套组件**：不是只生成一个按钮，而是自动推导出一整套设计系统（Button、Input、Card、Badge、Avatar、Tooltip 等）
- **双框架输出**：Vue 3 (`<script setup lang="ts">`) / React (Function Component + TypeScript)
- **多 AI 自动适配**：只需配一个环境变量，自动检测并使用 Gemini / GPT / Claude / DeepSeek / 通义千问 / Ollama
- **高复用设计**：每个组件自带 Props、Slots、CSS 变量，完全可配置
- **零业务耦合**：纯视觉还原，不引入任何业务逻辑或第三方 UI 库
- **浏览器预览**：生成后自动打开预览页面，实时查看组件效果
- **一键安装**：`npm install -g` 后自动配置 Claude MCP，无需手动编辑配置文件

## 快速开始（推荐）

### 1. 安装并自动配置

```bash
npm install -g vue-ui-agent
```

安装完成后，脚本会自动：
- 检测全局安装路径
- 写入 Claude Desktop MCP 配置
- 提示是否配置了 AI Key

### 2. 配置 AI Key

设置以下环境变量之一：

```bash
# Google Gemini
export GEMINI_API_KEY="AIza..."

# OpenAI / GPT / DeepSeek / 通义千问
export OPENAI_API_KEY="sk-..."
# 可选：export OPENAI_BASE_URL="https://api.deepseek.com/v1"

# Anthropic Claude
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. 重启 Claude Desktop

重启后，在 Claude 聊天框中：
1. 拖入一张 UI 截图
2. 说："帮我生成这套 UI 的组件，用 Vue 3"
3. AI 自动调用工具，生成文件，并返回预览链接

---

## 使用方式一：命令行直接运行

不需要配置 MCP，直接传图片路径即可。

```bash
# 1. 先配置你的 AI Key（三选一）
export GEMINI_API_KEY="AIza..."
# 或
export OPENAI_API_KEY="sk-..."
# 或
export ANTHROPIC_API_KEY="sk-ant-..."

# 2. 执行命令
vue-ui-agent ./screenshot.png --framework vue --output ./src/components/generated

# 完整参数
vue-ui-agent <图片路径> \
  --framework vue    # vue 或 react，默认 vue
  --output ./src/components/generated  # 输出目录
  --no-preview       # 不自动打开浏览器预览
```

---

## 使用方式二：手动配置 MCP（Trae / Cursor / Claude Desktop）

如果自动安装失败，可以手动配置。

### 配置步骤

#### 1. 安装

```bash
npm install -g vue-ui-agent
```

#### 2. 在 IDE 中配置 MCP Server

以 **Claude Desktop** 为例：

打开 `Claude Desktop` → 设置 → MCP → 添加自定义 Server，粘贴以下内容：

```json
{
  "mcpServers": {
    "vue-ui-agent": {
      "command": "node",
      "args": ["<你的全局 node_modules 路径>/vue-ui-agent/src/index.js"],
      "env": {
        "GEMINI_API_KEY": "AIza...",
        "OPENAI_API_KEY": "sk-...",
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

> **环境变量三选一即可**，工具会自动检测优先级：OpenAI → Claude → Gemini

找不到全局路径？运行：

```bash
npm root -g
```

#### 3. 使用

在 Claude 聊天框中：

1. 拖入一张 UI 截图
2. 说："帮我生成这套 UI 的组件，用 Vue 3"
3. AI 自动调用工具，生成文件，输出结果如下：

```
✅ Vue 3 组件库已成功生成！

🤖 使用模型: GPT (gpt-4o)
📦 共 8 个组件：
   📄 Button.vue
   📄 Input.vue
   📄 Card.vue
   📄 Badge.vue
   📄 Avatar.vue
   📄 Divider.vue
   📄 Tooltip.vue
   📄 Modal.vue

📁 输出目录: /Users/xxx/project/src/components/generated/
⏱️  耗时: 4.2s

🌐 预览地址: http://127.0.0.1:3456
```

---

## AI 环境变量配置

### Google Gemini

```bash
export GEMINI_API_KEY="AIza..."
# 可选：export GEMINI_MODEL="gemini-2.5-flash"  # 默认 gemini-2.5-flash
```

### OpenAI / GPT

```bash
export OPENAI_API_KEY="sk-..."
# 可选：export OPENAI_MODEL="gpt-4o"  # 默认 gpt-4o
```

### DeepSeek

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://api.deepseek.com/v1"
export OPENAI_MODEL="deepseek-chat"
```

### 通义千问

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export OPENAI_MODEL="qwen-plus"
```

### Anthropic Claude

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
# 可选：export CLAUDE_MODEL="claude-sonnet-4-20250514"  # 默认 claude-sonnet-4-20250514
```

### Ollama（本地模型）

```bash
export OPENAI_API_KEY="ollama"
export OPENAI_BASE_URL="http://localhost:11434/v1"
export OPENAI_MODEL="llama3.2-vision"
```

---

## 生成的组件结构

每个组件自动包含：

- **完整变体**：primary / secondary / ghost / outline / danger
- **多尺寸**：sm / md / lg
- **全状态**：default / hover / active / focus / disabled / loading
- **CSS 变量**：通过 `--ui-color-primary` 等变量统一设计 Token
- **无障碍**：aria 属性、role、键盘导航

---

## 项目结构

```
src/
├── index.js           # MCP Server 入口（主程序）
├── cli.js             # 命令行入口
├── core.js            # 核心生成逻辑（AI 调用 + 解析 + 写入）
├── preview.js         # 浏览器预览引擎
├── prompt.js          # 系统提示词（整套组件库生成逻辑）
└── providers/
    ├── gemini.js      # Google Gemini 适配器
    ├── openai.js      # OpenAI / DeepSeek / 通义 / Ollama 适配器
    └── claude.js      # Anthropic Claude 适配器
scripts/
├── install-mcp.js     # 自动 MCP 配置脚本（postinstall 钩子）
└── uninstall-mcp.js   # MCP 配置清理脚本
```

---

## 卸载

```bash
npm uninstall -g vue-ui-agent
```

卸载时会自动清理 MCP 配置。

---

## 常见问题

### 1. 提示 "未检测到任何 AI 服务配置"

检查你的环境变量是否 export 成功：

```bash
echo $OPENAI_API_KEY
echo $GEMINI_API_KEY
echo $ANTHROPIC_API_KEY
```

### 2. 生成的文件为空或解析失败

- 检查 API Key 是否有效（余额是否充足）
- 部分免费模型（如 Ollama 本地小模型）可能无法处理多文件输出，建议换用 gpt-4o 或 gemini-2.5-flash

### 3. 自动 MCP 配置失败

手动运行配置脚本：

```bash
node scripts/install-mcp.js
```

### 4. 如何切换 AI 模型？

修改对应的环境变量即可，无需修改代码。优先级：`OPENAI` > `ANTHROPIC` > `GEMINI`。

---

## License

ISC
# Vue UI Agent

从 UI 截图一键生成完整前端组件库的工具。支持 Vue 3 / React 双框架，自动兼容 Gemini、GPT、Claude、DeepSeek 等主流 AI 模型。

## 特性

- **整张截图 → 整套组件**：不是只生成一个按钮，而是自动推导出一整套设计系统（Button、Input、Card、Badge、Avatar、Tooltip 等）
- **双框架输出**：Vue 3 (`<script setup lang="ts">`) / React (Function Component + TypeScript)
- **多 AI 自动适配**：只需配一个环境变量，自动检测并使用 Gemini / GPT / Claude / DeepSeek / 通义千问 / Ollama
- **高复用设计**：每个组件自带 Props、Slots、CSS 变量，完全可配置
- **零业务耦合**：纯视觉还原，不引入任何业务逻辑或第三方 UI 库

## 安装

```bash
# 全局安装
npm install -g vue-ui-agent

# 或在项目本地安装
npm install vue-ui-agent
```

## 使用方式一：命令行直接运行

不需要配置 MCP，直接传图片路径即可。

```bash
# 1. 先配置你的 AI Key（三选一）
export GEMINI_API_KEY="AIza..."
# 或
export OPENAI_API_KEY="sk-..."
# 或
export ANTHROPIC_API_KEY="sk-ant-..."

# 2a. 从本地图片生成
vue-ui-agent ./screenshot.png --framework vue --output ./src/components/generated

# 2b. 从网页 URL 生成（自动打开浏览器截图）
vue-ui-agent https://dribbble.com/shots/xxx --url --framework vue

# 完整参数
vue-ui-agent <图片路径|URL> \
  --framework vue    # vue 或 react，默认 vue
  --output ./src/components/generated  # 输出目录
  --url              # 指定输入为 URL（自动浏览器截图）
  --viewport 1920x1080  # 截图视口尺寸
  --full-page        # 截图整个页面（默认开启）
```

## 使用方式二：作为 MCP 工具（推荐，Trae / Cursor / Claude Desktop）

在 IDE 聊天框里直接拖图使用，AI 自动创建文件。

### 配置步骤

#### 1. 安装

```bash
npm install -g vue-ui-agent
```

#### 2. 在 IDE 中配置 MCP Server

以 **Trae** 为例：

打开 `Trae` → 设置 → MCP → 添加自定义 Server，粘贴以下内容：

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

在 Trae 聊天框中：

**方式 A：拖图生成**
1. 拖入一张 UI 截图
2. 说："帮我生成这套 UI 的组件，用 Vue 3"

**方式 B：输入 URL 生成**
1. 直接说："帮我打开 https://dribbble.com/shots/xxx 这个网页，截图后生成 Vue 3 组件"
2. AI 自动调用工具，先浏览器截图，再分析生成组件

输出结果如下：

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
```

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

## 生成的组件结构

每个组件自动包含：

- **完整变体**：primary / secondary / ghost / outline / danger
- **多尺寸**：sm / md / lg
- **全状态**：default / hover / active / focus / disabled / loading
- **CSS 变量**：通过 `--ui-color-primary` 等变量统一设计 Token
- **无障碍**：aria 属性、role、键盘导航

## 项目结构

```
src/
├── index.js           # MCP Server 入口（主程序）
├── prompt.js          # 系统提示词（整套组件库生成逻辑）
└── providers/
    ├── gemini.js      # Google Gemini 适配器
    ├── openai.js      # OpenAI / DeepSeek / 通义 / Ollama 适配器
    └── claude.js      # Anthropic Claude 适配器
```

## 常见问题

### 1. 提示 "未检测到任何 AI 服务配置"

检查你的环境变量是否 export 成功：

```bash
echo $OPENAI_API_KEY
echo $GEMINI_API_KEY
echo $ANTHROPIC_API_KEY
```

### 2. 浏览器截图失败（Playwright）

首次使用 URL 截图功能时，需要安装 Playwright 浏览器：

```bash
npx playwright install chromium
```

### 3. 生成的文件为空或解析失败

- 检查 API Key 是否有效（余额是否充足）
- 部分免费模型（如 Ollama 本地小模型）可能无法处理多文件输出，建议换用 gpt-4o 或 gemini-2.5-flash

### 4. 如何切换 AI 模型？

修改对应的环境变量即可，无需修改代码。优先级：`OPENAI` > `ANTHROPIC` > `GEMINI`。

## License

ISC

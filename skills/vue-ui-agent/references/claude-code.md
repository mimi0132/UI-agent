# Claude Code — 工具映射

本节说明在 Claude Code 中如何完成 UI 组件生成任务。

## Claude Code 可用工具

Claude Code 提供以下工具，可直接用于本技能：

| 工具 | 用途 | 使用场景 |
|------|------|---------|
| `Read` | 读取文件内容 | 分析现有代码风格、确认组件目录结构 |
| `Write` | 写入文件 | 创建 .vue / .tsx 组件文件 |
| `Edit` | 编辑文件 | 增量修改已有组件 |
| `Bash` | 执行命令 | 调用 npm/node 运行预览服务、执行 AI API |
| `Grep` | 搜索文件内容 | 检查是否已有同名组件 |
| `Glob` | 查找文件 | 确认目标项目结构 |
| `WebFetch` | 获取网页内容 | 读取截图（如果截图是 URL） |

## 读取截图

Claude Code 支持直接读取截图（拖入聊天框的图片）。

在对话中，Claude Code 会自动将截图转为 Base64 并附在上下文中。你可以直接引用图片内容进行分析。

## 调用 AI 模型

### 自动检测（推荐）

Claude Code 本身在对话中使用的模型已经可以分析截图（Claude Opus/Sonnet）。你可以直接让 Claude Code：

1. 读取截图
2. 参考 `system-prompt.md` 进行分析
3. 用 `Write` 工具写出组件代码

### 外部 AI 调用

如果需要使用 Gemini/GPT 进行更精确的组件生成，可以：

```bash
# 使用 Gemini
export GEMINI_API_KEY="AIza..."
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [
        {"text": "系统提示词..."},
        {"inline_data": {"mime_type": "image/png", "data": "BASE64数据"}}
      ]
    }]
  }'
```

## 写入组件文件

组件写入到目标项目的 `src/components/ui/` 目录下。

示例：

```bash
# 确认目录存在
mkdir -p src/components/ui

# 用 Write 工具创建文件
Write src/components/ui/Button.vue
Write src/components/ui/Input.vue
```

## 启动预览服务

组件生成后，启动预览：

```bash
# 方案 A：Node.js 预览（如果有 preview.js）
node src/preview.js

# 方案 B：Python HTTP 服务器
python3 -m http.server 3456 --directory src/components/ui

# 方案 C：VS Code Live Preview 扩展
# 在 VS Code 中按 Cmd+K V 打开预览
```

## 典型工作流

```
1. 用户拖入截图，说："根据这张图生成 Vue 3 组件库"
2. 读取截图，分析设计 Token
3. 参考 system-prompt.md 生成组件代码
4. 确认目标项目目录：ls src/components/
5. 创建目录：mkdir -p src/components/ui
6. 写入组件文件：Write src/components/ui/Button.vue
7. 写入组件文件：Write src/components/ui/Input.vue
8. 启动预览：python3 -m http.server 3456 --directory src/components/ui
9. 告诉用户预览地址和生成的文件列表
```

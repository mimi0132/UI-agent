# Cursor — 工具映射

本节说明在 Cursor 中如何完成 UI 组件生成任务。

## Cursor 可用工具

| 工具 | 用途 | 使用场景 |
|------|------|---------|
| `Read` | 读取文件 | 分析代码风格、确认目录结构 |
| `Write` | 写入文件 | 创建 .vue / .tsx 组件文件 |
| `Edit` | 编辑文件 | 增量修改已有组件 |
| `Terminal` | 执行命令 | 运行预览服务、调用 AI API |
| `Cmd+K` | AI 补全 | 辅助生成组件代码片段 |
| `Composer` | 多文件操作 | 一次性生成多个组件文件 |
| `Fetch` | 获取 URL 内容 | 如果截图是 URL 形式 |

## 读取截图

在 Cursor Composer 或聊天框中拖入截图，Cursor 会自动将截图转为 Base64。

## 调用 AI 模型

### 方式一：Cursor 内置 Composer（推荐）

在 Composer 中：
1. 粘贴截图
2. 说："参考 system-prompt.md 生成 Vue 3 组件库"
3. Composer 自动分析 + 生成 + 写入文件

### 方式二：外部 Gemini/GPT

如果需要更精确的视觉分析，可以在 Terminal 中调用：

```bash
# 使用项目中的 core.js
export GEMINI_API_KEY="AIza..."
node src/core.js ./screenshot.png --framework vue --output ./src/components/ui
```

## 写入组件文件

使用 Composer 的 "Add to Files" 功能，一次性写入多个组件：

```bash
src/components/ui/Button.vue     # 按钮组件
src/components/ui/Input.vue      # 输入框组件
src/components/ui/Card.vue       # 卡片组件
src/components/ui/Badge.vue      # 徽章组件
src/components/ui/Avatar.vue     # 头像组件
```

## 启动预览

```bash
# 方式一：Python HTTP 服务器
python3 -m http.server 3456 --directory src/components/ui

# 方式二：Node.js 预览（如果有 preview.js）
node src/preview.js
```

## 典型工作流

```
1. 在 Cursor Composer 中拖入截图
2. 输入："按 system-prompt.md 规范生成这套 UI 的 React 组件库，写入 src/components/ui/"
3. Composer 生成所有组件并写入文件
4. Terminal 启动预览：python3 -m http.server 3456
5. Cmd+点击预览链接查看效果
6. 如需调整，直接在 Composer 中说："把按钮改成圆角" 等二次修改
```

## Cursor 特有的能力

- **Composer 多文件写入**：一次生成并写入 10+ 个组件文件
- **Tab 补全**：生成过程中自动补全 Props、Slots 定义
- **Inline Chat**：选中组件文件后直接问："这个按钮加个 loading 状态"
- **Browser Preview**：Cursor 内置浏览器预览，可直接看效果

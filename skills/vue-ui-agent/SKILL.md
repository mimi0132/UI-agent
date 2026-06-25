# Vue UI Agent

从 UI 截图一键生成完整前端组件库。Vue 3 / React 双框架，支持 Gemini、GPT、Claude、DeepSeek 等主流 AI 模型。

## 工作原理

1. **读取截图** — 用户在聊天框拖入一张 UI 截图
2. **分析设计体系** — 从截图提取主色、圆角、阴影、间距等视觉特征，建立 Design Token
3. **生成组件库** — 推导出一整套高复用组件（Button、Input、Card、Badge、Avatar、Tooltip 等）
4. **写入文件** — 在用户项目 `src/components/ui/` 下生成独立组件文件
5. **浏览器预览** — 自动启动预览服务，用浏览器查看组件效果

## 使用方式

安装后，在 Agent 聊天框中直接说：

```
帮我根据这张截图生成 Vue 3 组件库
```

或

```
根据这张 UI 截图，生成 React 组件代码
```

AI 会自动调用工具，完成分析、生成、写入、预览的全部流程。

## 支持的框架

- **Vue 3** — `<script setup lang="ts">` + TypeScript + CSS Variables
- **React** — Function Component + forwardRef + TypeScript

## 支持的 AI 模型

只需配置一个环境变量，工具自动检测：

| 环境变量 | 模型 |
|---------|------|
| `GEMINI_API_KEY` | Gemini 2.5 Flash |
| `OPENAI_API_KEY` | GPT-4o / DeepSeek / 通义千问 |
| `ANTHROPIC_API_KEY` | Claude Sonnet / Opus |

## 生成规则

每个组件包含：

- **完整变体** — primary / secondary / ghost / outline / danger
- **多尺寸** — sm / md / lg
- **全状态** — default / hover / active / focus / disabled / loading
- **Slots** — icon / prefix / suffix / header / footer
- **CSS 变量** — `--ui-color-primary` 等设计 Token
- **无障碍** — aria 属性、role、键盘导航

## 输出结构

```
src/components/ui/
├── Button.vue       (5 variant × 3 size × disabled/loading)
├── Input.vue        (default/error/success + prefix/suffix)
├── Card.vue         (plain/header/footer/elevated/glass)
├── Badge.vue        (dot/text × color variants)
├── Avatar.vue       (image/text/icon + group)
├── Divider.vue      (horizontal/vertical)
├── Tooltip.vue      (placement variants)
└── Modal.vue        (header/body/footer slots)
```

## 设计规范

详见 [system-prompt.md](references/system-prompt.md)

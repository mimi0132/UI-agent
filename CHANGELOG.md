# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-XX

### Added
- **核心功能**：从 UI 截图生成完整前端组件库（Vue 3 / React）
- **多 AI 适配**：自动检测环境变量，支持 Gemini / OpenAI / Claude / DeepSeek / 通义千问
- **设计系统**：自动生成 `theme.css` + `colors.css` + `index.ts` + `README.md`
- **预览系统**：生成后自动启动 HTTP 服务并打开浏览器，展示颜色库 + 所有组件
- **命令行**：独立 CLI 模式（`vue-ui-agent ./screenshot.png`）
- **Agent Skill 模式**：Vercel skills CLI 一键安装到所有 AI 编程工具
  ```bash
  npx skills add mimi0132/vue-ui-agent --all
  ```
- **组件完整性**：每次生成至少 6+ 个基础组件（Button/Input/Card/Badge/Avatar/Divider 等）
- **Demo 输出**：AI 输出每个组件的所有变体示例，预览页直接展示
- **零业务耦合**：纯视觉还原，不引入任何第三方 UI 库

### Tech Stack
- Node.js ≥ 18
- `@google/genai` ^1.0.0
- `openai` ^4.73.0
- `@anthropic-ai/sdk` ^0.39.0
- `zod` ^3.23.8

[1.0.0]: https://github.com/mimi0132/vue-ui-agent/releases/tag/v1.0.0

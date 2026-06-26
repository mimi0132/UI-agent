import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

function getFreePort(startPort = 3456) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => resolve(getFreePort(startPort + 1)));
  });
}

/**
 * 解析 AI 输出，提取组件源码和 demo 示例
 */
function parseFiles(rawText) {
  const filePattern = /<!--\s*FILE_START:\s*(.+?)\s*-->([\s\S]*?)<!--\s*FILE_END:\s*\1\s*-->/g;
  const demoPattern = /<!--\s*DEMO_START:\s*(.+?)\s*-->([\s\S]*?)<!--\s*DEMO_END:\s*\1\s*-->/g;
  const files = [];
  const demos = new Map();

  let match;
  while ((match = filePattern.exec(rawText)) !== null) {
    const fileName = match[1].trim();
    const content = match[2].trim();
    if (content) files.push({ fileName, content });
  }
  while ((match = demoPattern.exec(rawText)) !== null) {
    const fileName = match[1].trim();
    const content = match[2].trim();
    if (content) demos.set(fileName, content);
  }
  return { files, demos };
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 提取组件的样式（CSS）
 */
function extractComponentStyle(source) {
  const styleMatches = source.match(/<style[^>]*>([\s\S]*?)<\/style>/g);
  if (!styleMatches) return '';
  return styleMatches
    .map(s => s.replace(/<\/?style[^>]*>/g, ''))
    .join('\n');
}

/**
 * 从 colors.css 中解析所有颜色变量，按色系分组
 */
function parseColorPalette(colorsCSS) {
  if (!colorsCSS) return [];

  // 匹配所有 --ui-color-*: #...; 或 rgb()/rgba()
  const varPattern = /--ui-color-([\w-]+):\s*([^;]+);/g;
  const colors = [];

  let match;
  while ((match = varPattern.exec(colorsCSS)) !== null) {
    const name = match[1];           // 例如 primary-500
    const value = match[2].trim();
    colors.push({ name, value });
  }

  // 按前缀分组（gray / primary / success / warning / danger / info / bg / surface / border / divider / text / overlay）
  const groups = new Map();
  const groupOrder = ['gray', 'primary', 'secondary', 'success', 'warning', 'danger', 'info', 'bg', 'surface', 'overlay', 'border', 'divider', 'text'];
  const groupLabels = {
    gray: '中性色 Gray',
    primary: '主色 Primary',
    secondary: '辅助色 Secondary',
    success: '成功 Success',
    warning: '警告 Warning',
    danger: '危险 Danger',
    info: '信息 Info',
    bg: '背景 Background',
    surface: '表面 Surface',
    overlay: '遮罩 Overlay',
    border: '边框 Border',
    divider: '分割线 Divider',
    text: '文字 Text',
  };

  for (const c of colors) {
    const prefix = c.name.split('-')[0];
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(c);
  }

  // 按预定义顺序返回分组
  return groupOrder
    .filter(prefix => groups.has(prefix))
    .map(prefix => ({
      prefix,
      label: groupLabels[prefix] || prefix,
      colors: groups.get(prefix).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    }));
}

/**
 * 计算文字颜色（黑或白）以保证色卡上的对比度
 */
function isLightColor(hex) {
  // 处理 rgba
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    const m = hex.match(/[\d.]+/g);
    if (!m) return true;
    const [r, g, b] = m.map(Number);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }
  // 处理 hex
  const h = hex.replace('#', '').trim();
  if (h.length !== 3 && h.length !== 6) return true;
  const v = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

/**
 * 生成颜色库的 HTML
 */
function generateColorPaletteHTML(colorGroups) {
  if (!colorGroups || colorGroups.length === 0) {
    return '';
  }

  const groupsHTML = colorGroups.map(group => {
    const swatches = group.colors.map(c => {
      const textColor = isLightColor(c.value) ? '#111827' : '#ffffff';
      return `
        <div class="color-swatch">
          <div class="color-block" style="background: ${c.value}; color: ${textColor};">
            <span class="color-name">--ui-color-${c.name}</span>
          </div>
          <div class="color-meta">
            <code class="color-value">${c.value}</code>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="color-group">
        <h3 class="color-group-title">${group.label}</h3>
        <div class="color-grid">${swatches}</div>
      </div>`;
  }).join('');

  return groupsHTML;
}

/**
 * 解析 typography.css，提取所有 --ui-font-* / --ui-line-height-* / --ui-letter-spacing-* 变量
 * 优先级：变量值（从用户 CSS 读取）→ fallback（兜底）
 */
function parseTypography(typographyCSS) {
  const defaults = {
    '--ui-font-size-h1': { value: '32px', label: 'H1 标题', size: '32px', weight: '700', usage: '页面主标题' },
    '--ui-font-size-h2': { value: '28px', label: 'H2 标题', size: '28px', weight: '600', usage: '区块标题' },
    '--ui-font-size-h3': { value: '24px', label: 'H3 标题', size: '24px', weight: '600', usage: '卡片标题' },
    '--ui-font-size-h4': { value: '20px', label: 'H4 标题', size: '20px', weight: '500', usage: '小节标题' },
    '--ui-font-size-body-lg': { value: '18px', label: '正文大', size: '18px', weight: '400', usage: '引导文字' },
    '--ui-font-size-body': { value: '16px', label: '正文', size: '16px', weight: '400', usage: '主要正文' },
    '--ui-font-size-body-sm': { value: '14px', label: '正文小', size: '14px', weight: '400', usage: '辅助说明' },
    '--ui-font-size-caption': { value: '12px', label: '辅助文字', size: '12px', weight: '400', usage: '标签/注释' },
  };

  const parsed = [];
  for (const [name, def] of Object.entries(defaults)) {
    let value = def.value;
    if (typographyCSS) {
      const match = typographyCSS.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
      if (match) value = match[1].trim();
    }
    parsed.push({ ...def, name, value });
  }

  return parsed;
}

/**
 * 渲染字体规范卡片（在颜色库之后、组件列表之前）
 */
function generateTypographyHTML(typographyList) {
  const rows = typographyList.map(t => `
    <tr>
      <td><code>${t.name}</code></td>
      <td><strong>${t.label}</strong></td>
      <td><code>${t.value}</code></td>
      <td><span style="font-size:${t.value};font-weight:${t.weight}">${t.label} 示例</span></td>
      <td>${t.usage}</td>
    </tr>
  `).join('');

  return `
  <section class="color-palette-card">
    <header class="palette-header">
      <h2>字体规范</h2>
      <p>共 ${typographyList.length} 级字号 · 来源 typography.css</p>
    </header>
    <div class="table-wrap">
      <table class="typography-table">
        <thead>
          <tr>
            <th>变量</th>
            <th>层级</th>
            <th>字号</th>
            <th>预览</th>
            <th>使用场景</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <details class="palette-source">
      <summary>查看 typography.css 源码</summary>
      <pre><code id="typography-source"></code></pre>
    </details>
  </section>`;
}

/**
 * 解析栅格系统（默认 12 列 + 5 个断点 + 24px gutter）
 * 优先级：theme.css 中的 CSS 变量 → fallback（兜底）
 */
function parseGrid(themeCSS) {
  const defaults = {
    columns: 12,
    gutter: '24px',
    container: '1280px',
    breakpoints: [
      { name: 'sm', min: '640px', device: '手机横屏' },
      { name: 'md', min: '768px', device: '平板' },
      { name: 'lg', min: '1024px', device: '笔记本' },
      { name: 'xl', min: '1280px', device: '桌面' },
      { name: '2xl', min: '1536px', device: '大屏' },
    ],
  };

  let columns = defaults.columns;
  let gutter = defaults.gutter;
  let container = defaults.container;

  if (themeCSS) {
    const colMatch = themeCSS.match(/--ui-grid-columns:\s*(\d+)/);
    const gutterMatch = themeCSS.match(/--ui-grid-gutter:\s*([^;]+);/);
    const containerMatch = themeCSS.match(/--ui-grid-container:\s*([^;]+);/);
    if (colMatch) columns = parseInt(colMatch[1], 10);
    if (gutterMatch) gutter = gutterMatch[1].trim();
    if (containerMatch) container = containerMatch[1].trim();
  }

  return { columns, gutter, container, breakpoints: defaults.breakpoints };
}

/**
 * 渲染栅格系统卡片（12 列网格可视化 + 断点列表 + 间距规范）
 */
function generateGridHTML(grid) {
  // 生成 12 列网格可视化
  const gridCols = Array.from({ length: grid.columns }, (_, i) =>
    `<div class="grid-col-item">${i + 1}</div>`
  ).join('');

  // 断点列表
  const breakpointRows = grid.breakpoints.map(bp => `
    <tr>
      <td><strong>${bp.name}</strong></td>
      <td><code>${bp.min}</code></td>
      <td>${bp.device}</td>
    </tr>
  `).join('');

  // 间距阶梯（基于 gutter 推导）
  const spaceScale = [
    { name: 'xs', value: `calc(${grid.gutter} * 0.25)`, usage: '紧凑元素' },
    { name: 'sm', value: `calc(${grid.gutter} * 0.5)`, usage: '相关元素' },
    { name: 'md', value: grid.gutter, usage: '标准间距' },
    { name: 'lg', value: `calc(${grid.gutter} * 1.5)`, usage: '区块间隔' },
    { name: 'xl', value: `calc(${grid.gutter} * 2)`, usage: '大区块' },
    { name: '2xl', value: `calc(${grid.gutter} * 3)`, usage: '页面区域' },
  ];
  const spaceRows = spaceScale.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td><code>${s.value}</code></td>
      <td><span class="space-bar" style="width:${s.value}"></span></td>
      <td>${s.usage}</td>
    </tr>
  `).join('');

  return `
  <section class="color-palette-card">
    <header class="palette-header">
      <h2>栅格系统</h2>
      <p>${grid.columns} 栏 · Container ${grid.container} · Gutter ${grid.gutter} · 来源 theme.css</p>
    </header>

    <div class="grid-spec">
      <div class="grid-spec-meta">
        <div class="grid-meta-item">
          <span class="grid-meta-label">总列数</span>
          <span class="grid-meta-value">${grid.columns}</span>
        </div>
        <div class="grid-meta-item">
          <span class="grid-meta-label">列间距 (Gutter)</span>
          <span class="grid-meta-value">${grid.gutter}</span>
        </div>
        <div class="grid-meta-item">
          <span class="grid-meta-label">容器最大宽度</span>
          <span class="grid-meta-value">${grid.container}</span>
        </div>
        <div class="grid-meta-item">
          <span class="grid-meta-label">断点数</span>
          <span class="grid-meta-value">${grid.breakpoints.length}</span>
        </div>
      </div>

      <h3 class="grid-section-title">12 栏网格示意</h3>
      <div class="grid-demo">${gridCols}</div>

      <h3 class="grid-section-title">响应式断点</h3>
      <div class="table-wrap">
        <table class="typography-table">
          <thead>
            <tr>
              <th>断点</th>
              <th>最小宽度</th>
              <th>适用设备</th>
            </tr>
          </thead>
          <tbody>${breakpointRows}</tbody>
        </table>
      </div>

      <h3 class="grid-section-title">间距阶梯 (Space Scale)</h3>
      <div class="table-wrap">
        <table class="typography-table">
          <thead>
            <tr>
              <th>层级</th>
              <th>计算值</th>
              <th>可视化</th>
              <th>使用场景</th>
            </tr>
          </thead>
          <tbody>${spaceRows}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

/**
 * 生成预览 HTML：颜色库 + 字体规范 + 每个组件独立一张大卡片 + 所有变体 demo
 */
function generatePreviewHTML(componentInfos, framework, themeCSS, colorsCSS, typographyCSS) {
  const isVue = framework === 'vue';
  const frameworkLabel = isVue ? 'Vue 3' : 'React';

  const colorGroups = parseColorPalette(colorsCSS);
  const colorPaletteHTML = generateColorPaletteHTML(colorGroups);

  const typographyList = parseTypography(typographyCSS);
  const typographyHTML = generateTypographyHTML(typographyList);

  const grid = parseGrid(themeCSS);
  const gridHTML = generateGridHTML(grid);

  const componentCards = componentInfos.map((info) => {
    const { name, source, style, demoHTML, isMissing } = info;
    return `
    <section class="component-card ${isMissing ? 'is-missing' : ''}">
      <header class="component-header">
        <div class="component-meta">
          <h2 class="component-title">${name}</h2>
          <span class="component-file">${name}.${isVue ? 'vue' : 'tsx'}</span>
        </div>
        <span class="component-tag">${isMissing ? '缺少 Demo' : '组件预览'}</span>
      </header>

      <div class="component-demo">
        ${demoHTML || '<p class="empty-demo">该组件未提供 demo 示例</p>'}
      </div>

      <details class="component-code">
        <summary>查看源码</summary>
        <pre><code>${escapeHtml(source)}</code></pre>
      </details>
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UI Agent 组件预览</title>
  <style>
    /* ============== theme.css（AI 生成的设计 Token） ============== */
    ${themeCSS}

    /* ============== colors.css（完整颜色库） ============== */
    ${colorsCSS}

    /* ============== 预览页面布局 ============== */
    :root {
      --preview-bg: #f6f7f9;
      --preview-card-bg: #ffffff;
      --preview-border: #e4e7ed;
      --preview-text: #1f2329;
      --preview-text-muted: #646a73;
      --preview-code-bg: #1e1e1e;
      --preview-code-text: #d4d4d4;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      background: var(--preview-bg);
      color: var(--preview-text);
      padding: 2rem 1.5rem;
      min-height: 100vh;
    }
    .page-header {
      max-width: 1200px;
      margin: 0 auto 2rem;
      text-align: center;
    }
    .page-header h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--preview-text);
      margin-bottom: 0.5rem;
    }
    .page-header p {
      color: var(--preview-text-muted);
      font-size: 0.875rem;
    }
    .page-header .framework-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-left: 0.5rem;
      vertical-align: middle;
    }
    .badge-vue { background: #42b88320; color: #2e8d63; }
    .badge-react { background: #61dafb20; color: #087ea4; }

    .components-list {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    /* ============== 颜色库 ============== */
    .color-library {
      max-width: 1200px;
      margin: 0 auto 2rem;
      background: var(--preview-card-bg);
      border: 1px solid var(--preview-border);
      border-radius: 0.75rem;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .color-library-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--preview-border);
      background: #fafbfc;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .color-library-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--preview-text);
    }
    .color-library-subtitle {
      font-size: 0.75rem;
      color: var(--preview-text-muted);
      margin-top: 0.25rem;
    }
    .color-library-body {
      padding: 1.5rem;
    }
    .color-group {
      margin-bottom: 1.75rem;
    }
    .color-group:last-child {
      margin-bottom: 0;
    }
    .color-group-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--preview-text);
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px dashed var(--preview-border);
    }
    .color-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.75rem;
    }

    /* ============== 字体规范卡片 ============== */
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--preview-border);
      border-radius: 0.5rem;
    }
    .typography-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .typography-table th,
    .typography-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--preview-border);
    }
    .typography-table th {
      background: #F9FAFB;
      font-weight: 600;
      color: var(--preview-text);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .typography-table tr:last-child td {
      border-bottom: none;
    }
    .typography-table code {
      background: #F3F4F6;
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      color: #4F46E5;
      font-family: 'SF Mono', 'Menlo', monospace;
    }
    .palette-source {
      margin-top: 1rem;
    }
    .palette-source summary {
      cursor: pointer;
      color: var(--preview-text-secondary);
      font-size: 0.875rem;
      user-select: none;
    }
    .palette-source pre {
      background: #1F2937;
      color: #E5E7EB;
      padding: 1rem;
      border-radius: 0.5rem;
      overflow-x: auto;
      font-size: 0.75rem;
      margin-top: 0.5rem;
    }

    /* ============== 栅格系统卡片 ============== */
    .grid-spec {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .grid-spec-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.75rem;
    }
    .grid-meta-item {
      background: linear-gradient(135deg, #F0F4FF 0%, #FAF5FF 100%);
      border: 1px solid #E0E7FF;
      border-radius: 0.5rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .grid-meta-label {
      font-size: 0.75rem;
      color: var(--preview-text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .grid-meta-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #4F46E5;
      font-family: 'SF Mono', 'Menlo', monospace;
    }
    .grid-section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--preview-text);
      margin: 0;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--preview-border);
    }
    .grid-demo {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 0.5rem;
    }
    .grid-col-item {
      background: linear-gradient(135deg, #818CF8 0%, #A78BFA 100%);
      color: white;
      text-align: center;
      padding: 1.25rem 0;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
      font-family: 'SF Mono', 'Menlo', monospace;
    }
    .space-bar {
      display: inline-block;
      height: 0.75rem;
      background: linear-gradient(90deg, #6366F1 0%, #A78BFA 100%);
      border-radius: 0.25rem;
      vertical-align: middle;
    }
    .color-swatch {
      border-radius: 0.5rem;
      overflow: hidden;
      border: 1px solid var(--preview-border);
      background: white;
    }
    .color-block {
      height: 64px;
      padding: 0.5rem;
      display: flex;
      align-items: flex-end;
      font-size: 0.65rem;
      font-weight: 500;
      font-family: 'SF Mono', 'Menlo', monospace;
      word-break: break-all;
    }
    .color-name {
      opacity: 0.85;
    }
    .color-meta {
      padding: 0.4rem 0.6rem;
      background: white;
    }
    .color-value {
      font-size: 0.7rem;
      color: var(--preview-text);
      font-family: 'SF Mono', 'Menlo', monospace;
      word-break: break-all;
    }

    /* ============== 组件卡片 ============== */
    .component-card {
      background: var(--preview-card-bg);
      border: 1px solid var(--preview-border);
      border-radius: 0.75rem;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .component-card.is-missing {
      border-color: #fbbf24;
      background: #fffbeb;
    }

    .component-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--preview-border);
      background: #fafbfc;
    }
    .component-meta {
      display: flex;
      align-items: baseline;
      gap: 0.75rem;
    }
    .component-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--preview-text);
    }
    .component-file {
      font-size: 0.75rem;
      color: var(--preview-text-muted);
      font-family: 'SF Mono', 'Menlo', monospace;
    }
    .component-tag {
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      background: #eef2ff;
      color: #4f46e5;
      font-weight: 500;
    }
    .component-card.is-missing .component-tag {
      background: #fef3c7;
      color: #b45309;
    }

    .component-demo {
      padding: 2rem 1.5rem;
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 1rem;
      background: white;
    }
    .empty-demo {
      color: var(--preview-text-muted);
      font-size: 0.875rem;
      font-style: italic;
    }

    .component-code {
      border-top: 1px solid var(--preview-border);
    }
    .component-code summary {
      padding: 0.75rem 1.5rem;
      cursor: pointer;
      font-size: 0.8rem;
      color: var(--preview-text-muted);
      background: #fafbfc;
      user-select: none;
      font-weight: 500;
    }
    .component-code summary:hover {
      color: var(--preview-text);
    }
    .component-code pre {
      padding: 1rem 1.5rem;
      overflow-x: auto;
      font-size: 0.8rem;
      line-height: 1.6;
      background: var(--preview-code-bg);
      max-height: 500px;
      overflow-y: auto;
    }
    .component-code code {
      font-family: 'SF Mono', 'Fira Code', 'Menlo', monospace;
      color: var(--preview-code-text);
    }
  </style>

  <!-- 把每个组件的 <style> 注入到全局，确保 demo 渲染时样式生效 -->
  <style id="__component_styles__">
    ${componentInfos.map(i => i.style || '').join('\n')}
  </style>
</head>
<body>
  <div class="page-header">
    <h1>UI Agent 组件预览</h1>
    <p>共 ${componentInfos.length} 个组件 · ${frameworkLabel}<span class="framework-badge badge-${isVue ? 'vue' : 'react'}">${frameworkLabel}</span></p>
  </div>

  ${colorPaletteHTML ? `
  <section class="color-library">
    <header class="color-library-header">
      <div>
        <h2 class="color-library-title">颜色库</h2>
        <p class="color-library-subtitle">共 ${colorGroups.reduce((sum, g) => sum + g.colors.length, 0)} 个颜色变量 · 来源 colors.css</p>
      </div>
    </header>
    <div class="color-library-body">
      ${colorPaletteHTML}
    </div>
  </section>` : ''}

  ${typographyHTML}

  ${gridHTML}

  <div class="components-list">
    ${componentCards}
  </div>
</body>
</html>`;
}

/**
 * 加载组件文件并生成预览页
 */
export async function createPreview(outputDir, framework, fileNames, rawText) {
  const previewDir = path.join(outputDir, '.preview');

  if (!fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir, { recursive: true });
  }

  // 读取 theme.css
  const themeFilePath = path.join(outputDir, 'theme.css');
  let themeCSS = '';
  if (fs.existsSync(themeFilePath)) {
    themeCSS = fs.readFileSync(themeFilePath, 'utf-8');
  }

  // 读取 colors.css
  const colorsFilePath = path.join(outputDir, 'colors.css');
  let colorsCSS = '';
  if (fs.existsSync(colorsFilePath)) {
    colorsCSS = fs.readFileSync(colorsFilePath, 'utf-8');
  }

  // 读取 typography.css
  const typographyFilePath = path.join(outputDir, 'typography.css');
  let typographyCSS = '';
  if (fs.existsSync(typographyFilePath)) {
    typographyCSS = fs.readFileSync(typographyFilePath, 'utf-8');
  }

  // 解析 AI 输出，提取 demo
  const { demos } = parseFiles(rawText || '');

  // 加载每个组件
  const isVue = framework === 'vue';
  const componentInfos = fileNames
    .filter(f => f.endsWith('.vue') || f.endsWith('.tsx'))
    .map((fileName) => {
      const filePath = path.join(outputDir, fileName);
      const source = fs.readFileSync(filePath, 'utf-8');
      const name = fileName.replace(path.extname(fileName), '');
      const style = extractComponentStyle(source);
      const demoHTML = demos.get(fileName) || '';
      return {
        name,
        source,
        style,
        demoHTML,
        isMissing: !demoHTML,
      };
    });

  const html = generatePreviewHTML(componentInfos, framework, themeCSS, colorsCSS, typographyCSS);
  const htmlPath = path.join(previewDir, 'index.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  const port = await getFreePort();

  const server = http.createServer((req, res) => {
    const urlPath = req.url === '/' ? '/index.html' : req.url;
    const fullPath = path.join(previewDir, urlPath);

    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const ext = path.extname(fullPath);
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(fs.readFileSync(fullPath));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', async () => {
      const url = `http://127.0.0.1:${port}`;

      // 注册退出时关闭服务
      const cleanup = () => {
        try { server.close(); } catch { /* noop */ }
      };
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);

      try {
        if (process.platform === 'darwin') {
          await execAsync(`open "${url}"`);
        } else if (process.platform === 'win32') {
          await execAsync(`start "" "${url}"`);
        } else {
          await execAsync(`xdg-open "${url}"`);
        }
      } catch {
        //
      }

      resolve(url);
    });
  });
}

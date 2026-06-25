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
 * 生成预览 HTML：每个组件独立一张大卡片 + 所有变体 demo
 */
function generatePreviewHTML(componentInfos, framework, themeCSS) {
  const isVue = framework === 'vue';
  const frameworkLabel = isVue ? 'Vue 3' : 'React';

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

  const html = generatePreviewHTML(componentInfos, framework, themeCSS);
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

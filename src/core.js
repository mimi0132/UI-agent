import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

/**
 * 用浏览器打开 URL 并截图，返回 Base64 编码
 */
export async function captureScreenshot(url, options = {}) {
  const { width = 1440, height = 900, fullPage = true, waitFor = 3000 } = options;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width, height } });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // 等待页面稳定（动画、字体加载等）
    if (waitFor > 0) await page.waitForTimeout(waitFor);

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage,
    });

    await browser.close();

    return {
      base64: screenshotBuffer.toString('base64'),
      mimeType: 'image/png',
      width,
      height,
    };
  } catch (error) {
    await browser.close();
    throw new Error(`浏览器截图失败: ${error.message}`);
  }
}

/**
 * 检测当前环境可用的 AI Provider
 * 优先级：OPENAI > ANTHROPIC > GEMINI
 */
export async function detectProvider() {
  if (process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL) {
    const { createProvider: createOpenAI } = await import('./providers/openai.js');
    const provider = await createOpenAI();
    return { name: 'openai', displayName: provider.modelName, client: provider };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const { createProvider: createClaude } = await import('./providers/claude.js');
    const provider = await createClaude();
    return { name: 'claude', displayName: provider.modelName, client: provider };
  }

  if (process.env.GEMINI_API_KEY) {
    const { createProvider: createGemini } = await import('./providers/gemini.js');
    const provider = await createGemini();
    return { name: 'gemini', displayName: provider.modelName, client: provider };
  }

  throw new Error('未检测到任何 AI 服务配置。请设置 GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY 之一。');
}

/**
 * 从 AI 返回文本中解析多个组件文件
 */
export function parseComponentFiles(rawText, defaultExt) {
  const filePattern = /<!--\s*FILE_START:\s*(.+?)\s*-->([\s\S]*?)<!--\s*FILE_END:\s*\1\s*-->/g;
  const files = [];
  let match;

  while ((match = filePattern.exec(rawText)) !== null) {
    let fileName = match[1].trim();
    const content = match[2].trim();
    if (!path.extname(fileName)) fileName = fileName + defaultExt;
    if (content && content.length > 50) files.push({ fileName, content });
  }

  if (files.length === 0) {
    const cleanCode = rawText
      .replace(/^```(?:vue|tsx|html|typescript|ts|javascript|js)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    if (cleanCode) {
      files.push({
        fileName: `GeneratedComponent_${Date.now()}${defaultExt}`,
        content: cleanCode,
      });
    }
  }

  return files;
}

/**
 * 核心生成逻辑：调用 AI → 解析文件 → 写入磁盘
 */
export async function generateComponentLibrary({
  imageBase64,
  imageMimeType = 'image/png',
  framework,
  outputDir = './src/components/generated',
  onProgress,
}) {
  const startTime = Date.now();
  const isVue = framework === 'vue';
  const fileExt = isVue ? '.vue' : '.tsx';
  const frameworkLabel = isVue ? 'Vue 3' : 'React';

  const { name: providerName, displayName, client: aiProvider } = await detectProvider();

  const { getSystemPrompt } = await import('./prompt.js');
  const systemPrompt = getSystemPrompt(framework);

  if (onProgress) onProgress(`🤖 使用模型: ${displayName}，正在分析截图...`);

  const rawText = await aiProvider.generate({
    systemPrompt,
    imageBase64,
    imageMimeType,
    userMessage: `请根据以上系统提示词要求，分析这张 UI 截图，输出完整的 ${frameworkLabel} 组件库。必须使用 <!-- FILE_START: 文件名 --> 和 <!-- FILE_END: 文件名 --> 格式包裹每个组件，至少生成 6 个以上组件。直接输出代码即可，不要任何解释。`,
  });

  if (!rawText || !rawText.trim()) {
    throw new Error(`${displayName} 返回了空内容，请检查 API Key 是否有效或稍后重试`);
  }

  const componentFiles = parseComponentFiles(rawText, fileExt);
  if (componentFiles.length === 0) {
    throw new Error('未能从返回结果中解析出有效组件代码');
  }

  const resolvedOutputDir = path.resolve(outputDir);
  if (!fs.existsSync(resolvedOutputDir)) {
    fs.mkdirSync(resolvedOutputDir, { recursive: true });
  }

  const writtenFiles = [];
  for (const file of componentFiles) {
    const outputPath = path.join(resolvedOutputDir, file.fileName);
    fs.writeFileSync(outputPath, file.content, 'utf-8');
    writtenFiles.push(file.fileName);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return {
    providerName,
    displayName,
    frameworkLabel,
    writtenFiles,
    outputDir: resolvedOutputDir,
    elapsed,
    fileExt,
  };
}

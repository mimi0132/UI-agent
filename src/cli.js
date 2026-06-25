#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateComponentLibrary } from './core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function showHelp() {
  console.log(`
Vue UI Agent — 从截图或网页生成整套 UI 组件库

用法:
  vue-ui-agent <图片路径|URL> [选项]

选项:
  --framework, -f    目标框架: vue | react   (默认: vue)
  --output, -o       输出目录               (默认: ./src/components/generated)
  --url, -u          指定输入为网页 URL（自动截图）
  --viewport, -v     截图视口尺寸 宽x高      (默认: 1440x900)
  --full-page, -p    截图整个页面            (默认: true)
  --help, -h         显示帮助

示例:
  # 从本地图片生成
  vue-ui-agent ./screenshot.png

  # 从网页 URL 生成（自动打开浏览器截图）
  vue-ui-agent https://dribbble.com/shots/xxx -u -f vue

  # 指定视口尺寸
  vue-ui-agent https://example.com -u -v 1920x1080
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const input = args[0];
  const isUrl = args.includes('--url') || args.includes('-u') || input.startsWith('http://') || input.startsWith('https://');

  let framework = 'vue';
  let outputDir = './src/components/generated';
  let viewport = '1440x900';
  let fullPage = true;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--framework' || arg === '-f') && args[i + 1]) {
      framework = args[i + 1];
      i++;
    } else if ((arg === '--output' || arg === '-o') && args[i + 1]) {
      outputDir = args[i + 1];
      i++;
    } else if ((arg === '--viewport' || arg === '-v') && args[i + 1]) {
      viewport = args[i + 1];
      i++;
    } else if (arg === '--full-page' || arg === '-p') {
      fullPage = true;
    } else if (arg === '--no-full-page') {
      fullPage = false;
    }
  }

  if (!['vue', 'react'].includes(framework)) {
    console.error(`❌ 不支持的框架: ${framework}，仅支持 vue 或 react`);
    process.exit(1);
  }

  let imageBase64;
  let mimeType = 'image/png';

  if (isUrl) {
    const { captureScreenshot } = await import('./core.js');
    const [vw, vh] = viewport.split('x').map(Number);
    console.log(`🌐 正在打开浏览器: ${input}`);
    const result = await captureScreenshot(input, {
      width: vw || 1440,
      height: vh || 900,
      fullPage,
    });
    imageBase64 = result.base64;
    mimeType = result.mimeType;
    console.log('📸 截图完成，开始分析...');
  } else {
    if (!fs.existsSync(input)) {
      console.error(`❌ 文件不存在: ${input}`);
      process.exit(1);
    }
    mimeType = path.extname(input).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    imageBase64 = fs.readFileSync(input).toString('base64');
  }

  try {
    const result = await generateComponentLibrary({
      imageBase64,
      imageMimeType: mimeType,
      framework,
      outputDir,
      onProgress: (msg) => console.log(msg),
    });

    const fileList = result.writtenFiles.map((f) => `   📄 ${f}`).join('\n');

    console.log(`
✅ ${result.frameworkLabel} 组件库已成功生成！

🤖 使用模型: ${result.displayName} (${result.providerName})
📦 共 ${result.writtenFiles.length} 个组件：
${fileList}

📁 输出目录: ${result.outputDir}/
⏱️  耗时: ${result.elapsed}s
`);
  } catch (error) {
    console.error(`❌ 生成失败: ${error.message}`);
    process.exit(1);
  }
}

main();

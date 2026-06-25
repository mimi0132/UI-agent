#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { generateComponentLibrary } from './core.js';
import { createPreview } from './preview.js';

function showHelp() {
  console.log(`
Vue UI Agent — 从截图生成整套 UI 组件库

用法:
  vue-ui-agent <图片路径> [选项]

选项:
  --framework, -f    目标框架: vue | react   (默认: vue)
  --output, -o       输出目录               (默认: ./src/components/generated)
  --no-preview       生成后不自动打开浏览器预览
  --help, -h         显示帮助

示例:
  vue-ui-agent ./screenshot.png
  vue-ui-agent ./design.png -f react -o ./src/ui
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const imagePath = args[0];
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ 图片文件不存在: ${imagePath}`);
    process.exit(1);
  }

  let framework = 'vue';
  let outputDir = './src/components/generated';
  let openPreview = true;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if ((arg === '--framework' || arg === '-f') && args[i + 1]) {
      framework = args[i + 1];
      i++;
    } else if ((arg === '--output' || arg === '-o') && args[i + 1]) {
      outputDir = args[i + 1];
      i++;
    } else if (arg === '--no-preview') {
      openPreview = false;
    }
  }

  if (!['vue', 'react'].includes(framework)) {
    console.error(`❌ 不支持的框架: ${framework}，仅支持 vue 或 react`);
    process.exit(1);
  }

  const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  const imageBase64 = fs.readFileSync(imagePath).toString('base64');

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

    if (openPreview) {
      console.log('🌐 正在启动预览服务...');
      const previewUrl = await createPreview(result.outputDir, framework, result.writtenFiles);
      console.log(`👀 预览已打开: ${previewUrl}`);
    }
  } catch (error) {
    console.error(`❌ 生成失败: ${error.message}`);
    process.exit(1);
  }
}

main();

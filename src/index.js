#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { generateComponentLibrary } from './core.js';

const server = new McpServer({ name: 'vue-ui-agent', version: '1.0.0' });

server.tool(
  'generate_component',
  '根据 UI 截图或网页 URL 自动生成一整套高复用的前端组件库代码（Vue 3 或 React）。支持直接传入截图 Base64，或传入 URL 自动打开浏览器截图后分析。',
  {
    image_base64: z.string().optional().describe('UI 截图的 Base64 编码字符串（与 url 二选一）'),
    url: z.string().optional().describe('网页 URL，工具会自动打开浏览器截图后分析（与 image_base64 二选一）'),
    image_mime_type: z.string().optional().default('image/png').describe('图片 MIME 类型'),
    framework: z.enum(['vue', 'react']).describe('目标框架：vue 或 react'),
    output_dir: z.string().optional().default('./src/components/generated').describe('输出目录路径'),
  },
  async ({ image_base64, url, image_mime_type, framework, output_dir }) => {
    try {
      let finalImageBase64 = image_base64;
      let finalMimeType = image_mime_type;

      // 如果传了 URL，先截图
      if (url && !image_base64) {
        const { captureScreenshot } = await import('./core.js');
        const result = await captureScreenshot(url);
        finalImageBase64 = result.base64;
        finalMimeType = result.mimeType;
      }

      if (!finalImageBase64) {
        return {
          content: [{ type: 'text', text: '❌ 请提供 image_base64 或 url 之一' }],
          isError: true,
        };
      }

      const result = await generateComponentLibrary({
        imageBase64: finalImageBase64,
        imageMimeType: finalMimeType,
        framework,
        outputDir: output_dir,
      });

      const fileList = result.writtenFiles.map((f) => `   📄 ${f}`).join('\n');

      return {
        content: [{
          type: 'text',
          text: [
            `✅ ${result.frameworkLabel} 组件库已成功生成！`,
            '',
            `🤖 使用模型: ${result.displayName} (${result.providerName})`,
            `📦 共 ${result.writtenFiles.length} 个组件：`,
            fileList,
            '',
            `📁 输出目录: ${result.outputDir}/`,
            `⏱️  耗时: ${result.elapsed}s`,
            '',
            '💡 使用方式：',
            result.writtenFiles.map((f) => {
              const compName = f.replace(result.fileExt, '');
              return `   import ${compName} from '${output_dir}/${f}'`;
            }).join('\n'),
          ].join('\n'),
        }],
      };
    } catch (error) {
      let reason = error.message;
      if (error.message?.includes('API_KEY') || error.message?.includes('401')) reason = 'API Key 无效或未配置';
      else if (error.message?.includes('quota') || error.message?.includes('429')) reason = 'API 配额超限或请求过于频繁';
      else if (error.message?.includes('SAFETY')) reason = '内容被安全策略拦截';

      return {
        content: [{ type: 'text', text: `❌ 组件库生成失败！原因: ${reason}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const { displayName } = await (await import('./core.js')).detectProvider();
  console.error(`🤖 UI Agent MCP Server 已启动 | 模型: ${displayName}`);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP Server 启动失败:', error.message);
  process.exit(1);
});

#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 获取全局 node_modules 路径
 */
function getGlobalNodeModulesPath() {
  try {
    const stdout = execSync('npm root -g', { encoding: 'utf-8' });
    return stdout.trim();
  } catch {
    // 回退到默认路径
    return path.join(os.homedir(), '.nvm', 'versions', 'node', process.version, 'lib', 'node_modules');
  }
}

/**
 * 获取 MCP 配置文件路径（跨平台）
 */
function getMCPConfigPath() {
  const platform = os.platform();
  const configDir = platform === 'win32'
    ? path.join(os.homedir(), 'AppData', 'Roaming', 'Claude')
    : path.join(os.homedir(), '.config', 'claude');

  return path.join(configDir, 'claude_desktop_config.json');
}

/**
 * 读取现有 MCP 配置
 */
function readMCPConfig(configPath) {
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { mcpServers: {} };
    }
  }
  return { mcpServers: {} };
}

/**
 * 写入 MCP 配置
 */
function writeMCPConfig(configPath, config) {
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 主安装逻辑
 */
async function main() {
  console.log('🔧 正在配置 Vue UI Agent MCP Server...\n');

  // 1. 获取全局安装路径
  const globalNodeModules = getGlobalNodeModulesPath();
  const vueUiAgentPath = path.join(globalNodeModules, 'vue-ui-agent');

  if (!fs.existsSync(vueUiAgentPath)) {
    console.error(`❌ 未找到全局安装路径: ${vueUiAgentPath}`);
    console.error('请先运行: npm install -g vue-ui-agent');
    process.exit(1);
  }

  console.log(`✅ 找到全局安装路径: ${vueUiAgentPath}`);

  // 2. 获取 MCP 配置文件路径
  const configPath = getMCPConfigPath();
  console.log(`📄 MCP 配置文件: ${configPath}`);

  // 3. 读取现有配置
  const config = readMCPConfig(configPath);

  // 4. 添加 vue-ui-agent 配置
  const serverConfig = {
    command: 'node',
    args: [path.join(vueUiAgentPath, 'src', 'index.js')],
    env: {
      // 从环境变量读取已有的 AI Key 配置
      ...(process.env.GEMINI_API_KEY && { GEMINI_API_KEY: process.env.GEMINI_API_KEY }),
      ...(process.env.OPENAI_API_KEY && { OPENAI_API_KEY: process.env.OPENAI_API_KEY }),
      ...(process.env.ANTHROPIC_API_KEY && { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY }),
      ...(process.env.OPENAI_BASE_URL && { OPENAI_BASE_URL: process.env.OPENAI_BASE_URL }),
    },
  };

  config.mcpServers['vue-ui-agent'] = serverConfig;

  // 5. 写入配置
  writeMCPConfig(configPath, config);
  console.log('✅ MCP 配置已写入\n');

  // 6. 检查 AI Key 配置
  const hasKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (!hasKey) {
    console.warn('⚠️  未检测到 AI API Key 配置！');
    console.warn('请设置以下环境变量之一：');
    console.warn('   export GEMINI_API_KEY="AIza..."');
    console.warn('   export OPENAI_API_KEY="sk-..."');
    console.warn('   export ANTHROPIC_API_KEY="sk-ant-..."');
    console.warn('');
    console.warn('设置后请重启 Claude Desktop 以生效。');
  } else {
    console.log('✅ 检测到 AI API Key 配置');
  }

  console.log('\n🎉 安装完成！');
  console.log('请重启 Claude Desktop 以加载 MCP Server。');
  console.log('重启后，在 Claude 聊天框中拖入 UI 截图即可使用。');
}

main().catch((error) => {
  console.error('❌ 安装失败:', error.message);
  process.exit(1);
});
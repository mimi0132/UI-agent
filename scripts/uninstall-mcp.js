#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * 获取 MCP 配置文件路径
 */
function getMCPConfigPath() {
  const platform = os.platform();
  const configDir = platform === 'win32'
    ? path.join(os.homedir(), 'AppData', 'Roaming', 'Claude')
    : path.join(os.homedir(), '.config', 'claude');

  return path.join(configDir, 'claude_desktop_config.json');
}

/**
 * 主卸载逻辑
 */
async function main() {
  console.log('🗑️  正在卸载 Vue UI Agent MCP Server...\n');

  const configPath = getMCPConfigPath();

  if (!fs.existsSync(configPath)) {
    console.log('✅ 未找到 MCP 配置文件，无需卸载');
    process.exit(0);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  if (!config.mcpServers || !config.mcpServers['vue-ui-agent']) {
    console.log('✅ MCP 配置中未找到 vue-ui-agent，无需卸载');
    process.exit(0);
  }

  delete config.mcpServers['vue-ui-agent'];

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log('✅ MCP 配置已清理');
  console.log('请重启 Claude Desktop 以生效。');
}

main().catch((error) => {
  console.error('❌ 卸载失败:', error.message);
  process.exit(1);
});
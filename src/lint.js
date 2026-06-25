import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const files = fs.readdirSync('src', { recursive: true })
  .filter(f => f.endsWith('.js'))
  .filter(f => f !== 'lint.js')
  .map(f => path.join('src', f));

let hasError = false;

files.forEach(f => {
  const c = fs.readFileSync(f, 'utf-8');
  if (c.includes('var ')) {
    console.log('❌ ' + f + ': 使用了 var');
    hasError = true;
  }
  if (c.includes('require(')) {
    console.log('❌ ' + f + ': 使用了 require');
    hasError = true;
  }
  if (!c.includes('import ') && !f.endsWith('cli.js')) {
    console.log('⚠️  ' + f + ': 可能缺少 import');
  }
  // 真实 JS 语法检查（捕获 <!-- 这种 HTML 注释混入）
  try {
    execSync(`node --check "${f}"`, { stdio: 'pipe' });
  } catch (e) {
    console.log('❌ ' + f + ': JS 语法错误');
    console.log('   ' + e.stderr.toString().split('\n').filter(l => l.trim()).slice(0, 3).join('\n   '));
    hasError = true;
  }
});

console.log(hasError ? '⚠️  lint 检查发现问题' : '✅ lint 检查完成');
process.exit(hasError ? 1 : 0);


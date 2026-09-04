import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';
const port = process.env.PORT;

function header(title) {
  console.log('');
  console.log('========================================');
  console.log('  ' + title);
  console.log('========================================');
}

header('📦 构建前端项目');
try {
  console.log('  构建前台 (frontend)...');
  execSync('npm run build --workspace frontend', { cwd: root, stdio: 'inherit' });
  console.log('  ✅ 前台构建完成');

  console.log('  构建后台管理 (admin)...');
  execSync('npm run build --workspace admin', { cwd: root, stdio: 'inherit' });
  console.log('  ✅ 后台管理构建完成');
} catch (err) {
  console.error('❌ 构建失败:', err.message);
  process.exit(1);
}

const frontendDist = path.join(root, 'frontend', 'dist');
const adminDist = path.join(root, 'admin', 'dist');
if (!fs.existsSync(frontendDist)) {
  console.error('❌ frontend/dist 不存在，构建可能未成功');
  process.exit(1);
}
if (!fs.existsSync(adminDist)) {
  console.error('❌ admin/dist 不存在，构建可能未成功');
  process.exit(1);
}

header('🚀  启动生产服务');
console.log('  运行模式 : 🔵 生产模式');
console.log('  监听端口 : ' + port);
console.log('  站点名称 : 云南驰耀科技有限公司');
console.log('----------------------------------------');
console.log('  前台页面 : http://localhost:' + port);
console.log('  后台管理 : http://localhost:' + port + '/admin');
console.log('  健康检查 : http://localhost:' + port + '/api/health');
console.log('  Sitemap  : http://localhost:' + port + '/api/public/sitemap.xml');
console.log('========================================');
console.log('');

const server = spawn('node', ['server/src/index.js'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});

server.on('exit', (code) => process.exit(code || 0));
// ==========================================================
// 云南驰耀科技企业官网 - PM2 生产环境配置
// 用法:
//   启动:   pm2 start ecosystem.config.cjs
//   重启:   pm2 restart chiyao-site
//   停止:   pm2 stop chiyao-site
//   日志:   pm2 logs chiyao-site
//   状态:   pm2 status
//   保存:   pm2 save
//   开机自启: pm2 startup
// ==========================================================

module.exports = {
  apps: [
    {
      name: "chiyao-site",
      script: "server/src/index.js",
      cwd: __dirname,
      node_args: "",

      // 环境变量
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
        TZ: "Asia/Shanghai",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 3000,
        TZ: "Asia/Shanghai",
      },

      // 进程管理
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: "512M",

      // 日志
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "server/logs/pm2-error.log",
      out_file: "server/logs/pm2-out.log",
      merge_logs: true,
      log_type: "json",

      // 优雅退出
      kill_timeout: 10000,
      listen_timeout: 15000,
      wait_ready: true,

      // 监控
      watch: false,
      ignore_watch: ["node_modules", "server/logs", "server/uploads", "server/data"],

      // 构建前钩子（可选，首次部署时手动执行）
      // 如需每次重启自动构建，取消注释下面两行：
      // pre_restart: "npm run build",
      // pre_deploy: "git pull && npm install && npm run build",
    },
  ],

  deploy: {
    production: {
      user: "www-data",
      host: "your-server-ip",
      ref: "origin/main",
      repo: "git@github.com:your-org/chiyao-site.git",
      path: "/opt/chiyao",
      "post-deploy": "npm install && npm run build && pm2 reload ecosystem.config.cjs --env production",
    },
  },
};
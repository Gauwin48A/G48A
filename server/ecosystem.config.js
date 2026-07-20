module.exports = {
  apps: [
    {
      name: "mhub-server",
      script: "src/index.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
      env_production: {
        NODE_ENV: "production",
        PORT: 5000
      },
      error_file: "logs/pm2-err.log",
      out_file: "logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      combine_logs: true,
      time: true,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 2000
    }
  ]
};

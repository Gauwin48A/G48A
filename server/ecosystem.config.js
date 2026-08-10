module.exports = {
  apps: [
    {
      name: "zaruda-backend",
      script: "./src/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 5001
      },
      max_memory_restart: "500M",
      listen_timeout: 10000,
      kill_timeout: 5000,
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      merge_logs: true,
      time: true
    }
  ]
};

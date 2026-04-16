/**
 * PM2 Cluster Configuration
 * 
 * Run multiple Node.js instances for load balancing
 * Usage: pm2 start ecosystem.config.js
 */

const deployHosts = String(process.env.MHUB_DEPLOY_HOSTS || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
const appPort = Number.parseInt(process.env.PORT || "5001", 10) || 5001;
const healthCheckHost = process.env.MHUB_HEALTHCHECK_HOST || "localhost";

module.exports = {
    apps: [
        {
            name: 'mhub-api',
            script: './src/index.js',
            instances: Math.max(1, require('os').cpus().length - 1),  // Leave 1 core for OS
            exec_mode: 'cluster',

            // Environment variables
            env: {
                NODE_ENV: 'development',
                PORT: appPort,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: appPort,
            },

            // Auto-restart on memory limit (prevent memory leaks)
            max_memory_restart: '1G',

            // Logging — O-04: structured JSON logs for centralized aggregation
            log_type: 'json',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './logs/error.log',
            out_file: './logs/out.log',
            merge_logs: true,
            log_rotate: true,
            max_size: '10M',
            retain: 5,
            compress: true,

            // Graceful restart
            kill_timeout: 10000,
            wait_ready: true,
            listen_timeout: 10000,

            // Watch for file changes (development only)
            watch: false,
            ignore_watch: ['node_modules', 'logs', '.git'],

            // Health monitoring
            health_check: {
                url: `http://${healthCheckHost}:${appPort}/health`,
                interval: 30000,
                timeout: 5000,
            },
        },
    ],

    // Deployment configuration
    deploy: {
        production: {
            user: 'ubuntu',
            host: deployHosts.length > 0 ? deployHosts : ['localhost'],
            ref: 'origin/main',
            repo: 'git@github.com:mhub/mhub.git',
            path: '/var/www/mhub',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
            env: {
                NODE_ENV: 'production',
            },
        },
    },
};

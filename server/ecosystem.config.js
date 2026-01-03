/**
 * PM2 Cluster Configuration
 * 
 * Run multiple Node.js instances for load balancing
 * Usage: pm2 start ecosystem.config.js
 */

module.exports = {
    apps: [
        {
            name: 'mhub-api',
            script: './src/server.js',
            instances: 'max',  // Use all CPU cores
            exec_mode: 'cluster',

            // Environment variables
            env: {
                NODE_ENV: 'development',
                PORT: 5000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000,
            },

            // Auto-restart on memory limit (prevent memory leaks)
            max_memory_restart: '1G',

            // Logging
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './logs/error.log',
            out_file: './logs/out.log',
            merge_logs: true,

            // Graceful restart
            kill_timeout: 5000,
            wait_ready: true,
            listen_timeout: 10000,

            // Watch for file changes (development only)
            watch: false,
            ignore_watch: ['node_modules', 'logs', '.git'],

            // Health monitoring
            health_check: {
                url: 'http://localhost:5000/health',
                interval: 30000,
                timeout: 5000,
            },
        },
    ],

    // Deployment configuration
    deploy: {
        production: {
            user: 'ubuntu',
            host: ['server1.mhub.com', 'server2.mhub.com'],
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

const pino = require('pino');

// High-performance structured logger
// In production: JSON output for Logstash/Splunk
// In development: Pretty colors for readability
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname', // Clean output
        }
    }
});

module.exports = logger;
